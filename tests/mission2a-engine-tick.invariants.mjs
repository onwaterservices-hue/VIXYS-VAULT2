// RUNTIME INVARIANT TESTS — MISSION 2A: ENGINE TICK EXECUTION
//
// vercel.json schedules /api/cron/engine-tick every minute but the route did not
// exist, so the engine was never warmed: rollingBtcTicks stayed at 1 against a
// 12-tick minimum, hasSufficientRealTelemetry() stayed false,
// buildCanonicalPayloadFromEngine returned null, and no canonical decision was
// ever committed -- every cycle served HYDRATING for its whole life.
//
// These tests execute the REAL route handler extracted verbatim from server.ts
// against stubs, and assert on the REAL source for the gates that must NOT have
// moved. No reimplementation. Path resolved RELATIVE to this file.
//
// The server is deliberately NOT booted here: its tick loop commits canonical
// decisions to the live Firestore, so running it locally would inject this
// machine into production consensus.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = readFileSync(join(root, 'server.ts'), 'utf8');
const vercelJson = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));

// Source with `//` comment lines stripped. Several assertions below search for
// the ABSENCE of a pattern, and the explanatory comments quote the very
// patterns being removed -- matching those would be a false positive.
const codeOnly = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== MISSION 2A — ENGINE TICK EXECUTION INVARIANTS ===\n');

// ---------------------------------------------------------------------------
// 1. The scheduled route exists.
// ---------------------------------------------------------------------------
console.log('[1] Cron schedule and route agree');
const cronPaths = (vercelJson.crons || []).map(c => c.path);
check('vercel.json still schedules /api/cron/engine-tick', cronPaths.includes('/api/cron/engine-tick'));
check('engine-tick schedule is every minute',
  (vercelJson.crons || []).find(c => c.path === '/api/cron/engine-tick')?.schedule === '* * * * *');
// Every scheduled cron must now have a handler -- this is the defect class.
for (const p of cronPaths) {
  const registered = new RegExp(`app\\.(get|post|all)\\(\\s*(\\[[^\\]]*)?["']${p.replace(/\//g, '\\/')}["']`).test(codeOnly);
  check(`route handler exists for scheduled cron ${p}`, registered);
}
check('maxDuration still 60s for api/index.ts', vercelJson.functions?.['api/index.ts']?.maxDuration === 60);

// ---------------------------------------------------------------------------
// 2. Extract and EXECUTE the real handler against stubs.
// ---------------------------------------------------------------------------
console.log('\n[2] The real handler drives the existing tracked tick');
const routeStart = src.indexOf('app.all("/api/cron/engine-tick"');
if (routeStart < 0) throw new Error('engine-tick route not found in server.ts');
const routeEnd = src.indexOf('\n});', routeStart) + 4;
const routeSrc = src.slice(routeStart, routeEnd);

check('handler calls the existing runMarketEngineTickTracked', /await runMarketEngineTickTracked\(\)/.test(routeSrc));
check('handler does NOT define a second engine',
  !/function\s+runMarketEngine|evaluateBtc15mHighConvictionPipeline\(/.test(routeSrc));
check('handler never pushes telemetry itself', !/rollingBtcTicks\.push/.test(routeSrc));
check('handler never writes a canonical decision itself', !/commitCanonicalDecision\(/.test(routeSrc));
check('handler never mutates the tick minimum', !/MIN_REAL_TICKS_FOR_DECISION\s*=/.test(routeSrc));

// Build an executable copy with injected dependencies.
function makeHandler({ tickImpl, ticksArray, sufficient, deadlineMs = 300, intervalMs = 20 }) {
  const body = routeSrc
    .replace('app.all("/api/cron/engine-tick", async (req, res) => {', 'return async (req, res) => {')
    .replace(/\n\}\);\s*$/, '\n};');
  const factory = new Function(
    'runMarketEngineTickTracked', 'rollingBtcTicks', 'MIN_REAL_TICKS_FOR_DECISION',
    'hasSufficientRealTelemetry', 'active15mCycle', 'lastMarketUpdateTs',
    'ENGINE_TICK_CRON_DEADLINE_MS', 'ENGINE_TICK_CRON_INTERVAL_MS',
    `let engineTickCronInFlight = false;\n${body}`
  );
  return factory(
    tickImpl, ticksArray, 12, sufficient,
    { cycleId: 'TEST-CYCLE', stage: 'OBSERVING', qualificationStatus: null },
    Date.now(), deadlineMs, intervalMs
  );
}

const mkRes = () => { const r = { body: null }; r.json = v => { r.body = v; return r; }; return r; };

// 2a. It ticks repeatedly within the deadline rather than once.
{
  const ticks = [];
  let calls = 0;
  const handler = makeHandler({
    tickImpl: async () => { calls++; ticks.push({ price: 1, ts: Date.now() }); },
    ticksArray: ticks,
    sufficient: () => ticks.length >= 12,
  });
  const res = mkRes();
  await handler({}, res);
  check('one invocation runs MANY ticks, not one', calls > 5, `calls=${calls}`);
  check('telemetry actually accumulated past the 12-tick minimum', ticks.length >= 12, `ticks=${ticks.length}`);
  check('reports sufficientRealTelemetry truthfully when reached', res.body.sufficientRealTelemetry === true);
  check('reports the real observed tick count', res.body.telemetryTicks === ticks.length);
  check('respects its deadline budget', res.body.durationMs < 2000, `durationMs=${res.body.durationMs}`);
}

// 2b. An upstream price outage must stay VISIBLE, never reported as success.
{
  const ticks = [];
  const handler = makeHandler({
    // F3: a tick that cannot read a real price records nothing.
    tickImpl: async () => {},
    ticksArray: ticks,
    sufficient: () => false,
  });
  const res = mkRes();
  await handler({}, res);
  check('price outage leaves telemetry at zero', res.body.telemetryTicks === 0);
  check('price outage reports sufficientRealTelemetry false', res.body.sufficientRealTelemetry === false);
  check('no telemetry is fabricated to fill the gap', ticks.length === 0);
  check('still reports the required minimum for diagnosis', res.body.requiredTelemetryTicks === 12);
}

// 2c. A throwing tick must not crash the invocation or fake a result.
{
  const ticks = [];
  const handler = makeHandler({
    tickImpl: async () => { throw new Error('upstream 503'); },
    ticksArray: ticks,
    sufficient: () => false,
  });
  const res = mkRes();
  await handler({}, res);
  check('a throwing tick is contained', res.body && res.body.job === 'ENGINE_TICK');
  check('the error is surfaced, not swallowed', /upstream 503/.test(String(res.body.lastError)));
  check('a failed tick fabricates no telemetry', res.body.telemetryTicks === 0);
}

// 2d. Amplification guard: concurrent calls do not stack warm loops.
{
  const ticks = [];
  let calls = 0;
  const handler = makeHandler({
    tickImpl: async () => { calls++; ticks.push({ price: 1, ts: Date.now() }); },
    ticksArray: ticks,
    sufficient: () => false,
  });
  const a = handler({}, mkRes());
  const second = mkRes();
  await handler({}, second);
  await a;
  check('a concurrent call is refused rather than stacking a second loop',
    second.body.skipped === 'ALREADY_RUNNING_ON_THIS_INSTANCE', JSON.stringify(second.body));
}

// ---------------------------------------------------------------------------
// 3. Every gate this mission must NOT weaken is byte-for-byte intact.
// ---------------------------------------------------------------------------
console.log('\n[3] No gate was weakened');
check('MIN_REAL_TICKS_FOR_DECISION is still 12',
  /const MIN_REAL_TICKS_FOR_DECISION = 12;/.test(codeOnly));
check('hasSufficientRealTelemetry still requires the tick minimum',
  /rollingBtcTicks\.length >= MIN_REAL_TICKS_FOR_DECISION/.test(codeOnly));
check('hasSufficientRealTelemetry still requires a real positive price',
  /Number\.isFinite\(currentBtcPrice\)[\s\S]{0,40}currentBtcPrice > 0/.test(codeOnly));
check('hasSufficientRealTelemetry still requires a real strike',
  /Number\.isFinite\(current15mStrikePrice\)[\s\S]{0,60}current15mStrikePrice > 0/.test(codeOnly));
check('buildCanonicalPayloadFromEngine still refuses without telemetry',
  /function buildCanonicalPayloadFromEngine\(livePrice\) \{\s*\n\s*if \(!hasSufficientRealTelemetry\(\)\) return null;/.test(src));
check('only REAL observations still enter the tick buffer',
  /if \(Number\.isFinite\(spot\) && spot > 0\) \{\s*\n\s*rollingBtcTicks\.push/.test(src));
check('the 360s minimum observation window is unchanged',
  (codeOnly.match(/minimumElapsedSeconds: 360/g) || []).length >= 2);
check('the canonical commit is still gated by shouldCommitCanonical',
  /if \(canonicalPayload && shouldCommitCanonical\(canonicalPayload\)\)/.test(codeOnly));

// ---------------------------------------------------------------------------
// 4. Terminal semantics preserved: SKIP canonicalizes, LOCKED stays terminal.
// ---------------------------------------------------------------------------
console.log('\n[4] Terminal state semantics preserved');
const normSrc = src.slice(src.indexOf('function canonicalNormalizeStage'), src.indexOf('function canonicalStateForStage'));
const stateSrc = src.slice(src.indexOf('function canonicalStateForStage'), src.indexOf('__name(canonicalStateForStage'));
// server.ts is esbuild output; __name is its function-naming helper.
const { canonicalNormalizeStage, canonicalStateForStage } = new Function(
  '__name',
  `${normSrc}\n${stateSrc}\nreturn { canonicalNormalizeStage, canonicalStateForStage };`
)((fn) => fn);

check("NO_TRADE still canonicalizes to SKIP", canonicalNormalizeStage('NO_TRADE') === 'SKIP');
check("stage SKIP still maps to state SKIP", canonicalStateForStage('SKIP') === 'SKIP');
check("stage NO_TRADE still maps to state SKIP", canonicalStateForStage('NO_TRADE') === 'SKIP');
check("LOCKED + UP still maps to LOCKED_UP", canonicalStateForStage('LOCKED', 'UP') === 'LOCKED_UP');
check("LOCKED + DOWN still maps to LOCKED_DOWN", canonicalStateForStage('LOCKED', 'DOWN') === 'LOCKED_DOWN');
check("HYDRATING still maps to HYDRATING", canonicalStateForStage('HYDRATING') === 'HYDRATING');
check('the committer still refuses to overwrite a committed LOCKED or SKIP',
  /refuses to overwrite a cycle that\s*\n\s*\/\/ has already committed LOCKED or SKIP/.test(src) ||
  /already committed LOCKED or SKIP/.test(src));

// ---------------------------------------------------------------------------
// 5. HYDRATING honesty (Mission 1) is untouched by this change.
// ---------------------------------------------------------------------------
console.log('\n[5] HYDRATING honesty is untouched');
for (const field of ['direction', 'confidence', 'lockScore', 'reversalRisk', 'spotAtLock', 'lockedAt', 'lockEvaluation', 'evidence']) {
  check(`markResponseHydrating still nulls ${field}`,
    new RegExp(`responseObj\\.${field} = null;`).test(codeOnly));
}
check('markResponseHydrating still reports why it is hydrating',
  /responseObj\.hydratingReason = reason \|\| "INSUFFICIENT_REAL_TELEMETRY";/.test(codeOnly));
check('the read route still answers HYDRATING when no record is committed',
  /markResponseHydrating\(\s*\n?\s*decisionObj,/.test(src));

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
