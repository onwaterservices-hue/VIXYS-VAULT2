// CHARACTERIZATION -- no training time is served for weights nothing trains.
//
// serverLearningEngine.lastWeightUpdateTs booted at Date.now() - 4e3 and was
// reset on every settlement, then served as a training event:
//   /api/signal, /api/live-engine   modelValidation.trainedAt (ISO) and
//                                   lastWeightUpdate "Ns ago"
//   /api/model-status               activeModelTrainedAt, lastWeightUpdateSecAgo
// No weights exist to update. featureWeights, featureContributions ("Whale
// Liquidity Sweeps", "Institutional Order Flow", all Bullish) and
// incrementalTrainingActive: true were literals nothing trained or read.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('no-weight-training-claim.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const i = serverSrc.indexOf('const serverLearningEngine = {');
const engine = serverSrc.slice(i, serverSrc.indexOf('\n};', i));

t.section('learning engine boot state');
t.check('lastWeightUpdateTs boots null, not 4s in the past', /lastWeightUpdateTs: null,/.test(engine) && !/Date\.now\(\) - 4e3/.test(engine));
t.check('no featureWeights literal', !/featureWeights/.test(code));
t.check('no incrementalTrainingActive flag', !/incrementalTrainingActive/.test(code));
t.check('no invented contribution list', !code.includes('Whale Liquidity Sweeps') && !code.includes('Neural Pattern Similarity'));

t.section('served payloads');
t.eq('activeModelTrainedAt is null on model-status and signal', (code.match(/let activeModelTrainedAt = null;/g) || []).length, 2);
t.check('no training time derived from lastWeightUpdateTs', !/new Date\(\s*serverLearningEngine\.lastWeightUpdateTs,?\s*\)/.test(code));
t.check('lastWeightUpdateSecAgo is null', /lastWeightUpdateSecAgo: null,/.test(code));
t.check('lastWeightUpdate is null, not "Ns ago"', /lastWeightUpdate: null,/.test(code) && !/lastWeightUpdateTs\) \/ 1e3\)\}s ago/.test(code));

t.done();
