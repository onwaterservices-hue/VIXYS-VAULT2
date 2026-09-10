// /api/signal/daily-tally — today's record from the real ledger, the way a
// scoreboard should be read. Executes the REAL route handler sliced out of
// server.ts against fixture rows; no reimplementation.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';
const t = createHarness('daily-tally.characterization');

const routeSrc = sliceBetween(serverSrc, 'app.get("/api/signal/daily-tally"', 'app.get("/api/telemetry/history"', 'daily-tally route');

function run(rows, query = {}, lockRule = 'off') {
  let handler = null;
  const app = { get: (_path, fn) => { handler = fn; } };
  new Function('app', 'ensureLedgerFresh', 'persistentSignalLogs', 'VIXY_LOCK_RULE', 'Date', routeSrc)(app, async () => ({}), rows, lockRule, Date);
  let body = null;
  const res = { json: (b) => { body = b; } };
  return handler({ query }, res).then(() => body);
}
const DAY = '2026-09-09';
const lock = (hhmm, dir, won, over = {}) => ({ id: `sig_lock_${hhmm}`, intervalStart: `${DAY}T${hhmm}:00.000Z`, status: 'RESOLVED', direction: dir, wasCorrect: won, targetStrike: 77000, settlementPrice: won === (dir === 'UP') ? 77050 : 76950, ...over });
const skip = (hhmm, over = {}) => ({ id: `sig_skip_${hhmm}`, intervalStart: `${DAY}T${hhmm}:00.000Z`, status: 'NO_TRADE', targetStrike: 77000, settlementPrice: 77050, ...over });
const wl = (side, p = 0.96) => ({ shadowL5: { wouldLock: { side, p, atSec: 660 } } });

t.section('engine tally: graded locks, skips, pending on the requested UTC day');
{
  const rows = [
    lock('14:00', 'UP', true), lock('14:15', 'UP', false), lock('14:30', 'DOWN', true),
    skip('14:45'), skip('15:00'),
    { id: 'sig_lock_1515', intervalStart: `${DAY}T15:15:00.000Z`, status: 'LOCKED', direction: 'UP' },
    lock('16:00', 'UP', true, { exitReason: 'DATA_INVALID_STRIKE' }),   // ungradeable, must not count
    { id: 'mock_1', intervalStart: `${DAY}T16:15:00.000Z`, status: 'RESOLVED', wasCorrect: true }, // demo row, excluded
    lock('09:00', 'UP', true, { intervalStart: '2026-09-08T09:00:00.000Z' }),                     // yesterday, excluded
  ];
  const b = await run(rows, { day: DAY });
  t.eq('day echoed', b.day, DAY);
  t.eq('engine record 2–1', b.engine.record, '2–1');
  t.eq('engine wins', b.engine.wins, 2);
  t.eq('engine losses', b.engine.losses, 1);
  t.eq('engine resolved excludes DATA_INVALID_STRIKE and demo rows', b.engine.resolved, 3);
  t.eq('skips counted', b.engine.skips, 2);
  t.eq('pending counted', b.engine.pending, 1);
  t.eq('engine hit rate', b.engine.hitRatePct, 66.7);
  t.eq('ledger rows on the day (demo excluded)', b.ledgerRows, 7);
  t.eq('a past day has 96 cycles', b.cyclesElapsed, 96);
  t.eq('lockRule echoed', b.lockRule, 'off');
}

t.section('rule shadow tally: would-locks graded only with a settled price and a Kalshi-sourced strike');
{
  const rows = [
    lock('14:00', 'UP', true, wl('UP')),                                   // lock row: gradeable, rule WIN
    lock('14:15', 'UP', false, wl('UP')),                                  // lock row, engine lost, rule also UP -> LOSS
    skip('14:30', { ...wl('DOWN'), strikeSource: 'SHADOW_MERGED', settlementPrice: 76950 }),   // gradeable, rule WIN
    skip('14:45', { ...wl('DOWN'), strikeSource: 'CYCLE_PLACEHOLDER' }),   // placeholder strike -> ungradeable
    skip('15:00', { ...wl('UP') }),                                        // pre-#55 SKIP row, no strikeSource -> ungradeable
    skip('15:15', { ...wl('UP'), strikeSource: 'CYCLE_KALSHI', settlementPrice: null }), // no settlement -> ungradeable
    skip('15:30'),                                                         // rule never fired
  ];
  const b = await run(rows, { day: DAY }, 'strike_side_only');
  t.eq('rule fired count', b.rule.fired, 6);
  t.eq('rule graded count', b.rule.graded, 3);
  t.eq('rule ungradeable count', b.rule.ungradeable, 3);
  t.eq('rule record 2–1', b.rule.record, '2–1');
  t.eq('rule hit rate', b.rule.hitRatePct, 66.7);
  t.eq('rule since = earliest gradeable row', b.rule.since, `${DAY}T14:00:00.000Z`);
  t.eq('lockRule echoed', b.lockRule, 'strike_side_only');
  t.check('note says shadow and gradeable-only', /SHADOW/.test(b.rule.note) && /Kalshi-sourced strike/.test(b.rule.note));
}

t.section('an empty day is 0–0 with null rates, never a seeded number');
{
  const b = await run([], { day: '2026-01-01' });
  t.eq('engine record', b.engine.record, '0–0');
  t.eq('engine hitRatePct null', b.engine.hitRatePct, null);
  t.eq('rule record', b.rule.record, '0–0');
  t.eq('rule hitRatePct null', b.rule.hitRatePct, null);
  t.eq('rule since null', b.rule.since, null);
}

t.section('a malformed day parameter falls back to today');
{
  const b = await run([], { day: 'yesterday' });
  t.eq('day is today (UTC)', b.day, new Date().toISOString().slice(0, 10));
  t.check('cyclesElapsed is within 0..96', b.cyclesElapsed >= 0 && b.cyclesElapsed <= 96);
}

t.section('client plumbing');
const api = (await import('fs')).readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8');
t.check('fetchDailyTallyApi hits /api/signal/daily-tally', api.includes('export async function fetchDailyTallyApi') && api.includes('/api/signal/daily-tally?'));
const pc = (await import('fs')).readFileSync(new URL('../src/components/CryptoPredictionCenterView.tsx', import.meta.url), 'utf8');
t.check('prediction center polls the tally', pc.includes('fetchDailyTallyApi()'));
t.check('chip shows engine record and rule shadow record, server-computed', pc.includes('TODAY · ENGINE {dailyTally.engine.record}') && pc.includes('no graded rows yet'));

t.done();
