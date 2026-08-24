const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

// Replace return totalLocks: totalLocks
code = code.replace(/return { \s*totalLocks,\s*wins,\s*losses,/m, 'return { \n      totalLocks: totalLocks,\n      wins: wins,\n      losses: losses,');
fs.writeFileSync('src/components/HistoricalAccuracy.tsx', code);
console.log("Patched return.");
