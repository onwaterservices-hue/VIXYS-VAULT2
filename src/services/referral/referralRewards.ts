/**
 * VIXY VAULT - Referral reward + VIXY credits ledger.
 *
 * EXTENDS the existing referral system (fdc2bce). DOES NOT REPLACE IT.
 * Already built in referralService.ts - do not duplicate: code storage,
 * normalization, referral_attributions, grantBonusDay(), the REFER_20 coupon.
 *
 * Adds: qualified-conversion rewards, credits ledger, reversal, redemption,
 * payout tickets, leaderboard.
 *
 * IDENTITY: the existing service keys on email, which is the documented Apple
 * Pay / iCloud private-relay mismatch risk. Everything here keys on internal
 * user IDs and Stripe customer IDs first.
 *
 * BALANCE IS NEVER STORED. No user.credits field. Balance is the sum of
 * vxy_ledger entries, so a corrupted balance is not representable.
 */

import {
  doc, getDoc, setDoc, collection, query, where, getDocs,
  runTransaction, Firestore,
} from "firebase/firestore";

import {
  REFERRAL_POLICY_VERSION, CLAWBACK_HOLD_DAYS, CREDIT_EXPIRY_DAYS,
  CREDITS_PER_DAY, PAYOUT_THRESHOLD_CREDITS, rewardCreditsForPlan,
  REASON, ReasonCode,
} from "./referralPolicy";

export const NEW_COL = {
  REWARDS: "referral_rewards",
  LEDGER: "vxy_ledger",
  TICKETS: "referral_payout_tickets",
  EVENTS: "referral_events",
  LEADERBOARD: "referral_leaderboard",
} as const;

export type LedgerType = "EARN" | "REDEEM_DAY" | "PAYOUT" | "REVERSAL" | "ADJUSTMENT";
export type LedgerStatus = "PENDING" | "AVAILABLE" | "ESCROWED" | "REDEEMED" | "REVERSED";

const nowIso = () => new Date().toISOString();
const addDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

async function logEvent(db: Firestore, type: string, payload: Record<string, unknown>) {
  const id = Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  console.log("[REFERRAL] " + type, JSON.stringify(payload));
  try {
    await setDoc(doc(db, NEW_COL.EVENTS, id), { type, ...payload, at: nowIso() });
  } catch (e) {
    console.warn("[REFERRAL] event log write failed", String(e));
  }
}

export interface QualifyInput {
  referrerUserId: string;
  referredUserId: string;
  referralId: string;
  plan: string;
  stripeCustomerId: string;
  stripeEventId: string;
  stripeCheckoutSessionId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  amountPaidCents?: number;
}

/**
 * Deterministic and idempotent. The ONLY place a reward is created.
 *
 * INVARIANT 2 is enforced by the document ID: the reward document IS the
 * referral ID, so a duplicate Stripe webhook cannot create a second reward.
 * A check-then-write would race here; a create-only transaction cannot.
 *
 * This is stronger than the shared in-memory processedWebhookEvents Set,
 * which is empty after a cold start and would let a retry through.
 */
export async function qualifyReferralConversion(
  db: Firestore, input: QualifyInput,
): Promise<{ ok: boolean; rewardCredits?: number; reason?: ReasonCode }> {
  const {
    referrerUserId, referredUserId, referralId,
    plan, stripeCustomerId, stripeEventId,
  } = input;

  if (!referralId || !referrerUserId || !referredUserId) {
    return { ok: false, reason: REASON.REFERRER_NOT_FOUND };
  }

  if (referrerUserId === referredUserId) {
    await logEvent(db, "REFERRAL_FRAUD_FLAG", { referralId, reason: REASON.SELF_REFERRAL });
    return { ok: false, reason: REASON.SELF_REFERRAL };
  }

  const rewardCredits = rewardCreditsForPlan(plan, input.amountPaidCents);
  if (rewardCredits <= 0) {
    const why = (!input.amountPaidCents || input.amountPaidCents <= 0)
      ? REASON.PAYMENT_NOT_CONFIRMED
      : REASON.NON_QUALIFYING_PLAN;
    await logEvent(db, "REFERRAL_NON_QUALIFYING", {
      referralId, plan, amountPaidCents: input.amountPaidCents ?? 0, reason: why,
    });
    return { ok: false, reason: why };
  }

  let awarded = false;
  let blocked: ReasonCode | null = null;

  await runTransaction(db, async (tx) => {
    const rewardRef = doc(db, NEW_COL.REWARDS, referralId);
    if ((await tx.get(rewardRef)).exists()) return;

    const custRef = doc(db, NEW_COL.REWARDS, "__cust__" + stripeCustomerId);
    const custSeen = await tx.get(custRef);
    if (custSeen.exists() && custSeen.data()?.referralId !== referralId) {
      blocked = REASON.DUPLICATE_CUSTOMER;
      return;
    }

    const availableAt = addDays(CLAWBACK_HOLD_DAYS);
    tx.set(custRef, { stripeCustomerId, referralId, at: nowIso() });

    tx.set(rewardRef, {
      rewardId: referralId, referralId, referrerUserId, referredUserId,
      amountCredits: rewardCredits, currency: "VXY",
      status: "PENDING", plan, stripeEventId, stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      amountPaidCents: input.amountPaidCents ?? null,
      createdAt: nowIso(), availableAt,
      expiresAt: addDays(CLAWBACK_HOLD_DAYS + CREDIT_EXPIRY_DAYS),
      policyVersion: REFERRAL_POLICY_VERSION,
    });

    tx.set(doc(db, NEW_COL.LEDGER, "earn_" + referralId), {
      entryId: "earn_" + referralId, userId: referrerUserId, referralId,
      stripeEventId, amountCredits: rewardCredits,
      type: "EARN", status: "PENDING", availableAt,
      createdAt: nowIso(), policyVersion: REFERRAL_POLICY_VERSION,
    });

    awarded = true;
  });

  if (blocked) {
    await logEvent(db, "REFERRAL_FRAUD_FLAG", { referralId, reason: blocked });
    return { ok: false, reason: blocked };
  }
  if (!awarded) return { ok: false, reason: REASON.ALREADY_CONVERTED };

  await logEvent(db, "REFERRAL_REWARD_CREATED", {
    referralId, referrerUserId, rewardCredits, stripeEventId, plan,
  });
  return { ok: true, rewardCredits };
}

/**
 * Refund / dispute reversal. Writes a NEGATIVE offsetting entry; never deletes
 * history. If the referrer already spent the credits we cannot un-spend them,
 * so the negative entry offsets future earnings instead. Balance may go
 * negative internally; the UI floors the display at zero.
 * Idempotent per Stripe event via the entry ID.
 */
export async function reverseReferralReward(
  db: Firestore, referralId: string, reason: ReasonCode, stripeEventId: string,
): Promise<{ ok: boolean; reversedCredits?: number }> {
  const snap = await getDoc(doc(db, NEW_COL.REWARDS, referralId));
  if (!snap.exists()) return { ok: false };

  const reward = snap.data() as { amountCredits: number; referrerUserId: string; status: string };
  if (reward.status === "REVERSED") return { ok: true, reversedCredits: 0 };

  const entryId = "rev_" + referralId + "_" + stripeEventId;

  await runTransaction(db, async (tx) => {
    const revRef = doc(db, NEW_COL.LEDGER, entryId);
    if ((await tx.get(revRef)).exists()) return;

    tx.set(revRef, {
      entryId, userId: reward.referrerUserId, referralId, stripeEventId,
      amountCredits: -Math.abs(reward.amountCredits),
      type: "REVERSAL", status: "REVERSED", reversalReason: reason,
      createdAt: nowIso(), policyVersion: REFERRAL_POLICY_VERSION,
    });

    tx.set(doc(db, NEW_COL.REWARDS, referralId), {
      status: "REVERSED", reversedAt: nowIso(), reversalReason: reason,
    }, { merge: true });
  });

  await logEvent(db, "REFERRAL_REWARD_REVERSED", { referralId, reason, stripeEventId });
  return { ok: true, reversedCredits: reward.amountCredits };
}

export interface Balance {
  available: number; pending: number; escrowed: number;
  redeemed: number; reversed: number; lifetimeEarned: number;
}

/** Balance is always derived from the ledger. Never read from a stored field. */
export async function getBalance(db: Firestore, userId: string): Promise<Balance> {
  const snap = await getDocs(
    query(collection(db, NEW_COL.LEDGER), where("userId", "==", userId)),
  );

  const b: Balance = {
    available: 0, pending: 0, escrowed: 0,
    redeemed: 0, reversed: 0, lifetimeEarned: 0,
  };
  const now = Date.now();

  snap.forEach((d) => {
    const e = d.data() as {
      amountCredits: number; type: LedgerType;
      status: LedgerStatus; availableAt?: string;
    };
    const amt = Number(e.amountCredits) || 0;

    if (e.type === "EARN") {
      if (e.status === "REVERSED") return;
      b.lifetimeEarned += amt;
      const matured = e.availableAt ? Date.parse(e.availableAt) <= now : true;
      if (!matured) b.pending += amt;
      else b.available += amt;
    } else if (e.type === "REVERSAL") {
      b.reversed += Math.abs(amt);
      b.available += amt;
    } else if (e.type === "REDEEM_DAY" || e.type === "PAYOUT") {
      if (e.status === "ESCROWED") b.escrowed += Math.abs(amt);
      else b.redeemed += Math.abs(amt);
      b.available += amt;
    } else if (e.type === "ADJUSTMENT") {
      b.available += amt;
    }
  });

  return b;
}

/**
 * Path A: redeem credits for days. Debits the ledger; the CALLER then grants
 * the day via the existing grantBonusDay/day_passes path, so this inherits
 * the cross-instance Firestore fallback already in place.
 * If the grant fails the caller MUST write a compensating ADJUSTMENT.
 */
export async function redeemCreditsForDay(
  db: Firestore, userId: string, days = 1,
): Promise<{ ok: boolean; debited?: number; entryId?: string; message?: string }> {
  const wanted = Math.max(1, Math.floor(days));
  const cost = CREDITS_PER_DAY * wanted;

  const balance = await getBalance(db, userId);
  if (balance.available < cost) {
    return { ok: false, message: "Need " + (cost - balance.available) + " more credits." };
  }

  const entryId = "day_" + userId + "_" + Date.now();
  await setDoc(doc(db, NEW_COL.LEDGER, entryId), {
    entryId, userId, amountCredits: -cost,
    type: "REDEEM_DAY", status: "REDEEMED", daysGranted: wanted,
    createdAt: nowIso(), policyVersion: REFERRAL_POLICY_VERSION,
  });

  await logEvent(db, "REFERRAL_CREDITS_REDEEMED_DAY", { userId, cost, days: wanted });
  return { ok: true, debited: cost, entryId };
}

/**
 * Path B: manual payout ticket. Credits ESCROW at request time, not at
 * fulfilment - otherwise the same balance could also be spent on days while
 * the ticket sits open, and the double-spend would surface weeks later.
 */
export async function openPayoutTicket(
  db: Firestore, userId: string, ticketId: string,
): Promise<{ ok: boolean; ticketId?: string; credits?: number; message?: string }> {
  const balance = await getBalance(db, userId);
  if (balance.available < PAYOUT_THRESHOLD_CREDITS) {
    const short = PAYOUT_THRESHOLD_CREDITS - balance.available;
    return { ok: false, message: short + " more credits until payouts unlock." };
  }

  const amount = balance.available;

  await setDoc(doc(db, NEW_COL.LEDGER, "escrow_" + ticketId), {
    entryId: "escrow_" + ticketId, userId, ticketId,
    amountCredits: -amount, type: "PAYOUT", status: "ESCROWED",
    createdAt: nowIso(), policyVersion: REFERRAL_POLICY_VERSION,
  });

  await setDoc(doc(db, NEW_COL.TICKETS, ticketId), {
    ticketId, userId, credits: amount, status: "REQUESTED",
    createdAt: nowIso(), policyVersion: REFERRAL_POLICY_VERSION,
  });

  await logEvent(db, "REFERRAL_PAYOUT_REQUESTED", { userId, ticketId, credits: amount });
  return { ok: true, ticketId, credits: amount };
}

/** Admin resolves a ticket. Auditable. No direct balance editing exists. */
export async function resolvePayoutTicket(
  db: Firestore, ticketId: string, adminUserId: string,
  outcome: "FULFILLED" | "DENIED",
  payoutType: string | null, reason: string,
): Promise<{ ok: boolean; message?: string }> {
  const tSnap = await getDoc(doc(db, NEW_COL.TICKETS, ticketId));
  if (!tSnap.exists()) return { ok: false, message: "Ticket not found." };

  const t = tSnap.data() as { userId: string; credits: number; status: string };
  if (t.status !== "REQUESTED") return { ok: false, message: "Ticket already " + t.status + "." };

  if (outcome === "DENIED") {
    await setDoc(doc(db, NEW_COL.LEDGER, "release_" + ticketId), {
      entryId: "release_" + ticketId, userId: t.userId, ticketId,
      amountCredits: Math.abs(t.credits),
      type: "ADJUSTMENT", status: "AVAILABLE",
      reason, adminUserId, createdAt: nowIso(),
      policyVersion: REFERRAL_POLICY_VERSION,
    });
  } else {
    await setDoc(doc(db, NEW_COL.LEDGER, "escrow_" + ticketId), {
      status: "REDEEMED", fulfilledAt: nowIso(), adminUserId, payoutType, reason,
    }, { merge: true });
  }

  await setDoc(doc(db, NEW_COL.TICKETS, ticketId), {
    status: outcome, adminUserId, payoutType, reason, resolvedAt: nowIso(),
  }, { merge: true });

  await logEvent(db, "REFERRAL_PAYOUT_RESOLVED", { ticketId, outcome, adminUserId, payoutType });
  return { ok: true };
}

/**
 * Reverse every unreversed reward earned from a given referred customer.
 *
 * A Stripe charge does not carry the original checkout sessionId, so we cannot
 * resolve the referral by ID from a refund event. We look the reward up by the
 * referred customer instead, which is the identity the conversion recorded.
 *
 * Idempotent: reverseReferralReward keys its ledger entry on the Stripe event
 * ID, so a replayed refund event writes nothing new.
 */
export async function reverseRewardsForReferredUser(
  db: Firestore, referredUserId: string, reason: ReasonCode, stripeEventId: string,
): Promise<{ ok: boolean; reversed: number }> {
  if (!referredUserId) return { ok: false, reversed: 0 };

  const snap = await getDocs(
    query(collection(db, NEW_COL.REWARDS), where("referredUserId", "==", referredUserId)),
  );

  let reversed = 0;
  for (const d of snap.docs) {
    const r = d.data() as { referralId?: string; status?: string };
    if (!r.referralId || r.status === "REVERSED") continue;
    const out = await reverseReferralReward(db, r.referralId, reason, stripeEventId);
    if (out.ok && (out.reversedCredits ?? 0) > 0) reversed += 1;
  }

  if (reversed > 0) {
    await logEvent(db, "REFERRAL_REWARDS_REVERSED_BULK", { referredUserId, reversed, reason });
  }
  return { ok: true, reversed };
}
