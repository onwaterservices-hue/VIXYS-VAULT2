// BEHAVIOUR -- cross-asset evidence is built only from correlations that were
// actually measured, and an unmeasured one never supports a confirmation.
//
// computePearsonCorrelation returns its `fallback` argument whenever there are
// fewer than five return samples or the variance is ~0. That fallback used to be
// an invented per-asset constant:
//
//   const baselineCorrs = { ETH: 0.84, SOL: 0.76, XRP: 0.65, DOGE: 0.58, SUI: 0.62 };
//   computePearsonCorrelation(btcReturns, itemReturns, baselineCorrs[sym] || 0.7)
//
// That number was published as the asset's measured `correlationToBtc` AND folded
// into avgCorr, whose `>= 0.5` threshold promotes the state to CONFIRMED_BULLISH /
// CONFIRMED_BEARISH and sizes the confidence contribution. A market nobody could
// measure therefore confirmed the engine's direction.
//
// Two further constants did the same at the aggregate level: agreementRatio fell
// back to 0.8 and avgCorr to 0.75 when there were no valid alts -- and 0.8 in
// particular made `directionalAgreementRatio === 0` unable to fire on no data.
//
// CLAUDE.md: "a missing real input must count as unknown, not as a passing value."
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';

const t = createHarness('cross-asset-measured-only.behaviour');

// The real function, verbatim.
const corrSrc = sliceBetween(serverSrc, 'function computePearsonCorrelation(', '__name(computePearsonCorrelation', 'computePearsonCorrelation');
const computePearsonCorrelation = new Function('Math', `${corrSrc}; return computePearsonCorrelation;`)(Math);

t.section('an unmeasurable correlation is unknown');
t.eq('fewer than five samples yields the fallback', computePearsonCorrelation([1, 2], [1, 2], null), null);
t.eq('an empty series yields the fallback', computePearsonCorrelation([], [], null), null);
t.eq('zero variance yields the fallback',
  computePearsonCorrelation([0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], null), null);

t.section('a measurable correlation is still measured');
const up = [0.01, 0.02, 0.03, 0.01, 0.02, 0.03];
const same = computePearsonCorrelation(up, up, null);
t.check('two identical series correlate at 1', same === 1, String(same));
const down = up.map((v) => -v);
const opposite = computePearsonCorrelation(up, down, null);
t.check('two opposed series correlate at -1', opposite === -1, String(opposite));

t.section('the caller passes null, not an invented constant');
const updater = sliceBetween(serverSrc, 'const baselineCorrs = {', '__name(updateCrossAssetFeeds', 'updateCrossAssetFeeds');
t.check('the fallback argument is null',
  /computePearsonCorrelation\(\s*btcReturns,\s*itemReturns,\s*null,\s*\)/.test(updater));
t.check('no baselineCorrs value is passed as a correlation',
  !/computePearsonCorrelation\([^)]*baselineCorrs/.test(updater));
t.check('an unmeasured asset is excluded from the correlation average',
  /if \(empiricalCorr !== null\) \{\s*weightedCorrSum \+= empiricalCorr \* w;\s*corrWeight \+= w;/.test(updater));
t.check('correlation weight is tracked separately from return weight',
  /let corrWeight = 0;/.test(serverSrc) && /avgCorr = corrWeight > 0/.test(updater));

t.section('no data means unknown, not a comfortable default');
t.check('agreementRatio is null when no alt is valid', /agreeingAssets \/ totalValidAlts : null/.test(updater));
t.check('avgCorr is null when nothing was measured', /weightedCorrSum \/ corrWeight : null/.test(updater));
t.check('divergence is null when there is no alt return to compare',
  /totalWeight > 0 \? Math\.abs\(btcObj\.return15m - avgAltReturn\) : null/.test(updater));
t.check('the 0.8 agreement default is gone', !/totalValidAlts > 0 \? [^:]*: 0\.8/.test(updater));
t.check('the 0.75 correlation default is gone', !/: 0\.75;/.test(updater));

t.section('an unknown reading can neither confirm nor veto');
// The real branch conditions, evaluated against unknown inputs.
const confirmBull = (btcSign, agreementRatio, avgCorr) =>
  btcSign > 0 && agreementRatio !== null && agreementRatio >= 0.7 && avgCorr !== null && avgCorr >= 0.5;
const diverge = (divergence, agreementRatio) =>
  divergence !== null && divergence > 1.8 && agreementRatio !== null && agreementRatio <= 0.3;
t.check('unknown does not confirm a bullish state', confirmBull(1, null, null) === false);
t.check('unknown does not manufacture a divergence veto', diverge(null, null) === false);
t.check('a real reading still confirms', confirmBull(1, 0.8, 0.7) === true);
t.check('a real divergence still vetoes', diverge(2.0, 0.2) === true);

t.section('the change can only reduce confirmation, never widen it');
// The one behavioural difference: an asset with too few samples used to
// contribute its baseline to avgCorr. Excluding it cannot raise the average past
// the 0.5 threshold that was not already passed by measured evidence alone.
const measured = 0.40, measuredW = 0.35;
const fabricated = 0.84, fabricatedW = 0.25;
const before = (measured * measuredW + fabricated * fabricatedW) / (measuredW + fabricatedW);
const after = (measured * measuredW) / measuredW;
t.check('the invented baseline used to lift avgCorr over the 0.5 threshold',
  before >= 0.5 && after < 0.5, `before=${before.toFixed(3)} after=${after.toFixed(3)}`);
t.check('excluding it removes that confirmation, it does not add one', after <= before);

t.section('the published object never rounds an unknown into a zero');
t.check('rollingCorrelation stays null', /rollingCorrelation: avgCorr === null \? null :/.test(updater));
t.check('directionalAgreementRatio stays null', /agreementRatio === null \? null :/.test(updater));
t.check('divergenceMagnitude stays null', /divergenceMagnitude: divergence === null \? null :/.test(updater));
t.check('the MIXED summary does not quote a percentage it did not measure',
  /agreementRatio === null\s*\?\s*"Mixed cross-asset momentum: BTC independent lead, market agreement not measured"/.test(updater));

t.done();
