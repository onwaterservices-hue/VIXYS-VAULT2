import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
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

t.section('WhaleBrain was an unmounted card with an invented default print; it is removed');
t.check('src/components/brains/WhaleBrain.tsx no longer exists', !existsSync(join(repoRoot, 'src/components/brains/WhaleBrain.tsx')));

t.done();
