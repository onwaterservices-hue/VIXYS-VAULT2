// REGRESSION TESTS -- 15M SETTLEMENT INTEGRITY (P0)
//
// Executes the REAL validateSettlementPrice and the REAL entry guard of
// checkAndSettle15mCycle, extracted verbatim from server.ts. No
// reimplementation, no network, no Firestore.
//
// THE BUG THESE GUARD
//   /api/signal computed
//       const spot = asset === "BTC" ? currentBtcPrice : 100;
//   and passed it to checkAndSettle15mCycle, which the file itself documents as
//   "authoritative for lock settlement and persistent outcome generation".
//   A request for any non-BTC asset therefore settled the live BTC cycle at a
//   literal $100: actualOutcome = (100 >= strike) ? "UP" : "DOWN" is always
//   DOWN, so every open lock was graded a loss, and the same value was rounded
//   into the NEXT cycle's strike (current15mStrikePrice = round(100/10)*10).
//
//   It was reachable from the product, not just by hand: LiveDashboard and
//   StarterDeskView call useLiveSignal(selectedAsset), so selecting the ETH or
//   SOL tab issued /api/signal?asset=ETH.
//
// The endpoint is fixed AND the authoritative function now validates its own
// input, so a future caller cannot reintroduce the same class of bug.
import { serverSrc, extractFn, createHarness } from './_engineSource.mjs';

const t = createHarness('settlement-integrity.invariants');

// ---------------------------------------------------------------------------
// PART A -- the real validateSettlementPrice
// ---------------------------------------------------------------------------
const validateSrc = extractFn('validateSettlementPrice', 'function validateSettlementPrice(price)');

function makeValidator(feedHealth, nowMs = Date.now()) {
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(nowMs); else super(...a); }
    static now() { return nowMs; }
  }
  return new Function(
    'marketFeedHealth', 'SETTLEMENT_MAX_PRICE_AGE_MS', 'SETTLEMENT_MAX_DEVIATION_PCT',
    'Date', 'Math', 'Number', 'JSON', '__name',
    `${validateSrc}; return validateSettlementPrice;`,
  )(feedHealth, 6e4, 10, FakeDate, Math, Number, JSON, (f) => f);
}

const NOW = 1788930000000;
const healthy = { lastRealPrice: 78500, lastRealPriceTs: NOW - 2000 };

t.section('PART A1: the $100 sentinel is rejected against a real BTC price');
const v = makeValidator(healthy, NOW);
const sentinel = v(100);
t.eq('spot=100 -> rejected', sentinel.ok, false);
t.check('spot=100 -> reason names the deviation', /PRICE_DEVIATES_FROM_OBSERVED/.test(sentinel.reason), sentinel.reason);
// The whole point: this exact call used to settle a live cycle.
t.check('spot=100 reason records both prices', sentinel.reason.includes('100') && sentinel.reason.includes('78500'), sentinel.reason);

t.section('PART A2: other impossible values are rejected');
for (const bad of [0, -1, -78500, NaN, Infinity, -Infinity, null, undefined, '78500', {}, []]) {
  const r = v(bad);
  t.eq(`spot=${JSON.stringify(bad) ?? String(bad)} -> rejected`, r.ok, false);
}
t.check('non-numeric reason is distinct from deviation reason',
  /NOT_A_POSITIVE_FINITE_NUMBER/.test(v(NaN).reason), v(NaN).reason);

t.section('PART A3: a genuine price is accepted');
for (const good of [78500, 78500 * 1.05, 78500 * 0.95, 78500 * 1.0999, 78500 * 0.9001]) {
  t.eq(`spot=${Math.round(good)} (within 10%) -> accepted`, v(good).ok, true);
}

t.section('PART A4: the deviation boundary');
t.eq('exactly 10% above -> accepted (boundary inclusive)', v(78500 * 1.10).ok, true);
t.eq('10.1% above -> rejected', v(78500 * 1.101).ok, false);
t.eq('10.1% below -> rejected', v(78500 * 0.899).ok, false);

t.section('PART A5: freshness of the observed price');
t.eq('observed price 59s old -> accepted', makeValidator({ ...healthy, lastRealPriceTs: NOW - 59000 }, NOW)(78500).ok, true);
const stale = makeValidator({ ...healthy, lastRealPriceTs: NOW - 61000 }, NOW)(78500);
t.eq('observed price 61s old -> rejected', stale.ok, false);
t.check('stale reason names staleness', /OBSERVED_PRICE_STALE/.test(stale.reason), stale.reason);

t.section('PART A6: a process that has never seen a venue price cannot settle');
// This is the cold-boot case. currentBtcPrice is seeded to a placeholder
// (64161.4) at module load, so it cannot be used to decide whether a real price
// has ever arrived -- which is exactly why the validator uses lastRealPrice.
for (const empty of [
  { lastRealPrice: null, lastRealPriceTs: 0 },
  { lastRealPrice: 78500, lastRealPriceTs: 0 },
  { lastRealPrice: null, lastRealPriceTs: NOW },
]) {
  const r = makeValidator(empty, NOW)(78500);
  t.eq(`no observed price (${JSON.stringify(empty)}) -> rejected`, r.ok, false);
  t.check('reason names the missing observation', /NO_OBSERVED_PRICE_YET/.test(r.reason), r.reason);
}
// And the seed price itself cannot pass on a cold boot.
t.eq('cold boot, seed price 64161.4 -> rejected',
  makeValidator({ lastRealPrice: null, lastRealPriceTs: 0 }, NOW)(64161.4).ok, false);

// ---------------------------------------------------------------------------
// PART B -- checkAndSettle15mCycle fails CLOSED and RECOVERABLY
// ---------------------------------------------------------------------------
t.section('PART B: a rejected price advances no cycle state');
const settleSrc = extractFn('checkAndSettle15mCycle', 'async function checkAndSettle15mCycle(livePrice)');

async function runSettle(livePrice, feedHealth) {
  const state = {
    current15mIntervalStart: 1788929100000,
    current15mStrikePrice: 78500,
    processedSettlements: new Set(),
    errors: [],
  };
  const env = {
    marketFeedHealth: feedHealth,
    SETTLEMENT_MAX_PRICE_AGE_MS: 6e4,
    SETTLEMENT_MAX_DEVIATION_PCT: 10,
    console: { log: () => {}, warn: () => {}, error: (m) => state.errors.push(String(m)) },
    Date, Math, Number, JSON, Set, Boolean, String,
    __name: (f) => f,
    get current15mIntervalStart() { return state.current15mIntervalStart; },
    set current15mIntervalStart(v) { state.current15mIntervalStart = v; },
    processedSettlements: state.processedSettlements,
  };
  // Build a scope where the two mutable module globals are real bindings.
  const keys = ['marketFeedHealth', 'SETTLEMENT_MAX_PRICE_AGE_MS', 'SETTLEMENT_MAX_DEVIATION_PCT',
    'console', 'Date', 'Math', 'Number', 'JSON', 'Set', 'Boolean', 'String', '__name', 'processedSettlements', '__state'];
  const body = `
    let current15mIntervalStart = __state.current15mIntervalStart;
    let current15mStrikePrice = __state.current15mStrikePrice;
    ${validateSrc}
    ${settleSrc}
    return checkAndSettle15mCycle(${JSON.stringify(livePrice)}).then(() => ({
      current15mIntervalStart, current15mStrikePrice,
    }));
  `;
  const fn = new Function(...keys, body);
  // If the guard is intact the function returns before touching anything that
  // needs the wider engine environment. If the guard is REMOVED, execution runs
  // on into the settlement body and throws on the first missing global. That
  // throw is itself the regression signal, so it is captured and reported as a
  // named failure rather than crashing the run with a bare ReferenceError.
  let after, threw = null;
  try {
    after = await fn(
      env.marketFeedHealth, 6e4, 10, env.console, Date, Math, Number, JSON, Set, Boolean, String,
      (f) => f, state.processedSettlements, state,
    );
  } catch (err) {
    threw = err;
    after = { current15mIntervalStart: state.current15mIntervalStart, current15mStrikePrice: state.current15mStrikePrice };
  }
  return { after, state, threw };
}

// A cycle boundary has passed (current15mIntervalStart is the PREVIOUS cycle),
// so an accepted price would roll the cycle and settle. A rejected one must not.
const bad = await runSettle(100, healthy);
t.check('spot=100 -> guard returned before entering the settlement body',
  bad.threw === null,
  bad.threw ? `settlement body executed and threw: ${bad.threw.message} -- the price guard is missing or bypassed` : '');
t.eq('spot=100 -> current15mIntervalStart NOT advanced', bad.after.current15mIntervalStart, 1788929100000);
t.eq('spot=100 -> current15mStrikePrice NOT overwritten to 100', bad.after.current15mStrikePrice, 78500);
t.eq('spot=100 -> nothing marked as settled', bad.state.processedSettlements.size, 0);
t.check('spot=100 -> refusal is logged loudly',
  bad.state.errors.some((e) => e.includes('VIXY_SETTLEMENT_REJECTED')), bad.state.errors.join('|'));

const coldBoot = await runSettle(64161.4, { lastRealPrice: null, lastRealPriceTs: 0 });
t.check('cold boot -> guard returned before entering the settlement body',
  coldBoot.threw === null,
  coldBoot.threw ? `settlement body executed and threw: ${coldBoot.threw.message}` : '');
t.eq('cold boot seed price -> cycle NOT rolled', coldBoot.after.current15mIntervalStart, 1788929100000);
t.eq('cold boot seed price -> strike NOT set from the seed', coldBoot.after.current15mStrikePrice, 78500);

// Recoverability: refusing must leave the rollover retryable, which is exactly
// what "no state advanced" above proves -- the next 3s tick re-enters with the
// same prevIntervalStart and can settle once a good price exists.
t.check('refusal leaves the rollover retryable (no state consumed)',
  bad.after.current15mIntervalStart === 1788929100000 && bad.state.processedSettlements.size === 0);

// ---------------------------------------------------------------------------
// PART C -- the endpoint no longer carries the vector
// ---------------------------------------------------------------------------
t.section('PART C: /api/signal cannot settle and has no sentinel');
// The sentinel expression must not exist as CODE. It survives only inside the
// explanatory comments, so compare against comment-stripped source.
const codeOnly = serverSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
t.check('no `asset === "BTC" ? currentBtcPrice : 100` remains in code',
  !codeOnly.includes('asset === "BTC" ? currentBtcPrice : 100'));
t.check('no literal `: 100;` spot fallback remains in code',
  !/const spot = .*: 100;/.test(codeOnly));

// Exactly one settlement call site, and it is the engine tick.
const settleCalls = (codeOnly.match(/await checkAndSettle15mCycle\(/g) || []).length;
t.eq('exactly one checkAndSettle15mCycle call site', settleCalls, 1);
t.check('the sole call site passes livePrice from the engine tick',
  codeOnly.includes('await checkAndSettle15mCycle(livePrice);'));
t.check('the sole call site is NOT passing a variable named spot',
  !codeOnly.includes('await checkAndSettle15mCycle(spot)'));

// The response tells the caller the cycle is BTC regardless of asset asked for.
t.check('response declares cycleAsset', serverSrc.includes('cycleAsset: "BTC"'));
t.check('response declares cycleAssetMatchesRequest', serverSrc.includes('cycleAssetMatchesRequest'));

t.section('PART C2: the guard is wired into the authoritative function');
t.check('checkAndSettle15mCycle calls validateSettlementPrice',
  /async function checkAndSettle15mCycle\(livePrice\)\s*\{[\s\S]{0,1200}?validateSettlementPrice\(livePrice\)/.test(serverSrc));
t.check('the guard returns before `const now = Date.now()`',
  serverSrc.indexOf('validateSettlementPrice(livePrice)') <
  serverSrc.indexOf('async function checkAndSettle15mCycle(livePrice)') + serverSrc.slice(serverSrc.indexOf('async function checkAndSettle15mCycle(livePrice)')).indexOf('const now = Date.now();'));

t.done();
