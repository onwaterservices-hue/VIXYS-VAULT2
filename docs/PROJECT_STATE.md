# Project state

**Baseline: `main` = `05ab8fb`, deployed to production and verified 2026-09-02.**

This document separates what has been **observed** from what is **still open**.
Nothing below is inferred from a commit message or a code comment alone.

Evidence tags: `[prod]` observed on www.vixxyvault.com · `[preview]` observed on a
Vercel preview · `[local]` observed in a local run of the real build ·
`[code]` read from source, not executed.

---

# PART 1 — VERIFIED FACTS

Each of these was observed against a running system on 2026-09-02.

## The engine runs on schedule

**`/api/cron/engine-tick` is live and returns 200.** `[prod]`

It previously did not exist. `vercel.json` had scheduled it every minute since the
crons were introduced, and production returned **404** on every invocation, so the
15M engine ran only from the module-scope `setInterval(runMarketEngineTickTracked,
3000)` — which lives exactly as long as a warm lambda does.

A single-flight guard was added at the same time: the interval and the cron are
two independent drivers, and a tick slower than its caller's cadence could
otherwise interleave while mutating `active15mCycle` and running settlement.
Verified under load `[local]`: 8 concurrent invocations, all succeeded, **7
coalesced**, all reporting the same `totalRuns` — one tick executed, not eight.
Sequential calls each advance, so the guard releases and a failed tick cannot
wedge the engine.

## Lock qualification is unchanged

**The 66% minimum confidence gate and its companion checks were not weakened.**
`[local]` `[prod]`

Observed in both directions: the engine declined to lock at 55–56% confidence, and
qualified at 91%. No threshold was touched by any change.

## Discord routes are live

`[prod]` after the merge:

| Endpoint | Before | Now |
|---|---|---|
| `/api/discord/bot-status` | 404 | **200** |
| `/api/discord/diagnostics` | 404 | **200** |
| `/api/discord/test-broadcast` | 404 | **401** (OWNER/ADMIN gated) |
| `/api/discord/connect` · `/user-profile` · `/status` | 401 | **401** — gates intact |

`bot-status` now reports the bot's real state (`isReady: false`, `mode:
WEBHOOK_FALLBACK`, `guildCount: 0`, `ping: 0`). It previously answered a 404 with
a hardcoded `isReady: true, pingMs: 14, guildCount: 1, totalAlertsDispatched: 12`,
so a dead bot and a healthy one rendered identically.

## The backend is authoritative for Discord linking

`[prod]` `[local]`

`isLinked` previously ORed `settings.discordLinked` — a localStorage value — into
the answer. Observed directly: `/api/discord/user-profile` returned **HTTP 500
`PROFILE_LOOKUP_FAILED`** while the panel rendered "1. LINKED ✓ — Discord Identity
Connected (@@vixyvault_owner)", a username the server had never returned in that
response.

Link state is now read only from the backend, with three states rather than two:
connected / not connected / **STATUS UNAVAILABLE** for "the request could not be
completed". A duplicate localStorage-driven badge in `AlertSettingsView` was
removed rather than left as a second source of truth.

The connected rendering was also gated behind `mode === 'dashboard'` while
AlertSettingsView mounts `mode="settings"`, so a fully linked, guild-verified
ELITE account saw "CONNECT DISCORD" indefinitely. Fixed and verified visually
against a running build with a real session.

## The Discord identity chain works end to end

`[prod]`, verified against live Discord:

    session cookie -> OAuth (scope identify) -> Discord user ID 766312591915483156
      -> guild membership -> ELITE entitlement -> roles applied

`VIXY ELITE` and `Verified` are genuinely present on the account, and the bot's
own role (`VIXY AI`, position 10) outranks `VIXY ELITE` (8), `24hr ELITE` (7) and
`Verified` (6), so it can manage what it needs to. The link has persisted since
**2026-08-30** and reads back correctly, so it survives cold starts, restarts and
re-login.

`guildRoles` was a hardcoded `[]` and is now read live from Discord. Role sync was
never broken — only the readback was missing.

## The lock ledger is real and durable

**229 locks hydrate from Firestore on cold start; 59 are settled.** `[prod]`

`signal_logs` was write-only: settlements were persisted but never read back, so
every cold start discarded the genuine record. Hydration now restores it through a
memoized single in-flight promise that read paths await — added after two
endpoints were observed disagreeing about identical data purely on instance
warmth, and after hydration was found to be guarding on the null *client* handle
(`!db`) instead of the Admin-aware rule (`_adminActive || !!db`).

## Historical settlement is real, and so is the current baseline

**Verified production baseline: 25W / 34L over 59 settled cycles = 42.4%,
average Brier 0.403.** `[prod]`

This replaces a **fabricated 81.8%**. That figure was generated at module load by a
12-entry seed whose wins were decided by array index
(`wasCorrect = i !== 3 && i !== 8`), with strikes pinned near $64,100 regardless of
the real BTC price, and `settlementPrice` derived *from* the predetermined outcome.
`serverLearningEngine.historicalAccuracy = 81.8` was additionally assigned as a
literal. Those rows were fed into `settledHistory`, so calibration ran on invented
outcomes.

**42.4% is a measurement, not a target.** On a binary UP/DOWN call it is below a
coin flip, and a Brier of 0.403 is worse than always predicting 50/50 (0.25). It is
recorded here as the honest baseline from which improvement can be measured. See
OPEN ISSUES for the sampling caveat.

## The contamination claim was investigated and found to be FALSE

An earlier analysis in this session claimed roughly half the settled history was
residue from the old seed, and a merge was held on that basis. **That claim was
wrong.**

It came from a loose strike-range heuristic (64090–64180), which matched *genuine*
mid-August rows recorded when BTC actually traded near $64k. Settled strikes span
**$62,634–$80,615**, consistent with real BTC movement over the period.

The decisive test is the seed's own signature — `latencyMs: 14` together with
`lockedProbability ∈ {0.72, 0.28, 0.5}` and a strike in {64100, 64125, 64150,
64175}. `[preview]` **Zero rows match.** Every stored row carries `latencyMs: 12`,
which is what the real settlement path writes. The boot seed was never persisted
to Firestore.

**Conclusion: the stored ledger is genuine. No filter or purge is required.**

## `entitlementReason: "IN_MEMORY"` is intentional, not a defect

Also flagged prematurely in this session and then withdrawn on inspection. `[code]`

`resolveDiscordEntitlementTierAuthoritative` trusts a **positive** paid tier found
in memory, because nothing in the system fabricates a paid tier — it can only have
come from a real Stripe or Firestore record. A **negative** result triggers
Firestore hydration before it is believed, specifically so a cold lambda's empty
map cannot read as "NONE" and demote a paying member mid-request.

The design can only ever withhold a downgrade; it cannot over-grant. The durable
state that matters — the link itself — lives in Firestore `discord_links`.

---

# PART 2 — OPEN ISSUES

## 1. `applicationDefault()` reports a healthy datapath that cannot perform a read

**Status: OPEN. Not fixed. Currently latent, masked by configuration.**

`src/lib/firebaseAdmin.ts:116` is unchanged by any of tonight's work. When no
service-account variable is present, `initializeApp({credential:
applicationDefault()})` and `getFirestore()` both **succeed** on Vercel, so
`adminDb` is non-null, `_adminActive` is true, and `/api/discord/health` reports
`adminDatapathActive: true` — while every subsequent read and write fails with
"Could not load the default credentials", the circuit breaker opens, and the
process exits `128`. `[preview]` The `catch` in `firebaseAdmin.ts` only fires on
init errors, which never occur on this path.

`adminDatapathActive` is `!!_adminActive` (`server.ts:5682`) — a check that an
object was constructed, not that an operation succeeded. **No readiness probe
performs a real read.**

Why it is currently invisible: `FIREBASE_SERVICE_ACCOUNT_JSON` was added to the
Vercel **Preview** environment on 2026-09-02, and production already had it. Both
environments now initialise via the service account. The defect will resurface the
moment that variable is absent, rotated incorrectly, or malformed — and it will
present as a healthy application silently persisting nothing.

**This is the highest-priority remaining issue.** It is the same "reports healthy
while broken" pattern that made the preceding week's debugging unproductive.

## 2. 36 locks remain ungraded

`[prod]` Of 229 hydrated records, 59 settled and **36 are still `LOCKED` past their
expiry** — 36 of the 95 locks that reached a terminal-or-expired state were never
graded. Ten of the affected cycle IDs are returned by `/api/cron/settle` under
`overdueCycleIds`.

These are a direct consequence of the engine-tick gap, which is now fixed going
forward. **They cannot be honestly recovered**: settling a lock that expired hours
ago against a current price manufactures an outcome from the wrong data. They are
surfaced rather than guessed.

Consequence for the baseline: the 59-cycle sample excludes 36 cycles that failed to
settle for reasons plausibly correlated with time of day and traffic. **42.4% may
be biased in an unknown direction**, and 59 cycles is a modest sample. Treat it as
the best current estimate, not a settled fact.

**Watch item:** with the cron live, `settled` should climb from 59 and
`overdueUnsettled` should stop growing. If `overdueUnsettled` keeps rising, the
cron is not doing its job.

## 3. Fabricated display values remain elsewhere

`[code]` Removed from the results terminal, but still present:
`PerformanceLabView` ships a complete hardcoded calibration table (42 and 58
predictions, 92.7% and 85.5% accuracy, Brier 0.031/0.048) labelled **"VERIFIED"**.
`VixyAiStatusCard`, `ModuleCards`, `OpportunityScannerView` and
`ExecutiveCommandCenter` carry fixed demo numbers.

## 4. Fabricated telemetry in the cycle log

`[code]` `server.ts:4611` emits `algorithm=RUNNING websocket=CONNECTED` as
unconditional string literals. There is nothing behind the websocket claim:
`WebSocketServer` is imported at `server.ts:22` but `new WebSocketServer` appears
nowhere, and market data is fetched over REST.

## 5. Four frontend-called routes still 404

`[prod]` `/api/system-status`, `/api/signal/learning-metrics`, `/api/alerts/send`,
`/api/admin/unfreeze-bots`.

## 6. Discord slash commands do not run

`[code]` `initializeDiscordBot()` is exported but never called, and a gateway
websocket cannot persist on serverless. Needs an always-on host or Discord HTTP
interactions — an open architectural decision.

## 7. The test suite does not run in CI and mostly targets the wrong file

`[local]` `npm test` is `tsc --noEmit`, so `tests/` never executes. Three of four
`.mjs` suites read `/Users/olivergershey/Downloads/VIXYS-VAULT2-main/server.ts` — a
copy present on one machine, 24KB smaller and a day older than this repo.
`tests/verify_lifecycle.ts` imports `'../backend'`, which does not exist. The tests
that do run, pass.

## 8. Kalshi auto-trade is an undocumented live-trading surface

`[code]` `/api/kalshi/auto-trade/go-live` and 8 sibling routes exist with no
documentation or test coverage. Not audited.

## 9. Structural

- **Single-file blast radius**: `server.ts` is ~16.9k lines after tonight's merges.
- **Repository noise**: 193 `.cjs` + 150 `.py` one-off scripts at the root.
- **Undeduplicated polling**: `/api/vixy/15m/current` has one callsite wrapped by
  `useCanonical15mDecision`, imported by ~10 component files; each mounted instance
  polls with a cache-busting `?_t=`, bypassing the cache. Three identical
  concurrent requests observed `[prod]`.
- **Firestore circuit breaker** can suppress durable writes for **24 hours** on a
  quota error (`server.ts:15729`) while queued logs sit in memory.
- **The disk store is not durable**: `/tmp/vixy_store.json` is per-instance.

---

## Verification status summary

| Area | Status |
|---|---|
| engine-tick cron live | **verified [prod]** |
| single-flight coalescing | **verified [local]**, 7 of 8 concurrent calls coalesced |
| lock qualification unchanged | **verified**, both directions (declined 56%, qualified 91%) |
| Discord routes live | **verified [prod]** |
| Discord identity chain + roles | **verified [prod]** against live Discord |
| Backend authoritative for linking | **verified [prod] [local]** |
| Ledger hydration (229 / 59) | **verified [prod]** |
| Baseline 25W/34L, 42.4%, Brier 0.403 | **verified [prod]** |
| Seed contamination | **investigated — claim false**, zero signature matches |
| `IN_MEMORY` entitlement | **investigated — intentional** |
| `applicationDefault()` false-green | **OPEN**, unfixed, latent |
| 36 ungraded locks | **OPEN**, unrecoverable |
| Fresh end-to-end OAuth round trip | **not verified** — state TTL expired during the attempt |
| Stripe payment → entitlement → role | **not verified** — code-read only, no live payment traced |
| Role assignment on a preview | **not testable** — role ID vars are Production-only |
