import re

with open('server.ts', 'r') as f:
    code = f.read()

# 1. Create checkAndSettle15mCycle function
new_settlement_func = """
const processedSettlements = new Set<string>();

async function checkAndSettle15mCycle(livePrice: number) {
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000;
  const intervalStart = Math.floor(now / intervalMs) * intervalMs;
  const intervalEnd = intervalStart + intervalMs;

  if (current15mIntervalStart !== intervalStart) {
    const prevIntervalStart = current15mIntervalStart;
    current15mIntervalStart = intervalStart;
    current15mStrikePrice = Math.round(livePrice / 10) * 10;

    if (prevIntervalStart > 0) {
      const prevSigId = `sig_lock_${prevIntervalStart}`;
      if (!processedSettlements.has(prevSigId)) {
        processedSettlements.add(prevSigId);
        
        const prevLog = persistentSignalLogs.find(s => s.id === prevSigId);
        if (prevLog && prevLog.status !== 'RESOLVED') {
          prevLog.status = 'RESOLVED';
          prevLog.resolvedAt = new Date().toISOString();
          prevLog.settlementPrice = livePrice;
          prevLog.actualOutcome = livePrice >= prevLog.targetStrike ? 'UP' : 'DOWN';
          prevLog.wasCorrect = prevLog.actualOutcome === prevLog.direction;
          prevLog.brierScore = Math.round(Math.pow((prevLog.confidence / 100) - (prevLog.wasCorrect ? 1 : 0), 2) * 1000) / 1000;

          serverLearningEngine.todaySettledCount += 1;
          serverLearningEngine.lifetimeObservations += 1;
          serverLearningEngine.settledHistory.unshift({
            id: prevLog.id,
            asset: 'BTC',
            desk: '15m',
            timestamp: prevLog.resolvedAt,
            prediction: prevLog.direction,
            confidence: prevLog.confidence,
            actualOutcome: prevLog.actualOutcome,
            brierScore: prevLog.brierScore,
          });

          // Distributed Idempotency Guard
          let isDuplicate = false;
          try {
            if (persistenceState === 'HEALTHY_FIRESTORE' && canAttemptFirestoreWrite('locks')) {
              const lockRef = doc(db, 'settlement_locks', prevSigId);
              const lockSnap = await getDoc(lockRef);
              if (lockSnap.exists()) {
                isDuplicate = true;
              } else {
                await setDoc(lockRef, { settledAt: new Date().toISOString(), timestamp: now });
              }
            }
          } catch (err) {
            // Proceed optimistically if Firestore read fails
          }

          if (!isDuplicate) {
            console.log(`\\[15M_ENGINE_SETTLED\\] Settled cycle ${new Date(prevIntervalStart).toISOString()}. Strike: $${prevLog.targetStrike}, Spot: $${livePrice}, Outcome: ${prevLog.actualOutcome} (${prevLog.wasCorrect ? 'WIN' : 'LOSS'})`);
            persistSingleSignalLog(prevLog);
          } else {
            // Silently drop duplicate log/write since it was already processed by another instance
          }
        }
      }
    }

    const newSigId = `sig_lock_${intervalStart}`;
    let newLogToPersist: PersistentSignalLogItem | null = null;
    if (!persistentSignalLogs.some(s => s.id === newSigId)) {
      const newLogItem: PersistentSignalLogItem = {
        id: newSigId,
        market: 'BTC_KALSHI_15M',
        ticker: 'BTC/USD',
        intervalStart: new Date(intervalStart).toISOString(),
        intervalEnd: new Date(intervalEnd).toISOString(),
        direction: currentDirection === 'DOWN' ? 'DOWN' : 'UP',
        confidence: currentConfidence,
        targetStrike: current15mStrikePrice,
        spotAtLock: livePrice,
        btcPriceAtLock: livePrice,
        ethPriceAtLock: currentEthPrice,
        solPriceAtLock: currentSolPrice,
        lockedAt: new Date().toISOString(),
        expiresAt: new Date(intervalEnd).toISOString(),
        status: 'LOCKED',
        modelVersion: serverLearningEngine.modelVersion,
        dataSource: 'COINBASE_KRAKEN_CASCADE',
        latencyMs: 12,
      };
      persistentSignalLogs.unshift(newLogItem);
      if (persistentSignalLogs.length > 50) {
        persistentSignalLogs.pop();
      }
      newLogToPersist = newLogItem;
    }

    if (newLogToPersist) {
      persistSingleSignalLog(newLogToPersist);
    } else {
      saveDiskStore();
    }
  }
}

function getKalshi15mMarketState(livePrice: number) {
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000; // 15 minutes = 900,000 ms
  const intervalStart = Math.floor(now / intervalMs) * intervalMs;
  const intervalEnd = intervalStart + intervalMs;
  const timeRemaining = Math.max(0, Math.floor((intervalEnd - now) / 1000));
"""

# Replace old getKalshi15mMarketState logic
old_kalshi_func_start = "function getKalshi15mMarketState(livePrice: number) {"
old_kalshi_func_end = "  const distance = livePrice - current15mStrikePrice;"

pattern = r"function getKalshi15mMarketState\(livePrice: number\) \{.*?const distance = livePrice - current15mStrikePrice;"
code = re.sub(pattern, new_settlement_func + "\n  const distance = livePrice - current15mStrikePrice;", code, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(code)

