const fs = require('fs');
let c = fs.readFileSync('src/components/VixyLockView.tsx', 'utf8');

c = c.replace(
  "const isCalibrating = canonicalDecision?.currentState === 'CALIBRATING' || canonicalDecision?.currentState === 'OBSERVING' || (!isUp && !isDown && !canonicalDecision?.currentState);",
  "const isCalibrating = !isUp && !isDown;"
);
c = c.replace(
  "const isConfirming = !isCalibrating && (canonicalDecision?.currentState === 'CONFIRMING');",
  "const isConfirming = false;"
);
c = c.replace(
  "const isSkip = !isCalibrating && (canonicalDecision?.currentState === 'SKIP');",
  "const isSkip = false;"
);
c = c.replace(
  "? 'VIXY CONFIRMING'",
  "? 'VIXY CALIBRATING'"
);
c = c.replace(
  ": isConfirming\n    ? 'VIXY CONFIRMING'\n    : 'VIXY SKIP';",
  ": 'VIXY CALIBRATING';"
);

fs.writeFileSync('src/components/VixyLockView.tsx', c);
