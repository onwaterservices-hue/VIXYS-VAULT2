/**
 * VIXY VAULT — engine semantics (single source of truth for evidence language).
 *
 * The UI used to name evidence with marketing words that disagreed with the
 * numbers: lock quality 50–69 rendered "STRONG EVIDENCE", a hardcoded chip said
 * "MARKET ALIGNMENT: STRONG", and a 52% conviction sat under "CONFIRMING BIAS".
 * Observed live 2026-09-10 at 7m15s into a cycle: conviction 52, lock quality
 * 44, reversal risk 43 — with the card announcing CONVERGENCE and STRONG.
 *
 * Every label below is a deterministic, documented rule over the numbers the
 * engine actually publishes. Thresholds that matter to the lock are taken from
 * the REAL gate (`lockGate.minLockQuality`) rather than invented here, so the
 * words can never claim more than the gate would grant. Nothing here changes a
 * decision; it only describes one honestly.
 */

export type EvidenceState =
  | 'NO DATA'
  | 'SKIP'
  | 'LOCKED'
  | 'CONFLICTED'
  | 'LOCK READY'
  | 'HIGH CONVICTION'
  | 'CONVERGING'
  | 'DEVELOPING'
  | 'WEAK BIAS';

export interface EvidenceInput {
  confidence: number | null | undefined;
  lockQuality: number | null | undefined;
  reversalRisk?: number | null;
  /** agreeing evidence families out of 11 (canonical `evidenceAlignment`) */
  evidenceAlignment?: number | null;
  /** the real gate's lock-quality bar for the current tier, when known */
  gateMinLockQuality?: number | null;
  /** the real gate's verdict, when the payload carries it */
  gateEligible?: boolean | null;
  isLocked?: boolean;
  isSkip?: boolean;
  hasConflict?: boolean;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * One state for the whole card. Order matters: terminal states first, then
 * the gate's own verdict, then descriptive tiers that can never outrank it.
 */
export function evidenceState(i: EvidenceInput): EvidenceState {
  if (i.isSkip) return 'SKIP';
  if (i.isLocked) return 'LOCKED';
  const conf = num(i.confidence);
  const lq = num(i.lockQuality);
  if (conf === null && lq === null) return 'NO DATA';
  const rr = num(i.reversalRisk);
  if (i.hasConflict || (rr !== null && rr >= 50)) return 'CONFLICTED';
  const gateMin = num(i.gateMinLockQuality);
  // "Lock ready" means the real gate would accept it — either it said so, or
  // the numbers clear the bar the gate is actually applying right now.
  if (i.gateEligible === true) return 'LOCK READY';
  if (gateMin !== null && lq !== null && lq >= gateMin && (conf === null || conf >= 70)) return 'LOCK READY';
  if ((conf ?? 0) >= 75 && (lq ?? 0) >= 70) return 'HIGH CONVICTION';
  if ((conf ?? 0) >= 60 || (lq ?? 0) >= 60) return 'CONVERGING';
  if ((conf ?? 0) >= 55 || (lq ?? 0) >= 45) return 'DEVELOPING';
  return 'WEAK BIAS';
}

/** Word for a conviction/confidence number. 50–54 is UNCERTAIN, not "moderate". */
export function confidenceLabel(confidence: number | null | undefined): string {
  const c = num(confidence);
  if (c === null) return 'NO DATA';
  if (c >= 75) return 'HIGH CONFIDENCE';
  if (c >= 65) return 'MODERATE CONFIDENCE';
  if (c >= 55) return 'DEVELOPING';
  return 'UNCERTAIN';
}

/**
 * Word for a lock-quality score. "MEETS GATE" is the only tier that claims
 * lock-worthiness, and it is granted only against the gate's real bar.
 */
export function lockQualityLabel(
  lockQuality: number | null | undefined,
  gateMinLockQuality?: number | null,
): string {
  const lq = num(lockQuality);
  if (lq === null) return 'AWAITING ENGINE DATA';
  const gateMin = num(gateMinLockQuality);
  if (gateMin !== null && lq >= gateMin) return 'MEETS LOCK GATE';
  if (lq >= 75) return 'NEAR GATE';
  if (lq >= 60) return 'CONVERGING';
  if (lq >= 45) return 'BUILDING';
  return 'WEAK';
}

/** Word for how many of the 11 evidence families agree. */
export function alignmentLabel(evidenceAlignment: number | null | undefined): string {
  const n = num(evidenceAlignment);
  if (n === null) return 'NO DATA';
  if (n >= 8) return 'STRONG';
  if (n >= 6) return 'MODERATE';
  if (n >= 4) return 'WEAK';
  return 'CONFLICTED';
}
