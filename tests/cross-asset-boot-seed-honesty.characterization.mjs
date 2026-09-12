// CHARACTERIZATION -- the cross-asset context boots as "not measured", and doing
// so changes no lock decision.
//
// latestCrossAssetContext is served publicly on /api/signal as
// `crossAssetContext`. Observed live on 2026-09-12, a cold instance returned:
//
//   "rollingCorrelation": 0.76, "directionalAgreementRatio": 0.8,
//   "divergenceMagnitude": 0.12, "regime": "RANGING_NEUTRAL",
//   "evidenceSummary": "Cross-asset evidence synchronized to BTC leader",
//   "lastUpdated": "<a few ms ago>", "assets": {}
//
// Three correlation statistics, an assertion that evidence was synchronized, and
// a timestamp saying it had just been measured -- with no asset data behind any
// of it, because `assets` was empty. The engine log directly below it in
// server.ts had the identical defect ("three invented entries ... timestamped
// 1-5 seconds before boot") and was fixed; this object was missed.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('cross-asset-boot-seed-honesty.characterization');

// The object literal, taken verbatim: from its declaration to the first `};`.
const START = 'let latestCrossAssetContext = {';
const startIdx = serverSrc.indexOf(START);
if (startIdx < 0 || serverSrc.indexOf(START, startIdx + 1) >= 0) {
  throw new Error('latestCrossAssetContext seed: declaration is not unique');
}
const endIdx = serverSrc.indexOf('\n};', startIdx);
const seedSrc = serverSrc.slice(startIdx, endIdx + 3);
const seed = new Function(`return ${seedSrc.slice(seedSrc.indexOf('{'), seedSrc.lastIndexOf('}') + 1)};`)();

t.section('nothing is claimed as measured at boot');
t.check('assets is empty at boot', Object.keys(seed.assets).length === 0);
for (const field of ['rollingCorrelation', 'directionalAgreementRatio', 'divergenceMagnitude',
                     'btcLeaderReturn15m', 'btcMomentum']) {
  t.check(`${field} is null, not a number`, seed[field] === null, JSON.stringify(seed[field]));
}
t.check('regime is null rather than a named regime', seed.regime === null, JSON.stringify(seed.regime));
t.check('no sentence asserts a reading', seed.evidenceSummary === null, JSON.stringify(seed.evidenceSummary));
t.check('lastUpdated is null, so nothing looks freshly measured',
  seed.lastUpdated === null, JSON.stringify(seed.lastUpdated));
t.check('state says unknown rather than naming a market state',
  seed.state === 'UNKNOWN', JSON.stringify(seed.state));
t.check('the seed is not stamped with a boot timestamp',
  !/lastUpdated:\s*new Date\(\)/.test(seedSrc));

t.section('an unmeasured context gives the engine nothing to lean on');
// contextContribution is the "+X% confidence boost" reported in the summary.
t.check('no confidence contribution before a reading exists', seed.contextContribution === 0);
t.check('no risk penalty invented before a reading exists', seed.riskPenalty === 0);

t.section('the three expressions the gate reads are unchanged in effect');
// The engine reads exactly these. Evaluated against the OLD seeded values and
// the NEW ones, they must agree -- this change is display-only by construction.
const OLD = { state: 'MIXED', riskPenalty: 0, directionalAgreementRatio: 0.8 };
const gate = {
  crossMarketAgrees: (c) => (c?.riskPenalty || 0) < 5,
  isDivergenceState: (c) => c.state === 'BTC_DIVERGENCE',
  agreementIsZero: (c) => c.directionalAgreementRatio === 0,
};
for (const [name, fn] of Object.entries(gate)) {
  const before = fn(OLD);
  const after = fn(seed);
  t.check(`${name}: identical before and after`, before === after, `old=${before} new=${after}`);
}
// And the two composite vetoes built from them.
const veto = (c) => c.state === 'BTC_DIVERGENCE' && c.riskPenalty >= 8 && c.directionalAgreementRatio === 0;
t.check('the BTC_DIVERGENCE veto fires the same way', veto(OLD) === veto(seed), `${veto(OLD)} / ${veto(seed)}`);
const veto2 = (c) => c.state === 'BTC_DIVERGENCE' || (c.directionalAgreementRatio === 0 && c.riskPenalty >= 5);
t.check('the reversal-side veto fires the same way', veto2(OLD) === veto2(seed), `${veto2(OLD)} / ${veto2(seed)}`);

t.section('the live updater still publishes real readings');
t.check('updateCrossAssetFeeds replaces the object wholesale',
  /latestCrossAssetContext = \{[\s\S]{0,900}?assets: assetMap,/.test(serverSrc));
// Still computed rather than seeded -- now guarded so an unmeasured average is
// published as null instead of being rounded into a confident 0.
t.check('its rollingCorrelation is computed, not seeded',
  /rollingCorrelation: avgCorr === null \? null : Math\.round\(avgCorr \* 1e3\) \/ 1e3/.test(serverSrc));
t.check('it stamps lastUpdated only when it has run',
  /lastUpdated: new Date\(\)\.toISOString\(\),\s*\n\s*assets: assetMap/.test(serverSrc));

t.done();
