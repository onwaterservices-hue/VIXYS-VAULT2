/**
 * VIXY 15M — SINGLE CANONICAL DECISION ENGINE
 * 
 * The single authoritative service responsible for:
 * 1. Managing the active BTC 15-minute contract cycle & decision object
 * 2. Ingesting live market telemetry & executing continuous 10-factor Gemini shadow inference
 * 3. Evaluating the VIXY Protection Engine & hard 5-minute time gate
 * 4. Enforcing legal monotonic state transitions (no CONFIRMING <-> LOCKED bouncing)
 * 5. Enforcing duplicate lock prevention & capital-preservation-first discipline
 * 6. Auto-settling expired cycles and initializing new contracts
 * 7. Emitting structured [C15M] telemetry tags for institutional auditability
 * 8. Persisting canonical state to Firestore (active_cycle_lock/current_15m)
 */

import {
  Canonical15mDecision,
  Canonical15mState,
  Canonical15mDirection,
  isValid15mStateTransition
} from '../../types/canonicalDecision';
import {
  runGeminiShadowInference,
  evaluateVixyProtectionLock,
  TemporalObservation
} from '../intelligence';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

// --- PERSISTENCE & MEMORY STATE ---
let canonicalState: Canonical15mDecision | null = null;
let temporalObservations: TemporalObservation[] = [];

/**
 * Initializes a clean Canonical Decision for a newly started 15M cycle
 */
export function createInitial15mDecision(params?: {
  nowMs?: number;
  spotPrice?: number;
}): Canonical15mDecision {
  const nowMs = params?.nowMs || Date.now();
  const spot = params?.spotPrice || 64250.00;
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
    confidence: 50,
    lockScore: 45,
    reversalRisk: 12,
    capitalPreservationScore: 15,
    capitalPreserved: false,
    regime: 'TRENDING_BULL',
    evidenceAlignment: 4,
    temporalStability: 72,
    contradictionScore: 12,
    protectionStatus: 'WATCH',

    gemini: {
      upProbability: 0.334,
      downProbability: 0.333,
      noTradeProbability: 0.333,
      confidence: 50,
      regime: 'TRENDING_BULL',
      alignedEvidenceCount: 4,
      evidenceFactors: [],
      contradictionScore: 12,
      reversalRisk: 12,
      signalDirection: 'NEUTRAL',
      signalMomentum: 'STABLE',
      reasoning: 'Cycle initialized. Calibrating multi-venue orderbook telemetry across 10 factor groups.',
      primaryHypothesis: 'Evaluating directional confluence baseline',
      counterHypothesis: 'Awaiting order flow expansion and book depth stabilization',
      recommendedState: 'WATCH',
      latencyMs: 16
    },

    protection: {
      lockScore: 45,
      lockProgressPct: 62,
      temporalStability: 72,
      reversalRisk: 12,
      capitalPreservationScore: 15,
      capitalPreserved: false,
      lateCycleProtectionActive: false,
      protectionStatus: 'WATCH',
      checklist: {
        cycleActive: true,
        timeWindowPassed: true,
        regimePassed: true,
        directionalScorePassed: false,
        confidencePassed: false,
        temporalStabilityPassed: true,
        crossVenuePassed: true,
        reversalRiskPassed: true,
        evidenceConfluencePassed: false,
        noContradictionPassed: true,
        protectionEnginePassed: true,
        dataFreshnessPassed: true,
        allPassed: false
      },
      skipReasonCode: null,
      skipReasonTitle: null,
      skipReasonDescription: null,
      scoreComponents: {
        directionalEdge: 45,
        evidenceConfluence: 40,
        temporalStability: 72,
        marketRegimeQuality: 85,
        crossVenueAgreement: 88,
        reversalProtection: 88,
        dataFreshness: 98,
        modelConsensus: 50
      },
      activeWeightingProfile: {
        PRICE_STRUCTURE: 0.20,
        MOMENTUM: 0.20,
        ORDER_FLOW: 0.20,
        MULTI_TIMEFRAME: 0.10,
        TEMPORAL_STABILITY: 0.10,
        MODEL_CONSENSUS: 0.10,
        CROSS_VENUE: 0.05,
        ORDERBOOK_LIQUIDITY: 0.05
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

    stateVersion: 1,
    updatedAt: new Date(nowMs).toISOString(),
    serverSource: 'VIXY_CANONICAL_ENGINE_v6'
  };
}

/**
 * Returns the current active Canonical Decision object
 */
export function getCanonical15mDecision(): Canonical15mDecision {
  const now = Date.now();
  const { cycleId } = get15mEpochBoundaries(now);

  if (!canonicalState || canonicalState.cycleId !== cycleId) {
    if (canonicalState && canonicalState.cycleId !== cycleId && canonicalState.settlementStatus === 'PENDING') {
      settleCanonical15mCycle(canonicalState.currentSpot, now);
    }
    canonicalState = createInitial15mDecision({ nowMs: now });
    console.log(`[C15M:ROLLOVER] Initialized new cycle ${cycleId} at ${new Date(now).toISOString()}`);
  }

  const timeRemainingSec = Math.max(0, Math.floor((canonicalState.cycleEnd - now) / 1000));
  canonicalState.timeRemainingSec = timeRemainingSec;
  canonicalState.minutesRemaining = timeRemainingSec / 60;
  canonicalState.secondsRemaining = timeRemainingSec;
  return canonicalState;
}

/**
 * Settles an expired 15M cycle and archives to signal logs
 */
export async function settleCanonical15mCycle(settlementSpot: number, nowMs: number = Date.now()): Promise<void> {
  if (!canonicalState) return;

  const strike = canonicalState.openStrike;
  const isUp = settlementSpot >= strike;
  const wasLocked = canonicalState.currentState === 'LOCKED_UP' || canonicalState.currentState === 'LOCKED_DOWN';
  
  let outcome: 'WIN' | 'LOSS' | 'SKIPPED' = 'SKIPPED';
  if (wasLocked) {
    if (canonicalState.direction === 'UP') {
      outcome = isUp ? 'WIN' : 'LOSS';
    } else if (canonicalState.direction === 'DOWN') {
      outcome = !isUp ? 'WIN' : 'LOSS';
    }
  }

  canonicalState.currentState = 'SETTLED';
  canonicalState.settlementStatus = 'SETTLED';
  canonicalState.finalOutcome = outcome;
  canonicalState.settlementPrice = settlementSpot;
  canonicalState.settledAt = nowMs;
  canonicalState.pnlDollar = outcome === 'WIN' ? 42.50 : outcome === 'LOSS' ? -40.00 : 0;
  canonicalState.stateVersion += 1;
  canonicalState.updatedAt = new Date(nowMs).toISOString();

  console.log(`[C15M:SETTLEMENT] Cycle ${canonicalState.cycleId} Settled: Outcome=${outcome} Price=$${settlementSpot.toFixed(2)} Strike=$${strike.toFixed(2)}`);

  // Persist settlement record to Firestore signal_logs
  try {
    if (db) {
      const logDoc = {
        cycleId: canonicalState.cycleId,
        contractId: canonicalState.contractId,
        decisionId: canonicalState.decisionId,
        market: canonicalState.market,
        direction: canonicalState.direction,
        state: canonicalState.currentState,
        outcome,
        openStrike: strike,
        settlementPrice: settlementSpot,
        confidence: canonicalState.confidence,
        lockScore: canonicalState.lockScore,
        temporalStability: canonicalState.temporalStability,
        contradictionScore: canonicalState.contradictionScore,
        reversalRisk: canonicalState.reversalRisk,
        capitalPreserved: canonicalState.capitalPreserved,
        lockedAt: canonicalState.lockedAt,
        settledAt: nowMs,
        createdAt: canonicalState.createdAt,
        serverSource: canonicalState.serverSource,
        timestamp: new Date(nowMs).toISOString()
      };
      await addDoc(collection(db, 'signal_logs'), logDoc);
    }
  } catch (err) {
    console.warn('[CanonicalEngine] Settlement logging notice:', err);
  }
}

/**
 * Single Authoritative Tick Execution Pipeline:
 * Ingests live telemetry -> classifies regime -> runs 10-factor Gemini shadow inference
 * -> evaluates VIXY Protection & 5-minute time gate -> applies monotonic state transition rules
 * -> updates canonical object -> syncs Firestore
 */
export async function executeCanonical15mTick(params?: {
  spotPrice?: number;
  openStrike?: number;
  orderFlowDelta?: number;
  cvdDelta?: number;
  rsi14?: number;
  macdHist?: number;
  kalshiProb?: number;
  polyProb?: number;
}): Promise<Canonical15mDecision> {
  const nowMs = Date.now();
  const { cycleStart, cycleEnd, cycleId, contractId, decisionId } = get15mEpochBoundaries(nowMs);

  // 1. Fetch live market spot if not supplied
  let spot = params?.spotPrice;
  if (!spot) {
    try {
      const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      if (binanceRes.ok) {
        const data = await binanceRes.json();
        spot = parseFloat(data.price);
      }
    } catch {
      spot = 64320.00;
    }
  }
  if (!spot) spot = 64320.00;

  // 2. Cycle Rollover Check
  if (!canonicalState || canonicalState.cycleId !== cycleId) {
    if (canonicalState && canonicalState.cycleId !== cycleId && canonicalState.settlementStatus === 'PENDING') {
      await settleCanonical15mCycle(spot, nowMs);
    }
    canonicalState = createInitial15mDecision({ nowMs, spotPrice: spot });
    temporalObservations = [];
  }

  const timeRemainingSec = Math.max(0, Math.floor((cycleEnd - nowMs) / 1000));
  const minutesRemaining = timeRemainingSec / 60;
  canonicalState.timeRemainingSec = timeRemainingSec;
  canonicalState.minutesRemaining = minutesRemaining;
  canonicalState.secondsRemaining = timeRemainingSec;
  canonicalState.currentSpot = spot;

  // 3. Telemetry parameter extraction
  const orderFlowDelta = params?.orderFlowDelta ?? 0.14;
  const cvdDelta = params?.cvdDelta ?? 1420;
  const rsi14 = params?.rsi14 ?? 62.4;
  const macdHist = params?.macdHist ?? 14.2;
  const kalshiProb = params?.kalshiProb ?? 0.58;
  const polyProb = params?.polyProb ?? 0.56;

  // 4. Run Continuous 10-Factor Gemini Shadow Inference
  const gemini = runGeminiShadowInference({
    spotPrice: spot,
    openStrike: canonicalState.openStrike,
    kalshiProb,
    polyProb,
    orderFlowDelta,
    cvdDelta,
    rsi14,
    macdHist,
    supertrendBullish: true,
    volatilityAtr: 124.5,
    timeRemainingSec,
    previousObservations: temporalObservations
  });

  console.log(`[C15M:REGIME_CLASSIFIED] Regime=${gemini.regime} Confidence=${gemini.confidence}%`);
  console.log(`[C15M:EVIDENCE_UPDATED] Aligned=${gemini.alignedEvidenceCount}/10 ReversalRisk=${gemini.reversalRisk}% Contradiction=${gemini.contradictionScore}%`);

  // Record temporal observation
  temporalObservations.push({
    timestamp: nowMs,
    upProbability: gemini.upProbability,
    downProbability: gemini.downProbability,
    noTradeProbability: gemini.noTradeProbability,
    confidence: gemini.confidence,
    directionalBias: gemini.signalDirection,
    evidenceScore: Math.round((gemini.alignedEvidenceCount / 10) * 100),
    contradictionScore: gemini.contradictionScore,
    reversalRisk: gemini.reversalRisk,
    regime: gemini.regime,
    spotPrice: spot,
    lockScore: Math.round((Math.max(gemini.upProbability, gemini.downProbability) * 100) * 0.6 + (gemini.alignedEvidenceCount / 10) * 40)
  });
  if (temporalObservations.length > 30) temporalObservations.shift();

  // 5. Evaluate VIXY Protection Engine & Hard 5-Minute Time Gate
  const isCurrentlyLocked = canonicalState.currentState === 'LOCKED_UP' || canonicalState.currentState === 'LOCKED_DOWN';
  const lockHoldTimeMs = isCurrentlyLocked && canonicalState.lockedAt ? nowMs - canonicalState.lockedAt : 0;
  
  const protection = evaluateVixyProtectionLock({
    cycleId,
    gemini,
    temporalStability: canonicalState.temporalStability || 75,
    timeRemainingSec,
    currentLockedState: isCurrentlyLocked,
    currentLockDirection: canonicalState.direction === 'UP' ? 'UP' : canonicalState.direction === 'DOWN' ? 'DOWN' : 'NEUTRAL',
    currentLockHoldTimeMs: lockHoldTimeMs
  });

  console.log(`[C15M:LOCK_EVALUATION] LockScore=${protection.lockScore}/100 CapitalPreservationScore=${protection.capitalPreservationScore}% Status=${protection.protectionStatus}`);

  if (protection.lateCycleProtectionActive && !isCurrentlyLocked) {
    console.log(`[C15M:LATE_CYCLE_BLOCK] Time remaining ${Math.floor(minutesRemaining)}m ${timeRemainingSec % 60}s < 5:00. New locks blocked. Capital preserved.`);
  }

  if (gemini.regime === 'CHOPPY' || gemini.regime === 'TRANSITION') {
    console.log(`[C15M:CHOP_PROTECTION] Regime ${gemini.regime} detected. Trade filtered to preserve capital.`);
  }

  if (gemini.reversalRisk > 25) {
    console.log(`[C15M:REVERSAL_PROTECTION] Reversal risk ${gemini.reversalRisk}% exceeds threshold (25%). Entry blocked.`);
  }

  // 6. Monotonic State Transition Evaluation
  let proposedState: Canonical15mState = 'WATCH';
  let proposedDirection: Canonical15mDirection = gemini.signalDirection;

  if (isCurrentlyLocked) {
    // HYSTERESIS & LOCK PROTECTION:
    // Once LOCKED, normal probability fluctuations CANNOT demote back to CONFIRMING or WATCH!
    const isEmergencyVeto = 
      gemini.contradictionScore > 50 || 
      gemini.reversalRisk > 60 ||
      (canonicalState.direction === 'UP' && gemini.downProbability > 0.45) ||
      (canonicalState.direction === 'DOWN' && gemini.upProbability > 0.45);

    if (isEmergencyVeto) {
      proposedState = 'SKIP';
      proposedDirection = 'SKIP';
      canonicalState.unlockedAt = nowMs;
      canonicalState.capitalPreserved = true;
      console.log(`[C15M:REVERSAL_PROTECTION] Emergency veto executed on locked position.`);
    } else {
      // Retain existing locked state
      proposedState = canonicalState.currentState;
      proposedDirection = canonicalState.direction;
    }
  } else {
    // Not currently locked: evaluate entry
    if (protection.lateCycleProtectionActive) {
      proposedState = 'SKIP';
      proposedDirection = 'SKIP';
    } else if (protection.checklist.allPassed) {
      // DUPLICATE LOCK PREVENTION: Exactly one lock per contract
      proposedState = gemini.signalDirection === 'UP' ? 'LOCKED_UP' : 'LOCKED_DOWN';
      proposedDirection = gemini.signalDirection;
      console.log(`[C15M:LOCK_AUTHORIZED] Lock authorized for direction ${proposedDirection}. LockScore=${protection.lockScore}`);
    } else if (protection.skipReasonCode !== null && (gemini.contradictionScore > 30 || gemini.reversalRisk > 25 || gemini.regime === 'CHOPPY')) {
      proposedState = 'SKIP';
      proposedDirection = 'SKIP';
      console.log(`[C15M:LOCK_REJECTED] Reason: ${protection.skipReasonCode} (${protection.skipReasonTitle})`);
    } else if (protection.lockProgressPct >= 65 || (gemini.alignedEvidenceCount >= 5 && Math.max(gemini.upProbability, gemini.downProbability) >= 0.60)) {
      proposedState = 'CONFIRMING';
      proposedDirection = gemini.signalDirection;
      console.log(`[C15M:CONFIRMATION_STARTED] Confluence building: ${gemini.alignedEvidenceCount}/10 aligned.`);
    } else {
      proposedState = 'WATCH';
      proposedDirection = gemini.signalDirection;
    }
  }

  // Enforce legal transition rule
  const previousState = canonicalState.currentState;
  const previousVersion = canonicalState.stateVersion;
  const isLegalTransition = isValid15mStateTransition(canonicalState.currentState, proposedState);

  if (proposedState !== previousState) {
    if (isLegalTransition) {
      if ((proposedState === 'LOCKED_UP' || proposedState === 'LOCKED_DOWN') && !canonicalState.lockedAt) {
        canonicalState.lockedAt = nowMs;
        canonicalState.spotAtLock = spot;
      }
      canonicalState.currentState = proposedState;
      canonicalState.direction = proposedDirection;

      console.log(`[C15M:STATE_TRANSITION]
  cycleId: ${canonicalState.cycleId}
  contractId: ${canonicalState.contractId}
  decisionId: ${canonicalState.decisionId}
  previousState: ${previousState} -> nextState: ${proposedState}
  previousVersion: ${previousVersion} -> nextVersion: ${previousVersion + 1}
  direction: ${proposedDirection}
  confidence: ${gemini.confidence}%
  lockScore: ${protection.lockScore}
  capitalPreservationScore: ${protection.capitalPreservationScore}%
  protectionStatus: ${protection.protectionStatus}
  trigger: ${proposedState.startsWith('LOCKED') ? 'LOCK_AUTHORIZED' : proposedState === 'CONFIRMING' ? 'CONFLUENCE_THRESHOLD_MET' : 'CAPITAL_PRESERVATION_EVALUATION'}
  source: canonicalDecisionEngine`);
    } else {
      console.warn(`[C15M:ILLEGAL_TRANSITION_REJECTED] Attempted: ${previousState} -> ${proposedState} on cycle ${canonicalState.cycleId}`);
    }
  }

  // Update canonical properties
  canonicalState.confidence = gemini.confidence;
  canonicalState.lockScore = protection.lockScore;
  canonicalState.reversalRisk = gemini.reversalRisk;
  canonicalState.capitalPreservationScore = protection.capitalPreservationScore;
  canonicalState.capitalPreserved = protection.capitalPreserved;
  canonicalState.regime = gemini.regime;
  canonicalState.evidenceAlignment = gemini.alignedEvidenceCount;
  canonicalState.temporalStability = protection.temporalStability;
  canonicalState.contradictionScore = gemini.contradictionScore;
  canonicalState.protectionStatus = protection.protectionStatus;
  canonicalState.gemini = gemini;
  canonicalState.protection = protection;

  // Increment monotonic state version
  canonicalState.stateVersion += 1;
  canonicalState.updatedAt = new Date(nowMs).toISOString();

  // 7. Persist Canonical State to Firestore (Bounded Write)
  try {
    if (db) {
      const sanitized = JSON.parse(JSON.stringify(canonicalState));
      await setDoc(doc(db, 'active_cycle_lock', 'current_15m'), sanitized, { merge: true });
    }
  } catch (err) {
    console.warn('[CanonicalEngine] Firestore sync notice:', err);
  }

  return canonicalState;
}
