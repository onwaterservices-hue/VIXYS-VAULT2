import React, { useState, useEffect } from 'react';
import { BTCTicker, AlertSettings } from '../types';
import { ScalpDecisionChart } from './ScalpDecisionChart';
import { AIBrainMemoryVault } from './AIBrainMemoryVault';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import {
  Zap,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Brain,
  Vote,
  BarChart3,
  Search,
  Radio,
  Clock,
  ExternalLink,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Lock,
  Cpu,
  LineChart,
} from 'lucide-react';

interface ScalpingDeskViewProps {
  ticker: BTCTicker;
  userRole: 'UNPAID' | 'PRO' | 'ADMIN' | 'OWNER';
  selectedAsset?: string;
  onSelectAsset?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

export const ScalpingDeskView: React.FC<ScalpingDeskViewProps> = ({
  ticker,
  userRole,
  selectedAsset = 'BTC',
  onSelectAsset,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [deskTab, setDeskTab] = useState<'SIGNAL' | 'WHY' | 'L2_SCANNER' | 'PAPER_DESK'>('SIGNAL');
  const [showWhyDrawer, setShowWhyDrawer] = useState<boolean>(false);

  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  const isUserAdmin = userRole === 'ADMIN' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = userRole === 'PRO' || userRole === 'ADMIN';
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified;

  useEffect(() => {
    let active = true;
    const load15sSignal = async () => {
      try {
        const [sig, status] = await Promise.all([
          fetchApiSignal(selectedAsset, '15s'),
          fetchModelStatus(selectedAsset, '15s'),
        ]);
        if (active) {
          setApiSignal(sig);
          setModelStatus(status);
        }
      } catch (err) {
        console.warn('Failed to load scalp signals', err);
      }
    };
    load15sSignal();
    const interval = setInterval(load15sSignal, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  const spotPrice = ticker.price || 64160.5;
  const confidence = apiSignal?.confidence ?? 91.6;
  const edgePct = apiSignal?.edge ? (apiSignal.edge * 100).toFixed(1) : '14.2';
  const action = apiSignal?.action || 'BUY_YES';
  const isBuyUp = action.includes('YES') || action.includes('BUY');

  return (
    <div className="space-y-4 font-mono text-purple-100 max-w-7xl mx-auto relative">
      {/* Radiant Glowing Ambient Aura Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-purple-600/15 via-emerald-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
      
      {/* 1. TOP IDENTITY STRIP */}
      <div className="bg-gradient-to-r from-[#14082e] via-[#0e0521] to-[#080214] border border-purple-500/40 p-4 sm:p-5 rounded-3xl shadow-[0_0_35px_rgba(168,85,247,0.22)] flex flex-wrap items-center justify-between gap-3 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2.5 rounded-2xl bg-purple-600/25 text-purple-300 border border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Zap className="w-5 h-5 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wider font-sans uppercase">
                15S ALPHA INTELLIGENCE ENGINE
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#00FF88] border border-emerald-400/40 text-[9px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(0,255,136,0.3)]">
                ● ULTRA-FAST 15S
              </span>
            </div>
            <p className="text-[10.5px] text-purple-300/80 font-sans mt-0.5">
              HIGH-FREQUENCY SHORT-HORIZON PROBABILISTIC DECISION INTELLIGENCE
            </p>
          </div>
        </div>

        {/* Asset Switcher Pills */}
        <div className="flex items-center space-x-1.5 bg-[#080414]/90 p-1.5 rounded-2xl border border-purple-500/40 relative z-10 shadow-inner">
          {['BTC', 'ETH', 'SOL', 'XRP'].map((symbol) => (
            <button
              key={symbol}
              onClick={() => onSelectAsset && onSelectAsset(symbol)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedAsset === symbol
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] border border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* GATED INTELLIGENCE BODY */}
      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenDiscordModal}
        title="15S SCALPING INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock live 15s probability cones, micro-delta sweeps, and AI conviction signals."
      >
        <div className="space-y-4">
          
          {/* 2. VISUAL CENTERPIECE: FULL-WIDTH <ScalpDecisionChart> */}
          <div className="relative">
            <ScalpDecisionChart
              asset={selectedAsset}
              desk="15s"
              title={`${selectedAsset} 15S SCALPING MATRIX & PROBABILITY CONE`}
            />
          </div>

          {/* 3. ORDER FLOW & INSTITUTIONAL MICROSTRUCTURE TELEMETRY (COMPACT TERMINAL GRID) */}
          <div className="bg-[#0C0819] border border-purple-900/40 rounded-3xl overflow-hidden p-5 space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.5)]">
            
            {/* Tab Controls Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-purple-900/40 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDeskTab('SIGNAL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    deskTab === 'SIGNAL'
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Order Flow & Taker Delta
                </button>
                <button
                  onClick={() => setDeskTab('L2_SCANNER')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    deskTab === 'L2_SCANNER'
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  L2 Orderbook Depth
                </button>
                <button
                  onClick={() => setDeskTab('PAPER_DESK')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    deskTab === 'PAPER_DESK'
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Paper Execution Sandbox
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowWhyDrawer(!showWhyDrawer)}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-300" />
                  <span>Why This Signal?</span>
                  {showWhyDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                  Spot: <strong className="text-white">${spotPrice.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* TAB 1: ORDER FLOW & MICRO IMBALANCE (COMPACT 3-COLUMN INSTITUTIONAL TILES) */}
            {deskTab === 'SIGNAL' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                
                {/* 1. Net Taker Delta */}
                <div className="p-4 rounded-2xl bg-[#080414] border border-purple-900/40 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-cyan-300 uppercase tracking-wider text-[11px]">
                      Net Taker Delta (15s)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#00FF88] text-[9px] font-bold">
                      INFLOW
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#00FF88] font-mono">+1,420 BTC</div>
                  <p className="text-[10px] text-gray-400 font-sans leading-tight">
                    Market buyers absorbing ask liquidity walls rapidly with high velocity.
                  </p>
                </div>

                {/* 2. Orderbook Depth Ratio */}
                <div className="p-4 rounded-2xl bg-[#080414] border border-purple-900/40 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-cyan-300 uppercase tracking-wider text-[11px]">
                      Orderbook Depth Ratio
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                      BIDS STACKED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-200 font-mono">2.41 Bids / Asks</div>
                  <p className="text-[10px] text-gray-400 font-sans leading-tight">
                    Bid support strongly clustered $12.50 below spot price floor.
                  </p>
                </div>

                {/* 3. Cross-Venue Spread */}
                <div className="p-4 rounded-2xl bg-[#080414] border border-purple-900/40 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-cyan-300 uppercase tracking-wider text-[11px]">
                      Cross-Venue Spread
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                      SYNCHRONIZED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-300 font-mono">0.02% Spread</div>
                  <p className="text-[10px] text-gray-400 font-sans leading-tight">
                    Kalshi and Polymarket micro-implied probabilities tightly matched.
                  </p>
                </div>

              </div>
            )}

            {/* TAB 2: L2 ORDERBOOK DEPTH FEED */}
            {deskTab === 'L2_SCANNER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* Bids */}
                <div className="p-4 rounded-2xl bg-[#06180F] border border-emerald-500/30 space-y-2">
                  <span className="text-xs font-black text-[#00FF88] uppercase tracking-wider block">
                    Top 5 Bids (Buyers)
                  </span>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-gray-300">
                      <span>${(spotPrice - 1.5).toFixed(2)}</span>
                      <span className="text-[#00FF88] font-bold">42.8 BTC</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>${(spotPrice - 3.0).toFixed(2)}</span>
                      <span className="text-[#00FF88] font-bold">88.4 BTC</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>${(spotPrice - 5.5).toFixed(2)}</span>
                      <span className="text-[#00FF88] font-bold">120.1 BTC</span>
                    </div>
                  </div>
                </div>

                {/* Asks */}
                <div className="p-4 rounded-2xl bg-[#1A060E] border border-rose-500/30 space-y-2">
                  <span className="text-xs font-black text-[#FF3B30] uppercase tracking-wider block">
                    Top 5 Asks (Sellers)
                  </span>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-gray-300">
                      <span>${(spotPrice + 1.5).toFixed(2)}</span>
                      <span className="text-[#FF3B30] font-bold">14.2 BTC</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>${(spotPrice + 3.0).toFixed(2)}</span>
                      <span className="text-[#FF3B30] font-bold">22.5 BTC</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>${(spotPrice + 5.5).toFixed(2)}</span>
                      <span className="text-[#FF3B30] font-bold">39.1 BTC</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PAPER EXECUTION SANDBOX */}
            {deskTab === 'PAPER_DESK' && (
              <div className="p-5 rounded-2xl bg-[#080414] border border-purple-900/40 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                  <span className="text-xs font-bold text-purple-200 uppercase">
                    1-Click Paper Execution Sandbox
                  </span>
                  <span className="text-[10px] text-[#00FF88] font-mono">Simulated Balance: $10,000.00</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer">
                    BUY UP YES ($500)
                  </button>
                  <button className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer">
                    BUY DOWN NO ($500)
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* 4. EXPANDABLE "WHY THIS SIGNAL?" NEURAL VAULT */}
          {showWhyDrawer && (
            <div className="space-y-4 animate-fadeIn">
              <AIBrainMemoryVault asset={selectedAsset} desk="15s" />
            </div>
          )}

        </div>
      </IntelligenceLockGate>
    </div>
  );
};
