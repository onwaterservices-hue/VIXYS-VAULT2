// The Trade Journal must show only what the trader logged. Before this test the
// page showed a fixed "+11.4%" average edge, sent a made-up 10.5% edge and a
// hardcoded owner id with every entry, pre-filled a winning trade, invented a
// fallback fingerprint, and claimed "Server Database Persistent" and logs
// "verified across Kalshi, Polymarket & Binance order flow" while the server
// held entries in memory. The server filled a missing entry price with 64,000,
// target 64,120, stop 63,900, stake 1,000 and edge 7.4.
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('journal-honesty.characterization');
const view = readRepoFile('src/components/TradeJournalView.tsx');
const api = readRepoFile('src/services/api.ts');
const route = (anchor) => {
  const i = serverSrc.indexOf(anchor);
  return i < 0 ? '' : serverSrc.slice(i, serverSrc.indexOf('\n});', i));
};
const jGet = route('app.get("/api/journal",');
const jPost = route('app.post("/api/journal",');

t.section('journal page');
for (const lit of ['+11.4%', 'usr_owner_01', 'edgeAtEntry: 10.5', '84aef2918', 'Server Database Persistent', 'Polymarket', "useState('0.92')", "useState('0.52')", "useState('500')", 'Cryptographically verified', 'VERIFIED TRADE LOGS', '|| 100']) {
  t.check(`no fabricated literal "${lit}"`, !view.includes(lit));
}
t.check('storage is reported from the server', view.includes("storageType === 'IN_MEMORY_NOT_PERSISTED'") && view.includes('Entries are held in server memory'));
t.check('win rate is settled entries only', view.includes("e?.outcome === 'WIN' || e?.outcome === 'LOSS'"));
t.check('form inputs start empty and are validated', view.includes("useState('')") && view.includes('Entry price must be between 0.01 and 0.99.'));
t.check('a rejected save is shown, including sign-in', view.includes('Sign in to log trades.'));
t.check('fingerprint only when the entry has one', view.includes("typeof entry?.entryHash === 'string' && entry.entryHash ? entry.entryHash : null"));

t.section('client helper');
t.check('no owner id sent', !/fetchJournal\(userId/.test(api) && api.includes("safeFetchJson<any>('/api/journal')"));

t.section('server routes');
t.check('create route found', jPost.length > 100);
for (const lit of ['entryPrice = 64e3', 'targetPrice = 64120', 'stopLoss = 63900', 'stake = 1e3', 'edgeAtEntry = 7.4']) {
  t.check(`create route has no default "${lit}"`, !jPost.includes(lit));
}
t.check('create route rejects incomplete entries', jPost.includes('res.status(400)') && jPost.includes('INVALID_ENTRY'));
t.check('average edge ignores entries without one', jGet.includes('const edgeRows = userEntries.filter('));

t.done();
