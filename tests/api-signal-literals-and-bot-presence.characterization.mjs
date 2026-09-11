// CHARACTERIZATION -- /api/signal serves no literal penalty, evidence matrix or 50/50 defaults;
// the bot presence names only registered commands.
//
// The public /api/signal route served correlationPenalty "ACTIVE (-3.2%)" (a literal), an
// evidenceMatrix of ten rows with fixed strengths whose bias mostly echoed the call itself plus
// constant "Liquidity HIGH" / "Spread quality OPTIMAL", and upProbability / downProbability /
// evidenceQuality of 50 whenever the feed was not live. The Discord bot presence advertised
// /dashboard and /predict; only /ping is registered.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('api-signal-literals-and-bot-presence.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('/api/signal payload');
{
  const src = strip(serverSrc);
  t.check('no literal correlation penalty', !src.includes('ACTIVE (-3.2%)') && /correlationPenalty: null,/.test(src));
  t.check('evidenceMatrix is null, not fixed rows', /evidenceMatrix: null,/.test(src) && !/evidenceMatrix: isLive/.test(src));
  t.check('no constant Liquidity HIGH / Spread quality OPTIMAL rows', !/name: "Liquidity", strength: "\+\+\+", bias: "HIGH"/.test(src) && !/name: "Spread quality"/.test(src));
  t.check('no 50 defaults for up/down probability or evidence quality', !/Math\.round\(\(1 - displayProb\) \* 1e3\) \/ 10\s*:\s*50,/.test(src) && !src.includes('evidenceQuality: isLive ? evidenceQuality : 50'));
  const api = readRepoFile('src/services/api.ts');
  t.check('client types admit null', api.includes('upProbability?: number | null;') && api.includes('evidenceMatrix?: Array<{ name: string; strength: string; bias: string }> | null;'));
}

t.section('bot presence');
{
  const client = strip(readRepoFile('src/bot/client.ts'));
  const index = readRepoFile('src/bot/index.ts');
  t.check('presence names no unregistered commands', !/\/dashboard|\/predict/.test(client) && client.includes("'VIXY 15M BTC locks | /ping'"));
  t.check('/ping is registered', index.includes("setName('ping')"));
}

t.done();
