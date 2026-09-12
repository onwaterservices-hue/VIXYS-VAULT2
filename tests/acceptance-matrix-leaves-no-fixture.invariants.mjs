// INVARIANTS -- the staff acceptance matrix must not leave fake sales behind.
//
// /api/admin/acceptance-matrix runs executePlanAcceptanceTest for four plans.
// Each run created a user row (serverUsers.unshift + savePersistentStore +
// persistSingleUser -> Firestore) marked status ACTIVE / verificationStatus
// VERIFIED, a day-pass record stamped `stripePaymentStatus: "PAID"` carrying the
// LIVE day-pass payment link and the real price id, and -- for the subscription
// plans -- a Firestore subscription via updateSubscriptionInFirestore. There was
// no cleanup of any kind anywhere in the 300-line function, so every press of
// that button permanently added phantom members and a phantom purchase to the
// admin user list and the day-pass ledger.
//
// Two properties are pinned here: a fixture is never dressed as a sale, and a
// fixture never outlives its run.
import { serverSrc, sliceThrough, createHarness } from './_engineSource.mjs';

const t = createHarness('acceptance-matrix-leaves-no-fixture.invariants');

const fn = sliceThrough(
  serverSrc,
  'async function executePlanAcceptanceTest(',
  '__name(executePlanAcceptanceTest, "executePlanAcceptanceTest");',
  'executePlanAcceptanceTest',
);
t.check('located the acceptance test', fn.length > 2000, `${fn.length} chars`);

t.section('a fixture is not a sale');
t.check('the fixture day pass is not stamped PAID', !/stripePaymentStatus:\s*"PAID"/.test(fn));
t.check('it is labelled as a fixture', /stripePaymentStatus:\s*"TEST_FIXTURE"/.test(fn));
t.check('it carries no Stripe payment link', !/stripePaymentLink:\s*"https?:/.test(fn));
t.check('it carries no real price id', !/stripePriceId:\s*"price_/.test(fn));
t.check('it invents no payment or checkout session id',
  !/stripePaymentId:\s*[`"']pi_/.test(fn) && !/stripeCheckoutSessionId:\s*[`"']cs_/.test(fn));

t.section('a fixture does not outlive its run');
t.check('the run tears down what it created', /const cleanup = \{/.test(fn));
t.check('the synthetic user is removed from serverUsers', /serverUsers\.splice\(/.test(fn));
t.check('the day pass is removed under both keys',
  /userDayPasses\.delete\(testEmail\)/.test(fn) && /userDayPasses\.delete\(createdUserId\)/.test(fn));
t.check('the subscription is removed', /userSubscriptions\.delete\(testEmail\)/.test(fn));
t.check('the persisted copies are deleted too',
  /deleteDoc\(/.test(fn) && /"users"/.test(fn) && /"day_passes"/.test(fn) && /"subscriptions"/.test(fn));

t.section('cleanup can never touch a real account');
t.check('teardown is gated on the generated test domain', /testEmail\.endsWith\("@vixyvault\.test"\)/.test(fn));
t.check('the removed row must match BOTH the address and the id created here',
  /u\.email === testEmail && u\.id === createdUserId/.test(fn));
t.check('the fixture address is generated, not a literal',
  /const testEmail = `accept_\$\{planType/.test(fn));

t.section('a failed cleanup is reported, never swallowed');
t.check('cleanup appears as its own step', /name: "Fixture Cleanup"/.test(fn));
t.check('a leftover row fails the step', /status: cleanup\.failed\.length === 0 \? "PASSED" : "FAILED"/.test(fn));
t.check('a leftover row fails the whole run',
  /const finalPassed = allPassed && cleanup\.failed\.length === 0/.test(fn));
t.check('the caller is told what was left behind', /cleanup,/.test(fn));

t.done();
