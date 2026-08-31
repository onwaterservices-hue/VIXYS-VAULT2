# Admin SDK Datapath Migration Plan — DEFERRED, NOT STARTED

Status: **the production backend still performs all Firestore data operations through the
Firebase client SDK.** `src/lib/firebaseAdmin.ts` currently supplies *identity/health only*
(it flips `backendAuthReady` when a service account is configured). No data path has been
migrated, deliberately: ~24 call sites use APIs that are structurally incompatible between
the two SDKs, and a partial or shimmed migration risks mixing Admin and client references
(e.g. `snap.exists()` is a method on client snapshots and a property on Admin snapshots —
a mistake that fails at runtime, not compile time, in a file tsconfig excludes).

## Why migrate at all
- Removes dependence on the shared `backend_system` Firebase Auth user (compromised in git
  history; see commit 8f21bd1).
- Admin bypasses security rules as a service account — the correct trust model — allowing
  rules to deny all client writes outright.
- Ends the cold-start auth race entirely (no sign-in step to await).

## Incompatible call sites (24) — enumerated from server.ts at commit cc3c847
Line numbers drift with edits; re-run the enumeration before executing:
`grep -nE 'getDocs\(|[^a-zA-Z](query|where|limit)\(|runTransaction\(|writeBatch\(' server.ts`

| Group | Sites (lines) | Client SDK form | Admin SDK form |
|---|---|---|---|
| Collection scans | 382, 4528 | `getDocs(collection(db, C))` | `await adminDb.collection(C).get()` |
| Filtered queries | 551-555, 5905-5906, 10966-10982, 15587-15588, 15626-15627 | `getDocs(query(collection(db,C), where(f,'==',v), limit(n)))` | `await adminDb.collection(C).where(f,'==',v).limit(n).get()` |
| Transactions | 1272 (broadcast claim), 1304 (mark outcome), 3379 (lock commit), 5241 (pw-reset rate limit), 5417 (hourly claim) | `runTransaction(db, async tx => { tx.get(ref); snap.exists(); })` | `adminDb.runTransaction(async tx => { tx.get(ref); snap.exists; })` — note `.exists` property, argument order, and Admin ref types |
| Batch | 15355 | `writeBatch(db)` | `adminDb.batch()` |

Plus ~140 mechanical sites (`doc(db,…)`, `setDoc`, `getDoc`, `deleteDoc`) that translate
1:1 but must move in the same pass as their surrounding logic to avoid mixed references.

## Execution plan (one PR per phase, typecheck + invariant tests after each)
1. **Prep**: add `server.ts` to a dedicated `tsconfig.server.json` (checkJs-level at least)
   so the migration is typecheckable; wire `npm run lint:server`.
2. **Phase A — transactions** (highest risk, smallest surface): the 5 `runTransaction`
   sites. The two Discord claims must keep their exact fail-closed semantics —
   `tests/discord-claim.failclosed.mjs` must pass unmodified against the migrated source.
3. **Phase B — queries/scans**: the 13 query/getDocs sites (entitlement lookups, Stripe
   reconciliation, password reset). Verify each against a Firestore emulator.
4. **Phase C — mechanical sites** file-section by file-section, never leaving a section
   with mixed SDK references.
5. **Cutover**: when `adminDb` is required at boot, delete the `BACKEND_SYSTEM_EMAIL`
   fallback and the `backendAuthReady` gate, then tighten firestore.rules'
   `isBackendSystem()` collections to `allow read, write: if false`.

## Preconditions
- `FIREBASE_SERVICE_ACCOUNT_JSON` present in the production environment.
- Node toolchain in CI (build already validated locally on Node 20.18.1).
- Firestore emulator for Phase B/C verification (`firebase emulators:start --only firestore`).
