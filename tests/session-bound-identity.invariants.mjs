// RUNTIME INVARIANT TESTS — ACCOUNT IDENTITY COMES FROM THE SESSION
//
// Verified against production on 2026-09-11 (probing only the owner's own
// account, signed out) before fixing:
//   - GET /api/auth/me?email=X returned X's full user record, passwordHash,
//     ipHash, hardwareFingerprint and stripeCustomerId included.
//   - GET /api/auth/diagnostic?email=X returned X's Stripe customer id.
//   - GET /api/v1/auth/access?email=X returned X's role and paid/admin state.
// And in source (not exercised in production because they write):
//   - POST /api/subscription/extend granted any posted email a paid plan.
//   - POST /api/stripe/create-portal-session opened the Stripe billing portal
//     (cancel subscription, invoices, payment methods) for any posted email.
//   - POST /api/auth/sync and /api/auth/heartbeat created user records for any
//     posted email, sync with a caller-chosen role.
//   - A default master-admin password lived in this public repository and was
//     assigned whenever an owner record had no hash.
//
// Executes the REAL toPublicUserDTO source and asserts on the real routes.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const R = (p) => readFileSync(join(root, p), 'utf8');
const server = R('server.ts');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

// The source of one route handler: from its registration to the next top-level
// `app.` registration.
function route(signature) {
  const start = server.indexOf(signature);
  if (start === -1) return '';
  const next = server.indexOf('\napp.', start + signature.length);
  return server.slice(start, next === -1 ? undefined : next);
}
const trustsClientIdentity = (src) =>
  /req\.headers\["x-user-(email|id|uid)"\]|req\.query\.email|req\.body\??\.(email|userEmail)\b/.test(src);

console.log('\n=== SESSION-BOUND IDENTITY INVARIANTS ===\n');

// ---------------------------------------------------------------------------
console.log('[1] No default password anywhere');
check('no hardcoded master-admin password in server.ts', !/Seattle007/.test(server));
check('no default password hash variable remains', !/defaultPasswordHash/.test(server));
check('ensureUserExists never assigns a password', /Never a default password[\s\S]{0,80}passwordHash: void 0/.test(server));

// ---------------------------------------------------------------------------
console.log('\n[2] Private fields never leave the server (executing the real DTO)');
const dtoSrc = server.slice(server.indexOf('function toPublicUserDTO('), server.indexOf('__name(toPublicUserDTO,'));
const toPublicUserDTO = new Function(`${dtoSrc}; return toPublicUserDTO;`)();
const raw = {
  id: 'usr_1', email: 'a@x.com', role: 'PRO', stripeCustomerId: 'cus_1',
  passwordHash: 'vixy$salt:key', ipHash: '1.2.3.4', hardwareFingerprint: 'hw_1',
  resetToken: 'r', resetTokenExpiresAt: 1, otpCode: '123', clientSecret: 's',
  user: { passwordHash: 'nested', email: 'a@x.com' },
  history: [{ passwordHash: 'in-array', at: 1 }],
};
const pub = toPublicUserDTO(raw);
check('passwordHash removed', !('passwordHash' in pub));
check('ipHash and hardwareFingerprint removed', !('ipHash' in pub) && !('hardwareFingerprint' in pub));
check('reset / OTP / secret material removed', !('resetToken' in pub) && !('resetTokenExpiresAt' in pub) && !('otpCode' in pub) && !('clientSecret' in pub));
check('nested user record is scrubbed too', pub.user && !('passwordHash' in pub.user) && pub.user.email === 'a@x.com');
check('records inside arrays are scrubbed', Array.isArray(pub.history) && !('passwordHash' in pub.history[0]));
check('ordinary fields survive', pub.email === 'a@x.com' && pub.role === 'PRO' && pub.id === 'usr_1');
check('the input record is not mutated', raw.passwordHash === 'vixy$salt:key');
check('null passes through', toPublicUserDTO(null) === null);

// ---------------------------------------------------------------------------
console.log('\n[3] Each route takes identity from the signed session');
const me = route('app.get(["/api/auth/me", "/api/user/me"]');
check('/api/auth/me found', me.length > 0);
check('/api/auth/me resolves the session', /authenticateSessionAsync\(req\)/.test(me));
check('/api/auth/me reads no client-supplied identity', !trustsClientIdentity(me));
check('/api/auth/me scrubs the user it returns', /user: toPublicUserDTO\(resolvedUser\)/.test(me));

const access = route('app.get(["/api/v1/auth/access", "/api/auth/access"]');
check('/api/v1/auth/access resolves the session', /authenticateSessionAsync\(req\)/.test(access));
check('/api/v1/auth/access reads no client identity headers', !/req\.headers\["x-user-/.test(access));
check('/api/v1/auth/access only lets staff inspect another account',
  /inspectOther = \["OWNER", "ADMIN", "SUPPORT"\]\.includes\(auth\.role\)/.test(access));

const sync = route('app.post("/api/auth/sync"');
check('/api/auth/sync requires a session', /authenticateSessionAsync\(req\)[\s\S]{0,120}status\(401\)/.test(sync));
check('/api/auth/sync reads no client identity', !trustsClientIdentity(sync));
check('/api/auth/sync cannot set role or plan', !/role|subscription/.test(sync.slice(sync.indexOf('ensureUserExists('), sync.indexOf('ensureUserExists(') + 80)));

const heartbeat = route('app.post(["/api/auth/heartbeat", "/api/heartbeat"]');
check('heartbeat uses the session', /authenticateSession\(req\)/.test(heartbeat));
check('heartbeat no longer creates users', !/ensureUserExists/.test(heartbeat));
check('heartbeat reads no client identity', !trustsClientIdentity(heartbeat));

const diag = route('app.get("/api/auth/diagnostic"');
check('/api/auth/diagnostic requires a session', /authenticateSessionAsync\(req\)[\s\S]{0,120}status\(401\)/.test(diag));
check('/api/auth/diagnostic reads no client identity headers', !/req\.headers\["x-user-/.test(diag));
check('/api/auth/diagnostic only lets staff inspect another account', /\["OWNER", "ADMIN", "SUPPORT"\]\.includes\(auth\.role\)/.test(diag));

const portal = route('app.post("/api/stripe/create-portal-session"');
check('billing portal resolves the session', /authenticateSessionAsync\(req\)/.test(portal));
check('billing portal ignores posted emails', !trustsClientIdentity(portal));

const restore = route('app.post(\n  [\n    "/api/auth/restore-access"');
check('restore-access found', restore.length > 0);
check('restore-access resolves the session', /authenticateSessionAsync\(req\)/.test(restore));
check('restore-access reads no client-supplied email or uid',
  !/req\.headers\["x-user-(email|id|uid)"\]|req\.query\.email|req\.body\.(email|uid|userId)\b/.test(restore));
check('signed out, restore-access only proceeds with a Stripe checkout session id',
  /if \(!cleanEmail && !cleanUid && !sessionId\)[\s\S]{0,300}requiresSignIn: true/.test(restore));

const extend = route('app.post(["/api/subscription/extend", "/api/user/extend-membership"]');
check('extend-membership is staff-only', /^app\.post\(\["\/api\/subscription\/extend", "\/api\/user\/extend-membership"\], requireRole\(\["OWNER", "ADMIN"\]\)/.test(extend));

// ---------------------------------------------------------------------------
console.log('\n[4] The cold-instance session resolver cannot invent identity');
const resolver = server.slice(server.indexOf('async function authenticateSessionAsync('), server.indexOf('__name(authenticateSessionAsync,'));
check('it starts from the signed-cookie check', /const auth = authenticateSession\(req\);/.test(resolver));
check('it only hydrates the uid/email inside a verified cookie', /verifySession\(parseCookieHeader\(req\)\[SESSION_COOKIE_NAME\]\)[\s\S]{0,120}hydrateUserFromFirestore\(payload\.email, payload\.uid\)/.test(resolver));
check('it re-runs the signed-cookie check before answering', /return authenticateSession\(req\);\s*\}$/.test(resolver.trim()));
check('it never reads request headers, query or body', !/req\.(headers|query|body)/.test(resolver));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
