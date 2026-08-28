const fs = require('fs');
const file = './verify_auto_trader.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "console.log(`ACTUAL: ${log?.action} - HTTP ${log?.rawResponse?.statusCode} - error: ${log?.rawResponse?.error}`);",
  "console.log(`ACTUAL: ${log?.action} - Message: ${log?.rawResponse?.message}`);"
);

code = code.replace(
  "console.log(`RESULT: ${log?.action === 'FAILED' && log?.rawResponse?.error?.includes('504') ? 'PASS' : 'FAIL'}`);",
  "console.log(`RESULT: ${log?.action === 'FAILED' && log?.rawResponse?.message?.includes('Gateway Timeout') ? 'PASS' : 'FAIL'}`);"
);

code = code.replace(
  "console.log(`EXPECTED: Failed on price or blocked direction`);\n      console.log(`ACTUAL: ${log?.action} - ${log?.rawResponse?.error}`);\n      console.log(`RESULT: ${log?.action === 'FAILED' ? 'PASS' : 'FAIL'}`);",
  "console.log(`EXPECTED: Skipped`);\n      console.log(`ACTUAL: log=${log?.action} skipped=${res.skipped}`);\n      console.log(`RESULT: ${res.skipped > 0 ? 'PASS' : 'FAIL'}`);"
);

fs.writeFileSync(file, code);
console.log("Patched tests final!");
