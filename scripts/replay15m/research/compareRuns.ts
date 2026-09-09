#!/usr/bin/env npx tsx
/**
 * Phase 8 -- compare two replay runs on IDENTICAL cycles.
 *
 *   npx tsx scripts/replay15m/research/compareRuns.ts <A.json> <B.json> [labelA] [labelB]
 *
 * Both files must come from scripts/replay15m.ts over the same window and
 * source (ideally same seed) -- typically the same data replayed through two
 * engine versions via --engine-source. Only cycles present in BOTH runs are
 * compared; the report says how many were dropped.
 *
 * Every number is computed from the records; nothing is hardcoded. Where a
 * quantity cannot be computed (no locks, no settlement) it prints `--`.
 */
import { readFileSync } from 'fs';

const [fa, fb, la = 'A', lb = 'B'] = process.argv.slice(2);
if (!fa || !fb) { console.error('usage: compareRuns.ts <A.json> <B.json> [labelA] [labelB]'); process.exit(2); }
const load = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const A = load(fa), B = load(fb);
const byId = (recs: any[]) => new Map<string, any>(recs.map((r) => [r.cycleId, r]));
const mA = byId(A.records), mB = byId(B.records);
const ids = [...mA.keys()].filter((id) => mB.has(id));
const dropped = A.records.length + B.records.length - 2 * ids.length;

const hit = (r: any) => (r.settlementPrice >= r.lockSpot) === (r.lockDirection === 'UP');
const graded = (m: Map<string, any>) => ids.map((id) => m.get(id)).filter((r) => r.locked && r.wasCorrect !== null && r.lockSpot != null && r.settlementPrice != null);
const pct = (w: number, n: number) => (n ? (100 * w / n).toFixed(1) + '%' : '--');
const med = (xs: number[]) => { const s = [...xs].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f1 = (v: number | null, suf = '') => (v === null ? '--' : (Math.round(v * 10) / 10) + suf);
const se = (n: number) => (n ? (100 * Math.sqrt(0.25 / n)).toFixed(1) : '--');
const binomP = (k: number, n: number) => { const lg = (x: number) => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; }; const pmf = (i: number) => Math.exp(lg(n) - lg(i) - lg(n - i) - n * Math.LN2); const pk = pmf(k); let p = 0; for (let i = 0; i <= n; i++) { const pi = pmf(i); if (pi <= pk * (1 + 1e-9)) p += pi; } return Math.min(1, p); };

function summarize(m: Map<string, any>) {
  const all = ids.map((id) => m.get(id)); const L = graded(m);
  const skillW = L.filter(hit).length; const winW = L.filter((r) => r.wasCorrect).length;
  const up = L.filter((r) => r.lockDirection === 'UP'); const dn = L.filter((r) => r.lockDirection === 'DOWN');
  const tier = (lo: number, hi: number) => { const s = L.filter((r) => r.lockTSec >= lo && r.lockTSec < hi); return { n: s.length, skill: pct(s.filter(hit).length, s.length) }; };
  const brier = L.map((r) => r.brierScore).filter((b) => typeof b === 'number');
  // calibration error against post-lock skill per confidence bucket
  const buckets: Record<string, { n: number; w: number; c: number }> = {};
  for (const r of L) { const lo = Math.min(95, Math.floor(r.lockConfidence / 5) * 5); const k = `${lo}-${lo === 95 ? 100 : lo + 5}`; buckets[k] ??= { n: 0, w: 0, c: 0 }; buckets[k].n++; buckets[k].c += r.lockConfidence; if (hit(r)) buckets[k].w++; }
  const calErr = mean(Object.values(buckets).filter((b) => b.n >= 10).map((b) => Math.abs(b.c / b.n - 100 * b.w / b.n)));
  const flips = mean(all.map((r) => r.directionFlips));
  const blockers: Record<string, number> = {};
  for (const r of all.filter((x) => !x.locked)) { const k = String(r.blockerAtClose || 'UNKNOWN').replace(/\s*\(.*$/, ''); blockers[k] = (blockers[k] || 0) + 1; }
  const regression = L.filter((r) => r.lockTSec >= 720 && r.lockTSec < 780).length;
  return {
    cycles: all.length, locks: L.length, skips: all.length - L.length,
    up: up.length, down: dn.length,
    strikeWin: pct(winW, L.length),
    skill: pct(skillW, L.length), skillN: L.length, skillW, skillSE: se(L.length), skillP: L.length ? binomP(skillW, L.length).toFixed(3) : '--',
    upSkill: pct(up.filter(hit).length, up.length), dnSkill: pct(dn.filter(hit).length, dn.length),
    brier: f1(mean(brier) === null ? null : Math.round(mean(brier)! * 1000) / 1000),
    avgConf: f1(mean(L.map((r) => r.lockConfidence))), avgLQ: f1(mean(L.map((r) => r.lockQualityAtLock))),
    ttlMed: med(L.map((r) => r.lockTSec)), ttlMean: f1(mean(L.map((r) => r.lockTSec)), 's'),
    early: tier(0, 480), std: tier(480, 660), late: tier(660, 9999),
    regressionWindowLocks: regression,
    mfe: f1(med(L.map((r) => r.maxFavorableExcursion).filter((v) => v != null))), mae: f1(med(L.map((r) => r.maxAdverseExcursion).filter((v) => v != null))),
    reversal: pct(L.filter((r) => r.maxAdverseExcursion != null && r.maxFavorableExcursion != null && r.maxAdverseExcursion > r.maxFavorableExcursion).length, L.length),
    calErr: f1(calErr, ' pts'), flips: f1(flips),
    buckets, blockers,
  };
}
const a = summarize(mA), b = summarize(mB);

// per-cycle agreement
let both = 0, onlyA = 0, onlyB = 0, dirDiff = 0; const dt: number[] = [];
for (const id of ids) { const x = mA.get(id), y = mB.get(id); if (x.locked && y.locked) { both++; if (x.lockDirection !== y.lockDirection) dirDiff++; dt.push(y.lockTSec - x.lockTSec); } else if (x.locked) onlyA++; else if (y.locked) onlyB++; }

const row = (k: string, va: any, vb: any) => console.log(`${k.padEnd(38)}${String(va).padStart(24)}${String(vb).padStart(24)}`);
console.log(`PHASE 8 COMPARISON on ${ids.length} identical cycles${dropped ? `  (${dropped} cycle(s) present in only one run were dropped)` : ''}`);
console.log(`A = ${la}: ${fa}\nB = ${lb}: ${fb}`);
console.log('='.repeat(86)); row('', la, lb);
row('locks / skips', `${a.locks} / ${a.skips}`, `${b.locks} / ${b.skips}`);
row('lock rate', pct(a.locks, a.cycles), pct(b.locks, b.cycles));
row('UP / DOWN locks', `${a.up} / ${a.down}`, `${b.up} / ${b.down}`);
row('strike-graded win rate', a.strikeWin, b.strikeWin);
row('POST-LOCK DIRECTIONAL SKILL', `${a.skill} ±${a.skillSE}`, `${b.skill} ±${b.skillSE}`);
row('  exact binomial p vs 50%', a.skillP, b.skillP);
row('  UP calls / DOWN calls', `${a.upSkill} / ${a.dnSkill}`, `${b.upSkill} / ${b.dnSkill}`);
row('avg Brier (strike-graded)', a.brier, b.brier);
row('calibration error (|conf - skill|)', a.calErr, b.calErr);
row('avg confidence / lock quality', `${a.avgConf} / ${a.avgLQ}`, `${b.avgConf} / ${b.avgLQ}`);
row('time-to-lock median / mean', `${a.ttlMed}s / ${a.ttlMean}`, `${b.ttlMed}s / ${b.ttlMean}`);
row('locks EARLY / STD / LATE', `${a.early.n} / ${a.std.n} / ${a.late.n}`, `${b.early.n} / ${b.std.n} / ${b.late.n}`);
row('skill EARLY / STD / LATE', `${a.early.skill} / ${a.std.skill} / ${a.late.skill}`, `${b.early.skill} / ${b.std.skill} / ${b.late.skill}`);
row('locks in 720-779s (REGRESSION-2deba55)', a.regressionWindowLocks, b.regressionWindowLocks);
row('median MFE / MAE ($)', `${a.mfe} / ${a.mae}`, `${b.mfe} / ${b.mae}`);
row('post-lock reversal (MAE > MFE)', a.reversal, b.reversal);
row('avg direction flips per cycle', a.flips, b.flips);
console.log('-'.repeat(86));
console.log(`per cycle: both lock ${both} · only ${la} ${onlyA} · only ${lb} ${onlyB} · direction differs ${dirDiff} · ${lb} locks later in ${dt.filter((d) => d > 0).length}, earlier in ${dt.filter((d) => d < 0).length}`);
console.log('\nskill by confidence bucket (n>=10):');
const keys = [...new Set([...Object.keys(a.buckets), ...Object.keys(b.buckets)])].sort();
for (const k of keys) { const x = a.buckets[k], y = b.buckets[k]; console.log(`  ${k.padEnd(8)} ${la}: ${x ? `${pct(x.w, x.n)} (n=${x.n})` : '--'}`.padEnd(40) + `${lb}: ${y ? `${pct(y.w, y.n)} (n=${y.n})` : '--'}`); }
console.log('\nwhy cycles did not lock (blocker at close):');
for (const k of new Set([...Object.keys(a.blockers), ...Object.keys(b.blockers)])) console.log(`  ${k.padEnd(34)}${String(a.blockers[k] || 0).padStart(8)}${String(b.blockers[k] || 0).padStart(16)}`);
console.log('\nVERDICT is not computed here. A lower p on SKILL with a larger n, out of sample, is the only thing that counts as better.');
