// The Layer-5 shadow must SURVIVE the serverless instance that recorded it.
// v1 lived in one instance's memory and reached the ledger on 2 of 200 rows.
// v2 merges each instance's slice into shadow_l5/<cycleId> and settlement
// merges them back. It stays observation-only: nothing here may touch the
// gate's `allowed`, and no would-lock may ever be invented.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';
const t = createHarness('l5-shadow-durable.invariants');

t.section('the recorder writes a durable slice, but never waits and never decides');
const recorder = sliceBetween(serverSrc, '// ── LAYER 5 SHADOW (observation only', '// ── CONVICTION TRAIL (observation only)', 'shadow recorder');
t.check('slice carries coverage (firstSec/lastSec) and a downsampled eval trail', recorder.includes('firstSec: effElapsed, lastSec: effElapsed, evals: []') && recorder.includes('if (sh.evals.length < 60) sh.evals.push('));
t.check('a write is triggered only when the cell changes or the rule fires', recorder.includes('if (cellChanged || lockJustSet) void persistShadowL5(sh, lockJustSet);'));
const recorderCode = recorder.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('the recorder never references the gate verdict (code, not comments)', !/\ballowed\b/.test(recorderCode));
t.check('would-lock still requires p >= bar inside the legal window', recorder.includes('strikeSide.p >= VIXY_LOCK_RULE_BAR && effElapsed >= 360 && effElapsed < 780'));

t.section('persistShadowL5: throttled, guarded, merge-write, no queue');
const persist = sliceBetween(serverSrc, 'async function persistShadowL5(', '__name(persistShadowL5', 'persistShadowL5');
t.check('throttled to one write per 30s per cycle unless forced', serverSrc.includes('const SHADOW_L5_WRITE_MIN_INTERVAL_MS = 30e3;') && persist.includes('if (!force && now - last < SHADOW_L5_WRITE_MIN_INTERVAL_MS) return;'));
t.check('respects the Firestore write guard', persist.includes('if (!canAttemptFirestoreWrite(`shadow_l5/${sh.cycleId}`)) return;'));
t.check('merge-writes its own instance slice only', persist.includes('byInstance: { [SHADOW_INSTANCE_ID]: shadowL5InstanceSlice(sh) }') && persist.includes('{ merge: true }'));
t.check('tags the record SHADOW_L5_v2', persist.includes('recordedBy: "SHADOW_L5_v2"'));
t.check('no pending-queue retry (observation only)', !persist.includes('pendingSignalLogsQueue') && !persist.includes('pendingTelemetryQueue'));

t.section('settlement, skip and reconciliation all merge the durable record');
t.check('settled rows flush local, read remote, merge', (serverSrc.match(/const shRemote = await readShadowL5Doc\(/g) || []).length >= 3);
t.check('settle path merges with the engine decision', serverSrc.includes('mergeShadowL5Record(shRemote, shLocal, prevLog.decision || null)'));
t.check('skip path merges with "SKIP"', serverSrc.includes('mergeShadowL5Record(shRemote, shLocal, "SKIP")'));
t.check('reconciled rows get the remote-only record', serverSrc.includes('mergeShadowL5Record(shRemote, null, row.decision)'));
t.check('v1 in-memory-only attachment is gone', !serverSrc.includes('recordedBy: "SHADOW_L5_v1"'));

t.section('mergeShadowL5Record behaviour');
const sliceFn = sliceBetween(serverSrc, 'function shadowL5InstanceSlice(', '__name(shadowL5InstanceSlice', 'shadowL5InstanceSlice');
const mergeFn = sliceBetween(serverSrc, 'function mergeShadowL5Record(', '__name(mergeShadowL5Record', 'mergeShadowL5Record');
const merge = new Function('SHADOW_INSTANCE_ID', 'VIXY_LOCK_RULE_BAR', `${sliceFn}; ${mergeFn}; return mergeShadowL5Record;`)('me', 0.95);
t.check('null when there is nothing to merge', merge(null, null, 'SKIP') === null && merge({ byInstance: {} }, null, 'SKIP') === null);
const remote = {
  cycleId: 'c1', bar: 0.95, tableVersion: 'strike-side-v1',
  byInstance: {
    a: { ticks: 120, firstSec: 0, lastSec: 360, lastEval: { atSec: 360, p: 0.9, side: 'UP', key: '360|1|L' }, wouldLock: null, evals: [] },
    b: { ticks: 90, firstSec: 400, lastSec: 700, lastEval: { atSec: 700, p: 0.97, side: 'UP', key: '660|1|L' }, wouldLock: { atSec: 520, side: 'UP', p: 0.96, n: 80, key: '480|1|L' }, evals: [] },
  },
};
const local = { cycleId: 'c1', bar: 0.95, tableVersion: 'strike-side-v1', ticks: 30, firstSec: 720, lastSec: 840, lastEval: { atSec: 840, p: 0.99, side: 'UP', key: '840|1|L' }, wouldLock: { atSec: 730, side: 'UP', p: 0.98, n: 60, key: '720|1|L' }, evals: [] };
const m = merge(remote, local, 'BUY_UP');
t.check('ticks are summed across instances', m.ticks === 240);
t.check('instances counted', m.instances === 3);
t.check('EARLIEST would-lock wins (the rule fires once)', m.wouldLock && m.wouldLock.atSec === 520 && m.wouldLock.p === 0.96);
t.check('LATEST evaluation wins', m.lastEval && m.lastEval.atSec === 840);
t.check('coverage envelope is the union', m.firstSec === 0 && m.lastSec === 840);
t.check('engine decision and v2 tag attached', m.engineDecision === 'BUY_UP' && m.recordedBy === 'SHADOW_L5_v2');
const noLock = merge({ cycleId: 'c2', byInstance: { a: { ticks: 5, wouldLock: null, lastEval: null } } }, null, 'SKIP');
t.check('never invents a would-lock', noLock.wouldLock === null && noLock.lastEval === null && noLock.ticks === 5);
t.check('bar falls back to the configured bar, never a literal', noLock.bar === 0.95 && !/bar:\s*0\.9\d/.test(mergeFn));

t.section('research readout is admin-gated and read-only');
const ep = sliceBetween(serverSrc, 'app.get("/api/research/shadow-l5"', 'function canAttemptFirestoreWrite(', 'shadow-l5 endpoint');
t.check('gated by requireRole OWNER/ADMIN', ep.includes('requireRole(["OWNER", "ADMIN"])'));
t.check('never writes', !ep.includes('setDoc(') && !ep.includes('updateDoc(') && !ep.includes('persistSingleSignalLog('));
t.check('grades the rule against the settled outcome only', ep.includes("ruleResult = wl.side === outcome ? \"WIN\" : \"LOSS\";") && ep.includes('out.rule.ungraded += 1;'));
t.check('states it is observation only and must be read next to the OOS replay', ep.includes('Observation only.') && ep.includes('L5_FALSIFICATION_MISSION.md'));

t.done();
