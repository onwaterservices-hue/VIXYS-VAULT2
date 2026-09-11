// CHARACTERIZATION -- served `features` carry no order-book or 5-minute labels on
// numbers that are neither.
//
// /api/vixy/state and /api/signal served features.orderFlow and
// features.orderBookImbalance as (currentBullVolumePct - 50) * 0.02 -- a value
// computed from spot vs strike, with no order book or trade tape behind it -- and
// features.momentum5m as the interval momentum. The labelled proxy lives in
// btc15mPipeline.orderFlowAnalytics; the per-timeframe votes in
// btc15mPipeline.multiTimeframeAlignment.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('features-no-proxy-labels.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.check('no orderBookImbalance derived from bull volume', !/orderBookImbalance:\s*\n?\s*Math\.round\(\(currentBullVolumePct - 50\)/.test(code));
t.check('no features.orderFlow derived from bull volume', !/orderFlow:\s*\n?\s*Math\.round\(\(currentBullVolumePct - 50\) \* 0\.02/.test(code));
t.check('no momentum5m copied from interval momentum', !/momentum5m: currentMomentum,/.test(code));
t.eq('both payloads null the three fields', (code.match(/orderFlow: null,\s*\n\s*orderBookImbalance: null,\s*\n\s*momentum: currentMomentum,\s*\n\s*momentum5m: null,/g) || []).length, 2);
t.check('the labelled proxy is still served in the pipeline', /orderFlowAnalytics: \{/.test(code));

t.done();
