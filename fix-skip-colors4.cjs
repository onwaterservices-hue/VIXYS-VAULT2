const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

code = code.replace(/text-purple-400 bg-purple-950\/30 px-1.5 py-0.5 rounded flex items-center gap-1 border border-purple-900\/50/g,
  "text-orange-400 bg-orange-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-900/50");

fs.writeFileSync('src/components/HistoricalAccuracy.tsx', code);
