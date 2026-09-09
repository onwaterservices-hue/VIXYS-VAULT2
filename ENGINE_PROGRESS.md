# ENGINE_PROGRESS.md

Persistent handoff between sessions. **Never rely solely on conversation
memory** — if a session runs out of context, this file is what the next one
reads. Update after every meaningful completed task.

Board: `VIXY_ENGINE_TASKS.md` · Rules: `CLAUDE.md`

---

## CURRENT STATE

- Branch: `feat/engine-replay-harness`
- **`origin/main` (`7eea881`) merged in at `bb0f050`.** 44 commits landed on
  main after this branch was cut from `3e31a84`, including engine changes.
  Only conflict was `.gitignore` (union). The P0 settlement fix survives the
  merge; `main` itself still carries the `/api/signal` spot=100 path.
- `npm run vixy:verify`: **PASS** (5/5 stages, 0 skipped)
- Tests: 13 files, 581 checks, all passing
- Engine decision logic on this branch: **identical to `main`@`7eea881`** —
  no threshold, gate or tier changed here. Additive only: settlement
  validation, write guard, `feedHealth`, `lockGate`.

Phases A, B, C, D4 complete; C5 reconciled. Phase E in progress.

### CORRECTION to earlier notes
The original brief's description of `getCalibratedConfidence` with
`INSUFFICIENT_SAMPLE` at n<15, and server lock tiers EARLY <480s / STANDARD
480–660s / LATE ≥660s with bars 85/75/68, **was correct** — for `main` at
`7eea881` (commits `7eea881`, `2deba55`). Earlier notes here and in
`OVERNIGHT_PROGRESS.md` said none of it existed; they were reading a stale
base that had not fetched. The brief was right.

### REGRESSION on main — `2deba55` (not fixed here; gate logic is off-limits)
`withinEntryWindow` was moved to `effElapsed < 780` but the reason check stayed
at `>= 720`, and `lock15mCycle`'s commit point still refuses `>= 720`. For
720–779s of every cycle: the gate returns `allowed=true` while pushing
`ENTRY_WINDOW_EXPIRED (elapsed=Ns >= 780s …)` (false on its face),
`lockEligibility` reads `eligible=true` with an EXPIRED reason, and the commit
point refuses the lock anyway, logging `[VIXY_LOCK_WINDOW_REJECTED]` every 3s.
This is the exact contradiction the comment above the window check says was
fixed by aligning both to 720. Pinned by name (`REGRESSION-2deba55`) in
`tests/lock-gate.composition.mjs` and `lock-gate.invariants.mjs` so the suite is
green on current behaviour and **fails the moment it is fixed**, forcing an
acknowledged update. Verified adversarially: simulating the fix produces 7+1
named failures. In replay, 5 of 145 locks fell inside this window.

### `lockGate` on the canonical payload · `lockEligibility` fields
`2deba55` computed the tier and bars as locals nobody outside the gate could
see, so the terminal was hardcoding one number. `canLockCurrentCycle` now
writes `lockTier / minLockQuality / minEvidenceAgreement / minMtfAligned /
strikeResolved` onto `active15mCycle.lockEligibility` (observation only; no
decision reads them back), and `/api/vixy/15m/current` exposes them as
`lockGate`. Top-level `lockTier` remains the legacy binary (SKIP→NONE, else
STANDARD) — pinned as-is. The lock-quality card reads `lockGate.minLockQuality`
and shows `Gate threshold unavailable` when absent.
Verified on the live payload: `{tier:"STANDARD", minLockQuality:75, …,
reason:"STRIKE_UNRESOLVED"}` on a cold instance. **NOT verified in the rendered
UI**: the merged build now enforces sign-in (`3d8077d`), which I cannot do.

### Write guard observed blocking a real write
On this local run with production credentials in `.env`, the guard blocked
`setDoc:telemetry_observations/obs_1788959340000` and reported
`reason: "not running inside a deployment (VERCEL unset)"` at
`/api/live-engine/health`. Phase B working as built.

---

## COMPLETED

### Phase A — settlement integrity · `d3df10f`

`/api/signal` computed `spot = asset === "BTC" ? currentBtcPrice : 100` and
passed it to `checkAndSettle15mCycle`, which is authoritative for the ledger.
Any non-BTC request settled the live BTC cycle at $100 — `actualOutcome` is
then always DOWN, so every open lock was graded a loss, and the same value set
the next cycle's strike.

Reachable from the product: `LiveDashboard` and `StarterDeskView` call
`useLiveSignal(selectedAsset)`, so selecting the ETH or SOL tab issued
`/api/signal?asset=ETH`.

Fixed at both levels — the caller no longer settles at all (redundant: the 3s
tick and the cold-boot guard already do), and the authoritative function now
validates its own input and fails closed but recoverably.

### Phase B — dev/prod separation · (this session)

Write guard at the Firestore shim, which every write routes through. Denies
unless positively inside a deployment (`VERCEL` set), so a laptop/replay/CI run
cannot write. Production is unaffected because production always has `VERCEL`.

`npm run verify:dev-isolation` → 18 checks, `npm run vixy:verify` → 5 stages.

### Earlier this session

- Characterization tests pinning the 15M decision path · `e2b07af`
- Two stale suites repointed at this repo's `server.ts` · `3ef6445`
- Offline replay harness · `7172021`
- Real feed health replacing hardcoded terminal values · `ea74005`
- Overnight report · `102f750`

---

## THE CENTRAL BLOCKER — RESOLVED (Phase C)

The 1-minute replay reported **96.8%** over 30 days against a live ledger of
**49.5%**. Cause, measured rather than guessed: with candles 60s apart,
`getPriceAtAgo(15)`, `(30)` and `(60)` all resolve to the same previous-minute
price, so three of the engine's five timeframe votes carry one number. That
inflates `alignedCount` → `calibratedConfidencePct` → `lockQuality`, which is
why 44 of 62 replay locks sat at the confidence cap of 96 while production's
ledger has nothing above 95.

Fixed by ingesting real trade prints at production's cadence. Identical 2-hour
window, same seed:

```
                          candles          trades (3s)
ticks simulated           120              2400
lookback COLLAPSE         120/120  100%    58/2400   2.4%
short-TF votes equal      85%              40.3%
```

The residual 2.4% is genuine flat-price stretches.

**Always run `--source trades`.** `--source candles` still exists for
comparison and prints a warning not to quote its win rate.

Note the harness now separates the DEFECT (lookbacks unresolvable — the real
measure) from the SYMPTOM (equal votes, which never reaches 0 even with perfect
data, because the three votes use thresholds 0.012 / 0.015 / 0.02 and
legitimately agree in a quiet market).

---

## ★ OLD vs NEW ENGINE on identical data (main's engine changes)

Same 3 days, same 1,159,101 trades, same seed. OLD = engine at `3e31a84`;
NEW = engine at `main`@`7eea881` (adaptive lock schedule, calibration map,
phantom-strike guard, revived reversal detector, tie-break fix).

```
                        locks      strike-graded   DIRECTIONAL SKILL     lock time   EARLY/STD/LATE
OLD (3e31a84)           142/288    93.0%           50.0%  (71/142 ±4.2)   med 465s    72 / 57 / 13
NEW (main 7eea881)      145/288    92.4%           44.1%  (64/145 ±4.2)   med 534s    38 / 86 / 21

skill by lock tier      EARLY        STANDARD      LATE
OLD                     55.6% (72)   47.4% (57)    30.8% (13)
NEW                     50.0% (38)   43.0% (86)    38.1% (21)
```

- Per cycle: both lock in 131, direction differs in 2; NEW locks later in 34
  cycles, earlier in 14. Five NEW locks fall in the 720–779s regression window.
- **Skill declines the later the lock, in both engines.** With a strike frozen
  at the open, a later lock means price has already moved further and has less
  room to continue. `2deba55` lowers the bar late and shifts locks toward the
  worst-performing tier; its stated rationale ("evidence strengthens as the
  cycle runs") is backwards for forecasting.
- NEW vs OLD skill difference (−5.9 pts) is ~1.4 SE — not a confident
  regression, but no evidence of improvement, and directionally consistent
  with the mechanism.
- Lock quality ≥90 vs <90: OLD 44.4% (n=9) vs 50.4%; NEW 53.6% (n=28) vs 41.9%.
  n too small to conclude; noted, not claimed.

## ★ THE CENTRAL FINDING — the engine has no measurable directional edge

Phase C5, commit `1215209`. Read this before any predictive work.

Trade-level replay, 3 days, 1,159,101 real trades, 86,400 3s buckets, lookback
collapse 3.1%. It reported **143 locks, 93.0% win rate, Brier 0.065** against a
live ledger of 49.5%. Per the rule, that meant the harness was still wrong. It
was — but not because of tick rate this time. Because of the strike.

```
locks calling the side price had ALREADY moved to : 142/142 = 100%
median |lockSpot - strike|                        : $89.70
median |settle  - lockSpot|                       : $34.10
```

The strike is frozen at the cycle open. The engine locks ~8 minutes in, when
price already sits a median **$89.70** clear of it, and price then travels only
another **$34.10**. The outcome was already decided before the lock was taken.
The engine is naming the side price is already on and being graded against a
stale reference.

Grading the same locks from the price **at the moment of the lock** — the only
question that matters — gives:

```
post-lock directional accuracy : 50.0%  (71/142)
  UP calls                     : 47.1%  (33/70)
  DOWN calls                   : 52.8%  (38/72)
```

A coin flip. And it lands on top of production's **49.5% (51/103)**. The harness
and the live ledger now agree. The disagreement was never "the engine does
better in replay" — it was the replay's strike turning an already-decided
outcome into an apparent prediction.

**What this reframes.** The 80-85% / 85-90% / 90-95% calibration inversion is
not a mis-tuned confidence curve on top of a working predictor. There is no
measurable edge underneath it to calibrate. Confidence of 96 is being attached
to a coin flip — consistent with `b10d3fa`: the "independent" evidence families
are largely one quantity (moneyness) counted several times, which is exactly
what manufactures high confidence without information.

**Consequence for the rebuild.** Phases F–I are not a tuning exercise. The
predictive core has to produce an edge that does not currently exist, and
`post-lock directional accuracy` is the metric that will say whether it does.
It is strike-independent, so it cannot be flattered by changing the strike rule.
Any future claim of improvement must move THAT number above 50% out-of-sample.

**Caveats, stated plainly.** 142 locks over 3 days in one regime — not a large
or diverse sample. The counterfactual regrades existing locks rather than
re-running the engine with a different strike (a different strike would change
moneyness, hence which cycles lock and in which direction), so it isolates
"did price continue after the lock" rather than simulating a different market.
That is the cleanest available test of forecasting skill, but it is not a
backtest of a differently-configured engine.

## BASELINE — the numbers to reconcile against

```
103 graded · 51W / 52L · 49.5% · avgBrierScore 0.378
43 UP wins · 8 DOWN wins

80-85%   n=18   won  5   27.8%
85-90%   n=39   won 18   46.2%
90-95%   n=24   won 15   62.5%
```

Diagnostic evidence, **not targets**. Never silently replace them. The
non-monotonicity across buckets is itself a finding (Phase H3).

Caveat: these outcomes predate the Phase A fix, so an unknown number of them
may have been settled through the $100 path. Task A5 quantifies this and is
blocked on production read access.

---

## KNOWN DEFECTS NOT YET FIXED

1. **`currentBullVolumePct` is not order flow.** PROVEN, `b10d3fa`:
   `min(90, max(10, round(50 + moneynessPct*25 + intervalMomentum*15)))`.
   `intervalMomentum` is `moneynessPct` rounded to 2dp — the same quantity, not
   a second signal — and **Spearman(moneyness, bullVolPct) = 1.0000 exactly**.
   Yet it renders as `Taker: X% Bull | Delta: N BTC` and drives
   `bidAskImbalancePct`. The one external input (`open`, from Binance's 24h
   ticker) is computed, clamped, and never read again — a 21% different open
   changes nothing. The clamp to [10,90] also makes +$800 and +$8000 above the
   strike identical.
   **Hypothesis for E3 (not yet proven):** a cycle merely far from its strike
   scores as though independent sources agreed, so confidence rises on one
   fact counted repeatedly. Leading candidate for the calibration inversion.
   Real taker buy/sell volume is now available from `tradeCache` to test
   whether genuine order flow adds anything the derived figure does not.
2. **Five dead conjuncts in `validationPassed`.** `algorithm`,
   `authoritativeState`, `vixyWebSocket`, `calibrationComplete`,
   `analysisComplete` are all `const x = true`. `calibrationComplete` still
   formats an unreachable `CALIBRATION_INCOMPLETE` reason. Pinned as-is by
   tests. **Do not modify `validationPassed` without explicit instruction.**
3. **Fabricated fallbacks in live paths.**
   `CryptoPredictionCenterView.tsx:356` `?? 87` lock score; confidence-bucket
   endpoints default missing confidence to `75`; calibration-report falls back
   to `0.512` log-loss; canonical endpoint defaults `lockScore` to `50` and
   `gemini.latencyMs` to `0`.
4. **Cold-boot seeds still claim health.** `lastMarketUpdateTs = Date.now()`
   and `engineFeedStatus = "CONNECTED"` at module load, so a cold instance
   believes its feed is live before any fetch. (`lastKalshiUpdateTs` was fixed
   to `0`.) Changing these affects the lock gate, so it needs explicit sign-off.
5. **`build/` and `dist/` are untracked but not gitignored.**

---

## NOT VERIFIED

- Every replay number (see blocker above).
- Write guard behaviour inside a real Vercel deployment — cannot be tested
  without deploying (STOP CONDITION).
- Feed-health OFFLINE/STALE paths and the `--` / `SOURCE UNAVAILABLE`
  fallbacks; only the healthy path was exercised in the browser.
- Anything requiring Firestore: all local verification ran with persistence
  disabled.
- Whether production locks show the same moneyness-at-lock pattern as replay
  locks; production uses Kalshi strikes, replay uses `round(spot/10)*10`.

---

## NEXT ACTION

Phase C5 is **done**; main merged and re-pinned. The most informative signal so
far is **skill vs lock timing** (EARLY 55.6% → LATE 30.8% on OLD) — the only
dimension that separates outcomes at all. That is where Phase E3 should start:
is early-lock skill real (n=72) or an artifact of early locks being taken on
smaller moves? Then real taker flow from `tradeCache` as the first independent
candidate feature. Widen the sample first (≈420 requests/day of history). The harness reconciles
with the live ledger once directional skill is measured strike-independently.

**E3 — ablation.** With a trustworthy replay and a strike-independent metric,
determine whether ANY current component carries directional information. The
prior is poor: the evidence families are largely one quantity counted several
times. Test real taker buy/sell flow from `tradeCache` (recorded, not yet fed
to the engine) as the first genuinely independent candidate.

**D5** — chronological TRAIN / VALIDATION / OUT-OF-SAMPLE split, so any
candidate edge is tested on data it was not chosen on.

**Widen the sample** before drawing structural conclusions: 3 days / 142 locks
is one regime. Ingestion cost is ~420 requests per day of history.

Ingestion cost, measured: ~4.9 trades/sec, ~420k/day, 1000 trades per request,
so ~420 requests/day of history walking back from now. 3 days ≈ 1150 requests
≈ 7 minutes.
