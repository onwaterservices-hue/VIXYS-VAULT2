// Explicit .ts extension: tests/referral_invariants.mjs imports this module
// directly under Node's type stripping, which will not resolve an
// extensionless relative specifier. tsconfig has allowImportingTsExtensions.
import { PRICING } from '../../config/pricing.ts';
/**
 * VIXY VAULT - Referral reward policy.
 * SINGLE SOURCE OF TRUTH for referral economics. Nothing else may hardcode a
 * reward amount, redemption rate, or threshold.
 * All money is INTEGER CREDITS. 1 credit = $0.01. Never floats: drift in a
 * money ledger surfaces months later as balances that cannot be reconciled.
 */

export const REFERRAL_POLICY_VERSION = "v1.0.0";
export const CREDITS_PER_USD = 100;

/**
 * Flat per tier, independent of billing interval. Stripe carries annual prices
 * for all three tiers; a straight 20% of an annual Elite first payment
 * (~$1,990) would create a ~$398 liability on one refundable charge.
 */
export const TIER_REWARD_CREDITS: Record<string, number> = {
  STARTER_MONTHLY: 580,
  STARTER_YEARLY: 580,
  PRO_QUANT_MONTHLY: 1580,
  PRO_QUANT_YEARLY: 1580,
  ELITE_QUANT_MONTHLY: 3980,
  ELITE_QUANT_YEARLY: 3980,
  STARTER: 580,
  STARTER_PASS: 580,
  PRO: 1580,
  PRO_PASS: 1580,
  PRO_QUANT: 1580,
  ELITE: 3980,
  ELITE_PASS: 3980,
  ELITE_QUANT: 3980,
};

/**
 * Monthly list price per tier, in cents, derived from src/config/pricing.ts so
 * this file and the pricing UI cannot disagree about what Stripe charges. Used
 * only to DISPLAY what share of a friend's plan a referral credit is -- it never
 * changes a reward. A Stripe price change is made once, in that config.
 */
export const PLAN_MONTHLY_PRICE_CENTS: Record<string, number> = {
  STARTER: PRICING.plans.STARTER.monthlyUsd * 100,
  PRO_QUANT: PRICING.plans.PRO.monthlyUsd * 100,
  ELITE_QUANT: PRICING.plans.ELITE.monthlyUsd * 100,
};

const PROGRAM_TIERS = [
  { plan: "STARTER", label: "Starter", rewardKey: "STARTER_MONTHLY" },
  { plan: "PRO_QUANT", label: "Pro", rewardKey: "PRO_QUANT_MONTHLY" },
  { plan: "ELITE_QUANT", label: "Elite", rewardKey: "ELITE_QUANT_MONTHLY" },
];

/**
 * The public Invite to Earn terms, derived only from the constants in this file.
 * shareOfMonthlyPricePercent is the flat credit divided by the plan's monthly
 * price, to one decimal.
 */
export function referralProgramSummary(discountPercent: number) {
  return {
    policyVersion: REFERRAL_POLICY_VERSION,
    discountPercent,
    tiers: PROGRAM_TIERS.map((t) => {
      const rewardCredits = TIER_REWARD_CREDITS[t.rewardKey];
      const monthlyPriceCents = PLAN_MONTHLY_PRICE_CENTS[t.plan];
      return {
        plan: t.plan,
        label: t.label,
        monthlyPriceCents,
        rewardCredits,
        rewardUsd: creditsToUsd(rewardCredits),
        shareOfMonthlyPricePercent: Math.round((rewardCredits / monthlyPriceCents) * 1000) / 10,
      };
    }),
    sameRewardOnAnnualPlans: TIER_REWARD_CREDITS.STARTER_YEARLY === TIER_REWARD_CREDITS.STARTER_MONTHLY,
    rewardCappedAtAmountPaid: true,
    dayPassEarnsCredit: false,
    creditsPerUsd: CREDITS_PER_USD,
    creditsPerFreeDay: CREDITS_PER_DAY,
    payoutThresholdCredits: PAYOUT_THRESHOLD_CREDITS,
    clawbackHoldDays: CLAWBACK_HOLD_DAYS,
    creditExpiryDays: CREDIT_EXPIRY_DAYS,
  };
}

/** Day Pass earns nothing: $9.99 in, 999 credits out would pay a day for a day. */
export const NON_QUALIFYING_PLANS = new Set([
  "DAY_PASS", "DAY_PASS_ACTIVE", "DAY_PASS_PURCHASED",
]);

/** PEGGED to the real $9.99 Day Pass price. If that price changes, change this. */
export const CREDITS_PER_DAY = 999;
export const PAYOUT_THRESHOLD_CREDITS = 2500;
export const CLAWBACK_HOLD_DAYS = 14;
export const CREDIT_EXPIRY_DAYS = 90;
export const CODE_MIN_LENGTH = 4;
export const CODE_MAX_LENGTH = 16;

/**
 * Codes nobody may claim. DIRECT is critical: the admin Create-User form
 * defaults referralCode to "DIRECT", so a user who claimed it would be
 * credited for every manually-created account in the system.
 */
export const RESERVED_CODES = new Set([
  "DIRECT", "VIXY", "VIXYVAULT", "VAULT", "ADMIN", "OWNER", "MOD",
  "SUPPORT", "TEST", "SYSTEM", "NULL", "UNDEFINED", "ANONYMOUS",
  "STARTER", "PRO", "ELITE", "FREE", "TRIAL", "REFERRAL", "INVITE",
]);

/** Fraud / rejection reason codes. Never reject silently. */
export const REASON = {
  SELF_REFERRAL: "SELF_REFERRAL",
  DUPLICATE_CUSTOMER: "DUPLICATE_CUSTOMER",
  DUPLICATE_REFERRAL: "DUPLICATE_REFERRAL",
  PAYMENT_NOT_CONFIRMED: "PAYMENT_NOT_CONFIRMED",
  PAYMENT_REVERSED: "PAYMENT_REVERSED",
  ATTRIBUTION_CONFLICT: "ATTRIBUTION_CONFLICT",
  IDENTITY_CONFLICT: "IDENTITY_CONFLICT",
  ALREADY_CONVERTED: "ALREADY_CONVERTED",
  NON_QUALIFYING_PLAN: "NON_QUALIFYING_PLAN",
  REFERRER_NOT_FOUND: "REFERRER_NOT_FOUND",
  CODE_RESERVED: "CODE_RESERVED",
  CODE_TAKEN: "CODE_TAKEN",
  CODE_INVALID_FORMAT: "CODE_INVALID_FORMAT",
} as const;

export type ReasonCode = (typeof REASON)[keyof typeof REASON];

/**
 * Reward for a qualifying plan, in credits.
 *
 * REQUIRES amountPaidCents. Not optional, never defaulted.
 *
 * WHY: a 100%-off coupon still produces a completed checkout carrying a real
 * plan string. This account has live 100%-off coupons WITH redemptions
 * (MODS: 100% off forever, 11 redemptions; MESSUP: 6). Rewarding on plan
 * alone would mint 3,980 credits against $0.00 collected, and anyone holding
 * a 100%-off code could farm credits by referring friends onto free plans.
 *
 * Reward on money actually collected, never on plan alone.
 */
export function rewardCreditsForPlan(
  plan: string | null | undefined,
  amountPaidCents: number | null | undefined,
): number {
  if (!plan) return 0;
  if (!amountPaidCents || amountPaidCents <= 0) return 0;

  const key = String(plan).trim().toUpperCase();
  if (NON_QUALIFYING_PLANS.has(key)) return 0;

  const reward = TIER_REWARD_CREDITS[key] ?? 0;
  return Math.min(reward, amountPaidCents);
}

export function creditsToUsd(credits: number): string {
  return (Math.round(credits) / CREDITS_PER_USD).toFixed(2);
}

export function daysAffordable(credits: number): number {
  return Math.floor(Math.max(0, credits) / CREDITS_PER_DAY);
}
