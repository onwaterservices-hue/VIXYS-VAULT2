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
// null = no edge until a live Kalshi price exists; Math.abs(null) is 0, below the bar.
t('currentEdgePct seeds null or below the 1.5 edge bar', seed('currentEdgePct') === 'null' || Math.abs(Number(seed('currentEdgePct'))) < 1.5, true);
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
// historicalSimilarityPct is null: no similarity model exists. It was a 75-95
// rescaling of the same ledger share the ratchet above read.
t('historicalSimilarityPct is null, not a rescaled ledger share', /active15mCycle\.historicalSimilarityPct = null;/.test(src) && !/75 \+ \(matchingDirCount/.test(src), true);

console.log('== cold-boot price history is real, not invented ==');
//
// Guards the defect fixed in fix/cold-boot-fake-tick-history. rollingBtcTicks was
// pre-filled at boot with 61 invented ticks at $64,185 (~$12.7k below market) and
// the VWAP accumulator anchored at the same price. Every timeframe vote on a young
// instance then read ~+20% momentum, so UP candidates qualified at 86-91% while
// DOWN candidates were vetoed and capped near 57. Production: 112 locks, all UP.
{
  const bootStart = src.indexOf('const rollingBtcTicks = [];');
  const bootEnd = src.indexOf('let latestBtc15mPipeline = {', bootStart);
  const bootSrc = src.slice(bootStart, bootEnd).replace(/\/\/[^\n]*/g, '');
  t('rollingBtcTicks declared once', src.split('const rollingBtcTicks = [];').length - 1, 1);
  t('no ticks pushed at boot', /rollingBtcTicks\.push/.test(bootSrc), false);
  t('no hardcoded 64185 price anywhere', /64185/.test(src), false);
  const vwap = new Function(`${bootSrc}; return cycleVwapAccumulator;`)();
  t('VWAP accumulator not anchored to a price', vwap.vwap, 0);
  t('VWAP accumulator resets on first real tick', vwap.cycleStart, 0);

  // Behavioural: run the REAL pipeline on a young instance using the REAL boot
  // state, then mirror the market. The side must not change what is reachable.
  const lines = src.split('\n');
  const fStart = lines.findIndex((l) => l.startsWith('function evaluateBtc15mHighConvictionPipeline('));
  const fEnd = lines.findIndex((l, i) => i > fStart && l === '}');
  const fnSrc = lines.slice(fStart, fEnd + 1).join('\n');
  const youngInstance = (sign) => {
    const { rollingBtcTicks, cycleVwapAccumulator } = new Function(`${bootSrc}; return { rollingBtcTicks, cycleVwapAccumulator };`)();
    const boot = 1789000000000, secs = 60, strike = 77000;
    for (let s = 1; s <= secs; s += 3) rollingBtcTicks.push({ price: strike + sign * 60 * (s / secs), ts: boot + s * 1000, takerBuyRatio: 1, delta: 0 });
    const T = boot + secs * 1000, spot = rollingBtcTicks[rollingBtcTicks.length - 1].price;
    const m = Math.round(((spot - strike) / strike) * 1e4) / 100;
    const bv = Math.min(90, Math.max(10, Math.round(50 + ((spot - strike) / strike * 100) * 25 + m * 15)));
    const ctx = { lastMarketUpdateTs: T, engineFeedStatus: 'CONNECTED', cycleVwapAccumulator, rollingBtcTicks, hydratedBtcCloses: [], __name: (f) => f,
      active15mCycle: { directionChanges: 0 }, latestCrossAssetContext: { riskPenalty: 0 }, currentKalshiImpliedProb: 0.5, kalshiImpliedAtMs: 0, persistenceSeconds: 60 };
    const k = Object.keys(ctx);
    return new Function(...k, `${fnSrc}\nreturn evaluateBtc15mHighConvictionPipeline;`)(...k.map((x) => ctx[x]))(spot, strike, T, bv, m, 0);
  };
  const up = youngInstance(+1), down = youngInstance(-1);
  const votes = (p) => ['tf15s', 'tf30s', 'tf1m', 'tf5m', 'tf15m'].map((f) => p.multiTimeframeAlignment[f]);
  t('young instance: no BULLISH vote on a falling market', votes(down).includes('BULLISH'), false);
  t('young instance: mirrored markets get equal confidence', down.edgeVsConfidence.calibratedConfidencePct, up.edgeVsConfidence.calibratedConfidencePct);
  t('young instance: mirrored markets get equal alignment', down.multiTimeframeAlignment.alignedCount, up.multiTimeframeAlignment.alignedCount);
  t('young instance: mirrored markets get equal threat', down.reversalAssessment.threatScore, up.reversalAssessment.threatScore);
  t('young instance: mirrored markets get equal tier', down.lockQualityTier, up.lockQualityTier);
}

console.log('== timeframe lookbacks use real candle history on young instances ==');
//
// Guards fix/hydrate-price-history-from-candles. On an instance seconds old a 5m
// or 15m lookback found no tick that old and fell back to the instance's first
// tick, so the "5m"/"15m" vote measured seconds. Production 2026-09-11: tf5m
// disagreed with real Coinbase 5-minute momentum in 13 of 14 samples.
{
  const lines = src.split('\n');
  const fStart = lines.findIndex((l) => l.startsWith('function evaluateBtc15mHighConvictionPipeline('));
  const fEnd = lines.findIndex((l, i) => i > fStart && l === '}');
  const fnSrc = lines.slice(fStart, fEnd + 1).join('\n');
  const gStart = fnSrc.indexOf('const getPriceAtAgo = __name(');
  const gEnd = fnSrc.indexOf('}, "getPriceAtAgo");', gStart) + '}, "getPriceAtAgo");'.length;
  const gSrc = fnSrc.slice(gStart, gEnd);
  const lookback = (rollingBtcTicks, hydratedBtcCloses, now, spot, sec) =>
    new Function('rollingBtcTicks', 'hydratedBtcCloses', 'now', 'spot', '__name', `${gSrc}\nreturn getPriceAtAgo(${sec});`)(rollingBtcTicks, hydratedBtcCloses, now, spot, (f) => f);

  const now = 1789100000000;
  const young = [{ ts: now - 20e3, price: 77010 }, { ts: now - 10e3, price: 77005 }, { ts: now, price: 77000 }];
  const closes = [];
  for (let m = 20; m >= 1; m--) closes.push({ ts: now - m * 60e3, price: 76500 + (20 - m) * 25 });

  t('instance tick is used when it reaches the lookback', lookback(young, closes, now, 77000, 10), 77005);
  t('5m lookback on a young instance reads the real 5m-old close', lookback(young, closes, now, 77000, 300), closes.find((c) => c.ts === now - 300e3).price);
  t('15m lookback on a young instance reads the real 15m-old close', lookback(young, closes, now, 77000, 900), closes.find((c) => c.ts === now - 900e3).price);
  t('no hydrated history -> previous fallback (first instance tick)', lookback(young, [], now, 77000, 300), 77010);
  const stale = [{ ts: now - 30 * 60e3, price: 70000 }];
  t('a close more than 90s before the target is not used', lookback(young, stale, now, 77000, 300), 77010);
  t('an instance tick always beats a candle close', lookback([{ ts: now - 400e3, price: 76999 }, ...young], closes, now, 77000, 300), 76999);

  // Hydrated closes feed only the lookback above and, when the instance's own
  // ticks span under 10 minutes, the time-aware realized-vol estimator (closed
  // bars with ts <= now). Structure and deltas must never read them.
  const outside = fnSrc.slice(0, gStart) + fnSrc.slice(gEnd);
  const vStart = outside.indexOf('  const realizedVolFrom = (series) => {');
  const vEnd = outside.indexOf('  const realizedVolSource =', vStart);
  t('realized-vol block found', vStart >= 0 && vEnd > vStart, true);
  const outsideVol = outside.slice(0, vStart) + outside.slice(vEnd);
  t('structure / deltas never read hydratedBtcCloses', /hydratedBtcCloses/.test(outsideVol.replace(/\/\/[^\n]*/g, '')), false);
  t('realized vol reads closes only as a fallback, never after now',
    /const candleVol = tickVol === null \? realizedVolFrom\(hydratedBtcCloses\.filter\(\(c\) => c\.ts <= now\)\) : null;/.test(outside), true);
  // The in-progress candle is excluded and the hydrator is throttled.
  const hStart = src.indexOf('async function hydratePriceHistoryFromCandles(');
  const hSrc = src.slice(hStart, src.indexOf('__name(hydratePriceHistoryFromCandles', hStart));
  t('hydrator excludes the in-progress bar', /closeTs <= cutoff/.test(hSrc), true);
  t('hydrator is single-flight', /_historyHydrateInFlight\) return;/.test(hSrc), true);
  t('hydrator reads real Coinbase 1m candles', /api\.exchange\.coinbase\.com\/products\/BTC-USD\/candles\?granularity=60/.test(hSrc), true);
  t('engine tick triggers hydration before the pipeline', /void hydratePriceHistoryFromCandles\(now\);\s*\n\s*latestBtc15mPipeline = evaluateBtc15mHighConvictionPipeline\(/.test(src), true);
  // A cold instance waits for the first candle fetch before it evaluates, so its
  // first 5m/15m votes and realized volatility read real minute history. The wait
  // sits before the replay sandbox's input slice (which starts at spotStrikeDist)
  // so the sliced, non-async derivation never contains an await.
  {
    const wait = 'if (hydratedBtcCloses.length === 0) await hydratePriceHistoryFromCandles(Date.now());';
    const wi = src.indexOf(wait);
    const di = src.indexOf('    const spotStrikeDist = livePrice - current15mStrikePrice;');
    t('cold instance waits for minute history, only while none is held', wi > 0 && src.indexOf(wait, wi + 1) === -1, true);
    t('the wait precedes the input derivation and the pipeline', wi > 0 && di > wi && di - wi < 200, true);
    t('the replay input slice contains no await', /await/.test(src.slice(di, src.indexOf('    void hydratePriceHistoryFromCandles(now);', di)).replace(/\/\/[^\n]*/g, '')), false);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
