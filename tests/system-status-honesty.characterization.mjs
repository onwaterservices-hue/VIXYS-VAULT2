// System Status & Changelog must report measured health and real history.
// Before this test it showed six services permanently OPERATIONAL with fixed
// latencies (12ms, 18ms, 24ms, 8ms), a Polymarket CLOB poller VIXY does not
// run, a sample collector frozen at 340 / 500 (68%, "~4 Days", Brier 0.184),
// an "ALL SYSTEMS OPERATIONAL" badge, and release notes dated before the
// repository existed (v2.1.5 on July 14, 2026). Its data helper called a
// route that does not exist and always served an invented fallback.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('system-status-honesty.characterization');

const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('{/*');
    })
    .join('\n');

const raw = readRepoFile('src/components/ChangelogView.tsx');
const cv = strip(raw);
const api = readRepoFile('src/services/api.ts');

t.section('no invented health or history');
for (const lit of [
  "'12ms'",
  "'18ms'",
  "'24ms'",
  "'8ms'",
  '340 / 500',
  "'68%'",
  '~4 Days',
  '0.184',
  'ALL SYSTEMS OPERATIONAL',
  'Polymarket CLOB',
  'wss://stream.binance.com',
  'v3.5.0',
  'v2.1.5',
  'July 14, 2026',
  'August 4, 2026',
  'TikTok',
  '18,425',
  'Neural Ribbon™',
  "status: 'OPERATIONAL'",
]) {
  t.check(`no fabricated literal "${lit}"`, !cv.includes(lit));
}
t.check('the dead system-status helper is gone', !api.includes('fetchSystemStatus') && !api.includes('sampleCollector: { collected: 340'));

t.section('health is read from the engine');
t.check('reads the live engine payload', cv.includes("fetch('/api/vixy/15m/current'"));
t.check('reads the calibration sample', cv.includes("fetch('/api/model-status?asset=BTC&desk=15m'"));
t.check('engine liveness comes from its tick timestamp', cv.includes('engine.engineTickTs') && cv.includes('ENGINE_STALE_MS'));
t.check('venue freshness comes from feedHealth', cv.includes('engine.feedHealth') && cv.includes('venues.kalshi'));
t.check('an endpoint that does not answer is reported', cv.includes("'UNREACHABLE'") && cv.includes('did not answer'));
t.check('sample percentage is computed, not fixed', cv.includes('model.settledCount / model.minRequired'));
t.check('no Polymarket feed is claimed', cv.includes('It has no Polymarket feed.'));

t.section('release timeline is real');
const dates = [...raw.matchAll(/date: '(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]);
t.check('release groups have ISO merge dates', dates.length >= 5);
t.check('no release predates the first merged PR (2026-08-28)', dates.every((d) => d >= '2026-08-28'));
const changes = [...raw.matchAll(/\{ pr: (\d+), category: '([A-Z]+)', text: '/g)];
t.check('every change carries a PR number and category', changes.length >= 20);
t.check('PR numbers are unique', new Set(changes.map((m) => m[1])).size === changes.length);

t.done();
