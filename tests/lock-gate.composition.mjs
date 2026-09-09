// CHARACTERIZATION TESTS -- canLockCurrentCycle gate composition.
//
// Executes the REAL canLockCurrentCycle extracted verbatim from server.ts in
// this repo, with controlled globals injected. No network, no Firestore, no
// reimplementation.
//
// WHY THIS FILE EXISTS
// validationPassed in canLockCurrentCycle has been silently gutted four times
// in this repository's history and reached production undetected every time.
// The failure mode is that a conjunct is quietly dropped: the gate keeps its
// shape, the reasons array still populates, tests that only exercise the happy
// path still pass, and the engine starts locking cycles it should have
// refused. This file pins the gate two independent ways so that dropping a
// conjunct cannot pass silently:
//
//   PART A -- structural. Parses the validationPassed expression out of the
//   source and asserts the exact set of conjuncts. Deleting, renaming or
//   adding one fails here immediately with a diff, even if no behaviour test
//   happens to cover that condition.
//
//   PART B -- behavioural. Drives each condition to its failing value through
//   the real globals and asserts allowed flips to false. This catches a
//   conjunct that is still *present* in the expression but has been rewired to
//   something that is always true (which is how `calibrationComplete` and
//   friends already read today -- see the PINNED-AS-IS notes below).
//
// These tests document CURRENT behaviour, including behaviour that is wrong.
// They are not aspirational. Where the shipped code is doing something
// indefensible it is pinned with a comment saying so, rather than fixed here.
import { serverSrc, extractFn, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('lock-gate.composition');
const gateSrc = extractFn('canLockCurrentCycle', 'function canLockCurrentCycle(livePrice)');

// ---------------------------------------------------------------------------
// PART A -- structural composition of validationPassed
// ---------------------------------------------------------------------------
t.section('PART A: validationPassed conjunct set (structural)');

const vpSrc = sliceBetween(gateSrc, 'const validationPassed = Boolean(', 'const alreadyLocked', 'validationPassed');
const conjuncts = vpSrc
  .slice('const validationPassed = Boolean('.length)
  .replace(/\);\s*$/, '')
  .split('&&')
  .map((s) => s.trim().replace(/,$/, ''))
  .filter(Boolean);

// The exact composition as shipped at the time this test was written.
const EXPECTED_CONJUNCTS = [
  'minimumObservationWindowPassed',
  'withinEntryWindow',
  'dataFresh',
  'cryptoTracking',
  'algorithm',
  'authoritativeState',
  'vixyWebSocket',
  'currentCycle',
  'cycleExpiryFuture',
  'latencyAcceptable',
  'calibrationComplete',
  'analysisComplete',
  'isNotChoppy',
  'signalPersistent',
  'dataQualityPass',
  'lockQualityPass',
  'evidenceAgreementPass',
  'mtfPass',
  'strikeFeasiblePass',
  'reversalThreatPass',
  'evidenceSufficient',
  'rollingStabilityPassed',
  '!active15mCycle.hasConflict',
  '!active15mCycle.signalUnstable',
  'protectionApproved',
  '!crossAssetSevereDivergence',
  'predictionComputedFromCurrentCycle',
];

t.eq('validationPassed has exactly 27 conjuncts', conjuncts.length, EXPECTED_CONJUNCTS.length);
const missing = EXPECTED_CONJUNCTS.filter((c) => !conjuncts.includes(c));
const added = conjuncts.filter((c) => !EXPECTED_CONJUNCTS.includes(c));
t.check('no conjunct removed from validationPassed', missing.length === 0, `MISSING: ${missing.join(', ')}`);
t.check('no unpinned conjunct added to validationPassed', added.length === 0, `ADDED: ${added.join(', ')}`);

// allowed is validationPassed AND not-already-locked. Pinned because a past
// regression made `allowed` ignore the lock ledger entirely.
t.check('allowed = !alreadyLocked && validationPassed',
  /const allowed = !alreadyLocked && validationPassed;/.test(gateSrc));

// PINNED-AS-IS (believed wrong, deliberately not changed here):
// four of the 27 conjuncts are hardcoded true and can never fail, so their
// presence in the expression is decorative. calibrationComplete in particular
// still formats a CALIBRATION_INCOMPLETE reason string referencing
// active15mCycle.calibrationSamples that is now unreachable.
for (const dead of ['algorithm', 'authoritativeState', 'vixyWebSocket', 'calibrationComplete', 'analysisComplete']) {
  const re = new RegExp(`const ${dead} = true;`);
  t.check(`PINNED-AS-IS: ${dead} is hardcoded true (dead conjunct)`, re.test(gateSrc));
}

// ---------------------------------------------------------------------------
// PART B -- behavioural
// ---------------------------------------------------------------------------
const CYCLE_MS = 15 * 60 * 1000;
const EPOCH = Math.floor(Date.now() / CYCLE_MS) * CYCLE_MS;

function makeFakeDate(fakeNowMs) {
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(fakeNowMs); else super(...args); }
    static now() { return fakeNowMs; }
  }
  return FakeDate;
}

// A pipeline with every quality gate green, matching the real field shape read
// by canLockCurrentCycle.
function greenPipeline() {
  return {
    lockQuality: 92,
    lockQualityTier: 'HIGH_CONVICTION',
    evidenceAgreementCount: 9,
    multiTimeframeAlignment: { alignedCount: 4 },
    reversalAssessment: { threatScore: 10, vetoActive: false, primaryTriggers: [] },
    chopAnalytics: { isChopFiltered: false, reason: null },
    dataQuality: { status: 'OPTIMAL', feedFreshnessMs: 500 },
    volatilityExpectedMove: { isStrikeFeasible: true, coverageRatio: 2.1 },
  };
}

function makeEnv(elapsedSec, mutate) {
  const fakeNow = EPOCH + elapsedSec * 1000;
  const env = {
    console: { log() {}, warn() {}, error() {} },
    Date: makeFakeDate(fakeNow), Math, Boolean, Number, String, Set, JSON,
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
    },
    latestBtc15mPipeline: greenPipeline(),
    lastMarketUpdateTs: fakeNow - 1000,
    engineFeedStatus: 'CONNECTED',
    currentConfidence: 90,
    currentEdgePct: 4.0,
    currentModelProbability: 0.8,
    currentDirection: 'UP',
    persistenceSeconds: 30,
    latestGuardianDecision: { action: 'HOLD', reversalThreat: 10 },
    latestCrossAssetContext: { state: 'ALIGNED', riskPenalty: 0, directionalAgreementRatio: 1 },
    lockedCycleIds: new Set(),
  };
  if (mutate) mutate(env);
  return env;
}

function runGate(elapsedSec, mutate) {
  const env = makeEnv(elapsedSec, mutate);
  const keys = Object.keys(env);
  return new Function(...keys, `${gateSrc}; return canLockCurrentCycle(64000);`)(...keys.map((k) => env[k]));
}

t.section('PART B1: baseline -- fully green state locks');
const base = runGate(400);
t.eq('elapsed=400s all-green -> allowed', base.allowed, true);
t.eq('elapsed=400s all-green -> validationPassed', base.validationPassed, true);

t.section('PART B2: each gated condition independently blocks the lock');
// [label, mutation, reason fragment the gate must cite]
const BLOCKERS = [
  ['dataFresh (feed 11s stale)',        (e) => { e.lastMarketUpdateTs -= 11000; }, 'DATA_STALE'],
  ['cryptoTracking (feed disconnected)',(e) => { e.engineFeedStatus = 'DISCONNECTED'; }, 'cryptoTracking=false'],
  ['currentCycle (stale interval)',     (e) => { e.active15mCycle.intervalStart = EPOCH - CYCLE_MS; }, 'currentCycle=false'],
  ['isNotChoppy (cycle choppy)',        (e) => { e.active15mCycle.isChoppy = true; }, 'CHOPPY_MARKET'],
  ['isNotChoppy (pipeline chop filter)',(e) => { e.latestBtc15mPipeline.chopAnalytics.isChopFiltered = true; }, 'CHOPPY_MARKET'],
  ['signalPersistent (5s < 6s)',        (e) => { e.persistenceSeconds = 5; e.active15mCycle.signalPersistence = 5; }, 'LOW_PERSISTENCE'],
  ['dataQualityPass (DEGRADED)',        (e) => { e.latestBtc15mPipeline.dataQuality.status = 'DEGRADED'; }, 'DATA_QUALITY_DEGRADED'],
  ['lockQualityPass (score 74 < 75)',   (e) => { e.latestBtc15mPipeline.lockQuality = 74; }, 'LOCK_QUALITY_INSUFFICIENT'],
  ['lockQualityPass (tier SKIP)',       (e) => { e.latestBtc15mPipeline.lockQualityTier = 'SKIP'; }, 'LOCK_QUALITY_INSUFFICIENT'],
  ['evidenceAgreementPass (5 < 6)',     (e) => { e.latestBtc15mPipeline.evidenceAgreementCount = 5; }, 'EVIDENCE_AGREEMENT_INSUFFICIENT'],
  ['mtfPass (2 < 3)',                   (e) => { e.latestBtc15mPipeline.multiTimeframeAlignment.alignedCount = 2; }, 'MTF_ALIGNMENT_INSUFFICIENT'],
  ['strikeFeasiblePass (infeasible)',   (e) => { e.latestBtc15mPipeline.volatilityExpectedMove.isStrikeFeasible = false; }, 'STRIKE_FEASIBILITY_FAILED'],
  ['reversalThreatPass (threat 30)',    (e) => { e.latestBtc15mPipeline.reversalAssessment.threatScore = 30; }, 'REVERSAL_VETO_ACTIVE'],
  ['reversalThreatPass (veto active)',  (e) => { e.latestBtc15mPipeline.reversalAssessment.vetoActive = true; }, 'REVERSAL_VETO_ACTIVE'],
  ['evidenceSufficient (conf 65 < 66)', (e) => { e.currentConfidence = 65; }, 'INSUFFICIENT_EVIDENCE'],
  ['evidenceSufficient (no edge)',      (e) => { e.currentEdgePct = 1.0; e.currentModelProbability = 0.51; }, 'INSUFFICIENT_EVIDENCE'],
  ['rollingStability (dir disagrees)',  (e) => { e.active15mCycle.recentObservations[2].candidateDir = 'DOWN'; }, 'STABILITY_WINDOW_INSUFFICIENT'],
  ['rollingStability (conf 65 < 65.5)', (e) => { e.active15mCycle.recentObservations[1].conf = 65; }, 'STABILITY_WINDOW_INSUFFICIENT'],
  ['rollingStability (<3 observations)',(e) => { e.active15mCycle.recentObservations = [{ candidateDir: 'UP', conf: 90 }]; }, 'STABILITY_WINDOW_INSUFFICIENT'],
  ['hasConflict',                       (e) => { e.active15mCycle.hasConflict = true; }, 'SIGNAL_CONFLICT'],
  ['signalUnstable',                    (e) => { e.active15mCycle.signalUnstable = true; }, 'SIGNAL_UNSTABLE'],
  ['protectionApproved (guardian EXIT)',(e) => { e.latestGuardianDecision = { action: 'EXIT', reversalThreat: 5 }; }, 'PROTECTION_VETO'],
  ['protectionApproved (threat 30)',    (e) => { e.latestGuardianDecision = { action: 'HOLD', reversalThreat: 30 }; }, 'PROTECTION_VETO'],
  ['crossAssetSevereDivergence',        (e) => { e.latestCrossAssetContext = { state: 'BTC_DIVERGENCE', riskPenalty: 8, directionalAgreementRatio: 0 }; }, 'CROSS_ASSET_SEVERE_DIVERGENCE'],
];

for (const [label, mutate, reasonFragment] of BLOCKERS) {
  const g = runGate(400, mutate);
  const reasons = (g.reasons || []).join('|');
  t.check(`${label} -> DENIED`, g.allowed === false, `allowed=${g.allowed} reasons=${reasons}`);
  t.check(`${label} -> cites ${reasonFragment}`, reasons.includes(reasonFragment), `reasons=${reasons}`);
}

t.section('PART B3: alreadyLocked blocks even with validationPassed true');
const gLocked = runGate(400, (e) => { e.active15mCycle.isLocked = true; });
t.eq('isLocked=true -> allowed', gLocked.allowed, false);
t.eq('isLocked=true -> validationPassed still true', gLocked.validationPassed, true);
const gLedger = runGate(400, (e) => { e.lockedCycleIds = new Set(['BTC-15M-TEST']); });
t.eq('cycleId in lockedCycleIds -> allowed', gLedger.allowed, false);

t.section('PART B4: observation floor and entry window (effElapsed)');
// HARD 360s floor: no conviction level shortens it. The 90s early-lock bypass
// is the defect that published signals ~1 minute into a cycle.
for (const s of [0, 90, 200, 359]) {
  const g = runGate(s);
  t.eq(`effElapsed=${s}s -> DENIED (below 360s floor)`, g.allowed, false);
  t.check(`effElapsed=${s}s -> cites OBSERVATION_TIME_INSUFFICIENT`,
    (g.reasons || []).some((r) => r.includes('OBSERVATION_TIME_INSUFFICIENT')));
}
// max conviction still cannot bypass the floor
const gEarly = runGate(200, (e) => { e.currentConfidence = 99; e.currentEdgePct = 9; e.persistenceSeconds = 300; });
t.eq('effElapsed=200s at max conviction -> still DENIED', gEarly.allowed, false);

for (const s of [360, 480, 600, 719]) {
  t.eq(`effElapsed=${s}s -> ALLOWED`, runGate(s).allowed, true);
}
for (const s of [720, 780, 850]) {
  const g = runGate(s);
  t.eq(`effElapsed=${s}s -> DENIED (entry window closed)`, g.allowed, false);
  t.check(`effElapsed=${s}s -> cites ENTRY_WINDOW_EXPIRED`,
    (g.reasons || []).some((r) => r.includes('ENTRY_WINDOW_EXPIRED')));
}

t.section('PART B5: effElapsed prefers cycleObservationDuration over wall clock');
// effElapsed = max(elapsedSeconds, cycleObservationDuration). A cycle whose
// wall clock says 100s but which carries an observation duration of 400s is
// treated as 400s elapsed. Pinned because it is the only way the gate can pass
// its floor without the wall clock agreeing.
const gObs = runGate(100, (e) => { e.active15mCycle.cycleObservationDuration = 400; });
t.eq('elapsed=100s but cycleObservationDuration=400 -> ALLOWED', gObs.allowed, true);

t.section('PART B6: lockEligibility side effect');
// canLockCurrentCycle MUTATES active15mCycle.lockEligibility as a side effect.
// Pinned because callers read it and a refactor to a pure function would
// silently strip the field the UI renders.
const envSide = makeEnv(400);
const keysSide = Object.keys(envSide);
new Function(...keysSide, `${gateSrc}; return canLockCurrentCycle(64000);`)(...keysSide.map((k) => envSide[k]));
t.check('gate writes active15mCycle.lockEligibility', !!envSide.active15mCycle.lockEligibility);
t.eq('lockEligibility.minimumElapsedSeconds', envSide.active15mCycle.lockEligibility?.minimumElapsedSeconds, 360);
t.eq('lockEligibility.preferredWindow at 400s', envSide.active15mCycle.lockEligibility?.preferredWindow, true);
t.eq('lockEligibility.reason when green', envSide.active15mCycle.lockEligibility?.reason, 'QUALIFIED_ENTRY_WINDOW');

t.done();
