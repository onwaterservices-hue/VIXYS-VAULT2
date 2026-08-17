export type SignalDirection = 'YES' | 'NO' | 'BUY_UP' | 'BUY_DOWN' | 'UP' | 'DOWN'; // YES/BUY_UP/UP = Bullish, NO/BUY_DOWN/DOWN = Bearish

export interface BTCTicker {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
  marketImpliedYes?: number; // e.g. 52% on Polymarket/Kalshi
  marketImpliedNo?: number; // e.g. 48%
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
  entryOdds?: number; // e.g. $0.52
  exitOdds?: number; // e.g. $0.88 or $0.00
  entryPrice?: number;
  exitPrice?: number;
  targetPrice?: number;
  positionSizeUSD?: number;
  pnlPct?: number;
  confidenceScore?: number;
  tradeGrade?: string;
  status?: string;
  stakeUSD?: number;
  pnlUSD?: number;
  confidence?: number;
  edge?: number;
  notes?: string;
  tags?: string[];
  outcome?: 'WIN' | 'LOSS' | 'OPEN';
  pnl?: number;
  hash?: string;
}

export interface AlertSettings {
  isAdmin?: boolean;
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
  syncStatus?: 'HEALTHY' | 'SYNCING' | 'ACTION_REQUIRED' | 'DISCONNECTED' | 'NEEDS_GUILD';
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
  plan: 'DAY_PASS' | 'STARTER' | 'PRO' | 'ELITE' | 'ELITE_PASS';
  status: 'active' | 'canceling' | 'expired';
  renewalDate: string;
  paymentMethod: string;
  billingInterval: 'one_time' | 'monthly' | 'annual';
  email?: string;
  stripeCustomerId?: string;
}

export interface SupportTicket {
  id: string;
  userEmail: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  date: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  message?: string;
  description?: string;
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
    role: 'UNPAID' | 'PRO' | 'ADMIN' | 'OWNER';
    apiKey?: string;
    joinedDate: string;
    discordId?: string;
    discordTag?: string;
    discordLinked?: boolean;
    subscription?: string;
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

// ==========================================
// SEPARATE STATE MACHINES (CRITICAL RULE)
// SIGNAL STATE != ACCESS / AUTHORIZATION STATE
// ==========================================

export type SignalStateType = 
  | 'IDLE' 
  | 'ANALYZING' 
  | 'SIGNAL_READY' 
  | 'SIGNAL_CONFIRMED' 
  | 'EXPIRED' 
  | 'NO_SIGNAL';

export type AccessStateType = 
  | 'AUTHORIZED' 
  | 'DAY_PASS' 
  | 'SUBSCRIBED' 
  | 'ADMIN' 
  | 'LOCKED';

export interface UserAccessObject {
  role: 'ADMIN' | 'PRO' | 'UNPAID' | 'OWNER' | 'USER';
  isAdmin: boolean;
  accessState: AccessStateType;
  discordVerified: boolean;
  subscriptionStatus: 'active' | 'day_pass' | 'canceling' | 'expired' | 'none';
  entitlements: string[];
  locked: boolean;
}

export interface SignalPredictionState {
  signalState: SignalStateType;
  direction: 'UP' | 'DOWN' | 'NEUTRAL' | 'BUY UP' | 'BUY DOWN' | 'PASS';
  probability: number;
  confidenceLabel: string;
  confidence: number;
  cycleId?: string;
  cycleStart?: string;
  cycleEnd?: string;
  cycleStage?: 'ANALYZING' | 'CONFIRMED' | 'LOCKED' | 'SETTLED';
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedDecision?: 'BUY UP' | 'BUY DOWN' | 'PASS' | null;
  lockedDirection?: 'UP' | 'DOWN' | 'PASS' | null;
  lockedConfidence?: number | null;
  lockedStrike?: number | null;
  lockedSpot?: number | null;
  timestamp: string;
  modelVersion: string;
  calibrationVersion: string;
  signalConfirmed: boolean;
}

export type LockQualityTier = 'HIGH_CONVICTION' | 'QUALIFIED' | 'SKIP';

export interface EvidenceFamilyState {
  name:
    | 'PRICE_STRUCTURE'
    | 'ORDER_FLOW'
    | 'MOMENTUM'
    | 'VOLATILITY'
    | 'LIQUIDITY'
    | 'REGIME'
    | 'STRIKE_EXPIRY'
    | 'TIME_TO_EXPIRY'
    | 'CROSS_MARKET'
    | 'REVERSAL_RISK'
    | 'DATA_QUALITY';
  label: string;
  bias: 'UP' | 'DOWN' | 'NEUTRAL';
  status: string;
  score: number;
  weight: number;
  agreement: boolean;
  details: string;
}

export interface Btc15mDataQualityState {
  feedFreshnessMs: number;
  websocketStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  staleTickDetected: boolean;
  driftMs: number;
  status: 'OPTIMAL' | 'DEGRADED' | 'STALE' | 'OFFLINE';
  score: number;
}

export interface Btc15mEnginePipelineData {
  lockQuality: number;
  lockQualityTier: LockQualityTier;
  evidenceAgreementCount: number;
  totalEvidenceFamilies: number;
  evidenceFamilies: EvidenceFamilyState[];
  multiTimeframeAlignment: {
    tf15m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    tf5m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    tf1m: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    tf30s: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    tf15s: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    alignedCount: number;
    totalCount: number;
    state: 'FULL_ALIGNMENT' | 'PARTIAL_ALIGNMENT' | 'CONFLICT';
    momentumClassification: 'ACCELERATING' | 'STABLE' | 'DECELERATING' | 'REVERSING' | 'NEUTRAL';
  };
  volatilityExpectedMove: {
    realizedVol15mPct: number;
    volatilityRegime: 'COMPRESSED' | 'NORMAL' | 'EXPANDING' | 'EXTREME';
    expectedMoveUSD: number;
    requiredMoveUSD: number;
    coverageRatio: number;
    isStrikeFeasible: boolean;
  };
  priceStructure: {
    highLowStructure: 'HIGHER_HIGHS' | 'LOWER_LOWS' | 'RANGE_BOUND' | 'COMPRESSED';
    vwap: number;
    vwapRelationship: 'ABOVE_VWAP' | 'BELOW_VWAP' | 'AT_VWAP';
    localSupport: number;
    localResistance: number;
    displacementUSD: number;
    breakoutState: 'BREAKOUT_BULL' | 'BREAKOUT_BEAR' | 'FAILED_BREAKOUT' | 'RANGE_BOUND';
  };
  orderFlowAnalytics: {
    takerBuyRatio: number;
    netDeltaBTC: number;
    bidAskImbalancePct: number;
    absorptionState: 'CONTINUING' | 'ABSORBED' | 'EXHAUSTING' | 'REVERSING' | 'NEUTRAL';
    flowClassification: 'CONTINUATION' | 'ABSORPTION' | 'EXHAUSTING' | 'REVERSAL' | 'NEUTRAL';
  };
  chopAnalytics: {
    chopScore: number;
    isChopFiltered: boolean;
    directionFlips: number;
    persistenceSeconds: number;
    reason: string | null;
  };
  reversalAssessment: {
    threatScore: number;
    threatLevel: 'LOW' | 'WATCH' | 'WARNING' | 'CRITICAL';
    vetoActive: boolean;
    primaryTriggers: string[];
  };
  dataQuality: Btc15mDataQualityState;
  edgeVsConfidence: {
    modelProbability: number;
    kalshiImpliedProbability: number;
    realEdgePct: number;
    calibratedConfidencePct: number;
    pUp: number;
    pDown: number;
    uncertaintyPct: number;
  };
  explainability: {
    direction: 'UP' | 'DOWN' | 'SKIP';
    summaryReason: string;
    keyTailwinds: string[];
    keyRisks: string[];
    lockApproved: boolean;
  };
}

