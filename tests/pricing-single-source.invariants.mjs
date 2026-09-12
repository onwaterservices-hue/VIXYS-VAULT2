// INVARIANTS -- a plan price is written once, in src/config/pricing.ts.
//
// The day pass ($9.99) and the three plans were typed out in ten files. That is
// how the site came to advertise Starter at $29 in five places while Stripe
// charged $24, and how the expiry paywall ended up carrying a comment naming one
// Starter price directly above copy charging another. An admin tier selector
// priced two granted entitlements at $99/mo and $49/mo, amounts nothing charges.
//
// The day-pass-to-monthly comparison is this funnel's one honest persuasion --
// three passes genuinely cost more than a month of Starter -- and it only works
// while every printed number is the number Stripe takes. So the numbers live in
// one file, the comparison sentence is generated from them, and this test fails
// if a component starts printing a plan price of its own again.
//
// It does NOT forbid dollar amounts generally: BTC spot, Kalshi contract prices
// and whale-size thresholds are legitimately written out elsewhere.
import { ROOT, readRepoFile, createHarness } from './_engineSource.mjs';
import { readdirSync } from 'fs';
import { join } from 'path';

const t = createHarness('pricing-single-source.invariants');
const CONFIG = 'src/config/pricing.ts';
const cfg = readRepoFile(CONFIG);

t.section('the config states the live Stripe prices');
const n = (re) => Number((cfg.match(re) || [])[1]);
const dayPass = n(/usd:\s*([\d.]+)/);
const starter = n(/STARTER:\s*\{\s*monthlyUsd:\s*(\d+)/);
const pro = n(/PRO:\s*\{\s*monthlyUsd:\s*(\d+)/);
const elite = n(/ELITE:\s*\{\s*monthlyUsd:\s*(\d+)/);
t.eq('day pass', dayPass, 9.99);
t.eq('Starter monthly', starter, 24);
t.eq('Pro monthly', pro, 79);
t.eq('Elite monthly', elite, 199);
t.check('the comparison sentence is generated, not typed',
  /export const PASS_VS_STARTER = `/.test(cfg) && /\$\{THREE_PASSES\}/.test(cfg) && /\$\{STARTER_MONTHLY\}/.test(cfg));
t.check('the comparison it makes is actually true',
  Math.round(3 * dayPass * 100) / 100 > starter,
  `3 x ${dayPass} vs ${starter}`);

t.section('no other file prints a plan price');
function walk(dirRel, out = []) {
  for (const e of readdirSync(join(ROOT, dirRel), { withFileTypes: true })) {
    const rel = `${dirRel}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}
const files = walk('src').filter((f) => f !== CONFIG);
t.check('walked the client source', files.length > 50, `${files.length} files`);

// Comment lines are excluded: several record what a price used to be, which is
// history worth keeping and is never rendered.
const stripComments = (src) =>
  src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*|\*\/)/.test(l)).join('\n');

// The day-pass amounts are unique enough to forbid outright.
const DAY_PASS_LITERALS = /\$9\.99|\$29\.97/;
// Any other price must not be written next to a billing period.
const PERIOD_PRICE = /\$[\d,]+(\.\d+)?\s*\/\s*(mo|month|yr|year)|\$[\d,]+(\.\d+)?\/(mo|month|yr|year)\b/i;

const dayPassOffenders = [];
const periodOffenders = [];
for (const rel of files) {
  const src = stripComments(readRepoFile(rel));
  const a = src.match(DAY_PASS_LITERALS);
  if (a) dayPassOffenders.push(`${rel}: ${a[0]}`);
  const b = src.match(PERIOD_PRICE);
  if (b) periodOffenders.push(`${rel}: ${b[0]}`);
}
t.check('no file writes the day pass or three-pass amount', dayPassOffenders.length === 0, dayPassOffenders.join(' | '));
t.check('no file writes a price against a billing period', periodOffenders.length === 0, periodOffenders.join(' | '));

t.section('the commercial surfaces read the config');
const surfaces = [
  'src/App.tsx',
  'src/components/LandingPage.tsx',
  'src/components/SubscriptionView.tsx',
  'src/components/TrialExpiredOverlay.tsx',
  'src/components/DayPassUpgradePrompt.tsx',
  'src/components/Header.tsx',
  'src/components/AuthModal.tsx',
  'src/components/AuthView.tsx',
  'src/components/TermsView.tsx',
  'src/components/AdminPanel.tsx',
];
for (const rel of surfaces) {
  t.check(`${rel.split('/').pop()} imports the pricing config`,
    /from '\.\.?\/config\/pricing'/.test(readRepoFile(rel)));
}
t.check('the referral policy derives its cents from the same config, not a copy',
  /PRICING\.plans\.STARTER\.monthlyUsd \* 100/.test(readRepoFile('src/services/referral/referralPolicy.ts')));

t.done();
