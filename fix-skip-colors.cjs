const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

// Replace amber-400 with purple-400, amber-500 with purple-500, etc. for NO TRADE related lines
code = code.replace(/isNoTrade \? \n?\s*'bg-gradient-to-b from-\[#110524\] to-\[#080212\] border-purple-500\/30 hover:border-purple-400\/50'/, 
  "isNoTrade ? 'bg-gradient-to-b from-[#130826] to-[#0a0414] border-purple-500/40 hover:border-purple-400/70 shadow-[0_0_20px_rgba(168,85,247,0.1)]'");
  
code = code.replace(
  /'bg-gradient-to-br from-amber-500\/10 via-transparent to-transparent'/g,
  "'bg-gradient-to-br from-purple-500/10 via-transparent to-transparent'"
);

// We need a more general approach for the Skip card
// Find where isNoTrade is checked for the badge
// It's probably around line 468
// Wait, I did replace some in my previous message: 
// <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
// Let's just blindly replace amber/orange in the specific card block
