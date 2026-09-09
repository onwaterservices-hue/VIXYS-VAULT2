// CHARACTERIZATION TESTS -- getEntitlementsFromSubscription tier mapping.
//
// Executes the REAL function extracted verbatim from server.ts. This is the
// function that decides what a paying subscriber can see, so its exact mapping
// is worth pinning: a silent widening here hands paid desks to non-payers, and
// a silent narrowing locks out customers who have paid.
import { extractFn, createHarness } from './_engineSource.mjs';

const t = createHarness('entitlements.characterization');
const src = extractFn('getEntitlementsFromSubscription', 'function getEntitlementsFromSubscription(');
const get = new Function(`${src}; return getEntitlementsFromSubscription;`)();

const ALL_FLAGS = ['starter', 'proQuant', 'eliteQuant', 'scalping15s', 'canAccessProDesks', 'canAccessAdminPanel'];
const shape = (r) => ALL_FLAGS.filter((f) => r.entitlements[f]).join(',') || '(none)';

t.section('owner/admin override short-circuits before any plan check');
const admin = get(null, null, true);
t.eq('admin: normalizedPlan', admin.normalizedPlan, 'ELITE_QUANT');
t.eq('admin: normalizedStatus', admin.normalizedStatus, 'active');
t.eq('admin: isStripeVerified', admin.isStripeVerified, true);
t.eq('admin: full entitlements incl. admin panel', shape(admin), ALL_FLAGS.join(','));
// PINNED-AS-IS: the override ignores plan and status entirely, so an admin
// flag grants ELITE even with an explicitly CANCELED subscription.
t.eq('PINNED-AS-IS: admin flag beats CANCELED status', shape(get('NONE', 'CANCELED', true)), ALL_FLAGS.join(','));
t.eq('PINNED-AS-IS: admin is the ONLY path to canAccessAdminPanel',
  get('ELITE_QUANT_YEARLY', 'ACTIVE').entitlements.canAccessAdminPanel, false);

t.section('plan mapping under an entitling status');
const EXPECT = {
  ELITE:   'starter,proQuant,eliteQuant,scalping15s,canAccessProDesks',
  PRO:     'starter,proQuant,scalping15s,canAccessProDesks',
  STARTER: 'starter',
  NONE:    '(none)',
};
for (const [plan, normalized, expectKey] of [
  ['ELITE_QUANT_MONTHLY', 'ELITE_QUANT', 'ELITE'],
  ['ELITE_QUANT_YEARLY',  'ELITE_QUANT', 'ELITE'],
  ['PRO_QUANT_MONTHLY',   'PRO_QUANT',   'PRO'],
  ['PRO_QUANT_YEARLY',    'PRO_QUANT',   'PRO'],
  ['STARTER_MONTHLY',     'STARTER',     'STARTER'],
  ['STARTER_YEARLY',      'STARTER',     'STARTER'],
]) {
  const r = get(plan, 'ACTIVE');
  t.eq(`${plan} -> ${normalized}`, r.normalizedPlan, normalized);
  t.eq(`${plan} -> entitlements`, shape(r), EXPECT[expectKey]);
  t.eq(`${plan} -> isStripeVerified`, r.isStripeVerified, true);
}
// Only STARTER lacks scalping15s and the pro desks.
t.eq('STARTER has no scalping15s', get('STARTER_MONTHLY', 'ACTIVE').entitlements.scalping15s, false);
t.eq('STARTER has no pro desks', get('STARTER_MONTHLY', 'ACTIVE').entitlements.canAccessProDesks, false);
t.eq('PRO has no eliteQuant', get('PRO_QUANT_MONTHLY', 'ACTIVE').entitlements.eliteQuant, false);

t.section('matching is substring-based and case/whitespace insensitive');
t.eq('lowercase plan+status still maps', get('elite_quant_yearly', 'active').normalizedPlan, 'ELITE_QUANT');
t.eq('surrounding whitespace is trimmed', get('  PRO_QUANT_MONTHLY  ', '  ACTIVE  ').normalizedPlan, 'PRO_QUANT');
t.eq('bare "ELITE" matches', get('ELITE', 'ACTIVE').normalizedPlan, 'ELITE_QUANT');
// PINNED-AS-IS: the check is `includes`, tested ELITE-then-PRO-then-STARTER, so
// precedence is by test order and not by any notion of plan rank. A plan string
// containing more than one keyword resolves to whichever is tested first.
t.eq('PINNED-AS-IS: ELITE is tested before PRO', get('PRO_AND_ELITE', 'ACTIVE').normalizedPlan, 'ELITE_QUANT');
t.eq('PINNED-AS-IS: PRO is tested before STARTER', get('STARTER_PRO', 'ACTIVE').normalizedPlan, 'PRO_QUANT');
// PINNED-AS-IS: an unrecognised plan on an ACTIVE subscription falls through
// to NONE with isStripeVerified false -- a paying customer on a new price ID
// silently loses access rather than erroring.
t.eq('PINNED-AS-IS: unknown plan + ACTIVE -> NONE', get('SOME_NEW_PLAN', 'ACTIVE').normalizedPlan, 'NONE');
t.eq('PINNED-AS-IS: unknown plan + ACTIVE -> not verified', get('SOME_NEW_PLAN', 'ACTIVE').isStripeVerified, false);

t.section('status gating');
for (const [status, normalizedStatus] of [['ACTIVE', 'active'], ['PAST_DUE', 'past_due'], ['TRIALING', 'trialing']]) {
  const r = get('ELITE_QUANT_MONTHLY', status);
  t.eq(`${status} entitles`, shape(r), EXPECT.ELITE);
  t.eq(`${status} -> normalizedStatus ${normalizedStatus}`, r.normalizedStatus, normalizedStatus);
}
// PINNED-AS-IS: PAST_DUE keeps FULL entitlements. A subscriber whose card has
// failed retains every paid desk until the status changes to something else.
t.eq('PINNED-AS-IS: PAST_DUE retains full ELITE access', get('ELITE_QUANT_MONTHLY', 'PAST_DUE').entitlements.eliteQuant, true);

for (const status of ['CANCELED', 'INCOMPLETE', 'UNPAID', 'PAUSED', '']) {
  const r = get('ELITE_QUANT_MONTHLY', status);
  t.eq(`${status || '(empty)'} -> no entitlements`, shape(r), '(none)');
  t.eq(`${status || '(empty)'} -> normalizedPlan NONE`, r.normalizedPlan, 'NONE');
  t.eq(`${status || '(empty)'} -> not verified`, r.isStripeVerified, false);
}
t.eq('CANCELED maps to normalizedStatus canceled', get('ELITE', 'CANCELED').normalizedStatus, 'canceled');
t.eq('other non-entitling statuses map to inactive', get('ELITE', 'UNPAID').normalizedStatus, 'inactive');

t.section('null/undefined inputs do not throw');
t.eq('null plan + null status -> NONE', get(null, null).normalizedPlan, 'NONE');
t.eq('undefined plan + undefined status -> NONE', get(undefined, undefined).normalizedPlan, 'NONE');
t.eq('null inputs -> inactive', get(null, null).normalizedStatus, 'inactive');

t.done();
