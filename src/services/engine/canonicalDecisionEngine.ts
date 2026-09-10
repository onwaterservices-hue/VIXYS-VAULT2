/**
 * VIXY 15M — client-side placeholder for the canonical decision.
 *
 * This file used to be the OG client-side 15-minute engine (its own tick,
 * settle, Gemini shadow inference and Firestore writes). Production has ONE
 * engine — `runMarketEngineTick` in server.ts, served by
 * /api/vixy/15m/current — and nothing imported the client engine's tick or
 * settle paths, so they were removed (SESSION 7 engine-count audit). What
 * remains is the epoch helper and the initial placeholder the terminal holds
 * until the first real payload lands; nothing here decides anything.
 */

import { Canonical15mDecision } from '../../types/canonicalDecision';

// --- EPOCH UTILITIES ---
export function get15mEpochBoundaries(nowMs: number = Date.now()): {
  cycleStart: number;
  cycleEnd: number;
  cycleId: string;
  contractId: string;
  decisionId: string;
} {
  const epochDurationMs = 15 * 60 * 1000;
  const cycleStart = Math.floor(nowMs / epochDurationMs) * epochDurationMs;
  const cycleEnd = cycleStart + epochDurationMs;

  const d = new Date(cycleStart);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthShort = monthNames[d.getUTCMonth()];
  const yearShort = String(year).slice(-2);

  const cycleId = `BTC-15M-${year}-${month}-${day}-${hours}${mins}`;
  const contractId = `KXBTCD-${yearShort}${monthShort}${day}-T${hours}${mins}`;
  const decisionId = `VIXY-15M-${year}${month}${day}-${hours}${mins}`;

  return { cycleStart, cycleEnd, cycleId, contractId, decisionId };
}

/**
 * The placeholder the terminal renders until /api/vixy/15m/current answers.
 * Every number is neutral (no direction, no calibrated cell, no strike) so a
 * cold screen shows dashes rather than a plausible-looking decision.
 */
export function createInitial15mDecision(params?: {
  nowMs?: number;
  spotPrice?: number;
}): Canonical15mDecision {
  const nowMs = params?.nowMs || Date.now();
  const spot = params?.spotPrice || 0;
  const { cycleStart, cycleEnd, cycleId, contractId, decisionId } = get15mEpochBoundaries(nowMs);
  const timeRemainingSec = Math.max(0, Math.floor((cycleEnd - nowMs) / 1000));
  const minutesRemaining = timeRemainingSec / 60;
  const secondsRemaining = timeRemainingSec;

  return {
    cycleId,
    contractId,
    decisionId,
    market: 'BTC/USD',
    asset: 'BTC',
    timeframe: '15M',
    cycleStart,
    cycleEnd,
    timeRemainingSec,
    minutesRemaining,
    secondsRemaining,
    openStrike: spot,
    currentSpot: spot,
    spotAtLock: null,

    currentState: 'WATCH',
    direction: 'NEUTRAL',
    confidence: 0,
    lockScore: 0,
    reversalRisk: 0,
    capitalPreservationScore: 0,
    capitalPreserved: false,
    regime: 'CHOPPY',
    evidenceAlignment: 0,
    temporalStability: 0,
    contradictionScore: 0,
    protectionStatus: 'WATCH',

    gemini: {
      upProbability: 0,
      downProbability: 0,
      noTradeProbability: 0,
      bullScore: 0,
      bearScore: 0,
      netDirectionalBias: 0,
      confidence: 0,
      regime: 'CHOPPY',
      alignedEvidenceCount: 0,
      evidenceFactors: [],
      contradictionScore: 0,
      reversalRisk: 0,
      signalDirection: 'NEUTRAL',
      signalMomentum: 'STABLE',
      reasoning: 'Waiting for the engine.',
      primaryHypothesis: '',
      counterHypothesis: '',
      recommendedState: 'WATCH',
      latencyMs: 0
    },

    protection: {
      lockScore: 0,
      lockProgressPct: 0,
      temporalStability: 0,
      reversalRisk: 0,
      capitalPreservationScore: 0,
      capitalPreserved: false,
      lateCycleProtectionActive: false,
      protectionStatus: 'WATCH',
      lockTier: 'NONE',
      lockEvaluation: {
        lockScore: 0,
        conviction: 0,
        reversalRisk: 0,
        probabilityEdge: 0,
        probabilityStability: 0,
        modelAgreement: 0,
        dataHealth: 0,
        observationSeconds: 0,
        lockEligible: false,
        lockTier: 'NONE',
        lockReadiness: 0,
        blockerReason: 'Waiting for the engine.',
        lockReason: 'Waiting for the engine.',
        probVelocity: {
          upVelocity: 0,
          chopVelocity: 0,
          downVelocity: 0
        }
      },
      checklist: {
        cycleActive: true,
        minLockDelayPassed: false,
        timeWindowPassed: false,
        regimePassed: false,
        directionalScorePassed: false,
        confidencePassed: false,
        temporalStabilityPassed: false,
        crossVenuePassed: false,
        reversalRiskPassed: false,
        evidenceConfluencePassed: false,
        noContradictionPassed: false,
        protectionEnginePassed: false,
        dataFreshnessPassed: false,
        allPassed: false
      },
      skipReasonCode: null,
      skipReasonTitle: null,
      skipReasonDescription: null,
      scoreComponents: {
        directionalEdge: 0,
        evidenceConfluence: 0,
        temporalStability: 0,
        marketRegimeQuality: 0,
        crossVenueAgreement: 0,
        reversalProtection: 0,
        dataFreshness: 0,
        modelConsensus: 0
      },
      activeWeightingProfile: {
        PRICE_STRUCTURE: 0,
        MOMENTUM: 0,
        ORDER_FLOW: 0,
        MULTI_TIMEFRAME: 0,
        TEMPORAL_STABILITY: 0,
        MODEL_CONSENSUS: 0,
        CROSS_VENUE: 0,
        ORDERBOOK_LIQUIDITY: 0
      }
    },

    createdAt: nowMs,
    lockedAt: null,
    unlockedAt: null,
    settledAt: null,

    settlementStatus: 'PENDING',
    finalOutcome: null,
    settlementPrice: null,
    pnlDollar: null,

    stateVersion: 0,
    updatedAt: new Date(nowMs).toISOString(),
    serverSource: 'CLIENT_PLACEHOLDER'
  };
}
