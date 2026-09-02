# Decision log

Architectural decisions that are **verifiable from the repository**, plus clearly
separated historical entries. Audited 2026-09-02 at `main` = `1d230e1`.

---

## Part 1 — Decisions verifiable in the current code

### Redefine the Firestore API rather than edit ~150 call sites
`server.ts:203-260`. The backend originally authenticated to Firestore with the
**client** SDK via `signInWithEmailAndPassword`, which fails on Vercel with
`auth/network-request-failed`; once security rules were enforced every backend
write was rejected. The correct server trust model is the Admin SDK as a service
account, which bypasses rules. Rather than touch every call site, the functional
API is redefined in place and dispatches on `_adminActive`. Snapshot shapes are
normalised to the client SDK's (`exists()` as a method) so call sites read
identically. *Rationale is documented in the code comment itself.* That comment
also asserts "All document/collection paths in this file are two-segment" — this
is the shim's own precondition, quoted here rather than independently verified.

### Inject the datapath into `src/bot/discordOAuth.ts`
A shim declared in `server.ts` cannot reach another module. `discordOAuth.ts`
previously imported `doc/getDoc/setDoc/runTransaction` straight from
`firebase/firestore`, which meant Discord collections were the only persistence
still on the client datapath and subject to the rules' catch-all deny. The shimmed
functions are now passed in.

### Target a named Firestore database explicitly
`src/lib/firebaseAdmin.ts:91`. `getFirestore()` with no `databaseId` talks to
`(default)`, which does not exist for this project, so every read/write would
fail. The named database is passed explicitly.

### Derive entitlement rather than store it; map all paid tiers to one role
`server.ts:5373`, `:5412`. `PAID = ["ELITE","PROFESSIONAL","PRO","STARTER"]` all
resolve to a single `ELITE` Discord role. Inactive statuses grant nothing
regardless of plan name. STARTER previously fell through to the default and was
indistinguishable from free.

### Never demote on an unresolved entitlement
`resolveDiscordEntitlementTierAuthoritative`. A synchronous read of in-memory maps
returns "NONE" on any cold lambda, which would strip a paying member's role. The
wrapper distinguishes *genuinely unentitled* from *unknown on this instance*, and
hydrates from Firestore before believing a negative. A **positive** in-memory tier
is trusted because nothing in the system fabricates a paid tier — so this can only
ever withhold a downgrade, never over-grant.

### Bind Discord identity to the session, never to a client-supplied email
`src/bot/discordOAuth.ts`. The VIXY identity is captured into a single-use
`discord_oauth_states` document at `/connect` time (10-minute TTL) and read back
from that document in the callback. A `discord_links_by_discord_id` reverse index
prevents one Discord account claiming a second VIXY account. Email equality is
explicitly *not* the join.

### Verify guild membership with the bot token, not the user token
The OAuth scope is `identify` only, so the user token cannot list guilds.
Membership is checked server-side via the bot token against
`/guilds/{guild}/members/{user}`.

### Idempotent settlement
`settlement_locks/<sigId>` is written when a cycle settles, and checked before
re-settling, so a restart cannot double-count an outcome.

---

## Part 2 — Decisions made during the Sept 2026 remediation

These are on branches (`fix/discord-only-completion`,
`fix/mission-b-real-lock-settlement`) and **not yet on `main`**.

### Delete the fabricated ledger rather than correct it
The 12-entry seed decided wins by array index (`wasCorrect = i !== 3 && i !== 8`)
and derived `settlementPrice` *from* the predetermined outcome — inverting the
causality that makes a settlement meaningful. A generated prediction record cannot
be made accurate. Accepted cost: a fresh deployment shows an empty ledger.

### Show an honest warming-up state rather than a nicer placeholder
Unknown values render `--`; a banner shows real progress toward the 50-sample
calibration threshold. A dash means "not measured yet"; a real 0 still renders 0.

### Do not settle overdue locks against the current price
A lock that expired 40 minutes ago cannot be honestly settled against the price
now. They are surfaced as `overdueUnsettled` instead of being guessed.

### Three link states, not two
Connected / not connected / **status unavailable**. A failed request and a
confirmed negative are different facts; conflating them is how a dead bot looked
identical to a healthy one.

### The backend is the sole authority on link state
`isLinked` previously ORed `settings.discordLinked` (localStorage) into the
answer. Client storage is now a cache with no vote, and the duplicate badge in
`AlertSettingsView` was deleted rather than given a second source of truth.

### Do not build the Discord gateway bot
Slash commands need a persistent websocket, which cannot survive serverless.
Choosing between an always-on host and Discord HTTP interactions is a real
architectural and cost decision, and therefore the owner's.

### One concern per branch
At the user's explicit request, so fixing one subsystem cannot modify or revert
edits already pushed for another.

### Credentials are never typed by the assistant
Local sign-in, the OAuth "Authorize" click and re-entering
`FIREBASE_SERVICE_ACCOUNT_JSON` were all handed back to the owner. This cost time —
an OAuth state expired while waiting — and remains the correct trade.

---

## Part 3 — Historical, NOT currently accurate

Recorded so the documents are not mistaken for current state.

### `docs/admin-datapath-migration.md` — "DEFERRED, NOT STARTED"
Enumerates 24 incompatible call sites at commit `cc3c847` and presents the Admin
migration as future work. **The Admin datapath is live in production today**
(production logs show init via `FIREBASE_SERVICE_ACCOUNT_JSON`). That document
describes a plan that has since been substantially executed by other means. Left
unmodified by this audit.

### `docs/deployment-runbook.md`, `docs/production-verification-checklist.md`
Written for the `fix/production-repair` branch. Steps may not correspond to the
current branch set. Not re-verified here; left unmodified.

### Prior commit messages on `main` overstate their coverage
`8ff00d6` claims to "guard the whole path-mismatch defect class" while three
frontend-called Discord routes still returned 404 in production; `adc411d` claims
to stop localStorage granting Discord-gated access while `isLinked` still ORed it
in. Both were written in good faith — each fixed the backend half its author could
observe — but the claims should not be relied on as evidence.
