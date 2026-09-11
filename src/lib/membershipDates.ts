/**
 * Membership dates and plan classification shared by App and the pricing view.
 *
 * Every value here is read from the entitlement record the server returns.
 * When the server has not provided a date, the result is an empty string and
 * the UI decides how to show "unknown". Nothing in this module guesses.
 */

export interface MembershipDateSource {
  plan?: string | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean | null;
  dayPass?: { active?: boolean | null; expiresAt?: string | null } | null;
}

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const formatDateTime = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Returns e.g. "Pass ends Sep 11, 3:42 PM", "Renews Oct 10, 2026", "Ends Oct 10, 2026", or ''. */
export function describeMembershipWindow(ent: MembershipDateSource | null | undefined): string {
  if (!ent) return '';

  const dp = ent.dayPass;
  if (dp?.active && dp.expiresAt) {
    const ms = new Date(dp.expiresAt).getTime();
    if (Number.isFinite(ms) && ms > 0) return `Pass ends ${formatDateTime(ms)}`;
  }

  const periodEndSec = Number(ent.currentPeriodEnd);
  if (Number.isFinite(periodEndSec) && periodEndSec > 0) {
    return `${ent.cancelAtPeriodEnd ? 'Ends' : 'Renews'} ${formatDate(periodEndSec * 1000)}`;
  }

  return '';
}

/**
 * True when the server classifies the account as holding a recurring plan.
 * The entitlements route reports plan "NONE" for an account whose only access
 * is a day pass, so NONE and DAY_PASS both mean "no recurring plan".
 */
export function hasRecurringPlanFrom(ent: { plan?: string | null } | null | undefined): boolean {
  const p = String(ent?.plan ?? '').trim().toUpperCase();
  return p !== '' && p !== 'NONE' && p !== 'DAY_PASS';
}
