import { useState, useEffect, useRef } from 'react';
import { Canonical15mDecision } from '../types/canonicalDecision';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeFetchJson } from '../services/api';
import { createInitial15mDecision } from '../services/engine/canonicalDecisionEngine';

export function useCanonical15mDecision(): {
  decision: Canonical15mDecision;
  isLoading: boolean;
  displayName: string;
  badgeColor: string;
  isLocked: boolean;
  refreshDecision: () => Promise<void>;
  localUpdatedAt: number;
} {
  const [decision, setDecision] = useState<Canonical15mDecision>(() => createInitial15mDecision());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<number>(Date.now());
  const currentVersionRef = useRef<number>(0);
  const currentDecisionIdRef = useRef<string>('');

  // Apply state update only if monotonic version check passes
  const applySafeUpdate = (incoming: Canonical15mDecision, source: string = 'FIRESTORE') => {
    if (!incoming || !incoming.decisionId) return;
    
    // Always update heartbeat if we receive a valid payload
    setLocalUpdatedAt(Date.now());


    // If new cycle / decisionId, accept unconditionally and reset version counter
    if (incoming.decisionId !== currentDecisionIdRef.current) {
      console.log(`[C15M] New 15M Cycle Received [${source}]: ${incoming.decisionId} | State: ${incoming.currentState} | Ver: ${incoming.stateVersion}`);
      currentDecisionIdRef.current = incoming.decisionId;
      currentVersionRef.current = incoming.stateVersion || 1;
      setDecision(incoming);
      return;
    }

    // Monotonic Version Guard: Equal or older versions (<= currentVersion) are ignored/rejected
    if (incoming.stateVersion > currentVersionRef.current) {
      console.log(`[C15M] Version Advance [${source}]: ${incoming.decisionId} | State: ${incoming.currentState} | Ver: ${currentVersionRef.current} -> ${incoming.stateVersion}`);
      currentVersionRef.current = incoming.stateVersion;
      setDecision(incoming);
    } else {
      // Ignored: incoming.stateVersion <= currentVersionRef.current
    }
  };

  // 1. Real-Time Firestore Listener (Primary Live Source)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      if (db) {
        const lockDocRef = doc(db, 'active_cycle_lock', 'current_15m');
        unsubscribe = onSnapshot(
          lockDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as Canonical15mDecision;
              applySafeUpdate(data, 'FIRESTORE_SNAPSHOT');
            }
          },
          (err) => {
            // Graceful fallback to REST polling if Firestore rules or stream disconnects
            console.warn('[useCanonical15mDecision] Snapshot fallback notice:', err);
          }
        );
      }
    } catch (e) {
      console.warn('[useCanonical15mDecision] Firestore setup warning:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. REST API Polling Fallback (Every 3 seconds)
  const fetchFromServer = async () => {
    try {
      const data = await safeFetchJson<Canonical15mDecision>(`/api/vixy/15m/current?_t=${Date.now()}`);
      if (data && data.decisionId) {
        applySafeUpdate(data, 'REST_API');
      }
    } catch {
      // ignore transient network hiccups
    }
  };

  useEffect(() => {
    fetchFromServer();
    const interval = setInterval(fetchFromServer, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. User-Facing Display Name & Badge Color
  const isLocked = decision.currentState === 'LOCKED_UP' || decision.currentState === 'LOCKED_DOWN';

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
    localUpdatedAt
  };
}
