# ENGINE_DATAFLOW.md — every number on the 15M prediction card, traced to origin

Mission 1 of the 15M master brief. Written 2026-09-10 from code + a live trace
of production (cycle 01:30Z). Read `ENGINE_PROGRESS.md` SESSION 5 for the
root cause of the "52% at minute 9" behaviour; this file is the map.

Legend — **Affects lock?** = does the value feed `canLockCurrentCycle` /
`lock15mCycle`. **PIT-safe** = point-in-time safe (uses only data available at
the tick). **Fallback** = what renders when the source is missing.

## The transport
- `GET /api/vixy/15m/current` (canonical) — built by `VIXY_STATE_ADAPTER_v1`
  from `active15mCycle` + module-level engine variables. Polled by the client
  every ~3s (`useCanonical15mDecision`, `fetchCanonical15mDecision`). This is
  what the Prediction Center, Command Center ring and VIXY Live modules read.
- `GET /api/signal` (legacy) — a separate view with its own `confidence` /
  `probability`; still read by the right rail of the Command Center in some
  states. Two engines' opinions on one screen (mission-1-canonical-decision).
- Engine tick: `runMarketEngineTick` every 3s while an instance is warm, plus
  `/api/cron/engine-tick` every minute. All fields below recompute per tick
  **before lock**; after lock the decision fields freeze (`locked*`).

## Fields (Prediction Center card)

| UI field | Payload field | Computed where / how | Refresh | Affects lock? | PIT-safe | Fallback |
|---|---|---|---|---|---|---|
| VIXY BIAS (UP/DOWN) | `direction` | `pipelineDirection` = pipeline `explainability.direction` (candidateDir) else modelProb ≥0.52/≤0.48 | 3s | yes (`dirTarget`) | yes | `'UP'` literal in card if missing (`rawDirection \|\| 'UP'`) |
| "% CONVICTION" | `confidence` | `edgeVsConfidence.calibratedConfidencePct` = **`calibratedConf` step function** (server.ts ~2544): dataQuality≠OPTIMAL→42; agree≥8 & !chop & !veto → 70+(agree−8)·5+(aligned−3)·3+ITM·5 ∈[68,96]; agree≥6 & !chop & !veto → 66+(aligned−3)·2 ∈[66,74]; **else 42+2·agree−0.1·chop ∈[40,58]**. NOT the empirical `getCalibratedConfidence` map (that only serves `/api/signal/calibrated-confidence`). | 3s pre-lock; frozen at lock (`lockedConfidence`) | no (gate uses lockQuality/agreement/aligned, not this number) | yes | card seeds 78 until first payload; server `\|\| 75` in some adapter paths |
| LOCK QUALITY /100 | `lockScore` | `rawLockQuality` (server.ts ~2571): (agree/11)·40 + (aligned/5)·20 + min(20, coverage/2·20) + regime10 + flow10 − chop·0.25 − threat·0.25 − (dq≠OPTIMAL?30:0), clamped [0,99] | 3s | **yes** — gate requires `lockQualityTier≠SKIP && lockQuality ≥ minLockQuality` (EARLY 85 / STANDARD 75 / LATE 68) | yes | server `?? 50` (adapter); client now renders "AWAITING ENGINE DATA" when null |
| Gate threshold ("Req. N+") | `lockGate.minLockQuality`, `.tier` | tier by `effElapsed` (<480 EARLY, <660 STANDARD, else LATE) | 3s | yes (it IS the gate) | yes | "Gate threshold unavailable" |
| REVERSAL RISK % | `reversalRisk` | `threatScore` = 15 + (5−aligned)·6 + absorption(25/15/0) + chop·0.25 + crossAssetPen, clamped [5,95] | 3s | yes — `reversalVetoActive = threat≥30 \|\| momentum REVERSING` blocks the top two confidence tiers and the lock | yes | card seeds 28 until payload |
| MARKET ALIGNMENT | `evidenceAlignment` | `agreementCount` = families with `agreement:true` of **11** | 3s | yes (gate `minEvidenceAgreement` 8/6/5) | yes | was a hardcoded "STRONG" chip; now `alignmentLabel(n)` + "n/11" |
| Temporal stability | `temporalStability` | adapter field (persistence/observation based) | 3s | indirectly (`signalUnstable` veto) | yes | — |
| Contradiction score | `contradictionScore` | adapter | 3s | no | yes | — |
| PRICE | `currentSpot` | `livePrice` from the COINBASE_KRAKEN_CASCADE fetch | per fetch (~3s) | yes | yes | — |
| STRIKE | `openStrike` | `current15mStrikePrice` (Kalshi contract strike; ≈ cycle open) | at cycle open | yes (moneyness) | yes | phantom-strike guard (`strike15mResolved`) |
| Distance to strike | derived | `currentSpot − openStrike` | 3s | **yes, but only as `isITM` (±$10) and `coverageRatio`** — see "what the score ignores" | yes | — |
| Cycle timer | `secondsRemaining` | interval math | 1s client | yes (window 360–780s, tiers) | yes | — |
| Stage / status line | `engineStage`, `currentState` | engine lifecycle (`OBSERVING → CALIBRATING → ANALYZING → QUALIFYING → LOCKING → LOCKED / NO_TRADE`) | 3s | — | yes | legacy countdown mapping if `engineStage` absent |
| FEED AGE | `feedHealth.dataAgeMs` | measured from last price fetch | 3s | yes (dataQuality) | yes | "--" |
| WHY VIXY THINKS (6 bars) | `evidence.subScores` | adapter-derived sub-scores | 3s | no (display) | yes | — |
| Recent settlements strip | `/api/signal/resolved-log` | real ledger rows (`recentResolved`, `stats`) | on mount + each cycle | no | n/a | honest empty state (**was 5 hardcoded rows + "78% / 0.142"**) |

## The 11 "evidence families" (what `agreementCount` actually counts)
| # | Family | `agreement` when | Independent information? |
|---|---|---|---|
| 1 | PRICE_STRUCTURE | spot vs VWAP / higher-highs or lower-lows in the last 20 ticks | partly (VWAP, micro-structure) |
| 2 | ORDER_FLOW | `bullVolPct` ≥52 (UP) / ≤48 (DOWN), `netDeltaBTC` sign, not ABSORBED | **no** — `bullVolPct = 50 + moneyness·25 + momentum·15` (moneyness restated; Spearman 1.0, pinned in `feature-independence`) |
| 3 | MOMENTUM | `alignedCount` ≥3 of the 5 timeframe votes (15s/30s/1m/5m/15m), not CONFLICT/REVERSING | yes, but **very short lookbacks** — goes NEUTRAL whenever price pauses |
| 4 | VOLATILITY | `isStrikeFeasible` (expected move covers required move) & vol ≠ EXTREME | **no** — required move = distance to strike (moneyness again) |
| 5 | LIQUIDITY | `dataQualityStatus === "OPTIMAL"` | **no** — same flag as #11; no book is read (label now says "proxy") |
| 6 | REGIME | not chop-filtered | partly (chop uses flips, strike-tightness, MTF, flat momentum) |
| 7 | STRIKE_EXPIRY | `isITM` or coverage ≥1.2 with ≥120s left | **moneyness** |
| 8 | TIME_TO_EXPIRY | ≥180s left and not late-cycle | **no direction content** — a free "yes" for the first 12 minutes |
| 9 | CROSS_MARKET | cross-asset risk penalty <5 | weak; details string was a literal ("Perp basis: Congruent") — now honest |
| 10 | REVERSAL_RISK | `threatScore` <30 and no veto | derived from #3 (`(5−aligned)·6`) |
| 11 | DATA_QUALITY | `dataQualityStatus === "OPTIMAL"` | duplicate of #5 |

Effective independent inputs: **distance-from-strike** and **short-window
momentum** (plus feed quality). Four families are near-constant yes-votes
unrelated to direction, so `agreementCount` has a floor of ~4 before any
market evidence exists.

## What the score ignores (and the research already measured)
- The **trajectory** of evidence across the cycle. `recentObservations`,
  `directionChanges`, `signalPersistence` feed only **vetoes** (`signalUnstable`,
  `flipsPenalty`); nothing accumulates *toward* conviction. Observations are
  telemetry, not intelligence.
- **Distance from strike as a probability.** Table 1 (`ENGINE_PROGRESS.md`,
  2,591 cycles, OOS-stable) gives P(settle on current side | t, |bps|, vol); at
  t≈435s and 19 bps it is ≈90%+. The score treats that state as 52 because the
  15s/30s/1m momentum votes happened to be NEUTRAL.
- Real taker flow (`/api/radar` tape) — measured 45–51% predictive at n≈671,
  i.e. nothing; correctly not wired in.
- Kalshi implied probability: real when the Kalshi fetch succeeds, else
  `\|\| 0.52` (server.ts ~2483) — any "edge" shown in that state is versus an
  invented market price.

## Two internal inconsistencies worth knowing
- Gate log `LOCK_QUALITY_INSUFFICIENT (… score=0/100 …)` while the payload
  showed `lockScore: 44` seconds apart: both read `latestBtc15mPipeline.lockQuality`,
  which can swing to 0 in a tick where `dataQualityStatus ≠ OPTIMAL` (−30) or
  chop/threat spike. The card shows whichever tick it polled.
- `lockTier` (top-level) is the legacy binary; `lockGate.tier` is the real one.
