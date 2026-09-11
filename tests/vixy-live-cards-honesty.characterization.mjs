// VIXY Live module cards must show observed data. The Discord bot's dashboard
// link opens this workspace. Before this test its cards showed a multi-timeframe
// matrix of invented confidences, Polymarket odds VIXY has no feed for, whale
// prints of "+45.2 BTC", a trade tape built from fixed offsets around spot,
// a cycle history of four winning trades with P&L, an 84.2% performance figure,
// a lock alert at $64,552.70, sentiment and funding rates, a static watchlist,
// strikes derived as spot minus $38.50, and a 64,591.20 price fallback. App also
// seeded the shared ticker from a static asset table before any venue answered.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('vixy-live-cards-honesty.characterization');

const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('{/*');
    })
    .join('\n');

const mc = strip(readRepoFile('src/components/vixy-live-workspace/ModuleCards.tsx'));
const cfg = readRepoFile('src/config/vixyLiveModules.ts');
const app = readRepoFile('src/App.tsx');

t.section('no invented card content');
for (const lit of [
  '64591.20', '- 38.50', "'+1.85%'", '|| 1.85', '?? 78', '|| 78', '?? 22', 'evidenceAlignment ?? 8',
  'HARD STOP AT 62%', '100% MAXIMUM', '$63,890', '$65,240', '2.1% MEDIUM', '[42, 55, 48', '$64,480',
  'BANDWIDTH 3.2%', 'BULLISH DIVERGENCE', 'EXPANSION PHASE ACTIVE', 'ITM (+0.84σ)', 'Multi-venue taker flow alignment',
  "conf: '82%'", '100% BULLISH HARMONY', 'PASS (+$28M)', 'STRONG VERIFICATION', 'UP 59% (+$420K)', '+1.2% BULLISH PREM',
  'GREED (74/100)', '+0.010% / 8h', '+45.2 BTC', 'BULL FLAG FORMATION', '84% VALIDITY', '>14ms<', '&lt; 150ms',
  "'12.45 BTC'", '+84% BUY DELTA', '100 HZ LOOP', '99.8%', '8.2ms', '4/4 WIN STREAK', '87.5% (21/24)', '84.2%',
  '2.48 PF', '$64,552.70', 'CVD surge +$14M', '3482.10', '148.70', '$64.5K', 'KALSHI DIRECT', '+4.2 pts', 'HIGH TIER',
]) {
  t.check(`no fabricated literal "${lit}"`, !mc.includes(lit));
}
t.check('keeps the engine-semantics pin: no "EMA 9" literal', !mc.includes('EMA 9'));

t.section('cards read observed sources');
t.check('spot comes from the engine or the ticker, never a literal', mc.includes('const spotOf = ') && mc.includes("posNum(canonical15m?.currentSpot) ?? posNum(ticker?.price)"));
t.check('strike is the Kalshi open strike or null', mc.includes('const strikeOf = ') && !/openStrike \|\| \(/.test(mc));
t.check('large prints come from the live Coinbase tape', mc.includes("useAssetMarketTape('BTC')"));
t.check('candle cards read real 1-minute candles', mc.includes('/api/crypto/klines?symbol=') && mc.includes('interval=1m'));
t.check('history and performance read the lock ledger', mc.includes("fetch('/api/signal/resolved-log?limit=8'") && mc.includes('stats?.perAsset?.BTC'));
t.check('watchlist reads live tickers', mc.includes('fetchAllCryptoTickers()'));
t.check('headline and lock status come from shared semantics', mc.includes('headline(c)') && mc.includes('lockStatusOf(c)'));
t.check('Polymarket is stated as having no feed', mc.includes('>no feed<'));
t.check('sentiment is stated as not measured', mc.includes('NO SENTIMENT FEED'));
t.check('the 1-minute card states there is no 1-minute model', mc.includes('VIXY has no 1-minute model.'));
t.check('pattern card says rules, not predictions, with no win rate', mc.includes('RULES, NOT PREDICTIONS') && mc.includes('NOT MEASURED'));
t.check('notes start empty', mc.includes("localStorage.getItem('vixy_live_desk_notes') || ''"));

t.section('module library copy');
for (const lit of ['Polymarket prediction market odds comparison', 'head & shoulders', 'Kalshi execution', 'WebSocket stream latency', 'fear/greed', 'win streak', 'Neural evidence synthesis']) {
  t.check(`library no longer claims "${lit}"`, !cfg.includes(lit));
}

t.section('App ticker seed');
t.check('no static asset table seed', !app.includes('activeAssetConfig') && !app.includes('ASSET_DATABASE') && !app.includes('volume24h: 28410.5'));
t.check('ticker starts with no price', app.includes('price: 0,\n    change24h: Number.NaN,'));

t.done();
