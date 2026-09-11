// RUNTIME INVARIANT TESTS — ADMIN ROUTES ARE STAFF-ONLY; JOURNALS ARE PERSONAL
//
// Verified against production on 2026-09-11, signed out:
//   - GET /api/admin/entitlement-diagnostics returned every active day pass and
//     recent subscriptions: customer emails, Stripe payment ids, Discord ids.
//   - GET /api/admin/events returned admin events carrying userEmail.
// Found in source (not exercised in production because they write):
//   - /api/admin/acceptance-matrix (any method) and
//     /api/admin/test-entitlement-suite create users and day-pass records.
//   - /api/journal read/create/delete trusted a client userId, so anyone could
//     read or rewrite any journal and the leaderboard built from them.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

// The registration text up to the handler's opening "(req, res) =>".
function registration(signature) {
  const start = server.indexOf(signature);
  if (start === -1) return '';
  return server.slice(start, server.indexOf('(req, res)', start) + 10);
}
function route(signature) {
  const start = server.indexOf(signature);
  if (start === -1) return '';
  const next = server.indexOf('\napp.', start + signature.length);
  return server.slice(start, next === -1 ? undefined : next);
}

console.log('\n=== ADMIN ROUTES & JOURNAL INVARIANTS ===\n');

console.log('[1] Admin data and test runners require a staff session');
const STAFF = /requireRole\(\["OWNER", "ADMIN"(, "SUPPORT")?\]\)/;
for (const sig of [
  'app.get("/api/admin/events",',
  'app.get("/api/admin/events/stream",',
  'app.get("/api/admin/entitlement-diagnostics",',
  'app.get("/api/admin/test-entitlement-suite",',
  '["/api/admin/acceptance-matrix", "/api/admin/run-acceptance-matrix"],',
]) {
  const reg = registration(sig);
  check(`${sig} is registered`, reg.length > 0);
  check(`${sig} is guarded by requireRole`, STAFF.test(reg), reg.slice(0, 120));
}
check('the write-happy test runners are OWNER/ADMIN only (not SUPPORT)',
  /"\/api\/admin\/test-entitlement-suite", requireRole\(\["OWNER", "ADMIN"\]\)/.test(server) &&
  /"\/api\/admin\/run-acceptance-matrix"\],\s*requireRole\(\["OWNER", "ADMIN"\]\)/.test(server));

// Every GET /api/admin/* registered on one line must carry a role check.
// A handler that authenticates itself (e.g. /api/admin/me, which reports the
// caller's own status) counts as guarded.
const openAdminGets = [...server.matchAll(/^app\.get\("(\/api\/admin\/[^"]+)",(?!\s*requireRole)/gm)]
  .map((m) => m[1])
  .filter((p) => !/authenticateSession\(req\)/.test(route(`app.get("${p}",`).slice(0, 400)));
check('no single-line GET /api/admin/* route is left unguarded', openAdminGets.length === 0, openAdminGets.join(', '));

console.log('\n[2] Journals belong to the signed-in account');
const owner = server.slice(server.indexOf('function journalOwnerId('), server.indexOf('__name(journalOwnerId,'));
check('the journal owner comes from the signed session', /authenticateSession\(req\)/.test(owner) && !/req\.(query|body|headers)/.test(owner));
const jGet = route('app.get("/api/journal",');
const jPost = route('app.post("/api/journal",');
const jDel = route('app.delete("/api/journal/:id",');
for (const [name, src] of [['GET', jGet], ['POST', jPost], ['DELETE', jDel]]) {
  check(`${name} /api/journal found`, src.length > 0);
  check(`${name} /api/journal uses journalOwnerId`, /journalOwnerId\(req\)/.test(src));
  check(`${name} /api/journal ignores any client userId`, !/req\.query\.userId|userId = "usr_owner_01"|req\.body\??\.userId/.test(src));
}
check('signed out, GET returns an empty journal instead of every entry',
  /const userEntries = userId\s*\?\s*serverJournalEntries\.filter\(\(e\) => e\.userId === userId\)\s*:\s*\[\]/.test(jGet));
check('POST requires a session', /if \(!userId\)[\s\S]{0,120}status\(401\)/.test(jPost));
check('DELETE requires a session', /if \(!userId\)[\s\S]{0,120}status\(401\)/.test(jDel));
check('DELETE only removes the caller\'s own entry', /e\.id === id && e\.userId === userId/.test(jDel));
check('storage is not described as a database', !/Server-Side Database/.test(jGet) && /IN_MEMORY_NOT_PERSISTED/.test(jGet));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
