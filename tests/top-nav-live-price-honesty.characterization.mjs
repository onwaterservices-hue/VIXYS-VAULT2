// CHARACTERIZATION -- the top nav ticker shows live quotes only.
//
// TopNavControls fell back to ASSET_DATABASE's static price and 24h change
// (BTC $64,161.40 +3.42%, ETH $3,482.50 +4.85%, ...) whenever the live spot feed
// had not answered, presenting months-old numbers as the market.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('top-nav-live-price-honesty.characterization');
const src = readRepoFile('src/components/TopNavControls.tsx').replace(/\/\/[^\n]*/g, '');

t.check('no static price fallback', !/\?\?\s*asset\.price/.test(src));
t.check('no static 24h change fallback', !/\?\?\s*asset\.change24h/.test(src));
t.check('no other static price or change read', !/\b(asset|activeConfig)\.(price|change24h)\b/.test(src));
t.check('missing price renders a dash', /displayPrice === null\s*\?\s*'—'/.test(src));
t.check('missing change renders a dash', /displayChange === null \? '—'/.test(src));

t.done();
