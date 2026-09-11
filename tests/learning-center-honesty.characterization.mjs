// CHARACTERIZATION -- the Learning Center renders only served numbers.
//
// VixyLearningCenter polled /api/signal/learning-metrics, a route server.ts never
// registered (production: 404 {"error":"not_found"}), so it always rendered its
// hardcoded fallback: model "VIXY_VAULT_v1.0", lock precision "0%", Brier "0.000"
// (a perfect score), engine OFFLINE, an unconditional VERIFIED badge, "NEXT RUN IN
// 15m" for a learning run that does not exist, DIRECTIONAL ACCURACY repeating lock
// precision, and a shadow "v1.1.0-RC" candidate nothing evaluates. The engine does
// not train (/api/model-status serves incrementalTraining null).
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('learning-center-honesty.characterization');
const src = readRepoFile('src/components/VixyLearningCenter.tsx').replace(/\/\/[^\n]*/g, '');
const serverCode = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

function routeSlice(start, end) {
  if (serverCode.split(start).length - 1 !== 1) return '';
  const i = serverCode.indexOf(start);
  const j = serverCode.indexOf(end, i);
  return j > i ? serverCode.slice(i, j) : '';
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const reads = (field) => new RegExp(`\\.${field}\\b`).test(src);
const serves = (slice, field) => new RegExp(`\\b${field}\\b`).test(slice);

t.section('endpoints');
t.check('does not fetch /api/signal/learning-metrics', !src.includes('/api/signal/learning-metrics'));
const endpoints = [...new Set([...src.matchAll(/["'`](\/api\/[^"'`?\s]+)/g)].map((m) => m[1]))];
const expected = ['/api/model-status', '/api/signal/calibration-report', '/api/live-engine/health', '/api/research/shadow-l5'];
t.check('fetches the model-status, calibration-report, engine-health and shadow-l5 sources', expected.every((e) => src.includes(`fetchSource("${e}"`)), JSON.stringify(endpoints));
for (const e of endpoints) {
  t.check(`${e} is a registered GET route in server.ts`, new RegExp(`app\\.get\\(\\s*"${escapeRe(e)}"`).test(serverCode));
}

t.section('fabricated literals are gone');
t.check('no "0.000" Brier', !src.includes('0.000'));
t.check('no "0%" default', !/["'`]0%["'`]/.test(src));
t.check('no VIXY_VAULT_v1.0 model version', !src.includes('VIXY_VAULT_v1.0'));
t.check('no invented v1.0.0 / v1.1.0-RC shadow versions', !src.includes('v1.0.0') && !src.includes('v1.1.0-RC'));
t.check('no VERIFIED badge', !/VERIFIED/.test(src));
t.check('no hardcoded next run', !/NEXT RUN/i.test(src) && !/\b15m\b/.test(src) && !/15 \* 60 \* 1000/.test(src));
t.check('no learning-run or learning-pipeline claim', !/LEARNING PIPELINE|LEARNING RUN|lastLearningRun|Continuous Cloud Learning/i.test(src));
t.check('no fallback stats object', !/data \|\|\s*\{/.test(src) && !/lockPrecision|shadowComparison|duplicateOutcomes|learningStatus|engineUptime/.test(src));
t.check('no OFFLINE default status', !/["'`]OFFLINE["'`]/.test(src));
t.check('no invented Brier target', !src.includes('0.150'));

t.section('unavailable states');
t.check('an "Unavailable" state exists', src.includes('const UNAVAILABLE = "Unavailable";'));
t.check('a failed or non-OK fetch clears the source to null', /if \(!res\.ok\) return null;/.test(src) && /catch \{\s*return null;/.test(src));
t.check('every source is replaced each poll (no stale numbers kept)', ['setModelStatus(model)', 'setCalibration(calib)', 'setEngineHealth(health)', 'setShadow(shadowReadout)'].every((s) => src.includes(s)));
t.check('only buckets with settled locks render', /b\.sampleCount > 0/.test(src));
t.check('only regimes with settled cycles render', /r\.totalCycles > 0/.test(src));
t.check('calibration empty and failed states', src.includes('No settled locks in any engine score band yet.') && src.includes('Calibration report unavailable.'));
t.check('regime empty and failed states', src.includes('No settled cycles carry a regime tag yet.') && src.includes('Regime breakdown unavailable.'));
t.check('shadow failed state', src.includes('Shadow readout unavailable.'));
t.check('unsourced uptime and feature reliability render as unavailable', /UPTIME<\/span>\s*<span[^>]*title="No engine route reports uptime\."\s*>\s*\{UNAVAILABLE\}/.test(src) && src.includes('No engine route measures feature reliability.'));

t.section('cards read the right fields');
const dirBlock = src.slice(src.indexOf('DIRECTIONAL ACCURACY'), src.indexOf('DIRECTIONAL ACCURACY') + 400);
const lockBlock = src.slice(src.indexOf('LOCK PRECISION'), src.indexOf('LOCK PRECISION') + 400);
t.check('directional accuracy reads historicalAccuracy, not lock precision', dirBlock.includes('historicalAccuracy') && !dirBlock.includes('overallWinRatePct'));
t.check('lock precision reads overallWinRatePct', lockBlock.includes('overallWinRatePct'));
t.check('header badge shows the served engine state', /\{engineText\}/.test(src) && /engineHealth\?\.engine/.test(src));

t.section('fields exist in the routes that serve them');
const modelStatus = routeSlice('app.get("/api/model-status"', 'app.get("/api/live-engine/health"');
const health = routeSlice('app.get("/api/live-engine/health"', 'let globalSequenceNumber');
const calib = routeSlice('app.get("/api/signal/calibration-report"', 'app.get("/api/signal/backtest-replay"');
const shadowRoute = routeSlice('app.get("/api/research/shadow-l5"', 'function canAttemptFirestoreWrite(');
t.check('route slices located', [modelStatus, health, calib, shadowRoute].every((s) => s.length > 0));
for (const f of ['settledCount', 'minRequired', 'lifetimeObservations', 'hasActiveModel', 'historicalAccuracy', 'currentRegime', 'recentSettlements', 'incrementalTraining', 'lastWeightUpdateSecAgo']) {
  t.check(`model-status serves ${f}`, reads(f) && serves(modelStatus, f));
}
t.check('settled history timestamp is resolvedAt', reads('timestamp') && serverCode.includes('timestamp: item.resolvedAt,') && serverCode.includes('timestamp: prevLog.resolvedAt,'));
t.check('historicalAccuracy is a 0-100 percentage', /const accuracy = Math\.round\(\(wins \/ total\) \* 1e3\) \/ 10;/.test(serverCode));
for (const f of ['overallWinRatePct', 'avgBrierScore', 'scoredRows', 'sampleSize', 'confidenceBuckets', 'bucket', 'predictedConfidence', 'empiricalWinRate', 'sampleCount', 'calibrationDiff', 'regimeBreakdown', 'regime', 'totalCycles', 'winRatePct', 'avgConfidence']) {
  t.check(`calibration-report serves ${f}`, reads(f) && serves(calib, f));
}
t.check('engine health derives engine from the tick time with a 15s band', /now - _engineTickLastRunMs < 15e3 \? "CONNECTED" : "STALE"/.test(health) && health.includes('"NOT_STARTED"') && ['CONNECTED', 'STALE', 'NOT_STARTED'].every((s) => src.includes(`${s}:`)));
for (const f of ['rowsWithShadow', 'tableVersion', 'engine', 'rule', 'wins', 'losses', 'ungraded']) {
  t.check(`shadow-l5 serves ${f}`, reads(f) && serves(shadowRoute, f));
}
t.check('percentages are not rescaled by 100 on the client', !/\*\s*100\b/.test(src));

t.done();
