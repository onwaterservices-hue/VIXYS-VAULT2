const fs = require('fs');
let c = fs.readFileSync('src/components/VixyLockView.tsx', 'utf8');

c = c.replace(
  "  const primaryDecisionTitle = isCalibrating\n    ? 'VIXY CALIBRATING'",
  "  const primaryDecisionTitle = isCalibrating\n    ? ((continuousInference?.gemini?.upProbability ?? 0) > (continuousInference?.gemini?.downProbability ?? 0) ? 'VIXY CALIBRATING — UP' : 'VIXY CALIBRATING — DOWN')"
);

fs.writeFileSync('src/components/VixyLockView.tsx', c);
