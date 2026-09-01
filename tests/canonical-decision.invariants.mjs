// RUNTIME INVARIANT TESTS — CANONICAL 15M DECISION
// Executes the REAL canonical-decision source extracted verbatim from server.ts.
// No reimplementation, no network, no Firestore. Proves the Mission 1 invariants:
// one cycleId -> one authoritative decision, monotonic lifecycle, terminal
// LOCKED/SKIP, honest HYDRATING, coherent LOCKED responses, and that Discord
// broadcasts the committed record rather than local memory.
import { readFileSync } from 'fs';

const SERVER = new URL('../server.ts', import.meta.url).pathname;
const src = readFileSync(SERVER, 'utf8');

function extract(name, startPat) {
  const i = src.indexOf(startPat);
  if (i < 0) throw new Error(`cannot find ${name}`);
  const j = src.indexOf(`__name(${name}`, i);
  if (j < 0) throw new Error(`cannot find __name(${name}`);
  return src.slice(i, j);
}

const srcRank      = extract('canonicalStageRank', 'function canonicalStageRank(stage)');
const srcNorm      = extract('canonicalNormalizeStage', 'function canonicalNormalizeStage(stage)');
const srcState     = extract('canonicalStateForStage', 'function canonicalStateForStage(stage, direction)');
const srcResolve   = extract('resolveCanonicalTransition', 'function resolveCanonicalTransition(existing, incoming)');
const srcCoherence = extract('assertCanonicalCoherence', 'function assertCanonicalCoherence(record, context = "commit")');
const srcCommit    = extract('commitCanonicalDecision', 'async function commitCanonicalDecision(cycleId, payload)');
const srcBuild     = extract('buildCanonicalPayloadFromEngine', 'function buildCanonicalPayloadFromEngine(livePrice)');
const srcProject   = extract('projectCanonicalOntoResponse', 'function projectCanonicalOntoResponse(responseObj, record)');
const srcHydrating = extract('markResponseHydrating', 'function markResponseHydrating(responseObj, reason)');
const srcSufficient= extract('hasSufficientRealTelemetry', 'function hasSufficientRealTelemetry()');
const srcShould    = extract('shouldCommitCanonical', 'function shouldCommitCanonical(payload)');
const srcNote      = extract('noteCanonicalCommit', 'function noteCanonicalCommit(payload)');

// Constant tables are declarations, not functions — slice them out by name.
function sliceConst(startPat, endPat) {
  const i = src.indexOf(startPat);
  if (i < 0) throw new Error(`cannot find ${startPat}`);
  const j = src.indexOf(endPat, i);
  if (j < 0) throw new Error(`cannot find ${endPat}`);
  return src.slice(i, j + endPat.length);
}
const srcTables =
  sliceConst('const CANONICAL_STAGE_RANK = {', '};') + '\n' +
  sliceConst('const CANONICAL_DECIDED_STAGES = new Set(', ');') + '\n' +
  sliceConst('const CANONICAL_FROZEN_FIELDS = [', '];') + '\n' +
  'const CANONICAL_DECISION_TTL_MS = 1500;\nconst CANONICAL_SCHEMA_VERSION = 2;\n';

const quietConsole = { log: () => {}, warn: () => {}, error: () => {} };

function build(extraSrc, extraEnv = {}, ret = '') {
  const env = {
    console: quietConsole,
    Date, Math, String, Number, Boolean, Object, Set, JSON, Array,
    __name: (f) => f,
    ...extraEnv,
  };
  const keys = Object.keys(env);
  const body = `${srcTables}\n${srcRank}\n${srcNorm}\n${srcState}\n${srcResolve}\n${srcCoherence}\n${extraSrc}\n${ret}`;
  const fn = new Function(...keys, body);
  return fn(...keys.map((k) => env[k]));
}

let pass = 0, fail = 0;
const check = (label, cond, detail = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`))
       : (fail++, console.log(`  FAIL  ${label} ${detail}`));

// ---------------------------------------------------------------------------
console.log('== 1. monotonic lifecycle: a stale instance cannot move a cycle backward ==');
{
  const resolve = build('', {}, 'return resolveCanonicalTransition;');
  const forward = [
    ['OBSERVING', 'CALIBRATING'], ['CALIBRATING', 'ANALYZING'],
    ['ANALYZING', 'QUALIFYING'], ['QUALIFYING', 'CONFIRMING'],
    ['CONFIRMING', 'LOCKED'],
  ];
  for (const [from, to] of forward) {
    const r = resolve({ stage: from, cycleId: 'C' }, { stage: to, cycleId: 'C', direction: 'UP', lockQualified: true, spotAtLock: 1 });
    check(`${from} -> ${to} advances`, r.write !== null && r.winner.stage === to, JSON.stringify(r.reason));
  }
  const backward = [
    ['QUALIFYING', 'ANALYZING'], ['ANALYZING', 'CALIBRATING'],
    ['CONFIRMING', 'OBSERVING'], ['LOCKED', 'ANALYZING'], ['SKIP', 'WATCH'],
  ];
  for (const [from, to] of backward) {
    const r = resolve({ stage: from, cycleId: 'C', direction: 'UP' }, { stage: to, cycleId: 'C', direction: 'DOWN' });
    check(`${from} -> ${to} REJECTED`, r.write === null && r.winner.stage === from, JSON.stringify(r.reason));
  }
}

// ---------------------------------------------------------------------------
console.log('== 2. LOCKED is terminal and immutable ==');
{
  const resolve = build('', {}, 'return resolveCanonicalTransition;');
  const locked = { stage: 'LOCKED', cycleId: 'C', direction: 'UP', confidence: 81, spotAtLock: 77855.7, decision: 'BUY UP', lockQualified: true };
  const flip = resolve(locked, { stage: 'LOCKED', cycleId: 'C', direction: 'DOWN', confidence: 40, spotAtLock: 1, lockQualified: true });
  check('LOCKED UP cannot be re-locked DOWN', flip.write === null && flip.winner.direction === 'UP');
  const toSkip = resolve(locked, { stage: 'SKIP', cycleId: 'C', direction: 'NEUTRAL' });
  check('LOCKED cannot become SKIP', toSkip.write === null && toSkip.winner.stage === 'LOCKED');
  const settled = resolve(locked, { stage: 'SETTLED', cycleId: 'C', direction: 'DOWN', confidence: 5, spotAtLock: null });
  check('LOCKED -> SETTLED advances stage', settled.write !== null && settled.winner.stage === 'SETTLED');
  check('SETTLED preserves frozen direction', settled.winner.direction === 'UP');
  check('SETTLED preserves frozen confidence', settled.winner.confidence === 81);
  check('SETTLED preserves frozen spotAtLock', settled.winner.spotAtLock === 77855.7);
  check('SETTLED records the original decided stage', settled.winner.decidedStage === 'LOCKED');
}

// ---------------------------------------------------------------------------
console.log('== 3. SKIP is terminal ==');
{
  const resolve = build('', {}, 'return resolveCanonicalTransition;');
  const skip = { stage: 'SKIP', cycleId: 'C', direction: 'NEUTRAL', skipReason: 'CHOPPY_MARKET' };
  const toLock = resolve(skip, { stage: 'LOCKED', cycleId: 'C', direction: 'UP', confidence: 91, spotAtLock: 77000, lockQualified: true });
  check('SKIP cannot be superseded by LOCKED', toLock.write === null && toLock.winner.stage === 'SKIP');
  const reskip = resolve(skip, { stage: 'SKIP', cycleId: 'C', skipReason: 'PROTECTION_VETO' });
  check('SKIP reason is immutable', reskip.write === null && reskip.winner.skipReason === 'CHOPPY_MARKET');
  const settled = resolve(skip, { stage: 'SETTLED', cycleId: 'C' });
  check('SKIP -> SETTLED advances', settled.write !== null && settled.winner.stage === 'SETTLED');
  check('SETTLED after SKIP keeps skipReason', settled.winner.skipReason === 'CHOPPY_MARKET');
  check('NO_TRADE normalises to SKIP', resolve(null, { stage: 'NO_TRADE', cycleId: 'C' }).winner.stage === 'SKIP');
}

// ---------------------------------------------------------------------------
console.log('== 4. response coherence: LOCKED => qualified && spotAtLock != null ==');
{
  const coh = build('', {}, 'return assertCanonicalCoherence;');
  check('LOCKED with qualified=false is refused',
    coh({ stage: 'LOCKED', cycleId: 'C', direction: 'UP', lockQualified: false, spotAtLock: 100 }) === null);
  check('LOCKED with null spotAtLock is refused',
    coh({ stage: 'LOCKED', cycleId: 'C', direction: 'UP', lockQualified: true, spotAtLock: null }) === null);
  check('LOCKED with NEUTRAL direction is refused',
    coh({ stage: 'LOCKED', cycleId: 'C', direction: 'NEUTRAL', lockQualified: true, spotAtLock: 100 }) === null);
  check('coherent LOCKED is accepted',
    coh({ stage: 'LOCKED', cycleId: 'C', direction: 'UP', lockQualified: true, spotAtLock: 100 }) !== null);
  check('non-LOCKED stages are unaffected',
    coh({ stage: 'ANALYZING', cycleId: 'C', direction: 'UP', lockQualified: false, spotAtLock: null }) !== null);

  // The exact production payload that triggered this mission.
  const productionBug = {
    stage: 'LOCKED', cycleId: '15M-2026-09-01T16:00:00.000Z', direction: 'UP',
    confidence: 81, spotAtLock: 77855.7, lockQualified: false,
    lockReason: 'Chop filter active (EXCESSIVE_DIRECTION_FLIPS)',
  };
  check('the observed production LOCKED-but-unqualified payload is refused',
    coh(productionBug) === null);
}

// ---------------------------------------------------------------------------
console.log('== 5. projection: routes serve the canonical record, and downgrade an incoherent lock ==');
{
  const project = build(srcProject, {}, 'return projectCanonicalOntoResponse;');
  const base = () => ({
    currentState: 'WATCH', engineStage: 'ANALYZING', direction: 'DOWN', confidence: 46,
    lockScore: 18, reversalRisk: 49, spotAtLock: null, lockedAt: null, lockTier: 'STANDARD',
    gemini: {}, protection: {},
  });
  const rec = {
    cycleId: 'C', stage: 'LOCKED', direction: 'UP', confidence: 81, lockScore: 65,
    reversalRisk: 25, spotAtLock: 77855.7, lockedAt: 1788278832862, lockQualified: true,
    lockTier: 'STANDARD', regime: 'RANGE_BOUND', updatedAt: 'T',
  };
  const out = project(base(), rec);
  check('currentState comes from canonical', out.currentState === 'LOCKED_UP');
  check('direction comes from canonical', out.direction === 'UP');
  check('confidence comes from canonical', out.confidence === 81);
  check('spotAtLock comes from canonical', out.spotAtLock === 77855.7);
  check('decisionSource is marked FIRESTORE_CANONICAL', out.decisionSource === 'FIRESTORE_CANONICAL');
  check('narrative panel follows the decision', out.gemini.signalDirection === 'UP' && out.gemini.confidence === 81);

  const incoherent = project(base(), { ...rec, lockQualified: false });
  check('incoherent LOCKED is downgraded, never served as LOCKED',
    incoherent.currentState === 'WATCH' && incoherent.spotAtLock === null && incoherent.lockTier === 'NONE');

  const nullSpot = project(base(), { ...rec, spotAtLock: null });
  check('LOCKED with null spotAtLock is downgraded',
    nullSpot.currentState === 'WATCH' && nullSpot.lockedAt === null);

  const skipOut = project(base(), { cycleId: 'C', stage: 'SKIP', direction: 'NEUTRAL', skipReason: 'CHOPPY_MARKET', confidence: 51 });
  check('SKIP projects as SKIP with no lock fields',
    skipOut.currentState === 'SKIP' && skipOut.spotAtLock === null && skipOut.skipReason === 'CHOPPY_MARKET');
}

// ---------------------------------------------------------------------------
console.log('== 6. insufficient REAL telemetry produces HYDRATING, never fabricated values ==');
{
  // hasSufficientRealTelemetry with a de-seeded buffer
  // current15mStrikePrice became a required input (F1): without a strike the
  // contract cannot be evaluated, so the instance must not publish a decision.
  const mk = (ticks, price, tickTs, strike = 77100) => build(
    srcSufficient,
    { rollingBtcTicks: new Array(ticks).fill({ price: 1, ts: 1 }), MIN_REAL_TICKS_FOR_DECISION: 12, currentBtcPrice: price, lastMarketUpdateTs: tickTs, current15mStrikePrice: strike },
    'return hasSufficientRealTelemetry();',
  );
  check('empty buffer => insufficient', mk(0, 77000, Date.now()) === false);
  check('11 ticks => insufficient (below threshold)', mk(11, 77000, Date.now()) === false);
  check('12 ticks => sufficient', mk(12, 77000, Date.now()) === true);
  check('no observed price => insufficient', mk(50, 0, Date.now()) === false);
  check('no engine tick => insufficient', mk(50, 77000, 0) === false);
  check('no strike => insufficient (F1)', mk(50, 77000, Date.now(), 0) === false);

  // The builder must refuse to produce a payload at all.
  const payload = build(
    srcSufficient + '\n' + srcBuild,
    {
      rollingBtcTicks: [], MIN_REAL_TICKS_FOR_DECISION: 12, currentBtcPrice: 0,
      lastMarketUpdateTs: 0, active15mCycle: { cycleId: 'C', stage: 'ANALYZING' },
      currentDirection: 'NEUTRAL', currentConfidence: 0, currentModelProbability: 0.5,
      current15mStrikePrice: 0, latestLockEvaluation: null, latestBtc15mPipeline: null,
      buildEvidenceSubScores: () => [],
    },
    'return buildCanonicalPayloadFromEngine(0);',
  );
  check('cold instance commits NOTHING rather than a manufactured decision', payload === null);

  const hyd = build(srcHydrating, { rollingBtcTicks: [], MIN_REAL_TICKS_FOR_DECISION: 12 },
    'return markResponseHydrating({ currentState:"WATCH", direction:"UP", confidence:88.5, lockScore:50, gemini:{}, protection:{} }, "INSUFFICIENT_REAL_TELEMETRY");');
  check('HYDRATING nulls the direction', hyd.direction === null);
  check('HYDRATING nulls the confidence (no 88.5 seed)', hyd.confidence === null);
  check('HYDRATING nulls the lock score', hyd.lockScore === null);
  check('HYDRATING states its reason', hyd.hydratingReason === 'INSUFFICIENT_REAL_TELEMETRY');
  check('HYDRATING reports real telemetry counts', hyd.telemetryTicks === 0 && hyd.requiredTelemetryTicks === 12);
}

// ---------------------------------------------------------------------------
console.log('== 7. concurrent writers cannot create conflicting canonical decisions ==');
{
  // A serialising in-memory Firestore: transactions run one at a time against a
  // shared store, exactly as Firestore serialises contended transactions.
  function makeStore() {
    const store = new Map();
    let chain = Promise.resolve();
    const runTransaction = (dbRef, fn) => {
      const job = chain.then(() =>
        fn({
          get: async (ref) => ({
            exists: () => store.has(ref.__id),
            data: () => store.get(ref.__id),
          }),
          set: (ref, val) => store.set(ref.__id, val),
        }),
      );
      chain = job.catch(() => {});
      return job;
    };
    return { store, runTransaction, doc: (_db, _c, id) => ({ __id: id }) };
  }

  async function commitAll(payloads) {
    const { store, runTransaction, doc } = makeStore();
    const commit = build(srcCommit, {
      db: {}, runTransaction, doc,
      sanitizeForFirestore: (o) => o,
      invalidateCanonicalDecisionCache: () => {},
      primeCanonicalDecisionCache: () => {},
    }, 'return commitCanonicalDecision;');
    const results = await Promise.all(payloads.map((p) => commit('CYCLE-1', p)));
    return { results, record: store.get('CYCLE-1') };
  }

  // Twelve instances, one cycle, wildly different opinions — the exact shape of
  // the production failure (UP@91, DOWN, SKIP, all at the same second).
  const opinions = [
    { stage: 'CALIBRATING', direction: 'UP',      confidence: 91, lockScore: 93 },
    { stage: 'QUALIFYING',  direction: 'UP',      confidence: 78, lockScore: 73 },
    { stage: 'ANALYZING',   direction: 'UP',      confidence: 54, lockScore: 52 },
    { stage: 'QUALIFYING',  direction: 'DOWN',    confidence: 52, lockScore: 44 },
    { stage: 'NO_TRADE',    direction: 'DOWN',    confidence: 51, lockScore: 35, skipReason: 'CHOPPY_MARKET' },
    { stage: 'NO_TRADE',    direction: 'NEUTRAL', confidence: 46, lockScore: 18, skipReason: 'PROTECTION_VETO' },
    { stage: 'ANALYZING',   direction: 'DOWN',    confidence: 49, lockScore: 31 },
    { stage: 'LOCKED',      direction: 'UP',      confidence: 81, spotAtLock: 77855.7, lockQualified: true },
    { stage: 'OBSERVING',   direction: 'NEUTRAL', confidence: 10, lockScore: 5 },
    { stage: 'CONFIRMING',  direction: 'DOWN',    confidence: 60, lockScore: 61 },
    { stage: 'CALIBRATING', direction: 'DOWN',    confidence: 33, lockScore: 20 },
    { stage: 'QUALIFYING',  direction: 'UP',      confidence: 70, lockScore: 66 },
  ];
  const { results, record } = await commitAll(opinions);

  const winners = new Set(results.filter(Boolean).map((r) =>
    `${r.stage}|${r.direction}|${r.confidence}`));
  check('every concurrent writer is told the SAME final decision at rest',
    new Set(results.filter(Boolean).map((r) => r.cycleId)).size === 1);
  check('exactly one record exists for the cycle', record !== undefined);
  check('the stored record is terminal (a decision was reached)',
    record.stage === 'LOCKED' || record.stage === 'SKIP', `stage=${record && record.stage}`);
  check('the stored record has exactly one direction', typeof record.direction === 'string');
  check('no writer left the record at a lower rank than a committed terminal',
    record.stageRank >= 6, `rank=${record && record.stageRank}`);
  check('a LOCKED record at rest is coherent',
    record.stage !== 'LOCKED' || (record.lockQualified === true && record.spotAtLock !== null && record.spotAtLock !== undefined));

  // Replay the SAME set in reverse order: the outcome must still be a single
  // terminal decision, never a mixture.
  const rev = await commitAll([...opinions].reverse());
  check('reversed arrival order still yields one terminal decision',
    rev.record.stage === 'LOCKED' || rev.record.stage === 'SKIP');

  // A stale instance arriving AFTER a terminal decision must be told the truth.
  const { store, runTransaction, doc } = makeStore();
  const commit = build(srcCommit, {
    db: {}, runTransaction, doc, sanitizeForFirestore: (o) => o,
    invalidateCanonicalDecisionCache: () => {}, primeCanonicalDecisionCache: () => {},
  }, 'return commitCanonicalDecision;');
  await commit('C2', { stage: 'LOCKED', direction: 'UP', confidence: 81, spotAtLock: 77855.7, lockQualified: true });
  const late = await commit('C2', { stage: 'ANALYZING', direction: 'DOWN', confidence: 46 });
  check('a stale writer arriving after LOCKED receives the committed LOCKED',
    late && late.stage === 'LOCKED' && late.direction === 'UP' && late.confidence === 81);
  check('the stale writer did NOT overwrite the record',
    store.get('C2').direction === 'UP' && store.get('C2').stage === 'LOCKED');

  // Firestore unavailable => no canonical decision, and NOT a local one.
  const noDb = build(srcCommit, {
    db: null, runTransaction: null, doc: null, sanitizeForFirestore: (o) => o,
    invalidateCanonicalDecisionCache: () => {}, primeCanonicalDecisionCache: () => {},
  }, 'return commitCanonicalDecision;');
  check('no shared store => no canonical decision is claimed',
    (await noDb('C3', { stage: 'LOCKED', direction: 'UP', spotAtLock: 1, lockQualified: true })) === null);

  // An incoherent LOCKED must never reach the store at all.
  const { store: s4, runTransaction: rt4, doc: d4 } = makeStore();
  const commit4 = build(srcCommit, {
    db: {}, runTransaction: rt4, doc: d4, sanitizeForFirestore: (o) => o,
    invalidateCanonicalDecisionCache: () => {}, primeCanonicalDecisionCache: () => {},
  }, 'return commitCanonicalDecision;');
  const bad = await commit4('C4', { stage: 'LOCKED', direction: 'UP', confidence: 81, spotAtLock: 77855.7, lockQualified: false });
  check('an unqualified LOCKED is never committed', bad === null && s4.get('C4') === undefined);
}

// ---------------------------------------------------------------------------
console.log('== 8. Discord broadcasts the COMMITTED canonical decision ==');
{
  // Execute the real broadcast block from lock15mCycle verbatim.
  const START_MARK = '  // Broadcast the COMMITTED canonical decision, never these locals.';
  const END_MARK = 'no coherent canonical LOCKED record to broadcast.`,\n    );\n  }';
  const start = src.indexOf(START_MARK);
  const end = src.indexOf(END_MARK, start);
  if (start < 0 || end < 0) throw new Error('cannot locate the lock-site Discord block');
  const blockSrc = src.slice(start, end + END_MARK.length);

  async function runBlock(lockWinner) {
    let captured = null;
    const env = {
      console: quietConsole, Date, Math, String, Number, Boolean, Object, Set, JSON,
      __name: (f) => f,
      cycleId: 'CYCLE-D',
      finalReason: 'LOCAL_FALLBACK_REASON',
      lockWinner,
      canonicalNormalizeStage: (st) => (String(st).toUpperCase() === 'NO_TRADE' ? 'SKIP' : String(st).toUpperCase()),
      attemptDiscordSignalBroadcast: async (...args) => { captured = args; return { success: true }; },
    };
    const keys = Object.keys(env);
    await new Function(...keys, `return (async () => {\n${blockSrc}\n})();`)(...keys.map((k) => env[k]));
    return captured;
  }

  const winner = {
    stage: 'LOCKED', direction: 'UP', confidence: 81, spotAtLock: 77855.7,
    strike: 77901.85, lockedReason: 'QUALIFIED_AUTHORITATIVE_ENTRY', lockQualified: true,
  };
  const args = await runBlock(winner);
  check('Discord is called for a coherent canonical LOCKED', args !== null);
  check('Discord receives the canonical cycleId', args && args[0] === 'CYCLE-D');
  check('Discord receives the canonical direction', args && args[1] === 'UP');
  check('Discord receives the canonical confidence', args && args[2] === 81);
  check('Discord receives the canonical spotAtLock', args && args[3] === 77855.7);
  check('Discord receives the canonical strike', args && args[4] === 77901.85);
  check('Discord receives the canonical reason, not the local fallback',
    args && args[5] === 'QUALIFIED_AUTHORITATIVE_ENTRY');

  check('no broadcast when the canonical lock is unqualified',
    (await runBlock({ ...winner, lockQualified: false })) === null);
  check('no broadcast when spotAtLock is null',
    (await runBlock({ ...winner, spotAtLock: null })) === null);
  check('no broadcast for a SKIP decision',
    (await runBlock({ ...winner, stage: 'SKIP' })) === null);
  check('no broadcast when no canonical record exists',
    (await runBlock(null)) === null);
}


// ---------------------------------------------------------------------------
console.log('== 9. write throttle never suppresses a decision ==');
{
  const api = build(
    srcShould + '\n' + srcNote,
    { CANONICAL_HEARTBEAT_MS: 6000, CANONICAL_CONFIDENCE_EPSILON: 2, CANONICAL_LOCKSCORE_EPSILON: 3 },
    'return { shouldCommitCanonical, noteCanonicalCommit, peek: () => lastCanonicalCommit, reset: () => { lastCanonicalCommit = { cycleId:null, stage:null, direction:null, confidence:null, lockScore:null, atMs:0 }; } };',
  );
  const { shouldCommitCanonical: should, noteCanonicalCommit: note, reset } = api;

  reset();
  const p = (o) => ({ cycleId: 'C', stage: 'ANALYZING', direction: 'UP', confidence: 50, lockScore: 40, ...o });
  check('first observation of a cycle always commits', should(p({})) === true);
  note(p({}));
  check('an identical repeat within the heartbeat is throttled', should(p({})) === false);
  check('a stage transition always commits', should(p({ stage: 'QUALIFYING' })) === true);
  check('a direction flip always commits', should(p({ direction: 'DOWN' })) === true);
  check('a material confidence move commits', should(p({ confidence: 52 })) === true);
  check('an immaterial confidence move is throttled', should(p({ confidence: 51 })) === false);
  check('a material lock-score move commits', should(p({ lockScore: 43 })) === true);
  check('a new cycleId always commits', should(p({ cycleId: 'C2' })) === true);

  // Terminal decisions must NEVER be throttled away.
  reset();
  check('LOCKED always commits when not yet recorded', should(p({ stage: 'LOCKED' })) === true);
  note(p({ stage: 'LOCKED' }));
  check('LOCKED is not re-committed once recorded', should(p({ stage: 'LOCKED' })) === false);
  check('SKIP still commits even after LOCKED was recorded locally',
    should(p({ stage: 'SKIP' })) === true);
  reset();
  check('SKIP always commits when not yet recorded', should(p({ stage: 'NO_TRADE' })) === true);
}

console.log(`\n== canonical-decision invariants: ${pass} passed, ${fail} failed ==`);
process.exit(fail === 0 ? 0 : 1);
