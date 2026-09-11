// CHARACTERIZATION -- the terminal never shows an outcome that has not happened.
//
// 2026-09-11 14:44:51Z, 9s left in the 14:30Z cycle, spot $495 below the strike on
// a DOWN lock (winning): the settlement strip read "14:30 LOSS DOWN 96%" and the
// right rail "DOWN lock settled LOSS just now". resolved-log includes the open
// LOCKED row with no wasCorrect, and both read `r.wasCorrect ? 'WIN' : 'LOSS'`. The
// server settled it WIN at 14:45:00. The same page carried literal SYSTEM ONLINE /
// VIXY ENGINE ACTIVE / TELEMETRY RECORDING tiles, a MARKET FEED "LIVE" beside a
// 24.8s feed age, a client-computed regime with an invented confidence, and
// "autonomous protection" copy for an engine with no early-exit path.
import { transformSync } from 'esbuild';
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('terminal-open-lock-and-status.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('ledgerRowStatus (real helper)');
{
  const { code } = transformSync(readRepoFile('src/utils/ledgerRowStatus.ts'), { loader: 'ts', format: 'cjs' });
  const m = { exports: {} };
  new Function('module', 'exports', code)(m, m.exports);
  const f = m.exports.ledgerRowStatus;
  t.eq('open lock -> OPEN, never LOSS', f({ status: 'LOCKED', decision: 'BUY_DOWN', direction: 'DOWN' }), 'OPEN');
  t.eq('open lock with a stray wasCorrect false -> still OPEN', f({ status: 'LOCKED', wasCorrect: false }), 'OPEN');
  t.eq('settled win', f({ status: 'RESOLVED', wasCorrect: true }), 'WIN');
  t.eq('settled loss', f({ status: 'RESOLVED', wasCorrect: false }), 'LOSS');
  t.eq('settled without a graded outcome -> UNKNOWN, not LOSS', f({ status: 'RESOLVED' }), 'UNKNOWN');
  t.eq('skip row', f({ status: 'NO_TRADE', decision: 'SKIP' }), 'SKIP');
  t.eq('invalid strike -> VOID', f({ status: 'RESOLVED', exitReason: 'DATA_INVALID_STRIKE', wasCorrect: false }), 'VOID');
  t.eq('invalidated mid-cycle, not graded -> OPEN', f({ status: 'CRITICALLY_INVALIDATED' }), 'OPEN');
  t.eq('no row -> UNKNOWN', f(null), 'UNKNOWN');
}

t.section('settlement strip and right rail use it');
const view = strip(readRepoFile('src/components/CryptoPredictionCenterView.tsx'));
const rail = strip(readRepoFile('src/components/vixyV2/ContextualRightRail.tsx')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
t.check('no wasCorrect-or-LOSS labelling in the view', !view.includes("r.wasCorrect ? 'WIN' : 'LOSS'") && view.includes('const st = ledgerRowStatus(r);'));
t.check('the live cycle is not listed twice', view.includes('r.cycleId !== canonicalDecision.cycleId'));
t.check('open rows read PENDING', view.includes("st === 'OPEN' ? 'PENDING'"));
t.check('rail lists only settled WIN / LOSS rows', !rail.includes("r.wasCorrect ? 'WIN' : 'LOSS'") && rail.includes("st === 'WIN' || st === 'LOSS'"));
t.check('rail read time is defined from the payload', rail.includes('const decisionServedAtMs: number | null ='));

t.section('status tiles and regime come from the payload');
t.check('no literal SYSTEM ONLINE / TELEMETRY RECORDING tiles', !/> ONLINE\b/.test(view) && !view.includes('RECORDING</span>'));
t.check('no literal pulsing VIXY ENGINE ACTIVE', !/animate-pulse" \/> ACTIVE/.test(view));
t.check('market feed freshness uses the server gate standard (<10s)', view.includes("age < 10000 ? 'FRESH' : 'STALE'"));
t.check('regime is the served regime, with no client confidence', view.includes('const serverRegimeLabel') && !view.includes('marketRegimeAssessment') && !view.includes('calculateMarketRegime'));
t.check('the client regime classifier is gone', (() => { try { readRepoFile('src/utils/marketRegime.ts'); return false; } catch { return true; } })());

t.section('no autonomy, verification or neural claims');
t.check('no autonomous protection, defense or alert copy', !/[Aa]utonomous (protection|capital|defense|VIXY)/.test(view));
t.check('no whale-sweep, cross-venue execution or benchmark-index claims', !/whale sweeps|Cross-Venue Execution|verified against benchmark/.test(view));
t.check('no neural ribbon', !readRepoFile('src/components/CandleChart.tsx').includes('NEURAL RIBBON'));
t.check('rail has no protection/shield claim', !/VIXY PROTECTION|SHIELD STATUS|STABLE \(0 DIVERGENCE\)/.test(rail));

t.done();
