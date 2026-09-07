/**
 * VIXY VAULT - INVITE TO EARN (referral service)
 *
 * Firestore-backed. Follows the same dependency-injection shape as
 * createDiscordConnectHandler so that every write goes through the
 * Admin-aware Firestore shim in server.ts rather than a raw client SDK
 * import, which would be denied by firestore.rules.
 *
 * Collections:
 *   referral_codes/{CODE}            - uniqueness index + owner
 *   referral_attributions/{email}    - write-once, one referrer per person
 *   referral_conversions/{sessionId} - idempotency key + audit trail
 */

export const REFERRAL_CODES = "referral_codes";
export const REFERRAL_ATTRIBUTIONS = "referral_attributions";
export const REFERRAL_CONVERSIONS = "referral_conversions";
export const DAY_PASSES = "day_passes";
export const REFERRAL_STATS = "referral_stats";

// The Stripe coupon that carries the discount. Applied server-side ONLY when
// a valid referral code is attached - it must NOT be published as a
// customer-typeable promotion code, or anyone gets 20% off with no referrer
// attached and nobody earns a day.
export const REFERRAL_COUPON_ID = process.env.REFERRAL_COUPON_ID || "REFER_20";
export const REFERRAL_DISCOUNT_PERCENT = 20;
export const REFERRAL_BONUS_HOURS = 24;
export const REFERRAL_DAILY_BONUS_CAP = 5;

const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

const RESERVED_CODES = new Set([
  "DIRECT", "REFER20", "REFER", "VIXY", "VIXYVAULT", "VAULT", "ADMIN", "OWNER", "SUPPORT",
  "MOD", "TEST", "NULL", "NONE", "UNDEFINED", "SYSTEM",
]);

export function normalizeCode(raw) {
  return String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCodeFormat(code) {
  return CODE_PATTERN.test(code);
}

export function isReservedCode(code) {
  return RESERVED_CODES.has(code);
}

export function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

/** alex@example.com -> al***@example.com. Never return a full referred email. */
export function maskEmail(email) {
  const clean = normalizeEmail(email);
  const at = clean.indexOf("@");
  if (at < 1) return "hidden";
  const name = clean.slice(0, at);
  const domain = clean.slice(at);
  if (name.length <= 2) return name[0] + "***" + domain;
  return name.slice(0, 2) + "***" + domain;
}

/**
 * Build the referral store.
 *
 * @param getDb       () => db handle. May legitimately return null when the
 *                    Admin SDK is active - fs.ready(db) is the real check.
 * @param fs          Admin-aware Firestore shim from server.ts:
 *                    { doc, getDoc, setDoc, runTransaction, ready }
 * @param log         optional logger
 */
export function createReferralStore(getDb, fs, log = console) {
  function requireDb() {
    const db = getDb();
    if (!fs.ready(db)) {
      const err: any = new Error("REFERRAL_STORE_UNAVAILABLE");
      err.code = "REFERRAL_STORE_UNAVAILABLE";
      throw err;
    }
    return db;
  }

  async function readDoc(collection, id) {
    const db = requireDb();
    const snap = await fs.getDoc(fs.doc(db, collection, id));
    return snap && snap.exists() ? snap.data() : null;
  }

  /** Look up who owns a code. Returns null for unknown or deactivated codes. */
  async function getCodeOwner(rawCode) {
    const code = normalizeCode(rawCode);
    if (!isValidCodeFormat(code)) return null;
    const rec = await readDoc(REFERRAL_CODES, code);
    if (!rec || rec.active === false) return null;
    return rec;
  }

  /**
   * Claim a code. Transactional: two people claiming the same string in the
   * same second is exactly the race runTransaction exists for.
   */
  async function claimCode(rawCode, ownerEmail, ownerUid, opts: any = {}) {
    const db = requireDb();
    const code = normalizeCode(rawCode);
    const email = normalizeEmail(ownerEmail);

    if (!isValidCodeFormat(code)) throw Object.assign(new Error("CODE_INVALID"), { code: "CODE_INVALID" });
    if (isReservedCode(code)) throw Object.assign(new Error("CODE_RESERVED"), { code: "CODE_RESERVED" });
    if (!email.includes("@")) throw Object.assign(new Error("OWNER_INVALID"), { code: "OWNER_INVALID" });

    const record = {
      code,
      ownerEmail: email,
      ownerUid: ownerUid || null,
      ownerType: opts.ownerType === "PROMOTER" ? "PROMOTER" : "USER",
      ownerName: opts.ownerName || null,
      discountPercent: Number.isFinite(opts.discountPercent)
        ? opts.discountPercent
        : REFERRAL_DISCOUNT_PERCENT,
      commissionRate: Number.isFinite(opts.commissionRate) ? opts.commissionRate : 0,
      payoutStatus: opts.payoutStatus || "NONE",
      active: true,
      createdAt: new Date().toISOString(),
    };

    await fs.runTransaction(db, async (tx) => {
      const ref = fs.doc(db, REFERRAL_CODES, code);
      const existing = await tx.get(ref);
      if (existing.exists()) {
        const owner = existing.data();
        if (normalizeEmail(owner.ownerEmail) !== email || !opts.allowOverwrite) {
          throw Object.assign(new Error("CODE_TAKEN"), { code: "CODE_TAKEN" });
        }
      }
      tx.set(ref, record);
    });

    return record;
  }

  /**
   * Attach a referrer to a user. Write-once: the doc ID is the referred
   * email, so "one referrer per person, forever" is enforced structurally
   * rather than by an application-level check that can be raced.
   */
  async function attachReferral(rawCode, referredEmail) {
    const db = requireDb();
    const code = normalizeCode(rawCode);
    const referred = normalizeEmail(referredEmail);

    if (!referred.includes("@")) throw Object.assign(new Error("REFERRED_INVALID"), { code: "REFERRED_INVALID" });

    const owner = await getCodeOwner(code);
    if (!owner) throw Object.assign(new Error("CODE_UNKNOWN"), { code: "CODE_UNKNOWN" });

    if (normalizeEmail(owner.ownerEmail) === referred) {
      throw Object.assign(new Error("SELF_REFERRAL"), { code: "SELF_REFERRAL" });
    }

    const record = {
      code,
      referrerEmail: normalizeEmail(owner.ownerEmail),
      referredEmail: referred,
      status: "JOINED",
      attachedAt: new Date().toISOString(),
    };

    await fs.runTransaction(db, async (tx) => {
      const ref = fs.doc(db, REFERRAL_ATTRIBUTIONS, referred);
      const existing = await tx.get(ref);
      if (existing.exists()) {
        throw Object.assign(new Error("ALREADY_ATTRIBUTED"), { code: "ALREADY_ATTRIBUTED" });
      }
      tx.set(ref, record);
    });

    // Rollup is best-effort: a stats failure must never undo a valid
    // attribution, which is already durably committed above.
    try {
      await recordJoin(record.referrerEmail, referred, code);
    } catch (err) {
      log.warn("[REFERRAL] join rollup failed", referred, err);
    }

    return record;
  }

  async function getAttribution(referredEmail) {
    return readDoc(REFERRAL_ATTRIBUTIONS, normalizeEmail(referredEmail));
  }

  /**
   * Grant the referrer one bonus day.
   *
   * Two things here are deliberate and load-bearing:
   *  1. The write is AWAITED. grantUserPlan's fire-and-forget
   *     persistSingleUser(...).catch(() => {}) is why grants silently vanish
   *     when Vercel tears the function down, and why getUserEntitlement ended
   *     up with hardcoded per-email overrides. This does not repeat that.
   *  2. It EXTENDS from max(now, existingExpiry) instead of overwriting, so
   *     converting two friends in one day earns two days, not one.
   *
   * It writes to day_passes/{email} - the same collection the Stripe day-pass
   * path already uses - so it inherits the existing cross-instance fallback
   * instead of needing a new one.
   */
  async function grantBonusDay(referrerEmail, sessionId) {
    const db = requireDb();
    const email = normalizeEmail(referrerEmail);
    if (!email.includes("@")) throw Object.assign(new Error("REFERRER_INVALID"), { code: "REFERRER_INVALID" });

    const existing = await readDoc(DAY_PASSES, email);
    const existingMs = existing && existing.expiresAt ? new Date(existing.expiresAt).getTime() : 0;
    const baseMs = Math.max(Date.now(), Number.isFinite(existingMs) ? existingMs : 0);
    const expiresAt = new Date(baseMs + REFERRAL_BONUS_HOURS * 3600 * 1000).toISOString();

    const record = {
      ...(existing || {}),
      email,
      status: "ACTIVE",
      expiresAt,
      source: "REFERRAL_BONUS",
      lastGrantSessionId: sessionId || null,
      updatedAt: new Date().toISOString(),
    };

    await fs.setDoc(fs.doc(db, DAY_PASSES, email), record);
    return record;
  }

  /**
   * Process a paid conversion. Idempotent: the Stripe Checkout Session ID is
   * the document ID, so a webhook replay physically cannot grant a second day.
   */
  async function processConversion(input) {
    const db = requireDb();
    const sessionId = String(input.sessionId || "").trim();
    if (!sessionId) throw Object.assign(new Error("SESSION_REQUIRED"), { code: "SESSION_REQUIRED" });

    const already = await readDoc(REFERRAL_CONVERSIONS, sessionId);
    if (already) return { ...already, idempotentReplay: true };

    const code = normalizeCode(input.code);
    if (!code || isReservedCode(code)) return null;

    const owner = await getCodeOwner(code);
    if (!owner) return null;

    const referrerEmail = normalizeEmail(owner.ownerEmail);
    const referredEmail = normalizeEmail(input.referredEmail);
    if (referrerEmail === referredEmail) return null;

    const conversion: any = {
      sessionId,
      code,
      referrerEmail,
      referredEmail,
      referredEmailMasked: maskEmail(referredEmail),
      amountTotal: Number.isFinite(input.amountTotal) ? input.amountTotal : null,
      currency: input.currency || "usd",
      plan: input.plan || null,
      status: "GRANTED",
      capped: false,
      dayPassExpiresAt: null,
      grantedAt: new Date().toISOString(),
    };

    try {
      const pass = await grantBonusDay(referrerEmail, sessionId);
      conversion.dayPassExpiresAt = pass.expiresAt;
    } catch (err) {
      conversion.status = "GRANT_FAILED";
      conversion.error = String((err && err.message) || err);
      log.error("[REFERRAL] bonus day grant failed", sessionId, err);
    }

    // Written after the grant attempt so the ledger records what actually
    // happened, including a failure, rather than an optimistic success.
    await fs.setDoc(fs.doc(db, REFERRAL_CONVERSIONS, sessionId), conversion);

    if (conversion.status === "GRANTED") {
      try {
        await fs.setDoc(fs.doc(db, REFERRAL_ATTRIBUTIONS, referredEmail), {
          code,
          referrerEmail,
          referredEmail,
          status: "CONVERTED",
          convertedAt: conversion.grantedAt,
          attachedAt: conversion.grantedAt,
        });
      } catch (err) {
        log.warn("[REFERRAL] attribution status update failed", referredEmail, err);
      }
    }

    try {
      await recordConversion(
        referrerEmail,
        referredEmail,
        code,
        conversion.status === "GRANTED",
      );
    } catch (err) {
      log.warn("[REFERRAL] conversion rollup failed", referrerEmail, err);
    }

    return conversion;
  }


  /**
   * Per-referrer rollup, kept as a single document.
   *
   * The Firestore shim exposes doc/getDoc/setDoc/runTransaction but no query
   * support, so the panel cannot filter conversions with where(). Rather than
   * widen the shim across a module boundary, the rollup is maintained on write
   * and read back in one get. The visible list is capped at the most recent 50
   * so the document can never approach the 1MB limit.
   */
  async function getStats(ownerEmail) {
    const email = normalizeEmail(ownerEmail);
    const rec = await readDoc(REFERRAL_STATS, email);
    return rec || {
      ownerEmail: email,
      code: null,
      freeDaysEarned: 0,
      friendsJoined: 0,
      friendsConverted: 0,
      referrals: [],
    };
  }

  async function writeStats(ownerEmail, mutate) {
    const db = requireDb();
    const email = normalizeEmail(ownerEmail);
    const current = await getStats(email);
    const next = mutate({
      ...current,
      referrals: Array.isArray(current.referrals) ? [...current.referrals] : [],
    });
    next.referrals = next.referrals.slice(0, 50);
    next.updatedAt = new Date().toISOString();
    await fs.setDoc(fs.doc(db, REFERRAL_STATS, email), next);
    return next;
  }

  async function recordJoin(ownerEmail, referredEmail, code) {
    return writeStats(ownerEmail, (st) => {
      st.code = code || st.code;
      const masked = maskEmail(referredEmail);
      if (!st.referrals.some((r) => r.maskedEmail === masked && r.status !== "CONVERTED")) {
        st.referrals.unshift({
          maskedEmail: masked,
          status: "JOINED",
          joinedAt: new Date().toISOString(),
          convertedAt: null,
        });
        st.friendsJoined = (st.friendsJoined || 0) + 1;
      }
      return st;
    });
  }

  async function recordConversion(ownerEmail, referredEmail, code, granted) {
    return writeStats(ownerEmail, (st) => {
      st.code = code || st.code;
      const masked = maskEmail(referredEmail);
      const now = new Date().toISOString();
      const idx = st.referrals.findIndex((r) => r.maskedEmail === masked);
      if (idx >= 0) {
        st.referrals[idx].status = "CONVERTED";
        st.referrals[idx].convertedAt = now;
      } else {
        st.referrals.unshift({
          maskedEmail: masked, status: "CONVERTED", joinedAt: now, convertedAt: now,
        });
        st.friendsJoined = (st.friendsJoined || 0) + 1;
      }
      st.friendsConverted = (st.friendsConverted || 0) + 1;
      if (granted) st.freeDaysEarned = (st.freeDaysEarned || 0) + 1;
      return st;
    });
  }

  return {
    getCodeOwner,
    getStats,
    recordJoin,
    recordConversion,
    claimCode,
    attachReferral,
    getAttribution,
    grantBonusDay,
    processConversion,
    readDoc,
  };
}
