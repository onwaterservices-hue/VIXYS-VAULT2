/**
 * VIXY VAULT - Invite to Earn invariant tests.
 * Pure-function tests: no Firestore, no network, safe to run anywhere.
 * Run: node tests/referral_invariants.mjs
 */
import {
  rewardCreditsForPlan, CREDITS_PER_DAY, PAYOUT_THRESHOLD_CREDITS,
  RESERVED_CODES, creditsToUsd, daysAffordable,
} from "../src/services/referral/referralPolicy.ts";

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name + "  expected=" + expected + " actual=" + actual); }
}

console.log("\n== Reward economics ==");
check("Starter monthly earns 580", rewardCreditsForPlan("STARTER_MONTHLY", 2900), 580);
check("Starter yearly earns same as monthly", rewardCreditsForPlan("STARTER_YEARLY", 29000), 580);
check("Pro earns 1580", rewardCreditsForPlan("PRO_QUANT_MONTHLY", 7900), 1580);
check("Elite earns 3980", rewardCreditsForPlan("ELITE_QUANT_MONTHLY", 19900), 3980);
check("Elite yearly earns same as monthly", rewardCreditsForPlan("ELITE_QUANT_YEARLY", 199000), 3980);

console.log("\n== The 100%-off coupon hole (MODS, MESSUP) ==");
check("zero payment earns nothing", rewardCreditsForPlan("ELITE_QUANT_MONTHLY", 0), 0);
check("null payment earns nothing", rewardCreditsForPlan("ELITE_QUANT_MONTHLY", null), 0);
check("undefined payment earns nothing", rewardCreditsForPlan("PRO_QUANT_MONTHLY", undefined), 0);
check("reward never exceeds amount collected", rewardCreditsForPlan("ELITE_QUANT_MONTHLY", 300), 300);

console.log("\n== Non-qualifying plans ==");
check("day pass earns nothing", rewardCreditsForPlan("DAY_PASS", 999), 0);
check("unknown plan earns nothing", rewardCreditsForPlan("MYSTERY_TIER", 5000), 0);
check("empty plan earns nothing", rewardCreditsForPlan("", 5000), 0);

console.log("\n== Redemption pegging ==");
check("day costs 999 (pegged to $9.99 Day Pass)", CREDITS_PER_DAY, 999);
check("payout threshold is 2500", PAYOUT_THRESHOLD_CREDITS, 2500);
check("Elite conversion affords 3 days", daysAffordable(3980), 3);
check("Starter conversion affords 0 days", daysAffordable(580), 0);
check("credits render as dollars", creditsToUsd(3980), "39.80");

console.log("\n== Reserved codes ==");
check("DIRECT is reserved (admin form default)", RESERVED_CODES.has("DIRECT"), true);
check("VIXY is reserved", RESERVED_CODES.has("VIXY"), true);

console.log("\n" + pass + " passed, " + fail + " failed\n");
process.exit(fail === 0 ? 0 : 1);
