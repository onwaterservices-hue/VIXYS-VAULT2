// Every surface that shows the lock gate checklist must stop calling it a
// list of blockers once the cycle has locked, skipped or settled. Observed in
// production 2026-09-11 01:36:28: LOCKED_UP, and at the same tick eight gating
// checks read as failing, including "No lock yet this cycle: locked / open".
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('lock-status-surfaces.characterization');

const surfaces = {
  Explainability: readRepoFile('src/components/ExplainabilityVaultView.tsx'),
  ScalpChart: readRepoFile('src/components/ScalpDecisionChart.tsx'),
  Coach: readRepoFile('src/components/AICoachView.tsx'),
  Landing: readRepoFile('src/components/LandingPage.tsx'),
  PredictionCenter: readRepoFile('src/components/CryptoPredictionCenterView.tsx'),
};

for (const [name, src] of Object.entries(surfaces)) {
  t.check(`${name} derives lock status from the shared helper`, src.includes('lockStatusOf(') && src.includes("from '../lib/engineSemantics'"));
  t.check(`${name} states the lock instead of listing blockers`, src.includes('lockStatusSentence('));
}

t.check('Explainability only titles the panel "What still blocks a lock" while open', surfaces.Explainability.includes("cycleOpen ? 'What still blocks a lock' : 'Lock status'"));
t.check('Coach only titles the panel "What is holding the lock back" while open', surfaces.Coach.includes("cycleOpen ? 'What is holding the lock back' : 'Lock status'"));
t.check('Scalp chart gate chip shows the lock once locked', surfaces.ScalpChart.includes('!cycleOpen ? lockStatusWord(lock)'));
t.check('Landing hero shows the lock once locked', surfaces.Landing.includes('!heroCycleOpen ? lockStatusWord(heroLock)'));
t.check('Landing modal never says NOT YET after a lock', surfaces.Landing.includes("heroCycleOpen ? 'NOT YET' : 'NOT MET'"));
t.check('Prediction Center readiness chip shows the lock once locked', surfaces.PredictionCenter.includes('!readinessOpen ? lockStatusWord(readinessLock)'));

t.done();
