#!/usr/bin/env npx tsx
/**
 * Export the strike-side probability table the engine can consume.
 *
 *   npx tsx scripts/replay15m/research/exportStrikeSideTable.ts <snippets.jsonl> <out.json> [--validate other.jsonl]
 *
 * Cells: checkpointSec (60s grid) x |distance| bin (bps) x running-vol tercile.
 * Each cell stores n and wins so the consumer can see the sample size, not just
 * a probability. Provenance (source window, cycle count, fit date, vol
 * boundaries) travels with the table. Nothing is smoothed or extrapolated: a
 * cell with n < MIN_N is emitted with p:null and the engine must treat it as
 * unknown.
 */
import { readFileSync, writeFileSync } from 'fs';
const [inFile, outFile, ...rest] = process.argv.slice(2);
if (!inFile || !outFile) { console.error('usage: exportStrikeSideTable.ts <snippets.jsonl> <out.json> [--validate other.jsonl]'); process.exit(2); }
const MIN_N = 30;
const DIST: [number, number][] = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 40], [40, 1e9]];
const load = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.settledAboveStrike !== null && r.moneynessBps !== 0);
const rows = load(inFile);
const byCycle = new Map<string, any[]>(); for (const r of rows) { if (!byCycle.has(r.cycleId)) byCycle.set(r.cycleId, []); byCycle.get(r.cycleId)!.push(r); }
for (const a of byCycle.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
const runningVol = (arr: any[], i: number) => { let hi = -1e9, lo = 1e9; for (let k = 0; k <= i; k++) { hi = Math.max(hi, arr[k].spot); lo = Math.min(lo, arr[k].spot); } return (hi - lo) / lo * 1e4; };
const vols: number[] = []; for (const a of byCycle.values()) { const i = a.findIndex((r) => r.checkpointSec === 300); if (i >= 0) vols.push(runningVol(a, i)); }
vols.sort((x, y) => x - y); const V1 = vols[Math.floor(vols.length / 3)], V2 = vols[Math.floor(vols.length * 2 / 3)];
const volBin = (v: number) => (v < V1 ? 'L' : v < V2 ? 'M' : 'H');
const distBin = (bps: number) => DIST.findIndex(([lo, hi]) => Math.abs(bps) >= lo && Math.abs(bps) < hi);
const cells: Record<string, { n: number; w: number }> = {};
for (const a of byCycle.values()) a.forEach((r, i) => { const k = `${r.checkpointSec}|${distBin(r.moneynessBps)}|${volBin(runningVol(a, i))}`; cells[k] ??= { n: 0, w: 0 }; cells[k].n++; if ((r.moneynessBps > 0) === r.settledAboveStrike) cells[k].w++; });
const table: Record<string, { n: number; w: number; p: number | null }> = {};
for (const [k, c] of Object.entries(cells)) table[k] = { n: c.n, w: c.w, p: c.n >= MIN_N ? Math.round((c.w / c.n) * 1000) / 1000 : null };
const cyc = [...byCycle.keys()].sort();
const out = {
  version: 'strike-side-v1', fittedAt: new Date().toISOString(),
  source: rows[0]?.source ?? 'unknown', window: { firstCycle: cyc[0], lastCycle: cyc[cyc.length - 1], cycles: cyc.length, samples: rows.length },
  minN: MIN_N, distBinsBps: DIST.map(([lo, hi]) => [lo, hi === 1e9 ? null : hi]), volTercilesBps: { L_below: Math.round(V1 * 10) / 10, H_atOrAbove: Math.round(V2 * 10) / 10, measuredAtSec: 300 },
  checkpointSecs: [...new Set(rows.map((r) => r.checkpointSec))].sort((a, b) => a - b),
  keyFormat: 'checkpointSec|distBinIndex|volBin(L|M|H)',
  cells: table,
};
writeFileSync(outFile, JSON.stringify(out, null, 1));
const known = Object.values(table).filter((c) => c.p !== null).length;
console.log(`wrote ${outFile}: ${Object.keys(table).length} cells, ${known} with n>=${MIN_N}, from ${cyc.length} cycles / ${rows.length} samples (${out.source})`);
// optional validation against a second dataset: compare p per cell where both have n>=MIN_N
const vi = rest.indexOf('--validate');
if (vi >= 0 && rest[vi + 1]) {
  const v = load(rest[vi + 1]); const vb = new Map<string, any[]>(); for (const r of v) { if (!vb.has(r.cycleId)) vb.set(r.cycleId, []); vb.get(r.cycleId)!.push(r); }
  for (const a of vb.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
  const vc: Record<string, { n: number; w: number }> = {};
  for (const a of vb.values()) a.forEach((r, i) => { const k = `${r.checkpointSec}|${distBin(r.moneynessBps)}|${volBin(runningVol(a, i))}`; vc[k] ??= { n: 0, w: 0 }; vc[k].n++; if ((r.moneynessBps > 0) === r.settledAboveStrike) vc[k].w++; });
  let cnt = 0, sumAbs = 0, worst: any = null;
  for (const [k, c] of Object.entries(vc)) { const t = table[k]; if (!t || t.p === null || c.n < MIN_N) continue; const pv = c.w / c.n; cnt++; sumAbs += Math.abs(pv - t.p); if (!worst || Math.abs(pv - t.p) > worst.d) worst = { k, fit: t.p, val: Math.round(pv * 1000) / 1000, n: c.n, d: Math.abs(pv - t.p) }; }
  console.log(`validation vs ${rest[vi + 1]}: ${cnt} shared cells with n>=${MIN_N}, mean |p_fit - p_val| = ${(sumAbs / Math.max(1, cnt)).toFixed(3)}, worst ${JSON.stringify(worst)}`);
}
