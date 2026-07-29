export type SignalDirection = 'YES' | 'NO'; // YES = Bullish (Close higher), NO = Bearish (Close lower)

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
  targetPrice: number;
  actualClose: number;
  direction: SignalDirection;
  confidence: number;
  edge: number;
  result: 'WIN' | 'LOSS';
  pnlPct: number;
  hash: string;
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
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  minConfidence: number; // e.g. 85%
  minEdge: number; // e.g. 5%
  notify1MinBeforeClose: boolean;
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

