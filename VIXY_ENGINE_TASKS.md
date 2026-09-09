# VIXY 15M ENGINE — TASK BOARD

## HARD SCOPE BOUNDARY

```
PREDICTION HORIZON : 15 MINUTES
CYCLE LENGTH       : 15 MINUTES
TARGET             : DIRECTION OF THE CURRENT 15-MINUTE BTC CYCLE
QUESTION           : "UP, DOWN, or SKIP for THIS 15-minute cycle?"
```

Every feature, threshold, learning rule, lock rule, replay test, calibration
metric and settlement rule must serve that horizon.

**Out of scope:** 1H and 2H predictors. Hourly-trend optimisation. Longer-horizon
outputs may not become hidden inputs unless explicitly transformed into evidence
about the *current 15-minute cycle*.

## SUCCESS CRITERIA

A change is an improvement only if it delivers some of:
fewer bad locks · better calibration · more stable locks · better out-of-sample
performance · better regime adaptation · lower reversal rate · better skip
quality.

A higher win rate is **not** evidence of improvement — especially when it comes
from locking less often. Never tune toward a target win rate.

The key question is not "did it guess UP/DOWN correctly?" but
**"did it wait until the 15-minute evidence actually converged?"**

## STATUS LEGEND
`[ ]` not started · `[~]` in progress · `[x]` done + verified · `[!]` blocked

---

## PHASE A — SETTLEMENT INTEGRITY  `[x]`

- [x] **A1** Remove the `spot = asset === "BTC" ? currentBtcPrice : 100` sentinel
      from `/api/signal`. — `d3df10f`
- [x] **A2** Remove settlement from the read endpoint (a GET must not mutate the
      ledger). One settlement call site remains: the engine tick. — `d3df10f`
- [x] **A3** `checkAndSettle15mCycle` validates its own price: rejects
      non-finite/non-positive, >10% deviation from the last observed venue
      price, observed price older than 60s, and "never observed a price".
      Fails closed but recoverably. — `d3df10f`
- [x] **A4** Regression tests, verified adversarially against two deliberate
      reintroductions. — `d3df10f`
- [ ] **A5** Audit the production ledger for locks already settled at ~$100 and
      quantify the damage to the 43 UP / 8 DOWN skew.
      **BLOCKED:** needs production Firestore read access.

## PHASE B — DEV / PROD SEPARATION  `[x]`

- [x] **B1** Write guard at the Firestore shim; deny unless positively inside a
      deployment (`VERCEL` set). Overrides:
      `VIXY_ALLOW_PRODUCTION_WRITES=true`, `VIXY_PERSISTENCE_MODE=readonly`.
- [x] **B2** `npm run verify:dev-isolation` — 18 real checks.
- [x] **B3** Guard state exposed at `/api/live-engine/health`.
- [x] **B4** `npm run vixy:verify` — typecheck → tests → isolation → replay
      determinism → build.
- [ ] **B5** Verify the guard behaves correctly in a real Vercel deployment.
      **BLOCKED:** requires a deploy (STOP CONDITION).

## PHASE C — TRUSTWORTHY HIGH-RESOLUTION DATA  `[ ]`  ← NEXT

The 1-minute replay is unusable for tuning: `getPriceAtAgo(15|30|60)` all resolve
to the same previous-minute price, collapsing 3 of 5 timeframe votes on ~85% of
ticks and inflating agreement → confidence → lock quality.

- [ ] **C1** Trade-level ingestion from Coinbase `/products/BTC-USD/trades`,
      cached to disk, same offline/deterministic contract as the candle cache.
- [ ] **C2** Aggregate trades into ~3s observations matching production's tick
      cadence. Real trades only — no interpolation, no synthetic ticks.
- [ ] **C3** Expose actual timestamp coverage; gaps stay gaps.
- [ ] **C4** Re-run the fidelity diagnostic and show the collapse rate drop.
- [ ] **C5** Reconcile against the live baseline (103 graded · 49.5% ·
      Brier 0.378 · 43 UP / 8 DOWN wins). Investigate any remaining divergence
      rather than tuning it away.

## PHASE D — DETERMINISTIC REPLAY ON REAL DATA  `[~]`

- [x] **D1** Deterministic replay (seeded), byte-identical reruns.
- [x] **D2** No-look-ahead invariant asserted every tick.
- [x] **D3** Per-cycle trajectory capture (confidence, lock quality, reversal
      risk, direction, time-to-lock, flips, MAE/MFE, blocker).
- [ ] **D4** Re-point onto trade-level data from Phase C.
- [ ] **D5** Chronological TRAIN / VALIDATION / OUT-OF-SAMPLE split.

## PHASE E — MATHEMATICAL RECONSTRUCTION OF THE CURRENT ENGINE  `[ ]`

- [ ] **E1** Write down what the engine currently computes, exactly.
- [ ] **E2** Feature-independence audit. Known finding to confirm:
      `currentBullVolumePct` is **not** order flow — it is
      `min(90, max(10, round(50 + moneynessPct*25 + intervalMomentum*15)))`,
      a pure function of spot vs strike, presented to users as
      `Taker: X% Bull`. Momentum may be corroborating itself.
- [ ] **E3** Ablation: which components actually carry predictive value?

## PHASE F — REGIME / EVIDENCE / TEMPORAL / RISK ARCHITECTURE  `[ ]`

- [ ] **F1** Layer 1 — 15M market state → regime.
- [ ] **F2** Layer 2 — separate UP / DOWN evidence, each with value,
      reliability, freshness, contribution, contradiction.
- [ ] **F3** Layer 3 — temporal confirmation (persistence beats snapshots).
- [ ] **F4** Layer 4 — reversal risk and evidence conflict, measured against
      historical failed locks rather than by subtracting arbitrary points.
- [ ] **F5** Layer 5 — composite lock decision. Confidence alone must never
      produce a lock.

## PHASE G — PREVIOUS-CYCLE LEARNING  `[ ]`

- [ ] **G1** Post-cycle autopsy after every settlement.
- [ ] **G2** Compact, persisted learning state.
- [ ] **G3** Next-cycle pre-forecast consuming only settled cycles.
- [ ] **G4** Learn CONDITIONS, never memorise DIRECTIONS.
- [ ] **G5** Bounded adjustment only; may never force a side or bypass a gate.
- [ ] **G6** Explicit leakage tests for the settle → learn → next-cycle order.

## PHASE H — CALIBRATION  `[ ]`

- [ ] **H1** Calibration separate from directional scoring.
- [ ] **H2** Track Brier, reliability, calibration error, and win rate by
      bucket / regime / direction / lock timing / lock quality.
- [ ] **H3** Explain the non-monotonic buckets
      (80–85% → 27.8%, 85–90% → 46.2%, 90–95% → 62.5%).
      Do not simply lower displayed confidence — find the cause.

## PHASE I — VALIDATION  `[ ]`

- [ ] **I1** Chronological validation, no shuffling, no test-set tuning.
- [ ] **I2** True out-of-sample run.
- [ ] **I3** OLD vs NEW on identical cycles: lock count, skip count, win rate,
      Brier, calibration error, UP/DOWN balance, lock timing, premature locks,
      reversal rate, skip quality, per-regime performance.
- [ ] **I4** Report how often the new engine **correctly refused** to lock.

## PHASE J — INTEGRATION  `[ ]`  (only after I passes)

- [ ] **J1** Integrate behind a flag.
- [ ] **J2** Runtime performance.
- [ ] **J3** UI — **not before the decision object is trustworthy.**

---

## STOP CONDITIONS

Stop and ask: production deployment · production environment changes ·
destructive data operations · irreversible migrations · credentials or external
access required · a safety gate would need weakening · test integrity would need
compromising.
