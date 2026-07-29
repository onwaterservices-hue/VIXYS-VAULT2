import React, { useState, useEffect } from 'react';
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
} from './types';
import { fetchBTCTicker, fetchBTCKlines } from './services/api';
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
import { AuthModal } from './components/AuthModal';
import { TradeJournalView } from './components/TradeJournalView';
import { SettingsView } from './components/SettingsView';
import { ScalpingDeskView } from './components/ScalpingDeskView';
import { OneHourDeskView } from './components/OneHourDeskView';
import { AIPatternEngine } from './components/AIPatternEngine';
import { WhaleTrackerView } from './components/WhaleTrackerView';
import { ExplainabilityVaultView } from './components/ExplainabilityVaultView';
import { AuthView } from './components/AuthView';
import { LoadingOverlay } from './components/LoadingOverlay';
import { TrialExpiredOverlay } from './components/TrialExpiredOverlay';

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('terminal');

  // Multi-Asset State & Navigation
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15M');
  const [selectedVenues, setSelectedVenues] = useState<string[]>(['Kalshi', 'Polymarket']);
  const [favorites, setFavorites] = useState<string[]>(['BTC', 'ETH', 'SOL']);

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [userRole, setUserRole] = useState<'DEMO' | 'PRO' | 'ADMIN'>('PRO');

  // 3-Hour Free Trial Pass State (10,800 seconds = 3 hours)
  const [trialSeconds, setTrialSeconds] = useState<number>(10800);

  // Auth State
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: true,
    user: {
      id: 'usr_89123',
      email: 'quant.trader@vixyterminal.io',
      name: 'Alex Mercer',
      role: 'PRO',
      createdAt: '2026-01-15',
    },
  });

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
    plan: 'PRO',
    status: 'active',
    renewalDate: 'August 27, 2026',
    paymentMethod: 'Visa ending in 4242',
    billingInterval: 'annual',
  });

  // Alert Settings State
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    discordWebhook: 'https://discord.com/api/webhooks/123456789/vixy_terminal_signals',
    discordEnabled: true,
    telegramBotToken: '718293847:AAH...',
    telegramChatId: '-1001928374',
    telegramEnabled: true,
    minConfidence: 85,
    minEdge: 5,
    notify1MinBeforeClose: true,
  });

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

  // Fetch Live Ticker & Klines on Mount & Continuous Stream Interval
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const liveTicker = await fetchBTCTicker();
      const liveCandles = await fetchBTCKlines();

      if (isMounted) {
        if (selectedAsset === 'BTC' && liveTicker && liveTicker.price) setTicker(liveTicker);
        if (liveCandles && liveCandles.length > 0) setCandles(liveCandles);
      }
    };

    loadData();

    // Fast 1.5s Auto-Update Ticker Stream
    const interval = setInterval(async () => {
      if (!isMounted) return;

      setTicker((prev) => {
        const delta = (Math.random() - 0.49) * (prev.price * 0.0003);
        const newPrice = Math.max(0.0001, Math.round((prev.price + delta) * 100) / 100);
        return {
          ...prev,
          price: newPrice,
          high24h: Math.max(prev.high24h, newPrice),
          low24h: Math.min(prev.low24h, newPrice),
          timestamp: Date.now(),
        };
      });

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const updated = [...prevCandles];
        const lastCandle = { ...updated[updated.length - 1] };

        setTicker((currentTicker) => {
          const newPrice = currentTicker.price;
          lastCandle.close = newPrice;
          lastCandle.high = Math.max(lastCandle.high, newPrice);
          lastCandle.low = Math.min(lastCandle.low, newPrice);
          return currentTicker;
        });

        updated[updated.length - 1] = lastCandle;
        return updated;
      });
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
    });
    setUserRole('DEMO');
  };

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
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Main Content Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
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
            />
          )}

          {/* Active View Routing */}
          {activeTab === 'terminal' && (
            <LiveDashboard
              ticker={ticker}
              candles={candles}
              onOpenAlerts={() => setActiveTab('alerts')}
              onOpenPricing={() => setActiveTab('pricing')}
              onOpenJournal={() => setActiveTab('journal')}
              userRole={userRole}
              selectedAsset={selectedAsset}
              selectedTimeframe={selectedTimeframe}
              selectedVenues={selectedVenues}
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

          {activeTab === 'compare' && <CompareView />}

          {activeTab === 'scalping' && (
            <ScalpingDeskView
              ticker={ticker}
              userRole={userRole}
              onUpgradeToPro={handleUpgradeToPro}
            />
          )}

          {activeTab === 'onehour' && (
            <OneHourDeskView
              ticker={ticker}
              userRole={userRole}
              onUpgradeToPro={handleUpgradeToPro}
            />
          )}

          {activeTab === 'patterns' && (
            <AIPatternEngine ticker={ticker} timeframe={selectedTimeframe as any} />
          )}

          {activeTab === 'whales' && (
            <WhaleTrackerView
              onSelectAssetAndNavigate={(sym) => {
                setSelectedAsset(sym);
                setActiveTab('terminal');
              }}
            />
          )}

          {activeTab === 'explainability' && (
            <ExplainabilityVaultView
              currentSymbol={selectedAsset}
              onSelectAsset={(sym) => setSelectedAsset(sym)}
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

          {activeTab === 'history' && <HistoricalAccuracy history={history} />}

          {activeTab === 'journal' && (
            <TradeJournalView entries={journalEntries} setEntries={setJournalEntries} />
          )}

          {activeTab === 'alerts' && (
            <AlertSettingsView settings={alertSettings} setSettings={setAlertSettings} />
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

          {activeTab === 'settings' && (
            <SettingsView
              authState={authState}
              setAuthState={setAuthState}
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              subscription={subscription}
              onOpenPricing={() => setActiveTab('pricing')}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel stats={adminStats} tickets={supportTickets} setTickets={setSupportTickets} />
          )}

          {activeTab === 'landing' && (
            <LandingPage
              ticker={ticker}
              onLaunchTerminal={() => setActiveTab('terminal')}
              onOpenPricing={() => setActiveTab('pricing')}
              onOpenAuth={handleOpenAuth}
            />
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
      <footer className="border-t border-purple-900/30 bg-[#040208] py-6 text-purple-300/60 text-xs font-mono space-y-3">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/80 animate-pulse" />
            <span className="text-white font-black tracking-tight">VIXY'S VAULT</span>
            <span className="text-purple-400/80">— AI Prediction Market Decision Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-purple-300/60 text-[11px]">
            <span>L2 Microstructure Delta</span>
            <span>•</span>
            <span>Cross-Venue Liquidity Bridges</span>
            <span>•</span>
            <span>SHA-256 Verifiable Logs</span>
          </div>
        </div>

        {/* MANDATORY PERSISTENT DISCLOSURE */}
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-3 border-t border-purple-950 text-[11px] text-purple-300/50 font-sans leading-relaxed text-center sm:text-left">
          <strong>Mandatory Risk Disclosure:</strong> Vixy's Vault provides data-driven signals, market analysis, and explainable models — not financial advice or guaranteed outcomes. Prediction market contracts (Kalshi, Polymarket, DraftKings) carry substantial risk of loss, including total loss of principal. Past signal performance does not guarantee future results.
        </div>
      </footer>
    </div>
  );
}

