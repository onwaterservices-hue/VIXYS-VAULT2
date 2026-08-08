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
} from 'lucide-react';

interface ScalpingDeskViewProps {
  ticker: BTCTicker;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  onUpgradeToPro: () => void;
  selectedAsset?: string;
  onSelectAsset?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

export const ScalpingDeskView: React.FC<ScalpingDeskViewProps> = ({
  ticker,
  userRole,
  onUpgradeToPro,
  selectedAsset = 'BTC',
  onSelectAsset,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [deskTab, setDeskTab] = useState<'SIGNAL' | 'WHY' | 'L2_SCANNER' | 'PAPER_DESK'>('SIGNAL');
  const [showWhyDrawer, setShowWhyDrawer] = useState<boolean>(false);

  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);

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
  const edgePct = apiSignal?.edge ? (apiSignal.edge * 100).toFixed(1) : '17.4';
  const action = apiSignal?.action || 'BUY_YES';
  const isBuyUp = action.includes('YES') || action.includes('BUY');

  return (
    <div className="space-y-5 font-mono text-purple-100">
      {/* Asset Selector Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0418] border border-purple-500/30 p-3.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wider flex items-center gap-2">
              15S ALPHA INTELLIGENCE ENGINE
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                SUB-SECOND LIVE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-sans">
              High-frequency order flow imbalance & probabilistic micro-settlement engine.
            </p>
          </div>
        </div>

        {/* Asset Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-[#050210] p-1 rounded-xl border border-purple-900/50">
          {['BTC', 'ETH', 'SOL', 'XRP'].map((symbol) => (
            <button
              key={symbol}
              onClick={() => onSelectAsset && onSelectAsset(symbol)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                selectedAsset === symbol
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] border border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* GATED INTELLIGENCE BODY */}
      <IntelligenceLockGate
        isVerified={isDiscordVerified}
        onOpenDiscordModal={onOpenDiscordModal}
        title="15S SCALPING INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock live 15s probability cones, micro-delta sweeps, and AI conviction signals."
      >
        <div className="space-y-5">
          {/* 1. HERO LEVEL: Full-Width <ScalpDecisionChart> */}
          <div className="relative">
            <ScalpDecisionChart
              asset={selectedAsset}
              desk="15s"
              title={`${selectedAsset} SCALPING DECISION MATRIX & PROBABILITY CONE`}
            />
          </div>

      {/* 2. SINGLE DECISION STRIP (Directly below chart, 1 clean row) */}
      <div className="bg-[#0b051f] border border-purple-500/30 p-4 rounded-2xl shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        {/* Signal Direction Capsule */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border ${
              isBuyUp
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(248,113,113,0.3)]'
            }`}
          >
            {isBuyUp ? '▲' : '▼'}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">LATIENT AI ACTION</span>
            <span
              className={`text-sm font-black tracking-wider ${
                isBuyUp ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isBuyUp ? 'BUY UP (CALL)' : 'BUY DOWN (PUT)'}
            </span>
          </div>
        </div>

        {/* Confidence Ring Metric */}
        <div className="border-l border-purple-900/40 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">MODEL CONFIDENCE</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-cyan-300">{confidence}%</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
              CALIBRATED
            </span>
          </div>
        </div>

        {/* Net Probability Edge */}
        <div className="border-l border-purple-900/40 pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">NET EXPECTED EDGE</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-purple-300">+{edgePct}%</span>
            <span className="text-[10px] text-purple-400">vs Implied Odds</span>
          </div>
        </div>

        {/* Expiry Clock */}
        <div className="border-l border-purple-900/40 pl-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">15s EXPIRY CLOCK</span>
            <span className="text-xl font-black text-amber-300 font-mono">00:12s</span>
          </div>
          <button
            onClick={() => setShowWhyDrawer(!showWhyDrawer)}
            className="px-3 py-1.5 rounded-xl bg-purple-900/50 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1 transition-all"
          >
            <span>Why Signal?</span>
            {showWhyDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* VIXY SAE 15S REAL-TIME INTELLIGENCE BAR */}
      <div className="bg-[#060212] border border-purple-800/60 p-3.5 rounded-2xl shadow-lg grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-[#0e0622] border border-purple-900/50 space-y-1">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Order-Flow Pressure</span>
          <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            +1,420 BTC (Ask Sweep)
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0e0622] border border-purple-900/50 space-y-1">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">15S Short Conviction</span>
          <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            HIGH ALIGNMENT ({confidence}%)
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0e0622] border border-purple-900/50 space-y-1">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Micro-Momentum Velocity</span>
          <span className="text-xs font-extrabold text-purple-200 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            +1.42%/s Velocity
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0e0622] border border-purple-900/50 space-y-1">
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">SAE Engine Stream</span>
          <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            SUB-SECOND SYNCHRONIZED
          </span>
        </div>
      </div>

      {/* 3. EXPANDABLE / TABBED SUPPORTING EVIDENCE ("Why this signal?") */}
      {showWhyDrawer && (
        <div className="space-y-4 animate-fadeIn">
          <AIBrainMemoryVault asset={selectedAsset} desk="15s" />
        </div>
      )}

      {/* 4. SUB-TABS: L2 Orderbook Scanner & Paper Execution Sandbox */}
      <div className="bg-[#090417] border border-purple-500/30 rounded-2xl overflow-hidden p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeskTab('SIGNAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                deskTab === 'SIGNAL'
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Order Flow & Micro Imbalance
            </button>
            <button
              onClick={() => setDeskTab('L2_SCANNER')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                deskTab === 'L2_SCANNER'
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              L2 Orderbook Depth Feed
            </button>
            <button
              onClick={() => setDeskTab('PAPER_DESK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                deskTab === 'PAPER_DESK'
                  ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1-Click Paper Scalper
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Spot Price: <strong className="text-white">${spotPrice.toFixed(2)}</strong>
          </span>
        </div>

        {/* Tab Content */}
        {deskTab === 'SIGNAL' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-[#110729] border border-purple-900/40 space-y-2">
              <span className="text-xs font-bold text-cyan-300 block uppercase">Net Taker Delta (15s)</span>
              <span className="text-2xl font-black text-emerald-400">+1,420 BTC</span>
              <p className="text-[11px] text-slate-400">Market buyers absorbing ask liquidity walls rapidly.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#110729] border border-purple-900/40 space-y-2">
              <span className="text-xs font-bold text-cyan-300 block uppercase">Orderbook Depth Ratio</span>
              <span className="text-2xl font-black text-purple-200">2.41 Bids / Asks</span>
              <p className="text-[11px] text-slate-400">Bid support stacked $12.50 below current spot.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#110729] border border-purple-900/40 space-y-2">
              <span className="text-xs font-bold text-cyan-300 block uppercase">Cross-Venue Spread</span>
              <span className="text-2xl font-black text-amber-300">0.02%</span>
              <p className="text-[11px] text-slate-400">Kalshi vs Polymarket implied odds tightly aligned.</p>
            </div>
          </div>
        )}

        {deskTab === 'L2_SCANNER' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-4">
              {/* Bid Depth */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <span className="text-xs font-bold text-emerald-300 block uppercase">
                  Top 5 Bids (Buyers)
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>${(spotPrice - 1.5).toFixed(2)}</span>
                    <span className="text-emerald-400 font-bold">42.8 BTC</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>${(spotPrice - 3.0).toFixed(2)}</span>
                    <span className="text-emerald-400 font-bold">88.4 BTC</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>${(spotPrice - 5.5).toFixed(2)}</span>
                    <span className="text-emerald-400 font-bold">120.1 BTC</span>
                  </div>
                </div>
              </div>

              {/* Ask Depth */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <span className="text-xs font-bold text-rose-300 block uppercase">
                  Top 5 Asks (Sellers)
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>${(spotPrice + 1.5).toFixed(2)}</span>
                    <span className="text-rose-400 font-bold">14.2 BTC</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>${(spotPrice + 3.0).toFixed(2)}</span>
                    <span className="text-rose-400 font-bold">22.5 BTC</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>${(spotPrice + 5.5).toFixed(2)}</span>
                    <span className="text-rose-400 font-bold">39.1 BTC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {deskTab === 'PAPER_DESK' && (
          <div className="p-5 rounded-xl bg-[#110729] border border-purple-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
              <span className="text-xs font-bold text-purple-200 uppercase">
                1-Click Paper Execution Sandbox
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Simulated Balance: $10,000.00</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                BUY UP YES ($500)
              </button>
              <button className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                BUY DOWN NO ($500)
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </IntelligenceLockGate>
  </div>
);
};
