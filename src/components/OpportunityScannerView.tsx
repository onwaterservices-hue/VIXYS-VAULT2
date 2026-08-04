import React, { useState, useEffect } from 'react';
import { Target, ArrowUpRight, ArrowDownRight, Zap, Sparkles, Filter, ChevronRight, ShieldAlert } from 'lucide-react';
import { fetchModelStatus, ModelStatusResponse } from '../services/api';

interface OpportunityScannerViewProps {
  onSelectAssetAndNavigate: (symbol: string) => void;
}

export const OpportunityScannerView: React.FC<OpportunityScannerViewProps> = ({
  onSelectAssetAndNavigate,
}) => {
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  useEffect(() => {
    fetchModelStatus('BTC', '15m')
      .then((res) => setModelStatus(res))
      .catch(() => setModelStatus(null));
  }, []);

  const isUncalibrated = !modelStatus?.hasActiveModel;

  const assets = [
    { rank: '🥇', symbol: 'BTC', name: 'Bitcoin', confidence: 95, edge: '+14.2%', harmony: '95%', bias: 'SIGNAL: YES', price: '$64,120.50', vol: 'HIGH' },
    { rank: '🥈', symbol: 'SOL', name: 'Solana', confidence: 92, edge: '+11.1%', harmony: '92%', bias: 'SIGNAL: YES', price: '$184.20', vol: 'VERY HIGH' },
    { rank: '🥉', symbol: 'ETH', name: 'Ethereum', confidence: 83, edge: '+8.4%', harmony: '83%', bias: 'SIGNAL: YES', price: '$3,420.50', vol: 'MODERATE' },
    { rank: '4️⃣', symbol: 'BNB', name: 'BNB Chain', confidence: 78, edge: '+6.2%', harmony: '78%', bias: 'SIGNAL: YES', price: '$582.10', vol: 'NORMAL' },
    { rank: '5️⃣', symbol: 'DOGE', name: 'Dogecoin', confidence: 74, edge: '+5.1%', harmony: '74%', bias: 'SIGNAL: NO', price: '$0.142', vol: 'HIGH' },
    { rank: '6️⃣', symbol: 'XRP', name: 'Ripple', confidence: 71, edge: '+4.2%', harmony: '71%', bias: 'SIGNAL: YES', price: '$0.584', vol: 'MODERATE' },
  ];

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">
            <Target className="w-4 h-4 text-purple-400" />
            <span>Cross-Asset Confluence Radar</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Opportunity Scanner</h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Multi-asset model scan ranked by expected value, feature confluence, and contract market liquidity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isUncalibrated && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/60 text-amber-300 font-mono text-xs font-bold border border-amber-500/40 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>UNCALIBRATED ({modelStatus?.settledCount || 0}/500) — HISTORICAL BACKTEST MODE</span>
            </div>
          )}
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/50 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            6 ASSETS MONITORED
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
        {assets.map((asset) => (
          <div
            key={asset.symbol}
            onClick={() => onSelectAssetAndNavigate(asset.symbol)}
            className="bg-[#070410] p-5 rounded-2xl border border-slate-800 hover:border-purple-500/60 cursor-pointer transition-all space-y-4 group shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{asset.rank}</span>
                <div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors flex items-center gap-2">
                    {asset.symbol}
                    {isUncalibrated && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                        DEMO BACKTEST
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-slate-400">{asset.name}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                Confluence {asset.harmony}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">
                  {isUncalibrated ? 'Backtest Conf.' : 'Confidence'}
                </span>
                <span className={`text-2xl font-black ${isUncalibrated ? 'text-amber-200' : 'text-white'}`}>
                  {isUncalibrated ? `${asset.confidence}%` : `${asset.confidence}%`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Expected Edge</span>
                <span className="text-2xl font-black text-emerald-400">{asset.edge}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Bias: <strong className="text-emerald-400">{asset.bias}</strong></span>
              <span className="text-purple-300 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                OPEN DESK <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
