// The landing page is the first thing a prospective subscriber sees. Its live
// terminal card must show the engine's real state or an honest dash, never a
// fallback price, a fixed confidence, hardcoded venue odds or a fixed grade.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('landing-hero-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const land = strip(readRepoFile('src/components/LandingPage.tsx'));

const fiction = [
  '64250',
  '|| 76',
  '|| 88',
  '?? 524',
  '54¢',
  '>53%<',
  '68.4%',
  '13/14 Passed',
  '+EV DISCREPANCY IDENTIFIED',
  'Sub-Second Spot Feed',
  'VIXY Model Estimated Prob',
  '14-Factor',
  'modelFactors',
  "status: 'PASS'",
];
for (const f of fiction) {
  t.check(`landing hero has no fabricated value: ${f}`, !land.includes(f));
}

t.check('no sub-second claims for data that is polled', !/sub-second/i.test(land));
t.check('hero headline uses the Command Center helper', land.includes('headline(canonical15m)'));
t.check('hero shows nothing unless the feed is live', land.includes("dataHealthStatus === 'LIVE' && heroHeadline.kind !== 'NONE'"));
t.check('Kalshi price only when the server marks the read real', land.includes('m.real === true'));
t.check('gate count comes from the live lock gate checks', land.includes('lockGate?.checks') && land.includes('heroGatesPassing'));
t.check('sparkline is drawn from the real conviction trail', land.includes('convictionTrail') && land.includes('heroTrail.length >= 2'));
t.check('Polymarket is honestly shown as having no feed', land.includes('no feed'));
t.check('calculator inputs are labelled as the visitor’s own', land.includes('Your probability estimate:') && land.includes('Market price (YES):'));

t.done();
