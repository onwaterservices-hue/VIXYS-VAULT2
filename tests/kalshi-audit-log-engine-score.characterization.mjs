// CHARACTERIZATION -- the Kalshi auto-trade audit log reports the engine score as a score.
//
// The execution engine compares the user's gate against the raw 0-100 engine score, but the
// skip record read "Skipped trade: 96% confidence < 80% threshold" and the settings panel's
// audit list rendered each entry as "BTC UP (96%)".
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('kalshi-audit-log-engine-score.characterization');

t.section('engine skip record');
{
  const eng = readRepoFile('src/services/trading/kalshiExecutionEngine.ts');
  t.check('no percent confidence or threshold text', !/confidence\}%|Threshold\}%|% confidence|% threshold/.test(eng));
  t.check('skip details name the engine score and gate', eng.includes('details: `Skipped trade: engine score ${confidence} / 100 < gate ${userThreshold} / 100`'));
}

t.section('settings panel audit list');
{
  const panel = readRepoFile('src/components/KalshiAutoTradePanel.tsx');
  t.check('audit entries show score N / 100', panel.includes('(score {log.confidence} / 100)') && !panel.includes('({log.confidence}%)'));
}

t.done();
