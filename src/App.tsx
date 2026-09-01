import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  BTCTicker,
  Candle,
  UserSubscription,
  AlertSettings,
  HistoricalPrediction,
  SupportTicket,
  AdminStats,
  AuthState,
  JournalEntry,
  ApiKey,
  ExchangeApiKeys,
} from './types';
import { fetchCryptoTicker, fetchCryptoKlines, connectLiveCryptoStream, fetchAllCryptoTickers, getDiscordUserProfileApi, getAccountMeApi, syncAuthUserApi, safeFetchJson, getEntitlementsApi, EntitlementsResponse } from './services/api';
import { INITIAL_HISTORICAL_PREDICTIONS, INITIAL_SUPPORT_TICKETS, INITIAL_ADMIN_STATS } from './data/mockData';
import { ASSET_DATABASE } from './data/assetData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TopNavControls } from './components/TopNavControls';
import { LiveDashboard } from './components/LiveDashboard';
import { MarketCardsView } from './components/MarketCardsView';
import { CompareView } from './components/CompareView';
import { SmartSearchModal } from './components/SmartSearchModal';
import { HistoricalAccuracy } from './components/HistoricalAccuracy';
import { AlertSettingsView } from './components/AlertSettingsView';
import { SubscriptionView } from './components/SubscriptionView';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { CURRENT_DATA_SOURCE } from './utils/statGating';
import { AuthModal } from './components/AuthModal';
import { TradeJournalView } from './components/TradeJournalView';
import { SettingsView } from './components/SettingsView';
import { ScalpingDeskView } from './components/ScalpingDeskView';
import { OneHourDeskView } from './components/OneHourDeskView';
import { AIPatternEngine } from './components/AIPatternEngine';
import { WhaleTrackerView } from './components/WhaleTrackerView';
import { ExplainabilityVaultView } from './components/ExplainabilityVaultView';
import { PerformanceLabView } from './components/PerformanceLabView';
import { AICoachView } from './components/AICoachView';
import { ReplayCenterView } from './components/ReplayCenterView';
import { OpportunityScannerView } from './components/OpportunityScannerView';
import { AuthView } from './components/AuthView';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ChangelogView } from './components/ChangelogView';
import { LeaderboardView } from './components/LeaderboardView';
import { TrialExpiredOverlay } from './components/TrialExpiredOverlay';
import { TermsView } from './components/TermsView';
import { PrivacyView } from './components/PrivacyView';
import { DiscordBotHubView } from './components/DiscordBotHubView';
import { VixyLearningCenter } from './components/VixyLearningCenter';

import { DiscordOnboardingModal } from './components/DiscordOnboardingModal';
import { RiskDisclosureView } from './components/RiskDisclosureView';
import { RefundPolicyView } from './components/RefundPolicyView';
import { ContactView } from './components/ContactView';
import { AboutView } from './components/AboutView';
import { DesignSystemShowcase } from './components/vixyV2/DesignSystemShowcase';
import { ContextualRightRail } from './components/vixyV2/ContextualRightRail';
import { SystemStatusBar } from './components/vixyV2/SystemStatusBar';
import { useCanonical15mDecision } from './hooks/useCanonical15mDecision';
import { TAB_TO_PATH, PATH_TO_TAB } from './utils/routePaths';
import { NotFoundView } from './components/NotFoundView';
import { VixyHubView } from './components/VixyHubView';
import { VixyLockView } from './components/VixyLockView';
import { VixyLiveView } from './components/VixyLiveView';
import { StarterDeskView } from './components/StarterDeskView';
import { AuthToast, AuthToastData } from './components/AuthToast';
import { useAuthSubscription } from './hooks/useAuthSubscription';

export default function App() {
  const canonical15m = useCanonical15mDecision();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authToast, setAuthToast] = useState<AuthToastData | null>(null);

  // Multi-Asset State & Navigation
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15M');
  const [selectedVenues, setSelectedVenues] = useState<string[]>(['Kalshi', 'Polymarket']);
  const [favorites, setFavorites] = useState<string[]>(['BTC', 'ETH', 'SOL']);

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);

  // Auth State (persisted or defaults to unauthenticated for visitors)
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem('vixy_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.isAuthenticated === 'boolean') {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      isAuthenticated: false,
      user: null,
    };
  });

  const [userRole, setUserRole] = useState<'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER'>(() => {
    try {
      const saved = localStorage.getItem('vixy_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const email = parsed?.user?.email?.toLowerCase();
        if (email === 'vixyvault0@gmail.com' || parsed?.user?.role === 'ADMIN' || parsed?.user?.role === 'OWNER') {
          return 'ADMIN';
        }
        return parsed?.user?.role || 'UNPAID';
      }
    } catch (e) {
      console.error(e);
    }
    return 'UNPAID';
  });

  // 24-Hour Day Pass State & Entitlements
  const [dayPassInfo, setDayPassInfo] = useState<{
    active: boolean;
    startedAt?: string | null;
    expiresAt?: string | null;
    secondsRemaining: number;
  }>({ active: false, secondsRemaining: 0 });

  const [terminalAccessGranted, setTerminalAccessGranted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vixy_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const role = String(parsed?.user?.role || '').toUpperCase();
        return ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'SUPPORT', 'STARTER'].includes(role);
      }
    } catch (e) {}
    return false;
  });
  const [isEntitlementLoading, setIsEntitlementLoading] = useState<boolean>(true);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [paymentVerificationText, setPaymentVerificationText] = useState<string>('VERIFYING PAYMENT...');

  // Authoritative Subscription State
  const [subscription, setSubscription] = useState<UserSubscription>(() => {
    try {
      const saved = localStorage.getItem('vixy_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const role = String(parsed?.user?.role || '').toUpperCase();
        const sub = String(parsed?.user?.subscription || '').toUpperCase();
        if (role === 'ELITE' || sub.includes('ELITE')) {
          return {
            plan: 'VIXY VAULT ELITE QUANT' as any,
            status: 'active',
            renewalDate: '30 days from now',
            paymentMethod: 'Stripe Credit Card',
            billingInterval: 'monthly',
          };
        } else if (role === 'PRO' || role === 'STARTER' || sub.includes('PRO') || sub.includes('STARTER')) {
          return {
            plan: (sub.includes('STARTER') ? 'STARTER' : 'PRO') as any,
            status: 'active',
            renewalDate: '30 days from now',
            paymentMethod: 'Stripe Credit Card',
            billingInterval: 'monthly',
          };
        }
      }
    } catch (e) {}
    return {
      plan: 'ELITE',
      status: 'inactive',
      renewalDate: 'August 27, 2026',
      paymentMethod: 'Corporate Visa ending in 4242',
      billingInterval: 'annual',
    };
  });

  const [entitlements, setEntitlements] = useState<EntitlementsResponse['entitlements']>({
    starter: true,
    proQuant: true,
    eliteQuant: true,
    scalping15s: true,
    canAccessProDesks: true,
    canAccessAdminPanel: false,
  });

  const [maintenanceState, setMaintenanceState] = useState<{
    maintenance: boolean;
    emergencyLock: boolean;
    message: string;
    reason?: string;
  }>({
    maintenance: false,
    emergencyLock: false,
    message: '',
  });

  useEffect(() => {
    const checkMaintenance = () => {
      fetch('/api/maintenance/status')
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.maintenance === 'boolean') {
            setMaintenanceState({
              maintenance: data.maintenance,
              emergencyLock: data.emergencyLock,
              message: data.message || 'VIXY VAULT is temporarily in maintenance. Your account and active entitlement are safe.',
              reason: data.reason,
            });
          }
        })
        .catch(() => {});
    };
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    const sessionId = params.get('session_id');
    
    if (stripeStatus === 'success' || sessionId) {
      setIsVerifyingPayment(true);
      
      const userEmail = authState.user?.email || localStorage.getItem('vixy_user_email') || '';
      const userId = authState.user?.id || '';

      if (sessionId && userEmail) {
        fetch('/api/auth/restore-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail, 'x-user-uid': userId },
          body: JSON.stringify({ email: userEmail, uid: userId, stripeSessionId: sessionId }),
        }).catch(() => {});
      }

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (!authState.isAuthenticated || !authState.user?.email) {
          if (attempts > 5) {
             clearInterval(pollInterval);
             setPaymentVerificationText('ACCESS VERIFIED');
             setTimeout(() => { setIsVerifyingPayment(false); }, 1500);
          }
          return;
        }
        
        try {
          // Use the entitlements API since it accurately returns dayPass and all subscription tiers
          const curUserId = authState.user.id || '';
          const res = await fetch(`/api/entitlements?email=${encodeURIComponent(authState.user.email)}&userId=${encodeURIComponent(curUserId)}`);
          if (res.ok) {
            const ent = await res.json();
            if (ent.dayPass?.active || ent.status === 'active' || ent.status === 'trialing' || ent.plan === 'ELITE_QUANT' || ent.plan === 'ELITE' || ent.plan === 'PRO_QUANT' || ent.plan === 'PRO' || ent.plan === 'STARTER' || ent.plan === 'DAY_PASS') {
              clearInterval(pollInterval);
              setPaymentVerificationText('PAYMENT VERIFIED');
              
              // Also eagerly update the UI state
              setDayPassInfo(ent.dayPass || { active: true, secondsRemaining: 86400 });
              const resolvedRole = ent.entitlements?.canAccessAdminPanel ? 'ADMIN' : (ent.plan === 'ELITE_QUANT' || ent.plan === 'ELITE' || ent.entitlements?.eliteQuant ? 'ELITE' : 'PRO');
              setUserRole(resolvedRole);
              setTerminalAccessGranted(true);
              
              setTimeout(() => {
                setIsVerifyingPayment(false);
                setActiveTab('terminal');
                window.history.replaceState({}, document.title, window.location.pathname);
              }, 1500);
            } else if (attempts >= 10) {
              clearInterval(pollInterval);
              setPaymentVerificationText('PAYMENT RECEIVED — FINALIZING ACCESS');
              setTimeout(() => {
                setIsVerifyingPayment(false);
                window.history.replaceState({}, document.title, window.location.pathname);
              }, 2000);
            }
          } else if (attempts >= 10) {
            clearInterval(pollInterval);
            setIsVerifyingPayment(false);
          }
        } catch (e) {
          if (attempts >= 10) {
            clearInterval(pollInterval);
            setIsVerifyingPayment(false);
          }
        }
      }, 2000);
      
      return () => clearInterval(pollInterval);
    }
  }, [authState.isAuthenticated, authState.user?.email, authState.user?.id]);

  useEffect(() => {
    const userEmail = authState.user?.email || (authState.isAuthenticated ? (localStorage.getItem('vixy_user_email') || '') : '');
    const userId = authState.user?.id || undefined;

    if (!userEmail && !userId) {
      setUserRole('UNPAID');
      setTerminalAccessGranted(false);
      setIsEntitlementLoading(false);
      return;
    }

    setIsEntitlementLoading(true);

    // Concurrently execute user session restoration (/api/auth/me) and entitlement resolution (/api/entitlements)
    const sessionRestorePromise = (authState.isAuthenticated && userEmail)
      ? safeFetchJson<{ authenticated: boolean; user: any; discord: any; access?: any; entitlement?: any }>(
          `/api/auth/me?email=${encodeURIComponent(userEmail)}`
        )
      : Promise.resolve(null);

    const entitlementPromise = getEntitlementsApi(userEmail, userId);

    Promise.allSettled([sessionRestorePromise, entitlementPromise])
      .then(([sessionResult, entitlementResult]) => {
        const sessionData = sessionResult.status === 'fulfilled' ? sessionResult.value : null;
        const entData = entitlementResult.status === 'fulfilled' ? entitlementResult.value : null;

        // Invalidate expired/invalid session
        if (sessionData && sessionData.authenticated === false) {
          setAuthState({ isAuthenticated: false, user: null });
          setUserRole('UNPAID');
          setTerminalAccessGranted(false);
          localStorage.removeItem('vixy_auth');
          setActiveTab('landing');
          return;
        }

        // Merge entitlement payload from concurrent endpoints for immediate authoritative resolution
        const mergedEnt = entData || sessionData?.entitlement || null;
        const canonicalAccess = sessionData?.access || null;

        if (mergedEnt) {
          if (mergedEnt.entitlements) {
            setEntitlements(mergedEnt.entitlements);
          }
          if (mergedEnt.dayPass) {
            setDayPassInfo(mergedEnt.dayPass);
          }

          const rawPlanStr = String(canonicalAccess?.product || canonicalAccess?.plan || mergedEnt.plan || '').toUpperCase();
          const resolvedPlan =
            rawPlanStr.includes('ELITE')
              ? 'VIXY VAULT ELITE QUANT'
              : rawPlanStr.includes('STARTER')
              ? 'STARTER'
              : rawPlanStr.includes('DAY_PASS')
              ? 'DAY_PASS'
              : 'PRO_QUANT';

          const isSubActive =
            canonicalAccess?.access === true ||
            mergedEnt.status === 'active' || mergedEnt.status === 'trialing' ||
            mergedEnt.dayPass?.active;

          setSubscription({
            plan: resolvedPlan as any,
            status: isSubActive ? 'active' : (mergedEnt.status === 'past_due' ? 'past_due' : 'inactive'),
            renewalDate: mergedEnt.dayPass?.active ? '24 Hours Pass' : '30 days from now',
            paymentMethod: 'Stripe Credit Card',
            billingInterval: mergedEnt.billing === 'YEARLY' ? 'annual' : 'monthly',
          });
        }

        // Determine computed access role and instant terminal access unlock from canonical server contract
        const canonicalRole = canonicalAccess?.role;
        const rawRole = String(canonicalRole || sessionData?.user?.role || authState.user?.role || '').toUpperCase();
        const rawPlan = String(canonicalAccess?.product || canonicalAccess?.plan || mergedEnt?.plan || sessionData?.user?.subscription || '').toUpperCase();

        const isDayPassActive = Boolean(
          mergedEnt?.dayPass?.active ||
          (mergedEnt?.dayPass?.expiresAt && new Date(mergedEnt.dayPass.expiresAt).getTime() > Date.now()) ||
          canonicalAccess?.product === 'DAY_PASS' ||
          canonicalAccess?.plan === 'DAY_PASS'
        );

        let computedRole: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' = 'UNPAID';
        if (canonicalRole) {
          computedRole = canonicalRole;
        } else if (rawRole === 'OWNER') {
          computedRole = 'OWNER';
        } else if (['ADMIN', 'SUPPORT'].includes(rawRole) || mergedEnt?.entitlements?.canAccessAdminPanel) {
          computedRole = 'ADMIN';
        } else if (rawRole === 'ELITE' || rawPlan.includes('ELITE') || mergedEnt?.entitlements?.eliteQuant) {
          computedRole = 'ELITE';
        } else if (
          rawRole === 'PRO' || rawRole === 'STARTER' || rawPlan.includes('PRO') || rawPlan.includes('STARTER') ||
          canonicalAccess?.access === true || mergedEnt?.entitlements?.proQuant || mergedEnt?.entitlements?.starter ||
          isDayPassActive || mergedEnt?.status === 'active' || mergedEnt?.status === 'trialing'
        ) {
          computedRole = 'PRO';
        } else {
          computedRole = 'UNPAID';
        }

        const isStaff = computedRole === 'OWNER' || computedRole === 'ADMIN';
        const hasAccess =
          canonicalAccess?.access === true ||
          isStaff ||
          (computedRole !== 'UNPAID' && (mergedEnt?.status === 'active' || mergedEnt?.status === 'trialing' || isDayPassActive));

        setUserRole(computedRole);
        setTerminalAccessGranted(Boolean(hasAccess));

        // Synchronize live user session state
        if (sessionData && sessionData.authenticated && sessionData.user) {
          setAuthState((prev) => {
            if (!prev.isAuthenticated || !prev.user) return prev;

            const isLinked = !!(sessionData.user.discordLinked || sessionData.discord?.linked);
            const dId = sessionData.user.discordId || sessionData.discord?.discordUserId;
            const dTag = sessionData.user.discordTag || sessionData.discord?.discordUsername;

            if (
              prev.user.role === computedRole &&
              (prev.user as any).discordLinked === isLinked &&
              (prev.user as any).discordId === dId &&
              (prev.user as any).discordTag === dTag
            ) {
              return prev;
            }

            const updatedUser: NonNullable<AuthState['user']> = {
              ...prev.user,
              // @ts-ignore
              discordLinked: isLinked,
              // @ts-ignore
              discordId: dId,
              // @ts-ignore
              discordTag: dTag,
              role: computedRole,
              // @ts-ignore
              subscription: sessionData.user.subscription,
            };

            localStorage.setItem('vixy_auth', JSON.stringify({ ...prev, user: updatedUser }));
            if (sessionData.user.email) {
              localStorage.setItem('vixy_user_email', sessionData.user.email.toLowerCase());
            }
            localStorage.setItem('vixy_user_role', computedRole);
            return { ...prev, user: updatedUser };
          });
        }
      })
      .catch((err) => {
        console.warn('Concurrent auth verification notice:', err);
      })
      .finally(() => {
        setIsEntitlementLoading(false);
      });
  }, [authState.isAuthenticated, authState.user?.email, authState.user?.id]);


  const VALID_ROUTES = [
    'hub', 'vixylive', 'terminal', 'markets', 'compare', 'scalping', 'onehour', 'patterns', 'whales',
    'explainability', 'perflab', 'coach', 'replay', 'scanner', 'history', 'changelog',
    'leaderboard', 'journal', 'alerts', 'settings', 'admin', 'landing', 'pricing',
    'auth', 'terms', 'privacy', 'risk', 'refunds', 'contact', 'about', 'discord-bot',
    'vixy-learning'
  ];

  const getTabFromLocation = (): string => {
    try {
      const path = window.location.pathname.replace(/^\//, '').trim();
      const hash = window.location.hash.replace(/^#\/?/, '').trim();

      // New clean paths (e.g. /vixy-live) — canonical going forward.
      if (path && PATH_TO_TAB[path]) return PATH_TO_TAB[path];

      // Legacy hash links (#terminal, #vixylive, ...) from before this change — still work.
      if (hash && VALID_ROUTES.includes(hash)) return hash;
      if (hash === 'subscription') return 'pricing';

      // Legacy raw tab-name paths (e.g. /terminal) from before this change — still work.
      if (path && VALID_ROUTES.includes(path)) return path;
      if (path === 'subscription') return 'pricing';

      if (hash && !VALID_ROUTES.includes(hash)) return '404';
      if (path && !VALID_ROUTES.includes(path)) return '404';
    } catch (e) {
      console.error(e);
    }
    return '';
  };

  const [activeTab, setActiveTabState] = useState<string>(() => {
    const locTab = getTabFromLocation();
    if (locTab) return locTab;

    try {
      const savedAuth = localStorage.getItem('vixy_auth');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.isAuthenticated) return 'hub';
      }
    } catch (e) {
      console.error(e);
    }
    return 'landing';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const path = TAB_TO_PATH[tab] || (VALID_ROUTES.includes(tab) ? `/${tab}` : null);
    if (path && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  // Sync with browser back/forward and direct URL navigation
  useEffect(() => {
    const handleLocationChange = () => {
      const newTab = getTabFromLocation();
      if (newTab) {
        setActiveTabState(newTab);
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Firebase Authentication boot listener & automatic reconciliation
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.toLowerCase();
        const cleanName = fbUser.displayName || cleanEmail.split('@')[0];
        const uid = fbUser.uid;

        syncAuthUserApi({
          uid,
          email: cleanEmail,
          name: cleanName,
        }).catch((err) => console.warn('Auth sync error:', err));

        setAuthState((prev) => {
          if (!prev.isAuthenticated || prev.user?.email?.toLowerCase() !== cleanEmail) {
            const isAdmin = cleanEmail === 'vixyvault0@gmail.com';
            return {
              isAuthenticated: true,
              user: {
                id: uid,
                email: cleanEmail,
                name: cleanName,
                role: isAdmin ? 'ADMIN' : (prev.user?.role || 'UNPAID'),
                joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              },
            };
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync authState to localStorage & userRole & server directory
  useEffect(() => {
    try {
      if (authState.isAuthenticated && authState.user) {
        const email = authState.user.email?.toLowerCase();
        if (
          email === 'vixyvault0@gmail.com' ||
          authState.user.role === 'ADMIN' ||
          authState.user.role === 'OWNER'
        ) {
          setUserRole('ADMIN');
        } else if (authState.user.role) {
          setUserRole(authState.user.role as any);
        }
        localStorage.setItem('vixy_auth', JSON.stringify(authState));

        if (email) {
          syncAuthUserApi({
            uid: authState.user.id,
            email,
            name: authState.user.name,
            role: authState.user.role,
          }).catch(() => {});
        }
      } else {
        localStorage.removeItem('vixy_auth');
      }
    } catch (e) {
      console.error(e);
    }
  }, [authState]);

  // Heartbeat effect for active user online presence
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) return;
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authState.user?.email,
            uid: authState.user?.id,
          }),
        });
      } catch (e) {
        // Ignore heartbeat errors
      }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, [authState]);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalEmail, setAuthModalEmail] = useState<string>('');

  // Toggle Favorite Asset
  const handleToggleFavorite = (symbol: string) => {
    setFavorites((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  // Toggle Venue
  const handleToggleVenue = (venue: string) => {
    setSelectedVenues((prev) =>
      prev.includes(venue)
        ? prev.length > 1
          ? prev.filter((v) => v !== venue)
          : prev
        : [...prev, venue]
    );
  };

  // Live Ticker State initialized from active Asset
  const activeAssetConfig = ASSET_DATABASE[selectedAsset] || ASSET_DATABASE.BTC;
  const [ticker, setTicker] = useState<BTCTicker>({
    price: activeAssetConfig.price,
    change24h: activeAssetConfig.change24h,
    high24h: activeAssetConfig.high24h,
    low24h: activeAssetConfig.low24h,
    volume24h: 28410.5,
    timestamp: Date.now(),
  });

  // Spot prices map across assets
  const [spotPrices, setSpotPrices] = useState<Record<string, { price: number; change24h: number }>>({});

  useEffect(() => {
    let isMounted = true;
    const updateAllPrices = async () => {
      try {
        const tickers = await fetchAllCryptoTickers();
        if (isMounted && Array.isArray(tickers) && tickers.length > 0) {
          const map: Record<string, { price: number; change24h: number }> = {};
          tickers.forEach((t) => {
            if (t.symbol && t.price) {
              map[t.symbol] = { price: t.price, change24h: t.change24h || 0 };
            }
          });
          setSpotPrices((prev) => ({ ...prev, ...map }));

          const currentLive = map[selectedAsset];
          if (currentLive) {
            setTicker((prev) => ({
              ...prev,
              price: currentLive.price,
              change24h: currentLive.change24h,
              timestamp: Date.now(),
            }));
          }
        }
      } catch (e) {
        // Ignore
      }
    };

    updateAllPrices();
    const interval = setInterval(updateAllPrices, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  // When selectedAsset changes, sync Ticker from live feed or cached spot price
  useEffect(() => {
    let isMounted = true;
    const config = ASSET_DATABASE[selectedAsset] || ASSET_DATABASE.BTC;
    const cachedSpot = spotPrices[selectedAsset];
    
    setTicker({
      price: cachedSpot?.price || config.price,
      change24h: cachedSpot?.change24h ?? config.change24h,
      high24h: config.high24h,
      low24h: config.low24h,
      volume24h: 28410.5,
      timestamp: Date.now(),
    });

    fetchCryptoTicker(selectedAsset).then((data) => {
      if (isMounted && data && data.price) {
        setTicker(data);
        setSpotPrices((prev) => ({
          ...prev,
          [selectedAsset]: { price: data.price, change24h: data.change24h },
        }));
      }
    }).catch(() => {});

    // Live Stream Connection
    const cleanupWs = connectLiveCryptoStream(
      selectedAsset,
      (update) => {
        if (isMounted) {
          setTicker((prev) => ({ ...prev, ...update }));
          if (update.price) {
            setSpotPrices((prev) => ({
              ...prev,
              [selectedAsset]: {
                price: update.price!,
                change24h: update.change24h ?? prev[selectedAsset]?.change24h ?? 0,
              },
            }));
          }
        }
      }
    );

    return () => {
      isMounted = false;
      cleanupWs();
    };
  }, [selectedAsset]);

  // Live Candles State
  const [candles, setCandles] = useState<Candle[]>([]);

  // Alert Settings State
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    try {
      const saved = localStorage.getItem('vixy_alert_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // localStorage is a cache for USER PREFERENCES only -- never a source of
        // truth about the Discord relationship. Gating reads
        // `discordLinked && guildMember`, so restoring those from local state
        // would let a stale entry (or a hand-edited one -- localStorage is
        // user-writable) unlock gated views with no backend confirmation, and
        // would keep claiming "Connected" after an unlink or on another account.
        // These fields are cleared on every boot and repopulated only by the
        // authenticated /api/discord/user-profile response in syncProfile().
        return {
          ...parsed,
          discordLinked: false,
          guildMember: false,
          serverJoined: false,
          discordUserId: undefined,
          discordUsername: undefined,
          roleAssigned: 'None',
          syncStatus: 'PENDING',
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      discordWebhook: 'https://discord.com/api/webhooks/123456789/vixy_terminal_signals',
      discordEnabled: true,
      discordUserId: undefined,
      discordUsername: undefined,
      discordLinked: false,
      discordSoundEnabled: true,
      discordNotificationSound: 'discord_ping',
      telegramBotToken: '718293847:AAH...',
      telegramChatId: '-1001928374',
      telegramEnabled: false,
      minConfidence: 85,
      minEdge: 5,
      minEdgePct: 5,
      notify1MinBeforeClose: true,
      notifyNewSignal: true,
      notifyOutcome: true,
      onlyHighGrade: true,
      emailAlerts: true,
      emailAddress: 'trader@vixyvault.com',
    };
  });

  // Sync Discord profile from real backend API on mount & user auth changes
  useEffect(() => {
    async function syncProfile() {
      try {
        const activeEmail = authState.user?.email || alertSettings.emailAddress;
        const activeUserId = authState.user?.id;

        // 1. Fetch authoritative account state
        const accountRes = await getAccountMeApi(activeEmail, activeUserId);
        if (accountRes && accountRes.authenticated && accountRes.discord) {
          const d = accountRes.discord as any;
          if (d.linked || d.discordUserId) {
            const isGuildMember = d.guildMember ?? d.profile?.guildMember ?? false;
            const dUsername = d.discordUsername || d.profile?.discordUsername;
            const dUserId = d.discordUserId || d.profile?.discordUserId;
            const role = d.profile?.guildRoles?.[0] || (isGuildMember ? 'PRO' : 'None');
            const syncStatus = isGuildMember ? 'HEALTHY' : 'NEEDS_GUILD';

            setAlertSettings((prev) => {
              if (
                prev.discordLinked === true &&
                prev.discordUsername === (dUsername || prev.discordUsername) &&
                prev.discordUserId === (dUserId || prev.discordUserId) &&
                prev.guildMember === isGuildMember &&
                prev.roleAssigned === role &&
                prev.syncStatus === syncStatus
              ) {
                return prev;
              }
              return {
                ...prev,
                discordLinked: true,
                discordUsername: dUsername || prev.discordUsername,
                discordUserId: dUserId || prev.discordUserId,
                guildMember: isGuildMember,
                roleAssigned: role,
                lastSyncTimestamp: new Date().toLocaleTimeString(),
                syncStatus,
              };
            });
            return;
          }
        }

        // 2. Direct Discord profile query fallback
        const res = await getDiscordUserProfileApi(activeEmail, activeUserId);
        if (res && res.linked && res.profile) {
          const isGuildMember = res.profile.guildMember ?? false;
          const role = res.profile.guildRoles?.[0] || (isGuildMember ? 'PRO' : 'None');
          const syncStatus = res.profile.verificationStatus === 'VERIFIED' ? 'HEALTHY' : 'NEEDS_GUILD';

          setAlertSettings((prev) => {
            if (
              prev.discordLinked === true &&
              prev.discordUsername === (res.profile.discordUsername || prev.discordUsername) &&
              prev.discordUserId === (res.profile.discordUserId || prev.discordUserId) &&
              prev.guildMember === isGuildMember &&
              prev.roleAssigned === role &&
              prev.syncStatus === syncStatus
            ) {
              return prev;
            }
            return {
              ...prev,
              discordLinked: true,
              discordUsername: res.profile.discordUsername || prev.discordUsername,
              discordUserId: res.profile.discordUserId || prev.discordUserId,
              guildMember: isGuildMember,
              roleAssigned: role,
              lastSyncTimestamp: res.profile.lastSync || new Date().toLocaleTimeString(),
              syncStatus,
            };
          });
        } else if (authState.user?.discordId || (authState.user as any)?.discordLinked) {
          // Permanently preserve linked Discord identity even during transient background refreshes
          setAlertSettings((prev) => {
            const nextUserId = prev.discordUserId || authState.user?.discordId;
            const nextUserTag = prev.discordUsername || (authState.user as any)?.discordTag;
            if (prev.discordLinked === true && prev.discordUserId === nextUserId && prev.discordUsername === nextUserTag) {
              return prev;
            }
            return {
              ...prev,
              discordLinked: true,
              discordUserId: nextUserId,
              discordUsername: nextUserTag,
            };
          });
        }
      } catch (e) {
        console.warn('Discord profile sync notice:', e);
      }
    }
    syncProfile();
  }, [authState.user?.email, authState.user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem('vixy_alert_settings', JSON.stringify(alertSettings));
    } catch (e) {
      console.error(e);
    }
  }, [alertSettings]);

  // API Keys State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key_live_9812',
      name: 'Automated Bot Execution Key',
      keyPreview: 'vixy_live_89123490...',
      createdAt: '2026-02-10',
      lastUsed: '2 mins ago',
      permissions: ['read', 'trade'],
    },
  ]);

  // Direct Exchange API Credentials State (Elite Pass feature for Kalshi, Polymarket, DraftKings)
  const [exchangeKeys, setExchangeKeys] = useState<ExchangeApiKeys>({
    kalshi: {
      connected: true,
      apiKey: 'kalshi_sec_9810239102',
      apiSecret: '••••••••••••••••••••••••',
      environment: 'live',
      status: 'CONNECTED',
      latencyMs: 12,
      lastPing: '2s ago',
    },
    polymarket: {
      connected: true,
      apiKey: 'poly_l2_0x892a71f02931',
      passphraseOrWallet: '0x7129...8a19',
      environment: 'live',
      status: 'CONNECTED',
      latencyMs: 18,
      lastPing: '1s ago',
    },
    draftkings: {
      connected: false,
      apiKey: '',
      environment: 'live',
      status: 'DISCONNECTED',
      latencyMs: 0,
      lastPing: 'Never',
    },
  });

  // Trade Journal Entries
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: 'LOG-8812',
      timestamp: Date.now() - 3600 * 1000 * 2,
      market: 'BTC/USDT 15M',
      direction: 'YES',
      entryPrice: 63980,
      exitPrice: 64120,
      targetPrice: 64100,
      positionSizeUSD: 2500,
      pnlUSD: 280,
      pnlPct: 11.2,
      confidenceScore: 91,
      tradeGrade: 'A+',
      notes: 'Clean L2 net delta spike (+1,420 BTC). Kalshi implied odds were severely underpriced at 48%. Easy win.',
      status: 'WIN',
    },
  ]);

  // Historical Records State
  const [history] = useState<HistoricalPrediction[]>(INITIAL_HISTORICAL_PREDICTIONS);

  // Admin Data State
  const [adminStats] = useState<AdminStats>(INITIAL_ADMIN_STATS);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);

  // Fetch Live Ticker & Klines for Selected Asset and Connect Live WebSocket Stream
  useEffect(() => {
    let isMounted = true;
    let isFetchingPrices = false;

    const loadData = async () => {
      if (isFetchingPrices) return;
      isFetchingPrices = true;
      try {
        const liveTicker = await fetchCryptoTicker(selectedAsset);
        const liveCandles = await fetchCryptoKlines(selectedAsset, selectedTimeframe);

        if (isMounted) {
          if (liveTicker && liveTicker.price) setTicker(liveTicker);
          if (liveCandles && liveCandles.length > 0) setCandles(liveCandles);
        }
      } catch (e) {
        // Fallback or retry silently
      } finally {
        isFetchingPrices = false;
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);

    // Connect to Live Binance WebSocket Stream for Real Tick Updates
    const unsubscribeWs = connectLiveCryptoStream(selectedAsset, (streamUpdate) => {
      if (!isMounted) return;

      setTicker((prev) => {
        const updatedPrice = streamUpdate.price || prev.price;
        return {
          ...prev,
          ...streamUpdate,
          price: updatedPrice,
          high24h: Math.max(prev.high24h, updatedPrice),
          low24h: Math.min(prev.low24h > 0 ? prev.low24h : updatedPrice, updatedPrice),
          timestamp: Date.now(),
        };
      });

      // Update active candle close with live stream tick
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const updated = [...prevCandles];
        const lastCandle = { ...updated[updated.length - 1] };
        lastCandle.close = streamUpdate.price;
        lastCandle.high = Math.max(lastCandle.high, streamUpdate.price);
        lastCandle.low = Math.min(lastCandle.low, streamUpdate.price);
        updated[updated.length - 1] = lastCandle;
        return updated;
      });
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (unsubscribeWs) unsubscribeWs();
    };
  }, [selectedAsset, selectedTimeframe]);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleStartFreeTrial = () => {
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('vixy_auth');
    } catch (e) {
      console.error(e);
    }
    setAuthState({
      isAuthenticated: false,
      user: null,
    });
    setUserRole('UNPAID');
    setActiveTab('landing');
  };

  const {
    isAuthenticated,
    hasActiveAccess,
    userProduct,
    passCountdownFormatted
  } = useAuthSubscription({
    authState,
    subscription,
    userRole,
    dayPassInfo
  });

  const isSubscriptionActive = hasActiveAccess;

  const handleLaunchTerminal = () => {
    if (!authState.isAuthenticated) {
      handleOpenAuth('register');
    } else if (!hasActiveAccess) {
      setActiveTab('pricing');
    } else {
      setActiveTab('terminal');
    }
  };

  const handleLaunchVixyLive = () => {
    if (!authState.isAuthenticated) {
      handleOpenAuth('register');
    } else if (!hasActiveAccess) {
      setActiveTab('pricing');
    } else {
      setActiveTab('vixylive');
    }
  };

  const handleAuthSuccess = (
    role: 'PRO' | 'UNPAID' | 'ADMIN' | string,
    email?: string,
    plan?: string,
    isNewUser?: boolean
  ) => {
    const roleStr = String(role || '').toUpperCase();
    const isPaid = ['PRO', 'ADMIN', 'OWNER', 'ELITE', 'DAY_PASS', 'STARTER'].includes(roleStr) ||
                   ['PRO', 'ADMIN', 'OWNER', 'ELITE', 'STARTER'].includes(userRole) ||
                   isSubscriptionActive ||
                   dayPassInfo.active;

    if (isPaid) {
      setTerminalAccessGranted(true);
      const computedRole = roleStr === 'DAY_PASS'
        ? 'PRO'
        : (['OWNER', 'ADMIN', 'ELITE', 'PRO', 'STARTER'].includes(roleStr) ? roleStr : 'PRO');
      setUserRole(computedRole as any);
      if (plan) {
        setSubscription(prev => ({
          ...prev,
          status: 'active',
          plan: plan.includes('ELITE') ? 'VIXY VAULT ELITE QUANT' as any : (plan.includes('STARTER') ? 'STARTER' as any : 'PRO' as any)
        }));
      }
    }

    // Trigger subtle toast notification confirming the user's role immediately
    setAuthToast({
      id: `auth_toast_${Date.now()}`,
      role: roleStr,
      plan: plan || (isPaid ? 'PRO' : 'NONE'),
      email: email || authState.user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('vixy_user_email') || undefined : undefined),
      name: authState.user?.name,
      isNewUser: Boolean(isNewUser),
    });

    if (isPaid) {
      setActiveTab('terminal');
    } else {
      setActiveTab('pricing');
    }
  };

  const isPublicRoute = ['vixylive', 'vixylocks', 'history', 'landing', 'pricing', 'auth', 'terms', 'privacy', 'risk', 'refunds', 'contact', 'about', '404'].includes(activeTab);

  return (
    <>
      <AuthToast toast={authToast} onClose={() => setAuthToast(null)} />
      {isVerifyingPayment && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-[#05020F]/95 backdrop-blur-md animate-fadeIn font-mono text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase animate-pulse">{paymentVerificationText}</h2>
          <p className="text-purple-300 mt-3 max-w-md mx-auto text-sm">Please hold on while we securely verify your payment and provision your vault access.</p>
        </div>
      )}
  
      <div className="min-h-screen bg-[#05030a] text-purple-50 selection:bg-purple-600 selection:text-white flex flex-col font-sans">
      {isLoading && <LoadingOverlay onComplete={() => setIsLoading(false)} />}

      {/* Professional Maintenance Banner */}
      {(maintenanceState.maintenance || maintenanceState.emergencyLock) && (
        <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-purple-950/90 border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 z-40 backdrop-blur-md sticky top-0 shadow-lg">
          <div className="flex items-center gap-2.5 max-w-5xl">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
            <span className="font-black uppercase tracking-wider text-amber-400 text-[11px] bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50">
              Maintenance Mode
            </span>
            <span className="text-amber-100 font-medium text-[11px] sm:text-xs">
              {maintenanceState.message || 'VIXY VAULT is undergoing maintenance. Your account and active entitlement are safe. New checkouts and trading execution are temporarily paused.'}
            </span>
            {userRole === 'ADMIN' && (
              <span className="bg-purple-900/80 border border-purple-400 text-purple-200 text-[10px] font-mono px-2 py-0.5 rounded font-black tracking-wider">
                ADMIN BYPASS
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!authState.isAuthenticated ? (
              <button
                onClick={() => handleOpenAuth('login')}
                className="text-xs font-bold bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Existing Customer? Sign In
              </button>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Session Active &amp; Entitlement Preserved
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <Header
        ticker={ticker}
        activeTab={activeTab as any}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        subscription={subscription}
        authState={authState}
        exchangeKeys={exchangeKeys}
        alertSettings={alertSettings}
        onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        dayPassInfo={dayPassInfo}
        selectedAsset={selectedAsset}
        selectedTimeframe={selectedTimeframe}
        selectedVenue={selectedVenues[0] || 'Kalshi'}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        spotPrices={spotPrices}
      />

      {/* Main Layout Container (Sidebar + Content Area) */}
      <div className="flex-1 flex max-w-[1700px] w-full mx-auto">
        {/* Left Sidebar (Only visible inside terminal desks, hidden on public Landing Page) */}
        {activeTab !== 'landing' && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onOpenSearch={() => setIsSearchOpen(true)}
            userRole={userRole}
            userProduct={userProduct}
            hasActiveAccess={hasActiveAccess}
            isAuthenticated={isAuthenticated}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* Main Content Workspace Area */}
        <main className={`flex-1 overflow-x-hidden ${activeTab === 'landing' ? 'p-0 w-full' : 'p-4 sm:p-6'}`}>
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
          {/* 1. Public Pages always accessible */}
            {activeTab === 'hub' && (
            <VixyHubView
              ticker={ticker}
              userRole={userRole}
              userProduct={userProduct}
              hasActiveAccess={hasActiveAccess}
              isAuthenticated={isAuthenticated}
              onOpenAuth={handleOpenAuth}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'vixylive' && (
            <VixyLiveView
              ticker={ticker}
              userRole={userRole}
              hasActiveAccess={hasActiveAccess}
              onOpenTerminal={() => setActiveTab('terminal')}
              onOpenReplay={() => setActiveTab('replay')}
              onOpenPricing={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === 'vixylocks' && (
            <VixyLockView
              ticker={ticker}
              userEmail={authState.user?.email || undefined}
              onOpenTerminal={() => setActiveTab('terminal')}
              onOpenReplay={() => setActiveTab('replay')}
              onOpenPricing={() => setActiveTab('pricing')}
              isAuthenticated={isAuthenticated}
              hasActiveAccess={hasActiveAccess}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {activeTab === 'history' && (
            <HistoricalAccuracy history={history} />
          )}

          {activeTab === 'landing' && (
            <LandingPage
              ticker={ticker}
              onLaunchTerminal={handleLaunchTerminal}
              onLaunchVixyLive={handleLaunchVixyLive}
              onOpenPricing={() => setActiveTab('pricing')}
              onOpenAuth={handleOpenAuth}
              dataSource={CURRENT_DATA_SOURCE}
              authState={authState}
            />
          )}

          {activeTab === 'pricing' && (
            <SubscriptionView
              subscription={subscription}
              setSubscription={setSubscription}
              userRole={userRole}
              setUserRole={setUserRole}
              authState={authState}
              onOpenAuth={handleOpenAuth}
              onOpenTerminal={() => setActiveTab('terminal')}
            />
          )}

          {activeTab === 'auth' && (
            <AuthView
              authState={authState}
              setAuthState={setAuthState}
              setUserRole={setUserRole}
              onSuccessNavigate={handleAuthSuccess}
            />
          )}

          {activeTab === 'terms' && (
            <TermsView onReturnToTerminal={() => setActiveTab('terminal')} />
          )}

          {activeTab === 'privacy' && (
            <PrivacyView onReturnToTerminal={() => setActiveTab('terminal')} />
          )}

          {activeTab === 'risk' && (
            <RiskDisclosureView onReturnToTerminal={() => setActiveTab('terminal')} />
          )}

          {activeTab === 'refunds' && (
            <RefundPolicyView
              onReturnToTerminal={() => setActiveTab('terminal')}
              onOpenPricing={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === 'contact' && (
            <ContactView onReturnToTerminal={() => setActiveTab('terminal')} />
          )}

          {activeTab === 'about' && (
            <AboutView
              onReturnToTerminal={() => setActiveTab('terminal')}
              onOpenPricing={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === '404' && (
            <NotFoundView
              onReturnToTerminal={() => setActiveTab('terminal')}
              onReturnToLanding={() => setActiveTab('landing')}
            />
          )}

          {/* 2. Protected Routes Logic */}
          {!isPublicRoute && (
            <>
              {/* Not Logged In -> Show Login Prompt / Screen */}
              {!authState.isAuthenticated ? (
                <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#0D071E] border-2 border-purple-500/40 text-center space-y-6 shadow-2xl font-mono animate-fadeIn">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400 shadow-lg shadow-purple-600/30">
                    <Lock className="w-8 h-8 text-purple-300" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>ACCOUNT AUTHENTICATION REQUIRED</span>
                    </div>
                    <h2 className="text-2xl font-black text-white font-sans">
                      Create an Account to Unlock 24-Hour Access
                    </h2>
                    <p className="text-sm text-purple-300/70 font-sans max-w-lg mx-auto leading-relaxed">
                      Register your secure VIXY account to activate your 24-Hour Day Pass ($9.99) and enter the live prediction terminal, order flow delta metrics, and real-time AI signal engine.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-sans max-w-lg mx-auto">
                    <button
                      onClick={() => handleOpenAuth('register')}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-cyan-950/80 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      <span>Create Account & Start Pass</span>
                    </button>

                    <button
                      onClick={() => handleOpenAuth('login')}
                      className="px-6 py-3.5 rounded-2xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Log In To Account</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-purple-900/40 flex items-center justify-center gap-6 text-xs text-purple-300/60 font-sans">
                    <button
                      onClick={() => setActiveTab('landing')}
                      className="hover:text-white transition-colors underline decoration-purple-500/40"
                    >
                      ← Return to Landing Page
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setActiveTab('pricing')}
                      className="hover:text-white transition-colors underline decoration-purple-500/40"
                    >
                      View Pro Plans
                    </button>
                  </div>
                </div>
              ) : (
                /* Logged in AND Active Subscription / Free Account -> Access Dashboard / Terminal Desks! */
                <div className="relative">
                  {/* In-App Terminal Maintenance Lock (Trading Actions Locked, Terminal Read-Only) */}
                  {(maintenanceState.maintenance || maintenanceState.emergencyLock) && userRole !== 'ADMIN' && (
                    <div className="mb-6 p-6 rounded-2xl bg-[#0d071d]/90 border-2 border-amber-500/60 backdrop-blur-md text-center space-y-3 shadow-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>TERMINAL READ-ONLY // SYSTEM UPDATE IN PROGRESS</span>
                      </div>
                      <h3 className="text-xl font-black text-white font-sans">
                        Live Systems Temporarily Locked for Maintenance
                      </h3>
                      <p className="text-sm text-purple-200/80 max-w-xl mx-auto font-sans leading-relaxed">
                        Your account, active subscription, and Day Pass entitlement remain 100% secure.
                        Trading execution and order routing are temporarily paused while algorithms and models are calibrated.
                      </p>
                    </div>
                  )}

                  {/* Top Control Panel (Asset Selector Pills, Timeframe, Venue & AI Summary) */}
                  {['terminal', 'markets', 'patterns', 'whales', 'explainability'].includes(activeTab) && (
                    <TopNavControls
                      selectedAsset={selectedAsset}
                      onSelectAsset={(sym) => setSelectedAsset(sym)}
                      selectedTimeframe={selectedTimeframe}
                      onSelectTimeframe={(tf) => setSelectedTimeframe(tf)}
                      selectedVenues={selectedVenues}
                      onToggleVenue={handleToggleVenue}
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                      onOpenSearch={() => setIsSearchOpen(true)}
                      onOpenCompare={() => setActiveTab('compare')}
                      spotPrices={spotPrices}
                    />
                  )}

                  {activeTab === 'terminal' && (
                    <VixyLockView
                      ticker={ticker}
                      userEmail={authState.user?.email}
                      onOpenTerminal={() => setActiveTab('terminal')}
                      onOpenReplay={() => setActiveTab('replay')}
                      onOpenPricing={() => setActiveTab('pricing')}
                      isAuthenticated={authState.isAuthenticated}
                      hasActiveAccess={hasActiveAccess}
                      onOpenAuth={handleOpenAuth}
                    />
                  )}

                  {activeTab === 'vixylive' && (
                    <VixyLiveView
                      ticker={ticker}
                      onOpenTerminal={() => setActiveTab('terminal')}
                      onOpenReplay={() => setActiveTab('replay')}
                      onOpenPricing={() => setActiveTab('pricing')}
                    />
                  )}

                  {activeTab === 'markets' && (
                    <MarketCardsView
                      onSelectAssetAndNavigate={(sym) => {
                        setSelectedAsset(sym);
                        setActiveTab('terminal');
                      }}
                      favorites={favorites}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  )}

                  {activeTab === 'compare' && (
                    <CompareView
                      onSelectAssetAndNavigate={(sym) => {
                        setSelectedAsset(sym);
                        setActiveTab('terminal');
                      }}
                      alertSettings={alertSettings}
                      userRole={userRole}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'scalping' && (
                    <ScalpingDeskView
                      ticker={ticker}
                      userRole={userRole}
                      selectedAsset={selectedAsset}
                      onSelectAsset={(sym) => setSelectedAsset(sym)}
                      alertSettings={alertSettings}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'onehour' && (
                    <OneHourDeskView
                      ticker={ticker}
                      spotPrices={spotPrices}
                      selectedAsset={selectedAsset}
                      userRole={userRole}
                      alertSettings={alertSettings}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'patterns' && (
                    <AIPatternEngine
                      ticker={ticker}
                      timeframe={selectedTimeframe as any}
                      alertSettings={alertSettings}
                      userRole={userRole}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'whales' && (
                    <WhaleTrackerView
                      onSelectAssetAndNavigate={(sym) => {
                        setSelectedAsset(sym);
                        setActiveTab('terminal');
                      }}
                      alertSettings={alertSettings}
                      userRole={userRole}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'explainability' && (
                    <ExplainabilityVaultView
                      currentSymbol={selectedAsset}
                      onSelectAsset={(sym) => setSelectedAsset(sym)}
                      alertSettings={alertSettings}
                      userRole={userRole}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'perflab' && <PerformanceLabView />}

                  {activeTab === 'coach' && <AICoachView />}

                  {activeTab === 'replay' && <ReplayCenterView />}

                  {activeTab === 'scanner' && (
                    <OpportunityScannerView
                      onSelectAssetAndNavigate={(sym) => {
                        setSelectedAsset(sym);
                        setActiveTab('terminal');
                      }}
                    />
                  )}

                  {activeTab === 'history' && <HistoricalAccuracy history={history} />}

                  {activeTab === 'changelog' && (
                    <ChangelogView
                      onOpenTerminal={() => setActiveTab('terminal')}
                      onOpenPricing={() => setActiveTab('pricing')}
                    />
                  )}

                  {activeTab === 'leaderboard' && (
                    <LeaderboardView
                      entries={journalEntries}
                      onOpenJournal={() => setActiveTab('journal')}
                    />
                  )}

                  {activeTab === 'journal' && (
                    <TradeJournalView entries={journalEntries} setEntries={setJournalEntries} />
                  )}

                  {activeTab === 'alerts' && (
                    <AlertSettingsView settings={alertSettings} setSettings={setAlertSettings} />
                  )}

                  {activeTab === 'design-system' && <DesignSystemShowcase />}

                  {activeTab === 'discord-bot' && (
                    userRole === 'ADMIN' ? (
                      <DiscordBotHubView />
                    ) : (
                      <NotFoundView onReturnToTerminal={() => setActiveTab('terminal')} />
                    )
                  )}

                  {activeTab === 'vixy-learning' && (
                    userRole === 'ADMIN' ? (
                      <VixyLearningCenter />
                    ) : (
                      <NotFoundView onReturnToTerminal={() => setActiveTab('terminal')} />
                    )
                  )}

                  {activeTab === 'settings' && (
                    <SettingsView
                      authState={authState}
                      setAuthState={setAuthState}
                      apiKeys={apiKeys}
                      setApiKeys={setApiKeys}
                      exchangeKeys={exchangeKeys}
                      setExchangeKeys={setExchangeKeys}
                      subscription={subscription}
                      onOpenPricing={() => setActiveTab('pricing')}
                    />
                  )}

                  {activeTab === 'admin' && (
                    userRole === 'ADMIN' || authState.user?.role === 'ADMIN' || authState.user?.role === 'OWNER' ? (
                      <AdminPanel stats={adminStats} tickets={supportTickets} setTickets={setSupportTickets} />
                    ) : (
                      <div className="bg-[#070410] border-2 border-rose-500/40 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-black text-white">403 — Restricted Master Admin Area</h2>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">
                          Your account role (<strong className="text-purple-300">{authState.user?.role || 'FREE'}</strong>) does not have server-side clearance to inspect system audit logs or alter global risk parameters.
                        </p>
                        <button
                          onClick={() => setActiveTab('terminal')}
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg"
                        >
                          Return to Live Executive Terminal
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          )}
            </div>

            {/* Contextual Right Intelligence Rail on Terminal Desks */}
            {['terminal', 'hub', 'scalping', 'onehour'].includes(activeTab) && (
              <ContextualRightRail
                decision={canonical15m.decision}
                selectedAsset={selectedAsset}
                onOpenPredictionCenter={() => setActiveTab('terminal')}
                className="hidden xl:block"
              />
            )}
          </div>
        </main>
      </div>

      {/* System Status Bar */}
      {activeTab !== 'landing' && (
        <SystemStatusBar
          secondsRemaining={canonical15m.decision?.secondsRemaining}
          cycleEnd={canonical15m.decision?.cycleEnd}
          dataHealthStatus={canonical15m.dataHealthStatus}
        />
      )}

      {/* Global Smart Search Modal */}
      <SmartSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAsset={(sym) => setSelectedAsset(sym)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      

      {/* Full-Screen Trial Expired Blurred Lockout Overlay */}
      {!isEntitlementLoading && !terminalAccessGranted && !['vixylive', 'pricing', 'landing', 'terms', 'privacy', 'risk', 'refunds', 'about', 'contact'].includes(activeTab) && (
        <TrialExpiredOverlay
          isAuthenticated={authState.isAuthenticated}
          userEmail={authState?.user?.email}
          userId={authState?.user?.id}
          discordUserId={authState?.user?.discordId}
          onViewPricing={() => setActiveTab('pricing')}
          onAccessGranted={() => {
             setTerminalAccessGranted(true);
             setIsEntitlementLoading(false);
          }}
          onOpenAuth={(mode, prefillEmail) => {
            setAuthModalMode(mode === 'signup' ? 'register' : (mode || 'login'));
            if (prefillEmail) setAuthModalEmail(prefillEmail);
            setShowAuthModal(true);
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        initialEmail={authModalEmail}
        setAuthState={setAuthState}
        setUserRole={setUserRole}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-purple-900/30 bg-[#040208] py-8 text-purple-300/60 text-xs font-mono space-y-4">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/80 animate-pulse" />
            <span className="text-white font-black tracking-tight cursor-pointer" onClick={() => setActiveTab('terminal')}>VIXY AI</span>
            <span className="text-purple-400/80">— AI Prediction Market Decision Intelligence</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-purple-300/70 text-xs">
            <button onClick={() => setActiveTab('about')} className="hover:text-white transition-colors">About Us</button>
            <span>•</span>
            <button onClick={() => setActiveTab('terms')} className="hover:text-white transition-colors">Terms of Service</button>
            <span>•</span>
            <button onClick={() => setActiveTab('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
            <span>•</span>
            <button onClick={() => setActiveTab('risk')} className="hover:text-rose-300 text-rose-400/90 font-bold transition-colors">Risk Disclosure</button>
            <span>•</span>
            <button onClick={() => setActiveTab('refunds')} className="hover:text-white transition-colors">Refund Policy</button>
            <span>•</span>
            <button onClick={() => setActiveTab('contact')} className="hover:text-white transition-colors">Contact & Support</button>
          </div>
        </div>

        {/* MANDATORY PERSISTENT DISCLOSURE */}
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-3 border-t border-purple-950 text-[11px] text-purple-300/50 font-sans leading-relaxed text-center sm:text-left">
          <strong>Mandatory Risk Disclosure:</strong> VIXY AI provides data-driven signals, market analysis, and explainable models — not financial advice or guaranteed outcomes. Prediction market contracts (Kalshi, Polymarket, DraftKings) carry substantial risk of loss, including total loss of principal. Past signal performance does not guarantee future results.
        </div>
      </footer>

      {/* DISCORD AUTOMATED ONBOARDING MODAL */}
      <DiscordOnboardingModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
        settings={alertSettings}
        setSettings={setAlertSettings}
        onComplete={() => setActiveTab('terminal')}
      />
    </div>
    </>
  );
}

