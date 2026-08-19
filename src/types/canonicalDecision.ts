/**
 * VIXY 15M — SINGLE CANONICAL DECISION MODEL & PROTOCOL
 * 
 * Standardized across all backend engines, Firestore persistence, APIs,
 * and frontend client visualizers (VIXY LIVE, Dashboard, VIXY LOCKS, Results Terminal).
 */

import { MarketRegimeType } from '../components/VixyLockView';

export type Canonical15mState = 
  | 'WATCH'
  | 'CONFIRMING'
  | 'LOCKED_UP'
  | 'LOCKED_DOWN'
  | 'SKIP'
  | 'PROTECTED'
  | 'SETTLED';

export type Canonical15mDirection = 'UP' | 'DOWN' | 'NEUTRAL' | 'SKIP';
export type Canonical15mSettlement = 'PENDING' | 'SETTLED';
export type Canonical15mOutcome = 'WIN' | 'LOSS' | 'SKIPPED' | null;

export interface CanonicalGeminiShadowData {
  upProbability: number;      // 0.00 to 1.00 (e.g. 0.72)
  downProbability: number;    // 0.00 to 1.00 (e.g. 0.16)
  noTradeProbability: number; // 0.00 to 1.00 (e.g. 0.12)
  confidence: number;         // 0 to 100
  regime: MarketRegimeType;
  alignedEvidenceCount: number; // 0 to 6
  evidenceFactors: Array<{
    id: string;
    name: string;
    category: string;
    aligned: boolean;
    score: number;
    detail: string;
    weight: number;
  }>;
  contradictionScore: number; // 0 to 100 (lower is safer)
  signalDirection: Canonical15mDirection;
  signalMomentum: 'ACCELERATING' | 'STABLE' | 'DETERIORATING';
  reasoning: string;
  primaryHypothesis: string;
  counterHypothesis: string;
  recommendedState: 'WATCH' | 'CONFIRMING' | 'LOCKED' | 'SKIP';
  latencyMs: number;
}

export interface CanonicalProtectionData {
  lockScore: number;          // 0 to 100 composite score
  lockProgressPct: number;    // 0 to 100% progress towards requirement (>= 72)
  temporalStability: number;  // 0 to 100%
  protectionStatus: 'CLEAR' | 'WATCH' | 'EVALUATING' | 'VETOED' | 'PROTECTED';
  checklist: {
    probabilityPassed: boolean;
    lockScorePassed: boolean;
    temporalStabilityPassed: boolean;
    contradictionPassed: boolean;
    evidencePassed: boolean;
    crossVenuePassed: boolean;
    regimePassed: boolean;
    persistencePassed: boolean;
    timeWindowPassed: boolean;
    allPassed: boolean;
  };
  skipReasonCode: string | null;
  skipReasonTitle: string | null;
  skipReasonDescription: string | null;
  scoreComponents: {
    directionalProbWeight: number;
    evidenceAgreementWeight: number;
    temporalStabilityWeight: number;
    crossVenueWeight: number;
    regimeQualityWeight: number;
    contradictionPenaltyWeight: number;
  };
}

export interface Canonical15mDecision {
  // 1. Unique Identifiers
  cycleId: string;            // e.g. "BTC-15M-2026-08-19-1615"
  contractId: string;         // e.g. "KXBTCD-26AUG19-T1615"
  decisionId: string;         // e.g. "VIXY-15M-20260819-1615"
  
  // 2. Contract Metadata
  market: string;             // "BTC/USD"
  asset: string;              // "BTC"
  timeframe: string;          // "15M"
  cycleStart: number;         // Unix timestamp ms
  cycleEnd: number;           // Unix timestamp ms
  timeRemainingSec: number;   // Seconds remaining in 15M cycle
  openStrike: number;         // Opening strike price to beat
  currentSpot: number;        // Latest live spot price
  spotAtLock: number | null;  // Spot price recorded at lock moment
  
  // 3. State & Conviction
  currentState: Canonical15mState;
  direction: Canonical15mDirection;
  confidence: number;         // 0 to 100
  lockScore: number;          // 0 to 100 composite score
  evidenceAlignment: number;  // 0 to 6
  temporalStability: number;  // 0 to 100
  contradictionScore: number; // 0 to 100
  protectionStatus: string;   // 'CLEAR' | 'WATCH' | 'EVALUATING' | 'VETOED' | 'PROTECTED'
  
  // 4. Intelligence & Guardian Layers
  gemini: CanonicalGeminiShadowData;
  protection: CanonicalProtectionData;
  
  // 5. Timestamps & Transitions
  createdAt: number;          // Timestamp when cycle initialized
  lockedAt: number | null;    // Timestamp when state changed to LOCKED_UP or LOCKED_DOWN
  unlockedAt: number | null;  // Timestamp of any protection unlock/reversal
  settledAt: number | null;   // Timestamp of settlement
  
  // 6. Settlement & Performance
  settlementStatus: Canonical15mSettlement;
  finalOutcome: Canonical15mOutcome;
  settlementPrice: number | null;
  pnlDollar: number | null;
  
  // 7. Versioning & Monotonicity
  stateVersion: number;       // Monotonically increasing version counter
  updatedAt: string;          // ISO timestamp
  serverSource: string;       // "VIXY_CANONICAL_ENGINE_v6"
}

/**
 * Validates whether a proposed state transition is legally permissible
 * according to VIXY 15M Non-Regression Rules.
 */
export function isValid15mStateTransition(
  currentState: Canonical15mState,
  proposedState: Canonical15mState
): boolean {
  // If staying in the same state (e.g. updating probabilities), always valid
  if (currentState === proposedState) return true;

  // Once settled, cannot transition
  if (currentState === 'SETTLED') return false;

  // Strict valid transition graph
  switch (currentState) {
    case 'WATCH':
      return proposedState === 'CONFIRMING' || proposedState === 'SKIP' || proposedState === 'SETTLED';

    case 'CONFIRMING':
      return (
        proposedState === 'WATCH' ||
        proposedState === 'LOCKED_UP' ||
        proposedState === 'LOCKED_DOWN' ||
        proposedState === 'SKIP' ||
        proposedState === 'SETTLED'
      );

    case 'LOCKED_UP':
      // A hard lock CANNOT revert to CONFIRMING or WATCH!
      return (
        proposedState === 'PROTECTED' ||
        proposedState === 'SETTLED' ||
        proposedState === 'SKIP' // Only via emergency protection veto
      );

    case 'LOCKED_DOWN':
      // A hard lock CANNOT revert to CONFIRMING or WATCH!
      return (
        proposedState === 'PROTECTED' ||
        proposedState === 'SETTLED' ||
        proposedState === 'SKIP' // Only via emergency protection veto
      );

    case 'PROTECTED':
      return proposedState === 'SETTLED' || proposedState === 'SKIP';

    case 'SKIP':
      // In skip state, can settle at epoch close, or return to WATCH if cycle has plenty of time
      return proposedState === 'WATCH' || proposedState === 'SETTLED';

    default:
      return false;
  }
}
