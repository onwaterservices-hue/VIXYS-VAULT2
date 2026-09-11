// CHARACTERIZATION -- the public design-system page labels its numbers as samples.
//
// /design-system is reachable without a role and shows metric cards such as
// "BTC SPOT PRICE $64,591.20", "BAYESIAN CONVICTION 78.4%" and "15M LOCK QUALITY
// 88/100 LOCKED". They are component samples; the page now says so.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('design-system-sample-label.characterization');
const src = readRepoFile('src/components/vixyV2/DesignSystemShowcase.tsx');

t.check('header carries a SAMPLE DATA badge', /<V2Badge[^>]*>\s*SAMPLE DATA\s*<\/V2Badge>/.test(src));
t.check('header says no number is live data', src.includes('None of it is live market data or engine output.'));
t.check('(still a style guide) page title unchanged', src.includes('VIXY VAULT 2.0 — DESIGN SYSTEM'));

t.done();
