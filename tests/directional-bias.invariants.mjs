// RUNTIME INVARIANT TESTS — 15M DIRECTIONAL SELECTION
//
// Executes the REAL pipelineDirection expression extracted verbatim from
// server.ts in THIS repository, with controlled fixtures injected. No
// reimplementation, no network, no Firestore.
//
// Guards the defect fixed in fix/directional-bias: pipelineDirection derived the
// traded side from `realEdgePct >= 0`. realEdgePct is computed relative to
// candidateDir, so it is positive for a well-supported DOWN call exactly as for a
// well-supported UP call. Reading its sign as a direction flipped good DOWN
// calls to UP, and production showed 28 of 32 settled locks (87.5%) as UP.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'server.ts'), 'utf8');

// Extract the real expression: `const pipelineCandidateDir = ... const pipelineDirection = ...;`
const start = src.indexOf('const pipelineCandidateDir =');
if (start === -1) throw new Error('pipelineCandidateDir not found - did the fix regress?');
const tail = src.slice(start);
const end = tail.indexOf('"NEUTRAL";') + '"NEUTRAL";'.length;
const exprSrc = tail.slice(0, end);

const decide = (pipeline) =>
  new Function('latestBtc15mPipeline', `${exprSrc}\nreturn pipelineDirection;`)(pipeline);

const P = (tier, dir, modelProbability, realEdgePct) => ({
  lockQualityTier: tier,
  explainability: dir === undefined ? undefined : { direction: dir },
  edgeVsConfidence: { modelProbability, realEdgePct },
});

let pass = 0, fail = 0;
const t = (name, actual, expected) => {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` -> got ${actual}, want ${expected}`}`);
};

console.log('== direction follows the model\'s chosen side, not the edge sign ==');
// THE REGRESSION: a well-supported DOWN call has POSITIVE realEdgePct.
t('DOWN candidate with positive edge stays DOWN', decide(P('A', 'DOWN', 0.30, +7.2)), 'DOWN');
t('DOWN candidate with negative edge stays DOWN', decide(P('A', 'DOWN', 0.30, -3.1)), 'DOWN');
t('UP candidate with positive edge stays UP',     decide(P('A', 'UP',   0.70, +7.2)), 'UP');
t('UP candidate with negative edge stays UP',     decide(P('A', 'UP',   0.70, -3.1)), 'UP');

console.log('== SKIP and NEUTRAL fall through to probability thresholds ==');
t('SKIP tier, high prob  -> UP',      decide(P('SKIP', 'SKIP', 0.61, 0)), 'UP');
t('SKIP tier, low prob   -> DOWN',    decide(P('SKIP', 'SKIP', 0.39, 0)), 'DOWN');
t('SKIP tier, mid prob   -> NEUTRAL', decide(P('SKIP', 'SKIP', 0.50, 0)), 'NEUTRAL');
t('NEUTRAL candidate     -> NEUTRAL', decide(P('A', 'NEUTRAL', 0.50, +5)), 'NEUTRAL');

console.log('== does not crash on missing/degraded pipeline fields ==');
t('missing explainability -> probability fallback', decide(P('A', undefined, 0.61, +5)), 'UP');
t('missing explainability, mid prob -> NEUTRAL',    decide(P('A', undefined, 0.50, +5)), 'NEUTRAL');

console.log('== symmetry: mirrored inputs must produce mirrored sides ==');
t('mirror UP',   decide(P('A', 'UP',   0.72, +6)), 'UP');
t('mirror DOWN', decide(P('A', 'DOWN', 0.28, +6)), 'DOWN');

console.log('== cold-instance seeds carry no directional opinion ==');
//
// Guards the defect fixed in fix/direction-pinned-up. These module-level values
// are read directly by the lock gate. Seeded as direction "UP" / confidence 88.5
// / P(up) 0.685 / edge 14.5 / persistence 18, a freshly booted instance already
// satisfied confidenceValid, edgeValid and PERSISTENCE on values nothing had
// measured, and production runs ~100 instances per 15-minute cycle.
const seed = (name) => {
  const m = src.match(new RegExp(`^let ${name} = ([^;]+);`, 'm'));
  if (!m) throw new Error(`declaration for ${name} not found`);
  return m[1].trim();
};
t('currentDirection seeds NEUTRAL, not a side', seed('currentDirection'), '"NEUTRAL"');
t('currentConfidence seeds 0, below the 66 gate', Number(seed('currentConfidence')) < 66, true);
t('currentModelProbability seeds even', Number(seed('currentModelProbability')), 0.5);
t('currentEdgePct seeds below the 1.5 edge bar', Math.abs(Number(seed('currentEdgePct'))) < 1.5, true);
t('persistenceSeconds seeds below the 6s bar', Number(seed('persistenceSeconds')) < 6, true);

console.log('== direction never depends on the engine\'s own recent output ==');
//
// The `historicalConflict` vote raised a conflict whenever 2 or fewer of the last
// 10 ledger rows carried the side under consideration. That is a one-way ratchet:
// once the ledger leans one way the other side permanently carries an extra
// conflict vote, which suppresses it, which keeps the ledger leaning. Measured in
// production on 2026-09-10: 97 of the last 97 locks were UP and none were DOWN
// over ~42 hours, while the Layer-5 shadow recorded the spot below the strike in
// 34 of 65 cycles.
t('no historicalConflict variable remains', /\bhistoricalConflict\b/.test(src.replace(/\/\/[^\n]*/g, '')), false);
t('conflictCount has no self-referential vote', /if \(historicalConflict\) conflictCount\+\+/.test(src), false);
// historicalSimilarityPct stays: it is displayed, it must not gate.
t('historicalSimilarityPct still computed for display', /active15mCycle\.historicalSimilarityPct = historicalSimilarityPct;/.test(src), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
