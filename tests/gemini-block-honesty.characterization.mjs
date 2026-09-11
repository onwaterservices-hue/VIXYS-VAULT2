// CHARACTERIZATION -- /api/vixy/15m/current's gemini block carries no fixed values.
//
// Served on every tick (12 of 12 production samples, 2026-09-11): bullScore 0,
// bearScore 0, netDirectionalBias 0, signalMomentum "STABLE", latencyMs 0,
// primaryHypothesis "" and counterHypothesis "", protection.lateCycleProtectionActive
// false; reasoning fell back to "Stable live analysis"; evidence factors took
// score || 50, weight || 0.1, aligned ?? true and freshnessSec 0.
import { serverSrc, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('gemini-block-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');
const r = code.indexOf('app.get("/api/vixy/15m/current"');
const route = code.slice(r, code.indexOf('\napp.', r + 10));

t.section('literals are gone from the route');
for (const lit of ['bullScore: 0,', 'bearScore: 0,', 'netDirectionalBias: 0,', 'signalMomentum: "STABLE",', 'latencyMs: 0,', 'primaryHypothesis: "",', 'counterHypothesis: "",', 'lateCycleProtectionActive: false,', '"Stable live analysis"', 'fam.score || 50', 'fam.weight || 0.1', 'fam.agreement ?? true', 'freshnessSec: 0,'])
  t.check(`no ${lit}`, !route.includes(lit));
t.check('signalMomentum is the pipeline momentum classification', route.includes('signalMomentum: latestBtc15mPipeline?.multiTimeframeAlignment?.momentumClassification ?? null,'));

t.section('evidence factors (real code)');
{
  const a = serverSrc.indexOf('      evidenceFactors: (latestBtc15mPipeline?.evidenceFamilies || []).map(');
  const b = serverSrc.indexOf('      ),', a);
  const body = serverSrc.slice(a, b + '      )'.length).replace(/^\s*evidenceFactors:\s*/, '');
  const m = { exports: {} };
  new Function('module', 'exports', transformSync(`module.exports = (latestBtc15mPipeline) => ${body};`, { loader: 'ts', format: 'cjs' }).code)(m, m.exports);
  const [zero, missing] = m.exports({ evidenceFamilies: [
    { name: 'ORDER_FLOW', label: 'Order Flow', bias: 'NEUTRAL', score: 0, weight: 0.12, agreement: false, details: 'x' },
    { name: 'REGIME', label: 'Market Regime', bias: 'UP' },
  ] });
  t.eq('a real 0 score stays 0 (was 50)', zero.score, 0);
  t.eq('a disagreeing family is not aligned', zero.aligned, false);
  t.eq('a missing score is null (was 50)', missing.score, null);
  t.eq('unknown agreement is not aligned (was true)', missing.aligned, false);
  t.eq('a missing weight is null (was 0.1)', missing.weight, null);
  t.eq('no claimed freshness', zero.freshnessSec, null);
}

t.done();
