// CHARACTERIZATION -- the candle chart draws and labels only real numbers.
//
// - The RSI pane drew rsiLine.map((r) => r ?? 50): RSI is null until 14 closes
//   exist and linePath skips nulls, so the chart drew a flat RSI 50 line over the
//   warm-up as if measured.
// - latestClose fell back to refSpot, whose last resort is 100. With no candles
//   and no live price the chart labelled itself "$100.0" (price tag, HUD, SPOT)
//   and drew a price line at 100; the crosshair tooltip divided by it.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('candlechart-no-invented-price.characterization');
const src = readRepoFile('src/components/CandleChart.tsx').split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('RSI');
t.check('no RSI 50 fill over the warm-up', !/rsiLine\.map\(\(r\) => r \?\? 50\)/.test(src));
t.check('the RSI path is drawn from real values only', src.includes('d={linePath(rsiLine, yRsi)}'));

t.section('last price');
{
  const m = src.match(/const latestClose = ([^;]+);/);
  t.check('latestClose found', !!m);
  t.check('latestClose never falls back to refSpot', !!m && !m[1].includes('refSpot'));
  const latestClose = new Function('closes', 'currentPrice', `return ${m[1]};`);
  t.eq('no candles, no price: 0 (no data)', latestClose([], 0), 0);
  t.eq('no candles, live price: the live price', latestClose([], 81234.5), 81234.5);
  t.eq('candles: the last close', latestClose([80000, 80100.5], 81234.5), 80100.5);
}
t.check('refSpot still bounds the axis', src.includes('priceMin = Math.min(priceMin, refSpot);'));
t.check('SPOT shows a dash without a price', src.includes("{latestClose > 0 ? `$${latestClose.toFixed(1)}` : '—'}"));
t.check('price tag line only with a real price', src.includes('{latestClose > 0 && (<g>'));
t.check('crosshair delta tooltip only with a real price', src.includes('{latestClose > 0 && (() => {\n            const priceDelta = crosshairPos.price - latestClose;'));
t.check('HUD keeps its no-data label', src.includes(": 'LIVE PRICE FEED'}"));

t.done();
