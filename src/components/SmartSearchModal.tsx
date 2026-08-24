import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Sparkles, Sliders, Shield, Zap, ArrowRight } from 'lucide-react';
import { ASSET_DATABASE, AssetConfig } from '../data/assetData';
import { resolveCanonicalAsset } from '../services/market/cryptoUniverseRegistry';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (symbol: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const SmartSearchModal: React.FC<SmartSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const assets = Object.values(ASSET_DATABASE);
  const qLower = query.toLowerCase().trim();
  const filteredAssets = assets.filter((a) => {
    if (!qLower) return true;
    if (a.symbol.toLowerCase().includes(qLower)) return true;
    if (a.name.toLowerCase().includes(qLower)) return true;
    const canonical = resolveCanonicalAsset(a.symbol);
    if (canonical.assetId.includes(qLower)) return true;
    if (canonical.exchangeSymbols.some(s => s.toLowerCase().includes(qLower))) return true;
    return false;
  });

  const navigationItems = [
    { label: 'Live Dashboard', tab: 'terminal', icon: Zap },
    { label: 'Market Selector Cards', tab: 'markets', icon: TrendingUp },
    { label: 'Compare Mode (Split Screen)', tab: 'compare', icon: Sliders },
    { label: 'AI Pattern Engine', tab: 'patterns', icon: Sparkles },
    { label: 'Trade Journal', tab: 'journal', icon: Shield },
    { label: 'Alert Settings', tab: 'alerts', icon: Shield },
    { label: 'Pricing & Plans', tab: 'pricing', icon: Sparkles },
  ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-[#0d071d]/95 rounded-3xl border border-purple-500/20 shadow-2xl shadow-purple-950/80 overflow-hidden flex flex-col font-sans">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-purple-900/40 bg-[#120a28]/60">
          <Search className="w-5 h-5 text-purple-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets, markets, contracts, signals, settings... (e.g. 'BTC', 'Compare')"
            autoFocus
            className="w-full bg-transparent text-white placeholder-purple-300/40 focus:outline-none text-sm font-medium"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-purple-900/40 text-purple-400 hover:text-white transition-all ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Crypto Assets */}
          {filteredAssets.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider mb-2 px-1">
                Crypto Assets ({filteredAssets.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      onSelectAsset(asset.symbol);
                      onNavigateTab('terminal');
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-purple-900/30 border border-purple-900/30 hover:border-purple-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white"
                        style={{ backgroundColor: asset.color }}
                      >
                        {asset.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {asset.symbol}
                          <span className="text-xs text-purple-300/60 font-normal">
                            {asset.name}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-purple-200/90">
                          ${asset.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        {asset.prediction.confidence}% AI
                      </div>
                      <span className="text-[10px] text-purple-300/60 font-mono">
                        +{asset.prediction.edgePct}% Edge
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Views */}
          {navigationItems.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider mb-2 px-1">
                Quick Navigation
              </div>
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => {
                        onNavigateTab(item.tab);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-900/30 border border-transparent hover:border-purple-500/30 text-xs font-semibold text-purple-100 hover:text-white transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComp className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                        <span>{item.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[#090415] border-t border-purple-900/40 text-[11px] font-mono text-purple-300/60 flex items-center justify-between">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-purple-900/50 text-white text-[10px]">ESC</kbd> to exit</span>
          <span>VIXY AI Search v3.0</span>
        </div>
      </div>
    </div>
  );
};
