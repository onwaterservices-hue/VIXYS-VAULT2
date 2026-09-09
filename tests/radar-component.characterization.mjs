// The radar component must draw only from /api/radar and never synthesise.
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('radar-component.characterization');
const src = readRepoFile('src/components/prediction-center/OrderbookHeatmapRadar.tsx');
const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('fetches /api/radar', code.includes("fetch(`/api/radar?asset="));
t.check('no Math.random', !code.includes('Math.random'));
t.check('no sin/cos synthesis', !/Math\.(sin|cos)\(/.test(code));
t.check('no hardcoded latency', !/LATENCY \d+ms/.test(code) && !code.includes('42ms'));
t.check('no hardcoded spread', !code.includes('$0.50 (0.001%)'));
t.check('no invented CALL/PUT skew or max pain', !code.includes('CALL BIAS') && !code.includes('MAX PAIN'));
t.check('no fictional venues/tags', !/Binance|Kraken|Bybit|ICEBERG FILL|WHALE ABSORPTION|BLOCK TAKER/.test(code));
t.check('isUp no longer influences any value', !/isUp\s*\?/.test(code));
t.check('renders an explicit UNAVAILABLE state on failure', code.includes('UNAVAILABLE'));
t.check('taker side comes from the payload', code.includes('p.takerSide'));
t.check('footer reports measured fetch latency and trade age', code.includes('fetch ${data.fetchMs}ms') && code.includes('lastTradeAgeMs'));
t.done();
