import { executeAutoTradesForSignal, userKalshiStateMap, autoTradeAuditLogHistory } from './src/services/trading/kalshiExecutionEngine';

async function runTests() {
  userKalshiStateMap.set('user1', {
    userId: 'user1',
    credentials: { configured: true, environment: 'paper' },
    autoTradeConfig: { enabled: true, environment: 'paper', maxStakePerTradeUSD: 25, confidenceThreshold: 80, supportedMarkets: ['BTC', 'ETH'] }
  });

  const checkEntitlement = async () => true;

  autoTradeAuditLogHistory.length = 0; // clear

  const ethSignal = { id: 'sig_eth', asset: 'ETH', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() };
  await executeAutoTradesForSignal(ethSignal, undefined, true, checkEntitlement);
  console.log("ETH signal audit:", autoTradeAuditLogHistory[0]?.action, autoTradeAuditLogHistory[0]?.rawResponse?.error);

}
runTests();
