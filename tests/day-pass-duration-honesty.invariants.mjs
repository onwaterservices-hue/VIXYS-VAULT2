// RUNTIME INVARIANT TESTS — A DAY PASS IS THE LENGTH IT WAS SOLD AS
//
// getUserEntitlement applied a one-time "+3 day troubleshooting grace" (added
// 2026-08-15 to compensate that day's incident) to ANY day pass not already
// flagged, the first time it was read. The Stripe webhook flags new passes, but
// the reconcile/restore paths (dp_restored_*, dp_pi_*) and the admin grant do
// not -- so the same $9.99 "24-Hour Day Pass" ran ~96 hours or 24 hours
// depending on which code path recorded it.
//
// The admin grant also wrote stripePaymentStatus "PAID" with invented
// manual_grant_/sess_manual_/evt_manual_ ids for a comp that had no payment.
//
// Executes the REAL grace condition extracted from server.ts.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const server = readFileSync(join(here, '..', 'server.ts'), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== DAY PASS DURATION HONESTY INVARIANTS ===\n');

console.log('[1] The +3 day grace only reaches passes from the compensated window (executing the real condition)');
const gStart = server.indexOf('const GRACE_ELIGIBLE_BEFORE_MS');
const ifStart = server.indexOf('if (', gStart);
const ifEnd = server.indexOf(') {\n    try {', ifStart);
check('grace condition located', gStart !== -1 && ifStart !== -1 && ifEnd !== -1);
const graceApplies = new Function('dayPassRecord', `${server.slice(gStart, ifEnd + 1)} { return true; } return false;`);

const pass24 = (startedAt, extra = {}) => ({ entitlementType: 'DAY_PASS', status: 'ACTIVE', startedAt, expiresAt: new Date(Date.parse(startedAt) + 24 * 3600e3).toISOString(), ...extra });
check('a pass bought today via the reconcile path is NOT extended', graceApplies(pass24('2026-09-11T03:00:00.000Z', { entitlementId: 'dp_pi_x' })) === false);
check('a pass restored from a checkout session is NOT extended', graceApplies(pass24('2026-09-01T12:00:00.000Z', { entitlementId: 'dp_restored_cs_x' })) === false);
check('an admin comp granted after the window is NOT extended', graceApplies(pass24('2026-09-10T00:00:00.000Z', { entitlementId: 'dp_admin_1' })) === false);
check('a pass that started during the 2026-08-15 incident IS still compensated', graceApplies(pass24('2026-08-15T09:00:00.000Z')) === true);
check('an already-compensated pass is not extended twice', graceApplies(pass24('2026-08-15T09:00:00.000Z', { troubleshootingGraceApplied: true })) === false);
check('a server-tag trial is never extended', graceApplies(pass24('2026-08-15T09:00:00.000Z', { entitlementType: 'TAG_TRIAL' })) === false);
check('a record with no start time is not extended', graceApplies({ entitlementType: 'DAY_PASS', status: 'ACTIVE', expiresAt: '2026-09-12T00:00:00.000Z' }) === false);
check('falls back to activatedAt when startedAt is absent', graceApplies({ entitlementType: 'DAY_PASS', activatedAt: '2026-08-14T00:00:00.000Z', expiresAt: '2026-08-15T00:00:00.000Z' }) === true);
check('no record, no grace', graceApplies(undefined) === false);
check('the cutoff is the close of the incident day', /Date\.parse\("2026-08-16T00:00:00\.000Z"\)/.test(server));

console.log('\n[2] An admin comp does not pretend to be a Stripe purchase');
const grant = server.slice(server.indexOf('action === "grant_day_pass"'), server.indexOf('userDayPasses.set(user.email.toLowerCase(), dpRecord);'));
check('grant block located', grant.length > 200);
check('grant is recorded as MANUAL_GRANT, not PAID', /stripePaymentStatus: "MANUAL_GRANT"/.test(grant) && !/stripePaymentStatus: "PAID"/.test(grant));
const grantCode = grant.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
check('grant invents no Stripe payment/session/event ids', !/manual_grant_|sess_manual_|evt_manual_/.test(grantCode));
for (const f of ['stripePaymentLink', 'stripePaymentId', 'stripeCheckoutSessionId', 'stripeEventId', 'stripePriceId']) {
  check(`grant sets ${f} to null`, new RegExp(`${f}: null`).test(grant));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
