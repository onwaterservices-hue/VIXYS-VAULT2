const fs = require('fs');
let c = fs.readFileSync('src/components/VixyLockView.tsx', 'utf8');

c = c.replace(
  /isConfirming\s*\?\s*`VIXY is actively evaluating market microstructure[^`]+`/,
  "isCalibrating\n                    ? `VIXY is continuously observing live market conditions for cycle ${cycleId}. Awaiting a high-conviction setup. Scanning multi-factor evidence confluence and order book imbalance before authorizing hard lock.`"
);

// We should also replace the tag above it, near line 1373:
// {isUp ? 'LOCKED & EXECUTED' : isDown ? 'LOCKED & EXECUTED' : isConfirming ? 'AWAITING LOCK' : 'CAPITAL PRESERVED — INSUFFICIENT EDGE'}

c = c.replace(
  /isConfirming \? 'AWAITING LOCK' : 'CAPITAL PRESERVED — INSUFFICIENT EDGE'/,
  "isCalibrating ? 'AWAITING LOCK — OBSERVING' : 'CAPITAL PRESERVED — INSUFFICIENT EDGE'"
);

fs.writeFileSync('src/components/VixyLockView.tsx', c);
