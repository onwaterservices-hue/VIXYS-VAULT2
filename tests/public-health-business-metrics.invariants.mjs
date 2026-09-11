// RUNTIME INVARIANT TESTS — PUBLIC HEALTH ENDPOINTS DO NOT PUBLISH BUSINESS METRICS
//
// Verified against production on 2026-09-11, signed out: /api/health/auth
// returned canonicalUserCount, dayPassCount and activeSubscriptionCount. The
// second /api/stripe/health registration also answers /api/stripe/diagnostics
// and built per-plan subscriber counts into its public payload. Readiness
// fields stay public for monitors; the counts are staff-only.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

function route(signature) {
  const start = server.indexOf(signature);
  if (start === -1) return '';
  const next = server.indexOf('\napp.', start + signature.length);
  return server.slice(start, next === -1 ? undefined : next);
}

console.log('\n=== PUBLIC HEALTH BUSINESS METRICS INVARIANTS ===\n');

const auth = route('app.get("/api/health/auth"');
check('/api/health/auth found', auth.length > 0);
check('it identifies staff from the signed session', /authenticateSession\(req\)[\s\S]{0,200}\["OWNER", "ADMIN", "SUPPORT"\]\.includes\(viewer\.role\)/.test(auth));
const authStaffBlock = auth.slice(auth.indexOf('...(viewerIsStaff'), auth.indexOf(': {}),'));
for (const f of ['canonicalUserCount', 'dayPassCount', 'activeSubscriptionCount']) {
  check(`${f} is only inside the staff-only block`, authStaffBlock.includes(`${f}:`) && auth.split(`${f}:`).length === 2);
}
check('readiness fields remain public', /auth: "READY"/.test(auth) && /firestore: persistenceState/.test(auth) && !/\.\.\.\(viewerIsStaff[\s\S]{0,40}firestore/.test(auth));

const diag = route('app.get(["/api/stripe/health", "/api/stripe/diagnostics"]');
check('/api/stripe/diagnostics handler found', diag.length > 0);
check('it identifies staff from the signed session', /authenticateSession\(req\)[\s\S]{0,200}\["OWNER", "ADMIN", "SUPPORT"\]\.includes\(diagViewer\.role\)/.test(diag));
check('subscriber counts are only returned to staff', /\.\.\.\(diagViewerIsStaff \? \{ subscribers: subscriberCounts \} : \{\}\)/.test(diag) && !/^\s*subscribers: subscriberCounts,/m.test(diag));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
