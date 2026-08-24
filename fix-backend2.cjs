const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

code = code.replace(
  /const recentLogs = persistentSignalLogs\.slice\(0, limit\);/g,
  `const recentLogs = persistentSignalLogs.filter(s => s.dataSource !== 'COINBASE_KRAKEN_CASCADE').slice(0, limit);`
);

fs.writeFileSync('backend.ts', code);
console.log("Fixed backend.ts to exclude mock data from recentLogs.");
