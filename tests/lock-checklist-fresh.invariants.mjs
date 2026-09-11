// RUNTIME INVARIANTS -- the served lock checklist is rebuilt from the current
// tick's pipeline without advancing research state.
//
// runMarketEngineTick evaluated the gate (inside checkAndSettle15mCycle) before
// re-evaluating latestBtc15mPipeline, so active15mCycle.lockEligibility always
// described the previous tick, and a cold instance's first tick described the
// zero seed. Production served "0/11 evidence families agreeing" and "0/5
// timeframes aligned" beside 9/11 and 5/5 in the same payload. The tick now
// calls canLockCurrentCycle(livePrice, { observeOnly: true }) after the refresh.
// This file executes the REAL gate source to prove the observe-only call
// refreshes the checklist and leaves the Layer 5 shadow, its persistence and
// the conviction trail untouched.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildStrikeSideHelper, createHarness } from './_engineSource.mjs';

const t = createHarness('lock-checklist-fresh.invariants');
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'server.ts'), 'utf8');

const start = src.indexOf('function canLockCurrentCycle(livePrice)');
const end = src.indexOf('__name(canLockCurrentCycle', start);
t.check('gate function found by its unchanged signature', start >= 0 && end > start);
const gateSrc = src.slice(start, end);

const CYCLE_MS = 15 * 60 * 1000;
const EPOCH = Math.floor(Date.now() / CYCLE_MS) * CYCLE_MS;
function fakeDate(nowMs) {
  const RealDate = Date;
  return class extends RealDate {
    constructor(...a) { if (a.length === 0) super(nowMs); else super(...a); }
    static now() { return nowMs; }
  };
}
const pipeline = (agree, aligned) => ({
  lockQuality: 92, lockQualityTier: 'HIGH_CONVICTION',
  evidenceAgreementCount: agree,
  multiTimeframeAlignment: { alignedCount: aligned },
  reversalAssessment: { threatScore: 10 },
  chopAnalytics: { isChopFiltered: false, reason: null },
  dataQuality: { status: 'OPTIMAL', feedFreshnessMs: 500 },
  volatilityExpectedMove: { isStrikeFeasible: true, coverageRatio: 2.1 },
  guardianDecision: {},
});

const elapsed = 400;
const nowMs = EPOCH + elapsed * 1000;
const cycle = {
  cycleId: 'BTC-15M-TEST', intervalStart: EPOCH, intervalEnd: EPOCH + CYCLE_MS,
  cycleObservationDuration: 0, isChoppy: false, choppyReason: null,
  signalPersistence: 30, directionChanges: 0, calibrationSamples: 100,
  hasConflict: false, signalUnstable: false, reversalThreat: false,
  recentObservations: [{ candidateDir: 'UP', conf: 82 }, { candidateDir: 'UP', conf: 84 }, { candidateDir: 'UP', conf: 86 }],
  isLocked: false, lockCount: 0, lockedAt: null,
};
const shadowL5ByCycle = new Map();
const persisted = [];

// Shared, mutable state across calls, exactly as the module globals are shared.
function gateWith(pipe) {
  const env = {
    console: { log() {}, warn() {}, error() {} },
    Date: fakeDate(nowMs), Math, Boolean, Number, String, Set, Map, Array, Object, JSON,
    __name: (f) => f,
    active15mCycle: cycle,
    latestBtc15mPipeline: pipe,
    lastMarketUpdateTs: nowMs - 1000,
    engineFeedStatus: 'CONNECTED',
    currentConfidence: 90, currentEdgePct: 4, currentModelProbability: 0.8, currentDirection: 'UP',
    persistenceSeconds: 30,
    latestGuardianDecision: { reversalThreat: 10 },
    latestCrossAssetContext: { state: 'ALIGNED' },
    latestOrderbookIntel: { imbalancePct: 55 }, latestWhaleIntel: {}, latestKalshiContext: {},
    marketDataSource: 'COINBASE', lockedCycleIds: new Set(),
    strike15mResolved: true,
    VIXY_LOCK_RULE: 'off', VIXY_LOCK_RULE_BAR: 0.95, current15mStrikePrice: 64000, current15mStrikeSource: 'KALSHI',
    computeStrikeSideProbability: buildStrikeSideHelper('off', 0.95),
    globalSequenceNumber: 1,
    shadowL5ByCycle,
    persistShadowL5: (sh, forced) => { persisted.push({ ticks: sh.ticks, forced }); return Promise.resolve(); },
    kalshiImpliedAtMs: nowMs - 5000, currentKalshiImpliedProb: 0.55,
  };
  const keys = Object.keys(env);
  return new Function(...keys, `${gateSrc}; return canLockCurrentCycle;`)(...keys.map((k) => env[k]));
}
const checkOf = (id) => (cycle.lockEligibility?.checks || []).find((c) => c.id === id) || null;

t.section('a normal gate call records research state and the checklist');
gateWith(pipeline(9, 4))(64000);
const shAfterFirst = shadowL5ByCycle.get('BTC-15M-TEST');
const trailAfterFirst = Array.isArray(cycle.convictionTrail) ? cycle.convictionTrail.length : 0;
t.check('shadow record created and ticked once', shAfterFirst && shAfterFirst.ticks === 1, JSON.stringify(shAfterFirst && shAfterFirst.ticks));
t.check('conviction trail recorded a point', trailAfterFirst === 1, String(trailAfterFirst));
t.eq('checklist shows the pipeline it was given (families)', checkOf('AGREEMENT')?.current, '9/11');
t.eq('checklist shows the pipeline it was given (timeframes)', checkOf('MTF')?.current, '4/5');

t.section('an observe-only call refreshes the checklist and nothing else');
const persistedBefore = persisted.length;
gateWith(pipeline(3, 1))(64000, { observeOnly: true });
t.eq('families row reflects the refreshed pipeline', checkOf('AGREEMENT')?.current, '3/11');
t.eq('timeframes row reflects the refreshed pipeline', checkOf('MTF')?.current, '1/5');
t.check('families row now fails its bar', checkOf('AGREEMENT')?.pass === false);
t.eq('shadow tick count not advanced', shadowL5ByCycle.get('BTC-15M-TEST').ticks, 1);
t.eq('no shadow persistence triggered', persisted.length, persistedBefore);
t.eq('conviction trail not advanced', cycle.convictionTrail.length, trailAfterFirst);

t.section('the default call is unchanged');
gateWith(pipeline(9, 4))(64000);
t.eq('a second normal call advances the shadow tick count', shadowL5ByCycle.get('BTC-15M-TEST').ticks, 2);
t.eq('and restores the checklist to its pipeline', checkOf('AGREEMENT')?.current, '9/11');

t.section('the engine tick refreshes the checklist after the pipeline');
const tickStart = src.indexOf('async function runMarketEngineTick()');
const tickEnd = src.indexOf('\n}\n', tickStart);
const tick = src.slice(tickStart, tickEnd);
const iSettle = tick.indexOf('await checkAndSettle15mCycle(livePrice);');
const iPipe = tick.indexOf('latestBtc15mPipeline = evaluateBtc15mHighConvictionPipeline(');
const iGuard = tick.indexOf('latestGuardianDecision = {');
const iRefresh = tick.indexOf('canLockCurrentCycle(livePrice, { observeOnly: true });');
t.check('tick found', tickStart >= 0 && tickEnd > tickStart);
t.check('observe-only refresh exists in the tick', iRefresh > 0);
t.check('refresh runs after the gate decision, the pipeline and the guardian', iSettle > 0 && iPipe > iSettle && iGuard > iPipe && iRefresh > iGuard);

t.done();
