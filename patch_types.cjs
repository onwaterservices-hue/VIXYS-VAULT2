const fs = require('fs');
const file = './src/types.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "details: string;",
  "details: string;\n  contractCount?: number;\n  verifiedMarketPrice?: number;\n  clientOrderId?: string;"
);

fs.writeFileSync(file, code);
console.log("Patched types!");
