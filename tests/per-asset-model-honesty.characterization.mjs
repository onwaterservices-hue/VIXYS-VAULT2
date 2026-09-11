// Asset comparison surfaces must not present a model VIXY does not have.
// Before this test, Compare, Markets, search and the Opportunity Scanner all
// rendered a static per-asset table (confidences, edges, taker splits, whale
// orders, a buy/sell bias and months-old prices) as if it were live output.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('per-asset-model-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const compare = strip(readRepoFile('src/components/CompareView.tsx'));
const markets = strip(readRepoFile('src/components/MarketCardsView.tsx'));
const search = strip(readRepoFile('src/components/SmartSearchModal.tsx'));
const scanner = strip(readRepoFile('src/components/OpportunityScannerView.tsx'));
const tape = strip(readRepoFile('src/hooks/useAssetMarketTape.ts'));
const app = readRepoFile('src/App.tsx');

// --- No static per-asset model numbers anywhere --------------------------
for (const [name, src] of [
  ['CompareView', compare],
  ['MarketCardsView', markets],
  ['SmartSearchModal', search],
  ['OpportunityScannerView', scanner],
]) {
  t.check(`${name} renders no static per-asset confidence`, !src.includes('prediction.confidence'));
  t.check(`${name} renders no static per-asset edge`, !src.includes('prediction.edgePct'));
}

// --- Compare ----------------------------------------------------------------
t.check('Compare renders no static order flow', !compare.includes('config.orderFlow'));
t.check('Compare renders no static whale orders', !compare.includes('config.whales'));
t.check(
  'Compare renders no static microstructure text',
  !compare.includes('config.patterns') && !compare.includes('Active microstructure scan confirms')
);
t.check('Compare no longer appends a hardcoded (BULLISH)', !compare.includes('(BULLISH)'));
t.check(
  'Compare labels book depth as resting, not taker flow',
  compare.includes('Resting book depth') && !compare.includes('Taker Buyers:') && !compare.includes('Taker Sellers:')
);
t.check('Compare reads price from live spot, not the static table', !compare.includes('config.price') && compare.includes('spotPrices'));
t.check('Compare shows the engine only for BTC', compare.includes("configA.symbol === 'BTC' ? engineDecision : null"));

// --- Markets ----------------------------------------------------------------
t.check('Markets has no fallback to static prices', !markets.includes(': asset.price') && !markets.includes(': asset.change24h'));
t.check('Markets no longer claims scraped AI confidence', !markets.includes('instant AI confidence'));

// --- Search -----------------------------------------------------------------
t.check('Search shows no static price', !search.includes('asset.price'));

// --- Scanner ----------------------------------------------------------------
const scannerFiction = ['$64,120.50', '+14.2%', 'SIGNAL: YES', 'SIGNAL: NO', 'Confluence', '🥇', 'DEMO BACKTEST'];
for (const f of scannerFiction) {
  t.check(`Scanner has no fabricated value: ${f}`, !scanner.includes(f));
}
t.check('Scanner reads live spot', scanner.includes('fetchAllCryptoTickers'));
t.check('Scanner marks non-BTC assets unranked', scanner.includes('UNRANKED'));
t.check('Scanner states what it does not have', scanner.includes('What this scanner does not have'));

// --- Tape hook --------------------------------------------------------------
t.check('tape hook reads the real Coinbase-backed routes', tape.includes('/api/orderflow') && tape.includes('/api/whales'));
t.check('tape hook reports unavailable instead of padding', tape.includes("'UNAVAILABLE'"));
t.check(
  'tape hook drops prints without a known aggressor',
  tape.includes("o.takerSide === 'BUY' || o.takerSide === 'SELL'")
);

// --- Wiring -----------------------------------------------------------------
t.check(
  'App passes the live engine decision to Compare, Markets, Scanner, the Scalping desk, Patterns and Explainability',
  (app.match(/engineDecision=\{canonical15m\.decision\}/g) || []).length === 6
);
t.check('App passes live spot to Compare', app.includes('spotPrices={spotPrices}'));

t.done();
