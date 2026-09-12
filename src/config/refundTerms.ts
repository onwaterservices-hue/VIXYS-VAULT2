/**
 * VIXY VAULT — REFUND AND CANCELLATION TERMS, SINGLE SOURCE
 *
 * The posted Refund & Cancellation Policy and every commercial surface that
 * summarises it must agree, because a buyer decides on the summary and is held
 * to the policy.
 *
 * They did not agree. The paywall a visitor sees at the moment they choose
 * between another $9.99 day pass and a subscription (TrialExpiredOverlay) read:
 *
 *     "30-day money-back guarantee on all subscriptions. Cancel anytime in 1 click."
 *
 * while the posted policy grants 100% back within 14 days of the FIRST
 * subscription purchase only, by emailing the billing desk, with every later
 * renewal explicitly non-refundable — and cancelling takes three steps through
 * the Stripe Customer Portal, not one click. Each difference favoured the
 * seller: twice the window, every renewal instead of the first purchase,
 * automatic instead of on request.
 *
 * The real terms are a good offer and they are stated here once. Import them;
 * do not retype a number or a window into a component.
 * `tests/refund-terms-single-source.invariants.mjs` fails if a UI file states a
 * refund window of its own.
 */

export const REFUND_TERMS = {
  /** Days from the initial subscription signup in which a full refund may be requested. */
  windowDays: 14,
  /** The guarantee covers the first subscription purchase, not every renewal. */
  appliesTo: 'first subscription purchase',
  /** A refund is requested, not automatic. */
  requestedBy: 'email',
  billingEmail: 'vixyvault0@gmail.com',
  /** How long Stripe takes to return the money once approved. */
  processingTime: '3-5 business days',
  /** Where a subscriber cancels, in the words the terminal's own navigation uses. */
  cancelPath: 'Settings → Subscription & Billing',
} as const;

/** The subject line the policy asks refund requests to use. */
export const REFUND_REQUEST_SUBJECT = `${REFUND_TERMS.windowDays}-Day Refund Request`;

/**
 * One-line summary for commercial surfaces (paywall footers, pricing views).
 * Every clause here is something the posted policy actually promises.
 */
export const REFUND_GUARANTEE_SUMMARY =
  `Your ${REFUND_TERMS.appliesTo} is refundable in full within ${REFUND_TERMS.windowDays} days — ` +
  `email ${REFUND_TERMS.billingEmail}. Cancel any time in ${REFUND_TERMS.cancelPath}; ` +
  `access runs to the end of the period you paid for.`;
