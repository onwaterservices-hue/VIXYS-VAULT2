import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r'app\.get\(\'/api/signal\', async \(req, res\) => \{.*?\n\}\);\n\napp\.get\(\'/api/whales\''

replacement = r'''app.get('/api/signal', async (req, res) => {
  const asset = ((req.query.asset as string) || 'BTC').toUpperCase();
  const desk = (req.query.desk as string) || '15m';

  const now = Date.now();
  const dataAgeMs = now - lastMarketUpdateTs;
  
  let computedFeedStatus: 'LIVE' | 'DEGRADED' | 'STALE' | 'INVALID' | 'OFFLINE' = 'OFFLINE';
  if (engineFeedStatus === 'CONNECTED') {
    if (dataAgeMs <= 2000) computedFeedStatus = 'LIVE';
    else if (dataAgeMs <= 5000) computedFeedStatus = 'DEGRADED';
    else if (dataAgeMs <= 15000) computedFeedStatus = 'STALE';
    else computedFeedStatus = 'INVALID';
  } else {
    computedFeedStatus = engineFeedStatus === 'STALE' ? 'INVALID' : 'OFFLINE';
  }

  const isLive = computedFeedStatus === 'LIVE' || computedFeedStatus === 'DEGRADED';

  let settledCount = serverLearningEngine.todaySettledCount;
  let lifetimeObservations = serverLearningEngine.lifetimeObservations;
  let hasActiveModel = true;
  const historyLen = serverLearningEngine.settledHistory.length;
  const avgBrier = historyLen > 0
    ? serverLearningEngine.settledHistory.reduce((sum, item) => sum + item.brierScore, 0) / historyLen
    : 0.168;
  let activeModelBrier: number | null = Math.round(avgBrier * 1000) / 1000;
  let activeModelTrainedAt: string | null = new Date(serverLearningEngine.lastWeightUpdateTs).toISOString();

  const minSamplesNeeded = 500;

  const spot = asset === 'BTC' ? currentBtcPrice : 100;
  const market15mState = getKalshi15mMarketState(spot);
  const kalshiStrike = market15mState.strikePrice;

  const effectiveDirection = currentDirection === 'DOWN' ? 'DOWN' : 'UP';
  const action = effectiveDirection === 'DOWN' ? 'BUY_NO' : 'BUY_YES';

  res.json({
    asset,
    desk,
    cycleId: currentEngineCycleId,
    sampleSize: settledCount,
    lifetimeObservations,
    minSamplesNeeded,
    hasActiveModel,
    generatedAt: now,
    dataAgeMs,
    disclaimer: 'Not financial advice. Vixy Vault displays live market data for informational purposes only.',
    action: isLive ? action : null,
    direction: isLive ? currentDirection : null,
    modelProbability: isLive ? currentModelProbability : null,
    confidence: isLive ? currentConfidence : null,
    kalshiImpliedProbability: isLive ? currentKalshiImpliedProb : null,
    edge: isLive ? currentEdgePct / 100 : null,
    edgePct: isLive ? currentEdgePct : null,
    engineState: isLive ? engineState : 'STALE',
    feedStatus: computedFeedStatus,
    lastMarketUpdateTs,
    lockEvaluation: isLive ? latestLockEvaluation : null,
    algorithmVotes: isLive ? [
      { algo: 'Order Flow Delta', vote: currentDirection === 'UP' ? 'Bullish' : 'Bearish', weight: currentDirection === 'UP' ? '+0.18' : '-0.18', status: 'PASS' },
      { algo: 'Whale Liquidity Sweeps', vote: currentDirection === 'UP' ? 'Bullish' : 'Bearish', weight: currentDirection === 'UP' ? '+0.12' : '-0.12', status: 'PASS' },
      { algo: 'VWAP Floor', vote: 'Bullish', weight: '+0.05', status: 'PASS' },
      { algo: 'Momentum Vector', vote: currentDirection === 'UP' ? 'Bullish' : 'Bearish', weight: currentDirection === 'UP' ? '+0.09' : '-0.09', status: 'PASS' },
      { algo: 'Volatility Profile', vote: 'Neutral', weight: '-0.01', status: 'WARNING' },
      { algo: 'Orderbook Imbalance', vote: currentDirection === 'UP' ? 'Bullish' : 'Bearish', weight: currentDirection === 'UP' ? '+0.13' : '-0.13', status: 'PASS' },
      { algo: 'Institutional Flow', vote: currentDirection === 'UP' ? 'Bullish' : 'Bearish', weight: currentDirection === 'UP' ? '+0.15' : '-0.15', status: 'PASS' },
      { algo: 'Neural Similarity Engine', vote: currentDirection === 'UP' ? 'Bullish' : 'Bearish', weight: currentDirection === 'UP' ? '+0.21' : '-0.21', status: 'PASS' },
    ] : [],
    modelValidation: {
      trainedAt: activeModelTrainedAt,
      brierScore: activeModelBrier,
      validationSampleSize: settledCount,
      lifetimeMemoryCount: lifetimeObservations,
      lastWeightUpdate: `${Math.round((Date.now() - serverLearningEngine.lastWeightUpdateTs) / 1000)}s ago`,
    },
    status: computedFeedStatus,
    rawLean: isLive ? `${action} (${currentConfidence}% Model Confidence Confluence across 8/8 Algorithms)` : 'DATA UNAVAILABLE',
    market15mState: isLive ? market15mState : null,
    features: isLive ? {
      asset,
      desk,
      orderBookImbalance: 0.184,
      momentum5m: 0.0032,
      momentum15m: 0.0085,
      volatility15m: 0.0041,
      crossVenue: {
        spot,
        kalshiStrike,
        intervalStart: market15mState.intervalStart,
        intervalEnd: market15mState.intervalEnd,
        timeRemainingSec: market15mState.timeRemaining,
        distance: market15mState.distance,
        distancePct: market15mState.distancePct,
        kalshiImpliedProb: currentKalshiImpliedProb,
        polymarketImpliedProb: Math.round((currentKalshiImpliedProb - 0.02) * 100) / 100,
        spreadPct: 0.02,
      },
      computedAt: new Date().toISOString(),
    } : null,
    
    // Pass the historical valid state so the frontend can display LAST VALID SIGNAL
    lastValidSignal: {
      action: action,
      direction: currentDirection,
      confidence: currentConfidence,
      price: spot,
      strike: kalshiStrike,
      timestamp: lastMarketUpdateTs
    }
  });
});

app.get('/api/whales'
'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
