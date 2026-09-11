// CHARACTERIZATION -- the 15-second desk's "Why this signal?" drawer shows real engine state.
//
// AIBrainMemoryVault rendered a hardcoded "FINAL DECISION: BUY UP (91.6%
// CONFIDENCE)" regardless of market state, eight invented engines with fixed
// weights, a timer-cycled "reasoning stream" of fixed sentences, "71.8%
// (Calibrated)", "18,427+ Stored Setups", "Trending Bull Volatility" and an
// observation counter that added +1 every 6 seconds.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('brain-vault-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const raw = readRepoFile('src/components/AIBrainMemoryVault.tsx');
const view = strip(raw);

t.section('no staged decision, engines, reasoning or stats');
const fiction = [
  'FINAL DECISION: BUY UP', '91.6% CONFIDENCE', '8 ENGINES', 'algoVotes',
  "'Order Flow Delta'", "'Neural Pattern Similarity'", "weight: '+0.21'",
  '+1,420 BTC', '$64,280', 'Bollinger band compression', 'PROCESSING LIVE TAKER FLOW',
  '71.8%', '18,427', 'w-[99.8%]', 'Trending Bull Volatility', 'Autosave Active',
  'LIFETIME PERSISTENCE ACTIVE', 'INCREMENTAL LEARNING ON', 'DIGESTING LIVE', 'Never Resets', '+1 / 6s',
];
for (const f of fiction) t.check(`no staged value: ${f}`, !view.includes(f));
t.check('no timer-incremented observation counter', !/prev\s*\+\s*1/.test(view) && !view.includes('setLiveObservations'));
t.check('no timer-cycled reasoning step', !view.includes('reasoningStep'));
t.check('the only interval is the data refresh', (view.match(/setInterval\(/g) || []).length === 1 && view.includes('setInterval(loadStatus, 6000)'));

t.section('what it shows comes from the engine');
t.check('reads model status', view.includes('fetchModelStatus(asset, desk)'));
t.check('reads the live signal', view.includes('fetchApiSignal(asset, desk)'));
t.check('win rate is the settled record, or a dash', view.includes("winRate === null ? '—' : `${winRate.toFixed(1)}%`"));
t.check('regime is the engine read, not a literal', view.includes('humanize(modelStatus?.currentRegime ?? null)'));
t.check('decision is the actual lock or "no lock"', view.includes('`LOCKED ${lockedDirection}`') && view.includes('NO LOCK THIS CYCLE'));
t.check('says there is no separate 15-second model', view.includes('There is no separate 15-second model.'));

t.section('existing desk-honesty contract still holds');
t.check('no 148 / 0.182 / 18427 defaults', !view.includes('?? 148') && !view.includes('?? 0.182') && !view.includes('useState<number>(18427)'));

t.done();
