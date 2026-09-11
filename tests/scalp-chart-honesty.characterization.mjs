// The 15-second desk chart must draw observed data only. Before this test it
// seeded random candles, opened a browser Binance socket that invented a taker
// ratio, defaulted to a 91.6% confidence and a 68% "bullish" probability,
// invented a strike 0.05% above spot, drew a "projected cone" from a fixed
// spread, and filled its panels with scripted catalysts and conviction events.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('scalp-chart-honesty.characterization');

const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('{/*');
    })
    .join('\n');

const chart = strip(readRepoFile('src/components/ScalpDecisionChart.tsx'));
const desk = strip(readRepoFile('src/components/ScalpingDeskView.tsx'));
const app = readRepoFile('src/App.tsx');

t.section('no synthetic market data');
t.check('no random numbers anywhere in the chart', !chart.includes('Math.random'));
t.check('no synthetic candle generator', !chart.includes('createRealisticCandles'));
t.check('no browser Binance REST or socket', !chart.includes('api.binance.com') && !chart.includes('fstream.binance.com') && !chart.includes('new WebSocket'));
t.check('no invented taker ratio', !chart.includes('takerBuyRatio') && !chart.includes('TAKER BUY') && !chart.includes('TAKER SELL'));
t.check('no ticker helper with static fallback prices', !chart.includes('fetchCryptoTicker'));
for (const lit of ['64200', '3480', '184.5', '0.62']) {
  t.check(`no literal seed price ${lit}`, !chart.includes(lit));
}

t.section('no invented model output');
for (const lit of [
  '91.6',
  '92.4',
  '? 74 : 68',
  'currentPrice * 1.0005',
  '+14.2% Net Edge',
  '-0.38% Net Move',
  'PROJECTED CONE',
  'AI CONE',
  'NEURAL',
  'Whale Taker Sweep',
  'Net Taker Delta',
  'CATALYST REASON',
  'Bullish Impulse Expansion',
  'Orderbook Imbalance Ribbon',
  'SUB-SECOND',
  'coneSpread',
  'PRIMARY EDGE',
]) {
  t.check(`no fabricated literal "${lit}"`, !chart.includes(lit));
}

t.section('observed sources');
t.check('candles are real 1-minute candles from the server route', chart.includes('/api/crypto/klines?symbol=') && chart.includes('interval=1m'));
t.check('a failed candle feed is reported, not replaced', chart.includes("setFeedStatus('UNAVAILABLE')") && chart.includes('Nothing is drawn in its place'));
t.check('the engine is shown only for BTC and only while LIVE', chart.includes("isBtc && engineFeedHealth === 'LIVE'"));
t.check('the headline comes from the shared engine semantics', chart.includes('headline(engineDecision)'));
t.check('a probability split needs a calibrated P(win) with a side', chart.includes("head?.kind === 'PWIN'") && chart.includes('side === \'UP\' ? head.value : 100 - head.value'));
t.check('an engine score is labelled as not a probability', chart.includes('This is not a probability'));
t.check('the strike is the engine open strike', chart.includes('engineDecision?.openStrike'));
t.check('the Kalshi price is shown only when the server marks it real', chart.includes('marketRead?.real === true'));
t.check('the edge is the server edge for the engine side only', chart.includes('edgeVsMarketPct') && chart.includes('isEngineSide && edgePts !== null'));
t.check('the trail is the engine conviction trail', chart.includes('engineDecision?.convictionTrail'));
t.check('the chips are the engine lock gate checks', chart.includes('engineDecision?.lockGate?.checks'));
t.check('non-BTC assets say there is no model', chart.includes('VIXY has no model for'));
t.check('the breakout marker is labelled as a fixed rule', chart.includes('fixed chart rule, not a model call'));
t.check('the time axis uses the candle timestamps', chart.includes('fmtClock(candles[idx].time)'));

t.section('wiring');
t.check('desk passes the engine to the chart', desk.includes('engineDecision={engineDecision}') && desk.includes('engineFeedHealth={engineFeedHealth}'));
t.check('desk copy no longer promises probability cones', !desk.includes('probability cones') && !desk.includes('ULTRA-FAST') && !desk.includes('PROBABILITY CONE'));
const deskMount = app.slice(app.indexOf('<ScalpingDeskView'), app.indexOf('/>', app.indexOf('<ScalpingDeskView')));
t.check('App passes the live engine to the scalping desk', deskMount.includes('engineDecision={canonical15m.decision}') && deskMount.includes('engineFeedHealth={canonical15m.dataHealthStatus}'));

t.done();
