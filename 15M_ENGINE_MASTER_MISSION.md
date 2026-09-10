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
