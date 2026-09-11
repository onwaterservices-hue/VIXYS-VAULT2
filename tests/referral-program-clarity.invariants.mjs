// RUNTIME INVARIANT TESTS — INVITE TO EARN SHOWS REAL, SERVER-DERIVED TERMS
//
// The owner asked that members see exactly how much they earn per invited
// friend and what share of the friend's plan that is. Every figure must come
// from referralPolicy.ts (the single source of referral economics) and the
// plan prices the live Stripe Payment Links actually charge.
//
// Verified live on 2026-09-11 by opening the Payment Links:
//   Starter $24.00/mo, Pro $79.00/mo, Elite $199.00/mo. The site said Starter
//   was $29 in five places, and the server's Elite monthly link was missing its
//   last character (Stripe: "page could not be found").
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { buildSync } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const R = (p) => readFileSync(join(root, p), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== INVITE TO EARN CLARITY INVARIANTS ===\n');

console.log('[1] Program terms computed from the real policy');
const outDir = join(root, 'node_modules', '.cache', 'vixy-tests');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'referralPolicy.bundle.mjs');
buildSync({ entryPoints: [join(root, 'src/services/referral/referralPolicy.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const P = await import(pathToFileURL(outfile).href + '?t=' + Date.now());
const s = P.referralProgramSummary(20);
const tier = (plan) => s.tiers.find((t) => t.plan === plan);
check('three tiers are published', s.tiers.length === 3);
check('Starter: 580 credits = $5.80 on a $24.00 plan = 24.2%', tier('STARTER').rewardCredits === 580 && tier('STARTER').rewardUsd === '5.80' && tier('STARTER').monthlyPriceCents === 2400 && tier('STARTER').shareOfMonthlyPricePercent === 24.2);
check('Pro: 1580 credits = $15.80 on a $79.00 plan = 20%', tier('PRO_QUANT').rewardCredits === 1580 && tier('PRO_QUANT').rewardUsd === '15.80' && tier('PRO_QUANT').shareOfMonthlyPricePercent === 20);
check('Elite: 3980 credits = $39.80 on a $199.00 plan = 20%', tier('ELITE_QUANT').rewardCredits === 3980 && tier('ELITE_QUANT').rewardUsd === '39.80' && tier('ELITE_QUANT').shareOfMonthlyPricePercent === 20);
check('tier credits are the policy table, not copies', s.tiers.every((t) => ({ STARTER: P.TIER_REWARD_CREDITS.STARTER_MONTHLY, PRO_QUANT: P.TIER_REWARD_CREDITS.PRO_QUANT_MONTHLY, ELITE_QUANT: P.TIER_REWARD_CREDITS.ELITE_QUANT_MONTHLY })[t.plan] === t.rewardCredits));
check('rules come from the policy constants', s.creditsPerFreeDay === P.CREDITS_PER_DAY && s.payoutThresholdCredits === P.PAYOUT_THRESHOLD_CREDITS && s.clawbackHoldDays === P.CLAWBACK_HOLD_DAYS && s.creditExpiryDays === P.CREDIT_EXPIRY_DAYS);
check('annual plans really earn the same credit', s.sameRewardOnAnnualPlans === (P.TIER_REWARD_CREDITS.STARTER_YEARLY === P.TIER_REWARD_CREDITS.STARTER_MONTHLY));
check('day passes earn nothing, as the policy says', s.dayPassEarnsCredit === false && P.rewardCreditsForPlan('DAY_PASS', 999) === 0);
check('credit is capped at the amount paid, as the policy says', s.rewardCappedAtAmountPaid === true && P.rewardCreditsForPlan('ELITE_QUANT_MONTHLY', 1000) === 1000);

console.log('\n[2] Served publicly, read by the page and the banner');
const server = R('server.ts');
check('GET /api/referral/program returns the policy summary', /app\.get\("\/api\/referral\/program"[\s\S]{0,200}referralProgramSummary\(REFERRAL_PROGRAM_DISCOUNT_PERCENT\)/.test(server));
check('the program route reads no identity', !/authenticateSession|req\.(query|body|headers)/.test(server.slice(server.indexOf('app.get("/api/referral/program"'), server.indexOf('app.get("/api/referral/me"'))));
const panel = R('src/components/ReferralPanel.tsx');
check('the Invite to Earn page loads the program terms', /getReferralProgramApi\(\)/.test(panel));
check('the page renders a card per tier from the server', /program\.tiers\.map\(\(t\) =>/.test(panel) && /t\.rewardUsd/.test(panel) && /t\.shareOfMonthlyPricePercent/.test(panel));
check('the page no longer hardcodes a credit amount', !/\b580 credits\b/.test(panel));
const banner = R('src/components/TagTrialPromoBanner.tsx');
check('the banner has an Invite to Earn segment fed by the program endpoint', /aria-label="Invite to Earn"/.test(banner) && /getReferralProgramApi\(\)/.test(banner));
check('the banner hardcodes no dollar amount or percentage', !/\$\d|\d+%|5\.80|39\.80|\b20%/.test(banner.replace(/\$\{[^}]*\}/g, '')));

console.log('\n[3] Prices shown in the UI match what Stripe charges');
const starterMentions = [
  ['src/components/SubscriptionView.tsx', 'Starter ($24/mo)'],
  ['src/components/AdminPanel.tsx', 'STARTER ($24/mo - Beginner Access)'],
  ['src/components/LandingPage.tsx', '$24</strong> and runs for all 30 days.'],
  ['src/components/DayPassUpgradePrompt.tsx', '$24</strong> and runs all 30 days.'],
  ['src/components/TrialExpiredOverlay.tsx', 'The Starter plan is <strong className="text-purple-100 font-mono">$24</strong>'],
];
for (const [f, needle] of starterMentions) check(`${f.split('/').pop()} shows the $24 Starter price`, R(f).includes(needle));
check('no Starter price of $29 remains in the UI (the $29.97 three-pass comparison is not a Starter price)', !/Starter[^\n$]{0,40}\$29(?![.\d])|\$29<\/strong> and (runs|keeps)|STARTER \(\$29/.test(starterMentions.map(([f]) => R(f)).join('\n')));
const subView = R('src/components/SubscriptionView.tsx');
const starterPlan = subView.slice(subView.indexOf("name: 'VIXY Vault Starter'"), subView.indexOf("name: 'VIXY Vault Pro'"));
check('pricing page Starter card: $24 monthly, $19/mo billed annually (Stripe $24.00 / $228.00)', /monthlyPrice: 24,/.test(starterPlan) && /annualPrice: 19,/.test(starterPlan));
check('pricing page Pro and Elite cards match Stripe ($79/$64, $199/$159)', /monthlyPrice: 79,\s*annualPrice: 64,/.test(subView) && /monthlyPrice: 199,\s*annualPrice: 159,/.test(subView));
const landing = R('src/components/LandingPage.tsx');
check('landing Starter card: $19 annual / $24 monthly', landing.includes("${billingInterval === 'annual' ? 19 : 24}"));
check('landing Starter annual total matches Stripe ($228.00/year)', landing.includes("'Billed annually ($228/yr)'") && !landing.includes('$288/yr'));
check('landing Pro and Elite cards match Stripe', landing.includes("${billingInterval === 'annual' ? 64 : 79}") && landing.includes("${billingInterval === 'annual' ? 159 : 199}"));
check('the policy display price matches the Starter price shown ($24)', P.PLAN_MONTHLY_PRICE_CENTS.STARTER === 2400);
check('Pro and Elite display prices match the pricing table', P.PLAN_MONTHLY_PRICE_CENTS.PRO_QUANT === 7900 && P.PLAN_MONTHLY_PRICE_CENTS.ELITE_QUANT === 19900 && R('src/components/SubscriptionView.tsx').includes('Professional ($79/mo)') && R('src/components/SubscriptionView.tsx').includes('Elite Quant ($199/mo)'));

console.log('\n[4] Server and client Payment Links are identical');
const links = R('src/config/stripeLinks.ts');
const clientUrls = [...links.matchAll(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g)].map((m) => m[0]);
const serverBlock = server.slice(server.indexOf('const AUTHORITATIVE_STRIPE_LINKS = {'), server.indexOf('};', server.indexOf('const AUTHORITATIVE_STRIPE_LINKS = {')));
const serverUrls = [...serverBlock.matchAll(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g)].map((m) => m[0]);
check('the server lists six plan links', serverUrls.length === 6);
check('every server plan link exists verbatim in the client config', serverUrls.every((u) => clientUrls.includes(u)), serverUrls.filter((u) => !clientUrls.includes(u)).join(','));
check('the Elite monthly link has its full id', serverBlock.includes('https://buy.stripe.com/cNifZg267gQibh2gjT1oI00"'));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
