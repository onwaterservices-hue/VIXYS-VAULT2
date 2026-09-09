// INVARIANTS -- the replay harness itself (Phase 13: no-future-data, cycle
// boundaries, settlement convention, trade-cache semantics).
//
// The harness is the instrument every engine claim rests on, so its own rules
// are pinned here by executing the real source text of scripts/replay15m.ts
// and scripts/replay15m/tradeCache.ts.
import { readRepoFile, sliceBetween, sliceThrough, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('replay-harness.invariants');
const replay = readRepoFile('scripts/replay15m.ts');
const cache = readRepoFile('scripts/replay15m/tradeCache.ts');
const strip = (src) => transformSync(src, { loader: 'ts', format: 'cjs' }).code;

t.section('NO FUTURE INFORMATION -- the assertion really throws');
// The counter and the function are separated by the fidelity block, so slice
// each on its own unique anchors and recombine.
const fnSrc = sliceBetween(replay, 'function assertNoLookahead(', '// ---------------------------------------------------------------------------\n// main\n', 'assertNoLookahead');
const guardSrc = 'let lookaheadViolations = 0;\n' + fnSrc;
const mk = () => new Function(`${strip(guardSrc)}; return { assertNoLookahead, count: () => lookaheadViolations };`)();
const g1 = mk();
let threw = null; try { g1.assertNoLookahead(1_000_000, 999_000); } catch (e) { threw = e; }
t.check('a candle 1s NEWER than the tick throws', threw !== null && /LOOKAHEAD VIOLATION/.test(String(threw?.message)));
t.eq('violation counter increments', g1.count(), 1);
const g2 = mk();
let ok = true; try { g2.assertNoLookahead(999_000, 1_000_000); g2.assertNoLookahead(1_000_000, 1_000_000); } catch { ok = false; }
t.check('a candle at or before the tick passes', ok);
t.eq('no violation counted for legal input', g2.count(), 0);
t.check('the harness calls the assertion on EVERY tick', /for \(const tk of cycleTicks\) \{[\s\S]{0,120}assertNoLookahead\(tickNow, tickNow\)/.test(replay));
t.check('the lookahead count is printed in the report', replay.includes("lookahead violations     : ${lookaheadViolations}"));

t.section('CYCLE BOUNDARIES -- 15-minute UTC epochs');
t.check('window start snaps DOWN to a 15m boundary', replay.includes('startMs = Math.floor(startMs / CYCLE_MS) * CYCLE_MS;'));
t.check('window end snaps DOWN to a 15m boundary', replay.includes('endMs = Math.floor(endMs / CYCLE_MS) * CYCLE_MS;'));
t.check('ticks are grouped by floor(ts / CYCLE_MS)', replay.includes('const cs = Math.floor(tk.tsMs / CYCLE_MS) * CYCLE_MS;'));
t.check('cycle id is the UTC ISO of the boundary', replay.includes('const cycleId = `15M-${new Date(cs).toISOString()}`;'));
t.check('ticks within a cycle are consumed in ascending time', replay.includes('for (const arr of byCycle.values()) arr.sort((a, b) => a.tsMs - b.tsMs);'));

t.section('SETTLEMENT CONVENTION -- first observation of the NEXT cycle');
t.check('settlement price is the next cycle\'s first tick', replay.includes('rec.settlementPrice = nextTicks[0].price;'));
t.check('settlement happens after the cycle loop, never inside it',
  replay.indexOf('rec.settlementPrice = nextTicks[0].price;') > replay.indexOf('for (const tk of cycleTicks) {'));
t.check('strike is fixed from the cycle\'s FIRST observation', replay.includes('const openPrice = cycleTicks[0].price;') && replay.includes('const strike = Math.round(openPrice / 10) * 10;'));
t.check('a cycle without a following observation is left ungraded (null), not guessed',
  /if \(nextTicks && nextTicks\.length\) \{/.test(replay) && replay.includes('settlementPrice: null, actualOutcome: null, wasCorrect: null, brierScore: null'));

t.section('TRADE CACHE -- real prints only, correct aggressor side');
// Coinbase reports `side` as the MAKER side: side "sell" => the resting order
// was a sell => the taker BOUGHT (an up-tick). Verified against Coinbase docs.
t.check('taker buy volume is credited when maker side is "sell"', cache.includes("if (t.side === 'sell') b.buyVolume += size; else b.sellVolume += size;"));
// End at the next exported function; the intervening doc comment is inert once transpiled.
const bucketizeSrc = sliceBetween(cache, 'function bucketize(', 'export async function getTradeTicks(', 'bucketize');
const bucketize = new Function('Math', 'Map', 'Date', 'parseFloat', 'Number', `${strip(bucketizeSrc)}; return bucketize;`)(Math, Map, Date, parseFloat, Number);
const b = bucketize([
  { trade_id: 1, side: 'sell', size: '0.5', price: '100', time: '2026-09-09T00:00:01.000Z' },  // taker bought
  { trade_id: 2, side: 'buy',  size: '0.2', price: '101', time: '2026-09-09T00:00:02.000Z' },  // taker sold
  { trade_id: 3, side: 'sell', size: '0.1', price: '102', time: '2026-09-09T00:00:02.900Z' },  // last in bucket
], 3);
const only = [...b.values()];
t.eq('three prints within one 3s window form ONE bucket', only.length, 1);
t.eq('taker buy volume = sizes with maker side "sell"', +only[0].buyVolume.toFixed(6), 0.6);
t.eq('taker sell volume = sizes with maker side "buy"', +only[0].sellVolume.toFixed(6), 0.2);
t.eq('bucket price is the LAST print in time order', only[0].price, 102);
t.eq('bucket high/low from real prints', `${only[0].low}-${only[0].high}`, '100-102');
t.eq('bucketize never creates an empty bucket', only[0].empty, false);
// Empty (carried) buckets exist only at read time, and never touch the disk cache.
t.check('carry-forward buckets are flagged empty with zero volume at read time', cache.includes('tradeCount: 0, buyVolume: 0, sellVolume: 0, high: null, low: null, empty: true'));
t.check('only complete UTC hours are persisted', cache.includes('const hourComplete = h + HOUR_MS <= Math.min(endMs, nowMs);'));
t.check('nothing is emitted before the first real print', /Before the first observed trade there is nothing to carry/.test(cache));
t.check('no interpolation anywhere in the cache', !/interpolat\w*\(/i.test(cache) && !/lerp/i.test(cache));

t.section('DETERMINISM PLUMBING');
t.check('Math.random in the pipeline is replaced by a seeded PRNG', readRepoFile('scripts/replay15m/engineSandbox.ts').includes("return prop === 'random' ? __rand : target[prop];"));
t.check('offline mode is a hard error on a cache miss (never a silent fetch)', cache.includes('--offline requested but') && readRepoFile('scripts/replay15m/candleCache.ts').includes('--offline was requested but chunk'));
t.done();
