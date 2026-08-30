const fs = require('fs');
let content = fs.readFileSync('src/utils/cycleTime.ts', 'utf8');

content = content.replace(
  `export function calculateCycleSecondsRemaining(\n  durationSec: number = 900,\n  cycleEndMs?: number,\n  nowMs: number = Date.now()\n): number {\n  if (cycleEndMs && cycleEndMs > nowMs) {`,
  `export function calculateCycleSecondsRemaining(\n  durationSec: number = 900,\n  cycleEndInput?: number | string,\n  nowMs: number = Date.now()\n): number {\n  const cycleEndMs = typeof cycleEndInput === 'string' ? new Date(cycleEndInput).getTime() : cycleEndInput;\n  if (cycleEndMs && cycleEndMs > nowMs) {`
);

fs.writeFileSync('src/utils/cycleTime.ts', content, 'utf8');
console.log("Patched src/utils/cycleTime.ts successfully");
