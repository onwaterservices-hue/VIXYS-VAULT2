// The Patterns page must evaluate named rules against live data. Before this
// test it rendered a static catalog of eleven "detected" patterns, each with an
// invented confidence, historical win rate, sighting count and detection age,
// under a "LIVE L2 SCANNER" badge, a fake scan counter and a 64,108 ticker default.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('patterns-honesty.characterization');

const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('{/*');
    })
    .join('\n');

const pat = strip(readRepoFile('src/components/AIPatternEngine.tsx'));
const app = readRepoFile('src/App.tsx');

t.section('no invented pattern statistics');
for (const lit of [
  'Math.random',
  'confidence:',
  'historicalAccuracy',
  'seenCount',
  'detectedAge',
  'scanCount',
  'expectedFollowThrough',
  '64108',
  'LIVE L2 SCANNER',
  '30+',
  'microsecond',
  'Spoofing',
  '$1.2M',
  '12.8 BTC',
  '+$42M',
  '% Conf.',
  'HIST WIN RATE',
]) {
  t.check(`no fabricated literal "${lit}"`, !pat.includes(lit));
}

t.section('rules on live data');
t.check('reads real 1-minute candles', pat.includes('/api/crypto/klines?symbol=') && pat.includes('interval=1m'));
t.check('reads the live Coinbase book and tape', pat.includes('useAssetMarketTape(asset)'));
t.check('a missing source is shown as NO DATA', pat.includes("'NO DATA'") && pat.includes("!bookLive ? 'NO DATA'") && pat.includes("!printsLive ? 'NO DATA'"));
t.check('breakout rules use the last completed candle', pat.includes('candles[n - 2]'));
t.check('book rules are labelled as resting depth, not taker flow', pat.includes('This is not taker flow.'));
t.check('every card says its win rate is not measured', pat.includes('Win rate: not measured'));
t.check('each rule states what it does not tell you', pat.includes('What it does not tell you'));
t.check('filter counts are computed from the rules', pat.includes('countFor(') && !pat.includes('>4</span>'));

t.section('engine evidence families');
t.check('shown only for BTC while the engine is LIVE', pat.includes("isBtc && engineFeedHealth === 'LIVE'"));
t.check('read from the live engine payload', pat.includes('engineDecision?.gemini?.evidenceFactors'));
t.check('agreement is read from the bias, not a defaulted flag', pat.includes("f.direction === 'UP' || f.direction === 'DOWN'") && !pat.includes('f.aligned'));

t.section('wiring');
const mount = app.slice(app.indexOf('<AIPatternEngine'), app.indexOf('/>', app.indexOf('<AIPatternEngine')));
t.check('App passes asset and the live engine to Patterns', mount.includes('asset={selectedAsset}') && mount.includes('engineDecision={canonical15m.decision}') && mount.includes('engineFeedHealth={canonical15m.dataHealthStatus}'));

t.done();
