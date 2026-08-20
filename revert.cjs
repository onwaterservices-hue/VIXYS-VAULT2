const fs = require('fs');
let c = fs.readFileSync('backend.ts', 'utf8');
const startIdx = c.indexOf('app.post("/api/admin/give-day-pass"');
const endIdx = c.indexOf('app.post("/api/admin/strip-pwd"');
if (startIdx !== -1 && endIdx !== -1) {
  c = c.substring(0, startIdx) + c.substring(endIdx);
  fs.writeFileSync('backend.ts', c);
}
