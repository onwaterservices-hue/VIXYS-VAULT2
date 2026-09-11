// Membership dates shown to subscribers must come from the server, never from
// placeholder text. Before this test the pricing page showed relative "30 days"
// strings, a hardcoded calendar date, and a fake card for signed-out visitors,
// and it offered a second day pass to people already holding one.
import { readRepoFile, createHarness } from './_engineSource.mjs';

const t = createHarness('membership-dates-honesty.characterization');

const strip = (src) =>
  src
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith('//') && !s.startsWith('*') && !s.startsWith('/*');
    })
    .join('\n');

const app = strip(readRepoFile('src/App.tsx'));
const sub = strip(readRepoFile('src/components/SubscriptionView.tsx'));
const lib = strip(readRepoFile('src/lib/membershipDates.ts'));

// --- No placeholder dates or cards ---------------------------------------
const banned = [
  '30 days from now',
  '30 days from today',
  '1 year from today',
  'August 27, 2026',
  'Corporate Visa ending in 4242',
  "'24 Hours Pass'",
];
for (const b of banned) {
  t.check(`App has no placeholder: ${b}`, !app.includes(b));
  t.check(`SubscriptionView has no placeholder: ${b}`, !sub.includes(b));
}

// --- Dates are sourced ----------------------------------------------------
t.check('renewal date is derived from currentPeriodEnd', lib.includes('ent.currentPeriodEnd'));
t.check('pass end is derived from dayPass.expiresAt', lib.includes('dp.expiresAt'));
t.check('unknown dates resolve to empty, not a guess', lib.includes("return '';"));
t.check('App restore uses the shared helper', app.includes('describeMembershipWindow(mergedEnt)'));
t.check('pricing refresh uses the shared helper', sub.includes('describeMembershipWindow(ent)'));
t.check(
  'membership window shows a dash rather than "Active" when not active',
  sub.includes("(subscription.status === 'active' ? 'Active' : '—')")
);

// --- A pass holder is sent toward monthly, not toward another pass -------
t.check('pricing page knows when the viewer already holds a pass', sub.includes('holdsActivePass'));
t.check(
  'a pass holder gets the plans comparison as the primary action',
  /\{holdsActivePass \? \(/.test(sub) && sub.includes('onClick={scrollToPlans}')
);
t.check('plan grid is a scroll target', sub.includes('id="vixy-plans"'));
t.check('App hands the live pass record to the pricing page', app.includes('dayPassInfo={dayPassInfo}'));

t.done();
