const fs = require('fs');
const path = 'src/services/trading/kalshiExecutionEngine.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('const AUTO_TRADING_LIVE_ENABLED')) {
  content = content.replace(
    'export const executedSignalIdSet = new Set<string>();',
    'export const executedSignalIdSet = new Set<string>();\n\nexport const AUTO_TRADING_LIVE_ENABLED = false;\n'
  );
}

const fetchMarketPriceFn = `
export async function fetchKalshiMarketPrice(
  environment: 'live' | 'paper',
  marketTicker: string,
  side: 'yes' | 'no'
): Promise<number | null> {
  const baseUrl = environment === 'paper'
    ? 'https://demo-api.kalshi.com/trade-api/v2'
    : 'https://api.elections.kalshi.com/trade-api/v2';
  
  const path = \`/markets/\${marketTicker}/orderbook\`;

  try {
    const res = await fetch(\`\${baseUrl}\${path}\`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.orderbook) {
      const asks = side === 'yes' ? data.orderbook.yes_asks : data.orderbook.no_asks;
      if (asks && asks.length > 0) {
        return asks[0][0] / 100.0;
      }
    }
  } catch (err) {
    console.error(\`[Kalshi Pricing Error] Failed to fetch price for \${marketTicker}:\`, err);
  }
  return null;
}
`;

const startIdx = content.indexOf('export async function executeAutoTradesForSignal');
const newExecuteFn = `
export async function executeAutoTradesForSignal(
  signal: any,
  firestoreDb?: any,
  globalAutoTradingEnabled: boolean = true,
  checkUserEntitlement?: (userId: string) => Promise<boolean>
): Promise<{
  attempted: number;
  placed: number;
  blocked: number;
  skipped: number;
  failed: number;
}> {
  const summary = { attempted: 0, placed: 0, blocked: 0, skipped: 0, failed: 0 };
  
  if (!globalAutoTradingEnabled) {
    console.warn('[Kalshi Execution] GLOBAL MASTER KILL SWITCH IS ACTIVE. Aborting all auto-trades.');
    return summary;
  }

  const signalId = signal.id || signal.cycleId || \`sig_\${Date.now()}\`;
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
          userKalshiStateMap.set(doc.id, data);
        }
      });
    } catch (err) {
      console.error("[Kalshi] Error querying enabled users from Firestore:", err);
    }
  }

  if (enabledUsers.length === 0) {
    for (const [userId, userState] of userKalshiStateMap.entries()) {
      if (userState.autoTradeConfig?.enabled) {
        enabledUsers.push(userState);
      }
    }
  }

  const executionPromises = enabledUsers.map(async (userState) => {
    const userId = userState.userId || userState.userEmail?.toLowerCase();
    if (!userId) return { status: 'skipped', reason: 'no_user_id' };

    const config = userState.autoTradeConfig;
    const creds = userState.credentials;

    if (!config || !config.enabled || !creds || !creds.configured) {
      return { status: 'skipped', reason: 'not_configured_or_enabled' };
    }

    if (checkUserEntitlement) {
      const isEntitled = await checkUserEntitlement(userId);
      if (!isEntitled) {
        console.warn(\`[Kalshi Execution] User \${userId} failed subscription check. Disabling auto-trade.\`);
        if (firestoreDb) {
          await setDoc(doc(firestoreDb, "kalshi_credentials", userId), {
            autoTradeConfig: { ...config, enabled: false, autoDisabledReason: 'Elite Pass subscription expired or invalid.' },
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        return { status: 'blocked', reason: 'subscription_expired' };
      }
    }

    const environment = config.environment || creds.environment || 'paper';
    if (environment === 'live' && !AUTO_TRADING_LIVE_ENABLED) {
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: 0, stakeUSD: 0, action: 'BLOCKED', status: 'BLOCKED', rawResponse: { error: 'LIVE_EXECUTION_DISABLED' }, details: 'Live execution is globally disabled.' }, firestoreDb);
      return { status: 'blocked', reason: 'live_disabled' };
    }

    const supported = config.supportedMarkets || ['BTC'];
    if (!supported.includes(asset)) {
      return { status: 'skipped', reason: 'market_not_supported' };
    }

    const userThreshold = config.confidenceThreshold || 80;
    if (confidence < userThreshold) {
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: config.maxStakePerTradeUSD || 25, action: 'SKIPPED_THRESHOLD', status: 'SKIPPED', rawResponse: { message: \`Signal confidence \${confidence}% is below user threshold \${userThreshold}%\` }, details: \`Skipped trade: \${confidence}% confidence < \${userThreshold}% threshold\` }, firestoreDb);
      return { status: 'skipped', reason: 'below_threshold' };
    }

    let alreadyExecuted = false;
    if (firestoreDb) {
      const dedupeRef = doc(firestoreDb, "auto_trade_dedupe", \`\${signalId}_\${userId}\`);
      try {
        await runTransaction(firestoreDb, async (transaction) => {
          const docSnap = await transaction.get(dedupeRef);
          if (docSnap.exists()) {
            alreadyExecuted = true;
          } else {
            transaction.set(dedupeRef, { signalId, userId, executedAt: new Date().toISOString() });
          }
        });
      } catch (err) {
        console.error(\`[Kalshi] Transaction failed/deduplicated for key \${signalId}_\${userId}:\`, err);
        alreadyExecuted = true; 
      }
    } else {
      const dedupeKey = \`\${signalId}_\${userId}\`;
      if (executedSignalIdSet.has(dedupeKey)) {
        alreadyExecuted = true;
      } else {
        executedSignalIdSet.add(dedupeKey);
      }
    }

    if (alreadyExecuted) {
      return { status: 'skipped', reason: 'already_executed' };
    }

    const keyId = decryptString(creds.keyIdEncrypted);
    const privateKey = decryptString(creds.privateKeyEncrypted);

    if (!keyId || !privateKey) {
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: config.maxStakePerTradeUSD || 25, action: 'FAILED', status: 'FAILED', rawResponse: { error: 'Credential decryption failed' }, details: 'Decryption failed: stored private key could not be decrypted.' }, firestoreDb);
      return { status: 'failed', reason: 'decryption_failed' };
    }

    const side = direction === 'UP' ? 'yes' : 'no';
    
    const verifiedMarketPrice = await fetchKalshiMarketPrice(environment, targetSeries, side);
    
    if (!verifiedMarketPrice || verifiedMarketPrice <= 0 || verifiedMarketPrice >= 1.0) {
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: config.maxStakePerTradeUSD || 25, action: 'FAILED', status: 'FAILED', rawResponse: { error: 'EXECUTION_ABORTED_UNSAFE_PRICE' }, details: \`Failed to obtain a safe, executable market price for \${targetSeries} \${side}\` }, firestoreDb);
      return { status: 'failed', reason: 'unsafe_price' };
    }

    const requestedStakeUSD = Math.max(1, config.maxStakePerTradeUSD || 25);
    const maxDailyExposureUSD = Math.max(requestedStakeUSD, config.maxDailyExposureUSD || 100);
    const currentDailyExposure = await getDailyExposureForUser(userId, firestoreDb);

    let contractCount = Math.floor(requestedStakeUSD / verifiedMarketPrice);
    if (contractCount < 1) {
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: requestedStakeUSD, action: 'BLOCKED', status: 'BLOCKED', rawResponse: { error: 'INSUFFICIENT_STAKE_FOR_1_CONTRACT' }, details: \`Max stake $\${requestedStakeUSD} is less than contract price $\${verifiedMarketPrice}\` }, firestoreDb);
      return { status: 'blocked', reason: 'insufficient_stake' };
    }
    
    const actualOrderCost = contractCount * verifiedMarketPrice;
    
    if (currentDailyExposure + actualOrderCost > maxDailyExposureUSD) {
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: actualOrderCost, action: 'BLOCKED_BY_CAP', status: 'BLOCKED', rawResponse: { currentDailyExposure, attemptedCost: actualOrderCost, maxDailyExposureUSD }, details: \`Blocked by exposure cap: daily exposure ($\${currentDailyExposure + actualOrderCost}) exceeds cap ($\${maxDailyExposureUSD})\` }, firestoreDb);
      return { status: 'blocked', reason: 'exposure_cap' };
    }

    const clientOrderId = crypto.randomUUID();
    
    let executionId = \`exec_\${Date.now()}_\${clientOrderId.substring(0, 8)}\`;
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, "auto_trade_executions", executionId), {
          executionId,
          userId,
          signalId,
          marketTicker: targetSeries,
          vixyDecision: direction,
          decisionTimestamp: new Date().toISOString(),
          confidence,
          lockQuality: signal.lockQuality || null,
          requestedStakeUSD,
          verifiedMarketPrice,
          contractCount,
          clientOrderId,
          kalshiOrderId: null,
          executionStatus: 'SUBMITTED',
          fillPrice: null,
          filledQuantity: null,
          settlementOutcome: null,
          errorCode: null,
          errorDetails: null,
          environment,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to create immutable execution log", e);
      }
    }

    const orderResult = await submitKalshiOrder({
      keyId,
      rawPrivateKey: privateKey,
      environment,
      marketTicker: targetSeries,
      side,
      count: contractCount,
      clientOrderId,
    });

    if (orderResult.success) {
      config.consecutiveFailures = 0;
      config.autoDisabledReason = null;
      recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: actualOrderCost, action: 'ORDER_PLACED', status: 'SUCCESS', rawResponse: orderResult.rawResponse, details: \`Successfully placed \${contractCount}x \${side.toUpperCase()} contracts on Kalshi (\${targetSeries}) at $\${verifiedMarketPrice} for $\${actualOrderCost}\` }, firestoreDb);
      
      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, "auto_trade_executions", executionId), {
            kalshiOrderId: orderResult.orderId || null,
            executionStatus: 'PENDING',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          await setDoc(doc(firestoreDb, "kalshi_credentials", userId), {
            autoTradeConfig: config,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {}
      }
      return { status: 'placed' };
    } else {
      config.consecutiveFailures = (config.consecutiveFailures || 0) + 1;
      let isKilled = false;
      if (config.consecutiveFailures >= 3) {
        config.enabled = false;
        config.autoDisabledReason = \`Kill switch triggered: \${config.consecutiveFailures} consecutive execution errors.\`;
        isKilled = true;
        recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: actualOrderCost, action: 'KILL_SWITCH_TRIGGERED', status: 'FAILED', rawResponse: orderResult.rawResponse, details: \`KILL SWITCH ENGAGED: Auto-trading disabled after \${config.consecutiveFailures} failures (\${orderResult.error})\` }, firestoreDb);
      } else {
        recordAuditLog({ userId, userEmail: userState.userEmail, signalId, asset, direction, confidence, threshold: userThreshold, stakeUSD: actualOrderCost, action: 'FAILED', status: 'FAILED', rawResponse: orderResult.rawResponse, details: \`Order submission failed: \${orderResult.error} (\${config.consecutiveFailures}/3 failures)\` }, firestoreDb);
      }
      
      const executionStatus = (orderResult.statusCode === 504 || orderResult.statusCode === 502) ? 'RECONCILIATION_REQUIRED' : 'FAILED';
      
      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, "auto_trade_executions", executionId), {
            executionStatus,
            errorCode: orderResult.statusCode,
            errorDetails: orderResult.error,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          await setDoc(doc(firestoreDb, "kalshi_credentials", userId), {
            autoTradeConfig: config,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {}
      }
      return { status: 'failed', killed: isKilled };
    }
  });

  const results = await Promise.allSettled(executionPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const st = result.value.status;
      if (st === 'placed') summary.placed++;
      else if (st === 'blocked') summary.blocked++;
      else if (st === 'failed') summary.failed++;
      else if (st === 'skipped') summary.skipped++;
      summary.attempted++;
    } else {
      summary.failed++;
      console.error("[Kalshi Execution Error in Promise.allSettled]:", result.reason);
    }
  }

  return summary;
}

export async function reconcilePendingExecutions(firestoreDb: any) {
  if (!firestoreDb) return;
  console.log('[Kalshi] Starting execution reconciliation loop...');
  try {
    const q = query(
      collection(firestoreDb, "auto_trade_executions"),
      where("executionStatus", "in", ["PENDING", "SUBMITTED", "PARTIALLY_FILLED", "RECONCILIATION_REQUIRED"])
    );
    const qSnap = await getDocs(q);
    
    qSnap.forEach((docSnap) => {
      console.log(\`[Kalshi] Found unresolved execution \${docSnap.id}. Requires API reconciliation.\`);
    });
  } catch (err) {
    console.error("[Kalshi] Error during execution reconciliation:", err);
  }
}
`;

content = content.substring(0, startIdx) + fetchMarketPriceFn + newExecuteFn;
fs.writeFileSync(path, content, 'utf8');
