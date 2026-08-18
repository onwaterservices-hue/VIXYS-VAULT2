const fs = require('fs');
let code = fs.readFileSync('backend.ts', 'utf8');

// 1. Make wss global
code = code.replace(
  "const wss = new WebSocketServer({ server, path: '/api/ws' });",
  "wssGlobal = new WebSocketServer({ server, path: '/api/ws' });"
);

// We need to declare wssGlobal at the top. Let's find a good spot, maybe after imports.
code = code.replace(
  "import { WebSocketServer, WebSocket } from 'ws';",
  "import { WebSocketServer, WebSocket } from 'ws';\nlet wssGlobal: WebSocketServer | null = null;\n"
);

// 2. Refactor snapshot generation into a function
const snapshotCode = `
function buildVixySnapshot() {
  globalSequenceNumber++;
  const isLocked = active15mCycle.isLocked;
  const spot = currentBtcPrice;
  const strike = isLocked ? active15mCycle.lockedStrike : current15mStrikePrice;
  const now = Date.now();
  const timeRemainingSec = Math.max(0, Math.floor((active15mCycle.intervalEnd - now) / 1000));
  
  return {
    type: 'VIXY_SNAPSHOT',
    sessionId: SERVER_SESSION_ID,
    cycleId: active15mCycle.cycleId,
    sequence: globalSequenceNumber,
    status: active15mCycle.stage,
    stage: active15mCycle.stage,
    cycleStage: active15mCycle.stage,
    isLocked,
    decision: isLocked ? active15mCycle.lockedDecision : (currentDirection === 'UP' ? 'BUY UP' : (currentDirection === 'DOWN' ? 'BUY DOWN' : 'OBSERVING...')),
    confidence: isLocked ? (active15mCycle.lockedConfidence || currentConfidence) : currentConfidence,
    confidencePct: isLocked ? (active15mCycle.lockedConfidence || Math.round(currentConfidence)) : Math.round(currentConfidence),
    lockedProbability: isLocked ? active15mCycle.lockedProbability : null,
    liveProbability: currentModelProbability,
    probabilityForLockedDirection: isLocked ? (active15mCycle.lockedDirection === 'UP' ? currentModelProbability : (1 - currentModelProbability)) : currentModelProbability,
    spot,
    strike,
    timeRemaining: timeRemainingSec,
    timeRemainingSec: timeRemainingSec,
    intervalStart: new Date(active15mCycle.intervalStart).toISOString(),
    intervalEnd: new Date(active15mCycle.intervalEnd).toISOString(),
    lockedAt: active15mCycle.lockedAt,
    dataAgeMs: now - lastMarketUpdateTs,
    algorithm: 'VIXY_AUTHORITATIVE_NEURAL_v5',
    validation: active15mCycle.validationStatus,
    validationStatus: active15mCycle.validationStatus,
    calibration: active15mCycle.calibrationStatus,
    calibrationStatus: active15mCycle.calibrationStatus,
    analysisStatus: active15mCycle.analysisStatus,
    evidenceAgreement: active15mCycle.evidenceAgreement || 'MODERATE_AGREEMENT',
    hasConflict: active15mCycle.hasConflict || false,
    signalUnstable: active15mCycle.signalUnstable || false,
    provisionalBias: active15mCycle.provisionalBias || 'NEUTRAL_BIAS',
    historicalSimilarityPct: active15mCycle.historicalSimilarityPct || 84,
    crossAssetContext: latestCrossAssetContext,
    kalshiImpliedProbability: currentKalshiImpliedProb,
    edgePct: currentEdgePct,
    edge: currentEdgePct / 100,
    lockEvaluation: latestLockEvaluation,
    guardianDecision: latestGuardianDecision,
    btc15mPipeline: latestBtc15mPipeline,
    dataFreshness: engineFeedStatus === 'CONNECTED' ? 'LIVE' : 'DEGRADED',
    lastMarketUpdateTs,
    features: {
      asset: 'BTC',
      desk: '15m',
      orderFlow: Math.round((currentBullVolumePct - 50) * 0.02 * 1000) / 1000,
      orderBookImbalance: Math.round((currentBullVolumePct - 50) * 0.02 * 1000) / 1000,
      momentum: currentMomentum,
      momentum5m: currentMomentum,
      momentumPct: currentMomentum,
      volatility: Math.min(6.5, Math.max(0.4, Math.round((Math.abs(currentMomentum) * 0.75 + 0.52) * 100) / 100)),
      volatility15m: Math.min(6.5, Math.max(0.4, Math.round((Math.abs(currentMomentum) * 0.75 + 0.52) * 100) / 100)),
      volatility15mPct: Math.min(6.5, Math.max(0.4, Math.round((Math.abs(currentMomentum) * 0.75 + 0.52) * 100) / 100)),
      regime: serverLearningEngine.currentRegime,
      regimeScore: serverLearningEngine.currentRegime === 'TRENDING' ? 85 : 45,
    },
    metrics: {
      distance: Math.round((spot - (strike || 0)) * 100) / 100,
      distanceUSD: Math.round((spot - (strike || 0)) * 100) / 100,
      regime: serverLearningEngine.currentRegime,
      direction: isLocked ? active15mCycle.lockedDirection : currentDirection,
      probability: isLocked ? active15mCycle.lockedProbability : currentModelProbability,
      confidence: isLocked ? active15mCycle.lockedConfidence : currentConfidence,
      crossVenue: {
        spot,
        kalshiStrike: strike,
        intervalStart: new Date(active15mCycle.intervalStart).toISOString(),
        intervalEnd: new Date(active15mCycle.intervalEnd).toISOString(),
        timeRemainingSec: timeRemainingSec,
        distance: Math.round((spot - (strike || 0)) * 100) / 100,
        distancePct: strike ? Math.round(((spot - strike) / strike) * 10000) / 100 : 0,
        kalshiImpliedProb: currentKalshiImpliedProb,
        polymarketImpliedProb: Math.round((currentKalshiImpliedProb - 0.02) * 100) / 100,
        spreadPct: 0.02,
      },
      computedAt: new Date(now).toISOString(),
    },
    lockedPrediction: isLocked ? {
      direction: active15mCycle.lockedDirection,
      probability: active15mCycle.lockedProbability,
      confidence: active15mCycle.lockedConfidence,
      lockedAt: active15mCycle.lockedAt,
      strike: active15mCycle.lockedStrike
    } : null,
    serverTime: new Date(now).toISOString()
  };
}

function broadcastVixySnapshot() {
  if (!wssGlobal) return;
  const snapshot = buildVixySnapshot();
  const payload = JSON.stringify(snapshot);
  wssGlobal.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
`;

code = code.replace(
  "// Continuous Live Market Data Ingestion & Prediction Loop (Every 12 seconds)",
  snapshotCode + "\n// Continuous Live Market Data Ingestion & Prediction Loop (Every 12 seconds)"
);

// We should also add a 1-second interval to broadcast the snapshot so the frontend timer stays perfectly synced.
code = code.replace(
  "// Continuous Live Market Data Ingestion & Prediction Loop (Every 12 seconds)",
  "setInterval(() => { broadcastVixySnapshot(); }, 1000);\n\n// Continuous Live Market Data Ingestion & Prediction Loop (Every 12 seconds)"
);

// Replace the wss.on connection snapshot logic to just use buildVixySnapshot
// I need to be careful with the regex. I will just replace the snapshot creation inside wss.on('connection')
const oldSnapshotStart = "        globalSequenceNumber++;\n        const isLocked = active15mCycle.isLocked;\n        const spot = currentBtcPrice;\n        const strike = isLocked ? active15mCycle.lockedStrike : current15mStrikePrice;\n        const snapshot = {";

const oldSnapshotReplacement = "        const snapshot = buildVixySnapshot();\n        // ";

code = code.replace(oldSnapshotStart, oldSnapshotReplacement);

fs.writeFileSync('backend.ts', code);
console.log('Successfully patched backend.ts');
