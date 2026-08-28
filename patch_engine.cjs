const fs = require('fs');
const file = './src/services/trading/kalshiExecutionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "for (const [userId, userState] of userKalshiStateMap.entries()) {",
  "for (const [userId, userState] of userKalshiStateMap.entries()) {\n    if (direction !== 'UP' && direction !== 'DOWN') { continue; }"
);

code = code.replace(
  "const requestedStakeUSD = Math.max(1, config.maxStakePerTradeUSD || 25);",
  "const requestedStakeUSD = config.maxStakePerTradeUSD || 25;"
);

fs.writeFileSync(file, code);
console.log("Patched!");
