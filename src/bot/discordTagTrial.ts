/**
 * Discord server-tag trial: 3 days of free access for wearing the VIXY Vault
 * server tag next to your Discord username.
 *
 * WHAT IS VERIFIED, AND HOW
 * -------------------------
 * Discord exposes the tag a user displays as `primary_guild` on the user
 * object ({ identity_guild_id, identity_enabled, tag, badge }). A claim is only
 * granted when Discord itself -- via the OAuth `identify` token, fresh at claim
 * time -- reports our guild id with identity_enabled === true. Nothing the
 * browser sends can assert a tag.
 *
 * RULES (owner decisions, 2026-09-10)
 *   - Same access as the 24H day pass: 72 hours for claims made before the
 *     launch promo ends (2026-09-11, 11:59 PM Pacific), 24 hours after.
 *   - Once per Discord account AND once per VIXY account, ever.
 *   - Discord account must be at least 30 days old (derived from the snowflake).
 *   - Only for accounts with no paid access right now.
 *   - Removing the tag ends the trial early (hourly re-check).
 *
 * HONESTY
 *   The access record lives in `day_passes` so every existing access gate
 *   honours it unchanged, but it is typed `TAG_TRIAL` and every payment field
 *   is explicitly null: a free grant must never read as a paid purchase. A
 *   prior (expired) purchase record in that document is copied into the claim
 *   ledger before being replaced, so no purchase history is lost.
 *
 *   The re-check only ends a trial on a definite answer from Discord. If the
 *   bot's view of a user does not include `primary_guild` (or the request
 *   fails) the state is recorded as UNKNOWN and access is left alone -- missing
 *   data is never treated as "tag removed".
 *
 * No imports: persistence and side effects are injected by server.ts (the same
 * pattern as discordOAuth.ts), which lets tests run this exact source.
 */

export const TAG_TRIAL_ENTITLEMENT_TYPE = "TAG_TRIAL";
// LAUNCH PROMO (owner decision 2026-09-11): a claim made before the promo ends
// grants 72 hours; a claim made after it grants 24 hours. The deadline is one
// fixed instant -- 11:59 PM Pacific on 2026-09-11 -- decided here, on the
// server, at claim time. Nothing the browser sends can extend it.
export const TAG_TRIAL_PROMO_ENDS_AT = "2026-09-12T07:00:00.000Z";
export const TAG_TRIAL_PROMO_DURATION_HOURS = 72;
export const TAG_TRIAL_STANDARD_DURATION_HOURS = 24;
export const TAG_TRIAL_MIN_DISCORD_ACCOUNT_AGE_DAYS = 30;
const PROMO_ENDS_AT_MS = Date.parse(TAG_TRIAL_PROMO_ENDS_AT);
const MIN_ACCOUNT_AGE_MS = TAG_TRIAL_MIN_DISCORD_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;
const DISCORD_EPOCH_MS = 1420070400000;
const RECHECK_BATCH_LIMIT = 200;

export const TAG_TRIAL_COLLECTIONS = {
  byDiscordId: "discord_tag_trials",
  byEmail: "discord_tag_trials_by_email",
  attempts: "discord_tag_trial_attempts",
};

/** Hours of access a claim made at `nowMs` is worth. */
export function tagTrialDurationHoursAt(nowMs) {
  return nowMs < PROMO_ENDS_AT_MS ? TAG_TRIAL_PROMO_DURATION_HOURS : TAG_TRIAL_STANDARD_DURATION_HOURS;
}

/** The public offer at `nowMs`: rules and the promo deadline, no account data. */
export function tagTrialOfferAt(nowMs) {
  return {
    durationHours: tagTrialDurationHoursAt(nowMs),
    minDiscordAccountAgeDays: TAG_TRIAL_MIN_DISCORD_ACCOUNT_AGE_DAYS,
    standardDurationHours: TAG_TRIAL_STANDARD_DURATION_HOURS,
    promo: {
      active: nowMs < PROMO_ENDS_AT_MS,
      endsAt: TAG_TRIAL_PROMO_ENDS_AT,
      durationHours: TAG_TRIAL_PROMO_DURATION_HOURS,
    },
  };
}

/** Account creation time encoded in a Discord snowflake, or null if invalid. */
export function discordAccountCreatedAtMs(discordUserId) {
  if (typeof discordUserId !== "string" || !/^\d{17,20}$/.test(discordUserId)) {
    return null;
  }
  return Number(BigInt(discordUserId) >> BigInt(22)) + DISCORD_EPOCH_MS;
}

/**
 * EQUIPPED | NOT_EQUIPPED | UNKNOWN for a Discord user object.
 * UNKNOWN means Discord did not tell us (no object, or no primary_guild key).
 * A null primary_guild is a definite answer: the user displays no tag.
 */
export function readServerTagState(discordUser, guildId) {
  if (!discordUser || typeof discordUser !== "object" || !guildId) return "UNKNOWN";
  if (!Object.prototype.hasOwnProperty.call(discordUser, "primary_guild")) return "UNKNOWN";
  const pg = discordUser.primary_guild;
  if (pg === null) return "NOT_EQUIPPED";
  if (typeof pg !== "object") return "UNKNOWN";
  if (String(pg.identity_guild_id || "") === String(guildId) && pg.identity_enabled === true) {
    return "EQUIPPED";
  }
  return "NOT_EQUIPPED";
}

/**
 * Pre-transaction eligibility. `access` is HAS_ACCESS | NO_ACCESS | UNRESOLVED;
 * an unresolved entitlement refuses rather than guesses, because granting a
 * day-pass-typed record to a paying subscriber would swap their Discord role.
 */
export function evaluateTagTrialEligibility(input) {
  const { tagState, discordUserId, nowMs, access } = input;
  if (tagState === "UNKNOWN") return { eligible: false, reason: "TAG_STATE_UNKNOWN" };
  if (tagState !== "EQUIPPED") return { eligible: false, reason: "TAG_NOT_EQUIPPED" };
  const createdAt = discordAccountCreatedAtMs(discordUserId);
  if (createdAt === null) return { eligible: false, reason: "INVALID_DISCORD_ID" };
  if (nowMs - createdAt < MIN_ACCOUNT_AGE_MS) {
    return { eligible: false, reason: "DISCORD_ACCOUNT_TOO_NEW" };
  }
  if (access === "HAS_ACCESS") return { eligible: false, reason: "ALREADY_HAS_ACCESS" };
  if (access !== "NO_ACCESS") return { eligible: false, reason: "ENTITLEMENT_UNRESOLVED" };
  return { eligible: true, reason: null };
}

function isLiveDayPass(record, nowMs) {
  if (!record || !record.expiresAt) return false;
  const status = String(record.status || "").toUpperCase();
  return status === "ACTIVE" && new Date(record.expiresAt).getTime() > nowMs;
}

/** The `day_passes` record for a trial. Payment fields are null, not absent. */
export function buildTagTrialDayPassRecord(input) {
  const { email, userId, discordUserId, guildId, nowMs, discordRoleId } = input;
  const startedAt = new Date(nowMs).toISOString();
  const hours = tagTrialDurationHoursAt(nowMs);
  return {
    entitlementId: "tag_trial_" + discordUserId,
    userId: userId || "usr_" + email.replace(/[^a-zA-Z0-9_]/g, "_"),
    email,
    discordUserId,
    guildId,
    entitlementType: TAG_TRIAL_ENTITLEMENT_TYPE,
    accessTier: "ELITE",
    status: "ACTIVE",
    duration: hours + " hours",
    activatedAt: startedAt,
    startedAt,
    expiresAt: new Date(nowMs + hours * 60 * 60 * 1000).toISOString(),
    stripePaymentStatus: null,
    stripePaymentLink: null,
    stripePaymentId: null,
    stripeCheckoutSessionId: null,
    stripeEventId: null,
    stripePriceId: null,
    discordRoleId: discordRoleId || null,
    discordRoleAssigned: false,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

/**
 * deps:
 *   getDb()                              -> db handle
 *   fx                                   -> { doc, getDoc, setDoc, runTransaction,
 *                                             collection, query, where, limit, getDocs, ready }
 *   getGuildId()                         -> VIXY guild id
 *   resolveAccess(email, discordUserId)  -> "HAS_ACCESS" | "NO_ACCESS" | "UNRESOLVED"
 *   resolveUserId(email)                 -> real VIXY user id or null
 *   applyDayPassRecord(record)           -> put record into the in-memory cache
 *   markDayPassEnded(email, userId, discordUserId) -> expire it in the cache
 *   syncDiscordRole(email)               -> align Discord role with entitlement
 *   fetchDiscordUserAsBot(discordUserId) -> Discord user object or null
 *   dayPassRoleId                        -> role id recorded on the pass
 *   now(), log
 */
export function createTagTrialService(deps) {
  const C = TAG_TRIAL_COLLECTIONS;
  const fx = deps.fx;
  const now = deps.now || (() => Date.now());
  const log = deps.log || console;

  async function recordAttempt(email, outcome, reason, discordUserId) {
    const db = deps.getDb();
    if (!email || !fx.ready(db)) return;
    try {
      await fx.setDoc(fx.doc(db, C.attempts, email), {
        vixyEmail: email,
        outcome,
        reason: reason || null,
        discordUserId: discordUserId || null,
        at: new Date(now()).toISOString(),
      });
    } catch (err) {
      log.warn("[TagTrial] attempt record failed:", err && err.message);
    }
  }

  async function claim(input) {
    const email = String(input.vixyEmail || "").toLowerCase().trim();
    const discordUserId = String(input.discordUserId || "");
    const nowMs = now();
    const refuse = async (reason) => {
      await recordAttempt(email, "REFUSED", reason, discordUserId);
      log.log(`[TagTrial] claim refused email=${email} discord=${discordUserId} reason=${reason}`);
      return { granted: false, reason, expiresAt: null };
    };

    const db = deps.getDb();
    if (!email || !fx.ready(db)) return refuse("SERVICE_UNAVAILABLE");
    const guildId = deps.getGuildId();
    if (!guildId) return refuse("NOT_CONFIGURED");

    const tagState = readServerTagState(input.discordUser, guildId);
    let access = "UNRESOLVED";
    try {
      access = await deps.resolveAccess(email, discordUserId);
    } catch (err) {
      log.warn("[TagTrial] access resolution failed:", err && err.message);
    }
    const pre = evaluateTagTrialEligibility({ tagState, discordUserId, nowMs, access });
    if (!pre.eligible) return refuse(pre.reason);

    let userId = null;
    try {
      userId = (await deps.resolveUserId(email)) || null;
    } catch {
      userId = null;
    }
    const record = buildTagTrialDayPassRecord({
      email,
      userId,
      discordUserId,
      guildId,
      nowMs,
      discordRoleId: deps.dayPassRoleId,
    });

    let outcome;
    try {
      outcome = await fx.runTransaction(db, async (tx) => {
        const byDiscordRef = fx.doc(db, C.byDiscordId, discordUserId);
        const byEmailRef = fx.doc(db, C.byEmail, email);
        const passRef = fx.doc(db, "day_passes", email);
        const byDiscordSnap = await tx.get(byDiscordRef);
        const byEmailSnap = await tx.get(byEmailRef);
        const passSnap = await tx.get(passRef);
        if (byDiscordSnap.exists() || byEmailSnap.exists()) {
          return { ok: false, reason: "ALREADY_CLAIMED" };
        }
        const prior = passSnap.exists() ? passSnap.data() : null;
        if (isLiveDayPass(prior, nowMs)) {
          return { ok: false, reason: "ALREADY_HAS_ACCESS" };
        }
        tx.set(byDiscordRef, {
          discordUserId,
          vixyEmail: email,
          userId,
          status: "ACTIVE",
          claimedAt: record.startedAt,
          expiresAt: record.expiresAt,
          lastTagCheckAt: record.startedAt,
          lastTagState: "EQUIPPED",
          endedAt: null,
          endedReason: null,
          priorDayPass: prior,
        });
        tx.set(byEmailRef, { vixyEmail: email, discordUserId, claimedAt: record.startedAt });
        tx.set(passRef, record);
        if (userId) tx.set(fx.doc(db, "day_passes", userId), record);
        return { ok: true };
      });
    } catch (err) {
      log.error("[TagTrial] claim transaction failed:", err && err.message);
      return refuse("CLAIM_FAILED");
    }
    if (!outcome) return refuse("CLAIM_FAILED");
    if (!outcome.ok) return refuse(outcome.reason);

    deps.applyDayPassRecord(record);
    try {
      await deps.syncDiscordRole(email);
    } catch (err) {
      log.warn("[TagTrial] role sync after grant failed:", err && err.message);
    }
    await recordAttempt(email, "GRANTED", null, discordUserId);
    log.log(`[TagTrial] GRANTED email=${email} discord=${discordUserId} expires=${record.expiresAt}`);
    return { granted: true, reason: null, expiresAt: record.expiresAt };
  }

  async function status(vixyEmail) {
    const email = String(vixyEmail || "").toLowerCase().trim();
    const db = deps.getDb();
    const offer = tagTrialOfferAt(now());
    if (!email || !fx.ready(db)) return { available: false, offer, claimed: false, trial: null, lastAttempt: null };

    const byEmailSnap = await fx.getDoc(fx.doc(db, C.byEmail, email));
    let trial = null;
    if (byEmailSnap.exists()) {
      const link = byEmailSnap.data();
      const ledgerSnap = link && link.discordUserId
        ? await fx.getDoc(fx.doc(db, C.byDiscordId, link.discordUserId))
        : null;
      const l = ledgerSnap && ledgerSnap.exists() ? ledgerSnap.data() : link;
      const live = l.status === "ACTIVE" && new Date(l.expiresAt).getTime() > now();
      trial = {
        status: live ? "ACTIVE" : l.status === "ACTIVE" ? "EXPIRED" : l.status || "UNKNOWN",
        claimedAt: l.claimedAt || null,
        expiresAt: l.expiresAt || null,
        endedAt: l.endedAt || null,
        endedReason: l.endedReason || null,
      };
    }
    const attemptSnap = await fx.getDoc(fx.doc(db, C.attempts, email));
    const a = attemptSnap.exists() ? attemptSnap.data() : null;
    return {
      available: true,
      offer,
      claimed: !!trial,
      trial,
      lastAttempt: a ? { at: a.at, outcome: a.outcome, reason: a.reason || null } : null,
    };
  }

  async function endTrial(ledger, docId, ledgerStatus, reason, tagState) {
    const db = deps.getDb();
    const endedAt = new Date(now()).toISOString();
    await fx.setDoc(
      fx.doc(db, C.byDiscordId, docId),
      { status: ledgerStatus, endedAt, endedReason: reason, lastTagCheckAt: endedAt, lastTagState: tagState },
      { merge: true },
    );
    // Only touch the pass if it is still THIS trial. A day pass bought after
    // the trial shares the document and must never be expired by it.
    const passKeys = [ledger.vixyEmail, ledger.userId].filter(Boolean);
    for (const key of passKeys) {
      const snap = await fx.getDoc(fx.doc(db, "day_passes", key));
      const p = snap.exists() ? snap.data() : null;
      if (p && p.entitlementType === TAG_TRIAL_ENTITLEMENT_TYPE && p.status === "ACTIVE") {
        await fx.setDoc(fx.doc(db, "day_passes", key), { status: "EXPIRED", updatedAt: endedAt }, { merge: true });
      }
    }
    deps.markDayPassEnded(ledger.vixyEmail, ledger.userId, ledger.discordUserId || docId);
    try {
      await deps.syncDiscordRole(ledger.vixyEmail);
    } catch (err) {
      log.warn("[TagTrial] role sync after end failed:", err && err.message);
    }
  }

  async function recheckActiveTrials() {
    const db = deps.getDb();
    const counts = {
      ran: false,
      checked: 0,
      equipped: 0,
      notEquipped: 0,
      unknown: 0,
      primaryGuildFieldPresent: 0,
      endedTagRemoved: 0,
      expired: 0,
      errors: 0,
    };
    if (!fx.ready(db)) return { ...counts, reason: "SERVICE_UNAVAILABLE" };
    const guildId = deps.getGuildId();
    if (!guildId) return { ...counts, reason: "NOT_CONFIGURED" };
    counts.ran = true;

    const snap = await fx.getDocs(
      fx.query(
        fx.collection(db, C.byDiscordId),
        fx.where("status", "==", "ACTIVE"),
        fx.limit(RECHECK_BATCH_LIMIT),
      ),
    );
    for (const d of snap.docs) {
      const ledger = d.data();
      const docId = d.id;
      counts.checked++;
      try {
        if (new Date(ledger.expiresAt).getTime() <= now()) {
          await endTrial(ledger, docId, "EXPIRED", "TRIAL_PERIOD_ENDED", ledger.lastTagState || "UNKNOWN");
          counts.expired++;
          continue;
        }
        let user = null;
        try {
          user = await deps.fetchDiscordUserAsBot(ledger.discordUserId || docId);
        } catch {
          user = null;
        }
        if (user && Object.prototype.hasOwnProperty.call(user, "primary_guild")) {
          counts.primaryGuildFieldPresent++;
        }
        const tagState = readServerTagState(user, guildId);
        if (tagState === "NOT_EQUIPPED") {
          await endTrial(ledger, docId, "ENDED_TAG_REMOVED", "TAG_REMOVED", tagState);
          counts.notEquipped++;
          counts.endedTagRemoved++;
          continue;
        }
        if (tagState === "EQUIPPED") counts.equipped++;
        else counts.unknown++;
        await fx.setDoc(
          fx.doc(db, C.byDiscordId, docId),
          { lastTagCheckAt: new Date(now()).toISOString(), lastTagState: tagState },
          { merge: true },
        );
      } catch (err) {
        counts.errors++;
        log.warn("[TagTrial] recheck failed for one trial:", err && err.message);
      }
    }
    return counts;
  }

  return { claim, status, recheckActiveTrials, recordAttempt };
}
