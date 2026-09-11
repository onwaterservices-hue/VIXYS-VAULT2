// RUNTIME INVARIANT TESTS — REFERRAL CREDITS RUN ON THE SERVER'S ADMIN DATAPATH
//
// src/services/referral/referralRewards.ts imported doc/getDoc/setDoc/... from
// the Firebase CLIENT SDK. In production the backend's datapath is the Admin SDK
// service account and the client SDK is never signed in, so firestore.rules
// (isBackendSystem) rejected every read and write: balances, redemptions,
// payout tickets, referral rewards, reversals and the leaderboard. Observed
// 2026-09-11: GET /api/cron/referral-leaderboard -> 503.
//
// Bundles the REAL module with esbuild, injects a fake datapath, and proves the
// functions read and write through it (and never through the client SDK).
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { buildSync } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const R = (p) => readFileSync(join(root, p), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== REFERRAL REWARDS DATAPATH INVARIANTS ===\n');

console.log('[1] Source');
const mod = R('src/services/referral/referralRewards.ts');
const server = R('server.ts');
const afterInjection = mod.slice(mod.indexOf('export function useReferralRewardsDatapath('));
const bare = afterInjection.match(/(?<![.\w])(doc|getDoc|setDoc|collection|query|where|getDocs|runTransaction)\(/g) || [];
check('no Firestore call bypasses the injectable datapath', bare.length === 0, bare.join(','));
check('the module exports useReferralRewardsDatapath', /export function useReferralRewardsDatapath\(/.test(mod));
check('server.ts injects its Admin-aware datapath', /useReferralRewardsDatapath\(discordFirestore\);/.test(server));
check('the injection happens right after the datapath is defined',
  server.indexOf('useReferralRewardsDatapath(discordFirestore);') > server.indexOf('const discordFirestore = {') &&
  server.indexOf('useReferralRewardsDatapath(discordFirestore);') < server.indexOf('"/api/discord/connect",'));

console.log('\n[2] Behaviour of the real module through an injected datapath');
const outDir = join(root, 'node_modules', '.cache', 'vixy-tests');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'referralRewards.bundle.mjs');
buildSync({
  entryPoints: [join(root, 'src/services/referral/referralRewards.ts')],
  bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent',
  external: ['firebase/*'],
});
const M = await import(pathToFileURL(outfile).href + '?t=' + Date.now());

const store = new Map();
const calls = [];
const snap = (path) => ({ id: path.split('/').pop(), exists: () => store.has(path), data: () => store.get(path) });
const fakeFx = {
  doc: (_db, coll, id) => { calls.push('doc'); return { path: `${coll}/${id}` }; },
  collection: (_db, name) => { calls.push('collection'); return { name }; },
  where: (f, op, v) => ({ where: [f, op, v] }),
  query: (c, ...cs) => ({ name: c.name, cs }),
  getDoc: async (ref) => { calls.push('getDoc'); return snap(ref.path); },
  setDoc: async (ref, v) => { calls.push('setDoc'); store.set(ref.path, v); },
  getDocs: async (q) => {
    calls.push('getDocs');
    const docs = [...store.keys()].filter((k) => k.startsWith((q.name) + '/')).map(snap)
      .filter((s) => (q.cs || []).filter((c) => c.where).every((c) => s.data()[c.where[0]] === c.where[2]));
    return { docs, size: docs.length, empty: docs.length === 0, forEach: (cb) => docs.forEach(cb) };
  },
  runTransaction: async (_db, fn) => { calls.push('runTransaction'); return fn({ get: async (ref) => snap(ref.path), set: (ref, v) => store.set(ref.path, v) }); },
};
M.useReferralRewardsDatapath(fakeFx);

store.set('referral_rewards/r1', { referrerUserId: 'alice@example.com', status: 'AVAILABLE' });
store.set('referral_rewards/r2', { referrerUserId: 'alice@example.com', status: 'PENDING' });
store.set('referral_rewards/r3', { referrerUserId: 'bob@example.com', status: 'AVAILABLE' });
store.set('referral_rewards/r4', { referrerUserId: 'bob@example.com', status: 'REVERSED' });

let threw = null;
let result = null;
try { result = await M.rebuildLeaderboard(null); } catch (e) { threw = e; }
check('rebuildLeaderboard runs with no client db handle (Admin datapath)', threw === null, String(threw));
check('it read rewards and wrote the leaderboard through the injected datapath', calls.includes('getDocs') && calls.includes('setDoc'));
const board = store.get('referral_leaderboard/current');
check('the leaderboard was written', !!board && Array.isArray(board.entries));
check('conversions are counted and reversed rewards excluded', result?.entries === 2 && board.entries[0].conversions === 2 && board.entries[1].conversions === 1);
check('emails are masked in stored handles', board.entries.every((e) => !e.handle.includes('@')));

calls.length = 0;
const ranked = await M.getLeaderboardWithRank(null, 'bob@example.com');
check('getLeaderboardWithRank reads through the injected datapath', calls.includes('getDoc') && ranked.you?.rank === 2);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
