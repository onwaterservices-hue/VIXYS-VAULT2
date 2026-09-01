// RUNTIME INVARIANT TESTS — FRONTEND HYDRATING HONESTY
//
// Guards the presentation contract for the canonical 15M decision: while the
// backend reports currentState 'HYDRATING' it sends direction, confidence,
// lockScore, reversalRisk, lockEvaluation, spotAtLock and evidence as null, and
// no consumer surface may substitute a literal for any of them.
//
// Verified live on preview deployment 052e0cb (dpl_2HUX879e2UkvzfTvj3NRUjfCvuVX):
// /api/vixy/15m/current returned all seven as null while the terminal rendered
// BIAS UP, 50% CONVICTION, LOCK QUALITY 87 "OPTIMAL LOCK" and REVERSAL 12%.
//
// Executes the REAL source (transpiled with esbuild, or extracted verbatim), no
// reimplementation. Path resolved RELATIVE to this file.
import { readFileSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

// Transpile a real module (and its local deps) to an importable data URL.
async function loadModule(relPath) {
  const result = await build({
    entryPoints: [join(srcDir, relPath)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

console.log('\n=== FRONTEND HYDRATING HONESTY INVARIANTS ===\n');

const decisionDisplay = await loadModule('utils/decisionDisplay.ts');
const evidence = await loadModule('utils/evidenceVectors.ts');
const { UNKNOWN_DISPLAY, hasCommittedDecision, formatDecisionNumber, formatDecisionPercent } = decisionDisplay;
const { computeEvidenceVectors } = evidence;

// The exact shape /api/vixy/15m/current returns while HYDRATING, taken from the
// live preview response rather than invented for the test.
const HYDRATING = {
  cycleId: '15M-2026-09-01T19:30:00.000Z',
  currentState: 'HYDRATING',
  openStrike: 77337.74,
  currentSpot: 77314.7,
  spotAtLock: null,
  direction: null,
  confidence: null,
  lockScore: null,
  reversalRisk: null,
  lockEvaluation: null,
  evidence: null,
  lockedAt: null,
  lockTier: 'NONE',
  regime: 'CHOPPY',
  evidenceAlignment: 6,
  gemini: { upProbability: 0.44, downProbability: 0.5, confidence: null, signalDirection: null, evidenceFactors: [] },
};

const COMMITTED = {
  ...HYDRATING,
  currentState: 'LOCKED_UP',
  direction: 'UP',
  confidence: 81,
  lockScore: 84,
  reversalRisk: 18,
  spotAtLock: 77300.5,
  lockedAt: 1788291600000,
  lockTier: 'OPTIMAL',
  lockEvaluation: { lockScore: 84, conviction: 81, reversalRisk: 18 },
};

// ---------------------------------------------------------------------------
// 1. HYDRATING with null decision fields produces no direction/confidence/
//    lockScore/reversalRisk.
// ---------------------------------------------------------------------------
console.log('[1] HYDRATING yields no decision values');
check('hasCommittedDecision(HYDRATING) === false', hasCommittedDecision(HYDRATING) === false);
check('hasCommittedDecision(null) === false', hasCommittedDecision(null) === false);
check('hasCommittedDecision(undefined) === false', hasCommittedDecision(undefined) === false);
check(
  'a non-HYDRATING state with a null direction is still uncommitted',
  hasCommittedDecision({ currentState: 'WATCH', direction: null }) === false
);
check('hasCommittedDecision(COMMITTED) === true', hasCommittedDecision(COMMITTED) === true);

// ---------------------------------------------------------------------------
// 2. No numeric/literal fallback may override a null canonical decision.
// ---------------------------------------------------------------------------
console.log('\n[2] Formatters never invent a value');
check(`formatDecisionPercent(null) === '${UNKNOWN_DISPLAY}'`, formatDecisionPercent(null) === UNKNOWN_DISPLAY);
check(`formatDecisionPercent(undefined) === '${UNKNOWN_DISPLAY}'`, formatDecisionPercent(undefined) === UNKNOWN_DISPLAY);
check('formatDecisionPercent(NaN) is unknown', formatDecisionPercent(NaN) === UNKNOWN_DISPLAY);
check('formatDecisionPercent(Infinity) is unknown', formatDecisionPercent(Infinity) === UNKNOWN_DISPLAY);
check('formatDecisionNumber(null) is unknown', formatDecisionNumber(null) === UNKNOWN_DISPLAY);
// 0 is a real reading and must survive -- the old `|| 78` idiom swallowed it.
check("formatDecisionPercent(0) === '0%'", formatDecisionPercent(0) === '0%');
check("formatDecisionNumber(0) === '0'", formatDecisionNumber(0) === '0');
check("formatDecisionPercent(81) === '81%'", formatDecisionPercent(81) === '81%');

// ---------------------------------------------------------------------------
// 3. All seven decision-derived fields remain null/unknown during HYDRATING,
//    and the evidence matrix asserts nothing.
// ---------------------------------------------------------------------------
console.log('\n[3] Evidence matrix asserts nothing while HYDRATING');
const hydratingEvidence = computeEvidenceVectors(HYDRATING);
check('no vector carries a score', hydratingEvidence.vectors.every(v => v.score === null));
check('every vector displays the em dash', hydratingEvidence.vectors.every(v => v.displayScore === '—'));
check('no vector is marked aligned', hydratingEvidence.vectors.every(v => v.aligned === false));
check('alignedCount === 0', hydratingEvidence.alignedCount === 0);
check('totalValidCount === 0', hydratingEvidence.totalValidCount === 0);
check('compositeScore === null', hydratingEvidence.compositeScore === null);
check('convictionPct === 0', hydratingEvidence.convictionPct === 0);
check(
  'no header names a direction',
  !/\b(UP|DOWN|bullish|bearish)\b/.test(
    [hydratingEvidence.signalsAlignedHeader, hydratingEvidence.convictionHeaderText, hydratingEvidence.dynamicExplanation].join(' ')
  ),
  hydratingEvidence.dynamicExplanation
);
check(
  'headers show the em dash rather than a count',
  hydratingEvidence.signalsAlignedHeader.includes('—') && hydratingEvidence.compositeFooterText.includes('—')
);

// ---------------------------------------------------------------------------
// 4. Real committed decision values continue rendering normally.
// ---------------------------------------------------------------------------
console.log('\n[4] A committed decision still renders its real values');
const committedEvidence = computeEvidenceVectors(COMMITTED);
check('committed decision produces scored vectors', committedEvidence.vectors.some(v => v.score !== null));
check('committed decision produces a composite', committedEvidence.compositeScore !== null);
check('committed decision counts valid vectors', committedEvidence.totalValidCount > 0);
check('committed confidence formats normally', formatDecisionPercent(COMMITTED.confidence) === '81%');
check('committed lockScore formats normally', formatDecisionNumber(COMMITTED.lockScore) === '84');

// ---------------------------------------------------------------------------
// 5. createInitial15mDecision() cannot seed 50/45/12-style decision values.
//    Executes the REAL function, extracted verbatim from the engine source.
// ---------------------------------------------------------------------------
console.log('\n[5] createInitial15mDecision seeds no decision values');
const engineSrc = readFileSync(join(srcDir, 'services', 'engine', 'canonicalDecisionEngine.ts'), 'utf8');
const fnStart = engineSrc.indexOf('export function createInitial15mDecision');
const fnEnd = engineSrc.indexOf('\n}', engineSrc.indexOf('serverSource:', fnStart)) + 2;
if (fnStart < 0 || fnEnd < 2) throw new Error('cannot locate createInitial15mDecision');
const fnSrc = engineSrc
  .slice(fnStart, fnEnd)
  .replace('export function', 'function')
  // Strip TS annotations the raw evaluator cannot parse.
  .replace(/\}\): Canonical15mDecision \{/, '}) {')
  .replace(/params\?: \{[\s\S]*?\}\)/, 'params)');

const makeInitial = new Function(
  'get15mEpochBoundaries',
  `${fnSrc}; return createInitial15mDecision;`
)(nowMs => ({
  cycleStart: nowMs,
  cycleEnd: nowMs + 900000,
  cycleId: 'TEST-CYCLE',
  contractId: 'TEST-CONTRACT',
  decisionId: 'TEST-DECISION',
}));

const seed = makeInitial({ nowMs: Date.now(), spotPrice: 77000 });

check("seed currentState === 'HYDRATING'", seed.currentState === 'HYDRATING', seed.currentState);
for (const field of ['direction', 'confidence', 'lockScore', 'reversalRisk']) {
  check(`seed ${field} === null`, seed[field] === null, String(seed[field]));
}
check('seed protection.lockScore === null', seed.protection.lockScore === null, String(seed.protection?.lockScore));
check('seed protection.reversalRisk === null', seed.protection.reversalRisk === null, String(seed.protection?.reversalRisk));
check('seed protection.lockEvaluation === null', seed.protection.lockEvaluation === null);
check('seed gemini.confidence === null', seed.gemini.confidence === null, String(seed.gemini?.confidence));
check('seed gemini.signalDirection === null', seed.gemini.signalDirection === null, String(seed.gemini?.signalDirection));
check('seed spotAtLock === null', seed.spotAtLock === null);
check('seed lockedAt === null', seed.lockedAt === null);

// The specific fabricated values observed in the browser must not reappear
// anywhere among the seed's decision-derived fields.
const FORBIDDEN_SEEDS = [50, 45, 12, 78, 28, 87, 22, 76, 88];
const seededDecisionValues = [
  seed.direction, seed.confidence, seed.lockScore, seed.reversalRisk,
  seed.protection?.lockScore, seed.protection?.reversalRisk,
  seed.gemini?.confidence, seed.gemini?.reversalRisk,
];
check(
  'no decision-derived seed carries a fabricated constant',
  seededDecisionValues.every(v => v === null || !FORBIDDEN_SEEDS.includes(v)),
  JSON.stringify(seededDecisionValues)
);

// The seed must be uncommitted by the same predicate the UI uses.
check('the seed itself reads as uncommitted', hasCommittedDecision(seed) === false);
check('the seed produces an empty evidence matrix', computeEvidenceVectors(seed).totalValidCount === 0);

// ---------------------------------------------------------------------------
// 6. Source guard: the literal fallbacks removed here must not come back.
// ---------------------------------------------------------------------------
console.log('\n[6] Repaired surfaces carry no literal decision fallbacks');
const GUARDED_FILES = [
  'components/CryptoPredictionCenterView.tsx',
  'components/vixyV2/ContextualRightRail.tsx',
  'components/VixyHubView.tsx',
  'components/vixy-live-workspace/ModuleCards.tsx',
  'components/LandingPage.tsx',
  'hooks/useSystemNotifications.ts',
];
// direction/confidence/lockScore/reversalRisk followed by || or ?? and a literal.
const FALLBACK_RE =
  /\b(direction|confidence|lockScore|reversalRisk|evidenceAlignment)\s*(\|\||\?\?)\s*('UP'|'DOWN'|"UP"|"DOWN"|\d)/;

for (const rel of GUARDED_FILES) {
  const text = readFileSync(join(srcDir, rel), 'utf8')
    .split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');
  const m = text.match(FALLBACK_RE);
  check(`${rel} has no literal decision fallback`, m === null, m ? m[0] : '');
}


// ---------------------------------------------------------------------------
// 7. B1 — the Prediction Center children must not coerce null into a favourable
//    reading. These are RENDERED for real with react-dom/server and the emitted
//    markup is asserted, so a future `null < 25` regression fails here.
// ---------------------------------------------------------------------------
console.log('\n[7] Prediction Center children render no fabricated values (real SSR)');

// React components keep react/framer-motion/lucide external so the real
// runtime is used, which means the bundle must live on disk inside the project
// for node_modules resolution to work (a data: URL cannot resolve bare imports).
const tmpDir = join(here, '.tmp-ssr');
mkdirSync(tmpDir, { recursive: true });
let tmpSeq = 0;

async function loadComponent(relPath) {
  const outFile = join(tmpDir, `c${tmpSeq++}.mjs`);
  await build({
    entryPoints: [join(srcDir, relPath)],
    bundle: true,
    outfile: outFile,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    external: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
    logLevel: 'silent',
  });
  return import(pathToFileURL(outFile).href);
}

const { renderToStaticMarkup } = await import('react-dom/server');
const { createElement } = await import('react');

const { NeuralDecompositionMatrix } = await loadComponent('components/prediction-center/NeuralDecompositionMatrix.tsx');
const { AutonomousExecutionGuard } = await loadComponent('components/prediction-center/AutonomousExecutionGuard.tsx');
const { ScenarioSimulatorMatrix } = await loadComponent('components/prediction-center/ScenarioSimulatorMatrix.tsx');

// Exactly the props CryptoPredictionCenterView passes while HYDRATING.
const nullDecisionProps = { conviction: null, lockQuality: null, reversalRisk: null, isUp: false };

// The status label (BULLISH/BEARISH/NEUTRAL) is emitted BEFORE the factor name
// in this card's markup, so read the window preceding the name, not following it.
const TAIL_FACTOR_NAME = 'Entropy &amp; Reversal Tail Risk Dampener';
function tailFactorStatus(html) {
  const i = html.indexOf(TAIL_FACTOR_NAME);
  if (i < 0) return 'FACTOR-NOT-RENDERED';
  const window = html.slice(Math.max(0, i - 600), i);
  const m = window.match(/(BULLISH|BEARISH|NEUTRAL)(?![\s\S]*(BULLISH|BEARISH|NEUTRAL))/);
  return m ? m[1] : 'NO-STATUS-FOUND';
}

const matrixHtml = renderToStaticMarkup(createElement(NeuralDecompositionMatrix, nullDecisionProps));
// 7.1 null reversalRisk must not satisfy `< 25` and become BULLISH evidence.
// Guard the guard: if the factor stops rendering, this must fail, not pass.
check('tail-risk factor is actually rendered', matrixHtml.includes(TAIL_FACTOR_NAME));
check(
  'null reversalRisk yields a NEUTRAL tail-risk factor, not BULLISH',
  tailFactorStatus(matrixHtml) === 'NEUTRAL',
  tailFactorStatus(matrixHtml)
);
check('null reversalRisk contributes no points', !/\+8\.5 pts/.test(matrixHtml));
check('null reversalRisk does not render "Reversal Risk at %"', !/Reversal Risk at\s*%/.test(matrixHtml));
check('null reversalRisk renders an unknown risk metric', /Reversal Risk\s*—/.test(matrixHtml));
// 7.2 no "validated across all 6 sub-models" claim without a conviction.
check(
  'no synthesis claim is made without a conviction',
  !/validated across all 6 sub-models/.test(matrixHtml)
);
check('no bare "%" conviction is emitted', !/Composite Conviction Synthesized:<\/strong>\s*%/.test(matrixHtml));

const guardHtml = renderToStaticMarkup(
  createElement(AutonomousExecutionGuard, {
    spotPrice: 77314.7, strikePrice: 77337.74, conviction: null, reversalRisk: null,
    isActuallyLocked: false, asset: 'BTC', isUp: false,
  })
);
// 7.3 null reversalRisk must not satisfy `<= 25` and claim a safety margin.
check(
  'null reversalRisk claims no safety-ceiling margin',
  !/comfortably below the 25% safety ceiling/.test(guardHtml)
);
check('null reversalRisk renders an explicit not-assessed state', /not assessed for this cycle/.test(guardHtml));
check('no Kelly dollar sizing is advised without a conviction', !/Optimal allocation based on\s*%/.test(guardHtml));
check(
  'Kelly advice is explicitly withheld',
  /No allocation advice while VIXY has not committed a decision/.test(guardHtml)
);

const simHtml = renderToStaticMarkup(
  createElement(ScenarioSimulatorMatrix, {
    spotPrice: 77314.7, strikePrice: 77337.74, asset: 'BTC',
    baseConviction: null, baseLockQuality: null, baseReversalRisk: null, isUp: false,
  })
);
// 7.4 null inputs must not enter arithmetic and yield simulated numbers.
const simSection = simHtml.slice(simHtml.indexOf('SIM CONVICTION'));
check('SIM CONVICTION renders unknown, not a number', /SIM CONVICTION[\s\S]{0,240}?—/.test(simSection));
check('SIM LOCK QUALITY renders unknown, not a number', /SIM LOCK QUALITY[\s\S]{0,240}?—/.test(simSection));
check('SIM REVERSAL RISK renders unknown, not a number', /SIM REVERSAL RISK[\s\S]{0,240}?—/.test(simSection));
check('no fabricated EV dollar figure', !/Expected Value \(EV\):[\s\S]{0,240}?\+?\$\d/.test(simHtml));
check('ROI renders unknown', /—\s*ROI/.test(simHtml));

// 7.5 committed values still render normally through the very same components.
const committedMatrixHtml = renderToStaticMarkup(
  createElement(NeuralDecompositionMatrix, { conviction: 81, lockQuality: 84, reversalRisk: 18, isUp: true })
);
check('committed conviction still renders its real value', /81%\s*directional probability/.test(committedMatrixHtml));
check(
  'committed low reversal risk still scores BULLISH',
  tailFactorStatus(committedMatrixHtml) === 'BULLISH',
  tailFactorStatus(committedMatrixHtml)
);
check('committed low reversal risk still contributes its points', /\+8\.5 pts/.test(committedMatrixHtml));
check('committed reversal risk renders its number', /Reversal Risk at 18%/.test(committedMatrixHtml));

const committedGuardHtml = renderToStaticMarkup(
  createElement(AutonomousExecutionGuard, {
    spotPrice: 77400, strikePrice: 77337.74, conviction: 81, reversalRisk: 18,
    isActuallyLocked: true, asset: 'BTC', isUp: true,
  })
);
check(
  'committed low risk still states the safety margin',
  /Reversal risk is 18%, comfortably below the 25% safety ceiling/.test(committedGuardHtml)
);
check('committed conviction still drives Kelly advice', /Optimal allocation based on 81% directional conviction/.test(committedGuardHtml));

const committedSimHtml = renderToStaticMarkup(
  createElement(ScenarioSimulatorMatrix, {
    spotPrice: 77400, strikePrice: 77337.74, asset: 'BTC',
    baseConviction: 81, baseLockQuality: 84, baseReversalRisk: 18, isUp: true,
  })
);
check('committed simulator still produces numbers', /SIM CONVICTION[\s\S]{0,240}?81%/.test(committedSimHtml));

// ---------------------------------------------------------------------------
// 8. B2 — the HYDRATING seed must not wedge the canonical state machine, and
//    terminal monotonicity must be unchanged. Executes the REAL exported
//    transition function.
// ---------------------------------------------------------------------------
console.log('\n[8] HYDRATING is an entry point, never a wedge or a destination');
const types = await loadModule('types/canonicalDecision.ts');
const { isValid15mStateTransition } = types;

// 8.1 the seed can leave HYDRATING into every real lifecycle state.
for (const to of ['WATCH', 'CONFIRMING', 'LOCKED_UP', 'LOCKED_DOWN', 'SKIP', 'SETTLED']) {
  check(`HYDRATING -> ${to} is permitted`, isValid15mStateTransition('HYDRATING', to) === true);
}
check('the engine cannot be wedged: HYDRATING has at least one legal exit',
  ['WATCH', 'CONFIRMING', 'LOCKED_UP', 'LOCKED_DOWN', 'SKIP', 'SETTLED']
    .some(to => isValid15mStateTransition('HYDRATING', to)));

// 8.2 HYDRATING is never a destination -- no regression back out of the lifecycle.
for (const from of ['WATCH', 'CONFIRMING', 'LOCKED_UP', 'LOCKED_DOWN', 'PROTECTED', 'SKIP', 'SETTLED']) {
  check(`${from} -> HYDRATING is refused`, isValid15mStateTransition(from, 'HYDRATING') === false);
}

// 8.3 terminal monotonicity is unchanged by the new case.
check('LOCKED_UP -> WATCH still refused', isValid15mStateTransition('LOCKED_UP', 'WATCH') === false);
check('LOCKED_UP -> CONFIRMING still refused', isValid15mStateTransition('LOCKED_UP', 'CONFIRMING') === false);
check('LOCKED_DOWN -> WATCH still refused', isValid15mStateTransition('LOCKED_DOWN', 'WATCH') === false);
check('LOCKED_DOWN -> CONFIRMING still refused', isValid15mStateTransition('LOCKED_DOWN', 'CONFIRMING') === false);
check('SETTLED is terminal', ['WATCH', 'CONFIRMING', 'LOCKED_UP', 'SKIP', 'PROTECTED']
  .every(to => isValid15mStateTransition('SETTLED', to) === false));
check('LOCKED_UP -> PROTECTED still allowed', isValid15mStateTransition('LOCKED_UP', 'PROTECTED') === true);
check('LOCKED_UP -> SKIP (emergency veto) still allowed', isValid15mStateTransition('LOCKED_UP', 'SKIP') === true);
check('WATCH -> CONFIRMING still allowed', isValid15mStateTransition('WATCH', 'CONFIRMING') === true);
check('CONFIRMING -> LOCKED_UP still allowed', isValid15mStateTransition('CONFIRMING', 'LOCKED_UP') === true);

// 8.4 the seed the frontend actually mounts is a legal starting point.
check('the real seed starts in HYDRATING', seed.currentState === 'HYDRATING');
check('the real seed can advance to WATCH', isValid15mStateTransition(seed.currentState, 'WATCH') === true);

rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
