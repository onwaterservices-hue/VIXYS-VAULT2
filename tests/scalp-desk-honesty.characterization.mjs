// The 15-second desk's order-flow panel must read the live Coinbase book and
// tape. Before this test it showed fixed tiles (+1,420 BTC, 2.41 bids/asks,
// 0.02% cross-venue spread), an invented L2 ladder built from spot +/- offsets,
// and fallback values that invented a price, confidence, edge and direction.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('scalp-desk-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const desk = strip(readRepoFile('src/components/ScalpingDeskView.tsx'));

const fiction = [
  '64160.5',
  '91.6',
  "'14.2'",
  "'BUY_YES'",
  '+1,420 BTC',
  '2.41 Bids',
  '0.02% Spread',
  '42.8 BTC',
  '88.4 BTC',
  '120.1 BTC',
  '14.2 BTC',
  'micro-implied probabilities tightly matched',
  'Bid support strongly clustered',
  'spotPrice - 1.5',
];
for (const f of fiction) {
  t.check(`15s desk has no fabricated value: ${f}`, !desk.includes(f));
}

t.check('15s desk reads the live Coinbase book and tape', desk.includes('useAssetMarketTape(selectedAsset)'));
t.check('book depth is labelled as resting, not taker flow', desk.includes('Resting depth ratio') && desk.includes('not taker flow'));
t.check('large-print flow is scoped honestly', desk.includes('Not total market flow'));
t.check('spread is labelled as single venue', desk.includes('SINGLE VENUE') && desk.includes('no cross-venue spread feed'));
t.check('spot falls back to a dash, never a price', desk.includes('spotPrice !== null'));

t.done();
