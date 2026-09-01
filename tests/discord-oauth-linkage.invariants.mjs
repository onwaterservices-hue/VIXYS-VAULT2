// RUNTIME INVARIANT TESTS — DISCORD OAUTH LINKAGE & COLD-START ENTITLEMENT
//
// Two defects this guards against, both verified against production before fixing:
//
// 1. The onboarding modal, status widget and alert settings all started the
//    Discord link via `/api/auth/discord/url`, a route that does not exist.
//    Production returned 404 {"error":"not_found"}; safeFetchJson swallows that
//    and returns null, so every caller threw "Failed to load Discord OAuth
//    endpoint." The link could never begin. The route that DOES exist is
//    `/api/discord/connect` (401 AUTHENTICATION_REQUIRED when signed out).
//
// 2. resolveDiscordEntitlementTier is synchronous over in-memory maps that are
//    empty on every cold Vercel lambda, so it answered "NONE" for paying
//    customers -- and "NONE" makes assignDiscordRoleToUser REMOVE the paid role.
//    A paying member could be demoted by nothing more than which lambda served
//    the request.
//
// Executes the REAL role-mapping source extracted verbatim, and asserts on the
// REAL frontend/backend sources. Paths resolved RELATIVE to this file.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const R = (p) => readFileSync(join(root, p), 'utf8');
const server = R('server.ts');
const api = R('src/services/api.ts');
const oauth = R('src/bot/discordOAuth.ts');
const botService = R('src/bot/discordBotService.ts');

const strip = (s) => s.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

console.log('\n=== DISCORD OAUTH LINKAGE & ENTITLEMENT INVARIANTS ===\n');

// ---------------------------------------------------------------------------
// 1. Every Discord-OAuth start path targets a route that actually exists.
// ---------------------------------------------------------------------------
console.log('[1] OAuth start endpoint exists and is the one the frontend calls');

const FRONTEND_FILES = [
  'src/services/api.ts',
  'src/components/DiscordOnboardingModal.tsx',
  'src/components/DiscordStatusWidget.tsx',
  'src/components/AlertSettingsView.tsx',
  'src/components/CommunityAccessNode.tsx',
];
for (const f of FRONTEND_FILES) {
  check(`${f} does not call the non-existent /api/auth/discord/url`,
    !strip(R(f)).includes('/api/auth/discord/url'));
}
check('the connect route is registered server-side',
  /"\/api\/discord\/connect"/.test(server));
check('the callback route is registered server-side',
  /"\/api\/auth\/discord\/callback"/.test(server));
// The redirect_uri the server builds must match the route it registered.
check('OAuth redirect_uri matches the registered callback path',
  /\/api\/auth\/discord\/callback"/.test(oauth));

// ---------------------------------------------------------------------------
// 2. Identity for a link comes from the session, never from the client.
// ---------------------------------------------------------------------------
console.log('\n[2] Link identity is session-derived, not client-supplied');
check('the client-supplied-email variant getDiscordAuthUrlApi is gone',
  !/export async function getDiscordAuthUrlApi/.test(api));
check('no component imports getDiscordAuthUrlApi',
  !FRONTEND_FILES.some(f => /import[^;]*getDiscordAuthUrlApi/.test(R(f))));
check('the secure starter sends the session cookie',
  /getDiscordAuthUrlSecure[\s\S]{0,400}credentials:\s*'include'/.test(api));
check('the secure starter does not pass an email/userId query',
  !/getDiscordAuthUrlSecure[\s\S]{0,400}(x-user-email|params\.append\('email')/.test(api));
check('the connect handler authenticates the session',
  /authenticateSession\(req\)[\s\S]{0,220}AUTHENTICATION_REQUIRED/.test(oauth));
// All four start callsites must use the secure function.
for (const f of ['src/components/DiscordOnboardingModal.tsx','src/components/DiscordStatusWidget.tsx','src/components/AlertSettingsView.tsx','src/components/CommunityAccessNode.tsx']) {
  check(`${f.split('/').pop()} starts OAuth via getDiscordAuthUrlSecure`,
    /getDiscordAuthUrlSecure\(\)/.test(R(f)));
}

// ---------------------------------------------------------------------------
// 3. OAuth state security is intact (must not have been weakened).
// ---------------------------------------------------------------------------
console.log('\n[3] OAuth state handling still secure');
check('state is generated with a CSPRNG', /crypto\.randomBytes\(32\)/.test(oauth));
check('state carries an expiry', /expiresAt/.test(oauth));
check('state is single-use', /used:\s*false/.test(oauth));
check('state is bound to the VIXY account', /vixyEmail/.test(oauth));
check('the client secret is never returned to the frontend',
  !/hasClientSecret|clientSecret[^:]*:\s*clientSecret/.test(strip(api)));

// ---------------------------------------------------------------------------
// 4. Cold-start entitlement safety: never demote on an unresolved answer.
// ---------------------------------------------------------------------------
console.log('\n[4] Cold-start cannot demote a paying member');
check('an authoritative resolver exists',
  /async function resolveDiscordEntitlementTierAuthoritative/.test(server));
check('it hydrates from Firestore before believing a negative',
  /resolveDiscordEntitlementTierAuthoritative[\s\S]{0,2200}hydrateUserFromFirestore/.test(server));
check('a degraded Firestore is reported as non-authoritative',
  /_degraded[\s\S]{0,160}authoritative:\s*false/.test(server));
check('the Stripe-side sync refuses demotion when unresolved',
  /tier === "NONE" && !resolved\.authoritative[\s\S]{0,400}ENTITLEMENT_UNRESOLVED/.test(server));
check('the OAuth callback refuses demotion when unresolved',
  /tier === "NONE" && !authoritative/.test(oauth));
check('the callback is wired to the authoritative resolver',
  /createDiscordCallbackHandler\([\s\S]{0,320}resolveDiscordEntitlementTierAuthoritative/.test(server));
// Withholding a downgrade must never become a grant.
check('a non-authoritative result never assigns a paid role',
  !/!authoritative[\s\S]{0,200}assignDiscordRoleToUser\([^)]*ELITE/.test(oauth));

// ---------------------------------------------------------------------------
// 5. Role mapping — execute the REAL tier->roleId selection.
// ---------------------------------------------------------------------------
console.log('\n[5] Tier -> Discord role mapping is safe');
const mapSrc = botService.slice(
  botService.indexOf('const eliteRoleId ='),
  botService.indexOf('console.log(`\\n================ [DISCORD ROLE SYNCHRONIZATION AUDIT]'),
);
const selectRole = new Function('process', 'targetTier', `${mapSrc}; return targetRoleId;`);
const env = { env: { DISCORD_ELITE_ROLE_ID: 'ELITE_ID', DISCORD_24H_ROLE_ID: 'DAYPASS_ID', DISCORD_VERIFIED_ROLE_ID: 'VERIFIED_ID' } };

check('ELITE -> elite role', selectRole(env, 'ELITE') === 'ELITE_ID');
check('PRO (Professional) -> elite role, not a lesser one', selectRole(env, 'PRO') === 'ELITE_ID');
check('DAY_PASS -> day-pass role', selectRole(env, 'DAY_PASS') === 'DAYPASS_ID');
check('VERIFIED -> verified role', selectRole(env, 'VERIFIED') === 'VERIFIED_ID');
// The regression that mattered: unentitled must land on the FREE role.
check('NONE -> verified/free role, never elite', selectRole(env, 'NONE') === 'VERIFIED_ID');
check('an unrecognised tier falls back to free, never elite',
  selectRole(env, 'SOMETHING_UNKNOWN') === 'VERIFIED_ID');
for (const t of ['NONE', 'VERIFIED', 'SOMETHING_UNKNOWN', 'STARTER']) {
  check(`fallback for "${t}" never over-grants the paid role`, selectRole(env, t) !== 'ELITE_ID');
}

// ---------------------------------------------------------------------------
// 6. Entitlement resolution — execute the REAL resolver.
//    STARTER must not read as free; an inactive sub must grant nothing.
// ---------------------------------------------------------------------------
console.log('\n[6] Entitlement resolution treats every paid tier as paid');
const resSrc = server.slice(
  server.indexOf('function resolveDiscordEntitlementTier(email, discordUserId)'),
  server.indexOf('__name(resolveDiscordEntitlementTier,'),
);
function resolveWith(sub) {
  const fn = new Function(
    'userDayPasses', 'serverUsers', 'userSubscriptions',
    `${resSrc}; return resolveDiscordEntitlementTier;`
  )(new Map(), [], new Map([['u@x.com', sub]]));
  return fn('u@x.com', '123456789012345678');
}
check('STARTER is paid, not free (the historical bug)', resolveWith({ role: 'STARTER', status: 'ACTIVE' }) === 'ELITE');
check('PROFESSIONAL is paid', resolveWith({ role: 'PROFESSIONAL', status: 'ACTIVE' }) === 'ELITE');
check('PRO is paid', resolveWith({ role: 'PRO', status: 'ACTIVE' }) === 'ELITE');
check('ELITE is paid', resolveWith({ role: 'ELITE', status: 'ACTIVE' }) === 'ELITE');
check('plan-name STARTER is also honoured', resolveWith({ plan: 'STARTER_MONTHLY', status: 'ACTIVE' }) === 'ELITE');
check('a cancelled subscription grants nothing', resolveWith({ role: 'ELITE', status: 'CANCELED' }) === 'NONE');
check('an expired subscription grants nothing', resolveWith({ role: 'ELITE', status: 'EXPIRED' }) === 'NONE');
check('no subscription grants nothing', resolveWith({}) === 'NONE');
check('a free/unknown role grants nothing', resolveWith({ role: 'FREE', status: 'ACTIVE' }) === 'NONE');

// ---------------------------------------------------------------------------
// 7. Frontend truthfulness: localStorage must not assert a link on its own.
// ---------------------------------------------------------------------------
console.log('\n[7] Frontend cannot claim a link without backend confirmation');
const modal = R('src/components/DiscordOnboardingModal.tsx');
check('the modal only marks linked from a backend response',
  /res && res\.success && res\.profile[\s\S]{0,320}discordLinked:\s*true/.test(modal));
check('the modal surfaces the real error rather than a generic success',
  /setErrorMessage\(/.test(modal));
check('guild membership comes from the backend profile, not a local guess',
  /guildMember:\s*res\.profile\.guildMember/.test(modal));

// ---------------------------------------------------------------------------
// 8. Stripe webhook integrity must not have been disturbed.
// ---------------------------------------------------------------------------
console.log('\n[8] Stripe webhook signature path untouched');
check('the webhook still verifies the Stripe signature',
  /constructEvent\(/.test(server));
check('the webhook still uses a raw body for signature verification',
  /express\.raw\(|rawBody/.test(server));

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail === 0 ? 0 : 1);
