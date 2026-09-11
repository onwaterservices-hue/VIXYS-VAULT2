// CHARACTERIZATION -- the Bot Hub and the bot's own slash commands report real state.
//
// DiscordBotHubView read BOT_CONNECTED, GUILD_FOUND, ROLE_FOUND, ROLE_MANAGEABLE,
// PENDING_COUNT, SUCCESS_COUNT, FAILED_COUNT, LAST_SYNC and LAST_ERROR off
// /api/discord/diagnostics. The route sends none of them (it sends
// botState.isReady, guildAccessible, hierarchySufficient, botHasManageRoles and a
// timestamp), so the hub always showed the bot OFFLINE, the guild NOT_FOUND, the
// elite role MISSING and every sync count 0, whatever Discord's real state was.
//
// discordBotService.ts registered its own /price, /predict, /status, /vip and
// /leaderboard: a confidence from the 24h change, a fixed 8.4% edge and 54/46
// Kalshi odds, "Brier 0.168 n=1,842", a v4.3-INCREMENTAL model at 71.8% over
// 18,427 cycles, and invented traders. Only /ping remains. The Sidebar showed a
// fixed "3" on Alerts.
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('discord-hub-real-diagnostics.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('Bot Hub reads fields the route sends');
const hub = readRepoFile('src/components/DiscordBotHubView.tsx');
t.check('no uppercase keys the route never sends', !/diagnostics\??\.[A-Z_]{3,}/.test(hub));
t.check('bot state from botState.isReady', hub.includes('tri(diagnostics?.botState?.isReady)'));
t.check('guild from guildAccessible', hub.includes('tri(diagnostics?.guildAccessible)'));
t.check('elite role from the probe rolesFound', hub.includes('tri(diagnostics?.rolesFound?.eliteRoleFound)'));
t.check('hierarchy needs both hierarchy and Manage Roles', hub.includes('diagnostics?.hierarchySufficient === true && diagnostics?.botHasManageRoles === true'));
t.check('a value the route did not send is UNKNOWN', (hub.match(/: 'UNKNOWN'\}/g) || []).length === 4);
t.check('no sync counts shown as 0', !/_COUNT \?\? 0/.test(hub));
t.check('last error from botState.lastError', hub.includes('diagnostics?.botState?.lastError ?'));
{
  const m = hub.match(/const tri = \(v: unknown\): 'yes' \| 'no' \| 'unknown' => (\(.*\));/);
  t.check('tri helper found', !!m);
  const tri = new Function('v', `return ${m[1]};`);
  t.eq('true -> yes', tri(true), 'yes');
  t.eq('false -> no', tri(false), 'no');
  t.eq('null (probe not run) -> unknown', tri(null), 'unknown');
  t.eq('missing -> unknown', tri(undefined), 'unknown');
}

t.section('the route sends what the hub reads');
{
  const s = serverSrc.indexOf('app.get("/api/discord/diagnostics"');
  const route = serverSrc.slice(s, serverSrc.indexOf('"/api/discord/test-broadcast"', s));
  for (const f of ['isReady: state.isReady,', 'lastError: state.lastError,', 'guildAccessible: live ? live.guildAccessible : null,',
    'hierarchySufficient: live ? live.hierarchySufficient : null,', 'botHasManageRoles: live ? live.botHasManageRoles : null,',
    'rolesFound: live ? live.rolesFound : null,', 'timestamp: new Date().toISOString(),']) {
    t.check(`route sends ${f.split(':')[0]}`, route.includes(f));
  }
}

t.section('bot service slash commands');
{
  const svc = strip(readRepoFile('src/bot/discordBotService.ts'));
  t.check('only /ping is registered', (svc.match(/\.setName\('/g) || []).length === 1 && svc.includes(".setName('ping')"));
  t.check('no invented analysis or record', !/Whale_Hunter|v4\.3-INCREMENTAL|0\.168|71\.8|18,427|n=1,842|\|\| 12\}|fetchCurrentPrice/.test(svc));
  t.check('role assignment and diagnostics remain', svc.includes('export async function assignDiscordRoleToUser(') && svc.includes('export async function runDiscordDiagnostics('));
}

t.section('sidebar');
t.check('Alerts has no invented count', !/id: "alerts"[^}]*badge:/.test(readRepoFile('src/components/Sidebar.tsx')));

t.done();
