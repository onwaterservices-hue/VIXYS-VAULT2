// CHARACTERIZATION -- the Pattern Detector shows the engine's real structure reads.
//
// /pattern-engine rendered a static catalog of ten "detected" patterns (Spoofing
// Detection, Whale Accumulation $1.2M+, Hidden Iceberg Limit, Short Squeeze Trap
// ...) with invented confidence, "HIST WIN RATE", "SEEN" counts and ages, under a
// "LIVE L2 SCANNER" header claiming 30+ institutional patterns and a
// "microsecond L2 order book detection engine", plus a scan counter that started
// at 1420 and added 8 per click after a 600ms fake scan.
import { readRepoFile, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('pattern-engine-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const raw = readRepoFile('src/components/AIPatternEngine.tsx');
const view = strip(raw);

t.section('no staged catalog, scanner or statistics');
const fiction = [
  'Spoofing Detection', 'Fake Sell Wall Pulled', 'Bullish Absorption', 'Heavy Buying Support', 'Whale Accumulation', 'Big Whale Buying $1.2M+',
  'Hidden Iceberg Limit', 'Automatic Buy Cushion', 'Short Squeeze Trap', 'Short Sellers Trapped', 'Liquidity Sweep & Reclaim', 'Quick Dip Snapped Back Up',
  'Ask Wall Exhaustion', 'Sellers Out of Fuel', 'Delta Divergence', 'Stealth Accumulation', 'Bearish Exhaustion', 'Selling Slowing Down',
  'VWAP Drift Acceleration', 'Uptrend Riding Average Price', 'Clear Run to $64,500 Strike', '45 BTC ask wall', '12.8 BTC hidden limit', '+$42M',
  'LIVE L2 SCANNER', '30+ institutional patterns', '30+ Patterns Active', 'microsecond L2', 'SCANNING L2', 'RE-SCAN L2',
  'HIST WIN RATE', 'Historical Accuracy Rate', 'Institutional L2 Explanation', 'useState<number>(1420)', 'prev + 8',
  'historicalAccuracy', 'seenCount', 'detectedAge', 'price: 64108',
];
for (const f of fiction) t.check(`no staged value: ${f}`, !view.includes(f));
t.check('no per-card confidence percentage', !/% Conf\./.test(view));

t.section('detections come from the engine');
t.check('reads /api/vixy/state through the existing helper', view.includes('await fetchVixyStateApi()') && view.includes('data.btc15mPipeline'));
t.check('refresh re-fetches instead of faking a scan', view.includes('onClick={load}') && !view.includes('setTimeout('));
t.check('order-flow items are labelled derived', view.includes("derived: true") && view.includes('not from an order book or trade tape'));
t.check('says no per-pattern win rate is recorded', view.includes('no per-pattern win rate is recorded'));
t.check('filter counts are computed, not typed', view.includes('`BULLISH (${count(\'Bullish\')})`'));

t.section('detection rules (real function)');
const start = raw.indexOf('// ---- detection rules ----');
const end = raw.indexOf('// ---- end detection rules ----');
t.check('rule block found', start > 0 && end > start);
const js = transformSync(raw.slice(start, end), { loader: 'ts', format: 'cjs' }).code;
const cjsModule = { exports: {} };
const detect = new Function('module', 'exports', `${js}; return module.exports.detectionsFromPipeline;`)(cjsModule, cjsModule.exports);

t.eq('no pipeline -> no detections', detect(null).length, 0);
// Shape and values as served by production on 2026-09-11.
const live = {
  priceStructure: { highLowStructure: 'RANGE_BOUND', vwap: 77061.5, vwapRelationship: 'AT_VWAP', localSupport: 77061.225, localResistance: 77061.765, breakoutState: 'RANGE_BOUND' },
  orderFlowAnalytics: { absorptionState: 'NEUTRAL', netDeltaBTC: -14.4 },
  chopAnalytics: { chopScore: 40, isChopFiltered: false, directionFlips: 1, reason: null },
  reversalAssessment: { threatScore: 43, threatLevel: 'WARNING', vetoActive: true, primaryTriggers: ['TIMEFRAME_DIVERGENCE'] },
  multiTimeframeAlignment: { tf15m: 'BEARISH', tf5m: 'NEUTRAL', tf1m: 'NEUTRAL', tf30s: 'NEUTRAL', tf15s: 'NEUTRAL', alignedCount: 2, totalCount: 5, state: 'CONFLICT', momentumClassification: 'DECELERATING' },
  volatilityExpectedMove: { realizedVol15mPct: 0.85, volatilityRegime: 'NORMAL' },
};
const ids = detect(live).map((d) => d.id).sort().join(',');
t.eq('live sample -> exactly the rules that fire', ids, 'chop-elevated,mom-decel,mtf-conflict,reversal');
t.check('range-bound, at-average price fires no directional pattern', !detect(live).some((d) => d.category === 'Bullish' || d.category === 'Bearish'));
const up = detect({ priceStructure: { highLowStructure: 'HIGHER_HIGHS', breakoutState: 'BREAKOUT_BULL', vwapRelationship: 'ABOVE_VWAP', vwap: 77000 },
  multiTimeframeAlignment: { tf15s: 'BULLISH', tf30s: 'BULLISH', tf1m: 'BULLISH', tf5m: 'BULLISH', tf15m: 'NEUTRAL', alignedCount: 4, totalCount: 5, state: 'FULL_ALIGNMENT' } });
t.eq('bullish structure -> bullish detections only', up.every((d) => d.category === 'Bullish'), true);
t.eq('bullish structure -> four rules fire', up.length, 4);
const flow = detect({ orderFlowAnalytics: { absorptionState: 'EXHAUSTING' } });
t.eq('flow rule is marked derived', flow[0] && flow[0].derived, true);
t.check('no detection carries a confidence or win rate', [...detect(live), ...up, ...flow].every((d) => !('confidence' in d) && !('historicalAccuracy' in d) && !('seenCount' in d)));

t.done();
