// RUNTIME INVARIANT TESTS — LOGIN BRUTE-FORCE LIMIT
//
// /api/auth/login had no attempt limit, in a public repository whose history
// contains a default owner password and while password hashes were readable
// through /api/auth/me (fixed in #75). Executes the REAL limiter source against
// an in-memory Firestore, and asserts where the login route calls it.
import { readFileSync } from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== LOGIN BRUTE-FORCE LIMIT INVARIANTS ===\n');

const src = server.slice(server.indexOf('function loginLimitKeys('), server.indexOf('__name(clearLoginFailures,'));
check('limiter source located', src.length > 500);

function makeLimiter({ failWrites = false } = {}) {
  const store = new Map();
  const snap = (id) => ({ exists: () => store.has(id), data: () => ({ ...store.get(id) }) });
  const doc = (_db, _c, id) => ({ id });
  const getDoc = async (ref) => { if (failWrites === 'read') throw new Error('down'); return snap(ref.id); };
  const setDoc = async (ref, v) => { store.set(ref.id, { ...v }); };
  const runTransaction = async (_db, fn) => {
    if (failWrites) throw new Error('down');
    return fn({ get: async (ref) => snap(ref.id), set: (ref, v) => store.set(ref.id, { ...v }) });
  };
  const api = new Function('db', '_adminActive', 'doc', 'getDoc', 'setDoc', 'runTransaction', 'crypto', '__name', 'console',
    `${src}; return { loginLimitKeys, isLoginRateLimited, recordLoginFailure, clearLoginFailures };`,
  )({}, true, doc, getDoc, setDoc, runTransaction, crypto, () => {}, { warn() {}, log() {} });
  return { ...api, store };
}
const reqFrom = (ip) => ({ headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` }, socket: { remoteAddress: '10.0.0.1' } });

console.log('[1] Keys');
{
  const { loginLimitKeys } = makeLimiter();
  const keys = loginLimitKeys('a@x.com', reqFrom('1.2.3.4'));
  check('one account key and one address key', keys.length === 2 && keys[0].id.startsWith('email_') && keys[1].id.startsWith('ip_'));
  check('emails and addresses are hashed, not stored raw', !keys.some((k) => /a@x\.com|1\.2\.3\.4/.test(k.id)));
  check('the first x-forwarded-for hop is the client address', loginLimitKeys('a@x.com', reqFrom('1.2.3.4'))[1].id === loginLimitKeys('a@x.com', reqFrom('1.2.3.4'))[1].id
    && loginLimitKeys('a@x.com', reqFrom('1.2.3.4'))[1].id !== loginLimitKeys('a@x.com', reqFrom('5.6.7.8'))[1].id);
  check('account cap is 10, address cap is 50', keys[0].max === 10 && keys[1].max === 50);
}

console.log('\n[2] Account lockout');
{
  const L = makeLimiter();
  const req = reqFrom('1.2.3.4');
  for (let i = 0; i < 9; i++) await L.recordLoginFailure('victim@x.com', req);
  check('9 failures: not yet limited', (await L.isLoginRateLimited('victim@x.com', req)) === false);
  await L.recordLoginFailure('victim@x.com', req);
  check('10 failures: account limited', (await L.isLoginRateLimited('victim@x.com', req)) === true);
  check('the lock follows the account to another address', (await L.isLoginRateLimited('victim@x.com', reqFrom('9.9.9.9'))) === true);
  check('other accounts from a fresh address are unaffected', (await L.isLoginRateLimited('other@x.com', reqFrom('9.9.9.9'))) === false);
  await L.clearLoginFailures('victim@x.com', req);
  check('a successful login clears the account counter', (await L.isLoginRateLimited('victim@x.com', reqFrom('9.9.9.9'))) === false);
}

console.log('\n[3] Address cap stops spraying across many accounts');
{
  const L = makeLimiter();
  const req = reqFrom('6.6.6.6');
  for (let i = 0; i < 50; i++) await L.recordLoginFailure(`user${i}@x.com`, req);
  check('50 failures across 50 accounts: the address is limited for a new account', (await L.isLoginRateLimited('fresh@x.com', req)) === true);
  await L.clearLoginFailures('user0@x.com', req);
  check('one success does not lift the address cap', (await L.isLoginRateLimited('fresh@x.com', req)) === true);
  check('the same new account from another address is allowed', (await L.isLoginRateLimited('fresh@x.com', reqFrom('7.7.7.7'))) === false);
}

console.log('\n[4] The window expires');
{
  const L = makeLimiter();
  const req = reqFrom('1.2.3.4');
  for (let i = 0; i < 10; i++) await L.recordLoginFailure('late@x.com', req);
  const realNow = Date.now;
  Date.now = () => realNow() + 16 * 60 * 1000;
  try {
    check('16 minutes later the account is no longer limited', (await L.isLoginRateLimited('late@x.com', req)) === false);
    await L.recordLoginFailure('late@x.com', req);
    const acct = L.loginLimitKeys('late@x.com', req)[0].id;
    check('a failure after the window starts a fresh count', L.store.get(acct).failures === 1);
  } finally {
    Date.now = realNow;
  }
}

console.log('\n[5] Fails open when Firestore is down');
{
  const down = makeLimiter({ failWrites: 'read' });
  check('an unreadable limiter never blocks a login', (await down.isLoginRateLimited('a@x.com', reqFrom('1.2.3.4'))) === false);
  const noWrite = makeLimiter({ failWrites: true });
  let threw = false;
  try { await noWrite.recordLoginFailure('a@x.com', reqFrom('1.2.3.4')); } catch { threw = true; }
  check('an unwritable limiter never breaks the login response', threw === false);
}

console.log('\n[6] Wiring in the login route');
const login = server.slice(server.indexOf('app.post("/api/auth/login"'), server.indexOf('app.post("/api/auth/logout"'));
const iLimit = login.indexOf('isLoginRateLimited(cleanEmail, req)');
check('the limit is checked before the account lookup', iLimit !== -1 && iLimit < login.indexOf('resolveCanonicalUserByEmail(cleanEmail)'));
check('the limit is checked before the password is verified', iLimit < login.indexOf('verifyPassword(password'));
check('a limited login answers 429 TOO_MANY_ATTEMPTS', /status\(429\)[\s\S]{0,80}TOO_MANY_ATTEMPTS/.test(login));
check('unknown account records a failure', /reason=USER_NOT_FOUND[\s\S]{0,60}await recordLoginFailure\(cleanEmail, req\)/.test(login));
check('password-not-set records a failure', /reason=PASSWORD_NOT_SET[\s\S]{0,80}await recordLoginFailure\(cleanEmail, req\)/.test(login));
check('wrong password records a failure', /reason=BAD_PASSWORD`\);\s*await recordLoginFailure\(cleanEmail, req\)/.test(login));
check('success clears the account counter before issuing the session', login.indexOf('await clearLoginFailures(cleanEmail, req)') !== -1
  && login.indexOf('await clearLoginFailures(cleanEmail, req)') < login.indexOf('issueSessionCookie(res, user)'));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
