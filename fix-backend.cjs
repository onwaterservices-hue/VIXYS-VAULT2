const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

code = code.replace(
  /const resolved = persistentSignalLogs\.filter\(\(s\) => s\.status === 'RESOLVED'\);/g,
  `const resolved = persistentSignalLogs.filter((s) => s.status === 'RESOLVED' && s.dataSource !== 'COINBASE_KRAKEN_CASCADE');`
);

fs.writeFileSync('backend.ts', code);
console.log("Fixed backend.ts to exclude mock data from resolved stats.");
