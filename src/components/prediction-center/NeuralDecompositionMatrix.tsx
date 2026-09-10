import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import type { EvidenceVectorItem } from '../../utils/evidenceVectors';

// Every card below is one of the engine's evidence families with the score
// and note the engine reported for this cycle. Nothing is weighted, attributed
// or synthesised here: the earlier version of this panel carried invented
// weights, "+18.5 pts" contributions, a "$28.4M" metric and a "0.994 stability
// coefficient" that no calculation produced.

interface NeuralDecompositionMatrixProps {
  vectors: EvidenceVectorItem[];
  alignedCount: number;
  totalValidCount: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  engineScore: number | null;
}

type FamilyCategory = 'TREND' | 'ORDERFLOW' | 'PREDICTION_MARKETS' | 'VOLATILITY';

const FAMILY_CATEGORY: Record<EvidenceVectorItem['name'], FamilyCategory> = {
  Momentum: 'TREND',
  Trend: 'TREND',
  'Order Flow': 'ORDERFLOW',
  Volume: 'ORDERFLOW',
  Sentiment: 'PREDICTION_MARKETS',
  Volatility: 'VOLATILITY',
};

// What each family's score is built from, as the engine computes it. The
// score itself and the note under it come from the engine on every tick.
const FAMILY_DESCRIPTION: Record<EvidenceVectorItem['name'], string> = {
  Momentum: 'Multi-timeframe momentum votes (15s → 15m) and RSI trajectory inside this cycle. ALIGNED means the family votes with the current bias; the note is the engine\'s own reading.',
  Trend: 'Price structure against VWAP and the EMA stack for this cycle. The note reports the displacement the engine measured.',
  'Order Flow': 'Taker buy vs sell ratio from the live tape. The note is the measured ratio; it is not a dollar figure.',
  Volume: 'Expected-move coverage: realised move versus the distance to the strike for the time left. The note shows the coverage multiple.',
  Sentiment: 'Kalshi\'s implied price for this cycle\'s contract when a recent read exists. There is no direct Polymarket 15M feed.',
  Volatility: 'Realised-volatility regime for the 15-minute horizon. High regimes reduce confidence rather than adding to it.',
};

const STATUS_STYLE: Record<EvidenceVectorItem['status'], { pill: string; bar: string; label: string }> = {
  ALIGNED: { pill: 'text-emerald-400', bar: 'bg-emerald-400 shadow-[0_0_6px_#10b981]', label: 'ALIGNED' },
  DIVERGENT: { pill: 'text-rose-400', bar: 'bg-rose-500 shadow-[0_0_6px_#f43f5e]', label: 'DIVERGENT' },
  NEUTRAL: { pill: 'text-amber-400', bar: 'bg-amber-400', label: 'NEUTRAL' },
  STALE: { pill: 'text-slate-500', bar: 'bg-slate-700', label: 'STALE' },
  UNAVAILABLE: { pill: 'text-slate-500', bar: 'bg-slate-700', label: 'UNAVAILABLE' },
};

export const NeuralDecompositionMatrix: React.FC<NeuralDecompositionMatrixProps> = ({
  vectors,
  alignedCount,
  totalValidCount,
  direction,
  engineScore,
}) => {
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | FamilyCategory>('ALL');

  const filtered = vectors.filter((v) => activeFilter === 'ALL' || FAMILY_CATEGORY[v.name] === activeFilter);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#100728]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/40 shadow-2xl space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-purple-400/40 before:to-transparent">

      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-950 border border-purple-700/50 text-amber-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white font-sans flex items-center gap-1.5">
              <span>EVIDENCE FAMILY MATRIX</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-600/30 text-purple-300 font-mono text-[9px] border border-purple-500/40">
                {vectors.length} FAMILIES
              </span>
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono">
              Live family scores from the engine · no weights or point attributions are claimed
            </div>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-[#140833] border border-purple-800/40 text-[10px] font-mono font-bold">
          {(['ALL', 'TREND', 'ORDERFLOW', 'PREDICTION_MARKETS', 'VOLATILITY'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeFilter === filter ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300 hover:text-white'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((family) => {
          const isExpanded = expandedFamily === family.name;
          const style = STATUS_STYLE[family.status] ?? STATUS_STYLE.UNAVAILABLE;
          const hasScore = typeof family.score === 'number' && !family.isStaleOrMissing;
          return (
            <motion.div
              key={family.name}
              whileHover={{ y: -2 }}
              onClick={() => setExpandedFamily(isExpanded ? null : family.name)}
              className="p-3.5 rounded-2xl bg-[#12072e]/90 border border-purple-800/40 hover:border-purple-600/60 shadow-md space-y-2.5 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>{FAMILY_CATEGORY[family.name].replace('_', ' ')}</span>
                    <span>•</span>
                    <span className={style.pill}>{style.label}</span>
                  </div>
                  <div className="text-xs font-black text-white font-sans truncate">{family.name}</div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded border ${
                    hasScore
                      ? family.aligned
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800/40 text-slate-400 border-slate-700/40'
                  }`}>
                    {hasScore ? `${family.score!.toFixed(1)} / 10` : family.displayScore}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-purple-300/70">
                  <span>FAMILY SCORE</span>
                  <span className="text-white font-bold">{hasScore ? `${Math.round(family.percent)}%` : '—'}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#1e0e48] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${style.bar}`}
                    initial={{ width: '0%' }}
                    animate={{ width: `${hasScore ? family.percent : 0}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[#0b041e] border border-purple-900/40 text-[10px] font-mono text-purple-200/90 flex items-center justify-between" title={family.detail}>
                <span className="truncate">{family.detail}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-purple-300/80 font-sans leading-relaxed pt-1 border-t border-purple-900/30"
                  >
                    {FAMILY_DESCRIPTION[family.name]}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-[#140833] border border-purple-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-purple-200 font-sans">
          <CheckCircle2 className={`w-4 h-4 shrink-0 ${alignedCount >= Math.ceil(totalValidCount * 0.66) && totalValidCount > 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>
            <strong>{alignedCount}/{totalValidCount}</strong> families aligned {direction}
            {totalValidCount < vectors.length ? ` · ${vectors.length - totalValidCount} without data` : ''}
          </span>
        </div>
        <div className="text-[10px] font-mono text-purple-400" title="The legacy vote-tally score is a step function of how many families agree. It is not a probability; the calibrated P(win) on the cycle card is.">
          ENGINE SCORE: <span className="text-white font-bold">{engineScore !== null ? engineScore : '—'}</span> · step function of agreement, not a probability
        </div>
      </div>

    </div>
  );
};
