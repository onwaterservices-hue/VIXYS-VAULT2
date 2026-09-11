// CHARACTERIZATION -- /api/vixy/15m/current serves the regime the engine classified.
//
// regimeVal was `active15mCycle.isChoppy ? "CHOPPY" : "RANGE_BOUND"`: a two-value
// label that could never report a trend or high volatility. Production served
// RANGE_BOUND on /api/vixy/15m/current while /api/vixy/state served TRENDING_BEAR
// for the same tick (10 of 10 samples, 2026-09-11). The header regime pill, the
// hub view, the workspace Trend/Volatility/Market Regime cards and the scalp chart
// all render this value as "classified by the 15M engine".
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('one-regime-served.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.check('no two-value CHOPPY / RANGE_BOUND label', !/isChoppy \? "CHOPPY" : "RANGE_BOUND"/.test(code));
t.check('15m/current reads the engine tick regime', /const regimeVal = serverLearningEngine\.currentRegime \?\? null;/.test(code));
t.eq('the same value /api/vixy/state serves', (code.match(/regime: serverLearningEngine\.currentRegime,/g) || []).length >= 1, true);
t.check('the tick sets it from the pipeline every tick', /serverLearningEngine\.currentRegime = dynamicRegime;/.test(code));
{
  const i = code.indexOf('const regimeVal = ');
  const route = code.slice(code.lastIndexOf('app.get("/api/vixy/15m/current"', i), i);
  t.check('regimeVal is defined inside /api/vixy/15m/current', route.length > 0 && route.length < 20000);
}
t.eq('both payload regime fields use it', (code.match(/regime: regimeVal,/g) || []).length, 2);

t.done();
