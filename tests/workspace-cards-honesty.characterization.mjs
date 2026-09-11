// CHARACTERIZATION -- the live workspace's reasoning card shows the engine, not a script.
//
// VixyReadModule ("VIXY REASONING SYNTHESIS", badge "NEURAL EVIDENCE MATRIX")
// fell back to a fixed sentence -- "Multi-venue taker flow alignment synchronized
// with 15M cycle policy. Order book imbalance exhibits heavy ask depletion across
// Binance and Coinbase, confirming directional persistence above current strike."
// -- whenever gemini.primaryHypothesis was empty. /api/vixy/15m/current sends it
// empty on every tick (12 of 12 samples, 2026-09-11), so the sentence was always
// shown. No order book or venue depth is read. TrendModule carried a "SUPERTREND"
// badge; no Supertrend is computed.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('workspace-cards-honesty.characterization');
const src = readRepoFile('src/components/vixy-live-workspace/ModuleCards.tsx');
const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/[^\n]*/g, '');
const slice = (start, end) => { const a = code.indexOf(start); return code.slice(a, code.indexOf(end, a + start.length)); };
const read = slice('export const VixyReadModule', 'export const SignalMatrixModule');
const trend = slice('export const TrendModule', 'export const VolumeModule');

t.section('reasoning card');
t.check('card found', read.length > 100);
for (const staged of ['Multi-venue taker flow alignment', 'Order book imbalance', 'heavy ask depletion', 'Binance and Coinbase', 'directional persistence above current strike', 'NEURAL EVIDENCE MATRIX'])
  t.check(`no staged text: ${staged}`, !read.includes(staged));
t.check('falls back to the engine summary the server sends', /gemini\?\.primaryHypothesis \|\|\s*canonical15m\.gemini\?\.reasoning \|\|/.test(read));
t.check('says plainly when there is no summary', read.includes('"No engine summary for this tick."'));

t.section('trend card');
t.check('no Supertrend claim', !trend.includes('SUPERTREND'));
t.check('regime still comes from the payload or is unavailable', trend.includes("'REGIME UNAVAILABLE'"));

t.done();
