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
import { getTradeTicks, type TradeTick } from './replay15m/tradeCache.ts';

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
// 'trades' fills rollingBtcTicks at production's ~3s cadence from real trade
// prints. 'candles' fills it once a minute, which collapses the 15s/30s/60s
// lookbacks onto one price and inflates every downstream score -- see the
// FIDELITY DIAGNOSTICS block. Use trades for anything you intend to believe.
const SOURCE: 'trades' | 'candles' = args.source === 'trades' ? 'trades' : 'candles';
const BUCKET_SECONDS = args['bucket-seconds'] ? Number(args['bucket-seconds']) : 3;
const SEED = args.seed ? Number(args.seed) : 1;
// --engine-source <path>: slice the engine from this file instead of the
// working tree's server.ts (e.g. `git show 3e31a84:server.ts > /tmp/old.ts`).
const ENGINE_SOURCE = args['engine-source'] ? resolve(String(args['engine-source'])) : undefined;
// --snippets <file.jsonl>: intracycle learning samples. At every checkpoint
// (each 60s; the 5-minute marks are a subset) the engine's state and a handful
// of price/flow features are captured USING ONLY TICKS <= THAT CHECKPOINT. The
// label -- which side of the frozen strike price settled on -- is attached
// after the cycle closes. One completed cycle therefore yields ~14 labelled
// samples instead of one. Nothing here feeds back into the decision.
const SNIPPETS_PATH = args.snippets ? resolve(String(args.snippets)) : null;
const SNIPPET_SECS = [60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840];
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
const serverSrc = readFileSync(
  process.argv.includes('--engine-source')
    ? resolve(String(process.argv[process.argv.indexOf('--engine-source') + 1]))
    : join(ROOT, 'server.ts'),
  'utf8',
);
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
  // THE ACTUAL DEFECT: whether the observation stream can resolve the 15s, 30s
  // and 60s lookbacks to DISTINCT prices at all. This is a property of tick
  // spacing, independent of the engine's thresholds.
  lookbackResolvable: 0,
  lookbackCollapsed: 0,
  // Downstream symptom: the three short timeframe VOTES coming out equal. This
  // is only partly the defect -- votes use different thresholds (0.012/0.015/
  // 0.02) and legitimately agree in a quiet market, so it never reaches 0.
  shortTfVotesEqual: 0,
  alignedCount: new Map<number, number>(),
  agreementCount: new Map<number, number>(),
};
// Mirrors getPriceAtAgo in evaluateBtc15mHighConvictionPipeline: the newest
// observation at or before (now - sec).
function priceAtAgo(buf: { tsMs: number; price: number }[], nowMs: number, sec: number): number | null {
  const target = nowMs - sec * 1000;
  for (let i = buf.length - 1; i >= 0; i--) if (buf[i].tsMs <= target) return buf[i].price;
  return buf.length ? buf[0].price : null;
}
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

  console.log(`source     : ${SOURCE}${SOURCE === 'trades' ? ` (${BUCKET_SECONDS}s buckets from real trade prints)` : ' (1-minute candles)'}`);

  // Unified observation stream: [tsMs, price] pairs the engine is ticked with.
  let stream: { tsMs: number; price: number; buyVolume?: number; sellVolume?: number }[] = [];
  let byMinute = new Map<number, Candle>();
  let sourceSummary = '';
  let tradeStats: any = null;

  if (SOURCE === 'trades') {
    process.stdout.write('trades     : ');
    const { ticks, stats } = await getTradeTicks(ROOT, startMs, endMs, {
      offline: OFFLINE, bucketSeconds: BUCKET_SECONDS,
      onProgress: (m) => process.stdout.write(`\n${m}`),
    });
    tradeStats = stats;
    stream = ticks.map((t) => ({ tsMs: t.tsMs, price: t.price, buyVolume: t.buyVolume, sellVolume: t.sellVolume }));
    console.log('');
    console.log(`             ${stats.bucketsTotal} buckets `
      + `(${stats.bucketsWithTrades} with real prints, ${stats.bucketsEmpty} empty), `
      + `${stats.tradesUsed} trades (${stats.duplicatesDropped} duplicate ids dropped), ${stats.requests} requests, `
      + `${stats.hoursFromCache}h cached / ${stats.hoursFetched}h fetched`);
    if (stats.bucketsEmpty) {
      console.log(`             ${stats.bucketsEmpty} empty buckets carry the last real trade price `
        + `(${(stats.bucketsEmpty / Math.max(1, stats.bucketsTotal) * 100).toFixed(2)}%) -- nothing interpolated`);
    }
    sourceSummary = `${stats.bucketsTotal} x ${BUCKET_SECONDS}s buckets`;
  } else {
    await runCandleSource();
  }

  async function runCandleSource() {
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

  byMinute = new Map<number, Candle>();
  for (const c of candles) byMinute.set(c.time * 1000, c);
  stream = candles.map((c) => ({ tsMs: c.time * 1000, price: c.close }));
  sourceSummary = `${candles.length} x 60s candles`;
  }

  // --- replay ---
  const sandbox = buildEngineSandbox(ROOT, { seed: SEED, engineSourcePath: ENGINE_SOURCE });
  if (ENGINE_SOURCE) console.log(`engine src : ${ENGINE_SOURCE}  (NOT the working tree)`);
  console.log(`engine     : sliced from server.ts (${sandbox.provenance.serverChars} chars) `
    + `pipeline=${sandbox.provenance.pipelineChars} gate=${sandbox.provenance.gateChars}`);
  console.log('');

  const records: CycleRecord[] = [];
  const snippetOut: any[] = [];
  let skippedNoCoverage = 0;

  // Group the observation stream into cycles. Only ticks belonging to a cycle
  // are ever visible to that cycle, and they are consumed in time order.
  const byCycle = new Map<number, { tsMs: number; price: number; buyVolume?: number; sellVolume?: number }[]>();
  for (const tk of stream) {
    const cs = Math.floor(tk.tsMs / CYCLE_MS) * CYCLE_MS;
    if (!byCycle.has(cs)) byCycle.set(cs, []);
    byCycle.get(cs)!.push(tk);
  }
  for (const arr of byCycle.values()) arr.sort((a, b) => a.tsMs - b.tsMs);

  // Coverage floor scales with the source: 15 ticks/cycle from candles,
  // CYCLE/BUCKET from trades.
  const expectedPerCycle = SOURCE === 'trades' ? (CYCLE_MS / 1000) / BUCKET_SECONDS : 15;
  const minCoverage = args['min-coverage']
    ? Number(args['min-coverage'])
    : Math.floor(expectedPerCycle * 0.8);

  for (let cs = startMs; cs < endMs; cs += CYCLE_MS) {
    const cycleTicks = byCycle.get(cs) || [];
    if (cycleTicks.length < minCoverage) { skippedNoCoverage++; continue; }

    // Strike is fixed at cycle open from the first observed price, matching
    // server.ts's non-Kalshi path: round(livePrice / 10) * 10.
    const openPrice = cycleTicks[0].price;
    const strike = Math.round(openPrice / 10) * 10;
    const cycleId = `15M-${new Date(cs).toISOString()}`;

    sandbox.beginCycle(cycleId, cs, strike);

    const rec: CycleRecord = {
      cycleId, intervalStart: cs, intervalEnd: cs + CYCLE_MS, strike,
      ticks: 0, coverageMinutes: cycleTicks.length,
      locked: false, lockTSec: null, lockDirection: null, lockConfidence: null,
      lockQualityAtLock: null, lockSpot: null,
      directionFlips: 0, firstBlocker: null, blockerAtClose: null,
      settlementPrice: null, actualOutcome: null, wasCorrect: null, brierScore: null,
      maxAdverseExcursion: null, maxFavorableExcursion: null,
      trajectory: [],
    };

    let prevDir = 'NEUTRAL';
    const lookbackBuf: { tsMs: number; price: number }[] = [];
    const snippets: any[] = [];
    let nextSnippet = 0;   // index into SNIPPET_SECS
    for (const tk of cycleTicks) {
      const tickNow = tk.tsMs;
      assertNoLookahead(tickNow, tickNow);
      const spot = tk.price;

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
      if (mtf && mtf.tf15s === mtf.tf30s && mtf.tf30s === mtf.tf1m) fidelity.shortTfVotesEqual++;
      lookbackBuf.push({ tsMs: tickNow, price: spot });
      if (lookbackBuf.length > 400) lookbackBuf.shift();
      const p15 = priceAtAgo(lookbackBuf, tickNow, 15);
      const p30 = priceAtAgo(lookbackBuf, tickNow, 30);
      const p60 = priceAtAgo(lookbackBuf, tickNow, 60);
      if (p15 !== null && p30 !== null && p60 !== null) {
        if (p15 === p30 && p30 === p60) fidelity.lookbackCollapsed++;
        else fidelity.lookbackResolvable++;
      }
      if (mtf) bump(fidelity.alignedCount, mtf.alignedCount);
      bump(fidelity.agreementCount, st.pipeline?.evidenceAgreementCount ?? -1);

      const blocker = gate.allowed ? null : ((gate.reasons || [])[0] ?? null);
      if (!rec.firstBlocker && blocker) rec.firstBlocker = blocker;
      rec.blockerAtClose = blocker;

      // Trajectories are sampled, not stored per-tick, or a 30-day trade-level
      // run would emit ~900k points per JSON. Sampling never affects the
      // decision -- every tick is still executed.
      const sampleEvery = SOURCE === 'trades' ? Math.max(1, Math.round(20 / BUCKET_SECONDS)) : 1;
      if (rec.ticks % sampleEvery === 0 || gate.allowed) {
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
      }

      // Intracycle snapshot at each checkpoint, from information at or before
      // this tick only. The label is added after settlement, below.
      if (SNIPPETS_PATH) {
        const tSec = Math.floor((tickNow - cs) / 1000);
        while (nextSnippet < SNIPPET_SECS.length && tSec >= SNIPPET_SECS[nextSnippet]) {
          const cp = SNIPPET_SECS[nextSnippet++];
          const p60 = priceAtAgo(lookbackBuf, tickNow, 60), p300 = priceAtAgo(lookbackBuf, tickNow, 300);
          let buy60 = 0, sell60 = 0, buy180 = 0, sell180 = 0, hasFlow = false;
          for (let i = cycleTicks.indexOf(tk); i >= 0 && cycleTicks[i].tsMs > tickNow - 180_000; i--) {
            const x = cycleTicks[i]; if (x.buyVolume == null) break; hasFlow = true;
            buy180 += x.buyVolume; sell180 += x.sellVolume!;
            if (x.tsMs > tickNow - 60_000) { buy60 += x.buyVolume; sell60 += x.sellVolume!; }
          }
          snippets.push({
            cycleId, checkpointSec: cp, atSec: tSec, spot, strike,
            moneynessBps: Math.round((spot - strike) / strike * 1e4 * 10) / 10,
            mom60Bps: p60 == null ? null : Math.round((spot - p60) / p60 * 1e4 * 10) / 10,
            mom300Bps: p300 == null ? null : Math.round((spot - p300) / p300 * 1e4 * 10) / 10,
            flowShare60: hasFlow && buy60 + sell60 > 0 ? Math.round(buy60 / (buy60 + sell60) * 1000) / 1000 : null,
            flowShare180: hasFlow && buy180 + sell180 > 0 ? Math.round(buy180 / (buy180 + sell180) * 1000) / 1000 : null,
            direction: st.direction, confidence: st.confidence, lockQuality: st.lockQuality ?? null,
            lockQualityTier: st.lockQualityTier ?? null, evidenceAgreement: st.pipeline?.evidenceAgreementCount ?? null,
            alignedCount: st.pipeline?.multiTimeframeAlignment?.alignedCount ?? null,
            reversalRisk: st.pipeline?.reversalAssessment?.threatScore ?? null,
            gateAllowed: Boolean(gate.allowed), blocker,
            lockedByNow: rec.locked, source: SOURCE,
          });
        }
      }

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
    // live price, so the replay uses the next cycle's first observation.
    const nextTicks = byCycle.get(cs + CYCLE_MS);
    if (nextTicks && nextTicks.length) {
      rec.settlementPrice = nextTicks[0].price;
      if (rec.locked) {
        const graded = grade(
          { direction: rec.lockDirection, confidence: rec.lockConfidence, targetStrike: strike },
          rec.settlementPrice,
        );
        rec.actualOutcome = graded.actualOutcome;
        rec.wasCorrect = graded.wasCorrect;
        rec.brierScore = graded.brierScore;

        // Excursions from the lock price over the remainder of the cycle,
        // measured on observed prices only.
        const after = cycleTicks.filter((x) => x.tsMs >= cs + rec.lockTSec! * 1000).map((x) => x.price);
        if (after.length && rec.lockSpot != null) {
          const hi = Math.max(...after), lo = Math.min(...after);
          const up = rec.lockDirection === 'UP';
          rec.maxFavorableExcursion = Math.round((up ? hi - rec.lockSpot : rec.lockSpot - lo) * 100) / 100;
          rec.maxAdverseExcursion = Math.round((up ? rec.lockSpot - lo : hi - rec.lockSpot) * 100) / 100;
        }
      }
    }
    // Labels are attached only now, after the cycle has closed and settled.
    if (SNIPPETS_PATH && snippets.length) {
      const settled = rec.settlementPrice != null;
      for (const sn of snippets) {
        sn.settlementPrice = rec.settlementPrice;
        sn.settledAboveStrike = settled ? rec.settlementPrice! >= strike : null;   // the product's win criterion
        sn.settledAboveSpotAtT = settled ? rec.settlementPrice! >= sn.spot : null; // continuation from the checkpoint
        sn.engineDirCorrectVsStrike = settled && (sn.direction === 'UP' || sn.direction === 'DOWN')
          ? ((rec.settlementPrice! >= strike) === (sn.direction === 'UP')) : null;
      }
      snippetOut.push(...snippets);
    }
    records.push(rec);
  }
  if (SNIPPETS_PATH) {
    writeFileSync(SNIPPETS_PATH, snippetOut.map((s) => JSON.stringify(s)).join('\n') + '\n');
    console.log(`snippets   : ${snippetOut.length} labelled intracycle samples from ${records.length} cycles -> ${SNIPPETS_PATH}`);
  }

  report(records, { skippedNoCoverage, sourceSummary, tradeStats });

  if (args.json) {
    const out = String(args.json);
    writeFileSync(out, JSON.stringify({
      window: { startMs, endMs }, seed: SEED, generatedAt: new Date().toISOString(),
      source: SOURCE, sourceSummary, tradeStats, skippedNoCoverage, records,
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

function report(records: CycleRecord[], meta: { skippedNoCoverage: number; sourceSummary: string; tradeStats: any }) {
  const locked = records.filter((r) => r.locked);
  const graded = locked.filter((r) => r.wasCorrect !== null);
  const wins = graded.filter((r) => r.wasCorrect);

  console.log('='.repeat(78));
  console.log('REPLAY RESULT');
  console.log('='.repeat(78));
  console.log(`source                   : ${meta.sourceSummary}`);
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
  console.log('DIRECTIONAL SKILL (strike-independent) -- THE HEADLINE NUMBER');
  // The win rate above is graded against the cycle's strike. That strike is
  // frozen at the cycle open, so a lock taken once price has already moved is
  // scored on a move that had ALREADY happened. It measures strike positioning,
  // not forecasting.
  //
  // This measures forecasting: from the price at the MOMENT OF THE LOCK, did
  // price end up where the engine said it would? Equivalent to grading against
  // an at-the-money strike. 50% is a coin flip -- no skill.
  const skill = graded.filter((r) => r.lockSpot != null && r.settlementPrice != null);
  const skillWin = skill.filter((r) =>
    (r.settlementPrice! >= r.lockSpot!) === (r.lockDirection === 'UP')).length;
  const skillUp = skill.filter((r) => r.lockDirection === 'UP');
  const skillDown = skill.filter((r) => r.lockDirection === 'DOWN');
  const wUp = skillUp.filter((r) => (r.settlementPrice! >= r.lockSpot!)).length;
  const wDn = skillDown.filter((r) => (r.settlementPrice! < r.lockSpot!)).length;
  console.log(`  post-lock directional accuracy : ${show(pct(skillWin, skill.length), '%')}  (${skillWin}/${skill.length})`);
  console.log(`    UP calls                     : ${show(pct(wUp, skillUp.length), '%')}  (${wUp}/${skillUp.length})`);
  console.log(`    DOWN calls                   : ${show(pct(wDn, skillDown.length), '%')}  (${wDn}/${skillDown.length})`);
  const alreadyMoved = graded.filter((r) =>
    r.lockSpot != null && ((r.lockSpot! > r.strike) === (r.lockDirection === 'UP'))).length;
  console.log(`  locks calling the side price had ALREADY moved to: `
    + `${show(pct(alreadyMoved, graded.length), '%')} (${alreadyMoved}/${graded.length})`);
  const dStrike = graded.map((r) => Math.abs((r.lockSpot ?? 0) - r.strike)).sort((a, b) => a - b);
  const dSettle = graded.filter((r) => r.settlementPrice != null && r.lockSpot != null)
    .map((r) => Math.abs(r.settlementPrice! - r.lockSpot!)).sort((a, b) => a - b);
  const med = (xs: number[]) => (xs.length ? xs[Math.floor(xs.length / 2)] : null);
  console.log(`  median |lockSpot - strike|     : $${show(med(dStrike) === null ? null : Math.round(med(dStrike)! * 10) / 10)}`);
  console.log(`  median |settle  - lockSpot|    : $${show(med(dSettle) === null ? null : Math.round(med(dSettle)! * 10) / 10)}`);
  console.log('    ^ if the first is much larger than the second, the reported win rate is');
  console.log('      a property of where the strike sits, not of the engine\'s forecasting.');

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
  const lookbackTotal = fidelity.lookbackCollapsed + fidelity.lookbackResolvable;
  const collapsePct = pct(fidelity.lookbackCollapsed, lookbackTotal);
  const votesPct = pct(fidelity.shortTfVotesEqual, fidelity.ticks);
  console.log(`  ticks simulated                : ${fidelity.ticks}`);
  console.log(`  lookback COLLAPSE (the defect) : ${fidelity.lookbackCollapsed}/${lookbackTotal} (${show(collapsePct, '%')})`);
  console.log('    ^ ticks where getPriceAtAgo(15), (30) and (60) resolve to the SAME price,');
  console.log('      i.e. the observation spacing cannot separate the three short lookbacks.');
  console.log('      Each collapsed tick hands three of the engine\'s five timeframe votes one');
  console.log('      number, inflating alignedCount -> calibratedConfidencePct -> lockQuality.');
  if (SOURCE === 'candles') {
    console.log('      1-minute candles collapse ~85% of ticks. Re-run with --source trades.');
  } else {
    console.log(`      ${BUCKET_SECONDS}s buckets resolve the lookbacks; production ticks at a similar cadence.`);
  }
  console.log(`  short-TF votes equal           : ${fidelity.shortTfVotesEqual} (${show(votesPct, '%')})`);
  console.log('    ^ downstream symptom, NOT the defect. The three votes use different');
  console.log('      thresholds (0.012 / 0.015 / 0.02) and legitimately agree in a quiet');
  console.log('      market, so this never reaches zero even with perfect data.');
  const fmtHist = (m: Map<number, number>) =>
    [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join('  ');
  console.log(`  alignedCount (of 5)            : ${fmtHist(fidelity.alignedCount)}`);
  console.log(`  evidenceAgreementCount (of 11) : ${fmtHist(fidelity.agreementCount)}`);

  console.log('');
  console.log('='.repeat(78));
  console.log('DIVERGENCES FROM PRODUCTION (structural -- see file header)');
  console.log('  1. strike is round(spot/10)*10; production uses the Kalshi floor_strike');
  console.log(SOURCE === 'trades'
    ? `  2. RESOLVED for this run: ${BUCKET_SECONDS}s buckets from real trade prints, matching production's ~3s cadence`
    : '  2. 15 ticks/cycle from 1m candles; production ticks ~every 3s  <-- USE --source trades');
  console.log('  3. pipeline Math.random() pinned to a seeded PRNG');
  console.log('  4. crossAssetPen fed 0; ETH/SOL feeds not reconstructible from BTC candles');
  console.log('  These are reasons the replay CANNOT reproduce the production ledger exactly.');
  console.log('');
  if (SOURCE === 'candles') {
    console.log('  DO NOT quote the win rate above as an engine result. Divergence (2) is');
    console.log('  measured in FIDELITY DIAGNOSTICS and is large. Re-run with --source trades.');
  } else {
    console.log('  Divergence (2) is resolved on this run. Divergences (1), (3) and (4)');
    console.log('  remain, so this is still a measurement of the ENGINE\'S LOGIC over real');
    console.log('  history -- not a reconstruction of the production ledger.');
  }
  console.log('='.repeat(78));
}

main().catch((err) => { console.error(err); process.exit(1); });
