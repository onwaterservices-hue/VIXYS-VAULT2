// RUNTIME INVARIANTS -- the engine reads live Kalshi pricing and real aggressor
// flow, and an unknown input can never pass.
//
// Before: the pipeline used `currentKalshiImpliedProb || 0.52` (with a 0.54
// seed), so an edge against a price nobody quoted could pass the gate; the
// Kalshi fetch took the first open market and clamped the quote to 5-95c;
// served payloads invented a Polymarket price as Kalshi minus 2c. The reversal
// watch and the ORDER_FLOW family read `bullVolPct`, computed from spot vs
// strike. Now the Kalshi price is the current window's bid/ask midpoint and only
// a fresh read counts; flow is real Coinbase aggressor volume, and unmeasured
// flow is scored as the adverse case.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('real-flow-and-live-kalshi.invariants');
const fnSlice = (name) => {
  const i = serverSrc.indexOf(`function ${name}(`);
  if (i < 0) return null;
  return serverSrc.slice(i, serverSrc.indexOf('\n}\n', i) + 2);
};

t.section('aggressor-flow accumulation (real code)');
const mergeSrc = fnSlice('mergeRealTakerTrades');
const sumSrc = fnSlice('summarizeRealTakerFlowFrom');
t.check('flow functions found', Boolean(mergeSrc && sumSrc));
const merge = new Function(`${mergeSrc}; return mergeRealTakerTrades;`)();
const summarize = new Function(`${sumSrc}; return summarizeRealTakerFlowFrom;`)();
const NOW = 1_789_100_000_000;
const tr = (id, agoSec, size, side) => ({ id, tsMs: NOW - agoSec * 1000, size, takerSide: side });
{
  // 40 trades over the last 59s: 30 buyer-initiated, 10 seller-initiated.
  const batch1 = Array.from({ length: 40 }, (_, i) => tr(1000 + i, 59 - i * 1.5, 0.1, i % 4 === 0 ? 'SELL' : 'BUY'));
  const m1 = merge([], batch1, NOW, 0);
  t.eq('first batch starts coverage at its oldest trade', m1.continuousSinceMs, NOW - 59_000);
  const m2 = merge(m1.trades, [tr(1039, 0.5, 0.1, 'BUY'), tr(2000, 1, 0.2, 'SELL')], NOW, m1.continuousSinceMs);
  t.eq('an overlapping batch keeps coverage continuous', m2.continuousSinceMs, NOW - 59_000);
  t.eq('duplicates are merged by trade id', m2.trades.length, 41);
  const m3 = merge([tr(1, 200, 0.1, 'BUY')], [tr(3000, 0.5, 0.1, 'BUY')], NOW, NOW - 200_000);
  t.eq('a batch that does not reach back restarts coverage', m3.continuousSinceMs, NOW - 500);
  const old = merge([tr(9, 400, 0.1, 'BUY')], [tr(10, 1, 0.1, 'SELL')], NOW, NOW - 400_000);
  t.check('trades older than five minutes are dropped', old.trades.every((x) => x.tsMs >= NOW - 300_000));
  const junk = merge([], [{ id: 1, tsMs: NaN, size: 1, takerSide: 'BUY' }, { id: 2, tsMs: NOW, size: 0, takerSide: 'BUY' }, { id: 3, tsMs: NOW, size: 1, takerSide: null }], NOW, 0);
  t.eq('malformed prints are ignored', junk.trades.length, 0);

  const full = summarize(m1.trades, m1.continuousSinceMs, NOW - 1000, NOW, 60);
  t.check('a covered, fresh window is measured', full.measured === true, JSON.stringify(full));
  t.eq('buy share is buyer volume over total', full.buyShare, 0.75);
  t.eq('buy and sell volume are real sums', `${full.buyBTC}/${full.sellBTC}`, '3/1');
  t.eq('a stale fetch is not measured', summarize(m1.trades, m1.continuousSinceMs, NOW - 60_000, NOW, 60).measured, false);
  const partial = summarize(m1.trades, NOW - 20_000, NOW - 1000, NOW, 60);
  t.eq('20s of coverage in a 60s window is not measured', partial.measured, false);
  t.eq('...and reports its coverage', partial.coverageSec, 20);
  const none = summarize([], 0, 0, NOW, 60);
  t.check('no trades: unmeasured with no share', none.measured === false && none.buyShare === null);
}

t.section('pipeline (real code)');
const lines = serverSrc.split('\n');
const fStart = lines.findIndex((l) => l.startsWith('function evaluateBtc15mHighConvictionPipeline('));
const fEnd = lines.findIndex((l, i) => i > fStart && l === '}');
const pipeSrc = lines.slice(fStart, fEnd + 1).join('\n');
const CYCLE = 900000;
const T = Math.floor(NOW / CYCLE) * CYCLE + 400000;
const flow = (buyShare) => ({
  w60: { windowSec: 60, buyBTC: buyShare * 10, sellBTC: Math.round((1 - buyShare) * 10 * 1e3) / 1e3, buyShare, tradeCount: 400, coverageSec: 60, ageMs: 1000, measured: true, source: 'TEST' },
  w180: null,
});
// Spot 77050 against a 77000 strike (UP side); price rising over 3 minutes, or
// rising and then flat for the last minute.
function run({ realFlow = null, kalshi = null, kalshiAgeMs = null, flatLastMinute = false } = {}) {
  const ticks = [];
  for (let s = 180; s >= 0; s -= 3) {
    const k = flatLastMinute && s <= 60 ? 120 : 180 - s;
    ticks.push({ ts: T - s * 1000, price: 77010 + k * (40 / 180), takerBuyRatio: 1, delta: 0 });
  }
  const ctx = {
    lastMarketUpdateTs: T, engineFeedStatus: 'CONNECTED',
    cycleVwapAccumulator: { cycleStart: T - 400000, cumulativePv: 77000 * 10, cumulativeVol: 10, vwap: 77000 },
    rollingBtcTicks: ticks, hydratedBtcCloses: [], __name: (f) => f,
    active15mCycle: { directionChanges: 0 }, latestCrossAssetContext: { riskPenalty: 0 },
    currentKalshiImpliedProb: kalshi, kalshiImpliedAtMs: kalshiAgeMs === null ? 0 : T - kalshiAgeMs,
    persistenceSeconds: 60,
  };
  const keys = Object.keys(ctx);
  const fn = new Function(...keys, `${pipeSrc}\nreturn evaluateBtc15mHighConvictionPipeline;`)(...keys.map((x) => ctx[x]));
  return fn(ticks[ticks.length - 1].price, 77000, T, 55, 0.05, 0, realFlow);
}
const fam = (res) => res.evidenceFamilies.find((f) => f.name === 'ORDER_FLOW');

const unmeasured = run();
t.eq('no flow: absorption is UNMEASURED', unmeasured.orderFlowAnalytics.absorptionState, 'UNMEASURED');
t.eq('no flow: reversal watch reports flow unmeasured', unmeasured.reversalAssessment.flowMeasured, false);
t.check('no flow: trigger names it', unmeasured.reversalAssessment.primaryTriggers.includes('TAKER_FLOW_UNMEASURED'));
t.check('no flow: threat at or above the veto bar (an unknown cannot pass)',
  unmeasured.reversalAssessment.threatScore >= 30 && unmeasured.reversalAssessment.vetoActive === true,
  String(unmeasured.reversalAssessment.threatScore));
t.eq('no flow: ORDER_FLOW family casts no vote', fam(unmeasured).agreement, false);
t.eq('no flow: family status says so', fam(unmeasured).status, 'UNMEASURED');
t.eq('no flow: served share is null', unmeasured.orderFlowAnalytics.takerBuyShare60, null);
t.eq('no flow: net delta is null, not 0', unmeasured.orderFlowAnalytics.netDeltaBTC, null);

const cont = run({ realFlow: flow(0.75) });
t.eq('fixture is on the UP side', fam(cont).bias, 'UP');
t.eq('75% buyers with price rising: CONTINUING', cont.orderFlowAnalytics.absorptionState, 'CONTINUING');
t.eq('...ORDER_FLOW backs the side', fam(cont).agreement, true);
t.check('...detail reports the real volumes', /Coinbase taker flow 60s: buy 7\.5 BTC \/ sell 2\.5 BTC \(75% buyers, 400 trades\)/.test(fam(cont).details), fam(cont).details);
t.check('...measured continuation carries at least 25 less threat than unmeasured',
  unmeasured.reversalAssessment.threatScore - cont.reversalAssessment.threatScore >= 25,
  `${unmeasured.reversalAssessment.threatScore} vs ${cont.reversalAssessment.threatScore}`);
t.eq('...served realFlow carries the window', cont.realFlow.w60.buyShare, 0.75);

const exh = run({ realFlow: flow(0.25) });
t.eq('25% buyers against an UP call: EXHAUSTING', exh.orderFlowAnalytics.absorptionState, 'EXHAUSTING');
t.check('...trigger names it', exh.reversalAssessment.primaryTriggers.includes('TAKER_FLOW_AGAINST_SIDE'));
t.eq('...ORDER_FLOW does not back the side', fam(exh).agreement, false);
t.check('...threat above continuation', exh.reversalAssessment.threatScore > cont.reversalAssessment.threatScore);

const abs = run({ realFlow: flow(0.75), flatLastMinute: true });
t.eq('75% buyers with price flat for a minute: ABSORBED', abs.orderFlowAnalytics.absorptionState, 'ABSORBED');
t.check('...trigger names it', abs.reversalAssessment.primaryTriggers.includes('TAKER_FLOW_ABSORPTION'));
t.eq('...ORDER_FLOW does not back the side', fam(abs).agreement, false);

const unmeasuredWindow = run({ realFlow: { w60: { ...flow(0.75).w60, measured: false, coverageSec: 20 }, w180: null } });
t.eq('a window below coverage is UNMEASURED even with a share', unmeasuredWindow.orderFlowAnalytics.absorptionState, 'UNMEASURED');
t.check('...and says how much was covered', /20s of 60s covered/.test(fam(unmeasuredWindow).details));

t.section('Kalshi price in the pipeline (real code)');
const noK = run({ realFlow: flow(0.75) });
t.eq('no Kalshi read: implied price is null', noK.edgeVsConfidence.kalshiImpliedProbability, null);
t.eq('no Kalshi read: edge is null, not measured against a substitute', noK.edgeVsConfidence.realEdgePct, null);
const freshK = run({ realFlow: flow(0.75), kalshi: 0.6, kalshiAgeMs: 5000 });
t.eq('fresh Kalshi read is used as-is', freshK.edgeVsConfidence.kalshiImpliedProbability, 0.6);
t.check('...and yields a numeric edge', typeof freshK.edgeVsConfidence.realEdgePct === 'number');
t.eq('a read older than 2 minutes is not a price', run({ realFlow: flow(0.75), kalshi: 0.6, kalshiAgeMs: 200_000 }).edgeVsConfidence.kalshiImpliedProbability, null);
t.eq('a 97c quote is not clamped', run({ kalshi: 0.97, kalshiAgeMs: 1000 }).edgeVsConfidence.kalshiImpliedProbability, 0.97);

t.section('source');
const code = serverSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('no 0.52 substitute', !code.includes('currentKalshiImpliedProb || 0.52'));
t.check('no 0.54 seed', !code.includes('let currentKalshiImpliedProb = 0.54'));
t.check('no 5-95c clamp on the quote', !code.includes('Math.min(0.95, Math.max(0.05, yesAsk))') && !code.includes('Math.min(0.95, Math.max(0.05, yesBid))'));
t.check('Kalshi market chosen by its trading window', code.includes('Date.parse(mk.open_time') && code.includes('Date.parse(mk.close_time') && !code.includes('const m = activeMarkets[0];'));
t.check('YES price is the bid/ask midpoint', code.includes('(yesAsk + yesBid) / 2'));
t.check('the read records its market close', code.includes('kalshiImpliedCloseMs = Date.parse(m.close_time);'));
{
  // Real tick code: a price whose market has closed stops being fresh.
  const i = serverSrc.indexOf('    if (kalshiImpliedAtMs > 0 && kalshiImpliedCloseMs > 0 && Date.now() >= kalshiImpliedCloseMs) {');
  const blk = i > 0 ? serverSrc.slice(i, serverSrc.indexOf('\n    }\n', i) + 7) : '';
  t.check('close-invalidation block found', blk.length > 0);
  const runBlk = (atMs, closeMs, nowMs) => new Function('st', 'Date', `let kalshiImpliedAtMs = st.at, kalshiImpliedCloseMs = st.close, currentKalshiImpliedProb = st.p;\n${blk}\nreturn { at: kalshiImpliedAtMs, p: currentKalshiImpliedProb };`)({ at: atMs, close: closeMs, p: 0.37 }, { now: () => nowMs });
  const closed = runBlk(NOW - 5000, NOW - 1000, NOW);
  t.check('a 5s-old read from a closed market is dropped', closed.at === 0 && closed.p === null, JSON.stringify(closed));
  const open = runBlk(NOW - 5000, NOW + 60000, NOW);
  t.check('a read from the open market is kept', open.at === NOW - 5000 && open.p === 0.37, JSON.stringify(open));
}
t.check('tick no longer writes a pipeline price back', !/currentKalshiImpliedProb =\s*\n\s*latestBtc15mPipeline\.edgeVsConfidence\.kalshiImpliedProbability/.test(code));
t.check('early-entry window requires a fresh price', code.includes('latestBtc15mPipeline.edgeVsConfidence.kalshiImpliedProbability !== null &&'));
t.check('no invented Polymarket price or spread', !code.includes('currentKalshiImpliedProb - 0.02') && !code.includes('spreadPct: 0.02'));
t.check('tick refreshes real flow and passes it to the pipeline', code.includes('await refreshRealTakerFlow(now);') && /latestCrossAssetContext\?\.riskPenalty \|\| 0,\s*\n\s*latestRealFlow,/.test(code));
t.check('Coinbase maker side is mapped to the taker side', code.includes('takerSide: t.side === "sell" ? "BUY" : t.side === "buy" ? "SELL" : null'));
t.check('canonical payload serves the real flow', code.includes('realFlow: latestBtc15mPipeline?.realFlow ?? null,'));
t.check('served Order Flow sub-score reads real flow', code.includes('const f = latestBtc15mPipeline?.realFlow?.w60;'));
t.check('no proxy presented as order flow', !code.includes('Spot-vs-strike flow proxy') && !code.includes('ORDER_BOOK_ABSORPTION'));
t.check('served edge shares the Kalshi price freshness (no edge beside an aged-out price)',
  code.includes('edgePct: kalshiImpliedAtMs > 0 && Date.now() - kalshiImpliedAtMs < 120e3 ? currentEdgePct : null,') &&
  code.includes('edgePct: isLive && kalshiImpliedAtMs > 0 && Date.now() - kalshiImpliedAtMs < 120e3 ? currentEdgePct : null,') &&
  !/edgePct: currentEdgePct,\n\s*edge:/.test(code));
t.check('all three state routes tick first when the instance has been idle',
  (code.match(/if \(!engineHydrated \|\| currentBtcPrice === 64161\.4 \|\| Date\.now\(\) - _engineTickLastRunMs > 15e3\) \{/g) || []).length === 3);
t.check('served edge never divides a missing edge into 0', !code.includes('edge: currentEdgePct / 100') && !code.includes('edge: isLive ? currentEdgePct / 100'));

t.done();
