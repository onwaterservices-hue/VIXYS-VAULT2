// CHARACTERIZATION -- Discord lock embeds do not present the engine score as a probability.
//
// Both subscriber embeds printed the raw engine score as "AI Confidence 91%" and
// the model probability as "Locked P(win)". Across 150 settled locks
// (2026-09-11) scores of 80-85 won 52.9%, 85-90 won 61.5% and 90-95 won 82.1%;
// model P(win) 65-70% won 46.2%. The embeds now label the score as a score, show
// the measured win rate of its bucket from the ledger (or that the bucket is too
// thin), and mark the model probability uncalibrated.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serverSrc, readRepoFile, ROOT, createHarness } from './_engineSource.mjs';

const t = createHarness('discord-embed-calibration-honesty.characterization');
const dir = mkdtempSync(join(tmpdir(), 'vixy-embed-'));
const out = join(dir, 'signalEmbed.mjs');
// discord.js is replaced by a minimal EmbedBuilder so the real field logic runs
// without resolving the package from a temp directory.
const discordStub = {
  name: 'discord-stub',
  setup(b) {
    b.onResolve({ filter: /^discord\.js$/ }, () => ({ path: 'discord.js', namespace: 'discord-stub' }));
    b.onLoad({ filter: /.*/, namespace: 'discord-stub' }, () => ({
      loader: 'js',
      contents: `export class EmbedBuilder {
        constructor() { this.data = { fields: [] }; }
        setTitle(v) { this.data.title = v; return this; }
        setColor(v) { this.data.color = v; return this; }
        setDescription(v) { this.data.description = v; return this; }
        addFields(...f) { this.data.fields.push(...f.flat()); return this; }
        setFooter(v) { this.data.footer = v; return this; }
        setTimestamp() { this.data.timestamp = 'now'; return this; }
        toJSON() { return this.data; }
      }`,
    }));
  },
};
await build({ entryPoints: [join(ROOT, 'src/bot/embeds/signalEmbed.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, plugins: [discordStub], logLevel: 'silent' });
const { createFreeSignalEmbed, createVipSignalEmbed } = await import(pathToFileURL(out).href);

const base = (prediction) => ({
  asset: 'BTC/USDT 15M', symbol: 'BTC/USDT 15M', price: 77250, change24h: 0, high24h: 77250, low24h: 77250, volume24h: 0, lastFetchedAt: Date.now(),
  prediction: { direction: 'BULLISH', confidence: 88, reasoning: 'QUALIFIED_AUTHORITATIVE_ENTRY', momentumScore: 0, whalePressureScore: 0, liquidityScore: 0,
    volatility: 'MEDIUM', riskLevel: 'MODERATE', targetPrice: 77200, brierScore: 0, accuracy: 0, totalSettled: 0,
    lockedProbability: 0.72, lockedAt: '2026-09-11T06:36:24.000Z', lockRule: 'QUALIFIED_AUTHORITATIVE_ENTRY', strike: 77200, ...prediction },
});
const fields = (embed) => Object.fromEntries((embed.toJSON().fields || []).map((f) => [f.name, f.value]));

t.section('calibrated bucket');
for (const [name, make] of [['FREE', createFreeSignalEmbed], ['ELITE', createVipSignalEmbed]]) {
  const f = fields(make(base({ scoreWinRatePct: 61.5, scoreWinRateSampleSize: 52, scoreBucket: '85-90%' })));
  t.check(`${name}: no "AI Confidence" percentage`, !Object.keys(f).some((k) => /AI Confidence/.test(k)));
  t.eq(`${name}: engine score shown as a score`, f['Engine score'], '`88 / 100`');
  t.eq(`${name}: measured win rate of the bucket`, f['Win rate at this score'], '`61.5%` of 52 settled locks (score 85-90)');
  t.eq(`${name}: model probability marked uncalibrated`, f['Model P(win), uncalibrated'], '`72%`');
  t.check(`${name}: no bare "Locked P(win)"`, !('Locked P(win)' in f));
}

t.section('thin or missing bucket');
{
  const thin = fields(createVipSignalEmbed(base({ scoreWinRatePct: null, scoreWinRateSampleSize: 9, scoreBucket: '75-80%' })));
  t.eq('thin bucket says so, no rate', thin['Win rate at this score'], 'Not enough settled locks at this score yet (9)');
  const none = fields(createFreeSignalEmbed(base({})));
  t.eq('no calibration data -> "Not measured"', none['Win rate at this score'], 'Not measured');
}

t.section('server passes the measured rate');
{
  const i = serverSrc.indexOf('async function attemptDiscordSignalBroadcast(');
  const fn = serverSrc.slice(i, serverSrc.indexOf('\n}\n', i));
  t.check('ledger hydrated before calibration', /await ensureLedgerFresh\(\);[\s\S]*getCalibratedConfidence\(conf\)/.test(fn));
  t.check('only a CALIBRATED bucket supplies a rate', fn.includes('scoreCalibration.status === "CALIBRATED" ? scoreCalibration.calibrated : null'));
  t.check('bot forwards it to the embed data', readRepoFile('src/bot/index.ts').includes("scoreWinRatePct: typeof signalData.scoreWinRatePct === 'number' ? signalData.scoreWinRatePct : null,"));
}

rmSync(dir, { recursive: true, force: true });

t.section('free upsell names only what ELITE receives');
{
  const probe = { scoreWinRatePct: 61.5, scoreWinRateSampleSize: 52, scoreBucket: '85-90%' };
  const free = fields(createFreeSignalEmbed(base(probe)));
  const vipNames = Object.keys(fields(createVipSignalEmbed(base(probe)))).join(' | ');
  const locked = free['🔒 Full trade released to VIXY ELITE'] || '';
  t.check('no Risk Rating or Live Position Updates promised', !/Risk Rating|Live Position Updates/.test(locked));
  t.check('locked entry exists in the ELITE embed', /Entry/.test(locked) && /ENTRY/.test(vipNames));
  t.check('locked stop loss exists in the ELITE embed', /Stop loss/.test(locked) && /STOP LOSS/.test(vipNames));
  t.check('locked target exists in the ELITE embed', /Target/.test(locked) && /TARGET/.test(vipNames));
  t.check('locked lock rule exists in the ELITE embed', /Lock rule/.test(locked) && /Lock rule/.test(vipNames));
  const pitch = Object.values(free).join('\n');
  t.check('no exits, VIXY Protection or institutional-intelligence promise', !/\bexits\b|VIXY Protection|institutional intelligence/i.test(pitch));
  t.check('score band is not printed as a percent', !/\(score \d+-\d+%\)/.test(pitch));
}

t.done();
