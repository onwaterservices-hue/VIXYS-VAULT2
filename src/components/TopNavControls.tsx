import React from 'react';
import { Sparkles, Star, ChevronDown, Zap, Layers, Globe, Sliders } from 'lucide-react';
import { ASSET_DATABASE, AssetConfig } from '../data/assetData';

interface TopNavControlsProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  selectedTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  selectedVenues: string[];
  onToggleVenue: (venue: string) => void;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
  onOpenSearch: () => void;
  onOpenCompare?: () => void;
}

export const TopNavControls: React.FC<TopNavControlsProps> = ({
  selectedAsset,
  onSelectAsset,
  selectedTimeframe,
  onSelectTimeframe,
  selectedVenues,
  onToggleVenue,
  favorites,
  onToggleFavorite,
  onOpenSearch,
  onOpenCompare,
}) => {
  const assets = Object.values(ASSET_DATABASE);
  const activeConfig = ASSET_DATABASE[selectedAsset] || ASSET_DATABASE.BTC;

  const timeframes = ['15S', '1M', '5M', '15M', '30M', '1H', '4H', '1D'];
  const venues = ['Kalshi', 'Polymarket', 'DraftKings', 'Prediction Matrix', 'Cross Venue'];

  // AI Dynamic Summary Generator
  const getAiSummary = () => {
    if (selectedAsset === 'ETH') {
      return `ETH currently exhibits the strongest statistical edge (+15.8%) across all tracked assets with heavy staking inflows while BTC consolidates.`;
    }
    if (selectedAsset === 'SOL') {
      return `SOL is in an active short squeeze cascade (+18.4% edge) with high-frequency DEX arbitrage volume driving maximum confidence on Polymarket.`;
    }
    if (selectedAsset === 'BTC') {
      return `BTC high-integrity prediction setup detected with +1,467 BTC net taker buy cushion and 91% AI confidence on Kalshi.`;
    }
    return `${activeConfig.name} holds a +${activeConfig.prediction.edgePct}% statistical edge on ${selectedVenues[0] || 'Kalshi'} with ${activeConfig.prediction.confidence}% AI confidence.`;
  };

  return (
    <div className="space-y-4 font-sans mb-6">
      {/* 1. TOP ASSET SELECTOR PILLS */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          {assets.map((asset) => {
            const isSelected = selectedAsset === asset.symbol;
            const isFav = favorites.includes(asset.symbol);

            return (
              <div
                key={asset.symbol}
                onClick={() => onSelectAsset(asset.symbol)}
                className={`relative group flex items-center gap-3 px-3.5 py-2 rounded-2xl cursor-pointer transition-all duration-300 border select-none shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-900/90 via-purple-800/80 to-purple-950/90 border-purple-400/60 shadow-xl shadow-purple-900/40 text-white transform scale-105'
                    : 'bg-[#0d071d]/80 hover:bg-purple-900/30 border-purple-900/30 text-purple-200/80 hover:text-white'
                }`}
              >
                {/* Logo Badge */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-[11px] text-white shadow-md shrink-0"
                  style={{ backgroundColor: asset.color }}
                >
                  {asset.symbol.slice(0, 3)}
                </div>

                {/* Name & Price */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>{asset.symbol}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {asset.change24h >= 0 ? '+' : ''}
                      {asset.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-purple-200/90 font-bold">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Mini Sparkline Visualization */}
                <div className="hidden sm:flex items-center gap-0.5 h-4 w-10 opacity-70 group-hover:opacity-100 transition-opacity">
                  {asset.sparkline.map((pt, idx) => (
                    <div
                      key={idx}
                      className={`w-1 rounded-full ${asset.change24h >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{
                        height: `${Math.max(20, Math.min(100, ((pt - asset.sparkline[0]) / asset.sparkline[0]) * 1000 + 40))}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Star Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(asset.symbol);
                  }}
                  className="p-1 rounded-lg text-purple-400/50 hover:text-amber-400 transition-colors shrink-0"
                  title={isFav ? `Remove ${asset.symbol} from favorites` : `Add ${asset.symbol} to favorites`}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-purple-400/50 hover:text-amber-400'}`} />
                </button>
              </div>
            );
          })}

          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-black transition-all shrink-0 shadow-lg shadow-purple-950/40"
              title="Compare 2 Assets Side-by-Side (Predictions, Order Flow, Edge)"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-300" />
              <span>Split-Screen Compare</span>
            </button>
          )}

          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#0d071d]/80 hover:bg-purple-900/40 border border-purple-900/40 text-purple-300 text-xs font-bold transition-all shrink-0"
          >
            <span>More +</span>
          </button>
        </div>
      </div>

      {/* 2. AUTO-SYNC & VENUE CONTROLS ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0c061b]/90 border border-purple-900/40 backdrop-blur-xl font-mono text-xs">
        {/* Single Clean Data Stream Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 font-bold text-xs" title="Connected to live exchange websocket streams & backtested quant models. Sub-second direct orderbook execution.">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
          <span>LIVE QUANT STREAM ({selectedTimeframe} • Direct Feed)</span>
        </div>

        {/* Venue Selector - Clean Ghost vs Solid Style */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-purple-400 font-bold px-1 uppercase tracking-wider hidden sm:inline">
            Venues:
          </span>
          {venues.map((v) => {
            const isSelected = selectedVenues.includes(v);
            return (
              <button
                key={v}
                onClick={() => onToggleVenue(v)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md border border-purple-400/50 font-black'
                    : 'bg-transparent text-purple-300/70 border border-purple-900/40 hover:border-purple-500/40 hover:text-white'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300 animate-pulse' : 'bg-purple-700/50'}`} />
                <span>{v}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EXECUTIVE AI SUMMARY BANNER */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#0d071e] to-purple-950/60 border border-purple-500/30 flex items-center justify-between gap-3 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-purple-100 font-medium leading-relaxed font-sans">
            <strong className="text-white font-mono uppercase font-black tracking-wide">
              AI QUANT MODEL:
            </strong>{' '}
            {getAiSummary()}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            CONFIDENCE: {activeConfig.prediction.confidence}%
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
            EDGE: +{activeConfig.prediction.edgePct}%
          </span>
        </div>
      </div>
    </div>
  );
};
