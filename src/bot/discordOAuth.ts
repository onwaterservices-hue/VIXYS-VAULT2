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

// Derives the callback URL from the incoming request's own host instead of
// a single fixed env var, so this works correctly on whichever domain is
// actually running (Preview or Production) -- as long as that exact URL
// is registered in the Discord application's OAuth2 redirect list.
function getRedirectUri(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0];
  const host = req.get("host");
  return proto + "://" + host + "/api/auth/discord/callback";
}

// Bounds any promise (e.g. a Firestore SDK call) to a fixed wall-clock
// time so a hung network/connection issue fails cleanly with a clear
// error instead of hanging the request forever.
function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("TIMEOUT:" + label)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
export function createDiscordConnectHandler(getDb, authenticateSession) {
  return async (req, res) => {
    const db = getDb();
    const auth = authenticateSession(req);
    if (!auth || !auth.user || !auth.user.email) {
      return res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    if (!db) {
      return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    }
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(503).json({ error: "DISCORD_OAUTH_NOT_CONFIGURED" });
    }

    const state = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const stateDoc = {
      vixyEmail: auth.user.email.toLowerCase(),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + OAUTH_STATE_TTL_MS).toISOString(),
      used: false,
    };
    // Bounded retry (max 2 attempts total, never unbounded): a cold
    // Firestore connection can occasionally take longer than one timeout
    // window to establish. One retry lets a single click succeed instead
    // of requiring the user to click twice.
    let stateWriteError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await withTimeout(
          setDoc(doc(db, "discord_oauth_states", state), stateDoc),
          8000,
          "oauth_state_write",
        );
        stateWriteError = null;
        break;
      } catch (err) {
        stateWriteError = err;
        console.error(
          "[Discord OAuth] State write attempt " + attempt + " failed:",
          err && err.message,
        );
      }
    }
    if (stateWriteError) {
      const timedOut = !!(stateWriteError && String(stateWriteError.message).startsWith("TIMEOUT:"));
      return res.status(503).json({ error: timedOut ? "OAUTH_STATE_STORAGE_TIMEOUT" : "OAUTH_STATE_STORAGE_FAILED" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(req),
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
export function createDiscordCallbackHandler(getDb, resolveEntitlementTier, assignDiscordRoleToUser, syncLegacyUserRecord) {
  return async (req, res) => {
    const db = getDb();
    const code = req.query.code;
    const state = req.query.state;
    // Records the failure reason server-side (keyed by email once known) so
    // it can be inspected via /api/account/me afterwards -- the redirect
    // query param alone is easy to miss in a popup-based flow.
    let vixyEmailForDebug = null;
    const fail = (reason) => {
      if (db && vixyEmailForDebug) {
        setDoc(
          doc(db, "discord_oauth_debug", vixyEmailForDebug),
          { lastError: String(reason), at: new Date().toISOString() },
          { merge: true },
        ).catch(() => {});
      }
      return res.redirect("/?discord_error=" + encodeURIComponent(String(reason)));
    };

    if (!db) {
      return fail("service_unavailable");
    }
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
    vixyEmailForDebug = vixyEmail;

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
          redirect_uri: getRedirectUri(req),
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

    // Keep the existing (older) terminal-access gate in sync: it reads
    // user.discordId/discordTag/discordLinked, a separate field from the
    // new discord_links collection above. Without this, a real, verified
    // OAuth connection would not unlock anything in the existing gate.
    if (typeof syncLegacyUserRecord === "function") {
      try {
        await syncLegacyUserRecord(vixyEmail, discordUserId, discordUsername);
      } catch (err) {
        console.error("[Discord OAuth] Legacy user record sync failed:", err && err.message);
      }
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
export function createDiscordLinkStatusHandler(getDb, authenticateSession) {
  return async (req, res) => {
    const db = getDb();
    const auth = authenticateSession(req);
    if (!auth || !auth.user || !auth.user.email) {
      return res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    const vixyEmail = auth.user.email.toLowerCase();
    if (!db) {
      return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    }
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
export function createDiscordUnlinkHandler(getDb, authenticateSession) {
  return async (req, res) => {
    const db = getDb();
    const auth = authenticateSession(req);
    if (!auth || !auth.user || !auth.user.email) {
      return res.status(401).json({ error: "AUTHENTICATION_REQUIRED" });
    }
    const vixyEmail = auth.user.email.toLowerCase();
    if (!db) {
      return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    }
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
