// CHARACTERIZATION -- /api/venues/polymarket does not invent prices when the fetch fails.
//
// On any Polymarket fetch failure the route answered status "ACTIVE" with
// impliedYesPct 52, impliedNoPct 48, yesSharePriceUSD 0.52 and noSharePriceUSD
// 0.48 -- prices no venue quoted. /api/venues/kalshi already reports
// "DATA UNAVAILABLE" in the same situation.
import { serverSrc, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('polymarket-unavailable-honesty.characterization');
const a = serverSrc.indexOf('app.get("/api/venues/polymarket", async (req, res) => {');
const b = serverSrc.indexOf('\n});\n', a);
t.check('route found', a > 0 && b > a);
const body = serverSrc.slice(a, b + '\n})'.length).replace(/^app\.get\("\/api\/venues\/polymarket",\s*/, '').replace(/\)\s*$/, '');
const js = transformSync(`module.exports = async (fetchWithTimeout) => { let out; const res = { json: (x) => { out = x; return x; } }; await (${body})({}, res); return out; };`, { loader: 'ts', format: 'cjs' }).code;
const m = { exports: {} };
new Function('module', 'exports', js)(m, m.exports);

const failed = await m.exports(async () => { throw new Error('network down'); });
t.eq('fetch failure -> DATA UNAVAILABLE, not ACTIVE', failed.status, 'DATA UNAVAILABLE');
t.eq('...not live', failed.isLive, false);
t.eq('...no markets', Array.isArray(failed.markets) && failed.markets.length, 0);
t.check('...and no invented prices', !('impliedYesPct' in failed) && !('yesSharePriceUSD' in failed) && !JSON.stringify(failed).includes('0.52'));
const nonOk = await m.exports(async () => ({ ok: false, json: async () => ({}) }));
t.eq('non-200 response -> DATA UNAVAILABLE', nonOk.status, 'DATA UNAVAILABLE');
const ok = await m.exports(async () => ({ ok: true, json: async () => [{ question: 'real market' }] }));
t.eq('successful fetch still reports ACTIVE', ok.status, 'ACTIVE');
t.eq('...with the venue markets', ok.markets[0].question, 'real market');

t.done();
