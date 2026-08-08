export type SignalDirection = 'YES' | 'NO' | 'BUY_UP' | 'BUY_DOWN' | 'UP' | 'DOWN'; // YES/BUY_UP/UP = Bullish, NO/BUY_DOWN/DOWN = Bearish

export interface BTCTicker {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
  marketImpliedYes: number; // e.g. 52% on Polymarket/Kalshi
  marketImpliedNo: number; // e.g. 48%
}

export interface Candle {
  time: number; // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  signal?: SignalDirection;
}

export interface OrderFlowMetrics {
  bullVolumePct: number;
  bearVolumePct: number;
  netDelta: number; // in BTC
  takerBuyRatio: number;
  orderBookImbalancePct: number; // e.g. +14.2% bid heavy
  bidDepthUSD: number;
  askDepthUSD: number;
  bookPressureScore: number; // 0 to 100 scale
}

export interface SimilarSetup {
  id: string;
  date: string;
  regime: string;
  netDelta: number;
  outcome: 'UP' | 'DOWN';
  returnPct: number;
  similarityScore: number; // e.g. 96.4%
}

export interface VenueOdds {
  kalshiYesPrice: number; // e.g. 0.54 ($0.54)
  kalshiNoPrice: number; // e.g. 0.46
  polymarketYesPct: number; // e.g. 52.0
  polymarketNoPct: number; // e.g. 48.0
  draftKingsYesAmerican: string; // e.g. "-115"
  draftKingsNoAmerican: string; // e.g. "+105"
  draftKingsImpliedYesPct: number; // e.g. 53.5
  bestEdgeVenue: 'Kalshi' | 'Polymarket' | 'DraftKings';
  bestEdgeValue: number; // e.g. +12.2%
}

export interface PredictionSignal {
  id: string;
  timestamp: number;
  candleCloseTimestamp: number;
  direction: SignalDirection; // 'YES' (Bullish) or 'NO' (Bearish)
  targetPrice: number;
  currentPrice: number;
  confidence: number; // percentage, e.g. 91
  modelProb: number; // e.g. 64.2%
  marketProb: number; // e.g. 52.0%
  edgePct: number; // percentage vs market, e.g. +12.2%
  tradeGrade: 'A+' | 'A' | 'B' | 'SKIP';
  reasoning: string;
  keyFactors: string[];
  orderFlow: OrderFlowMetrics;
  venueOdds: VenueOdds;
  similarSetupsCount: number;
  similarSetupsBullishPct: number;
  status: 'PENDING' | 'WIN' | 'LOSS';
  actualClosePrice?: number;
}

export interface HistoricalPrediction {
  id: string;
  timeString: string;
  timestamp: number;
  asset?: string; // e.g. 'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'SUI'
  timeframe?: string; // e.g. '15M', '15S', '1H', '5M', '4H'
  platform?: string; // e.g. 'Kalshi', 'Polymarket'
  targetPrice: number;
  actualClose: number;
  direction: SignalDirection;
  confidence: number;
  modelProbability?: number; // 0.0 - 1.0
  marketProbability?: number; // 0.0 - 1.0
  edge: number;
  result: 'WIN' | 'LOSS' | 'OPEN' | 'LOCKED' | 'CANCELLED' | 'INSUFFICIENT DATA';
  pnlPct: number;
  hash: string;
  modelVersion?: string; // e.g. 'v4.3-INCREMENTAL'
  latencyMs?: number;
  dataFreshnessMs?: number;
  qualityScore?: 'A+' | 'A' | 'B' | 'C' | 'D';
  qualityNumeric?: number;
  featureSnapshot?: Record<string, number | string>;
  reasoning?: string;
  settlementTimestamp?: number;
  evaluationStatus?: 'VERIFIED' | 'SIMULATED' | 'BACKTEST' | 'LIVE';
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  market: string; // e.g. "BTC 15M Kalshi #4829"
  direction: 'YES' | 'NO';
  entryOdds: number; // e.g. $0.52
  exitOdds: number; // e.g. $0.88 or $0.00
  stakeUSD: number;
  pnlUSD: number;
  confidence: number;
  edge: number;
  notes: string;
  tags: string[];
}

export interface AlertSettings {
  discordWebhook: string;
  discordEnabled: boolean;
  discordUserId?: string;
  discordUsername?: string;
  discordLinked?: boolean;
  discordSoundEnabled?: boolean;
  discordNotificationSound?: 'discord_ping' | 'quant_chime' | 'subsecond_alert';
  guildMember?: boolean;
  serverJoined?: boolean;
  roleAssigned?: string;
  subscriptionActive?: boolean;
  lastSyncTimestamp?: string;
  syncStatus?: 'HEALTHY' | 'SYNCING' | 'ACTION_REQUIRED' | 'DISCONNECTED';
  webhookStatus?: 'ACTIVE' | 'TESTING' | 'OFFLINE';
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  minConfidence: number; // e.g. 85%
  minEdgePct?: number; // e.g. 5%
  minEdge: number; // e.g. 5%
  notify1MinBeforeClose?: boolean;
  notifyNewSignal?: boolean;
  notifyOutcome?: boolean;
  onlyHighGrade?: boolean;
  emailAlerts: boolean;
  emailAddress: string;
}

export interface UserSubscription {
  plan: 'STARTER' | 'PRO' | 'ELITE';
  status: 'active' | 'canceling' | 'trial';
  renewalDate: string;
  paymentMethod: string;
  billingInterval: 'monthly' | 'annual';
}

export interface SupportTicket {
  id: string;
  userEmail: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AdminStats {
  mrr: number;
  activeSubscribers: number;
  predictionsToday: number;
  winRate: number;
  apiLatencyMs: number;
  serverStatus: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';
  totalPredictionsAnalyzed: number;
  brierScore: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'DEMO' | 'PRO' | 'ADMIN';
    apiKey?: string;
    joinedDate: string;
  } | null;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsed: string;
  permissions: string[];
}

export interface ExchangeCredential {
  connected: boolean;
  apiKey: string;
  apiSecret?: string;
  passphraseOrWallet?: string;
  environment: 'live' | 'paper' | 'sandbox';
  status: 'CONNECTED' | 'DISCONNECTED' | 'TESTING';
  latencyMs: number;
  lastPing: string;
}

export interface ExchangeApiKeys {
  kalshi: ExchangeCredential;
  polymarket: ExchangeCredential;
  draftkings: ExchangeCredential;
}

