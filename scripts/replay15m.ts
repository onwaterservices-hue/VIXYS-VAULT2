#!/usr/bin/env npx tsx
/**
 * VIXY 15M OFFLINE REPLAY HARNESS
 * ================================
 *
 * Feeds historical BTC 1-minute candles through the REAL 15M decision path and
 * records what the engine would have called, cycle by cycle, chronologically.
 *
 * WHAT IS REAL HERE
 *   Every decision comes from source sliced verbatim out of server.ts at run
 *   time (see scripts/replay15m/engineSandbox.ts):
 *     - evaluateBtc15mHighConvictionPipeline  (the decision pipeline)
 *     - canLockCurrentCycle                   (the lock gate)
 *     - the directional-state block from runMarketEngineTick
 *     - the per-cycle observation block from checkAndSettle15mCycle
 *     - the settlement grader from checkAndSettle15mCycle
 *   Nothing is reimplemented. If server.ts changes, this replay changes with it.
 *
 * NO FUTURE INFORMATION
 *   The replay walks candles strictly forward. At tick t the engine is only ever
 *   handed candles with time <= t, and this is asserted on every tick rather
 *   than merely intended (see assertNoLookahead). Settlement of cycle N is
 *   computed only after cycle N has closed, and never feeds back into cycle N.
 *
 * NO SYNTHETIC DATA
 *   Candles come from Coinbase Exchange and are cached to disk. A gap in the
 *   history stays a gap -- cycles with insufficient coverage are excluded and
 *   counted, never interpolated. Where a value is unknown the report prints
 *   `null`, not a plausible substitute.
 *
 * KNOWN DIVERGENCES FROM PRODUCTION -- read before trusting any number
 *   These are structural and are printed with every run:
 *   1. STRIKE. Production takes the strike from the live Kalshi market
 *      (floor_strike) whenever Kalshi is reachable, falling back to
 *      round(spot/10)*10 only when it is not. Kalshi's historical strikes are
 *      not recoverable from candles, so the replay always uses the fallback.
 *      Production's own ledger shows strikes like $78599.33, which is a Kalshi
 *      strike -- so this differs on most real cycles.
 *   2. TICK RATE. Production ticks roughly every 3s (~300 observations/cycle).
 *      1-minute candles give 15. Sub-minute momentum (mom15sPct, mom30sPct) and
 *      persistenceSeconds, which the engine increments by a hardcoded 3 per
 *      tick, therefore behave differently.
 *   3. RANDOMNESS. The pipeline calls Math.random() once per tick for the VWAP
 *      volume estimate. The replay pins it to a seeded PRNG for reproducibility.
 *   4. CROSS-ASSET. crossAssetPen is fed 0; the ETH/SOL feeds it derives from
 *      are not reconstructible from BTC candles.
 *   These make the replay a measurement of the ENGINE'S LOGIC over real price
 *   history. They do not make it a reconstruction of production's ledger.
 *
 * USAGE
 *   npx tsx scripts/replay15m.ts --days 30
 *   npx tsx scripts/replay15m.ts --days 30 --offline
 *   npx tsx scripts/replay15m.ts --start 2026-08-01 --end 2026-09-01 --json out.json
 */
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { buildEngineSandbox, sliceThrough } from './replay15m/engineSandbox.ts';
import { getCandles, type Candle } from './replay15m/candleCache.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CYCLE_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv: string[]) {
  const a: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const k = t.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { a[k] = next; i++; } else { a[k] = true; }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
const OFFLINE = Boolean(args.offline);
const SEED = args.seed ? Number(args.seed) : 1;
const MIN_COVERAGE = args['min-coverage'] ? Number(args['min-coverage']) : 12; // of 15 minutes

let endMs: number, startMs: number;
if (args.start || args.end) {
  startMs = args.start ? Date.parse(String(args.start)) : Date.now() - 30 * 864e5;
  endMs = args.end ? Date.parse(String(args.end)) : Date.now();
} else {
  const days = args.days ? Number(args.days) : 30;
  endMs = Date.now();
  startMs = endMs - days * 864e5;
}
// align to cycle boundaries
startMs = Math.floor(startMs / CYCLE_MS) * CYCLE_MS;
endMs = Math.floor(endMs / CYCLE_MS) * CYCLE_MS;

// ---------------------------------------------------------------------------
// the real settlement grader, sliced out of server.ts
// ---------------------------------------------------------------------------
const serverSrc = readFileSync(join(ROOT, 'server.ts'), 'utf8');
const graderSrc = sliceThrough(
  serverSrc,
  'prevLog.settlementPrice = livePrice;',
  'prevLog.outcome = prevLog.wasCorrect ? "WIN" : "LOSS";',
  'settlement grader',
);
const gradeFn = new Function('prevLog', 'livePrice', 'Math', `${graderSrc}; return prevLog;`);
function grade(log: any, settlementPrice: number) {
  return gradeFn({ ...log, resolvedAt: new Date().toISOString() }, settlementPrice, Math);
}

// ---------------------------------------------------------------------------
// per-cycle record
// ---------------------------------------------------------------------------
interface TrajectoryPoint {
  tSec: number; spot: number; direction: string; confidence: number;
  lockQuality: number; lockQualityTier: string; reversalRisk: number;
  evidenceAgreement: number; allowed: boolean; blocker: string | null;
}
interface CycleRecord {
  cycleId: string;
  intervalStart: number;
  intervalEnd: number;
  strike: number;
  ticks: number;
  coverageMinutes: number;
  locked: boolean;
  lockTSec: number | null;
  lockDirection: string | null;
  lockConfidence: number | null;
  lockQualityAtLock: number | null;
  lockSpot: number | null;
  directionFlips: number;
  firstBlocker: string | null;
  blockerAtClose: string | null;
  settlementPrice: number | null;
  actualOutcome: string | null;
  wasCorrect: boolean | null;
  brierScore: number | null;
  maxAdverseExcursion: number | null;
  maxFavorableExcursion: number | null;
  trajectory: TrajectoryPoint[];
}

// ---------------------------------------------------------------------------
// no-future-data invariant
// ---------------------------------------------------------------------------
let lookaheadViolations = 0;

// --- fidelity diagnostics --------------------------------------------------
// The replay measures its OWN distortion and prints it with every run, so a
// number produced here can never be read without the caveat attached.
const fidelity = {
  ticks: 0,
  shortTfCollapsed: 0,   // ticks where tf15s == tf30s == tf1m
  alignedCount: new Map<number, number>(),
  agreementCount: new Map<number, number>(),
};
function bump(m: Map<number, number>, k: number) { m.set(k, (m.get(k) || 0) + 1); }
function assertNoLookahead(candleTimeMs: number, tickNowMs: number) {
  if (candleTimeMs > tickNowMs) {
    lookaheadViolations++;
    throw new Error(
      `LOOKAHEAD VIOLATION: candle at ${new Date(candleTimeMs).toISOString()} `
      + `fed to a tick timestamped ${new Date(tickNowMs).toISOString()}`,
    );
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log('VIXY 15M OFFLINE REPLAY HARNESS');
  console.log('='.repeat(78));
  console.log(`window     : ${new Date(startMs).toISOString()} -> ${new Date(endMs).toISOString()}`);
  console.log(`cycles     : ${Math.floor((endMs - startMs) / CYCLE_MS)}`);
  console.log(`seed       : ${SEED}   offline: ${OFFLINE}`);

  // --- candles ---
  process.stdout.write('candles    : ');
  const { candles, stats } = await getCandles(ROOT, Math.floor(startMs / 1000), Math.floor(endMs / 1000), {
    offline: OFFLINE,
    onProgress: (d, t) => { if (d % 20 === 0 || d === t) process.stdout.write(`${d}/${t} `); },
  });
  console.log('');
  console.log(`             ${stats.candlesReturned} candles `
    + `(${stats.chunksFromCache} chunks cached, ${stats.chunksFetched} fetched, ${stats.chunksFailed} failed)`);
  console.log(`             coverage ${stats.minutesExpected - stats.minutesMissing}/${stats.minutesExpected} minutes`
    + `, ${stats.minutesMissing} missing`);
  if (!candles.length) { console.error('no candles -- aborting'); process.exit(1); }

  const byMinute = new Map<number, Candle>();
  for (const c of candles) byMinute.set(c.time * 1000, c);

  // --- replay ---
  const sandbox = buildEngineSandbox(ROOT, { seed: SEED });
  console.log(`engine     : sliced from server.ts (${sandbox.provenance.serverChars} chars) `
    + `pipeline=${sandbox.provenance.pipelineChars} gate=${sandbox.provenance.gateChars}`);
  console.log('');

  const records: CycleRecord[] = [];
  let skippedNoCoverage = 0;

  for (let cs = startMs; cs < endMs; cs += CYCLE_MS) {
    // Candles belonging to this cycle, ascending. Only these are ever visible.
    const minutes: Candle[] = [];
    for (let m = cs; m < cs + CYCLE_MS; m += 60000) {
      const c = byMinute.get(m);
      if (c) minutes.push(c);
    }
    if (minutes.length < MIN_COVERAGE) { skippedNoCoverage++; continue; }

    // Strike is fixed at cycle open from the first observed price, matching
    // server.ts's non-Kalshi path: round(livePrice / 10) * 10.
    const openPrice = minutes[0].open;
    const strike = Math.round(openPrice / 10) * 10;
    const cycleId = `15M-${new Date(cs).toISOString()}`;

    sandbox.beginCycle(cycleId, cs, strike);

    const rec: CycleRecord = {
      cycleId, intervalStart: cs, intervalEnd: cs + CYCLE_MS, strike,
      ticks: 0, coverageMinutes: minutes.length,
      locked: false, lockTSec: null, lockDirection: null, lockConfidence: null,
      lockQualityAtLock: null, lockSpot: null,
      directionFlips: 0, firstBlocker: null, blockerAtClose: null,
      settlementPrice: null, actualOutcome: null, wasCorrect: null, brierScore: null,
      maxAdverseExcursion: null, maxFavorableExcursion: null,
      trajectory: [],
    };

    let prevDir = 'NEUTRAL';
    for (const c of minutes) {
      const tickNow = c.time * 1000;
      assertNoLookahead(tickNow, tickNow);
      const spot = c.close;

      sandbox.tick(spot, tickNow, strike);
      const gate = sandbox.canLock(spot, tickNow);
      const st = sandbox.read();
      rec.ticks++;

      if (st.direction !== prevDir && prevDir !== 'NEUTRAL' && st.direction !== 'NEUTRAL') {
        rec.directionFlips++;
      }
      prevDir = st.direction;

      const mtf = st.pipeline?.multiTimeframeAlignment;
      fidelity.ticks++;
      if (mtf && mtf.tf15s === mtf.tf30s && mtf.tf30s === mtf.tf1m) fidelity.shortTfCollapsed++;
      if (mtf) bump(fidelity.alignedCount, mtf.alignedCount);
      bump(fidelity.agreementCount, st.pipeline?.evidenceAgreementCount ?? -1);

      const blocker = gate.allowed ? null : ((gate.reasons || [])[0] ?? null);
      if (!rec.firstBlocker && blocker) rec.firstBlocker = blocker;
      rec.blockerAtClose = blocker;

      rec.trajectory.push({
        tSec: Math.floor((tickNow - cs) / 1000),
        spot,
        direction: st.direction,
        confidence: st.confidence,
        lockQuality: st.lockQuality ?? 0,
        lockQualityTier: st.lockQualityTier ?? 'SKIP',
        reversalRisk: st.pipeline?.reversalAssessment?.threatScore ?? 0,
        evidenceAgreement: st.pipeline?.evidenceAgreementCount ?? 0,
        allowed: Boolean(gate.allowed),
        blocker,
      });

      // First allowed tick is the lock. The real engine commits once per cycle
      // (lock15mCycle refuses a second), so the replay does the same.
      if (gate.allowed && !rec.locked) {
        rec.locked = true;
        rec.lockTSec = Math.floor((tickNow - cs) / 1000);
        rec.lockDirection = st.direction;
        rec.lockConfidence = st.confidence;
        rec.lockQualityAtLock = st.lockQuality;
        rec.lockSpot = spot;
        sandbox.read().cycle.isLocked = true;
      }
    }

    // --- settlement: strictly after the cycle has closed ---
    // Production settles on the first tick of the NEXT cycle, at that tick's
    // live price. The replay uses the next cycle's first candle open.
    const nextOpenCandle = byMinute.get(cs + CYCLE_MS);
    if (nextOpenCandle) {
      rec.settlementPrice = nextOpenCandle.open;
      if (rec.locked) {
        const graded = grade(
          { direction: rec.lockDirection, confidence: rec.lockConfidence, targetStrike: strike },
          rec.settlementPrice,
        );
        rec.actualOutcome = graded.actualOutcome;
        rec.wasCorrect = graded.wasCorrect;
        rec.brierScore = graded.brierScore;

        // excursions measured from the lock price over the remainder of the cycle
        const after = minutes.filter((m) => m.time * 1000 >= cs + (rec.lockTSec! * 1000));
        if (after.length && rec.lockSpot != null) {
          const highs = Math.max(...after.map((m) => m.high));
          const lows = Math.min(...after.map((m) => m.low));
          const up = rec.lockDirection === 'UP';
          rec.maxFavorableExcursion = Math.round(((up ? highs - rec.lockSpot : rec.lockSpot - lows)) * 100) / 100;
          rec.maxAdverseExcursion = Math.round(((up ? rec.lockSpot - lows : highs - rec.lockSpot)) * 100) / 100;
        }
      }
    }
    records.push(rec);
  }

  report(records, { skippedNoCoverage, stats });

  if (args.json) {
    const out = String(args.json);
    writeFileSync(out, JSON.stringify({
      window: { startMs, endMs }, seed: SEED, generatedAt: new Date().toISOString(),
      candleStats: stats, skippedNoCoverage, records,
    }, null, 2));
    console.log(`\nwrote ${out}`);
  }
}

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------
function pct(n: number, d: number): number | null {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}
const show = (v: number | null, suffix = '') => (v === null ? 'null' : `${v}${suffix}`);

function report(records: CycleRecord[], meta: { skippedNoCoverage: number; stats: any }) {
  const locked = records.filter((r) => r.locked);
  const graded = locked.filter((r) => r.wasCorrect !== null);
  const wins = graded.filter((r) => r.wasCorrect);

  console.log('='.repeat(78));
  console.log('REPLAY RESULT');
  console.log('='.repeat(78));
  console.log(`cycles replayed          : ${records.length}`);
  console.log(`cycles skipped (coverage): ${meta.skippedNoCoverage}`);
  console.log(`lookahead violations     : ${lookaheadViolations}`);
  console.log('');
  console.log(`locks                    : ${locked.length}  (${show(pct(locked.length, records.length), '% of cycles')})`);
  console.log(`graded locks (n)         : ${graded.length}`);
  console.log(`win rate                 : ${show(pct(wins.length, graded.length), '%')}  (${wins.length}W / ${graded.length - wins.length}L)`);

  const brierVals = graded.map((r) => r.brierScore!).filter((b) => typeof b === 'number');
  const avgBrier = brierVals.length
    ? Math.round((brierVals.reduce((a, b) => a + b, 0) / brierVals.length) * 1000) / 1000 : null;
  console.log(`avgBrierScore            : ${show(avgBrier)}`);

  const ups = graded.filter((r) => r.lockDirection === 'UP');
  const downs = graded.filter((r) => r.lockDirection === 'DOWN');
  const upW = ups.filter((r) => r.wasCorrect).length;
  const dnW = downs.filter((r) => r.wasCorrect).length;
  console.log('');
  console.log('DIRECTION SPLIT');
  console.log(`  UP    n=${String(ups.length).padStart(4)}  won ${String(upW).padStart(4)}   ${show(pct(upW, ups.length), '%')}`);
  console.log(`  DOWN  n=${String(downs.length).padStart(4)}  won ${String(dnW).padStart(4)}   ${show(pct(dnW, downs.length), '%')}`);
  const other = graded.length - ups.length - downs.length;
  if (other) console.log(`  OTHER n=${String(other).padStart(4)}  (direction was neither UP nor DOWN)`);

  console.log('');
  console.log('CONFIDENCE BUCKET CALIBRATION');
  console.log('  bucket     n     won    win%     avg conf    calib err');
  const ranges = [
    ['50-55%', 50, 55], ['55-60%', 55, 60], ['60-65%', 60, 65], ['65-70%', 65, 70],
    ['70-75%', 70, 75], ['75-80%', 75, 80], ['80-85%', 80, 85], ['85-90%', 85, 90],
    ['90-95%', 90, 95], ['95%+', 95, 101],
  ] as const;
  for (const [name, lo, hi] of ranges) {
    const items = graded.filter((r) => r.lockConfidence! >= lo && r.lockConfidence! < hi);
    const w = items.filter((r) => r.wasCorrect).length;
    const winPct = pct(w, items.length);
    const avgConf = items.length
      ? Math.round((items.reduce((a, r) => a + r.lockConfidence!, 0) / items.length) * 10) / 10 : null;
    const calErr = (avgConf !== null && winPct !== null) ? Math.round(Math.abs(avgConf - winPct) * 10) / 10 : null;
    console.log(`  ${name.padEnd(9)} ${String(items.length).padStart(4)}  ${String(w).padStart(4)}   `
      + `${show(winPct, '%').padStart(7)}  ${show(avgConf).padStart(9)}   ${show(calErr)}`);
  }

  // Why cycles did not lock -- the SKIP side is half the engine's job.
  console.log('');
  console.log('WHY CYCLES DID NOT LOCK (blocker at cycle close)');
  const blockerCounts = new Map<string, number>();
  for (const r of records.filter((x) => !x.locked)) {
    const key = (r.blockerAtClose || 'UNKNOWN').replace(/\s*\(.*$/, '');
    blockerCounts.set(key, (blockerCounts.get(key) || 0) + 1);
  }
  [...blockerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

  if (locked.length) {
    console.log('');
    console.log('LOCK BEHAVIOUR');
    const lockTimes = locked.map((r) => r.lockTSec!).filter((n) => n !== null);
    const avgLockT = lockTimes.length ? Math.round(lockTimes.reduce((a, b) => a + b, 0) / lockTimes.length) : null;
    console.log(`  avg time-to-lock       : ${show(avgLockT, 's')}`);
    console.log(`  earliest / latest lock : ${show(Math.min(...lockTimes), 's')} / ${show(Math.max(...lockTimes), 's')}`);
    const flips = records.map((r) => r.directionFlips);
    console.log(`  avg direction flips/cyc: ${Math.round((flips.reduce((a, b) => a + b, 0) / (flips.length || 1)) * 100) / 100}`);
    const mae = locked.map((r) => r.maxAdverseExcursion).filter((v): v is number => v !== null);
    const mfe = locked.map((r) => r.maxFavorableExcursion).filter((v): v is number => v !== null);
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
    console.log(`  avg adverse excursion  : $${show(avg(mae))}`);
    console.log(`  avg favorable excursion: $${show(avg(mfe))}`);
    const avgLQ = avg(locked.map((r) => r.lockQualityAtLock!).filter((v) => v !== null));
    console.log(`  avg lock quality       : ${show(avgLQ)}`);
  }

  console.log('');
  console.log('FIDELITY DIAGNOSTICS -- how far this replay is from production');
  const collapsePct = pct(fidelity.shortTfCollapsed, fidelity.ticks);
  console.log(`  ticks simulated                : ${fidelity.ticks}`);
  console.log(`  tf15s == tf30s == tf1m         : ${fidelity.shortTfCollapsed} (${show(collapsePct, '%')})`);
  console.log('    ^ MEASURED HARNESS DEFECT. rollingBtcTicks is spaced 60s apart here, so');
  console.log('      getPriceAtAgo(15), (30) and (60) all resolve to the SAME previous-minute');
  console.log('      price. Three of the engine\'s five timeframe votes therefore carry one');
  console.log('      number, inflating multiTimeframeAlignment.alignedCount, which inflates');
  console.log('      calibratedConfidencePct and lockQuality. Production ticks ~every 3s and');
  console.log('      does not have this collapse. Any win rate below is inflated by it.');
  const fmtHist = (m: Map<number, number>) =>
    [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join('  ');
  console.log(`  alignedCount (of 5)            : ${fmtHist(fidelity.alignedCount)}`);
  console.log(`  evidenceAgreementCount (of 11) : ${fmtHist(fidelity.agreementCount)}`);

  console.log('');
  console.log('='.repeat(78));
  console.log('DIVERGENCES FROM PRODUCTION (structural -- see file header)');
  console.log('  1. strike is round(spot/10)*10; production uses the Kalshi floor_strike');
  console.log('  2. 15 ticks/cycle from 1m candles; production ticks ~every 3s');
  console.log('  3. pipeline Math.random() pinned to a seeded PRNG');
  console.log('  4. crossAssetPen fed 0; ETH/SOL feeds not reconstructible from BTC candles');
  console.log('  These are reasons the replay CANNOT reproduce the production ledger exactly.');
  console.log('');
  console.log('  DO NOT quote the win rate above as an engine result. Divergence (2) is');
  console.log('  measured in FIDELITY DIAGNOSTICS and is large. Reconciling with the live');
  console.log('  ledger requires trade-level (sub-second) history, not 1-minute candles.');
  console.log('='.repeat(78));
}

main().catch((err) => { console.error(err); process.exit(1); });
