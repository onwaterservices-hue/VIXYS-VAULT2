// RUNTIME INVARIANT TESTS — DISCORD SERVER-TAG TRIAL
//
// Members who display the VIXY Vault server tag next to their Discord username
// can claim 3 days of day-pass-level access. This executes the REAL service
// source (src/bot/discordTagTrial.ts, which has no imports and no TS-only
// syntax) against an in-memory Firestore, and asserts the wiring in the real
// server / OAuth / frontend sources.
//
// What must hold:
//   - only a definite "tag equipped" answer from Discord grants
//   - once per Discord account and once per VIXY account
//   - Discord account >= 30 days old; no grant while paid access is live
//   - the grant is typed TAG_TRIAL with null payment fields (never reads as paid)
//   - a prior purchase record is preserved, a live one is never overwritten
//   - the hourly re-check ends a trial ONLY on a definite "not equipped"
//   - ending a trial never expires a pass bought afterwards
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const R = (p) => readFileSync(join(root, p), 'utf8');

let pass = 0, fail = 0;
const check = (label, cond, d = '') =>
  cond ? (pass++, console.log(`  PASS  ${label}`)) : (fail++, console.log(`  FAIL  ${label} ${d}`));

const moduleSrc = R('src/bot/discordTagTrial.ts').replace(/^export /gm, '');
const {
  discordAccountCreatedAtMs,
  readServerTagState,
  evaluateTagTrialEligibility,
  buildTagTrialDayPassRecord,
  createTagTrialService,
  tagTrialDurationHoursAt,
  tagTrialOfferAt,
  TAG_TRIAL_PROMO_ENDS_AT,
  TAG_TRIAL_COLLECTIONS: C,
} = new Function(`${moduleSrc}; return { discordAccountCreatedAtMs, readServerTagState, evaluateTagTrialEligibility, buildTagTrialDayPassRecord, createTagTrialService, tagTrialDurationHoursAt, tagTrialOfferAt, TAG_TRIAL_PROMO_ENDS_AT, TAG_TRIAL_COLLECTIONS };`)();

const GUILD = '1451337712937336985';
const NOW = Date.parse('2026-09-10T12:00:00.000Z');
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const OLD_DISCORD_ID = '175928847299117063'; // Discord docs example, created 2016-04-30
const OTHER_OLD_ID = '80351110224678912';
const snowflakeAt = (ms) => (BigInt(ms - 1420070400000) << 22n).toString();
const tagged = (guild = GUILD, enabled = true) => ({ id: 'x', primary_guild: { identity_guild_id: guild, identity_enabled: enabled, tag: 'VIXY', badge: 'h' } });

function makeStore() {
  const data = new Map();
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const snap = (path) => ({ id: path.split('/')[1], exists: () => data.has(path), data: () => clone(data.get(path)) });
  const set = (ref, value, opts) => {
    if (opts && opts.merge && data.has(ref.path)) data.set(ref.path, { ...data.get(ref.path), ...clone(value) });
    else data.set(ref.path, clone(value));
  };
  const fx = {
    ready: () => true,
    doc: (_db, coll, id) => ({ path: `${coll}/${id}` }),
    getDoc: async (ref) => snap(ref.path),
    setDoc: async (ref, v, o) => set(ref, v, o),
    runTransaction: async (_db, fn) => fn({ get: async (ref) => snap(ref.path), set: (ref, v, o) => set(ref, v, o) }),
    collection: (_db, name) => ({ name }),
    where: (f, op, v) => ({ where: [f, op, v] }),
    limit: (n) => ({ limit: n }),
    query: (c, ...cs) => ({ name: c.name, cs }),
    getDocs: async (q) => ({
      docs: [...data.keys()]
        .filter((k) => k.startsWith(q.name + '/'))
        .map(snap)
        .filter((s) => q.cs.filter((c) => c.where).every((c) => s.data()[c.where[0]] === c.where[2])),
    }),
  };
  return { data, fx, get: (p) => clone(data.get(p)) };
}

function makeService(opts = {}) {
  const store = makeStore();
  let clock = NOW;
  const calls = { applied: [], ended: [], synced: [] };
  const svc = createTagTrialService({
    getDb: () => ({}),
    fx: store.fx,
    getGuildId: () => GUILD,
    resolveAccess: async () => opts.access || 'NO_ACCESS',
    resolveUserId: async () => ('userId' in opts ? opts.userId : 'uid_1'),
    applyDayPassRecord: (r) => calls.applied.push(r),
    markDayPassEnded: (...a) => calls.ended.push(a),
    syncDiscordRole: async (e) => calls.synced.push(e),
    fetchDiscordUserAsBot: async (id) => (opts.botUser ? opts.botUser(id) : null),
    dayPassRoleId: 'ROLE_DP',
    now: () => clock,
    log: { log() {}, warn() {}, error() {} },
  });
  return { svc, store, calls, setNow: (t) => { clock = t; } };
}

console.log('\n=== DISCORD SERVER-TAG TRIAL INVARIANTS ===\n');

// ---------------------------------------------------------------------------
console.log('[1] Tag state is read only from what Discord actually returned');
check('snowflake decodes to the documented creation time', discordAccountCreatedAtMs(OLD_DISCORD_ID) === 1462015105796);
check('a non-snowflake id decodes to null', discordAccountCreatedAtMs('abc') === null);
check('our guild + identity_enabled true -> EQUIPPED', readServerTagState(tagged(), GUILD) === 'EQUIPPED');
check('our guild + identity_enabled false (manually removed) -> NOT_EQUIPPED', readServerTagState(tagged(GUILD, false), GUILD) === 'NOT_EQUIPPED');
check('our guild + identity_enabled null (cleared by Discord) -> NOT_EQUIPPED', readServerTagState(tagged(GUILD, null), GUILD) === 'NOT_EQUIPPED');
check('another server\'s tag -> NOT_EQUIPPED', readServerTagState(tagged('999999999999999999'), GUILD) === 'NOT_EQUIPPED');
check('primary_guild: null -> NOT_EQUIPPED', readServerTagState({ id: 'x', primary_guild: null }, GUILD) === 'NOT_EQUIPPED');
check('primary_guild key absent -> UNKNOWN, never NOT_EQUIPPED', readServerTagState({ id: 'x' }, GUILD) === 'UNKNOWN');
check('no user object -> UNKNOWN', readServerTagState(null, GUILD) === 'UNKNOWN');

// ---------------------------------------------------------------------------
console.log('\n[2] Eligibility rules');
const elig = (o) => evaluateTagTrialEligibility({ tagState: 'EQUIPPED', discordUserId: OLD_DISCORD_ID, nowMs: NOW, access: 'NO_ACCESS', ...o });
check('eligible: tag on, old account, no access', elig({}).eligible === true);
check('tag not equipped refuses', elig({ tagState: 'NOT_EQUIPPED' }).reason === 'TAG_NOT_EQUIPPED');
check('unknown tag state refuses (never grants on missing data)', elig({ tagState: 'UNKNOWN' }).reason === 'TAG_STATE_UNKNOWN');
check('29-day-old Discord account refuses', elig({ discordUserId: snowflakeAt(NOW - 29 * DAY) }).reason === 'DISCORD_ACCOUNT_TOO_NEW');
check('31-day-old Discord account is allowed', elig({ discordUserId: snowflakeAt(NOW - 31 * DAY) }).eligible === true);
check('live paid access refuses', elig({ access: 'HAS_ACCESS' }).reason === 'ALREADY_HAS_ACCESS');
check('unresolved entitlement refuses rather than guesses', elig({ access: 'UNRESOLVED' }).reason === 'ENTITLEMENT_UNRESOLVED');

// ---------------------------------------------------------------------------
console.log('\n[3] The grant is honest');
const rec = buildTagTrialDayPassRecord({ email: 'a@x.com', userId: 'uid_1', discordUserId: OLD_DISCORD_ID, guildId: GUILD, nowMs: NOW, discordRoleId: 'R' });
check('typed TAG_TRIAL, not DAY_PASS', rec.entitlementType === 'TAG_TRIAL');
check('lasts exactly 72 hours', Date.parse(rec.expiresAt) - NOW === 72 * HOUR);

// ---------------------------------------------------------------------------
console.log('\n[3b] Launch promo: 72h before the deadline, 24h at and after it');
const PROMO_END = Date.parse(TAG_TRIAL_PROMO_ENDS_AT);
check('the promo deadline is midnight Eastern ending 2026-09-11', TAG_TRIAL_PROMO_ENDS_AT === '2026-09-12T04:00:00.000Z');
check('a claim 1ms before the deadline is worth 72 hours', tagTrialDurationHoursAt(PROMO_END - 1) === 72);
check('a claim at the deadline is worth 24 hours', tagTrialDurationHoursAt(PROMO_END) === 24);
check('a claim a week later is worth 24 hours', tagTrialDurationHoursAt(PROMO_END + 7 * DAY) === 24);
{
  const late = buildTagTrialDayPassRecord({ email: 'a@x.com', userId: 'uid_1', discordUserId: OLD_DISCORD_ID, guildId: GUILD, nowMs: PROMO_END + HOUR, discordRoleId: 'R' });
  check('a record granted after the deadline expires after exactly 24 hours', Date.parse(late.expiresAt) - (PROMO_END + HOUR) === 24 * HOUR);
  check('its duration label says 24 hours', late.duration === '24 hours');
  const early = buildTagTrialDayPassRecord({ email: 'a@x.com', userId: 'uid_1', discordUserId: OLD_DISCORD_ID, guildId: GUILD, nowMs: PROMO_END - HOUR, discordRoleId: 'R' });
  check('a record granted before the deadline expires after exactly 72 hours', Date.parse(early.expiresAt) - (PROMO_END - HOUR) === 72 * HOUR);
}
{
  const before = tagTrialOfferAt(PROMO_END - HOUR);
  const after = tagTrialOfferAt(PROMO_END + HOUR);
  check('offer before the deadline: promo active, 72h', before.promo.active === true && before.durationHours === 72 && before.promo.endsAt === TAG_TRIAL_PROMO_ENDS_AT);
  check('offer after the deadline: promo inactive, 24h', after.promo.active === false && after.durationHours === 24 && after.standardDurationHours === 24);
  check('the public offer carries no account data', Object.keys(before).sort().join(',') === 'durationHours,minDiscordAccountAgeDays,promo,standardDurationHours');
}
{
  const { svc, setNow } = makeService();
  setNow(PROMO_END + 2 * HOUR);
  const late = await svc.claim({ vixyEmail: 'late@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('the service grants 24 hours to a claim made after the deadline', late.granted === true && Date.parse(late.expiresAt) - (PROMO_END + 2 * HOUR) === 24 * HOUR);
}

console.log('\n[3c] Site-wide announcement is driven by the server offer');
{
  const serverSrc = R('server.ts');
  const bannerSrc = R('src/components/TagTrialPromoBanner.tsx');
  const cardSrc = R('src/components/DiscordTagTrialOffer.tsx');
  const appSrc = R('src/App.tsx');
  check('a public offer route serves the server-computed offer', /app\.get\("\/api\/discord\/tag-trial-offer"[\s\S]{0,200}tagTrialOfferAt\(Date\.now\(\)\)/.test(serverSrc));
  check('the offer route reads no identity', !/authenticateSession|req\.(query|body|headers)/.test(serverSrc.slice(serverSrc.indexOf('app.get("/api/discord/tag-trial-offer"'), serverSrc.indexOf('app.get("/api/discord/tag-trial-status"'))));
  check('the tag segment shows only while the server says the promo is active', /const tagActive =\s*!!offer && offer\.promo\.active && Number\.isFinite\(endsMs\) && left > 0;/.test(bannerSrc));
  check('the tag segment hides itself at the server deadline', /left > 0/.test(bannerSrc) && /\{tagActive && !tagDismissed && \(/.test(bannerSrc));
  check('the banner shows no hardcoded duration', !/\b3 days\b|\b72\b|\b1 day\b|\b24 hours\b/.test(bannerSrc));
  check('the banner is mounted site-wide in App', /<TagTrialPromoBanner/.test(appSrc));
  check('the offer card no longer defaults to 72 hours', !/durationHours \?\? 72/.test(cardSrc));
  // "Sat 12:00 AM EDT" read as Saturday night. Both surfaces show the last
  // minute a claim still counts instead.
  const lastMinute = new Date(Date.parse(TAG_TRIAL_PROMO_ENDS_AT) - 60 * 1000).toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  check('the launch deadline renders as the last valid minute (Fri, 11:59 PM EDT), not "Sat 12:00 AM"', lastMinute === 'Fri, 11:59 PM EDT', lastMinute);
  check('the card and banner both format the deadline through formatClaimDeadline (ms - 60s)',
    /export function formatClaimDeadline[\s\S]{0,200}new Date\(ms - 60 \* 1000\)/.test(cardSrc) &&
    /formatClaimDeadline\(offer\.promo\.endsAt\)/.test(cardSrc) && /formatClaimDeadline\(endsMs\)/.test(bannerSrc) &&
    !/weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' \}\)/.test(bannerSrc));
  check('the card tells people exactly where the tag is set in Discord',
    /User Settings → Profiles → Server Tag/.test(cardSrc) && /TAG_NOT_EQUIPPED:[^\n]*User Settings → Profiles → Server Tag/.test(cardSrc));
  check('the card states the removal rule and that it is checked hourly',
    /we check it every hour, and removing it[\s\S]{0,20}ends the trial/.test(cardSrc));
}
check('every Stripe/payment field is null', ['stripePaymentStatus', 'stripePaymentLink', 'stripePaymentId', 'stripeCheckoutSessionId', 'stripeEventId', 'stripePriceId'].every((k) => k in rec && rec[k] === null));
check('carries no grace/compensation flag', !('troubleshootingGraceApplied' in rec) && !('compensationApplied' in rec));
check('no undefined values (Admin SDK rejects them)', Object.values(rec).every((v) => v !== undefined));

// ---------------------------------------------------------------------------
console.log('\n[4] Claim: grant once, then never again');
{
  const { svc, store, calls } = makeService();
  const r = await svc.claim({ vixyEmail: 'A@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('claim granted', r.granted === true, JSON.stringify(r));
  const dp = store.get('day_passes/a@x.com');
  check('day_passes/{email} holds the TAG_TRIAL record', dp && dp.entitlementType === 'TAG_TRIAL' && dp.status === 'ACTIVE');
  check('day_passes/{userId} mirrors it', store.get('day_passes/uid_1')?.entitlementType === 'TAG_TRIAL');
  check('ledger by Discord id written', store.get(`${C.byDiscordId}/${OLD_DISCORD_ID}`)?.status === 'ACTIVE');
  check('ledger by email written', store.get(`${C.byEmail}/a@x.com`)?.discordUserId === OLD_DISCORD_ID);
  check('attempt recorded as GRANTED', store.get(`${C.attempts}/a@x.com`)?.outcome === 'GRANTED');
  check('in-memory cache updated', calls.applied.length === 1);
  check('Discord role synced via the entitlement-aware sync', calls.synced.includes('a@x.com'));

  const again = await svc.claim({ vixyEmail: 'b@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('same Discord account, different VIXY account -> ALREADY_CLAIMED', again.reason === 'ALREADY_CLAIMED');
  check('...and no pass was written for the second account', !store.data.has('day_passes/b@x.com'));
  const again2 = await svc.claim({ vixyEmail: 'a@x.com', discordUserId: OTHER_OLD_ID, discordUser: tagged() });
  check('same VIXY account, different Discord account -> ALREADY_CLAIMED', again2.reason === 'ALREADY_CLAIMED');
  const st = await svc.status('a@x.com');
  check('status reports the active trial', st.claimed === true && st.trial.status === 'ACTIVE');
}
{
  const { svc, store } = makeService();
  const r = await svc.claim({ vixyEmail: 'c@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged(GUILD, false) });
  check('tag removed at claim time -> refused', r.granted === false && r.reason === 'TAG_NOT_EQUIPPED');
  check('...nothing granted', !store.data.has('day_passes/c@x.com'));
  check('...refusal recorded for the UI', store.get(`${C.attempts}/c@x.com`)?.reason === 'TAG_NOT_EQUIPPED');
  const r2 = await svc.claim({ vixyEmail: 'c@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('a refused attempt does not consume the one-time claim', r2.granted === true);
}
{
  const { svc, store } = makeService({ access: 'HAS_ACCESS' });
  const r = await svc.claim({ vixyEmail: 'd@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('paying account refused', r.reason === 'ALREADY_HAS_ACCESS' && !store.data.has(`${C.byDiscordId}/${OLD_DISCORD_ID}`));
}

// ---------------------------------------------------------------------------
console.log('\n[5] Existing purchase records are preserved, never clobbered');
{
  const { svc, store } = makeService();
  const expiredPaid = { entitlementType: 'DAY_PASS', status: 'EXPIRED', expiresAt: new Date(NOW - 5 * DAY).toISOString(), stripePaymentStatus: 'PAID', stripePaymentId: 'pi_1' };
  store.data.set('day_passes/e@x.com', expiredPaid);
  const r = await svc.claim({ vixyEmail: 'e@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('past buyer (expired pass) may claim', r.granted === true);
  check('the prior purchase is copied into the ledger', store.get(`${C.byDiscordId}/${OLD_DISCORD_ID}`)?.priorDayPass?.stripePaymentId === 'pi_1');
  check('the trial record carries no leftover PAID status', store.get('day_passes/e@x.com').stripePaymentStatus === null);
}
{
  const { svc, store } = makeService();
  const livePaid = { entitlementType: 'DAY_PASS', status: 'ACTIVE', expiresAt: new Date(NOW + 5 * HOUR).toISOString(), stripePaymentId: 'pi_live' };
  store.data.set('day_passes/f@x.com', livePaid);
  const r = await svc.claim({ vixyEmail: 'f@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('a live pass found in the transaction refuses', r.reason === 'ALREADY_HAS_ACCESS');
  check('...and is left untouched', store.get('day_passes/f@x.com').stripePaymentId === 'pi_live');
  check('...and the one-time claim is not consumed', !store.data.has(`${C.byDiscordId}/${OLD_DISCORD_ID}`));
}

// ---------------------------------------------------------------------------
console.log('\n[6] Hourly re-check ends a trial only on a definite answer');
async function claimedService(botUser) {
  const s = makeService({ botUser });
  await s.svc.claim({ vixyEmail: 'g@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  s.setNow(NOW + 2 * HOUR);
  return s;
}
{
  const { svc, store, calls } = await claimedService(() => ({ id: OLD_DISCORD_ID }));
  const out = await svc.recheckActiveTrials();
  check('bot view without primary_guild -> counted UNKNOWN', out.unknown === 1 && out.primaryGuildFieldPresent === 0);
  check('...trial stays ACTIVE', store.get(`${C.byDiscordId}/${OLD_DISCORD_ID}`).status === 'ACTIVE');
  check('...access stays ACTIVE', store.get('day_passes/g@x.com').status === 'ACTIVE' && calls.ended.length === 0);
}
{
  const { svc, store } = await claimedService(() => null);
  const out = await svc.recheckActiveTrials();
  check('failed bot request -> UNKNOWN, no revocation', out.unknown === 1 && store.get('day_passes/g@x.com').status === 'ACTIVE');
}
{
  const { svc, store } = await claimedService(() => tagged());
  const out = await svc.recheckActiveTrials();
  check('still equipped -> stays active', out.equipped === 1 && out.primaryGuildFieldPresent === 1 && store.get('day_passes/g@x.com').status === 'ACTIVE');
  check('...last check recorded', store.get(`${C.byDiscordId}/${OLD_DISCORD_ID}`).lastTagState === 'EQUIPPED');
}
{
  const { svc, store, calls } = await claimedService(() => tagged(GUILD, false));
  const out = await svc.recheckActiveTrials();
  check('tag removed -> trial ended', out.endedTagRemoved === 1);
  check('...ledger says why', store.get(`${C.byDiscordId}/${OLD_DISCORD_ID}`).endedReason === 'TAG_REMOVED');
  check('...access record expired (email + uid docs)', store.get('day_passes/g@x.com').status === 'EXPIRED' && store.get('day_passes/uid_1').status === 'EXPIRED');
  check('...in-memory cache expired', calls.ended.length === 1);
  check('...Discord role re-synced, not blindly stripped', calls.synced.filter((e) => e === 'g@x.com').length === 2);
  const again = await svc.recheckActiveTrials();
  check('an ended trial is not re-checked', again.checked === 0);
  const reclaim = await svc.claim({ vixyEmail: 'g@x.com', discordUserId: OLD_DISCORD_ID, discordUser: tagged() });
  check('re-equipping cannot re-claim', reclaim.reason === 'ALREADY_CLAIMED');
}
{
  const { svc, store, setNow } = await claimedService(() => tagged());
  setNow(NOW + 73 * HOUR);
  const out = await svc.recheckActiveTrials();
  check('past 72h -> ledger EXPIRED', out.expired === 1 && store.get(`${C.byDiscordId}/${OLD_DISCORD_ID}`).status === 'EXPIRED');
}
{
  const { svc, store } = await claimedService(() => tagged(GUILD, false));
  const paid = { entitlementType: 'DAY_PASS', status: 'ACTIVE', expiresAt: new Date(NOW + 20 * HOUR).toISOString(), stripePaymentId: 'pi_after' };
  store.data.set('day_passes/g@x.com', paid);
  store.data.set('day_passes/uid_1', paid);
  await svc.recheckActiveTrials();
  check('a day pass bought during the trial is NOT expired by ending the trial',
    store.get('day_passes/g@x.com').status === 'ACTIVE' && store.get('day_passes/uid_1').status === 'ACTIVE');
}

// ---------------------------------------------------------------------------
console.log('\n[7] Wiring in the real sources');
const server = R('server.ts');
const oauth = R('src/bot/discordOAuth.ts');
const api = R('src/services/api.ts');
const vercel = JSON.parse(R('vercel.json'));

check('connect only accepts the whitelisted tag_trial purpose',
  /requestedPurpose === "tag_trial" \? "tag_trial" : null/.test(oauth));
check('purpose is bound into the single-use OAuth state, not trusted from the callback URL',
  /purpose[\s\S]{0,40}stateDoc|stateDoc[\s\S]{0,400}purpose/.test(oauth) && !/req\.query\.purpose[\s\S]{0,80}claim\(/.test(oauth));
check('the callback passes Discord\'s own user object (with primary_guild) to the claim',
  /discordUser:\s*discordUserObject/.test(oauth) && /discordUserObject\s*=\s*me/.test(oauth));
check('the tag-trial result page only echoes a sanitised reason code',
  /replace\(\/\[\^A-Za-z0-9_\]\/g,\s*""\)/.test(oauth));
check('server wires the tag-trial service into the callback',
  /createDiscordCallbackHandler\([\s\S]{0,700}tagTrialService/.test(server));
check('status endpoint is session-authenticated',
  /"\/api\/discord\/tag-trial-status"[\s\S]{0,300}authenticateSession\(req\)/.test(server));
check('hourly re-check cron is scheduled', (vercel.crons || []).some((c) => c.path === '/api/cron/tag-trial-check'));
check('the re-check route exists', /"\/api\/cron\/tag-trial-check"/.test(server));
check('the hidden +3 day grace never extends a tag trial',
  /!dayPassRecord\.troubleshootingGraceApplied\s*&&\s*dayPassRecord\.entitlementType !== "TAG_TRIAL"/.test(server));
check('on-demand pass expiry re-syncs Discord through the entitlement-aware path (subscribers keep their role)',
  /DAY PASS ON-DEMAND EXPIRED[\s\S]{0,600}syncUserEntitlementToDiscord\(dayPassRecord\.email\)/.test(server));
check('the entitlement payload tells the UI which kind of pass this is',
  /stripeSessionId: dayPassRecord\?\.stripeCheckoutSessionId,\s*entitlementType: dayPassRecord\?\.entitlementType \|\| null/.test(server));
check('a LIVE pass payload also carries entitlementType (a live trial is labelled a free trial, not a Stripe card)',
  /dayPass: \{\s*active: true,[\s\S]{0,400}entitlementType: dayPassRecord\.entitlementType \|\| null/.test(server));
const app = R('src/App.tsx');
check('a tag trial the server ended early is not re-opened by its original expiresAt',
  /tagTrialEndedByServer =\s*mergedEnt\?\.dayPass\?\.active === false && mergedEnt\?\.dayPass\?\.entitlementType === 'TAG_TRIAL'/.test(app) &&
  /!tagTrialEndedByServer && mergedEnt\?\.dayPass\?\.expiresAt/.test(app));
check('an open tab re-checks access (5-minute timer + tab focus), so removing the tag locks the terminal',
  /entitlementRefreshTick\]\);/.test(app) && /setInterval\(bump, 5 \* 60 \* 1000\)/.test(app) && /visibilitychange/.test(app));
check('a failed background re-check never locks a user',
  /if \(isBackgroundRecheck && !entData\) return;/.test(app));
check('the frontend starts the claim through the session-bound OAuth starter',
  /getDiscordAuthUrlSecure\(purpose\?:\s*'tag_trial'\)/.test(api) && /getDiscordAuthUrlSecure\('tag_trial'\)/.test(R('src/components/DiscordTagTrialOffer.tsx')));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
