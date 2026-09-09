// REGRESSION TESTS -- DEV / PROD PERSISTENCE SEPARATION
//
// Proves: LOCAL REPLAY -> ZERO PRODUCTION WRITES.
//
// Executes the REAL write-authorization block and the REAL shim write functions
// (setDoc, deleteDoc, writeBatch, runTransaction) extracted verbatim from
// server.ts, under controlled process.env. No network, no Firestore.
//
// WHY THIS EXISTS
//   Running `node dist/server.cjs` on a developer machine started the full
//   engine against whatever credentials were in .env and immediately began
//   issuing Firestore writes -- telemetry observations, cycle locks, signal
//   logs. The only reason nothing reached production was that the credentials
//   failed to load. That is luck, not architecture.
//
//   The guard sits at the shim, which every write in server.ts routes through,
//   so a new call site cannot forget it.
import { serverSrc, sliceBetween, sliceThrough, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

// The Firestore shim is the one genuinely TypeScript-annotated region of
// server.ts, so the slices are transpiled with esbuild (already a dependency)
// rather than regex-stripped. This strips types only -- the logic executed is
// still the shipped logic, character for character.
const stripTypes = (src) => transformSync(src, { loader: 'ts', format: 'cjs' }).code;

const t = createHarness('persistence-write-guard.invariants');

const guardSrc = sliceBetween(
  serverSrc,
  'const VIXY_PERSISTENCE_READONLY = (() => {',
  'function getPersistenceWriteGuardState()',
  'write guard',
);
const stateFnSrc = sliceBetween(
  serverSrc,
  'function getPersistenceWriteGuardState()',
  'function _wrapDocSnap(',
  'guard state fn',
);
const setDocSrc = sliceBetween(serverSrc, 'async function setDoc(', 'async function deleteDoc(', 'setDoc');
const deleteDocSrc = sliceBetween(serverSrc, 'async function deleteDoc(', 'function writeBatch(', 'deleteDoc');
const writeBatchSrc = sliceBetween(serverSrc, 'function writeBatch(', 'async function runTransaction(', 'writeBatch');
// End at the function's own closing brace, not at the next function: the region
// between them contains an import and process.on handlers.
const runTxSrc = sliceThrough(serverSrc, 'async function runTransaction(', '    return updateFn(wrappedTx);\n  });\n}', 'runTransaction');

/**
 * Builds a sandbox containing the real guard + the real shim writers, with a
 * recording fake Firestore behind them. Any write that reaches the fake is a
 * write that would have reached production.
 */
function buildShim(env) {
  const writesReachingBackend = [];
  const mkRef = (path) => ({
    path,
    set: async (d, o) => { writesReachingBackend.push(`set:${path}`); },
    delete: async () => { writesReachingBackend.push(`delete:${path}`); },
    update: async (d) => { writesReachingBackend.push(`update:${path}`); },
    get: async () => ({ id: path, exists: false, data: () => undefined, ref: mkRef(path) }),
  });
  const adminDb = {
    batch: () => ({
      set: (r) => writesReachingBackend.push(`batch.set:${r.path}`),
      update: (r) => writesReachingBackend.push(`batch.update:${r.path}`),
      delete: (r) => writesReachingBackend.push(`batch.delete:${r.path}`),
      commit: async () => writesReachingBackend.push('batch.commit'),
    }),
    runTransaction: async (fn) => fn({
      get: async (r) => ({ id: r.path, exists: false, data: () => undefined, ref: r }),
      set: (r) => writesReachingBackend.push(`tx.set:${r.path}`),
      update: (r) => writesReachingBackend.push(`tx.update:${r.path}`),
      delete: (r) => writesReachingBackend.push(`tx.delete:${r.path}`),
    }),
  };
  const body = `
    const process = { env: __env };
    const adminDb = __adminDb;
    const _adminActive = true;
    const _clientSetDoc = () => {}, _clientDeleteDoc = () => {},
          _clientWriteBatch = () => {}, _clientRunTransaction = () => {};
    const _wrapDocSnap = (s) => s;
    ${stripTypes([guardSrc, stateFnSrc, setDocSrc, deleteDocSrc, writeBatchSrc, runTxSrc].join('\n'))}
    return { setDoc, deleteDoc, writeBatch, runTransaction,
             VIXY_PERSISTENCE_READONLY, getPersistenceWriteGuardState };
  `;
  const api = new Function('__env', '__adminDb', 'console', body)(env, adminDb, { warn() {}, log() {} });
  return { ...api, writesReachingBackend, mkRef };
}

async function attemptEveryWriteKind(shim) {
  const ref = shim.mkRef('signal_logs/sig_lock_123');
  await shim.setDoc(ref, { a: 1 });
  await shim.setDoc(ref, { a: 1 }, { merge: true });
  await shim.deleteDoc(ref);
  const b = shim.writeBatch({});
  b.set(ref, { a: 1 });
  b.update(ref, { a: 1 });
  b.delete(ref);
  await b.commit();
  await shim.runTransaction({}, async (tx) => { tx.set(ref, { a: 1 }); tx.update(ref, { a: 2 }); tx.delete(ref); });
}

// ---------------------------------------------------------------------------
t.section('LOCAL RUN (no VERCEL env) -> ZERO writes reach the backend');
// This is the exact scenario that prompted the guard: `node dist/server.cjs` on
// a laptop, with production credentials present and loading successfully.
const local = buildShim({});
t.eq('readonly is engaged', local.VIXY_PERSISTENCE_READONLY, true);
await attemptEveryWriteKind(local);
t.eq('writes reaching the backend', local.writesReachingBackend.length, 0);
// 7, not 8: setDoc x2, deleteDoc, batch.set, batch.update, batch.delete,
// runTransaction. batch.commit() records nothing because it commits nothing.
t.eq('every write attempt was recorded as blocked',
  local.getPersistenceWriteGuardState().blockedWriteCount, 7);
t.check('guard reports why', local.getPersistenceWriteGuardState().reason.includes('not running inside a deployment'),
  local.getPersistenceWriteGuardState().reason);
t.check('blocked targets name the document path',
  local.getPersistenceWriteGuardState().blockedWriteTargets.some((x) => x.includes('signal_logs/sig_lock_123')),
  JSON.stringify(local.getPersistenceWriteGuardState().blockedWriteTargets.slice(0, 3)));

t.section('a refused transaction does not run its body at all');
// A partially-applied transaction would be worse than none, so the whole thing
// is refused rather than run with writes silently dropped.
let txBodyRan = false;
const localTx = buildShim({});
await localTx.runTransaction({}, async () => { txBodyRan = true; });
t.eq('transaction body did not execute', txBodyRan, false);
t.eq('transaction produced no backend writes', localTx.writesReachingBackend.length, 0);

t.section('a refused batch commits nothing');
const localBatch = buildShim({});
const bb = localBatch.writeBatch({});
bb.set(localBatch.mkRef('x/y'), {});
await bb.commit();
t.eq('batch produced no backend writes', localBatch.writesReachingBackend.length, 0);

t.section('CI / replay context is equally refused');
for (const env of [{ CI: 'true' }, { NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { FIREBASE_SERVICE_ACCOUNT_JSON: '{"x":1}' }]) {
  const sh = buildShim(env);
  await attemptEveryWriteKind(sh);
  t.eq(`env ${JSON.stringify(env)} -> zero writes`, sh.writesReachingBackend.length, 0);
}
// NODE_ENV=production is NOT sufficient: it is trivially set on a laptop.
t.eq('NODE_ENV=production alone does not unlock writes', buildShim({ NODE_ENV: 'production' }).VIXY_PERSISTENCE_READONLY, true);

t.section('a real Vercel deployment CAN write (production must not break)');
const deployed = buildShim({ VERCEL: '1', VERCEL_ENV: 'production' });
t.eq('readonly is NOT engaged', deployed.VIXY_PERSISTENCE_READONLY, false);
await attemptEveryWriteKind(deployed);
t.check('writes reach the backend', deployed.writesReachingBackend.length > 0,
  `count=${deployed.writesReachingBackend.length}`);
t.check('setDoc reached the backend', deployed.writesReachingBackend.includes('set:signal_logs/sig_lock_123'));
t.check('deleteDoc reached the backend', deployed.writesReachingBackend.includes('delete:signal_logs/sig_lock_123'));
t.check('batch committed', deployed.writesReachingBackend.includes('batch.commit'));
t.check('transaction wrote', deployed.writesReachingBackend.some((w) => w.startsWith('tx.')));
t.eq('nothing was recorded as blocked', deployed.getPersistenceWriteGuardState().blockedWriteCount, 0);

t.section('explicit overrides');
t.eq('VIXY_ALLOW_PRODUCTION_WRITES=true unlocks writes off-deployment',
  buildShim({ VIXY_ALLOW_PRODUCTION_WRITES: 'true' }).VIXY_PERSISTENCE_READONLY, false);
t.eq('VIXY_PERSISTENCE_MODE=readonly wins even inside a deployment',
  buildShim({ VERCEL: '1', VERCEL_ENV: 'production', VIXY_PERSISTENCE_MODE: 'readonly' }).VIXY_PERSISTENCE_READONLY, true);
t.eq('VIXY_PERSISTENCE_MODE=readonly beats the allow flag',
  buildShim({ VIXY_ALLOW_PRODUCTION_WRITES: 'true', VIXY_PERSISTENCE_MODE: 'readonly' }).VIXY_PERSISTENCE_READONLY, true);
// Only the exact string unlocks -- no truthiness surprises.
for (const v of ['1', 'yes', 'TRUE', '']) {
  t.eq(`VIXY_ALLOW_PRODUCTION_WRITES=${JSON.stringify(v)} does NOT unlock`,
    buildShim({ VIXY_ALLOW_PRODUCTION_WRITES: v }).VIXY_PERSISTENCE_READONLY, true);
}

t.section('structural: every shim writer consults the guard');
t.check('setDoc guards', /async function setDoc\([\s\S]{0,200}?_writeAllowed\("setDoc"/.test(serverSrc));
t.check('deleteDoc guards', /async function deleteDoc\([\s\S]{0,200}?_writeAllowed\("deleteDoc"/.test(serverSrc));
t.check('writeBatch guards', /function writeBatch\([\s\S]{0,200}?VIXY_PERSISTENCE_READONLY/.test(serverSrc));
t.check('runTransaction guards', /async function runTransaction\([\s\S]{0,300}?VIXY_PERSISTENCE_READONLY/.test(serverSrc));
// No write may bypass the shim.
const codeOnly = serverSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
t.check('no direct adminDb.batch() outside the shim',
  (codeOnly.match(/adminDb\.batch\(\)/g) || []).length === 1);
t.check('no direct adminDb.runTransaction outside the shim',
  (codeOnly.match(/adminDb\.runTransaction\(/g) || []).length === 1);

t.done();
