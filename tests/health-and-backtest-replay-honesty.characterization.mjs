// CHARACTERIZATION -- public health and "backtest replay" routes report measurements.
//
// Production on 2026-09-11 06:36Z:
//   /api/signal/backtest-replay  "old engine vs new 11-family engine" over 150
//       settled cycles -- avgBrierScore 0.192 vs 0.144 (literals), the "new
//       engine" re-used the old direction and skipped rows by `idx % 3 === 0`,
//       every non-skipped row tagged HIGH_CONVICTION, spot `|| 64100`,
//       confidence `|| 75`. There is one engine.
//   /api/vixy/health             signal.healthy true and authoritativeState.healthy
//       true (literals), lastSnapshotAt = request time, currentConfidence 75
//       while nothing was locked (`lockedConfidence || 75`).
//   /api/live-engine/health      engine "CONNECTED" and settlementEngine "ACTIVE"
//       (literals); predictionEngine `age < 15s ? "ACTIVE" : "ACTIVE"`.
import { serverSrc, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('health-and-backtest-replay-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const route = (path) => {
  const a = code.indexOf(`app.get("${path}"`);
  return a < 0 ? '' : code.slice(a, code.indexOf('\napp.', a + 10));
};

t.section('backtest-replay (real handler)');
{
  const a = serverSrc.indexOf('app.get("/api/signal/backtest-replay", async (req, res) => {');
  const b = serverSrc.indexOf('\n});\n', a) + '\n});'.length;
  t.check('handler found', a > 0 && b > a);
  const handlerSrc = serverSrc.slice(a, b).replace('app.get("/api/signal/backtest-replay", ', 'module.exports = (').replace(/\}\);$/, '});').replace(/\n\}\);$/, '\n}');
  const helpers = ['function brierOfRow(', 'function meanBrier(', 'function calibrationConfidenceOf('].map((anchor) => {
    const i = serverSrc.indexOf(anchor);
    let depth = 0, j = serverSrc.indexOf('{', i);
    for (; j < serverSrc.length; j++) { if (serverSrc[j] === '{') depth++; else if (serverSrc[j] === '}' && --depth === 0) break; }
    return serverSrc.slice(i, j + 1);
  }).join('\n');
  const body = serverSrc.slice(a, b).replace(/^app\.get\("\/api\/signal\/backtest-replay",\s*/, '').replace(/\);\s*$/, '');
  const js = transformSync(`${helpers}\nmodule.exports = async (persistentSignalLogs, ensureLedgerFresh) => { let out; const res = { json: (x) => { out = x; } }; await (${body})({}, res); return out; };`, { loader: 'ts', format: 'cjs' }).code;
  const m = { exports: {} };
  new Function('module', 'exports', js)(m, m.exports);
  const rows = [
    { status: 'RESOLVED', cycleId: 'c1', targetStrike: 77000, spotAtLock: 77050, settlementPrice: 77100, direction: 'UP', wasCorrect: true, confidence: 91, probability: 0.7, brierScore: 0.1 },
    { status: 'RESOLVED', cycleId: 'c2', targetStrike: 77000, spotAtLock: 77004, settlementPrice: 76990, direction: 'UP', wasCorrect: false, confidence: 88, probability: 0.6, brierScore: 0.4 },
    { status: 'RESOLVED', cycleId: 'c3', targetStrike: 77000, settlementPrice: 77010, direction: 'UP', wasCorrect: true },
    { status: 'LOCKED', cycleId: 'c4', direction: 'DOWN' },
  ];
  let hydrated = 0;
  const out = await m.exports(rows, async () => { hydrated += 1; });
  t.eq('the route hydrates the ledger before reading it', hydrated, 1);
  t.eq('no comparison is claimed', out.comparison, null);
  t.check('says why', typeof out.comparisonReason === 'string' && out.comparisonReason.includes('No second engine'));
  t.eq('graded rows only', out.ledger.graded, 3);
  t.eq('real wins', out.ledger.wins, 2);
  t.eq('real win rate', out.ledger.winRatePct, 66.7);
  // Scored from each row's recorded P(win): (0.7-1)^2 = 0.09 and 0.6^2 = 0.36.
  // The stored brierScore values (0.1, 0.4 -> 0.25) are not averaged.
  t.eq('Brier is scored from the recorded P(win), not stored scores', out.ledger.avgBrierScore, 0.225);
  t.eq('...over the rows that record a P(win)', out.ledger.brierScoredCount, 2);
  const c3 = out.sampleCycles.find((r) => r.cycleId === 'c3');
  t.eq('missing spot is null, not 64100', c3.spot, null);
  t.eq('missing confidence is null, not 75', c3.confidence, null);
  t.check('no row is tagged HIGH_CONVICTION or SKIPPED', !JSON.stringify(out).includes('HIGH_CONVICTION') && !JSON.stringify(out).includes('SKIPPED'));
}
t.check('no Brier literals, index skip or 64100 in the route', !/0\.192|0\.144|idx % 3|64100/.test(route('/api/signal/backtest-replay')));

t.section('/api/vixy/health');
{
  const r = route('/api/vixy/health');
  t.check('no literal healthy: true', !/healthy: true,/.test(r));
  t.check('no confidence default 75', !/lockedConfidence \|\| 75/.test(r));
  // lastSignalUpdateTs now boots at 0 (never); the recency check must not read
  // 0 as a timestamp (see boot-freshness-honesty.characterization).
  t.check('signal health from update recency', r.includes('healthy: lastSignalUpdateTs > 0 && now - lastSignalUpdateTs < 3e4,'));
  t.check('no request time presented as a snapshot time', r.includes('lastSnapshotAt: null,'));
}

t.section('/api/live-engine/health');
{
  const r = route('/api/live-engine/health');
  t.check('engine status is not a literal', !/engine: "CONNECTED",/.test(r) && r.includes('_engineTickLastRunMs'));
  t.check('a stale prediction engine is reported STALE', r.includes('predictionAge < 15e3 ? "ACTIVE" : "STALE"'));
  t.check('no literal settlementEngine ACTIVE', !/settlementEngine: "ACTIVE"/.test(r) && r.includes('settlementEngine: null,'));
}

t.done();
