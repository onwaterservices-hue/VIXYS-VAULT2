process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY = '12345678901234567890123456789012'; 

import * as crypto from 'crypto';
import { 
  executeAutoTradesForSignal, 
  userKalshiStateMap, 
  autoTradeAuditLogHistory,
  encryptString
} from './src/services/trading/kalshiExecutionEngine';

async function run() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const creds = {
    keyIdEncrypted: encryptString('mock_key_id'),
    privateKeyEncrypted: encryptString(privateKey),
  };

  userKalshiStateMap.set('user1', {
    userId: 'user1',
    userEmail: `user1@test.com`,
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
      supportedMarkets: ['BTC']
    }
  });

  globalThis.fetch = async (url, opts) => {
    if (url.includes('orderbook')) {
      return { ok: true, json: async () => ({ orderbook: { yes_asks: [[50, 100]] } }) } as any; 
    }
    if (url.includes('orders')) {
      return { ok: true, json: async () => ({ order_id: 'mock_order_123' }) } as any;
    }
    return { ok: true, json: async () => ({}) } as any;
  };

  await executeAutoTradesForSignal(
    { id: 'sig_valid', asset: 'BTC', direction: 'UP', confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() }, 
    undefined, 
    true, 
    async () => true
  );

  console.log("AUDIT LOG:", JSON.stringify(autoTradeAuditLogHistory[0], null, 2));
}

run().catch(console.error);
