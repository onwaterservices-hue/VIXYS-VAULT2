import { useState, useEffect, useMemo } from 'react';
import { AuthState, UserSubscription } from '../types';

export interface UseAuthSubscriptionProps {
  authState: AuthState;
  subscription?: UserSubscription;
  userRole?: 'UNPAID' | 'PRO' | 'ADMIN' | string;
  dayPassInfo?: {
    active: boolean;
    startedAt?: string | null;
    expiresAt?: string | null;
    secondsRemaining: number;
  };
}

export interface UseAuthSubscriptionReturn {
  isAuthenticated: boolean;
  hasActiveAccess: boolean;
  isProOrAdmin: boolean;
  isDayPassActive: boolean;
  userRole: string;
  passCountdownFormatted: string;
  secondsRemaining: number;
  userEmail?: string;
  userName?: string;
}

export function useAuthSubscription({
  authState,
  subscription,
  userRole = 'UNPAID',
  dayPassInfo
}: UseAuthSubscriptionProps): UseAuthSubscriptionReturn {
  const isAuthenticated = Boolean(authState?.isAuthenticated && authState?.user);
  
  const roleStr = String(userRole || authState?.user?.role || 'UNPAID').toUpperCase();
  const isProOrAdmin = ['PRO', 'ADMIN', 'OWNER', 'ELITE', 'STARTER'].includes(roleStr) || subscription?.status === 'active';
  
  // Calculate day pass validity
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expiryTimestamp = useMemo(() => {
    if (dayPassInfo?.expiresAt) {
      const parsed = new Date(dayPassInfo.expiresAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  }, [dayPassInfo?.expiresAt]);

  const isDayPassActive = Boolean(
    (dayPassInfo?.active && (dayPassInfo.secondsRemaining > 0 || (expiryTimestamp > 0 && expiryTimestamp > now))) ||
    roleStr === 'DAY_PASS'
  );

  const hasActiveAccess = isAuthenticated && (isProOrAdmin || isDayPassActive);

  // Remaining seconds calculation
  const secondsRemaining = useMemo(() => {
    if (expiryTimestamp > 0 && expiryTimestamp > now) {
      return Math.max(0, Math.floor((expiryTimestamp - now) / 1000));
    }
    return dayPassInfo?.secondsRemaining || 0;
  }, [expiryTimestamp, now, dayPassInfo?.secondsRemaining]);

  const passCountdownFormatted = useMemo(() => {
    if (!isDayPassActive || secondsRemaining <= 0) return '';
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  }, [isDayPassActive, secondsRemaining]);

  return {
    isAuthenticated,
    hasActiveAccess,
    isProOrAdmin,
    isDayPassActive,
    userRole: roleStr,
    passCountdownFormatted,
    secondsRemaining,
    userEmail: authState?.user?.email,
    userName: authState?.user?.name
  };
}
