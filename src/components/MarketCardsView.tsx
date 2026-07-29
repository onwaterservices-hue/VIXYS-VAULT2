import React from 'react';
import { Sparkles, TrendingUp, ArrowRight, Star, ShieldCheck, Zap } from 'lucide-react';
import { ASSET_DATABASE, AssetConfig } from '../data/assetData';

interface MarketCardsViewProps {
  onSelectAssetAndNavigate: (symbol: string) => void;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
}

export const MarketCardsView: React.FC<MarketCardsViewProps> = ({
  onSelectAssetAndNavigate,
  favorites,
  onToggleFavorite,
}) => {
  const assets = Object.values(ASSET_DATABASE);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#140a32] via-[#1f1145] to-[#140a32] border border-purple-500/20 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Prediction Markets Matrix</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Active Asset Market Intelligence</h1>
            <p className="text-xs text-purple-200/70">
              Select any asset to load instant AI prediction confidence, order book depth, and probability matrices.
            </p>
          </div>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => {
          const isFav = favorites.includes(asset.symbol);

          return (
            <div
              key={asset.symbol}
              className="p-6 rounded-3xl bg-[#0e0722]/90 border border-purple-500/20 hover:border-purple-500/60 shadow-xl hover:shadow-2xl hover:shadow-purple-900/30 backdrop-blur-xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between group"
            >
              {/* Top Row: Symbol, Name, Price & Favorite Star */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg"
                      style={{ backgroundColor: asset.color }}
                    >
                      {asset.symbol}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-purple-200 transition-colors">
                        {asset.name}
                      </h3>
                      <span className="text-xs font-mono text-purple-300/70">{asset.symbol}/USD</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFavorite(asset.symbol)}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-purple-900/40 text-purple-400 hover:text-amber-400 transition-all"
                    title={isFav ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Price & 24h Change */}
                <div className="flex items-baseline justify-between font-mono mb-6 pb-4 border-b border-purple-900/40">
                  <div className="text-2xl font-black text-white">${asset.price.toLocaleString()}</div>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    +{asset.change24h}% 24H
                  </div>
                </div>

                {/* AI Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-6 font-mono">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-900/30">
                    <div className="text-[10px] text-purple-300/60 font-bold uppercase flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      AI Confidence
                    </div>
                    <div className="text-xl font-black text-white">{asset.prediction.confidence}%</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-purple-900/30">
                    <div className="text-[10px] text-purple-300/60 font-bold uppercase flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      Edge vs Market
                    </div>
                    <div className="text-xl font-black text-emerald-400">+{asset.prediction.edgePct}%</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onSelectAssetAndNavigate(asset.symbol)}
                  className="w-full py-3 rounded-2xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-200 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>View Dashboard</span>
                </button>

                <button
                  onClick={() => onSelectAssetAndNavigate(asset.symbol)}
                  className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/40 hover:shadow-purple-500/60 transition-all flex items-center justify-center gap-1.5 group-hover:scale-[1.02]"
                >
                  <span>Trade {asset.symbol}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
