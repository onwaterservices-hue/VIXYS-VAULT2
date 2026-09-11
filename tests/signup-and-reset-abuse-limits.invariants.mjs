// RUNTIME INVARIANT TESTS — SIGNUP AND PASSWORD-RESET ABUSE LIMITS
//
// /api/auth/register had no limit at all, and /api/auth/forgot-password was
// capped per target email only: one client could create unlimited accounts
// (Firestore writes) and make the site send reset emails to unlimited addresses
// (Resend quota and sender reputation). Both now draw from a per-address budget.
// Executes the REAL budget source against an in-memory Firestore and asserts
// where the two routes call it.
import { readFileSync } from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== SIGNUP & RESET ABUSE LIMIT INVARIANTS ===\n');

const src = server.slice(server.indexOf('function requestClientAddress('), server.indexOf('__name(consumeAuthAddressBudget,'));
check('budget source located', src.length > 400);

function makeBudget({ failTx = false } = {}) {
  const store = new Map();
  const snap = (id) => ({ exists: () => store.has(id), data: () => ({ ...store.get(id) }) });
  const doc = (_db, _c, id) => ({ id });
  const runTransaction = async (_db, fn) => {
    if (failTx) throw new Error('down');
    return fn({ get: async (ref) => snap(ref.id), set: (ref, v) => store.set(ref.id, { ...v }) });
  };
  const api = new Function('db', '_adminActive', 'doc', 'runTransaction', 'crypto', '__name', 'console',
    `${src}; return { requestClientAddress, consumeAuthAddressBudget };`,
  )({}, true, doc, runTransaction, crypto, () => {}, { warn() {} });
  return { ...api, store };
}
const reqFrom = (ip) => ({ headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` }, socket: { remoteAddress: '10.0.0.1' } });

console.log('[1] Address resolution');
{
  const { requestClientAddress } = makeBudget();
  check('first x-forwarded-for hop is the client', requestClientAddress(reqFrom('1.2.3.4')) === '1.2.3.4');
  check('falls back to the socket address', requestClientAddress({ headers: {}, socket: { remoteAddress: '9.9.9.9' } }) === '9.9.9.9');
}

console.log('\n[2] Budget per action and address');
{
  const B = makeBudget();
  const req = reqFrom('1.2.3.4');
  const results = [];
  for (let i = 0; i < 11; i++) results.push(await B.consumeAuthAddressBudget(req, 'register', 10));
  check('10 attempts allowed', results.slice(0, 10).every((r) => r === true));
  check('the 11th is refused', results[10] === false);
  check('a different action has its own budget', (await B.consumeAuthAddressBudget(req, 'reset', 10)) === true);
  check('a different address has its own budget', (await B.consumeAuthAddressBudget(reqFrom('5.6.7.8'), 'register', 10)) === true);
  check('addresses are hashed, never stored raw', ![...B.store.keys()].some((k) => k.includes('1.2.3.4')));
}

console.log('\n[3] Window expiry');
{
  const B = makeBudget();
  const req = reqFrom('1.2.3.4');
  for (let i = 0; i < 10; i++) await B.consumeAuthAddressBudget(req, 'register', 10);
  const realNow = Date.now;
  Date.now = () => realNow() + 61 * 60 * 1000;
  try {
    check('61 minutes later the budget is fresh', (await B.consumeAuthAddressBudget(req, 'register', 10)) === true);
  } finally {
    Date.now = realNow;
  }
}

console.log('\n[4] Fails open');
{
  const B = makeBudget({ failTx: true });
  check('an unreachable store never blocks signup or reset', (await B.consumeAuthAddressBudget(reqFrom('1.2.3.4'), 'register', 10)) === true);
  const noAddr = makeBudget();
  check('a request with no resolvable address is not blocked', (await noAddr.consumeAuthAddressBudget({ headers: {}, socket: {} }, 'register', 10)) === true);
}

console.log('\n[5] Wiring');
const register = server.slice(server.indexOf('app.post("/api/auth/register"'), server.indexOf('\napp.', server.indexOf('app.post("/api/auth/register"') + 10));
const iReg = register.indexOf('consumeAuthAddressBudget(req, "register", 10)');
check('register draws from its budget', iReg !== -1);
check('register checks the budget before looking up the account', iReg < register.indexOf('resolveCanonicalUserByEmail(cleanEmail)'));
check('register answers 429 TOO_MANY_SIGNUPS when exhausted', /status\(429\)[\s\S]{0,80}TOO_MANY_SIGNUPS/.test(register));

const forgot = server.slice(server.indexOf('app.post("/api/auth/forgot-password"'), server.indexOf('\napp.', server.indexOf('app.post("/api/auth/forgot-password"') + 10));
const iForgot = forgot.indexOf('consumeAuthAddressBudget(req, "password_reset", 10)');
check('forgot-password draws from its budget', iForgot !== -1);
check('it is checked before any account lookup or email send', iForgot < forgot.indexOf('resolveCanonicalUserByEmail(cleanEmail)') && iForgot < forgot.indexOf('api.resend.com'));
check('an exhausted budget returns the same generic response (no enumeration)', /consumeAuthAddressBudget\(req, "password_reset", 10\)\)\)\s*\{[\s\S]{0,160}return res\.json\(genericResponse\)/.test(forgot));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
