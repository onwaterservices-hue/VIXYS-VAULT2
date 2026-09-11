// CHARACTERIZATION -- the terminal's strike-cushion / reversal-gate panel and the
// what-if price panel show only real arithmetic, real engine fields, or the
// user's own input.
//
// AutonomousExecutionGuard showed a "SHA-256 HASH" that was fixed hex wrapped
// around the spot price, a "CRYPTOGRAPHIC PROOF-OF-SIGNAL" modal for a commitment
// the server never makes, a literal "ACTIVE" reversal breaker with an invented
// 25% ceiling (the real lock gate is <30% & no veto), and Kelly sizing that used
// the engine score as a win probability at invented 1.85 odds.
// ScenarioSimulatorMatrix rescaled conviction / lock quality / reversal risk with
// made-up coefficients for hypothetical prices, hardcoded scenario win
// probabilities, and fed the engine score into an EV calculator as P(win).
import { transformSync } from 'esbuild';
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('terminal-guard-scenario-honesty.characterization');

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');
const guardRaw = readRepoFile('src/components/prediction-center/AutonomousExecutionGuard.tsx');
const simRaw = readRepoFile('src/components/prediction-center/ScenarioSimulatorMatrix.tsx');
const guard = strip(guardRaw);
const sim = strip(simRaw);
const view = strip(readRepoFile('src/components/CryptoPredictionCenterView.tsx'));

// Slice a module-level `function name(...) {...}` (or `const name = ...;`) out of a
// component and evaluate it, so the test runs the shipped helper, not a copy.
function sliceFn(src, name) {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`${name} not found`);
  if (src.indexOf(`function ${name}(`, i + 1) >= 0) throw new Error(`${name} appears more than once`);
  const j = src.indexOf('\n}\n', i);
  return src.slice(i, j + 2);
}
function load(src, names, prelude = '') {
  const body = `${prelude}\n${names.map((n) => sliceFn(src, n)).join('\n')}\nmodule.exports = { ${names.join(', ')} };`;
  const m = { exports: {} };
  new Function('module', transformSync(body, { loader: 'ts', format: 'cjs' }).code)(m);
  return m.exports;
}

t.section('guard: no fake cryptographic proof');
t.check('no fixed-hex "hash" (0x9f4a8b7c2e1d03)', !guardRaw.includes('0x9f4a8b7c2e1d03'));
t.check('no PROOF-OF-SIGNAL / PROOF OF SIGNAL', !/PROOF[- ]OF[- ]SIGNAL/i.test(guardRaw));
t.check('no "cryptographically timestamped" claim', !guardRaw.includes('cryptographically timestamped'));
t.check('no SHA-256 label, COPY HASH button or cycleHash', !guard.includes('SHA-256') && !guard.includes('COPY HASH') && !guard.includes('cycleHash'));
t.check('header no longer claims autonomous execution', !guard.includes('AUTONOMOUS EXECUTION') && !guard.includes('SENTINEL DEFENSE'));

t.section('guard: reversal card is the real lock gate');
t.check('no "25% CEILING"', !guardRaw.includes('25% CEILING') && !guardRaw.includes('25% safety ceiling'));
t.check('no literal ACTIVE status', !/>\s*ACTIVE\s*</.test(guard) && !/['"`]ACTIVE['"`]/.test(guard));
t.check('no "defending capital" claim', !/defending capital/i.test(guardRaw));
const serverReq = serverSrc.match(/id: "REVERSAL",[^\n]*required: "<(\d+)% & no veto"/);
const panelGate = guard.match(/const REVERSAL_LOCK_GATE_MAX = (\d+);/);
t.check('server REVERSAL check found', Boolean(serverReq));
t.check('panel gate constant found', Boolean(panelGate));
if (serverReq && panelGate) t.eq('panel gate number equals server required "<N%"', Number(panelGate[1]), Number(serverReq[1]));
t.check('panel uses the server REVERSAL check row for pass/fail (includes the veto)', guard.includes('reversalGateCheck.pass') && view.includes("lockChecks.find((c) => c.id === 'REVERSAL')"));

const g = load(guardRaw, ['strikeCushion', 'reversalGateReading'], 'const REVERSAL_LOCK_GATE_MAX = Number(' + (panelGate ? panelGate[1] : 'NaN') + ');');
t.eq('reversal 29 is under the gate', g.reversalGateReading(29).underLimit, true);
t.eq('reversal 30 fails the gate', g.reversalGateReading(30).underLimit, false);
t.eq('reversal null -> null (renders —)', g.reversalGateReading(null), null);
t.eq('reversal NaN -> null (renders —)', g.reversalGateReading(NaN), null);
t.eq('reversal Infinity -> null (renders —)', g.reversalGateReading(Infinity), null);
t.check('missing reversal renders a dash', guard.includes("reversal === null ? '—'"));

t.section('guard: no Kelly / invented-odds sizing');
t.check('no Kelly', !/kelly/i.test(guard));
t.check('no 1.85 odds', !guard.includes('1.85'));
t.check('no bankroll / recommended size', !/bankroll|recommendedSize/i.test(guard));
t.check('guard does not receive or read conviction', !/conviction/i.test(guard));

t.section('guard: strike cushion is real, and a dash without prices');
t.check('no Math.max(1, strike) stand-in divisor', !guard.includes('Math.max(1, strikePrice)'));
const c = g.strikeCushion(100500, 100000);
t.eq('cushion $ = spot - strike', c.dollar, 500);
t.eq('cushion % = (spot - strike) / strike', c.pct, 0.5);
t.eq('strike 0 -> null', g.strikeCushion(100500, 0), null);
t.eq('spot 0 -> null', g.strikeCushion(0, 100000), null);
t.eq('strike NaN -> null', g.strikeCushion(100500, NaN), null);

t.section('simulator: no invented engine response to hypothetical prices');
t.check('no simulated conviction / lock quality / reversal', !/simConviction|simLockQuality|simReversalRisk|SIM CONVICTION|SIM LOCK QUALITY|SIM REVERSAL/.test(sim));
t.check('no coefficient scaling of the offset (* 12/14/18/30/35/40)', !/simulatedOffsetPct \* (12|14|18|30|35|40)\b/.test(sim) && !/offset\w* ?\* ?(12|14|18|30|35|40)\b/i.test(sim));
t.check('no invented caps/floors (96/98/88, 35/25/5)', !/Math\.(min|max)\((96|98|88|35|25|5),/.test(sim));
t.check('no base engine props (baseConviction / baseLockQuality / baseReversalRisk)', !/baseConviction|baseLockQuality|baseReversalRisk/.test(sim) && !/baseConviction|baseLockQuality|baseReversalRisk/.test(view));
t.check('no hardcoded scenario winProb', !/winProb:\s*isUp \?/.test(sim) && !/winProb/.test(sim));
t.check('no invented scenario narratives', !/BULL ACCELERATION|PIN CONVERGENCE|BEAR SWEEP|PULLBACK TEST|STEADY CONTRACTION|PROBABILITY SPECTRUM/.test(sim));
t.check('simulator does not read conviction / confidence at all', !/conviction|confidence/i.test(sim));

t.section('simulator: break-even is cost/payout; EV only from the user estimate');
t.check('no winProbDecimal from the engine', !sim.includes('winProbDecimal'));
t.check('user estimate input starts empty', /useState<string>\(''\)/.test(sim) && sim.includes('placeholder="your estimate"'));
t.check('EV labelled as the user estimate', sim.includes('EV per contract (your estimate)') && sim.includes('RETURN ON RISK · YOUR ESTIMATE'));
t.check('EV is computed from the user input', sim.includes('expectedValueFromUserEstimate(parseNum(userWinPctInput)'));
t.check('EV helper takes no engine input', /function expectedValueFromUserEstimate\(userWinPct: number \| null, cost: number, payout: number\)/.test(sim));

const s = load(simRaw, ['settlingSideAt', 'breakEvenWinProbability', 'expectedValueFromUserEstimate'], "const validPrice = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;");
t.eq('break-even $55 / $100 = 0.55', s.breakEvenWinProbability(55, 100), 0.55);
t.eq('break-even $30 / $50 = 0.6', s.breakEvenWinProbability(30, 50), 0.6);
t.eq('break-even with payout 0 -> null', s.breakEvenWinProbability(55, 0), null);
t.eq('EV with no user estimate -> null', s.expectedValueFromUserEstimate(null, 55, 100), null);
t.eq('EV with estimate out of range -> null', s.expectedValueFromUserEstimate(120, 55, 100), null);
const ev60 = s.expectedValueFromUserEstimate(60, 55, 100);
t.check('EV at 60% = 0.6*100 - 55 = +5', Math.abs(ev60.ev - 5) < 1e-9, JSON.stringify(ev60));
t.check('ROI at 60% = 5/55', Math.abs(ev60.roiPct - (5 / 55) * 100) < 1e-9, JSON.stringify(ev60));
t.check('EV at the break-even rate is 0', Math.abs(s.expectedValueFromUserEstimate(55, 55, 100).ev) < 1e-9);

t.section('simulator: which side settles in the money matches the server rule');
t.check('server settles UP at settlementPrice >= strike', /settlementPrice >= strike \? "UP" : "DOWN"/.test(serverSrc));
t.eq('price above strike -> UP', s.settlingSideAt(100001, 100000), 'UP');
t.eq('price at strike -> UP (>=)', s.settlingSideAt(100000, 100000), 'UP');
t.eq('price below strike -> DOWN', s.settlingSideAt(99999, 100000), 'DOWN');
t.eq('missing strike -> null', s.settlingSideAt(100000, 0), null);

t.section('mount site');
t.check('guard no longer receives conviction / isActuallyLocked / isUp', !/<AutonomousExecutionGuard[\s\S]*?(conviction=|isActuallyLocked=|isUp=)[\s\S]*?\/>/.test(view.slice(view.indexOf('<AutonomousExecutionGuard'), view.indexOf('/>', view.indexOf('<AutonomousExecutionGuard')) + 2)));
t.check('guard reversal risk read off the payload, not the seeded displayReversalRisk', /reversalRisk=\{typeof canonicalDecision\?\.reversalRisk === 'number' && Number\.isFinite\(canonicalDecision\.reversalRisk\) \? canonicalDecision\.reversalRisk : null\}/.test(view));


t.section('terminal view around the panels');
{
  const v = readRepoFile('src/components/CryptoPredictionCenterView.tsx').split('\n').map((l) => l.split('//')[0]).join('\n');
  t.check('reversal risk is not seeded with 28', !v.includes('useState<number>(28)') && v.includes('const [displayReversalRisk, setDisplayReversalRisk] = useState<number | null>(null);'));
  t.check('reversal risk clears when the payload has none', v.includes("setDisplayReversalRisk(typeof canonicalDecision.reversalRisk === 'number' ? canonicalDecision.reversalRisk : null);"));
  t.check('reversal card shows dashes and no tier while unknown', v.includes('const riskKnown = displayReversalRisk !== null;') && v.includes("{riskKnown ? `${riskAssessment.score}%` : '—'}"));
  t.check('early lock follows the server gate rows, not client thresholds', v.includes('const isEarlyLockQualified = gatesTotal > 0 && gatesPassing === gatesTotal;') && !v.includes('displayReversalRisk <= 25'));
  t.check('no UP default for a missing direction', !v.includes("direction || 'UP'") && v.includes("isDown ? 'DOWN' : '—'"));
  t.check('skip modal lists the real failing gates', v.includes('const failing = gateRows.filter((c) => !c.pass);') && v.includes('(needs {c.required})'));
  t.check('skip modal has no invented blocker, order-flow story, 25% cap or factor count',
    !/Cross-Venue Dispersion|Binance spot taker volume|Max allowed: 25%|3 of 6 factors aligned|Capital Protection Guarantee/.test(v));
  t.check('skip modal reversal requirement comes from the gate row', v.includes("reversalRow?.required ?? '—'"));
}

t.done();
