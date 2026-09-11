// CHARACTERIZATION -- instances that adopt a Firestore lock also adopt its lockPolicy.
//
// Only the locking instance set active15mCycle.lockPolicy. Instances serving
// requests adopt the lock from active_cycle_lock/{cycleId} in three routes and
// copied direction, confidence, probability, strike, spot, lockedAt, reason and
// decision -- not lockPolicy -- so production /api/vixy/state served
// lockedPrediction.lockPolicy null while a lock was live (2026-09-11 17:22Z).
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('lock-policy-adoption.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const ADOPT = 'if (typeof lockData.lockPolicy === "string") active15mCycle.lockPolicy = lockData.lockPolicy;';

const reads = [];
let i = code.indexOf('const lockData = lockDocSnap.data();');
while (i >= 0) { reads.push(i); i = code.indexOf('const lockData = lockDocSnap.data();', i + 1); }
t.eq('three adoption blocks read the lock document', reads.length, 3);
for (const [n, at] of reads.entries()) {
  const block = code.slice(at, at + 2500);
  const copy = block.indexOf(ADOPT);
  const divergence = block.indexOf('active15mCycle.lockedDirection !== adoptedDir');
  t.check(`adoption ${n + 1} copies lockPolicy`, copy > 0);
  t.check(`adoption ${n + 1} copies it before the divergence check`, copy > 0 && divergence > 0 && copy < divergence);
}
{
  const a = code.indexOf('let lockDataToUse = {');
  t.check('(still true) the lock document carries lockPolicy', a > 0 && code.slice(a, a + 600).includes('lockPolicy,'));
}
t.check('(still true) served locked prediction carries lockPolicy', code.includes('lockPolicy: active15mCycle.lockPolicy ?? null'));

t.done();
