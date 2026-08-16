const fs = require('fs');
const data = JSON.parse(fs.readFileSync('dump.json', 'utf8'));
let count = 0;
data.dayPasses.forEach(dp => {
  if (dp[1].troubleshootingGraceApplied) count++;
});
console.log("Day passes with troubleshootingGraceApplied:", count);
