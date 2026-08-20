const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalAccuracy.tsx', 'utf8');

// Replace any leftover orange/amber in the feed cards
let inFeed = false;
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{filteredLogs.slice(0, 40).map(log => {')) {
    inFeed = true;
  }
  if (inFeed && lines[i].includes('</select>')) {
    inFeed = false; // Just in case
  }
  if (inFeed && lines[i].includes('Crypto Performance Matrix')) {
    inFeed = false;
  }
  
  if (inFeed && lines[i].includes('isNoTrade')) {
    lines[i] = lines[i].replace(/amber/g, 'purple').replace(/orange/g, 'purple');
  }
  // There are other places that check `log.status === 'NO_TRADE'`
  if (inFeed && lines[i].includes("log.status === 'NO_TRADE'")) {
    lines[i] = lines[i].replace(/amber/g, 'purple').replace(/orange/g, 'purple');
  }
  if (inFeed && lines[i].includes("NO TRADE")) {
     lines[i] = lines[i].replace(/amber/g, 'purple').replace(/orange/g, 'purple');
  }
  if (inFeed && lines[i].includes("SKIPPED")) {
     lines[i] = lines[i].replace(/amber/g, 'purple').replace(/orange/g, 'purple');
  }
  if (inFeed && lines[i].includes("VIXY'S SKIP")) {
     lines[i] = lines[i].replace(/amber/g, 'purple').replace(/orange/g, 'purple');
  }
}
fs.writeFileSync('src/components/HistoricalAccuracy.tsx', lines.join('\n'));
