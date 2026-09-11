// CHARACTERIZATION -- the Bot Hub offers no fake actions and claims no unmeasured state.
//
// "UNFREEZE ALL BOTS" posted to /api/admin/unfreeze-bots (no such route) and
// unfreezeUserBotsApi returned { success: true, "All local and remote user bots
// successfully unfrozen and active!" } when the request threw; the Hub fell back to
// the same text on a 404. The slash-command directory advertised /predict, /price,
// /status, /vip and /leaderboard after they were removed; "QUEUE WORKER ACTIVE •
// 15S INGEST", "zero active system exceptions", a pinging "SSE ACTIVE" (the Hub
// never opens the stream) and "Zero Latency" described nothing measured.
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('bot-hub-no-invented-status.characterization');
const stripJsx = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const hub = stripJsx(readRepoFile('src/components/DiscordBotHubView.tsx'));
const api = readRepoFile('src/services/api.ts');
const admin = readRepoFile('src/components/AdminPanel.tsx');

t.section('no fake unfreeze action');
t.check('(still true) the server has no unfreeze route', !serverSrc.includes('/api/admin/unfreeze-bots'));
t.check('no client function', !api.includes('unfreezeUserBotsApi') && !api.includes('successfully unfrozen'));
t.check('no hub button, handler or banner', !/unfreeze/i.test(hub));
t.check('no AdminPanel import', !admin.includes('unfreezeUserBotsApi'));

t.section('slash-command directory matches what is registered');
t.check('lists /ping', hub.includes('<span>/ping</span>'));
t.check('no removed commands', !/\/predict|\/price \[asset\]|<span>\/status<\/span>|<span>\/vip<\/span>|\/leaderboard|verified win rates/.test(hub));
t.check('(still true) /ping is the only registered command', (readRepoFile('src/bot/index.ts').match(/setName\('/g) || []).length === 1);

t.section('no unmeasured status claims');
t.check('no queue-worker claim', !hub.includes('QUEUE WORKER ACTIVE') && !hub.includes('decoupled Stripe-to-Discord entitlement queue'));
t.check('probe badge reads liveProbeRan', hub.includes("{diagnostics?.liveProbeRan ? 'LIVE PROBE RAN' : 'PROBE UNAVAILABLE'}"));
t.check('no zero-exceptions claim', !hub.includes('zero active system exceptions') && hub.includes('No bot error reported.'));
t.check('no SSE ACTIVE badge on a list loaded once', !hub.includes('SSE ACTIVE') && hub.includes('LOADED ON REFRESH'));
t.check('no Zero Latency', !hub.includes('Zero Latency'));

t.done();
