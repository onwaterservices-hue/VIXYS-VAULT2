/**
 * VIXY Autonomous Execution Engine — Bounded Single-Tick Processor
 * 
 * Routes directly to the Single Canonical 15M Decision Engine:
 * - Guarantees exactly ONE authoritative decision per cycle
 * - Respects monotonic state transitions & lock hysteresis
 * - Writes versioned canonical state to Firestore (active_cycle_lock/current_15m)
 */

import { executeCanonical15mTick, getCanonical15mDecision, settleCanonical15mCycle } from './canonicalDecisionEngine';
import { Canonical15mDecision } from '../../types/canonicalDecision';

export interface BoundedTickResult {
  success: boolean;
  timestamp: string;
  executionDurationMs: number;
  marketData: {
    spotPrice: number;
    strikePrice: number;
    timeRemainingSec: number;
    cycleId: string;
  };
  geminiShadow: {
    upProbability: number;
    downProbability: number;
    noTradeProbability: number;
    confidence: number;
    contradictionScore: number;
    alignedEvidenceCount: number;
    signalDirection: string;
    signalMomentum: string;
  };
  protectionDecision: {
    state: string;
    displayName: string;
    lockScore: number;
    lockProgressPct: number;
    checklistPassed: boolean;
    skipReasonCode: string | null;
  };
  persistedToFirestore: boolean;
  settledPreviousCycle: boolean;
  canonical: Canonical15mDecision;
}

export async function executeBoundedEngineTick(): Promise<BoundedTickResult> {
  const startTime = Date.now();
  const canonical = await executeCanonical15mTick();
  const durationMs = Date.now() - startTime;

  return {
    success: true,
    timestamp: canonical.updatedAt,
    executionDurationMs: durationMs,
    marketData: {
      spotPrice: canonical.currentSpot,
      strikePrice: canonical.openStrike,
      timeRemainingSec: canonical.timeRemainingSec,
      cycleId: canonical.cycleId
    },
    geminiShadow: {
      upProbability: canonical.gemini.upProbability,
      downProbability: canonical.gemini.downProbability,
      noTradeProbability: canonical.gemini.noTradeProbability,
      confidence: canonical.gemini.confidence,
      contradictionScore: canonical.gemini.contradictionScore,
      alignedEvidenceCount: canonical.gemini.alignedEvidenceCount,
      signalDirection: canonical.gemini.signalDirection,
      signalMomentum: canonical.gemini.signalMomentum
    },
    protectionDecision: {
      state: canonical.currentState,
      displayName: canonical.currentState === 'LOCKED_UP' ? 'VIXY UP' : canonical.currentState === 'LOCKED_DOWN' ? 'VIXY DOWN' : canonical.currentState,
      lockScore: canonical.lockScore,
      lockProgressPct: canonical.protection.lockProgressPct,
      checklistPassed: canonical.protection.checklist.allPassed,
      skipReasonCode: canonical.protection.skipReasonCode
    },
    persistedToFirestore: true,
    settledPreviousCycle: canonical.settlementStatus === 'SETTLED',
    canonical
  };
}
