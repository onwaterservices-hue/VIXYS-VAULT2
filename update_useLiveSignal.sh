cat src/hooks/useLiveSignal.ts | head -n 54 > src/hooks/useLiveSignal.ts.new
cat << 'INNER_EOF' >> src/hooks/useLiveSignal.ts.new
  const isNewCycle = snapshot.cycleId && state.signal?.cycleId && snapshot.cycleId !== state.signal.cycleId;

  const baseSignal = (!state.signal || isNewCycle) ? {
    asset: 'BTC',
    desk: '15m',
    sampleSize: 148,
    minSamplesNeeded: 500,
    hasActiveModel: true,
    generatedAt: new Date().toISOString(),
    disclaimer: '',
    kalshiImpliedProbability: 0.54,
    edge: 0.14,
    status: 'LIVE',
    features: {} as any,
    execution: {} as any,
    last10: [],
    last10Summary: {} as any,
    modelValidation: {} as any,
    market15mState: null
  } : { ...state.signal };

  const isLocked = snapshot.status === 'LOCKED' || snapshot.status === 'CRITICALLY_INVALIDATED';

  state.signal = {
    ...baseSignal,
    cycleId: snapshot.cycleId,
    isLocked: isLocked,
    status: snapshot.status || 'LIVE',
    lockedDirection: isLocked ? snapshot.lockedPrediction?.direction : undefined,
    lockedProbability: isLocked ? snapshot.lockedPrediction?.probability : undefined,
    lockedConfidence: isLocked ? snapshot.lockedPrediction?.confidence : undefined,
    lockedAt: isLocked ? snapshot.lockedPrediction?.lockedAt : undefined,
    spotAtLock: isLocked ? snapshot.lockedPrediction?.spotAtLock : undefined,
    strike: snapshot.strike || (isLocked ? snapshot.lockedPrediction?.strike : undefined),
    currentPrice: snapshot.spot,
    timeRemaining: snapshot.timeRemaining,
    modelProbability: snapshot.livePrediction?.probability,
    confidence: snapshot.livePrediction?.confidence,
    direction: snapshot.livePrediction?.direction,
    feedStatus: 'LIVE',
    sequenceNumber: snapshot.sequence,
    action: isLocked ? 'BUY_YES' : 'HOLD',
  } as any;

  states.set(key, state);
  notifySubscribers(key);
  notifySubscribers('BTC:1h');
  notifySubscribers('ETH:15m');
  notifySubscribers('SOL:15m');
};
INNER_EOF
cat src/hooks/useLiveSignal.ts | tail -n +116 >> src/hooks/useLiveSignal.ts.new
mv src/hooks/useLiveSignal.ts.new src/hooks/useLiveSignal.ts
