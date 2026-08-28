const fs = require('fs');
const file = './src/services/trading/kalshiExecutionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const direction = signal.direction === 'UP' ? 'UP' : 'DOWN';",
  "const direction = signal.direction;\n  if (direction !== 'UP' && direction !== 'DOWN') { return summary; }"
);

fs.writeFileSync(file, code);
console.log("Patched direction!");
