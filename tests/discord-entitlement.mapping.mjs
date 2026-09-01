// RUNTIME INVARIANT TESTS — DISCORD ENTITLEMENT MAPPING
//
// Executes the REAL resolveDiscordEntitlementTier source extracted verbatim from
// server.ts, with controlled state injected. No reimplementation, no network.
//
// The VIXY model has exactly two paid Discord roles:
//   STARTER | PROFESSIONAL | ELITE -> "ELITE"    (VIXY ELITE)
//   DAY_PASS                       -> "DAY_PASS" (VIXY (24hr) ELEITE'S)
//   no active purchase             -> "NONE"     (no paid role)
//
// Path is resolved RELATIVE to this file. The two older suites in this
// directory hardcode an absolute path to a different checkout
// (~/Downloads/VIXYS-VAULT2-main/server.ts), so they silently test that copy
// rather than the working tree.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'server.ts'), 'utf8');

function extract(name, startPat) {
  const i = src.indexOf(startPat);
  if (i < 0) throw new Error(`cannot find ${name}`);
  const j = src.indexOf(`__name(${name}`, i);
  if (j < 0) throw new Error(`cannot find __name(${name}`);
  return src.slice(i, j);
}

const resolverSrc = extract(
  'resolveDiscordEntitlementTier',
  'function resolveDiscordEntitlementTier(email, discordUserId)',
);

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (actual === expected) { console.log(`  PASS  ${label} -> ${actual}`); pass++; }
  else { console.log(`  FAIL  ${label} -> got ${actual}, expected ${expected}`); fail++; }
}

// Build the resolver with injected state, exactly as server.ts would see it.
function makeResolver({ users = [], subs = new Map(), dayPasses = new Map() } = {}) {
  const factory = new Function(
    'serverUsers', 'userSubscriptions', 'userDayPasses',
    `${resolverSrc}; return resolveDiscordEntitlementTier;`,
  );
  return factory(users, subs, dayPasses);
}

const EMAIL = 'trader@example.com';
const DISCORD_ID = '123456789012345678';
const future = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
const past = new Date(Date.now() - 3600 * 1000).toISOString();

console.log('== entitlement mapping: subscription tiers -> VIXY ELITE ==');
for (const [label, sub] of [
  ['STARTER (plan)', { plan: 'STARTER_MONTHLY', status: 'ACTIVE' }],
  ['STARTER (role USER + plan)', { role: 'USER', plan: 'STARTER_ANNUAL', status: 'ACTIVE' }],
  ['PROFESSIONAL (role PRO)', { role: 'PRO', plan: 'PRO_PASS', status: 'ACTIVE' }],
  ['PROFESSIONAL (plan)', { plan: 'PROFESSIONAL_MONTHLY', status: 'ACTIVE' }],
  ['ELITE (role)', { role: 'ELITE', plan: 'ELITE_ANNUAL', status: 'ACTIVE' }],
]) {
  const r = makeResolver({ subs: new Map([[EMAIL, sub]]) });
  check(label, r(EMAIL, DISCORD_ID), 'ELITE');
}

console.log('\n== no active purchase -> no paid role ==');
check('no subscription at all', makeResolver()(EMAIL, DISCORD_ID), 'NONE');
check('plan NONE',
  makeResolver({ subs: new Map([[EMAIL, { plan: 'NONE', status: 'ACTIVE' }]]) })(EMAIL, DISCORD_ID), 'NONE');
check('FREE role',
  makeResolver({ subs: new Map([[EMAIL, { role: 'FREE', plan: '', status: 'ACTIVE' }]]) })(EMAIL, DISCORD_ID), 'NONE');

console.log('\n== cancelled / expired subscriptions grant nothing ==');
for (const status of ['CANCELED', 'CANCELLED', 'EXPIRED', 'SUSPENDED', 'INACTIVE']) {
  const r = makeResolver({ subs: new Map([[EMAIL, { role: 'ELITE', plan: 'ELITE_ANNUAL', status }]]) });
  check(`ELITE plan with status ${status}`, r(EMAIL, DISCORD_ID), 'NONE');
}

console.log('\n== day pass ==');
check('active day pass keyed by EMAIL (regression: was keyed by discordUserId only)',
  makeResolver({ dayPasses: new Map([[EMAIL, { status: 'ACTIVE', expiresAt: future }]]) })(EMAIL, DISCORD_ID),
  'DAY_PASS');
check('active day pass keyed by discordUserId still honoured',
  makeResolver({ dayPasses: new Map([[DISCORD_ID, { status: 'ACTIVE', expiresAt: future }]]) })(EMAIL, DISCORD_ID),
  'DAY_PASS');
check('day pass outranks an active subscription',
  makeResolver({
    subs: new Map([[EMAIL, { role: 'ELITE', status: 'ACTIVE' }]]),
    dayPasses: new Map([[EMAIL, { status: 'ACTIVE', expiresAt: future }]]),
  })(EMAIL, DISCORD_ID), 'DAY_PASS');
check('EXPIRED-status day pass ignored',
  makeResolver({ dayPasses: new Map([[EMAIL, { status: 'EXPIRED', expiresAt: future }]]) })(EMAIL, DISCORD_ID),
  'NONE');
check('past-expiry day pass ignored',
  makeResolver({ dayPasses: new Map([[EMAIL, { status: 'ACTIVE', expiresAt: past }]]) })(EMAIL, DISCORD_ID),
  'NONE');
check('expired day pass falls back to the live subscription',
  makeResolver({
    subs: new Map([[EMAIL, { role: 'ELITE', status: 'ACTIVE' }]]),
    dayPasses: new Map([[EMAIL, { status: 'ACTIVE', expiresAt: past }]]),
  })(EMAIL, DISCORD_ID), 'ELITE');

console.log('\n== transitions keep exactly one entitlement ==');
check('Starter -> Professional stays ELITE',
  makeResolver({ subs: new Map([[EMAIL, { role: 'PRO', plan: 'PRO_PASS', status: 'ACTIVE' }]]) })(EMAIL, DISCORD_ID),
  'ELITE');
check('Elite -> cancelled drops to NONE',
  makeResolver({ subs: new Map([[EMAIL, { role: 'ELITE', status: 'CANCELED' }]]) })(EMAIL, DISCORD_ID),
  'NONE');
check('Elite -> day pass becomes DAY_PASS',
  makeResolver({
    subs: new Map([[EMAIL, { role: 'ELITE', status: 'CANCELED' }]]),
    dayPasses: new Map([[EMAIL, { status: 'ACTIVE', expiresAt: future }]]),
  })(EMAIL, DISCORD_ID), 'DAY_PASS');

console.log('\n== falls back to the user record when no subscription row exists ==');
check('user.subscription STARTER',
  makeResolver({ users: [{ email: EMAIL, role: 'USER', subscription: 'STARTER_MONTHLY', status: 'ACTIVE' }] })(EMAIL, DISCORD_ID),
  'ELITE');
check('user with no plan',
  makeResolver({ users: [{ email: EMAIL, role: 'FREE', subscription: '', status: 'ACTIVE' }] })(EMAIL, DISCORD_ID),
  'NONE');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
