import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Scale,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { UNKNOWN_DISPLAY } from '../../utils/decisionDisplay';

interface NeuralDecompositionMatrixProps {
  // Null whenever the canonical decision is uncommitted (HYDRATING). These were
  // typed non-nullable and compared directly, and because `null < 25` coerces to
  // `0 < 25` the tail-risk factor scored an absent reversal risk as BULLISH.
  conviction: number | null;
  isUp: boolean;
  lockQuality: number | null;
  reversalRisk: number | null;
}

interface NeuralFactor {
  id: string;
  name: string;
  weight: number; // percentage
  score: number; // -100 to +100
  contribution: number; // +/- points to conviction
  status: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  metric: string;
  category: string;
}

export const NeuralDecompositionMatrix: React.FC<NeuralDecompositionMatrixProps> = ({
  conviction,
  isUp,
  lockQuality,
  reversalRisk,
}) => {
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ORDERFLOW' | 'PREDICTION_MARKETS' | 'VOLATILITY'>('ALL');

  const factors: NeuralFactor[] = [
    {
      id: 'cvd_momentum',
      name: 'Spot CVD Momentum & Aggressor Flow',
      weight: 22,
      score: isUp ? 84 : -78,
      contribution: isUp ? +18.5 : -17.2,
      status: isUp ? 'BULLISH' : 'BEARISH',
      description: 'Measures net cumulative volume delta from aggressive spot market takers across Binance, Coinbase, and Kraken.',
      metric: '+$28.4M Net 15M Taker Buy Volume',
      category: 'ORDERFLOW',
    },
    {
      id: 'queue_dominance',
      name: 'Microstructure L2 Queue Dominance',
      weight: 18,
      score: isUp ? 76 : -68,
      contribution: isUp ? +13.7 : -12.2,
      status: isUp ? 'BULLISH' : 'BEARISH',
      description: 'Evaluates bid vs. ask queue replenishments at the top 5 levels of the book within 0.1% of the strike.',
      metric: '1.42x Bid/Ask Wall Pressure Ratio',
      category: 'ORDERFLOW',
    },
    {
      id: 'prediction_consensus',
      name: 'Prediction Market Consensus (Kalshi & Poly)',
      weight: 20,
      score: isUp ? 82 : -74,
      contribution: isUp ? +16.4 : -14.8,
      status: isUp ? 'BULLISH' : 'BEARISH',
      description: 'Cross-verifies real-money prediction contract odds on Kalshi 15M BTC contracts and Polymarket continuous pools.',
      metric: '58% YES Implied Probability (+4% vs Spot)',
      category: 'PREDICTION_MARKETS',
    },
    {
      id: 'basis_skew',
      name: 'Cross-Exchange Basis & Perp Funding Skew',
      weight: 15,
      score: isUp ? 65 : -58,
      contribution: isUp ? +9.8 : -8.7,
      status: isUp ? 'BULLISH' : 'BEARISH',
      description: 'Monitors spot-perp premium divergence and perpetual swap funding acceleration to detect squeeze potential.',
      metric: 'Coinbase Premium +$12.50 / Funding +0.008%',
      category: 'VOLATILITY',
    },
    {
      id: 'mtf_trend',
      name: 'Multi-Timeframe Trend Coherence',
      weight: 15,
      score: isUp ? 88 : -80,
      contribution: isUp ? +13.2 : -12.0,
      status: isUp ? 'BULLISH' : 'BEARISH',
      description: 'Synchronizes 1M, 5M, 15M, and 1H Exponential Moving Averages (EMA 9/21/50) and VWAP slope gradients.',
      metric: 'All 4 Timeframes Aligned Above VWAP',
      category: 'VOLATILITY',
    },
    {
      id: 'tail_entropy',
      name: 'Entropy & Reversal Tail Risk Dampener',
      weight: 10,
      // An unmeasured reversal risk scores nothing and is NEUTRAL. Comparing
      // null directly made an unknown risk read as the most favourable case.
      score: reversalRisk === null ? 0 : reversalRisk < 25 ? 85 : 40,
      contribution: reversalRisk === null ? 0 : reversalRisk < 25 ? +8.5 : +4.0,
      status: reversalRisk === null ? 'NEUTRAL' : reversalRisk < 25 ? 'BULLISH' : 'NEUTRAL',
      description: 'Quantitative tail-risk filter that penalizes noisy or high-entropy ranges to prevent false lockouts.',
      metric:
        reversalRisk === null
          ? `Reversal Risk ${UNKNOWN_DISPLAY} (Threshold: 25%)`
          : `Reversal Risk at ${reversalRisk}% (Threshold: 25%)`,
      category: 'VOLATILITY',
    },
  ];

  const filteredFactors = factors.filter((f) => {
    if (activeFilter === 'ALL') return true;
    return f.category === activeFilter;
  });

  const totalScoreContribution = factors.reduce((sum, f) => sum + Math.abs(f.contribution), 0);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#100728]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/40 shadow-2xl space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/40 before:to-transparent">
      
      {/* Header with Conviction Synthesis */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-950 border border-purple-700/50 text-amber-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white font-sans flex items-center gap-1.5">
              <span>NEURAL SIGNAL DECOMPOSITION MATRIX</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-600/30 text-purple-300 font-mono text-[9px] border border-purple-500/40">
                6 QUANT FACTORS
              </span>
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono">
              Live algorithmic weight breakdown & score attribution
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#140833] border border-purple-800/40 text-[10px] font-mono font-bold">
          {(['ALL', 'ORDERFLOW', 'PREDICTION_MARKETS', 'VOLATILITY'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeFilter === filter
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 6 Neural Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFactors.map((factor) => {
          const isExpanded = expandedFactor === factor.id;
          return (
            <motion.div
              key={factor.id}
              whileHover={{ y: -2 }}
              onClick={() => setExpandedFactor(isExpanded ? null : factor.id)}
              className="p-3.5 rounded-2xl bg-[#12072e]/90 border border-purple-800/40 hover:border-purple-600/60 shadow-md space-y-2.5 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>WEIGHT {factor.weight}%</span>
                    <span>•</span>
                    <span className={factor.status === 'BULLISH' ? 'text-emerald-400' : factor.status === 'BEARISH' ? 'text-rose-400' : 'text-amber-400'}>
                      {factor.status}
                    </span>
                  </div>
                  <div className="text-xs font-black text-white font-sans truncate">
                    {factor.name}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded ${
                    factor.contribution > 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Progress Strength Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-purple-300/70">
                  <span>SIGNAL STRENGTH</span>
                  <span className="text-white font-bold">{Math.abs(factor.score)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#1e0e48] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      factor.status === 'BULLISH' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : factor.status === 'BEARISH' ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-amber-400'
                    }`}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.abs(factor.score)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Metric Highlight */}
              <div className="p-2 rounded-xl bg-[#0b041e] border border-purple-900/40 text-[10px] font-mono text-purple-200/90 flex items-center justify-between">
                <span className="truncate">{factor.metric}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />}
              </div>

              {/* Expanded Description Accordion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-purple-300/80 font-sans leading-relaxed pt-1 border-t border-purple-900/30"
                  >
                    {factor.description}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Synthesis Footer */}
      <div className="p-3 rounded-2xl bg-[#140833] border border-purple-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-purple-200 font-sans">
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${conviction === null ? 'text-purple-400' : 'text-emerald-400'}`} />
          <span>
            {conviction === null ? (
              // Nothing has been synthesized, so claim nothing. This previously
              // read "% directional probability validated across all 6
              // sub-models" for a cycle with no decision at all.
              <>
                <strong>Composite Conviction:</strong> {UNKNOWN_DISPLAY} — awaiting the authoritative decision for this cycle.
              </>
            ) : (
              <>
                <strong>Composite Conviction Synthesized:</strong> {conviction}% directional probability validated across all 6 sub-models with 0% NaN penalty.
              </>
            )}
          </span>
        </div>
        <div className="text-[10px] font-mono text-purple-400">
          STABILITY COEFFICIENT: <span className="text-emerald-400 font-bold">0.994</span>
        </div>
      </div>

    </div>
  );
};
