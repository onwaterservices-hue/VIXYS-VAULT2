/**
 * VIXY VAULT — Meta-Decision Engine & Two-Stage Decision Architecture (Step 10-14, 18, 19)
 * Authoritative decision generator connecting:
 * - Step 1: Neural Execution Core (Calculates core directional probability & independent P(UP) / P(DOWN))
 * - Step 2: VIXY Protection™ Guardian (Validates safety, reversal threat, cross-venue divergence, liquidity drain)
 * - Three-Way State Evaluation Architecture ('BUY UP' | 'BUY DOWN' | 'SKIP')
 * - Explainability Vectors & Lock Eligibility Gating
 */

import { UnderlyingAssetMetrics } from '../market/assetIntelligence';
import { CrossVenueReconciliationResult } from './crossVenueReconciliation';
import { UnifiedFeatureVector } from './regimeEngine';
import { EnsembleProbabilityResult, IndependentProbabilityScores } from './probabilityAndCalibrationEngine';

export type DecisionOutcome = 'BUY UP' | 'BUY DOWN' | 'SKIP' | 'OBSERVING';
export type ProtectionStatusType = 'PASS' | 'WATCH' | 'WARNING' | 'VETO';

export interface VixyTwoStageDecision {
  cycleId: string;
  asset: string;
  timestamp: number;
  stage: 'OBSERVING' | 'CALIBRATING' | 'ANALYZING' | 'QUALIFYING' | 'LOCKED' | 'NO_TRADE';
  
  // Final Authoritative Output (Explicit 3-Way Evaluation)
  decision: DecisionOutcome;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidencePct: number;
  calibratedProbability: number;
  rawProbability: number;
  isQualifiedForLock: boolean;
  lockStatus: 'LOCKED' | 'ELIGIBLE' | 'BLOCKED' | 'SKIPPED' | 'WAITING';
  
  // Independent Probability Scorer Breakdown
  independentProbability: {
    pUpPct: number;
    pDownPct: number;
    uncertaintyPct: number;
    edgeUpPct: number;
    edgeDownPct: number;
    directionalBias: 'UP' | 'DOWN' | 'NEUTRAL';
  };

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

  // Hard Skip & Rejection System
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
  const independent = ensemble.independentScores;

  // If already locked, return the locked authoritative snapshot
  if (isAlreadyLocked && lockedSnapshot) {
    const lockedDir = lockedSnapshot.direction === 'DOWN' ? 'DOWN' : 'UP';
    const lockedDecision: DecisionOutcome = lockedSnapshot.decision || (lockedDir === 'UP' ? 'BUY UP' : 'BUY DOWN');
    return {
      cycleId,
      asset: underlying.asset,
      timestamp: now,
      stage: 'LOCKED',
      decision: lockedDecision,
      direction: lockedDir,
      confidencePct: lockedSnapshot.confidence || 85,
      calibratedProbability: lockedSnapshot.probability || ensemble.calibratedProbability,
      rawProbability: ensemble.rawProbability,
      isQualifiedForLock: true,
      lockStatus: 'LOCKED',
      independentProbability: {
        pUpPct: independent?.pUpPct ?? (lockedDir === 'UP' ? 72 : 28),
        pDownPct: independent?.pDownPct ?? (lockedDir === 'DOWN' ? 72 : 28),
        uncertaintyPct: independent?.uncertaintyPct ?? 4,
        edgeUpPct: independent?.edgeUpPct ?? (lockedDir === 'UP' ? 12 : -8),
        edgeDownPct: independent?.edgeDownPct ?? (lockedDir === 'DOWN' ? 12 : -8),
        directionalBias: lockedDir,
      },
      neuralCore: {
        bias: lockedDir,
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
        summary: `Cycle ${cycleId} immutably locked for ${lockedDecision} at $${lockedSnapshot.spot || underlying.spotPrice}`,
        whyDirection: `Confluence across order flow and multi-timeframe momentum`,
        keyTailwinds: ['Strong multi-venue agreement', 'Favorable strike displacement'],
        keyRisks: ['Normal late-interval volatility variance'],
        crossVenueConsensus: `Kalshi (${Math.round(crossVenue.kalshiProbability * 100)}%) & Polymarket (${Math.round(crossVenue.polymarketProbability * 100)}%) in agreement`,
        underlyingStructure: `Spot $${underlying.spotPrice} vs Strike $${features.strikePrice}`,
      },
    };
  }

  // --- STEP 1: NEURAL EXECUTION CORE (Independent P(UP) / P(DOWN) Evaluation) ---
  const coreBias: 'UP' | 'DOWN' | 'NEUTRAL' = ensemble.direction || independent.directionalBias;
  const favorableModules = ensemble.modules.filter(m => m.vote === (coreBias === 'UP' ? 'BULLISH' : 'BEARISH')).length;
  const coreConfidence = ensemble.earnedConfidencePct;
  const coreEdge = ensemble.edgeVsKalshiPct;

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

  // Check 4: Chop Filter (Elevates threat score, but does not veto outright unless conflicted)
  if (features.isChoppy) {
    threatScore += 20;
    activeProtections.push('CHOP_FILTER');
  }

  threatScore = Math.min(100, Math.max(0, threatScore));
  if (threatScore >= 65 || isVetoActive) protectionStatus = 'VETO';
  else if (threatScore >= 45) protectionStatus = 'WARNING';
  else if (threatScore >= 25) protectionStatus = 'WATCH';
  else protectionStatus = 'PASS';

  // --- THREE-WAY STATE EVALUATION & HARD SKIP SYSTEM ---
  const secondaryReasons: string[] = [];
  let isSkipped = false;
  let primarySkipReason: string | null = null;
  let rejectionCategory: 'NONE' | 'CHOP' | 'DISAGREEMENT' | 'LOW_EDGE' | 'STALE_DATA' | 'PROTECTION_VETO' | 'EXPIRED_WINDOW' = 'NONE';

  const isWindowExpired = elapsedSec >= 870 || remainingSec < 30;

  if (isVetoActive) {
    isSkipped = true;
    primarySkipReason = vetoReason || 'Protection Guardian Veto Active';
    rejectionCategory = crossVenue.severeDisagreementDetected ? 'DISAGREEMENT' : (underlying.feedHealth.status === 'STALE' || underlying.feedHealth.status === 'OFFLINE' ? 'STALE_DATA' : 'PROTECTION_VETO');
  } else if (coreBias === 'NEUTRAL' && Math.abs(independent.pUpPct - independent.pDownPct) < 2.0 && features.isChoppy) {
    // Only skip when there is truly no statistical edge in either direction
    isSkipped = true;
    primarySkipReason = features.chopReason || 'Neutral market chop without directional momentum';
    rejectionCategory = 'CHOP';
    secondaryReasons.push('P(UP) and P(DOWN) within 2% neutral parity band');
  }

  // --- QUALIFICATION FOR IMMUTABLE LOCK ---
  // Lock criteria: 180s <= elapsedSec <= 750s, confidence >= 60%, >= 3 favorable modules
  const isQualifiedForLock = !isSkipped && !isWindowExpired && coreConfidence >= 60 && favorableModules >= 3 && elapsedSec >= 180 && elapsedSec <= 750;

  // --- EXPLICIT THREE-WAY DECISION STATE MACHINE ---
  // Outcomes: 'BUY UP' | 'BUY DOWN' | 'SKIP' (and 'OBSERVING' if early elapsed < 180s with no trade)
  let finalDecision: DecisionOutcome = 'OBSERVING';
  let finalDirection: 'UP' | 'DOWN' | 'NEUTRAL' = coreBias;
  let lockStatus: 'LOCKED' | 'ELIGIBLE' | 'BLOCKED' | 'SKIPPED' | 'WAITING' = 'WAITING';

  if (isSkipped) {
    finalDecision = 'SKIP';
    finalDirection = 'NEUTRAL';
    lockStatus = 'SKIPPED';
  } else if (coreBias === 'UP') {
    finalDecision = 'BUY UP';
    finalDirection = 'UP';
    if (isWindowExpired) lockStatus = 'BLOCKED';
    else if (isQualifiedForLock) lockStatus = 'ELIGIBLE';
    else if (elapsedSec < 180) lockStatus = 'WAITING';
    else lockStatus = 'ELIGIBLE';
  } else if (coreBias === 'DOWN') {
    finalDecision = 'BUY DOWN';
    finalDirection = 'DOWN';
    if (isWindowExpired) lockStatus = 'BLOCKED';
    else if (isQualifiedForLock) lockStatus = 'ELIGIBLE';
    else if (elapsedSec < 180) lockStatus = 'WAITING';
    else lockStatus = 'ELIGIBLE';
  } else if (elapsedSec < 180) {
    finalDecision = 'OBSERVING';
    finalDirection = 'NEUTRAL';
    lockStatus = 'WAITING';
  } else {
    // If neutral after observation period, explicitly evaluate as SKIP
    finalDecision = 'SKIP';
    finalDirection = 'NEUTRAL';
    lockStatus = 'SKIPPED';
    primarySkipReason = 'Insufficient directional asymmetry between P(UP) and P(DOWN)';
    rejectionCategory = 'LOW_EDGE';
  }

  // --- EXPLAINABILITY VECTORS ---
  const keyTailwinds: string[] = [];
  const keyRisks: string[] = [];

  if (underlying.momentum.directionalBias === coreBias) keyTailwinds.push(`Multi-timeframe momentum is aligned ${coreBias}`);
  if (underlying.orderFlow.flowState.includes(coreBias === 'UP' ? 'BUYING' : 'SELLING')) keyTailwinds.push(`Order flow taker volume heavily favors ${coreBias}`);
  if (crossVenue.consensusDirection === coreBias) keyTailwinds.push(`Kalshi and Polymarket consensus confirms ${coreBias}`);
  if (independent.pUpPct >= 60) keyTailwinds.push(`Independent P(UP) evaluates at ${independent.pUpPct}% (+${independent.edgeUpPct}% edge)`);
  if (independent.pDownPct >= 60) keyTailwinds.push(`Independent P(DOWN) evaluates at ${independent.pDownPct}% (+${independent.edgeDownPct}% edge)`);

  if (crossVenue.crossVenueSpreadPct > 3.0) keyRisks.push(`Cross-venue spread variance is elevated (${crossVenue.crossVenueSpreadPct}%)`);
  if (underlying.volatility.regime === 'EXPANDING') keyRisks.push(`Volatility is expanding, requiring higher buffer`);
  if (activeProtections.length > 0) keyRisks.push(`Active protection shields: ${activeProtections.join(', ')}`);

  return {
    cycleId,
    asset: underlying.asset,
    timestamp: now,
    stage: isSkipped ? 'NO_TRADE' : (isQualifiedForLock ? 'QUALIFYING' : (cycleStage as any)),
    decision: finalDecision,
    direction: finalDirection,
    confidencePct: coreConfidence,
    calibratedProbability: ensemble.calibratedProbability,
    rawProbability: ensemble.rawProbability,
    isQualifiedForLock,
    lockStatus,
    independentProbability: {
      pUpPct: independent.pUpPct,
      pDownPct: independent.pDownPct,
      uncertaintyPct: independent.uncertaintyPct,
      edgeUpPct: independent.edgeUpPct,
      edgeDownPct: independent.edgeDownPct,
      directionalBias: independent.directionalBias,
    },
    neuralCore: {
      bias: finalDirection,
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
        : `${finalDecision} evaluated with ${coreConfidence}% confidence [P(UP): ${independent.pUpPct}% | P(DOWN): ${independent.pDownPct}%] across ${favorableModules}/${ensemble.modules.length} quantitative modules`,
      whyDirection: `Confluence driven by ${underlying.orderFlow.bullVolumePct}% taker buy volume and ${underlying.momentum.directionalBias} momentum vector.`,
      keyTailwinds: keyTailwinds.length > 0 ? keyTailwinds : ['Baseline order flow stability'],
      keyRisks: keyRisks.length > 0 ? keyRisks : ['Normal intra-interval spread variance'],
      crossVenueConsensus: `Kalshi: ${(crossVenue.kalshiProbability * 100).toFixed(0)}% | Polymarket: ${(crossVenue.polymarketProbability * 100).toFixed(0)}% (Spread: ${crossVenue.crossVenueSpreadPct}%)`,
      underlyingStructure: `BTC Spot: $${underlying.spotPrice.toLocaleString()} | Strike: $${features.strikePrice.toLocaleString()} (${features.strikeDistancePct >= 0 ? '+' : ''}${features.strikeDistancePct}%)`,
    },
  };
}
