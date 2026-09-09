#!/usr/bin/env npx tsx
/**
 * Regime slices for the strike-side rule (research). TEST half only; table fitted on TRAIN half.
 *   npx tsx scripts/replay15m/research/regimeSlices.ts <snippets.jsonl>
 * Slices (all computable at decision time, no look-ahead):
 *   - prior trend: |sum of the previous 4 cycles' open->settle moves| in bps (terciles from TRAIN)
 *   - prior volatility: mean of previous 4 cycles' intracycle sampled range (terciles from TRAIN)
 *   - UTC hour block: 00-08 / 08-16 / 16-24
 * Reports rule@0.95 lock rate and win% per slice, plus the all-sides base rate at t=720 per slice.
 */
import { readFileSync } from 'fs';
const f = process.argv[2]; if (!f) { console.error('usage: regimeSlices.ts <snippets.jsonl>'); process.exit(2); }
const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.settledAboveStrike !== null);
const byCycle = new Map<string, any[]>(); for (const r of rows) { if (!byCycle.has(r.cycleId)) byCycle.set(r.cycleId, []); byCycle.get(r.cycleId)!.push(r); }
for (const a of byCycle.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
const cycles = [...byCycle.keys()].sort(); const mid = cycles[Math.floor(cycles.length / 2)];
const runVol = (arr: any[], i: number) => { let hi = -1e9, lo = 1e9; for (let k = 0; k <= i; k++) { hi = Math.max(hi, arr[k].spot); lo = Math.min(lo, arr[k].spot); } return (hi - lo) / lo * 1e4; };
const DIST: [number, number][] = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 40], [40, 1e9]];
const distIdx = (b: number) => DIST.findIndex(([lo, hi]) => Math.abs(b) >= lo && Math.abs(b) < hi);
const tv: number[] = []; for (const c of cycles.filter((c) => c < mid)) { const a = byCycle.get(c)!; a.forEach((r, i) => tv.push(runVol(a, i))); }
tv.sort((a, b) => a - b); const V1 = tv[Math.floor(tv.length / 3)], V2 = tv[Math.floor(tv.length * 2 / 3)]; const vb = (v: number) => (v < V1 ? 'L' : v < V2 ? 'M' : 'H');
const cells = new Map<string, { n: number; w: number }>();
for (const c of cycles.filter((c) => c < mid)) { const a = byCycle.get(c)!; a.forEach((r, i) => { if (r.moneynessBps === 0) return; const k = `${r.checkpointSec}|${distIdx(r.moneynessBps)}|${vb(runVol(a, i))}`; const cell = cells.get(k) || { n: 0, w: 0 }; cell.n++; if ((r.moneynessBps > 0) === r.settledAboveStrike) cell.w++; cells.set(k, cell); }); }
const pCur = (r: any, vol: number) => { if (r.moneynessBps === 0) return null; const c = cells.get(`${r.checkpointSec}|${distIdx(r.moneynessBps)}|${vb(vol)}`); return c && c.n >= 30 ? c.w / c.n : null; };
// per-cycle context from PRIOR cycles only
const info = new Map<string, { openP: number; settle: number; range: number }>();
for (const c of cycles) { const a = byCycle.get(c)!; const last = a[a.length - 1]; info.set(c, { openP: a[0].strike, settle: last.settlementPrice, range: runVol(a, a.length - 1) }); }
const prior = (idx: number) => { const prev = cycles.slice(Math.max(0, idx - 4), idx).map((c) => info.get(c)!); if (prev.length < 4) return null; const trend = Math.abs(prev.reduce((s, p) => s + (p.settle - p.openP) / p.openP * 1e4, 0)); const vol = prev.reduce((s, p) => s + p.range, 0) / prev.length; return { trend, vol }; };
const trainCtx = cycles.map((c, i) => ({ c, ctx: prior(i) })).filter((x) => x.c < mid && x.ctx);
const tq = trainCtx.map((x) => x.ctx!.trend).sort((a, b) => a - b), vq = trainCtx.map((x) => x.ctx!.vol).sort((a, b) => a - b);
const T1 = tq[Math.floor(tq.length / 3)], T2 = tq[Math.floor(tq.length * 2 / 3)], W1 = vq[Math.floor(vq.length / 3)], W2 = vq[Math.floor(vq.length * 2 / 3)];
type Out = { c: string; locked: boolean; win: boolean | null; lockCp: number | null; base720: boolean | null; ctx: any; hour: number };
const outs: Out[] = [];
cycles.forEach((c, i) => { if (c < mid) return; const ctx = prior(i); if (!ctx) return; const a = byCycle.get(c)!; let locked = false, win: boolean | null = null, lockCp: number | null = null;
  a.forEach((r, k) => { if (locked) return; const p = pCur(r, runVol(a, k)); if (p !== null && p >= 0.95) { locked = true; lockCp = r.checkpointSec; win = (r.moneynessBps > 0) === r.settledAboveStrike; } });
  const r720 = a.find((r) => r.checkpointSec === 720 && r.moneynessBps !== 0); const base720 = r720 ? (r720.moneynessBps > 0) === r720.settledAboveStrike : null;
  outs.push({ c, locked, win, lockCp, base720, ctx, hour: new Date(c.slice(4)).getUTCHours() }); });
const pct = (w: number, n: number) => (n ? `${(100 * w / n).toFixed(1)}%` : '--');
const report = (label: string, sel: (o: Out) => boolean) => { const s = outs.filter(sel); const L = s.filter((o) => o.locked); const b = s.filter((o) => o.base720 !== null); console.log(`  ${label.padEnd(30)} cycles=${String(s.length).padStart(4)}  rule locks=${String(L.length).padStart(4)} (${pct(L.length, s.length).padStart(5)})  win ${pct(L.filter((o) => o.win).length, L.length).padStart(6)}  | naive current-side@720 ${pct(b.filter((o) => o.base720).length, b.length)}`); };
console.log(`REGIME SLICES  ${f.split('/').pop()}  TEST cycles=${outs.length}  (table + terciles fitted on TRAIN)`);
console.log('\nprior 4-cycle TREND (|net move|, bps)'); report(`ranging  (< ${T1.toFixed(0)})`, (o) => o.ctx.trend < T1); report(`middle`, (o) => o.ctx.trend >= T1 && o.ctx.trend < T2); report(`trending (>= ${T2.toFixed(0)})`, (o) => o.ctx.trend >= T2);
console.log('\nprior 4-cycle VOLATILITY (mean range, bps)'); report(`calm    (< ${W1.toFixed(0)})`, (o) => o.ctx.vol < W1); report(`middle`, (o) => o.ctx.vol >= W1 && o.ctx.vol < W2); report(`volatile (>= ${W2.toFixed(0)})`, (o) => o.ctx.vol >= W2);
console.log('\nUTC hour block'); report('00-08 (Asia)', (o) => o.hour < 8); report('08-16 (Europe)', (o) => o.hour >= 8 && o.hour < 16); report('16-24 (US)', (o) => o.hour >= 16);
console.log('\nlock timing by regime (median lockCp s):'); for (const [lab, sel] of [['calm', (o: Out) => o.ctx.vol < W1], ['volatile', (o: Out) => o.ctx.vol >= W2]] as [string, (o: Out) => boolean][]) { const L = outs.filter(sel).filter((o) => o.locked).map((o) => o.lockCp!).sort((a, b) => a - b); console.log(`  ${lab.padEnd(10)} n=${L.length} median ${L.length ? L[Math.floor(L.length / 2)] : '--'}s`); }
