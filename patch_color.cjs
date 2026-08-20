const fs = require('fs');
let c = fs.readFileSync('src/components/VixyLockView.tsx', 'utf8');

c = c.replace(
  "isUp ? 'text-[#00FF88] text-glow-emerald' : isDown ? 'text-[#FF3B30] text-glow-rose' : isConfirming ? 'text-cyan-300 text-glow-cyan' : 'text-slate-200'",
  "isUp ? 'text-[#00FF88] text-glow-emerald' : isDown ? 'text-[#FF3B30] text-glow-rose' : (isConfirming || isCalibrating) ? 'text-cyan-300 text-glow-cyan' : 'text-slate-200'"
);

fs.writeFileSync('src/components/VixyLockView.tsx', c);
