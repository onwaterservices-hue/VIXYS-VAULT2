// RUNTIME INVARIANT TESTS — A FAILED CRON RUN IS RECORDED AS FAILED
//
// claimCronWindow (#92) limits heavy cron routes to one run per window. Its
// result was only recorded on success, so a run that threw left its claim at
// RUNNING for the whole window: repeat calls reported a job "in progress" that
// had already failed. Observed in production on 2026-09-11 when
// /api/cron/referral-leaderboard returned 503 and the next call reported
// lastRun.status RUNNING. Failures now record status FAILED with the error.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== CRON FAILURE RECORDING INVARIANTS ===\n');

const src = server.slice(server.indexOf('async function claimCronWindow('), server.indexOf('__name(recordCronWindowResult,'));
const store = new Map();
const snap = (id) => ({ exists: () => store.has(id), data: () => ({ ...store.get(id) }) });
const H = new Function('db', '_adminActive', 'doc', 'setDoc', 'runTransaction', '__name', 'console',
  `${src}; return { claimCronWindow, recordCronWindowResult };`,
)({}, true, (_d, _c, id) => ({ id }),
  async (ref, v, o) => { store.set(ref.id, o && o.merge && store.has(ref.id) ? { ...store.get(ref.id), ...v } : { ...v }); },
  async (_d, fn) => fn({ get: async (ref) => snap(ref.id), set: (ref, v) => store.set(ref.id, { ...v }) }),
  () => {}, { warn() {} });

const claim = await H.claimCronWindow('referral_leaderboard', 600e3);
await H.recordCronWindowResult(claim, { ok: false, error: 'PERMISSION_DENIED' }, 'FAILED');
const repeat = await H.claimCronWindow('referral_leaderboard', 600e3);
check('a failed run is recorded as FAILED, not left RUNNING', repeat.claimed === false && repeat.prior?.status === 'FAILED');
check('the failure reason is kept', repeat.prior?.result?.error === 'PERMISSION_DENIED');
const ok = await H.claimCronWindow('backtest_refresh', 6 * 3600e3);
await H.recordCronWindowResult(ok, { success: true });
check('a successful run still records DONE by default', (await H.claimCronWindow('backtest_refresh', 6 * 3600e3)).prior?.status === 'DONE');

const route = (sig) => { const s = server.indexOf(sig); return server.slice(s, server.indexOf('\napp.', s + sig.length)); };
const lb = route('app.all("/api/cron/referral-leaderboard"');
const bt = route('app.all("/api/cron/backtest-refresh"');
check('leaderboard failure path records FAILED', /catch \(e\)[\s\S]{0,300}recordCronWindowResult\(claim, \{ ok: false, error: [\s\S]{0,60}\}, "FAILED"\)/.test(lb));
check('backtest insufficient-data path records FAILED', /INSUFFICIENT_CANDLE_DATA[\s\S]{0,200}recordCronWindowResult\(claim, insufficient, "FAILED"\)/.test(bt));
check('backtest exception path records FAILED', /BACKTEST_REFRESH_FAILED[\s\S]{0,120}recordCronWindowResult\(claim, failed, "FAILED"\)/.test(bt));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
