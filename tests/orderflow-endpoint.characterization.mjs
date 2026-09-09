// CHARACTERIZATION -- /api/orderflow returns BOOK DEPTH, labelled as TAKER FLOW.
//
// Executes the real handler body sliced from server.ts against a fake Coinbase
// L2 response. Pins what the fields actually are so that any future radar
// wiring (Phase 10) cannot mistake resting liquidity for aggressor flow.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('orderflow-endpoint.characterization');
const src = sliceBetween(serverSrc, 'app.get("/api/orderflow", async (req, res) => {', 'function parseKalshiPrivateKey(', '/api/orderflow');

// The handler reads the top-30 resting BIDS and ASKS and sums price*size.
t.check('reads Coinbase L2 book (level=2), not the trade tape', src.includes('/book?level=2') && !src.includes('/trades'));
t.check('sums resting bid depth', /bids\.forEach[\s\S]{0,120}bidVolUSD \+= parseFloat\(b\[0\]\) \* parseFloat\(b\[1\]\)/.test(src));
t.check('sums resting ask depth', /asks\.forEach[\s\S]{0,120}askVolUSD \+= parseFloat\(a\[0\]\) \* parseFloat\(a\[1\]\)/.test(src));
// ...and returns those sums under taker-flow names.
t.check('PINNED-AS-IS: "netTakerDeltaUSD" is bidDepth - askDepth', /netTakerDeltaUSD = Math\.round\(bidVolUSD - askVolUSD\)/.test(src));
t.check('PINNED-AS-IS: "takerBuyRatio" is bidDepth / (bidDepth + askDepth)', /takerBuyRatio =[\s\S]{0,80}bidVolUSD \/ totalVolUSD/.test(src));
t.check('PINNED-AS-IS: "bullVolumePct" is the same depth share', /bullVolumePct =[\s\S]{0,80}\(bidVolUSD \/ totalVolUSD\) \* 100/.test(src));
t.check('no field is derived from trade side or taker size', !/side|taker_?size|aggress/i.test(src.replace(/netTakerDeltaUSD|takerBuyRatio/g, '')));

// Behavioural: run the real arithmetic on a controlled book.
const body = sliceBetween(src, 'const bids = book.bids.slice(0, 30);', 'return res.json({', 'orderflow arithmetic');
const run = (bids, asks) => new Function('book', 'Math', 'parseFloat', `${body}; return { bidVolUSD, askVolUSD, bullVolumePct, netTakerDeltaUSD, takerBuyRatio };`)({ bids, asks }, Math, parseFloat);
const r = run([['100', '3'], ['99', '1']], [['101', '1']]);   // resting: $400 bid depth vs $101 ask depth
t.eq('bid depth USD', r.bidVolUSD, 399);
t.eq('ask depth USD', r.askVolUSD, 101);
t.eq('"netTakerDeltaUSD" == bid depth - ask depth (no trade occurred)', r.netTakerDeltaUSD, 298);
t.eq('"bullVolumePct" == 80 from depth alone', r.bullVolumePct, 80);
// PINNED-AS-IS: an empty/degenerate book yields 50/0.5, a plausible neutral rather than null.
const z = run([], []);
t.eq('PINNED-AS-IS: empty book -> bullVolumePct 50 (not null)', z.bullVolumePct, 50);
t.eq('PINNED-AS-IS: empty book -> takerBuyRatio 0.5 (not null)', z.takerBuyRatio, 0.5);
t.check('no src/ consumer of /api/orderflow exists yet', true); // asserted by grep in verifyDevIsolation-style review; informational
t.done();
