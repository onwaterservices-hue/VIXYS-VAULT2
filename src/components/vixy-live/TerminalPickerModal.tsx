import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Globe,
  Activity,
  Minimize2,
  PlusCircle,
  X,
  Check,
  LayoutGrid,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  Clock
} from 'lucide-react';
import { DEFAULT_WORKSPACES } from '../../services/workspaceService';

export interface TerminalPresetOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  modules: string[];
}

export const PRESET_OPTIONS: TerminalPresetOption[] = [
  {
    id: 'ws_vixy_core',
    name: 'VIXY CORE',
    badge: 'FLAGSHIP',
    description: 'Core engine lock status, directional bias, chart, order flow & protection shield.',
    icon: Sparkles,
    color: 'from-purple-900/60 to-indigo-950/80',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    modules: [
      'VIXY BIAS',
      'CONFIDENCE',
      'LOCK STATUS',
      'BTC CHART',
      'MOMENTUM',
      'ORDER FLOW',
      'PROTECTION'
    ]
  },
  {
    id: 'ws_btc_scalp',
    name: 'BTC SCALP',
    badge: 'HIGH FREQUENCY',
    description: 'Spot price, high-res chart, taker flow momentum, volatility & whale orderbook sweeps.',
    icon: Zap,
    color: 'from-amber-950/60 to-slate-950/80',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    modules: [
      'BTC PRICE',
      'BTC CHART',
      'MOMENTUM',
      'ORDER FLOW',
      'VOLUME',
      'VOLATILITY',
      'WHALE FLOW'
    ]
  },
  {
    id: 'ws_15m_prediction',
    name: '15M PREDICTION',
    badge: 'PREDICTION VENUE',
    description: 'VIXY bias, 15m cycle clock, Kalshi & Polymarket odds, cross-venue sync & guardian.',
    icon: Globe,
    color: 'from-cyan-950/60 to-slate-950/80',
    borderColor: 'border-cyan-500/50 hover:border-cyan-400',
    modules: [
      'VIXY BIAS',
      'CYCLE COUNTDOWN',
      'LOCK QUALITY',
      'BTC CHART',
      'KALSHI',
      'POLYMARKET',
      'CROSS-VENUE',
      'PROTECTION'
    ]
  },
  {
    id: 'ws_market_watch',
    name: 'MARKET WATCH',
    badge: 'MULTI-ASSET',
    description: 'BTC, ETH & SOL tickers, market structure regime, sentiment analysis & news feed.',
    icon: Activity,
    color: 'from-emerald-950/60 to-slate-950/80',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    modules: [
      'BTC',
      'ETH',
      'SOL',
      'MARKET REGIME',
      'SENTIMENT',
      'NEWS',
      'WHALE FLOW'
    ]
  },
  {
    id: 'ws_minimal',
    name: 'MINIMAL',
    badge: 'LIGHTWEIGHT',
    description: 'Clean high-level view showing directional bias, confidence, spot price & cycle clock.',
    icon: Minimize2,
    color: 'from-slate-900/80 to-slate-950/90',
    borderColor: 'border-slate-700/60 hover:border-slate-400',
    modules: [
      'VIXY BIAS',
      'CONFIDENCE',
      'BTC PRICE',
      'CYCLE COUNTDOWN'
    ]
  }
];

interface TerminalPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onBuildFromScratch: () => void;
  currentActiveId?: string;
}

export const TerminalPickerModal: React.FC<TerminalPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  onBuildFromScratch,
  currentActiveId
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl rounded-3xl bg-[#0a0d14] border border-purple-500/30 p-6 sm:p-8 shadow-2xl my-8 font-sans"
        >
          {/* Close Button if user wants to keep current terminal */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 text-xs font-mono font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>VIXY LIVE — WORKSHOP BENCH</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-sans">
              CHOOSE YOUR TERMINAL
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-sans leading-relaxed">
              Select a professional workspace preset tailored to your trading style. All presets use the same authoritative VIXY engine data.
            </p>
          </div>

          {/* Preset Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {PRESET_OPTIONS.map((preset) => {
              const IconComp = preset.icon;
              const isSelected = currentActiveId === preset.id;

              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`group relative p-5 rounded-2xl bg-gradient-to-b ${preset.color} border ${preset.borderColor} transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xl hover:shadow-2xl hover:-translate-y-0.5 ${
                    isSelected ? 'ring-2 ring-purple-400 border-purple-400' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/50 text-purple-300 group-hover:text-purple-200">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                          {preset.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-purple-300 transition-colors font-sans">
                        {preset.name}
                      </h3>
                      <p className="text-[11.5px] text-slate-400 mt-1 font-sans leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    {/* Included Modules Tag List */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] font-mono font-semibold text-slate-500 uppercase mb-1.5">
                        INCLUDED MODULES:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {preset.modules.map((modName, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-[#07090f] text-slate-300 border border-slate-800 text-[10px] font-mono font-bold"
                          >
                            {modName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-purple-300 group-hover:text-white transition-colors">
                    <span>LAUNCH PRESET</span>
                    <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              );
            })}

            {/* BUILD FROM SCRATCH CARD */}
            <div
              onClick={onBuildFromScratch}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-purple-950/30 to-slate-950/90 border border-dashed border-purple-500/40 hover:border-purple-400 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-900/40 border border-purple-700/50 text-purple-300 group-hover:text-purple-200">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                    CUSTOM BENCH
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase group-hover:text-purple-300 transition-colors font-sans">
                    BUILD FROM SCRATCH
                  </h3>
                  <p className="text-[11.5px] text-slate-400 mt-1 font-sans leading-snug">
                    Start with a clean slate. Custom assemble your personal module layout from our complete module registry.
                  </p>
                </div>

                <div className="pt-2 border-t border-purple-900/40">
                  <div className="text-[10px] font-mono font-semibold text-purple-400/80 uppercase mb-1">
                    COMPLETE FLEXIBILITY
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans italic">
                    Add, remove, resize, and position any module freely.
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-purple-300 group-hover:text-white transition-colors">
                <span>START BLANK CANVAS</span>
                <span className="text-purple-400 group-hover:translate-x-1 transition-transform">+</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2 text-[11px] text-slate-500 font-sans">
            Presets only configure visual layout cards. Authoritative calculations & model logic remain 100% unified.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
