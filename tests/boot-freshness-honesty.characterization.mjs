// CHARACTERIZATION -- freshness timestamps claim nothing that did not happen.
//
// lastMarketUpdateTs, lastPredictionUpdateTs, lastModelRunTs and
// lastSignalUpdateTs booted at Date.now(). On Vercel most instances serve
// requests without ever running the engine tick (the cron reaches one instance
// a minute), so a cold instance reported from boot:
//   /api/live-engine/health   btcFeed CONNECTED, predictionEngine ACTIVE,
//                             lastMarketUpdate / lastPredictionUpdate = boot time
//   /api/vixy/health          marketFeed.connected, telemetry and signal healthy
//   /api/admin/system-health  MARKET_DATA "healthy"
// A bare 0 seed would instead have served 1970-01-01 and ages of ~56 years, so
// every reader now treats 0 as "never": null ages and times, never fresh.
// Settlement also stamped serverLearningEngine.lastWeightUpdateTs (persisted to
// calibration_state) although no weights are updated.
//
// Decision reads treat 0 as stale, and a tick that fetched a price records
// lastMarketUpdateTs = now before the pipeline runs, so any instance with market
// data decides exactly as before. The gate / pipeline cases below pin that.
import { serverSrc, sliceBetween, sliceThrough, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('boot-freshness-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const NAMES = ['lastMarketUpdateTs', 'lastModelRunTs', 'lastSignalUpdateTs', 'lastPredictionUpdateTs'];
const NOW = 1_789_000_000_000;

// The real route handler, as a callable: "(req, res) => { ... }".
const handler = (path) => {
  const head = `app.get("${path}", `;
  const a = serverSrc.indexOf(head);
  if (a < 0 || serverSrc.indexOf(head, a + 1) >= 0) throw new Error(`${path}: handler anchor not found exactly once`);
  return serverSrc.slice(a + head.length, serverSrc.indexOf('\n});', a) + 2);
};
const run = (fnSrc, globals) => {
  let body;
  const res = { json: (o) => { body = o; }, set() {} };
  new Function(...Object.keys(globals), `return ${fnSrc};`)(...Object.values(globals))({ query: {} }, res);
  return body;
};
// Statements sliced out of a function body; each must appear exactly once.
const statements = (src, names, label) => names.map((n) => {
  const m = src.match(new RegExp(`const ${n} =[^;]+;`, 'g')) || [];
  if (m.length !== 1) throw new Error(`${label}: "const ${n} =" appears ${m.length}x, expected 1`);
  return m[0];
}).join('\n');

t.section('seeds mean "never"');
{
  const seedSrc = sliceBetween(serverSrc, 'let lastMarketUpdateTs = ', 'let lastKalshiUpdateTs = 0;', 'freshness seeds');
  const seeds = new Function(`${seedSrc}; return { ${NAMES.join(', ')} };`)();
  for (const n of NAMES) t.eq(`${n} boots at 0`, seeds[n], 0);
  t.check('no freshness seed is Date.now()', !/let last(MarketUpdate|ModelRun|SignalUpdate|PredictionUpdate)Ts = Date\.now\(\)/.test(code));
}

t.section('no time or age is derived from a 0 seed');
for (const n of [...NAMES, 'lastKalshiUpdateTs']) {
  const dates = (code.match(new RegExp(`new Date\\(${n}\\)`, 'g')) || []).length;
  const guarded = (code.match(new RegExp(`${n} > 0 \\? new Date\\(${n}\\)`, 'g')) || []).length;
  t.check(`every new Date(${n}) is behind a > 0 guard (${guarded}/${dates})`, dates === guarded);
}
{
  // The two decision reads below are left unguarded on purpose: with 0 they
  // already evaluate as stale (pinned in the next section).
  const DECISION_READS = ['} else if (now - lastMarketUpdateTs > 15e3) {', 'const isFresh = now - lastMarketUpdateTs <= 15e3;'];
  for (const n of NAMES) {
    const re = new RegExp(`(?:\\bnow|Date\\.now\\(\\))\\s*-\\s*${n}\\b`, 'g');
    const bad = [];
    let m;
    while ((m = re.exec(code))) {
      const line = code.slice(code.lastIndexOf('\n', m.index) + 1, code.indexOf('\n', m.index)).trim();
      if (code.slice(Math.max(0, m.index - 90), m.index).includes(`${n} > 0`)) continue;
      if (DECISION_READS.includes(line)) continue;
      bad.push(line);
    }
    t.check(`every age computed from ${n} is guarded`, bad.length === 0, JSON.stringify(bad));
  }
}

t.section('decision reads: never-updated is stale; a real update decides as before');
{
  const tick = sliceBetween(serverSrc, 'async function runMarketEngineTick() {', 'async function runMarketEngineTickTracked() {', 'runMarketEngineTick');
  const iSet = tick.indexOf('      lastMarketUpdateTs = now;');
  t.check('a successful fetch records the update before the pipeline, isFresh and the served gate evaluation',
    iSet > 0 &&
    iSet < tick.indexOf('latestBtc15mPipeline = evaluateBtc15mHighConvictionPipeline(') &&
    iSet < tick.indexOf('const isFresh = now - lastMarketUpdateTs <= 15e3;') &&
    iSet < tick.indexOf('canLockCurrentCycle(livePrice, { observeOnly: true })'));
  const staleExpr = tick.match(/else if \((now - lastMarketUpdateTs > 15e3)\)/)[1];
  const stale = new Function('now', 'lastMarketUpdateTs', `return ${staleExpr};`);
  t.eq('tick: a never-updated feed goes STALE', stale(NOW, 0), true);
  t.eq('tick: a 5s-old update stays CONNECTED', stale(NOW, NOW - 5000), false);
  const isFresh = new Function('now', 'lastMarketUpdateTs', `${tick.match(/const isFresh = now - lastMarketUpdateTs <= 15e3;/)[0]} return isFresh;`);
  t.eq('tick: never updated is not isFresh', isFresh(NOW, 0), false);
  t.eq('tick: just updated is isFresh', isFresh(NOW, NOW), true);
}
{
  const gate = sliceBetween(serverSrc, 'function canLockCurrentCycle(livePrice)', '__name(canLockCurrentCycle', 'canLockCurrentCycle');
  const terms = statements(gate, ['dataAgeMs', 'latencyMs', 'marketDataFresh', 'dataFresh', 'latencyAcceptable'], 'gate');
  const feed = new Function('now', 'lastMarketUpdateTs', 'engineFeedStatus', `${terms}\nreturn { dataAgeMs, latencyMs, dataFresh, latencyAcceptable };`);
  const cold = feed(NOW, 0, 'CONNECTED');
  t.eq('gate: never updated is not dataFresh', cold.dataFresh, false);
  t.eq('gate: never updated fails latencyAcceptable', cold.latencyAcceptable, false);
  t.eq('gate: serves no data age', cold.dataAgeMs, null);
  t.eq('gate: serves no latency', cold.latencyMs, null);
  const warm = feed(NOW, NOW - 1000, 'CONNECTED');
  t.check('gate: a 1s-old update is fresh, age 1000 / latency 500 as before', warm.dataFresh && warm.latencyAcceptable && warm.dataAgeMs === 1000 && warm.latencyMs === 500);
  t.eq('gate: an 11s-old update is still not fresh', feed(NOW, NOW - 11000, 'CONNECTED').dataFresh, false);
  t.eq('gate: a disconnected feed is still not fresh', feed(NOW, NOW - 1000, 'STALE').dataFresh, false);
  t.check('gate: DATA_STALE names the missing update', gate.includes('"DATA_STALE (no market update recorded on this instance)"'));
  t.check('gate: the FEED checklist row does not render a missing age as 0ms', gate.includes('current: dataAgeMs === null ? "no update yet" : `${Math.round(dataAgeMs)}ms`'));
}
{
  const pipe = sliceBetween(serverSrc, 'function evaluateBtc15mHighConvictionPipeline(', '__name(\n  evaluateBtc15mHighConvictionPipeline,', 'pipeline');
  const terms = statements(pipe, ['feedFreshnessMs', 'feedNeverUpdated', 'staleTickDetected', 'isWsConnected', 'dataQualityStatus'], 'pipeline');
  const q = new Function('now', 'lastMarketUpdateTs', 'engineFeedStatus', `${terms}\nreturn { feedFreshnessMs, staleTickDetected, isWsConnected, dataQualityStatus };`);
  const cold = q(NOW, 0, 'CONNECTED');
  t.eq('pipeline: never updated grades OFFLINE', cold.dataQualityStatus, 'OFFLINE');
  t.eq('pipeline: never updated is a stale tick', cold.staleTickDetected, true);
  t.eq('pipeline: never updated is not ws-connected', cold.isWsConnected, false);
  t.eq('pipeline: serves no freshness age', cold.feedFreshnessMs, null);
  t.eq('pipeline: 0ms grades OPTIMAL', q(NOW, NOW, 'CONNECTED').dataQualityStatus, 'OPTIMAL');
  t.eq('pipeline: 6s grades DEGRADED', q(NOW, NOW - 6000, 'CONNECTED').dataQualityStatus, 'DEGRADED');
  t.eq('pipeline: 20s grades STALE', q(NOW, NOW - 20000, 'CONNECTED').dataQualityStatus, 'STALE');
  t.eq('pipeline: 70s grades OFFLINE', q(NOW, NOW - 70000, 'CONNECTED').dataQualityStatus, 'OFFLINE');
  t.eq('pipeline: 1s on a connected feed is ws-connected', q(NOW, NOW - 1000, 'CONNECTED').isWsConnected, true);
  t.check('pipeline: websocketStatus / driftMs do not read null as a small age',
    pipe.includes(': !feedNeverUpdated && feedFreshnessMs < 6e4') && pipe.includes('driftMs: feedNeverUpdated ? null :'));
}

t.section('/api/live-engine/health');
{
  const fn = handler('/api/live-engine/health');
  const base = { _engineTickLastRunMs: 0, db: null, persistenceState: 'OFFLINE', getPersistenceWriteGuardState: () => null };
  const cold = run(fn, { ...base, lastMarketUpdateTs: 0, lastKalshiUpdateTs: 0, lastPredictionUpdateTs: 0 });
  t.eq('never updated: btcFeed is not CONNECTED', cold.btcFeed, 'NOT_STARTED');
  t.eq('never run: predictionEngine is not ACTIVE', cold.predictionEngine, 'NOT_STARTED');
  t.eq('lastMarketUpdate is null', cold.lastMarketUpdate, null);
  t.eq('lastPredictionUpdate is null', cold.lastPredictionUpdate, null);
  t.eq('lastKalshiUpdate is null, not 1970', cold.lastKalshiUpdate, null);
  t.check('no 1970 timestamp anywhere', !JSON.stringify(cold).includes('1970'));
  const ts = Date.now() - 2000;
  const warm = run(fn, { ...base, lastMarketUpdateTs: ts, lastKalshiUpdateTs: ts, lastPredictionUpdateTs: ts });
  t.check('a real update reads CONNECTED / ACTIVE with its real time',
    warm.btcFeed === 'CONNECTED' && warm.predictionEngine === 'ACTIVE' && warm.lastMarketUpdate === new Date(ts).toISOString() && warm.lastPredictionUpdate === new Date(ts).toISOString());
}

t.section('/api/vixy/health');
{
  const fn = handler('/api/vixy/health');
  const T = Date.now();
  const base = {
    engineFeedStatus: 'CONNECTED', currentConfidence: 50, db: null, persistenceState: 'OFFLINE',
    active15mCycle: { cycleId: 'c', intervalStart: T - 60000, intervalEnd: T + 840000, isLocked: false },
  };
  const cold = run(fn, { ...base, lastMarketUpdateTs: 0, lastSignalUpdateTs: 0 });
  t.eq('never updated: not connected', cold.marketFeed.connected, false);
  t.eq('lastTickAt is null', cold.marketFeed.lastTickAt, null);
  t.eq('tickAgeMs is null', cold.marketFeed.tickAgeMs, null);
  t.eq('telemetry not healthy', cold.telemetry.healthy, false);
  t.eq('telemetry lastUpdateAt is null', cold.telemetry.lastUpdateAt, null);
  t.eq('signal not healthy', cold.signal.healthy, false);
  t.eq('signal lastUpdateAt is null', cold.signal.lastUpdateAt, null);
  t.eq('overall OFFLINE', cold.overall, 'OFFLINE');
  t.check('no 1970 timestamp anywhere', !JSON.stringify(cold).includes('1970'));
  const warm = run(fn, { ...base, lastMarketUpdateTs: T - 1000, lastSignalUpdateTs: T - 1000 });
  t.check('a real update reads connected / healthy / LIVE', warm.marketFeed.connected && warm.telemetry.healthy && warm.signal.healthy && warm.overall === 'LIVE');
}

t.section('admin system-health MARKET_DATA');
{
  const md = sliceThrough(serverSrc, 'MARKET_DATA: {', 'lastUpdate: lastMarketUpdateTs || null,', 'MARKET_DATA');
  const f = new Function('lastMarketUpdateTs', `return { ${md} } };`);
  const cold = f(0).MARKET_DATA;
  t.eq('never updated is not "healthy"', cold.status, 'degraded');
  t.eq('never updated has no lastUpdate', cold.lastUpdate, null);
  const ts = Date.now() - 1000;
  t.check('a real update is healthy with its time', f(ts).MARKET_DATA.status === 'healthy' && f(ts).MARKET_DATA.lastUpdate === ts);
}

t.section('/api/signal feed status');
{
  const blk = sliceThrough(serverSrc,
    '    const dataAgeMs = lastMarketUpdateTs > 0 ? now - lastMarketUpdateTs : null;\n    let computedFeedStatus = "OFFLINE";',
    '      (dataAgeMs !== null && dataAgeMs <= 15e3);', '/api/signal feed status');
  const f = new Function('now', 'lastMarketUpdateTs', 'engineFeedStatus', `${blk}\nreturn { dataAgeMs, computedFeedStatus, isLive };`);
  const cold = f(NOW, 0, 'CONNECTED');
  t.check('never updated: OFFLINE, not live, no age', cold.computedFeedStatus === 'OFFLINE' && cold.isLive === false && cold.dataAgeMs === null);
  // Unchanged mapping for real ages.
  const cases = [
    [1000, 'CONNECTED', 'LIVE', true], [5000, 'CONNECTED', 'DEGRADED', true], [10000, 'CONNECTED', 'STALE', true],
    [20000, 'CONNECTED', 'INVALID', false], [10000, 'STALE', 'DEGRADED', true], [20000, 'STALE', 'OFFLINE', false],
  ];
  for (const [age, feed, status, live] of cases) {
    const r = f(NOW, NOW - age, feed);
    t.check(`${age}ms on ${feed} -> ${status}, isLive ${live}`, r.computedFeedStatus === status && r.isLive === live && r.dataAgeMs === age);
  }
}

t.section('/api/vixy/15m/current feedHealth');
{
  const blk = sliceBetween(serverSrc, '  const feedDataAgeMs =', '  // "Market probability" is only real', 'feedHealth');
  const f = new Function('lastMarketUpdateTs', 'lastKalshiUpdateTs', 'engineFeedStatus', 'marketFeedHealth', `${blk}\nreturn feedHealth;`);
  const mfh = { priceSource: null, btcFresh: false, ethFresh: false, solFresh: false };
  const cold = f(0, 0, 'CONNECTED', mfh);
  t.check('never updated: no age, OFFLINE', cold.dataAgeMs === null && cold.status === 'OFFLINE');
  const warm = f(Date.now() - 500, 0, 'CONNECTED', mfh);
  t.check('a 0.5s-old update: numeric age, LIVE', typeof warm.dataAgeMs === 'number' && warm.status === 'LIVE');
}

t.section('served timestamps and ages elsewhere');
t.eq('/api/vixy/state and /api/signal serve lastMarketUpdateTs || null', (code.match(/lastMarketUpdateTs: lastMarketUpdateTs \|\| null,/g) || []).length, 2);
t.check('/api/signal marketTimestamp is null when never updated', /marketTimestamp: lastMarketUpdateTs \|\| null,/.test(code));
t.check('/api/signal lastValidSignal.timestamp is null when never updated', /timestamp: lastMarketUpdateTs \|\| null,/.test(code));
t.check('no served field carries the bare seed', !/^\s*lastMarketUpdateTs,\s*$/m.test(code) && !/:\s*lastMarketUpdateTs,/.test(code));
t.check('/api/vixy/state never calls a never-updated feed LIVE',
  /dataFreshness:\s*engineFeedStatus === "CONNECTED" && lastMarketUpdateTs > 0 \? "LIVE" : "DEGRADED",/.test(code));
t.check('admin diagnostics lastUpdateSecAgo is null when never updated',
  /lastUpdateSecAgo:\s*lastMarketUpdateTs > 0 \? Math\.round\(\(now - lastMarketUpdateTs\) \/ 100\) \/ 10 : null,/.test(code));
t.check('admin diagnostics lastModelRunSecAgo is null when never run',
  /const lastModelRunSecAgo =\s*lastModelRunTs > 0 \? Math\.round\(\(now - lastModelRunTs\) \/ 100\) \/ 10 : null;/.test(code));
t.check('cycle calibrationDataAgeMs is null when never updated',
  /active15mCycle\.calibrationDataAgeMs =\s*lastMarketUpdateTs > 0 \? now - lastMarketUpdateTs : null;/.test(code));
{
  const admin = readRepoFile('src/components/AdminPanel.tsx');
  t.check('AdminPanel does not render a missing feed age as "0s AGO"', !admin.includes('lastUpdateSecAgo || 0') && admin.includes('{ticked &&') && admin.includes('Number.isFinite(feedAgeSec)'));
}

t.section('no weight-update time is stamped or persisted');
t.check('nothing assigns serverLearningEngine.lastWeightUpdateTs', !/serverLearningEngine\.lastWeightUpdateTs\s*=(?!=)/.test(code));
{
  const persist = sliceBetween(serverSrc, 'async function persistCalibrationState() {', '__name(persistCalibrationState', 'persistCalibrationState');
  t.check('calibration_state persists lastWeightUpdateTs: null (the merge clears the settlement time stored under that name)',
    /learningEngine: \{[\s\S]*?lastWeightUpdateTs: null,/.test(persist) && !persist.includes('lastWeightUpdateTs: serverLearningEngine.lastWeightUpdateTs'));
}

t.section('/api/model-status counts a fresh ledger');
{
  const a = serverSrc.indexOf('app.get("/api/model-status", async (req, res) => {');
  const r = serverSrc.slice(a, serverSrc.indexOf('\n});', a));
  const iAwait = r.indexOf('await ensureLedgerFresh();');
  t.check('awaits ensureLedgerFresh before reading settled counts',
    a > 0 && iAwait > 0 && iAwait < r.indexOf('let settledCount = serverLearningEngine.todaySettledCount;'));
}

t.done();
