# 15M ENGINE — MASTER PRODUCTION REBUILD / INTELLIGENCE UPGRADE (the standing brief)

Owner-approved brief (2026-09-10). Philosophy, verbatim from the owner:
**"Cook the engine, not the numbers."** Never raise confidence because the UI
should look impressive; make the evidence better and let calibrated numbers
follow. If evidence is weak → LOW; conflicting → CONFLICTED; stale → STALE;
insufficient → SKIP. "When VIXY says 80%, reality should behave like ~80%; when
it doesn't have an 80% situation, it must refuse to pretend."

Read first: `ENGINE_PROGRESS.md` (SESSION 5 = the 52% root cause),
`ENGINE_DATAFLOW.md` (Mission 1 map), `L5_FALSIFICATION_MISSION.md`.

## Non-negotiables
- No look-ahead: at tick T the engine sees only data available at T
  (publication timestamps preserved in replay).
- Every input carries LIVE / DELAYED / STALE / OFFLINE; missing data reduces
  evidence, never substitutes a default.
- No second competing engine; extend the canonical one behind flags + shadow.
- The locked decision never mutates after lock; telemetry may.
- Every promotion needs: BASELINE vs NEW, dataset, period, features,
  thresholds, OOS win/calibration/Brier/false-locks/skips/lock-rate/n.
  Win rate alone never justifies a change.

## Status ledger (keep this current)

### DONE (verified)
- **Mission 1 audit** — `ENGINE_DATAFLOW.md`; the 52% mechanism proven live
  (SESSION 5): the score is a memoryless step function of `agreementCount`,
  floored to [40,58] whenever `threatScore ≥ 30`, which happens whenever the
  15s/30s/1m momentum votes go NEUTRAL — even at 19 bps beyond the strike.
- **Semantic layer** — `src/lib/engineSemantics.ts` is the single source of
  truth for evidence words (WEAK BIAS / DEVELOPING / CONVERGING / HIGH
  CONVICTION / LOCK READY / LOCKED / CONFLICTED / SKIP), tied to the real
  gate bar. "STRONG EVIDENCE" at lock quality 50 is gone; "MARKET ALIGNMENT:
  STRONG" is now `alignmentLabel(n/11)`; "EARLY LOCK READY" only when the gate
  says eligible. Pinned by `tests/engine-semantics.invariants.mjs`.
- **Fabrications removed from the card and VIXY Live modules** (fake
  settlement strip with 78% / 0.142, `?? 87`, `|| 78`, "+$28.4M", "98.4%
  RETENTION", "$184.50", "BULL CONTINUATION", literal family details).
- Research already in the repo: point-in-time trade replay (3M prints), the
  strike-independent skill metric (~coin flip), Table 1 P(current side wins),
  Layer 5 strike-side rule (flag off, shadow recorder live), taker-flow
  ablation (not predictive), intracycle-feature ablation (no incremental
  value), regime slices.

- **Calibrated conviction surfaced (SESSION 6)** — the strike-side table's
  P(win) is the hero headline with sample size and provenance (checkpoint ×
  distance bin × vol tercile), an honest "no matching history" state, the
  legacy score relabelled ENGINE SCORE, the gate's own 16-condition **lock
  ladder** with current-vs-required values, a per-tick **P(win) trail**
  sparkline, and edge-vs-Kalshi shown only when the market read is real.
  Payload: `calibrated`, `market`, `lockGate.checks/eligible`,
  `convictionTrail`. Pinned by `tests/calibrated-conviction.characterization.mjs`.
  Observation only — nothing gates on it until L5 passes falsification.

- **One headline, everywhere (SESSION 7)** — `engineSemantics.headline()` is
  the single source of "the number": calibrated P(win) (labelled with side
  and n, worded by `pWinLabel`) when the table has a cell, else ENGINE SCORE
  (worded by `confidenceLabel`), else "—". Prediction Center ring, V2 rail,
  hub hero and Command Center ring all read it; the hub's seeded defaults
  (78 / 87 / 22 / TRENDING_BULL / $64,591.20) are gone. The Prediction Center
  page carries no invented figures (PR #42); the chart draws the engine's
  real locks and settlements. Engine-count audit: ONE live engine
  (`runMarketEngineTick`); the OG client engine was removed (PR #44).
- **Layer-5 shadow is durable (SESSION 7)** — `shadow_l5/<cycleId>` merges
  every instance's slice; settlement attaches the merged record
  (`SHADOW_L5_v2`); `GET /api/research/shadow-l5` grades rule would-locks
  against settled outcomes. This is the data NEXT #1 (falsification, item 7)
  and NEXT #7 (live shadow) depend on; v1 rows (2 of 200, partial) are not
  comparable and must not be pooled.

### NEXT (in order; each research-gated)
1. **L5 falsification** (`L5_FALSIFICATION_MISSION.md`) on the 21-day trade
   data — untouched final OOS, threshold perturbation, dimension ablation,
   UP/DOWN splits, bootstrap CIs, shadow-vs-replay reconciliation.
2. **Kalshi implied price at t** (free API) → measured edge vs market; kill
   the `|| 0.52` fallback by making edge `null` when the market price is
   absent.
3. **Confidence = calibrated probability.** Replace the step function's
   *display* with the empirical map (`getCalibratedConfidence` / Table 1
   surface) behind a flag + shadow; the decision path stays untouched until
   OOS says otherwise.
4. **Temporal evidence as evidence, not veto** — trajectory of distance /
   momentum / flow across checkpoints as candidate features in the harness
   (ablate; keep only if OOS improves).
5. **Cross-asset (ETH/SOL) ablation** — BASE vs +ETH vs +ETH+SOL.
6. **Events/news stream** — only with publication timestamps and a PIT store;
   only if ablation shows lift.
7. **Live shadow** old-vs-new before any promotion; then promotion report.

### NOT DOING (deliberately)
- Buying data (the free Coinbase tape + Kalshi API cover the measured needs).
- Wiring "100 sources" — each source must add independent, timestamped
  information that survives ablation.
- Any change that raises displayed confidence without a calibration result.
