import { useState, useEffect } from 'react';
import { fetchLiveSignalData, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';

type SharedSignalState = {
  signal: ApiSignalResponse | null;
  status: ModelStatusResponse | null;
  isRateLimited?: boolean;
};

// Map of "asset:desk" -> SharedSignalState
const states = new Map<string, SharedSignalState>();
// Map of "asset:desk" -> Set of listener functions
const subscribers = new Map<string, Set<() => void>>();
// Map of "asset:desk" -> Interval object
const intervals = new Map<string, any>();
// Map of "asset:desk" -> boolean
const isFetching = new Map<string, boolean>();

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

  // Initialize state if not present
  if (!states.has(key)) {
    states.set(key, { signal: null, status: null, isRateLimited: false });
  }

  const [data, setData] = useState<SharedSignalState>(states.get(key)!);

  useEffect(() => {
    // Add subscriber for this key
    if (!subscribers.has(key)) {
      subscribers.set(key, new Set());
    }
    
    const handler = () => {
      setData({ ...(states.get(key) || { signal: null, status: null, isRateLimited: false }) });
    };
    subscribers.get(key)!.add(handler);

    // If no interval is active for this key, start one
    if (!intervals.has(key)) {
      poll(effAsset, effDesk); // Initial fetch
      const interval = setInterval(() => {
        poll(effAsset, effDesk);
      }, 15000); // 15-second polling to respect upstream rate limits
      intervals.set(key, interval);
    }

    // Set initial data
    setData({ ...(states.get(key) || { signal: null, status: null, isRateLimited: false }) });

    return () => {
      const subs = subscribers.get(key);
      if (subs) {
        subs.delete(handler);
        // If no more subscribers for this key, clean up the interval
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
