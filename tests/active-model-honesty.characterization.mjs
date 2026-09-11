// CHARACTERIZATION -- "active model" means calibrated, and model status claims nothing unmeasured.
//
// /api/model-status and /api/signal both hardcoded `let hasActiveModel = true`
// beside their own 500-sample bar. Production reported hasActiveModel true with
// 148 settled rows, so LiveScalpChart / NeuralRibbonChart showed BUY actions and
// model probabilities and ModelStatusBadge a green "Live Model" where their own
// branches say HOLD / UNCALIBRATED and "Collecting data (n/500)". Model status
// also served memoryPersistence "ACTIVE", incrementalTraining "ON" and a
// hardcoded featureContributions list, and /api/signal served eight invented
// algorithmVotes with status PASS.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('active-model-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const route = (anchor) => {
  const i = serverSrc.indexOf(anchor);
  return i < 0 ? '' : serverSrc.slice(i, serverSrc.indexOf('\n});', i));
};
const modelStatus = route('app.get("/api/model-status"');

t.section('hasActiveModel is derived, never asserted');
t.check('no literal `let hasActiveModel = true` anywhere', !/let hasActiveModel = true/.test(code));
t.check('model-status derives it from settled vs minRequired', /let hasActiveModel = settledCount >= MODEL_MIN_REQUIRED;/.test(modelStatus));
t.check('model-status reports the same bar it gates on', /minRequired: MODEL_MIN_REQUIRED,/.test(modelStatus));
t.check('signal route derives it from settled vs 500', /let hasActiveModel = settledCount >= 500;/.test(serverSrc));
{
  const gate = (settled) => settled >= 500;
  t.eq('148 settled -> not active', gate(148), false);
  t.eq('499 settled -> not active', gate(499), false);
  t.eq('500 settled -> active', gate(500), true);
}

t.section('model status claims nothing it does not measure');
t.check('no memoryPersistence "ACTIVE" literal', !/memoryPersistence: "ACTIVE"/.test(code));
t.check('no incrementalTraining "ON" literal', !/incrementalTraining: "ON"/.test(code));
t.check('featureContributions not served from model-status', /featureContributions: null,/.test(modelStatus) && !/featureContributions: serverLearningEngine\.featureContributions/.test(code));

t.section('no invented algorithm votes');
t.check('algorithmVotes is null', /algorithmVotes: null,/.test(serverSrc));
t.check('no "VWAP Floor" pseudo-algorithm', !/algo: "VWAP Floor"/.test(code));
t.check('no "Neural Similarity Engine" pseudo-algorithm', !/algo: "Neural Similarity Engine"/.test(code));

t.done();
