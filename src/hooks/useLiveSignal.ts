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
let wsGlobalInstance: WebSocket | null = null;
let reconnectAttempt = 0;
let isWsConnecting = false;

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
  if (snapshot?.sequence !== undefined) {
    if (snapshot.sequence <= latestSequence && latestSequence > 0) {
      console.warn(`[VIXY_WS_SEQUENCE_DROP] incoming=${snapshot.sequence} lastAccepted=${latestSequence} reason=${snapshot.sequence === latestSequence ? 'DUPLICATE' : 'OUT_OF_ORDER'}`);
      return;
    }
    latestSequence = snapshot.sequence;
  }

  const key = 'BTC:15m';
  let state = states.get(key) || { signal: null, status: null, isRateLimited: false };

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

  const isLocked = Boolean(snapshot.isLocked === true || snapshot.status === 'LOCKED' || snapshot.status === 'CRITICALLY_INVALIDATED');

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
    direction: isLocked ? snapshot.lockedPrediction?.direction : snapshot.livePrediction?.direction,
    feedStatus: 'LIVE',
    sequenceNumber: snapshot.sequence,
    action: isLocked ? (snapshot.lockedPrediction?.direction === 'UP' ? 'BUY_YES' : 'BUY_NO') : 'HOLD',
  } as any;

  states.set(key, state);
  notifySubscribers(key);
  notifySubscribers('BTC:1h');
  notifySubscribers('ETH:15m');
  notifySubscribers('SOL:15m');
};
const connectVixyWebSocket = () => {
  if (wsGlobalInstance || isWsConnecting) return;
  isWsConnecting = true;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/ws`;

  console.log(`[VIXY_WS_CONNECT] connecting to ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  wsGlobalInstance = ws;

  ws.onopen = async () => {
    isWsConnecting = false;
    reconnectAttempt = 0;
    console.log(`[VIXY_WS_OPEN] connection established`);

    try {
      const httpState = await fetchVixyStateApi();
      if (httpState) {
        console.log(`[VIXY_STATE_SOURCE] source=HTTP_SNAPSHOT cycle=${httpState.cycleId} sequence=${httpState.sequence}`);
        updateSignalFromAuthoritative(httpState);
      }
    } catch (e) {
      console.warn('[VIXY_STATE_SOURCE] failed to fetch fallback http snapshot', e);
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'VIXY_SNAPSHOT') {
        console.log(`[VIXY_WS_SNAPSHOT] cycle=${msg.cycleId} sequence=${msg.sequence} status=${msg.status}`);
        updateSignalFromAuthoritative(msg);
      } else if (msg.type === 'VIXY_HEARTBEAT') {
        console.log(`[VIXY_WS_HEARTBEAT] sequence=${msg.sequence} cycle=${msg.cycleId || 'active'}`);
      }
    } catch (err) {
      console.warn('[VIXY_WS_ERROR] message parse error', err);
    }
  };

  ws.onclose = (event) => {
    isWsConnecting = false;
    wsGlobalInstance = null;
    console.log(`[VIXY_WS_CLOSE] code=${event.code} reason=${event.reason || 'none'}`);

    reconnectAttempt++;
    const delay = Math.min(30000, Math.pow(2, Math.min(reconnectAttempt, 5)) * 1000);
    console.log(`[VIXY_WS_RECONNECT] attempt=${reconnectAttempt} scheduling reconnect in ${delay}ms`);

    setTimeout(async () => {
      try {
        const httpState = await fetchVixyStateApi();
        if (httpState) {
          console.log(`[VIXY_STATE_SOURCE] source=HTTP_SNAPSHOT_RECONNECT cycle=${httpState.cycleId} sequence=${httpState.sequence}`);
          updateSignalFromAuthoritative(httpState);
        }
      } catch (_) {}
      connectVixyWebSocket();
    }, delay);
  };

  ws.onerror = (err) => {
    isWsConnecting = false;
    console.warn('[VIXY_WS_ERROR]', err);
  };
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
      state.signal = sig;
      changed = true;
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

  const [data, setData] = useState<SharedSignalState>(states.get(key)!);

  useEffect(() => {
    connectVixyWebSocket();

    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
    }
    
    const handler = () => {
      setData({ ...(states.get(key) || { signal: null, status: null, isRateLimited: false }) });
    };
    subscribers.get(key)!.add(handler);

    if (!intervals.has(key)) {
      poll(effAsset, effDesk);
      const interval = setInterval(() => {
        poll(effAsset, effDesk);
      }, 15000);
      intervals.set(key, interval);
    }

    setData({ ...(states.get(key) || { signal: null, status: null, isRateLimited: false }) });

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
  }, [key]);

  return data;
};
