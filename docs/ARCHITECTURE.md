# Architecture

Describes the repository as it exists at `main` = `1d230e1` (audited 2026-09-02).
Everything here was read from the code or verified against a live endpoint.
Anything unverified is labelled.

## Shape

Google AI Studio → GitHub → Vercel. A Vite/React 19 SPA plus one Express app,
bundled by esbuild into `dist/server.cjs`.

    vercel.json
      buildCommand: npm run build      outputDirectory: dist
      rewrites: /api/(.*) -> /api/index.ts    (everything reaches the Express app)
                /(.*)     -> /index.html      (SPA)
      functions: api/index.ts maxDuration 60
      crons:    /api/cron/engine-tick    * * * * *
                /api/cron/settle         */15 * * * *
                /api/cron/hourly-market  0 * * * *

`api/index.ts` and `api/cron/*.ts` are three-line shims that re-export the bundled
app, so **every route lives in `server.ts`**.

## Major systems and important files

| System | Location | Notes |
|---|---|---|
| API + engine monolith | `server.ts` (16,644 lines, 602KB at `1d230e1`) | all routes, 15M engine, Firestore shim |
| Frontend | `src/` (101 `.tsx`, 68 `.ts`) | React 19 + Vite + Tailwind 4 |
| API client | `src/services/api.ts` | `safeFetchJson` swallows non-2xx and returns `null` |
| Discord OAuth handlers | `src/bot/discordOAuth.ts` | handler factories; datapath injected |
| Discord bot service | `src/bot/index.ts`, `src/bot/discordBotService.ts` | REST + an unused gateway client |
| Firebase Admin init | `src/lib/firebaseAdmin.ts` | credential selection, named database |
| Prediction UI | `src/components/CryptoPredictionCenterView.tsx` (99KB) | flagship 15M workspace |
| Results ledger UI | `src/components/HistoricalAccuracy.tsx` | VIXY Locks / results terminal |
| Discord UI | `CommunityAccessNode.tsx`, `DiscordOnboardingModal.tsx`, `DiscordBotHubView.tsx` | |
| Tests | `tests/` (6 files) | see PROJECT_STATE — not wired to `npm test` |
| Model scripts | `scripts/` (6 files), `sql/` (2 migrations) | offline training/backfill; not part of the app runtime |

The repo root also holds **193 `.cjs` and 150 `.py` one-off debug scripts**. They
are not part of the build.

## Route surface by system

Counted from route literals in `server.ts` at `1d230e1`. The admin surface is by
far the largest and was omitted from earlier drafts of this document.

| Prefix | Routes | Notes |
|---|---|---|
| `/api/admin/*` | 36 | largest surface: user CRUD, entitlement diagnostics, event stream, resync, wipe |
| `/api/auth/*` | 14 | login, register, heartbeat, sync, forgot/restore password |
| `/api/stripe/*` | 12 | checkout, day pass, portal, webhook, promo, health |
| `/api/kalshi/*` | 9 | keys, markets, handshake, **auto-trade config/logs/go-live** |
| `/api/user/*` | 6 | account-scoped reads |
| `/api/signal/*` | 6 | resolved-log, calibration, confidence buckets, backtest replay |
| `/api/discord/*` | 6 | plus `/api/auth/discord/callback` |
| `/api/vixy/*`, `/api/crypto/*`, `/api/journal/*` | 3 each | live decision, market data, trade journal |
| `/api/telemetry/*`, `/api/live-engine/*`, `/api/entitlement(s)/*`, `/api/venues/*`, `/api/health*`, `/api/cron/*` | 2 each | |
| `/api/whales`, `/api/predict`, `/api/position-size`, `/api/leaderboard`, `/api/subscription`, `/api/signal-snapshots`, `/api/restore-access`, `/api/maintenance/status`, `/api/model-status` | 1 each | |

**Kalshi auto-trade is a live-trading surface** (`/api/kalshi/auto-trade/go-live`)
and is not covered by any documentation or test in this repo.

## Source-of-truth locations

| Fact | Authority |
|---|---|
| Session identity | HMAC-signed HttpOnly cookie, `signSession` / `authenticateSession` (`server.ts:971`, `:1058`); fails closed with no `SESSION_SIGNING_SECRET` |
| Discord link | Firestore `discord_links/<email>` + `discord_links_by_discord_id/<discordUserId>` reverse index |
| Subscription | Firestore `subscriptions/<email>` and `users/<id|email>`; mirrored into the in-memory `userSubscriptions` map |
| Day pass | in-memory `userDayPasses` map, hydrated from Firestore |
| Settled 15M locks | Firestore `signal_logs/<id>`; `settlement_locks/<id>` for idempotency |
| Live cycle | in-memory `active15mCycle`, mirrored to `active_cycle_lock/<cycleId>` |
| Entitlement tier | derived, not stored — `resolveDiscordEntitlementTier` (`:5373`) over subscription/day-pass state |

## Persistence: the Admin/client shim

`server.ts:203-260` redefines the Firestore functional API (`doc`, `collection`,
`getDoc`, `getDocs`, `setDoc`, `query`, `where`, `limit`, `runTransaction`,
`writeBatch`). When `adminDb != null` these route to the Admin SDK; otherwise
they fall through to the client SDK. This avoided editing ~150 call sites.

`_adminActive = !!adminDb` (`:222`).

**Two consequences that have each caused defects:**

1. When Admin is active, `adminDb` is the datapath and the *client* handle `db`
   is legitimately `null`. Code guarding on `if (!db)` silently disables itself.
   `discordFirestore.ready()` encodes the correct test (`_adminActive || !!db`).
2. A shim declared in `server.ts` cannot reach another module, so the datapath is
   **injected** into `src/bot/discordOAuth.ts` rather than imported there.

### Admin credential selection (`src/lib/firebaseAdmin.ts:84-125`)

    FIREBASE_SERVICE_ACCOUNT_JSON  ->  cert(serviceAccount)
    GOOGLE_APPLICATION_CREDENTIALS ->  cert(file)
    neither                        ->  applicationDefault()      <-- see risk below

A **named** Firestore database is targeted explicitly
(`ai-studio-btc15pro15minbtc-...`); `getFirestore()` without it would talk to
`(default)`, which does not exist for this project.

### Secondary persistence and failure handling

Two mechanisms that earlier drafts omitted entirely:

**Ephemeral disk store.** `saveDiskStore()` (`server.ts:15806`) writes
`vixy_store.json` under `STORE_DIR`. On Vercel/Lambda that resolves to `/tmp`
(`:15642-15647`). `/tmp` is per-instance and does not survive instance recycling,
so this is a warm-instance cache, **not durable persistence**. Only Firestore is
durable.

**Firestore circuit breaker.** `canAttemptFirestoreWrite()` (`:15667`) gates every
write. On failure the circuit opens with exponential backoff
(`firestoreBackoffMs`, doubling to a 120-minute ceiling), and on a quota error
(`RESOURCE_EXHAUSTED` / HTTP 429) the backoff is set to **24 hours** (`:15729`).
`attemptFirestoreRecovery()` probes every 20s (`:15805`). While the circuit is
open, signal logs accumulate in the in-memory `pendingSignalLogsQueue` (`:15508`)
— which is lost if the instance dies before the circuit closes.

The practical failure mode: a transient quota error can suppress durable writes
for up to a day while the app continues to appear healthy, with settled cycles
queued only in memory.

## Data flow: 15-minute prediction

    Binance / Coinbase / Kraken / CoinGecko REST
        -> runMarketEngineTick()            server.ts:2610
        -> runMarketEngineTickTracked()     :3094, driven by setInterval(..., 3000) at :3098
        -> active15mCycle  (quarter-hour aligned, id 15M-<ISO cycleStart>)
        -> canLockCurrentCycle(livePrice)   :3200   qualification gate
        -> lock15mCycle(...)                :3540   writes active_cycle_lock/<cycleId>
        -> checkAndSettle15mCycle(livePrice) :3829  inline on cycle rollover
             compares observed spot to strike -> wasCorrect, Brier
             persistSingleSignalLog() -> Firestore signal_logs/<id>
             settlement_locks/<id> guards double-settlement
        -> /api/vixy/15m/current, /api/vixy/state, /api/signal/resolved-log
        -> CryptoPredictionCenterView, HistoricalAccuracy, LiveDashboard

Lock qualification requires model confidence >= 66% plus freshness, liquidity,
spread, edge and persistence checks. Below threshold the engine declines to lock
(observed live: 55% confidence, `qualified: false`).

Gemini (`@google/genai`) is initialised when `GEMINI_API_KEY` is present
(`:907`) and contributes the `gemini` block of the decision payload.

**The engine is driven by `setInterval` inside a serverless process.** See
PROJECT_STATE for the consequences; this is the most important structural fact
about the system.

## Data flow: Stripe → subscription → entitlement → Discord role

    Stripe Checkout (/api/stripe/create-checkout-session, /create-day-pass-checkout)
        -> POST /api/stripe/webhook            server.ts:11744
             raw-body preserved for signature (:382)
             stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)  :11786
        -> Firestore subscriptions/<email> + users/<id|email>
        -> in-memory userSubscriptions / userDayPasses (hydrated from Firestore on read)
        -> resolveDiscordEntitlementTier(email, discordUserId)     :5373
             inactive statuses grant nothing
             PAID = [ELITE, PROFESSIONAL, PRO, STARTER] -> all map to a single ELITE role  :5412
        -> resolveDiscordEntitlementTierAuthoritative(...)         cold-start safe wrapper
             positive in-memory tier is trusted (nothing fabricates a paid tier)
             negative triggers Firestore hydration before it is believed
        -> assignDiscordRoleToUser(discordUserId, tier)            Discord REST

The authoritative wrapper exists so a cold lambda's empty map cannot read as
"NONE" and demote a paying member. It can only withhold a downgrade, never
over-grant.

## Data flow: Discord OAuth → persisted state → entitlement/UI

    GET /api/discord/connect            (session required)
        writes discord_oauth_states/<state>  single-use, 10-minute TTL
        returns { url } for a popup; scope=identify, prompt=consent
    GET /api/auth/discord/callback      (public; identity comes from the state doc)
        validates + consumes state in a transaction
        token exchange -> /users/@me -> discordUserId
        guild membership via BOT token (REST)  -> fail: guild_membership_required
        transactional write of discord_links + discord_links_by_discord_id
        syncLegacyUserRecord(...) keeps the older user.discordId gate in sync
        entitlement resolve -> assignDiscordRoleToUser
        redirect /?discord_connected=true  (or /?discord_error=<reason>)
    GET /api/discord/user-profile       canonical link state the UI polls
    GET /api/discord/status, POST /api/discord/unlink

Identity is never taken from a client-supplied email; the session cookie and the
state document are the only bindings.

## External integrations

- **Market data:** Binance, Coinbase (`api.coinbase.com`, `api.exchange.coinbase.com`),
  Kraken, CoinGecko — REST.
- **Gemini** (`@google/genai`) for the decision narrative/priors.
- **Stripe** — checkout, portal, webhooks, promo validation.
- **Discord** — OAuth2 + REST (roles, guild membership). `discord.js` and a
  gateway client are imported but the gateway is never started.
- **Firebase/Firestore** — Admin SDK (service account) or client SDK fallback.
- **Kalshi** — API key/private-key env vars and auto-trade routes exist.
- **Resend / SendGrid / SMTP** env vars referenced for mail.
- **Postgres** (`pg`, `lib/db.js`, `sql/`) — used by the offline model scripts.

## Deployment

`main` auto-deploys to production (www.vixxyvault.com). Feature branches get
preview URLs. Environment variables are scoped per environment in Vercel and
**several are Production-only**, which has made previews unrepresentative — see
PROJECT_STATE.
