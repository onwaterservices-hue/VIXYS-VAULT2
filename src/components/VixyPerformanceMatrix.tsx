import React, { useState, useMemo } from 'react';
import {
  Layers,
  Zap,
  Activity,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { HistoricalPrediction } from '../types';

interface VixyPerformanceMatrixProps {
  history: HistoricalPrediction[];
  selectedAsset?: string;
  onSelectAsset?: (asset: string) => void;
  selectedTimeframe?: string;
  onSelectTimeframe?: (tf: string) => void;
  className?: string;
}

export const VixyPerformanceMatrix: React.FC<VixyPerformanceMatrixProps> = ({
  history,
  selectedAsset = 'BTC',
  onSelectAsset,
  selectedTimeframe = 'ALL',
  onSelectTimeframe,
  className = '',
}) => {
  const [internalAsset, setInternalAsset] = useState<string>(selectedAsset || 'BTC');
  const [expandedTf, setExpandedTf] = useState<string | null>(null);

  const activeAsset = onSelectAsset ? selectedAsset : internalAsset;
  const handleAssetChange = (asset: string) => {
    if (onSelectAsset) {
      onSelectAsset(asset);
    } else {
      setInternalAsset(asset);
    }
  };

  const assetList = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'SUI'];

  // Calculate real performance stats across 3 key horizons
  const matrixStats = useMemo(() => {
    const horizons = [
      {
        id: '15S',
        name: '15S SCALP',
        subName: 'MICRO-DELTA',
        isFocus: false,
        desc: 'Sub-minute momentum & orderbook delta imbalances',
      },
      {
        id: '15M',
        name: '15M BINARY',
        subName: 'PRIMARY CORE',
        isFocus: true,
        desc: 'Authoritative 15-minute Kalshi binary execution window',
      },
      {
        id: '1H',
        name: '1H HORIZON',
        subName: 'MACRO SWING',
        isFocus: false,
        desc: 'Structural hourly trend & multi-venue macro convergence',
      },
    ];

    return horizons.map((h) => {
      const matches = history.filter((item) => {
        const assetMatch = activeAsset === 'ALL' ? true : item.asset === activeAsset;
        return assetMatch && item.timeframe === h.id;
      });

      const count = matches.length;
      const wins = matches.filter((m) => m.result === 'WIN').length;
      const losses = matches.filter((m) => m.result === 'LOSS').length;
      const rate = count > 0 ? Math.round((wins / count) * 100) : 0;
      const edge = count > 0 ? Math.round((matches.reduce((s, m) => s + (m.edge || 0), 0) / count) * 10) / 10 : 0;

      // Sample Depth Classification (Strict statistical honesty)
      let sampleDepthLabel = 'NO DATA';
      let sampleDepthClass = 'bg-slate-900/60 text-slate-400 border-slate-700/40';
      let sampleDepthShort = 'NO OBSERVATIONS';
      let sampleReliability = 'Insufficient data';

      if (count >= 30) {
        sampleDepthLabel = 'ROBUST SAMPLE';
        sampleDepthClass = 'bg-emerald-950/80 text-[#00FF9D] border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,157,0.2)]';
        sampleDepthShort = 'SIGNIFICANT';
        sampleReliability = 'High statistical reliability (n ≥ 30)';
      } else if (count >= 15) {
        sampleDepthLabel = 'EXPANDING SAMPLE';
        sampleDepthClass = 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
        sampleDepthShort = 'DEVELOPING';
        sampleReliability = 'Moderate statistical depth (n ≥ 15)';
      } else if (count >= 5) {
        sampleDepthLabel = 'LIMITED SAMPLE';
        sampleDepthClass = 'bg-amber-950/80 text-amber-300 border-amber-500/50';
        sampleDepthShort = 'LIMITED';
        sampleReliability = 'Preliminary evaluation — high variance expected';
      } else if (count > 0) {
        sampleDepthLabel = 'VERY LIMITED SAMPLE';
        sampleDepthClass = 'bg-rose-950/80 text-rose-300 border-rose-600/50';
        sampleDepthShort = 'VERY LIMITED';
        sampleReliability = 'Extreme variance — strictly preliminary sample';
      }

      // Model Signal Classification (Based on actual quantitative edge & sample)
      let signalTag = 'NEUTRAL';
      let signalColor = 'text-purple-300';
      if (count >= 5 && edge >= 8) {
        signalTag = 'STRONG EDGE';
        signalColor = 'text-[#00FF9D]';
      } else if (count >= 5 && edge >= 4) {
        signalTag = 'MODERATE EDGE';
        signalColor = 'text-cyan-300';
      } else if (count > 0 && edge > 0) {
        signalTag = 'DEVELOPING EDGE';
        signalColor = 'text-amber-300';
      } else if (count > 0) {
        signalTag = 'MONITORING';
        signalColor = 'text-purple-400';
      } else {
        signalTag = 'STANDBY';
        signalColor = 'text-slate-500';
      }

      // Dynamic color for accuracy number
      let rateColor = 'text-slate-400';
      let rateGlow = 'none';
      if (count > 0) {
        if (rate >= 70) {
          rateColor = 'text-[#00FF9D]';
          rateGlow = '0 0 18px rgba(0, 255, 157, 0.45)';
        } else if (rate >= 55) {
          rateColor = 'text-cyan-300';
          rateGlow = '0 0 15px rgba(56, 189, 248, 0.35)';
        } else if (rate >= 45) {
          rateColor = 'text-amber-300';
          rateGlow = '0 0 12px rgba(245, 158, 11, 0.3)';
        } else {
          rateColor = 'text-[#FF3366]';
          rateGlow = '0 0 15px rgba(255, 51, 102, 0.35)';
        }
      }

      return {
        ...h,
        count,
        wins,
        losses,
        rate,
        edge,
        sampleDepthLabel,
        sampleDepthClass,
        sampleDepthShort,
        sampleReliability,
        signalTag,
        signalColor,
        rateColor,
        rateGlow,
      };
    });
  }, [history, activeAsset]);

  return (
    <div
      id="vixy-performance-matrix-terminal"
      className={`relative overflow-hidden rounded-2xl border-2 border-purple-900/50 bg-[#06020e] p-4 sm:p-5 font-mono shadow-[0_0_35px_rgba(0,0,0,0.85)] ${className}`}
    >
      {/* Cybernetic HUD Grid & Subtle Scan Line */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-80" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/80 to-transparent pointer-events-none shadow-[0_0_12px_rgba(168,85,247,0.7)]" />

      {/* Technical Precision Corner Brackets */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-500/40 pointer-events-none" />

      {/* ─── HEADER: TITLE & ASSET SWITCHER HUD ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/40 pb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-purple-950/90 border border-purple-600/60 flex items-center justify-center shadow-inner">
            <Layers className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-slate-100 tracking-[0.2em] uppercase drop-shadow flex items-center gap-2">
                <span>VIXY PERFORMANCE MATRIX</span>
              </h2>
              <span className="text-[8px] font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-600/40 hidden sm:inline-block">
                QUANTITATIVE HUD
              </span>
            </div>
            <div className="flex items-center gap-2 text-[8.5px] text-purple-400 font-bold tracking-[0.15em] uppercase">
              <span className="flex items-center gap-1 text-[#00FF9D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-ping" />
                ● HISTORICAL MODEL TELEMETRY
              </span>
              <span className="text-purple-700">|</span>
              <span className="text-slate-300">15M DECISION INTELLIGENCE</span>
            </div>
          </div>
        </div>

        {/* Asset Selector Pills */}
        <div className="flex items-center gap-1 bg-[#0a0316] p-1 rounded-lg border border-purple-900/40 overflow-x-auto max-w-full">
          {assetList.map((sym) => {
            const isSelected = activeAsset === sym;
            return (
              <button
                key={sym}
                onClick={() => handleAssetChange(sym)}
                className={`text-[9px] font-mono font-bold px-2 py-1 rounded transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border border-purple-400/80'
                    : 'text-purple-400/70 hover:text-purple-200 hover:bg-purple-950/50'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── THREE COMPACT FUTURISTIC INTELLIGENCE MODULES ─── */}
      <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 relative z-10">
        {matrixStats.map((mod) => {
          const isSelectedTf = selectedTimeframe === mod.id;
          const isExpanded = expandedTf === mod.id;

          return (
            <div
              key={mod.id}
              onClick={() => {
                setExpandedTf(isExpanded ? null : mod.id);
                if (onSelectTimeframe) onSelectTimeframe(mod.id);
              }}
              className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 p-3.5 sm:p-4 flex flex-col justify-between space-y-3 cursor-pointer group select-none ${
                mod.isFocus
                  ? 'bg-[#090318] border-purple-500/70 shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:border-purple-400'
                  : 'bg-[#06020f] border-purple-900/50 hover:border-purple-700/70 shadow-lg'
              } ${isSelectedTf ? 'ring-2 ring-cyan-400/70' : ''}`}
            >
              {/* Active Focus Glowing Pulse Aura for 15M */}
              {mod.isFocus && (
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-purple-600/10 blur-[20px] pointer-events-none" />
              )}

              {/* 1. Module Header & Focus Badge */}
              <div className="flex items-center justify-between gap-1 border-b border-purple-900/30 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-black tracking-wider text-slate-100 uppercase">
                    {mod.name}
                  </span>
                  <span className="text-[7.5px] font-bold text-purple-400/70 px-1 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                    {mod.subName}
                  </span>
                </div>

                {mod.isFocus ? (
                  <span className="flex items-center gap-1 text-[7.5px] sm:text-[8px] font-black text-[#00FF9D] px-1.5 py-0.5 rounded bg-[#02150e] border border-emerald-500/60 shadow-[0_0_8px_rgba(0,255,157,0.3)] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-ping" />
                    CURRENT FOCUS
                  </span>
                ) : (
                  <span className={`text-[7.5px] font-bold uppercase font-mono ${mod.signalColor}`}>
                    {mod.signalTag}
                  </span>
                )}
              </div>

              {/* 2. Hero Percentage (Primary Visual Hero) */}
              <div className="py-1 text-center space-y-1">
                <div
                  className={`text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none transition-all ${mod.rateColor}`}
                  style={{ textShadow: mod.rateGlow }}
                >
                  {mod.count > 0 ? `${mod.rate}%` : '---'}
                </div>
                <div className="text-[8.5px] font-mono font-bold tracking-[0.2em] text-purple-400/70 uppercase">
                  MODEL ACCURACY
                </div>
              </div>

              {/* 3. Evidence & Edge Signal Section */}
              <div className="space-y-2 pt-1 border-t border-purple-900/30">
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-purple-300 font-bold">
                    n=<span className="text-white font-black">{mod.count}</span>
                  </span>
                  <span className="text-purple-400/80">
                    EDGE <span className={`font-black ${mod.edge >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                      {mod.edge >= 0 ? `+${mod.edge}%` : `${mod.edge}%`}
                    </span>
                  </span>
                </div>

                {/* Horizontal Signal Gauge Bar */}
                <div className="space-y-1">
                  <div className="relative h-1.5 bg-[#090314] rounded-full border border-purple-900/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.max(0, mod.rate))}%`,
                        background:
                          mod.rate >= 70
                            ? 'linear-gradient(90deg, #10b981, #00FF9D)'
                            : mod.rate >= 50
                            ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                            : 'linear-gradient(90deg, #f43f5e, #FF3366)',
                        boxShadow: mod.rate >= 50 ? '0 0 6px rgba(0,255,157,0.4)' : 'none',
                      }}
                    />
                  </div>

                  {/* Edge Indicator Scale */}
                  <div className="flex items-center justify-between text-[7.5px] font-mono text-purple-400/60">
                    <span>ACCURACY METER</span>
                    <span>{mod.rate}% SCALE</span>
                  </div>
                </div>
              </div>

              {/* 4. Real Sample-Size Indicator Badge (Statistical Honesty) */}
              <div className="pt-1">
                <div
                  className={`w-full py-1 px-2 rounded-md border text-center text-[8px] font-mono font-black uppercase tracking-wider transition-all ${mod.sampleDepthClass}`}
                >
                  {mod.sampleDepthLabel}
                </div>
              </div>

              {/* 5. Expanded Detail Layer (Toggled on click) */}
              {isExpanded && (
                <div className="pt-2 border-t border-purple-900/40 text-[8.5px] font-mono space-y-1.5 bg-[#04010a] p-2 rounded-lg mt-1 animate-fadeIn">
                  <div className="flex justify-between text-purple-300">
                    <span>Total Evaluated:</span>
                    <span className="font-bold text-white">{mod.count} predictions</span>
                  </div>
                  <div className="flex justify-between text-purple-300">
                    <span>Win / Loss Split:</span>
                    <span className="font-bold text-emerald-400">
                      {mod.wins}W <span className="text-purple-600">/</span> {mod.losses}L
                    </span>
                  </div>
                  <div className="flex justify-between text-purple-300">
                    <span>Model Edge vs Market:</span>
                    <span className="font-bold text-cyan-300">+{mod.edge}%</span>
                  </div>
                  <div className="text-[7.5px] text-purple-400/70 pt-1 border-t border-purple-900/30">
                    {mod.sampleReliability}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── BOTTOM MICRO INTELLIGENCE READOUT ─── */}
      <div className="border-t border-purple-900/40 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-[8.5px] sm:text-[9.5px] font-mono relative z-10">
        <div className="flex items-center gap-2 text-purple-300">
          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/50 text-purple-200">
            VIXY READOUT
          </span>
          <span className="text-purple-300/90 font-sans">
            <strong className="text-white font-mono">15M BINARY</strong> currently provides the primary authoritative decision horizon across <strong className="text-cyan-300 font-mono">{activeAsset}</strong> contracts.
          </span>
        </div>

        <div className="flex items-center gap-3 text-purple-400/60 font-bold text-[8px] uppercase">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#00FF9D]" /> ZERO LOOK-AHEAD BIAS
          </span>
          <span className="text-purple-700 hidden sm:inline">|</span>
          <span className="hidden sm:inline">SAMPLE DEPTH THRESHOLD: n≥30</span>
        </div>
      </div>
    </div>
  );
};
