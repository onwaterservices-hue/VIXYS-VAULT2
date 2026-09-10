// Surfaces that presented fixed numbers as model output (ENGINE_PROGRESS
// SESSION 8, "FIX ALL THE MODELS"). These pins make the literals impossible
// to reintroduce silently.
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('desk-honesty.characterization');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

t.section('1-hour desk: no model, no invented numbers');
const desk = strip(readRepoFile('src/components/OneHourDeskView.tsx'));
for (const lit of ['+$28.4M', '+2,840', '92.4%', '14.2%', '91.6', '0.118 BRIER', 'yesOdds: 88', 'winProb: 94', 'edge: 18.2', 'kalshiYesCent', 'VWAP Expansion', 'High Absorption', '3/3 PASSED', 'Institutional Whale', 'MAX CONVICTION', 'Consensus Alignment High']) {
  t.check(`no literal "${lit}"`, !desk.includes(lit));
}
for (const comp of ['ScalpDecisionChart', 'NeuralRibbonChart', 'LiveScalpChart', 'AIBrainMemoryVault', 'ModelStatusBadge', 'fetchApiSignal', 'fetchModelStatus', 'fetchPerformanceStats']) {
  t.check(`does not mount/consume ${comp} (no 1H data behind it)`, !desk.includes(comp));
}
t.check('states plainly that no 1H model exists', desk.includes('1H MODEL: NOT BUILT') && desk.includes('There is no 1-hour prediction model in VIXY today'));
t.check('spot comes from the feed with no literal fallback', desk.includes("Number(ticker?.price) || 0") && !desk.includes('64174.83') && !desk.includes('64200'));
t.check('strike cards say P(win) is not measured and there is no 1H contract feed', desk.includes('not measured') && desk.includes('no 1H feed'));
t.check('position sizer is driven by user-typed price and P(win), blank until both are entered', desk.includes('contractPriceCents') && desk.includes('userWinProbPct') && desk.includes('Enter a contract price between 1¢ and 99¢'));
t.check('sizer is labelled as not a model output', desk.includes('NOT A MODEL OUTPUT'));
t.check('hourly countdown is real arithmetic on the clock', desk.includes('3600 - (epochSec % 3600)'));

t.section('Replay Center: real ledger rows, no scripted scenarios');
const rc = strip(readRepoFile('src/components/ReplayCenterView.tsx'));
t.check('no REPLAY_SCENARIOS array', !rc.includes('REPLAY_SCENARIOS'));
for (const lit of ['CYCLE-2026-0482', 'CYCLE-2026-0478', 'Verified WIN +$360.50', 'Audit hash recorded', '+$28.4M', '64450', '3410.00', 'Today • 14:15 UTC']) {
  t.check(`no scripted literal "${lit}"`, !rc.includes(lit));
}
t.check('loads the real ledger', rc.includes("fetch('/api/signal/resolved-log?limit=200'"));
t.check('frames come from recorded facts: rule would-lock, engine lock/skip, settlement', rc.includes("kind: 'RULE'") && rc.includes("kind: 'LOCK'") && rc.includes("kind: 'SKIP'") && rc.includes("kind: 'SETTLE'"));
t.check('missing values are named, never filled', rc.includes("'not recorded'") && rc.includes('The strike was not recorded on this row'));
t.check('the rule\'s would-lock is graded against the recorded settlement, never a strike-0 placeholder', rc.includes('row.targetStrike > 0 ? row.targetStrike : (row.shadowL5?.wouldLock?.strike ?? null)'));
t.check('Kalshi price at the rule fire is shown only when recorded', rc.includes("typeof active.shadowL5?.wouldLock?.kalshiYes === 'number'"));
t.check('header tally is computed from the same rows (engine and rule)', rc.includes('ruleGraded') && rc.includes("rows.filter((r) => r.status === 'RESOLVED')"));

t.section('API client fallbacks do not invent a model');
const api = strip(readRepoFile('src/services/api.ts'));
t.check('fetchModelStatus fallback: no active model, null Brier, 0 observations', api.includes('hasActiveModel: false,\n    activeModelBrier: null,') && !api.includes('settledCount: 148') && !api.includes('lifetimeObservations: 18427') && !api.includes('historicalAccuracy: 71.8'));
t.check('fetchApiSignal fallback: no Kalshi price, no features', api.includes('kalshiImpliedProbability: null,') && api.includes('features: null,') && !api.includes('kalshiImpliedProbability: 0.54') && !api.includes('spot: 64161.4'));
t.check('fetchPerformanceStats fallback stays honest (null win rate, unverified)', api.includes("winRate: null,\n    brierScore: null,\n    sampleSize: 0,\n    verified: false,"));

t.section('badges render absence as absence');
const badge = strip(readRepoFile('src/components/ModelStatusBadge.tsx'));
t.check('ModelStatusBadge shows — for a missing Brier, not 0.168', badge.includes("typeof brier === 'number' ? brier.toFixed(3) : '—'") && !badge.includes("'0.168'"));
const vault = strip(readRepoFile('src/components/AIBrainMemoryVault.tsx'));
t.check('AIBrainMemoryVault: no 148 / 0.182 / 18427 defaults', !vault.includes('?? 148') && !vault.includes('?? 0.182') && !vault.includes('useState<number>(18427)'));

t.done();
