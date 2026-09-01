/**
 * Shared presentation helpers for the canonical 15M decision.
 *
 * The backend sends direction, confidence, lockScore and reversalRisk as null
 * whenever it has no committed decision for the cycle (currentState
 * 'HYDRATING'). Every consumer used to substitute its own literal for that null
 * -- `|| 'UP'`, `?? 87`, `|| 78`, `?? 28`, `|| 75` -- so the terminal presented
 * invented values in exactly the situation where it knew nothing. Worse, the
 * substitutes were plausible and stable, so they read as a real decision.
 *
 * These helpers give the surfaces one honest way to say "not known yet".
 * They deliberately do NOT accept a fallback value: a caller that wants a
 * number where the engine has none has to write that intent out in full.
 */

/** Rendered in place of any decision-derived value the engine has not committed. */
export const UNKNOWN_DISPLAY = '—';

/**
 * True when the engine has committed a decision this cycle and the
 * decision-derived fields are therefore real measurements.
 *
 * `currentState` is authoritative: HYDRATING means no committed decision,
 * whatever else the payload happens to carry.
 */
export function hasCommittedDecision(decision?: {
  currentState?: string | null;
  direction?: string | null;
} | null): boolean {
  if (!decision) return false;
  if (decision.currentState === 'HYDRATING') return false;
  return decision.direction != null;
}

/**
 * Formats a possibly-null decision-derived number for display.
 * Returns the em dash when the value is null/undefined or non-finite, so a
 * missing reading can never be mistaken for a real one.
 */
export function formatDecisionNumber(
  value: number | null | undefined,
  opts?: { suffix?: string; digits?: number }
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return UNKNOWN_DISPLAY;
  }
  const digits = opts?.digits ?? 0;
  return `${value.toFixed(digits)}${opts?.suffix ?? ''}`;
}

/** Percentage variant: `76%` when known, `—` when not. */
export function formatDecisionPercent(value: number | null | undefined): string {
  return formatDecisionNumber(value, { suffix: '%' });
}
