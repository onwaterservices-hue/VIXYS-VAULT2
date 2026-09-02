# Working rules for Claude Code sessions

Derived from a week in which correct-looking fixes never converged. The root
cause was not skill: **both feedback loops were dead at once** — the UI could not
be seen without a login, and preview deployments had no Firestore — while the code
fabricated success whenever something failed.

> `CLAUDE.md` carries a short summary of the loop and the no-fabrication rule so a
> session picks them up immediately. **This file is canonical**; if the two ever
> disagree, correct `CLAUDE.md` to match this document.

## The loop

    TASK -> READ CLAUDE.md -> INVESTIGATE -> TRACE SYSTEM -> PLAN ->
    IMPLEMENT -> TEST -> TRY TO BREAK IT -> VERIFY -> COMMIT -> NEXT TASK

`TRY TO BREAK IT` is a separate step from `TEST`. After the happy path passes, go
looking for the case that defeats the fix. Two real defects were caught exactly
there: hydration guarding on a null client handle that only *some* lambdas had,
and two endpoints disagreeing about identical data purely on instance warmth.

## 1. Never invent a value to fill a gap

No `|| 84.0`, no seeded history, no hardcoded "healthy" fallback, no
`websocket=CONNECTED` string literal. Unknown renders as `--`, `null`, or
"STATUS UNAVAILABLE".

A fallback that fires on *every* call is not a fallback, it is the behaviour:
`getDiscordBotStatusApi()` "fell back" 100% of the time for weeks and nobody could
tell.

Corollary — **a health flag must reflect a real operation.** `adminDatapathActive:
true` was reported by a datapath that could not perform a single read. Readiness
booleans derived from "the object was constructed" are worthless.

## 2. See it before you ship it

Build, run locally, have the owner sign in, look at the rendered page.

    npm run build && node dist/server.cjs      # serves on :3000

Local sign-in needs `SESSION_SIGNING_SECRET` in `.env`, or the server refuses to
issue a session cookie and login fails silently. Any random value works locally.
**Ask the owner to sign in; never request or type a password.**

Do not judge a frontend fix by whether the backend returns the right JSON. A
`mode === 'dashboard'` gate survived five consecutive backend-only Discord fixes
because nobody could load the page.

## 3. Production is not a test environment

`main` auto-deploys. Branch per concern, verify on a preview URL, merge
deliberately, and get explicit approval for every push to `main`.

## 4. Confirm environment parity before trusting a preview

Check `/api/discord/health` reports `adminDatapathActive: true` **and** that a
real read succeeds. Several variables have been Production-only; the Discord role
IDs still are, so role assignment cannot be tested on a preview. An untrustworthy
staging environment is worse than none — it produces confident wrong conclusions.

## 5. Match the invariants the codebase already encodes

Before writing a Firestore guard, read `discordFirestore.ready()`
(`_adminActive || !!db`). It exists precisely because a null *client* handle does
not mean Firestore is unavailable — and ledger hydration still shipped with
`if (!db)` and had to be fixed. Grep for how the problem is already solved.

## 6. Verify the claim, not the commit message

Two commits on `main` assert fixes broader than what they delivered. Check
behaviour, not intent. This applies to your own commits.

## 7. Tests: read before trusting

`npm test` is `tsc --noEmit` — it does **not** run `tests/`. Three of the four
`.mjs` suites read `~/Downloads/VIXYS-VAULT2-main/server.ts`, a stale copy on one
machine, so a green run there proves nothing about this repo.
`tests/verify_lifecycle.ts` imports a module that does not exist. Run test files
explicitly with `node tests/<file>.mjs` and confirm what source they read.

## 8. Credentials belong to the owner

Never enter passwords, API keys, or service-account JSON, and never click OAuth
"Authorize" on their behalf. Hand it back with precise steps even when it costs a
round trip.

## 9. Scope discipline

One concern per branch. Do not modify or revert edits pushed for another
subsystem, and do not opportunistically rewrite unrelated code. Record
out-of-scope defects in `PROJECT_STATE.md` instead of fixing them.

## 10. Report honestly, including your own mistakes

Hydration shipped with the wrong readiness guard; `IN_MEMORY` was flagged as a
defect before inspection showed it was sound. Say so plainly and continue. The
owner makes real financial decisions from these reports, so distinguish
*verified*, *code-read*, and *assumed* every time.
