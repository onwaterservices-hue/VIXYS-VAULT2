# VIXY Vault — Production Deployment Runbook (fix/production-repair)

Prepared, NOT executed. Every step below that touches production is the owner's action.
Target: project `vixys-vault-ai-prediction-market-tracker` (prj_DqCWtk19g0BzCjlnOGCE88z5jHur),
domains www.vixxyvault.com / vixxyvault.com. Production currently serves fd2bd8f (origin/main).

## STEP 0 — Credential migration (BEFORE any code deploy)

Chosen approach: **Option A — rotate the password on the EXISTING backend Auth user.**

Why A and not B or C:
- **C (service account only) is NOT sufficient for this branch.** The datapath is still
  client-SDK; the Admin identity does not authenticate client-SDK writes. Configuring only
  FIREBASE_SERVICE_ACCOUNT_JSON leaves every guarded write PERMISSION_DENIED and the
  fail-closed Discord claim silent. (The bootstrap now guards against this trap, but the
  system would still be write-dead.) C becomes the right answer only after the Admin
  datapath migration (docs/admin-datapath-migration.md).
- **B (new Auth identity) requires a rules change too**: `isBackendSystem()` in
  firestore.rules — both the currently deployed revision and the prepared one — matches
  the email `backend_system@vixy.local` exactly. A new email fails every rule until the
  rules are edited and redeployed in lockstep. Extra coupling, no security gain over A
  (the compromised secret is the password, not the email).
- **A** invalidates the leaked password instantly, needs no rules edit, and is exactly
  what the repaired code consumes via env.

Actions (Firebase console → Authentication → Users):
1. Find the backend system user and set a NEW strong password (do not reuse anything).
   The moment this saves, the leaked historical password is dead — and CURRENT production
   (fd2bd8f, hardcoded old password) loses backend Firestore writes until Step 2+3 deploy.
   Do Steps 1-4 in one sitting to keep that window short.
2. Optionally also set FIREBASE_SERVICE_ACCOUNT_JSON now (harmless since the bootstrap
   fix; enables the future migration) — but it is NOT a substitute for Step 1.

## STEP 1 — Vercel environment variables
Vercel → vixys-vault-ai-prediction-market-tracker → Settings → Environment Variables
(Production environment):

    BACKEND_SYSTEM_EMAIL    = backend_system@vixy.local
    BACKEND_SYSTEM_PASSWORD = <the rotated password — never commit it>

## STEP 2 — Ship the branch
    git push origin fix/production-repair
    # open PR into main, merge (merge commit or squash — either is fine)
Vercel auto-deploys main to production. Confirm in Vercel that the new deployment's
githubCommitSha is the merge commit and target=production is READY.

## STEP 3 — Deploy Firestore rules
    firebase deploy --only firestore:rules
(from a checkout of the merged main; requires Firebase CLI auth to project
ai-studio-btc15pro15minbtc-…). Safe relative to the code deploy in either order ONCE the
env credential exists, because writes are gated on isBackendSystem(), which the rotated
user still satisfies. Do NOT deploy the rules before Step 1: current production writes
signal_logs/active_cycle_lock unauthenticated through the world-write holes these rules
close.

Correct total order: **rotate → env vars → merge/deploy code → deploy rules → verify.**

## STEP 4 — Immediate smoke checks (first 5 minutes)
    curl -s https://www.vixxyvault.com/api/health
Watch Vercel function logs for:
    "[Firestore] Backend authenticated via legacy client-SDK system user"   <- REQUIRED
    absence of "[FIRESTORE_AUTH_PENDING]" after the first minute            <- REQUIRED
    absence of "PERMISSION_DENIED"                                          <- REQUIRED
If auth fails: the env password does not match the rotated one. Fix env, redeploy.
Rollback: Vercel → Deployments → previous production deployment → "Rollback"
(fd2bd8f, dpl_DpmgVS5C7kJSYPFHSVnJE6HhVu32) — but note rules, once deployed, gate writes
on isBackendSystem(): the rolled-back code's OLD hardcoded password will fail auth after
rotation, so a rules rollback may also be needed in a full revert.

## STEP 5 — Production verification
Run docs/production-verification-checklist.md over >= 2-3 full 15M cycles.
Only after it passes may anyone write "PRODUCTION VERIFIED".
