// RUNTIME INVARIANT TESTS — STRIPE DIAGNOSTICS IS STAFF-ONLY AND TIME-BOUNDED
//
// Verified against production on 2026-09-11: GET /api/stripe/diagnostics,
// signed out, did not answer within 150 seconds. The handler awaits a live
// Stripe customers.list call and runDiscordDiagnostics() with no deadline, so
// every anonymous request could hold a serverless function (maxDuration 300s)
// for minutes -- a free way to burn compute. No frontend calls it (the Admin
// panel's health check uses the first /api/stripe/health registration).
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== STRIPE DIAGNOSTICS INVARIANTS ===\n');

const sig = 'app.get(["/api/stripe/health", "/api/stripe/diagnostics"]';
const start = server.indexOf(sig);
const handler = start === -1 ? '' : server.slice(start, server.indexOf('\n});', start));
check('diagnostics handler found', handler.length > 0);
check('it requires a staff session before any work', /^app\.get\(\["\/api\/stripe\/health", "\/api\/stripe\/diagnostics"\], requireRole\(\["OWNER", "ADMIN", "SUPPORT"\]\), async/.test(handler));
check('the Stripe API probe has a deadline', /await withDeadline\(\s*stripe\.customers\.list\(\{ limit: 1 \}\)/.test(handler));
check('the Discord diagnostics call has a deadline', /await withDeadline\(\s*runDiscordDiagnostics\(\)/.test(handler));
check('no un-bounded await of either call remains', !/await stripe\.customers\.list\(/.test(handler) && !/await runDiscordDiagnostics\(\)/.test(handler));

console.log('\n[executing the real deadline helper]');
const helperSrc = handler.slice(handler.indexOf('const withDeadline'), handler.indexOf(';', handler.indexOf('new Promise((_, reject)')) + 1);
const tail = handler.slice(handler.indexOf('const withDeadline'));
const helperEnd = tail.indexOf('\n  const stripe') !== -1 ? tail.indexOf('\n  const stripe') : tail.indexOf('\n', tail.indexOf('));') );
const withDeadline = new Function(`${tail.slice(0, helperEnd)}; return withDeadline;`)();
const slow = new Promise((r) => setTimeout(() => r('late'), 500));
let timedOut = false;
try { await withDeadline(slow, 50, 'probe'); } catch (e) { timedOut = /probe timed out after 50ms/.test(e.message); }
check('a slow call is abandoned at its deadline', timedOut);
check('a fast call resolves normally', (await withDeadline(Promise.resolve('ok'), 50, 'probe')) === 'ok');
check('helper source located', helperSrc.length > 0);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
