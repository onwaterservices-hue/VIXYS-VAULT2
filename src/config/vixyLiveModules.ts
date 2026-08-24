import React from 'react';
import {
  Compass,
  Sparkles,
  Lock,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart2,
  Layers,
  Activity,
  Radio,
  Eye,
  Database,
  Sliders,
  Scale,
  Clock,
  LineChart,
  Grid,
  Fish,
  AlertTriangle,
  History,
  Trophy,
  Bell,
  Star,
  BookOpen,
  MousePointer,
  Crosshair
} from 'lucide-react';
import { BTCTicker } from '../types';
import { Canonical15mDecision } from '../types/canonicalDecision';
import { FeedHealthStatus } from '../hooks/useCanonical15mDecision';

export type ModuleSize = 'small' | 'medium' | 'large' | 'full-width';

export type ModuleCategory = 'CORE' | 'MARKET' | 'INTELLIGENCE' | 'SYSTEM' | 'PERSONAL';

export interface VixyLiveModuleDefinition {
  id: string;
  title: string;
  category: ModuleCategory;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: ModuleSize;
  description: string;
  requiredTier?: 'FREE' | 'PRO' | 'ELITE';
  minColSpan?: number;
}

export interface WorkspaceBox {
  id: string;
  intelligenceId: string | null; // null represents an EMPTY INTELLIGENCE SLOT
  size: ModuleSize;
  collapsed?: boolean;
  config?: Record<string, any>;
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  boxes: WorkspaceBox[];
  createdAt: number;
  updatedAt: number;
}

export interface ModuleRenderProps {
  canonical15m: Canonical15mDecision;
  ticker?: BTCTicker;
  dataHealthStatus?: FeedHealthStatus;
  localUpdatedAt?: number;
  nowMs: number;
  boxId: string;
  boxSize: ModuleSize;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
  onExpandModule?: (intelligenceId: string) => void;
  onConfigureModule?: (boxId: string) => void;
  isEditMode?: boolean;
}

export const VIXY_LIVE_MODULES: VixyLiveModuleDefinition[] = [
  // ================= CORE =================
  {
    id: '15m_decision',
    title: '15M Decision',
    category: 'CORE',
    icon: Compass,
    defaultSize: 'small',
    description: 'Current 15-minute VIXY authoritative directional bias & target strike delta'
  },
  {
    id: '1m_decision',
    title: '1M Decision',
    category: 'CORE',
    icon: Zap,
    defaultSize: 'small',
    description: 'Current 1-minute high-frequency micro flow & scalping direction'
  },
  {
    id: 'calibration',
    title: 'Calibration Confidence',
    category: 'CORE',
    icon: Sparkles,
    defaultSize: 'small',
    description: '0-100% model conviction gauge and gate alignment matrix'
  },
  {
    id: 'lock_quality',
    title: 'Lock Quality',
    category: 'CORE',
    icon: Lock,
    defaultSize: 'small',
    description: 'Current lock strength, score tier, and retention stability'
  },
  {
    id: 'reversal_risk',
    title: 'Reversal Risk',
    category: 'CORE',
    icon: ShieldAlert,
    defaultSize: 'small',
    description: 'Real-time reversal threat meter and hard stop safety sentinel'
  },
  {
    id: 'cycle_status',
    title: 'Cycle Status',
    category: 'CORE',
    icon: Clock,
    defaultSize: 'small',
    description: '15M / 1M authoritative countdown timer and state timeline'
  },
  {
    id: 'vixy_protection',
    title: 'VIXY Protection',
    category: 'CORE',
    icon: ShieldCheck,
    defaultSize: 'small',
    description: 'Authoritative capital safety guard and drawdown risk sentinel'
  },
  {
    id: 'vixy_signal',
    title: 'VIXY Signal',
    category: 'CORE',
    icon: Crosshair,
    defaultSize: 'small',
    description: 'Authoritative execution bias, strike distance, and target matrix'
  },

  // ================= MARKET =================
  {
    id: 'live_price',
    title: 'Live Price',
    category: 'MARKET',
    icon: DollarSign,
    defaultSize: 'small',
    description: 'BTC/USD real-time spot price, 24h delta, and bid/ask spread'
  },
  {
    id: 'price_change',
    title: 'Price Change & Range',
    category: 'MARKET',
    icon: TrendingUp,
    defaultSize: 'small',
    description: '24h High/Low range, percentage shift, and volatility channel'
  },
  {
    id: 'candlestick_chart',
    title: 'Candlestick Chart',
    category: 'MARKET',
    icon: LineChart,
    defaultSize: 'medium',
    description: 'Interactive price action chart with strike band & VWAP overlay'
  },
  {
    id: 'neural_ribbon',
    title: 'Neural Ribbon Chart',
    category: 'MARKET',
    icon: Activity,
    defaultSize: 'medium',
    description: 'Multi-EMA ribbon convergence/divergence and squeeze expansion radar'
  },
  {
    id: 'momentum',
    title: 'Momentum Vector',
    category: 'MARKET',
    icon: Zap,
    defaultSize: 'small',
    description: '15-second velocity, RSI momentum vector, and acceleration curve'
  },
  {
    id: 'trend',
    title: 'Trend & Regime',
    category: 'MARKET',
    icon: TrendingUp,
    defaultSize: 'small',
    description: 'Supertrend regime classification and multi-frame EMA stack'
  },
  {
    id: 'volume',
    title: 'Volume & Depth',
    category: 'MARKET',
    icon: Layers,
    defaultSize: 'small',
    description: '24h spot turnover, market depth liquidity, and spread gauge'
  },
  {
    id: 'order_flow',
    title: 'Order Flow Delta',
    category: 'MARKET',
    icon: BarChart2,
    defaultSize: 'small',
    description: 'Cumulative volume delta (CVD) and net taker buy/sell imbalance'
  },
  {
    id: 'volatility',
    title: 'Volatility Index',
    category: 'MARKET',
    icon: Activity,
    defaultSize: 'small',
    description: 'ATR index, implied volatility band, and standard deviation score'
  },
  {
    id: 'market_regime',
    title: 'Market Regime',
    category: 'MARKET',
    icon: Grid,
    defaultSize: 'small',
    description: 'Macro regime identification (Expansion, Trend, Mean-Reversion)'
  },
  {
    id: 'distance_to_strike',
    title: 'Distance to Strike',
    category: 'MARKET',
    icon: Crosshair,
    defaultSize: 'small',
    description: 'Live delta distance and buffer to target settlement strike'
  },

  // ================= INTELLIGENCE =================
  {
    id: 'vixy_read',
    title: 'VIXY Hypothesis Read',
    category: 'INTELLIGENCE',
    icon: Sparkles,
    defaultSize: 'large',
    description: 'Neural evidence synthesis and primary hypothesis breakdown'
  },
  {
    id: 'signal_matrix',
    title: 'Signal Matrix',
    category: 'INTELLIGENCE',
    icon: Grid,
    defaultSize: 'small',
    description: 'Multi-timeframe (1M, 5M, 15M, 1H) alignment confluence matrix'
  },
  {
    id: 'evidence_alignment',
    title: 'Evidence Alignment',
    category: 'INTELLIGENCE',
    icon: Layers,
    defaultSize: 'small',
    description: '10-gate quantitative confluence scoring and verification breakdown'
  },
  {
    id: 'cross_venue',
    title: 'Cross-Venue Odds',
    category: 'INTELLIGENCE',
    icon: Scale,
    defaultSize: 'small',
    description: 'Kalshi KXBTC15M and Polymarket prediction market odds comparison'
  },
  {
    id: 'sentiment',
    title: 'Market Sentiment',
    category: 'INTELLIGENCE',
    icon: Eye,
    defaultSize: 'small',
    description: 'Cross-market fear/greed composite and institutional positioning'
  },
  {
    id: 'whale_activity',
    title: 'Whale Activity Radar',
    category: 'INTELLIGENCE',
    icon: Fish,
    defaultSize: 'small',
    description: 'Block trade radar, large taker prints, and liquidity absorption'
  },
  {
    id: 'edge_scanner',
    title: 'Edge Scanner',
    category: 'INTELLIGENCE',
    icon: Sparkles,
    defaultSize: 'small',
    description: 'Statistical edge calculation and favorable risk/reward setups'
  },
  {
    id: 'pattern_engine',
    title: 'Pattern Engine',
    category: 'INTELLIGENCE',
    icon: Activity,
    defaultSize: 'small',
    description: 'Algorithmic candle structure, head & shoulders, and breakout flags'
  },

  // ================= SYSTEM =================
  {
    id: 'data_health',
    title: 'Data Health & Feed',
    category: 'SYSTEM',
    icon: Database,
    defaultSize: 'small',
    description: 'WebSocket stream latency, tick freshness, and engine status'
  },
  {
    id: 'live_feed',
    title: 'Live Market Feed',
    category: 'SYSTEM',
    icon: Radio,
    defaultSize: 'small',
    description: 'Real-time trade tape with cross-exchange prints and volume'
  },
  {
    id: 'telemetry',
    title: 'Engine Telemetry',
    category: 'SYSTEM',
    icon: Sliders,
    defaultSize: 'small',
    description: 'Continuous engine loop tick rate, memory, and sync latency'
  },
  {
    id: 'cycle_history',
    title: 'Cycle History',
    category: 'SYSTEM',
    icon: History,
    defaultSize: 'medium',
    description: 'Historical 15M cycle resolutions and target strike outcomes'
  },
  {
    id: 'performance',
    title: 'Performance Matrix',
    category: 'SYSTEM',
    icon: Trophy,
    defaultSize: 'small',
    description: 'VIXY directional accuracy rate, win streak, and expected value'
  },
  {
    id: 'alerts',
    title: 'Live Alerts & Warnings',
    category: 'SYSTEM',
    icon: Bell,
    defaultSize: 'small',
    description: 'Real-time volatility spikes, state changes, and lock warnings'
  },

  // ================= PERSONAL =================
  {
    id: 'watchlist',
    title: 'Asset Watchlist',
    category: 'PERSONAL',
    icon: Star,
    defaultSize: 'small',
    description: 'Quick switcher for BTC, ETH, SOL, and top crypto assets'
  },
  {
    id: 'notes',
    title: 'Trading Notes',
    category: 'PERSONAL',
    icon: BookOpen,
    defaultSize: 'small',
    description: 'Personal desk notes, trade hypothesis, and session observations'
  },
  {
    id: 'quick_actions',
    title: 'Quick Actions',
    category: 'PERSONAL',
    icon: MousePointer,
    defaultSize: 'small',
    description: 'One-click shortcuts to Kalshi execution, Replay Center, and Terminal'
  }
];

// Empty Canvas Default: 4 clean empty boxes for initial first-time load
export const INITIAL_EMPTY_WORKSPACE_BOXES: WorkspaceBox[] = [
  { id: 'box-1', intelligenceId: null, size: 'small', collapsed: false },
  { id: 'box-2', intelligenceId: null, size: 'small', collapsed: false },
  { id: 'box-3', intelligenceId: null, size: 'medium', collapsed: false },
  { id: 'box-4', intelligenceId: null, size: 'medium', collapsed: false }
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
