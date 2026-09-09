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

## PHASE C — TRUSTWORTHY HIGH-RESOLUTION DATA  `[x]` (C5 in progress)

- [x] **C1** Trade-level ingestion from Coinbase `/products/BTC-USD/trades`
      (`scripts/replay15m/tradeCache.ts`), cached per complete UTC hour, same
      offline/deterministic contract as the candle cache. — `9e507db`
- [x] **C2** Aggregated into 3s observation buckets matching production's
      cadence. Real prints only. An empty bucket carries the last real price
      and is flagged `empty:true` with `tradeCount 0`; over 2h only 6/2400
      (0.25%) were empty. Nothing interpolated. — `9e507db`
- [x] **C3** Coverage reported every run: buckets total / with prints / empty,
      trades used, requests, hours cached vs fetched. — `9e507db`
- [x] **C4** Collapse rate measured, identical 2h window, same seed:
      **candles 120/120 = 100%** → **trades 58/2400 = 2.4%**. — `9e507db`
      The harness now separates the DEFECT (lookbacks unresolvable) from the
      SYMPTOM (equal votes, which never reaches 0 because the three votes use
      different thresholds and legitimately agree in a quiet market).
- [x] **C5** Reconciled. — `1215209` The trade-level replay's 93% is an
      artifact of a strike frozen at the cycle open: 142/142 locks call the
      side price had already moved to, median $89.70 clear of the strike, with
      only $34.10 of travel left. Graded from the lock price instead,
      **post-lock directional accuracy is 50.0% (71/142)** — matching
      production's 49.5%. The harness and the ledger agree; **the engine has no
      measurable directional edge.** This metric is now printed every run and
      is strike-independent.

**Bonus unlocked:** trades carry a real `side`, so buckets record genuine taker
buy/sell volume. Deliberately NOT fed to the engine yet — `bullVolPct` is
currently derived from moneyness, and swapping in real order flow is an engine
change. Recorded so E2 can measure whether it adds independent value.

## PHASE D — DETERMINISTIC REPLAY ON REAL DATA  `[~]`

- [x] **D1** Deterministic replay (seeded), byte-identical reruns.
- [x] **D2** No-look-ahead invariant asserted every tick.
- [x] **D3** Per-cycle trajectory capture (confidence, lock quality, reversal
      risk, direction, time-to-lock, flips, MAE/MFE, blocker).
- [x] **D4** Re-pointed onto trade-level data; candles and trades share one
      source-agnostic observation stream. `--source trades`. — `9e507db`
- [ ] **D5** Chronological TRAIN / VALIDATION / OUT-OF-SAMPLE split.

## MERGE — `origin/main` @ `7eea881` merged at `bb0f050`  `[x]`

- [x] 44 commits from main merged; only `.gitignore` conflicted (union).
- [x] Suites re-pinned to main's engine: adaptive tiers (85/75/68 by
      effElapsed), `strike15mResolved` term in `allowed`, `getCalibratedConfidence`
      with `INSUFFICIENT_SAMPLE` at n<15. 13 files / 581 checks.
- [x] **REGRESSION-2deba55** pinned by name (gate says allowed at 720–779s while
      the commit point refuses). Not fixed here — gate logic is off-limits.
      **→ Needs a decision: align both to 720 or both to 780.**
- [x] `lockGate` exposed on the canonical payload; card reads it.
- [ ] Verify the tier label in the rendered UI — **BLOCKED: needs sign-in.**
- [ ] `main` still has the `/api/signal` spot=100 settlement path (this branch
      removes it). **→ Merge this branch, or cherry-pick `d3df10f`, soon.**

## PHASE E — MATHEMATICAL RECONSTRUCTION OF THE CURRENT ENGINE  `[~]`

- [x] **E0** OLD vs NEW engine on identical trade data (see ENGINE_PROGRESS):
      skill 50.0% → 44.1%; skill falls with later locks in both; `2deba55`
      shifts locks later.
- [x] **E3a** Early-lock skill is not real: 55.6% (n=72), p=0.41; no
      time or moneyness bin separates from 50%. Nothing the engine outputs
      carries directional information at n=142.
- [x] **E3b** Real taker flow at fixed checkpoints, all 287 cycles: 42–55%
      everywhere, no cell significant in the predictive direction. Tool:
      `scripts/replay15m/research/flowSkill.ts`. Repeat at 7 days.
- [x] **E3c** `/api/orderflow` returns resting L2 depth labelled as taker
      flow; pinned, not changed (no consumer yet).
- [~] Widen sample to 7 days (ingestion running).

- [ ] **E1** Write down what the engine currently computes, exactly.
- [ ] **E2** Feature-independence audit. Known finding to confirm:
      `currentBullVolumePct` is **not** order flow — it is
      `min(90, max(10, round(50 + moneynessPct*25 + intervalMomentum*15)))`,
      a pure function of spot vs strike, presented to users as
      `Taker: X% Bull`. Momentum may be corroborating itself.
- [ ] **E3** Ablation: which components actually carry predictive value?

## PHASE E' — THE PRODUCT CRITERION (added after the user's correction)  `[~]`

- [x] `--snippets` intracycle dataset (the 5-minute-snippet idea): 36,288
      labelled samples / 2,592 cycles, no look-ahead. — `a99e2b3`
- [x] Table 1: P(current side wins | t, |distance|) on 2,591 cycles; stable
      out-of-sample; volatility matters at small distances. — `f1deb82`
- [x] Candidate rule fitted first-half / evaluated second-half: ≥95% bar →
      67.7% of cycles locked at 94.9% win vs engine 2.2% at 96.6%.
- [x] Repeated on corrected 7-day trade data: Table 1 replicates; rule ≥95% 97.5% vs engine 92.8% at the same lock rate, later locks. Earlier "30×" claim corrected (candle artifact).
- [ ] Add Kalshi implied price at t → measure edge vs market, not just win%.
- [ ] Regime slices (trend/range/high-vol) for the rule.
- [ ] Decide: rule becomes Layer 5 behind a flag (Phase J1), engine evidence
      demoted to skip/veto roles it can justify.

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
