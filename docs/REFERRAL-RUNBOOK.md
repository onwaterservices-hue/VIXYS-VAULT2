# VIXY VAULT - Invite to Earn runbook

## Status

Branch `feature/invite-to-earn-credits`. **NOT merged. NOT deployed.**
Build green, 19/19 invariant tests pass, all changes additive (zero deletions).

## BLOCKER - must happen before merge

**Publish `firestore.rules` in the Firebase console.**

Database is NOT `-default-`. It is:
`ai-studio-btc15pro15minbtc-5ffd95f2-2d75-456b-8811-6d9cbc0c1c72`

Verified 2026-09-08: the live collection list runs `predictions` -> `settlement_locks`
with NO referral collections at all. The referral system shipped in `fdc2bce`
(2026-09-07) has **never written a row to production** - every write is swallowed
by the catch-all `allow read, write: if false` while the API returns success.
Same silent-failure pattern as the old `kalshi_credentials` bug.

Publishing fixes that live bug AND enables this feature. Merging first ships a
page that promises credits and delivers none.

## Economics (single source of truth: referralPolicy.ts)

| Setting | Value |
| --- | --- |
| Credit unit | 1 credit = $0.01, integer cents, never float |
| Starter conversion | 580 credits |
| Pro Quant conversion | 1580 credits |
| Elite Quant conversion | 3980 credits |
| Billing interval | Ignored - flat per tier |
| Day Pass conversion | 0 (a $9.99 sale would pay a day to earn a day) |
| Day redemption | 999 credits, PEGGED to the $9.99 Day Pass price |
| Payout threshold | 2500 credits ($25) |
| Clawback hold | 14 days PENDING before AVAILABLE |

**If the Day Pass price changes in Stripe, change CREDITS_PER_DAY with it** or
every redemption quietly loses money.

## The three money invariants

Enforced by Firestore DOCUMENT IDs, not application logic. A check-then-write
races under concurrent webhooks; a create-only transaction cannot.

1. `referral_attributions/{referredUserId}` - one referred user, one referrer
2. `referral_rewards/{referralId}` - one referral, one reward
3. `vxy_ledger/earn_{referralId}` - balance is DERIVED, never stored

There is no `user.credits` field anywhere, by design.

## The 100%-off coupon hole (closed)

Live coupons `MODS` (100% off forever, 11 redemptions) and `MESSUP` (6
redemptions) produce completed checkouts carrying a real plan string. Rewarding
on plan alone would mint 3980 credits against $0.00 collected.

`rewardCreditsForPlan(plan, amountPaidCents)` REQUIRES the collected amount,
returns 0 when it is zero/missing, and caps any reward at the amount collected.
Covered by 4 tests.

## Redemption paths

- **Days**: 999 credits, automatic, reuses the existing `grantBonusDay`
- **Payout ticket**: 2500+ credits, ESCROWS immediately, user DMs the ticket ID

Escrow at request time (not fulfilment) is what stops the two paths
double-spending the same balance.

## Routes

| Route | Auth |
| --- | --- |
| GET /api/referral/balance | session |
| POST /api/referral/redeem-day | session |
| POST /api/referral/request-payout | session |
| GET /api/referral/leaderboard | session |
| GET /api/admin/referral/overview | OWNER/ADMIN |
| POST /api/admin/referral/resolve-ticket | OWNER/ADMIN |
| ALL /api/cron/referral-leaderboard | cron |

## KNOWN REPO HAZARD

**`npx tsc --noEmit` does NOT type-check `server.ts`.** Undefined identifiers
pass silently. Confirmed 2026-09-08 when `REFERRAL_CREDITS_PER_DAY` and
`REFERRAL_PAYOUT_THRESHOLD` typechecked clean while being completely undefined.
Always grep for a definition; never trust the green checkmark on that file.
Worth its own ticket.

## Test

`npx tsx tests/referral_invariants.mjs` - 19 tests, no Firestore, no network.

## Post-merge verification

1. Claim a code in production
2. Confirm the document appears in `referral_codes` (first row ever written)
3. GET /api/referral/balance returns 200
4. Vercel `get_runtime_errors` on the deployment

## Not done

- `AdminReferralQueue.tsx` exists but is NOT yet mounted in `AdminPanel.tsx`
  (3715 lines, no clean tab anchor - needs a deliberate one-line wiring)
- Leaderboard UI not surfaced on the page yet (route is live)
