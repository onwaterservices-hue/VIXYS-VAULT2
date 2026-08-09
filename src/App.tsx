import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
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
import { fetchCryptoTicker, fetchCryptoKlines, connectLiveCryptoStream, fetchAllCryptoTickers, getDiscordUserProfileApi, syncAuthUserApi } from './services/api';
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
import { DiscordOnboardingModal } from './components/DiscordOnboardingModal';
import { RiskDisclosureView } from './components/RiskDisclosureView';
import { RefundPolicyView } from './components/RefundPolicyView';
import { ContactView } from './components/ContactView';
import { AboutView } from './components/AboutView';
import { NotFoundView } from './components/NotFoundView';

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Multi-Asset State & Navigation
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15M');
  const [selectedVenues, setSelectedVenues] = useState<string[]>(['Kalshi', 'Polymarket']);
  const [favorites, setFavorites] = useState<string[]>(['BTC', 'ETH', 'SOL']);

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);

  const [userRole, setUserRole] = useState<'DEMO' | 'PRO' | 'ADMIN'>(() => {
    try {
      const saved = localStorage.getItem('vixy_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        const email = parsed?.user?.email?.toLowerCase();
        if (email === 'vixyvault0@gmail.com' || parsed?.user?.role === 'ADMIN' || parsed?.user?.role === 'OWNER') {
          return 'ADMIN';
        }
        return parsed?.user?.role || 'ADMIN';
      }
    } catch (e) {
      console.error(e);
    }
    return 'ADMIN';
  });

  // 3-Hour Free Trial Pass State (10,800 seconds = 3 hours)
  const [trialSeconds, setTrialSeconds] = useState<number>(10800);

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

  const VALID_ROUTES = [
    'terminal', 'markets', 'compare', 'scalping', 'onehour', 'patterns', 'whales',
    'explainability', 'perflab', 'coach', 'replay', 'scanner', 'history', 'changelog',
    'leaderboard', 'journal', 'alerts', 'settings', 'admin', 'landing', 'pricing',
    'auth', 'terms', 'privacy', 'risk', 'refunds', 'contact', 'about'
  ];

  const getTabFromLocation = (): string => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_ROUTES.includes(hash)) return hash;
      if (hash === 'subscription') return 'pricing';
      if (hash && !VALID_ROUTES.includes(hash)) return '404';

      const path = window.location.pathname.replace(/^\//, '').trim();
      if (path && VALID_ROUTES.includes(path)) return path;
      if (path === 'subscription') return 'pricing';
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
        if (parsed?.isAuthenticated) return 'terminal';
      }
    } catch (e) {
      console.error(e);
    }
    return 'landing';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (VALID_ROUTES.includes(tab)) {
      window.location.hash = tab;
    }
  };

  // Sync with browser back/forward and location hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getTabFromLocation();
      if (newTab) {
        setActiveTabState(newTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
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
                role: isAdmin ? 'ADMIN' : (prev.user?.role || 'DEMO'),
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
          setUserRole(authState.user.role);
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

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

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

  // Trial Timer Countdown Effect
  useEffect(() => {
    if (userRole !== 'DEMO') return;

    const interval = setInterval(() => {
      setTrialSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userRole]);

  const handleResetTrial = () => {
    setTrialSeconds(10800);
  };

  const handleExpireTrial = () => {
    setTrialSeconds(0);
  };

  const handleUpgradeToPro = () => {
    setUserRole('PRO');
    setSubscription((prev) => ({
      ...prev,
      plan: 'PRO',
      status: 'active',
    }));
    setTrialSeconds(10800);
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
  const [spotPrices, setSpotPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const updateAllPrices = async () => {
      try {
        const tickers = await fetchAllCryptoTickers();
        if (isMounted && Array.isArray(tickers) && tickers.length > 0) {
          const map: Record<string, number> = {};
          tickers.forEach((t) => {
            if (t.symbol && t.price) {
              map[t.symbol] = t.price;
            }
          });
          setSpotPrices((prev) => ({ ...prev, ...map }));
        }
      } catch (e) {
        // Ignore
      }
    };

    updateAllPrices();
    const interval = setInterval(updateAllPrices, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // When selectedAsset changes, sync Ticker
  useEffect(() => {
    const config = ASSET_DATABASE[selectedAsset] || ASSET_DATABASE.BTC;
    setTicker({
      price: config.price,
      change24h: config.change24h,
      high24h: config.high24h,
      low24h: config.low24h,
      volume24h: 28410.5,
      timestamp: Date.now(),
    });
  }, [selectedAsset]);

  // Live Candles State
  const [candles, setCandles] = useState<Candle[]>([]);

  // Subscription State
  const [subscription, setSubscription] = useState<UserSubscription>({
    plan: 'ELITE',
    status: 'active',
    renewalDate: 'August 27, 2026',
    paymentMethod: 'Corporate Visa ending in 4242',
    billingInterval: 'annual',
  });

  // Alert Settings State
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    try {
      const saved = localStorage.getItem('vixy_alert_settings');
      if (saved) return JSON.parse(saved);
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

  // Sync Discord profile from real backend API on mount
  useEffect(() => {
    async function syncProfile() {
      try {
        const res = await getDiscordUserProfileApi();
        if (res && res.linked && res.profile) {
          setAlertSettings((prev) => ({
            ...prev,
            discordLinked: true,
            discordUsername: res.profile.discordUsername,
            discordUserId: res.profile.discordUserId,
            guildMember: res.profile.guildMember,
            roleAssigned: res.profile.guildRoles?.[0] || (res.profile.guildMember ? 'PRO' : 'None'),
            lastSyncTimestamp: res.profile.lastSync || new Date().toLocaleTimeString(),
            syncStatus: res.profile.verificationStatus === 'VERIFIED' ? 'HEALTHY' : 'NEEDS_GUILD',
          }));
        } else {
          setAlertSettings((prev) => ({
            ...prev,
            discordLinked: false,
            discordUsername: undefined,
            discordUserId: undefined,
            guildMember: false,
            roleAssigned: 'NONE',
            syncStatus: 'DISCONNECTED',
          }));
        }
      } catch (e) {
        console.warn('Discord profile sync on mount notice:', e);
      }
    }
    syncProfile();
  }, []);

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

    const loadData = async () => {
      try {
        const liveTicker = await fetchCryptoTicker(selectedAsset);
        const liveCandles = await fetchCryptoKlines(selectedAsset, selectedTimeframe);

        if (isMounted) {
          if (liveTicker && liveTicker.price) setTicker(liveTicker);
          if (liveCandles && liveCandles.length > 0) setCandles(liveCandles);
        }
      } catch (e) {
        // Fallback or retry silently
      }
    };

    loadData();
    const interval = setInterval(loadData, 2000);

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
    const trialUser = {
      id: `usr_trial_${Math.random().toString(36).substring(2, 7)}`,
      email: 'trial.user@vixysvault.com',
      name: 'Free Trial User',
      role: 'DEMO' as const,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    syncAuthUserApi({
      email: trialUser.email,
      name: trialUser.name,
      role: 'FREE',
      subscription: 'FREE_TRIAL',
    }).catch((err) => console.warn('Auth sync error:', err));

    setAuthState({
      isAuthenticated: true,
      user: trialUser,
    });
    setUserRole('DEMO');
    setTrialSeconds(10800);
    setActiveTab('terminal');
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
    setUserRole('DEMO');
    setActiveTab('landing');
  };

  const isSubscriptionActive =
    subscription.status === 'active' ||
    userRole === 'PRO' ||
    userRole === 'ADMIN' ||
    (userRole === 'DEMO' && trialSeconds > 0);

  const isPublicRoute = ['landing', 'pricing', 'auth', 'terms', 'privacy', 'risk', 'refunds', 'contact', 'about', '404'].includes(activeTab);

  return (
    <div className="min-h-screen bg-[#05030a] text-purple-50 selection:bg-purple-600 selection:text-white flex flex-col font-sans">
      {isLoading && <LoadingOverlay onComplete={() => setIsLoading(false)} />}

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
        trialSeconds={trialSeconds}
        onResetTrial={handleResetTrial}
        onExpireTrial={handleExpireTrial}
        selectedAsset={selectedAsset}
        selectedTimeframe={selectedTimeframe}
        selectedVenue={selectedVenues[0] || 'Kalshi'}
        onOpenSearch={() => setIsSearchOpen(true)}
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
          />
        )}

        {/* Main Content Workspace Area */}
        <main className={`flex-1 overflow-x-hidden ${activeTab === 'landing' ? 'p-0 w-full' : 'p-4 sm:p-6'}`}>
          {/* 1. Public Pages always accessible */}
          {activeTab === 'landing' && (
            <LandingPage
              ticker={ticker}
              onLaunchTerminal={() => setActiveTab('terminal')}
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
              trialSeconds={trialSeconds}
              onResetTrial={handleResetTrial}
              onExpireTrial={handleExpireTrial}
            />
          )}

          {activeTab === 'auth' && (
            <AuthView
              authState={authState}
              setAuthState={setAuthState}
              setUserRole={setUserRole}
              onSuccessNavigate={() => setActiveTab('terminal')}
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>ACCOUNT CREATION REQUIRED</span>
                    </div>
                    <h2 className="text-2xl font-black text-white font-sans">
                      Create an Account to Unlock Your Free Access
                    </h2>
                    <p className="text-sm text-purple-300/70 font-sans max-w-lg mx-auto leading-relaxed">
                      Register your free VIXY AI account to activate your 3-Hour Free Access Pass and enter the live prediction terminal, order flow delta metrics, and AI signal engine.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-sans max-w-lg mx-auto">
                    <button
                      onClick={() => handleOpenAuth('register')}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
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
              ) : !isSubscriptionActive ? (
                /* Logged in, BUT Subscription Inactive / Trial Expired -> Redirect to Pricing Page View */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-gradient-to-r from-amber-950/80 via-[#180C04] to-amber-950/80 border-2 border-amber-500/60 rounded-2xl p-5 text-amber-200 font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-white font-sans">
                          STEP 2: ACTIVE SUBSCRIPTION REQUIRED
                        </div>
                        <p className="text-amber-300/80 text-xs font-sans">
                          You are logged in, but your free trial pass has expired or your plan is inactive. Upgrade to a Pro or Elite plan below to unlock the live terminal.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleUpgradeToPro}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-all shadow-lg shadow-amber-500/20"
                    >
                      Instant Pro Upgrade ($29/mo)
                    </button>
                  </div>

                  <SubscriptionView
                    subscription={subscription}
                    setSubscription={setSubscription}
                    userRole={userRole}
                    setUserRole={setUserRole}
                    trialSeconds={trialSeconds}
                    onResetTrial={handleResetTrial}
                    onExpireTrial={handleExpireTrial}
                    authState={authState}
                  />
                </div>
              ) : (
                /* Logged in AND Active Subscription -> Access Dashboard / Terminal Desks! */
                <>
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
                    />
                  )}

                  {activeTab === 'terminal' && (
                    <LiveDashboard
                      ticker={ticker}
                      candles={candles}
                      onOpenAlerts={() => setActiveTab('alerts')}
                      onOpenPricing={() => setActiveTab('pricing')}
                      onOpenJournal={() => setActiveTab('journal')}
                      onOpenCompare={() => setActiveTab('compare')}
                      userRole={userRole}
                      selectedAsset={selectedAsset}
                      onSelectAsset={(sym) => setSelectedAsset(sym)}
                      selectedTimeframe={selectedTimeframe}
                      selectedVenues={selectedVenues}
                      exchangeKeys={exchangeKeys}
                      onOpenSettings={() => setActiveTab('settings')}
                      alertSettings={alertSettings}
                      setAlertSettings={setAlertSettings}
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
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'scalping' && (
                    <ScalpingDeskView
                      ticker={ticker}
                      userRole={userRole}
                      onUpgradeToPro={handleUpgradeToPro}
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
                      onUpgradeToPro={handleUpgradeToPro}
                      alertSettings={alertSettings}
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'patterns' && (
                    <AIPatternEngine
                      ticker={ticker}
                      timeframe={selectedTimeframe as any}
                      alertSettings={alertSettings}
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
                      onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
                    />
                  )}

                  {activeTab === 'explainability' && (
                    <ExplainabilityVaultView
                      currentSymbol={selectedAsset}
                      onSelectAsset={(sym) => setSelectedAsset(sym)}
                      alertSettings={alertSettings}
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

                  {activeTab === 'discord-bot' && (
                    userRole === 'ADMIN' ? (
                      <DiscordBotHubView />
                    ) : (
                      <NotFoundView />
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
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Smart Search Modal */}
      <SmartSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAsset={(sym) => setSelectedAsset(sym)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Full-Screen Trial Expired Blurred Lockout Overlay */}
      {userRole === 'DEMO' && trialSeconds <= 0 && (
        <TrialExpiredOverlay
          onUpgradeToPro={handleUpgradeToPro}
          onViewPricing={() => setActiveTab('pricing')}
          onResetTrial={handleResetTrial}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        setAuthState={setAuthState}
        setUserRole={setUserRole}
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
  );
}

