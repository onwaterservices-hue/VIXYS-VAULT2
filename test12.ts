process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY = '12345678901234567890123456789012'; 

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

const creds = {
  keyIdEncrypted: encryptString('mock_key_id'),
  privateKeyEncrypted: encryptString(privateKey),
};

userKalshiStateMap.set('user1', {
  userId: 'user1',
  userEmail: `test@test.com`,
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

async function run() {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ orderbook: { yes_asks: [[50,100]], no_asks: [[50,100]] }, order_id: 'mock123' }) } as any);
  
  await executeAutoTradesForSignal(
    { id: 'sig_skip', asset: 'BTC', direction: 'SKIP' as any, confidence: 85, expiresAt: new Date(Date.now() + 60000).toISOString() }, 
    undefined, true, async () => true
  );

  console.log("LOGS:", autoTradeAuditLogHistory);
}

run().catch(console.error);
