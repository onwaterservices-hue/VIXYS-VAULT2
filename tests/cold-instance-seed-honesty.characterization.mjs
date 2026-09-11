// CHARACTERIZATION -- boot-time Guardian and lock-evaluation state carries no reading.
//
// latestGuardianDecision and latestLockEvaluation are served to clients
// (/api/vixy/state returns both verbatim; /api/vixy/15m/current passes the lock
// reason into skipReason*) and the lock gate reads the Guardian's reversalThreat.
// They used to boot as a finished, favourable decision: qualified true, direction
// UP, every check passing, Guardian confidence/survival 72 and reversal threat 28
// (which cleared the gate's "< 30%" REVERSAL bar), plus the reason
// "EARLY LOCK ACTIVE ... (+100% Profit Pull Target) -- Locked at 52c".
//
// These tests evaluate the REAL declarations sliced from server.ts.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('cold-instance-seed-honesty.characterization');

const seedSrc = sliceBetween(
  serverSrc,
  'let latestGuardianDecision = {',
  'const rollingBtcTicks = [];',
  'boot seeds',
);
const { latestGuardianDecision: g, latestLockEvaluation: l } = new Function(
  `${seedSrc}; return { latestGuardianDecision, latestLockEvaluation };`,
)();

t.section('Guardian boot state is empty, not favourable');
t.eq('action is WAIT', g.action, 'WAIT');
t.eq('confidence is 0', g.confidence, 0);
t.eq('no side', g.direction, 'NEUTRAL');
t.eq('no reversal threat (gate falls back, never reads an invented 28)', g.reversalThreat, null);
t.eq('no survival score', g.survivalScore, null);
t.eq('no reasons asserted', g.reason.length, 0);
t.eq('no timestamp claimed', g.timestamp, null);

t.section('Lock evaluation boot state is not a lock');
t.eq('not qualified', l.qualified, false);
t.eq('no side', l.direction, 'NEUTRAL');
t.check('no check passes at boot', Object.values(l.checks).every((v) => v === false));
t.eq('no reason string', l.reason, null);
t.eq('no persistence credit', l.persistenceSeconds, 0);
t.eq('not an early lock', l.isEarlyLock, false);
t.eq('no odds window claimed', l.oddsWindow5050, false);

t.section('No fallback object claims a qualified lock');
const fallbacks = serverSrc.match(/lockEvaluation: latestLockEvaluation \|\| \{[^}]*\}/g) || [];
t.check('fallbacks found', fallbacks.length >= 1, `found ${fallbacks.length}`);
t.check('no fallback is qualified: true', fallbacks.every((f) => !/qualified:\s*true/.test(f)));
t.check('no fallback invents a score of 50', fallbacks.every((f) => !/score:\s*50/.test(f)));

t.section('Live lock reason text states rules, not profit claims');
// Strip comments so the explanatory history in server.ts does not count.
const code = serverSrc.replace(/\/\/[^\n]*/g, '');
t.check('no "+100% Profit Pull Target" anywhere in code', !/Profit Pull/.test(code));
t.check('no "EARLY LOCK ACTIVE" reason anywhere in code', !/EARLY LOCK ACTIVE/.test(code));
t.check('early-entry reason names the rule inputs', /Early-entry rule met: Kalshi YES ~\$\{Math\.round\(currentKalshiImpliedProb \* 100\)\}/.test(code));
t.check('persistence reason names the bar in force (early-entry vs standard)',
  /\$\{isEarlyLockOpportunity \? "Early-entry" : "Standard"\} persistence timer in progress/.test(code));
t.check('persistence reason no longer says "Early Lock" unconditionally',
  !/`Early Lock persistence timer in progress/.test(code));

t.section('Unmeasured values are reported as unmeasured');
t.check('lock checks report liquidity as null (not measured)', /liquidity: null,\s*\n\s*spread: null,\s*\n\s*edge: isEdgePass,/.test(serverSrc));
t.check('no-history Brier fallback is null, not 0.168', /: null; \/\/ no settled history -> no Brier score/.test(serverSrc));
t.check('calibration brierScore tolerates null', /brierScore: avgBrier === null \? null : Math\.round\(avgBrier \* 1e3\) \/ 1e3,/.test(serverSrc));
{
  const calSrc = sliceBetween(serverSrc, 'let latestCalibrationState = {', 'let latestGuardianDecision = {', 'calibration seed');
  const cal = new Function(`${calSrc}; return latestCalibrationState;`)();
  t.eq('boot calibration brierScore is null', cal.brierScore, null);
}

t.section('No invented track record when nothing has settled');
{
  const codeOnly = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
  t.check('no 0.168 Brier default left in server.ts code', !/\b0\.168\b/.test(codeOnly));
  t.check('no 71.8% accuracy default left in server.ts code', !/\b71\.8\b/.test(codeOnly));
  t.check('model-status / signal Brier tolerate null',
    (serverSrc.match(/let activeModelBrier = avgBrier === null \? null : Math\.round\(avgBrier \* 1e3\) \/ 1e3;/g) || []).length === 2);
}

t.section('Learning-engine boot counters are real, not invented');
{
  const i = serverSrc.indexOf('const serverLearningEngine = {');
  const block = serverSrc.slice(i, serverSrc.indexOf('\n};', i));
  t.check('lifetimeObservations boots at 0', /lifetimeObservations: 0,/.test(block));
  t.check('todaySettledCount boots at 0 (cannot claim calibration ACTIVE)', /todaySettledCount: 0,/.test(block));
  t.check('historicalAccuracy boots null', /historicalAccuracy: null,/.test(block));
  t.check('currentRegime boots null', /currentRegime: null,/.test(block));
  t.check('ledger hydration sets lifetimeObservations from real rows',
    /serverLearningEngine\.lifetimeObservations = Math\.max\(serverLearningEngine\.lifetimeObservations \|\| 0, total\);/.test(serverSrc));
  const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
  t.check('no 18427 left in code', !/\b18427\b/.test(code));
  t.check('no bullish TRENDING_BULL regime fallback', !/currentRegime \|\| "TRENDING_BULL"/.test(code));
  t.check('no invented 78.4 backtest win rate', !/\b78\.4\b/.test(code));
  t.check('admin stats invent no ops numbers',
    !/avgPredictionLatencyMs: 14,|databaseSizeMb: 12\.4,|serverLoadPct: 18,|apiRequestsToday: engineLogs\.length \* 3,/.test(code));
}

t.done();
