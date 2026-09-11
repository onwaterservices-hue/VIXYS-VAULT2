// INVARIANTS -- the 15M decision pipeline is deterministic.
//
// The cycle "VWAP" used to weight each tick by `3.5 + Math.random() * 2` of
// invented volume (25 for the first tick). It feeds vwapRelationship, which
// drives the PRICE_STRUCTURE evidence family and the regime, so identical price
// paths could produce different evidence and lock decisions. These tests run the
// REAL pipeline sliced verbatim from server.ts.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('deterministic-vwap.invariants');
const lines = serverSrc.split('\n');
const fStart = lines.findIndex((l) => l.startsWith('function evaluateBtc15mHighConvictionPipeline('));
const fEnd = lines.findIndex((l, i) => i > fStart && l === '}');
const fnSrc = lines.slice(fStart, fEnd + 1).join('\n');
const codeOnly = fnSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('source');
t.check('pipeline found', fStart > 0 && fEnd > fStart);
t.check('pipeline body never calls Math.random', !/Math\.random/.test(codeOnly));
t.check('no invented per-tick volume estimate', !/estVol/.test(codeOnly));
t.check('evidence text does not claim a volume-weighted price', /Cycle TWAP \(no volume feed\)/.test(fnSrc) && !/details: `VWAP:/.test(fnSrc));

const CYCLE = 900000;
const now = 1789100000000;
const cs = Math.floor(now / CYCLE) * CYCLE;
const trap = new Proxy(Math, { get: (m, p) => (p === 'random' ? () => { throw new Error('Math.random called'); } : m[p]) });
function run(acc, spot, strike, T) {
  const ticks = [];
  for (let s = 180; s >= 0; s -= 3) ticks.push({ ts: T - s * 1000, price: spot - 40 + (180 - s) * (40 / 180), takerBuyRatio: 1, delta: 0 });
  const ctx = { lastMarketUpdateTs: T, engineFeedStatus: 'CONNECTED', cycleVwapAccumulator: acc, rollingBtcTicks: ticks, hydratedBtcCloses: [],
    __name: (f) => f, active15mCycle: { directionChanges: 0 }, latestCrossAssetContext: { riskPenalty: 0 }, currentKalshiImpliedProb: 0.5, kalshiImpliedAtMs: 0,
    persistenceSeconds: 60, Math: trap };
  const k = Object.keys(ctx);
  return new Function(...k, `${fnSrc}\nreturn evaluateBtc15mHighConvictionPipeline;`)(...k.map((x) => ctx[x]))(spot, strike, T, 55, 0.05, 0);
}

t.section('behaviour');
let threw = null;
let a, b;
try {
  a = run({ cycleStart: cs, cumulativePv: 77000 * 10, cumulativeVol: 10, vwap: 77000 }, 77050, 77000, cs + 400000);
  b = run({ cycleStart: cs, cumulativePv: 77000 * 10, cumulativeVol: 10, vwap: 77000 }, 77050, 77000, cs + 400000);
} catch (e) { threw = e; }
t.check('pipeline runs without ever touching Math.random', threw === null, threw ? String(threw.message) : '');
if (a && b) {
  t.check('identical inputs -> identical pipeline output', JSON.stringify(a) === JSON.stringify(b));
  t.eq('identical inputs -> identical cycle average', a.priceStructure.vwap, b.priceStructure.vwap);
}

// Equal weight: feeding prices into the same cycle yields their plain mean.
const acc = { cycleStart: cs, cumulativePv: 0, cumulativeVol: 0, vwap: 0 };
const fed = [77000, 77010, 77030, 77060];
for (const p of fed) run(acc, p, 77000, cs + 400000);
t.eq('cycle average is the equal-weight mean of observed prices',
  acc.vwap, Math.round((fed.reduce((x, y) => x + y, 0) / fed.length) * 100) / 100);

// A new cycle resets to the first observed price with weight 1 (no invented 25).
const stale = { cycleStart: cs - CYCLE, cumulativePv: 1, cumulativeVol: 1, vwap: 1 };
const r = run(stale, 76900, 77000, cs + 400000);
t.eq('new cycle starts from the first observed price', r.priceStructure.vwap, 76900);

t.done();
