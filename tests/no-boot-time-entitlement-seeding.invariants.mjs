// INVARIANTS -- the server never mints an entitlement at boot, and only a real
// Stripe payment may be recorded as one.
//
// server.ts used to call initializeProtectedAugust15Users() at module load and
// again from sanitizeAndNormalizeServerUsers on every store load. Running the
// real function against an empty map -- what a cold Vercel instance has -- showed
// it minted a 48-hour ELITE day pass for a hardcoded customer address stamped
// `stripePaymentStatus: "PAID"` with a live Stripe payment link and price id, for
// a payment that never happened; that its else-branch turned an EXPIRED record
// back to ACTIVE with expiresAt reset to now + 48h, so the entitlement could
// never expire; and that it pushed ten synthesized rows into serverUsers marked
// PRO_PASS / ACTIVE / VERIFIED, which /api/admin/stats counted as real members.
//
// grant_day_pass had already been fixed to record a comp as MANUAL_GRANT with
// null Stripe ids. These seeds were missed by that sweep. This test keeps both
// properties: no boot-time grant, and a comp is never dressed up as a purchase.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('no-boot-time-entitlement-seeding.invariants');

// Comment lines record the history above; only code counts.
const codeLines = serverSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
const code = codeLines.join('\n');

t.section('nothing seeds entitlements at module load');
t.check('initializeProtectedAugust15Users is gone', !/initializeProtectedAugust15Users/.test(code));
t.check('the August 15 list is only read, never iterated to create records',
  !/AUGUST_15_COMPENSATED_USERS\s*\.\s*forEach/.test(code));
// Module-scope statements start at column 0. A day pass written from there runs
// on every cold instance, before the Firestore store has loaded.
//
// The one allowed exception is the owner's own bootstrap: server.ts seeds
// userSubscriptions for the master admin address so the admin panel is reachable
// on a fresh instance. isMasterAdminEmail() recognises that address, the record
// carries no Stripe payment fields, and it sells nothing -- it is the operator
// granting themselves their own console, not an entitlement dressed as a sale.
const masterAdmins = [...serverSrc.matchAll(/clean === "([^"]+@[^"]+)"/g)]
  .map((m) => m[1])
  .filter((e) => serverSrc.slice(Math.max(0, serverSrc.indexOf('function isMasterAdminEmail')), serverSrc.indexOf('function isMasterAdminEmail') + 400).includes(e));
t.check('the master-admin addresses were located', masterAdmins.length > 0, masterAdmins.join(', '));
const moduleScopeWrites = codeLines.filter((l) =>
  (/^userDayPasses\.set\(/.test(l) || /^userSubscriptions\.set\(/.test(l)) &&
  !masterAdmins.some((e) => l.includes(e)));
t.check('no entitlement map is written at module scope for anyone but the owner',
  moduleScopeWrites.length === 0, moduleScopeWrites.join(' | '));
t.check('the owner bootstrap records no Stripe payment', (() => {
  const i = serverSrc.indexOf('userSubscriptions.set("vixyvault0@gmail.com"');
  if (i < 0) return true;
  return !/stripePaymentStatus|stripePaymentLink|stripePriceId/.test(serverSrc.slice(i, i + 400));
})());

t.section('no hardcoded address receives a minted entitlement');
// A day pass keyed by a literal email address is a grant baked into the source.
const literalKeyed = [...code.matchAll(/userDayPasses\.set\(\s*"([^"]*@[^"]*)"/g)].map((m) => m[1]);
t.check('no day pass is stored under a literal email address', literalKeyed.length === 0, literalKeyed.join(', '));
const literalEntitlementIds = [...code.matchAll(/entitlementId:\s*[`"']([^`"'$]*)[`"']\s*,/g)].map((m) => m[1]);
t.check('every entitlementId is derived, never a fixed literal', literalEntitlementIds.length === 0, literalEntitlementIds.join(', '));

t.section('a comp is never recorded as a purchase');
// The record grant_day_pass writes. Pinned so the honest shape cannot regress.
const grantBlock = code.slice(code.indexOf('action === "grant_day_pass"'), code.indexOf('action === "grant_day_pass"') + 3000);
t.check('grant_day_pass exists', grantBlock.length > 100);
t.check('an admin comp is MANUAL_GRANT, not PAID', /stripePaymentStatus:\s*"MANUAL_GRANT"/.test(grantBlock));
t.check('an admin comp records no Stripe payment link', /stripePaymentLink:\s*null/.test(grantBlock));
t.check('an admin comp is not stamped PAID', !/stripePaymentStatus:\s*"PAID"/.test(grantBlock));

t.section('PAID is only written next to a Stripe-derived identifier');
// Each PAID assignment must sit in a record whose entitlementId interpolates a
// Stripe id (e.g. `dp_sess_${session.id}`), or in a block that has no
// entitlementId of its own at all (subscription reconciliation).
let paidOffenders = 0;
const detail = [];
for (const m of code.matchAll(/stripePaymentStatus:\s*"PAID"/g)) {
  const from = Math.max(0, m.index - 1200);
  const block = code.slice(from, m.index);
  const idMatch = [...block.matchAll(/entitlementId:\s*([`"'][^`"']*[`"'])/g)].pop();
  if (!idMatch) continue;                 // no entitlementId in scope
  if (idMatch[1].includes('${')) continue; // derived from a Stripe identifier
  paidOffenders++;
  detail.push(idMatch[1]);
}
t.check('no fixed-literal entitlement is stamped PAID', paidOffenders === 0, detail.join(', '));

t.done();
