// CHARACTERIZATION -- the engine names what it is and serves the regime it voted with.
//
// modelVersion was "v4.3-INCREMENTAL" (fallbacks "VIXY_AUTHORITATIVE_NEURAL_v5",
// "VIXY_HIGH_CONVICTION_v5") while /api/model-status served hasActiveModel: false;
// 167 of the last 200 resolved-log rows carried it (2026-09-11). No model is
// trained, incrementally or otherwise.
//
// currentRegime came from a tick-level relabel: any spot 0.04% above the strike
// was "TRENDING_BULL" (production /api/model-status said TRENDING_BULL). That is
// strike position, and it is not the regime the REGIME evidence family voted
// with, which classifies price structure + VWAP + momentum.
//
// Settlement also wrote shadowCalibration onto ledger rows: 0.5 + (p-0.5)*0.88
// times a hand-set regime factor, fit to nothing, stamped with the regime of the
// tick doing the settling rather than the regime at lock.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('engine-identity-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('model version');
t.check('no incremental / neural / high-conviction model labels',
  !/v4\.3-INCREMENTAL|VIXY_AUTHORITATIVE_NEURAL_v5|VIXY_HIGH_CONVICTION_v5/.test(code));
t.check('names the engine gate and the deployed commit',
  code.includes('modelVersion: `VIXY_15M_ENGINE_GATE@${String(process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)}`,'));
t.check('lock rows still stamp lockModelVersion', code.includes('modelVersion: lockModelVersion,'));
t.check('rule-decided locks keep the rule label', code.includes('`STRIKE_SIDE_RULE_${gate.lockRuleTable || "table"}`'));

t.section('one regime: the one the REGIME family voted with');
{
  const decl = code.indexOf('  let dynamicRegime = "RANGING_NEUTRAL";');
  const vote = code.indexOf('    status: dynamicRegime,', decl);
  const ret = code.indexOf('    regime: dynamicRegime,', decl);
  t.check('pipeline returns the regime its REGIME family used', decl > 0 && vote > decl && ret > vote);
  t.check('no function boundary between the vote and the returned regime',
    ret > 0 && !/\n(async )?function /.test(code.slice(decl, ret)));
  t.check('the pipeline seed has regime: null', /evidenceFamilies: \[\],\n\s*regime: null,/.test(code));
}
{
  const m = code.match(/const dynamicRegime = latestBtc15mPipeline\.chopAnalytics\.isChopFiltered[\s\S]*?;/);
  t.check('tick classifier found', !!m);
  const tick = new Function('latestBtc15mPipeline', `${m[0]} return dynamicRegime;`);
  const p = (regime, isChopFiltered = false) => ({ regime, chopAnalytics: { isChopFiltered } });
  t.eq('serves the pipeline regime', tick(p('RANGING_NEUTRAL')), 'RANGING_NEUTRAL');
  t.eq('serves a pipeline trend', tick(p('TRENDING_BEAR')), 'TRENDING_BEAR');
  t.eq('CHOP while the chop filter holds the vote neutral', tick(p('TRENDING_BULL', true)), 'CHOP');
  t.eq('null before the pipeline has classified', tick(p(null)), null);
  t.check('no strike-position trend label', !/moneynessPct > 0\.04|moneynessPct < -0\.04/.test(code));
  t.check('the tick still publishes it', code.includes('serverLearningEngine.currentRegime = dynamicRegime;'));
}
t.check('cross-asset context has no RANGING_NEUTRAL default',
  code.includes('regime: serverLearningEngine.currentRegime ?? null,') && !/currentRegime \|\| "RANGING_NEUTRAL"/.test(code));

t.section('no fixed-formula calibration on ledger rows');
t.check('settlement writes no shadowCalibration', !code.includes('shadowCalibration'));
t.check('no hand-set regime factor', !/regimeFactor/.test(code));

t.done();
