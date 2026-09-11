// The API client must not return a price nobody quoted. Before this test the
// single-ticker helper fell back to BTC 64,591.20 (+1.85%, "implied YES 54")
// when every venue failed, the all-tickers helper to a static table starting
// at BTC 64,161.4, and every real ticker carried "market implied" YES/NO odds
// computed from the 24h price change, which are not market odds.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('ticker-fallback-honesty.characterization');
const api = readRepoFile('src/services/api.ts');

t.check('no static BTC fallback price', !api.includes('64591.20') && !api.includes('64161.4'));
t.check('no static price table', !api.includes('defaultPrices'));
t.check('no implied odds derived from the 24h change', !/marketImplied(Yes|No): Math\.(min|max)\(/.test(api) && !api.includes('marketImpliedYes: 54'));
t.check('single-ticker helper fails when no venue answers', api.includes('throw new Error(`No live ticker for ${cleanSymbol}`)'));
t.check('all-tickers helper returns an empty list when no venue answers', api.includes('// No venue answered: an empty list, never a static price table.\n  return [];'));

t.done();
