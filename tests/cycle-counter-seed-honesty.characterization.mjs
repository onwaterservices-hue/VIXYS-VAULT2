// CHARACTERIZATION -- the per-process engine tick counter starts at zero.
//
// currentEngineCycleId booted at 287, so a fresh instance reported cycle #287 and
// /api/signal served sequenceNumber / predictionId from 287 upward, as if hundreds
// of cycles had already run on it -- the same 287 as the invented
// "Engine Cycle #287" boot log removed in #99.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('cycle-counter-seed-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.check('counter boots at 0', /^let currentEngineCycleId = 0;$/m.test(code));
t.check('no 287 seed remains', !/currentEngineCycleId = 287/.test(code));
t.check('it only ever increments by 1', (code.match(/currentEngineCycleId \+= 1;/g) || []).length >= 1 && !/currentEngineCycleId = (?!0;)/.test(code));

t.done();
