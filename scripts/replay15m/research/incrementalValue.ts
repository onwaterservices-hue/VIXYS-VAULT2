#!/usr/bin/env npx tsx
/**
 * Item C -- Do the intracycle samples' ENGINE features add predictive information
 * beyond the strike-distance / time / volatility rule?
 *
 *   npx tsx scripts/replay15m/research/incrementalValue.ts <snippets.jsonl>
 *
 * Target: y = 1 if price settled on the side of the strike it was on at the
 * checkpoint ("current side wins"). Chronological split: first half of cycles
 * = TRAIN, second half = TEST. Nothing is fitted on TEST.
 *
 * Models (all logistic regression, gradient descent, L2):
 *   RULE      : |dist| bin one-hots x checkpoint one-hots + vol tercile   (what Layer 5 uses)
 *   RULE+ENG  : RULE + engine features at the checkpoint
 *               (confidence, lockQuality, alignedCount, evidenceAgreement, reversalRisk, gateAllowed)
 *   RULE+PRICE: RULE + price-only extras (mom60, mom300, flowShare60/180 when present)
 *   ENGINE    : engine features alone (does the engine's own state predict the criterion?)
 *
 * Metrics on TEST: log-loss, Brier, AUC, and -- the product view -- the lock
 * count and win% when locking at predicted p >= 0.95 and >= 0.90.
 * Incremental value = RULE+X beating RULE on log-loss/AUC out of sample.
 */
import { readFileSync } from 'fs';
const f = process.argv[2]; if (!f) { console.error('usage: incrementalValue.ts <snippets.jsonl>'); process.exit(2); }
const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.settledAboveStrike !== null && r.moneynessBps !== 0 && r.checkpointSec >= 180);
const byCycle = new Map<string, any[]>(); for (const r of rows) { if (!byCycle.has(r.cycleId)) byCycle.set(r.cycleId, []); byCycle.get(r.cycleId)!.push(r); }
for (const a of byCycle.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
const cycles = [...byCycle.keys()].sort(); const mid = cycles[Math.floor(cycles.length / 2)];
const runVol = (arr: any[], i: number) => { let hi = -1e9, lo = 1e9; for (let k = 0; k <= i; k++) { hi = Math.max(hi, arr[k].spot); lo = Math.min(lo, arr[k].spot); } return (hi - lo) / lo * 1e4; };
const DIST: [number, number][] = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 40], [40, 1e9]];
const CPS = [180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840];
const distIdx = (b: number) => DIST.findIndex(([lo, hi]) => Math.abs(b) >= lo && Math.abs(b) < hi);
// vol terciles from TRAIN only
const trainVol: number[] = []; for (const c of cycles.filter((c) => c < mid)) { const a = byCycle.get(c)!; a.forEach((r, i) => trainVol.push(runVol(a, i))); }
trainVol.sort((a, b) => a - b); const V1 = trainVol[Math.floor(trainVol.length / 3)], V2 = trainVol[Math.floor(trainVol.length * 2 / 3)];
type Sample = { x: number[]; y: number; cycleId: string; cp: number };
const samples: { name: string; feats: (r: any, vol: number) => number[] }[] = [];
const ruleFeats = (r: any, vol: number) => {
  const x: number[] = [];
  const d = distIdx(r.moneynessBps); for (let i = 0; i < DIST.length; i++) x.push(i === d ? 1 : 0);
  for (const c of CPS) x.push(r.checkpointSec === c ? 1 : 0);
  x.push(vol < V1 ? 1 : 0, vol >= V1 && vol < V2 ? 1 : 0, vol >= V2 ? 1 : 0);
  // interaction: distance x late (>=600s) -- lets the table's shape be approximated
  x.push(d >= 3 && r.checkpointSec >= 600 ? 1 : 0, d <= 1 && r.checkpointSec <= 360 ? 1 : 0);
  return x;
};
const engFeats = (r: any) => {
  // sign-align directional engine output with the CURRENT side: +1 if the engine's direction matches the side price is on
  const agree = (r.direction === 'UP') === (r.moneynessBps > 0) ? 1 : r.direction === 'NEUTRAL' ? 0 : -1;
  return [(r.confidence ?? 50) / 100, (r.lockQuality ?? 0) / 100, (r.alignedCount ?? 0) / 5, (r.evidenceAgreement ?? 0) / 11, (r.reversalRisk ?? 0) / 100, r.gateAllowed ? 1 : 0, agree];
};
const priceFeats = (r: any) => {
  const s = Math.sign(r.moneynessBps);
  return [s * (r.mom60Bps ?? 0) / 10, s * (r.mom300Bps ?? 0) / 10, r.flowShare60 == null ? 0 : s * (r.flowShare60 - 0.5) * 2, r.flowShare180 == null ? 0 : s * (r.flowShare180 - 0.5) * 2];
};
// Empirical table fitted on TRAIN only (mirrors exportStrikeSideTable, MIN_N=30);
// unknown cells fall back to the TRAIN base rate. This is the real Layer 5 base.
const tableCells = new Map<string, { n: number; w: number }>(); let baseW = 0, baseN = 0;
for (const c of cycles.filter((c) => c < mid)) { const a = byCycle.get(c)!; a.forEach((r, i) => { const k = `${r.checkpointSec}|${distIdx(r.moneynessBps)}|${(() => { const v = runVol(a, i); return v < V1 ? 'L' : v < V2 ? 'M' : 'H'; })()}`; const cell = tableCells.get(k) || { n: 0, w: 0 }; cell.n++; const y = (r.moneynessBps > 0) === r.settledAboveStrike ? 1 : 0; cell.w += y; tableCells.set(k, cell); baseN++; baseW += y; }); }
const baseRate = baseW / baseN;
const tableP = (r: any, vol: number) => { const k = `${r.checkpointSec}|${distIdx(r.moneynessBps)}|${vol < V1 ? 'L' : vol < V2 ? 'M' : 'H'}`; const c = tableCells.get(k); return c && c.n >= 30 ? c.w / c.n : baseRate; };
const logit = (p: number) => Math.log(Math.min(1 - 1e-4, Math.max(1e-4, p)) / (1 - Math.min(1 - 1e-4, Math.max(1e-4, p))));
const MODELS: Record<string, (r: any, vol: number) => number[]> = {
  'TABLE (Layer 5 base)': (r, v) => [logit(tableP(r, v))],
  'TABLE+ENGINE': (r, v) => [logit(tableP(r, v)), ...engFeats(r)],
  'TABLE+PRICE': (r, v) => [logit(tableP(r, v)), ...priceFeats(r)],
  'TABLE+ENGINE+PRICE': (r, v) => [logit(tableP(r, v)), ...engFeats(r), ...priceFeats(r)],
  'ENGINE only': (r) => engFeats(r),
};
function build(feats: (r: any, v: number) => number[]) {
  const tr: Sample[] = [], te: Sample[] = [];
  for (const c of cycles) { const a = byCycle.get(c)!; a.forEach((r, i) => { const vol = runVol(a, i); const y = (r.moneynessBps > 0) === r.settledAboveStrike ? 1 : 0; (c < mid ? tr : te).push({ x: feats(r, vol), y, cycleId: c, cp: r.checkpointSec }); }); }
  return { tr, te };
}
function fit(tr: Sample[], l2 = 1e-4, epochs = 400, lr = 0.2) {
  const d = tr[0].x.length; const w = new Array(d).fill(0); let b = 0;
  for (let e = 0; e < epochs; e++) { const gw = new Array(d).fill(0); let gb = 0;
    for (const s of tr) { let z = b; for (let i = 0; i < d; i++) z += w[i] * s.x[i]; const p = 1 / (1 + Math.exp(-z)); const g = p - s.y; gb += g; for (let i = 0; i < d; i++) gw[i] += g * s.x[i]; }
    const n = tr.length; for (let i = 0; i < d; i++) w[i] -= lr * (gw[i] / n + l2 * w[i]); b -= lr * gb / n; }
  return (x: number[]) => { let z = b; for (let i = 0; i < x.length; i++) z += w[i] * x[i]; return 1 / (1 + Math.exp(-z)); };
}
function evaluate(te: Sample[], pred: (x: number[]) => number) {
  let ll = 0, br = 0; const ps: [number, number][] = [];
  for (const s of te) { const p = Math.min(1 - 1e-6, Math.max(1e-6, pred(s.x))); ll += -(s.y * Math.log(p) + (1 - s.y) * Math.log(1 - p)); br += (p - s.y) ** 2; ps.push([p, s.y]); }
  // AUC via rank
  const pos = ps.filter(([, y]) => y === 1).length, neg = ps.length - pos; ps.sort((a, b) => a[0] - b[0]); let rankSum = 0; ps.forEach(([, y], i) => { if (y === 1) rankSum += i + 1; });
  const auc = pos && neg ? (rankSum - pos * (pos + 1) / 2) / (pos * neg) : NaN;
  // product view: first checkpoint per cycle with p >= bar
  const policy = (bar: number) => { const seen = new Set<string>(); let locks = 0, wins = 0; const byCyc = new Map<string, Sample[]>(); for (const s of te) { if (!byCyc.has(s.cycleId)) byCyc.set(s.cycleId, []); byCyc.get(s.cycleId)!.push(s); } for (const [c, arr] of byCyc) { arr.sort((a, b) => a.cp - b.cp); for (const s of arr) { if (pred(s.x) >= bar) { locks++; if (s.y) wins++; break; } } } return { locks, wins, cycles: byCyc.size }; };
  return { ll: ll / te.length, brier: br / te.length, auc, p95: policy(0.95), p90: policy(0.90) };
}
console.log(`INCREMENTAL VALUE  ${f.split('/').pop()}  samples=${rows.length}  cycles=${cycles.length}  train<${mid}`);
console.log(`base rate (train) = ${(100*baseRate).toFixed(1)}%  |  table cells fitted: ${tableCells.size}`);
console.log('model               log-loss  Brier   AUC   | lock@0.95: n  win%   | lock@0.90: n  win%   (TEST half)');
const base: any = {};
for (const [name, feats] of Object.entries(MODELS)) {
  const { tr, te } = build(feats); const pred = fit(tr); const m = evaluate(te, pred);
  if (name.startsWith('TABLE (')) base.ll = m.ll;
  const w95 = m.p95.locks ? (100 * m.p95.wins / m.p95.locks).toFixed(1) : '--', w90 = m.p90.locks ? (100 * m.p90.wins / m.p90.locks).toFixed(1) : '--';
  console.log(`${name.padEnd(22)} ${m.ll.toFixed(4)}   ${m.brier.toFixed(4)}  ${m.auc.toFixed(3)} | ${String(m.p95.locks).padStart(4)}  ${w95.padStart(5)}%  | ${String(m.p90.locks).padStart(4)}  ${w90.padStart(5)}%   ${name.startsWith('TABLE (') ? '' : `Δlog-loss vs TABLE ${(m.ll - base.ll >= 0 ? '+' : '')}${(m.ll - base.ll).toFixed(4)}`}`);
}
console.log('\nreading: a model adds information only if it LOWERS log-loss / raises AUC on the TEST half. Small deltas (< ~0.005 log-loss) are noise at this n.');
