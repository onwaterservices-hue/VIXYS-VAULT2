const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

const searchStr = `  let vixyLockState = 'ANALYZING';
  let signalState: 'IDLE' | 'ANALYZING' | 'SIGNAL_READY' | 'SIGNAL_CONFIRMED' | 'EXPIRED' | 'NO_SIGNAL' = 'ANALYZING';
  let signalConfirmed = false;

  if (isLocked) {
    effectiveDirection = (lockedDirection === 'DOWN' ? 'DOWN' : 'UP');
    decision = \`LOCKED — \${lockedDecision || (effectiveDirection === 'UP' ? 'BUY UP' : 'BUY DOWN')}\`;
    displayConf = lockedConfidence || currentConfidence;
    displayProb = lockedProbability || currentModelProbability;
    executionState = effectiveDirection === 'UP' ? 'LOCKED_UP' : 'LOCKED_DOWN';
    executionDirection = effectiveDirection;
    executionAuthorized = true;
    executionActionLabel = \`⚡ LOCKED — \${lockedDecision || (effectiveDirection === 'UP' ? 'BUY UP' : 'BUY DOWN')}\`;
    executionReason = active15mCycle.lockedReason || 'One-cycle immutable neural lock confirmed for 15M expiry';
    confidenceLabel = effectiveDirection === 'UP' ? 'HIGH BULLISH LOCK' : 'HIGH BEARISH LOCK';
    vixyLockState = 'LOCKED';
    signalState = 'SIGNAL_CONFIRMED';
    signalConfirmed = true;
  } else {
    const upProbability = Math.round(currentModelProbability * 100 * 10) / 10;
    const downProbability = Math.round((100 - upProbability) * 10) / 10;
    effectiveDirection = upProbability > downProbability ? 'UP' : downProbability > upProbability ? 'DOWN' : 'NEUTRAL';
    displayProb = currentModelProbability;
    displayConf = currentConfidence;
    vixyLockState = 'ANALYZING';
    signalState = 'ANALYZING';
    signalConfirmed = false;
    executionState = 'CALIBRATING';
    executionDirection = 'NONE';
    executionAuthorized = false;
    executionActionLabel = '⚡ VIXY ANALYZING CYCLE...';
    executionReason = 'Sampling 15M order flow & confluence matrix';
    confidenceLabel = 'ANALYZING CYCLE';
  }`;

const replaceStr = `  let vixyLockState = active15mCycle.stage;
  let signalState = active15mCycle.stage;
  let signalConfirmed = false;
  
  // Note: active15mCycle.stage is our canonical state machine!

  if (isLocked && !active15mCycle.isCriticallyInvalidated) {
    effectiveDirection = (lockedDirection === 'DOWN' ? 'DOWN' : 'UP');
    decision = \`LOCKED — \${lockedDecision || (effectiveDirection === 'UP' ? 'BUY UP' : 'BUY DOWN')}\`;
    displayConf = lockedConfidence || currentConfidence;
    displayProb = lockedProbability || currentModelProbability;
    executionState = effectiveDirection === 'UP' ? 'LOCKED_UP' : 'LOCKED_DOWN';
    executionDirection = effectiveDirection;
    executionAuthorized = true;
    executionActionLabel = \`⚡ LOCKED — \${lockedDecision || (effectiveDirection === 'UP' ? 'BUY UP' : 'BUY DOWN')}\`;
    executionReason = active15mCycle.lockedReason || 'One-cycle immutable neural lock confirmed for 15M expiry';
    confidenceLabel = effectiveDirection === 'UP' ? 'HIGH BULLISH LOCK' : 'HIGH BEARISH LOCK';
    vixyLockState = 'LOCKED';
    signalState = 'SIGNAL_CONFIRMED';
    signalConfirmed = true;
  } else {
    const upProbability = Math.round(currentModelProbability * 100 * 10) / 10;
    const downProbability = Math.round((100 - upProbability) * 10) / 10;
    effectiveDirection = upProbability > downProbability ? 'UP' : downProbability > upProbability ? 'DOWN' : 'NEUTRAL';
    displayProb = currentModelProbability;
    displayConf = currentConfidence;
    vixyLockState = active15mCycle.stage;
    signalState = active15mCycle.stage;
    signalConfirmed = false;
    executionState = active15mCycle.stage;
    executionDirection = 'NONE';
    executionAuthorized = false;
    
    // UI mapping for stages
    let stageDisplayStr = 'ANALYZING CYCLE';
    if (active15mCycle.stage === 'CALIBRATING') stageDisplayStr = 'CALIBRATING ENGINE';
    if (active15mCycle.stage === 'VALIDATING') stageDisplayStr = 'VALIDATING EVIDENCE';
    if (active15mCycle.stage === 'READY_TO_LOCK') stageDisplayStr = 'READY TO LOCK';
    if (active15mCycle.stage === 'STALE') stageDisplayStr = 'STALE DATA / PAUSED';
    
    executionActionLabel = \`⚡ VIXY \${stageDisplayStr}...\`;
    executionReason = \`Current phase: \${active15mCycle.stage}\`;
    confidenceLabel = stageDisplayStr;
  }`;

code = code.replace(searchStr, replaceStr);

fs.writeFileSync('backend.ts', code);
