#!/usr/bin/env npx tsx
/**
 * E3b -- Does REAL taker order flow carry 15-minute directional information?
 *
 * The engine's "order flow" input is derived from price vs strike (see
 * tests/feature-independence.characterization.mjs). This asks the question the
 * engine never asks: using the genuine taker buy/sell split from Coinbase trade
 * prints, at a fixed checkpoint T inside EVERY cycle, does net flow over the
 * preceding W seconds predict the direction of price from T to cycle end?
 *
 * Evaluated on all cycles (not only locked ones), against price at T (not the
 * strike), so it is a pure forecasting test with no strike artefact. No engine
 * code is touched. No look-ahead: every feature is computed from ticks < T.
 *
 * Comparators at the same checkpoints:
 *   moneyness  sign(price(T) - open)         -- what the engine effectively uses
 *   momentum   sign(price(T) - price(T-60))
 *
 * Usage: npx tsx scripts/replay15m/research/flowSkill.ts <startIso> <endIso>
 */
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CACHE = join(ROOT, '.cache', 'replay15m', 'BTC-USD-trades-3s');
const CYCLE = 900_000, HOUR = 3_600_000;

interface Tick { tsMs: number; price: number; tradeCount: number; buyVolume: number; sellVolume: number; }
const [startIso, endIso] = process.argv.slice(2);
if (!startIso || !endIso) { console.error('usage: flowSkill.ts <startIso> <endIso>'); process.exit(2); }
const startMs = Date.parse(startIso), endMs = Date.parse(endIso);

// ---- load real buckets only (the cache never persists synthetic rows) ----
const ticks: Tick[] = [];
let hoursMissing = 0;
for (let h = Math.floor(startMs / HOUR) * HOUR; h < endMs; h += HOUR) {
  const f = join(CACHE, `${h}.json`);
  if (!existsSync(f)) { hoursMissing++; continue; }
  for (const t of JSON.parse(readFileSync(f, 'utf8'))) if (t.tsMs >= startMs && t.tsMs < endMs) ticks.push(t);
}
ticks.sort((a, b) => a.tsMs - b.tsMs);
const ts = ticks.map((t) => t.tsMs);
const lastIdxAtOrBefore = (ms: number) => { let lo = 0, hi = ts.length - 1, ans = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (ts[m] <= ms) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; };
const firstIdxAtOrAfter = (ms: number) => { let lo = 0, hi = ts.length - 1, ans = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (ts[m] >= ms) { ans = m; hi = m - 1; } else lo = m + 1; } return ans; };
const priceAt = (ms: number) => { const i = lastIdxAtOrBefore(ms); return i < 0 ? null : ticks[i].price; };

// ---- stats helpers ----
const binomP = (k: number, n: number) => { // exact two-sided vs 0.5
  const lg = (x: number) => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; };
  const pmf = (i: number) => Math.exp(lg(n) - lg(i) - lg(n - i) - n * Math.LN2);
  const pk = pmf(k); let p = 0; for (let i = 0; i <= n; i++) { const pi = pmf(i); if (pi <= pk * (1 + 1e-9)) p += pi; } return Math.min(1, p);
};
const fmt = (w: number, n: number) => n ? `${(100 * w / n).toFixed(1)}%`.padStart(6) : '    --';

// ---- experiment grid ----
const CHECKPOINTS = [180, 300, 420, 480, 600, 720];   // seconds into the cycle
const WINDOWS = [30, 60, 120, 180, 300];               // flow lookback seconds
type Cell = { n: number; w: number; strongN: number; strongW: number };
const cell = (): Cell => ({ n: 0, w: 0, strongN: 0, strongW: 0 });
const flow: Record<string, Cell> = {}, mny: Record<number, Cell> = {}, mom: Record<number, Cell> = {};
for (const T of CHECKPOINTS) { mny[T] = cell(); mom[T] = cell(); for (const W of WINDOWS) flow[`${T}:${W}`] = cell(); }

// strength threshold for "strong" flow: |buy share - 0.5| in the top third,
// computed per (T,W) after a first pass so it is data-driven, not hand-picked.
const shares: Record<string, number[]> = {}; for (const k of Object.keys(flow)) shares[k] = [];

let cycles = 0, skipped = 0;
const cycleRows: any[] = [];
for (let cs = Math.ceil(startMs / CYCLE) * CYCLE; cs + CYCLE < endMs; cs += CYCLE) {
  const openP = priceAt(cs); const endIdx = firstIdxAtOrAfter(cs + CYCLE);
  if (openP == null || endIdx < 0) { skipped++; continue; }
  const endP = ticks[endIdx].price;                       // first observation of the next cycle = settlement convention
  const a = firstIdxAtOrAfter(cs), b = lastIdxAtOrBefore(cs + CYCLE - 1);
  if (a < 0 || b < a || (b - a) < 0.8 * 300) { skipped++; continue; }  // coverage floor: 80% of 3s buckets
  cycles++;
  const row: any = { cycleStart: cs, open: openP, end: endP };
  for (const T of CHECKPOINTS) {
    const tMs = cs + T * 1000; const pT = priceAt(tMs); if (pT == null) continue;
    const up = endP >= pT;                                 // actual direction from T to cycle end
    if (endP === pT) continue;                             // exclude exact ties from every predictor
    // moneyness comparator
    if (pT !== openP) { mny[T].n++; if ((pT > openP) === up) mny[T].w++; }
    // momentum comparator
    const p60 = priceAt(tMs - 60_000); if (p60 != null && pT !== p60) { mom[T].n++; if ((pT > p60) === up) mom[T].w++; }
    for (const W of WINDOWS) {
      const i0 = firstIdxAtOrAfter(tMs - W * 1000), i1 = lastIdxAtOrBefore(tMs - 1);   // strictly before T
      if (i0 < 0 || i1 < i0) continue;
      let buy = 0, sell = 0; for (let i = i0; i <= i1; i++) { buy += ticks[i].buyVolume; sell += ticks[i].sellVolume; }
      if (buy + sell === 0 || buy === sell) continue;
      const share = buy / (buy + sell); const key = `${T}:${W}`;
      flow[key].n++; if ((buy > sell) === up) flow[key].w++;
      shares[key].push(Math.abs(share - 0.5));
      row[key] = { share, hit: (buy > sell) === up };
    }
  }
  cycleRows.push(row);
}
// second pass: strong-flow subset (top tercile of |share-0.5|)
for (const key of Object.keys(flow)) {
  const s = [...shares[key]].sort((x, y) => x - y); const thr = s.length ? s[Math.floor(s.length * 2 / 3)] : Infinity;
  for (const r of cycleRows) { const c = r[key]; if (!c) continue; if (Math.abs(c.share - 0.5) >= thr) { flow[key].strongN++; if (c.hit) flow[key].strongW++; } }
}

console.log(`E3b REAL TAKER FLOW vs 15M DIRECTION   ${startIso} -> ${endIso}`);
console.log(`cycles evaluated: ${cycles}   skipped (coverage): ${skipped}   hours missing from cache: ${hoursMissing}`);
console.log('prediction: sign(taker buy - taker sell) over the W seconds BEFORE checkpoint T; actual: sign(price(cycle end) - price(T))');
console.log('');
console.log('checkpoint T   |  moneyness  momentum60 |  flow W=30   W=60    W=120   W=180   W=300  |  strong-flow (top tercile |share-0.5|) W=60  W=180  W=300');
for (const T of CHECKPOINTS) {
  const m = mny[T], o = mom[T];
  let line = `T=${String(T).padStart(3)}s        |  ${fmt(m.w, m.n)}(${m.n})  ${fmt(o.w, o.n)}(${o.n}) |`;
  for (const W of WINDOWS) { const c = flow[`${T}:${W}`]; line += ` ${fmt(c.w, c.n)}`; }
  line += '  |';
  for (const W of [60, 180, 300]) { const c = flow[`${T}:${W}`]; line += `  ${fmt(c.strongW, c.strongN)}(${c.strongN})`; }
  console.log(line);
}
console.log('');
console.log('exact two-sided binomial p vs 50% (flow, all cycles):');
for (const T of CHECKPOINTS) {
  let line = `  T=${String(T).padStart(3)}s `;
  for (const W of WINDOWS) { const c = flow[`${T}:${W}`]; line += ` W=${String(W).padEnd(3)} p=${c.n ? binomP(c.w, c.n).toFixed(2) : ' -- '}`; }
  console.log(line);
}
// best cell, with the honest caveat that picking the best of 30 cells inflates it
let best: any = null; for (const [k, c] of Object.entries(flow)) { if (c.n >= 100) { const p = binomP(c.w, c.n); if (!best || p < best.p) best = { k, ...c, p }; } }
if (best) console.log(`\nlowest p of ${Object.keys(flow).length} cells: ${best.k} -> ${fmt(best.w, best.n)} (n=${best.n}) p=${best.p.toFixed(3)}   [multiple-comparison caveat: 30 cells, expect ~1.5 at p<0.05 by chance]`);
