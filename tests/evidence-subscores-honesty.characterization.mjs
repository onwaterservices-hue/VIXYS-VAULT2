// CHARACTERIZATION -- the terminal's six evidence vectors are computed or absent.
//
// /api/vixy/15m/current evidence.subScores feeds computeEvidenceVectors (right
// rail + prediction center). The server fell back to fixed readings when the
// pipeline was absent (Momentum 8.0 "4/5", Trend 8.2 "+$18", Order Flow 7.9
// "1.24x", Volume 7.6 "1.40x", Volatility 7.2 "NORMAL (1.20%)") and scored
// Momentum, Trend and Order Flow without regard to the side being called.
// Production on 2026-09-11 served "Order Flow 7.0, aligned, Taker buy ratio
// 1.00x": a neutral ratio, derived from spot vs strike, counted as support.
// The client then derived its own vectors from confidence and lockScore
// ("Cumulative volume delta (CVD) aligned with active bias", "Volume expansion
// 1.25x") whenever a score was missing.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('evidence-subscores-honesty.characterization');
const stripComments = (src) => src.replace(/\/\/[^\n]*/g, '');
const loadCjs = (js) => {
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, () => ({}));
  return m.exports;
};
const by = (arr) => Object.fromEntries(arr.map((s) => [s.name, s]));

t.section('server: sub-scores (real code)');
const s0 = serverSrc.indexOf('      subScores: [');
const s1 = serverSrc.indexOf('    // ---- AUTHORITATIVE LIFECYCLE', s0);
t.check('subScores block found', s0 > 0 && s1 > s0);
const block = serverSrc.slice(s0, s1).trim().replace(/^subScores:\s*/, '').replace(/\]\s*\},?\s*$/, ']');
const scores = loadCjs(transformSync(
  `module.exports = (latestBtc15mPipeline, isLocked, lockedPred, livePred, evidenceDir) => (${block});`,
  { loader: 'ts', format: 'cjs' },
).code);
const run = (pipe, dir) => scores(pipe, false, null, { direction: dir }, dir);

const invented = ['4/5', '+$18', '1.24', '1.40', 'NORMAL', '1.20'];
for (const dir of ['UP', 'DOWN', 'NEUTRAL']) {
  const cold = run(null, dir);
  t.eq(`no pipeline (${dir}) -> six sub-scores`, cold.length, 6);
  t.check(`no pipeline (${dir}) -> every score null`, cold.every((s) => s.score === null));
  t.check(`no pipeline (${dir}) -> nothing aligned`, cold.every((s) => s.aligned === false));
  t.check(`no pipeline (${dir}) -> no invented reading in any detail`,
    cold.every((s) => !invented.some((v) => String(s.detail).includes(v))));
}

// Shape and values as served by production at 05:19Z on 2026-09-11.
const live = {
  multiTimeframeAlignment: { tf15m: 'BEARISH', tf5m: 'NEUTRAL', tf1m: 'NEUTRAL', tf30s: 'NEUTRAL', tf15s: 'NEUTRAL', alignedCount: 2, totalCount: 5, state: 'CONFLICT', momentumClassification: 'DECELERATING' },
  priceStructure: { displacementUSD: 0, breakoutState: 'RANGE_BOUND' },
  realFlow: { w60: { measured: true, buyShare: 0.5, buyBTC: 2, sellBTC: 2 } },
  volatilityExpectedMove: { coverageRatio: 111, isStrikeFeasible: true, volatilityRegime: 'NORMAL', realizedVol15mPct: 0.85 },
  edgeVsConfidence: { kalshiImpliedProbability: 0.53 },
};
const L = by(run(live, 'UP'));
t.eq('neutral taker flow scores 5.0 (was 7.0)', L['Order Flow'].score, 5);
t.eq('...and is not counted as support (was aligned)', L['Order Flow'].aligned, false);
t.check('flow detail names measured Coinbase taker flow, not a proxy ratio',
  /Coinbase taker flow 60s/.test(L['Order Flow'].detail) && !/proxy/.test(L['Order Flow'].detail) && !/Taker buy ratio/.test(L['Order Flow'].detail));
t.check('absorbed flow (with-side aggression, price not following) is not support',
  (() => { const a = by(run({ ...live, realFlow: { w60: { measured: true, buyShare: 0.77, buyBTC: 7.7, sellBTC: 2.3 }, absorptionState: 'ABSORBED' } }, 'UP'))['Order Flow']; return a.aligned === false && /absorbed/.test(a.detail); })());
t.check('unmeasured flow is unscored and not support',
  (() => { const u = by(run({ ...live, realFlow: { w60: { measured: false, buyShare: 0.9, buyBTC: 9, sellBTC: 1 } } }, 'UP'))['Order Flow']; return u.score === null && u.aligned === false && /unmeasured/.test(u.detail); })());
t.eq('zero displacement scores 5.0 (was 6.5)', L.Trend.score, 5);
t.eq('...and is not support (was aligned)', L.Trend.aligned, false);
t.eq('UP with no bullish timeframe is not momentum support', L.Momentum.aligned, false);
t.eq('momentum detail counts timeframes for the side', L.Momentum.detail, 'Multi-TF 0/5 bullish (scored for UP)');
t.eq('coverage reading passes through', L.Volume.score, 9.5);
t.eq('coverage detail unchanged', L.Volume.detail, 'Expected move coverage 111.00x');
t.eq('volatility reading passes through', L.Volatility.detail, 'Vol regime NORMAL (0.85%)');
t.eq('sentiment untouched', L.Sentiment.detail, 'Kalshi implied 53c');

t.section('server: directional sub-scores respect the side');
const bull = { ...live, realFlow: { w60: { measured: true, buyShare: 0.6, buyBTC: 3, sellBTC: 2 } }, priceStructure: { displacementUSD: 40, breakoutState: 'BREAKOUT_BULL' },
  multiTimeframeAlignment: { tf15s: 'BULLISH', tf30s: 'BULLISH', tf1m: 'BULLISH', tf5m: 'NEUTRAL', tf15m: 'NEUTRAL', momentumClassification: 'STABLE' } };
const bear = { ...live, realFlow: { w60: { measured: true, buyShare: 0.4, buyBTC: 2, sellBTC: 3 } }, priceStructure: { displacementUSD: -40, breakoutState: 'BREAKOUT_BEAR' },
  multiTimeframeAlignment: { tf15s: 'BEARISH', tf30s: 'BEARISH', tf1m: 'BEARISH', tf5m: 'NEUTRAL', tf15m: 'NEUTRAL', momentumClassification: 'STABLE' } };
const BU = by(run(bull, 'UP'));
const BD = by(run(bull, 'DOWN'));
const MD = by(run(bear, 'DOWN'));
const BN = by(run(bull, 'NEUTRAL'));
for (const n of ['Momentum', 'Trend', 'Order Flow']) {
  t.eq(`${n}: bull reading supports UP`, BU[n].aligned, true);
  t.eq(`${n}: bull reading does not support DOWN`, BD[n].aligned, false);
  t.check(`${n}: bull reading scores lower for DOWN than for UP`, BD[n].score < BU[n].score, `${BD[n].score} vs ${BU[n].score}`);
  t.eq(`${n}: mirrored bear reading scores DOWN exactly as bull scores UP`, MD[n].score, BU[n].score);
  t.check(`${n}: no side -> no score and no support`, BN[n].score === null && BN[n].aligned === false);
}

t.section('server: labels and defaults');
t.check('ORDER_FLOW family is not labelled taker flow', !serverSrc.includes('`Taker: ${bullVolPct}% Bull'));
t.check('tailwind does not claim aggressive taker flow', !serverSrc.includes('Aggressive taker flow'));
t.check('both name measured Coinbase taker flow',
  serverSrc.includes('Coinbase taker flow 60s: buy ') && serverSrc.includes('Coinbase taker flow backs'));
const p0 = serverSrc.indexOf('  const lockedPred = isLocked');
const p1 = serverSrc.indexOf('  const regimeVal', p0);
t.check('prediction block found', p0 > 0 && p1 > p0);
t.check('15m/current invents no side, probability or confidence',
  !/\|\|\s*(75\b|0\.6\b|"UP"|"BUY UP")/.test(stripComments(serverSrc.slice(p0, p1))));
t.check('/api/signal claims no 8/8 algorithms', !serverSrc.includes('8/8 Algorithms'));
t.check('calibrationVersion has no invented 148', !/calibrationSampleSize \|\| 148/.test(serverSrc));

t.section('client: computeEvidenceVectors (real function)');
const evSrc = readRepoFile('src/utils/evidenceVectors.ts');
const { computeEvidenceVectors: compute } = loadCjs(transformSync(evSrc, { loader: 'ts', format: 'cjs' }).code);
const nullSubs = compute({ direction: 'UP', confidence: 52, lockScore: 80, regime: 'RANGE_BOUND', currentSpot: 80000, openStrike: 79990, evidence: { subScores: run(null, 'UP') } }, 'LIVE');
t.check('engine sub-scores without a reading -> every vector unscored', nullSubs.vectors.every((v) => v.score === null && !v.aligned));
t.eq('...composite absent, not averaged from invented values', nullSubs.compositeScore, null);
t.check('...the engine\'s own reason is shown', by(nullSubs.vectors).Momentum.detail === 'No engine reading');
const bare = compute({ direction: 'UP', confidence: 88, lockScore: 90, regime: 'RANGE_BOUND' }, 'LIVE');
t.check('no sub-scores or factors -> nothing derived from confidence, lockScore or regime', bare.vectors.every((v) => v.score === null));
const noStrike = compute({ direction: 'UP', currentSpot: 80000, openStrike: null }, 'LIVE');
t.eq('missing strike does not read as spot above strike', by(noStrike.vectors).Trend.score, null);
const measured = compute({ direction: 'DOWN', currentSpot: 79900, openStrike: 80000 }, 'LIVE');
t.eq('measured spot below strike still supports DOWN', by(measured.vectors).Trend.aligned, true);
t.check('no staged CVD / volume-expansion / regime story in the client',
  !evSrc.includes('Cumulative volume delta (CVD)') && !evSrc.includes('Volume expansion 1.25x') && !evSrc.includes('Expected move coverage optimal'));
t.check('no invented factor scores or default alignment', !/\.score \?\? \d/.test(evSrc) && !/\.aligned \?\? true/.test(evSrc));
const withLive = by(compute({ direction: 'UP', confidence: 52, evidence: { subScores: run(live, 'UP') } }, 'LIVE').vectors);
t.eq('computed sub-scores pass through', withLive.Volume.score, 9.5);
t.eq('...and neutral taker flow is not aligned', withLive['Order Flow'].aligned, false);

t.done();
