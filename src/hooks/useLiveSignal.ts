import { useState, useEffect } from 'react';
import { fetchLiveSignalData, fetchModelStatus, fetchVixyStateApi, ApiSignalResponse, ModelStatusResponse } from '../services/api';

type SharedSignalState = {
  signal: ApiSignalResponse | null;
  status: ModelStatusResponse | null;
  isRateLimited?: boolean;
};

const states = new Map<string, SharedSignalState>();
const subscribers = new Map<string, Set<() => void>>();
const intervals = new Map<string, any>();
const isFetching = new Map<string, boolean>();

let latestSequence = 0;
const getCacheKey = (asset: string, desk: string) => {
  const effAsset = (asset || 'BTC').toUpperCase();
  const effDesk = (desk || '15m').toLowerCase();
  return `${effAsset}:${effDesk}`;
};

const notifySubscribers = (key: string) => {
  const subs = subscribers.get(key);
  if (subs) {
    subs.forEach(sub => sub());
  }
};

const updateSignalFromAuthoritative = (snapshot: any) => {
  if (!snapshot) return;

  const key = 'BTC:15m';
  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };

  if (snapshot.status === 'STALE') {
    state.signal = {
      ...(state.signal || {}),
      status: 'STALE',
      feedStatus: 'STALE',
      dataFreshness: 'STALE',
      stage: 'STALE'
    } as any;
    states.set(key, state);
    notifySubscribers(key);
    notifySubscribers('BTC:1h');
    notifySubscribers('ETH:15m');
    notifySubscribers('SOL:15m');
    return;
  }

  if (snapshot.cycleId && state.signal?.cycleId) {
    const incTime = new Date(snapshot.cycleId.replace('15M-' , '')).getTime();
    const curTime = new Date(state.signal.cycleId.replace('15M-' , '')).getTime();
    if (incTime < curTime) {
      console.warn(`[VIXY_CYCLE_DROP] Dropped older cycle snapshot ${snapshot.cycleId} vs ${state.signal.cycleId}`);
      return;
    }
  }

  
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

  const isLocked = Boolean(snapshot.isLocked === true || snapshot.status === 'LOCKED' || snapshot.stage === 'LOCKED' || snapshot.cycleStage === 'LOCKED');

  const lockedDirection = isLocked ? (snapshot.lockedPrediction?.direction || snapshot.lockedDirection || (snapshot.direction === 'UP' || snapshot.direction === 'DOWN' ? snapshot.direction : undefined)) : undefined;
  const lockedProbability = isLocked ? (snapshot.lockedPrediction?.probability ?? snapshot.lockedProbability ?? snapshot.probability) : undefined;
  const lockedConfidence = isLocked ? (snapshot.lockedPrediction?.confidence ?? snapshot.lockedConfidence ?? snapshot.confidence) : undefined;
  const lockedAt = isLocked ? (snapshot.lockedPrediction?.lockedAt || snapshot.lockedAt) : undefined;
  const spotAtLock = isLocked ? (snapshot.lockedPrediction?.spotAtLock ?? snapshot.spotAtLock ?? snapshot.lockedSpot) : undefined;
  const lockedStrike = isLocked ? (snapshot.lockedPrediction?.strike ?? snapshot.lockedStrike ?? snapshot.strike) : undefined;
  const lockedDecision = isLocked ? (snapshot.lockedPrediction?.decision || snapshot.lockedDecision) : undefined;
  const lockedReason = isLocked ? (snapshot.lockedPrediction?.reason || snapshot.lockedReason) : undefined;

  const effConfidence = isLocked 
    ? (lockedConfidence ?? 75)
    : (snapshot.livePrediction?.confidence ?? snapshot.confidence ?? 50);

  const effProbability = isLocked
    ? (lockedProbability ?? 0.75)
    : (snapshot.livePrediction?.probability ?? snapshot.probability ?? 0.50);

  const effDirection = isLocked
    ? (lockedDirection || 'NEUTRAL')
    : (snapshot.livePrediction?.direction || snapshot.direction || 'NEUTRAL');

  const lockedPrediction = isLocked ? {
    direction: lockedDirection,
    probability: lockedProbability,
    confidence: lockedConfidence,
    lockedAt,
    spotAtLock,
    strike: lockedStrike,
    reason: lockedReason,
    decision: lockedDecision
  } : null;

  state.signal = {
    ...baseSignal,
    cycleId: snapshot.cycleId,
    isLocked: isLocked,
    status: snapshot.status || 'LIVE',
    stage: snapshot.stage || snapshot.cycleStage || snapshot.status || 'CALIBRATING',
    cycleStage: snapshot.cycleStage || snapshot.stage || snapshot.status || 'CALIBRATING',
    calibrationStatus: snapshot.calibrationStatus,
    analysisStatus: snapshot.analysisStatus,
    validationStatus: snapshot.validationStatus,
    lockedPrediction: lockedPrediction,
    livePrediction: snapshot.livePrediction || {
      direction: snapshot.livePrediction?.direction || snapshot.direction || 'NEUTRAL',
      probability: snapshot.livePrediction?.probability || snapshot.probability || 0.5,
      confidence: snapshot.livePrediction?.confidence || snapshot.confidence || 50
    },
    lockedDirection: lockedDirection,
    lockedProbability: lockedProbability,
    lockedConfidence: lockedConfidence,
    lockedAt: lockedAt,
    spotAtLock: spotAtLock,
    lockedSpot: spotAtLock,
    lockedStrike: lockedStrike,
    lockedDecision: lockedDecision,
    lockedReason: lockedReason,
    strike: snapshot.strike || lockedStrike,
    currentPrice: snapshot.spot ?? snapshot.currentPrice,
    spot: snapshot.spot ?? snapshot.currentPrice,
    timeRemaining: snapshot.timeRemaining ?? snapshot.timeRemainingSec,
    timeRemainingSec: snapshot.timeRemainingSec ?? snapshot.timeRemaining,
    cycleStart: snapshot.cycleStart,
    cycleEnd: snapshot.cycleEnd,
    evidenceAgreement: snapshot.evidenceAgreement,
    hasConflict: snapshot.hasConflict,
    signalUnstable: snapshot.signalUnstable,
    provisionalBias: snapshot.provisionalBias,
    historicalSimilarityPct: snapshot.historicalSimilarityPct,
    modelProbability: effProbability,
    confidence: effConfidence,
    direction: effDirection,
    crossAssetContext: snapshot.crossAssetContext || (baseSignal as any).crossAssetContext,
    feedStatus: 'LIVE',
    sequenceNumber: snapshot.sequence,
    action: isLocked ? (lockedDirection === 'UP' ? 'BUY_YES' : 'BUY_NO') : 'HOLD',
    last10: snapshot.last10 || baseSignal.last10,
    last10Summary: snapshot.last10Summary || baseSignal.last10Summary,
    features: snapshot.features || baseSignal.features,
    btc15mPipeline: snapshot.btc15mPipeline || (baseSignal as any).btc15mPipeline,
    lockEvaluation: snapshot.lockEvaluation || (baseSignal as any).lockEvaluation,
    guardianDecision: snapshot.guardianDecision || (baseSignal as any).guardianDecision,
    kalshiImpliedProbability: snapshot.kalshiImpliedProbability ?? (baseSignal as any).kalshiImpliedProbability,
    edgePct: snapshot.edgePct ?? (baseSignal as any).edgePct,
    edge: snapshot.edge ?? (baseSignal as any).edge,
    modelValidation: snapshot.modelValidation || baseSignal.modelValidation,
    market15mState: snapshot.market15mState || baseSignal.market15mState,
    lastMarketUpdateTs: snapshot.lastMarketUpdateTs || snapshot.marketTimestamp,
    marketTimestamp: snapshot.marketTimestamp || snapshot.lastMarketUpdateTs,
    dataFreshness: snapshot.dataFreshness || 'LIVE',
    latencyMs: snapshot.latencyMs ?? (baseSignal as any).latencyMs ?? 12,
    sampleSize: snapshot.sampleSize ?? (baseSignal as any).sampleSize ?? 148,
    calibrationSampleSize: snapshot.calibrationSampleSize ?? (baseSignal as any).calibrationSampleSize ?? 148,
    rawLean: snapshot.rawLean,
  } as any;

  states.set(key, state);
  notifySubscribers(key);
  notifySubscribers('BTC:1h');
  notifySubscribers('ETH:15m');
  notifySubscribers('SOL:15m');
};

const poll = async (asset: string, desk: string) => {
  const key = getCacheKey(asset, desk);
  if (isFetching.get(key)) return;
  isFetching.set(key, true);

  try {
    const [sig, stat] = await Promise.all([
      fetchLiveSignalData(asset, desk),
      fetchModelStatus(asset, desk)
    ]);

    let state = states.get(key) || { signal: null, status: null, isRateLimited: false };


    let changed = false;

    if (sig) {
      updateSignalFromAuthoritative(sig);
    }
    if (stat) {
      state.status = stat;
      changed = true;
    }
    if (state.isRateLimited) {
      state.isRateLimited = false;
      changed = true;
    }

    if (changed) {
      states.set(key, state);
      notifySubscribers(key);
    }
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.status === 429 || String(err).includes('Rate exceeded')) {
      let state = states.get(key) || { signal: null, status: null, isRateLimited: false };


      state.isRateLimited = true;
      states.set(key, state);
      notifySubscribers(key);
    }
    console.error(`Error fetching live signal for ${key}:`, err);
  } finally {
    isFetching.set(key, false);
  }
};

export const useLiveSignal = (asset: string, desk: string) => {
  const effAsset = (asset || 'BTC').toUpperCase();
  const effDesk = (desk || '15m').toLowerCase();
  const key = `${effAsset}:${effDesk}`;

  if (!states.has(key)) {
    states.set(key, { signal: null, status: null, isRateLimited: false });
  }

  const [data, setData] = useState<SharedSignalState>(() => states.get(key) || { signal: null, status: null, isRateLimited: false });

  useEffect(() => {
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
    }
    
    const handler = () => {
      const current = states.get(key) || { signal: null, status: null, isRateLimited: false };
      setData((prev) => {
        if (prev.signal === current.signal && prev.status === current.status && prev.isRateLimited === current.isRateLimited) {
          return prev;
        }
        return { ...current };
      });
    };
    subscribers.get(key)!.add(handler);

    if (!intervals.has(key)) {
      poll(effAsset, effDesk);
      const interval = setInterval(() => {
        poll(effAsset, effDesk);
      }, 15000);
      intervals.set(key, interval);
    }

    return () => {
      const subs = subscribers.get(key);
      if (subs) {
        subs.delete(handler);
        if (subs.size === 0) {
          const interval = intervals.get(key);
          if (interval) {
            clearInterval(interval);
          }
          intervals.delete(key);
          subscribers.delete(key);
          isFetching.delete(key);
        }
      }
    };
  }, [key, effAsset, effDesk]);

  return data;
};
