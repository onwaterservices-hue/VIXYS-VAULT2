/**
 * Real Discord OAuth connection flow.
 *
 * Identity is derived ONLY from the authenticated VIXY session
 * (authenticateSession), never from client-supplied query params.
 * All persistence uses Firestore -- no in-memory map is the source
 * of truth for the VIXY <-> Discord relationship.
 */
import crypto from "crypto";
import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DISCORD_API = "https://discord.com/api/v10";

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/discord/connect
 * Authenticated only. Returns { url } for the frontend to open in a
 * popup -- never redirects itself, since the frontend needs the URL
 * as JSON to open a popup window.
 */
export function createDiscordConnectHandler(db, authenticateSession) {
  return async (req, res) => {
    const auth = authenticateSession(req);
    if (!auth || !auth.user || !auth.user.email) {
      return res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !redirectUri || !clientSecret) {
      return res.status(503).json({ error: "DISCORD_OAUTH_NOT_CONFIGURED" });
    }

    const state = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    try {
      await setDoc(doc(db, "discord_oauth_states", state), {
        vixyEmail: auth.user.email.toLowerCase(),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + OAUTH_STATE_TTL_MS).toISOString(),
        used: false,
      });
    } catch (err) {
      console.error("[Discord OAuth] Failed to persist state:", err && err.message);
      return res.status(503).json({ error: "OAUTH_STATE_STORAGE_FAILED" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify",
      state,
      prompt: "consent",
    });
    return res.json({ url: DISCORD_API + "/oauth2/authorize?" + params.toString() });
  };
}

/**
 * GET /api/discord/callback
 * Public entrypoint (Discord redirects here) -- identity comes entirely
 * from the validated, single-use OAuth state bound to the VIXY user at
 * /connect time, never from a client-supplied param.
 */
export function createDiscordCallbackHandler(db, resolveEntitlementTier, assignDiscordRoleToUser) {
  return async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const fail = (reason) => res.redirect("/?discord_error=" + encodeURIComponent(String(reason)));

    if (!code || !state || typeof state !== "string") {
      return fail("missing_params");
    }

    let vixyEmail;
    try {
      vixyEmail = await runTransaction(db, async (tx) => {
        const ref = doc(db, "discord_oauth_states", state);
        const snap = await tx.get(ref);
        if (!snap.exists()) return null;
        const data = snap.data();
        if (data.used) return null;
        if (new Date(data.expiresAt).getTime() < Date.now()) return null;
        tx.set(ref, { used: true, consumedAt: new Date().toISOString() }, { merge: true });
        return data.vixyEmail;
      });
    } catch (err) {
      console.error("[Discord OAuth] State validation error:", err && err.message);
      return fail("state_validation_failed");
    }
    if (!vixyEmail) {
      return fail("invalid_or_expired_state");
    }

    let accessToken;
    try {
      const tokenRes = await fetchWithTimeout(DISCORD_API + "/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }),
      });
      if (!tokenRes.ok) {
        console.error("[Discord OAuth] Token exchange failed, status:", tokenRes.status);
        return fail("token_exchange_failed");
      }
      const tokenJson = await tokenRes.json();
      accessToken = tokenJson.access_token;
    } catch (err) {
      console.error("[Discord OAuth] Token exchange error:", err && err.message);
      return fail("token_exchange_error");
    }
    if (!accessToken) {
      return fail("token_exchange_failed");
    }

    let discordUserId;
    let discordUsername;
    try {
      const meRes = await fetchWithTimeout(DISCORD_API + "/users/@me", {
        headers: { Authorization: "Bearer " + accessToken },
      });
      if (!meRes.ok) {
        return fail("identity_fetch_failed");
      }
      const me = await meRes.json();
      discordUserId = me.id;
      discordUsername = me.global_name || me.username || "discord_user";
    } catch (err) {
      console.error("[Discord OAuth] Identity fetch error:", err && err.message);
      return fail("identity_fetch_error");
    } finally {
      accessToken = null;
    }
    if (!discordUserId) {
      return fail("identity_fetch_failed");
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    try {
      const memberRes = await fetchWithTimeout(
        DISCORD_API + "/guilds/" + guildId + "/members/" + discordUserId,
        { headers: { Authorization: "Bot " + process.env.DISCORD_BOT_TOKEN } },
      );
      if (!memberRes.ok) {
        return fail("guild_membership_required");
      }
    } catch (err) {
      console.error("[Discord OAuth] Guild membership check error:", err && err.message);
      return fail("guild_membership_check_failed");
    }

    let linkOutcome;
    try {
      linkOutcome = await runTransaction(db, async (tx) => {
        const reverseRef = doc(db, "discord_links_by_discord_id", discordUserId);
        const forwardRef = doc(db, "discord_links", vixyEmail);
        const reverseSnap = await tx.get(reverseRef);
        const forwardSnap = await tx.get(forwardRef);

        if (reverseSnap.exists() && reverseSnap.data().vixyEmail !== vixyEmail) {
          return { ok: false, reason: "discord_already_linked_elsewhere" };
        }
        if (
          forwardSnap.exists() &&
          forwardSnap.data().discordUserId &&
          forwardSnap.data().discordUserId !== discordUserId
        ) {
          return { ok: false, reason: "vixy_account_already_linked_to_different_discord" };
        }

        const now = new Date().toISOString();
        tx.set(forwardRef, {
          vixyEmail,
          discordUserId,
          discordUsername,
          guildId,
          status: "CONNECTED",
          connectedAt:
            forwardSnap.exists() && forwardSnap.data().connectedAt
              ? forwardSnap.data().connectedAt
              : now,
          updatedAt: now,
        });
        tx.set(reverseRef, { vixyEmail, updatedAt: now });
        return { ok: true };
      });
    } catch (err) {
      console.error("[Discord OAuth] Link persist error:", err && err.message);
      return fail("link_persist_failed");
    }
    if (!linkOutcome || !linkOutcome.ok) {
      return fail((linkOutcome && linkOutcome.reason) || "link_failed");
    }

    try {
      const tier = await resolveEntitlementTier(vixyEmail, discordUserId);
      await assignDiscordRoleToUser(discordUserId, tier);
    } catch (err) {
      console.error("[Discord OAuth] Role sync error (connection still succeeded):", err && err.message);
    }

    return res.redirect("/?discord_connected=true");
  };
}

/** GET /api/discord/status -- authenticated status check for the frontend. */
export function createDiscordLinkStatusHandler(db, authenticateSession) {
  return async (req, res) => {
    const auth = authenticateSession(req);
    if (!auth || !auth.user || !auth.user.email) {
      return res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    const vixyEmail = auth.user.email.toLowerCase();
    try {
      const snap = await getDoc(doc(db, "discord_links", vixyEmail));
      if (!snap.exists()) {
        return res.json({ connected: false });
      }
      const d = snap.data();
      return res.json({
        connected: d.status === "CONNECTED",
        discordUsername: d.discordUsername || null,
        connectedAt: d.connectedAt || null,
      });
    } catch (err) {
      console.error("[Discord OAuth] Status check error:", err && err.message);
      return res.status(500).json({ error: "STATUS_CHECK_FAILED" });
    }
  };
}

/** POST /api/discord/unlink -- authenticated, explicit unlink before reconnect. */
export function createDiscordUnlinkHandler(db, authenticateSession) {
  return async (req, res) => {
    const auth = authenticateSession(req);
    if (!auth || !auth.user || !auth.user.email) {
      return res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    const vixyEmail = auth.user.email.toLowerCase();
    try {
      await runTransaction(db, async (tx) => {
        const forwardRef = doc(db, "discord_links", vixyEmail);
        const snap = await tx.get(forwardRef);
        if (snap.exists()) {
          const discordUserId = snap.data().discordUserId;
          tx.delete(forwardRef);
          if (discordUserId) {
            tx.delete(doc(db, "discord_links_by_discord_id", discordUserId));
          }
        }
      });
      return res.json({ success: true });
    } catch (err) {
      console.error("[Discord OAuth] Unlink error:", err && err.message);
      return res.status(500).json({ error: "UNLINK_FAILED" });
    }
  };
}
