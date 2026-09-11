// What a row from /api/signal/resolved-log can honestly be labelled.
//
// recentResolved is sorted by lockedAt and includes the CURRENT cycle's lock
// while it is still open (status LOCKED, no wasCorrect yet). Both the terminal's
// settlement strip and the right rail used `r.wasCorrect ? 'WIN' : 'LOSS'`, so an
// open lock rendered as LOSS until the server settled it (2026-09-11 14:44:51Z:
// "14:30 LOSS DOWN" with spot $495 on the winning side; it settled WIN at 14:45).
//
// Status values written by server.ts:
//   LOCKED                  a lock that has not settled yet
//   RESOLVED                settled at cycle end; wasCorrect is a boolean
//   CRITICALLY_INVALIDATED  set mid-cycle (before settlement) or by the late
//                           sweep; graded only once wasCorrect is a boolean,
//                           and never when exitReason is DATA_INVALID_STRIKE
//                           (the server counts those neither as win nor loss)
//   NO_TRADE / SKIPPED      a skipped cycle (decision SKIP)
// WIN and LOSS come only from a settled status with a boolean wasCorrect.
export type LedgerRowStatus = 'WIN' | 'LOSS' | 'SKIP' | 'OPEN' | 'VOID' | 'UNKNOWN';

export function ledgerRowStatus(r: any): LedgerRowStatus {
  if (!r || typeof r !== 'object') return 'UNKNOWN';
  const status = typeof r.status === 'string' ? r.status : null;
  if (status === 'LOCKED') return 'OPEN';
  if (r.decision === 'SKIP' || status === 'NO_TRADE' || status === 'SKIPPED') return 'SKIP';
  if (status === 'RESOLVED' || status === 'CRITICALLY_INVALIDATED') {
    if (r.exitReason === 'DATA_INVALID_STRIKE') return 'VOID';
    if (typeof r.wasCorrect === 'boolean') return r.wasCorrect ? 'WIN' : 'LOSS';
    // Invalidated mid-cycle but not settled yet: still open.
    return status === 'CRITICALLY_INVALIDATED' ? 'OPEN' : 'UNKNOWN';
  }
  return 'UNKNOWN';
}
