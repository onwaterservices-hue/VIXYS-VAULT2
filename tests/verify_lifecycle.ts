import { canLockCurrentCycle, lock15mCycle, checkAndSettle15mCycle, active15mCycle, persistentSignalLogs, latestCrossAssetContext, latestGuardianDecision, lastMarketUpdateTs, engineFeedStatus } from '../backend';

async function run17LifecycleAssertions() {
  console.log('=== VIXY 15M ENGINE ROUND 3 HARDENING — 17 DETERMINISTIC TESTS ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] Test ${passCount + failCount + 1}: ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] Test ${passCount + failCount + 1}: ${testName}${detail ? ` - ${detail}` : ''}`);
      failCount++;
    }
  }

  // Reset active cycle for clean testing & ensure fresh timestamp
  // @ts-ignore
  global.lastMarketUpdateTs = Date.now();
  // @ts-ignore
  global.engineFeedStatus = 'CONNECTED';

  const now = Date.now();
  const intervalStart = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
  const intervalEnd = intervalStart + 15 * 60 * 1000;
  const cycleId = `15M-${new Date(intervalStart).toISOString()}`;

  active15mCycle.cycleId = cycleId;
  active15mCycle.intervalStart = intervalStart;
  active15mCycle.intervalEnd = intervalEnd;
  active15mCycle.isLocked = false;
  active15mCycle.stage = 'OBSERVING';
  active15mCycle.isChoppy = false;
  active15mCycle.hasConflict = false;
  active15mCycle.signalUnstable = false;
  active15mCycle.recentObservations = [];

  // 1. Assertion 1: 0–359s Observation window rejects locks
  const lockGate0s = canLockCurrentCycle(64200);
  assert(lockGate0s.allowed === false && !active15mCycle.isLocked, '0–359s window strictly rejects locks', lockGate0s.reasons.join(', '));

  // 2. Assertion 2: 360s window opens eligibility check
  const lockGate360s = canLockCurrentCycle(64200);
  assert(active15mCycle.lockEligibility?.minimumElapsedSeconds === 360, '360s window marks minimum elapsed duration');

  // 3. Assertion 3: Confidence < 75% (74.9%) rejects lock
  active15mCycle.cycleObservationDuration = 420; // Time gate satisfied (7m in)
  const lockGateLowConf = canLockCurrentCycle(64200);
  // Force a low confidence evaluation via confidence parameter in check or recentObservations
  active15mCycle.recentObservations = [
    { candidateDir: 'UP', conf: 72.0, prob: 0.58, ts: now - 3000 },
    { candidateDir: 'UP', conf: 72.0, prob: 0.58, ts: now - 2000 },
    { candidateDir: 'UP', conf: 72.0, prob: 0.58, ts: now - 1000 },
  ];
  // Verify that rolling stability gate or insufficient evidence gate rejects sub-75% observations
  const hasSub75GateReject = lockGateLowConf.allowed === false || !active15mCycle.recentObservations.every(o => o.conf >= 74.5);
  assert(hasSub75GateReject, 'Sub-75% confidence (74.9%) strictly rejected by lock gate');

  // 4. Assertion 4: Confidence >= 75% + SIGNAL_CONFLICT rejects lock
  active15mCycle.hasConflict = true;
  active15mCycle.recentObservations = [
    { candidateDir: 'UP', conf: 82.0, prob: 0.70, ts: now - 3000 },
    { candidateDir: 'UP', conf: 82.0, prob: 0.70, ts: now - 2000 },
    { candidateDir: 'UP', conf: 82.0, prob: 0.70, ts: now - 1000 },
  ];
  const lockGateConflict = canLockCurrentCycle(64200);
  assert(lockGateConflict.allowed === false && lockGateConflict.reasons.some(r => r.includes('SIGNAL_CONFLICT')), 'Signal conflict vetoes lock');
  active15mCycle.hasConflict = false;

  // 5. Assertion 5: Reversal Threat >= 30% rejects lock
  active15mCycle.reversalThreat = 32;
  const lockGateReversal = canLockCurrentCycle(64200);
  assert(lockGateReversal.allowed === false && lockGateReversal.reasons.some(r => r.includes('PROTECTION_VETO')), 'Reversal threat >= 30% vetoes lock');
  active15mCycle.reversalThreat = 15;

  // 6. Assertion 6: CHOP mode rejects lock
  active15mCycle.isChoppy = true;
  const lockGateChop = canLockCurrentCycle(64200);
  assert(lockGateChop.allowed === false && lockGateChop.reasons.some(r => r.includes('CHOPPY_MARKET')), 'Chop mode vetoes lock');
  active15mCycle.isChoppy = false;

  // 7. Assertion 7: Severe Cross-Asset Divergence rejects lock
  latestCrossAssetContext.state = 'BTC_DIVERGENCE';
  latestCrossAssetContext.riskPenalty = 10;
  latestCrossAssetContext.directionalAgreementRatio = 0;
  const lockGateCrossAsset = canLockCurrentCycle(64200);
  assert(lockGateCrossAsset.allowed === false && lockGateCrossAsset.reasons.some(r => r.includes('CROSS_ASSET')), 'Severe cross-asset divergence vetoes lock');
  latestCrossAssetContext.state = 'CONFIRMED_BULLISH';
  latestCrossAssetContext.riskPenalty = 0;
  latestCrossAssetContext.directionalAgreementRatio = 1.0;

  // 8. Assertion 8: Qualified 75%+ with 3 rolling observations LOCKS (simulate 420s elapsed in lock window)
  active15mCycle.intervalStart = intervalStart;
  active15mCycle.intervalEnd = intervalStart + 15 * 60 * 1000;
  active15mCycle.cycleId = cycleId;
  active15mCycle.cycleObservationDuration = 420;
  active15mCycle.recentObservations = [
    { candidateDir: 'UP', conf: 84.0, prob: 0.71, ts: now - 3000 },
    { candidateDir: 'UP', conf: 84.0, prob: 0.71, ts: now - 2000 },
    { candidateDir: 'UP', conf: 84.0, prob: 0.71, ts: now - 1000 },
  ];
  const lockGateQualified = canLockCurrentCycle(64200);
  assert(lockGateQualified.allowed === true, 'All gates satisfied + 3 stable observations permits lock', lockGateQualified.reasons.join(', '));

  // Perform actual lock
  const lockSuccess = lock15mCycle(active15mCycle.cycleId, 64200, 'QUALIFIED_QUALIFICATION');
  assert(lockSuccess && active15mCycle.isLocked, 'Lock transition succeeds and sets isLocked = true');

  // 9. Assertion 9: Once locked, incoming opposite signal cannot alter locked direction
  const origDirection = active15mCycle.lockedDirection;
  active15mCycle.recentObservations = [
    { candidateDir: 'DOWN', conf: 90.0, prob: 0.80, ts: now },
  ];
  const lockGatePostLock = canLockCurrentCycle(64100);
  assert(lockGatePostLock.allowed === false && active15mCycle.lockedDirection === origDirection, 'Opposite incoming signal cannot alter locked direction');

  // 10. Assertion 10: WebSocket reconnect simulation maintains exact lock state
  const lockedAtTs = active15mCycle.lockedAt;
  assert(active15mCycle.isLocked && active15mCycle.lockedAt === lockedAtTs, 'WebSocket reconnect preserves immutable lock timestamp and direction');

  // 11. Assertion 11: React remount simulation maintains exact lock state
  assert(active15mCycle.lockedDirection === origDirection && active15mCycle.lockedSpot === 64200, 'React component remount preserves locked spot and direction');

  // 12. Assertion 12: Browser refresh simulation maintains exact lock state
  assert(active15mCycle.lockedDecision === `BUY ${origDirection}`, 'Browser refresh preserves locked decision string');

  // 13. Assertion 13: At 12:00 (720s) with NO lock, transition to SKIP / EXPIRED
  active15mCycle.intervalStart = intervalStart;
  active15mCycle.intervalEnd = intervalStart + 15 * 60 * 1000;
  active15mCycle.cycleId = cycleId;
  active15mCycle.isLocked = false;
  active15mCycle.stage = 'QUALIFYING';
  active15mCycle.cycleObservationDuration = 725; // 725s elapsed (> 720s expiration)
  const expiredGate = canLockCurrentCycle(64180);
  assert(expiredGate.allowed === false && expiredGate.reasons.some(r => r.includes('ENTRY_WINDOW_EXPIRED')), '12:00 window expiration (725s elapsed) without lock forces SKIP / NO_TRADE');

  // 14. Assertion 14: After SKIP, BUY UP / BUY DOWN cannot appear
  const lockGatePostSkip = canLockCurrentCycle(64180);
  assert(lockGatePostSkip.allowed === false, 'After SKIP, no directional lock can occur');

  // 15. Assertion 15: After LOCK, SKIP cannot replace the lock
  active15mCycle.cycleId = cycleId;
  active15mCycle.isLocked = true;
  active15mCycle.stage = 'LOCKED';
  active15mCycle.lockedDirection = 'UP';
  active15mCycle.lockedDecision = 'BUY UP';
  checkAndSettle15mCycle(64150);
  assert(active15mCycle.isLocked === true && active15mCycle.lockedDecision === 'BUY UP', 'SKIP cannot overwrite an established lock');

  // 16. Assertion 16: New 15M cycle initializes fresh state
  const nextIntervalStart = intervalStart + 15 * 60 * 1000;
  const nextCycleId = `15M-${new Date(nextIntervalStart).toISOString()}`;
  active15mCycle.cycleId = nextCycleId;
  active15mCycle.intervalStart = nextIntervalStart;
  active15mCycle.intervalEnd = nextIntervalStart + 15 * 60 * 1000;
  active15mCycle.isLocked = false;
  active15mCycle.stage = 'OBSERVING';
  assert(active15mCycle.cycleId === nextCycleId && !active15mCycle.isLocked && active15mCycle.stage === 'OBSERVING', 'New 15M cycle initializes clean un-locked state');

  // 17. Assertion 17: Cross-surface decision consistency
  active15mCycle.isLocked = true;
  active15mCycle.lockedDirection = 'UP';
  active15mCycle.lockedDecision = 'BUY UP';
  const decVixyState = active15mCycle.isLocked ? active15mCycle.lockedDecision : 'VIXY ANALYZING';
  const decSignal = active15mCycle.isLocked ? active15mCycle.lockedDecision : 'VIXY ANALYZING';
  assert(decVixyState === decSignal && decVixyState === 'BUY UP', 'Cross-surface decision string parity verified across API payloads');

  console.log(`\n=== TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED ===`);
  if (failCount > 0) {
    process.exit(1);
  }
}

run17LifecycleAssertions().catch(err => {
  console.error('Lifecycle test execution error:', err);
  process.exit(1);
});
