// /api/radar must be real, and /api/whales must label the aggressor correctly.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';
const t = createHarness('radar-endpoint.characterization');
const radar = sliceBetween(serverSrc, 'app.get("/api/radar", async (req, res) => {', 'app.get("/api/whales", async (req, res) => {', '/api/radar');
t.section('/api/radar draws only from Coinbase Exchange, or fails explicitly');
t.check('reads the L2 book', radar.includes('/book?level=2'));
t.check('reads real trades', radar.includes('/trades?limit=100'));
t.check('taker side: maker "sell" => taker BUY', radar.includes('takerSide: t.side === "sell" ? "BUY" : "SELL"'));
t.check('no Math.random', !radar.includes('Math.random'));
t.check('no sin/cos synthesis', !/Math\.(sin|cos)\(/.test(radar));
t.check('no invented confidence / entity / impact decorations', !/confidence:|entityName|impact:/.test(radar));
t.check('failure returns 503 RADAR_UNAVAILABLE, not a placeholder payload', (radar.match(/RADAR_UNAVAILABLE/g) || []).length >= 2 && radar.includes('status(503)'));
t.check('ratio is null when ask depth is 0 (not a default)', radar.includes('ratio: askDepthBTC > 0 ?') && radar.includes(': null'));
t.check('reports its own fetch latency and last-trade age', radar.includes('fetchMs: Date.now() - t0') && radar.includes('lastTradeAgeMs'));
// execute the tape mapping on a controlled trade
// Execute the real .map(...) arrow verbatim on a one-element array.
const mapSrc = sliceBetween(radar, '.map((t) => { const price = parseFloat(t.price), size = parseFloat(t.size); return {', '.filter((t) => Number.isFinite(t.price) && Number.isFinite(t.size));', 'tape map');
const mapFn = new Function('t', 'parseFloat', 'Date', 'Math', `return [t]${mapSrc}[0];`);
const buyTaker = mapFn({ trade_id: 1, price: '80000', size: '0.5', side: 'sell', time: '2026-09-09T00:00:00Z' }, parseFloat, Date, Math);
t.eq('maker "sell" print -> takerSide BUY', buyTaker.takerSide, 'BUY');
t.eq('usd = price * size', buyTaker.usd, 40000);
t.eq('venue is the real venue', buyTaker.venue, 'COINBASE');
t.section('/api/whales is real prints only — the fabricated fallback is gone for good');
const whales = sliceBetween(serverSrc, 'app.get("/api/whales", async (req, res) => {', 'function parseKalshiPrivateKey(', '/api/whales');
t.check('BUY_SWEEP now means maker "sell" (taker bought)', whales.includes('action: t.side === "sell" ? "BUY_SWEEP" : "SELL_DUMP"'));
t.check('takerSide carried explicitly', whales.includes('takerSide: t.side === "sell" ? "BUY" : "SELL"'));
t.check('no fabricated fallback array', !whales.includes('fallbackOrders'));
t.check('no invented entities — ever', !whales.includes('BlackRock') && !whales.includes('Institutional Volume Cluster') && !whales.includes('Apex Quant') && !whales.includes('Satoshi Era') && !whales.includes('entityName'));
t.check('no invented per-row confidence or impact', !/confidence: Math\.round/.test(whales) && !/impact:/.test(whales));
t.check('no fake venues on the whales route', !whales.includes('"Kalshi"') && !whales.includes('"Polymarket"') && !whales.includes('"Derive"'));
t.check('venue failure returns 503 WHALES_UNAVAILABLE, never a placeholder payload', (whales.match(/WHALES_UNAVAILABLE/g) || []).length >= 2 && whales.includes('status(503)'));
t.check('an empty result is returned honestly (no length>0 gate hiding it)', !whales.includes('whaleTrades.length > 0') && whales.includes('count: whaleTrades.length'));
t.check('threshold is a parameter, reported back to the caller', whales.includes('const minUSD') && whales.includes('thresholdUSD: minUSD'));
t.check('size tier is a labeled deterministic rule over observed notional', whales.includes('sizeTier:'));
t.check('taker buy share computed only from observed prints, null when empty', whales.includes('takerBuyShare: buyUSD + sellUSD > 0 ?') && whales.includes(': null'));
t.done();
