// The Coach page teaches traders why the engine's number is what it is. It
// must teach from the engine's real state, never from an invented story.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('coach-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*') && !s.startsWith('{/*');
    })
    .join('\n');

const coach = strip(readRepoFile('src/components/AICoachView.tsx'));

for (const f of ['$64,280', '$64,120', '142 BTC', 'CURRENT CAP', '91%', '+14.2%', 'Conf Cap', 'Momentum Deceleration']) {
  t.check(`Coach has no fabricated value: ${f}`, !coach.includes(f));
}
t.check('Coach reads the live engine decision', coach.includes('useCanonical15mDecision'));
t.check('Coach teaches from the live lock gate checks', coach.includes('lockGate?.checks'));
t.check('Coach shows calibrated P(win) with its sample size', coach.includes('calibrated') && coach.includes('n={n'));
t.check('Coach shows nothing when the feed is not live', coach.includes("dataHealthStatus === 'LIVE'"));
t.check(
  'Coach no longer offers strategy profiles that change nothing',
  !coach.includes('AGGRESSIVE') && !coach.includes('INSTITUTIONAL') && !coach.includes('setSelectedStrategy')
);

t.done();
