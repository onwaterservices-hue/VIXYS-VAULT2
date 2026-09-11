// CHARACTERIZATION -- ARE THE ENGINE'S "INDEPENDENT" EVIDENCE FAMILIES ACTUALLY
// INDEPENDENT?
//
// Executes the REAL pipeline-input derivation sliced verbatim from
// runMarketEngineTick in server.ts.
//
// WHY THIS MATTERS
//   evaluateBtc15mHighConvictionPipeline scores several evidence families and
//   then rewards their AGREEMENT: evidenceAgreementCount and
//   multiTimeframeAlignment.alignedCount both feed calibratedConfidencePct
//     70 + (agreementCount - 8) * 5 + (alignedCount - 3) * 3 + (isITM ? 5 : 0)
//   and lockQuality. Agreement is only meaningful if the things agreeing carry
//   independent information. If two "families" are the same number wearing
//   different labels, the engine counts one piece of evidence twice and becomes
//   confident for no reason.
//
//   This file pins what the two headline pipeline inputs actually are. It does
//   not change them. It is the evidence base for Phase E2.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('feature-independence.characterization');

const inputsSrc = sliceBetween(
  serverSrc,
  '    const spotStrikeDist = livePrice - current15mStrikePrice;',
  '    void hydratePriceHistoryFromCandles(now);', // the dead currentVol15m that used to end this slice is gone
  'pipeline input derivation',
);

// Execute the real derivation for a given (spot, strike).
function derive(livePrice, current15mStrikePrice, currentBtcOpenPrice = 78000) {
  const fn = new Function('livePrice', 'current15mStrikePrice', 'currentBtcOpenPrice', 'Math', `
    let currentMomentum, currentBullVolumePct;
    ${inputsSrc}
    return { moneynessPct, intervalMomentum, currentBullVolumePct, spotStrikeDist, open };
  `);
  return fn(livePrice, current15mStrikePrice, currentBtcOpenPrice, Math);
}

t.section('the derivation is a pure function of (spot, strike)');
// Same inputs -> same outputs, and NOTHING else is consulted: no order book, no
// trade tape, no volume, no venue data.
const a = derive(78500, 78400);
const b = derive(78500, 78400);
t.eq('deterministic in spot/strike alone', JSON.stringify(a), JSON.stringify(b));
t.check('derivation source references no order book', !/orderbook|orderBook|bidAsk|depth/i.test(inputsSrc));
t.check('derivation source references no trade tape', !/\btrade\b|taker/i.test(inputsSrc));

t.section('PINNED-AS-IS: the one real market input is computed then discarded');
// `open` is seeded from currentBtcOpenPrice (fetched from Binance's 24h ticker),
// sanity-clamped against a 10% gap... and then never read again. It is the only
// non-price-vs-strike quantity in the whole derivation, and it is dead.
t.check('derivation computes `open` from currentBtcOpenPrice',
  /let open = currentBtcOpenPrice \|\| livePrice - 40;/.test(inputsSrc));
t.check('`open` is never used after being clamped',
  inputsSrc.split('open').length - 1 === 3,
  `occurrences of "open": ${inputsSrc.split('open').length - 1} (declaration + 2 in the clamp)`);
// Proof by behaviour: changing the 24h open cannot move any output.
const withOpenA = derive(78500, 78400, 70000);
const withOpenB = derive(78500, 78400, 85000);
t.eq('a 21% different 24h open changes bullVolPct not at all',
  withOpenA.currentBullVolumePct, withOpenB.currentBullVolumePct);
t.eq('...nor momentum', withOpenA.intervalMomentum, withOpenB.intervalMomentum);

t.section('"taker bull volume" is computed from price, not volume');
// currentBullVolumePct is:
//   min(90, max(10, round(50 + moneynessPct*25 + intervalMomentum*15)))
// with both terms functions of (spot - strike) / strike, and the pipeline
// derives a bidAskImbalancePct from it. FIXED (was PINNED-AS-IS): it was
// rendered as `Taker: ${bullVolPct}% Bull | Delta: N BTC`; it is now labelled
// a spot-vs-strike proxy. It still feeds the ORDER_FLOW family vote.
t.check('server labels bullVolPct as a price-derived proxy, not taker flow',
  !serverSrc.includes('`Taker: ${bullVolPct}% Bull') &&
  serverSrc.includes('Spot-vs-strike flow proxy (no trade tape): ${bullVolPct}% bull'));
t.check('bidAskImbalancePct is derived from bullVolPct',
  /const bidAskImbalancePct = Math\.round\(\(bullVolPct - 50\)/.test(serverSrc));

t.section('moneyness and momentum are the SAME quantity');
// intervalMomentum = round(((spot-strike)/strike)*1e4)/100
// moneynessPct     = ((spot-strike)/strike)*100
// i.e. momentum is moneyness rounded to 2dp. They are not two signals.
for (const [spot, strike] of [[78500, 78400], [78400, 78500], [79000, 78000], [78000, 79000], [78450, 78450]]) {
  const d = derive(spot, strike);
  t.check(`spot=${spot} strike=${strike}: momentum == round(moneyness,2)`,
    Math.abs(d.intervalMomentum - Math.round(d.moneynessPct * 100) / 100) < 1e-9,
    `momentum=${d.intervalMomentum} moneyness=${d.moneynessPct}`);
}

t.section('so bullVolPct is a monotonic restatement of moneyness');
// Sweep spot across a strike and confirm bullVolPct never decreases as spot
// rises -- i.e. it carries no information that (spot - strike) does not.
const strike = 78500;
const sweep = [];
for (let spot = strike - 400; spot <= strike + 400; spot += 10) sweep.push(derive(spot, strike));
let monotonic = true;
for (let i = 1; i < sweep.length; i++) {
  if (sweep[i].currentBullVolumePct < sweep[i - 1].currentBullVolumePct) monotonic = false;
}
t.check('bullVolPct is non-decreasing in spot for a fixed strike', monotonic);

// Perfect rank correlation with moneyness (Spearman == 1 over the sweep).
const rank = (xs) => { const s = [...xs].map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(xs.length); s.forEach(([, i], k) => { r[i] = k; }); return r; };
const rm = rank(sweep.map((d) => d.moneynessPct));
const rb = rank(sweep.map((d) => d.currentBullVolumePct));
const n = sweep.length;
const dsq = rm.reduce((acc, v, i) => acc + (v - rb[i]) ** 2, 0);
const spearman = 1 - (6 * dsq) / (n * (n * n - 1));
t.check(`Spearman(moneyness, bullVolPct) == 1 over the sweep (got ${spearman.toFixed(4)})`,
  spearman > 0.999, `rho=${spearman}`);

t.section('the clamp destroys information at the extremes');
// Clamped to [10, 90], so beyond roughly +/-0.1% moneyness every spot maps to
// the same value: strongly ITM and extremely ITM are indistinguishable.
t.eq('far above strike saturates at 90', derive(strike + 5000, strike).currentBullVolumePct, 90);
t.eq('far below strike saturates at 10', derive(strike - 5000, strike).currentBullVolumePct, 10);
t.eq('at the strike it is exactly 50', derive(strike, strike).currentBullVolumePct, 50);
const sat1 = derive(strike + 800, strike).currentBullVolumePct;
const sat2 = derive(strike + 8000, strike).currentBullVolumePct;
t.eq('PINNED-AS-IS: +$800 and +$8000 above strike are indistinguishable', sat1, sat2);

t.section('consequence for the confidence formula');
// Both the "order flow" family and the momentum family are fed by the same
// number, so a cycle that is merely far from its strike scores as though two
// independent sources agreed.
t.check('calibratedConfidencePct rewards agreementCount',
  /70 \+\s*\(agreementCount - 8\) \* 5/.test(serverSrc.replace(/\s+/g, ' ')));
t.check('lockQuality rewards agreementCount and alignedCount',
  /\(agreementCount \/ 11\) \* 40 \+\s*\(alignedCount \/ 5\) \* 20/.test(serverSrc.replace(/\s+/g, ' ')));

t.done();
