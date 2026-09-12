// INVARIANTS -- every commercial surface states the refund terms the posted
// policy actually grants.
//
// TrialExpiredOverlay is the paywall a visitor sees at the exact moment they
// choose between another $9.99 day pass and a subscription. Its footer read
// "30-day money-back guarantee on all subscriptions. Cancel anytime in 1 click."
// The posted Refund & Cancellation Policy grants 100% back within 14 days of the
// FIRST subscription purchase, on request by email, with renewals explicitly
// non-refundable; cancelling is three steps through the Stripe Customer Portal.
// Every difference favoured the seller, and a buyer who subscribed on the
// strength of that footer and asked for a refund on day 20 would have been
// refused by the site's own policy.
//
// Both surfaces now read src/config/refundTerms.ts. This test fails if a UI file
// starts stating a window, a guarantee length or a click count of its own again.
import { ROOT, readRepoFile, createHarness } from './_engineSource.mjs';
import { readdirSync } from 'fs';
import { join } from 'path';

const t = createHarness('refund-terms-single-source.invariants');

const CONFIG = 'src/config/refundTerms.ts';
const cfg = readRepoFile(CONFIG);

t.section('the single source exists and is specific');
const windowDays = Number((cfg.match(/windowDays:\s*(\d+)/) || [])[1]);
t.check('refundTerms declares a numeric windowDays', Number.isFinite(windowDays) && windowDays > 0, String(windowDays));
t.eq('the window is the posted 14 days', windowDays, 14);
t.check('it records that the guarantee covers the FIRST purchase, not every renewal',
  /appliesTo:\s*'first subscription purchase'/.test(cfg));
t.check('it records that a refund is requested, not automatic', /requestedBy:\s*'email'/.test(cfg));
t.check('it exports a one-line summary for commercial surfaces', /export const REFUND_GUARANTEE_SUMMARY/.test(cfg));

t.section('the summary promises nothing the policy withholds');
const summaryBlock = cfg.split('REFUND_GUARANTEE_SUMMARY')[1] || '';
t.check('summary is built from windowDays, never a literal', /REFUND_TERMS\.windowDays/.test(summaryBlock));
t.check('summary names the first purchase', /appliesTo/.test(summaryBlock));
t.check('summary names where to cancel', /cancelPath/.test(summaryBlock));
t.check('summary claims no click count', !/\b1 click\b|one[- ]click/i.test(summaryBlock));

t.section('no UI file states refund terms of its own');
function walk(dirRel, out = []) {
  for (const entry of readdirSync(join(ROOT, dirRel), { withFileTypes: true })) {
    const rel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}
const uiFiles = walk('src').filter((f) => f !== CONFIG);
t.check('walked the client source', uiFiles.length > 50, `${uiFiles.length} files`);

// A guarantee length written as a literal anywhere but the config.
const LITERAL_WINDOW = /(\d+)[- ]day(s)?\s+(money[- ]back|refund|guarantee)|money[- ]back\s+guarantee[^.<]{0,40}?(\d+)\s*days?/i;
const CLICK_CLAIM = /cancel[^.<]{0,60}?(\bin \d+ clicks?\b|one[- ]click)/i;
const offenders = [];
const clickOffenders = [];
for (const rel of uiFiles) {
  const src = readRepoFile(rel);
  const m = src.match(LITERAL_WINDOW);
  if (m) offenders.push(`${rel}: ${m[0].trim()}`);
  const c = src.match(CLICK_CLAIM);
  if (c) clickOffenders.push(`${rel}: ${c[0].trim()}`);
}
t.check('no component hardcodes a money-back window', offenders.length === 0, offenders.join(' | '));
t.check('no component claims a number of clicks to cancel', clickOffenders.length === 0, clickOffenders.join(' | '));

t.section('the two surfaces read the same source');
const overlay = readRepoFile('src/components/TrialExpiredOverlay.tsx');
t.check('the paywall imports the shared summary', /from '\.\.\/config\/refundTerms'/.test(overlay));
t.check('the paywall renders it rather than prose', /\{REFUND_GUARANTEE_SUMMARY\}/.test(overlay));
t.check('the paywall no longer promises 30 days', !/30[- ]day/i.test(overlay));
const policy = readRepoFile('src/components/RefundPolicyView.tsx');
t.check('the policy page imports the shared terms', /from '\.\.\/config\/refundTerms'/.test(policy));
t.check('the policy page renders the window from the constant', /\{REFUND_TERMS\.windowDays\}/.test(policy));
t.check('the billing email is not retyped on the policy page',
  !/vixyvault0@gmail\.com/.test(policy));

t.done();
