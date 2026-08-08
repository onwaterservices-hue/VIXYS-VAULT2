import React, { useState } from 'react';
import { Sliders, Sparkles, TrendingUp, ShieldAlert, ArrowRightLeft, Zap, ArrowRight, BarChart2, Layers, CheckCircle2 } from 'lucide-react';
import { ASSET_DATABASE, AssetConfig } from '../data/assetData';
import { AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';

interface CompareViewProps {
  onSelectAssetAndNavigate?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  onSelectAssetAndNavigate,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [assetA, setAssetA] = useState<string>('BTC');
  const [assetB, setAssetB] = useState<string>('ETH');

  const configA = ASSET_DATABASE[assetA] || ASSET_DATABASE.BTC;
  const configB = ASSET_DATABASE[assetB] || ASSET_DATABASE.ETH;

  const allAssets = Object.keys(ASSET_DATABASE);
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);

  // Quick preset pairs for fast switching
  const presetPairs = [
    { a: 'BTC', b: 'ETH', label: 'BTC vs ETH' },
    { a: 'ETH', b: 'SOL', label: 'ETH vs SOL' },
    { a: 'SOL', b: 'BTC', label: 'SOL vs BTC' },
    { a: 'BTC', b: 'SOL', label: 'BTC vs SOL' },
    { a: 'XRP', b: 'DOGE', label: 'XRP vs DOGE' },
  ];

  return (
    <div className="space-y-6 font-sans animate-fadeIn">
      {/* Top Header & Selectors */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#12082b] via-[#1a0e3a] to-[#12082b] border border-purple-500/30 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Institutional Quantitative Split-Screen Analysis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Asset Compare Mode
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/70 mt-1 max-w-2xl">
              Side-by-side comparative breakdown of AI prediction probabilities, order flow imbalance, whale activity density, and calibrated statistical edge.
            </p>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-bold mr-1">Presets:</span>
              {presetPairs.map((pair) => {
                const isActive = assetA === pair.a && assetB === pair.b;
                return (
                  <button
                    key={pair.label}
                    onClick={() => {
                      setAssetA(pair.a);
                      setAssetB(pair.b);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white border border-purple-400/50 shadow-md'
                        : 'bg-[#090415]/80 text-purple-300/80 hover:text-white border border-purple-900/40 hover:border-purple-500/40'
                    }`}
                  >
                    {pair.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Selectors & Swap Control */}
          <div className="flex items-center gap-3 bg-[#080413] p-3 rounded-2xl border border-purple-900/50 shrink-0">
            {/* Asset A Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono font-bold text-purple-300 uppercase mb-1">Asset A</label>
              <select
                value={assetA}
                onChange={(e) => setAssetA(e.target.value)}
                className="bg-[#120729] border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {allAssets.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} - {ASSET_DATABASE[sym].name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const temp = assetA;
                setAssetA(assetB);
                setAssetB(temp);
              }}
              className="p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 hover:text-white transition-all mt-4 active:scale-95"
              title="Swap Asset A & Asset B"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            {/* Asset B Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono font-bold text-purple-300 uppercase mb-1">Asset B</label>
              <select
                value={assetB}
                onChange={(e) => setAssetB(e.target.value)}
                className="bg-[#120729] border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {allAssets.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} - {ASSET_DATABASE[sym].name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* GATED COMPARISON GRID */}
      <IntelligenceLockGate
        isVerified={isDiscordVerified}
        onOpenDiscordModal={onOpenDiscordModal}
        title="ASSET COMPARE INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock split-screen quantitative probability comparisons and order flow telemetry."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset A Column */}
        <AssetComparisonCard
          config={configA}
          highlightColor="purple"
          onSelectAssetAndNavigate={onSelectAssetAndNavigate}
        />

        {/* Asset B Column */}
        <AssetComparisonCard
          config={configB}
          highlightColor="emerald"
          onSelectAssetAndNavigate={onSelectAssetAndNavigate}
        />
      </div>
      </IntelligenceLockGate>
    </div>
  );
};

const AssetComparisonCard: React.FC<{
  config: AssetConfig;
  highlightColor: 'purple' | 'emerald';
  onSelectAssetAndNavigate?: (symbol: string) => void;
}> = ({ config, highlightColor, onSelectAssetAndNavigate }) => {
  const isPurple = highlightColor === 'purple';

  return (
    <div className="p-6 rounded-3xl bg-[#0e0722]/90 border border-purple-500/30 shadow-xl backdrop-blur-xl space-y-6">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg"
            style={{ backgroundColor: config.color }}
          >
            {config.symbol.slice(0, 3)}
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {config.name} ({config.symbol})
            </h3>
            <span className="text-xs text-purple-300/80 font-mono font-bold">
              ${config.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className={`text-lg font-black ${config.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {config.change24h >= 0 ? '+' : ''}
            {config.change24h.toFixed(2)}%
          </div>
          <span className="text-[10px] text-purple-300/60 uppercase font-bold">24H Trend</span>
        </div>
      </div>

      {/* AI Direction Signal & Calibrated Edge */}
      <div className="p-4 rounded-2xl bg-[#090415]/80 border border-purple-800/40 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI Direction Signal
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{config.prediction.direction} (BULLISH)</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-[#120729] border border-purple-900/40">
            <div className="text-[10px] text-purple-300/60 uppercase font-bold">AI Confidence</div>
            <div className="text-xl font-black text-white">{config.prediction.confidence}%</div>
          </div>
          <div className="p-3 rounded-xl bg-[#120729] border border-purple-900/40">
            <div className="text-[10px] text-purple-300/60 uppercase font-bold">Statistical Edge</div>
            <div className="text-xl font-black text-emerald-400">+{config.prediction.edgePct}%</div>
          </div>
        </div>
      </div>

      {/* Order Flow & L2 Taker Volume */}
      <div className="space-y-3 font-mono">
        <div className="text-xs font-bold text-purple-200 flex items-center justify-between">
          <span>L2 Order Flow Cushion</span>
          <span className="text-emerald-400 font-bold">{config.orderFlow.netDelta} Net</span>
        </div>

        <div className="w-full bg-[#090415] rounded-full h-2.5 overflow-hidden flex border border-purple-900/40">
          <div
            className="bg-emerald-400 h-full transition-all duration-500"
            style={{ width: `${config.orderFlow.bullVolumePct}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${config.orderFlow.bearVolumePct}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-purple-300/80 font-bold">
          <span className="text-emerald-400">Taker Buyers: {config.orderFlow.bullVolumePct}%</span>
          <span className="text-rose-400">Taker Sellers: {config.orderFlow.bearVolumePct}%</span>
        </div>
      </div>

      {/* Whale Activity Density */}
      <div className="space-y-2 font-mono">
        <div className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center justify-between">
          <span>Whale Activity Density</span>
          <span className="text-[10px] text-purple-400 font-bold">{config.whales.length} Active Orders</span>
        </div>
        {config.whales.map((w) => (
          <div
            key={w.id}
            className="p-3 rounded-xl bg-[#090415]/70 border border-purple-900/40 flex items-center justify-between text-xs"
          >
            <div>
              <div className="font-extrabold text-white">{w.usdValue}</div>
              <div className="text-[10px] text-purple-300/70">{w.venue} • {w.type}</div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
              {w.impact}
            </span>
          </div>
        ))}
      </div>

      {/* Microstructure Pattern */}
      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-xs">
        <div className="font-extrabold text-purple-200 mb-1 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          Primary Microstructure Scan
        </div>
        <p className="text-purple-300/90 leading-relaxed font-sans text-xs">
          {config.patterns[0]?.description || `Active microstructure scan confirms taker buy absorption with strong orderbook imbalance.`}
        </p>
      </div>

      {/* Action Button: Analyze in Live Terminal */}
      {onSelectAssetAndNavigate && (
        <button
          onClick={() => onSelectAssetAndNavigate(config.symbol)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 border border-purple-400/40 active:scale-[0.98]"
        >
          <span>Analyze {config.symbol} in Live Terminal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
