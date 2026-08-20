const fs = require('fs');
let c = fs.readFileSync('src/components/VixyLockView.tsx', 'utf8');
c = c.replace(
  "const isUp = canonicalDecision?.currentState === 'LOCKED_UP' || (activeCycleDecision.includes('UP') && cyclePhase !== 'CALIBRATING');",
  "const isUp = canonicalDecision?.currentState === 'LOCKED_UP' || (resolvedLog?.decision === 'BUY UP');"
);
c = c.replace(
  "const isDown = canonicalDecision?.currentState === 'LOCKED_DOWN' || (activeCycleDecision.includes('DOWN') && cyclePhase !== 'CALIBRATING');",
  "const isDown = canonicalDecision?.currentState === 'LOCKED_DOWN' || (resolvedLog?.decision === 'BUY DOWN');"
);
c = c.replace(
  "const isCalibrating = cyclePhase === 'CALIBRATING' || cyclePhase === 'SETTLEMENT_PENDING';",
  "const isCalibrating = canonicalDecision?.currentState === 'CALIBRATING' || canonicalDecision?.currentState === 'OBSERVING' || (!isUp && !isDown && !canonicalDecision?.currentState);"
);
c = c.replace(
  "const isConfirming = !isCalibrating && (canonicalDecision?.currentState === 'CONFIRMING' || continuousInference.protectionDecision.state === 'CONFIRMING');",
  "const isConfirming = !isCalibrating && (canonicalDecision?.currentState === 'CONFIRMING');"
);
c = c.replace(
  "const isSkip = !isCalibrating && (canonicalDecision?.currentState === 'SKIP' || activeCycleDecision === 'VIXY SKIP' || (!isUp && !isDown && !isConfirming));",
  "const isSkip = !isCalibrating && (canonicalDecision?.currentState === 'SKIP');"
);
fs.writeFileSync('src/components/VixyLockView.tsx', c);
