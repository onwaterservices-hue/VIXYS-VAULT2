import {
  normalizeCode,
  normalizeEmail,
  isValidCodeFormat,
  isReservedCode,
  REFERRAL_DISCOUNT_PERCENT,
} from "./referralService";

/**
 * VIXY VAULT - INVITE TO EARN (route handlers)
 *
 * Same injection shape as createDiscordConnectHandler: server.ts owns the
 * authenticated Firestore handle and the session helper, this module owns
 * the request/response logic.
 *
 * @param store            createReferralStore(...) result
 * @param authenticateSession  server.ts session helper -> user object or null
 * @param persistUserCode  async (user, code) => void; writes user.referralCode
 *                         through server.ts's own awaited persistence
 * @param siteUrl          public origin used to build the share link
 */
export function createReferralHandlers({
  store,
  authenticateSession,
  persistUserCode,
  siteUrl,
  log = console,
}) {
  function buildLink(code) {
    const base = String(siteUrl || "https://vixxyvault.com").replace(/\/+$/, "");
    return base + "/?ref=" + encodeURIComponent(code);
  }

  function requireUser(req, res) {
    const user = authenticateSession(req);
    if (!user || !user.email) {
      res.status(401).json({ success: false, message: "Sign in to use invites." });
      return null;
    }
    return user;
  }

  /** GET /api/referral/me */
  async function me(req, res) {
    const user = requireUser(req, res);
    if (!user) return;
    const email = normalizeEmail(user.email);

    try {
      const stats = await store.getStats(email);
      const code = user.referralCode || stats.code || null;

      res.json({
        code,
        link: code ? buildLink(code) : null,
        canChooseCode: !code,
        discountPercent: REFERRAL_DISCOUNT_PERCENT,
        freeDaysEarned: stats.freeDaysEarned || 0,
        friendsJoined: stats.friendsJoined || 0,
        friendsConverted: stats.friendsConverted || 0,
        referrals: Array.isArray(stats.referrals) ? stats.referrals : [],
      });
    } catch (err) {
      log.error("[REFERRAL] /me failed", email, err);
      // Deliberately not a 200 with zeroes: a zero would be read as "you have
      // earned nothing", which is a different claim from "we could not load it".
      res.status(503).json({ success: false, message: "Invite status is temporarily unavailable." });
    }
  }

  /** POST /api/referral/claim-code  { code } */
  async function claimCode(req, res) {
    const user = requireUser(req, res);
    if (!user) return;

    const code = normalizeCode((req.body || {}).code);
    if (!isValidCodeFormat(code)) {
      return res.status(400).json({ success: false, message: "Use 4-16 letters and numbers." });
    }
    if (isReservedCode(code)) {
      return res.status(400).json({ success: false, message: "That code is reserved. Pick another." });
    }
    if (user.referralCode) {
      return res.status(409).json({ success: false, message: "You already have a code: " + user.referralCode });
    }

    try {
      const record = await store.claimCode(code, user.email, user.id, {
        ownerType: "USER",
        ownerName: user.name || null,
      });

      // Awaited on purpose. If this write is lost the user sees a code that
      // does not survive the next cold start, which is the exact failure the
      // fire-and-forget grant path already produces elsewhere.
      await persistUserCode(user, record.code);

      res.json({ success: true, code: record.code, link: buildLink(record.code) });
    } catch (err) {
      const c = err && err.code;
      if (c === "CODE_TAKEN") {
        return res.status(409).json({ success: false, message: "That code is already taken." });
      }
      if (c === "CODE_RESERVED" || c === "CODE_INVALID") {
        return res.status(400).json({ success: false, message: "That code isn't allowed." });
      }
      log.error("[REFERRAL] claim failed", user.email, err);
      res.status(503).json({ success: false, message: "Couldn't save your code. Try again." });
    }
  }

  /**
   * GET /api/referral/resolve?code=XXXX  (public)
   *
   * Returns validity only. It deliberately does NOT return the owner's email
   * or name - that would turn this open endpoint into an account-enumeration
   * oracle that anyone could brute-force against short codes.
   */
  async function resolve(req, res) {
    const code = normalizeCode((req.query || {}).code);
    if (!isValidCodeFormat(code) || isReservedCode(code)) {
      return res.json({ valid: false });
    }
    try {
      const owner = await store.getCodeOwner(code);
      res.json({
        valid: Boolean(owner),
        code: owner ? code : null,
        discountPercent: owner ? REFERRAL_DISCOUNT_PERCENT : 0,
      });
    } catch (err) {
      log.warn("[REFERRAL] resolve failed", code, err);
      res.json({ valid: false });
    }
  }

  /** POST /api/referral/attach  { code } */
  async function attach(req, res) {
    const user = requireUser(req, res);
    if (!user) return;

    const code = normalizeCode((req.body || {}).code);
    if (!isValidCodeFormat(code)) {
      return res.status(400).json({ success: false, reason: "CODE_INVALID" });
    }

    try {
      const record = await store.attachReferral(code, user.email);
      // Privacy-safe referrer label for the congrats toast: the owner's display
      // NAME only, never their email, and only when one is set. The referred
      // user was handed this exact code, and attach requires an authenticated
      // session plus a valid code, so this is not an enumeration oracle the way
      // /resolve would be. Falls back to null -> the toast shows the code.
      let referrerLabel = null;
      try {
        const owner = await store.getCodeOwner(code);
        if (owner && owner.ownerName) referrerLabel = String(owner.ownerName);
      } catch { /* label is cosmetic; never fail the attach for it */ }
      res.json({
        success: true,
        code: record.code,
        discountPercent: REFERRAL_DISCOUNT_PERCENT,
        referrerLabel,
      });
    } catch (err) {
      const c = (err && err.code) || "UNKNOWN";
      // 4xx for every definitive rejection so the client stops retrying and
      // clears its stored code. Only a real outage returns 5xx.
      if (c === "SELF_REFERRAL" || c === "ALREADY_ATTRIBUTED" || c === "CODE_UNKNOWN" || c === "REFERRED_INVALID") {
        return res.status(409).json({ success: false, reason: c });
      }
      log.error("[REFERRAL] attach failed", user.email, err);
      res.status(503).json({ success: false, reason: "UNAVAILABLE" });
    }
  }

  /**
   * GET /api/admin/referrals
   *
   * Replaces the in-memory serverReferrals array. That array was declared
   * once and mutated with find/unshift/splice at 13 sites with no persistence
   * anywhere, so every promoter code an admin created lived only in one
   * serverless instance and vanished on the next cold start.
   */
  async function adminList(req, res, codes) {
    try {
      res.json(Array.isArray(codes) ? codes : []);
    } catch (err) {
      log.error("[REFERRAL] admin list failed", err);
      res.status(503).json({ success: false, message: "Referral store unavailable." });
    }
  }

  /** POST /api/admin/referrals/save */
  async function adminSave(req, res) {
    const body = req.body || {};
    const code = normalizeCode(body.code);
    if (!isValidCodeFormat(code)) {
      return res.status(400).json({ error: "CODE_REQUIRED", message: "Referral code is required (4-16 letters and numbers)." });
    }
    const email = normalizeEmail(body.email);
    if (!email.includes("@")) {
      return res.status(400).json({ error: "EMAIL_REQUIRED", message: "A promoter email is required." });
    }

    try {
      const record = await store.claimCode(code, email, body.userId || null, {
        ownerType: "PROMOTER",
        ownerName: body.name || null,
        discountPercent: Number(body.discountGiven) || REFERRAL_DISCOUNT_PERCENT,
        commissionRate: Number(body.commissionRate) || 0,
        payoutStatus: body.payoutStatus || "NONE",
        allowOverwrite: true,
      });
      res.json({ success: true, referral: record, message: "Referral promoter " + code + " saved." });
    } catch (err) {
      if (err && err.code === "CODE_TAKEN") {
        return res.status(409).json({ error: "CODE_TAKEN", message: "That code belongs to another account." });
      }
      log.error("[REFERRAL] admin save failed", code, err);
      res.status(503).json({ error: "SAVE_FAILED", message: "Referral code was not saved." });
    }
  }

  return { me, claimCode, resolve, attach, adminList, adminSave, buildLink };
}
