# L5 PROMOTION REPORT — DRAFT (2026-09-10)

Status: **DRAFT — falsification items 1–5 survived on untouched data; item 6
(regime slices) is thin on this window; items 7–8 are now being collected
live.** Flag-on remains an owner decision (see "Decisions" at the end). Nothing
in this report changed a decision path; the rule still runs as a shadow.

## What the rule is

`computeStrikeSideProbability` in `server.ts`, table `src/data/strikeSideTable.v1.json`
(fitted 2026-09-09 on **candles**, cycles `15M-2026-08-12T00:00Z → 15M-2026-09-07T23:30Z`,
2,591 cycles / 35,944 samples, cells = 60s checkpoint × |distance-to-strike| bin
(bps) × running-volatility tercile, `minN 30`, `p:null` below that).
Policy: inside the legal entry window (360–780s), at the first checkpoint whose
cell has `p ≥ 0.95`, lock the **current side of the open strike**; otherwise
SKIP. The criterion is the product criterion — did the locked side settle — not
directional forecasting.

## 1. Untouched out-of-sample (the number that matters)

Replayed on **real trade prints (3s buckets)** for every cycle that starts after
the table's last fitted cycle: `15M-2026-09-08T00:00Z → 15M-2026-09-10T04:00Z`,
**209 cycles**, 2,926 checkpoint rows
(`scripts/replay15m/research/evalShippedTable.ts`, run log in ENGINE_PROGRESS
SESSION 7). Bars fixed a priori; nothing refitted.

```
policy                 locks  lock%    WIN%    Wilson95        boot95 (2,000 cycle resamples)  skips  med t-lock   UP      DOWN
rule bar >=0.95 (shipped)  95  45.5%   98.9%  [94.3, 99.8]    [96.5, 100.0]                    114     660s      42/42   52/53
current engine gate        16   7.7%  100.0%  [80.6, 100.0]        --                          193     480s        9/9     7/7
```

The single loss: `15M-2026-09-08T19:15Z`, DOWN at 720s, cell `720|3|H`
(p 0.955, n 335).

## 2. Threshold perturbation (window 360–780)

```
bar    locks  lock%   WIN%    Wilson95
0.85    171   81.8%   86.5%  [80.6, 90.9]
0.90    155   74.2%   90.3%  [84.6, 94.0]
0.93    124   59.3%   93.5%  [87.8, 96.7]
0.95     95   45.5%   98.9%  [94.3, 99.8]
0.97     23   11.0%  100.0%  [85.7, 100.0]
```
Monotone in the bar; the realised rate tracks the bar. No cliff.

## 3. Window perturbation (bar 0.95)

```
window     locks   WIN%
360-720      57   100.0%
360-780      95    98.9%
420-780      95    98.9%
480-780      95    98.9%
600-780      95    98.9%
```
Time-to-lock distribution of the 95 locks: 420s ×1, 480s ×1, 540s ×3,
600s ×18, 660s ×34, **720s ×38**. The lower bound of the window is irrelevant
in practice; the 720–779s band holds 40% of the locks (see Decisions).
Cells hit: vol tercile H ×89 / M ×6; distance bins 10–15 bps ×31, 15–25 ×42,
25–40 ×16, 40+ ×6 — the rule fires on real leads, never inside 10 bps.

## 4. Dimension ablation (pooled from the table's own n/w)

```
table                          locks   WIN%
full (cp × dist × vol)           95    98.9%
pool over vol (cp × dist)        92    98.9%
pool over checkpoint (dist×vol)  32    96.9%
distance only                    32    96.9%
```
The checkpoint (time-into-cycle) dimension is essential; the volatility tercile
adds almost nothing on this window. Sides are symmetric (UP 42/42, DOWN 52/53)
— the DOWN side, absent from earlier candle runs, is now measured.

## 5. Calibration of the table's p on the OOS rows

```
p bucket     rows   predicted  realised  gap
<0.60         451     56.4%     58.1%   +1.7
0.60-0.70     574     65.7%     64.8%   -0.8
0.70-0.80     478     74.4%     70.5%   -3.9
0.80-0.90     559     84.0%     80.5%   -3.5
0.90-0.95     412     92.1%     91.7%   -0.3
0.95-1.00     410     97.6%     98.5%   +0.9
```
When the table says 95%+, reality behaved like 98.5% on data it never saw.

## 6. Regime slices — THIN on this window

Two days, one regime. The earlier 7-day trade run (ENGINE_PROGRESS "LAYER 5
INSIDE THE REAL GATE") found LOW-vol `t=720 |mny| 3–6 bps` at 90.8% vs HIGH-vol
69.6% — the blended cell hides a weak regime — and this OOS window is dominated
by the H vol tercile. Treat the lock RATE (45.5% here vs 12.9–19% in the 7-day
run) as regime-dependent; the precision at the bar has held in both.

## 7–8. Live shadow and market edge — now collectable

`SHADOW_L5_v2` (PR #46/#47) merges every instance's slice per cycle and grades
would-locks against the settled side at `GET /api/research/shadow-l5`. The
Kalshi implied price at would-lock time is captured alongside it (next PR), so
"edge vs the market" — whether Kalshi already prices these cells at 0.95+ —
becomes a measured number over the coming days rather than an assumption.

## What this does NOT claim

- No directional forecasting skill (still ~coin flip post-lock in every run).
- Precision on the product criterion at a fixed lock rate that moves with the
  regime; the rule refuses 55–87% of cycles.
- Replay strike is `round(spot/10)*10`; production uses the Kalshi floor strike
  (median +0.5 bps from the open in the ledger join — small, but real).
- The engine's live vol bin uses the full 3s-tick range (`cycleHigh/cycleLow`)
  while the table's terciles were fitted on checkpoint-sampled ranges; live
  bins can skew H. The ablation says vol barely matters, which bounds the harm.
- 209 cycles is two days. The 7-day disjoint refit (127 locks, 97.6%) and this
  run agree; neither is a month of mixed regimes.

## Decisions for the owner (prepare-and-stop) — CORRECTED after reading the gate

**Correction 1 — what the existing flag actually does.** `VIXY_LOCK_RULE=
strike_side` is a FILTER, not the measured policy: in `canLockCurrentCycle`
it can only ADD a denial (`allowed = !alreadyLocked && validationPassed &&
strike15mResolved && !strikeRuleBlocks`; it also refuses when the rule's side
disagrees with the engine's candidate). Turning it on today therefore gives
"the engine's own locks, filtered to p ≥ 0.95 and side agreement" — higher
precision on FEWER locks than the engine makes now (engine gate in replay:
16 of 209 cycles). It does NOT give the 95-locks-at-98.9% behaviour above,
which was measured for the rule ALONE.

**Correction 2 — REGRESSION-2deba55 is already fixed on main.** The gate
window, the reason check and `lock15mCycle`'s commit point are all at 780s
(`ALIGNED-780` in `tests/lock-gate.composition.mjs`; commit point
`effElapsed < 360 || effElapsed >= 780`). The 720s locks are NOT forfeited.
Only the lifecycle label still flips to `ENTRY_WINDOW_CLOSED` at 720s when no
lock has happened — cosmetic; a lock at 720–779s still commits.

**What reproducing the measured policy requires — a new mode, prepared, not
applied.** `VIXY_LOCK_RULE=strike_side_only`, in which the rule DECIDES:
inside the legal window, the first tick whose cell has p ≥ bar on a definite
side locks THAT side, with only the hard safety terms kept (not already
locked, live strike, fresh data, current cycle, cycle not expired); the lock
carries the table's p as its confidence and `STRIKE_SIDE_RULE (p, n, cell)`
as its reason; `strike_side` and `off` are untouched. The exact edits (gate
`allowed`/`dir` branch, `lockRuleDecides/P/N/Cell` on the gate's return,
`lock15mCycle` taking the rule's side/probability, the CALIBRATED_P ladder
row gating in both modes, and the updated pin in
`tests/lock-gate.composition.mjs`) were drafted in SESSION 7 and **blocked by
the tooling's permission classifier as a lock-gate change**, consistent with
`CLAUDE.md` ("never let it loosen another gate"). This is the owner's call:

1. **Authorize the `strike_side_only` mode explicitly** (default stays `off`;
   nothing changes in production until the Vercel env var is set). Then set
   `VIXY_LOCK_RULE=strike_side_only` (bar `VIXY_LOCK_RULE_BAR`, default 0.95).
   Expected from the measurements: lock rate ~13–45% of cycles depending on
   regime, precision ≥95% on the product criterion, median lock ~660s; the
   live tick (3s) can also fire between checkpoints, which uses the last
   checkpoint's cell for a state closer to settlement — conservative, but a
   small departure from the checkpoint-only replay that the live shadow will
   measure.
2. Or **use the filter mode now** (`VIXY_LOCK_RULE=strike_side`): fewer locks
   than today, each with p ≥ 0.95; no code change needed, env var only.
3. Either way, keep the shadow running ≥3 days and compare
   `/api/research/shadow-l5` (now with `wouldLock.kalshiYes`) against this
   report before claiming anything to subscribers. Without a market-edge
   number, the honest claim is precision on the contract's own criterion —
   not an edge over Kalshi.
