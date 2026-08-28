import { executeAutoTradesForSignal, userKalshiStateMap, autoTradeAuditLogHistory } from './src/services/trading/kalshiExecutionEngine';

async function runTests() {
  userKalshiStateMap.set('user1', {
    userId: 'user1',
    userEmail: 'user1@test.com',
    credentials: { configured: true, environment: 'paper' },
    autoTradeConfig: { enabled: true, environment: 'paper', maxStakePerTradeUSD: 25, maxDailyExposureUSD: 100, confidenceThreshold: 80, supportedMarkets: ['BTC'] }
  });

  const checkEntitlement = async (userId: string) => true;

  autoTradeAuditLogHistory.length = 0; // clear

  const validSignal = { id: 'sig_valid', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() };
  await executeAutoTradesForSignal(validSignal, undefined, true, checkEntitlement);
  console.log("Valid signal audit:", autoTradeAuditLogHistory[0]?.action, autoTradeAuditLogHistory[0]?.rawResponse?.error);

  autoTradeAuditLogHistory.length = 0;

  const expiredSignal = { id: 'sig_expired', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() - 60000).toISOString() };
  await executeAutoTradesForSignal(expiredSignal, undefined, true, checkEntitlement);
  console.log("Expired signal audit:", autoTradeAuditLogHistory[0]?.action, autoTradeAuditLogHistory[0]?.rawResponse?.error);

}
runTests();
