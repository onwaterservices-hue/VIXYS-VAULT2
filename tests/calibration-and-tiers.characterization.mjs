// CHARACTERIZATION TESTS -- confidence bucketing and lock-tier selection.
//
// Executes the REAL bucketing logic sliced out of the
// /api/signal/confidence-buckets handler in server.ts, and the REAL lock-tier
// boundaries and policy table from
// src/services/intelligence/continuousIntelligenceEngine.ts.
//
// NOTE ON THE BRIEF THAT COMMISSIONED THIS FILE -- CORRECTION
// The brief described getCalibratedConfidence with INSUFFICIENT_SAMPLE at
// n<15, and server lock tiers EARLY <480s / STANDARD 480-660s / LATE >=660s
// with bars 85 / 75 / 68. An earlier version of this file said none of that
// existed. It did -- on main at 7eea881 (commits 7eea881 and 2deba55). This
// branch had been cut from 3e31a84 and had not fetched. The brief was right;
// the earlier note was reading a stale base. After merging main, this file
// pins the real functions.
//
// Two different tier systems coexist and must not be confused:
//   * SERVER gate tiers (canLockCurrentCycle, 2deba55): by effElapsed --
//     EARLY <480s (85/8/4), STANDARD 480-659s (75/6/3), LATE >=660s (68/5/3).
//     These are what actually gate a production lock.
//   * CLIENT engine tiers (continuousIntelligenceEngine.ts LOCK_POLICIES): by
//     observationSeconds -- EARLY 120-300s, STANDARD 300-480s, LATE 480-840s,
//     minLockScore 90/82/74. Not wired into the live decision.
// The canonical payload's top-level `lockTier` is STILL a legacy binary
// (SKIP -> NONE, else STANDARD); the real applied bar is exposed as `lockGate`.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { serverSrc, readRepoFile, sliceBetween, extractFn, createHarness, ROOT } from './_engineSource.mjs';
import { transformSync } from 'esbuild';
// getCalibratedConfidence carries TS annotations; transpile types away only.
const stripTypes = (src) => transformSync(src, { loader: 'ts', format: 'cjs' }).code;

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

// The bucket code reads confidence through the real top-level helper.
const calibrationConfidenceOf = new Function(`${extractFn('calibrationConfidenceOf', 'function calibrationConfidenceOf(')}; return calibrationConfidenceOf;`)();
function bucketize(settledLogs) {
  const fn = new Function('settled', 'Math', 'calibrationConfidenceOf', `${bucketSrc}; return buckets;`);
  return fn(settledLogs, Math, calibrationConfidenceOf);
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

t.section('PART A3: confidence resolution order (confidence -> probability -> none)');
t.eq('probability used when confidence absent',
  byName(bucketize([{ status: 'RESOLVED', probability: 0.82, wasCorrect: true }]), '80-85%').predictions, 1);
// FIXED (was PINNED-AS-IS): a log with NEITHER confidence nor probability used to
// be silently assigned 75 -- "an unknown rendered as a plausible number". It now
// lands in no bucket.
t.eq('log with neither confidence nor probability lands in NO bucket',
  bucketize([{ status: 'RESOLVED', wasCorrect: true }]).reduce((a, b) => a + b.predictions, 0), 0);
t.eq('confidence=0 with no probability lands in NO bucket (no 75 default)',
  bucketize([{ status: 'RESOLVED', confidence: 0, wasCorrect: true }]).reduce((a, b) => a + b.predictions, 0), 0);
t.eq('confidence=0 falls through to a real probability',
  byName(bucketize([{ status: 'RESOLVED', confidence: 0, probability: 0.71, wasCorrect: true }]), '70-75%').predictions, 1);

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

t.section('PART A5: the bucket endpoint low-sample marker is insufficientEvidence at n < 5');
for (const n of [0, 1, 4]) {
  const bs = bucketize(Array.from({ length: n }, () => log(82, true)));
  t.eq(`n=${n} -> insufficientEvidence true`, byName(bs, '80-85%').insufficientEvidence, true);
}
for (const n of [5, 6, 15]) {
  const bs = bucketize(Array.from({ length: n }, () => log(82, true)));
  t.eq(`n=${n} -> insufficientEvidence false`, byName(bs, '80-85%').insufficientEvidence, false);
}
// FIXED (was PINNED-AS-IS): an empty bucket reported 0% accuracy and the range
// midpoint as "predicted", so "no data" rendered as "lost every time".
t.eq('empty bucket reports empiricalAccuracyPct null', byName(empty, '80-85%').empiricalAccuracyPct, null);
t.eq('empty bucket reports avgPredictedConfidencePct null', byName(empty, '80-85%').avgPredictedConfidencePct, null);
t.eq('empty bucket reports calibrationErrorPct null', byName(empty, '80-85%').calibrationErrorPct, null);

// ---------------------------------------------------------------------------
// PART A6 -- getCalibratedConfidence (7eea881): INSUFFICIENT_SAMPLE at n < 15
// ---------------------------------------------------------------------------
t.section('PART A6: getCalibratedConfidence maps raw confidence onto its bucket win rate');
const calibSrc = sliceBetween(serverSrc, 'const CALIBRATION_MIN_BUCKET_SAMPLES = 15;', 'app.get("/api/signal/calibrated-confidence"', 'getCalibratedConfidence');
function makeCalib(settledLogs) {
  const js = stripTypes(calibSrc);
  return new Function('persistentSignalLogs', 'Math', 'Number', '__name', 'calibrationConfidenceOf', `${js}; return getCalibratedConfidence;`)(settledLogs, Math, Number, (f) => f, calibrationConfidenceOf);
}
const resolved = (n, wins, conf) => Array.from({ length: n }, (_, i) => ({ status: 'RESOLVED', confidence: conf, wasCorrect: i < wins }));
t.eq('NaN input -> NO_INPUT', makeCalib([])(NaN).status, 'NO_INPUT');
t.eq('NaN input -> calibrated null', makeCalib([])(NaN).calibrated, null);
const thin = makeCalib(resolved(14, 9, 87))(87);
t.eq('n=14 in bucket -> INSUFFICIENT_SAMPLE', thin.status, 'INSUFFICIENT_SAMPLE');
t.eq('n=14 -> calibrated is null, not a guess', thin.calibrated, null);
t.eq('n=14 -> sampleSize reported', thin.sampleSize, 14);
const enough = makeCalib(resolved(15, 9, 87))(87);
t.eq('n=15 in bucket -> CALIBRATED', enough.status, 'CALIBRATED');
t.eq('n=15, 9 wins -> calibrated 60', enough.calibrated, 60);
t.eq('bucket label for raw 87', enough.bucket, '85-90%');
t.eq('raw 97 -> top bucket 95-100%', makeCalib(resolved(20, 10, 97))(97).bucket, '95-100%');
// PINNED-AS-IS: raw below 50 is clamped INTO the 50-55 bucket rather than
// rejected, so a raw of 40 is answered with the 50-55% bucket's win rate.
t.eq('PINNED-AS-IS: raw 40 is looked up in the 50-55% bucket', makeCalib(resolved(20, 10, 52))(40).bucket, '50-55%');
// FIXED (was PINNED-AS-IS): the same `|| 75` default as the bucket endpoints
// counted a resolved log with no forecast in the 75-80% bucket, so 15 such rows
// produced a CALIBRATED answer from nothing.
t.eq('log with no confidence is not counted', makeCalib(Array.from({ length: 15 }, () => ({ status: 'RESOLVED', wasCorrect: true })))(77).sampleSize, 0);
t.eq('15 forecast-less rows do not calibrate a bucket', makeCalib(Array.from({ length: 15 }, () => ({ status: 'RESOLVED', wasCorrect: true })))(77).status, 'INSUFFICIENT_SAMPLE');
// Only RESOLVED logs count.
t.eq('LOCKED (unsettled) logs are excluded',
  makeCalib(Array.from({ length: 20 }, () => ({ status: 'LOCKED', confidence: 87, wasCorrect: true })))(87).sampleSize, 0);

// ---------------------------------------------------------------------------
// PART B -- lock tiers. PART B1/B2 used to pin LOCK_POLICIES and tier
// selection in src/services/intelligence/continuousIntelligenceEngine.ts —
// the OG CLIENT-SIDE engine, which nothing mounted or imported and which was
// removed in SESSION 7 (engine-count audit: production has one engine,
// runMarketEngineTick in server.ts). Those tiers (EARLY 120–300s, bars
// 90/82/74) were never the tiers production applied; the real ones are
// pinned below and in tests/lock-gate.*.mjs.
// ---------------------------------------------------------------------------
t.section('PART B0: the OG client engine is gone and nothing imports it');
t.check('continuousIntelligenceEngine.ts no longer exists',
  !existsSync(join(ROOT, 'src/services/intelligence/continuousIntelligenceEngine.ts')));
t.check('no source imports services/intelligence',
  !readRepoFile('src/hooks/useCanonical15mDecision.ts').includes('services/intelligence') &&
  !readRepoFile('src/services/engine/canonicalDecisionEngine.ts').includes("from '../intelligence"));
t.check('the client placeholder no longer carries engine/tick/settle paths',
  !readRepoFile('src/services/engine/canonicalDecisionEngine.ts').includes('executeCanonical15mTick'));

t.section('PART B3: server gate tiers vs the canonical payload');
// The gate computes the adaptive tier (2deba55)...
t.check('gate computes EARLY/STANDARD/LATE from effElapsed',
  serverSrc.includes('const lockTier = effElapsed < 480 ? "EARLY" : effElapsed < 660 ? "STANDARD" : "LATE";'));
t.check('gate bars are 85 / 75 / 68',
  serverSrc.includes('const minLockQuality = lockTier === "EARLY" ? 85 : lockTier === "LATE" ? 68 : 75;'));
// ...but the payload's top-level lockTier is still the legacy binary. PINNED-AS-IS:
// a consumer reading `lockTier` gets STANDARD at every second of the cycle.
t.check('PINNED-AS-IS: payload.lockTier is still SKIP->NONE / else STANDARD',
  serverSrc.includes('latestBtc15mPipeline?.lockQualityTier === "SKIP" ? "NONE" : "STANDARD"'));
// The real applied bar is exposed separately, written by the gate itself.
t.check('payload exposes lockGate.minLockQuality from lockEligibility',
  /lockGate: active15mCycle\.lockEligibility[\s\S]{0,400}minLockQuality: active15mCycle\.lockEligibility\.minLockQuality/.test(serverSrc));

t.done();
