// strike_side_only — owner-authorized 2026-09-10 ("WRITE THE strike_side_only
// MODE, I AUTHORIZE IT") after the strike-side rule passed falsification on
// untouched data (L5_PROMOTION_REPORT: 95 locks / 209 cycles, 98.9%).
//
// This file pins the COMMIT side of the mode: what lock15mCycle writes when
// the gate says the rule decided. The gate side (which terms still gate, which
// are observation) is pinned in tests/lock-gate.composition.mjs PART B8.
//
// The decision block of the REAL lock15mCycle is sliced out of server.ts and
// executed with a controlled gate result. Nothing is reimplemented.
import { serverSrc, sliceBetween, extractFn, createHarness } from './_engineSource.mjs';
const t = createHarness('strike-side-only.behaviour');

const lockSrc = extractFn('lock15mCycle', 'async function lock15mCycle(cycleId, livePrice, forcedReason)');
// From the timestamp through the end of lockDataToUse.
const decisionSrc = sliceBetween(lockSrc, 'const lockedTime = new Date().toISOString();', 'let transactionSucceeded = false;', 'lock decision block');

function decide({ rule, gate, direction = 'UP', modelProb = 0.7, confidence = 88, forcedReason = 'QUALIFIED_AUTHORITATIVE_ENTRY' }) {
  const env = {
    gate, VIXY_LOCK_RULE: rule, currentDirection: direction, currentModelProbability: modelProb, currentConfidence: confidence,
    current15mStrikePrice: 78320, currentEdgePct: 2.1, livePrice: 78351, forcedReason,
    serverLearningEngine: { modelVersion: 'VIXY_AUTHORITATIVE_NEURAL_v5' }, Math, Date,
  };
  const keys = Object.keys(env);
  return new Function(...keys, `${decisionSrc}; return { dir, conf, prob, decision, ruleReason, lockPolicy, lockModelVersion, lockDataToUse, ruleDecides };`)(...keys.map((k) => env[k]));
}
const ruleGate = (over = {}) => ({ allowed: true, lockPolicy: 'STRIKE_SIDE_RULE', lockRuleDecides: true, lockRuleSide: 'DOWN', lockRuleP: 0.962, lockRuleN: 210, lockRuleCell: '720|4|H', lockRuleTable: 'strike-side-v1', reasons: ['READY_TO_LOCK'], ...over });
const engineGate = (over = {}) => ({ allowed: true, lockPolicy: 'ENGINE_GATE', lockRuleDecides: false, lockRuleSide: null, lockRuleP: null, lockRuleN: null, lockRuleCell: null, lockRuleTable: null, reasons: ['READY_TO_LOCK'], ...over });

t.section('strike_side_only: the rule\'s side and measured p ARE the lock');
{
  // Engine says UP with score 88; the rule fired DOWN at p=0.962.
  const r = decide({ rule: 'strike_side_only', gate: ruleGate(), direction: 'UP', confidence: 88 });
  t.eq('ruleDecides true', r.ruleDecides, true);
  t.eq('direction is the rule side (DOWN), not the engine side (UP)', r.dir, 'DOWN');
  t.eq('decision text follows the rule side', r.decision, 'BUY DOWN');
  t.eq('confidence = round(p*100) = 96, not the engine score 88', r.conf, 96);
  t.eq('probability = the cell p (not the engine model probability)', r.prob, 0.962);
  t.eq('reason names the rule, p, n, cell and table', r.ruleReason, 'STRIKE_SIDE_RULE (p=0.962, n=210, cell=720|4|H, table=strike-side-v1)');
  t.eq('lockDataToUse.lockedReason is the rule reason (forcedReason ignored)', r.lockDataToUse.lockedReason, r.ruleReason);
  t.eq('lockPolicy STRIKE_SIDE_RULE', r.lockPolicy, 'STRIKE_SIDE_RULE');
  t.eq('modelVersion names the rule and table, not the neural engine', r.lockModelVersion, 'STRIKE_SIDE_RULE_strike-side-v1');
  t.eq('claim doc carries lockPolicy', r.lockDataToUse.lockPolicy, 'STRIKE_SIDE_RULE');
  t.eq('claim doc carries lockRuleP', r.lockDataToUse.lockRuleP, 0.962);
  t.eq('claim doc carries lockRuleN', r.lockDataToUse.lockRuleN, 210);
  t.eq('claim doc carries lockRuleCell', r.lockDataToUse.lockRuleCell, '720|4|H');
  t.eq('claim doc direction', r.lockDataToUse.direction, 'DOWN');
  t.eq('claim doc confidence', r.lockDataToUse.confidence, 96);
}
{
  // p = 1.0 (a cell with n>=30 and no losses) is NOT clamped into the engine's 65-96 band.
  const r = decide({ rule: 'strike_side_only', gate: ruleGate({ lockRuleP: 1, lockRuleSide: 'UP' }) });
  t.eq('p=1.0 -> confidence 100 (the table\'s number, unclamped)', r.conf, 100);
  t.eq('p=1.0 -> probability 1', r.prob, 1);
  const r2 = decide({ rule: 'strike_side_only', gate: ruleGate({ lockRuleP: 0.95, lockRuleSide: 'UP' }) });
  t.eq('p=0.95 -> confidence 95', r2.conf, 95);
}

t.section('the rule never decides outside strike_side_only, and never on a malformed gate');
{
  const off = decide({ rule: 'off', gate: ruleGate(), direction: 'UP', confidence: 88 });
  t.eq('off: ruleDecides false even if the gate carried rule fields', off.ruleDecides, false);
  t.eq('off: direction is the engine side', off.dir, 'UP');
  t.eq('off: confidence is the clamped engine score', off.conf, 88);
  t.eq('off: reason is the caller\'s forcedReason', off.lockDataToUse.lockedReason, 'QUALIFIED_AUTHORITATIVE_ENTRY');
  t.eq('off: lockPolicy ENGINE_GATE', off.lockPolicy, 'ENGINE_GATE');
  t.eq('off: modelVersion is the engine\'s', off.lockModelVersion, 'VIXY_AUTHORITATIVE_NEURAL_v5');
  t.eq('off: claim doc lockRuleP null', off.lockDataToUse.lockRuleP, null);
  const filt = decide({ rule: 'strike_side', gate: engineGate({ lockPolicy: 'ENGINE_GATE_FILTERED' }) });
  t.eq('strike_side (filter): lockPolicy ENGINE_GATE_FILTERED', filt.lockPolicy, 'ENGINE_GATE_FILTERED');
  t.eq('strike_side (filter): direction is the engine side', filt.dir, 'UP');
  const notFired = decide({ rule: 'strike_side_only', gate: engineGate() });
  t.eq('strike_side_only with lockRuleDecides=false -> engine values (unreachable when allowed, pinned anyway)', notFired.ruleDecides, false);
  const badSide = decide({ rule: 'strike_side_only', gate: ruleGate({ lockRuleSide: 'NEUTRAL' }) });
  t.eq('malformed side -> rule does not decide', badSide.ruleDecides, false);
  const badP = decide({ rule: 'strike_side_only', gate: ruleGate({ lockRuleP: null }) });
  t.eq('missing p -> rule does not decide', badP.ruleDecides, false);
  const zeroP = decide({ rule: 'strike_side_only', gate: ruleGate({ lockRuleP: 0 }) });
  t.eq('p=0 -> rule does not decide', zeroP.ruleDecides, false);
  // Engine clamp is unchanged for engine locks.
  const hiEngine = decide({ rule: 'off', gate: engineGate(), confidence: 99 });
  t.eq('engine lock confidence still clamped to 96', hiEngine.conf, 96);
  const loEngine = decide({ rule: 'off', gate: engineGate(), confidence: 40 });
  t.eq('engine lock confidence still floored at 65', loEngine.conf, 65);
}

t.section('ledger row and snapshot record which policy locked');
{
  const create = sliceBetween(lockSrc, 'logItem = {\n      id: sigId,', 'persistentSignalLogs.unshift(logItem);', 'logItem create');
  t.check('created row: modelVersion is lockModelVersion', create.includes('modelVersion: lockModelVersion,'));
  t.check('created row: lockPolicy', create.includes('lockPolicy,'));
  t.check('created row: lockRuleP / lockRuleN / lockRuleCell', create.includes('lockRuleP: ruleDecides ? gate.lockRuleP : null,') && create.includes('lockRuleN: ruleDecides ? gate.lockRuleN : null,') && create.includes('lockRuleCell: ruleDecides ? gate.lockRuleCell : null,'));
  t.check('created row: lockedReason', create.includes('lockedReason: finalReason,'));
  const update = sliceBetween(lockSrc, 'logItem.lockedAt = finalLockedTime;', 'active15mCycle.lockedSnapshot = {', 'logItem update');
  t.check('updated row: modelVersion is lockModelVersion', update.includes('logItem.modelVersion = lockModelVersion;'));
  t.check('updated row: lockPolicy and rule fields', update.includes('logItem.lockPolicy = lockPolicy;') && update.includes('logItem.lockRuleCell = ruleDecides ? gate.lockRuleCell : null;'));
  t.check('cycle state carries lockPolicy', lockSrc.includes('active15mCycle.lockPolicy = lockPolicy;'));
  t.check('lockSnapshot carries lockPolicy', sliceBetween(lockSrc, 'logItem.lockSnapshot = {', 'snapshotVersion: "v1",', 'lockSnapshot').includes('lockPolicy,'));
  t.check('finalReason prefers the rule reason', lockSrc.includes('let finalReason = ruleReason || forcedReason || "FRESH_AUTHORITATIVE_LOCK";'));
}

t.section('the commit point\'s hard window is unchanged');
t.check('lock15mCycle still refuses outside 360-780s before consulting the gate', lockSrc.includes('if (effElapsed < 360 || effElapsed >= 780) {'));
t.check('lock15mCycle still refuses a duplicate lock', lockSrc.includes('active15mCycle.lockCount >= 1'));

t.section('mode plumbing');
t.check('unknown VIXY_LOCK_RULE values are logged and fall through to observation-only', serverSrc.includes('const VIXY_LOCK_RULE_MODES = ["off", "strike_side", "strike_side_only"];') && serverSrc.includes('unknown mode'));
const gateOut = sliceBetween(serverSrc, 'lockGate: active15mCycle.lockEligibility', 'strikeSide: active15mCycle.lockEligibility.strikeSide', 'lockGate out');
t.check('canonical payload exposes lockPolicy and lockRuleDecides', gateOut.includes('lockPolicy: active15mCycle.lockEligibility.lockPolicy ?? null,') && gateOut.includes('lockRuleDecides: Boolean(active15mCycle.lockEligibility.lockRuleDecides),'));
const pc = (await import('fs')).readFileSync(new URL('../src/components/CryptoPredictionCenterView.tsx', import.meta.url), 'utf8');
t.check('prediction center reads lockPolicy from the server, never guesses', pc.includes("lockGate?.lockPolicy === 'STRIKE_SIDE_RULE'") && pc.includes('RULE DECIDES · P(WIN) ≥'));
t.check('prediction center shows engine-opinion rows as observation in rule mode', pc.includes("c.gating === false && c.id !== 'CALIBRATED_P'") && pc.includes('Engine opinion · observation only, not gating'));
t.check('Layer-5 row label derives from lockPolicy', pc.includes("lockPolicy === 'STRIKE_SIDE_RULE' ? 'Layer 5 decides the lock (strike-side rule)'"));
const replay = (await import('fs')).readFileSync(new URL('../scripts/replay15m.ts', import.meta.url), 'utf8');
t.check('replay harness accepts --lock-rule strike_side_only', replay.includes("args['lock-rule'] === 'strike_side_only' ? 'strike_side_only'"));
t.check('replay harness grades the rule\'s side and p when the rule decides', replay.includes("rec.lockDirection = ruleDecides ? gate.lockRuleSide : st.direction;") && replay.includes('rec.lockConfidence = ruleDecides ? Math.round(gate.lockRuleP * 100) : st.confidence;'));

t.done();
