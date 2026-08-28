import crypto from 'crypto';
import { KalshiAutoTradeConfig, AutoTradeAuditLog } from '../../types';
import { collection, doc, getDoc, getDocs, query, where, setDoc, runTransaction } from 'firebase/firestore';

// Defer encryption key resolution; enforce explicit encryption key in production and throw if unconfigured
function getEncryptionKey(): Buffer {
  const secret = process.env.KALSHI_CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      '[Kalshi Security Error] KALSHI_CREDENTIAL_ENCRYPTION_KEY (or ENCRYPTION_KEY) environment variable is required to securely encrypt/decrypt trading credentials.'
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedCredentials {
  keyIdEncrypted: { iv: string; tag: string; encryptedData: string };
  privateKeyEncrypted: { iv: string; tag: string; encryptedData: string };
  environment: 'live' | 'paper';
  configured: boolean;
  updatedAt: string;
}

export interface StoredUserKalshiState {
  userId: string;
  userEmail: string;
  credentials?: EncryptedCredentials;
  autoTradeConfig: KalshiAutoTradeConfig;
}

// In-memory runtime cache for lightning-fast cycle execution
export const userKalshiStateMap = new Map<string, StoredUserKalshiState>();
export const autoTradeAuditLogHistory: AutoTradeAuditLog[] = [];
export const executedSignalIdSet = new Set<string>();

/**
 * AES-256-GCM symmetric encryption for securing private keys at rest
 */
export function encryptString(plaintext: string): { iv: string; tag: string; encryptedData: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    tag,
    encryptedData: encrypted,
  };
}

/**
 * AES-256-GCM symmetric decryption
 */
export function decryptString(payload: { iv: string; tag: string; encryptedData: string }): string | null {
  if (!payload || !payload.encryptedData || !payload.iv || !payload.tag) return null;
  try {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
    let decrypted = decipher.update(payload.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('[Kalshi Security] Decryption error:', err?.message);
    return null;
  }
}

/**
 * Parses and verifies RSA Private Key in PKCS#1, PKCS#8, or base64 DER formats
 */
export function parseKalshiPrivateKey(rawKey: string): crypto.KeyObject | null {
  if (!rawKey) return null;
  let keyStr = String(rawKey).trim();
  if ((keyStr.startsWith('"') && keyStr.endsWith('"')) || (keyStr.startsWith("'") && keyStr.endsWith("'"))) {
    keyStr = keyStr.slice(1, -1).trim();
  }
  keyStr = keyStr.replace(/\\n/g, '\n');

  try {
    return crypto.createPrivateKey(keyStr);
  } catch {}

  if (!keyStr.includes('-----BEGIN')) {
    try {
      const decodedUtf8 = Buffer.from(keyStr, 'base64').toString('utf8');
      if (decodedUtf8.includes('-----BEGIN')) {
        try {
          return crypto.createPrivateKey(decodedUtf8);
        } catch {}
      }
    } catch {}

    try {
      const derBuffer = Buffer.from(keyStr, 'base64');
      try {
        return crypto.createPrivateKey({ key: derBuffer, format: 'der', type: 'pkcs8' });
      } catch {
        return crypto.createPrivateKey({ key: derBuffer, format: 'der', type: 'pkcs1' });
      }
    } catch {}
  }

  const cleanBody = keyStr
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (cleanBody) {
    const wrappedBody = cleanBody.match(/.{1,64}/g)?.join('\n') || cleanBody;
    const reconstructedPkcs8 = `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----`;
    try {
      return crypto.createPrivateKey(reconstructedPkcs8);
    } catch {}
    const reconstructedPkcs1 = `-----BEGIN RSA PRIVATE KEY-----\n${wrappedBody}\n-----END RSA PRIVATE KEY-----`;
    try {
      return crypto.createPrivateKey(reconstructedPkcs1);
    } catch {}
  }

  return null;
}

/**
 * Signs a request using RSA-PSS or RSA-SHA256 signature according to Kalshi Trade API v2 specification
 */
export function signKalshiRequest(
  method: string,
  requestPath: string,
  timestampMs: string,
  privateKeyObj: crypto.KeyObject
): string {
  const pathWithoutQuery = requestPath.split('?')[0];
  const message = `${timestampMs}${method.toUpperCase()}${pathWithoutQuery}`;
  
  try {
    // Try RSA-PSS first (preferred by Kalshi v2)
    return crypto.sign('sha256', Buffer.from(message), {
      key: privateKeyObj,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    }).toString('base64');
  } catch {
    // Fallback to standard RSA-SHA256
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(message);
    signer.end();
    return signer.sign(privateKeyObj, 'base64');
  }
}

/**
 * Mask API Key ID for safe UI display (e.g. kalshi_sec_9810239102 -> kalshi_sec_****9102)
 */
export function maskKeyId(keyId: string): string {
  if (!keyId) return '';
  const clean = keyId.trim();
  if (clean.length <= 8) return '****' + clean.slice(-4);
  const prefix = clean.slice(0, Math.min(10, Math.floor(clean.length / 2) - 2));
  const suffix = clean.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Default auto-trade configuration for a new user (OFF by default)
 */
export function createDefaultAutoTradeConfig(): KalshiAutoTradeConfig {
  return {
    enabled: false, // Default is strictly OFF
    confidenceThreshold: 80, // 80% default confidence
    maxStakePerTradeUSD: 25, // $25 per position
    maxDailyExposureUSD: 100, // $100 max daily cap
    supportedMarkets: ['BTC', 'ETH', 'SOL'],
    environment: 'paper', // Changed from 'live' to 'paper' as per Fix 2, step 5
    consecutiveFailures: 0,
    autoDisabledReason: null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Real Kalshi API Handshake Test - Performs live signed cryptographic request
 */
export async function testKalshiHandshake(
  keyId: string,
  rawPrivateKey: string,
  environment: 'live' | 'paper' = 'live'
): Promise<{
  success: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
  latencyMs: number;
  statusCode: number;
  balance?: number | null;
  message: string;
  rawResponse?: any;
}> {
  const startTime = Date.now();

  const keyObj = parseKalshiPrivateKey(rawPrivateKey);
  if (!keyObj) {
    return {
      success: false,
      status: 'DISCONNECTED',
      latencyMs: Date.now() - startTime,
      statusCode: 400,
      message: 'Invalid RSA Private Key format. Ensure key begins with -----BEGIN RSA PRIVATE KEY----- or -----BEGIN PRIVATE KEY-----',
    };
  }

  const baseUrl = environment === 'paper'
    ? 'https://demo-api.kalshi.com/trade-api/v2'
    : 'https://api.elections.kalshi.com/trade-api/v2';

  const path = '/trade-api/v2/portfolio/balance';
  const timestamp = Date.now().toString();

  let signature: string;
  try {
    signature = signKalshiRequest('GET', path, timestamp, keyObj);
  } catch (err: any) {
    return {
      success: false,
      status: 'DISCONNECTED',
      latencyMs: Date.now() - startTime,
      statusCode: 500,
      message: `RSA Signing error: ${err?.message || 'Failed to sign message'}`,
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'KALSHI-ACCESS-KEY': keyId.trim(),
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': signature,
  };

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000),
    });

    const latencyMs = Date.now() - startTime;
    const resData = await res.json().catch(() => ({}));

    if (res.ok) {
      const balanceUsd = typeof resData?.balance === 'number' ? resData.balance / 100 : null;
      return {
        success: true,
        status: 'CONNECTED',
        latencyMs,
        statusCode: res.status,
        balance: balanceUsd,
        message: `Kalshi ${environment.toUpperCase()} handshake verified successfully (${latencyMs}ms). Authenticated portfolio connected.`,
        rawResponse: resData,
      };
    } else {
      const errorMessage = resData?.message || resData?.error || `Kalshi API returned HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        status: 'DISCONNECTED',
        latencyMs,
        statusCode: res.status,
        message: errorMessage,
        rawResponse: resData,
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      status: 'DISCONNECTED',
      latencyMs,
      statusCode: 503,
      message: `Network connection to Kalshi ${environment.toUpperCase()} gateway timed out or unreachable (${err?.message || 'Connection error'}).`,
    };
  }
}

/**
 * Computes today's total executed stake exposure for a user from Firestore
 */
export async function getDailyExposureForUser(userId: string, firestoreDb?: any): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  if (firestoreDb) {
    try {
      const logsRef = collection(firestoreDb, 'auto_trade_logs');
      const q = query(
        logsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', startOfDayIso)
      );
      const qSnap = await getDocs(q);
      let sum = 0;
      qSnap.forEach((doc) => {
        const data = doc.data();
        if (data.action === 'ORDER_PLACED' || data.status === 'SUCCESS') {
          sum += (data.stakeUSD || 0);
        }
      });
      return sum;
    } catch (err) {
      console.error(`[Kalshi] Error calculating daily exposure from Firestore for user ${userId}:`, err);
    }
  }

  // Fallback to local cache in case Firestore is unavailable
  return autoTradeAuditLogHistory
    .filter((log) => log.userId === userId && log.timestamp >= startOfDayIso && (log.action === 'ORDER_PLACED' || log.status === 'SUCCESS'))
    .reduce((sum, log) => sum + (log.stakeUSD || 0), 0);
}

/**
 * Places a live signed order on Kalshi Trade API v2
 */
export async function submitKalshiOrder(params: {
  keyId: string;
  rawPrivateKey: string;
  environment: 'live' | 'paper';
  marketTicker: string;
  side: 'yes' | 'no';
  count: number;
  clientOrderId: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  statusCode: number;
  rawResponse: any;
  error?: string;
}> {
  const keyObj = parseKalshiPrivateKey(params.rawPrivateKey);
  if (!keyObj) {
    return {
      success: false,
      statusCode: 400,
      rawResponse: null,
      error: 'Invalid RSA private key for order submission',
    };
  }

  const baseUrl = params.environment === 'paper'
    ? 'https://demo-api.kalshi.com/trade-api/v2'
    : 'https://api.elections.kalshi.com/trade-api/v2';

  const path = '/trade-api/v2/portfolio/orders';
  const timestamp = Date.now().toString();

  const body = {
    ticker: params.marketTicker,
    action: 'buy',
    type: 'market',
    side: params.side,
    count: Math.max(1, Math.floor(params.count)),
    client_order_id: params.clientOrderId,
  };

  let signature: string;
  try {
    signature = signKalshiRequest('POST', path, timestamp, keyObj);
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      rawResponse: null,
      error: `Failed to generate RSA signature: ${err?.message}`,
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'KALSHI-ACCESS-KEY': params.keyId.trim(),
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': signature,
  };

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const resData = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        success: true,
        orderId: resData?.order?.order_id || resData?.order_id || params.clientOrderId,
        statusCode: res.status,
        rawResponse: resData,
      };
    } else {
      const errDetail = resData?.message || resData?.error || `HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        statusCode: res.status,
        rawResponse: resData,
        error: errDetail,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      statusCode: 503,
      rawResponse: { error: err?.message },
      error: `Network error reaching Kalshi: ${err?.message}`,
    };
  }
}

/**
 * Append audit log to in-memory history and Firestore
 */
export function recordAuditLog(
  logData: Omit<AutoTradeAuditLog, 'id' | 'timestamp'>,
  firestoreDb?: any
): AutoTradeAuditLog {
  const auditLog: AutoTradeAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...logData,
  };

  autoTradeAuditLogHistory.unshift(auditLog);
  if (autoTradeAuditLogHistory.length > 500) {
    autoTradeAuditLogHistory.pop();
  }

  if (firestoreDb) {
    setDoc(doc(firestoreDb, 'auto_trade_logs', auditLog.id), auditLog).catch((err) => {
      console.error('[Kalshi] Failed to write audit log to Firestore:', err);
    });
  }

  return auditLog;
}

/**
 * Main Auto-Trading Signal Execution Dispatcher
 * Triggered automatically when a high-integrity signal locks
 */
export async function executeAutoTradesForSignal(
  signal: {
    id: string;
    cycleId?: string;
    asset: string;
    direction: 'UP' | 'DOWN';
    confidence: number;
    strike?: number;
    price?: number;
  },
  firestoreDb?: any
): Promise<{
  attempted: number;
  placed: number;
  blocked: number;
  skipped: number;
  failed: number;
}> {
  const summary = { attempted: 0, placed: 0, blocked: 0, skipped: 0, failed: 0 };
  const signalId = signal.id || signal.cycleId || `sig_${Date.now()}`;
  const asset = (signal.asset || 'BTC').toUpperCase();
  const direction = signal.direction === 'UP' ? 'UP' : 'DOWN';
  const confidence = Math.round(signal.confidence || 0);

  const seriesTickerMap: Record<string, string> = {
    BTC: 'KXBTC15M',
    ETH: 'KXETH15M',
    SOL: 'KXSOL15M',
    XRP: 'KXXRP15M',
    DOGE: 'KXDOGE15M',
    ADA: 'KXADA15M',
  };
  const targetSeries = seriesTickerMap[asset] || 'KXBTC15M';

  // 1. Query Firestore directly for every enabled user configuration
  let enabledUsers: StoredUserKalshiState[] = [];
  if (firestoreDb) {
    try {
      const q = query(
        collection(firestoreDb, "kalshi_credentials"),
        where("autoTradeConfig.enabled", "==", true)
      );
      const qSnap = await getDocs(q);
      qSnap.forEach((doc) => {
        const data = doc.data() as StoredUserKalshiState;
        if (data) {
          enabledUsers.push(data);
          userKalshiStateMap.set(doc.id, data); // Refresh cache
        }
      });
    } catch (err) {
      console.error("[Kalshi] Error querying enabled users from Firestore:", err);
    }
  }

  // Fallback to local cache if Firestore returns nothing
  if (enabledUsers.length === 0) {
    for (const [userId, userState] of userKalshiStateMap.entries()) {
      if (userState.autoTradeConfig?.enabled) {
        enabledUsers.push(userState);
      }
    }
  }

  for (const userState of enabledUsers) {
    const userId = userState.userId || userState.userEmail?.toLowerCase();
    if (!userId) continue;

    const config = userState.autoTradeConfig;
    const creds = userState.credentials;

    if (!config || !config.enabled) {
      continue;
    }

    if (!creds || !creds.configured) {
      continue;
    }

    const supported = config.supportedMarkets || ['BTC'];
    if (!supported.includes(asset)) {
      continue;
    }

    const userThreshold = config.confidenceThreshold || 80;
    if (confidence < userThreshold) {
      recordAuditLog(
        {
          userId,
          userEmail: userState.userEmail,
          signalId,
          asset,
          direction,
          confidence,
          threshold: userThreshold,
          stakeUSD: config.maxStakePerTradeUSD || 25,
          action: 'SKIPPED_THRESHOLD',
          status: 'SKIPPED',
          rawResponse: { message: `Signal confidence ${confidence}% is below user threshold ${userThreshold}%` },
          details: `Skipped trade: ${confidence}% confidence < ${userThreshold}% threshold`,
        },
        firestoreDb
      );
      summary.skipped++;
      continue;
    }

    // 2. Atomic Idempotency guard using Firestore runTransaction
    let alreadyExecuted = false;
    if (firestoreDb) {
      const dedupeRef = doc(firestoreDb, "auto_trade_dedupe", `${signalId}_${userId}`);
      try {
        await runTransaction(firestoreDb, async (transaction) => {
          const docSnap = await transaction.get(dedupeRef);
          if (docSnap.exists()) {
            alreadyExecuted = true;
          } else {
            transaction.set(dedupeRef, {
              signalId,
              userId,
              executedAt: new Date().toISOString()
            });
          }
        });
      } catch (err) {
        console.error(`[Kalshi] Transaction failed/deduplicated for key ${signalId}_${userId}:`, err);
        alreadyExecuted = true; // Safe fallback: treat contention as executed to prevent double buying
      }
    } else {
      const dedupeKey = `${signalId}_${userId}`;
      if (executedSignalIdSet.has(dedupeKey)) {
        alreadyExecuted = true;
      } else {
        executedSignalIdSet.add(dedupeKey);
      }
    }

    if (alreadyExecuted) {
      continue;
    }

    summary.attempted++;

    const keyId = decryptString(creds.keyIdEncrypted);
    const privateKey = decryptString(creds.privateKeyEncrypted);

    if (!keyId || !privateKey) {
      recordAuditLog(
        {
          userId,
          userEmail: userState.userEmail,
          signalId,
          asset,
          direction,
          confidence,
          threshold: userThreshold,
          stakeUSD: config.maxStakePerTradeUSD || 25,
          action: 'FAILED',
          status: 'FAILED',
          rawResponse: { error: 'Credential decryption failed' },
          details: 'Decryption failed: stored private key could not be decrypted.',
        },
        firestoreDb
      );
      summary.failed++;
      continue;
    }

    const stakeUSD = Math.max(1, config.maxStakePerTradeUSD || 25);
    const maxDailyExposureUSD = Math.max(stakeUSD, config.maxDailyExposureUSD || 100);
    const currentDailyExposure = await getDailyExposureForUser(userId, firestoreDb);

    if (currentDailyExposure + stakeUSD > maxDailyExposureUSD) {
      recordAuditLog(
        {
          userId,
          userEmail: userState.userEmail,
          signalId,
          asset,
          direction,
          confidence,
          threshold: userThreshold,
          stakeUSD,
          action: 'BLOCKED_BY_CAP',
          status: 'BLOCKED',
          rawResponse: {
            currentDailyExposure,
            attemptedStake: stakeUSD,
            maxDailyExposureUSD,
          },
          details: `Blocked by exposure cap: daily exposure ($${currentDailyExposure + stakeUSD}) exceeds cap ($${maxDailyExposureUSD})`,
        },
        firestoreDb
      );
      summary.blocked++;
      continue;
    }

    const side = direction === 'UP' ? 'yes' : 'no';
    const estimatedContractPrice = 0.50;
    const contractCount = Math.max(1, Math.floor(stakeUSD / estimatedContractPrice));
    const clientOrderId = `vixy_${Date.now()}_${userId.slice(-6)}`;

    const orderResult = await submitKalshiOrder({
      keyId,
      rawPrivateKey: privateKey,
      environment: config.environment || creds.environment || 'live',
      marketTicker: targetSeries,
      side,
      count: contractCount,
      clientOrderId,
    });

    if (orderResult.success) {
      config.consecutiveFailures = 0;
      config.autoDisabledReason = null;

      recordAuditLog(
        {
          userId,
          userEmail: userState.userEmail,
          signalId,
          asset,
          direction,
          confidence,
          threshold: userThreshold,
          stakeUSD,
          action: 'ORDER_PLACED',
          status: 'SUCCESS',
          rawResponse: orderResult.rawResponse,
          details: `Successfully placed ${contractCount}x ${side.toUpperCase()} contracts on Kalshi (${targetSeries}) for $${stakeUSD}`,
        },
        firestoreDb
      );
      summary.placed++;
      console.log(`[Kalshi Auto-Trade] SUCCESS: Placed order for user ${userId} on ${targetSeries} (Stake: $${stakeUSD})`);
    } else {
      config.consecutiveFailures = (config.consecutiveFailures || 0) + 1;
      summary.failed++;

      if (config.consecutiveFailures >= 3) {
        config.enabled = false;
        config.autoDisabledReason = `Kill switch triggered: ${config.consecutiveFailures} consecutive execution errors. Please check your Kalshi balance and API credentials.`;

        recordAuditLog(
          {
            userId,
            userEmail: userState.userEmail,
            signalId,
            asset,
            direction,
            confidence,
            threshold: userThreshold,
            stakeUSD,
            action: 'KILL_SWITCH_TRIGGERED',
            status: 'FAILED',
            rawResponse: orderResult.rawResponse,
            details: `KILL SWITCH ENGAGED: Auto-trading disabled after ${config.consecutiveFailures} consecutive failures (${orderResult.error})`,
          },
          firestoreDb
        );

        console.error(`[Kalshi Kill Switch] User ${userId} auto-trade automatically disabled due to 3 consecutive failures.`);
      } else {
        recordAuditLog(
          {
            userId,
            userEmail: userState.userEmail,
            signalId,
            asset,
            direction,
            confidence,
            threshold: userThreshold,
            stakeUSD,
            action: 'FAILED',
            status: 'FAILED',
            rawResponse: orderResult.rawResponse,
            details: `Order submission failed: ${orderResult.error} (${config.consecutiveFailures}/3 consecutive failures)`,
          },
          firestoreDb
        );
      }
    }

    // Persist configuration update (consecutiveFailures, autoDisabledReason, enabled status) to Firestore
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "kalshi_credentials", userId), {
          autoTradeConfig: config,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("[Kalshi] Error persisting autoTradeConfig updates to Firestore:", err);
      }
    }
  }

  return summary;
}
