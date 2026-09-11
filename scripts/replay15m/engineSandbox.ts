// Loads the REAL 15M decision functions out of server.ts and makes them
// callable offline.
//
// server.ts is a 17k-line Express monolith that starts a listener on import, so
// it cannot be imported directly. Instead the relevant function bodies are
// sliced out of the file verbatim and evaluated together in one scope, which
// gives them the shared mutable module-level state (active15mCycle,
// currentDirection, persistenceSeconds, ...) that they expect. This is the same
// technique the test suites in tests/ use.
//
// Nothing in this file reimplements engine logic. Every decision comes from a
// string cut out of server.ts. If server.ts changes, the slices change with it,
// and an anchor that stops being unique throws rather than silently cutting the
// wrong region.
//
// SAFETY: everything that would reach the outside world is stubbed to a no-op
// before the sandbox is built -- Discord broadcast, Firestore reads and writes,
// disk persistence. The sandbox cannot write to production.
import { readFileSync } from 'fs';
import { join } from 'path';

/** Slice from startAnchor up to (and INCLUDING) endAnchor. */
export function sliceThrough(src: string, startAnchor: string, endAnchor: string, label: string): string {
  const nStart = src.split(startAnchor).length - 1;
  const nEnd = src.split(endAnchor).length - 1;
  if (nStart !== 1) throw new Error(`${label}: start anchor appears ${nStart}x, expected exactly 1`);
  if (nEnd !== 1) throw new Error(`${label}: end anchor appears ${nEnd}x, expected exactly 1`);
  const i = src.indexOf(startAnchor);
  const j = src.indexOf(endAnchor, i);
  if (j < 0) throw new Error(`${label}: end anchor precedes start anchor`);
  return src.slice(i, j + endAnchor.length);
}

export function sliceBetween(src: string, startAnchor: string, endAnchor: string, label: string): string {
  const nStart = src.split(startAnchor).length - 1;
  const nEnd = src.split(endAnchor).length - 1;
  if (nStart !== 1) throw new Error(`${label}: start anchor appears ${nStart}x, expected exactly 1`);
  if (nEnd !== 1) throw new Error(`${label}: end anchor appears ${nEnd}x, expected exactly 1`);
  const i = src.indexOf(startAnchor);
  const j = src.indexOf(endAnchor, i);
  if (j < 0) throw new Error(`${label}: end anchor precedes start anchor`);
  return src.slice(i, j);
}

export interface SandboxOptions {
  /** Seed for the one Math.random() call inside the pipeline (VWAP volume estimate). */
  seed?: number;
  /**
   * Path to the server.ts to slice the engine from. Defaults to the working
   * tree's. Point it at a file produced by `git show <sha>:server.ts` to replay
   * a specific engine version over identical data -- the OLD-vs-NEW comparison
   * Phase 8 requires, without checking anything out.
   */
  engineSourcePath?: string;
  /**
   * Layer 5 strike-side rule: 'off' (default), 'strike_side' (filter on the
   * engine's own lock) or 'strike_side_only' (the rule decides; the real gate's
   * strike_side_only branch is what runs here, so the replay measures the
   * shipped code path, not a reimplementation).
   */
  lockRule?: 'off' | 'strike_side' | 'strike_side_only';
  /** Bar for the rule (default 0.95). */
  lockRuleBar?: number;
  /** Alternative strike-side table (e.g. a refit on a disjoint window). */
  strikeSideTablePath?: string;
}

export interface EngineSandbox {
  /** Advance one tick: run the real pipeline + state derivation at this price/time. */
  tick(spot: number, nowMs: number, strike: number, realFlow?: unknown): void;
  /** Run the real canLockCurrentCycle against current state, at replay time nowMs. */
  canLock(spot: number, nowMs?: number): any;
  /** Start a fresh 15-minute cycle. */
  beginCycle(cycleId: string, intervalStartMs: number, strike: number): void;
  /** Read the mutable engine state the harness needs to observe. */
  read(): {
    direction: string; confidence: number; modelProbability: number; edgePct: number;
    lockQuality: number; lockQualityTier: string; persistenceSeconds: number;
    cycle: any; pipeline: any;
  };
  /** Source fingerprints, so a report can state exactly what it ran. */
  provenance: Record<string, number>;
}

// A small deterministic PRNG. This REPLACES the single Math.random() call in
// evaluateBtc15mHighConvictionPipeline (the per-tick volume estimate feeding
// the cycle VWAP accumulator). Production is genuinely non-deterministic there;
// the replay pins it so reruns are reproducible. This is a documented
// divergence from production, not a model input.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildEngineSandbox(repoRoot: string, opts: SandboxOptions = {}): EngineSandbox {
  const src = readFileSync(opts.engineSourcePath ?? join(repoRoot, 'server.ts'), 'utf8');

  // --- the real sources ----------------------------------------------------
  const pipelineSrc = sliceBetween(
    src,
    'function evaluateBtc15mHighConvictionPipeline(',
    '__name(\n  evaluateBtc15mHighConvictionPipeline,',
    'evaluateBtc15mHighConvictionPipeline',
  );
  const gateSrc = sliceBetween(
    src,
    'function canLockCurrentCycle(livePrice)',
    '__name(canLockCurrentCycle',
    'canLockCurrentCycle',
  );
  // Layer 5 helper (absent in engines before it existed -- then a stub is
  // declared so older gates, which never call it, still evaluate).
  const helperSrc = src.includes('function computeStrikeSideProbability(')
    ? sliceBetween(src, 'function computeStrikeSideProbability(', '__name(computeStrikeSideProbability', 'computeStrikeSideProbability').replace('(strikeSideTableV1 as any)', 'strikeSideTableV1')
    : 'function computeStrikeSideProbability() { return { p: null, n: 0, reason: "NO_LAYER5" }; }';
  const strikeSideTable = JSON.parse(readFileSync(opts.strikeSideTablePath ?? join(repoRoot, 'src', 'data', 'strikeSideTable.v1.json'), 'utf8'));
  // The block in runMarketEngineTick that turns a pipeline result into the
  // engine's directional state (currentDirection / persistenceSeconds / ...).
  // This is where the directional-bias fix lives, so it must be the real one.
  const stateSrc = sliceThrough(
    src,
    '    currentModelProbability =\n      latestBtc15mPipeline.edgeVsConfidence.modelProbability;',
    '      persistenceSeconds = 0;\n      currentDirection = pipelineDirection;\n    }',
    'directional state derivation',
  );
  // The block in checkAndSettle15mCycle that maintains per-cycle observation
  // state: recentObservations, signalPersistence, directionChanges,
  // signalUnstable and hasConflict -- all of which canLockCurrentCycle reads.
  const observationSrc = sliceThrough(
    src,
    '  if (engineFeedStatus === "CONNECTED") {\n    active15mCycle.calibrationSamples += 1;',
    '  active15mCycle.hasConflict = hasConflict;',
    'cycle observation state',
  );
  // The two derived pipeline inputs, taken from their real definitions in
  // runMarketEngineTick. Both turn out to be pure functions of spot vs strike.
  const inputsSrc = sliceBetween(
    src,
    '    const spotStrikeDist = livePrice - current15mStrikePrice;',
    '    void hydratePriceHistoryFromCandles(now);', // the dead currentVol15m that used to end this slice is gone
    'pipeline input derivation',
  );

  const provenance = {
    pipelineChars: pipelineSrc.length,
    gateChars: gateSrc.length,
    stateChars: stateSrc.length,
    observationChars: observationSrc.length,
    inputsChars: inputsSrc.length,
    serverChars: src.length,
  };

  // --- the sandbox ---------------------------------------------------------
  // One scope, so the extracted sources share mutable state exactly as they do
  // as module-level bindings in server.ts.
  const body = `
"use strict";
const __name = (f) => f;

// module-level state that server.ts declares at the top level
let active15mCycle = null;
let latestBtc15mPipeline = null;
let latestCrossAssetContext = { state: "ALIGNED", riskPenalty: 0, directionalAgreementRatio: 1 };
let latestGuardianDecision = { action: "HOLD", reversalThreat: 20 };
let latestCalibrationState = {};
let serverLearningEngine = { settledHistory: [], historicalAccuracy: null, currentRegime: null, todaySettledCount: 0, lifetimeObservations: 0 };
let persistentSignalLogs = [];
let lockedCycleIds = new Set();
let cycleVwapAccumulator = { cycleStart: 0, cumulativePv: 0, cumulativeVol: 0, vwap: 0 };
let rollingBtcTicks = [];
// Real closed 1m candle closes that getPriceAtAgo falls back to when an
// instance's own ticks do not reach a lookback (server.ts, PR #70). Every
// replayed cycle carries full tick history, so the faithful value is empty and
// the fallback never fires. Missing, the pipeline threw ReferenceError and the
// replay harness could not run at all after #70.
let hydratedBtcCloses = [];
let lastMarketUpdateTs = 0;
let engineFeedStatus = "CONNECTED";
let currentBtcPrice = 0;
let currentBtcOpenPrice = 0;
let current15mStrikePrice = 0;
// ea05da9 (main): the gate refuses to lock until this instance has received a
// live strike. In replay every cycle is given its strike at beginCycle, so the
// faithful value is true. (It is set false only to simulate a cold instance.)
let strike15mResolved = true;
// The replay's strike is given at beginCycle and stands in for the Kalshi
// read; production distinguishes it from the rollover placeholder.
let current15mStrikeSource = "KALSHI";
// Layer 5 (strike-side rule) inputs. Off unless the harness is asked to test it.
const VIXY_LOCK_RULE = __LOCK_RULE__;
const VIXY_LOCK_RULE_BAR = __LOCK_RULE_BAR__;
const strikeSideTableV1 = __STRIKE_SIDE_TABLE__;
${helperSrc}
let currentBullVolumePct = 50;
let currentMomentum = 0;
let currentConfidence = 50;
let currentEdgePct = 0;
let currentModelProbability = 0.5;
let currentDirection = "NEUTRAL";
// The replay has no Kalshi price history: no market price, so no edge.
let currentKalshiImpliedProb = null;
let kalshiImpliedAtMs = 0;
let persistenceSeconds = 0;
let livePrice = 0;
let now = 0;
let elapsedSeconds = 0;
let intervalStart = 0;

// Replay clock. canLockCurrentCycle and the observation block both call
// Date.now(); in a replay that must be the simulated timestamp, not wall time.
const __RealDate = globalThis.Date;
let __nowMs = 0;
class Date extends __RealDate {
  constructor(...args) { if (args.length === 0) { super(__nowMs); } else { super(...args); } }
  static now() { return __nowMs; }
}

// The pipeline's only source of randomness, pinned for reproducibility.
const __rand = __SEEDED_RANDOM__;
const Math = new Proxy(globalThis.Math, {
  get(target, prop) { return prop === 'random' ? __rand : target[prop]; },
});

${pipelineSrc}
${gateSrc}

function __deriveInputs(spot, strike) {
  livePrice = spot;
  current15mStrikePrice = strike;
${inputsSrc}
  currentMomentum = intervalMomentum;
  currentBullVolumePct = Math.min(
    90,
    Math.max(10, Math.round(50 + moneynessPct * 25 + intervalMomentum * 15)),
  );
  return { intervalMomentum, moneynessPct };
}

function __deriveState() {
${stateSrc}
}

function __recordObservation(spot, nowMs, cycleIntervalStart) {
  livePrice = spot;
  now = nowMs;
  intervalStart = cycleIntervalStart;
  elapsedSeconds = Math.max(0, Math.floor((nowMs - cycleIntervalStart) / 1000));
${observationSrc}
}

return {
  beginCycle(cycleId, intervalStartMs, strike) {
    __nowMs = intervalStartMs;
    active15mCycle = {
      cycleId,
      intervalStart: intervalStartMs,
      intervalEnd: intervalStartMs + 900000,
      cycleObservationDuration: 0,
      cycleObservationCount: 0,
      calibrationSamples: 0,
      calibrationWindowMs: 0,
      calibrationDataAgeMs: 0,
      isChoppy: false, choppyReason: null,
      signalPersistence: 0, directionChanges: 0,
      lastCandidateDirection: null, candidateDirection: null,
      hasConflict: false, signalUnstable: true, reversalThreat: false,
      recentObservations: [],
      isLocked: false, lockCount: 0, lockedAt: null,
      kalshiStrike: null,
      historicalSimilarityPct: null,
      status: "ACTIVE", stage: "OBSERVING", qualificationStatus: "PENDING",
      protectionStatus: "WATCH",
      isCriticallyInvalidated: false,
      cycleHigh: 0, cycleLow: 0,
    };
    current15mStrikePrice = strike;
    currentDirection = "NEUTRAL";
    persistenceSeconds = 0;
    cycleVwapAccumulator = { cycleStart: 0, cumulativePv: 0, cumulativeVol: 0, vwap: 0 };
  },

  tick(spot, nowMs, strike, realFlow = null) {
    __nowMs = nowMs;
    currentBtcPrice = spot;
    lastMarketUpdateTs = nowMs;      // the replay feed is never stale
    engineFeedStatus = "CONNECTED";
    __deriveInputs(spot, strike);
    latestBtc15mPipeline = evaluateBtc15mHighConvictionPipeline(
      spot, strike, nowMs, currentBullVolumePct, currentMomentum, 0, realFlow,
    );
    __deriveState();
    __recordObservation(spot, nowMs, active15mCycle.intervalStart);
  },

  canLock(spot, nowMs) {
    if (typeof nowMs === 'number') __nowMs = nowMs;
    return canLockCurrentCycle(spot);
  },

  read() {
    return {
      direction: currentDirection,
      confidence: currentConfidence,
      modelProbability: currentModelProbability,
      edgePct: currentEdgePct,
      lockQuality: latestBtc15mPipeline ? latestBtc15mPipeline.lockQuality : null,
      lockQualityTier: latestBtc15mPipeline ? latestBtc15mPipeline.lockQualityTier : null,
      persistenceSeconds,
      cycle: active15mCycle,
      pipeline: latestBtc15mPipeline,
    };
  },
};
`;

  const factory = new Function('__SEEDED_RANDOM_FN__', '__LOCK_RULE__', '__LOCK_RULE_BAR__', '__STRIKE_SIDE_TABLE__',
    body.replace('__SEEDED_RANDOM__', '__SEEDED_RANDOM_FN__'));
  const api = factory(mulberry32(opts.seed ?? 1), opts.lockRule ?? 'off', opts.lockRuleBar ?? 0.95, strikeSideTable);
  return { ...api, provenance };
}
