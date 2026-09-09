# ENGINE_PROGRESS.md

Persistent handoff between sessions. **Never rely solely on conversation
memory** — if a session runs out of context, this file is what the next one
reads. Update after every meaningful completed task.

Board: `VIXY_ENGINE_TASKS.md` · Rules: `CLAUDE.md`

---

## CURRENT STATE

- Branch: `feat/engine-replay-harness`
- Base: `main` @ `3e31a84`
- `npm run vixy:verify`: **PASS** (5/5 stages, 0 skipped)
- Tests: 12 files, 502 checks, all passing
- Engine decision logic: **UNCHANGED from `main`**

Phases A, B, C and D4 are complete. The replay is now trustworthy enough to
measure with. Phase E (mathematical reconstruction) is in progress.

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

**Phase C5** — reconcile the trade-level replay against the live baseline over
a multi-day window. Investigate divergence; do not tune it away. Remaining
known divergences from production: strike (replay uses `round(spot/10)*10`,
production uses the Kalshi `floor_strike`), the seeded PRNG, and
`crossAssetPen` fed 0.

Then **E3** — ablation: which components actually carry predictive value?
Then **D5** — chronological TRAIN / VALIDATION / OUT-OF-SAMPLE split.

Ingestion cost, measured: ~4.9 trades/sec, ~420k/day, 1000 trades per request,
so ~420 requests/day of history walking back from now. 3 days ≈ 1150 requests
≈ 7 minutes.
