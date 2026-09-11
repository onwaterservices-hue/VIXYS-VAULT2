// RUNTIME INVARIANT TESTS — HEAVY CRON ROUTES RUN AT MOST ONCE PER WINDOW
//
// Cron routes are public URLs (no CRON_SECRET is configured, so a Vercel cron
// request cannot be told apart from anyone else's). Two of them do real
// external work on every call:
//   - /api/cron/backtest-refresh: ~58 Coinbase candle requests + a Firestore
//     write. Looping it could get the server rate-limited by Coinbase, which
//     the live engine also reads.
//   - /api/cron/referral-leaderboard: rebuilds the leaderboard from all
//     referral data.
// A Firestore claim now limits each to one run per window no matter who calls;
// a repeat call gets the recorded result instead of redoing the work.
// Executes the REAL claim helper against an in-memory Firestore.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== HEAVY CRON COALESCING INVARIANTS ===\n');

const src = server.slice(server.indexOf('async function claimCronWindow('), server.indexOf('__name(recordCronWindowResult,'));
check('claim helper source located', src.length > 300);

function makeHelpers({ failTx = false, readonly = false } = {}) {
  const store = new Map();
  const snap = (id) => ({ exists: () => store.has(id), data: () => ({ ...store.get(id) }) });
  const doc = (_db, _c, id) => ({ id });
  const setDoc = async (ref, v, o) => { store.set(ref.id, o && o.merge && store.has(ref.id) ? { ...store.get(ref.id), ...v } : { ...v }); };
  const runTransaction = async (_db, fn) => {
    if (failTx) throw new Error('down');
    if (readonly) return undefined;
    return fn({ get: async (ref) => snap(ref.id), set: (ref, v) => store.set(ref.id, { ...v }) });
  };
  const api = new Function('db', '_adminActive', 'doc', 'setDoc', 'runTransaction', '__name', 'console',
    `${src}; return { claimCronWindow, recordCronWindowResult };`,
  )({}, true, doc, setDoc, runTransaction, () => {}, { warn() {} });
  return { ...api, store };
}

console.log('[1] One run per window');
{
  const H = makeHelpers();
  const first = await H.claimCronWindow('backtest_refresh', 6 * 3600e3);
  check('the first call in a window claims the run', first.claimed === true);
  const second = await H.claimCronWindow('backtest_refresh', 6 * 3600e3);
  check('a second call in the same window does not', second.claimed === false);
  await H.recordCronWindowResult(first, { success: true, candleCount: 4320 });
  const third = await H.claimCronWindow('backtest_refresh', 6 * 3600e3);
  check('a repeat call receives the recorded result of the run', third.claimed === false && third.prior?.result?.candleCount === 4320 && third.prior?.status === 'DONE');
  check('other jobs have their own windows', (await H.claimCronWindow('referral_leaderboard', 600e3)).claimed === true);
  const realNow = Date.now;
  Date.now = () => realNow() + 6 * 3600e3 + 1000;
  try {
    check('the next window can run again', (await H.claimCronWindow('backtest_refresh', 6 * 3600e3)).claimed === true);
  } finally {
    Date.now = realNow;
  }
}

console.log('\n[2] Never blocks the job when the claim cannot be made');
{
  const down = makeHelpers({ failTx: true });
  const c = await down.claimCronWindow('backtest_refresh', 6 * 3600e3);
  check('Firestore failure: the job runs, as before', c.claimed === true && c.ref === null);
  let threw = false;
  try { await down.recordCronWindowResult(c, { ok: true }); } catch { threw = true; }
  check('recording without a claim is a no-op', threw === false);
  const ro = makeHelpers({ readonly: true });
  check('read-only persistence: the job runs, as before', (await ro.claimCronWindow('backtest_refresh', 6 * 3600e3)).claimed === true);
}

console.log('\n[3] Wiring');
const route = (sig) => { const s = server.indexOf(sig); return s === -1 ? '' : server.slice(s, server.indexOf('\napp.', s + sig.length)); };
const backtest = route('app.all("/api/cron/backtest-refresh"');
const leaderboard = route('app.all("/api/cron/referral-leaderboard"');
check('backtest-refresh claims a 6-hour window before fetching candles',
  /claimCronWindow\("backtest_refresh", 6 \* 60 \* 60 \* 1000\)/.test(backtest) &&
  backtest.indexOf('claimCronWindow(') < backtest.indexOf('fetchBacktestCandles('));
check('backtest-refresh skips with the prior result when already run', /if \(!claim\.claimed\)[\s\S]{0,200}ALREADY_RAN_THIS_WINDOW[\s\S]{0,80}lastRun: claim\.prior/.test(backtest));
check('backtest-refresh records its result', /recordCronWindowResult\(claim, /.test(backtest));
check('referral-leaderboard claims a 10-minute window before rebuilding',
  /claimCronWindow\("referral_leaderboard", 10 \* 60 \* 1000\)/.test(leaderboard) &&
  leaderboard.indexOf('claimCronWindow(') < leaderboard.indexOf('rebuildLeaderboard('));
check('referral-leaderboard skips when already run', /if \(!claim\.claimed\)[\s\S]{0,200}ALREADY_RAN_THIS_WINDOW/.test(leaderboard));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
