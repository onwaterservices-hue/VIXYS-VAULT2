#!/usr/bin/env npx tsx
/**
 * STRIKE-SIDE LOCK RULE -- research model, evaluated out of sample.
 *
 *   npx tsx scripts/replay15m/research/strikeSideModel.ts <snippets.jsonl>
 *
 * Model: P(current side of the frozen strike wins | checkpoint t, distance
 * scaled by volatility) as an EMPIRICAL TABLE fitted on the chronologically
 * FIRST half of cycles. No parameters are tuned on the second half. Bars are
 * fixed a priori: 85 / 90 / 95%.
 *
 * Policy: at each checkpoint (60s grid), if the fitted P for the current
 * (t, distance bin, vol tercile) is >= bar AND the bin has >= MIN_N training
 * samples, LOCK the current side. Otherwise wait. If the cycle ends with no
 * lock, SKIP. One lock per cycle, first qualifying checkpoint.
 *
 * Reported on the SECOND half only: lock rate, win rate, skip rate, median
 * time-to-lock, and the same numbers for the CURRENT ENGINE's own decisions on
 * the same cycles (first checkpoint where gateAllowed, graded vs strike).
 *
 * This is a measurement of a candidate rule, not an engine change.
 */
import { readFileSync } from 'fs';
const f = process.argv[2]; if (!f) { console.error('usage: strikeSideModel.ts <snippets.jsonl>'); process.exit(2); }
const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.settledAboveStrike !== null);
const byCycle = new Map<string, any[]>(); for (const r of rows) { if (!byCycle.has(r.cycleId)) byCycle.set(r.cycleId, []); byCycle.get(r.cycleId)!.push(r); }
for (const a of byCycle.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
const cycles = [...byCycle.keys()].sort(); const mid = cycles[Math.floor(cycles.length / 2)];
const TRAIN = cycles.filter((c) => c < mid), TEST = cycles.filter((c) => c >= mid);

// volatility proxy per cycle: sampled intracycle range in bps, KNOWN ONLY UP TO t.
// To avoid look-ahead, the vol used at checkpoint t is the range of spots at
// checkpoints <= t (running range), not the full-cycle range.
const runningVolBps = (arr: any[], upToIdx: number) => { let hi = -1e9, lo = 1e9; for (let i = 0; i <= upToIdx; i++) { hi = Math.max(hi, arr[i].spot); lo = Math.min(lo, arr[i].spot); } return (hi - lo) / lo * 1e4; };
// vol terciles fitted on TRAIN at t=300 (early enough to be usable everywhere after)
const volAt300 = TRAIN.map((c) => { const a = byCycle.get(c)!; const i = a.findIndex((r) => r.checkpointSec === 300); return i < 0 ? null : runningVolBps(a, i); }).filter((v): v is number => v !== null).sort((a, b) => a - b);
const V1 = volAt300[Math.floor(volAt300.length / 3)], V2 = volAt300[Math.floor(volAt300.length * 2 / 3)];
const volBin = (v: number) => (v < V1 ? 'L' : v < V2 ? 'M' : 'H');
const DIST: [number, number][] = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 1e9]];
const distBin = (bps: number) => DIST.findIndex(([lo, hi]) => Math.abs(bps) >= lo && Math.abs(bps) < hi);
const key = (t: number, d: number, v: string) => `${t}|${d}|${v}`;

// ---- fit on TRAIN ----
const table = new Map<string, { n: number; w: number }>();
for (const c of TRAIN) { const a = byCycle.get(c)!; a.forEach((r, i) => { if (r.moneynessBps === 0) return; const k = key(r.checkpointSec, distBin(r.moneynessBps), volBin(runningVolBps(a, i))); const cell = table.get(k) || { n: 0, w: 0 }; cell.n++; if ((r.moneynessBps > 0) === r.settledAboveStrike) cell.w++; table.set(k, cell); }); }
const MIN_N = 30;
const pOf = (k: string) => { const c = table.get(k); return c && c.n >= MIN_N ? c.w / c.n : null; };

// ---- evaluate on TEST ----
const wilson = (w: number, n: number) => { const z = 1.96, p = w / n, d = 1 + z * z / n; const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [100 * (c - h), 100 * (c + h)]; };
const pct = (w: number, n: number) => (n ? (100 * w / n).toFixed(1) + '%' : '--');
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function evalPolicy(bar: number | null) {
  let locks = 0, wins = 0, skips = 0; const tt: number[] = []; const byT: Record<number, { n: number; w: number }> = {};
  for (const c of TEST) {
    const a = byCycle.get(c)!; let locked = false;
    a.forEach((r, i) => {
      if (locked || r.moneynessBps === 0) return;
      let go = false;
      if (bar === null) go = Boolean(r.gateAllowed) && (r.direction === 'UP' || r.direction === 'DOWN');   // current engine
      else { const p = pOf(key(r.checkpointSec, distBin(r.moneynessBps), volBin(runningVolBps(a, i)))); go = p !== null && p >= bar; }
      if (!go) return;
      locked = true; locks++; tt.push(r.checkpointSec);
      const side = bar === null ? r.direction === 'UP' : r.moneynessBps > 0;
      const win = side === r.settledAboveStrike; if (win) wins++;
      byT[r.checkpointSec] ??= { n: 0, w: 0 }; byT[r.checkpointSec].n++; if (win) byT[r.checkpointSec].w++;
    });
    if (!locked) skips++;
  }
  return { locks, wins, skips, tt, byT };
}
console.log(`STRIKE-SIDE LOCK RULE -- fitted on ${TRAIN.length} cycles (before ${mid}), evaluated on ${TEST.length} later cycles. MIN_N=${MIN_N}. vol terciles @t=300: ${V1.toFixed(1)} / ${V2.toFixed(1)} bps`);
console.log(`source=${rows[0].source}${rows[0].source === 'candles' ? '  (engine row is candle-inflated; rule rows are engine-independent)' : ''}\n`);
console.log('policy                 locks   lock%    wins   WIN%    Wilson95        skips   median t-lock   locks by t');
for (const [name, bar] of [['CURRENT ENGINE gate', null], ['rule bar >=85%', 0.85], ['rule bar >=90%', 0.90], ['rule bar >=95%', 0.95]] as [string, number | null][]) {
  const e = evalPolicy(bar); const [lo, hi] = e.locks ? wilson(e.wins, e.locks) : [0, 0];
  const byT = Object.entries(e.byT).sort((a, b) => +a[0] - +b[0]).map(([t, c]) => `${t}s:${c.n}`).join(' ');
  console.log(`${name.padEnd(22)} ${String(e.locks).padStart(5)}   ${pct(e.locks, TEST.length).padStart(5)}   ${String(e.wins).padStart(4)}   ${pct(e.wins, e.locks).padStart(5)}   [${lo.toFixed(1)}, ${hi.toFixed(1)}]   ${String(e.skips).padStart(5)}   ${String(med(e.tt) ?? '--').padStart(6)}s      ${byT}`);
}
console.log('\nA policy is only better if BOTH win% is not worse AND it locks earlier or more often -- read all columns.');
