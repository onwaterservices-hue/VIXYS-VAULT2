import { useState, useEffect, useRef } from 'react';
import { Canonical15mDecision } from '../types/canonicalDecision';
import { safeFetchJson } from '../services/api';
import { createInitial15mDecision } from '../services/engine/canonicalDecisionEngine';

export type FeedHealthStatus = 'LIVE' | 'STALE' | 'DISCONNECTED' | 'API_ERROR' | 'MISSING_DATA' | 'AUTH_ERROR';

export type NormalizedLifecycleState = 
  | 'CALIBRATING' 
  | 'BUILDING' 
  | 'CONFIRMING' 
  | 'LOCKED' 
  | 'PROTECTED' 
  | 'SETTLED' 
  | 'SKIPPED';

export function getNormalizedLifecycleState(decision: Canonical15mDecision): NormalizedLifecycleState {
  if (!decision || !decision.currentState) return 'CALIBRATING';
  
  const st = decision.currentState;
  if (st === 'SETTLED') return 'SETTLED';
  if (st === 'PROTECTED') return 'PROTECTED';
  if (st === 'SKIP') return 'SKIPPED';
  if (st === 'LOCKED_UP' || st === 'LOCKED_DOWN') return 'LOCKED';
  if (st === 'CONFIRMING') return 'CONFIRMING';

  const secondsRemaining = decision.timeRemainingSec ?? 900;
  const elapsed = Math.max(0, 900 - secondsRemaining);
  // Must match the backend's minimum observation window (MIN_OBSERVATION_SECONDS = 360
  // in canLockCurrentCycle). This previously used 120s, so the terminal announced
  // "BUILDING" from 2:00 while the engine was still calibrating and structurally unable
  // to lock until 6:00 — the displayed lifecycle disagreed with the real one.
  if (elapsed < 360) {
    return 'CALIBRATING';
  }
  return 'BUILDING';
}

export function useCanonical15mDecision(): {
  decision: Canonical15mDecision;
  isLoading: boolean;
  displayName: string;
  badgeColor: string;
  isLocked: boolean;
  refreshDecision: () => Promise<void>;
  localUpdatedAt: number;
  dataHealthStatus: FeedHealthStatus;
  feedError: string | null;
  normalizedLifecycle: NormalizedLifecycleState;
  isStale: boolean;
  isDisconnected: boolean;
} {
  const [decision, setDecision] = useState<Canonical15mDecision>(() => createInitial15mDecision());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<number>(Date.now());

  const [dataHealthStatus, setDataHealthStatus] = useState<FeedHealthStatus>('LIVE');
  const [feedError, setFeedError] = useState<string | null>(null);
  const currentVersionRef = useRef<number>(0);
  const currentDecisionIdRef = useRef<string>('');





  // Heartbeat checker to detect stale feeds (> 12 seconds with no update)
  useEffect(() => {
    const timer = setInterval(() => {
      const age = Date.now() - localUpdatedAt;
      if (age > 12000) {
        setDataHealthStatus('STALE');
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [localUpdatedAt]);

  // Apply state update safely to allow continuous live data updates
  const applySafeUpdate = (incoming: Canonical15mDecision, source: string = 'FIRESTORE') => {
    if (!incoming || !incoming.decisionId) {
      setDataHealthStatus('MISSING_DATA');
      return;
    }
    
    // Always update heartbeat if we receive a valid payload
    setLocalUpdatedAt(Date.now());
    setDataHealthStatus('LIVE');
    setFeedError(null);

    // If new cycle / decisionId, accept unconditionally and reset version counter
    if (incoming.decisionId !== currentDecisionIdRef.current) {
      console.log(`[C15M] New 15M Cycle Received [${source}]: ${incoming.decisionId} | State: ${incoming.currentState} | Ver: ${incoming.stateVersion}`);
      currentDecisionIdRef.current = incoming.decisionId;
      currentVersionRef.current = incoming.stateVersion || 1;
      setDecision(incoming);
      return;
    }

    // Accept updates if version advances OR if version is equal (enabling live probability, lock score, and spot updates)
    if (incoming.stateVersion >= currentVersionRef.current) {
      currentVersionRef.current = incoming.stateVersion;
      setDecision(incoming);
    }
  };

  // REST API Polling (Authoritative Live Source every 3 seconds)
  const fetchFromServer = async () => {
    try {
      const data = await safeFetchJson<Canonical15mDecision>(`/api/vixy/15m/current?_t=${Date.now()}`);
      
      if (data && (data as any).status === 'STALE') {
        setDataHealthStatus('STALE');
        setFeedError((data as any).message || 'Stale market data');
        return;
      }

      if (data && data.decisionId) {
        applySafeUpdate(data, 'REST_API');
      } else if (!decision?.decisionId) {
        setDataHealthStatus('MISSING_DATA');
      }
    } catch (err: any) {
      if (Date.now() - localUpdatedAt > 12000) {
        setDataHealthStatus('API_ERROR');
        setFeedError(err?.message || 'API fetch failed');
      }
    }
  };

  // Browsers throttle (or fully pause) setInterval in background tabs, so a
  // user who switches away and returns can come back to a card still showing
  // the last-polled cycle -- e.g. frozen on an old LOCKED confidence -- until
  // they manually refresh. Re-fetch immediately whenever the tab becomes
  // visible again (and on window focus) so the terminal self-heals. This only
  // triggers the same fetchFromServer() the interval already uses; it does not
  // change polling cadence, decision handling, or any engine logic.
  useEffect(() => {
    const refetchIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchFromServer();
      }
    };
    document.addEventListener('visibilitychange', refetchIfVisible);
    window.addEventListener('focus', refetchIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', refetchIfVisible);
      window.removeEventListener('focus', refetchIfVisible);
    };
  }, []);

  useEffect(() => {
    fetchFromServer();
    const interval = setInterval(fetchFromServer, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. User-Facing Display Name & Badge Color
  const isLocked = decision.currentState === 'LOCKED_UP' || decision.currentState === 'LOCKED_DOWN';
  const normalizedLifecycle = getNormalizedLifecycleState(decision);

  let displayName = 'VIXY WATCH';
  let badgeColor = 'text-purple-400 bg-purple-500/20 border-purple-500/40';

  switch (decision.currentState) {
    case 'LOCKED_UP':
      displayName = 'VIXY UP';
      badgeColor = 'text-[#00FF88] bg-[#00FF88]/20 border-[#00FF88]/40 shadow-[0_0_12px_rgba(0,255,136,0.3)]';
      break;
    case 'LOCKED_DOWN':
      displayName = 'VIXY DOWN';
      badgeColor = 'text-[#FF3B30] bg-[#FF3B30]/20 border-[#FF3B30]/40 shadow-[0_0_12px_rgba(255,59,48,0.3)]';
      break;
    case 'CONFIRMING':
      displayName = decision.direction === 'UP' ? 'VIXY CONFIRMING UP' : 'VIXY CONFIRMING DOWN';
      badgeColor = 'text-cyan-300 bg-cyan-500/20 border-cyan-400/40';
      break;
    case 'SKIP':
      displayName = 'VIXY SKIP';
      badgeColor = 'text-amber-400 bg-amber-500/20 border-amber-500/40';
      break;
    case 'PROTECTED':
      displayName = 'VIXY PROTECTED';
      badgeColor = 'text-blue-400 bg-blue-500/20 border-blue-500/40';
      break;
    case 'SETTLED':
      displayName = `VIXY SETTLED — ${decision.finalOutcome || 'RESOLVED'}`;
      badgeColor = 'text-gray-300 bg-gray-700/40 border-gray-600';
      break;
    default:
      displayName = 'VIXY WATCH';
      badgeColor = 'text-purple-400 bg-purple-500/20 border-purple-500/40';
  }

  return {
    decision,
    isLoading,
    displayName,
    badgeColor,
    isLocked,
    refreshDecision: fetchFromServer,
    localUpdatedAt,
    dataHealthStatus,
    feedError,
    normalizedLifecycle,
    isStale: dataHealthStatus === 'STALE',
    isDisconnected: dataHealthStatus === 'DISCONNECTED' || dataHealthStatus === 'API_ERROR'
  };
}
