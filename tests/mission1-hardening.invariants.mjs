// RUNTIME INVARIANT TESTS — MISSION 1 HARDENING (F1, F2, F3, F8/F9, F11)
// Executes the REAL source extracted verbatim from server.ts. No network, no
// Firestore, no reimplementation. Path resolved RELATIVE to this file.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'server.ts'), 'utf8');

function extract(name, startPat) {
  const i = src.indexOf(startPat);
  if (i < 0) throw new Error(`cannot find ${name}`);
  const j = src.indexOf(`__name(${name}`, i);
  if (j < 0) throw new Error(`cannot find __name(${name}`);
  return src.slice(i, j);
}

// Source with `//` comment lines stripped. Several assertions below search for
// the ABSENCE of a pattern, and the explanatory comments in server.ts quote the
// very patterns being removed -- matching those would be a false positive.
const codeOnly = src
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

const quiet = { log: () => {}, warn: () => {}, error: () => {} };
let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

function build(body, env, ret) {
  const base = { console: quiet, Date, Math, String, Number, Boolean, Object, Set, JSON, Array, __name: (f) => f, ...env };
  const keys = Object.keys(base);
  return new Function(...keys, `${body}\n${ret}`)(...keys.map((k) => base[k]));
}

// ---------------------------------------------------------------------------
console.log('== F1. zero / missing strike produces no non-finite math ==');
{
  // The real guarded expressions, lifted verbatim from the tick.
  const i = src.indexOf('const strikeIsKnown =');
  const j = src.indexOf('currentMomentum = intervalMomentum;', i);
  if (i < 0 || j < 0) throw new Error('cannot locate the guarded strike math');
  const snippet = src.slice(i, j);

  const run = (livePrice, strike) =>
    build(`let current15mStrikePrice = ${strike}; const livePrice = ${livePrice};\n${snippet}`,
      {}, 'return { moneynessPct, intervalMomentum, spotStrikeDist };');

  const zero = run(77000, 0);
  check('zero strike + valid spot -> finite moneyness', Number.isFinite(zero.moneynessPct), JSON.stringify(zero));
  check('zero strike + valid spot -> finite momentum', Number.isFinite(zero.intervalMomentum), JSON.stringify(zero));
  check('zero strike yields 0 displacement, not Infinity', zero.moneynessPct === 0 && zero.spotStrikeDist === 0);

  const bothZero = run(0, 0);
  check('zero spot AND zero strike -> no NaN', Number.isFinite(bothZero.moneynessPct) && Number.isFinite(bothZero.intervalMomentum));

  const normal = run(77000, 77100);
  check('a real strike still computes a real moneyness', Math.abs(normal.moneynessPct - ((77000 - 77100) / 77100) * 100) < 1e-9);
  check('a real strike still computes a real momentum', Number.isFinite(normal.intervalMomentum) && normal.intervalMomentum !== 0);

  const negStrike = run(77000, -5);
  check('negative strike is treated as unknown', negStrike.moneynessPct === 0);

  // The gate must refuse to publish while the strike is unknown.
  const srcSuff = extract('hasSufficientRealTelemetry', 'function hasSufficientRealTelemetry()');
  const suff = (ticks, price, ts, strike) => build(srcSuff, {
    rollingBtcTicks: new Array(ticks).fill({ price: 1 }), MIN_REAL_TICKS_FOR_DECISION: 12,
    currentBtcPrice: price, lastMarketUpdateTs: ts, current15mStrikePrice: strike,
  }, 'return hasSufficientRealTelemetry();');
  check('missing strike + valid spot => NOT sufficient (no decision published)', suff(50, 77000, Date.now(), 0) === false);
  check('valid strike + valid spot + 12 ticks => sufficient', suff(12, 77000, Date.now(), 77100) === true);
  check('valid strike but only 11 ticks => NOT sufficient', suff(11, 77000, Date.now(), 77100) === false);
}

// ---------------------------------------------------------------------------
console.log('== F1. sanitizeForFirestore neutralises non-finite numbers ==');
{
  const san = build(extract('sanitizeForFirestore', 'function sanitizeForFirestore(obj)'), {}, 'return sanitizeForFirestore;');
  check('NaN -> null', san({ a: NaN }).a === null);
  check('Infinity -> null', san({ a: Infinity }).a === null);
  check('-Infinity -> null', san({ a: -Infinity }).a === null);
  check('bare NaN -> null', san(NaN) === null);
  check('nested non-finite -> null', san({ a: { b: [1, NaN, 3] } }).a.b[1] === null);

  // Must NOT damage valid decisions.
  check('0 survives', san({ a: 0 }).a === 0);
  check('negative survives', san({ a: -12.5 }).a === -12.5);
  check('81 (a real confidence) survives', san({ confidence: 81 }).confidence === 81);
  check('77855.7 (a real spotAtLock) survives', san({ spotAtLock: 77855.7 }).spotAtLock === 77855.7);
  check('false survives (not coerced)', san({ a: false }).a === false);
  check('strings survive', san({ a: 'LOCKED' }).a === 'LOCKED');
  check('null stays null', san({ a: null }).a === null);
  const full = san({ stage: 'LOCKED', direction: 'UP', confidence: 81, lockScore: 0, spotAtLock: 77855.7, lockQualified: true });
  check('a complete valid LOCKED record passes through unchanged',
    full.stage === 'LOCKED' && full.direction === 'UP' && full.confidence === 81 &&
    full.lockScore === 0 && full.spotAtLock === 77855.7 && full.lockQualified === true);
}

// ---------------------------------------------------------------------------
console.log('== F3. invalid price ticks never enter the buffer or count as telemetry ==');
{
  const i = src.indexOf('  if (Number.isFinite(spot) && spot > 0) {\n    rollingBtcTicks.push({');
  if (i < 0) throw new Error('cannot locate the guarded tick push');
  const j = src.indexOf('  }', src.indexOf('rollingBtcTicks.shift();', i)) + 3;
  const pushSnippet = src.slice(i, j);

  const runPush = (spot) => {
    const buf = [];
    build(`const spot = ${spot}; const now = 1; const takerRatio = 1; const netDeltaEst = 0;\n${pushSnippet}`,
      { rollingBtcTicks: buf }, 'return null;');
    return buf.length;
  };
  check('price 0 is NOT stored', runPush(0) === 0);
  check('NaN price is NOT stored', runPush(NaN) === 0);
  check('Infinity price is NOT stored', runPush(Infinity) === 0);
  check('negative price is NOT stored', runPush(-5) === 0);
  check('a real price IS stored', runPush(77000) === 1);

  // Log-return math must require both endpoints valid.
  const volIdx = src.indexOf('if (prev > 0 && curr > 0) returns.push(Math.log(curr / prev));');
  check('realized-vol loop requires prev > 0 AND curr > 0', volIdx > 0);
  check('empty returns array cannot divide by zero',
    src.includes('returns.length > 0\n        ? returns.reduce((acc, r) => acc + r, 0) / returns.length\n        : 0'));
  const ticks = [{ price: 100 }, { price: 0 }, { price: 102 }];
  let rs = [];
  for (let i2 = 1; i2 < ticks.length; i2++) {
    const prev = ticks[i2 - 1].price, curr = ticks[i2].price;
    if (prev > 0 && curr > 0) rs.push(Math.log(curr / prev));
  }
  check('a zero-price tick cannot produce -Infinity', rs.every(Number.isFinite));
}

// ---------------------------------------------------------------------------
console.log('== F8/F9. tick dedupe, request rate limit, outage bound ==');
{
  const tStart = src.indexOf('async function runMarketEngineTickTracked() {');
  const tEnd = src.indexOf('// F9: an upstream price outage', tStart);
  if (tStart < 0 || tEnd < 0) throw new Error('cannot locate runMarketEngineTickTracked');
  const tracked = src.slice(tStart, tEnd);
  const ensure = extract('ensureEngineHydratedForRequest', 'async function ensureEngineHydratedForRequest()');

  function harness({ sufficient = false, hydrated = false, tickMs = 20 }) {
    let calls = 0;
    let now = 1_000_000;
    const env = {
      REQUEST_TICK_MIN_INTERVAL_MS: 3000,
      hasSufficientRealTelemetry: () => sufficient,
      runMarketEngineTick: async () => { calls++; await new Promise((r) => setTimeout(r, tickMs)); },
      Date: { now: () => now },
    };
    const api = build(
      `let inFlightEngineTick = null;\nlet engineHydrated = ${hydrated};\nlet lastRequestDrivenTickAtMs = 0;\n${tracked}\n${ensure}`,
      env,
      'return { runMarketEngineTickTracked, ensureEngineHydratedForRequest, inFlight: () => inFlightEngineTick };',
    );
    return { api, calls: () => calls, advance: (ms) => { now += ms; } };
  }

  // Concurrent callers collapse to ONE in-flight tick.
  {
    const h = harness({});
    await Promise.all([h.api.runMarketEngineTickTracked(), h.api.runMarketEngineTickTracked(),
                       h.api.runMarketEngineTickTracked(), h.api.runMarketEngineTickTracked()]);
    check('4 concurrent tracked callers run exactly ONE tick', h.calls() === 1, `calls=${h.calls()}`);
  }

  // The three route guards behave the same way.
  {
    const h = harness({});
    await Promise.all([h.api.ensureEngineHydratedForRequest(), h.api.ensureEngineHydratedForRequest(),
                       h.api.ensureEngineHydratedForRequest()]);
    check('3 concurrent GET subscribers provoke ONE tick', h.calls() === 1, `calls=${h.calls()}`);
  }

  // Repeated GETs are rate limited.
  {
    const h = harness({});
    await h.api.ensureEngineHydratedForRequest();
    await h.api.ensureEngineHydratedForRequest();
    await h.api.ensureEngineHydratedForRequest();
    check('sequential GETs within the interval are rate-limited to ONE tick', h.calls() === 1, `calls=${h.calls()}`);
    h.advance(3001);
    await h.api.ensureEngineHydratedForRequest();
    check('after the interval elapses a new tick is allowed', h.calls() === 2, `calls=${h.calls()}`);
  }

  // Outage: telemetry never becomes sufficient -> must stay bounded.
  {
    const h = harness({ sufficient: false, hydrated: true });
    for (let i2 = 0; i2 < 50; i2++) await h.api.ensureEngineHydratedForRequest();
    check('50 GETs during a total price outage do NOT launch 50 ticks', h.calls() === 1, `calls=${h.calls()}`);
    h.advance(3001);
    for (let i2 = 0; i2 < 50; i2++) await h.api.ensureEngineHydratedForRequest();
    check('outage tick rate stays bounded to one per interval', h.calls() === 2, `calls=${h.calls()}`);
  }

  // A healthy warm instance does no work at all.
  {
    const h = harness({ sufficient: true, hydrated: true });
    for (let i2 = 0; i2 < 10; i2++) await h.api.ensureEngineHydratedForRequest();
    check('a hydrated instance with sufficient telemetry runs NO request ticks', h.calls() === 0);
  }
}

// ---------------------------------------------------------------------------
console.log('== F8/H1. persistenceSeconds: wall-clock, and gap-bounded across a freeze ==');
{
  check('the `persistenceSeconds += 3` invocation counter is gone', !codeOnly.includes('persistenceSeconds += 3'));
  check('persistenceSeconds is derived from a wall-clock anchor',
    codeOnly.includes('Math.floor((observationNowMs - directionHoldSinceMs) / 1e3)'));
  check('an observation-gap bound exists', codeOnly.includes('MAX_OBSERVATION_GAP_MS'));

  // Execute the REAL persistence branch, lifted verbatim from runMarketEngineTick.
  const pStart = src.indexOf('    const observationNowMs = Date.now();');
  const pEnd = src.indexOf('lastObservationAtMs = observationNowMs;', pStart) + 'lastObservationAtMs = observationNowMs;'.length;
  if (pStart < 0 || pEnd < 0) throw new Error('cannot locate the persistence branch');
  const branch = src.slice(pStart, pEnd);

  function makeEngine() {
    let now = 1_000_000;
    const state = { persistenceSeconds: 0, directionHoldSinceMs: 0, lastObservationAtMs: 0, currentDirection: 'NEUTRAL' };
    const step = (pipelineDirection) => {
      const out = build(
        `let persistenceSeconds = ${state.persistenceSeconds};
         let directionHoldSinceMs = ${state.directionHoldSinceMs};
         let lastObservationAtMs = ${state.lastObservationAtMs};
         let currentDirection = ${JSON.stringify(state.currentDirection)};
         const pipelineDirection = ${JSON.stringify(pipelineDirection)};
         ${branch}`,
        { Date: { now: () => now }, MAX_OBSERVATION_GAP_MS: 12000, active15mCycle: { cycleId: 'C' }, Infinity },
        'return { persistenceSeconds, directionHoldSinceMs, lastObservationAtMs, currentDirection };',
      );
      Object.assign(state, out);
      return out;
    };
    return { step, advance: (ms) => { now += ms; }, state };
  }

  // Normal operation: persistence tracks real elapsed time.
  {
    const e = makeEngine();
    e.step('UP');                     // first agreeing observation anchors the hold
    e.advance(3000); e.step('UP');
    e.advance(3000); e.step('UP');
    check('6s of continuous observation yields 6s of persistence', e.state.persistenceSeconds === 6, `got ${e.state.persistenceSeconds}`);
  }

  // Many ticks at ONE instant must not accumulate.
  {
    const e = makeEngine();
    for (let i = 0; i < 12; i++) e.step('UP');
    check('12 ticks at a single instant yield 0s (not 36s)', e.state.persistenceSeconds === 0, `got ${e.state.persistenceSeconds}`);
  }

  // *** H1 REGRESSION: an 8-minute Vercel freeze/thaw ***
  {
    const e = makeEngine();
    e.step('UP'); e.advance(3000); e.step('UP'); e.advance(3000); e.step('UP');
    const before = e.state.persistenceSeconds;
    check('pre-freeze persistence is 6s', before === 6, `got ${before}`);

    e.advance(8 * 60 * 1000);   // lambda frozen 8 minutes: ZERO observations
    e.step('UP');               // first tick after thaw
    const after = e.state.persistenceSeconds;

    check('an 8-minute freeze does NOT credit unobserved time', after < 480, `got ${after}`);
    check('persistence restarts from the thaw (0s), not 486s', after === 0, `got ${after}`);
    check('the lock gate (>= 6s) is NOT instantly satisfied after a thaw', !(after >= 6), `got ${after}`);

    // ...and it re-earns persistence honestly from real observed time.
    e.advance(3000); e.step('UP');
    e.advance(3000); e.step('UP');
    check('after the thaw, persistence accrues again from real elapsed time', e.state.persistenceSeconds === 6, `got ${e.state.persistenceSeconds}`);
  }

  // A gap just inside the bound is treated as continuous.
  {
    const e = makeEngine();
    e.step('UP'); e.advance(3000); e.step('UP');
    e.advance(9000);            // 9s < 12s bound: a slow tick, not a freeze
    e.step('UP');
    check('a 9s gap (within bound) keeps the hold', e.state.persistenceSeconds === 12, `got ${e.state.persistenceSeconds}`);
    e.advance(12001);           // just over the bound
    e.step('UP');
    check('a 12.001s gap (over bound) restarts the hold', e.state.persistenceSeconds === 0, `got ${e.state.persistenceSeconds}`);
  }

  // Direction flips still reset.
  {
    const e = makeEngine();
    e.step('UP'); e.advance(4000); e.step('UP');
    check('hold accrued before the flip', e.state.persistenceSeconds === 4);
    e.advance(1000); e.step('DOWN');
    check('a direction flip resets persistence to 0', e.state.persistenceSeconds === 0);
    e.advance(5000); e.step('DOWN');
    check('persistence restarts from the flip', e.state.persistenceSeconds === 5, `got ${e.state.persistenceSeconds}`);
  }
}

// ---------------------------------------------------------------------------
console.log('== H3. evidence never fabricates aligned / detail ==');
{
  const srcUnknown = extract('unknownEvidenceFactor', 'function unknownEvidenceFactor(name)');
  const srcBuild = extract('buildEvidenceSubScores', 'function buildEvidenceSubScores(decisionDirection)');
  const mk = (pipeline) => build(`${srcUnknown}\n${srcBuild}`,
    { latestBtc15mPipeline: pipeline }, 'return buildEvidenceSubScores("UP");');

  // Pipeline entirely absent.
  const none = mk(null);
  check('missing pipeline yields 6 factors', none.length === 6);
  check('missing pipeline: every score is null', none.every((f) => f.score === null));
  check('missing pipeline: every aligned is null (no fabricated green badge)',
    none.every((f) => f.aligned === null), JSON.stringify(none.map((f) => f.aligned)));
  check('missing pipeline: no fabricated detail strings',
    none.every((f) => f.detail === null || f.detail === 'Cross-venue feed unavailable'),
    JSON.stringify(none.map((f) => f.detail)));
  check('no "Multi-TF 4/5" is invented', !JSON.stringify(none).includes('4/5'));
  check('no "+$18" is invented', !JSON.stringify(none).includes('18'));
  check('no "1.24x" is invented', !JSON.stringify(none).includes('1.24'));
  check('no "Vol regime NORMAL" is invented', !JSON.stringify(none).includes('NORMAL'));

  // Partial pipeline: present factors are real, absent ones are unknown.
  const partial = mk({ multiTimeframeAlignment: { alignedCount: 4, momentumClassification: 'STABLE' } });
  const mom = partial.find((f) => f.name === 'Momentum');
  const trend = partial.find((f) => f.name === 'Trend');
  check('a present factor still reports a real score', typeof mom.score === 'number');
  check('a present factor reports a real aligned', mom.aligned === true);
  check('a present factor reports a real detail', mom.detail === 'Multi-TF 4/5 momentum alignment');
  check('an absent sibling factor is unknown, not fabricated',
    trend.score === null && trend.aligned === null && trend.detail === null);

  // Full pipeline behaves exactly as before.
  const full = mk({
    multiTimeframeAlignment: { alignedCount: 4, momentumClassification: 'STABLE' },
    priceStructure: { displacementUSD: 18.4, breakoutState: 'BREAKOUT' },
    orderFlowAnalytics: { takerBuyRatio: 1.24 },
    volatilityExpectedMove: { coverageRatio: 1.4, isStrikeFeasible: true, volatilityRegime: 'NORMAL', realizedVol15mPct: 1.2 },
    edgeVsConfidence: { kalshiImpliedProbability: 0.62 },
  });
  check('full pipeline: all six factors carry real scores', full.every((f) => typeof f.score === 'number'));
  check('full pipeline: Sentiment uses the real Kalshi probability', full.find((f) => f.name === 'Sentiment').detail === 'Kalshi implied 62c');
  check('full pipeline: Volatility reports the real regime', full.find((f) => f.name === 'Volatility').detail === 'Vol regime NORMAL (1.20%)');
  check('full pipeline: Order Flow reports the real ratio', full.find((f) => f.name === 'Order Flow').detail === 'Taker buy ratio 1.24x');

  // Sentiment direction sensitivity is preserved.
  const down = build(`${srcUnknown}\n${srcBuild}`,
    { latestBtc15mPipeline: { edgeVsConfidence: { kalshiImpliedProbability: 0.62 } } },
    'return buildEvidenceSubScores("DOWN");');
  check('Sentiment alignment flips with the decision direction',
    down.find((f) => f.name === 'Sentiment').aligned === false);

  check('the source comment no longer claims every fallback is null',
    !codeOnly.includes('Every fabricated fallback is replaced by null'));
}

console.log('== F2. evidence is canonical, never local or fabricated ==');
{
  const hyd = build(extract('markResponseHydrating', 'function markResponseHydrating(responseObj, reason)'),
    { rollingBtcTicks: [], MIN_REAL_TICKS_FOR_DECISION: 12 },
    'return markResponseHydrating;');
  const r = hyd({ evidence: { subScores: [{ name: 'Momentum', score: 8.0 }] }, currentSpot: 0, openStrike: 0, gemini: {}, protection: {} }, 'X');
  check('HYDRATING exposes NO evidence.subScores', r.evidence === null);
  check('HYDRATING nulls a zero currentSpot (no $0.00)', r.currentSpot === null);
  check('HYDRATING nulls a zero openStrike', r.openStrike === null);

  const proj = build(extract('projectCanonicalOntoResponse', 'function projectCanonicalOntoResponse(responseObj, record)') +
    '\n' + extract('canonicalStageRank', 'function canonicalStageRank(stage)') +
    '\n' + extract('canonicalNormalizeStage', 'function canonicalNormalizeStage(stage)') +
    '\n' + extract('canonicalStateForStage', 'function canonicalStateForStage(stage, direction)'),
    { CANONICAL_STAGE_RANK: { HYDRATING: 0, OBSERVING: 1, CALIBRATING: 2, ANALYZING: 3, QUALIFYING: 4, LOCKING: 4, CONFIRMING: 5, LOCKED: 6, SKIP: 6, NO_TRADE: 6, CRITICALLY_INVALIDATED: 7, SETTLED: 8 } },
    'return projectCanonicalOntoResponse;');

  const localEvidence = { subScores: [{ name: 'Momentum', score: 9.9, detail: 'this instance' }] };
  const canonEvidence = { subScores: [{ name: 'Momentum', score: 3.1, detail: 'canonical' }] };

  const withCanon = proj({ evidence: localEvidence, gemini: {}, protection: {} },
    { cycleId: 'C', stage: 'LOCKED', direction: 'UP', confidence: 81, spotAtLock: 77855.7, lockQualified: true, evidence: canonEvidence });
  check('projection replaces local evidence with canonical evidence', withCanon.evidence === canonEvidence);
  check('a stale instance cannot show its own evidence beside a canonical decision',
    withCanon.evidence.subScores[0].score === 3.1);

  const noCanon = proj({ evidence: localEvidence, gemini: {}, protection: {} },
    { cycleId: 'C', stage: 'ANALYZING', direction: 'UP', confidence: 54 });
  check('canonical record without evidence => null, NOT the local fallback', noCanon.evidence === null);

  check('no fabricated evidence constants remain in source',
    !/return (8\.0|8\.2|7\.9|7\.6|7\.2);/.test(codeOnly));
  check('the evidence builder exists and is shared', src.includes('function buildEvidenceSubScores(decisionDirection)'));
  check('the canonical payload carries evidence', src.includes('evidence: { subScores: buildEvidenceSubScores(dir || "NEUTRAL") }'));
  check('the lock payload carries evidence', src.includes('evidence: { subScores: buildEvidenceSubScores(dir) }'));
}

// ---------------------------------------------------------------------------
console.log('== F11. diagnostics never emit fabricated market data ==');
{
  check('the `|| 64821.5` spot fallback is gone', !codeOnly.includes('64821.5'));
  check('the `|| 65e3` strike fallback is gone', !codeOnly.includes('current15mStrikePrice || 65e3'));
  check('diagnostic reports an unhydrated spot honestly',
    src.includes('currentBtcPrice > 0 ? currentBtcPrice : "unhydrated"'));
  check('diagnostic reports an unhydrated strike honestly',
    src.includes('current15mStrikePrice || "unhydrated"'));
}

console.log(`\n== mission1 hardening invariants: ${pass} passed, ${fail} failed ==`);
process.exit(fail === 0 ? 0 : 1);
