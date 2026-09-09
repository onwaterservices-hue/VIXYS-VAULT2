// The whale tracker page and the WhaleBrain card must draw only from the real
// endpoints (/api/whales, /api/radar, /api/vixy/15m/current) and never invent
// a print, an entity, a wall, a sentiment or a timestamp. These pins exist so
// the fabrications removed on 2026-09-09 (fake "institutional block stream",
// $64k-era strike walls, "BlackRock Custody Bridge", hardcoded +$42.1M volume,
// static 89% sentiment, default "-$0.09M SOLD" sweep, "-1m" timestamps,
// "DARK POOL RADAR") can never silently return.
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('whale-components.characterization');

t.section('WhaleTrackerView draws only from real endpoints');
const trackerSrc = readRepoFile('src/components/WhaleTrackerView.tsx');
const tracker = trackerSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('fetches /api/whales', tracker.includes('fetch(`/api/whales?asset='));
t.check('fetches /api/radar for resting depth', tracker.includes('fetch(`/api/radar?asset='));
t.check('fetches the canonical 15M cycle for context', tracker.includes("fetch('/api/vixy/15m/current')"));
t.check('no seeded fake orders', !tracker.includes('INITIAL_WHALE_ORDERS'));
t.check('no static strike walls', !tracker.includes('STRIKE_WALLS'));
t.check('no fake tracked entities', !tracker.includes('TOP_WHALE_ENTITIES') && !/BlackRock|Satoshi Era|Apex Quant|Institutional Volume Cluster|CME Block Router|Solana Foundation/.test(tracker));
t.check('no per-row entity or quant-edge decoration', !tracker.includes('entityName') && !tracker.includes('Quant Edge'));
t.check('no hardcoded volume pad', !tracker.includes('42100000'));
t.check('no static sentiment', !tracker.includes('89%') && !tracker.includes('BULL DEFENSE'));
t.check('no fictional venues or dark-pool claims', !/Polymarket|Derive|Dark Pool|dark pool|BRIDGE LATENCY/i.test(tracker));
t.check('no websocket claim while polling', !tracker.includes('websocket'));
t.check('resting depth never labelled defense', !/defense wall|Defense Wall|DEFENSE WALL/.test(tracker));
t.check('renders explicit venue-unavailable and empty states', tracker.includes('UNAVAILABLE') && tracker.includes('No prints'));
t.check('only assets with a real feed', !/'NVDA'|'SPY'|'TSLA'/.test(tracker));
t.check('timestamps computed from the print, not written by hand', tracker.includes('relTime(order.timestamp)'));

t.section('WhaleBrain has no invented default print');
const brainSrc = readRepoFile('src/components/brains/WhaleBrain.tsx');
const brain = brainSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('fetches /api/whales', brain.includes('fetch(`/api/whales?asset='));
t.check('no default fabricated sweep', !brain.includes('sweep-default') && !brain.includes('-$0.09M'));
t.check('null until a real print arrives', brain.includes('whaleEvents[0] || null'));
t.check('no dark-pool or dark-scan claims', !/DARK POOL|DARK SCANS/i.test(brain));
t.check('no impact-derived confidence', !brain.includes("o.impact === 'CRITICAL'") && !brain.includes('INSTITUTIONAL'));
t.check('size tier passed through from the endpoint', brain.includes('o.sizeTier'));
t.check('timestamp computed, not hardcoded', brain.includes('relTime(latest.timestamp)') && !brain.includes("'-1m'"));
t.check('degraded venue renders as degraded', brain.includes('VENUE DEGRADED') || brain.includes('UNAVAILABLE'));
t.done();
