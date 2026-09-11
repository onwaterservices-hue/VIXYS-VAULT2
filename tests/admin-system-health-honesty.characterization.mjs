// CHARACTERIZATION -- /api/admin/system-health reports checked state, not literals.
//
// It served DATABASE "healthy" 2ms, WEBSOCKET "healthy" 14ms (no WebSocket server
// is created), referral/entitlement "healthy" with nothing checked, top-level
// "HEALTHY", databaseLatencyMs 4, realtimeConnections = users + clock % 5 (or 3),
// websocketStatus "CONNECTED", discordBotStatus "READY" when not connected,
// openAiStatus "OPERATIONAL" for an SDK object, and cpuUsagePct holding CPU seconds.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('admin-system-health-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const i = code.indexOf('["/api/admin/health", "/api/admin/system-health"]');
const route = code.slice(i, code.indexOf('let latestAcceptanceMatrixResults', i));

t.check('route found', i > 0 && route.length > 500);
t.check('no literal service latencies', !/latencyMs:\s*(2|14)\b/.test(route) && !/databaseLatencyMs:\s*4\b/.test(route));
t.check('database status from persistenceState', route.includes('status: persistenceState === "HEALTHY_FIRESTORE" ? "healthy" : "degraded"'));
t.check('no websocket server claimed', route.includes('WEBSOCKET: { status: "not_running", latencyMs: null }') && route.includes('websocketStatus: "NOT_RUNNING"'));
t.check('unchecked services are unknown', (route.match(/status: "unknown",/g) || []).length === 2);
t.check('key presence is "configured", not "healthy"', !/STRIPE_SECRET_KEY \? "healthy"/.test(route) && !/!!ai \? "healthy"/.test(route));
t.check('no synthesized connection count', !/% 5\)/.test(route) && route.includes('realtimeConnections: null'));
t.check('no "READY" for a disconnected bot', !route.includes('? "ACTIVE" : "READY"'));
t.check('cpu seconds are not called a percentage', route.includes('cpuUsagePct: null') && route.includes('cpuUserSeconds:'));
t.check('unknown probe results are null, not false', !/guildAccessible \?\? false/.test(route));
{
  const m = route.match(/const checkedServices = \[[^\]]+\];\s*res\.json\(\{\s*status: ([^,]+),/);
  t.check('aggregate status derived from checked services', !!m);
  const agg = (statuses) => new Function('checkedServices', `return ${m[1]};`)(statuses.map((status) => ({ status })));
  t.eq('all checked healthy -> HEALTHY', agg(['healthy', 'healthy', 'healthy', 'healthy']), 'HEALTHY');
  t.eq('any degraded -> DEGRADED', agg(['healthy', 'degraded', 'healthy', 'healthy']), 'DEGRADED');
}
t.done();
