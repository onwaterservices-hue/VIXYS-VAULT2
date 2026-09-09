# VIXY Vault — working context for Claude

VIXY Vault is a real-money-adjacent crypto decision terminal: a 15-minute BTC
prediction engine ("the 15M brain") plus a Discord-gated membership tier. It was
built in Google AI Studio, exported to GitHub, and deploys to Vercel.

Live: https://www.vixxyvault.com · Repo: `onwaterservices-hue/VIXYS-VAULT2`

## The task loop

Follow this sequence for every task. It is the user's required process, not a
suggestion.

    TASK -> READ CLAUDE.md -> INVESTIGATE -> TRACE SYSTEM -> PLAN ->
    IMPLEMENT -> TEST -> TRY TO BREAK IT -> VERIFY -> COMMIT -> NEXT TASK

Where the steps earn their keep here:

- **Trace system** before planning. Defects in this project are repeatedly in a
  different layer than the one that looks broken. A frontend `mode === 'dashboard'`
  gate survived five consecutive backend-only Discord fixes because nobody traced
  past the API response.
- **Try to break it** is its own step, after tests pass. Hunt the case that
  defeats the fix: the cold lambda, the failed request, the second code path with
  the same bug. Two real defects were caught this way — hydration guarding on a
  null client handle that only some instances had, and two endpoints disagreeing
  about identical data purely on instance warmth.
- **Verify** means observing real behaviour — a rendered page, a live endpoint —
  not that it compiles and not that the commit message sounds right.

## The single most important rule

**Never fabricate a value to fill a gap.** This codebase's defining defect is
that it invents plausible numbers when real ones are missing, which makes broken
and working states look identical and destroys the ability to debug anything.
Real examples removed in Sept 2026:

- A 12-entry fabricated lock ledger whose wins were decided by array index
  (`wasCorrect = i !== 3 && i !== 8`), producing a permanent 81.8% "win rate".
- `serverLearningEngine.historicalAccuracy = 81.8` assigned as a literal.
- `metrics.winRate || 84.0` — an empty ledger advertised 84% accuracy.
- `getDiscordBotStatusApi()` returning a hardcoded healthy bot on any failure.
- `/api/cron/settle` returning `checked:18, settled:4` while settling nothing.

When a value is unknown, say unknown: `null`, `--`, "STATUS UNAVAILABLE". A
failed request and a confirmed negative are different states and must never
render identically.

## Verify before you ship

Every route is behind sign-in, so the UI cannot be inspected without a session.
Historically this meant changes shipped to production to find out if they worked,
which produced ~17 commits/day and fixes that never converged.

The loop that actually works:

1. `npm run build && node dist/server.cjs` (serves on :3000)
2. Local sign-in needs `SESSION_SIGNING_SECRET` in `.env`; without it the server
   refuses to issue a session cookie and login fails silently. Any random value
   works locally.
3. **Ask the user to sign in themselves** at http://localhost:3000. Never ask for
   or type a password.
4. Inspect the real rendered UI, then commit.

This loop found defects in minutes that backend-only fixes had missed for a week.

## Deploys and branches

`main` auto-deploys to production. Therefore:

- Branch per concern; never commit straight to `main`.
- Keep a change confined to its subsystem — the user has explicitly asked that
  fixing one area not modify edits already pushed for another.
- Verify on a Vercel preview URL, not on production.
- Pushing to `main` requires explicit user approval each time.

## Environment parity (bit us badly)

Vercel env vars are scoped per environment. Several were Production-only, so
**every preview deployment had a completely dead Firestore** and crashed with
`exit status: 128` — previews were untrustworthy for reasons unrelated to the
code. Check `FIREBASE_SERVICE_ACCOUNT_JSON`, `SESSION_SIGNING_SECRET`, and the
Discord role IDs (`elitePresent`/`verifiedPresent` in `/api/discord/health`) are
scoped to Preview before believing anything a preview tells you.

## Scope of the engine work

```
PREDICTION HORIZON : 15 MINUTES
CYCLE LENGTH       : 15 MINUTES
TARGET             : DIRECTION OF THE CURRENT 15-MINUTE BTC CYCLE
QUESTION           : "UP, DOWN, or SKIP for THIS 15-minute cycle?"
```

1H and 2H predictors are **out of scope**. Do not optimise for hourly trends,
and do not let a longer-horizon output become a hidden input unless it is
explicitly transformed into evidence about the current 15-minute cycle.

A change counts as an improvement only if it produces fewer bad locks, better
calibration, more stable locks, better out-of-sample performance, better regime
adaptation, a lower reversal rate, or better skip quality. **A higher win rate
is not evidence of improvement**, especially when it comes from locking less
often, and the engine must never be tuned toward a target win rate. The key
question is not "did it guess right?" but "did it wait until the 15-minute
evidence actually converged?"

Working files: `VIXY_ENGINE_TASKS.md` is the task board;
`ENGINE_PROGRESS.md` is the persistent handoff between sessions — update it
after every meaningful completed task rather than relying on conversation
memory.

## VERIFICATION COMMANDS

Taken from `package.json`. These are the real commands — do not invent others.

| purpose | command |
|---------|---------|
| **everything (use this after any engine change)** | `npm run vixy:verify` |
| typecheck | `npm run lint` (`tsc --noEmit`) |
| typecheck + full test suite | `npm test` |
| test suite only | `npm run test:engine` |
| dev/prod write isolation | `npm run verify:dev-isolation` |
| replay determinism + leakage | `npm run verify:replay-determinism` |
| run the replay harness | `npm run replay:15m -- --source trades --days 3 [--offline]` |
| replay a specific engine version | `git show <sha>:server.ts > /tmp/old.ts && npm run replay:15m -- --source trades --offline --start … --end … --engine-source /tmp/old.ts` |
| compare two replay runs (Phase 8 table) | `npx tsx scripts/replay15m/research/compareRuns.ts A.json B.json [labelA] [labelB]` |
| real-flow forecast test (E3b) | `npx tsx scripts/replay15m/research/flowSkill.ts <startIso> <endIso>` |
| production build | `npm run build` |
| serve a local build | `npm start` (see the sign-in loop below) |

`npm run vixy:verify` chains: typecheck → engine/settlement tests → dev/prod
isolation → replay determinism + leakage → production build. A stage that
cannot run reports SKIP with a reason; a skip is never counted as a pass.

Git hygiene: inspect `git status`, `git diff` and `git diff --check` before
committing, and stage named files — never `git add .`, which risks committing
build output, `package-lock.json` churn or credentials.

## Invariants added Sept 2026 — do not regress these

Each is covered by a test in `tests/`. Run `npm test` (tsc + the whole suite) or
`npm run test:engine`. The suites execute the REAL implementation sliced
verbatim out of `server.ts`, so they fail when the shipped code changes, not
when a copy of it does.

- **Settlement validates its own input.** `checkAndSettle15mCycle` is
  authoritative for the ledger. It now rejects non-finite/non-positive prices, a
  price >10% from the last observed venue price, an observed price older than
  60s, and a process that has never received a venue price. It fails closed but
  *recoverably*: the guard returns before touching any state, so the rollover
  retries on the next 3s tick. This exists because
  `/api/signal?asset=<non-BTC>` used to resolve `spot` to a literal `100` and
  settle the live BTC cycle with it. Never settle from a read endpoint.
- **Firestore writes require an explicit deployment.** Every write routes
  through the shim (`setDoc`/`deleteDoc`/`writeBatch`/`runTransaction`), which
  refuses when `VERCEL` is unset — i.e. on a laptop, a replay, or CI. Override
  with `VIXY_ALLOW_PRODUCTION_WRITES=true`; force off with
  `VIXY_PERSISTENCE_MODE=readonly`. State is visible at
  `/api/live-engine/health` under `persistenceWriteGuard`.
- **The lock gate is tier-dependent, not flat.** Since `2deba55` on main:
  EARLY <480s needs lockQuality 85 / agreement 8 / MTF 4; STANDARD 480–659s
  75 / 6 / 3; LATE ≥660s 68 / 5 / 3. `strike15mResolved` is a separate term
  in `allowed`. The real applied bar is on the canonical payload as `lockGate`;
  top-level `lockTier` is a legacy binary and does not reflect it.
- **Known regression on main (`2deba55`), pinned by name, not fixed:** for
  720–779s the gate returns `allowed=true` while emitting `ENTRY_WINDOW_EXPIRED`
  and `lock15mCycle`'s commit point refuses. The tests will FAIL when it is
  fixed — update them deliberately when you do.
- **`validationPassed` in `canLockCurrentCycle` is pinned two ways** —
  structurally (its exact conjunct set, parsed from source) and behaviourally.
  It has been silently gutted four times; when it is, the gate returns
  `allowed=true` while still emitting the matching denial reason, which is why
  it kept reaching production unnoticed.
- **Unknowns render as unknown.** Feed age, venue count and price source on the
  terminal come from `feedHealth` on `/api/vixy/15m/current` and show `--` when
  absent. They were previously the literals `0.8s`, `4 / 4 SYNCED` and
  `BINANCE`.

## The replay harness

`npx tsx scripts/replay15m.ts --days 30 [--offline]` replays historical candles
through the real decision path. Candles cache to `.cache/replay15m/`, so reruns
are offline and deterministic (seeded PRNG for the pipeline's one
`Math.random()`).

**Its win rate is not an engine result, and it says so on every run.** With
1-minute candles, `getPriceAtAgo(15|30|60)` all resolve to the same
previous-minute price, so three of the engine's five timeframe votes collapse
into one on ~85% of ticks. That inflates evidence agreement, confidence and lock
quality. Reconciling against the live ledger needs trade-level history. Do not
tune the engine against 1-minute replay output.

## Orientation

- `server.ts` — ~17k-line Express monolith: all API routes, the 15M engine, the
  Firestore Admin/client shim.
- `tests/` — plain `.mjs` suites, no framework; run via `tests/run-all.mjs`.
- `scripts/replay15m.ts` + `scripts/replay15m/` — the offline replay harness.
- `src/` — React 19 + Vite frontend. `src/services/api.ts` is the API client.
- `src/bot/` — Discord OAuth handlers and bot service (REST; the gateway bot is
  never started, see ARCHITECTURE.md).
- `docs/` — architecture, current state, decisions, and working rules.
- The repo root holds ~340 one-off `.cjs` debug scripts from past sessions. They
  are not part of the build; ignore them.
