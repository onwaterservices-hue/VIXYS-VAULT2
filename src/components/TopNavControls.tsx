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
                className={`relative group flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 border select-none shrink-0 ${
                  isSelected
                    ? 'bg-slate-800 border-slate-700 text-white shadow-sm font-bold'
                    : 'bg-[#0e121a] hover:bg-slate-800/60 border-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {/* Logo Badge */}
                <div
                  className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] text-white shrink-0"
                  style={{ backgroundColor: asset.color }}
                >
                  {asset.symbol.slice(0, 3)}
                </div>

                {/* Name & Price */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{asset.symbol}</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {asset.change24h >= 0 ? '+' : ''}
                    {asset.change24h.toFixed(2)}%
                  </span>
                </div>

                {/* Star Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(asset.symbol);
                  }}
                  className="p-1 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                  title={isFav ? `Remove ${asset.symbol} from favorites` : `Add ${asset.symbol} to favorites`}
                >
                  <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500 hover:text-amber-400'}`} />
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0e121a] border border-slate-800/80 font-mono text-xs">
        {/* Single Clean Data Stream Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-sans text-[11px]">QUANT STREAM ({selectedTimeframe} • Direct Feed)</span>
        </div>

        {/* Venue Selector - Clean Ghost vs Solid Style */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-slate-500 font-bold px-1 uppercase tracking-wider hidden sm:inline">
            Venues:
          </span>
          {venues.map((v) => {
            const isDisabled = v === 'DraftKings';
            const isSelected = selectedVenues.includes(v) && !isDisabled;
            return (
              <button
                key={v}
                onClick={() => !isDisabled && onToggleVenue(v)}
                disabled={isDisabled}
                className={`px-2.5 py-1 rounded font-bold text-xs font-sans transition-all flex items-center gap-1.5 ${
                  isDisabled
                    ? 'bg-slate-900/40 text-slate-600 border border-slate-900 cursor-not-allowed'
                    : isSelected
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-transparent text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-slate-700' : isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span>{isDisabled ? 'DraftKings (Soon)' : v}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EXECUTIVE SUMMARY BANNER */}
      <div className="p-3 rounded-lg bg-[#0e121a] border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-300 font-sans leading-relaxed">
            <strong className="text-white font-mono uppercase text-[11px] font-bold tracking-wider">
              QUANT MODEL:
            </strong>{' '}
            {getAiSummary()}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800/50">
            CONFIDENCE: {activeConfig.prediction.confidence}%
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-bold border border-slate-800">
            EDGE: +{activeConfig.prediction.edgePct}%
          </span>
        </div>
      </div>
    </div>
  );
};
