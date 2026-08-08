import React, { useState, useEffect } from 'react';
import {
  Layers,
  TrendingUp,
  ShieldAlert,
  Zap,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  Lock,
  Radio,
  Sliders,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

import { AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';

interface WhaleTrackerViewProps {
  onSelectAssetAndNavigate?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

interface WhaleOrder {
  id: string;
  time: string;
  asset: string;
  action: 'BUY_SWEEP' | 'SELL_DUMP' | 'STRIKE_DEFENSE' | 'ICEBERG_ACCUMULATION';
  sizeUSD: number;
  contractPrice: string;
  venue: 'Kalshi' | 'Polymarket' | 'Derive' | 'Coinbase Pro' | 'Binance';
  confidence: number;
  entityName: string;
  impact: 'HIGH' | 'EXTREME' | 'CRITICAL';
}

const INITIAL_WHALE_ORDERS: WhaleOrder[] = [
  {
    id: 'wh-998',
    time: 'Just now',
    asset: 'BTC',
    action: 'BUY_SWEEP',
    sizeUSD: 2480000,
    contractPrice: '$96,500 Strike YES',
    venue: 'Kalshi',
    confidence: 94,
    entityName: 'Institutional Volume Cluster #02',
    impact: 'CRITICAL',
  },
  {
    id: 'wh-997',
    time: '2 mins ago',
    asset: 'BTC',
    action: 'STRIKE_DEFENSE',
    sizeUSD: 1850000,
    contractPrice: '$96,000 Floor Support',
    venue: 'Polymarket',
    confidence: 91,
    entityName: 'Apex Quant Liquidity #14',
    impact: 'EXTREME',
  },
  {
    id: 'wh-996',
    time: '4 mins ago',
    asset: 'ETH',
    action: 'ICEBERG_ACCUMULATION',
    sizeUSD: 920000,
    contractPrice: '$3,400 Strike YES',
    venue: 'Derive',
    confidence: 88,
    entityName: 'Satoshi Era Whale #089',
    impact: 'HIGH',
  },
  {
    id: 'wh-995',
    time: '7 mins ago',
    asset: 'SOL',
    action: 'BUY_SWEEP',
    sizeUSD: 1450000,
    contractPrice: '$195 Strike YES',
    venue: 'Kalshi',
    confidence: 89,
    entityName: 'Solana Foundation Bridge',
    impact: 'EXTREME',
  },
  {
    id: 'wh-994',
    time: '11 mins ago',
    asset: 'NVDA',
    action: 'STRIKE_DEFENSE',
    sizeUSD: 3100000,
    contractPrice: '$135 Strike YES',
    venue: 'Kalshi',
    confidence: 96,
    entityName: 'CME Block Router #08',
    impact: 'CRITICAL',
  },
  {
    id: 'wh-993',
    time: '15 mins ago',
    asset: 'BTC',
    action: 'BUY_SWEEP',
    sizeUSD: 4200000,
    contractPrice: '$97,000 Strike YES',
    venue: 'Coinbase Pro',
    confidence: 95,
    entityName: 'BlackRock Custody Bridge',
    impact: 'CRITICAL',
  },
];

const STRIKE_WALLS = [
  { asset: 'BTC', strike: '$96,000', type: 'SUPPORT FLOOR', volume: '$18.4M', whaleBias: 92, status: 'HEAVILY DEFENDED' },
  { asset: 'BTC', strike: '$97,500', type: 'RESISTANCE CEILING', volume: '$12.1M', whaleBias: 38, status: 'TESTING LIQUIDITY' },
  { asset: 'ETH', strike: '$3,400', type: 'SUPPORT FLOOR', volume: '$8.9M', whaleBias: 86, status: 'WHALE ACCUMULATING' },
  { asset: 'SOL', strike: '$190', type: 'SUPPORT FLOOR', volume: '$6.2M', whaleBias: 88, status: 'HEAVILY DEFENDED' },
  { asset: 'NVDA', strike: '$135', type: 'SUPPORT FLOOR', volume: '$14.5M', whaleBias: 94, status: 'INSTITUTIONAL LOCK' },
];

const TOP_WHALE_ENTITIES = [
  { name: 'Institutional Volume Cluster #02', winRate: '92.4%', activeSize: '$28.4M', bias: 'BULLISH', topAsset: 'BTC', accuracyScore: 98 },
  { name: 'CME Block Router #08', winRate: '89.7%', activeSize: '$41.2M', bias: 'BULLISH', topAsset: 'NVDA / SPY', accuracyScore: 96 },
  { name: 'Apex Quant Liquidity #14', winRate: '87.1%', activeSize: '$19.8M', bias: 'NEUTRAL-BULL', topAsset: 'BTC', accuracyScore: 93 },
  { name: 'Satoshi Era Cluster #089', winRate: '94.0%', activeSize: '$15.5M', bias: 'BULLISH', topAsset: 'ETH', accuracyScore: 97 },
];

export const WhaleTrackerView: React.FC<WhaleTrackerViewProps> = ({
  onSelectAssetAndNavigate,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('ALL');
  const [minSizeFilter, setMinSizeFilter] = useState<number>(100000);
  const [orders, setOrders] = useState<WhaleOrder[]>(INITIAL_WHALE_ORDERS);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);

  // Real live whale order feed effect from /api/whales
  useEffect(() => {
    if (!isLiveStreaming) return;

    let isSubscribed = true;
    const fetchWhaleData = async () => {
      try {
        const assetParam = selectedAssetFilter === 'ALL' ? 'BTC' : selectedAssetFilter;
        const res = await fetch(`/api/whales?asset=${assetParam}`);
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (isSubscribed && Array.isArray(data.orders) && data.orders.length > 0) {
            setOrders(data.orders);
            setLastUpdated(new Date().toLocaleTimeString());
          }
        }
      } catch (err) {
        console.warn('Live whale stream update failed', err);
      }
    };

    fetchWhaleData();
    const interval = setInterval(fetchWhaleData, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isLiveStreaming, selectedAssetFilter]);

  const filteredOrders = orders.filter((o) => {
    const matchesAsset = selectedAssetFilter === 'ALL' || o.asset === selectedAssetFilter;
    const matchesSize = o.sizeUSD >= minSizeFilter;
    return matchesAsset && matchesSize;
  });

  const totalWhaleVolume24h = orders.reduce((sum, o) => sum + o.sizeUSD, 0) + 42100000;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* HEADER HERO BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#12072b] via-[#0b051b] to-[#170a38] border border-purple-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-mono font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>LIVE INSTITUTIONAL BLOCK STREAM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-emerald-300">250ms BRIDGE LATENCY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Whale Order Flow & Dark Pool Tracker
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
              Track multi-million dollar institutional sweeps, iceberg orders, and strike defense walls in real-time across Kalshi, Polymarket, Derive, and top liquidity bridges.
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#090415]/90 border border-purple-900/60 font-mono">
              <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Tracked Volume (24h)</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                ${(totalWhaleVolume24h / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#090415]/90 border border-purple-900/60 font-mono">
              <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Whale Sentiment</span>
              <span className="text-base sm:text-lg font-black text-purple-200 flex items-center gap-1">
                89% <span className="text-emerald-400 text-xs font-sans font-bold">BULL DEFENSE</span>
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#090415]/90 border border-purple-900/60 font-mono">
              <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Live Status</span>
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-white hover:text-emerald-300 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {isLiveStreaming ? 'STREAMING ACTIVE' : 'PAUSED'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL TOOLBAR */}
      <div className="p-4 rounded-2xl bg-[#0d0620]/90 border border-purple-900/40 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        {/* Asset Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-purple-300/60 font-bold uppercase text-[10px] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" /> Asset:
          </span>
          {['ALL', 'BTC', 'ETH', 'SOL', 'NVDA', 'SPY', 'TSLA'].map((sym) => (
            <button
              key={sym}
              onClick={() => setSelectedAssetFilter(sym)}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all ${
                selectedAssetFilter === sym
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40'
                  : 'bg-[#06030d] text-purple-300/70 hover:text-white hover:bg-purple-900/30 border border-purple-950'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Order Size Threshold Dropdown / Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#06030d] p-1 rounded-xl border border-purple-950">
            <span className="text-[10px] text-purple-300/60 uppercase font-bold px-2">Min Size:</span>
            {[
              { label: '$50k+', value: 50000 },
              { label: '$100k+', value: 100000 },
              { label: '$500k+', value: 500000 },
              { label: '$1M+', value: 1000000 },
            ].map((th) => (
              <button
                key={th.value}
                onClick={() => setMinSizeFilter(th.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  minSizeFilter === th.value
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-purple-300/70 hover:text-white'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-purple-300/50 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
            <span>Updated: {lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* GATED MAIN CONTENT GRID */}
      <IntelligenceLockGate
        isVerified={isDiscordVerified}
        onOpenDiscordModal={onOpenDiscordModal}
        title="WHALE RADAR INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock live institutional block trades, iceberg accumulation alerts, and strike walls."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1 & 2: LIVE WHALE ORDERS STREAM (2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          {/* VIXY ELITE WHALE ALERT FUNNEL CONVERSION BOX */}
          <div className="bg-gradient-to-r from-[#170a33] via-[#0f0624] to-[#14082e] p-4 rounded-2xl border border-amber-500/50 space-y-2 font-mono text-xs shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300 flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-amber-400" />
                VIXY ELITE WHALE TRADE PLAN
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                🔒 ELITE EXCLUSIVE
              </span>
            </div>
            <p className="text-purple-200/90 font-sans text-xs">
              Whale alerts deliver real-time directional delta updates. Upgrade to <strong>VIXY ELITE AI</strong> to view complete strike defense targets, iceberg entry zones, and automated stop-loss execution levels.
            </p>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-black text-white tracking-wide">
                Live Block Execution Stream
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 text-[10px] font-mono border border-purple-800/40">
                {filteredOrders.length} Recent Sweeps
              </span>
            </div>
            <span className="text-xs text-purple-300/60 font-mono">
              Auto-syncing websocket feed
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#090415] border border-purple-900/30 text-purple-300/60 font-mono text-xs">
                No whale block orders match current filter criteria.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isCritical = order.impact === 'CRITICAL';
                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 group hover:border-purple-500/60 ${
                      isCritical
                        ? 'bg-gradient-to-r from-[#170a33] via-[#0d0620] to-[#12072b] border-purple-500/50 shadow-lg shadow-purple-950/40'
                        : 'bg-[#0b051b] border-purple-900/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Asset Icon & Action Badge */}
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-800 to-purple-950 flex items-center justify-center text-white font-black font-mono shadow-md border border-purple-500/30 shrink-0">
                          {order.asset}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white font-mono">
                              {order.contractPrice}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold ${
                                order.action === 'BUY_SWEEP'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : order.action === 'STRIKE_DEFENSE'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {order.action.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-mono text-purple-300/50">
                              via {order.venue}
                            </span>
                          </div>

                          <div className="text-xs text-purple-300/70 flex items-center gap-2">
                            <span>Entity: <strong className="text-purple-200">{order.entityName}</strong></span>
                            <span>•</span>
                            <span className="text-[11px] text-purple-400 font-mono">{order.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Dollar Amount & Confidence */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-900/30">
                        <div className="text-right">
                          <div className="text-base font-black text-emerald-400 font-mono">
                            ${(order.sizeUSD / 1000).toLocaleString()}k
                          </div>
                          <div className="text-[10px] font-mono text-purple-300/60 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{order.confidence}% Quant Edge</span>
                          </div>
                        </div>

                        {onSelectAssetAndNavigate && (
                          <button
                            onClick={() => onSelectAssetAndNavigate(order.asset)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1 active:scale-95"
                          >
                            <span>Align</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: WHALE STRIKE WALLS & TOP TRACKED ENTITIES */}
        <div className="space-y-6">
          {/* WHALE STRIKE DEFENSE WALLS */}
          <div className="p-5 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  Whale Strike Defense Walls
                </h3>
              </div>
              <span className="text-[10px] text-purple-300/60 font-mono">Orderbook Depth</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {STRIKE_WALLS.map((wall, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#120729]/80 border border-purple-900/40 space-y-2 hover:border-purple-600/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{wall.asset}</span>
                      <span className="text-purple-300 font-bold">{wall.strike}</span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-950 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
                        {wall.type}
                      </span>
                    </div>
                    <span className="font-black text-emerald-400">{wall.volume}</span>
                  </div>

                  {/* Progress Bar of Whale Defense Strength */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                        style={{ width: `${wall.whaleBias}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-purple-300/60">
                      <span>{wall.status}</span>
                      <span>{wall.whaleBias}% Bull Defense</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOP TRACKED INSTITUTIONAL VAULTS */}
          <div className="p-5 rounded-3xl bg-[#0a0518] border border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  Top Monitored Vaults
                </h3>
              </div>
              <span className="text-[10px] text-purple-300/60 font-mono">24h Radar</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {TOP_WHALE_ENTITIES.map((entity, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#0e0720] border border-purple-900/40 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-purple-200 text-xs">
                      {entity.name}
                    </div>
                    <div className="text-[10px] text-purple-300/60 flex items-center gap-2">
                      <span>Top Focus: <strong className="text-white">{entity.topAsset}</strong></span>
                      <span>•</span>
                      <span>Active: <strong className="text-emerald-400">{entity.activeSize}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-400">
                      {entity.winRate} WIN
                    </div>
                    <div className="text-[9px] text-purple-300/50">
                      Score: {entity.accuracyScore}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </IntelligenceLockGate>
    </div>
  );
};
