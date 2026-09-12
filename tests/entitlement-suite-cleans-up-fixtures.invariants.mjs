// INVARIANTS -- the staff entitlement suite must not leave fixtures behind.
//
// /api/admin/test-entitlement-suite runs eighteen checks that build users, day
// passes and Firestore subscriptions under reserved @vixy.internal addresses. It
// called savePersistentStore() and updateSubscriptionInFirestore() and removed
// none of it, so every run left fake ACTIVE members and entitlements in the admin
// user list, the day-pass ledger and Firestore -- and its day-pass fixtures were
// stamped `stripePaymentStatus: "PAID"`, so they read as purchases.
//
// Companion to acceptance-matrix-leaves-no-fixture.invariants.mjs: same defect,
// the other staff harness.
import { serverSrc, sliceThrough, createHarness } from './_engineSource.mjs';

const t = createHarness('entitlement-suite-cleans-up-fixtures.invariants');

const suite = sliceThrough(
  serverSrc,
  'app.get("/api/admin/test-entitlement-suite"',
  'app.get("/api/user/subscription"',
  'test-entitlement-suite',
);
t.check('located the suite', suite.length > 5000, `${suite.length} chars`);

t.section('a fixture is not a sale');
t.check('no fixture is stamped PAID', !/stripePaymentStatus:\s*"PAID"/.test(suite));
t.check('fixtures are labelled as fixtures', /stripePaymentStatus:\s*"TEST_FIXTURE"/.test(suite));
t.check('no fixture carries a payment link', !/stripePaymentLink:\s*"(?!null)/.test(suite) && !/stripePaymentLink:\s*"direct"/.test(suite));
t.check('no fixture carries a price id', !/stripePriceId:\s*"price_/.test(suite));

t.section('a fixture does not outlive its run');
t.check('the run tears down its fixtures', /const fixtureCleanup = \{/.test(suite));
t.check('fixture users are removed from serverUsers', /serverUsers\.splice\(i, 1\)/.test(suite));
t.check('fixture day passes are removed', /userDayPasses\.delete\(key\)/.test(suite));
t.check('fixture subscriptions are removed', /userSubscriptions\.delete\(key\)/.test(suite));
t.check('the persisted copies are deleted too',
  /deleteDoc\(/.test(suite) && /doc\(db, "users"/.test(suite) &&
  /doc\(db, "day_passes"/.test(suite) && /doc\(db, "subscriptions"/.test(suite));

t.section('cleanup can never touch a real account');
t.check('the sweep is scoped to the reserved fixture domain',
  /const FIXTURE_DOMAIN = "@vixy\.internal"/.test(suite));
t.check('matching is on the address ending, not a substring',
  /endsWith\(FIXTURE_DOMAIN\)/.test(suite));
t.check('records keyed by user id are matched on their own email too',
  /isFixture\(key\) \|\| isFixture\(rec\?\.email\)/.test(suite));

t.section('a failed cleanup is reported, never swallowed');
t.check('cleanup appears as its own check', /name: "Fixture Cleanup"/.test(suite));
t.check('a leftover row fails that check', /passed: fixtureCleanup\.failed\.length === 0/.test(suite));
t.check('the response carries what was left behind', /fixtureCleanup,/.test(suite));
t.check('the score arithmetic still balances',
  /if \(fixtureCleanup\.failed\.length === 0\) passedCount\+\+;/.test(suite));

t.done();
