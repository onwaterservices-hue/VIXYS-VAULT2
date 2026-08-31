# Production Verification Checklist — observe >= 2-3 real 15M cycles post-deploy

Status column values: PASS / FAIL / UNVERIFIED. Nothing is PRODUCTION VERIFIED until
observed on www.vixxyvault.com after the fix/production-repair deployment.

## Per-cycle record (fill one table per cycle)
| Field | Value |
|---|---|
| Cycle ID | |
| Cycle start (UTC) | |
| First lock-eligible instant (start + 360s) | |
| Actual lock timestamp (or NO LOCK + final gate reason) | |
| Elapsed seconds at lock | |
| Confidence at lock | |
| Lock quality at lock | |
| Reversal risk at lock | |
| Discord claim result (per tier: FREE / ELITE) | |
| Discord publication timestamp (per tier) | |
| Post-lock: spot moved? evidence/risk moved? | |
| Settlement outcome | |
| Next cycle reset clean (WATCH/CALIBRATING, no carried lock)? | |

Data sources: `/api/vixy/15m/current` polled ~10s; Vercel function logs
([VIXY_LOCK_GATE], [Discord] claim/broadcast lines); the Discord channels themselves.

## Hard invariants (any FAIL blocks sign-off)
- [ ] No lock with elapsed < 360s — in ANY observed cycle
- [ ] No new lock with elapsed >= 720s
- [ ] No "early-qualified" exception observed (log reason must never show a sub-360 lock)
- [ ] Quality gates binding inside the window (denied cycles show real reasons)
- [ ] Discord: claim precedes publish; outcome marked after; one message per tier per cycle
- [ ] Discord: zero publications for any cycle whose claim failed
- [ ] No duplicate broadcast across the observation window
- [ ] Post-lock: committed fields (direction/confidence/entry/cycleId) stable to expiry
- [ ] Post-lock: currentSpot + evidence/reversal telemetry keep updating
- [ ] Cycle rollover: new cycle starts unlocked, prior claim/lock does not carry over
- [ ] Background tab: leave /hub backgrounded >= 5 min mid-cycle, refocus -> card shows
      the CURRENT cycle without manual reload
- [ ] Logs: backend auth succeeded; no PERMISSION_DENIED; no FIRESTORE_AUTH_PENDING
      after boot; telemetry_observations/calibration writes landing

## Explicitly out of scope for this sign-off (do not mark complete)
- LEARNING LOOP: NOT IMPLEMENTED (no prediction->outcome->calibration persistence)
- ADMIN DATAPATH MIGRATION: DEFERRED (datapath remains client SDK; Admin is identity-only)
