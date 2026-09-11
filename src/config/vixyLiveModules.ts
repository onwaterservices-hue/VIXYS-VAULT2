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
    description: 'The engine’s 15-minute direction, lock state and distance to the Kalshi strike'
  },
  {
    id: '1m_decision',
    title: '1M Decision',
    category: 'CORE',
    icon: Zap,
    defaultSize: 'small',
    description: 'The last 1-minute candle move (VIXY has no 1-minute model)'
  },
  {
    id: 'calibration',
    title: 'Calibration Confidence',
    category: 'CORE',
    icon: Sparkles,
    defaultSize: 'small',
    description: 'Calibrated P(win) with its sample, or the engine score, plus family agreement'
  },
  {
    id: 'lock_quality',
    title: 'Lock Quality',
    category: 'CORE',
    icon: Lock,
    defaultSize: 'small',
    description: 'Engine lock score against the gate bar, with temporal stability'
  },
  {
    id: 'reversal_risk',
    title: 'Reversal Risk',
    category: 'CORE',
    icon: ShieldAlert,
    defaultSize: 'small',
    description: 'Engine reversal threat and the lock gate limit it must stay under'
  },
  {
    id: 'cycle_status',
    title: 'Cycle Status',
    category: 'CORE',
    icon: Clock,
    defaultSize: 'small',
    description: '15-minute cycle countdown and current engine state'
  },
  {
    id: 'vixy_protection',
    title: 'VIXY Protection',
    category: 'CORE',
    icon: ShieldCheck,
    defaultSize: 'small',
    description: 'Guardian protection status and capital preservation score'
  },
  {
    id: 'vixy_signal',
    title: 'VIXY Signal',
    category: 'CORE',
    icon: Crosshair,
    defaultSize: 'small',
    description: 'Lock state, engine bias and the Kalshi strike'
  },

  // ================= MARKET =================
  {
    id: 'live_price',
    title: 'Live Price',
    category: 'MARKET',
    icon: DollarSign,
    defaultSize: 'small',
    description: 'BTC/USD spot price, 24h change and 24h range'
  },
  {
    id: 'price_change',
    title: 'Price Change & Range',
    category: 'MARKET',
    icon: TrendingUp,
    defaultSize: 'small',
    description: '24h change, high, low and range width'
  },
  {
    id: 'candlestick_chart',
    title: 'Candlestick Chart',
    category: 'MARKET',
    icon: LineChart,
    defaultSize: 'medium',
    description: 'Real 1-minute BTC candles with the Kalshi strike line'
  },
  {
    id: 'neural_ribbon',
    title: 'Neural Ribbon Chart',
    category: 'MARKET',
    icon: Activity,
    defaultSize: 'medium',
    description: 'Fast and slow EMA gap and Bollinger squeeze on 1-minute candles'
  },
  {
    id: 'momentum',
    title: 'Momentum Vector',
    category: 'MARKET',
    icon: Zap,
    defaultSize: 'small',
    description: 'Short-window momentum (measured inside the engine, not on this card)'
  },
  {
    id: 'trend',
    title: 'Trend & Regime',
    category: 'MARKET',
    icon: TrendingUp,
    defaultSize: 'small',
    description: 'Engine regime classification and temporal stability'
  },
  {
    id: 'volume',
    title: 'Volume & Depth',
    category: 'MARKET',
    icon: Layers,
    defaultSize: 'small',
    description: 'Volume and depth (live depth is on the 15-second desk)'
  },
  {
    id: 'order_flow',
    title: 'Order Flow Delta',
    category: 'MARKET',
    icon: BarChart2,
    defaultSize: 'small',
    description: 'Net taker flow (live large-print flow is on the Whale Activity card)'
  },
  {
    id: 'volatility',
    title: 'Volatility Index',
    category: 'MARKET',
    icon: Activity,
    defaultSize: 'small',
    description: 'Engine volatility regime and contradiction score'
  },
  {
    id: 'market_regime',
    title: 'Market Regime',
    category: 'MARKET',
    icon: Grid,
    defaultSize: 'small',
    description: 'Engine market regime and temporal stability'
  },
  {
    id: 'distance_to_strike',
    title: 'Distance to Strike',
    category: 'MARKET',
    icon: Crosshair,
    defaultSize: 'small',
    description: 'Spot distance to the Kalshi strike, in dollars and basis points'
  },

  // ================= INTELLIGENCE =================
  {
    id: 'vixy_read',
    title: 'VIXY Hypothesis Read',
    category: 'INTELLIGENCE',
    icon: Sparkles,
    defaultSize: 'large',
    description: 'The engine’s own written reasoning this tick'
  },
  {
    id: 'signal_matrix',
    title: 'Signal Matrix',
    category: 'INTELLIGENCE',
    icon: Grid,
    defaultSize: 'small',
    description: 'Engine timeframe alignment count against the lock gate'
  },
  {
    id: 'evidence_alignment',
    title: 'Evidence Alignment',
    category: 'INTELLIGENCE',
    icon: Layers,
    defaultSize: 'small',
    description: 'Engine evidence families and which side each one backs'
  },
  {
    id: 'cross_venue',
    title: 'Cross-Venue Odds',
    category: 'INTELLIGENCE',
    icon: Scale,
    defaultSize: 'small',
    description: 'Kalshi 15-minute YES and NO prices (no Polymarket feed)'
  },
  {
    id: 'sentiment',
    title: 'Market Sentiment',
    category: 'INTELLIGENCE',
    icon: Eye,
    defaultSize: 'small',
    description: 'Sentiment and funding rates (not measured by VIXY)'
  },
  {
    id: 'whale_activity',
    title: 'Whale Activity Radar',
    category: 'INTELLIGENCE',
    icon: Fish,
    defaultSize: 'small',
    description: 'Coinbase large prints: taker buy and sell totals'
  },
  {
    id: 'edge_scanner',
    title: 'Edge Scanner',
    category: 'INTELLIGENCE',
    icon: Sparkles,
    defaultSize: 'small',
    description: 'Edge versus the market (not measured on this card)'
  },
  {
    id: 'pattern_engine',
    title: 'Pattern Engine',
    category: 'INTELLIGENCE',
    icon: Activity,
    defaultSize: 'small',
    description: 'Fixed chart rules on 1-minute candles: EMA cross and breakout'
  },

  // ================= SYSTEM =================
  {
    id: 'data_health',
    title: 'Data Health & Feed',
    category: 'SYSTEM',
    icon: Database,
    defaultSize: 'small',
    description: 'Engine tick age, price data age and fresh venues'
  },
  {
    id: 'live_feed',
    title: 'Live Market Feed',
    category: 'SYSTEM',
    icon: Radio,
    defaultSize: 'small',
    description: 'Recent Coinbase large prints with aggressor side'
  },
  {
    id: 'telemetry',
    title: 'Engine Telemetry',
    category: 'SYSTEM',
    icon: Sliders,
    defaultSize: 'small',
    description: 'Engine tick age, payload gap and temporal stability'
  },
  {
    id: 'cycle_history',
    title: 'Cycle History',
    category: 'SYSTEM',
    icon: History,
    defaultSize: 'medium',
    description: 'Recent ledger cycles and their graded outcomes'
  },
  {
    id: 'performance',
    title: 'Performance Matrix',
    category: 'SYSTEM',
    icon: Trophy,
    defaultSize: 'small',
    description: 'Graded BTC lock record and average Brier score'
  },
  {
    id: 'alerts',
    title: 'Live Alerts & Warnings',
    category: 'SYSTEM',
    icon: Bell,
    defaultSize: 'small',
    description: 'Current lock status and the last settled cycle'
  },

  // ================= PERSONAL =================
  {
    id: 'watchlist',
    title: 'Asset Watchlist',
    category: 'PERSONAL',
    icon: Star,
    defaultSize: 'small',
    description: 'Live BTC, ETH and SOL prices'
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
    description: 'Shortcuts to the Terminal and Replay Center'
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
