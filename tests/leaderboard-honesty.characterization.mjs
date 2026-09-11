// The leaderboard tells visitors how other traders are doing. It must only
// render what the server compiled from real journal entries.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('leaderboard-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const lb = strip(readRepoFile('src/components/LeaderboardView.tsx'));

const fiction = [
  'QuantumSovereign', 'DeltaHedger99', 'KalshiScalper_X', 'AlphaSeeker_Sol',
  'proton.me', 'crypto.com', 'fund.io',
  '78.6%', '73.8%', '68.4%', '64.7%', '+$1,420.00', '+$2,890.50',
  "'0x7e...'", '0x8f3a912c4b7e5109d3a2',
  'vixy...0@gmail.com',
  'communityTraders',
];
for (const f of fiction) {
  t.check(`leaderboard has no fabricated value: ${f}`, !lb.includes(f));
}

t.check('hash column is labelled for what it is', !lb.includes('Latest SHA-256 Hash') && lb.includes('Trader ID Hash'));
t.check('no unbacked verification claims', !lb.includes('VERIFIED JOURNAL LEADERBOARD') && !lb.includes('verified client-side SHA-256'));
t.check('tabs filter the rendered rows', lb.includes("filterTab === 'MY_LOGS' && !isYouRow(trd)") && lb.includes("filterTab === 'COMMUNITY' && isYouRow(trd)"));
t.check('YOU badge and tabs share one rule', lb.includes('const isUser = isYouRow(trd);'));
t.check('negative PnL renders red', lb.includes("(trd.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'"));
t.check('rows come from the server leaderboard', lb.includes('fetchLeaderboard()'));

t.done();
