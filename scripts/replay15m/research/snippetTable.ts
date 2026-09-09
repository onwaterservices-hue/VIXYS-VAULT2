#!/usr/bin/env npx tsx
/**
 * Intracycle snippet analysis -- the product's win criterion, by time and distance.
 *
 *   npx tsx scripts/replay15m/research/snippetTable.ts <snippets.jsonl>
 *
 * Table 1 (engine-independent, valid on any source):
 *   P(price settles on the side it is CURRENTLY on vs the frozen strike | t, |moneyness|)
 *   i.e. "if a user locked the current side at minute t with price this far from
 *   the strike, how often would they win?" -- with n and a 95% Wilson interval.
 *
 * Table 2 (engine-dependent; candle-sourced values are inflated, see harness):
 *   P(engine direction correct vs strike | t, confidence bucket)
 *
 * No tuning, no thresholds chosen here. It is a measurement.
 */
import { readFileSync } from 'fs';
const f = process.argv[2]; if (!f) { console.error('usage: snippetTable.ts <snippets.jsonl>'); process.exit(2); }
const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.settledAboveStrike !== null);
const source = rows[0]?.source ?? '?';
const T = [180, 300, 420, 480, 600, 660, 720, 780, 840];
const BINS: [number, number, string][] = [[0, 3, '0-3'], [3, 6, '3-6'], [6, 10, '6-10'], [10, 15, '10-15'], [15, 25, '15-25'], [25, 40, '25-40'], [40, 1e9, '40+']];
const wilson = (w: number, n: number) => { if (!n) return [0, 0]; const z = 1.96, p = w / n, d = 1 + z * z / n; const c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [c - h, c + h]; };
const cellS = (w: number, n: number) => (n < 20 ? `   --(${String(n).padStart(3)})` : `${(100 * w / n).toFixed(0).padStart(4)}%(${String(n).padStart(3)})`);

console.log(`SNIPPET TABLE  source=${source}  samples=${rows.length}  cycles=${new Set(rows.map((r) => r.cycleId)).size}`);
console.log('\nTABLE 1 -- P(settles on the CURRENT side of the strike) by checkpoint and |moneyness| bps   [cell = win%(n); -- if n<20]');
console.log('t(s)   ' + BINS.map((b) => b[2].padStart(10)).join('') + '     all-sides   Wilson95');
for (const t of T) {
  const at = rows.filter((r) => r.checkpointSec === t && r.moneynessBps !== 0);
  let line = String(t).padStart(4) + '   ';
  for (const [lo, hi] of BINS) {
    const s = at.filter((r) => Math.abs(r.moneynessBps) >= lo && Math.abs(r.moneynessBps) < hi);
    const w = s.filter((r) => (r.moneynessBps > 0) === r.settledAboveStrike).length;
    line += cellS(w, s.length);
  }
  const w = at.filter((r) => (r.moneynessBps > 0) === r.settledAboveStrike).length; const [lo, hi] = wilson(w, at.length);
  line += `     ${(100 * w / at.length).toFixed(1)}%(${at.length})   [${(100 * lo).toFixed(1)}, ${(100 * hi).toFixed(1)}]`;
  console.log(line);
}
console.log('\nreading: at t=720s (3 min left) with price 10-15 bps off the strike, the cell is how often the current side wins.');

console.log(`\nTABLE 2 -- P(ENGINE direction correct vs strike) by checkpoint and confidence   ${source === 'candles' ? '[CANDLE-SOURCED: engine fields inflated, see FIDELITY DIAGNOSTICS]' : ''}`);
const CB: [number, number, string][] = [[0, 60, '<60'], [60, 70, '60-70'], [70, 80, '70-80'], [80, 90, '80-90'], [90, 101, '90+']];
console.log('t(s)   ' + CB.map((b) => b[2].padStart(10)).join('') + '     gate-allowed-only');
for (const t of T) {
  const at = rows.filter((r) => r.checkpointSec === t && r.engineDirCorrectVsStrike !== null);
  let line = String(t).padStart(4) + '   ';
  for (const [lo, hi] of CB) { const s = at.filter((r) => r.confidence >= lo && r.confidence < hi); line += cellS(s.filter((r) => r.engineDirCorrectVsStrike).length, s.length); }
  const g = at.filter((r) => r.gateAllowed); line += `     ${cellS(g.filter((r) => r.engineDirCorrectVsStrike).length, g.length)}`;
  console.log(line);
}
// does the engine add anything beyond "which side is price on"?
console.log('\nTABLE 3 -- engine direction vs the naive "current side of strike" at the same checkpoint');
for (const t of [480, 600, 720]) {
  const at = rows.filter((r) => r.checkpointSec === t && r.engineDirCorrectVsStrike !== null && r.moneynessBps !== 0);
  const agree = at.filter((r) => (r.direction === 'UP') === (r.moneynessBps > 0));
  const disagree = at.filter((r) => (r.direction === 'UP') !== (r.moneynessBps > 0));
  const naiveW = at.filter((r) => (r.moneynessBps > 0) === r.settledAboveStrike).length;
  console.log(`  t=${t}s  n=${at.length}  engine agrees with current side: ${(100 * agree.length / at.length).toFixed(1)}%  | engine ${cellS(at.filter((r) => r.engineDirCorrectVsStrike).length, at.length)}  naive ${cellS(naiveW, at.length)}  | when engine DISAGREES with current side: engine ${cellS(disagree.filter((r) => r.engineDirCorrectVsStrike).length, disagree.length)}`);
}
