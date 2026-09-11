// Sign-in, access and About surfaces are where a visitor decides whether to
// trust VIXY. They must not invent traction, accuracy, speed or venues.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('access-surfaces-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const files = {
  AuthView: strip(readRepoFile('src/components/AuthView.tsx')),
  AuthModal: strip(readRepoFile('src/components/AuthModal.tsx')),
  TrialExpiredOverlay: strip(readRepoFile('src/components/TrialExpiredOverlay.tsx')),
  KalshiAutoTradePanel: strip(readRepoFile('src/components/KalshiAutoTradePanel.tsx')),
  AboutView: strip(readRepoFile('src/components/AboutView.tsx')),
};

for (const [name, src] of Object.entries(files)) {
  t.check(`${name} makes no sub-second claim`, !/sub-second/i.test(src));
  for (const f of ['2,400', '91.4%', '10,000+', 'Valhalla', 'Pre-Spike', '5-10s before', 'Telegram', 'Arbitrage Radar']) {
    t.check(`${name} has no fabricated claim: ${f}`, !src.includes(f));
  }
}

const about = files.AboutView;
for (const f of ['18,000', 'under 15ms', 'Cloud Run', 'Kelly Criterion', 'Polymarket', 'DraftKings', 'sub-minute', '1-hour prediction']) {
  t.check(`About has no fabricated claim: ${f}`, !about.includes(f));
}

const record = strip(readRepoFile('src/components/LiveTrackRecord.tsx'));
t.check('track record reads the real ledger stats', record.includes('fetchResolvedLogApi') && record.includes('stats?.perAsset?.BTC'));
t.check('track record shows no number when the ledger cannot be read', record.includes('Every lock and its graded outcome is published in VIXY Locks.'));
t.check('sign-in page renders the live track record', files.AuthView.includes('<LiveTrackRecord />'));

t.done();
