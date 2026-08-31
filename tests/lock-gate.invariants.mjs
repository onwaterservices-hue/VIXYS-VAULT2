// RUNTIME INVARIANT TESTS — 15M LOCK GATE
// Executes the REAL canLockCurrentCycle / lock15mCycle source extracted verbatim from
// server.ts, with controlled state injected. No reimplementation, no network, no Firestore.
import { readFileSync } from 'fs';

const src = readFileSync(new URL('../../../../../Users/olivergershey/Downloads/VIXYS-VAULT2-main/server.ts', import.meta.url).pathname.includes('null') ? '/Users/olivergershey/Downloads/VIXYS-VAULT2-main/server.ts' : '/Users/olivergershey/Downloads/VIXYS-VAULT2-main/server.ts', 'utf8');

function extract(name, startPat) {
  const i = src.indexOf(startPat);
  if (i < 0) throw new Error(`cannot find ${name}`);
  const j = src.indexOf(`__name(${name}`, i);
  if (j < 0) throw new Error(`cannot find __name(${name}`);
  return src.slice(i, j);
}

const gateSrc = extract('canLockCurrentCycle', 'function canLockCurrentCycle(livePrice)');
const lockSrc = extract('lock15mCycle', 'async function lock15mCycle(cycleId, livePrice, forcedReason)');

// --- controlled environment -------------------------------------------------
// The gate requires the active cycle's intervalStart to equal the CURRENT 15-minute
// epoch boundary (currentCycle check). To hold both "epoch-aligned" and "elapsed = N"
// simultaneously, inject a controlled clock: a real epoch boundary E, with Date.now()
// returning E + elapsed. This exercises the genuine epoch arithmetic, not a bypass.
const CYCLE_MS = 15 * 60 * 1000;
const EPOCH = Math.floor(Date.now() / CYCLE_MS) * CYCLE_MS;
function makeFakeDate(fakeNowMs) {
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length === 0) { super(fakeNowMs); } else { super(...args); } }
    static now() { return fakeNowMs; }
  }
  return FakeDate;
}

function greenPipeline() {
  return {
    lockQuality: 92, lockQualityTier: 'HIGH_CONVICTION',
    evidenceAgreementCount: 9,
    multiTimeframeAlignment: { alignedCount: 4 },
    reversalAssessment: { threatScore: 10 },
    chopAnalytics: { isChopFiltered: false, reason: null },
    dataQuality: { status: 'OPTIMAL', feedFreshnessMs: 500 },
    volatilityExpectedMove: { isStrikeFeasible: true, coverageRatio: 2.1 },
    guardianDecision: {},
  };
}

function makeEnv(elapsedSec, overrides = {}) {
  const fakeNow = EPOCH + elapsedSec * 1000;
  return {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Date: makeFakeDate(fakeNow), Math, Boolean, Number, String, Set,
    __name: (f) => f,
    active15mCycle: {
      cycleId: 'BTC-15M-TEST',
      intervalStart: EPOCH,
      intervalEnd: EPOCH + CYCLE_MS,
      cycleObservationDuration: 0,
      isChoppy: false, choppyReason: null,
      signalPersistence: 30, directionChanges: 0,
      calibrationSamples: 100,
      hasConflict: false, signalUnstable: false, reversalThreat: false,
      recentObservations: [
        { candidateDir: 'UP', conf: 82 },
        { candidateDir: 'UP', conf: 84 },
        { candidateDir: 'UP', conf: 86 },
      ],
      isLocked: false, lockCount: 0, lockedAt: null,
      ...overrides.cycle,
    },
    latestBtc15mPipeline: greenPipeline(),
    lastMarketUpdateTs: fakeNow - 1000,
    engineFeedStatus: 'CONNECTED',
    currentConfidence: 90,
    currentEdgePct: 4.0,
    currentModelProbability: 0.8,
    currentDirection: 'UP',
    persistenceSeconds: 30,
    latestGuardianDecision: { reversalThreat: 10 },
    latestCrossAssetContext: { state: 'ALIGNED' },
    latestOrderbookIntel: { imbalancePct: 55 },
    latestWhaleIntel: {},
    latestKalshiContext: {},
    marketDataSource: 'BINANCE',
    lockedCycleIds: new Set(),
    globalSequenceNumber: 1,
    ...overrides.globals,
  };
}

function runGate(elapsedSec, overrides) {
  const env = makeEnv(elapsedSec, overrides);
  const keys = Object.keys(env);
  const fn = new Function(...keys, `${gateSrc}; return canLockCurrentCycle(64000);`);
  return fn(...keys.map((k) => env[k]));
}

async function runLockWindowCheck(elapsedSec) {
  // lock15mCycle's own commit-point window check fires BEFORE canLockCurrentCycle.
  // Stub the gate as permissive to prove the commit point independently refuses.
  const env = makeEnv(elapsedSec);
  env.canLockCurrentCycle = () => ({ allowed: true, reasons: [] });
  // stubs for identifiers used after the gate (only reached if window check passes)
  const stubs = ['recordTelemetryObservation','persistSignalLogEntry','broadcastSignalToDiscord',
    'attemptDiscordSignalBroadcast','saveDiskStore','db','currentBtcPrice','fetch'];
  for (const s of stubs) if (!(s in env)) env[s] = () => {};
  const keys = Object.keys(env);
  const fn = new Function(...keys, `${lockSrc}; return lock15mCycle('BTC-15M-TEST', 64000, null);`);
  try {
    return await fn(...keys.map((k) => env[k]));
  } catch (e) {
    return `THREW_AFTER_WINDOW_PASSED (${e.message.slice(0, 60)})`;
  }
}

// --- scenarios ----------------------------------------------------------------
let pass = 0, fail = 0;
function check(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}  ${detail}`); }
}

console.log('== TEST 1: time floor in canLockCurrentCycle (all quality gates GREEN) ==');
for (const t of [30, 90, 120, 180, 300, 359]) {
  const g = runGate(t);
  check(`elapsed=${t}s -> lock DENIED`, g.allowed === false,
    `allowed=${g.allowed} reasons=${(g.reasons||[]).join('|')}`);
  if (!g.allowed) {
    const hasTimeReason = (g.reasons || []).some((r) => r.includes('OBSERVATION_TIME_INSUFFICIENT'));
    check(`elapsed=${t}s -> denial cites observation time`, hasTimeReason, (g.reasons||[]).join('|'));
  }
}

console.log('== TEST 2: lock permitted inside 360-720 window when quality passes ==');
for (const t of [360, 480, 600]) {
  const g = runGate(t);
  check(`elapsed=${t}s -> lock ALLOWED`, g.allowed === true, `reasons=${(g.reasons||[]).join('|')}`);
}

console.log('== TEST 3: early-qualification cannot bypass the floor ==');
// exceed every EARLY_LOCK criterion massively; still must be denied pre-360
const g3 = runGate(200, { globals: { currentConfidence: 96, currentEdgePct: 8, persistenceSeconds: 300 } });
check('elapsed=200s, max conviction -> still DENIED', g3.allowed === false, (g3.reasons||[]).join('|'));

console.log('== TEST 4: entry window closes late-cycle ==');
for (const t of [721, 780, 850]) {
  const g = runGate(t);
  check(`elapsed=${t}s -> lock DENIED`, g.allowed === false, (g.reasons||[]).join('|'));
}

console.log('== TEST 5: quality gates still enforced inside the window ==');
const g5a = runGate(400, { globals: { currentConfidence: 90 } });
// degrade lock quality below 75
const env5 = makeEnv(400); env5.latestBtc15mPipeline.lockQuality = 60; env5.latestBtc15mPipeline.lockQualityTier = 'SKIP';
const keys5 = Object.keys(env5);
const g5b = new Function(...keys5, `${gateSrc}; return canLockCurrentCycle(64000);`)(...keys5.map(k=>env5[k]));
check('elapsed=400s quality green -> ALLOWED', g5a.allowed === true, (g5a.reasons||[]).join('|'));
check('elapsed=400s lockQuality=60/SKIP -> DENIED', g5b.allowed === false, (g5b.reasons||[]).join('|'));

console.log('== TEST 6: commit-point window check in lock15mCycle (gate stubbed permissive) ==');
for (const t of [90, 200, 359]) {
  const r = await runLockWindowCheck(t);
  check(`lock15mCycle elapsed=${t}s -> refuses (false)`, r === false, `returned=${r}`);
}
for (const t of [720, 800]) {
  const r = await runLockWindowCheck(t);
  check(`lock15mCycle elapsed=${t}s -> refuses (false)`, r === false, `returned=${r}`);
}

console.log('== TEST 7: duplicate lock prevention ==');
const rDup = await (async () => {
  const env = makeEnv(400, { cycle: { isLocked: true, lockCount: 1, lockedAt: new Date().toISOString() } });
  env.canLockCurrentCycle = () => ({ allowed: true, reasons: [] });
  const keys = Object.keys(env);
  const fn = new Function(...keys, `${lockSrc}; return lock15mCycle('BTC-15M-TEST', 64000, null);`);
  return await fn(...keys.map((k) => env[k]));
})();
check('already-locked cycle -> second lock refused', rDup === false, `returned=${rDup}`);

console.log('== TEST 8: cycle-identity mismatch refused ==');
const rMismatch = await (async () => {
  const env = makeEnv(400);
  env.active15mCycle.cycleId = 'BTC-15M-OTHER';
  const keys = Object.keys(env);
  const fn = new Function(...keys, `${lockSrc}; return lock15mCycle('BTC-15M-TEST', 64000, null);`);
  return await fn(...keys.map((k) => env[k]));
})();
check('cycleId mismatch -> refused', rMismatch === false, `returned=${rMismatch}`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
