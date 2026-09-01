import { useState, useEffect, useRef } from 'react';
import { Canonical15mDecision, EngineStage } from '../types/canonicalDecision';
import { fetchCanonical15mDecision } from '../services/api';
import { createInitial15mDecision } from '../services/engine/canonicalDecisionEngine';

// The engine ticks every 3s while warm and forces a tick on a cold boot before
// serving, so a healthy engineTickTs is always within a few seconds. 30s is a
// generous threshold that flags a genuinely wedged engine without tripping on
// ordinary serverless cold starts.
const ENGINE_STALE_MS = 30000;
// No distinct server payload in this long means the transport is dead, even if
// individual requests are still nominally succeeding.
const FEED_STALE_MS = 12000;

export type FeedHealthStatus = 'LIVE' | 'STALE' | 'DISCONNECTED' | 'API_ERROR' | 'MISSING_DATA' | 'AUTH_ERROR';

export type NormalizedLifecycleState = 
  | 'CALIBRATING' 
  | 'BUILDING' 
  | 'CONFIRMING' 
  | 'LOCKED' 
  | 'PROTECTED' 
  | 'SETTLED' 
  | 'SKIPPED'
  // Not a stage: the honest representation of "no authoritative decision".
  | 'HYDRATING';

// Maps the engine's real lifecycle stage onto the terminal's existing
// vocabulary. This is a transport mapping, not a decision: every value here
// comes from the engine, none of it is inferred from a clock.
const ENGINE_STAGE_TO_LIFECYCLE: Record<EngineStage, NormalizedLifecycleState> = {
  OBSERVING: 'CALIBRATING',
  CALIBRATING: 'CALIBRATING',
  ANALYZING: 'BUILDING',
  QUALIFYING: 'CONFIRMING',
  LOCKING: 'CONFIRMING',
  LOCKED: 'LOCKED',
  NO_TRADE: 'SKIPPED',
  HYDRATING: 'HYDRATING',
};

export function getNormalizedLifecycleState(decision: Canonical15mDecision): NormalizedLifecycleState {
  // No payload at all is not a reason to claim a stage.
  if (!decision || !decision.currentState) return 'HYDRATING';

  // Terminal canonical states always win -- they are the engine's committed
  // decision and outrank any in-flight stage.
  const st = decision.currentState;
  if (st === 'SETTLED') return 'SETTLED';
  if (st === 'PROTECTED') return 'PROTECTED';
  if (st === 'SKIP') return 'SKIPPED';
  if (st === 'LOCKED_UP' || st === 'LOCKED_DOWN') return 'LOCKED';
  if (st === 'CONFIRMING') return 'CONFIRMING';
  // The backend has no authoritative decision. Report that, do not infer one.
  if (st === 'HYDRATING') return 'HYDRATING';

  // Pre-lock, Canonical15mState collapses the entire engine lifecycle into
  // 'WATCH'. engineStage carries what actually got collapsed. Previously this
  // was reconstructed from the countdown, which meant the terminal announced a
  // lifecycle the engine had never entered -- e.g. claiming the cycle was past
  // calibration purely because 6:00 had elapsed, while the engine was still
  // observing and structurally unable to lock.
  const stage = decision.engineStage;
  if (stage && ENGINE_STAGE_TO_LIFECYCLE[stage]) {
    return ENGINE_STAGE_TO_LIFECYCLE[stage];
  }

  // No recognised stage. This previously reconstructed one from the countdown,
  // which is exactly the fabrication this work removes: a clock cannot know
  // what the engine decided. Report HYDRATING instead.
  return 'HYDRATING';
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
  const currentDecisionIdRef = useRef<string>('');
  // Server-stamped ordering. stateVersion cannot be used: it is
  // globalSequenceNumber, a per-lambda-instance request counter that resets to
  // 0 on every cold boot. A poll landing on a colder instance therefore looked
  // like a version regression, the update was silently discarded, and the card
  // froze on the last decision for the rest of the cycle -- while still
  // reporting LIVE. serverTimeMs comes from a single shared wall clock and
  // orders correctly across instances.
  const lastServerTimeRef = useRef<number>(0);
  // Last engine tick we have actually observed advancing. Used to tell a live
  // engine apart from a wedged one that is still answering requests.
  const lastEngineTickRef = useRef<number>(0);
  // Mirrors of state read inside interval callbacks. Both effects below mount
  // with [] deps, so reading the state variables directly captured their
  // first-render values forever.
  const localUpdatedAtRef = useRef<number>(Date.now());
  const decisionIdPresentRef = useRef<boolean>(false);
  const fetchFromServerRef = useRef<() => Promise<void>>(async () => {});


  const markFresh = () => {
    const now = Date.now();
    localUpdatedAtRef.current = now;
    setLocalUpdatedAt(now);
  };

  // Heartbeat checker. Only genuinely new server state counts as a heartbeat,
  // so a feed that keeps answering with the same snapshot still goes STALE.
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - localUpdatedAtRef.current > FEED_STALE_MS) {
        setDataHealthStatus((prev) => (prev === 'DISCONNECTED' || prev === 'API_ERROR' ? prev : 'STALE'));
      }
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const applySafeUpdate = (incoming: Canonical15mDecision, source: string = 'FIRESTORE') => {
    if (!incoming || !incoming.decisionId) {
      setDataHealthStatus('MISSING_DATA');
      return;
    }

    // A new cycle is always accepted, and resets the ordering watermark.
    const isNewCycle = incoming.decisionId !== currentDecisionIdRef.current;
    if (isNewCycle) {
      console.log(`[C15M] New 15M Cycle Received [${source}]: ${incoming.decisionId} | State: ${incoming.currentState} | Stage: ${incoming.engineStage}`);
      currentDecisionIdRef.current = incoming.decisionId;
      lastServerTimeRef.current = incoming.serverTimeMs ?? 0;
      lastEngineTickRef.current = incoming.engineTickTs ?? 0;
      decisionIdPresentRef.current = true;
      markFresh();
      setFeedError(null);
      setDataHealthStatus('LIVE');
      setDecision(incoming);
      return;
    }

    // Within a cycle, drop responses that arrive out of order. Equal stamps are
    // accepted so same-millisecond updates are not lost.
    const incomingServerTime = incoming.serverTimeMs ?? 0;
    if (incomingServerTime && incomingServerTime < lastServerTimeRef.current) {
      return;
    }
    lastServerTimeRef.current = incomingServerTime || lastServerTimeRef.current;

    // The decision is always applied -- the backend is the source of truth and
    // this payload is at least as recent as what we hold.
    decisionIdPresentRef.current = true;
    setDecision(incoming);
    setFeedError(null);

    // Liveness is a SEPARATE question from "did a response arrive". The engine
    // stamps engineTickTs when it actually advances; if that has not moved, the
    // engine is wedged behind a still-responsive HTTP layer and the terminal
    // must not claim to be live.
    const engineTick = incoming.engineTickTs ?? 0;
    if (!engineTick) {
      // Backend predates engineTickTs: fall back to treating any response as a
      // heartbeat, which is the old behaviour.
      markFresh();
      setDataHealthStatus('LIVE');
      return;
    }
    if (engineTick > lastEngineTickRef.current) {
      lastEngineTickRef.current = engineTick;
      markFresh();
      setDataHealthStatus('LIVE');
      return;
    }
    if (Date.now() - engineTick > ENGINE_STALE_MS) {
      setDataHealthStatus('STALE');
      setFeedError('Engine has not advanced');
    }
  };

  // REST API Polling (Authoritative Live Source every 3 seconds)
  const fetchFromServer = async () => {
    try {
      const data = await fetchCanonical15mDecision() as Canonical15mDecision;

      if (data && (data as any).status === 'STALE') {
        setDataHealthStatus('STALE');
        setFeedError((data as any).message || 'Stale market data');
        return;
      }

      if (data && data.decisionId) {
        applySafeUpdate(data, 'REST_API');
      } else if (!decisionIdPresentRef.current) {
        setDataHealthStatus('MISSING_DATA');
      }
    } catch (err: any) {
      // fetchCanonical15mDecision throws rather than replaying a cached
      // payload, so this branch means we genuinely could not reach the engine.
      // Report it immediately instead of leaving a green LIVE badge over a dead
      // feed. The last known decision stays on screen, but flagged.
      setDataHealthStatus('DISCONNECTED');
      setFeedError(err?.message || 'API fetch failed');
    }
  };
  fetchFromServerRef.current = fetchFromServer;

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
        fetchFromServerRef.current();
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
    fetchFromServerRef.current();
    const interval = setInterval(() => fetchFromServerRef.current(), 3000);
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
    case 'HYDRATING':
      displayName = 'VIXY SYNCING';
      badgeColor = 'text-slate-300 bg-slate-700/40 border-slate-500/50';
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
