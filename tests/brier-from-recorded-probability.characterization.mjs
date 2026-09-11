// CHARACTERIZATION -- Brier scores grade the recorded P(win), not the engine score.
//
// Settlement stored brierScore = (confidence / 100 - outcome)^2. confidence is the
// engine score, which the product itself labels "Engine score N / 100", not a
// probability. On 126 production locks (2026-09-11) that Brier was 0.204, worse
// than always predicting the 74.6% base rate (0.190); the recorded P(win)
// (row.probability) scores 0.184. The same ledger gave different Brier numbers by
// endpoint: calibration-report scored probability, resolved-log and model-status
// averaged the stored score. NO_TRADE rows stored a "perfect" brierScore 0.
// PerformanceLab called |score band - win rate| a calibration error and drew a
// "perfect calibration" line under the engine score.
import { serverSrc, readRepoFile, extractFn, createHarness } from './_engineSource.mjs';

const t = createHarness('brier-from-recorded-probability.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('brierOfRow (real function)');
const brierOfRow = new Function(`${extractFn('brierOfRow', 'function brierOfRow(')}; return brierOfRow;`)();
t.eq('win at p 0.755', brierOfRow({ probability: 0.755, wasCorrect: true }), 0.06);
t.eq('loss at p 0.755', brierOfRow({ probability: 0.755, wasCorrect: false }), 0.57);
t.eq('confidence is ignored', brierOfRow({ probability: 0.755, confidence: 93, wasCorrect: true }), 0.06);
t.eq('no recorded probability -> null', brierOfRow({ confidence: 93, wasCorrect: true }), null);
t.eq('probability as a percent is not a probability -> null', brierOfRow({ probability: 75, wasCorrect: true }), null);
t.eq('ungraded row -> null', brierOfRow({ probability: 0.8 }), null);

t.section('every Brier source uses it');
t.check('settlement', code.includes('prevLog.brierScore = brierOfRow(prevLog);'));
t.check('late settlement', code.includes('row.brierScore = brierOfRow(row);'));
t.check('settled history (model-status, calibration state)', code.includes('brierScore: brierOfRow(item),'));
t.check('resolved-log average scores rows at read time', code.includes('meanBrier(resolved.map((row) => ({ brierScore: brierOfRow(row) })))'));
t.check('settlement summary average scores rows at read time', code.includes('meanBrier(settled.map((row) => ({ brierScore: brierOfRow(row) })))'));
t.check('no Brier from confidence / 100', !/confidence\)?\s*(\|\|\s*0\))?\s*\/\s*100\s*-\s*\(/.test(code));
t.check('no call -> no Brier (NO_TRADE rows)', !/wasCorrect: false,\s*brierScore: 0,/.test(code) && (code.match(/wasCorrect: false,\s*brierScore: null,/g) || []).length === 2);

t.section('PerformanceLab labels the score band comparison honestly');
{
  const lab = readRepoFile('src/components/PerformanceLabView.tsx');
  t.check('no "Calibration Error" tile for score bands', !lab.includes('>Calibration Error<') && lab.includes('Score–Win Gap'));
  t.check('no "perfect calibration" line under the engine score', !lab.includes('perfect calibration') && lab.includes('the score is not a probability'));
  t.check('bands are engine score bands', lab.includes('ENGINE SCORE BAND OUTCOMES') && !lab.includes('{b.bucket} Confidence'));
  t.check('Brier tile names what it scores', lab.includes('of recorded P(win)'));
  t.check('per-row Brier from the recorded P(win)', lab.includes('Math.pow(s.probability - (s.wasCorrect ? 1 : 0), 2)') && !lab.includes('Brier {fmt(s.brierScore, 3)}'));
}


t.section('Learning Center labels the score bands honestly');
{
  const lc = readRepoFile('src/components/VixyLearningCenter.tsx');
  t.check('no "Confidence Calibration" table for score bands', !/CONFIDENCE\s*CALIBRATION\s*<\/h3>/.test(lc) && /ENGINE SCORE\s*BANDS/.test(lc));
  t.check('columns are Avg score and Gap, not Pred and Error', lc.includes('<div>Avg score</div>') && lc.includes('<div>Gap</div>') && !lc.includes('<div>Pred</div>') && !lc.includes('<div>Error</div>'));
  t.check('states the score is not a probability', lc.includes('The score is not a probability.'));
}

t.done();
