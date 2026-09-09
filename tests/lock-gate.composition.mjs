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
import { serverSrc, extractFn, sliceBetween, createHarness, buildStrikeSideHelper, readRepoFile } from './_engineSource.mjs';

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
// ea05da9 on main: a cold instance that has not yet received a live strike may
// not lock, whatever the other conditions say.
// Layer 5 (strike-side rule) adds a fourth term that can only DENY, and only
// when VIXY_LOCK_RULE=strike_side. With the flag off it is always false.
t.check('allowed = !alreadyLocked && validationPassed && strike15mResolved && !strikeRuleBlocks',
  /const allowed = !alreadyLocked && validationPassed && strike15mResolved && !strikeRuleBlocks;/.test(gateSrc));
t.check('strikeRuleBlocks is only ever set inside the flag check',
  (gateSrc.match(/strikeRuleBlocks = true/g) || []).length === 3 && /if \(VIXY_LOCK_RULE === "strike_side"\)/.test(gateSrc));
t.check('STRIKE_UNRESOLVED reason is emitted when the strike is unresolved',
  gateSrc.includes('reasons.push("STRIKE_UNRESOLVED'));

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
    // ea05da9 on main: a cold instance with no live strike may not lock.
    strike15mResolved: true,
    // Layer 5 inputs. Flag OFF by default so every case above pins the
    // unchanged behaviour; the flag-on section below overrides these.
    VIXY_LOCK_RULE: 'off',
    VIXY_LOCK_RULE_BAR: 0.95,
    current15mStrikePrice: 64000,
    computeStrikeSideProbability: buildStrikeSideHelper('off', 0.95),
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
// Same, but returns the env so the lockEligibility side effect can be read.
function runGateEnv(elapsedSec, mutate) {
  const env = makeEnv(elapsedSec, mutate);
  const keys = Object.keys(env);
  new Function(...keys, `${gateSrc}; return canLockCurrentCycle(64000);`)(...keys.map((k) => env[k]));
  return env;
}

t.section('PART B1: baseline -- fully green state locks');
// 500s sits in the STANDARD tier of the adaptive schedule (2deba55), whose
// thresholds (75 / 6 / 3) the blocker list below is written against.
const base = runGate(500);
t.eq('elapsed=500s all-green -> allowed', base.allowed, true);
t.eq('elapsed=500s all-green -> validationPassed', base.validationPassed, true);

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
  const g = runGate(500, mutate);
  const reasons = (g.reasons || []).join('|');
  t.check(`${label} -> DENIED`, g.allowed === false, `allowed=${g.allowed} reasons=${reasons}`);
  t.check(`${label} -> cites ${reasonFragment}`, reasons.includes(reasonFragment), `reasons=${reasons}`);
}

t.section('PART B3: alreadyLocked blocks even with validationPassed true');
const gLocked = runGate(500, (e) => { e.active15mCycle.isLocked = true; });
t.eq('isLocked=true -> allowed', gLocked.allowed, false);
t.eq('isLocked=true -> validationPassed still true', gLocked.validationPassed, true);
const gLedger = runGate(500, (e) => { e.lockedCycleIds = new Set(['BTC-15M-TEST']); });
t.eq('cycleId in lockedCycleIds -> allowed', gLedger.allowed, false);
const gStrike = runGate(500, (e) => { e.strike15mResolved = false; });
t.eq('strike unresolved -> allowed', gStrike.allowed, false);
t.eq('strike unresolved -> validationPassed still true (it is a separate term)', gStrike.validationPassed, true);
t.check('strike unresolved -> cites STRIKE_UNRESOLVED', (gStrike.reasons || []).some((r) => r.includes('STRIKE_UNRESOLVED')));

t.section('PART B3b: adaptive lock schedule (2deba55) -- thresholds by tier');
// EARLY <480s: 85 / 8 / 4     STANDARD 480-659s: 75 / 6 / 3     LATE >=660s: 68 / 5 / 3
const TIERS = [
  ['EARLY',    400, 85, 8, 4],
  ['STANDARD', 500, 75, 6, 3],
  ['LATE',     700, 68, 5, 3],
];
for (const [tier, secs, minLQ, minAgree, minMtf] of TIERS) {
  const lq = (v) => runGate(secs, (e) => { e.latestBtc15mPipeline.lockQuality = v; });
  t.eq(`${tier}@${secs}s lockQuality=${minLQ - 1} -> DENIED`, lq(minLQ - 1).allowed, false);
  t.eq(`${tier}@${secs}s lockQuality=${minLQ} -> ALLOWED`, lq(minLQ).allowed, true);
  const ag = (v) => runGate(secs, (e) => { e.latestBtc15mPipeline.evidenceAgreementCount = v; });
  t.eq(`${tier}@${secs}s agreement=${minAgree - 1} -> DENIED`, ag(minAgree - 1).allowed, false);
  t.eq(`${tier}@${secs}s agreement=${minAgree} -> ALLOWED`, ag(minAgree).allowed, true);
  const mt = (v) => runGate(secs, (e) => { e.latestBtc15mPipeline.multiTimeframeAlignment.alignedCount = v; });
  t.eq(`${tier}@${secs}s mtf=${minMtf - 1} -> DENIED`, mt(minMtf - 1).allowed, false);
  t.eq(`${tier}@${secs}s mtf=${minMtf} -> ALLOWED`, mt(minMtf).allowed, true);
  const g = runGate(secs);
  t.eq(`${tier}@${secs}s lockEligibility.lockTier`, g && runGateEnv(secs).active15mCycle.lockEligibility.lockTier, tier);
  t.eq(`${tier}@${secs}s lockEligibility.minLockQuality`, runGateEnv(secs).active15mCycle.lockEligibility.minLockQuality, minLQ);
}
// Boundaries: 479 is EARLY (needs 85), 480 is STANDARD (needs 75); 659 STANDARD, 660 LATE (needs 68).
t.eq('lockQuality=84 @479s (EARLY) -> DENIED', runGate(479, (e) => { e.latestBtc15mPipeline.lockQuality = 84; }).allowed, false);
t.eq('lockQuality=84 @480s (STANDARD) -> ALLOWED', runGate(480, (e) => { e.latestBtc15mPipeline.lockQuality = 84; }).allowed, true);
t.eq('lockQuality=74 @659s (STANDARD) -> DENIED', runGate(659, (e) => { e.latestBtc15mPipeline.lockQuality = 74; }).allowed, false);
t.eq('lockQuality=74 @660s (LATE) -> ALLOWED', runGate(660, (e) => { e.latestBtc15mPipeline.lockQuality = 74; }).allowed, true);
// PINNED-AS-IS: the bar FALLS as the cycle ages. 2deba55's rationale is that
// "evidence about where price sits relative to [the frozen strike] strengthens
// as the cycle runs". scripts/replay15m.ts measures post-lock directional
// accuracy at 50.0% -- the engine is naming the side price already sits on.
// Lowering the bar late leans further into that, not away from it.
t.check('PINNED-AS-IS: LATE bar (68) < STANDARD (75) < EARLY (85)', 68 < 75 && 75 < 85);

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
for (const s of [780, 850]) {
  const g = runGate(s);
  t.eq(`effElapsed=${s}s -> DENIED (entry window closed)`, g.allowed, false);
  t.check(`effElapsed=${s}s -> cites ENTRY_WINDOW_EXPIRED`,
    (g.reasons || []).some((r) => r.includes('ENTRY_WINDOW_EXPIRED')));
}

t.section('ALIGNED-780: gate window, reason check and commit point agree (was REGRESSION-2deba55)');
// 2deba55 moved withinEntryWindow to `effElapsed < 780` but left the reason
// check at `effElapsed >= 720`, and left lock15mCycle's commit point refusing
// `>= 720`. So for one minute of every cycle:
//   - canLockCurrentCycle returns allowed=true
//   - while pushing "ENTRY_WINDOW_EXPIRED (elapsed=Ns >= 780s ...)" -- false on
//     its face for N in 720..779 -- and lockEligibility reads eligible=true with
//     an EXPIRED reason
//   - and lock15mCycle refuses the lock anyway (see tests/lock-gate.invariants
//     TEST 6), logging [VIXY_LOCK_WINDOW_REJECTED] every 3s.
// This is the exact contradiction the comment above the window check says was
// previously fixed by aligning both to 720. These checks pin the CURRENT
// behaviour so the suite stays green on main, and are written so that fixing
// the regression makes them FAIL -- forcing the fix to be acknowledged here
// rather than passing silently. Gate logic is deliberately not changed on this
// branch.
// 720-779s is now a legal, consistent part of the entry window: allowed, no
// EXPIRED reason, eligibility reason clean. lock15mCycle's commit point agrees
// (tests/lock-gate.invariants.mjs TEST 6).
for (const s of [720, 750, 779]) {
  const g = runGate(s);
  t.eq(`ALIGNED effElapsed=${s}s -> gate allowed=true`, g.allowed, true);
  t.check(`ALIGNED effElapsed=${s}s -> no ENTRY_WINDOW_EXPIRED reason`,
    !(g.reasons || []).some((r) => r.includes('ENTRY_WINDOW_EXPIRED')), (g.reasons || []).join('|'));
  const env = runGateEnv(s);
  t.eq(`ALIGNED effElapsed=${s}s -> lockEligibility.reason clean`, env.active15mCycle.lockEligibility.reason, 'QUALIFIED_ENTRY_WINDOW');
}
t.check('ALIGNED: withinEntryWindow, reason check and remaining floor all use 780 / 120',
  /effElapsed < 780 && effRemaining >= 120/.test(gateSrc) && /if \(effElapsed >= 780 \|\| effRemaining < 120\)/.test(gateSrc));

t.section('PART B5: effElapsed prefers cycleObservationDuration over wall clock');
// effElapsed = max(elapsedSeconds, cycleObservationDuration). A cycle whose
// wall clock says 100s but which carries an observation duration of 400s is
// treated as 400s elapsed. Pinned because it is the only way the gate can pass
// its floor without the wall clock agreeing.
const gObs = runGate(100, (e) => { e.active15mCycle.cycleObservationDuration = 400; });
t.eq('elapsed=100s but cycleObservationDuration=400 -> ALLOWED', gObs.allowed, true);

t.section('PART B7: Layer 5 strike-side rule -- OFF changes nothing, ON can only deny');
const table = JSON.parse(readRepoFile('src/data/strikeSideTable.v1.json'));
// Pick real cells from the table: one at 720s with p >= 0.95 (any vol bin) and
// one at 360s with p < 0.95. The env then reproduces that cell's inputs.
const cellsAt = (cp) => Object.entries(table.cells).filter(([k, c]) => k.startsWith(`${cp}|`) && c.p !== null);
const hi = cellsAt(720).find(([, c]) => c.p >= 0.95), lo = cellsAt(360).find(([, c]) => c.p < 0.95);
t.check('table has a >=0.95 cell at 720s and a <0.95 cell at 360s', Boolean(hi && lo), JSON.stringify({ hi, lo }));
const binMid = (i) => { const [a, b] = table.distBinsBps[i]; return (a + (b ?? a + 20)) / 2; };
const rangeFor = (v) => (v === 'L' ? table.volTercilesBps.L_below / 2 : v === 'M' ? (table.volTercilesBps.L_below + table.volTercilesBps.H_atOrAbove) / 2 : table.volTercilesBps.H_atOrAbove * 2);
const withRule = (cellKey, dir, rule, bar = 0.95) => (e) => {
  const [, binStr, vol] = cellKey.split('|'); const bps = binMid(Number(binStr)); const range = rangeFor(vol);
  e.VIXY_LOCK_RULE = rule; e.VIXY_LOCK_RULE_BAR = bar;
  e.computeStrikeSideProbability = buildStrikeSideHelper(rule, bar);
  e.current15mStrikePrice = 64000;
  const spot = 64000 * (1 + bps / 1e4);
  e.active15mCycle.cycleLow = 64000; e.active15mCycle.cycleHigh = Math.max(spot, 64000 * (1 + range / 1e4));
  e.currentDirection = dir;
  e.active15mCycle.recentObservations = e.active15mCycle.recentObservations.map((o) => ({ ...o, candidateDir: dir }));
  e.__spot = spot;
};
function runGateSpot(secs, mutate) {
  const env = makeEnv(secs, mutate); const spot = env.__spot; delete env.__spot;
  const keys = Object.keys(env);
  const g = new Function(...keys, `${gateSrc}; return canLockCurrentCycle(${spot});`)(...keys.map((k) => env[k]));
  return { g, env };
}
if (hi && lo) {
  const off = runGateSpot(360, withRule(lo[0], 'UP', 'off'));
  t.eq('flag OFF: lock ALLOWED even where p < bar', off.g.allowed, true);
  t.check('flag OFF: strikeSide is still OBSERVED on lockEligibility', typeof off.env.active15mCycle.lockEligibility.strikeSide?.p === 'number');
  t.eq('flag OFF: lockRule reported as off', off.env.active15mCycle.lockEligibility.lockRule, 'off');
  const below = runGateSpot(360, withRule(lo[0], 'UP', 'strike_side'));
  t.eq('flag ON: p < bar -> DENIED', below.g.allowed, false);
  t.check('flag ON: cites STRIKE_SIDE_BELOW_BAR with the cell key', (below.g.reasons || []).some((r) => r.includes('STRIKE_SIDE_BELOW_BAR') && r.includes(lo[0])), (below.g.reasons || []).join('|'));
  const okRun = runGateSpot(720, withRule(hi[0], 'UP', 'strike_side'));
  t.eq('flag ON: p >= bar and engine on the current side -> ALLOWED', okRun.g.allowed, true);
  t.eq('flag ON: observation carries the cell used', okRun.env.active15mCycle.lockEligibility.strikeSide.key, hi[0]);
  const dis = runGateSpot(720, withRule(hi[0], 'DOWN', 'strike_side'));
  t.eq('flag ON: engine against the current side -> DENIED', dis.g.allowed, false);
  t.check('flag ON: cites STRIKE_SIDE_DISAGREES', (dis.g.reasons || []).some((r) => r.includes('STRIKE_SIDE_DISAGREES')));
  const unk = runGateSpot(720, (e) => { withRule(hi[0], 'UP', 'strike_side')(e); e.active15mCycle.cycleHigh = 0; e.active15mCycle.cycleLow = 0; });
  t.eq('flag ON: p unknown -> DENIED (fail closed)', unk.g.allowed, false);
  t.check('flag ON: cites STRIKE_SIDE_UNKNOWN (NO_CYCLE_RANGE)', (unk.g.reasons || []).some((r) => r.includes('STRIKE_SIDE_UNKNOWN') && r.includes('NO_CYCLE_RANGE')));
  const still = runGateSpot(720, (e) => { withRule(hi[0], 'UP', 'strike_side')(e); e.latestBtc15mPipeline.lockQuality = 10; });
  t.eq('flag ON never loosens other gates (lockQuality=10 still DENIED)', still.g.allowed, false);
  // Post-lock observation: once locked, the payload carries the LOCKED side's p
  // and a PROTECT signal; price on the locked side -> p; crossed -> 1-p.
  const lockedSame = runGateSpot(720, (e) => { withRule(hi[0], 'UP', 'off')(e); e.active15mCycle.isLocked = true; e.active15mCycle.lockedDirection = 'UP'; });
  const ss1 = lockedSame.env.active15mCycle.lockEligibility.strikeSide;
  t.eq('locked UP, price above strike -> pLockedSide == p', ss1.pLockedSide, ss1.p);
  t.eq('locked UP, price above strike -> protectSignal false', ss1.protectSignal, false);
  const lockedCrossed = runGateSpot(720, (e) => { withRule(hi[0], 'UP', 'off')(e); e.active15mCycle.isLocked = true; e.active15mCycle.lockedDirection = 'DOWN'; });
  const ss2 = lockedCrossed.env.active15mCycle.lockEligibility.strikeSide;
  t.check('locked DOWN, price above strike -> pLockedSide == 1-p', Math.abs(ss2.pLockedSide - (1 - ss2.p)) < 0.002, `p=${ss2.p} pLocked=${ss2.pLockedSide}`);
  t.eq('locked DOWN, price above strike (p>=0.95) -> protectSignal true', ss2.protectSignal, true);
  const notLocked = runGateSpot(720, withRule(hi[0], 'UP', 'off'));
  t.eq('not locked -> pLockedSide null', notLocked.env.active15mCycle.lockEligibility.strikeSide.pLockedSide, null);
}

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
t.eq('lockEligibility.lockTier at 400s', envSide.active15mCycle.lockEligibility?.lockTier, 'EARLY');
t.eq('lockEligibility.minLockQuality at 400s', envSide.active15mCycle.lockEligibility?.minLockQuality, 85);
t.eq('lockEligibility.strikeResolved mirrors the global', envSide.active15mCycle.lockEligibility?.strikeResolved, true);
t.eq('lockEligibility.reason when green', envSide.active15mCycle.lockEligibility?.reason, 'QUALIFIED_ENTRY_WINDOW');

t.done();
