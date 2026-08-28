const fs = require('fs');
const file = './verify_auto_trader.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "console.log(`TEST ${testCount++} — FIRESTORE AUDIT LOG VERIFICATION`);",
  "console.log(`TEST ${testCount++} — FIRESTORE AUDIT LOG VERIFICATION`);\n  setupUser('user_B', { maxStakePerTradeUSD: 100 });\n  await executeAutoTradesForSignal({ id: 'sig_audit', asset: 'BTC', direction: 'DOWN', confidence: 95 }, undefined, true, async () => true);"
);

fs.writeFileSync(file, code);
console.log("Patched test 13!");
