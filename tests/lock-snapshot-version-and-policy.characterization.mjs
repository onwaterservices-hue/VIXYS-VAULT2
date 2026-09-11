// CHARACTERIZATION -- lock snapshots name the real version; served locks say what confidence is.
//
// lock15mCycle stamped the snapshot with engineVersion "VIXY-VAULT-v5", a version
// that does not exist; the ledger row already carries lockModelVersion. Locked
// confidence is round(rule p x 100) under STRIKE_SIDE_RULE (a measured cell win
// rate) and the engine score under the engine-gate policies, but /api/vixy/state
// served it without lockPolicy, so a client could not label it.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('lock-snapshot-version-and-policy.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const lines = code.split('\n');

t.check('no invented engine version', !code.includes('VIXY-VAULT-v5'));
t.check('snapshot records the deciding version', code.includes('engineVersion: lockModelVersion,'));
{
  const sites = [];
  lines.forEach((l, i) => {
    if (/^\s+(lockedConfidence|confidence): active15mCycle\.lockedConfidence\b/.test(l)) sites.push(i);
  });
  t.check('locked-confidence payloads found', sites.length > 0, `${sites.length}`);
  const missing = sites.filter((i) => !lines.slice(Math.max(0, i - 15), i + 16).join('\n').includes('lockPolicy'));
  t.eq('every locked-confidence payload carries lockPolicy', missing.length, 0);
}
{
  const i = code.indexOf('lockedPrediction: isLocked');
  t.check('/api/vixy/state lockedPrediction carries lockPolicy', i > 0 && code.slice(i, i + 700).includes('lockPolicy: active15mCycle.lockPolicy ?? null'));
}
t.check('(still true) locking records the policy on the cycle', code.includes('active15mCycle.lockPolicy = lockPolicy;'));

t.done();
