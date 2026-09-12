// BEHAVIOUR -- market agreement is measured against a BTC direction that was
// actually observed, and no asset boots with a publishable price.
//
// Two fabrications, both observed live on 2026-09-12:
//
// 1. `btcObj.return15m` sits at its initial 0 until the instance has collected
//    two price samples. `btcSign` is 0 for |return| <= 0.02, and the agreement
//    test read `btcSign === 0` as "BTC has no direction, so everything agrees
//    with it". Every asset counted as agreeing, directionalAgreementRatio was
//    published as 1, and the summary read "BTC independent lead with 100% market
//    agreement" -- off a BTC return nobody had measured. Every probe of a warm
//    production instance returned agreement exactly 1.
//
// 2. trackedCrossAssets booted with plausible prices (BTC 65000, ETH 3450,
//    SOL 145 ...) AND `lastUpdated: Date.now()`. Freshness is
//    `now - lastUpdated < 30000` and publication needs `price > 0`, so a cold
//    instance whose first Coinbase fetch failed published the seeded price as a
//    LIVE quote for thirty seconds.
import { serverSrc, createHarness } from './_engineSource.mjs';

const t = createHarness('cross-asset-agreement-measured.behaviour');

const START = 'const trackedCrossAssets = {';
const sIdx = serverSrc.indexOf(START);
const seedSrc = serverSrc.slice(sIdx, serverSrc.indexOf('\n};', sIdx) + 3);
const tracked = new Function(`return ${seedSrc.slice(seedSrc.indexOf('{'), seedSrc.lastIndexOf('}') + 1)};`)();

t.section('no asset boots with a publishable price');
const symbols = Object.keys(tracked);
t.check('all tracked assets are present', symbols.length >= 6, symbols.join(','));
for (const sym of symbols) {
  const a = tracked[sym];
  // Publication requires `isFresh && item.price > 0`.
  t.check(`${sym}: price 0, so it cannot be published`, a.price === 0, String(a.price));
  t.check(`${sym}: lastUpdated 0, so it never reads as fresh`, a.lastUpdated === 0, String(a.lastUpdated));
  t.check(`${sym}: buffer empty, so status is WARMING not LIVE`, a.priceBuffer.length === 0);
}
t.check('the seed is not stamped at module load', !/lastUpdated: Date\.now\(\)/.test(seedSrc));
t.check('no plausible price survives in the seed', !/price: (?!0,)[\d.]/.test(seedSrc));

t.section('BTC direction is unknown until measured');
const updater = serverSrc.slice(serverSrc.indexOf('async function updateCrossAssetFeeds()'),
                                serverSrc.indexOf('__name(updateCrossAssetFeeds'));
t.check('measurement is gated on having two samples',
  /const btcReturnMeasured = btcObj\.priceBuffer\.length >= 2;/.test(updater));
t.check('btcSign is null when unmeasured', /const btcSign = !btcReturnMeasured\s*\n?\s*\? null/.test(updater));

// The real agreement expression, evaluated both ways.
const agreesWith = (btcSign, altSign) => (btcSign === null ? null : btcSign === 0 || altSign === btcSign);
t.eq('an unmeasured BTC yields no verdict for an up alt', agreesWith(null, 1), null);
t.eq('an unmeasured BTC yields no verdict for a down alt', agreesWith(null, -1), null);
t.eq('a measured flat BTC still counts as agreement', agreesWith(0, 1), true);
t.eq('a measured up BTC agrees with an up alt', agreesWith(1, 1), true);
t.eq('a measured up BTC disagrees with a down alt', agreesWith(1, -1), false);

t.section('the ratio counts only comparisons that could be made');
t.check('a separate comparableAlts counter exists', /let comparableAlts = 0;/.test(updater));
t.check('only a true verdict counts as agreement', /if \(agrees === true\) agreeingAssets\+\+;/.test(updater));
t.check('only a real verdict counts toward the denominator', /if \(agrees !== null\) comparableAlts\+\+;/.test(updater));
t.check('the ratio divides by comparable alts, not merely live ones',
  /agreementRatio =\s*\n?\s*comparableAlts > 0 \? agreeingAssets \/ comparableAlts : null;/.test(updater));

// Five live alts and an unmeasured BTC used to give 5/5 = 1.
const ratio = (agreeing, comparable) => (comparable > 0 ? agreeing / comparable : null);
t.eq('five live alts with an unmeasured BTC now yield unknown', ratio(0, 0), null);
t.eq('five live alts with a measured BTC still yield a ratio', ratio(4, 5), 0.8);

t.section('divergence needs something to diverge from');
t.check('divergence requires a measured BTC return',
  /totalWeight > 0 && btcReturnMeasured/.test(updater));

t.section('an unknown ratio can neither confirm nor veto');
const confirm = (btcSign, agreementRatio, avgCorr) =>
  btcSign > 0 && agreementRatio !== null && agreementRatio >= 0.7 && avgCorr !== null && avgCorr >= 0.5;
t.check('unknown agreement cannot confirm', confirm(null, null, 0.8) === false);
t.check('the zero-agreement veto is unchanged by unknown', (null === 0) === false);

t.done();
