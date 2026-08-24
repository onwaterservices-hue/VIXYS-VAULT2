const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const lockGateCode = `
  const elapsedMs = now - intervalStart;
  const timeRemainingSec = Math.max(0, Math.floor((intervalEnd - now) / 1000));

  console.log(\`[VIXY_LIVE] direction=\${currentDirection} probability=\${currentModelProbability} confidence=\${currentConfidence}% regime=\${serverLearningEngine.currentRegime} spot=\$\${livePrice}\`);
  console.log(\`[VIXY_INTELLIGENCE] cycle=\${currentCycleId} state=\${active15mCycle.stage} spot=\$\${livePrice} strike=\$\${current15mStrikePrice} timeRemaining=\${timeRemainingSec}s momentum=\${currentMomentum}% regime=\${serverLearningEngine.currentRegime} marketProbability=\${currentKalshiImpliedProb} modelProbability=\${currentModelProbability} evidenceAgreement=\${currentConfidence >= 65 ? 'HIGH' : 'MODERATE'} confidence=\${currentConfidence}%\`);

  // State Machine Updates (INGESTING -> CALIBRATING -> ANALYZING -> VALIDATING -> READY_TO_LOCK)
  const dataAgeMs = Date.now() - lastMarketUpdateTs;
  const isMarketDataFresh = dataAgeMs <= 15000;
  
  if (!active15mCycle.isLocked) {
    if (!isMarketDataFresh) {
      active15mCycle.stage = 'STALE';
    } else if (elapsedMs < 10000) {
      active15mCycle.stage = 'CALIBRATING';
    } else if (elapsedMs < 20000) {
      active15mCycle.stage = 'ANALYZING';
    } else if (elapsedMs < 30000) {
      active15mCycle.stage = 'VALIDATING';
    } else {
      active15mCycle.stage = 'READY_TO_LOCK';
    }

    const lockThresholdMs = 30 * 1000;
    const isCryptoTracking = engineFeedStatus === 'CONNECTED';
    const isAlgorithmRunning = true;
    const isAuthoritativeState = persistenceState === 'HEALTHY_FIRESTORE';
    const isCycleExpiryFuture = intervalEnd > now;
    const isEvidenceSufficient = currentConfidence >= 65;
    
    const canLock = 
      isMarketDataFresh &&
      isCryptoTracking && 
      isAlgorithmRunning && 
      isAuthoritativeState &&
      isCycleExpiryFuture && 
      isEvidenceSufficient &&
      elapsedMs >= lockThresholdMs;

    console.log(\`[VIXY_LOCK_GATE] cycle=\${currentCycleId} stage=\${active15mCycle.stage} decision=\${currentDirection} confidence=\${currentConfidence}% elapsedSec=\${Math.floor(elapsedMs/1000)}s lockEligible=\${canLock}\`);

    if (canLock) {
      lock15mCycle(currentCycleId, livePrice, \`Official 15M cycle lock finalized after \${Math.floor(elapsedMs/1000)}s\`);
    }
  } else if (active15mCycle.isLocked && !active15mCycle.isCriticallyInvalidated) {
`;

code = code.replace(/  const elapsedMs = now - intervalStart;[\s\S]*?  } else if \(active15mCycle\.isLocked && !active15mCycle\.isCriticallyInvalidated\) {/m, lockGateCode);

fs.writeFileSync('backend.ts', code);
