#!/usr/bin/env npx tsx
/**
 * FALSIFICATION — evaluate the SHIPPED strike-side table on cycles it never saw.
 *
 *   npx tsx scripts/replay15m/research/evalShippedTable.ts <table.json> <snippets.jsonl> [--after 2026-09-08T00:00:00Z] [--bar 0.95]
 *
 * The table is the exact artifact the engine loads (src/data/strikeSideTable.v1.json:
 * cells keyed checkpointSec|distBin|volBin with n/w/p, vol terciles fixed at fit
 * time). Nothing is refitted here. For every cycle in the snippets file that
 * starts AFTER the table's last fitted cycle (or --after), the rule is replayed
 * exactly as the engine's shadow does it: at each 60s checkpoint inside the
 * legal entry window (360-780s), if the cell's p >= bar the CURRENT side of the
 * open strike is locked once; otherwise SKIP. Locks are graded against
 * settledAboveStrike. Nothing uses the outcome to decide.
 *
 * Reported (every number computed from the rows; `--` where not computable):
 *   1. untouched OOS: cycles, locks, lock%, win%, Wilson 95%, bootstrap 95%
 *      (cycle-level resample), median time-to-lock, UP / DOWN splits
 *   2. threshold perturbation: bars 0.85 / 0.90 / 0.93 / 0.95 / 0.97
 *   3. window perturbation: 360-720, 360-780, 420-780, 480-780
 *   4. dimension ablation from the table's own n/w: pool over vol tercile;
 *      pool over checkpoint (per distance bin); both
 *   5. calibration of the table's p on the OOS cycles (bucketed)
 *   6. the CURRENT ENGINE's own locks on the same cycles (from the snippets'
 *      gateAllowed flag, first allowed checkpoint), graded the same way
 * Volatility uses only spots up to t (no look-ahead), the same running range
 * over checkpoint spots the export script used, with the table's terciles.
 */
import { readFileSync } from 'fs';

const argv = process.argv.slice(2);
const [tableFile, snippetsFile] = argv;
if (!tableFile || !snippetsFile) { console.error('usage: evalShippedTable.ts <table.json> <snippets.jsonl> [--after ISO] [--bar 0.95]'); process.exit(2); }
const opt = (k: string, d: string | null = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const T = JSON.parse(readFileSync(tableFile, 'utf8'));
const DIST: [number, number | null][] = T.distBinsBps;
const V1 = T.volTercilesBps.L_below, V2 = T.volTercilesBps.H_atOrAbove;
const CPS: number[] = T.checkpointSecs;
const lastFitted: string = T.window.lastCycle; // "15M-<ISO>"
const afterIso = opt('after', lastFitted.replace(/^15M-/, ''));
const afterMs = Date.parse(afterIso!);
const BAR_MAIN = Number(opt('bar', '0.95'));

const rows = readFileSync(snippetsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.settledAboveStrike !== null && r.settledAboveStrike !== undefined);
const byCycle = new Map<string, any[]>();
for (const r of rows) { if (!byCycle.has(r.cycleId)) byCycle.set(r.cycleId, []); byCycle.get(r.cycleId)!.push(r); }
for (const a of byCycle.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
const cycleStartMs = (id: string) => Date.parse(id.replace(/^15M-/, ''));
const oosIds = [...byCycle.keys()].filter((id) => cycleStartMs(id) > afterMs).sort();
const allIds = [...byCycle.keys()].sort();

const runningVol = (arr: any[], i: number) => { let hi = -1e9, lo = 1e9; for (let k = 0; k <= i; k++) { hi = Math.max(hi, arr[k].spot); lo = Math.min(lo, arr[k].spot); } return (hi - lo) / lo * 1e4; };
const volBin = (v: number) => (v < V1 ? 'L' : v < V2 ? 'M' : 'H');
const distBin = (bps: number) => DIST.findIndex(([lo, hi]) => Math.abs(bps) >= lo && (hi === null || Math.abs(bps) < hi));

type Lock = { id: string; tSec: number; side: 'UP' | 'DOWN'; p: number; n: number; key: string; won: boolean };
type Policy = { bar: number; winLo: number; winHi: number; pooled?: 'vol' | 'cp' | 'both' };

// Pooled tables for the ablations, built from the shipped table's own n/w.
const pooledCells = (mode: 'vol' | 'cp' | 'both') => {
  const out: Record<string, { n: number; w: number }> = {};
  for (const [k, c] of Object.entries<any>(T.cells)) {
    const [cp, d, v] = k.split('|');
    const key = mode === 'vol' ? `${cp}|${d}` : mode === 'cp' ? `${d}|${v}` : `${d}`;
    out[key] ??= { n: 0, w: 0 }; out[key].n += c.n; out[key].w += c.w;
  }
  return out;
};
const POOLED = { vol: pooledCells('vol'), cp: pooledCells('cp'), both: pooledCells('both') };

function lookup(cp: number, d: number, v: string, pooled?: Policy['pooled']): { p: number | null; n: number } {
  if (!pooled) { const c = T.cells[`${cp}|${d}|${v}`]; return c ? { p: c.p, n: c.n } : { p: null, n: 0 }; }
  const key = pooled === 'vol' ? `${cp}|${d}` : pooled === 'cp' ? `${d}|${v}` : `${d}`;
  const c = POOLED[pooled][key]; if (!c || c.n < T.minN) return { p: null, n: c ? c.n : 0 };
  return { p: c.w / c.n, n: c.n };
}

function runPolicy(ids: string[], pol: Policy): { locks: Lock[]; skips: number } {
  const locks: Lock[] = []; let skips = 0;
  for (const id of ids) {
    const a = byCycle.get(id)!; let locked: Lock | null = null;
    for (let i = 0; i < a.length && !locked; i++) {
      const r = a[i]; const cp = r.checkpointSec;
      if (!CPS.includes(cp) || cp < pol.winLo || cp >= pol.winHi) continue;
      if (r.moneynessBps === 0) continue;
      const d = distBin(r.moneynessBps); if (d < 0) continue;
      const v = volBin(runningVol(a, i));
      const { p, n } = lookup(cp, d, v, pol.pooled);
      if (p === null || p < pol.bar) continue;
      const side: 'UP' | 'DOWN' = r.moneynessBps > 0 ? 'UP' : 'DOWN';
      const won = (side === 'UP') === Boolean(r.settledAboveStrike);
      locked = { id, tSec: cp, side, p, n, key: `${cp}|${d}|${v}`, won };
    }
    if (locked) locks.push(locked); else skips++;
  }
  return { locks, skips };
}

const wilson = (w: number, n: number) => { if (!n) return [NaN, NaN]; const z = 1.96, p = w / n, den = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n); return [(c - m) / den, (c + m) / den]; };
const pct = (x: number) => (Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '--');
const median = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
// Bootstrap over CYCLES (resample the cycle set, re-run the policy). Seeded LCG for reproducibility.
let seed = 20260910; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
function bootstrapWin(ids: string[], pol: Policy, B = 2000): [number, number] {
  const cache = new Map<string, Lock | null>();
  for (const id of ids) { const r = runPolicy([id], pol); cache.set(id, r.locks[0] ?? null); }
  const rates: number[] = [];
  for (let b = 0; b < B; b++) { let w = 0, n = 0; for (let i = 0; i < ids.length; i++) { const l = cache.get(ids[Math.floor(rnd() * ids.length)]); if (l) { n++; if (l.won) w++; } } if (n) rates.push(w / n); }
  rates.sort((a, b) => a - b); return [rates[Math.floor(rates.length * 0.025)], rates[Math.floor(rates.length * 0.975)]];
}
function report(label: string, ids: string[], pol: Policy, withBoot = false) {
  const { locks, skips } = runPolicy(ids, pol);
  const w = locks.filter((l) => l.won).length, n = locks.length; const [lo, hi] = wilson(w, n);
  const up = locks.filter((l) => l.side === 'UP'), dn = locks.filter((l) => l.side === 'DOWN');
  const boot = withBoot && n ? bootstrapWin(ids, pol) : null;
  console.log(
    `${label.padEnd(34)} cycles ${String(ids.length).padStart(4)}  locks ${String(n).padStart(4)} (${pct(n / Math.max(1, ids.length)).padStart(6)})  win ${pct(w / Math.max(1, n)).padStart(6)}  wilson [${pct(lo)}, ${pct(hi)}]` +
    (boot ? `  boot95 [${pct(boot[0])}, ${pct(boot[1])}]` : '') +
    `  skips ${skips}  med t-lock ${Number.isFinite(median(locks.map((l) => l.tSec))) ? median(locks.map((l) => l.tSec)) + 's' : '--'}` +
    `  UP ${up.filter((l) => l.won).length}/${up.length}  DOWN ${dn.filter((l) => l.won).length}/${dn.length}`,
  );
  return { locks, skips };
}

console.log(`table ${T.version} fitted ${T.fittedAt} on ${T.window.cycles} cycles (${T.window.firstCycle} -> ${T.window.lastCycle}, ${T.source})`);
console.log(`snippets: ${rows.length} rows, ${allIds.length} cycles (${allIds[0]} -> ${allIds[allIds.length - 1]}), source ${rows[0]?.source ?? '?'}`);
console.log(`UNTOUCHED OOS = cycles starting after ${afterIso}: ${oosIds.length} cycles`);
if (!oosIds.length) { console.log('no untouched cycles in this file'); process.exit(0); }

console.log('\n1. UNTOUCHED OOS, shipped rule (bar ' + BAR_MAIN + ', window 360-780)');
const main = report(`rule bar>=${BAR_MAIN}`, oosIds, { bar: BAR_MAIN, winLo: 360, winHi: 780 }, true);
for (const l of main.locks) console.log(`   ${l.id}  t=${l.tSec}s  ${l.side}  p=${l.p.toFixed(3)} n=${l.n} cell=${l.key}  ${l.won ? 'WIN' : 'LOSS'}`);

console.log('\n2. THRESHOLD PERTURBATION (window 360-780)');
for (const bar of [0.85, 0.9, 0.93, 0.95, 0.97]) report(`rule bar>=${bar}`, oosIds, { bar, winLo: 360, winHi: 780 });

console.log('\n3. WINDOW PERTURBATION (bar ' + BAR_MAIN + ')');
for (const [lo, hi] of [[360, 720], [360, 780], [420, 780], [480, 780], [600, 780]]) report(`window ${lo}-${hi}`, oosIds, { bar: BAR_MAIN, winLo: lo, winHi: hi });

console.log('\n4. DIMENSION ABLATION (bar ' + BAR_MAIN + ', window 360-780; pooled from the table\'s own n/w)');
report('full table (cp x dist x vol)', oosIds, { bar: BAR_MAIN, winLo: 360, winHi: 780 });
report('pool over vol (cp x dist)', oosIds, { bar: BAR_MAIN, winLo: 360, winHi: 780, pooled: 'vol' });
report('pool over checkpoint (dist x vol)', oosIds, { bar: BAR_MAIN, winLo: 360, winHi: 780, pooled: 'cp' });
report('distance only', oosIds, { bar: BAR_MAIN, winLo: 360, winHi: 780, pooled: 'both' });

console.log('\n5. CALIBRATION of the table\'s p on OOS rows (every checkpoint row with a known cell)');
const buckets: Record<string, { n: number; w: number; psum: number }> = {};
for (const id of oosIds) { const a = byCycle.get(id)!; a.forEach((r, i) => { if (r.moneynessBps === 0 || !CPS.includes(r.checkpointSec)) return; const d = distBin(r.moneynessBps); if (d < 0) return; const { p } = lookup(r.checkpointSec, d, volBin(runningVol(a, i))); if (p === null) return; const b = p >= 0.95 ? '0.95-1.00' : p >= 0.9 ? '0.90-0.95' : p >= 0.8 ? '0.80-0.90' : p >= 0.7 ? '0.70-0.80' : p >= 0.6 ? '0.60-0.70' : '<0.60'; buckets[b] ??= { n: 0, w: 0, psum: 0 }; buckets[b].n++; buckets[b].psum += p; if ((r.moneynessBps > 0) === Boolean(r.settledAboveStrike)) buckets[b].w++; }); }
for (const b of ['<0.60', '0.60-0.70', '0.70-0.80', '0.80-0.90', '0.90-0.95', '0.95-1.00']) { const c = buckets[b]; if (!c) continue; console.log(`   p ${b.padEnd(10)} n ${String(c.n).padStart(5)}  predicted ${pct(c.psum / c.n)}  realised ${pct(c.w / c.n)}  gap ${((c.w / c.n - c.psum / c.n) * 100).toFixed(1)} pts`); }

console.log('\n6. CURRENT ENGINE on the same OOS cycles (first checkpoint with gateAllowed, graded vs strike)');
{
  let locks = 0, wins = 0, up = 0, upW = 0, dn = 0, dnW = 0; const ts: number[] = [];
  for (const id of oosIds) { const a = byCycle.get(id)!; const r = a.find((x) => x.gateAllowed && (x.direction === 'UP' || x.direction === 'DOWN')); if (!r) continue; locks++; ts.push(r.checkpointSec); const won = (r.direction === 'UP') === Boolean(r.settledAboveStrike); if (won) wins++; if (r.direction === 'UP') { up++; if (won) upW++; } else { dn++; if (won) dnW++; } }
  const [lo, hi] = wilson(wins, locks);
  console.log(`   engine gate: locks ${locks} (${pct(locks / oosIds.length)})  win ${pct(wins / Math.max(1, locks))}  wilson [${pct(lo)}, ${pct(hi)}]  med t-lock ${Number.isFinite(median(ts)) ? median(ts) + 's' : '--'}  UP ${upW}/${up}  DOWN ${dnW}/${dn}`);
  console.log('   (replay caveat: the engine row is candle/trade-replayed logic, not the production ledger; see replay15m.ts KNOWN DIVERGENCES)');
}
