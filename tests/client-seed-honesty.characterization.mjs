// CHARACTERIZATION -- client-side seeds and fallbacks never render as data.
//
// App.tsx seeded the trade journal with an invented winning trade (LOG-8812,
// +$280, confidence 91, a "+1,420 BTC" rationale) that surfaced on the
// leaderboard as "Your Logged Trades 1", and pulled history/admin seed state
// from src/data/mockData.ts (fake support tickets, a 0.76-weighted WIN/LOSS
// generator). HistoricalAccuracy printed a literal 64,115 for a missing entry
// price and an invented 193s / 707s cycle timer. CandleChart's bar readout
// printed RSI 50 and $0 prices for indicators not computed yet. The Trade
// Journal showed a fixed average implied edge, a made-up hash, a default stake
// and odds for missing fields, a 0.0% win rate for an empty journal, and
// claimed "Server Database Persistent" for entries the server keeps in memory.
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { ROOT, readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('client-seed-honesty.characterization');
const strip = (s) => s.replace(/\/\/[^\n]*/g, '');

const app = strip(readRepoFile('src/App.tsx'));
const ha = strip(readRepoFile('src/components/HistoricalAccuracy.tsx'));
const cc = strip(readRepoFile('src/components/CandleChart.tsx'));
const tj = strip(readRepoFile('src/components/TradeJournalView.tsx'));
const lb = strip(readRepoFile('src/components/LeaderboardView.tsx'));

t.section('journal seed');
t.check('journal state starts empty', app.includes('useState<JournalEntry[]>([])'));
t.check('no invented LOG-8812 trade', !app.includes('LOG-8812'));
t.check('no "+1,420 BTC" rationale', !app.includes('+1,420 BTC') && !app.includes('Easy win'));
t.check('no invented entry/exit prices', !/\b63980\b|\b64120\b/.test(app));

t.section('mockData');
t.check('src/data/mockData.ts is gone', !existsSync(join(ROOT, 'src/data/mockData.ts')));
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const srcFiles = walk(join(ROOT, 'src')).filter((p) => /\.(ts|tsx|js|jsx|mjs)$/.test(p));
const importers = srcFiles.filter((p) => /from\s+['"][^'"]*mockData['"]/.test(strip(readFileSync(p, 'utf8'))));
t.check('nothing under src imports mockData', importers.length === 0, importers.join(', '));
const seedNames = srcFiles.filter((p) => /INITIAL_(HISTORICAL_PREDICTIONS|SUPPORT_TICKETS|ADMIN_STATS)/.test(strip(readFileSync(p, 'utf8'))));
t.check('no mockData seed names under src', seedNames.length === 0, seedNames.join(', '));
t.check('App passes no seed props to the history or admin views',
  !app.includes('history={history}') && !app.includes('stats={adminStats}') && !app.includes('tickets={supportTickets}'));
t.check('no fake support tickets in App', !app.includes('TICK-40') && !app.includes('quantfund'));

t.section('VIXY Locks cards');
t.check("no literal '64,115'", !ha.includes('64,115') && !/\b64115\b/.test(ha));
t.check('no dollar sign in front of a missing-price fallback', !/\$\{entryPrice \?/.test(ha));
const priceFmt = "`$${Number(entryPrice).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}`";
t.check('missing Entry Price renders a bare dash', ha.includes(`{entryPrice ? ${priceFmt} : '—'}`));
t.check('missing NO_TRADE Settlement Price renders a bare dash', ha.includes(`? (entryPrice ? ${priceFmt} : '—')`));
t.check('no invented cycle timer', !/\|\|\s*193\b/.test(ha) && !/\|\|\s*707\b/.test(ha));
t.check('unknown timer renders dashes',
  ha.includes("{elapsedSec !== null ? `${elapsedSec}s` : '—'} elapsed") && ha.includes("{remSec !== null ? `${remSec}s` : '—'} remaining"));
t.check('stage is not derived from an unknown timer', /\} else if \(remSec === null\) \{/.test(ha));

t.section('bar readout');
t.check('no || or ?? fallback on any readout value',
  !/const display(Open|High|Low|Close|Volume|Ema9|Ema21|Vwap|Rsi) = [^\n]*(\|\||\?\?)/.test(cc));
t.check('readout never formats a raw value directly',
  !/display(Open|High|Low|Close|Volume|Ema9|Ema21|Vwap|Rsi)\.toFixed\(/.test(cc));
for (const [fn, v] of [
  ['readoutUsd', 'displayOpen'], ['readoutUsd', 'displayHigh'], ['readoutUsd', 'displayLow'],
  ['readoutUsd', 'displayClose'], ['readoutNum', 'displayVolume'], ['readoutUsd', 'displayEma9'],
  ['readoutUsd', 'displayVwap'], ['readoutNum', 'displayRsi'],
]) {
  t.check(`${v} renders through ${fn}`, cc.includes(`{${fn}(${v})}`));
}
// Execute the shipped helpers rather than trusting their spelling.
const fon = cc.match(/const finiteOrNull = \(v: unknown\): number \| null =>\s*([^;]+);/);
const usd = cc.match(/const readoutUsd = \(v: number \| null\) => (\(.*\));/);
const num = cc.match(/const readoutNum = \(v: number \| null\) => (\(.*\));/);
t.check('readout helpers found', Boolean(fon && usd && num));
if (fon && usd && num) {
  const finiteOrNull = new Function('v', `return ${fon[1]};`);
  const readoutUsd = new Function('v', `return ${usd[1]};`);
  const readoutNum = new Function('v', `return ${num[1]};`);
  t.eq('RSI not computed yet (null) renders a dash', readoutNum(finiteOrNull(null)), '—');
  t.eq('missing bar (undefined) renders a dash', readoutUsd(finiteOrNull(undefined)), '—');
  t.eq('NaN indicator renders a dash', readoutUsd(finiteOrNull(NaN)), '—');
  t.eq('a real RSI passes through', readoutNum(finiteOrNull(63.27)), '63.3');
  t.eq('a real price passes through', readoutUsd(finiteOrNull(64210.44)), '$64210.4');
  t.eq('a genuine zero volume stays 0.0', readoutNum(finiteOrNull(0)), '0.0');
}

t.section('trade journal');
// The view itself was rewritten on main by 2188291 and is pinned in detail by
// tests/journal-honesty.characterization.mjs; these only keep the literals out.
t.check('no fixed average implied edge', !tj.includes('+11.4%'));
t.check('no made-up hash for entries without one', !/0x\$\{idx\}/.test(tj) && !tj.includes('84aef2918'));
t.check('a hash is shown only when the entry has one', tj.includes('{hash && ('));
t.check('no invented stake or odds for missing fields',
  !/Number\(entry\.stakeUSD\)\s*\|\|\s*100/.test(tj) && !/\/ 100 : 0\.5\)/.test(tj) && !/parseFloat\(stakeUSD\) \|\| 100/.test(tj));
t.check("no 'Live' in place of a missing timestamp", !tj.includes(": 'Live'"));
t.check('win rate is a dash when nothing is settled', tj.includes("winRate === null ? '—'"));
t.check('no "Server Database Persistent" claim', !tj.includes('Server Database Persistent'));
t.check('storage comes from the server storageType', tj.includes("storageType === 'IN_MEMORY_NOT_PERSISTED'"));

t.section('leaderboard personal strip');
t.check('personal figures come from the server journal', lb.includes('await fetchJournal()'));
t.check('no App-level journal array', !lb.includes('entries = []') && !/\bentries\.(length|filter|reduce)\b/.test(lb));
t.check('App no longer hands the leaderboard the seed array', !/<LeaderboardView[\s\S]{0,80}entries=/.test(app));
t.check('no unwritten pnl field summed', !/curr\.pnl\b/.test(lb));
t.check("no '0.0' win rate for an empty journal", !lb.includes("'0.0'"));
t.check('pending entries are not counted as losses', !lb.includes('userTotalTrades - userWinningTrades'));
t.check('win rate renders a dash when unknown', lb.includes("{userWinRate !== null ? `${userWinRate}%` : '—'}"));
t.check('net PnL renders a dash when unknown',
  lb.includes("{userTotalPnl !== null ? `$${userTotalPnl >= 0 ? '+' : ''}${userTotalPnl.toFixed(2)}` : '—'}"));
t.check('no "Stored on your device" claim', !lb.includes('Stored on your device'));

t.done();
