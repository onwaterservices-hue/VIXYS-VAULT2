const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
let func = [];
let inFunc = false;
let braceCount = 0;
for (const line of lines) {
  if (line.includes('async function reconcileUserEntitlement')) {
    inFunc = true;
  }
  if (inFunc) {
    func.push(line);
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;
    if (braceCount === 0) break;
  }
}
fs.writeFileSync('reconcile.js', func.join('\n'));
