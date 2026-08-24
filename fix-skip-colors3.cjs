const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

// Replace orange-400 and orange-950 on lines 716 and 882
code = code.replace(/text-orange-400 bg-orange-950\/30 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-900\/50/g,
  "text-purple-400 bg-purple-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 border border-purple-900/50");

code = code.replace(/activeProvenance.status === 'CRITICALLY_INVALIDATED' \? 'text-orange-400' :/g,
  "activeProvenance.status === 'CRITICALLY_INVALIDATED' ? 'text-purple-400' :");

fs.writeFileSync('src/components/HistoricalAccuracy.tsx', code);
