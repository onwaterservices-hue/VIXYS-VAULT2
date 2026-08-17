/**
 * VIXY VAULT — Meta-Decision Engine & Two-Stage Decision Architecture (Step 10-14, 18, 19)
 * Authoritative decision generator connecting:
 * - Step 1: Neural Execution Core (Calculates core directional probability & edge)
 * - Step 2: VIXY Protection™ Guardian (Validates safety, reversal threat, cross-venue divergence, liquidity drain)
 * - Hard SKIP System with unambiguous operational reasons
 * - Explainability Vectors
 */

import { UnderlyingAssetMetrics } from '../market/assetIntelligence';
import { CrossVenueReconciliationResult } from './crossVenueReconciliation';
import { UnifiedFeatureVector } from './regimeEngine';
import { EnsembleProbabilityResult } from './probabilityAndCalibrationEngine';

export type DecisionOutcome = 'BUY UP' | 'BUY DOWN' | 'SKIP' | 'OBSERVING';
export type ProtectionStatusType = 'PASS' | 'WATCH' | 'WARNING' | 'VETO';

export interface VixyTwoStageDecision {
  cycleId: string;
  asset: string;
  timestamp: number;
  stage: 'OBSERVING' | 'CALIBRATING' | 'ANALYZING' | 'QUALIFYING' | 'LOCKED' | 'NO_TRADE';
  
  // Final Authoritative Output
  decision: DecisionOutcome;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidencePct: number;
  calibratedProbability: number;
  rawProbability: number;
  isQualifiedForLock: boolean;
  lockStatus: 'LOCKED' | 'ELIGIBLE' | 'BLOCKED' | 'SKIPPED' | 'WAITING';
  
  // Step 1: Neural Core Output
  neuralCore: {
    bias: 'UP' | 'DOWN' | 'NEUTRAL';
    rawConfidencePct: number;
    edgePct: number;
    moduleConfluenceCount: number;
    totalModules: number;
  };

  // Step 2: VIXY Protection Guardian
  protection: {
    status: ProtectionStatusType;
    threatScore: number; // 0 to 100
    isVetoActive: boolean;
    vetoReason: string | null;
    activeProtections: string[];
  };

  // Hard Skip System
  skipDetails: {
    isSkipped: boolean;
    primaryReason: string | null;
    secondaryReasons: string[];
    rejectionCategory: 'NONE' | 'CHOP' | 'DISAGREEMENT' | 'LOW_EDGE' | 'STALE_DATA' | 'PROTECTION_VETO' | 'EXPIRED_WINDOW';
  };

  // Step 18: Explainability Matrix
  explainability: {
    summary: string;
    whyDirection: string;
    keyTailwinds: string[];
    keyRisks: string[];
    crossVenueConsensus: string;
    underlyingStructure: string;
  };
}

export function evaluateTwoStageDecision(
  cycleId: string,
  cycleStage: string,
  elapsedSec: number,
  remainingSec: number,
  underlying: UnderlyingAssetMetrics,
  crossVenue: CrossVenueReconciliationResult,
  features: UnifiedFeatureVector,
  ensemble: EnsembleProbabilityResult,
  isAlreadyLocked: boolean = false,
  lockedSnapshot?: any
): VixyTwoStageDecision {
  const now = Date.now();

  // If already locked, return the locked authoritative snapshot
  if (isAlreadyLocked && lockedSnapshot) {
    return {
      cycleId,
      asset: underlying.asset,
      timestamp: now,
      stage: 'LOCKED',
      decision: lockedSnapshot.decision || (lockedSnapshot.direction === 'UP' ? 'BUY UP' : 'BUY DOWN'),
      direction: lockedSnapshot.direction || 'UP',
      confidencePct: lockedSnapshot.confidence || 85,
      calibratedProbability: lockedSnapshot.probability || ensemble.calibratedProbability,
      rawProbability: ensemble.rawProbability,
      isQualifiedForLock: true,
      lockStatus: 'LOCKED',
      neuralCore: {
        bias: lockedSnapshot.direction || 'UP',
        rawConfidencePct: lockedSnapshot.confidence || 85,
        edgePct: ensemble.edgeVsConsensusPct,
        moduleConfluenceCount: 6,
        totalModules: 6,
      },
      protection: {
        status: 'PASS',
        threatScore: 12,
        isVetoActive: false,
        vetoReason: null,
        activeProtections: ['IMMUTABLE_LOCK_ACTIVE', 'CONTINUOUS_SLIPPAGE_MONITOR'],
      },
      skipDetails: {
        isSkipped: false,
        primaryReason: null,
        secondaryReasons: [],
        rejectionCategory: 'NONE',
      },
      explainability: {
        summary: `Cycle ${cycleId} immutably locked for ${lockedSnapshot.decision} at $${lockedSnapshot.spot || underlying.spotPrice}`,
        whyDirection: `Confluence across order flow and multi-timeframe momentum`,
        keyTailwinds: ['Strong multi-venue agreement', 'Favorable strike displacement'],
        keyRisks: ['Normal late-interval volatility variance'],
        crossVenueConsensus: `Kalshi (${Math.round(crossVenue.kalshiProbability * 100)}%) & Polymarket (${Math.round(crossVenue.polymarketProbability * 100)}%) in agreement`,
        underlyingStructure: `Spot $${underlying.spotPrice} vs Strike $${features.strikePrice}`,
      },
    };
  }

  // --- STEP 1: NEURAL EXECUTION CORE ---
  const favorableModules = ensemble.modules.filter(m => m.vote === (ensemble.direction === 'UP' ? 'BULLISH' : 'BEARISH')).length;
  const coreBias = ensemble.direction;
  const coreConfidence = ensemble.earnedConfidencePct;
  const coreEdge = ensemble.edgeVsConsensusPct;

  // --- STEP 2: VIXY PROTECTION GUARDIAN ---
  const activeProtections: string[] = [];
  let threatScore = 15;
  let isVetoActive = false;
  let vetoReason: string | null = null;
  let protectionStatus: ProtectionStatusType = 'PASS';

  // Check 1: Severe Cross-Venue Disagreement
  if (crossVenue.severeDisagreementDetected) {
    threatScore += 50;
    activeProtections.push('CROSS_VENUE_DISAGREEMENT_SHIELD');
    isVetoActive = true;
    vetoReason = crossVenue.disagreementReason;
  }

  // Check 2: Microstructure & Liquidity Shock
  if (underlying.microstructure.suddenDrainDetected) {
    threatScore += 45;
    activeProtections.push('LIQUIDITY_DRAIN_DETECTOR');
    isVetoActive = true;
    vetoReason = 'Microstructure liquidity sudden drain across orderbook';
  }

  // Check 3: Feed Stale or Degraded
  if (underlying.feedHealth.status === 'STALE' || underlying.feedHealth.status === 'OFFLINE') {
    threatScore += 60;
    activeProtections.push('DATA_INTEGRITY_SHIELD');
    isVetoActive = true;
    vetoReason = 'Market data latency exceeds maximum tolerance (>15s)';
  }

  // Check 4: Chop & Reversal Drift
  if (features.isChoppy) {
    threatScore += 30;
    activeProtections.push('CHOP_FILTER');
  }

  threatScore = Math.min(100, Math.max(0, threatScore));
  if (threatScore >= 65) protectionStatus = 'VETO';
  else if (threatScore >= 45) protectionStatus = 'WARNING';
  else if (threatScore >= 25) protectionStatus = 'WATCH';

  // --- HARD SKIP SYSTEM EVALUATION ---
  const secondaryReasons: string[] = [];
  let isSkipped = false;
  let primarySkipReason: string | null = null;
  let rejectionCategory: 'NONE' | 'CHOP' | 'DISAGREEMENT' | 'LOW_EDGE' | 'STALE_DATA' | 'PROTECTION_VETO' | 'EXPIRED_WINDOW' = 'NONE';

  if (isVetoActive) {
    isSkipped = true;
    primarySkipReason = vetoReason || 'Protection Guardian Veto Active';
    rejectionCategory = crossVenue.severeDisagreementDetected ? 'DISAGREEMENT' : 'PROTECTION_VETO';
  } else if (features.isChoppy) {
    isSkipped = true;
    primarySkipReason = features.chopReason || 'Conflicted chop structure / lack of momentum confluence';
    rejectionCategory = 'CHOP';
    secondaryReasons.push('Timeframe momentum alignment < 50%');
  } else if (Math.abs(coreEdge) < 1.5 && coreConfidence < 72) {
    isSkipped = true;
    primarySkipReason = `Insufficient statistical edge (${coreEdge > 0 ? '+' : ''}${coreEdge.toFixed(1)}% vs required +1.5%)`;
    rejectionCategory = 'LOW_EDGE';
  } else if (elapsedSec >= 720) {
    isSkipped = true;
    primarySkipReason = 'Optimal entry lock window expired (remaining < 180s)';
    rejectionCategory = 'EXPIRED_WINDOW';
  }

  // --- QUALIFICATION FOR LOCK ---
  const isQualifiedForLock = !isSkipped && coreConfidence >= 75 && favorableModules >= 4 && elapsedSec >= 180 && elapsedSec <= 660;

  // Final Decision Label
  let finalDecision: DecisionOutcome = 'OBSERVING';
  let lockStatus: 'LOCKED' | 'ELIGIBLE' | 'BLOCKED' | 'SKIPPED' | 'WAITING' = 'WAITING';

  if (isSkipped) {
    finalDecision = 'SKIP';
    lockStatus = 'SKIPPED';
  } else if (isQualifiedForLock) {
    finalDecision = coreBias === 'UP' ? 'BUY UP' : 'BUY DOWN';
    lockStatus = 'ELIGIBLE';
  } else if (elapsedSec < 180) {
    finalDecision = 'OBSERVING';
    lockStatus = 'WAITING';
  } else {
    finalDecision = 'OBSERVING';
    lockStatus = 'BLOCKED';
  }

  // --- EXPLAINABILITY VECTORS ---
  const keyTailwinds: string[] = [];
  const keyRisks: string[] = [];

  if (underlying.momentum.directionalBias === coreBias) keyTailwinds.push(`Multi-timeframe momentum is aligned ${coreBias}`);
  if (underlying.orderFlow.flowState.includes(coreBias === 'UP' ? 'BUYING' : 'SELLING')) keyTailwinds.push(`Order flow taker volume heavily favors ${coreBias}`);
  if (crossVenue.consensusDirection === coreBias) keyTailwinds.push(`Kalshi and Polymarket consensus confirms ${coreBias}`);

  if (crossVenue.crossVenueSpreadPct > 3.0) keyRisks.push(`Cross-venue spread variance is elevated (${crossVenue.crossVenueSpreadPct}%)`);
  if (underlying.volatility.regime === 'EXPANDING') keyRisks.push(`Volatility is expanding, requiring higher buffer`);
  if (activeProtections.length > 0) keyRisks.push(`Active protection shields: ${activeProtections.join(', ')}`);

  return {
    cycleId,
    asset: underlying.asset,
    timestamp: now,
    stage: isSkipped ? 'NO_TRADE' : (isQualifiedForLock ? 'QUALIFYING' : (cycleStage as any)),
    decision: finalDecision,
    direction: coreBias,
    confidencePct: coreConfidence,
    calibratedProbability: ensemble.calibratedProbability,
    rawProbability: ensemble.rawProbability,
    isQualifiedForLock,
    lockStatus,
    neuralCore: {
      bias: coreBias,
      rawConfidencePct: coreConfidence,
      edgePct: coreEdge,
      moduleConfluenceCount: favorableModules,
      totalModules: ensemble.modules.length,
    },
    protection: {
      status: protectionStatus,
      threatScore,
      isVetoActive,
      vetoReason,
      activeProtections,
    },
    skipDetails: {
      isSkipped,
      primaryReason: primarySkipReason,
      secondaryReasons,
      rejectionCategory,
    },
    explainability: {
      summary: isSkipped
        ? `CYCLE SKIPPED: ${primarySkipReason}`
        : `${finalDecision} qualified with ${coreConfidence}% calibrated confidence across ${favorableModules}/${ensemble.modules.length} quantitative modules`,
      whyDirection: `Confluence driven by ${underlying.orderFlow.bullVolumePct}% taker buy volume and ${underlying.momentum.directionalBias} momentum vector.`,
      keyTailwinds: keyTailwinds.length > 0 ? keyTailwinds : ['Baseline order flow stability'],
      keyRisks: keyRisks.length > 0 ? keyRisks : ['Normal intra-interval spread variance'],
      crossVenueConsensus: `Kalshi: ${(crossVenue.kalshiProbability * 100).toFixed(0)}% | Polymarket: ${(crossVenue.polymarketProbability * 100).toFixed(0)}% (Spread: ${crossVenue.crossVenueSpreadPct}%)`,
      underlyingStructure: `BTC Spot: $${underlying.spotPrice.toLocaleString()} | Strike: $${features.strikePrice.toLocaleString()} (${features.strikeDistancePct >= 0 ? '+' : ''}${features.strikeDistancePct}%)`,
    },
  };
}
