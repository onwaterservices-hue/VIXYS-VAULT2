// CHARACTERIZATION -- mounted web surfaces do not present the engine score as a percentage.
//
// The Historical Accuracy page labelled the raw engine score "Model Confidence NN%"
// (lock card and provenance drawer) and the Prediction Center chart carried an
// "AI CONF NN%" chip. The score is not a probability of being right: across 150
// settled locks (2026-09-11) scores of 80-85 won 52.9% and 85-90 won 61.5%.
// Discord embeds were relabelled the same way in #118.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('web-engine-score-label-honesty.characterization');
const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/[^\n]*/g, '');
const hist = strip(readRepoFile('src/components/HistoricalAccuracy.tsx'));
const chart = strip(readRepoFile('src/components/CandleChart.tsx'));

t.check('Historical Accuracy: no "Model Confidence" label', !hist.includes('Model Confidence'));
t.eq('Historical Accuracy: both cards say Engine Score', (hist.match(/>Engine Score</g) || []).length, 2);
t.check('Historical Accuracy: score shown out of 100, not as %', hist.includes("{conf ? `${conf} / 100` : '—'}") && hist.includes('`${activeProvenance.confidence} / 100`'));
t.check('chart: no "AI CONF" percentage chip', !/AI CONF/.test(chart));
t.check('chart: chip reads ENGINE SCORE out of 100', /ENGINE SCORE \{[^}]+\}\/100/.test(chart));

t.done();
