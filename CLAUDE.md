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

## Orientation

- `server.ts` — 16,644-line Express monolith: all API routes, the 15M engine, the
  Firestore Admin/client shim.
- `src/` — React 19 + Vite frontend. `src/services/api.ts` is the API client.
- `src/bot/` — Discord OAuth handlers and bot service (REST; the gateway bot is
  never started, see ARCHITECTURE.md).
- `docs/` — architecture, current state, decisions, and working rules.
- The repo root holds ~340 one-off `.cjs` debug scripts from past sessions. They
  are not part of the build; ignore them.
