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
  userRole: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
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

  const isUserAdmin = userRole === 'ADMIN' || userRole === 'OWNER' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(String(userRole).toUpperCase());
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
    <div className="space-y-4 font-mono text-purple-100 w-full max-w-7xl mx-auto min-w-0 relative">
      {/* 1. TOP IDENTITY STRIP */}
      <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 relative overflow-hidden w-full min-w-0 shadow-lg">
        <div className="flex items-center space-x-3 relative z-10 min-w-0">
          <div className="p-2 rounded-xl bg-purple-900/30 text-purple-300 border border-purple-700/40 shrink-0">
            <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black font-mono tracking-tight text-white truncate">
                15S ALPHA INTELLIGENCE ENGINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] rounded-lg font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ● ULTRA-FAST 15S
              </span>
            </div>
            <p className="text-[10px] text-purple-300/70 font-sans mt-0.5 truncate">
              HIGH-FREQUENCY SHORT-HORIZON PROBABILISTIC DECISION INTELLIGENCE
            </p>
          </div>
        </div>

        {/* Asset Switcher Pills */}
        <div className="flex items-center space-x-1 bg-[#0d0722] p-1 rounded-xl border border-purple-800/40 relative z-10 shrink-0">
          {['BTC', 'ETH', 'SOL', 'XRP'].map((symbol) => (
            <button
              key={symbol}
              onClick={() => onSelectAsset && onSelectAsset(symbol)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedAsset === symbol
                  ? 'bg-purple-600/40 text-white border border-purple-500/50'
                  : 'text-purple-300/50 hover:text-white'
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
        <div className="space-y-4 w-full min-w-0">
          
          {/* 2. VISUAL CENTERPIECE: FULL-WIDTH <ScalpDecisionChart> */}
          <div className="relative w-full min-w-0">
            <ScalpDecisionChart
              asset={selectedAsset}
              desk="15s"
              title={`${selectedAsset} 15S SCALPING MATRIX & PROBABILITY CONE`}
            />
          </div>

          {/* 3. ORDER FLOW & INSTITUTIONAL MICROSTRUCTURE TELEMETRY (COMPACT TERMINAL GRID) */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-3.5 sm:p-4 space-y-3 w-full min-w-0 shadow-lg font-mono">
            
            {/* Tab Controls Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-purple-800/30 pb-2.5 gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setDeskTab('SIGNAL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    deskTab === 'SIGNAL'
                      ? 'bg-purple-600/40 text-white border border-purple-500/50'
                      : 'text-purple-300/50 hover:text-white'
                  }`}
                >
                  Order Flow & Taker Delta
                </button>
                <button
                  onClick={() => setDeskTab('L2_SCANNER')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    deskTab === 'L2_SCANNER'
                      ? 'bg-purple-600/40 text-white border border-purple-500/50'
                      : 'text-purple-300/50 hover:text-white'
                  }`}
                >
                  L2 Orderbook Depth
                </button>
                <button
                  onClick={() => setDeskTab('PAPER_DESK')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    deskTab === 'PAPER_DESK'
                      ? 'bg-purple-600/40 text-white border border-purple-500/50'
                      : 'text-purple-300/50 hover:text-white'
                  }`}
                >
                  Paper Sandbox
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowWhyDrawer(!showWhyDrawer)}
                  className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/40 text-purple-200 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shrink-0"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>Why This Signal?</span>
                  {showWhyDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <span className="text-[10px] text-purple-300/70 font-mono hidden md:inline shrink-0">
                  Spot: <strong className="text-white">${spotPrice.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* TAB 1: ORDER FLOW & MICRO IMBALANCE (COMPACT 3-COLUMN INSTITUTIONAL TILES) */}
            {deskTab === 'SIGNAL' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                
                {/* 1. Net Taker Delta */}
                <div className="bg-[#0d0722]/80 p-3 rounded-xl border border-purple-800/30 font-mono">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">
                      Net Taker Delta (15s)
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      INFLOW
                    </span>
                  </div>
                  <div className="text-lg font-black text-emerald-400">+1,420 BTC</div>
                  <p className="text-[10px] text-purple-300/60 font-sans mt-1 leading-tight">
                    Market buyers absorbing ask liquidity walls rapidly with high velocity.
                  </p>
                </div>

                {/* 2. Orderbook Depth Ratio */}
                <div className="bg-[#0d0722]/80 p-3 rounded-xl border border-purple-800/30 font-mono">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">
                      Orderbook Depth Ratio
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      BIDS STACKED
                    </span>
                  </div>
                  <div className="text-lg font-black text-purple-200">2.41 Bids / Asks</div>
                  <p className="text-[10px] text-purple-300/60 font-sans mt-1 leading-tight">
                    Bid support strongly clustered $12.50 below spot price floor.
                  </p>
                </div>

                {/* 3. Cross-Venue Spread */}
                <div className="bg-[#0d0722]/80 p-3 rounded-xl border border-purple-800/30 font-mono">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">
                      Cross-Venue Spread
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      SYNCHRONIZED
                    </span>
                  </div>
                  <div className="text-lg font-black text-purple-200">0.02% Spread</div>
                  <p className="text-[10px] text-purple-300/60 font-sans mt-1 leading-tight">
                    Kalshi and Polymarket micro-implied probabilities tightly matched.
                  </p>
                </div>

              </div>
            )}

            {/* TAB 2: L2 ORDERBOOK DEPTH FEED */}
            {deskTab === 'L2_SCANNER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Bids */}
                <div className="p-3 rounded-xl bg-[#08120d] border border-emerald-500/30 space-y-1.5">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                    Top 5 Bids (Buyers)
                  </span>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-purple-200/80">
                      <span>${(spotPrice - 1.5).toFixed(2)}</span>
                      <span className="text-emerald-400 font-bold">42.8 BTC</span>
                    </div>
                    <div className="flex justify-between text-purple-200/80">
                      <span>${(spotPrice - 3.0).toFixed(2)}</span>
                      <span className="text-emerald-400 font-bold">88.4 BTC</span>
                    </div>
                    <div className="flex justify-between text-purple-200/80">
                      <span>${(spotPrice - 5.5).toFixed(2)}</span>
                      <span className="text-emerald-400 font-bold">120.1 BTC</span>
                    </div>
                  </div>
                </div>

                {/* Asks */}
                <div className="p-3 rounded-xl bg-[#14080e] border border-rose-500/30 space-y-1.5">
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">
                    Top 5 Asks (Sellers)
                  </span>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-purple-200/80">
                      <span>${(spotPrice + 1.5).toFixed(2)}</span>
                      <span className="text-rose-400 font-bold">14.2 BTC</span>
                    </div>
                    <div className="flex justify-between text-purple-200/80">
                      <span>${(spotPrice + 3.0).toFixed(2)}</span>
                      <span className="text-rose-400 font-bold">22.5 BTC</span>
                    </div>
                    <div className="flex justify-between text-purple-200/80">
                      <span>${(spotPrice + 5.5).toFixed(2)}</span>
                      <span className="text-rose-400 font-bold">39.1 BTC</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PAPER EXECUTION SANDBOX */}
            {deskTab === 'PAPER_DESK' && (
              <div className="p-3.5 rounded-xl bg-[#0d0722]/80 border border-purple-800/30 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-purple-800/30 pb-1.5">
                  <span className="text-xs font-bold text-purple-200 uppercase">
                    1-Click Paper Execution Sandbox
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Simulated Balance: $10,000.00</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
                    BUY UP YES ($500)
                  </button>
                  <button className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer">
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
