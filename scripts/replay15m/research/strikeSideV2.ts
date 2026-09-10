#!/usr/bin/env npx tsx
/**
 * STRIKE-SIDE MODEL v2 — candidate tables, pre-registered selection, one look at TEST.
 *
 *   npx tsx scripts/replay15m/research/strikeSideV2.ts <fit.jsonl> <test.jsonl> <shippedTable.json> [--val-from ISO] [--bar 0.95] [--out v2.json]
 *
 * PROTOCOL (written before any number below was seen):
 *   FIT  = cycles in <fit.jsonl> starting BEFORE --val-from (default 2026-09-06T00:00Z)
 *   VAL  = cycles in <fit.jsonl> starting AT/AFTER --val-from
 *   TEST = every cycle in <test.jsonl> (the untouched window the shipped v1 was
 *          already falsified on; each candidate is scored on it exactly once,
 *          AFTER selection, and the selection never sees it)
 *
 *   Every candidate is an EMPIRICAL TABLE (n, w per cell, p = w/n, p:null when
 *   n < MIN_N), fitted on FIT only. The policy is the shipped one: inside the
 *   legal window [360, 780) at the first checkpoint whose cell has p >= bar,
 *   lock the CURRENT side of the open strike; else SKIP.
 *
 *   SELECTION RULE (fixed a priori): among candidates whose VAL win% >= bar
 *   AND VAL Wilson-95 lower bound >= 0.90 AND VAL locks >= 30, pick the one
 *   with the HIGHEST VAL lock rate. Ties -> fewer dimensions. If none
 *   qualifies, v2 is not promoted and this script says so.
 *
 *   Candidates differ only in which decision-time features key the table.
 *   Every feature is computable at the checkpoint from ticks <= t:
 *     cp      checkpoint second (60s grid)
 *     dist    |spot - strike| bin in bps (7 bins, as v1; or 12 finer bins)
 *     vol     running range tercile (terciles fitted on FIT at t=300, as v1)
 *     trend60 sign of the last-60s move RELATIVE TO THE SIDE: away / toward / flat
 *     trend300 same over 300s
 *     flow60  taker buy share over the last 60s relative to the side: with / against / neutral
 *
 * Nothing here touches the engine. Output: a ranked report and, if a candidate
 * is selected, a v2 table JSON in the v1 format plus the extra key dimension.
 */
import { readFileSync, writeFileSync } from 'fs';

const argv = process.argv.slice(2);
const [fitFile, testFile, shippedFile] = argv;
if (!fitFile || !testFile || !shippedFile) { console.error('usage: strikeSideV2.ts <fit.jsonl> <test.jsonl> <shippedTable.json> [--val-from ISO] [--bar 0.95] [--out v2.json]'); process.exit(2); }
const opt = (k: string, d: string | null = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const VAL_FROM = Date.parse(opt('val-from', '2026-09-06T00:00:00Z')!);
const BAR = Number(opt('bar', '0.95'));
const OUT = opt('out');
const MIN_N = 30;
const WIN_LO = 360, WIN_HI = 780;

type Row = any;
const load = (f: string): Row[] => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.settledAboveStrike !== null && r.settledAboveStrike !== undefined);
const group = (rows: Row[]) => { const m = new Map<string, Row[]>(); for (const r of rows) { if (!m.has(r.cycleId)) m.set(r.cycleId, []); m.get(r.cycleId)!.push(r); } for (const a of m.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec); return m; };
const startMs = (id: string) => Date.parse(id.replace(/^15M-/, ''));

const fitRows = load(fitFile), testRows = load(testFile);
const fitAll = group(fitRows), testAll = group(testRows);
const FIT = [...fitAll.keys()].filter((id) => startMs(id) < VAL_FROM).sort();
const VAL = [...fitAll.keys()].filter((id) => startMs(id) >= VAL_FROM).sort();
const TEST = [...testAll.keys()].sort();
const cyclesOf = (ids: string[], src: Map<string, Row[]>) => ids.map((id) => src.get(id)!);

// ---- features (all from ticks <= t) --------------------------------------
const runningVol = (a: Row[], i: number) => { let hi = -1e9, lo = 1e9; for (let k = 0; k <= i; k++) { hi = Math.max(hi, a[k].spot); lo = Math.min(lo, a[k].spot); } return (hi - lo) / lo * 1e4; };
const DIST7: [number, number][] = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 40], [40, 1e9]];
const DIST12: [number, number][] = [[0, 2], [2, 4], [4, 6], [6, 8], [8, 10], [10, 13], [13, 16], [16, 20], [20, 25], [25, 32], [32, 40], [40, 1e9]];
const binOf = (bins: [number, number][], bps: number) => bins.findIndex(([lo, hi]) => Math.abs(bps) >= lo && Math.abs(bps) < hi);
// vol terciles on FIT at t=300 (v1's convention)
const fitVol300 = cyclesOf(FIT, fitAll).map((a) => { const i = a.findIndex((r) => r.checkpointSec === 300); return i < 0 ? null : runningVol(a, i); }).filter((v): v is number => v !== null).sort((a, b) => a - b);
const V1 = fitVol300[Math.floor(fitVol300.length / 3)], V2 = fitVol300[Math.floor(fitVol300.length * 2 / 3)];
const volBin = (v: number) => (v < V1 ? 'L' : v < V2 ? 'M' : 'H');
const side = (r: Row) => (r.moneynessBps > 0 ? 1 : -1);
const trendBin = (mom: number | null, s: number, flatBps = 1) => (mom === null || mom === undefined ? null : Math.abs(mom) < flatBps ? 'F' : mom * s > 0 ? 'A' : 'T'); // Away / Toward / Flat
const flowBin = (share: number | null, s: number) => (share === null || share === undefined ? null : share > 0.55 ? (s > 0 ? 'W' : 'G') : share < 0.45 ? (s > 0 ? 'G' : 'W') : 'N'); // With / aGainst / Neutral

interface Cand { name: string; dims: string; key: (r: Row, a: Row[], i: number) => string | null; keyFormat: string }
const FIT_SOURCE = fitRows[0]?.source ?? 'unknown';
const CANDS: Cand[] = [
  { name: `M1 cp|dist7|vol (v1 structure, refit on ${FIT_SOURCE})`, dims: 'cp,dist7,vol', keyFormat: 'checkpointSec|distBinIndex|volBin(L|M|H)', key: (r, a, i) => `${r.checkpointSec}|${binOf(DIST7, r.moneynessBps)}|${volBin(runningVol(a, i))}` },
  { name: 'M2 cp|dist7', dims: 'cp,dist7', keyFormat: 'checkpointSec|distBinIndex', key: (r) => `${r.checkpointSec}|${binOf(DIST7, r.moneynessBps)}` },
  { name: 'M3 cp|dist7|trend60', dims: 'cp,dist7,trend60', keyFormat: 'checkpointSec|distBinIndex|trend60(A|T|F)', key: (r) => { const t = trendBin(r.mom60Bps, side(r)); return t ? `${r.checkpointSec}|${binOf(DIST7, r.moneynessBps)}|${t}` : null; } },
  { name: 'M4 cp|dist7|trend300', dims: 'cp,dist7,trend300', keyFormat: 'checkpointSec|distBinIndex|trend300(A|T|F)', key: (r) => { const t = trendBin(r.mom300Bps, side(r), 2); return t ? `${r.checkpointSec}|${binOf(DIST7, r.moneynessBps)}|${t}` : null; } },
  { name: 'M5 cp|dist7|vol|trend60', dims: 'cp,dist7,vol,trend60', keyFormat: 'checkpointSec|distBinIndex|volBin|trend60', key: (r, a, i) => { const t = trendBin(r.mom60Bps, side(r)); return t ? `${r.checkpointSec}|${binOf(DIST7, r.moneynessBps)}|${volBin(runningVol(a, i))}|${t}` : null; } },
  { name: 'M6 cp|dist7|flow60', dims: 'cp,dist7,flow60', keyFormat: 'checkpointSec|distBinIndex|flow60(W|G|N)', key: (r) => { const f = flowBin(r.flowShare60, side(r)); return f ? `${r.checkpointSec}|${binOf(DIST7, r.moneynessBps)}|${f}` : null; } },
  { name: 'M7 cp|dist12', dims: 'cp,dist12', keyFormat: 'checkpointSec|distBin12Index', key: (r) => `${r.checkpointSec}|${binOf(DIST12, r.moneynessBps)}` },
  { name: 'M8 cp|dist12|trend60', dims: 'cp,dist12,trend60', keyFormat: 'checkpointSec|distBin12Index|trend60(A|T|F)', key: (r) => { const t = trendBin(r.mom60Bps, side(r)); return t ? `${r.checkpointSec}|${binOf(DIST12, r.moneynessBps)}|${t}` : null; } },
  { name: 'M9 cp|dist12|vol', dims: 'cp,dist12,vol', keyFormat: 'checkpointSec|distBin12Index|volBin(L|M|H)', key: (r, a, i) => `${r.checkpointSec}|${binOf(DIST12, r.moneynessBps)}|${volBin(runningVol(a, i))}` },
];

// ---- fit -------------------------------------------------------------------
type Table = Record<string, { n: number; w: number; p: number | null }>;
function fit(c: Cand, ids: string[], src: Map<string, Row[]>): Table {
  const cells: Record<string, { n: number; w: number }> = {};
  for (const a of cyclesOf(ids, src)) a.forEach((r, i) => { if (r.moneynessBps === 0) return; const k = c.key(r, a, i); if (k === null || k.includes('|-1')) return; cells[k] ??= { n: 0, w: 0 }; cells[k].n++; if ((r.moneynessBps > 0) === Boolean(r.settledAboveStrike)) cells[k].w++; });
  const t: Table = {}; for (const [k, v] of Object.entries(cells)) t[k] = { n: v.n, w: v.w, p: v.n >= MIN_N ? Math.round((v.w / v.n) * 1000) / 1000 : null };
  return t;
}
// The shipped v1 table, evaluated with ITS OWN terciles (not FIT's).
const SHIPPED = JSON.parse(readFileSync(shippedFile, 'utf8'));
const shippedVolBin = (v: number) => (v < SHIPPED.volTercilesBps.L_below ? 'L' : v < SHIPPED.volTercilesBps.H_atOrAbove ? 'M' : 'H');
const M0: Cand = { name: `M0 SHIPPED ${SHIPPED.version} (candles, ${SHIPPED.window.cycles} cycles)`, dims: 'cp,dist7,vol', keyFormat: SHIPPED.keyFormat, key: (r, a, i) => `${r.checkpointSec}|${binOf(SHIPPED.distBinsBps.map(([lo, hi]: [number, number | null]) => [lo, hi === null ? 1e9 : hi]), r.moneynessBps)}|${shippedVolBin(runningVol(a, i))}` };
const M0_TABLE: Table = SHIPPED.cells;

// ---- evaluate ----------------------------------------------------------------
type Lock = { id: string; t: number; side: 'UP' | 'DOWN'; p: number; key: string; won: boolean };
function run(c: Cand, table: Table, ids: string[], src: Map<string, Row[]>) {
  const locks: Lock[] = []; let skips = 0; const cal: Record<string, { n: number; w: number; ps: number }> = {};
  for (const id of ids) {
    const a = src.get(id)!; let locked: Lock | null = null;
    a.forEach((r, i) => {
      if (r.moneynessBps === 0) return; const k = c.key(r, a, i); if (k === null || k.includes('|-1')) return;
      const cell = table[k]; if (!cell || cell.p === null) return;
      const won = (r.moneynessBps > 0) === Boolean(r.settledAboveStrike);
      const b = cell.p >= 0.95 ? '0.95+' : cell.p >= 0.9 ? '0.90' : cell.p >= 0.8 ? '0.80' : '<0.80'; cal[b] ??= { n: 0, w: 0, ps: 0 }; cal[b].n++; cal[b].ps += cell.p; if (won) cal[b].w++;
      if (locked || r.checkpointSec < WIN_LO || r.checkpointSec >= WIN_HI || cell.p < BAR) return;
      locked = { id, t: r.checkpointSec, side: r.moneynessBps > 0 ? 'UP' : 'DOWN', p: cell.p, key: k, won };
    });
    if (locked) locks.push(locked); else skips++;
  }
  const w = locks.filter((l) => l.won).length, n = locks.length;
  return { locks, skips, n, w, win: n ? w / n : NaN, lockRate: ids.length ? n / ids.length : NaN, wilsonLo: wilson(w, n)[0], cal };
}
function wilson(w: number, n: number): [number, number] { if (!n) return [NaN, NaN]; const z = 1.96, p = w / n, den = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n); return [(c - m) / den, (c + m) / den]; }
const pct = (x: number) => (Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '--');
const med = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const line = (label: string, r: ReturnType<typeof run>, ids: string[]) => `${label.padEnd(46)} cyc ${String(ids.length).padStart(4)}  locks ${String(r.n).padStart(4)} (${pct(r.lockRate).padStart(6)})  win ${pct(r.win).padStart(6)}  wilsonLo ${pct(r.wilsonLo).padStart(6)}  med t ${Number.isFinite(med(r.locks.map((l) => l.t))) ? med(r.locks.map((l) => l.t)) + 's' : '--'}  UP ${r.locks.filter((l) => l.side === 'UP' && l.won).length}/${r.locks.filter((l) => l.side === 'UP').length}  DOWN ${r.locks.filter((l) => l.side === 'DOWN' && l.won).length}/${r.locks.filter((l) => l.side === 'DOWN').length}`;

console.log(`FIT  ${FIT.length} cycles (${FIT[0]} -> ${FIT[FIT.length - 1]})  source ${fitRows[0]?.source}`);
console.log(`VAL  ${VAL.length} cycles (${VAL[0]} -> ${VAL[VAL.length - 1]})`);
console.log(`TEST ${TEST.length} cycles (${TEST[0]} -> ${TEST[TEST.length - 1]})  source ${testRows[0]?.source}`);
console.log(`vol terciles on FIT @300s: L<${V1.toFixed(1)}  H>=${V2.toFixed(1)} bps   bar ${BAR}  window [${WIN_LO},${WIN_HI})  MIN_N ${MIN_N}`);
const hasFlow = fitRows.some((r) => typeof r.flowShare60 === 'number');
console.log(`flow feature available: ${hasFlow}`);

console.log('\nVALIDATION (selection happens here and only here)');
const results: { c: Cand; table: Table; val: ReturnType<typeof run>; cells: number; known: number }[] = [];
{
  const r0 = run(M0, M0_TABLE, VAL, fitAll); console.log(line(M0.name, r0, VAL));
  results.push({ c: M0, table: M0_TABLE, val: r0, cells: Object.keys(M0_TABLE).length, known: Object.values(M0_TABLE).filter((x) => x.p !== null).length });
}
for (const c of CANDS) {
  if (c.dims.includes('flow') && !hasFlow) { console.log(`${c.name.padEnd(46)} skipped (no flow feature in snippets)`); continue; }
  const table = fit(c, FIT, fitAll); const r = run(c, table, VAL, fitAll);
  results.push({ c, table, val: r, cells: Object.keys(table).length, known: Object.values(table).filter((x) => x.p !== null).length });
  console.log(line(c.name, r, VAL) + `  cells ${Object.keys(table).length} (${Object.values(table).filter((x) => x.p !== null).length} known)`);
}
const eligible = results.filter((x) => x.c !== M0 && x.val.n >= 30 && x.val.win >= BAR && x.val.wilsonLo >= 0.90);
eligible.sort((a, b) => (b.val.lockRate - a.val.lockRate) || (a.c.dims.split(',').length - b.c.dims.split(',').length));
const chosen = eligible[0] ?? null;
console.log(`\nSELECTION RULE: VAL win >= ${BAR}, VAL Wilson-lo >= 0.90, VAL locks >= 30, then highest VAL lock rate, then fewer dims.`);
console.log(`eligible: ${eligible.map((x) => x.c.name.split(' ')[0]).join(', ') || 'none'}`);
console.log(chosen ? `CHOSEN: ${chosen.c.name}` : 'NO CANDIDATE QUALIFIES — v2 is not promoted.');

console.log('\nTEST (one look, after selection; M0 shown for reference — its TEST numbers were already published)');
const t0 = run(M0, M0_TABLE, TEST, testAll); console.log(line(M0.name, t0, TEST));
if (chosen) {
  const tc = run(chosen.c, chosen.table, TEST, testAll); console.log(line(chosen.c.name, tc, TEST));
  const [lo, hi] = wilson(tc.w, tc.n); console.log(`  TEST Wilson95 [${pct(lo)}, ${pct(hi)}]  locks by t: ${Object.entries(tc.locks.reduce((m: Record<number, number>, l) => { m[l.t] = (m[l.t] ?? 0) + 1; return m; }, {})).sort((a, b) => +a[0] - +b[0]).map(([t, n]) => `${t}s×${n}`).join(' ')}`);
  console.log('  TEST calibration of the chosen table\'s p:'); for (const b of ['<0.80', '0.80', '0.90', '0.95+']) { const c = tc.cal[b]; if (c) console.log(`    p ${b.padEnd(6)} n ${String(c.n).padStart(5)}  predicted ${pct(c.ps / c.n)}  realised ${pct(c.w / c.n)}`); }
  // The honest comparison: same window, same policy, same bar.
  console.log(`\n  Δ vs shipped on TEST: locks ${tc.n - t0.n >= 0 ? '+' : ''}${tc.n - t0.n}, win ${((tc.win - t0.win) * 100).toFixed(1)} pts`);
  if (OUT) {
    const cyc = FIT;
    const out = {
      version: 'strike-side-v2', fittedAt: new Date().toISOString(), source: fitRows[0]?.source ?? 'unknown', candidate: chosen.c.name, dims: chosen.c.dims,
      protocol: { fit: { firstCycle: cyc[0], lastCycle: cyc[cyc.length - 1], cycles: cyc.length }, val: { firstCycle: VAL[0], lastCycle: VAL[VAL.length - 1], cycles: VAL.length, locks: chosen.val.n, win: chosen.val.win }, test: { firstCycle: TEST[0], lastCycle: TEST[TEST.length - 1], cycles: TEST.length, locks: tc.n, win: tc.win, wilson95: [lo, hi] }, selectionRule: `VAL win>=${BAR} & Wilson-lo>=0.90 & locks>=30, max lock rate, fewer dims` },
      minN: MIN_N, bar: BAR, distBinsBps: (chosen.c.dims.includes('dist12') ? DIST12 : DIST7).map(([lo, hi]) => [lo, hi === 1e9 ? null : hi]),
      volTercilesBps: { L_below: Math.round(V1 * 10) / 10, H_atOrAbove: Math.round(V2 * 10) / 10, measuredAtSec: 300 }, trendFlatBps: { trend60: 1, trend300: 2 },
      checkpointSecs: [...new Set(fitRows.map((r) => r.checkpointSec))].sort((a, b) => a - b), keyFormat: chosen.c.keyFormat, cells: chosen.table,
    };
    writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(`\nwrote ${OUT}`);
  }
}
