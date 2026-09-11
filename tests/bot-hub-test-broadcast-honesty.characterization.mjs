// CHARACTERIZATION -- a Bot Hub test broadcast cannot read as a real lock.
//
// The Bot Hub sent an invented $64,821.50 spot, $65,120 target, confidence 89 and
// "Institutional taker buy delta spike (+1,420 BTC)" rationale to
// /api/discord/test-broadcast, which posted them through the real publisher (ELITE
// by default -> #premium-signals) as a lock embed. Its preview card showed the
// same staged signal.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serverSrc, readRepoFile, ROOT, createHarness } from './_engineSource.mjs';

const t = createHarness('bot-hub-test-broadcast-honesty.characterization');
const strip = (x) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/[^\n]*/g, '');

t.section('test embed (real code)');
const dir = mkdtempSync(join(tmpdir(), 'vixy-testembed-'));
const out = join(dir, 'signalEmbed.mjs');
const discordStub = { name: 'discord-stub', setup(b) {
  b.onResolve({ filter: /^discord\.js$/ }, () => ({ path: 'discord.js', namespace: 'discord-stub' }));
  b.onLoad({ filter: /.*/, namespace: 'discord-stub' }, () => ({ loader: 'js', contents: `export class EmbedBuilder {
    constructor() { this.data = { fields: [] }; }
    setTitle(v) { this.data.title = v; return this; } setColor(v) { this.data.color = v; return this; }
    setDescription(v) { this.data.description = v; return this; } addFields(...f) { this.data.fields.push(...f.flat()); return this; }
    setFooter(v) { this.data.footer = v; return this; } setTimestamp() { return this; } toJSON() { return this.data; } }` }));
} };
await build({ entryPoints: [join(ROOT, 'src/bot/embeds/signalEmbed.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, plugins: [discordStub], logLevel: 'silent' });
const { createTestSignalEmbed } = await import(pathToFileURL(out).href);
const e = createTestSignalEmbed({ asset: 'BTC', symbol: 'BTC', price: 77315.29, prediction: {} }, 'ELITE').toJSON();
t.check('title says TEST and not a signal', /TEST BROADCAST/.test(e.title) && /NOT A SIGNAL/.test(e.title));
t.check('says no lock was made', e.description.includes('No lock was made'));
t.check('carries the live spot', e.description.includes('$77,315.29'));
t.eq('no score, probability, entry, stop or target fields', (e.fields || []).length, 0);
rmSync(dir, { recursive: true, force: true });

t.section('server route');
{
  const a = serverSrc.indexOf('"/api/discord/test-broadcast"');
  const route = strip(serverSrc.slice(a, serverSrc.indexOf('\n);\n', a)));
  t.check('always marks the broadcast as a test', route.includes('test: true,') && route.includes('reasoning: "TEST_BROADCAST",'));
  t.check('uses the live price, not a client-sent one by default', route.includes('currentBtcPrice > 0 ? currentBtcPrice : NaN'));
  t.check('no client-supplied confidence', route.includes('confidence: 0,') && !/body\.confidence/.test(route));
  t.check('bot routes test broadcasts to the TEST embed', readRepoFile('src/bot/index.ts').includes('signalData.test === true\n    ? createTestSignalEmbed(marketData, tier)'));
}

t.section('Bot Hub view');
{
  const v = strip(readRepoFile('src/components/DiscordBotHubView.tsx'));
  for (const lit of ['64821.5', '$64,821.50', '65120', '$65,120.00', '64500', '+1,420 BTC', '89.4%', 'confidence: 89', 'Broadcast Live Signal Embed'])
    t.check(`no staged value: ${lit}`, !v.includes(lit));
  t.check('test request is marked test', /sendDiscordTestBroadcastApi\(\{[\s\S]*?test: true,/.test(v));
  t.check('preview shows the TEST card', v.includes('🧪 TEST BROADCAST • NOT A SIGNAL'));
}

t.done();
