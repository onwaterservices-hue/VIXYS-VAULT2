const fs = require('fs');
const raw = fs.readFileSync('/tmp/vixy_store.json', 'utf8');
const data = JSON.parse(raw);

console.log("Sample signalLog:", JSON.stringify((data.signalLogs || [])[0], null, 2));
console.log("Sample history:", JSON.stringify((data.learningEngine?.settledHistory || [])[0], null, 2));
