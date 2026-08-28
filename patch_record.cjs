const fs = require('fs');
const file = './src/services/trading/kalshiExecutionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: actualOrderCost, action: 'ORDER_PLACED', status: 'SUCCESS', rawResponse: orderResult.rawResponse, details: `Successfully placed ${contractCount}x ${side.toUpperCase()} contracts on Kalshi (${targetSeries}) at $${verifiedMarketPrice} for $${actualOrderCost}` }, firestoreDb);",
  "recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: actualOrderCost, action: 'ORDER_PLACED', status: 'SUCCESS', rawResponse: orderResult.rawResponse, details: `Successfully placed ${contractCount}x ${side.toUpperCase()} contracts on Kalshi (${targetSeries}) at $${verifiedMarketPrice} for $${actualOrderCost}`, contractCount, verifiedMarketPrice, clientOrderId }, firestoreDb);"
);

fs.writeFileSync(file, code);
console.log("Patched record!");
