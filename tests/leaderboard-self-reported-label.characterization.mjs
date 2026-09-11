// CHARACTERIZATION -- journal-derived stats are labelled self-reported, never verified.
//
// The leaderboard is built from serverJournalEntries: trades users type into
// their own journal. Its header card said "Verification Status: SHA-256 HASHED /
// Tamper-evident logs" -- the only hash is of a trader's anonymous ID and nothing
// makes the log tamper-evident or checks it against a venue. /api/performance-stats
// computed a win rate from the same journal entries and served verified: true
// once 30 existed.
import { readRepoFile, serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('leaderboard-self-reported-label.characterization');
const strip = (s) => s.split('\n').map((l) => l.split('//')[0]).join('\n');
const lb = strip(readRepoFile('src/components/LeaderboardView.tsx')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const code = strip(serverSrc);

t.check('the leaderboard reads the journal store', /app\.get\("\/api\/leaderboard"[\s\S]{0,200}serverJournalEntries/.test(code));
t.check('no tamper-evidence claim', !/Tamper-evident/i.test(lb));
t.check('no "Verification Status" / SHA-256 HASHED badge', !lb.includes('Verification Status') && !lb.includes('SHA-256 HASHED'));
t.check('labelled self-reported', lb.includes('SELF-REPORTED') && lb.includes('not venue-verified'));
{
  const i = code.indexOf('app.get("/api/performance-stats"');
  const route = code.slice(i, code.indexOf('app.get(', i + 10));
  t.check('performance-stats never serves verified: true', route.length > 0 && !route.includes('verified: true'));
  t.check('performance-stats names its source', route.includes('source: "SELF_REPORTED_JOURNAL"'));
}

t.done();
