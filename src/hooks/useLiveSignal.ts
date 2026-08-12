import { useState, useEffect } from 'react';
import { fetchLiveSignalData, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';

type SharedSignalState = {
  signal: ApiSignalResponse | null;
  status: ModelStatusResponse | null;
};

let globalState: SharedSignalState = {
  signal: null,
  status: null,
};

let globalSubscribers: Set<() => void> = new Set();
let pollingInterval: any = null;
let currentAsset = 'BTC';
let currentDesk = '15m';

const notifySubscribers = () => {
  globalSubscribers.forEach(sub => sub());
};

const poll = async () => {
  if (!currentAsset || !currentDesk) return;
  try {
    const [sig, stat] = await Promise.all([
      fetchLiveSignalData(currentAsset, currentDesk),
      fetchModelStatus(currentAsset, currentDesk)
    ]);
    let changed = false;
    if (sig) {
      globalState.signal = sig;
      changed = true;
    }
    if (stat) {
      globalState.status = stat;
      changed = true;
    }
    if (changed) {
      notifySubscribers();
    }
  } catch (err) {
    console.error('Error fetching live signal', err);
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
      pollingInterval = setInterval(poll, 2000); // 2-second polling
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
