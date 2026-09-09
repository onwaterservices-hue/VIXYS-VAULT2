#!/usr/bin/env npx tsx
/**
 * Items 6 / E -- what happens AFTER a lock, and should the architecture react?
 *
 *   npx tsx scripts/replay15m/research/postLock.ts <snippets.jsonl>
 *
 * Using the train-fitted table (first half of cycles), simulate a rule lock at
 * the first checkpoint where p >= 0.95 (TEST half only), then follow the
 * table's p for the CURRENT-side-at-lock at every later checkpoint until
 * settlement. Questions:
 *   1. How often does the locked side's p deteriorate (below 0.8 / 0.5) before
 *      settlement, and what is the win rate conditional on that?
 *   2. How early is "exceptionally strong" -- win rate of locks taken at
 *      t <= 300s when p >= 0.95 (usually large early moves)?
 *   3. Would a PROTECT signal (p_locked_side < 0.5 at any later checkpoint)
 *      have flagged the losses, and how many winners would it have flagged
 *      (false alarms)?
 * Nothing here uses the outcome to decide anything; the outcome is only used
 * to grade after the fact.
 */
import { readFileSync } from 'fs';
const f = process.argv[2]; if (!f) { console.error('usage: postLock.ts <snippets.jsonl>'); process.exit(2); }
const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.settledAboveStrike !== null);
const byCycle = new Map<string, any[]>(); for (const r of rows) { if (!byCycle.has(r.cycleId)) byCycle.set(r.cycleId, []); byCycle.get(r.cycleId)!.push(r); }
for (const a of byCycle.values()) a.sort((x, y) => x.checkpointSec - y.checkpointSec);
const cycles = [...byCycle.keys()].sort(); const mid = cycles[Math.floor(cycles.length / 2)];
const runVol = (arr: any[], i: number) => { let hi = -1e9, lo = 1e9; for (let k = 0; k <= i; k++) { hi = Math.max(hi, arr[k].spot); lo = Math.min(lo, arr[k].spot); } return (hi - lo) / lo * 1e4; };
const DIST: [number, number][] = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 40], [40, 1e9]];
const distIdx = (b: number) => DIST.findIndex(([lo, hi]) => Math.abs(b) >= lo && Math.abs(b) < hi);
const tv: number[] = []; for (const c of cycles.filter((c) => c < mid)) { const a = byCycle.get(c)!; a.forEach((r, i) => tv.push(runVol(a, i))); }
tv.sort((a, b) => a - b); const V1 = tv[Math.floor(tv.length / 3)], V2 = tv[Math.floor(tv.length * 2 / 3)];
const vb = (v: number) => (v < V1 ? 'L' : v < V2 ? 'M' : 'H');
const cells = new Map<string, { n: number; w: number }>();
for (const c of cycles.filter((c) => c < mid)) { const a = byCycle.get(c)!; a.forEach((r, i) => { if (r.moneynessBps === 0) return; const k = `${r.checkpointSec}|${distIdx(r.moneynessBps)}|${vb(runVol(a, i))}`; const cell = cells.get(k) || { n: 0, w: 0 }; cell.n++; if ((r.moneynessBps > 0) === r.settledAboveStrike) cell.w++; cells.set(k, cell); }); }
// p that the CURRENT side wins at this checkpoint (table), or null
const pCur = (r: any, vol: number) => { if (r.moneynessBps === 0) return null; const c = cells.get(`${r.checkpointSec}|${distIdx(r.moneynessBps)}|${vb(vol)}`); return c && c.n >= 30 ? c.w / c.n : null; };
// p that the LOCKED side wins = pCur if price still on the locked side, else 1 - pCur
type Lock = { cycleId: string; lockCp: number; lockP: number; side: 'UP' | 'DOWN'; win: boolean; traj: { cp: number; pLocked: number | null; sideNow: 'UP' | 'DOWN' | 'AT' }[] };
const locks: Lock[] = [];
for (const c of cycles.filter((c) => c >= mid)) {
  const a = byCycle.get(c)!; let lk: Lock | null = null;
  a.forEach((r, i) => {
    const vol = runVol(a, i); const p = pCur(r, vol);
    if (!lk) { if (p !== null && p >= 0.95) { const side = r.moneynessBps > 0 ? 'UP' : 'DOWN'; lk = { cycleId: c, lockCp: r.checkpointSec, lockP: p, side, win: (side === 'UP') === r.settledAboveStrike, traj: [] }; } return; }
    const sideNow = r.moneynessBps > 0 ? 'UP' : r.moneynessBps < 0 ? 'DOWN' : 'AT';
    const pl = p === null ? null : sideNow === lk.side ? p : sideNow === 'AT' ? null : 1 - p;
    lk.traj.push({ cp: r.checkpointSec, pLocked: pl, sideNow });
  });
  if (lk) locks.push(lk);
}
const pct = (w: number, n: number) => (n ? `${(100 * w / n).toFixed(1)}%` : '--');
const wins = locks.filter((l) => l.win).length;
console.log(`POST-LOCK STUDY  ${f.split('/').pop()}  TEST cycles=${cycles.length - cycles.indexOf(mid)}  rule locks@0.95=${locks.length}  win=${pct(wins, locks.length)}`);
// 1. deterioration
const minP = (l: Lock) => { const ps = l.traj.map((t) => t.pLocked).filter((p): p is number => p !== null); return ps.length ? Math.min(...ps) : null; };
const crossed = locks.filter((l) => l.traj.some((t) => t.sideNow !== 'AT' && t.sideNow !== l.side));
console.log(`\n1. deterioration after lock`);
console.log(`   price crossed back over the strike at some later checkpoint: ${crossed.length}/${locks.length} (${pct(crossed.length, locks.length)}) -> win ${pct(crossed.filter((l) => l.win).length, crossed.length)}  | never crossed: win ${pct(locks.filter((l) => !crossed.includes(l) && l.win).length, locks.length - crossed.length)}`);
for (const thr of [0.9, 0.8, 0.7, 0.5]) { const s = locks.filter((l) => { const m = minP(l); return m !== null && m < thr; }); console.log(`   p(locked side) fell below ${thr} at some later checkpoint: ${String(s.length).padStart(4)} locks -> win ${pct(s.filter((l) => l.win).length, s.length)}   (others: ${pct(locks.filter((l) => !s.includes(l) && l.win).length, locks.length - s.length)})`); }
// 2. early strong locks
console.log(`\n2. lock timing (first checkpoint with p >= 0.95)`);
for (const [lo, hi, lab] of [[0, 300, '<=300s (early, big move)'], [300, 480, '300-479s'], [480, 660, '480-659s'], [660, 720, '660-719s'], [720, 900, '>=720s']] as [number, number, string][]) { const s = locks.filter((l) => l.lockCp > lo - 1 && l.lockCp >= lo && l.lockCp < hi); console.log(`   ${lab.padEnd(26)} n=${String(s.length).padStart(4)}  win ${pct(s.filter((l) => l.win).length, s.length)}`); }
// 3. PROTECT signal evaluation
console.log(`\n3. PROTECT signal = p(locked side) < 0.5 at any later checkpoint`);
const flagged = locks.filter((l) => { const m = minP(l); return m !== null && m < 0.5; });
const losses = locks.filter((l) => !l.win);
const caught = losses.filter((l) => flagged.includes(l)).length;
console.log(`   losses: ${losses.length}  caught by PROTECT: ${caught} (${pct(caught, losses.length)})  | false alarms (winners flagged): ${flagged.filter((l) => l.win).length} of ${locks.length - losses.length} winners (${pct(flagged.filter((l) => l.win).length, locks.length - losses.length)})`);
const firstFlagCp = (l: Lock) => l.traj.find((t) => t.pLocked !== null && t.pLocked < 0.5)?.cp ?? null;
const lead = losses.map((l) => { const fc = firstFlagCp(l); return fc === null ? null : 900 - fc; }).filter((x): x is number => x !== null);
if (lead.length) console.log(`   when a loss is caught, seconds of warning before settlement: median ${[...lead].sort((a, b) => a - b)[Math.floor(lead.length / 2)]}s`);
// 4. what the losses looked like at lock
console.log(`\n4. the losses at lock time`);
for (const l of losses.slice(0, 12)) console.log(`   ${l.cycleId}  lock@${l.lockCp}s p=${l.lockP.toFixed(3)} ${l.side}  minP later=${(minP(l) ?? NaN).toFixed(2)}  crossed=${crossed.includes(l)}`);
