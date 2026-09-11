// CHARACTERIZATION -- admin health statuses come from real fields or read UNKNOWN.
//
// The admin panel's SYSTEM CONNECTIVITY MATRIX fell back to ONLINE for the
// market feed and prediction engine whenever /api/admin/diagnostics omitted the
// field, showed KALSHI ONLINE off a constant contract symbol, and compared the
// rest against values the server never sends ("OPERATIONAL", "Connected",
// BOT_CONNECTED, botConnected). Its "LIVE FEED" badge was unconditional. The
// SYSTEM HEALTH tab's "Real-Time Backend Service Matrix" was literal ONLINE
// badges with literal latencies (4ms, 2ms, 24ms, 12ms, 18ms, 14ms, ...) that
// nothing measured.
import { transform } from 'esbuild';
import { readRepoFile, serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('admin-health-status-honesty.characterization');
const strip = (x) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/[^\n]*/g, '');
const rawPanel = readRepoFile('src/components/AdminPanel.tsx');
const panel = strip(rawPanel);

// The status helpers, executed verbatim.
const helperSrc = sliceBetween(rawPanel, 'type HealthState =', 'export const QuantControlsLive', 'admin health helpers');
const { code: helperJs } = await transform(helperSrc, { loader: 'ts' });
const H = new Function(`${helperJs}
return { HEALTH_STALE_AFTER_MS, HEALTH_ROUTES, marketFeedState, predictionEngineState, databaseState,
  stripeConfigState, stripeWebhookState, discordBotState, routeAnswered, freshBody, probeLatency, telemetryState };`)();

t.section('statuses are derived, never defaulted to ONLINE (real code)');
{
  const ticked = (extra = {}) => ({
    predictionEngine: { cycleId: 7, status: 'RUNNING' },
    marketFeed: { status: 'CONNECTED' },
    database: { status: 'HEALTHY_FIRESTORE' },
    ...extra,
  });
  t.eq('feed: no diagnostics -> UNKNOWN', H.marketFeedState(null), 'UNKNOWN');
  t.eq('feed: marketFeed.status missing -> UNKNOWN (was || "ONLINE")', H.marketFeedState({ predictionEngine: { cycleId: 7 } }), 'UNKNOWN');
  t.eq('feed: CONNECTED on a ticked instance -> ONLINE', H.marketFeedState(ticked()), 'ONLINE');
  t.eq('feed: CONNECTED boot seed (cycleId 0) -> UNKNOWN', H.marketFeedState(ticked({ predictionEngine: { cycleId: 0 } })), 'UNKNOWN');
  t.eq('feed: STALE -> DEGRADED', H.marketFeedState(ticked({ marketFeed: { status: 'STALE' } })), 'DEGRADED');
  t.eq('feed: unrecognised value -> UNKNOWN', H.marketFeedState(ticked({ marketFeed: { status: 'ONLINE' } })), 'UNKNOWN');

  t.eq('engine: status missing -> UNKNOWN (was || "ONLINE")', H.predictionEngineState({ predictionEngine: { cycleId: 7 } }), 'UNKNOWN');
  t.eq('engine: RUNNING on a ticked instance -> ONLINE', H.predictionEngineState(ticked()), 'ONLINE');
  t.eq('engine: RUNNING boot seed (cycleId 0) -> UNKNOWN', H.predictionEngineState({ predictionEngine: { cycleId: 0, status: 'RUNNING' } }), 'UNKNOWN');
  t.eq('engine: STALE -> DEGRADED', H.predictionEngineState({ predictionEngine: { cycleId: 7, status: 'STALE' } }), 'DEGRADED');

  t.eq('database: HEALTHY_FIRESTORE -> ONLINE', H.databaseState(ticked()), 'ONLINE');
  t.eq('database: "Connected" (never sent) -> UNKNOWN', H.databaseState({ database: { status: 'Connected' } }), 'UNKNOWN');
  for (const s of ['LOCAL_DISK_ONLY', 'DEGRADED_LOCAL_FALLBACK', 'RESOURCE_EXHAUSTED']) {
    t.eq(`database: ${s} -> DEGRADED`, H.databaseState({ database: { status: s } }), 'DEGRADED');
  }
  t.eq('database: missing -> UNKNOWN', H.databaseState({}), 'UNKNOWN');

  t.eq('stripe: HEALTHY is a config check -> CONFIGURED, not ONLINE', H.stripeConfigState({ status: 'HEALTHY' }), 'CONFIGURED');
  t.eq('stripe: "OPERATIONAL" (never sent) -> UNKNOWN', H.stripeConfigState({ status: 'OPERATIONAL' }), 'UNKNOWN');
  t.eq('stripe: DEGRADED -> DEGRADED', H.stripeConfigState({ status: 'DEGRADED' }), 'DEGRADED');
  t.eq('stripe: missing -> UNKNOWN', H.stripeConfigState(null), 'UNKNOWN');
  t.eq('webhooks: secret present -> CONFIGURED', H.stripeWebhookState({ stripe_webhook_secret_present: true }), 'CONFIGURED');
  t.eq('webhooks: secret absent -> DEGRADED', H.stripeWebhookState({ stripe_webhook_secret_present: false }), 'DEGRADED');
  t.eq('webhooks: field missing -> UNKNOWN', H.stripeWebhookState({}), 'UNKNOWN');

  t.eq('discord: botState.isReady true -> ONLINE', H.discordBotState({ botState: { isReady: true } }), 'ONLINE');
  t.eq('discord: botState.isReady false -> DEGRADED', H.discordBotState({ botState: { isReady: false } }), 'DEGRADED');
  t.eq('discord: BOT_CONNECTED (never sent) -> UNKNOWN', H.discordBotState({ BOT_CONNECTED: true }), 'UNKNOWN');

  t.eq('api: no body -> UNKNOWN', H.routeAnswered(null), 'UNKNOWN');
  t.eq('api: auth error body -> UNKNOWN', H.routeAnswered({ error: 'AUTHENTICATION_REQUIRED' }), 'UNKNOWN');
  t.eq('api: answered body -> ONLINE', H.routeAnswered({ status: 'HEALTHY' }), 'ONLINE');

  const junk = [undefined, null, 0, 1, '', 'ONLINE', [], {}, { status: 'ONLINE' }, { status: 'ok' },
    { predictionEngine: { cycleId: 3, status: 'ONLINE' }, marketFeed: { status: 'ONLINE' }, database: { status: 'ONLINE' }, botState: { isReady: 'true' } }];
  const mappers = ['marketFeedState', 'predictionEngineState', 'databaseState', 'stripeConfigState', 'stripeWebhookState', 'discordBotState'];
  const onlines = [];
  for (const m of mappers) for (const j of junk) if (H[m](j) === 'ONLINE') onlines.push(`${m}(${JSON.stringify(j)})`);
  t.check('no mapper turns a missing or unrecognised value into ONLINE', onlines.length === 0, onlines.join(', '));
}

t.section('stale answers are not current (real code)');
{
  const now = 1_000_000;
  const body = { a: 1 };
  const stale = { answeredAt: now - H.HEALTH_STALE_AFTER_MS - 1, rttMs: 90 };
  t.eq('no probe -> body withheld', H.freshBody(body, undefined, now), null);
  t.eq('answer older than the stale window -> body withheld', H.freshBody(body, stale, now), null);
  t.check('recent answer -> body passed through', H.freshBody(body, { answeredAt: now - 1000, rttMs: 90 }, now) === body);
  t.eq('latency with no probe -> dash', H.probeLatency(undefined, now), '—');
  t.eq('latency of a stale probe -> dash', H.probeLatency(stale, now), '—');
  t.eq('latency of a fresh probe -> its measured round-trip', H.probeLatency({ answeredAt: now - 1000, rttMs: 183 }, now), '183ms');
  t.eq('telemetry: nothing fresh -> NONE', H.telemetryState([false, false, false, false]), 'NONE');
  t.eq('telemetry: some fresh -> PARTIAL', H.telemetryState([true, false, true, true]), 'PARTIAL');
  t.eq('telemetry: all fresh -> LIVE', H.telemetryState([true, true, true, true]), 'LIVE');
}

t.section('panel source');
{
  t.check('no status falls back to "ONLINE"', !/(\|\||\?\?)\s*["']ONLINE["']/.test(panel));
  t.check('no literal status: "ONLINE"', !/status:\s*["']ONLINE["']/.test(panel));
  const outside = panel.replace(sliceBetween(panel, 'type HealthState =', 'export const QuantControlsLive', 'stripped helpers'), '');
  const bare = [...outside.matchAll(/(.{0,6})"ONLINE"/g)].filter((m) => !/===\s*$/.test(m[1]));
  t.check('outside the helpers, "ONLINE" only appears in === comparisons', bare.length === 0, bare.map((m) => m[0]).join(' | '));
  t.check('the unknown state exists', /type HealthState = "ONLINE" \| "CONFIGURED" \| "DEGRADED" \| "UNKNOWN";/.test(panel));

  const conn = sliceBetween(panel, '[01] SYSTEM CONNECTIVITY MATRIX', '[02] 15M QUANT ENGINE PARAMETERS', 'connectivity matrix');
  t.check('connectivity: LIVE FEED badge depends on fresh answers', /telemetry === "LIVE" \? "LIVE FEED"/.test(conn));
  t.check('connectivity: KALSHI is not derived from the constant contract symbol', !conn.includes('activeContract'));
  t.check('connectivity: not labelled BINANCE (the last fallback venue)', !conn.includes('BINANCE DATA FEED'));
  t.check('connectivity: unknown has a neutral style', conn.includes('"bg-slate-900/80 text-slate-400 border-slate-700/40"'));
  for (const reader of ['routeAnswered(freshSystemHealth)', 'marketFeedState(freshDiagnostics)', 'databaseState(freshDiagnostics)',
    'predictionEngineState(freshDiagnostics)', 'discordBotState(freshDiscordDiag)', 'status: stripeGatewayState']) {
    t.check(`connectivity reads ${reader}`, conn.includes(reader));
  }

  const matrix = sliceBetween(panel, 'Backend Service Matrix', 'RESOLVED SIGNAL OUTCOME AUDIT LOG', 'service matrix');
  t.check('matrix: not titled Real-Time', !panel.includes('Real-Time Backend Service Matrix'));
  t.check('matrix: no literal ONLINE status', !/["']ONLINE["']\s*[,}]/.test(matrix));
  t.check('matrix: no literal latency strings', !/["'`]\d+\s*ms["'`]/.test(matrix) && !/latency:\s*["'`]/.test(matrix));
  t.check('matrix: latency is a timed fetch or a dash', matrix.includes('probeLatency(routeProbes[svc.route], healthCheckedAt)'));
  t.check('matrix: unknown has a neutral style', matrix.includes('"bg-slate-500/10 text-slate-400 border border-slate-500/30"'));
  for (const [name, reader] of [
    ['AUTH', 'routeAnswered(freshSystemHealth)'],
    ['DATABASE / PERSISTENCE', 'databaseState(freshDiagnostics)'],
    ['STRIPE GATEWAY', 'stripeGatewayState'],
    ['STRIPE WEBHOOKS', 'stripeWebhookState(freshStripeHealth)'],
    ['DISCORD INFRASTRUCTURE', 'discordBotState(freshDiscordDiag)'],
    ['MARKET DATA FEED', 'marketFeedState(freshDiagnostics)'],
    ['VIXY AI PREDICTION ENGINE', 'predictionEngineState(freshDiagnostics)'],
  ]) {
    const i = matrix.indexOf(`name: "${name}"`);
    t.check(`matrix: ${name} reads ${reader}`, i >= 0 && matrix.slice(i, i + 160).includes(reader));
  }
  for (const name of ['AUTOMATION SCHEDULER', 'BOT CLUSTER']) {
    t.check(`matrix: ${name} (no route reports it) is UNKNOWN`, new RegExp(`name: "${name}", status: "UNKNOWN", route: null`).test(matrix));
  }
  t.check('health fetches are timed', /timed\(HEALTH_ROUTES\.systemHealth, fetchSystemHealth\)/.test(panel)
    && /timed\(HEALTH_ROUTES\.diagnostics, fetchAdminDiagnostics\)/.test(panel)
    && /timed\(HEALTH_ROUTES\.stripeHealth, fetchStripeHealthApi\)/.test(panel)
    && /timed\(\s*HEALTH_ROUTES\.discordDiagnostics,/.test(panel));
  t.check('a cached copy is not counted as a fresh answer', panel.includes('body !== lastRouteBodiesRef.current[route]'));
}

t.section('other fabricated values in the panel');
{
  t.check('CONNECTED SESSIONS does not show the synthesized realtimeConnections', !panel.includes('realtimeConnections'));
  t.check('Discord panel reads no keys the route never sends',
    !/\b(BOT_CONNECTED|GUILD_FOUND|ROLE_FOUND|ROLE_MANAGEABLE|PENDING_COUNT|SUCCESS_COUNT|FAILED_COUNT|LAST_ERROR)\b/.test(panel));
  t.check('no botConnected read (not in /api/discord/health)', !/botConnected/.test(panel));
  t.check('no "Zero exceptions" claim', !panel.includes('Zero exceptions'));
  t.check('nothing compared against "OPERATIONAL" (server sends HEALTHY/DEGRADED)', !/===\s*"OPERATIONAL"/.test(panel));
  t.check('Kalshi & Crypto Feed is not a literal OPERATIONAL', !/>\s*OPERATIONAL\s*</.test(panel));
  t.check('no Stripe mode fallback to LIVE', !/stripe_secret_key_mode[^}]*\|\|\s*"LIVE"/.test(panel));
  t.check('no Stripe status fallback to CONFIGURED', !/stripeHealth\?\.status \|\| "CONFIGURED"/.test(panel));
  t.check('no unmeasured <200ms resync claim', !panel.includes('&lt;200ms'));
  t.check('calibrated probability has no 0.5 fallback', !/calibratedModelProbability\s*\?\?\s*0\.5/.test(panel));
  t.check('calibration status has no ACTIVE fallback', !/calibrationStatus \|\|\s*"ACTIVE"/.test(panel));
  t.check('lock reason has no AWAITING_EDGE fallback', !/\|\|\s*"AWAITING_EDGE"/.test(panel));
  t.check('feed freshness has no 0s fallback', !/lastUpdateSecAgo \|\| 0/.test(panel));
  t.check('edge is not multiplied by 100', !/edgePct\)\s*\*\s*100/.test(panel));
  t.check('calibration authority badge reads the server field', panel.includes('calibrationAuthority || "UNKNOWN"'));
}

t.section('every route the panel fetches exists on the server');
{
  const api = readRepoFile('src/services/api.ts');
  const helperRoute = (name) => {
    const a = api.indexOf(`export async function ${name}(`);
    if (a < 0) return null;
    const b = api.indexOf('\nexport ', a + 1);
    const m = api.slice(a, b < 0 ? undefined : b).match(/['"`](\/api\/[A-Za-z0-9/_-]+)/);
    return m ? m[1] : null;
  };
  const i = panel.indexOf('await Promise.all([');
  const block = panel.slice(i, panel.indexOf(']);', i));
  const names = [...new Set([...block.matchAll(/\b(fetch[A-Z][A-Za-z]+)\b/g)].map((m) => m[1]).concat('fetchAdminEventsApi'))];
  t.check('found the panel fetch helpers', names.length >= 10, names.join(','));
  const routes = new Set();
  for (const n of names) {
    const r = helperRoute(n);
    t.check(`${n} fetches an /api route`, !!r);
    if (r) routes.add(r);
  }
  for (const m of panel.matchAll(/fetch\(\s*["'](\/api\/[A-Za-z0-9/_-]+)["']/g)) routes.add(m[1]);
  for (const r of Object.values(H.HEALTH_ROUTES)) routes.add(r);
  for (const r of routes) t.check(`server defines ${r}`, serverSrc.includes(`"${r}"`));
  t.check('HEALTH_ROUTES match the helpers they time',
    H.HEALTH_ROUTES.systemHealth === helperRoute('fetchSystemHealth')
    && H.HEALTH_ROUTES.diagnostics === helperRoute('fetchAdminDiagnostics')
    && H.HEALTH_ROUTES.stripeHealth === helperRoute('fetchStripeHealthApi'));
}

t.section('the server fields each status reads');
{
  const a = serverSrc.indexOf('"/api/admin/diagnostics",');
  const diag = strip(serverSrc.slice(a, serverSrc.indexOf('\n);\n', a)));
  t.check('diagnostics: marketFeed.status is engineFeedStatus', diag.includes('status: engineFeedStatus,'));
  t.check('diagnostics: predictionEngine.status is RUNNING or STALE', diag.includes('? "RUNNING" : "STALE"'));
  t.check('diagnostics: predictionEngine.cycleId is currentEngineCycleId', diag.includes('cycleId: currentEngineCycleId,'));
  t.check('diagnostics: database.status is persistenceState', diag.includes('database: { status: persistenceState }'));
  t.check('activeContractSymbol is a constant, so it cannot be a status',
    (serverSrc.match(/activeContractSymbol = /g) || []).length === 1 && /^let activeContractSymbol = "BTC-15M";$/m.test(serverSrc));
  t.check('cycle id boots at 0 and each tick increments it first',
    /^let currentEngineCycleId = 0;$/m.test(serverSrc)
    && /async function runMarketEngineTick\(\) \{\s*try \{\s*currentEngineCycleId \+= 1;/.test(serverSrc));
  t.check('realEdgePct is already in percentage points', /const realEdgePct =\s*Math\.round\([\s\S]{0,200}?\*\s*1e3,\s*\)\s*\/\s*10;/.test(serverSrc));

  const persist = new Set();
  for (const m of serverSrc.matchAll(/persistenceState = ([^;\n]+);/g)) for (const v of m[1].matchAll(/"([A-Z_]+)"/g)) persist.add(v[1]);
  const unmappedPersist = [...persist].filter((v) => !['HEALTHY_FIRESTORE', 'DEGRADED_LOCAL_FALLBACK', 'LOCAL_DISK_ONLY', 'RESOURCE_EXHAUSTED'].includes(v));
  t.check('every persistenceState the server assigns is mapped', persist.size >= 4 && unmappedPersist.length === 0, unmappedPersist.join(','));
  const feed = new Set([...serverSrc.matchAll(/engineFeedStatus = "([A-Z_]+)"/g)].map((m) => m[1]));
  t.check('every engineFeedStatus the server assigns is mapped', feed.size >= 2 && [...feed].every((v) => ['CONNECTED', 'STALE', 'DEGRADED', 'DISCONNECTED'].includes(v)), [...feed].join(','));

  const s = serverSrc.indexOf('app.get("/api/stripe/health"');
  const stripe = serverSrc.slice(s, serverSrc.indexOf('\n});\n', s));
  t.check('stripe: status is HEALTHY or DEGRADED', /\?\s*"HEALTHY"\s*:\s*"DEGRADED"/.test(stripe));
  t.check('stripe: webhook secret presence is reported', stripe.includes('stripe_webhook_secret_present: !!webhookSecret,'));

  const d = serverSrc.indexOf('app.get("/api/discord/diagnostics"');
  const disc = serverSrc.slice(d, serverSrc.indexOf('\n});\n', d));
  t.check('discord: botState.isReady is the bot singleton', disc.includes('isReady: state.isReady,'));
  t.check('discord: guild/hierarchy are null when the probe did not run',
    disc.includes('guildAccessible: live ? live.guildAccessible : null,') && disc.includes('hierarchySufficient: live ? live.hierarchySufficient : null,'));

  const h = serverSrc.indexOf('["/api/admin/health", "/api/admin/system-health"]');
  const sys = serverSrc.slice(h, serverSrc.indexOf('\n);\n', h));
  t.check('the panel does not read system-health status', !/systemHealth\?\.status/.test(panel));
  t.check('system-health no longer synthesizes realtimeConnections', !/Math\.floor\(Date\.now\(\) \/ 1e4\) % 5/.test(sys) && /realtimeConnections: null/.test(sys));
}

t.done();
