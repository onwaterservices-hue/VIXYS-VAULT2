import React from 'react';
import {
  Compass,
  Sparkles,
  Lock,
  ShieldCheck,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart2,
  Layers,
  Activity,
  Radio,
  Eye,
  Database,
  ShieldAlert,
  Sliders,
  Scale
} from 'lucide-react';
import { BTCTicker } from '../types';
import { Canonical15mDecisionState, FeedHealthStatus } from '../hooks/useCanonical15mDecision';

export type ModuleSize = 'small' | 'medium' | 'large' | 'full-width';

export interface VixyLiveModuleDefinition {
  id: string;
  title: string;
  category: 'VIXY' | 'MARKET' | 'QUANT' | 'SYSTEM';
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: ModuleSize;
  description: string;
  requiredTier?: 'FREE' | 'PRO' | 'ELITE';
  minColSpan?: number;
}

export interface ModuleRenderProps {
  canonical15m: Canonical15mDecisionState;
  ticker?: BTCTicker;
  dataHealthStatus?: FeedHealthStatus;
  localUpdatedAt?: number;
  nowMs: number;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
  isEditMode?: boolean;
}

export const VIXY_LIVE_MODULES: VixyLiveModuleDefinition[] = [
  {
    id: 'current_signal',
    title: 'Current Signal',
    category: 'VIXY',
    icon: Compass,
    defaultSize: 'small',
    description: 'Current 15M authoritative directional bias and target strike delta'
  },
  {
    id: 'calibration_confidence',
    title: 'Calibration Confidence',
    category: 'VIXY',
    icon: Sparkles,
    defaultSize: 'small',
    description: '0-100% model conviction gauge and gate alignment matrix'
  },
  {
    id: 'lock_quality',
    title: 'Lock Quality',
    category: 'VIXY',
    icon: Lock,
    defaultSize: 'small',
    description: 'Quantitative lock rating, score tier, and retention strength'
  },
  {
    id: 'reversal_risk',
    title: 'Reversal Risk',
    category: 'VIXY',
    icon: ShieldAlert,
    defaultSize: 'small',
    description: 'Real-time reversal threat meter and hard stop monitoring'
  },
  {
    id: 'live_price',
    title: 'Live Price',
    category: 'MARKET',
    icon: DollarSign,
    defaultSize: 'small',
    description: 'BTC/USD real-time spot price, 24h delta, and bid/ask spread'
  },
  {
    id: 'momentum',
    title: 'Momentum Vector',
    category: 'QUANT',
    icon: Zap,
    defaultSize: 'small',
    description: '15-second velocity, RSI momentum vector, and acceleration curve'
  },
  {
    id: 'trend_regime',
    title: 'Trend & Regime',
    category: 'QUANT',
    icon: TrendingUp,
    defaultSize: 'small',
    description: 'Supertrend regime classification and multi-frame EMA stack'
  },
  {
    id: 'order_flow',
    title: 'Order Flow Delta',
    category: 'QUANT',
    icon: BarChart2,
    defaultSize: 'small',
    description: 'Cumulative volume delta (CVD) and net taker buy/sell imbalance'
  },
  {
    id: 'volume_depth',
    title: 'Volume & Depth',
    category: 'MARKET',
    icon: Layers,
    defaultSize: 'small',
    description: '24h spot turnover, market depth liquidity, and spread gauge'
  },
  {
    id: 'sentiment',
    title: 'Market Sentiment',
    category: 'QUANT',
    icon: Eye,
    defaultSize: 'small',
    description: 'Cross-market fear/greed composite and institutional positioning'
  },
  {
    id: 'cross_venue',
    title: 'Cross-Venue Odds',
    category: 'QUANT',
    icon: Scale,
    defaultSize: 'small',
    description: 'Kalshi KXBTC15M and Polymarket prediction market odds comparison'
  },
  {
    id: 'neural_ribbon',
    title: 'Neural Ribbon Chart',
    category: 'VIXY',
    icon: Activity,
    defaultSize: 'medium',
    description: 'Multi-EMA ribbon convergence/divergence and squeeze expansion radar'
  },
  {
    id: 'live_market_feed',
    title: 'Live Market Feed',
    category: 'MARKET',
    icon: Radio,
    defaultSize: 'small',
    description: 'Real-time trade tape with cross-exchange prints and volume'
  },
  {
    id: 'vixy_protection',
    title: 'VIXY Protection',
    category: 'VIXY',
    icon: ShieldCheck,
    defaultSize: 'small',
    description: 'Dynamic capital safety guard and drawdown risk sentinel'
  },
  {
    id: 'vixy_read',
    title: 'VIXY Hypothesis Read',
    category: 'VIXY',
    icon: Sparkles,
    defaultSize: 'large',
    description: 'Neural evidence synthesis and primary hypothesis breakdown'
  },
  {
    id: 'data_health',
    title: 'Data Health & Feed',
    category: 'SYSTEM',
    icon: Database,
    defaultSize: 'small',
    description: 'WebSocket stream latency, tick freshness, and engine status'
  }
];

export const DEFAULT_VIXY_LIVE_LAYOUT: string[] = [
  'current_signal',
  'calibration_confidence',
  'lock_quality',
  'reversal_risk',
  'live_price',
  'momentum',
  'trend_regime',
  'order_flow',
  'volume_depth',
  'sentiment',
  'cross_venue',
  'neural_ribbon',
  'live_market_feed',
  'vixy_protection',
  'vixy_read',
  'data_health'
];

export function getSizeSpanClass(size: ModuleSize): string {
  switch (size) {
    case 'small':
      return 'col-span-1';
    case 'medium':
      return 'col-span-1 md:col-span-2';
    case 'large':
      return 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4';
    case 'full-width':
      return 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4';
    default:
      return 'col-span-1';
  }
}
