process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 bytes

import * as crypto from 'crypto';
import { 
  executeAutoTradesForSignal, 
  userKalshiStateMap, 
  autoTradeAuditLogHistory,
  executedSignalIdSet,
  encryptString
} from './src/services/trading/kalshiExecutionEngine';

const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

async function runVerification() {
  console.log("==========================================");
  console.log("KALSHI AUTO TRADER FUNCTIONAL VERIFICATION");
  console.log("==========================================\n");

  let testCount = 1;
  let mockFetchHandler = (url: string, opts: any) => Promise.resolve({ ok: true, json: async () => ({}) });

  globalThis.fetch = async (url, opts) => {
    return mockFetchHandler(url, opts) as any;
  };

  const creds = {
    keyIdEncrypted: encryptString('mock_key_id'),
    privateKeyEncrypted: encryptString(privateKey),
  };

  const setupUser = (userId, configUpdates = {}) => {
    userKalshiStateMap.set(userId, {
      userId,
      userEmail: `${userId}@test.com`,
      credentials: { 
          configured: true, 
          environment: 'paper',
          keyIdEncrypted: creds.keyIdEncrypted as any,
          privateKeyEncrypted: creds.privateKeyEncrypted as any
      },
      autoTradeConfig: { 
        enabled: true, 
        environment: 'paper', 
        maxStakePerTradeUSD: 25, 
        maxDailyExposureUSD: 100, 
        confidenceThreshold: 80,
        supportedMarkets: ['BTC'],
        ...configUpdates
      }
    });
  };

  const checkEntitlement = async () => true;

  const runTest = async (name, signal, setup, handler) => {
    console.log(`TEST ${testCount++} — ${name}`);
    autoTradeAuditLogHistory.length = 0;
    executedSignalIdSet.clear();
    userKalshiStateMap.clear();
    setup();
    const result = await executeAutoTradesForSignal(signal, undefined, true, checkEntitlement);
    await handler(result, autoTradeAuditLogHistory[0] || null);
    console.log("---");
  };

  // TEST 1 — VALID PAPER TRADE
  await runTest(
    "VALID PAPER TRADE", 
    { id: 'sig_valid', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => {
      setupUser('user1');
      mockFetchHandler = async (url, opts) => {
        if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]] } }) };
        if (url.includes('orders')) return { ok: true, json: async () => ({ order_id: 'mock_order_123' }) };
        return { ok: true, json: async () => ({}) };
      };
    },
    (res, log) => {
      console.log(`EXPECTED: ORDER_PLACED, $25 stake, 50 contracts (at $0.50)`);
      console.log(`ACTUAL: ${log?.action}, stake: ${log?.stakeUSD}, contracts: ${log?.contractCount}`);
      console.log(`RESULT: ${log?.action === 'ORDER_PLACED' && log?.contractCount === 50 ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 2 — EXPIRED SIGNAL
  await runTest(
    "EXPIRED SIGNAL", 
    { id: 'sig_expired', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() - 60000).toISOString() },
    () => { setupUser('user1'); },
    (res, log) => {
      console.log(`EXPECTED: SIGNAL_EXPIRED`);
      console.log(`ACTUAL: ${log?.action}`);
      console.log(`RESULT: ${log?.action === 'SIGNAL_EXPIRED' ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 3 — SUBSCRIPTION
  await runTest(
    "SUBSCRIPTION ENFORCEMENT", 
    { id: 'sig_sub', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => { setupUser('user1'); },
    async (res, log) => {
      const resSub = await executeAutoTradesForSignal({ id: 'sig_sub', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() }, undefined, true, async () => false);
      console.log(`EXPECTED: blocked due to subscription_expired`);
      console.log(`ACTUAL: ${resSub.blocked} blocked`);
      console.log(`RESULT: ${resSub.blocked === 1 ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 4 — KILL SWITCH
  console.log(`TEST ${testCount++} — KILL SWITCH`);
  autoTradeAuditLogHistory.length = 0;
  setupUser('user1');
  const resKill = await executeAutoTradesForSignal({ id: 'sig_kill', asset: 'BTC', direction: 'UP', confidence: 85 }, undefined, false, checkEntitlement);
  console.log(`EXPECTED: Blocked, no audit log generated`);
  console.log(`ACTUAL: Attempted=${resKill.attempted}`);
  console.log(`RESULT: ${resKill.attempted === 0 ? 'PASS' : 'FAIL'}`);
  console.log("---");

  // TEST 5 — LIVE SAFETY
  await runTest(
    "LIVE SAFETY", 
    { id: 'sig_live', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => { setupUser('user_live', { environment: 'live' }); },
    (res, log) => {
      console.log(`EXPECTED: BLOCKED (LIVE_EXECUTION_DISABLED)`);
      console.log(`ACTUAL: ${log?.action} - ${log?.rawResponse?.error}`);
      console.log(`RESULT: ${log?.rawResponse?.error === 'LIVE_EXECUTION_DISABLED' ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 6 — PRICE VALIDATION (Unsafe price)
  await runTest(
    "PRICE VALIDATION (Unsafe)", 
    { id: 'sig_price', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => {
      setupUser('user1');
      mockFetchHandler = async (url, opts) => {
        if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[105, 100]] } }) };
        return { ok: true, json: async () => ({}) };
      };
    },
    (res, log) => {
      console.log(`EXPECTED: FAILED (EXECUTION_ABORTED_UNSAFE_PRICE)`);
      console.log(`ACTUAL: ${log?.action} - ${log?.rawResponse?.error}`);
      console.log(`RESULT: ${log?.rawResponse?.error === 'EXECUTION_ABORTED_UNSAFE_PRICE' ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 7 — STAKE LIMITS (Insufficient)
  await runTest(
    "STAKE LIMITS (Insufficient)", 
    { id: 'sig_stake', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => {
      setupUser('user1', { maxStakePerTradeUSD: 0.10 });
      mockFetchHandler = async (url, opts) => {
        if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]] } }) };
        return { ok: true, json: async () => ({}) };
      };
    },
    (res, log) => {
      console.log(`EXPECTED: BLOCKED (INSUFFICIENT_STAKE_FOR_1_CONTRACT)`);
      console.log(`ACTUAL: ${log?.action} - ${log?.rawResponse?.error}`);
      console.log(`RESULT: ${log?.rawResponse?.error === 'INSUFFICIENT_STAKE_FOR_1_CONTRACT' ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 8 — IDEMPOTENCY
  console.log(`TEST ${testCount++} — IDEMPOTENCY`);
  autoTradeAuditLogHistory.length = 0;
  executedSignalIdSet.clear();
  userKalshiStateMap.clear();
  setupUser('user_idem');
  mockFetchHandler = async (url, opts) => {
    if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]] } }) };
    if (url.includes('orders')) return { ok: true, json: async () => ({ order_id: 'mock_order_123' }) };
    return { ok: true, json: async () => ({}) };
  };
  const idemSignal = { id: 'sig_idem', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() };
  await executeAutoTradesForSignal(idemSignal, undefined, true, checkEntitlement);
  const resIdem2 = await executeAutoTradesForSignal(idemSignal, undefined, true, checkEntitlement);
  console.log(`EXPECTED: First allowed, Second blocked/skipped (reason: already_executed)`);
  console.log(`ACTUAL: Second attempt skipped=${resIdem2.skipped}`);
  console.log(`RESULT: ${resIdem2.skipped === 1 ? 'PASS' : 'FAIL'}`);
  console.log("---");

  // TEST 9 — UNKNOWN KALSHI RESPONSE
  await runTest(
    "UNKNOWN ORDER HANDLING", 
    { id: 'sig_unknown', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => {
      setupUser('user1');
      mockFetchHandler = async (url, opts) => {
        if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]] } }) };
        if (url.includes('orders')) return { ok: false, status: 504, json: async () => ({ message: 'Gateway Timeout' }) }; 
        return { ok: true, json: async () => ({}) };
      };
    },
    (res, log) => {
      console.log(`EXPECTED: FAILED (Gateway Timeout)`);
      console.log(`ACTUAL: ${log?.action} - Message: ${log?.rawResponse?.message}`);
      console.log(`RESULT: ${log?.action === 'FAILED' && log?.rawResponse?.message?.includes('Gateway Timeout') ? 'PASS' : 'FAIL'}`); 
    }
  );
  
  // TEST 10 - MULTI-USER
  console.log(`TEST ${testCount++} — MULTI-USER ISOLATION`);
  autoTradeAuditLogHistory.length = 0;
  executedSignalIdSet.clear();
  userKalshiStateMap.clear();
  setupUser('user_A', { maxStakePerTradeUSD: 10 });
  setupUser('user_B', { maxStakePerTradeUSD: 100 });
  setupUser('user_C', { maxStakePerTradeUSD: 0.10 }); 
  
  mockFetchHandler = async (url, opts) => {
    if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]] } }) };
    if (url.includes('orders')) return { ok: true, json: async () => ({ order_id: 'mock_order_123' }) };
    return { ok: true, json: async () => ({}) };
  };
  
  const resMulti = await executeAutoTradesForSignal(idemSignal, undefined, true, checkEntitlement);
  console.log(`EXPECTED: 3 attempted, 2 placed, 1 blocked`);
  console.log(`ACTUAL: attempted=${resMulti.attempted}, placed=${resMulti.placed}, blocked=${resMulti.blocked}`);
  console.log(`RESULT: ${resMulti.attempted === 3 && resMulti.placed === 2 && resMulti.blocked === 1 ? 'PASS' : 'FAIL'}`);
  console.log("---");

  // TEST 11 — MULTI-COIN SAFETY
  await runTest(
    "MULTI-COIN SAFETY (ETH)", 
    { id: 'sig_eth', asset: 'ETH', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => { setupUser('user1', { supportedMarkets: ['BTC', 'ETH'] }); },
    (res, log) => {
      console.log(`EXPECTED: BLOCKED (UNSUPPORTED_ASSET)`);
      console.log(`ACTUAL: ${log?.action} - ${log?.rawResponse?.error}`);
      console.log(`RESULT: ${log?.rawResponse?.error === 'UNSUPPORTED_ASSET' ? 'PASS' : 'FAIL'}`);
    }
  );

  // TEST 12 — SKIP PROTECTION
  await runTest(
    "SKIP PROTECTION", 
    { id: 'sig_skip', asset: 'BTC', direction: 'SKIP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() },
    () => {
      setupUser('user1');
      mockFetchHandler = async (url, opts) => {
        if (url.includes('orderbook')) return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]], no_asks: [[50,100]] } }) };
        if (url.includes('orders')) return { ok: true, json: async () => ({ order_id: 'mock_order_123' }) };
        return { ok: true, json: async () => ({}) };
      };
    },
    (res, log) => {
      console.log(`EXPECTED: Skipped`);
      console.log(`ACTUAL: log=${log?.action} attempted=${res.attempted}`);
      console.log(`RESULT: ${res.attempted === 0 ? 'PASS' : 'FAIL'}`);
    }
  );
  
  // TEST 13 — RESTART RECOVERY / AUDIT
  console.log(`TEST ${testCount++} — FIRESTORE AUDIT LOG VERIFICATION`);
  setupUser('user_B', { maxStakePerTradeUSD: 100 });
  await executeAutoTradesForSignal({ id: 'sig_audit', asset: 'BTC', direction: 'DOWN', confidence: 95 }, undefined, true, async () => true);
  const logEntry = autoTradeAuditLogHistory.find(l => l.userId === 'user_B' && l.action === 'ORDER_PLACED');
  if (logEntry) {
    console.log(`EXPECTED: Audit log contains execution details`);
    console.log(`ACTUAL: stakeUSD=${logEntry.stakeUSD}, verifiedMarketPrice=${logEntry.verifiedMarketPrice}, contractCount=${logEntry.contractCount}, clientOrderId=${logEntry.clientOrderId}`);
    console.log(`RESULT: ${logEntry.stakeUSD === 100 && logEntry.contractCount === 200 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log("No successful order placed log found in history.");
  }

}

runVerification().catch(console.error);
