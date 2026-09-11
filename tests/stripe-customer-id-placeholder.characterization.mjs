// CHARACTERIZATION -- checkout and the billing portal never send a placeholder
// customer id to Stripe.
//
// Vercel (2026-08-30..09-06): "Error creating Day Pass checkout session:
// StripeInvalidRequestError: No such customer: 'N/A'" x8. The admin user editor stores
// any string as stripeCustomerId, and checkout passed it straight to Stripe.
import { serverSrc, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('stripe-customer-id-placeholder.characterization');
const i = serverSrc.indexOf('function realStripeCustomerId(');
const fnSrc = i > 0 ? serverSrc.slice(i, serverSrc.indexOf('\n}\n', i) + 2) : '';
t.check('helper found', fnSrc.length > 0);
const js = transformSync(fnSrc + '\nmodule.exports = realStripeCustomerId;', { loader: 'ts', format: 'cjs' }).code;
const m = { exports: {} };
new Function('module', 'exports', js)(m, m.exports);
const real = m.exports;
for (const [v, want] of [['N/A', null], ['', null], [null, null], [undefined, null], ['cus_vixy_owner', null], ['cus_venmo_ogaccount85', null], ['cus_test_123', null], ['cus_V4zGkWKshUnahT', 'cus_V4zGkWKshUnahT'], ['  cus_Q1w2E3r4T5y6U7  ', 'cus_Q1w2E3r4T5y6U7']]) {
  t.eq(`realStripeCustomerId(${JSON.stringify(v)})`, real(v), want);
}
t.check('no checkout reads the stored id unvalidated', !serverSrc.includes('let stripeCustomerId = user.stripeCustomerId;'));
t.eq('both checkouts validate the stored id', (serverSrc.match(/let stripeCustomerId = realStripeCustomerId\(user\.stripeCustomerId\);/g) || []).length, 2);
t.check('billing portal validates the stored id', serverSrc.includes('let customerId = realStripeCustomerId(userSub?.stripeCustomerId) || realStripeCustomerId(serverUser?.stripeCustomerId);'));
t.done();
