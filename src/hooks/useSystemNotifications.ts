import { useState, useEffect, useRef, useCallback } from 'react';
import { Canonical15mDecision } from '../types/canonicalDecision';
import { playQuantChime, playDiscordPing } from '../utils/audio';

export interface SystemAlertItem {
  id: string;
  type: '15M_LOCK' | '15M_SETTLED' | 'WHALE' | 'PROTECTION' | 'REGIME' | 'ORDERFLOW';
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  direction?: 'UP' | 'DOWN' | 'SKIP';
  confidence?: number;
  actionTab?: string;
}

// v2: the v1 store seeded every browser with invented items ("1,250 BTC
// transferred to Binance", "+$28.4M Taker Buy delta") and a timer added a
// random templated "whale" alert every 75s. Bumping the key drops those from
// existing browsers; only engine transitions create alerts now.
const STORAGE_KEY = 'vixy_system_notifications_v2';
const SOUND_STORAGE_KEY = 'vixy_sound_alerts_enabled';

export function useSystemNotifications(canonicalDecision?: Canonical15mDecision) {
  const [notifications, setNotifications] = useState<SystemAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const lastProcessedCycleRef = useRef<{ id: string; state: string }>({ id: '', state: '' });

  // Persist notifications
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 30)));
    } catch (e) {
      // ignore
    }
  }, [notifications]);

  // Persist sound preference
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(soundEnabled));
    } catch (e) {
      // ignore
    }
  }, [soundEnabled]);

  const addNotification = useCallback((item: Omit<SystemAlertItem, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: SystemAlertItem = {
      ...item,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((prev) => [newAlert, ...prev.slice(0, 29)]);

    if (soundEnabled) {
      try {
        if (item.priority === 'HIGH' || item.type === '15M_LOCK') {
          playQuantChime();
        } else {
          playDiscordPing();
        }
      } catch (err) {
        // audio playback error ignore
      }
    }
  }, [soundEnabled]);

  // Real engine transitions only: lock, protection, settlement, skip.
  useEffect(() => {
    if (!canonicalDecision || !canonicalDecision.decisionId) return;

    const cycleId = canonicalDecision.decisionId;
    const currentState = canonicalDecision.currentState || '';
    const last = lastProcessedCycleRef.current;

    if (last.id === cycleId && last.state === currentState) {
      return;
    }

    lastProcessedCycleRef.current = { id: cycleId, state: currentState };

    const conf = typeof canonicalDecision.confidence === 'number' ? canonicalDecision.confidence : null;
    const dir = canonicalDecision.direction === 'UP' || canonicalDecision.direction === 'DOWN' ? canonicalDecision.direction : null;
    const spot = typeof canonicalDecision.currentSpot === 'number' && canonicalDecision.currentSpot > 0
      ? `$${canonicalDecision.currentSpot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;

    if ((currentState === 'LOCKED_UP' || currentState === 'LOCKED_DOWN') && dir) {
      addNotification({
        type: '15M_LOCK',
        title: `15M BTC Cycle Locked — ${dir}`,
        description: [`Direction: ${dir}`, conf !== null ? `Engine score ${conf}` : null, spot ? `Spot at lock: ${spot}` : null].filter(Boolean).join(' | '),
        priority: 'HIGH',
        direction: dir,
        confidence: conf ?? undefined,
        actionTab: 'crypto_prediction_center',
      });
    } else if (currentState === 'PROTECTED') {
      addNotification({
        type: 'PROTECTION',
        title: 'VIXY Protection Activated',
        description: 'Reversal veto engaged for this cycle.',
        priority: 'HIGH',
        actionTab: 'crypto_prediction_center',
      });
    } else if (currentState === 'SETTLED') {
      addNotification({
        type: '15M_SETTLED',
        title: `15M Cycle Settled (${canonicalDecision.finalOutcome || 'RESOLVED'})`,
        description: 'Settled against the ledger settlement price.',
        priority: 'MEDIUM',
        actionTab: 'crypto_prediction_center',
      });
    } else if (currentState === 'SKIP') {
      addNotification({
        type: 'REGIME',
        title: '15M Cycle Skipped',
        description: 'Lock gate not met this cycle. No position.',
        priority: 'NORMAL',
        actionTab: 'crypto_prediction_center',
      });
    }
  }, [canonicalDecision, addNotification]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        playDiscordPing();
      }
      return next;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearAll,
    soundEnabled,
    toggleSound,
    addNotification,
  };
}
