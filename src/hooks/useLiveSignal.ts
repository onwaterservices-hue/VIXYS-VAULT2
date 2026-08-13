import { useState, useEffect } from 'react';
import { fetchLiveSignalData, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';

type SharedSignalState = {
  signal: ApiSignalResponse | null;
  status: ModelStatusResponse | null;
  isRateLimited?: boolean;
};

let globalState: SharedSignalState = {
  signal: null,
  status: null,
  isRateLimited: false,
};

let globalSubscribers: Set<() => void> = new Set();
let pollingInterval: any = null;
let currentAsset = 'BTC';
let currentDesk = '15m';
let isFetching = false;
let consecutiveErrors = 0;

const notifySubscribers = () => {
  globalSubscribers.forEach(sub => sub());
};

const poll = async () => {
  if (!currentAsset || !currentDesk || isFetching) return;
  isFetching = true;
  try {
    const [sig, stat] = await Promise.all([
      fetchLiveSignalData(currentAsset, currentDesk),
      fetchModelStatus(currentAsset, currentDesk)
    ]);
    consecutiveErrors = 0;
    let changed = false;
    if (sig) {
      globalState.signal = sig;
      changed = true;
    }
    if (stat) {
      globalState.status = stat;
      changed = true;
    }
    if (globalState.isRateLimited) {
      globalState.isRateLimited = false;
      changed = true;
    }
    if (changed) {
      notifySubscribers();
    }
  } catch (err: any) {
    consecutiveErrors++;
    if (err?.message?.includes('429') || err?.status === 429 || String(err).includes('Rate exceeded')) {
      globalState.isRateLimited = true;
      notifySubscribers();
    }
    console.error('Error fetching live signal (rate limit / network):', err);
  } finally {
    isFetching = false;
  }
};

export const useLiveSignal = (asset: string, desk: string) => {
  const [data, setData] = useState<SharedSignalState>(globalState);

  useEffect(() => {
    const effAsset = asset || 'BTC';
    const effDesk = desk ? desk.toLowerCase() : '15m';
    let shouldRestart = false;
    
    if (effAsset && currentAsset !== effAsset) {
      currentAsset = effAsset;
      shouldRestart = true;
    }
    if (effDesk && currentDesk !== effDesk) {
      currentDesk = effDesk;
      shouldRestart = true;
    }

    if (shouldRestart || !pollingInterval) {
      if (pollingInterval) clearInterval(pollingInterval);
      poll(); // initial fetch
      pollingInterval = setInterval(poll, 15000); // 15-second polling to respect upstream rate limits
    }

    const handler = () => {
      setData({ ...globalState });
    };
    globalSubscribers.add(handler);
    
    // Initial sync
    setData({ ...globalState });

    return () => {
      globalSubscribers.delete(handler);
    };
  }, [asset, desk]);

  return data;
};
