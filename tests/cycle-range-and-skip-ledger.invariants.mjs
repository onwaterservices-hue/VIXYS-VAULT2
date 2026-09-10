// Two defects found by reconciling the live Layer-5 shadow with the replay of
// the same cycles (ENGINE_PROGRESS SESSION 8, 2026-09-10):
//
//  1. SKIP rows were written with active15mCycle.strikePrice, which is 0 on a
//     cold instance (the cycle object is created before the Kalshi strike
//     resolves): 78 of the last 112 SKIP rows carried targetStrike 0, so the
//     rule's would-locks on skipped cycles could not be graded and the live
//     readout only ever graded the biased subset where the engine ALSO locked.
//  2. cycleHigh/cycleLow are instance memory. With 60–140 short-lived
//     instances per cycle most see only the range since their own boot, bin
//     volatility LOW, and reach cells (600|3|M) the full-range replay never
//     reaches — two of which lost live on 2026-09-10. A partial range is now
//     hydrated from Coinbase 1-minute candles and, until then, the
//     strike-side probability is UNKNOWN rather than low.
import { serverSrc, sliceBetween, extractFn, buildStrikeSideHelper, createHarness } from './_engineSource.mjs';
const t = createHarness('cycle-range-and-skip-ledger.invariants');

t.section('1. the strike-side helper fails closed on a partial range');
const helper = buildStrikeSideHelper('off', 0.95);
const full = helper(64100, 64000, 720, 64150, 63990, null, true);
const partial = helper(64100, 64000, 720, 64150, 63990, null, false);
t.check('complete range -> a cell is looked up (p number or INSUFFICIENT_SAMPLE with coordinates)', typeof full.key === 'string');
t.eq('partial range -> p null', partial.p, null);
t.eq('partial range -> reason PARTIAL_CYCLE_RANGE', partial.reason, 'PARTIAL_CYCLE_RANGE');
const legacy = helper(64100, 64000, 720, 64150, 63990, null);
t.check('rangeComplete defaults to true (older callers, the replay sandbox and the tests are unchanged)', legacy.reason !== 'PARTIAL_CYCLE_RANGE');

t.section('2. the gate passes range provenance and only "instance_partial" is partial');
const gateSrc = extractFn('canLockCurrentCycle', 'function canLockCurrentCycle(livePrice)');
t.check('gate derives rangeComplete from active15mCycle.rangeSource', gateSrc.includes('const rangeComplete = active15mCycle.rangeSource !== "instance_partial";'));
t.check('gate passes rangeComplete into the helper', /active15mCycle\.isLocked \? active15mCycle\.lockedDirection : null,\s*rangeComplete,\s*\)/.test(gateSrc));
t.check('gate keeps the cycle strike current inside the entry window only', gateSrc.includes('if (strike15mResolved && current15mStrikePrice > 0 && effElapsed < 780 && active15mCycle.strikePrice !== current15mStrikePrice) {'));

t.section('3. cold-boot hydration from candles: single-flight, cycle-identity checked, retried');
const hyd = sliceBetween(serverSrc, 'async function hydrateCycleRangeFromCandles(cycleId, intervalStartMs) {', '__name(hydrateCycleRangeFromCandles', 'hydrate');
t.check('fetches Coinbase 1-minute candles from the cycle open', hyd.includes('/products/BTC-USD/candles?granularity=60&start=') && hyd.includes('new Date(intervalStartMs).toISOString()'));
t.check('bounded by a 4s timeout', hyd.includes('4000,'));
t.check('discards the result if the cycle rolled over during the fetch', hyd.includes('if (active15mCycle.cycleId !== cycleId) return;'));
t.check('merges candle high/low with what the instance saw (max/min), never replaces it', hyd.includes('Math.max(active15mCycle.cycleHigh || 0, hi)') && hyd.includes('Math.min(active15mCycle.cycleLow, lo)'));
t.check('marks the range complete only on success', hyd.includes('active15mCycle.rangeSource = "candles+instance";') && !hyd.includes('rangeSource = "instance_from_open"'));
t.check('records the failure on the cycle and leaves the range partial', hyd.includes('active15mCycle.rangeHydrateError = String('));
const tickStart = serverSrc.indexOf('// Range provenance. An instance whose first tick lands');
const tick = tickStart >= 0 ? serverSrc.slice(tickStart, tickStart + 900) : '';
t.check('range provenance block exists once, inside the tick after the range update', tickStart >= 0 && serverSrc.split('// Range provenance. An instance whose first tick lands').length === 2 && serverSrc.lastIndexOf('active15mCycle.cycleLow = active15mCycle.cycleLow > 0 ? Math.min(active15mCycle.cycleLow, livePrice) : livePrice;') < tickStart);
t.check('first tick within 60s of open -> instance_from_open, later -> instance_partial', tick.includes('active15mCycle.rangeSource = elapsedSeconds <= 60 ? "instance_from_open" : "instance_partial";'));
t.check('hydration is triggered only while partial, single-flight per cycle, retried after 20s', tick.includes('active15mCycle.rangeSource === "instance_partial"') && tick.includes('_rangeHydrateCycleId !== active15mCycle.cycleId || now - _rangeHydrateStartedMs > 20e3'));
const rollStart = serverSrc.indexOf('    active15mCycle = {\n      cycleId: currentCycleId,');
t.check('the new cycle object carries no rangeSource (reset at rollover)', rollStart >= 0 && !serverSrc.slice(rollStart, rollStart + 2500).includes('rangeSource'));

t.section('4. SKIP rows carry the real strike and the settled side');
const rollover = sliceBetween(serverSrc, 'const sigId = `sig_skip_${active15mCycle.intervalStart}`;\n      if (!persistentSignalLogs.find((s) => s.id === sigId)) {', '// Same shadow attachment for engine SKIPs', 'rollover skip writer');
t.check('rollover SKIP: targetStrike from the cycle strike (0 only when truly unknown)', rollover.includes('targetStrike: active15mCycle.strikePrice > 0 ? active15mCycle.strikePrice : 0,'));
t.check('rollover SKIP: strike field agrees', rollover.includes('strike: active15mCycle.strikePrice > 0 ? active15mCycle.strikePrice : 0,'));
t.check('rollover SKIP: settledSide is the settlement price vs the strike, null without a strike', rollover.includes('settledSide: active15mCycle.strikePrice > 0 && livePrice > 0 ? (livePrice >= active15mCycle.strikePrice ? "UP" : "DOWN") : null,'));
t.check('rollover SKIP: the engine still made no call (actualOutcome NEUTRAL, wasCorrect false)', rollover.includes('actualOutcome: "NEUTRAL",') && rollover.includes('wasCorrect: false,'));
const markerStart = serverSrc.indexOf('const sigId = `sig_skip_${active15mCycle.intervalStart}`;\n      let skippedLog = persistentSignalLogs.find((s) => s.id === sigId);');
const marker = markerStart >= 0 ? serverSrc.slice(markerStart, serverSrc.indexOf('persistentSignalLogs.unshift(skippedLog);', markerStart)) : '';
t.check('mid-cycle SKIP marker: targetStrike/strike use the same guard', marker.includes('targetStrike: active15mCycle.strikePrice > 0 ? active15mCycle.strikePrice : 0,') && marker.includes('strike: active15mCycle.strikePrice > 0 ? active15mCycle.strikePrice : 0,'));

t.section('4b. a late-booting instance still writes the real strike (from the shared shadow)');
// First production SKIP row after PR #53 (cycle 2026-09-10T15:15Z) carried a
// self-contained would-lock (strike 77,312.26) but targetStrike 0: the writer
// had booted after 780s, when the gate no longer records the strike. The
// strike now rides on every instance's shadow slice and the merged record.
t.check('recorder stamps the strike on the instance slice inside the entry window', serverSrc.includes('if (strike15mResolved && current15mStrikePrice > 0 && effElapsed < 780) sh.strike = current15mStrikePrice;'));
t.check('instance slice carries strike (null when unseen)', serverSrc.includes('strike: typeof sh.strike === "number" && sh.strike > 0 ? sh.strike : null,'));
const mergeSrc = sliceBetween(serverSrc, 'function mergeShadowL5Record(remote, local, engineDecision) {', '__name(mergeShadowL5Record', 'merge');
t.check('merge takes the majority strike across slices', mergeSrc.includes('strikeVotes.set(e.strike, (strikeVotes.get(e.strike) || 0) + 1);') && mergeSrc.includes('strikeInstances: strikeN,'));
{
  const sliceFn = sliceBetween(serverSrc, 'function shadowL5InstanceSlice(sh) {', '__name(shadowL5InstanceSlice', 'slice');
  const merge = new Function('SHADOW_INSTANCE_ID', 'VIXY_LOCK_RULE_BAR', `${sliceFn}; ${mergeSrc}; return mergeShadowL5Record;`)('me', 0.95);
  const remote = { cycleId: 'c', byInstance: { a: { ticks: 10, strike: 77312.26 }, b: { ticks: 5, strike: 77312.26 }, c: { ticks: 3, strike: 77300 }, d: { ticks: 1 } } };
  const m = merge(remote, { cycleId: 'c', ticks: 2 }, 'SKIP');
  t.eq('merged strike is the majority value', m.strike, 77312.26);
  t.eq('merged strikeInstances counts the voters', m.strikeInstances, 2);
  const none = merge({ cycleId: 'c', byInstance: { a: { ticks: 1 } } }, null, 'SKIP');
  t.eq('no slice saw the strike -> null, never invented', none.strike, null);
}
const rollFallback = sliceBetween(serverSrc, 'if (!(skippedLog.targetStrike > 0)) {', 'skippedLog.strikeSource = ', 'skip strike fallback');
t.check('rollover SKIP: strike-0 row takes the merged shadow strike, then the would-lock strike', rollFallback.includes('shMerged.strike') && rollFallback.includes('shMerged.wouldLock.strike') && rollFallback.includes('skippedLog.settledSide = livePrice > 0 ? (livePrice >= mergedStrike ? "UP" : "DOWN") : null;'));

t.section('5. the shadow would-lock is self-contained and the research grader uses the settled side');
const wl = sliceBetween(serverSrc, 'sh.wouldLock = {', 'lockJustSet = true;', 'wouldLock');
t.check('would-lock records the strike it fired against', wl.includes('strike: current15mStrikePrice > 0 ? current15mStrikePrice : null,'));
t.check('would-lock records the spot it fired at', wl.includes('spot: livePrice > 0 ? livePrice : null,'));
t.check('would-lock records the range provenance and size', wl.includes('rangeSource: active15mCycle.rangeSource ?? null,') && wl.includes('rangeBps:'));
const grader = sliceBetween(serverSrc, 'const engineSide = s.decision === "BUY_UP" ? "UP" : s.decision === "BUY_DOWN" ? "DOWN" : null;', 'if (engineLocked) {\n      out.engine.locks += 1;', 'grader outcome');
t.check('grader: lock rows graded by actualOutcome', grader.includes('s.actualOutcome === "UP" || s.actualOutcome === "DOWN" ? s.actualOutcome'));
t.check('grader: SKIP rows graded by settledSide', grader.includes(': s.settledSide === "UP" || s.settledSide === "DOWN" ? s.settledSide'));
t.check('grader: falls back to the would-lock\'s own strike vs settlement price', grader.includes('s.shadowL5?.wouldLock?.strike > 0 && s.settlementPrice > 0'));
t.check('grader: never grades against a strike-0 placeholder', !grader.includes('s.targetStrike'));

t.section('6. the entry-window label agrees with the gate (780s)');
t.check('ENTRY_WINDOW_CLOSED flips at 780s, not 720s', serverSrc.includes('} else if (elapsedSeconds >= 780 && !active15mCycle.isLocked) {') && !serverSrc.includes('} else if (elapsedSeconds >= 720 && !active15mCycle.isLocked) {'));

t.section('7. the prediction center names the partial-range state');
const pc = (await import('fs')).readFileSync(new URL('../src/components/CryptoPredictionCenterView.tsx', import.meta.url), 'utf8');
t.check('PARTIAL_CYCLE_RANGE has its own honest sentence', pc.includes("case 'PARTIAL_CYCLE_RANGE':"));

t.done();
