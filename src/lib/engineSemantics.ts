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

/**
 * Word for a calibrated P(win) percent. Unlike the engine score this IS a
 * probability (the strike-side table's empirical frequency for the current
 * side of the open strike), so the words describe the edge over a coin flip
 * and say when the current side is the one history bets against.
 */
export function pWinLabel(pct: number | null | undefined): string {
  const p = num(pct);
  if (p === null) return 'NO MATCHING HISTORY';
  if (p >= 95) return 'AT LAYER-5 BAR';
  if (p >= 85) return 'STRONG EDGE';
  if (p >= 70) return 'CLEAR EDGE';
  if (p >= 58) return 'MODEST EDGE';
  if (p >= 42) return 'COIN FLIP';
  return 'AGAINST CURRENT SIDE';
}

export type HeadlineKind = 'PWIN' | 'ENGINE_SCORE' | 'NONE';

export interface Headline {
  kind: HeadlineKind;
  /** integer percent, or null when the engine has published nothing */
  value: number | null;
  /** what the number is: "P(WIN UP) · n=1026", "ENGINE SCORE", or "NO DATA" */
  label: string;
  /** sample size behind a P(win); null otherwise */
  n: number | null;
  /** the side P(win) is for (current side of the strike); null otherwise */
  side: 'UP' | 'DOWN' | null;
  /** the word for the number, from the matching scale above */
  word: string;
}

/**
 * The ONE headline number for a cycle. Every surface that shows "the number"
 * (Prediction Center ring, V2 right rail, hub hero, Command Center ring) reads
 * it from here so they cannot disagree: the calibrated P(win) when the table
 * has a matching cell, else the legacy engine score labelled as such, else
 * nothing. Never a default.
 */
export function headline(
  decision:
    | {
        confidence?: number | null;
        calibrated?: { pWin?: number | null; n?: number | null; currentSide?: string | null } | null;
      }
    | null
    | undefined,
): Headline {
  const p = num(decision?.calibrated?.pWin);
  if (p !== null) {
    const n = num(decision?.calibrated?.n);
    const rawSide = decision?.calibrated?.currentSide;
    const side: 'UP' | 'DOWN' | null = rawSide === 'UP' || rawSide === 'DOWN' ? rawSide : null;
    const pct = Math.round(p * 100);
    return {
      kind: 'PWIN',
      value: pct,
      label: `P(WIN${side ? ` ${side}` : ''})${n !== null ? ` · n=${n}` : ''}`,
      n,
      side,
      word: pWinLabel(pct),
    };
  }
  // The engine never scores 0 (its floor is 40–42); 0 is the client
  // placeholder before the first payload, so it is "no number", not a score.
  const c = num(decision?.confidence);
  if (c !== null && c > 0) {
    return { kind: 'ENGINE_SCORE', value: Math.round(c), label: 'ENGINE SCORE', n: null, side: null, word: confidenceLabel(c) };
  }
  return { kind: 'NONE', value: null, label: 'NO DATA', n: null, side: null, word: 'NO DATA' };
}

/**
 * Maps an engine lifecycle state onto its holographic aura class.
 *
 * The aura is a readout, not decoration, so it is only ever returned when the
 * feed is genuinely LIVE. On a stale, disconnected or errored feed this
 * returns '' and the surface sits perfectly still -- stillness is how the
 * terminal says "I am not receiving right now", and that has to stay
 * unambiguous. Direction only matters once a decision is committed, which is
 * why it splits LOCKED and nothing else.
 */
export function auraClassFor(
  lifecycle: string | null | undefined,
  opts: { feedHealth?: string | null; direction?: string | null } = {}
): string {
  const { feedHealth, direction } = opts;
  if (feedHealth && feedHealth !== 'LIVE') return '';
  const isUp = direction === 'UP' || direction === 'YES';
  const isDown = direction === 'DOWN' || direction === 'NO';

  switch (lifecycle) {
    case 'CALIBRATING': return 'vx-aura vx-aura-calibrating';
    case 'BUILDING':    return 'vx-aura vx-aura-building';
    case 'CONFIRMING':  return 'vx-aura vx-aura-confirming';
    case 'LOCKED':
      if (isUp) return 'vx-aura vx-aura-locked-up';
      if (isDown) return 'vx-aura vx-aura-locked-down';
      return 'vx-aura vx-aura-confirming';
    case 'PROTECTED':   return 'vx-aura vx-aura-protected';
    case 'SETTLED':     return 'vx-aura vx-aura-settled';
    case 'SKIPPED':     return 'vx-aura vx-aura-skipped';
    default:            return '';
  }
}

/**
 * Minimal structural view of a canonical 15-minute decision, for display
 * surfaces that only need the side and the headline number.
 */
export type EngineDecisionLike =
  | {
      direction?: string | null;
      confidence?: number | null;
      calibrated?: { pWin?: number | null; n?: number | null; currentSide?: string | null } | null;
    }
  | null
  | undefined;

/**
 * Where the current cycle stands relative to a lock.
 *
 * Gate checks only decide whether the engine may lock. The server keeps
 * re-evaluating them every tick after a lock, so a checklist read after the
 * lock shows "failing" gates (including "No lock yet this cycle: locked") for
 * a lock that already happened. Surfaces must call this first and present the
 * checklist as "what is blocking a lock" only while the cycle is OPEN.
 */
export type LockStatusKind = 'OPEN' | 'LOCKED' | 'SKIPPED' | 'SETTLED';

export interface LockStatus {
  kind: LockStatusKind;
  direction: 'UP' | 'DOWN' | null;
  lockedAt: number | null;
}

export function lockStatusOf(
  decision:
    | {
        currentState?: string | null;
        direction?: string | null;
        lockedAt?: number | null;
        lockGate?: { checks?: Array<{ id?: string; current?: unknown } | null> | null } | null;
      }
    | null
    | undefined,
): LockStatus {
  const st = decision?.currentState ?? null;
  const dir: 'UP' | 'DOWN' | null = decision?.direction === 'UP' || decision?.direction === 'DOWN' ? decision.direction : null;
  const lockedAt = typeof decision?.lockedAt === 'number' && decision.lockedAt > 0 ? decision.lockedAt : null;
  if (st === 'SETTLED') return { kind: 'SETTLED', direction: dir, lockedAt };
  if (st === 'SKIP') return { kind: 'SKIPPED', direction: null, lockedAt: null };
  if (st === 'LOCKED_UP') return { kind: 'LOCKED', direction: 'UP', lockedAt };
  if (st === 'LOCKED_DOWN') return { kind: 'LOCKED', direction: 'DOWN', lockedAt };
  if (st === 'PROTECTED') return { kind: 'LOCKED', direction: dir, lockedAt };
  const checks = Array.isArray(decision?.lockGate?.checks) ? decision!.lockGate!.checks! : [];
  const notLocked = checks.find((c) => c && c.id === 'NOT_LOCKED');
  if (lockedAt !== null || notLocked?.current === 'locked') return { kind: 'LOCKED', direction: dir, lockedAt };
  return { kind: 'OPEN', direction: null, lockedAt: null };
}

export function lockStatusWord(status: LockStatus): string {
  if (status.kind === 'LOCKED') return status.direction ? `LOCKED ${status.direction}` : 'LOCKED';
  if (status.kind === 'SKIPPED') return 'SKIPPED';
  if (status.kind === 'SETTLED') return 'SETTLED';
  return 'OPEN';
}

export function lockStatusSentence(status: LockStatus): string {
  if (status.kind === 'LOCKED') {
    const side = status.direction ? ` ${status.direction}` : '';
    const at = status.lockedAt
      ? ` at ${new Date(status.lockedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
      : '';
    return `The engine already locked${side}${at} this cycle. Gate checks only decide whether to lock, so nothing is blocking now.`;
  }
  if (status.kind === 'SKIPPED') return 'The engine skipped this cycle. Gate checks for the next cycle appear when it opens.';
  if (status.kind === 'SETTLED') return 'This cycle has settled. Gate checks for the next cycle appear when it opens.';
  return '';
}
