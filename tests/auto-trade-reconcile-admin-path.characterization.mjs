// CHARACTERIZATION -- the boot-time auto-trade reconciliation reads Firestore through
// the server's Admin-SDK-aware functions.
//
// Vercel's runtime error table (2026-09-04..11) was led by
// "[Kalshi] Error during execution reconciliation: FirebaseError: Missing or
// insufficient permissions" -- 807 occurrences across 195 users. The module imported
// collection/query/where/getDocs from the client SDK, which runs unauthenticated on
// Vercel, and server.ts called it on every cold boot. It only logs unresolved
// executions; it places and changes nothing.
import { serverSrc, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('auto-trade-reconcile-admin-path.characterization');
const mod = readRepoFile('src/services/trading/kalshiExecutionEngine.ts');
const i = mod.indexOf('export async function reconcilePendingExecutions(');
const fn = mod.slice(i, mod.indexOf('\n}\n', i));
t.check('reconcile accepts injected Firestore functions', i > 0 && /fs: \{ collection: any; query: any; where: any; getDocs: any \}/.test(fn));
t.check('reconcile reads only through the injected functions', fn.includes('fs.query(') && fn.includes('fs.collection(') && fn.includes('fs.where(') && fn.includes('fs.getDocs(') && !/[^.]getDocs\(q\)/.test(fn));
t.check('reconcile still only logs; it places and writes nothing', !/setDoc|submitKalshiOrder|runTransaction/.test(fn));
t.check('server passes its Admin-aware functions and runs it only with a service account',
  serverSrc.includes('if (db && _adminActive) {') &&
  serverSrc.includes('reconcilePendingExecutions(db, { collection, query, where, getDocs })') &&
  !serverSrc.includes('reconcilePendingExecutions(db).catch'));

t.done();
