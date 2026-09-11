// RUNTIME INVARIANT TESTS — DIAGNOSTICS REPORT ONLY WHAT WAS MEASURED
//
// GET /api/diagnostic is public. It printed PASS / HEALTHY / CONNECTED for
// checks this server never runs (sequence integrity, state reconciliation,
// prediction immutability, settlement engine, websocket, account API, frontend
// hydration, cross-asset readiness), a flat STATUS=PRODUCTION_READY, an invented
// $64,821.50 spot and $65,000 strike when no market data existed, and a
// "latency" computed as data age minus 500 ms.
//
// The staff /api/admin/diagnostics reported a constant 12ms feed latency, an
// engine that was always "RUNNING", a database that was always "Connected", and
// deduplication counts invented as users + 2.
//
// A presence middleware also let any caller mark any user active in the admin
// panel by naming their email in a header, body or query.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

const code = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
function route(sig) {
  const s = server.indexOf(sig);
  if (s === -1) return '';
  const next = server.indexOf('\napp.', s + sig.length);
  return server.slice(s, next === -1 ? undefined : next);
}

console.log('\n=== DIAGNOSTICS REPORT ONLY MEASURED VALUES ===\n');

console.log('[1] Public /api/diagnostic');
const diag = code(route('app.get("/api/diagnostic"'));
check('route found', diag.length > 0);
for (const invented of ['sequenceIntegrity=PASS', 'stateReconciliation=PASS', 'predictionImmutability=PASS', 'frontendHydration=PASS', 'settlementEngine=HEALTHY', 'signalLedger=HEALTHY', 'accountApi=HEALTHY', 'vixyWebSocket=CONNECTED', 'frontend=READY', 'algorithm=RUNNING', 'crossAssetContext=READY', 'STATUS=PRODUCTION_READY']) {
  check(`no unconditional "${invented}"`, !diag.includes(invented));
}
check('no invented spot fallback', !/64821\.5/.test(diag) && /spot=\$\{hasSpot \? currentBtcPrice : "UNAVAILABLE"\}/.test(diag));
check('no invented strike fallback', !/\|\| 65e3/.test(diag) && /\|\| "UNAVAILABLE"\}/.test(diag));
check('no latency derived from data age', !/dataAgeMs - 500/.test(diag) && !/latencyMs=/.test(diag));
check('unmeasured checks are named as unmeasured', /notMeasuredHere=/.test(diag));
check('STATUS is derived from measured feed freshness and Firestore health', /STATUS=\$\{feedFresh && firestoreHealthy \? "OK" : "DEGRADED"\}/.test(diag));
check('no market data reads as UNAVAILABLE, not a huge age', /lastMarketUpdateTs > 0 \? now - lastMarketUpdateTs : null/.test(diag));

console.log('\n[2] Staff /api/admin/diagnostics');
const admin = code(server.slice(server.indexOf('"/api/admin/diagnostics",'), server.indexOf('app.get(\n  "/api/admin/users"')));
check('route found', admin.length > 0);
check('no constant feed latency', !/latencyMs: 12/.test(admin) && /latencyMs: null/.test(admin));
check('engine status comes from the last model run', /status: lastModelRunTs > 0 && lastModelRunSecAgo < 120 \? "RUNNING" : "STALE"/.test(admin));
check('no invented deduplication counts', !/serverUsers\.length \+ 2/.test(admin) && !/duplicateRecords: 2/.test(admin) && !/unresolvedRecords: 0/.test(admin));
check('database status is the real persistence state', /database: \{ status: persistenceState \}/.test(admin) && !/status: "Connected" \}/.test(admin));

console.log('\n[3] Presence');
const presenceStart = server.indexOf('// Presence comes from the signed session only.');
const presence = code(server.slice(server.lastIndexOf('app.use(', presenceStart), server.indexOf('\n});', presenceStart)));
check('presence middleware found', presenceStart !== -1);
check('it uses the signed session', /authenticateSession\(req\)/.test(presence));
check('it ignores client-supplied emails', !/x-user-email|req\.body|req\.query/.test(presence));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
