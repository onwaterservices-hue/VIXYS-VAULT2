// CHARACTERIZATION -- an in-the-money side gets a measured cushion, not coverage 3.5.
//
// Coverage (expected move / distance still to travel) only means something for
// a side that has not reached the strike. In the money the pipeline set the
// constant coverageRatio 3.5, and the terminal's Volume vector showed "Expected
// move coverage 3.50x" (score 9.5) in 20 of 20 production samples (2026-09-11
// 06:11Z) while the measured cushion was 1.09-1.19 expected moves.
import { serverSrc, sliceBetween, createHarness } from './_engineSource.mjs';
import { transformSync } from 'esbuild';

const t = createHarness('itm-coverage-honesty.characterization');
const code = serverSrc.split('\n').map((l) => l.split('//')[0]).join('\n');

t.section('pipeline (real code)');
const block = sliceBetween(serverSrc, '  const realizedVolFrom = (series) => {', '  const pricesLast20 =', 'vol + feasibility block');
const T0 = 1_800_000_000_000;
const path = (targetPct, stepMs, minutes) => {
  const r = targetPct / 100 / Math.sqrt(900e3 / stepMs); const out = []; let p = 77000;
  for (let i = 0; i * stepMs <= minutes * 60e3; i++) { out.push({ ts: T0 + i * stepMs, price: p }); p *= Math.exp(i % 2 ? -r : r); }
  return out;
};
const run = ({ spot, strike, dir, ticks = path(0.146, 3000, 20) }) => new Function('rollingBtcTicks', 'hydratedBtcCloses', 'now', 'spot', 'strike', 'candidateDir', 'timeRemainingSec',
  `${block}\nreturn { isITM, coverageRatio, cushionRatio, expectedMoveUSD, isStrikeFeasible };`)(ticks, [], T0 + 20 * 60e3, spot, strike, dir, 900);
const itm = run({ spot: 77036, strike: 77000, dir: 'UP' });
t.eq('in the money: coverage is null, not 3.5', itm.coverageRatio, null);
t.check('...cushion = distance held / expected move', itm.cushionRatio === Math.round((36 / itm.expectedMoveUSD) * 100) / 100, `${itm.cushionRatio} vs 36/${itm.expectedMoveUSD}`);
t.eq('...still feasible', itm.isStrikeFeasible, true);
const otm = run({ spot: 77000, strike: 77060, dir: 'UP' });
t.eq('out of the money: no cushion', otm.cushionRatio, null);
t.check('...coverage is measured', typeof otm.coverageRatio === 'number' && otm.coverageRatio === Math.round((otm.expectedMoveUSD / 60) * 100) / 100);
t.eq('in the money with unmeasured vol: no cushion', run({ spot: 77036, strike: 77000, dir: 'UP', ticks: [] }).cushionRatio, null);
t.check('no 3.5 coverage constant remains', !/isITM\s*\?\s*3\.5/.test(code));

t.section('lock quality is unchanged');
{
  const term = (isITM, coverageRatio) => (isITM ? 20 : coverageRatio === null ? 0 : Math.min(20, (coverageRatio / 2) * 20));
  const old = (isITM, coverageRatio) => Math.min(20, ((isITM ? 3.5 : coverageRatio) / 2) * 20);
  t.check('server uses the explicit ITM term', code.includes('(isITM ? 20 : coverageRatio === null ? 0 : Math.min(20, (coverageRatio / 2) * 20))'));
  for (const [isITM, cov] of [[true, null], [false, 0.5], [false, 1.05], [false, 2], [false, 9]]) t.eq(`term identical to before (ITM ${isITM}, coverage ${cov})`, term(isITM, cov), old(isITM, cov));
  t.eq('...and for unmeasured coverage (null/2*20 was 0)', term(false, null), Math.min(20, (null / 2) * 20));
}

t.section('payload and terminal sub-score (real code)');
t.check('payload carries isInTheMoney and cushionRatio', /isInTheMoney: isITM,\s*\n\s*cushionRatio,/.test(serverSrc));
{
  const s0 = serverSrc.indexOf('      subScores: [');
  const s1 = serverSrc.indexOf('    // ---- AUTHORITATIVE LIFECYCLE', s0);
  const sub = serverSrc.slice(s0, s1).trim().replace(/^subScores:\s*/, '').replace(/\]\s*\},?\s*$/, ']');
  const m = { exports: {} };
  new Function('module', 'exports', transformSync(`module.exports = (latestBtc15mPipeline, isLocked, lockedPred, livePred, evidenceDir) => (${sub});`, { loader: 'ts', format: 'cjs' }).code)(m, m.exports);
  const vol = (vm) => m.exports({ volatilityExpectedMove: vm }, false, null, { direction: 'UP' }, 'UP').find((x) => x.name === 'Volume');
  const a = vol({ isInTheMoney: true, coverageRatio: null, cushionRatio: 1.13, isStrikeFeasible: true });
  t.eq('ITM detail names the cushion', a.detail, 'In the money: cushion 1.13x expected move');
  t.eq('ITM score follows the cushion (was 9.5 from 3.5)', a.score, 7.8);
  t.eq('ITM with unmeasured vol has no score', vol({ isInTheMoney: true, coverageRatio: null, cushionRatio: null, isStrikeFeasible: true }).score, null);
  t.eq('OTM detail unchanged', vol({ isInTheMoney: false, coverageRatio: 1.4, cushionRatio: null, isStrikeFeasible: true }).detail, 'Expected move coverage 1.40x');
}

t.done();
