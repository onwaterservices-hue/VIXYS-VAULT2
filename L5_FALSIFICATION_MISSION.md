# LAYER 5 FALSIFICATION MISSION — try to kill the 97.6% before trusting it

Next research session's brief. Read `ENGINE_PROGRESS.md` first — the baseline,
Table 1, the replay harness, and every number cited here live there. Layer 5
stays **flag OFF** throughout; nothing in this mission may alter a production
decision.

## What the 97.6% actually is (do not lose this framing)

`strikeSideModel.ts` bar 0.95, disjoint refit (fit Aug 12→Sep 2, evaluated
Sep 2→9): **127 locks / 97.6% (124W/3L), median lock 675s** on the criterion
P(settle on the current side of the strike frozen at cycle open). Already
known, and the report must keep saying it:

- It is a PRODUCT criterion, not forecasting. Post-lock directional skill
  stays ~coin-flip everywhere; the rule buys precision by locking when the
  outcome is largely already decided (large |distance|, late in the cycle).
  The honest value proposition is *selection*, not prophecy.
- Lock rate at bar 0.95 is ~20% of cycles (132/672 overlapping fit; 419 skips
  of 877 candidates in the earlier candle run). This is a selective
  instrument. The economics table (locks/skips/opportunity rate/EV) must be
  in the promotion report.
- Already survived: chronological halves (Table 1 stable, Wilson CIs overlap
  cell by cell), candles-vs-trades replication, disjoint refit (Δ|p| 0.038
  over 109 shared cells), regime slices (`42495e7`).
- Interaction: 45 of 132 bar-0.95 locks fell in 720–779s under the old
  commit-point mismatch; the 780 alignment (`1f6186e`, PR #28) changes the
  effective lock set. Re-derive counts on the merged code.

## Attacks still owed (in order)

1. **Untouched final OOS period.** The 21-day trade ingestion (running in the
   parallel session; `b865a47` walker) ends with data never used for any
   fitting decision. Freeze the table BEFORE looking; evaluate ONCE.
2. **Threshold perturbation.** Bars 0.90/0.93/0.95/0.97; distance-bin edges
   ±20%; volatility tercile boundaries jittered. Collapse under small
   perturbation = curve-fit warning.
3. **Feature ablation of the table's three dimensions.** time-only,
   distance-only, time+distance (no vol), full. The suspicion to test:
   distance dominates and vol adds little — quantify each dimension's
   contribution to log-loss/precision.
4. **UP vs DOWN splits.** The live ledger is 92% UP calls in a rising regime.
   Does the rule's precision hold on DOWN-side locks specifically, and what
   is its DOWN-side sample size? Report n per side, not just the blend.
5. **Bootstrap CIs** on the 127-lock win rate (cycle-level resample) and on
   every headline cell of Table 1.
6. **Regime slices, re-run on trades** at 21 days: trend/chop/vol terciles ×
   the rule's operating points. LOW-vol 3–6 bps at t=720 was 90.8% vs
   HIGH-vol 69.6% — find every such cell where the blended number hides a
   weak regime.
7. **Live shadow reconciliation.** PR #28 recorded `shadowL5` in one
   instance's memory (`SHADOW_L5_v1`), and the instance that settles a cycle
   is rarely the one that watched it: on 2026-09-10 only **2 of 200** ledger
   rows carried the record, one with `ticks: 17` for a whole cycle. SESSION 7
   made it durable (`SHADOW_L5_v2`): every instance merges its slice into
   `shadow_l5/<cycleId>` (write on cell change or when the rule fires,
   throttled to one per 30s per instance; observation only, no queue), and
   settlement / skip / reconciliation read the doc back and merge every
   instance's slice (earliest would-lock, latest evaluation, summed `ticks`,
   `instances`, coverage envelope). Read it at
   `GET /api/research/shadow-l5` (OWNER/ADMIN): rule would-lock count,
   wins/losses graded against the settled side, engine locks/wins, the
   agreement matrix and per-cycle rows. A cycle is fully covered at ~300
   ticks. After a few days, compare shadow-would-lock outcomes against the
   replay's prediction for the same cycles. Divergence = the harness is
   missing something production does. Rows recorded before the v2 deploy
   remain v1 partial views and must not be pooled with v2 rows.
8. **Kalshi implied price at t** (free API, still unmeasured): the rule's p
   minus the market's implied p IS the edge claim. If Kalshi already prices
   these cells at 0.95+, the product is honest selection with no market edge
   — which changes what may be claimed to subscribers, not whether to ship.

## Promotion gate

Only if the result survives 1–6: write `L5_PROMOTION_REPORT.md` — what the
rule learned (per-dimension), when it refuses, lock/skip/opportunity rates,
calibration of its p against realized frequency, per-regime and per-side
tables, failure modes, and the shadow-vs-replay reconciliation. Flag-on is a
separate, owner-approved deployment decision after that report; never flip it
inside this mission. Do NOT optimize the rule while auditing it.
