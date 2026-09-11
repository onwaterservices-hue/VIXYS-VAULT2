// The landing page is public. Its plan buttons must not send a signed-out
// visitor to /pricing, which shows them only an account-creation wall, while
// the plan cards are already visible further down the landing page itself.
import { readRepoFile, createHarness } from './_engineSource.mjs';
const t = createHarness('landing-plans-cta.characterization');
const src = readRepoFile('src/components/LandingPage.tsx');
t.check('no plan button routes straight to /pricing', !src.includes('onClick={onOpenPricing}'));
t.check('both plan buttons use openPlans', (src.match(/onClick=\{openPlans\}/g) || []).length === 2);
t.check('signed-in visitors still go to /pricing', src.includes('if (authState?.isAuthenticated) {') && src.includes('onOpenPricing();'));
t.check('signed-out visitors scroll to the public plans', src.includes("document.getElementById('landing-plans')"));
t.check('the plans section is the scroll target', src.includes('id="landing-plans"'));
t.done();
