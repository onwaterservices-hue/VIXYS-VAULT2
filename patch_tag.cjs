const fs = require('fs');
let c = fs.readFileSync('src/components/VixyLockView.tsx', 'utf8');

c = c.replace(
  "isConfirming\n                      ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'\n                      : continuousInference.protectionDecision.lateCycleProtectionActive",
  "(isConfirming || isCalibrating)\n                      ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'\n                      : continuousInference.protectionDecision.lateCycleProtectionActive"
);

c = c.replace(
  "isConfirming\n                      ? '⚡ SCANNING CONFLUENCE'\n                      : continuousInference.protectionDecision.lateCycleProtectionActive",
  "(isConfirming || isCalibrating)\n                      ? '⚡ SCANNING CONFLUENCE'\n                      : continuousInference.protectionDecision.lateCycleProtectionActive"
);

c = c.replace(
  " : '🛡️ CAPITAL PRESERVED — INSUFFICIENT EDGE'}",
  " : (isCalibrating ? '⚡ AWAITING SIGNAL' : '🛡️ CAPITAL PRESERVED — INSUFFICIENT EDGE')}"
);

fs.writeFileSync('src/components/VixyLockView.tsx', c);
