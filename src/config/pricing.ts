/**
 * VIXY VAULT — PRICES, SINGLE SOURCE
 *
 * Stripe is the authority: these numbers must equal what the Payment Links in
 * `stripeLinks.ts` actually charge. Nothing here changes a price. It moves the
 * numbers the product already displayed into one place, because they were typed
 * out in ten files and had begun to disagree — a comment in the expiry paywall
 * described Starter as $29 directly above copy charging $24.
 *
 * The day-pass-to-monthly arithmetic is the one honest persuasion this funnel
 * has: three passes genuinely cost more than a month of Starter. That argument
 * only works while every printed number is right, so the sentence is generated
 * here rather than retyped on each surface.
 *
 * `tests/pricing-single-source.invariants.mjs` fails if a component prints a
 * plan price of its own again.
 */

export const PRICING = {
  dayPass: {
    usd: 9.99,
    hours: 24,
  },
  plans: {
    STARTER: { monthlyUsd: 24, annualPerMonthUsd: 19 },
    PRO: { monthlyUsd: 79, annualPerMonthUsd: 64 },
    ELITE: { monthlyUsd: 199, annualPerMonthUsd: 159 },
  },
} as const;

export type PlanKey = keyof typeof PRICING.plans;

/**
 * Whole dollars print without cents and with thousands grouped ("$1,908");
 * anything else prints to the cent ("$9.99").
 */
export function usd(amount: number): string {
  return Number.isInteger(amount)
    ? `$${amount.toLocaleString('en-US')}`
    : `$${amount.toFixed(2)}`;
}

export const DAY_PASS_PRICE = usd(PRICING.dayPass.usd);

/** How many day passes it takes to reach a plan's monthly price, and what they cost. */
export function passesEqualling(planKey: PlanKey): { count: number; cost: string } {
  const monthly = PRICING.plans[planKey].monthlyUsd;
  const count = Math.ceil(monthly / PRICING.dayPass.usd);
  return { count, cost: usd(Math.round(count * PRICING.dayPass.usd * 100) / 100) };
}

const THREE_PASSES = usd(Math.round(3 * PRICING.dayPass.usd * 100) / 100);
export const THREE_DAY_PASSES_COST = THREE_PASSES;
export const STARTER_MONTHLY = usd(PRICING.plans.STARTER.monthlyUsd);

/**
 * The comparison shown to a pass holder. Both halves are live prices, not
 * projections. Stated as arithmetic — no countdown, no invented discount, no
 * scarcity — and it never frames not subscribing as the benefit.
 */
export const PASS_VS_STARTER = `Three day passes cost ${THREE_PASSES}. Starter is ${STARTER_MONTHLY} and runs all 30 days.`;
