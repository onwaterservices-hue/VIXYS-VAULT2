const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "return (\n          {isVerifyingPayment && (",
  "return (\n    <>\n      {isVerifyingPayment && ("
);

// wait, let's just do a regex replace
code = code.replace(/return \(\s*\{isVerifyingPayment/, "return (\n    <>\n      {isVerifyingPayment");

fs.writeFileSync('src/App.tsx', code);
