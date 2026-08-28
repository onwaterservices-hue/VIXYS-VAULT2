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

  const checkEntitlement = async (userId: string) => true;

  // TEST 1: Valid Signal
  console.log("\\n--- TEST: Valid Signal ---");
  const validSignal = {
    id: 'sig_valid',
    asset: 'BTC',
    direction: 'UP',
    confidence: 85,
    expiresAt: new Date(Date.now() + 60000).toISOString() // 1 minute in the future
  };
  const res1 = await executeAutoTradesForSignal(validSignal, undefined, true, checkEntitlement);
  console.log("Valid signal result:", res1);

  // TEST 2: Expired Signal
  console.log("\\n--- TEST: Expired Signal ---");
  const expiredSignal = {
    id: 'sig_expired',
    asset: 'BTC',
    direction: 'UP',
    confidence: 85,
    expiresAt: new Date(Date.now() - 60000).toISOString() // 1 minute in the past
  };
  const res2 = await executeAutoTradesForSignal(expiredSignal, undefined, true, checkEntitlement);
  console.log("Expired signal result:", res2);

  // TEST 3: Multi-Coin - ETH
  console.log("\\n--- TEST: Multi-Asset ETH ---");
  const ethSignal = {
    id: 'sig_eth',
    asset: 'ETH',
    direction: 'UP',
    confidence: 85,
    expiresAt: new Date(Date.now() + 60000).toISOString()
  };
  const res3 = await executeAutoTradesForSignal(ethSignal, undefined, true, checkEntitlement);
  console.log("ETH signal result:", res3);
  
  // TEST 4: Subscription Expired
  console.log("\\n--- TEST: Subscription Expired ---");
  const checkEntitlementFail = async (userId: string) => false;
  const res4 = await executeAutoTradesForSignal(validSignal, undefined, true, checkEntitlementFail);
  console.log("Subscription fail result:", res4);

  // TEST 5: Global Kill Switch
  console.log("\\n--- TEST: Global Kill Switch ---");
  const res5 = await executeAutoTradesForSignal(validSignal, undefined, false, checkEntitlement);
  console.log("Kill switch result:", res5);

  // TEST 6: Live Execution blocked
  console.log("\\n--- TEST: Live execution blocked ---");
  userKalshiStateMap.set('user_live', {
    userId: 'user_live',
    userEmail: 'live@test.com',
    credentials: { configured: true, environment: 'live' },
    autoTradeConfig: { enabled: true, environment: 'live', maxStakePerTradeUSD: 25, confidenceThreshold: 80, supportedMarkets: ['BTC'] }
  });
  const res6 = await executeAutoTradesForSignal(validSignal, undefined, true, checkEntitlement);
  console.log("Live execution result:", res6);
  userKalshiStateMap.delete('user_live');
  
  console.log("\\nTests complete.");
}

runTests().catch(console.error);
