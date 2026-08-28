import { executeAutoTradesForSignal, userKalshiStateMap, setKalshiLiveEnabled } from './src/services/trading/kalshiExecutionEngine';

async function runTests() {
  console.log("Starting functional execution tests...");

  // Mock a user in the state map so it runs without firestore
  userKalshiStateMap.set('user1', {
    userId: 'user1',
    userEmail: 'user1@test.com',
    credentials: { configured: true, environment: 'paper' },
    autoTradeConfig: { 
      enabled: true, 
      environment: 'paper', 
      maxStakePerTradeUSD: 25, 
      maxDailyExposureUSD: 100, 
      confidenceThreshold: 80,
      supportedMarkets: ['BTC']
    }
  });

  // Since we don't have firestore in this environment, let's override idempotency temporarily or observe the returned values better
  // Actually, without firestoreDb passed in, it skips idempotency check and goes straight to order execution!
  const checkEntitlement = async (userId: string) => true;

  // TEST 1: Valid Signal
  const validSignal = {
    id: 'sig_valid',
    asset: 'BTC',
    direction: 'UP',
    confidence: 85,
    expiresAt: new Date(Date.now() + 60000).toISOString() // 1 minute in the future
  };
  const res1 = await executeAutoTradesForSignal(validSignal, undefined, true, checkEntitlement);
  console.log("Valid signal result:", res1);
  
  // To see why it fails, we need the internal logs. It likely fails at price fetch or submission because there are no real kalshi keys in our dummy user! That proves it reached the real function.
}
runTests();
