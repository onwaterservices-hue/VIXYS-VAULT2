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
- Tests: 11 files, 480 checks, all passing
- Engine decision logic: **UNCHANGED from `main`**

Phases A and B are complete. Phase C (trade-level data) is next and is the
gate on all predictive work.

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

## THE CENTRAL BLOCKER — read before trusting any replay number

The 1-minute replay reports **96.8%** over 30 days against a live ledger of
**49.5%**. The harness is wrong, and the cause is measured, not guessed:

With candles 60s apart, `getPriceAtAgo(15)`, `(30)` and `(60)` all resolve to
the same previous-minute price. Three of the engine's five timeframe votes
therefore carry one number — on **85.1%** of 43,199 simulated ticks. That
inflates `multiTimeframeAlignment.alignedCount`, which inflates
`calibratedConfidencePct` and `lockQuality`, which is why 44 of 62 replay locks
sit at the confidence cap of 96 while production's ledger has nothing above 95.

Inspecting the locks confirms it end to end: in every one, price was already
$134–$574 clear of the strike at lock time and simply stayed there.

**Do not tune the engine against 1-minute replay output.** Phase C exists to
remove this.

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

1. **`currentBullVolumePct` is not order flow.** It is
   `min(90, max(10, round(50 + moneynessPct*25 + intervalMomentum*15)))` — a
   pure function of spot vs strike — yet drives an "Order Flow" evidence
   family and displays as `Taker: X% Bull`. Momentum likely corroborates
   itself. Leading hypothesis for the calibration inversion. (Phase E2)
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

**Phase C1** — trade-level ingestion from Coinbase
`/products/BTC-USD/trades`, cached to disk, same offline/deterministic contract
as the candle cache. Then C2 (aggregate to ~3s observations), C4 (show the
collapse rate fall), C5 (reconcile against the baseline).
