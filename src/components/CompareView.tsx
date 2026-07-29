import React, { useState } from 'react';
import { Sliders, Sparkles, TrendingUp, ShieldAlert, ArrowRightLeft, Zap } from 'lucide-react';
import { ASSET_DATABASE, AssetConfig } from '../data/assetData';

export const CompareView: React.FC = () => {
  const [assetA, setAssetA] = useState<string>('BTC');
  const [assetB, setAssetB] = useState<string>('ETH');

  const configA = ASSET_DATABASE[assetA] || ASSET_DATABASE.BTC;
  const configB = ASSET_DATABASE[assetB] || ASSET_DATABASE.ETH;

  const allAssets = Object.keys(ASSET_DATABASE);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Selectors */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#12082b] via-[#1a0e3a] to-[#12082b] border border-purple-500/20 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Institutional Split-Screen Analysis</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Asset Compare Mode</h1>
            <p className="text-xs text-purple-200/70">
              Side-by-side quantitative breakdown of predictions, order flow, whale density, and statistical edge.
            </p>
          </div>

          {/* Controls to switch Asset A and Asset B */}
          <div className="flex items-center gap-3">
            {/* Asset A Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono font-bold text-purple-300 uppercase mb-1">Asset A</label>
              <select
                value={assetA}
                onChange={(e) => setAssetA(e.target.value)}
                className="bg-[#090415] border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
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
              className="p-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 hover:text-white transition-all mt-4"
              title="Swap Assets"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            {/* Asset B Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono font-bold text-purple-300 uppercase mb-1">Asset B</label>
              <select
                value={assetB}
                onChange={(e) => setAssetB(e.target.value)}
                className="bg-[#090415] border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
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

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset A Column */}
        <AssetComparisonCard config={configA} highlightColor="purple" />

        {/* Asset B Column */}
        <AssetComparisonCard config={configB} highlightColor="emerald" />
      </div>
    </div>
  );
};

const AssetComparisonCard: React.FC<{ config: AssetConfig; highlightColor: 'purple' | 'emerald' }> = ({
  config,
  highlightColor,
}) => {
  const isPurple = highlightColor === 'purple';

  return (
    <div className="p-6 rounded-3xl bg-[#0e0722]/90 border border-purple-500/20 shadow-xl backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg"
            style={{ backgroundColor: config.color }}
          >
            {config.symbol}
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {config.name} ({config.symbol})
            </h3>
            <span className="text-xs text-purple-300/70 font-mono">${config.price.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="text-lg font-black text-emerald-400">+{config.change24h}%</div>
          <span className="text-[10px] text-purple-300/60 uppercase font-bold">24H Trend</span>
        </div>
      </div>

      {/* AI Prediction & Edge Metric */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-purple-900/40 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-300/80 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI Direction Signal
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-xs">
            {config.prediction.direction} (BULLISH)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2.5 rounded-xl bg-[#090415] border border-purple-900/30">
            <div className="text-[10px] text-purple-300/60 uppercase">AI Confidence</div>
            <div className="text-lg font-black text-purple-300">{config.prediction.confidence}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#090415] border border-purple-900/30">
            <div className="text-[10px] text-purple-300/60 uppercase">Statistical Edge</div>
            <div className="text-lg font-black text-emerald-400">+{config.prediction.edgePct}%</div>
          </div>
        </div>
      </div>

      {/* Order Flow & Depth Breakdown */}
      <div className="space-y-3 font-mono">
        <div className="text-xs font-bold text-purple-200 flex items-center justify-between">
          <span>L2 Order Flow Cushion</span>
          <span className="text-emerald-400">{config.orderFlow.netDelta} Net</span>
        </div>

        <div className="w-full bg-[#090415] rounded-full h-2 overflow-hidden flex">
          <div
            className="bg-emerald-400 h-full"
            style={{ width: `${config.orderFlow.bullVolumePct}%` }}
          />
          <div
            className="bg-rose-500 h-full"
            style={{ width: `${config.orderFlow.bearVolumePct}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-purple-300/70">
          <span>Buyers: {config.orderFlow.bullVolumePct}%</span>
          <span>Sellers: {config.orderFlow.bearVolumePct}%</span>
        </div>
      </div>

      {/* Top Whales Active */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-purple-200 uppercase font-mono">Whale Activity Density</div>
        {config.whales.map((w) => (
          <div
            key={w.id}
            className="p-2.5 rounded-xl bg-white/[0.02] border border-purple-900/30 flex items-center justify-between text-xs font-mono"
          >
            <div>
              <div className="font-bold text-white">{w.usdValue}</div>
              <div className="text-[10px] text-purple-300/60">{w.venue}</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
              {w.impact}
            </span>
          </div>
        ))}
      </div>

      {/* Primary Pattern */}
      <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/40 text-xs">
        <div className="font-extrabold text-purple-200 mb-1 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Primary Microstructure Scan
        </div>
        <p className="text-purple-300/90 leading-relaxed font-sans">{config.patterns[0]?.description}</p>
      </div>
    </div>
  );
};
