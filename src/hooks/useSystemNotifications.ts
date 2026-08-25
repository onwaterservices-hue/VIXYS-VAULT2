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

const STORAGE_KEY = 'vixy_system_notifications_v1';
const SOUND_STORAGE_KEY = 'vixy_sound_alerts_enabled';

// Sample whale & order flow templates to enrich live stream
const WHALE_EVENT_TEMPLATES = [
  {
    title: 'Whale Inflow Detected',
    description: '1,250 BTC transferred to Binance ($100.4M)',
    type: 'WHALE' as const,
    priority: 'HIGH' as const,
    actionTab: 'crypto_prediction_center',
  },
  {
    title: 'Order Flow Delta Spike',
    description: '+$28.4M Taker Buy delta absorbed across Coinbase & Binance',
    type: 'ORDERFLOW' as const,
    priority: 'MEDIUM' as const,
    actionTab: 'crypto_prediction_center',
  },
  {
    title: 'Large Buy Wall Absorption',
    description: '850 BTC Ask depth absorbed at key $80,400 pivot',
    type: 'WHALE' as const,
    priority: 'MEDIUM' as const,
    actionTab: 'crypto_prediction_center',
  },
  {
    title: 'Multi-Venue Sentiment Surge',
    description: 'Kalshi & Polymarket YES consensus shifted +6.2%',
    type: 'ORDERFLOW' as const,
    priority: 'NORMAL' as const,
    actionTab: 'crypto_prediction_center',
  },
  {
    title: 'Volatility Squeeze Release',
    description: 'Bollinger Bandwidth 2.1% — directional breakout underway',
    type: 'REGIME' as const,
    priority: 'MEDIUM' as const,
    actionTab: 'crypto_prediction_center',
  }
];

export function useSystemNotifications(canonicalDecision?: Canonical15mDecision) {
  const [notifications, setNotifications] = useState<SystemAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }

    // Default rich initial live notifications
    const now = Date.now();
    return [
      {
        id: 'initial_15m_lock',
        type: '15M_LOCK',
        title: '15M BTC Cycle Locked',
        description: 'Direction: UP | Conviction 91% | Strike: $80,350',
        timestamp: now - 3 * 60 * 1000,
        read: false,
        priority: 'HIGH',
        direction: 'UP',
        confidence: 91,
        actionTab: 'crypto_prediction_center',
      },
      {
        id: 'initial_whale_inflow',
        type: 'WHALE',
        title: 'Whale Inflow Detected',
        description: '1,250 BTC transferred to Binance ($100.4M)',
        timestamp: now - 7 * 60 * 1000,
        read: false,
        priority: 'HIGH',
        actionTab: 'crypto_prediction_center',
      },
      {
        id: 'initial_orderflow',
        type: 'ORDERFLOW',
        title: 'Order Flow Delta Spike',
        description: '+$28.4M Taker Buy delta absorbed across venues',
        timestamp: now - 14 * 60 * 1000,
        read: true,
        priority: 'MEDIUM',
        actionTab: 'crypto_prediction_center',
      },
    ];
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
  const audioContextReadyRef = useRef<boolean>(false);

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

  // Sync real-time 15M Decision locks & state transitions
  useEffect(() => {
    if (!canonicalDecision || !canonicalDecision.decisionId) return;

    const cycleId = canonicalDecision.decisionId;
    const currentState = canonicalDecision.currentState || '';
    const last = lastProcessedCycleRef.current;

    // Check if this cycle & state transition has already triggered an alert
    if (last.id === cycleId && last.state === currentState) {
      return;
    }

    lastProcessedCycleRef.current = { id: cycleId, state: currentState };

    const conf = canonicalDecision.confidence || 91;
    const dir = canonicalDecision.direction || 'UP';
    const spot = canonicalDecision.currentSpot ? `$${canonicalDecision.currentSpot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$80,350';

    if (currentState === 'LOCKED_UP' || currentState === 'LOCKED_DOWN') {
      addNotification({
        type: '15M_LOCK',
        title: `15M BTC Cycle Locked — ${dir}`,
        description: `Direction: ${dir} | Conviction ${conf}% | Spot Pivot: ${spot}`,
        priority: 'HIGH',
        direction: dir as 'UP' | 'DOWN',
        confidence: conf,
        actionTab: 'crypto_prediction_center',
      });
    } else if (currentState === 'PROTECTED') {
      addNotification({
        type: 'PROTECTION',
        title: 'VIXY Protection Activated',
        description: `Autonomous capital preservation shield engaged. Volatility defense active.`,
        priority: 'HIGH',
        actionTab: 'crypto_prediction_center',
      });
    } else if (currentState === 'SETTLED') {
      addNotification({
        type: '15M_SETTLED',
        title: `15M Cycle Settled (${canonicalDecision.finalOutcome || 'RESOLVED'})`,
        description: `Settlement verified against canonical benchmark index.`,
        priority: 'MEDIUM',
        actionTab: 'crypto_prediction_center',
      });
    } else if (currentState === 'SKIP') {
      addNotification({
        type: 'REGIME',
        title: '15M Cycle Skipped',
        description: 'Multi-venue confluence criteria not met. Capital preserved.',
        priority: 'NORMAL',
        actionTab: 'crypto_prediction_center',
      });
    }
  }, [canonicalDecision, addNotification]);

  // Periodic simulated live whale & order flow stream (every 60-90s)
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick random whale template
      const template = WHALE_EVENT_TEMPLATES[Math.floor(Math.random() * WHALE_EVENT_TEMPLATES.length)];
      addNotification(template);
    }, 75000);

    return () => clearInterval(interval);
  }, [addNotification]);

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
