import { VixyModuleDefinition } from '../types';
import {
  VixyBiasModule,
  VixyConfidenceModule,
  LockStatusModule,
  CycleCountdownModule,
  LockQualityModule,
  VixyProtectionModule,
  VixyReadModule
} from '../modules/EngineModules';
import {
  BtcPriceModule,
  EthPriceModule,
  SolPriceModule,
  BtcChartModule
} from '../modules/MarketModules';
import {
  MomentumModule,
  OrderFlowModule,
  VolumeModule,
  VolatilityModule,
  MarketRegimeModule,
  SentimentModule,
  WhaleFlowModule,
  PatternEngineModule,
  NewsModule
} from '../modules/QuantModules';
import {
  KalshiModule,
  PolymarketModule,
  CrossVenueSyncModule
} from '../modules/VenueModules';
import {
  RecentLocksModule,
  PerformanceModule,
  CycleHistoryModule
} from '../modules/HistoryModules';

export const MODULE_REGISTRY: Record<string, VixyModuleDefinition> = {
  // --- VIXY ENGINE MODULES ---
  'vixy.bias': {
    id: 'vixy.bias',
    name: 'VIXY BIAS',
    category: 'VIXY',
    description: 'Current 15-minute directional bias (UP / DOWN / CHOP)',
    iconName: 'TrendingUp',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: VixyBiasModule
  },
  'vixy.confidence': {
    id: 'vixy.confidence',
    name: 'VIXY CONFIDENCE',
    category: 'VIXY',
    description: '0-100% model conviction gauge and lock gate threshold',
    iconName: 'Gauge',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: VixyConfidenceModule
  },
  'vixy.lock_status': {
    id: 'vixy.lock_status',
    name: 'LOCK STATUS',
    category: 'VIXY',
    description: 'Lifecycle state machine indicator (CALIBRATING -> LOCKED)',
    iconName: 'Lock',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: LockStatusModule
  },
  'vixy.cycle_countdown': {
    id: 'vixy.cycle_countdown',
    name: 'CYCLE COUNTDOWN',
    category: 'VIXY',
    description: 'Real-time 15-minute cycle expiration clock',
    iconName: 'Clock',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: CycleCountdownModule
  },
  'vixy.lock_quality': {
    id: 'vixy.lock_quality',
    name: 'LOCK QUALITY',
    category: 'VIXY',
    description: 'Quantitative lock score out of 10 & signal alignment count',
    iconName: 'Award',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: LockQualityModule
  },
  'vixy.protection': {
    id: 'vixy.protection',
    name: 'VIXY PROTECTION',
    category: 'VIXY',
    description: 'Post-lock guardian status & reversal risk monitoring',
    iconName: 'ShieldCheck',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: VixyProtectionModule
  },
  'vixy.read': {
    id: 'vixy.read',
    name: 'VIXY READ',
    category: 'VIXY',
    description: 'Quant reasoning narrative & order flow hypothesis',
    iconName: 'FileText',
    defaultDimensions: { w: 6, h: 2, minW: 4, minH: 2 },
    isAvailable: true,
    component: VixyReadModule
  },

  // --- MARKET TELEMETRY MODULES ---
  'market.btc_price': {
    id: 'market.btc_price',
    name: 'BTC PRICE',
    category: 'MARKET',
    description: 'BTC/USDT direct websocket spot price & 24h change',
    iconName: 'Activity',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: BtcPriceModule
  },
  'market.eth_price': {
    id: 'market.eth_price',
    name: 'ETH PRICE',
    category: 'MARKET',
    description: 'ETH/USDT direct websocket spot price & 24h change',
    iconName: 'Activity',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: EthPriceModule
  },
  'market.sol_price': {
    id: 'market.sol_price',
    name: 'SOL PRICE',
    category: 'MARKET',
    description: 'SOL/USDT direct websocket spot price & 24h change',
    iconName: 'Activity',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: SolPriceModule
  },
  'market.btc_chart': {
    id: 'market.btc_chart',
    name: 'BTC CHART',
    category: 'MARKET',
    description: 'Real-time BTC/USDT 15M candlestick chart preview & VWAP strike overlays',
    iconName: 'BarChart2',
    defaultDimensions: { w: 6, h: 2, minW: 3, minH: 2 },
    isAvailable: true,
    component: BtcChartModule
  },

  // --- QUANT SIGNALS MODULES ---
  'quant.momentum': {
    id: 'quant.momentum',
    name: 'MOMENTUM',
    category: 'INTELLIGENCE',
    description: '15M velocity vector rate (+%/s) & acceleration',
    iconName: 'Zap',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: MomentumModule
  },
  'quant.order_flow': {
    id: 'quant.order_flow',
    name: 'ORDER FLOW',
    category: 'INTELLIGENCE',
    description: 'Net taker buy delta ($M) & orderbook absorption',
    iconName: 'BarChart2',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: OrderFlowModule
  },
  'quant.volume': {
    id: 'quant.volume',
    name: 'VOLUME',
    category: 'INTELLIGENCE',
    description: 'Volume profile Point of Control & Value Area',
    iconName: 'Layers',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: VolumeModule
  },
  'quant.volatility': {
    id: 'quant.volatility',
    name: 'VOLATILITY',
    category: 'INTELLIGENCE',
    description: 'Bollinger squeeze bandwidth & volatility release',
    iconName: 'Sliders',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: VolatilityModule
  },
  'quant.market_regime': {
    id: 'quant.market_regime',
    name: 'MARKET REGIME',
    category: 'INTELLIGENCE',
    description: 'BULLISH / BEARISH / RANGING market structure classifier',
    iconName: 'Compass',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: MarketRegimeModule
  },
  'quant.sentiment': {
    id: 'quant.sentiment',
    name: 'SENTIMENT',
    category: 'INTELLIGENCE',
    description: 'Orderbook depth ratio & bid/ask tilt',
    iconName: 'Smile',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: SentimentModule
  },
  'quant.whale_flow': {
    id: 'quant.whale_flow',
    name: 'WHALE FLOW',
    category: 'INTELLIGENCE',
    description: 'Large orderbook sweeps & institutional wall absorption',
    iconName: 'Anchor',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: WhaleFlowModule
  },
  'quant.pattern_engine': {
    id: 'quant.pattern_engine',
    name: 'PATTERN ENGINE',
    category: 'INTELLIGENCE',
    description: 'Microstructure pattern detector (Ask Absorption, Bid Defense)',
    iconName: 'Cpu',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: PatternEngineModule
  },
  'quant.news': {
    id: 'quant.news',
    name: 'NEWS',
    category: 'INTELLIGENCE',
    description: 'Real-time financial macro news stream & impact sentiment tags',
    iconName: 'FileText',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: NewsModule
  },

  // --- PREDICTION VENUES MODULES ---
  'venue.kalshi': {
    id: 'venue.kalshi',
    name: 'KALSHI',
    category: 'CROSS-VENUE',
    description: 'Kalshi 15M contract probability & bid/ask spread',
    iconName: 'Globe',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: KalshiModule
  },
  'venue.polymarket': {
    id: 'venue.polymarket',
    name: 'POLYMARKET',
    category: 'CROSS-VENUE',
    description: 'Polymarket BTC 15M odds & matched volume',
    iconName: 'Share2',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: PolymarketModule
  },
  'venue.cross_venue_sync': {
    id: 'venue.cross_venue_sync',
    name: 'CROSS-VENUE AGREEMENT',
    category: 'CROSS-VENUE',
    description: 'Alignment spread comparing spot flow, Kalshi, and Polymarket',
    iconName: 'Radio',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: CrossVenueSyncModule
  },

  // --- PERFORMANCE & HISTORY MODULES ---
  'history.recent_locks': {
    id: 'history.recent_locks',
    name: 'RECENT LOCKS',
    category: 'HISTORY',
    description: 'Historical 15M cycle lock results & accuracy log',
    iconName: 'History',
    defaultDimensions: { w: 4, h: 3, minW: 3, minH: 2 },
    isAvailable: true,
    component: RecentLocksModule
  },
  'history.performance': {
    id: 'history.performance',
    name: 'PERFORMANCE',
    category: 'HISTORY',
    description: 'Historical win rate, Sharpe ratio, and consecutive lock streaks',
    iconName: 'TrendingUp',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: PerformanceModule
  },
  'history.cycle_history': {
    id: 'history.cycle_history',
    name: 'CYCLE HISTORY',
    category: 'HISTORY',
    description: 'Complete settled cycle history & resolution price ledger',
    iconName: 'BookOpen',
    defaultDimensions: { w: 3, h: 2, minW: 2, minH: 2 },
    isAvailable: true,
    component: CycleHistoryModule
  }
};

export const getModuleDefinition = (id: string): VixyModuleDefinition | undefined => {
  return MODULE_REGISTRY[id];
};

export const getAllModulesList = (): VixyModuleDefinition[] => {
  return Object.values(MODULE_REGISTRY);
};
