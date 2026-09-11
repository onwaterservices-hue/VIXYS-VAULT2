// The Prediction Center's ribbon chart must not claim a live feed it does not
// have. Before this test it switched its badge to "LIVE (FEED)" after a 2.5s
// timeout or a socket error with no data, "LIVE (SIM)" when REST failed, seeded
// its first point from a 64,591.20 fallback price (3,480.5 for ETH), sized the
// ribbon from an invented 0.82 probability, and rendered a HOLD as BUY DOWN.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('ribbon-chart-honesty.characterization');

const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('{/*');
    })
    .join('\n');

const rib = strip(readRepoFile('src/components/NeuralRibbonChart.tsx'));
const pc = strip(readRepoFile('src/components/CryptoPredictionCenterView.tsx'));

t.section('no false live claims');
for (const lit of ["'LIVE (FEED)'", "'LIVE (SIM)'", "'LIVE (REST)'", "'LIVE WS FLOW'", 'setTimeout(']) {
  t.check(`no status literal ${lit}`, !rib.includes(lit));
}
t.check('LIVE is claimed only when a trade arrives', rib.includes("setConnectionStatus('LIVE · BINANCE TRADES')"));
t.check('a dropped socket says so', rib.includes("'TRADE FEED OFFLINE'"));

t.section('no invented prices or probabilities');
for (const lit of ['64591.20', '3480.5', '?? 0.82', 'fetchCryptoTicker', 'Model Confidence Confluence', 'NEURAL RIBBON MATRIX']) {
  t.check(`no fabricated literal "${lit}"`, !rib.includes(lit));
}
t.check('ribbon colour follows price only, not an ungated action', !rib.includes("apiSignal?.action === 'BUY_YES' ||") && !rib.includes("apiSignal?.action === 'BUY_NO' ||"));
t.check('a missing spot is a dash', rib.includes("lastPrice > 0 ?"));

t.section('signal display');
t.check('BUY DOWN requires an explicit BUY_NO', rib.includes("apiSignal?.action === 'BUY_NO' ? ("));
t.check('anything else is shown as no signal', rib.includes('NO SIGNAL · HOLD'));
t.check('signals stay gated on a calibrated model', rib.includes('{hasActiveModel ? ('));

t.section('naming');
t.check('Prediction Center toggle no longer calls it neural', pc.includes('Trade Ribbon') && !pc.includes('Neural Ribbon'));

t.done();
