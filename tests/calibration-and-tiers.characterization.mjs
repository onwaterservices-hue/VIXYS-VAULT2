// CHARACTERIZATION TESTS -- confidence bucketing and lock-tier selection.
//
// Executes the REAL bucketing logic sliced out of the
// /api/signal/confidence-buckets handler in server.ts, and the REAL lock-tier
// boundaries and policy table from
// src/services/intelligence/continuousIntelligenceEngine.ts.
//
// NOTE ON THE BRIEF THAT COMMISSIONED THIS FILE
// The task brief asked for tests covering "getCalibratedConfidence bucketing
// and its INSUFFICIENT_SAMPLE boundary at n<15", and lock tiers of
// "EARLY <480s, STANDARD 480-660s, LATE >=660s" with lock thresholds of
// "85 EARLY / 75 STANDARD / 68 LATE". None of that matches this repository:
//
//   * There is no getCalibratedConfidence function and no INSUFFICIENT_SAMPLE
//     constant anywhere in the tree. The real low-sample marker is a boolean
//     field `insufficientEvidence` on each bucket, and its boundary is n < 5.
//   * The real tier boundaries are EARLY 120-300s, STANDARD 300-480s,
//     LATE 480-840s, with minLockScore 90 / 82 / 74.
//   * Those tiers live in the CLIENT engine and are not what gates a
//     production lock. The server's own gate (canLockCurrentCycle) uses a flat
//     360-720s window and a flat lockQuality >= 75, and the server reports
//     lockTier as only 'STANDARD' or 'NONE' -- it never emits EARLY or LATE.
//
// The values below are what the code actually does. See OVERNIGHT_PROGRESS.md.
import { serverSrc, readRepoFile, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('calibration-and-tiers.characterization');

// ---------------------------------------------------------------------------
// PART A -- confidence bucketing (/api/signal/confidence-buckets)
// ---------------------------------------------------------------------------
const bucketSrc = sliceBetween(
  serverSrc,
  'const bucketRanges = [',
  'const totalPredictions = settled.length;',
  'confidence buckets',
);

function bucketize(settledLogs) {
  const fn = new Function('settled', 'Math', `${bucketSrc}; return buckets;`);
  return fn(settledLogs, Math);
}
const log = (confidence, wasCorrect, extra = {}) => ({ confidence, wasCorrect, status: 'RESOLVED', ...extra });
const byName = (bs, name) => bs.find((b) => b.bucket === name);

t.section('PART A1: bucket ranges as shipped');
const empty = bucketize([]);
t.eq('there are 10 buckets', empty.length, 10);
t.eq('bucket names', empty.map((b) => b.bucket).join(' '),
  '50-55% 55-60% 60-65% 65-70% 70-75% 75-80% 80-85% 85-90% 90-95% 95%+');

t.section('PART A2: bucket edges are [min, max) -- lower-inclusive, upper-exclusive');
t.eq('conf=70 lands in 70-75%', byName(bucketize([log(70, true)]), '70-75%').predictions, 1);
t.eq('conf=70 does NOT land in 65-70%', byName(bucketize([log(70, true)]), '65-70%').predictions, 0);
t.eq('conf=74.9 lands in 70-75%', byName(bucketize([log(74.9, true)]), '70-75%').predictions, 1);
t.eq('conf=75 lands in 75-80%', byName(bucketize([log(75, true)]), '75-80%').predictions, 1);
// The top bucket is the only closed one: max 100 is special-cased to < 101.
t.eq('conf=95 lands in 95%+', byName(bucketize([log(95, true)]), '95%+').predictions, 1);
t.eq('conf=100 lands in 95%+ (top bucket closes at 101)', byName(bucketize([log(100, true)]), '95%+').predictions, 1);
// PINNED-AS-IS: confidence below 50 is silently dropped -- it belongs to no
// bucket, so the per-bucket counts do not sum to totalSettledCycles.
t.eq('PINNED-AS-IS: conf=49 falls into NO bucket',
  bucketize([log(49, true)]).reduce((a, b) => a + b.predictions, 0), 0);

t.section('PART A3: confidence resolution order (confidence -> probability -> 75)');
// `s.confidence || (s.probability ? round(probability*100) : 75)`
t.eq('probability used when confidence absent',
  byName(bucketize([{ status: 'RESOLVED', probability: 0.82, wasCorrect: true }]), '80-85%').predictions, 1);
// PINNED-AS-IS: `||` not `??`, so a genuine confidence of 0 falls through to
// probability, and a log with NEITHER is silently assigned 75 -- a fabricated
// value landing in the 75-80% bucket. This is the exact defect class CLAUDE.md
// names: an unknown rendered as a plausible number.
t.eq('PINNED-AS-IS: log with neither confidence nor probability is bucketed as 75',
  byName(bucketize([{ status: 'RESOLVED', wasCorrect: true }]), '75-80%').predictions, 1);
t.eq('PINNED-AS-IS: confidence=0 falls through to the 75 default',
  byName(bucketize([{ status: 'RESOLVED', confidence: 0, wasCorrect: true }]), '75-80%').predictions, 1);

t.section('PART A4: per-bucket arithmetic');
const mixed = bucketize([log(81, true), log(82, true), log(83, false), log(84, false), log(80, false)]);
const b8085 = byName(mixed, '80-85%');
t.eq('predictions', b8085.predictions, 5);
t.eq('wins', b8085.wins, 2);
t.eq('losses', b8085.losses, 3);
t.eq('empiricalAccuracyPct = 2/5 -> 40', b8085.empiricalAccuracyPct, 40);
t.eq('avgPredictedConfidencePct = 410/5 -> 82', b8085.avgPredictedConfidencePct, 82);
t.eq('calibrationErrorPct = |82 - 40| -> 42', b8085.calibrationErrorPct, 42);
t.eq('sampleSize mirrors predictions', b8085.sampleSize, 5);

t.section('PART A5: the low-sample marker is insufficientEvidence at n < 5');
// NOT "INSUFFICIENT_SAMPLE at n < 15" -- that does not exist in this repo.
t.check('no INSUFFICIENT_SAMPLE identifier exists in server.ts', !serverSrc.includes('INSUFFICIENT_SAMPLE'));
for (const n of [0, 1, 4]) {
  const bs = bucketize(Array.from({ length: n }, () => log(82, true)));
  t.eq(`n=${n} -> insufficientEvidence true`, byName(bs, '80-85%').insufficientEvidence, true);
}
for (const n of [5, 6, 15]) {
  const bs = bucketize(Array.from({ length: n }, () => log(82, true)));
  t.eq(`n=${n} -> insufficientEvidence false`, byName(bs, '80-85%').insufficientEvidence, false);
}
// PINNED-AS-IS: an empty bucket reports 0% accuracy rather than null, so "no
// data" and "lost every time" render identically. insufficientEvidence is the
// ONLY thing distinguishing them.
t.eq('PINNED-AS-IS: empty bucket reports empiricalAccuracyPct 0, not null',
  byName(empty, '80-85%').empiricalAccuracyPct, 0);
t.eq('PINNED-AS-IS: empty bucket reports avgPredictedConfidence as the range midpoint',
  byName(empty, '80-85%').avgPredictedConfidencePct, 82.5);

// ---------------------------------------------------------------------------
// PART B -- lock-tier selection by observation seconds (client engine)
// ---------------------------------------------------------------------------
const engineSrc = readRepoFile('src/services/intelligence/continuousIntelligenceEngine.ts');

t.section('PART B1: LOCK_POLICIES thresholds as shipped');
const policiesSrc = sliceBetween(engineSrc, 'export const LOCK_POLICIES', 'export type SkipReasonCode', 'LOCK_POLICIES');
const LOCK_POLICIES = new Function(
  `${policiesSrc.replace('export const LOCK_POLICIES: Record<LockTier, LockPolicyTierConfig> =', 'const LOCK_POLICIES =').replace(/;\s*$/, '')}; return LOCK_POLICIES;`,
)();

const EXPECTED_POLICIES = {
  EARLY:    { minObservationSeconds: 120, maxObservationSeconds: 300, minLockScore: 90, minConviction: 88, maxReversalRisk: 10 },
  STANDARD: { minObservationSeconds: 300, maxObservationSeconds: 480, minLockScore: 82, minConviction: 80, maxReversalRisk: 20 },
  LATE:     { minObservationSeconds: 480, maxObservationSeconds: 840, minLockScore: 74, minConviction: 72, maxReversalRisk: 30 },
  NONE:     { minObservationSeconds: 0,   maxObservationSeconds: 900, minLockScore: 100, minConviction: 100, maxReversalRisk: 0 },
};
for (const [tier, expected] of Object.entries(EXPECTED_POLICIES)) {
  for (const [field, value] of Object.entries(expected)) {
    t.eq(`${tier}.${field}`, LOCK_POLICIES[tier][field], value);
  }
}

t.section('PART B2: tier selection by observationSeconds');
const tierSrc = sliceBetween(engineSrc, "  let activeTier: LockTier = 'NONE';", '  const policy = LOCK_POLICIES[targetTier];', 'tier selection');
function selectTier(observationSeconds) {
  const js = tierSrc.replace(/: LockTier/g, '');
  return new Function('observationSeconds', `${js}; return { activeTier, targetTier };`)(observationSeconds);
}
const TIER_CASES = [
  [0,   'NONE',     'EARLY'],
  [119, 'NONE',     'EARLY'],
  [120, 'EARLY',    'EARLY'],
  [299, 'EARLY',    'EARLY'],
  [300, 'STANDARD', 'STANDARD'],
  [479, 'STANDARD', 'STANDARD'],
  [480, 'LATE',     'LATE'],
  [840, 'LATE',     'LATE'],
  [841, 'NONE',     'LATE'],
  [899, 'NONE',     'LATE'],
];
for (const [secs, activeTier, targetTier] of TIER_CASES) {
  const r = selectTier(secs);
  t.eq(`observationSeconds=${secs} -> activeTier ${activeTier}`, r.activeTier, activeTier);
  t.eq(`observationSeconds=${secs} -> targetTier ${targetTier}`, r.targetTier, targetTier);
}
// PINNED-AS-IS: targetTier never resolves to NONE, so the NONE policy's
// deliberately unreachable thresholds (minLockScore 100) are never applied.
// Below 120s the EARLY policy is used, and past 840s the LATE policy is used --
// i.e. the LOOSEST policy governs the end of the cycle.
t.eq('PINNED-AS-IS: past the LATE window, policy falls back to LATE not NONE', selectTier(880).targetTier, 'LATE');
t.eq('PINNED-AS-IS: before the EARLY window, policy is already EARLY', selectTier(10).targetTier, 'EARLY');
t.check('PINNED-AS-IS: targetTier is never NONE at any second of the cycle',
  Array.from({ length: 901 }, (_, s) => selectTier(s).targetTier).every((x) => x !== 'NONE'));

t.section('PART B3: the SERVER never emits EARLY or LATE');
// The production lock path reports lockTier from this expression only.
t.check('server lockTier is a binary SKIP->NONE / else STANDARD mapping',
  serverSrc.includes('latestBtc15mPipeline?.lockQualityTier === "SKIP" ? "NONE" : "STANDARD"'));
t.check('server.ts contains no EARLY lock tier literal', !/lockTier\w*\s*[=:]\s*"EARLY"/.test(serverSrc));

t.done();
