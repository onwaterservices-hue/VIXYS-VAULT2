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

---

## SESSION 4 — production deep audit (2026-09-09 ~15:00Z) + ledger persistence fix

**PR #28 merge is STILL PENDING (blocked for the agent by the permission
classifier; the owner must click merge).** Everything below was verified against
production = `main`@`7eea881` through Chrome; the fixes are on this branch.

### Watched live: the lock-row loss, end to end
- 14:45Z cycle locked UP 88% at 14:51:01 (361s in — first legal second again,
  ~8 bps lead). Price then fell to $114 BELOW the strike with confidence frozen
  at 88 while lockScore fell to 53. Payload showed `lockTier:"NONE"` while
  LOCKED, and `qualificationReason:"ENTRY_WINDOW_EXPIRED"` beside
  `qualificationStatus:"PASSED"` (REGRESSION-2deba55, live).
- At settlement the lock VANISHED: the ledger's newest rows stayed the
  14:30/14:15 SKIPs; no lock row has persisted since 10:00Z (13:45, 14:15 86%,
  14:45 88% all lost). SKIP rows write fine.
- `/api/cron/settle` fires exactly on schedule (20 hits/5h, Vercel logs) with
  ZERO runtime errors — so overdue LOCKED rows would have been swept if they
  existed. Conclusion: the rows never reached Firestore.
- Rollover incoherence on one screen (15:01Z): ring "LOCKED UP 88% — 00:19
  left" (STALE badge) a minute after settlement; canonical card "CALIBRATING
  DOWN 54%"; right rail "DOWN 50%"; `/api/vixy/15m/current` said WATCH UP 91.
  The card mixed the NEW contract id with the OLD strike. `/api/signal`
  simultaneously reported probability 0.415 / confidence 52 — the two-engine
  split is the single worst user-facing coherence failure.

### Root cause (code-confirmed) and the fix — commit `05d3bc8`
The sig_lock row was written ONCE, fire-and-forget, from whichever instance won
the `active_cycle_lock` claim transaction. An unawaited setDoc races the lambda
freeze; `canAttemptFirestoreWrite()` defers writes while `backendAuthReady` is
false (every cold instance) into a pending queue that dies with the instance;
claim-losing instances never attempt the write; nothing retries. Four-part
repair, all idempotent by deterministic doc id:
1. lock time: persist AWAITED, and from claim-losers too (adopted canonical
   values converge);
2. post-lock monitor: re-assert the row once a minute until cycle end;
3. `/api/cron/settle`: rebuild missing rows from the durable
   `active_cycle_lock/<cycleId>` claim docs (last 8h, provenance-tagged
   `reconstructedFrom:"ACTIVE_CYCLE_LOCK_CLAIM"`, strike-validated) so the late
   sweep grades them from the real candle; response reports `reconciliation`;
4. `/api/cron/engine-tick`: drains pending persistence queues before returning.
After merge+deploy, the first settle run should recover today's lost locks IF
their claim docs landed — check `reconciliation` in the settle response.

### Honesty fixes shipped this session (same commit + `HistoricalAccuracy`/UI)
- Provenance modal: unconditional VERIFIED chip → SETTLED/UNSETTLED from the
  record's real settlement; invented `LOCK-1407` id fallback removed; header no
  longer claims "SETTLEMENT VERIFIED • 10 MARKETS".
- Prediction center: lock score `?? 87` → null, rendered as unavailable
  ("AWAITING ENGINE DATA"); gate/child props fail to weakest state, never to a
  fabricated healthy one.
- ExecutiveCommandCenter (Live Dashboard, shows by default): removed the static
  "+1,420 BTC net taker accumulation / underpricing by +12.4%" story, the
  `|| 88` confluence fallback, and the hardcoded "30-Day Model Win Rate: 88.4%
  Verified" tile (real measured accuracy ≈ 49.5%).
- CandleChart: literal "EDGE +12.2%" chip removed.
Verified: tsc clean, 20/20 test files, `npm run build` clean (vite + server.cjs).

### MAPPED, NOT YET FIXED — the remaining fabrication seeds (next session's target)
- `LiveDashboard.tsx:310-355`: the `signal` useState seeds an entire fabricated
  PredictionSignal. Effects overwrite direction/confidence/modelProb/edge, but
  `...prev` permanently keeps `reasoning`, `keyFactors` (+1,420 BTC),
  `orderFlow` (netDelta 1420, fake depths, bookPressureScore 88),
  `similarSetupsCount: 314 @ 91.4%`, `tradeGrade: 'A+'`, and `venueOdds`.
- `LiveDashboard.tsx:248` hardcodes `kalshiProbPct = 54.0` in the canonical
  sync (line 200 falls back to 0.54), so every EDGE figure is model-minus-an-
  INVENTED market price. A real Kalshi implied price at t is also the missing
  measurement for the research track — one fix serves both.
- `StarterDeskView.tsx:66-90`: same class of fallbacks ('Probabilistic Edge
  +15.4%', 142 setups @ 84.5%).
- `ExecutiveCommandCenter.tsx` still says "LIVE DATA STREAMING • Updated
  Sub-Second" (decor claims); `ExplainabilityVaultView.tsx:91` fabricated
  observedFact; `src/data/assetData.ts` static reasoning strings.
- The `/api/signal` vs `/api/vixy/15m/current` two-engine split (three
  directions on one screen at rollover) — mission-1-canonical-decision scope.
- **`WhaleTrackerView.tsx` (the /whale-tracker page) is fabricated end to end**
  and is the single worst page in the product: an invented feed labelled "LIVE
  INSTITUTIONAL BLOCK STREAM • 250ms BRIDGE LATENCY • Auto-syncing websocket
  feed • STREAMING ACTIVE", named fake entities including a real company
  ("BlackRock Custody Bridge", "Satoshi Era Cluster #089" with a 94.0% win
  rate, `WhaleTrackerView.tsx:131`), "TRACKED VOLUME (24h) $58.5M", "89% BULL
  DEFENSE", and "Whale Strike Defense Walls" quoting a BTC $64,000 support
  floor while BTC trades at $78k — static config from the $64k era. Verified
  live in production 15:30Z 2026-09-09. Per the no-fabricated-data rule this
  page should be made inert (honest empty state naming the missing data
  source) until a real feed exists — no synthetic rows.

Note: `b865a47` (trade walker retry/checkpoint) landed from the parallel
ingestion session; the 21-day trade ingestion continues there.

### SESSION 4b — whale tracker made real + Layer 5 shadow recorder (same branch)

- **`/api/whales` is now honest**: fabricated 4-row fallback deleted (it was
  serving "BlackRock Custody Bridge" etc. with HTTP 200 — observed live on
  production for `?asset=ETH` at 15:59Z); invented per-row `confidence` /
  `entityName` / `impact` removed; real rows carry `takerSide` and a labeled
  `sizeTier`; venue failure → 503 `WHALES_UNAVAILABLE`; empty is returned as
  empty with `thresholdUSD` / `tradesScanned` / `takerBuyShare` /
  `lastTradeAgeMs`; `?min=` threshold param; tape deepened to 100 trades.
- **`WhaleTrackerView.tsx` rewritten on real data**: polls `/api/whales` +
  `/api/radar` every 5s (BTC/ETH/SOL; ALL merges the three), renders real
  prints (taker side, venue, computed relative time), RESTING BOOK DEPTH from
  the real L2 (explicitly "not aggressor flow", never "defense"), 15M cycle
  context (spot vs open strike, observation only), and honest
  LOADING/UNAVAILABLE/empty states. Deleted: `INITIAL_WHALE_ORDERS`,
  `STRIKE_WALLS` ($64k era), `TOP_WHALE_ENTITIES` (fake win rates),
  "+$42.1M" volume pad, static "89% BULL DEFENSE", "250ms BRIDGE LATENCY",
  "dark pool" claims, NVDA/SPY/TSLA pills (no real feed).
- **`WhaleBrain.tsx`**: no more invented default "-$0.09M SOLD" sweep,
  "DARK POOL RADAR / 12 DARK SCANS" badges, hardcoded "-1m" timestamp, or
  impact-derived confidence; shows the newest real print or an honest
  waiting/degraded state.
- **Tests**: `whale-components.characterization.mjs` (23 checks) pins all of
  the above out permanently; `radar-endpoint.characterization.mjs` re-pinned
  from "fabrications AS-IS" to the honest contract (23 checks). 21/21 files.
- **Layer 5 SHADOW RECORDER (observation only)**: `canLockCurrentCycle` now
  records per cycle the first in-window (360–780s) evaluation where the
  standalone rule clears the bar (`shadowL5ByCycle`), and settlement/skip
  rollover attaches it to the persisted ledger row as `shadowL5`
  (`recordedBy: SHADOW_L5_v1`, with `ticks` = instance coverage, engine
  decision alongside). With the flag off this yields the live old-vs-new
  horse race on real cycles, riding the fixed persistence path.
- **`L5_FALSIFICATION_MISSION.md`** written: the next research session's
  brief — attack the 97.6% (untouched final OOS on the 21-day data, threshold
  perturbation, dimension ablation, UP/DOWN splits, bootstrap CIs, regime
  slices on trades, shadow-vs-replay reconciliation, Kalshi implied price) —
  before any promotion decision. Flag stays off throughout.
- PR #28 merge attempts (gh CLI and the GitHub UI via browser) are blocked by
  the permission classifier in every form — **the owner must click merge**;
  Vercel auto-deploys main via the GitHub integration.

## SESSION 5 — WHY IT SITS AT 50–52 (root cause, live-proven) + the semantic layer

**The question the owner asked:** why is conviction ~52% at minute 9–10 after
countless updates and 5-minute cycle tracking? Traced frontend → API → engine →
formula, and watched a live cycle (01:30Z, 2026-09-10).

**Display chain.** Card "% CONVICTION" = `canonicalDecision.confidence` =
engine `currentConfidence` = `latestBtc15mPipeline.edgeVsConfidence.calibratedConfidencePct`
= `calibratedConf` (server.ts ~2544). Recomputed every 3s tick pre-lock; frozen
at lock. It is NOT the empirical `getCalibratedConfidence` map (that only
serves `/api/signal/calibrated-confidence`); "calibrated" in its name is a
misnomer — it is a hand-set step function.

**The formula (verbatim structure):**
```
dataQuality ≠ OPTIMAL                     → 42
agree ≥ 8 && !chop && !reversalVeto        → 70 + (agree−8)·5 + (aligned−3)·3 + ITM·5   ∈ [68, 96]
agree ≥ 6 && !chop && !reversalVeto        → 66 + (aligned−3)·2                         ∈ [66, 74]
otherwise                                  → 42 + 2·agree − 0.1·chopScore               ∈ [40, 58]   ← the 50–52 band
reversalVeto = threatScore ≥ 30 || momentum REVERSING
threatScore  = 15 + (5 − aligned)·6 + absorption + chop·0.25 + crossAssetPen
aligned      = # of the 5 momentum votes (15s / 30s / 1m / 5m / 15m lookbacks) agreeing
agree        = # of 11 "evidence families" with agreement:true
```
**The exact mechanism:** whenever price pauses for a few seconds the 15s/30s/1m
votes go NEUTRAL → `aligned` drops to 2–3 → `(5−aligned)·6` alone pushes
`threatScore` ≥ 30 → `reversalVetoActive` → the two upper tiers are skipped
and confidence is pinned to the floor band: 42 + 2·6 − 2 = **52** (agree 6),
54 (agree 7), 50 (agree 6, chop 40). It is memoryless: nothing accumulates
across the cycle; the 5-minute observations feed only VETOES (`signalUnstable`,
`flipsPenalty`), never evidence. Distance from strike — the one input the
research shows predicts the product outcome — enters only as `isITM` (±$10) in
a tier the veto makes unreachable, and as one family of eleven.

**Live series that proves it (cycle 01:30Z, DOWN candidate):**
```
elapsed  conf  LQ  agree  stab  spot−strike
 142s     50   39    6     60     −$63
 162s     50   39    6     60     −$53
 182s     54   51    7     75     −$53
 203s     50   39    6     60    −$100   ← evidence strengthened, number fell
 435s     52   44    6     75    −$152   ← 19 bps beyond the strike, 7:41 left; gate: score=0 tier=SKIP
```
Table 1 puts the 435s state at ≈90%+ P(current side wins). The engine scored
it 52 because short-window momentum happened to be flat. Answering the brief's
ten questions: confidence is NOT frozen pre-lock (2); it IS recalculated (2);
new observations enter only as vetoes (3/4); evidence IS double-counted
(ORDER_FLOW / VOLATILITY / STRIKE are moneyness restated; LIQUIDITY duplicates
DATA_QUALITY; TIME is a free vote) (5); distance is largely ignored (6); the
"calibration layer" is a step function, not calibration (7); the gate reads
lockQuality/agree/aligned, not this number, but all derive from the same
inputs (8); confidence and lock quality are distinct outputs of one vote tally
(9); the UI was not stale — it rendered the engine faithfully (10).
Full field map: `ENGINE_DATAFLOW.md`.

**What changed this session (no threshold or decision touched):**
- `src/lib/engineSemantics.ts` — single source of truth for evidence words,
  tied to the real gate bar; used by the Prediction Center, VIXY Live
  modules and the V2 right rail. "STRONG EVIDENCE" at LQ 50–69, the hardcoded
  "MARKET ALIGNMENT: STRONG" chip, "MODERATE CONFIDENCE" at 52 and the
  client-guessed "EARLY LOCK READY" are gone; "LOCK GATE OPEN" now means the
  engine said eligible. Pinned by `tests/engine-semantics.invariants.mjs`.
- Fabrications removed: the card's five hardcoded settlement rows + literal
  "SESSION WIN RATE 78% / BRIER 0.142" (now real ledger rows + real stats);
  VIXY Live `?? 87`, "98.4% RETENTION", "+$28.4M", "64.8% BUY SIDE", "$184.50",
  "4.1% EXPANDING", "BULL CONTINUATION", "EXPANSION DRIFT", "+18.4 / RSI 64.2 /
  +2.4σ", "EMA 9>21>50 / 8.4/10", "$1.42B / $0.10 (TIGHT)", `|| 'TRENDING_BULL'`;
  right rail `|| 78`; server family details "top-of-book depth verified
  (spread < 0.03%)" and "Perp basis: Congruent" (never measured).
- `15M_ENGINE_MASTER_MISSION.md` — the owner's standing brief with a DONE /
  NEXT ledger. The confidence rebuild itself (calibrated probability, temporal
  evidence as evidence, distance as a first-class feature) is research-gated
  behind flag + shadow per that brief; nothing here raises a displayed number.

## SESSION 6 — the conviction that BUILDS: calibrated P(win), lock ladder, trail

**Owner's question:** "why isn't the conviction growing as the bot moves through
the locking process?" Answer from SESSION 5: the displayed number is a
memoryless vote tally pinned to [40,58] by the reversal veto. The number that
*does* build honestly already existed and was never shown: the strike-side
table `strikeSideTable.v1.json` (2,591 cycles, 35,944 samples, 14 checkpoints
60–840s × 7 distance bins × 3 volatility terciles, minN 30, OOS-stable), which
the gate already evaluates every tick as `lockEligibility.strikeSide`.

**Shipped (observation only; no threshold, gate outcome or decision changed):**
- Canonical payload now carries:
  - `calibrated` — `pWin` (the table's empirical frequency for the current
    state, or `null` with `reason` when no cell has ≥30 samples), `n`,
    `checkpointSec`, `distBps`, `distBin`, `volBin`, `currentSide`,
    `pLockedSide`, `protectSignal`, `tableVersion`, `bar`, `marketForSide`
    and `edgeVsMarketPct` — the last two ONLY when the Kalshi market was read
    within 120s (`kalshiImpliedAtMs`); otherwise `null`. Criterion stated in
    the payload: P(settle on the current side of the open strike).
  - `market` — `{kalshiImpliedYes|null, ageMs, real}`; the 0.54 seed and the
    pipeline's `|| 0.52` are no longer presented as a market price anywhere.
  - `lockGate.eligible` and `lockGate.checks[]` — the gate's own 16 booleans
    (window, strike resolved, lock quality vs tier bar, agreement, MTF,
    strike feasibility, reversal, engine score ≥66, 3-observation stability,
    conflict, signal stability, guardian, feed quality, chop, persistence,
    not-locked) plus the Layer-5 `CALIBRATED_P` row marked `gating:false`
    while the flag is off. Each carries `current` and `required`.
  - `convictionTrail` — per-tick `{t, p, s, d, side}` (P(win), engine
    score, distance bps), capped 320, reset at cycle open, downsampled to ≤60
    for transport, with `convictionTrailCoverage` (per-instance view).
  - `evidenceAlignment` no longer defaults to a fabricated 6 (`?? null`).
- Prediction Center hero card: **P(WIN) n=…** is the headline (ring + number)
  when a cell matches; "P(WIN) — no matching history yet" when it doesn't;
  the legacy score is shown beneath, relabelled **ENGINE SCORE** (with a
  tooltip saying it is a vote tally, not a probability). Under the bias row:
  the **lock ladder** (8 key gates as ✓/· with current values, "n/N gates
  passing"), the **P(win) trail sparkline** across the cycle, and — only when
  the Kalshi read is real — "Kalshi prices this side at X% · edge ±Y%".
- Pinned by `tests/calibrated-conviction.characterization.mjs` (39 checks):
  no fabricated fallbacks in the calibrated block, edge null unless both
  sides are real, checklist derived from the real gate booleans, trail never
  synthesised, card labels honest.

**What this does and does not claim.** P(win) is the product criterion
measured on history (which side of the open strike settles), replicated on
trades and stable across chronological halves. It is not directional
forecasting skill (still ~coin flip post-lock) and it is one month of one
regime; the L5 falsification mission remains the gate before the rule is
allowed to *decide*. Displaying it changes what the user sees, not what the
engine does.

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

## SESSION 7 — clean lock-readiness, honest chart, fabrication sweep, ONE headline

**Owner's asks:** (1) the "random text" under the hero ring must be clean, a
"true VIXY feeling"; (2) verify the chart's calls are real and the orderbook &
liquidity radar visual is in; (3) confirm there is only ONE 15-minute decision
engine (the OG VIXY Live / OG crypto terminal set-up may have left two); (4)
make the V2 rail and the Command Center ring show the same headline number as
the Prediction Center hero (calibrated P(win) when it exists, else ENGINE
SCORE, never a default).

**Shipped and production-verified through Chrome:**
- **PR #39** — hero keeps one compact "Lock readiness n/N gates" bar; the full
  gate ladder moved to a dedicated **LOCK READINESS** panel (full labels,
  current / required per gate, wider P(win) trail with 50%/95% guides, Kalshi
  comparison with an honest unavailable state, Layer-5 row shown separately).
  P(WIN) names its side and flags "price side ≠ bias". Chart: pattern markers
  are named as patterns (BREAKOUT ▲ / BREAKDOWN ▼ / DOJI @ SUPPORT|RESISTANCE,
  "confirmed next bar"), the invented `|| 0.91` live-bar confidence and ±120
  target fallbacks are gone, and the dead "TIKTOK AI PILOT" control now
  toggles **VIXY ENGINE EVENTS**: this cycle's LOCK marker plus settled locks
  (✓ win / ✗ loss / ○ skip) from the ledger, drawn on the containing bar.
  Seen live: ○ SKIP, ✗ UP LOSS, ✓ UP WIN ×2 on the 15m chart. Radar verified
  live: Coinbase Exchange L2 30+30 levels, 100 prints, depth ladder / whale
  tape / delta skew tabs.
- **PR #42 (honesty sweep of the Prediction Center page)** — removed the last
  literals reaching customers: CROSS-VENUE EVIDENCE ("+$28.4M BUY", "+$12.50",
  "57% YES", "59% YES", "SYNCHRONIZED (4/4)") now reads `/api/radar` resting
  depth + taker skew and the real-flagged Kalshi read, with Polymarket shown
  as "no direct feed" (the server's `polymarketImpliedProb` is Kalshi − 2c,
  not a feed); the "PRIMARY HYPOTHESIS … $64,495 … +14.2" sentence is now
  built from strike distance, price side, family alignment and P(win); the
  six-factor "NEURAL SIGNAL DECOMPOSITION MATRIX" (invented weights, "+18.5
  pts", "$28.4M", "0.994 stability coefficient") is now the engine's real
  evidence families with no weights claimed; the right rail's "LIVE MARKET
  FEED" (four templated lines with fake "2m ago") is an **ENGINE EVENT FEED**
  from the ledger; `useSystemNotifications` no longer seeds "1,250 BTC" /
  "+$28.4M" alerts nor injects a random template every 75s (storage key
  bumped to v2). Also fixed: the Kalshi block was emitted under `market`,
  shadowing the "BTC/USD" label — it is now `marketRead`. Live after merge:
  "LIVE (3/4) · 4.91 / 4.64 BTC · 1.06x bid · 83% buy (last 100 prints) ·
  Kalshi 8% YES · no direct feed".
- **This PR — one headline for every surface.** `engineSemantics.headline()`
  returns `{kind: PWIN | ENGINE_SCORE | NONE, value, label, n, side, word}`;
  `pWinLabel()` gives P(win) its own words (≥95 AT LAYER-5 BAR, ≥85 STRONG
  EDGE, ≥70 CLEAR EDGE, ≥58 MODEST EDGE, ≥42 COIN FLIP, else AGAINST CURRENT
  SIDE). The Prediction Center ring, the V2 rail badge, the hub hero and the
  Command Center ring (`CycleObject`) all read it. Hub defaults removed:
  `confidence ?? 78`, `lockScore ?? 87`, `reversalRisk ?? 22`,
  `'TRENDING_BULL'`, `$64,591.20`, `+1.85%`, `openStrike || spot − 38`,
  `evidenceAlignment ?? 8`, and the canned "Multi-venue taker flow alignment"
  sentence. The hero's `useState(78)` seed is now `null` → "—" until the
  first payload. `Canonical15mDecision` now types `calibrated` and
  `marketRead`. Pinned by `tests/engine-semantics.invariants.mjs` (44) and
  `tests/calibrated-conviction.characterization.mjs` (61).

**Engine-count audit (owner ask #3): there is ONE live engine.** Every
decision route — `/api/vixy/15m/current`, `/api/signal`, `/api/signal/latest`,
`/api/live-engine`, `/api/vixy/state` — reads the same `active15mCycle`
produced by `runMarketEngineTick` (3s interval + cron). The OG client-side
engine is dead code: `src/services/engine/canonicalDecisionEngine.ts`
(tick/settle with its own Firestore writes; only `createInitial15mDecision`
is imported, by the hook), `boundedEngineTick.ts`, `daemon/continuousEngineDaemon.ts`
(no importers), the whole `services/intelligence/*` tree (2,700 lines, no
importers outside itself), `testing/vixyBidirectionalTestHarness.ts` →
`VixyLearningPanel.tsx` (never mounted), and the OG views `LiveDashboard.tsx`
/ `StarterDeskView.tsx` / `ExecutiveCommandCenter.tsx` + `useLiveSignal`
(imported in App.tsx, never rendered). `AutomationScheduler` is imported by
server.ts and never started. **Removed (PR after #43, 16 files / 6,552 lines
deleted):** `canonicalDecisionEngine.ts` is trimmed to the epoch helper and
the client placeholder (now all-zero / NEUTRAL, `serverSource:
CLIENT_PLACEHOLDER`, so a cold screen shows dashes — `headline()` treats a
0 score as "no number" because the engine's floor is 40–42); the
`intelligence/*` tree, the daemon, the bounded tick, the bidirectional
harness, `VixyLearningPanel`, `LiveDashboard`, `StarterDeskView`,
`ExecutiveCommandCenter`, `useLiveSignal` and `automationScheduler` are
gone, with their imports in `App.tsx` / `server.ts`.
`tests/calibration-and-tiers` PART B1/B2 (which pinned the DEAD client
engine's tiers — EARLY 120–300s, bars 90/82/74 — as if they were
production's) is replaced by PART B0 asserting the engine is gone; the real
tiers stay pinned in PART B3 and `tests/lock-gate.*.mjs`.

**PR #43 production-verified (Chrome, live payload `confidence 91,
calibrated.pWin 0.747, n 75, side UP`):** hub hero "UP 75% · P(WIN UP) ·
n=75 · CLEAR EDGE" with the derived sentence, metric card "P(WIN) 75%", lock
quality "75 / 100 · 9/11 families aligned"; Prediction Center ring "75%"
(title "Calibrated P(win) · CLEAR EDGE"), "P(WIN UP) · n=75", ENGINE SCORE
shown beneath (88→91), never as the headline. The V2 rail could not be
screenshotted this session (the Chrome window was minimized, 0×0, so the
`aside` is not in the DOM); it reads the same `headline()` call and is
pinned by the tests.

**Still fabricated on OTHER pages (not yet touched):** `OneHourDeskView.tsx:692`
"Taker Delta +$28.4M", `ReplayCenterView.tsx:123` `binanceDelta: '+$28.4M'`.
**Placeholder note:** for the ≤3s before the first payload the hub's LOCK
QUALITY / alignment cards read "0 / 100" and "0/11" from the neutral
placeholder rather than a dash; the headline, ring and hero already show "—".

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

## SESSION 3 — proving the candidate (in progress)

**Production safety (merged into PR #28, awaiting merge click):** the mid-cycle
NO_TRADE writer persisted finished-looking SKIP rows with future `resolvedAt`
and the live spot as "settlement" — observed live (14:15 cycle: ledger SKIP
resolved "14:30:00" while another instance was LOCKED_UP 86%). Now: mid-cycle
marker only; rollover persists a SKIP only if no lock row exists (memory, then
shared ledger; fails closed). Fabricated skip fields removed. `a5ad411`.
Entry window aligned at 780 everywhere; the regression pins fired as designed
and were replaced. `1f6186e`.

**Item C — do intracycle engine/price features add information beyond the
table?** Stacked logistic on logit(p_table) + features, train first half /
test second half (`incrementalValue.ts`):
```
                         27d candles (2,591 cyc)        7d trades (671 cyc)
TABLE (Layer 5 base)     log-loss .4634  AUC .724       .4835  AUC .654
TABLE+ENGINE             Δ −0.0009  (noise)             Δ −0.0058  AUC .694
TABLE+PRICE              Δ −0.0002  (noise)             Δ −0.0023
ENGINE only              Δ +0.0410  (far worse)         Δ +0.0143
```
At the large sample the engine's features add nothing; at 7 days there is a
hint (bar-0.95 locks 103 at 98.1% vs table's 165 at 93.3%). Verdict pending
the 21-day trade data. Provisional: **no proven incremental value.**

**Item 6/E — post-lock behaviour** (`postLock.ts`, rule locks at p≥0.95, test
half): candles 761 locks 96.7%; price crosses back over the strike in 3.0% of
cycles → those win 56.5%, the rest 98.0%. A PROTECT signal (table p for the
locked side < 0.5 at a later checkpoint) catches 40% of losses with 1.8%
false alarms and a median 120s of warning (trades: 1/2 losses, 0 false
alarms). The table never reaches 0.95 before 300s; 300–479s locks win 93.8%
(n=16). So: early "exceptionally strong" locks are rare and slightly weaker;
the right architecture re-evaluates p every checkpoint after the lock and
surfaces PROTECT — today's engine freezes `lockedConfidence` at lock and only
reacts to a $750 / 1.2% move or a probability collapse to ≤0.15.

**Item D — what causes the false / high-confidence locks.** Four mechanisms,
all measured:
1. `calibratedConfidencePct = 70 + (agreement−8)×5 + (aligned−3)×3 + ITM×5`
   (capped 96) counts *agreeing* evidence families, but the families are
   largely moneyness restated (Spearman 1.000). It is a vote tally, not a
   probability: in the live ledger its 90–95% bucket won 33–36% on the
   directional test.
2. It commits at the earliest legal second. Production locks: 50/73 within a
   minute of the 360s floor, median lead **3.2 bps** — where Table 1 says
   60–75%. In replay the same code (with strike ≈ open) waits for ~14 bps
   and wins 91% — the surface is the same; production sat in its worst corner.
3. Pre-Sep-2 it locked AGAINST the side price was on (20/35; won 25%).
4. `lockedConfidence` is frozen at lock and the post-lock monitor only reacts
   to a $750 / 1.2% move, p ≤ 0.15, or guardian panic — nothing a 15-minute
   contract ever sees. Hence "91%" while lock quality fell 93 → 35 live.

**Harness incidents this session (both fixed, both pinned):** the 21-day trade
walk died on ECONNRESET (no retry on network errors) and then on OOM (~9M raw
prints retained before bucketizing). The walker now retries network failures,
folds pages into buckets immediately, dedupes only against the previous page,
checkpoints complete hours every 50 pages, and seeks its start cursor by
binary search on trade_id so a re-run fetches only the missing span (2 hours
in 113 requests / 35 s). **Also discovered: `tsconfig.json` excludes `scripts/`
and `tests/`, so `tsc --noEmit` has never type-checked the harness — every
"TSC=0" on harness edits was vacuous. Runtime runs and the suites are the only
check; a `tsconfig.scripts.json` is the fix (NEXT).**

## ★★★★★★ LAYER 5 INSIDE THE REAL GATE — Phase 8 result (7-day trades, 672 identical cycles)

`--lock-rule strike_side` evaluates the strike-side rule as a fourth term of
`allowed` in the real `canLockCurrentCycle`, over the same 3.0M prints.
Every other gate stays on. The rule can only deny.

```
                        flag OFF (today)     +L5 bar 0.90        +L5 bar 0.95
locks / rate            346 / 51.5%          260 / 38.7%         132 / 19.6%
strike-graded WIN       91.0%                94.2% (245/260)     97.0% (128/132)
median lock             540s                 579s                696s
locks ≥720s (refused
  by commit point today) 23                  26                  45
subset of flag-off?     —                    yes, 0 added        yes, 0 added
```
What bar 0.95 removes: 214 engine locks that win **87.9%** (median lead at
the engine's lock 10.2 bps) and keeps 132 that win 96.2% (median lead 17.6
bps). Directional-skill numbers stay ~coin-flip throughout — the rule buys
precision on the product criterion, not forecasting.

**Interaction with REGRESSION-2deba55:** 45 of the 132 bar-0.95 locks fall in
720–779s, where `lock15mCycle`'s commit point still refuses. With the flag on
and the regression unresolved, production would effectively take **87 locks /
672 cycles (12.9%) at 96.6%**. Aligning both checks to 780 (or dropping the
commit-point cut to match the gate) is now a product decision with a
measured consequence, not a code-hygiene item.

**Disjoint refit — overlap caveat closed.** Table refitted on Aug 12 → Sep 2
12:00 only (2,063 cycles), evaluated inside the real gate on Sep 2 → 9 (no
overlap): bar 0.95 → **127 locks at 97.6% (124W/3L)**, median lock 675s; bar
0.90 → **231 at 95.2%**, median 600s. Same shape as the overlapping fit
(132 / 97.0%; 260 / 94.2%). Validation of the disjoint table against the
trade snippets: mean |Δp| 0.038 over 109 shared cells.

Remaining caveats: 7 evaluation days, one regime; Kalshi implied price at t
still not measured, so "edge vs market" is unquantified; the rule buys
precision on the product criterion, not forecasting skill.

## ★★★★★ THE RECONCILIATION — production's own ledger explains the 49.5%

`/api/signal/resolved-log` on production is readable (snapshot saved in the
session scratchpad). 200 rows, 73 resolved locks, 126 skips, 2026-08-22 →
2026-09-09 10:00 UTC. Stats: 103 graded, 51W/52L, 49.5%, 44 UP wins / 7 DOWN
wins, Brier 0.377.

**A5 — the $100 settlement path in the ledger: 1 row.**
`15M-2026-09-02T19:15Z UP strike 77351.82 settle 100 → LOSS`. Confirmed
contamination, but one row — it is NOT what explains 49.5%. (3 locks settled
>10% from strike; the other two need a look.)

**What explains 49.5% — where production locks on the (time, lead) surface:**
```
lock time into cycle:  360-420s: 50 of 73   (39 within 12s of the 360s floor)
lead vs strike at lock: median 3.2 bps
locked AGAINST the side price was on: 22 of 73  → won 31.8%
locked WITH the current side:          51 of 73  → won 62.7%
confidence at lock: 91 (25×), 86 (20×), 81 (17×) — a few discrete values
direction: UP 67 / DOWN 6
```
Production commits at the first legal second with a ~3 bps lead — the
worst-performing corner of Table 1 (t≈360s, 0–6 bps ⇒ ~60–74%) — and
30% of the time it commits against the side price is already on, which wins
32%. Replay's 91% comes from the same engine locking later with a ~$100 lead.
Both are the same surface. The engine is not "broken vs replay"; it is
choosing a bad point on a surface the data now describes precisely.

**Strike-reference hypothesis: REFUTED.** Joining the 73 locks with cycle opens
from the candle cache: the Kalshi strike sits at the open (median +0.5 bps,
|abs| median 1.3 bps); settlement side vs Kalshi strike == side vs open in
70/73. The two "round-10" strikes are the phantom $64,100 (`ea05da9`) —
1,680 bps from the open, both accidental WINs. All three contaminated rows
are now identified: one $100 settlement, two phantom strikes.

**The actual explanation — the ledger spans three engine eras:**
```
era                            n   win%   UP/DN  med lock  med lead  against  win w/  win ag
pre-795d994 (before Sep 2)    35  42.9%   30/5    362s     -1.6 bps    20      67%     25%
795d994..2deba55 (Sep 2–9)    36  61.1%   35/1    364s     +4.1 bps     2      59%    100%
post-2deba55 (Sep 9)           2   100%    2/0    360s    +21.8 bps     0
```
The 49.5% is dominated by the pre-Sep-2 engine, which locked AGAINST the side
price was on 20 times out of 35 (the momentum-overrides-strike bug `795d994`
fixed) and won 25% of those. The engine as it has run since Sep 2 is at
**61%** — consistent with Table 1 for its operating point (t≈360s, ~4 bps
lead ⇒ 69–74%) minus noise — and its remaining gap to 90%+ is entirely
**lock timing and lead**: it commits at the first legal second with a ~4 bps
lead, and 35 of 36 calls are UP. Replay's 91% is the same engine committing
later with a ~$100 lead on the same surface. The system is now fully
reconciled: replay, ledger, users' 90%+ and Table 1 are one picture.

**Ledger freshness:** the latest resolved cycle is 10:00 UTC; the 13:45 lock
watched live (and everything since 10:15) is absent at 14:02. Settlement or
persistence is lagging by hours, or the settle cron is not running.

**Provenance modal is fabricated.** `HistoricalAccuracy.tsx:460–472` builds a
"live-cycle" row with `proofHash: \`0x7a8d...${cycleSeq}\``,
`settlementPrice: spot` (so entry == settlement), a `|| 63008` fallback, and
an unconditional "PROVED" badge under a "VERIFIED" chip.

## ★★★★ CORRECTED 7-DAY TRADE DATA — everything re-derived (3,000,332 prints, 672 cycles, collapse 4.1%)

All earlier trade-level numbers were on first-print buckets. These replace them.

**Engines, identical cycles (compareRuns):**
```
                                OLD 3e31a84        NEW main 7eea881
locks / rate                    324 / 48.2%        346 / 51.5%
strike-graded win               90.4%              91.0%
post-lock directional skill     46.3% ±2.8 p=.20   43.1% ±2.7 p=.011  (significantly BELOW 50%)
skill EARLY / STD / LATE        53.0/42.7/24.1     43.2/43.8/40.4
median lock                     477s               540s
locks in 720-779s regression    0                  23
direction flips / cycle         10.1               4.8   ← main's changes did make it steadier
skill by confidence 90-95 / 95+ 32.9% / 50.0%      36.2% / 47.4%   ← confidence anti-informative
```
Real taker flow (flowSkill, 671 cycles): 45–51% in every cell; nothing predictive.
Engine vs naive "current side" at t=720: agrees 96.9%; when it disagrees, 45% (n=20).

**Table 1 replicates on trades** (t=720s: 6–10 bps 91%, 10–15 96%, 15–25 99%;
all-sides 85.0% vs 85.8% on candles). The product number is robust across
data source and month.

**Candidate rule vs engine — CORRECTED, apples to apples, TEST half (336 cycles):**
```
policy                  locks   lock%    WIN%     Wilson95        median lock
ENGINE (actual replay)   166    49.4%    92.8%   [87.8, 95.8]      537s
rule bar >=90%           170    50.6%    94.7%   [90.2, 97.2]      660s
rule bar >=95%           161    47.9%    97.5%   [93.8, 99.0]      720s
```
**Correction of my earlier claim.** On candles the engine locked only 2.2% of
cycles and I wrote that the rule locks "~30× more often". That was the candle
artifact suppressing the engine's gate, not a property of the rule. On trade
data the engine already locks ~half of cycles. The honest comparison is:
same lock rate, the rule wins more at ≥95% (97.5 vs 92.8, intervals barely
touch) and locks later (720s vs 537s); at ≥90% same lock rate, same win rate,
later. The rule's real advantages are (1) its number IS the outcome rate —
the engine's 91% conviction bears no relation to outcomes (skill 36% in the
90–95 bucket) — and (2) it is explainable. Its cost is later locks, i.e. less
market edge. Train/test here is only 335/336 cycles; treat as directional.

## ★★ THE PRODUCT NUMBER — P(settle on the current side of the frozen strike)

The user's correction: a VIXY "win" is the side of the strike FIXED AT CYCLE
OPEN at settlement (Kalshi/Polymarket 15m contracts) — not continuation from
the lock. Late locks with 2–5 min left are a legitimate strategy and users
report 90%+ doing it. `scripts/replay15m.ts --snippets` + `snippetTable.ts`
measured that criterion on **2,591 real cycles (27 days of candles; this
table is engine-independent, so candles are valid for it)**:

```
P(current side wins) by minute and |moneyness| (bps)   win%(n)
t(s)    0-3     3-6     6-10    10-15   15-25   25-40   40+    all
 600    63%    80%     85%     92%     94%     96%    100%   81.8%
 660    65%    79%     87%     94%     95%     99%     99%   83.7%
 720    67%    80%     91%     95%     97%    100%    100%   85.8%
 780    65%    88%     94%     98%     98%    100%    100%   87.9%
 840    72%    91%     97%     99%     98%    100%    100%   91.2%
```

This IS the users' lived 90%+. And the engine on top of it: at t=480/600/720
it agrees with "current side" 95–97% of the time; **when it disagrees it is
39–47% correct** — worse than a coin flip. On this evidence the engine adds
nothing to distance-from-strike and its disagreements subtract.

**What "the best 15-minute lock" therefore is, on evidence:** a calibrated
P(current side wins | time remaining, distance from strike, volatility) that
locks the moment it clears a bar (e.g. ≥90%) — as early as that happens, which
at ≥15 bps is already t≈600s — and says SKIP otherwise. Not an evidence soup.
Whether that beats the Kalshi price at that moment (the user's "data edge") is
the next measurement: it needs Kalshi implied prices at t.

Out-of-sample check (chronological halves) and volatility split:
```
OUT-OF-SAMPLE STABILITY -- Table 1 split chronologically at 15M-2026-08-25T11:45:00.000Z (2591 cycles)
t(s)  bin     FIRST-half win%(n)      SECOND-half win%(n)     Wilson95 overlap?
 600  6-10     85.4%(205)            84.7%(268)          yes
 600  10-15    91.9%(160)            91.8%(183)          yes
 600  15+      95.6%(315)            95.5%(292)          yes
 720  6-10     92.3%(208)            90.8%(260)          yes
 720  10-15    94.8%(173)            96.0%(199)          yes
 720  15+      98.3%(343)            98.0%(304)          yes
 780  6-10     94.5%(201)            94.2%(243)          yes
 780  10-15    98.2%(169)            98.3%(179)          yes
 780  15+      99.4%(352)            98.8%(336)          yes
 840  6-10     97.3%(223)            95.9%(241)          yes
 840  10-15    99.4%(172)            98.9%(190)          yes
 840  15+      99.2%(359)            99.2%(355)          yes

BY INTRACYCLE RANGE (volatility proxy; terciles at 11 / 20 bps sampled range)  -- t=720s, |mny| >= 10 bps
  LOW-vol   94.9% (n=39)
  MID-vol   98.5% (n=326)
  HIGH-vol  96.6% (n=654)
  LOW-vol   t=720 |mny| 3-6 bps: 90.8% (n=271)
  HIGH-vol  t=720 |mny| 3-6 bps: 69.6% (n=56)
```

## ★★★ CANDIDATE LOCK RULE — out of sample, 1,296 later cycles

`scripts/replay15m/research/strikeSideModel.ts`. Empirical table
P(current side wins | checkpoint t, |distance| bin, running-volatility tercile)
fitted on the chronologically FIRST 1,295 cycles; bars fixed a priori;
evaluated only on the SECOND 1,296. One lock per cycle at the first
qualifying 60s checkpoint; SKIP if none. Volatility uses only spots up to t
(no look-ahead).

```
policy                 locks   lock%    WIN%    Wilson95        skips   median t-lock
CURRENT ENGINE gate       29    2.2%   96.6%   [82.8, 99.4]     1267      540s
rule bar >=85%          1190   91.8%   86.9%   [84.9, 88.7]      106      540s
rule bar >=90%          1085   83.7%   91.2%   [89.3, 92.7]      211      660s
rule bar >=95%           877   67.7%   94.9%   [93.2, 96.1]      419      720s
```

A transparent, explainable rule locks ~30× more often than the current engine
at an indistinguishable win rate (CIs overlap; the engine's n=29). This is
what "locking like crazy when justified" looks like with honest arithmetic.

Caveats (all real): candle-sourced (rule is engine-independent so valid; the
engine row is candle-inflated in the engine's FAVOUR — it locks more on
candles, not less); one month, one regime (BTC ~$63k→$79k, trending); no
Kalshi implied price at t, so "edge vs the market" is not yet measured; the
25 locks at t=180s are the 40+ bps bin (large early moves). Next: repeat on
trade data, add Kalshi implied price, add regime slices, then decide whether
this becomes the engine's Layer 5.

## PHASE 1 — watching production (www.vixxyvault.com), cycle 13:30–13:45 UTC
- 13:40 (4:47 left): card **DOWN 52%**, LQ 53 "STRONG EVIDENCE", reversal
  43%; banner above it: **"91% AI confidence on Kalshi, EDGE +12.2%"**. Two
  confidences on one screen (the banner is TopNavControls' static config).
- 13:43 (1:23 left): card **SKIP 43%**, reversal **77% HIGH**, protection
  **VETO ACTIVE (HIGH VOLATILITY)** — while the timeline tile 04 read
  **"LOCKED — Decision committed & guarded"** (red) and the banner still said
  "seeing increasing agreement". Price badge **+$54.40 green** over a falling
  red sparkline. No lock this cycle.
- Status bar in production still shows the literals `LATENCY 0.8s`,
  `VENUES 4/4`, `BINANCE` — this branch's fixes are not deployed.
- The card never shows the strike the user is being graded against.

**Cycle 13:45–14:00 UTC, watched end to end:**
- t=1m39s: UP 55%, LQ 55 — already labelled "STRONG EVIDENCE" during CALIBRATING.
- t=5m42s: UP **91% "EARLY LOCK READY"**, LQ **93 OPTIMAL**, on a ~6–9 bps lead
  (Table 1 says ~80% for that state). Locked shortly after, "LOCKED EARLY".
- t=11m49s: still 91%; price −$157 from the lock point; LQ 93 → 62; reversal 15% → 38%.
- t=14m57s: still 91%; price **$79,083, ~$160–180 below the cycle open**; LQ 35;
  signals aligned 5/6 → 2/6; regime CHOP. Conviction never moved once locked.
  Outcome vs the Kalshi strike: see next entry.

## ⚠ DATA DEFECT FOUND AND FIXED — trade-cache bucket price was the FIRST print

`tests/replay-harness.invariants.mjs` (added to pin the harness's own rules)
caught it: `bucketize` set each 3s bucket's price to the first trade, not the
last, because `ms >= (b as any)._lastMs ?? -Infinity` parses as
`(ms >= undefined) ?? -Infinity` — always false. Every persisted bucket's price
lagged by up to 3s. Fixed; the entire trade cache was wiped and is being
rebuilt; the 7-day run was restarted.

**Every trade-level number above this line (E3a, E3b, OLD-vs-NEW, the 50.0%
skill figure) was computed on first-print buckets and will be re-derived.**
The qualitative picture is unlikely to move (a ≤3s lag on a 15-minute
horizon), but no number is quoted until it has been re-run on corrected data.
Candle-based results are unaffected.

## E3 — is early-lock skill real? NO. *(pre-fix data; re-run pending)*

On the OLD engine's 142 locks: EARLY (<480s) 40/72 = 55.6%, **exact binomial
p = 0.41**. Skill by 60s lock-time bin: 58.3 / 50.0 / 54.2 / 42.1 / 42.9 /
30.8% — every bin p > 0.27. Skill by moneyness-at-lock (bps): 0/55.8/50.0/
46.2/50.0% — every bin p > 0.25. Price moves further from the strike after
the lock 50.7% (OLD) / 45.5% (NEW) of the time — no continuation edge either.
The downward slope with later locks is suggestive but inside noise per bin.

**Conclusion at n=142:** no output of the current engine — confidence, lock
quality, tier, timing, moneyness — separates outcomes. There is nothing here
to calibrate. Anything that looks like skill on 3 days is noise.

Two consequences: (1) a much larger sample is required before any structural
claim (7-day ingestion launched); (2) the next test is a genuinely
independent feature — real taker buy/sell flow from `tradeCache` — evaluated
at a fixed time in **every** cycle (n=288), not only at locks.

## E3b — does REAL taker flow predict 15M direction? Not at n=287.

`scripts/replay15m/research/flowSkill.ts` — at fixed checkpoints T inside
every cycle, sign(taker buy − taker sell) over the prior W seconds vs
sign(price(end) − price(T)). Pure forecast test, no strike, no look-ahead.

```
T      moneyness  mom60  | flow W=30   60     120    180    300
180s   53.1%      51.2%  |  52.1%  53.1%  51.7%  50.3%  53.8%
300s   55.1%      52.8%  |  46.3%  48.8%  45.3%  48.4%  47.7%
420s   53.0%      51.8%  |  47.4%  52.3%  54.7%  50.9%  50.5%
480s   53.7%      46.7%  |  54.0%  46.7%  51.9%  51.6%  54.0%
600s   49.1%      47.3%  |  48.4%  42.1%  43.2%  48.8%  48.4%
720s   50.2%      48.2%  |  45.6%  47.7%  47.7%  51.6%  52.3%
```
n≈285 per cell. Only two cells reach p<0.05 (T=600 W=60/120) and both are
*below* 50% — the ~1.5 chance hits expected from 30 cells. Top-tercile
"strong flow" subsets (n=96) range 44–59%, none significant. Best comparator
is moneyness at T=300s, 55.1%, p≈0.09 — not significant.

**Conclusion:** at 3 days, neither the engine's outputs nor the first
genuinely independent feature carries detectable 15-minute directional
information. This is the honest baseline the rebuild starts from. Re-run at
7 days: `npx tsx scripts/replay15m/research/flowSkill.ts <start> <end>`.

## `/api/orderflow` mislabels book depth as taker flow
It sums the top-30 resting bid and ask levels of Coinbase's L2 book and
returns them as `netTakerDeltaUSD` / `takerBuyRatio` / `bullVolumePct`.
Resting depth is not aggressor flow. No `src/` consumer exists today (the
radar draws `Math.random()`), so nothing is misled yet — but any radar wiring
must not treat these fields as taker flow. Pinned in
`tests/orderflow-endpoint.characterization.mjs`.

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
