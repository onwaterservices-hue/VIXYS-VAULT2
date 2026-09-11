// CHARACTERIZATION -- market data is what a venue returned, or unavailable.
//
// fetchLiveMarketOverview (src/bot/services/marketData.ts) fed the hourly
// Discord market report (cron /api/cron/hourly-market). When Binance and
// Coinbase both failed it served a stale cache entry of any age, or else
// $64,821.50, +2.45% and 18,450 volume for every asset, with the 24h high/low at
// price +/-2%. Coinbase without an open read as 0% change. The hourly cache is
// per-instance, so a cold instance with a failed feed posted the invented
// numbers for BTC, ETH and SOL alike. The same result carried a "prediction"
// derived from the 24h change plus a fixed record (Brier 0.168, 71.8%, 18,427
// settled) rendered by slash commands that also served an invented leaderboard
// and analytics card. Those commands and embeds are removed; /ping stays.
import { existsSync } from 'fs';
import { join } from 'path';
import { transformSync } from 'esbuild';
import { readRepoFile, serverSrc, createHarness, ROOT } from './_engineSource.mjs';

const t = createHarness('market-quote-honesty.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n');
const src = readRepoFile('src/bot/services/marketData.ts');
const { code } = transformSync(src, { loader: 'ts', format: 'cjs' });

function load(fetchImpl) {
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', 'fetch', code)(mod, mod.exports, () => ({}), fetchImpl);
  return mod.exports;
}
const ok = (json) => ({ ok: true, json: async () => json });
const down = { ok: false, status: 451, json: async () => ({}) };
const binance = { lastPrice: '80123.40', priceChangePercent: '1.25', highPrice: '80900', lowPrice: '78800', volume: '15234.5' };
const coinbase = { last: '80000', open: '79000', high: '80500', low: '78900', volume: '9876.5' };
const venue = (b, c) => async (url) => (String(url).includes('binance') ? b : c);
const rejects = async (p) => { try { await p; return null; } catch (e) { return e; } };

t.section('venue readings pass through');
{
  const q = await load(venue(ok(binance), down)).fetchLiveMarketQuote('BTC');
  t.eq('Binance price', q.price, 80123.4);
  t.eq('Binance change', q.change24h, 1.25);
  t.eq('Binance high/low/volume', [q.high24h, q.low24h, q.volume24h].join(), '80900,78800,15234.5');
  t.eq('source named', q.source, 'BINANCE');
  t.check('no prediction attached', !('prediction' in q) && !('marketCap' in q));
}
{
  const q = await load(venue(down, ok(coinbase))).fetchLiveMarketQuote('ETH');
  t.eq('Coinbase fallback source', q.source, 'COINBASE');
  t.eq('Coinbase change from the real open', q.change24h, 1.27);
}

t.section('no invented values when venues fail');
{
  const partial = venue(ok({ ...binance, volume: undefined }), ok({ ...coinbase, open: undefined }));
  const e = await rejects(load(partial).fetchLiveMarketQuote('SOL'));
  t.check('incomplete tickers are unavailable, not filled in', !!e && /MARKET_DATA_UNAVAILABLE/.test(e.message));
}
{
  const e = await rejects(load(venue(down, down)).fetchLiveMarketQuote('BTC'));
  t.check('both venues down: unavailable', !!e && /MARKET_DATA_UNAVAILABLE/.test(e.message));
  t.check('the error carries no price', !!e && !/\d{4,}/.test(e.message));
}
{
  const e = await rejects(load(async () => { throw new Error('network'); }).fetchLiveMarketQuote('XRP'));
  t.check('network error: unavailable', !!e && /MARKET_DATA_UNAVAILABLE/.test(e.message));
}
{
  let calls = 0;
  const m = load(async (url) => { calls += 1; return String(url).includes('binance') ? ok(binance) : down; });
  await m.fetchLiveMarketQuote('BTC'); await m.fetchLiveMarketQuote('BTC');
  t.eq('a fresh reading is reused within 30s', calls, 1);
}
{
  let n = 0;
  const m = load(async (url) => { n += 1; return n === 1 && String(url).includes('binance') ? ok(binance) : down; });
  const first = await m.fetchLiveMarketQuote('DOGE');
  const realNow = Date.now; Date.now = () => realNow() + 31000;
  const e = await rejects(m.fetchLiveMarketQuote('DOGE'));
  Date.now = realNow;
  t.check('an expired reading is not served when the refetch fails', first.price === 80123.4 && !!e);
}
{
  const c = strip(src);
  t.check('no invented market literals', !/64821|\b2\.45\b|18450|0\.168|71\.8|18427|19800000/.test(c));
  t.check('the prediction-building overview helper is gone', !/fetchLiveMarketOverview/.test(c));
}

t.section('slash commands and embeds');
{
  const bot = strip(readRepoFile('src/bot/index.ts'));
  t.check('only /ping is registered', (bot.match(/setName\('/g) || []).length === 1 && bot.includes("setName('ping')"));
  t.check('no invented leaderboard, model label or latency', !/Whale_Hunter|leaderboard|v4\.3-INCREMENTAL|\|\| 12\}/.test(bot));
  t.check('no dispatchSignalPair', !bot.includes('dispatchSignalPair'));
  t.check('the lock broadcaster remains', bot.includes('export async function broadcastSignalToDiscord('));
  for (const f of ['embeds/dashboardEmbed.ts', 'embeds/marketAnalysisEmbed.ts', 'embeds/flowForgeEmbed.ts', 'embeds/predictionEmbed.ts', 'embeds/alertEmbed.ts', 'embeds/analyticsEmbed.ts', 'commands/dashboard.ts']) {
    t.check(`src/bot/${f} is removed`, !existsSync(join(ROOT, 'src/bot', f)));
  }
}

t.section('hourly market report');
{
  const s = strip(serverSrc);
  const i = s.indexOf('async function sendHourlyMarketDigestOnce()');
  const digest = s.slice(i, s.indexOf('__name(sendHourlyMarketDigestOnce', i));
  t.eq('reads venue quotes', (digest.match(/fetchLiveMarketQuote\("(BTC|ETH|SOL)"\)/g) || []).length, 3);
  t.check('a failed quote marks the hour FAILED and posts nothing', /catch \(err\)[\s\S]{0,200}status: "FAILED"/.test(digest) && digest.indexOf('fetchLiveMarketQuote') > 0 && digest.indexOf('fetchLiveMarketQuote') < digest.indexOf('Authorization:'));
  t.check('footer names the venue that answered', digest.includes('m.source === "BINANCE" ? "Binance" : "Coinbase"'));
}

t.done();
