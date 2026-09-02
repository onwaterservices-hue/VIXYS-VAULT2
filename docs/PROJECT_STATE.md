# Project state — audited 2026-09-02

Baseline: `main` = `1d230e1`. Each claim below is marked with how it was checked.

- **[verified-prod]** observed against www.vixxyvault.com
- **[verified-preview]** observed on a Vercel preview deployment
- **[verified-local]** observed in a local run of the real build
- **[code]** read from source, not executed
- **[unverified]** stated but not confirmed — treat as open

## Working

- **15M decision engine** [verified-local, verified-preview] — runs on real market
  data, produces cycles, and correctly *declines* to lock below the 66% confidence
  gate (observed at 55%). Qualification rules are intact and were not weakened.
- **Discord identity chain** [verified-prod] — session → OAuth → Discord user ID →
  guild membership → entitlement → role. The audited account has been linked since
  2026-08-30 and reads back correctly today, so link persistence survives cold
  starts, restarts and re-login.
- **Discord role assignment** [verified-prod] — queried the Discord API directly:
  `VIXY ELITE` and `Verified` are genuinely applied, and the bot's role sits above
  them in the hierarchy, so it can manage what it needs to.
- **OAuth start** [verified-prod] — `/api/discord/connect` returns 200 for a signed-in
  session and produces a correct consent URL (single-use 64-hex state, correct
  `redirect_uri`, `scope=identify`).
- **Stripe webhook signature verification** [code] — raw body is preserved for
  `/api/stripe/webhook` (`server.ts:382`) and `constructEvent` is used (`:11786`).
- **Subscription persistence** [code] — written to Firestore `subscriptions/<email>`
  and `users/`, hydrated into memory on read.
- **Cold-start entitlement safety** [code] — the authoritative resolver refuses to
  demote on an unresolved negative; it can withhold a downgrade but not over-grant.
- **Firestore Admin datapath in production** [verified-prod] — production logs show
  init via `FIREBASE_SERVICE_ACCOUNT_JSON`, zero credential errors, zero circuit-breaker
  trips over a 3-hour window.

## Broken

- **`/api/cron/engine-tick` does not exist.** [verified-prod: 404] `vercel.json`
  schedules it every minute, but no such route is registered in `server.ts` (only
  `/api/cron/settle` and `/api/cron/hourly-market` are). The minute cron has been
  calling a 404 endpoint. **This is the highest-priority issue** — see Risks.
- **Fabricated telemetry in the cycle log.** [code] `server.ts:4611` emits
  `algorithm=RUNNING websocket=CONNECTED` as unconditional string literals in the
  template, so they report the same values regardless of actual state. Confirmed
  there is nothing behind the websocket claim: `WebSocketServer`/`WebSocket` are
  imported at `server.ts:22` but `new WebSocketServer` appears nowhere, so no
  websocket server is ever instantiated and market data is fetched over REST.
- **The test suite does not run in CI and mostly tests the wrong file.**
  [verified-local] `npm test` is `tsc --noEmit`, so `tests/` never executes. Three
  of four `.mjs` tests read source from
  `/Users/olivergershey/Downloads/VIXYS-VAULT2-main/server.ts` — a copy 24KB smaller
  and a day older than this repo, present only on one machine.
  `tests/verify_lifecycle.ts` imports `'../backend'`, which does not exist. Only
  `discord-oauth-linkage.invariants.mjs` resolves paths relative to itself.
  The tests that do run, pass.
- **Four frontend-called routes 404** [verified-prod]: `/api/system-status`,
  `/api/signal/learning-metrics`, `/api/alerts/send`, `/api/admin/unfreeze-bots`.
- **Discord slash commands do not work** [code] — `initializeDiscordBot()` is
  exported but never called, and a gateway websocket cannot persist on serverless.

## Partially implemented

- **15M lock ledger persistence.** Settlement writes to `signal_logs` have always
  worked, but nothing read them back, so every cold start discarded real history.
  Hydration is implemented on `fix/mission-b-real-lock-settlement` and **restored 229
  real locks, 59 settled, on a preview** [verified-preview]. Not on `main`.
- **Settlement coverage.** Of 229 hydrated records, 59 were settled and 36 were
  still `LOCKED` past expiry [verified-preview] — 36 of the 95 locks that reached a
  terminal-or-expired state were never graded. Settlement only runs when a live
  process observes the rollover, a direct consequence of the engine-tick issue.
  (The remaining 134 records are skips/no-trades and other non-terminal states.)
- **Admin datapath migration** — `docs/admin-datapath-migration.md` is headed
  "DEFERRED, NOT STARTED" and enumerates 24 incompatible call sites at commit
  `cc3c847`. The Admin datapath is nevertheless live in production today, so that
  document is **historical and now partly inaccurate**. It was left untouched by
  this audit.

## Known risks

1. **The engine's correctness depends on lambda warmth.** [code + verified-preview]
   The 15M engine is driven by `setInterval(runMarketEngineTickTracked, 3000)` at
   module scope (`server.ts:3098`). On Vercel that only runs while an instance
   happens to be alive, and the every-minute cron meant to guarantee it is a 404.
   Consequences: cycles may be unobserved, and settlement — which happens inline on
   rollover — is silently skipped whenever no instance is alive at the boundary.
   This is the mechanism behind the 36 unsettled locks and it structurally corrupts
   the track record the product is sold on.
2. **`applicationDefault()` produces a false-green persistence layer.**
   [verified-preview] With no service-account variable, `initializeApp({credential:
   applicationDefault()})` and `getFirestore()` both *succeed* on Vercel, so
   `adminDb` is non-null and `_adminActive`/`adminDatapathActive` report **true** —
   while every actual read and write then fails with "Could not load the default
   credentials", the circuit breaker opens, and the process exits `128`. The catch
   block in `firebaseAdmin.ts` only fires on init errors, which never happen here.
   There is no readiness probe that performs an actual operation.
3. **Preview environments are not representative.** `FIREBASE_SERVICE_ACCOUNT_JSON`
   and `SESSION_SIGNING_SECRET` were Production-only until 2026-09-02, so previews
   had a dead Firestore and could not sign anyone in. The Discord **role ID** vars
   are still Production-only (`elitePresent: false`, `verifiedPresent: false` on
   preview), so role assignment cannot be tested outside production.
4. **Fabricated display values.** Removed on the 15M branch, but still present
   elsewhere on `main`: `PerformanceLabView` contains a complete hardcoded
   calibration table (58 predictions, 85.5% accuracy, Brier 0.048) labelled
   "VERIFIED"; `VixyAiStatusCard`, `ModuleCards`, `OpportunityScannerView` and
   `ExecutiveCommandCenter` carry fixed demo numbers.
5. **Single-file blast radius.** `server.ts` is 16,644 lines holding routing, the
   engine, entitlement and the datapath shim. Any change carries broad risk and
   review is difficult.
6. **Firestore circuit breaker can suppress writes for 24 hours.** [code] On a
   quota error the backoff is set to 24h (`server.ts:15729`); meanwhile settled
   cycles queue only in the in-memory `pendingSignalLogsQueue` and are lost if the
   instance dies. The app continues to look healthy throughout.
7. **The disk store is not durable.** [code] `vixy_store.json` lives under `/tmp`
   on Vercel — per-instance and lost on recycling. Anything relying on it as a
   fallback for Firestore is relying on a cache.
8. **Kalshi auto-trade is an undocumented live-trading surface.** [code]
   `/api/kalshi/auto-trade/go-live` exists with no documentation or test coverage
   in this repo. Not audited here.
9. **Repository noise.** 193 `.cjs` + 150 `.py` one-off scripts at the root obscure
   what is real, and several contain operational queries.
10. **Undeduplicated polling.** [code + verified-prod] `/api/vixy/15m/current` has a
   single callsite (`fetchCanonical15mDecision`, `src/services/api.ts:1745`), wrapped
   by the `useCanonical15mDecision` hook, which is imported by ~10 component files.
   Each mounted instance polls independently, and the call uses raw `fetch` with a
   cache-busting `?_t=` parameter, so it bypasses `safeFetchJson`'s cache and the
   requests are not deduplicated. Three identical concurrent requests were observed
   in production. (An earlier draft said "three components each poll", which
   described the symptom as if it were the mechanism.)

## Unfinished work

- Two branches are pushed and **unmerged**; `main` has none of this work:
  - `fix/discord-only-completion` (4 commits) — verified, awaiting merge.
  - `fix/mission-b-real-lock-settlement` (5 commits) — real ledger + hydration.
- **The 42.4% figure is provisional.** [verified-preview] It is the measured
  accuracy over 59 settled cycles, versus the 81.8% the product displayed, which was
  generated by array index. Two open questions: the 36 unsettled locks may bias it,
  and some hydrated rows may be residue from the old seed (identifiable by strikes
  near $64,100 and constant ETH `3515.2` / SOL `189.5`). **The contamination check
  has not been completed.**
- A *fresh* end-to-end OAuth round trip is unconfirmed — the authorization was left
  past the 10-minute state TTL, so no new link was recorded. The surviving Aug-30
  link is stronger evidence of durability, but the fresh path remains untested.

## Verification status summary

| Area | Status |
|---|---|
| Discord identity chain | verified end to end against live Discord + production |
| Discord fresh OAuth round trip | **not verified** |
| 15M engine decision + lock gate | verified locally and on preview |
| 15M settlement correctness | logic read; **coverage is incomplete in production** |
| Ledger hydration | verified on preview (229 locks / 59 settled) |
| Real win rate | provisional 42.4%, contamination check outstanding |
| Stripe webhook → entitlement | **code-read only; no live payment traced** |
| Auth / session issuing | verified locally (login works with the secret present) |
| Role assignment on preview | **not testable** — role ID vars are Production-only |
