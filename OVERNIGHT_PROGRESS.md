# OVERNIGHT ENGINE REPORT

Branch: `feat/engine-replay-harness`
Base: `main` @ `3e31a84`  ·  Head: `ea74005`
Date: 2026-09-09

> **Note on the stated baseline.** The brief gives the handoff baseline as
> `main @ 7eea881`. That object does not exist in this repository
> (`git cat-file -t 7eea881` → `fatal: Not a valid object name`). `main` was at
> `3e31a84` and this branch was cut from there.

---

## HEADLINE

The instrument got built and it works. **It also proved itself unfit to measure
the engine yet, and that is the most important result of the night.**

The replay harness reports a 96.8% win rate over the last 30 days against a live
ledger of 49.5%. That gap is not an engine discovery — it is a harness defect
that is now *measured* rather than guessed: 1-minute candles collapse three of
the engine's five timeframe votes into one number on **85.1% of ticks**, which
inflates evidence agreement, confidence and lock quality.

Because of that, **no decision logic, threshold, gate or tier was changed
tonight.** Phase 8 of the mission requires every engine change to survive
out-of-sample verification. The only instrument available to verify one is
knowingly biased, so shipping "improvements" would have meant shipping guesses
with a number attached — the exact failure mode this repo has been damaged by.
The apparatus is in place; the tuning is deliberately not.

---

## BASELINE
- commit: `3e31a84` (live production ledger at handoff)
- cycles: 103 graded
- win rate: 49.5% (51W / 52L)
- Brier: 0.378
- direction split: 43 UP wins / 8 DOWN wins

## NEW ENGINE
- commit: `ea74005`
- cycles: **unchanged — no engine change was made**
- win rate: unchanged
- Brier: unchanged
- direction split: unchanged

The engine's decision path is byte-identical to `main`. The only `server.ts`
changes are additive feed-health telemetry (see CHANGES).

## REPLAY HARNESS OUTPUT (not an engine result — see FIDELITY below)
Window: last 30 days · 2880 cycles · 0 skipped · 0 lookahead violations

- locks: 62 (2.2% of cycles; production locked ~3.6%)
- graded: 62 · win rate **96.8%** (60W / 2L) · Brier **0.033**
- direction split: UP n=30 won 30 (100%) · DOWN n=32 won 30 (93.8%)
- avg time-to-lock 510s · earliest 360s / latest 660s
- avg lock quality 87.8 · avg adverse excursion $118.42 · favorable $151.75
- 2818 of 2818 non-locking cycles ended on `ENTRY_WINDOW_EXPIRED`

## CALIBRATION

Replay (30d):

| bucket | n | won | win% | avg conf | calib err |
|--------|----|-----|------|----------|-----------|
| 90–95% | 18 | 18 | 100% | 91.6 | 8.4 |
| 95%+   | 44 | 42 | 95.5% | 96.0 | 0.5 |

All other buckets empty. Compare production:

| bucket | n | won | win% |
|--------|----|-----|------|
| 70–75% | 11 | 6 | 54.5% |
| 75–80% | 8 | 5 | 62.5% |
| 80–85% | 18 | 5 | 27.8% |
| 85–90% | 39 | 18 | 46.2% |
| 90–95% | 24 | 15 | 62.5% |

**The distributions do not overlap.** Production has *nothing* above 95%; the
replay puts 44 of 62 locks there. That mismatch is the tell that the replay's
internal state — not its arithmetic — diverges from production, and it is what
led to the root cause below.

### Why the harness disagrees — measured, not assumed

`evaluateBtc15mHighConvictionPipeline` derives five timeframe votes from
`getPriceAtAgo(15 | 30 | 60 | 300 | 900)` over `rollingBtcTicks`. In production
that buffer is filled roughly every 3 seconds. In the replay it is filled once
per minute, so `getPriceAtAgo(15)`, `(30)` and `(60)` **all resolve to the same
previous-minute price**. Three independent votes become one.

Measured over 43,199 simulated ticks: `tf15s == tf30s == tf1m` on **85.1%** of
them. That inflates `multiTimeframeAlignment.alignedCount`, which feeds
`calibratedConfidencePct` (`70 + (agreement−8)×5 + (aligned−3)×3 + ITM×5`,
capped at 96) and `lockQuality`. Hence 44/62 locks pinned at the cap of 96.

Inspecting the locks confirms the mechanism end to end. In **every** lock the
price was already $134–$574 clear of the strike at lock time and simply stayed
there:

```
15M-2026-09-08T13:30Z strike=78300 lock@600s DOWN conf=96 spot=77725.99
                      moneyness −574.01 (−0.733%)  settle 77807.56 → WIN
15M-2026-09-08T11:00Z strike=78530 lock@360s DOWN conf=96 spot=78395.80
                      moneyness −134.20 (−0.171%)  settle 78288.35 → WIN
```

The engine is not forecasting here; it is reading a strike frozen at the cycle
open and naming the side price already sits on. A $134–$574 gap rarely closes in
the remaining 4–9 minutes, so it "wins". Production's Kalshi strike is set near
the money, which is why production is near a coin flip.

**The harness prints all of this on every run** as a FIDELITY DIAGNOSTICS block,
plus an explicit instruction not to quote the win rate as an engine result.

## LOCK QUALITY
- average at lock (replay): 87.8
- premature locks: **not measurable** — requires production tick data
- reversal locks: **not measurable** — same
- skipped bad setups: 2818 cycles blocked, 100% on `ENTRY_WINDOW_EXPIRED`

That last figure is itself a finding: in replay, **no cycle is ever refused for a
quality reason**. Every non-lock simply runs out the clock. Whether production
behaves the same way is unknown and worth checking directly.

## LEARNING
- cycles learned from: **0**
- adaptive state updated: **no**
- next-cycle context verified: **no**
- leakage tests: **implemented and passing** (0 violations across 43,199 ticks)

Phases 4–6 (regime layer, per-cycle learning, online learning ledger) were **not
started**. They are engine changes, and Phase 8 requires out-of-sample proof that
the only available instrument cannot currently provide. Building a learning loop
validated by a harness with a known 85% distortion would have manufactured
exactly the kind of confident-but-false result the mission forbids.

## PERFORMANCE
- telemetry latency: **real value now exposed** — `dataAgeMs` observed at
  0.9s–3.1s live (the UI previously claimed a hardcoded 0.8s)
- decision latency: not measured
- polling: not audited (Phase 10 not started)
- production build: passes (`npm run build`, exit 0)

## TESTS
- total: **9 files, 396 checks**
- passed: 396
- failed: 0

| file | pins | result |
|------|------|--------|
| `lock-gate.composition.mjs` (new) | `validationPassed`'s exact 27-conjunct set (structural) + each condition driving `allowed` to false (behavioural); 360s floor; 720s window; `effElapsed` preferring `cycleObservationDuration`; `lockEligibility` side effect | 86 pass |
| `settlement-grader.characterization.mjs` (new) | `actualOutcome` (`>=` strike is inclusive), `wasCorrect`, WIN/LOSS label, Brier across 8 cases | 26 pass |
| `entitlements.characterization.mjs` (new) | full plan × status matrix for `getEntitlementsFromSubscription` | 61 pass |
| `calibration-and-tiers.characterization.mjs` (new) | confidence-bucket edges, low-sample marker, real lock-tier boundaries and policy table | 73 pass |
| `lock-gate.invariants.mjs` (repointed) | pre-existing lock-gate invariants | 28 pass |
| `discord-claim.failclosed.mjs` (repointed) | Discord claim fails closed | 7 pass |
| `directional-bias.invariants.mjs` | direction not derived from edge sign | 12 pass |
| `discord-entitlement.mapping.mjs` | Discord tier mapping | 24 pass |
| `discord-oauth-linkage.invariants.mjs` | OAuth linkage | 79 pass |

**Adversarial check performed.** The gate test was verified against a
deliberately gutted `server.ts` with `lockQualityPass` removed from
`validationPassed`. It failed 4 checks and reproduced the historical signature
exactly: `allowed=true` while the reasons array still emitted
`LOCK_QUALITY_INSUFFICIENT`. That is precisely why the four previous gutting
incidents reached production unnoticed — the diagnostics kept looking correct.
`server.ts` was restored from a pristine copy and `git diff` confirmed clean.

## CHANGES

| file | change | reason |
|------|--------|--------|
| `tests/_engineSource.mjs` | new — shared verbatim-source extractor; every slice asserts its anchors appear exactly once | tests must execute shipped code, and must fail loudly if the file drifts |
| `tests/lock-gate.composition.mjs` | new, 86 checks | `validationPassed` gutted 4× historically, undetected each time |
| `tests/settlement-grader.characterization.mjs` | new, 26 checks | the grader decides the ledger; nothing covered it |
| `tests/entitlements.characterization.mjs` | new, 61 checks | controls paid access |
| `tests/calibration-and-tiers.characterization.mjs` | new, 73 checks | pins the real bucket and tier numbers |
| `tests/run-all.mjs` | new runner; `npm test` now runs tsc **and** the suite | one entry point; strengthens, does not replace |
| `tests/lock-gate.invariants.mjs`, `tests/discord-claim.failclosed.mjs` | repointed to this repo's `server.ts` | both read `~/Downloads/VIXYS-VAULT2-main/server.ts` — a copy ~950 lines behind HEAD. Both were green while guarding a file nobody deploys. Verified they pass unchanged against the repo copy before repointing; no assertion altered |
| `scripts/replay15m.ts` + `scripts/replay15m/` | new offline replay harness | the point of the exercise |
| `server.ts` | `marketFeedHealth` tracks the venue that actually served the price; `feedHealth` added to `/api/vixy/15m/current` | the payload had no latency, venue or source field at all |
| `server.ts` | `lastKalshiUpdateTs` initialised `0` not `Date.now()` | every cold instance claimed Kalshi was fresh before any fetch; `/api/live-engine/health` reported `kalshiFeed: "CONNECTED"` with the boot time as `lastKalshiUpdate` |
| `CryptoPredictionCenterView.tsx` | 4 hardcoded strings → real values, `--` when unknown | see below |
| `.gitignore` | ignore `.cache/` | harness candle cache |

### Display honesty — before/after, verified in the rendered UI

Captured before the change, in the browser, side by side in one status bar:

```
MARKET FEED ● STALE    VENUES 4 / 4 SYNCED    LATENCY: 0.8s
```

The feed reported **STALE** while the latency badge showed a green **0.8s**. The
latency could not disagree with reality because it never read it.

| element | before | after (verified live) |
|---------|--------|-----------------------|
| latency | `LATENCY: 0.8s` (literal) | `FEED AGE: 0.9s–1.2s`, varying; API cross-check `dataAgeMs: 3060` |
| venues | `4 / 4 SYNCED` (literal) | real count — observed at both `3 / 4` and `4 / 4` across ticks |
| price source | `• BINANCE` (literal) | `• COINBASE` — the actual chain is Coinbase → Kraken → CoinGecko → Binance, first success wins, so Binance is nearly never the source |
| lock gate | `Req. 70+ to lock` / `(Threshold: 70)` | `Ready (≥75)` / `(Threshold: 75)`, matching the real gate |

The lock-quality copy was not merely stale, it **understated the gate**: a score
of 72 rendered as "Qualified" while `canLockCurrentCycle` would refuse it. The
real threshold is a flat `lockQuality >= 75` with `lockQualityTier !== "SKIP"`.
It is **not** tier-dependent — `server.ts` only ever emits `lockTier` of
`STANDARD` or `NONE`.

## ROLLBACK POINTS

| SHA | known-good state |
|-----|------------------|
| `3e31a84` | `main` at branch point — production as handed off |
| `e2b07af` | characterization tests only; zero production code touched |
| `3ef6445` | + stale test suites repointed; still zero production code touched |
| `7172021` | + replay harness; still zero production code touched |
| `ea74005` | + feed-health telemetry and display fixes (HEAD) |

`7172021` is the safest rollback that keeps all the new instrumentation: every
commit up to and including it changes no production code path whatsoever.

## FAILED

**Reconciling the harness with the live ledger.** Not a crash — a measured
inability. Root cause identified (85.1% short-timeframe collapse) and reported
by the harness itself. Cannot be fixed with 1-minute candles; needs trade-level
history. Not worked around, not tuned away.

**Local server initially attempted production Firestore writes.** First launch
of `node dist/server.cjs` produced:

```
[FIRESTORE_CIRCUIT] OPEN write=telemetry_observations/obs_1788927630000
reason=Could not load the default credentials. ... backoffMs=900000
```

Server was killed immediately. Audit confirmed **zero writes succeeded** — all
14 attempts failed on credential loading and the circuit breaker opened. But
that was luck, not design: the writes were genuinely attempted. Relaunched with
`FIREBASE_SERVICE_ACCOUNT_JSON=""` and `GOOGLE_APPLICATION_CREDENTIALS=""` for
all subsequent verification. **See NEXT — this is a live hazard.**

## NOT VERIFIED

Be generous here; these are real gaps, not hedges.

- **Every replay number above.** The harness has a measured 85.1% fidelity
  defect. Win rate, Brier, direction split and calibration are all inflated by
  an amount I have not quantified. Do not quote them.
- **That production locks behave like replay locks.** The moneyness-at-lock
  finding is a property of *the replay's* strike derivation. Whether production's
  Kalshi strikes produce the same pattern is untested — I could not read the
  production ledger.
- **Kalshi strike behaviour.** I assumed `floor_strike` is fixed per 15m market.
  Not verified against Kalshi.
- **The feed-health values under real failure.** I verified `feedHealth` with
  feeds working (and one SOL miss). I did **not** verify the OFFLINE/STALE paths,
  `priceSource: null`, or the `--` / `SOURCE UNAVAILABLE` fallbacks rendering,
  because I could not force a feed failure safely.
- **`venuesLive` semantics.** It counts BTC/ETH/SOL/Kalshi returning data. That
  is a defensible reading of "4 venues" but it is my choice, not a pre-existing
  definition. The old `4 / 4` referred to nothing at all.
- **Firestore-backed behaviour.** All UI verification ran with Firestore
  disabled. Per CLAUDE.md's environment-parity warning, anything depending on
  persistence was not exercised.
- **The Discord, Stripe and settlement paths.** Untouched and untested tonight.
- **Phases 3, 4, 5, 6, 9, 10, 11, 12 of the mission.** Not started. No
  hysteresis work, no regime layer, no learning loop, no deployment audit, no
  performance audit, no UX work.
- **`npm test` in CI.** Changed to run tsc **and** the suite. Verified locally;
  not verified in CI.
- **Nothing was deployed, pushed, or merged.** No preview URL was exercised.

---

## NEXT

Ordered by value.

**1. `/api/signal?asset=<anything-but-BTC>` corrupts the production ledger.**
This is the `spot=$100` investigation, and it is worse than a display bug.

```
server.ts:14324   const asset = (req.query.asset || "BTC").toUpperCase();
server.ts:14357   const spot = asset === "BTC" ? currentBtcPrice : 100;
server.ts:14358   await checkAndSettle15mCycle(spot);
```

`checkAndSettle15mCycle` is documented in-file as *"authoritative for lock
settlement and persistent outcome generation"*. A single request to
`/api/signal?asset=ETH` at a 15-minute boundary settles the live **BTC** cycle at
a price of **$100**, making `actualOutcome = (100 >= 78599.33) ? "UP" : "DOWN"`
→ always `DOWN`, and writing that to the ledger. That fully explains the reported
`spot=$100` alongside a valid strike of `$78599.33`.

It is also a candidate contributor to the baseline's lopsided
**43 UP wins vs 8 DOWN wins**: any UP lock settled through this path is forced to
a loss. I did **not** patch it — the brief says investigate only, and a blind fix
at this hour to the settlement path is exactly the wrong move. It needs a proper
fix (reject non-BTC, or never settle from a read endpoint) plus a ledger audit
for locks already settled at $100.

**2. Get trade-level history so the harness can actually reconcile.** Coinbase
`/products/BTC-USD/trades` gives sub-second data. Feeding `rollingBtcTicks` at
~3s spacing removes the 85.1% collapse and is the precondition for *any* engine
tuning being provable. Everything in Phases 3–8 is blocked on this.

**3. Make the local server incapable of writing to production.** A developer
with working credentials who runs `node dist/server.cjs` writes telemetry, locks
and signal logs straight into the production ledger. Add an explicit
`VIXY_READONLY=1` / `ENGINE_PERSISTENCE=off` guard rather than relying on
credentials happening to be absent.

**4. Reconsider `evaluateBtc15mHighConvictionPipeline`'s "order flow" evidence.**
`currentBullVolumePct` is not order flow. It is
`min(90, max(10, round(50 + moneynessPct×25 + intervalMomentum×15)))` — a pure
function of spot vs strike. It is then presented to users as
`Taker: X% Bull | Delta: N BTC` and drives an "Order Flow" evidence family, a
`bidAskImbalancePct`, and part of the confidence score. Momentum is being counted
as independent corroboration of itself, which is a plausible structural cause of
the calibration inversion at 80–85%.

**5. Investigate why the 80–85% bucket (27.8%) underperforms 85–90% (46.2%).**
Do not "lower confidence" — the non-monotonicity says the confidence *formula* is
mis-ordering setups, and #4 is the leading hypothesis.

**6. Four conjuncts in `validationPassed` are hardcoded `true`.** `algorithm`,
`authoritativeState`, `vixyWebSocket`, `calibrationComplete` and
`analysisComplete` are `const x = true`. `calibrationComplete` still formats an
unreachable `CALIBRATION_INCOMPLETE` reason citing
`active15mCycle.calibrationSamples`. Pinned as-is in tests; decide whether they
should be real checks or be removed. **Per the constraint, I did not touch
`validationPassed`.**

**7. Fabricated fallbacks still in live paths.** `CryptoPredictionCenterView.tsx:356`
does `?? 87` for the lock score; the confidence-bucket endpoints default a
missing confidence to `75`; `/api/signal/calibration-report` falls back to
`0.512` log-loss; the canonical endpoint defaults `lockScore` to `50` and
`gemini.latencyMs` to a hardcoded `0`. Each renders an unknown as a plausible
number.

**8. `build/` and `dist/` are untracked but not gitignored.** Minor, but they
show up in every `git status` and invite an accidental commit.

---

## FINAL VERDICT

**MIXED.**

Delivered and verified: a characterization suite that pins the decision path and
demonstrably catches the exact regression that has hit this repo four times; two
test suites that were silently guarding the wrong file, repointed; an offline,
deterministic, leakage-free replay harness; four hardcoded display values
replaced with observed ones and confirmed in the rendered UI; and a precise,
reproduced diagnosis of a settlement-corruption path.

Not delivered: any actual engine improvement. The mission asked for a
*provably* better engine, and the instrument built to prove it is — measurably —
not yet good enough to prove anything. Claiming IMPROVED would require quoting a
96.8% win rate I know to be an artifact.

The engine is not better tonight. It is now **measurable**, **pinned against
regression**, and **honest about what it does not know** — which is the
precondition for it ever getting better.
