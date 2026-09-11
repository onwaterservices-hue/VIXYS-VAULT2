// CHARACTERIZATION -- realized 15m volatility is measured, or it is null.
//
// The pipeline used `let realizedVol15mPct = 0.85` unless an instance held >= 10
// ticks, then sqrt(variance * 100) * 100 clamped to [0.4, 6.5] -- a scaling that
// assumes 100 ticks per 15 minutes. With 3s ticks or 1m candles that lands under
// the floor, so production served 0.85 (14 of 20 samples, 2026-09-11 05:41Z) or
// 0.40, never a measurement. Coinbase 1m candles 2026-08-12..09-11 put the real
// value at p50 0.146% per 15m: 0.85 exceeded it in 99.6% of cycles and 0.40 in
// 95.4%, inflating expected move, strike coverage and the STRIKE_FEASIBLE gate.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('realized-vol-measured.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

const block = sliceBetween(serverSrc, '  const realizedVolFrom = (series) => {', '  const pricesLast20 =', 'vol + feasibility block');
const run = ({ ticks = [], closes = [], now, spot = 77000, strike = 77000, dir = 'UP', timeRemainingSec = 600 }) =>
  new Function('rollingBtcTicks', 'hydratedBtcCloses', 'now', 'spot', 'strike', 'candidateDir', 'timeRemainingSec',
    `${block}\nreturn { realizedVol15mPct, realizedVolSource, volRegime, expectedMoveUSD, coverageRatio, isStrikeFeasible, requiredMoveUSD };`,
  )(ticks, closes, now, spot, strike, dir, timeRemainingSec);

// A path whose realized volatility is known exactly: every step is +/- r in log
// terms, so sum(r^2) / span = r^2 / stepMs and vol15 = r * sqrt(900e3 / stepMs) * 100.
const path = (targetPct, stepMs, minutes, t0 = 1_800_000_000_000, p0 = 77000) => {
  const r = targetPct / 100 / Math.sqrt(900e3 / stepMs);
  const out = []; let p = p0;
  for (let i = 0; i * stepMs <= minutes * 60e3; i++) { out.push({ ts: t0 + i * stepMs, price: p }); p *= Math.exp(i % 2 ? -r : r); }
  return out;
};
const T0 = 1_800_000_000_000;
const near = (a, b, tol) => a !== null && Math.abs(a - b) <= tol;

t.section('placeholder, floor and invented fallback are gone');
t.check('no 0.85 placeholder', !/realizedVol15mPct = 0\.85/.test(code));
t.check('no 0.4 floor / 6.5 cap clamp', !/Math\.max\(0\.4,/.test(code) && !/Math\.min\(\s*6\.5,/.test(code));
t.check('no momentum-derived volatility anywhere (pipeline, payloads, logs)', !/Momentum\) \* 0\.75 \+ 0\.52/.test(code));
t.eq('the six served volatility fields read the measured value',
  (serverSrc.match(/volatility(?:15m|15mPct)?: latestBtc15mPipeline\?\.volatilityExpectedMove\?\.realizedVol15mPct \?\? null,/g) || []).length, 6);
{
  const seed = serverSrc.slice(serverSrc.indexOf('let latestBtc15mPipeline = {'), serverSrc.indexOf('let latestBtc15mPipeline = {') + 4000);
  t.check('boot seed carries no volatility reading and no feasibility',
    /realizedVol15mPct: null,/.test(seed) && /volatilityRegime: "UNKNOWN",/.test(seed) && /coverageRatio: null,/.test(seed) && /isStrikeFeasible: false,/.test(seed));
}

t.section('estimator (real code)');
{
  const none = run({ now: T0 });
  t.eq('no ticks, no candles -> null', none.realizedVol15mPct, null);
  t.eq('...regime UNKNOWN', none.volRegime, 'UNKNOWN');
  t.eq('...no expected move', none.expectedMoveUSD, null);
  t.eq('...no coverage', none.coverageRatio, null);
  t.eq('...strike not feasible when not in the money (fails closed)', run({ now: T0, spot: 77000, strike: 77100 }).isStrikeFeasible, false);
  t.eq('...but an in-the-money side is still feasible', run({ now: T0, spot: 77100, strike: 77000, dir: 'UP' }).isStrikeFeasible, true);

  const ticks3s = path(0.146, 3000, 20, T0);
  const nowTicks = ticks3s[ticks3s.length - 1].ts;
  const a = run({ ticks: ticks3s, now: nowTicks });
  t.check('3s ticks with true vol 0.146% -> measured 0.146%', near(a.realizedVol15mPct, 0.146, 0.002), String(a.realizedVol15mPct));
  t.eq('...source TICKS', a.realizedVolSource, 'TICKS');
  t.eq('...regime NORMAL', a.volRegime, 'NORMAL');
  const b = run({ ticks: path(0.146, 60e3, 20, T0), now: T0 + 20 * 60e3 });
  t.check('1m spacing, same true vol -> same measurement (spacing-independent)', near(b.realizedVol15mPct, 0.146, 0.002), String(b.realizedVol15mPct));

  const shortTicks = path(0.3, 3000, 5, T0 + 15 * 60e3);
  const closes = path(0.146, 60e3, 20, T0);
  const c = run({ ticks: shortTicks, closes, now: T0 + 20 * 60e3 });
  t.eq('ticks spanning < 10 min fall back to real 1m closes', c.realizedVolSource, 'CANDLES_1M');
  t.check('...and measure the closes', near(c.realizedVol15mPct, 0.146, 0.002), String(c.realizedVol15mPct));
  const future = run({ closes: path(0.146, 60e3, 20, T0 + 60 * 60e3), now: T0 });
  t.eq('closes after `now` are not read (no look-ahead)', future.realizedVol15mPct, null);
  const gappy = run({ ticks: [{ ts: T0, price: 77000 }, { ts: T0 + 30 * 60e3, price: 78000 }], now: T0 + 30 * 60e3 });
  t.eq('a gap longer than 3 minutes is not treated as one return', gappy.realizedVol15mPct, null);

  t.section('regime bands are the measured 30-day distribution');
  const at = (v) => run({ ticks: path(v, 3000, 20, T0), now: T0 + 20 * 60e3 }).volRegime;
  t.eq('0.05% -> COMPRESSED (below p25 0.095)', at(0.05), 'COMPRESSED');
  t.eq('0.15% -> NORMAL (p25..p75 0.21)', at(0.15), 'NORMAL');
  t.eq('0.30% -> EXPANDING (p75..p95 0.39)', at(0.30), 'EXPANDING');
  t.eq('0.50% -> EXTREME (above p95)', at(0.50), 'EXTREME');

  t.section('expected move and feasibility follow the measurement');
  const d = run({ ticks: path(0.146, 3000, 20, T0), now: T0 + 20 * 60e3, spot: 77000, strike: 77200, dir: 'UP', timeRemainingSec: 900 });
  t.check('expected move = spot x vol x sqrt(t/15m), no regime multiplier', d.expectedMoveUSD === Math.round(77000 * (d.realizedVol15mPct / 100)), String(d.expectedMoveUSD));
  t.eq('$200 away with a ~$112 expected move is not feasible', d.isStrikeFeasible, false);
  const e = run({ ticks: path(0.146, 3000, 20, T0), now: T0 + 20 * 60e3, spot: 77000, strike: 77060, dir: 'UP', timeRemainingSec: 900 });
  t.eq('$60 away with a ~$112 expected move is feasible', e.isStrikeFeasible, true);
}

t.section('consumers tolerate an unmeasured volatility');
t.check('gate blocker text does not print "nullx"', /coverageRatio \?\? "unmeasured"/.test(serverSrc));
t.check('lock-gate check shows "vol unmeasured"', serverSrc.includes('"vol unmeasured"'));
t.check('15m sub-score treats UNKNOWN as no reading', serverSrc.includes('vm.volatilityRegime === "UNKNOWN") return { score: null, aligned: false, detail: "Volatility not measured" }'));

t.done();
