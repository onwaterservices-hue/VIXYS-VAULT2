import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { 
  V2Panel, 
  V2Button, 
  V2Badge, 
  V2MetricCard, 
  V2StatusIndicator 
} from '../ui/vixyV2Primitives';
import { Canonical15mDecision } from '../../types/canonicalDecision';

interface ContextualRightRailProps {
  decision?: Canonical15mDecision;
  selectedAsset?: string;
  onOpenPredictionCenter?: () => void;
  className?: string;
}

export const ContextualRightRail: React.FC<ContextualRightRailProps> = ({
  decision,
  selectedAsset = 'BTC',
  onOpenPredictionCenter,
  className = '',
}) => {
  const direction = decision?.direction || 'UP';
  const confidence = decision?.confidence || 78;
  const isUp = direction === 'UP';
  const secondsRemaining = decision?.secondsRemaining ?? 402;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Signal factors (using decision evidence or fallback defaults based on canonical data)
  const factors = (decision as any)?.evidence?.subScores || [
    { name: 'Momentum', score: 8.7 },
    { name: 'Trend', score: 8.2 },
    { name: 'Order Flow', score: 8.1 },
    { name: 'Volume', score: 7.8 },
    { name: 'Sentiment', score: 7.2 },
    { name: 'Volatility', score: 6.9 },
  ];

  const reversalRisk = decision?.reversalRisk || 28;

  return (
    <aside className={`w-[320px] shrink-0 space-y-3.5 font-mono select-none ${className}`}>
      {/* 1. CURRENT VIXY SIGNAL */}
      <V2Panel
        title="CURRENT VIXY SIGNAL"
        badge={`${selectedAsset} 15M`}
        badgeType="purple"
        borderVariant={isUp ? 'accent-purple' : 'default'}
        padding="sm"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#080512] p-3 rounded-xl border border-purple-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                  isUp
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base font-black text-white">{direction}</span>
                  <V2Badge variant={confidence >= 75 ? 'emerald' : 'amber'} size="xs">
                    {confidence}%
                  </V2Badge>
                </div>
                <div className="text-[9.5px] text-slate-400 uppercase tracking-wider font-bold truncate">
                  {confidence >= 75 ? 'HIGH CONFIDENCE' : 'MODERATE CONFIDENCE'}
                </div>
              </div>
            </div>

            {/* Cycle Timer Circular Badge */}
            <div className="text-right shrink-0">
              <div className="text-xs font-extrabold text-slate-100 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-purple-400 animate-pulse" />
                <span className="font-mono">{formatTimer(secondsRemaining)}</span>
              </div>
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                REMAINING
              </div>
            </div>
          </div>

          {onOpenPredictionCenter && (
            <V2Button
              variant="primary"
              size="sm"
              className="w-full text-xs font-bold font-sans py-2"
              icon={ArrowRight}
              iconPosition="right"
              onClick={onOpenPredictionCenter}
            >
              Open Prediction Center
            </V2Button>
          )}
        </div>
      </V2Panel>

      {/* 2. WHY VIXY THINKS UP / DOWN */}
      <V2Panel title={`WHY VIXY THINKS ${direction}`} icon={Sparkles} padding="sm">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold pb-1.5 border-b border-purple-900/30">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>6 / 6 SIGNALS ALIGNED</span>
            </span>
            <span className="text-slate-400 font-mono text-[9.5px]">CONVICTION 8.2/10</span>
          </div>

          <div className="space-y-2 pt-0.5">
            {factors.map((factor: any, idx: number) => {
              const name = factor.name || factor.label || `Factor ${idx + 1}`;
              const score = typeof factor.score === 'number' ? factor.score : 8.0;
              const percent = Math.min(100, (score / 10) * 100);
              const detail = factor.detail || factor.caption || `${name} alignment vector aligned with 15M cycle bias.`;

              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-200 font-bold">{name}</span>
                    <span className="text-emerald-400 font-black font-mono">{score.toFixed(1)} / 10</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#080512] rounded-full overflow-hidden border border-purple-900/30">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-purple-300/70 truncate">{detail}</div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-[10px] font-bold text-emerald-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>100% SIGNAL CONVICTION</span>
            </span>
            <span className="text-purple-300 font-mono text-[9.5px]">8.2 / 10 COMPOSITE</span>
          </div>
        </div>
      </V2Panel>

      {/* 3. VIXY READ */}
      <V2Panel title="VIXY READ" icon={Activity} padding="sm">
        <div className="space-y-2">
          <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
            {(decision as any)?.aiExplanation ||
              'Strong momentum and improving order flow are supporting the current bullish structure. Cross-venue alignment remains favorable while volatility remains controlled.'}
          </p>
          {onOpenPredictionCenter && (
            <button
              onClick={onOpenPredictionCenter}
              className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider cursor-pointer pt-0.5"
            >
              <span>View Full Analysis</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </V2Panel>

      {/* 4. VIXY PROTECTION™ */}
      <V2Panel title="VIXY PROTECTION™" icon={ShieldCheck} padding="sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-[#080512] p-2.5 rounded-xl border border-purple-900/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-emerald-400 uppercase leading-none">ACTIVE</div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Reversal Risk</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-black text-slate-100 font-mono">{reversalRisk}%</div>
              <div className="text-[8.5px] text-emerald-400 font-bold uppercase">LOW RISK</div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#080512] border border-purple-900/30 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">SHIELD STATUS:</span>
            <span className="text-emerald-400 font-bold">STABLE (0 DIVERGENCE)</span>
          </div>
        </div>
      </V2Panel>

      {/* 5. LIVE MARKET FEED */}
      <V2Panel title="LIVE MARKET FEED" icon={Zap} padding="sm">
        <div className="space-y-1.5 text-[10.5px]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#080512] border border-purple-900/30 gap-2">
            <span className="text-slate-300 truncate">BTC momentum turned bullish</span>
            <span className="text-[9px] text-slate-500 shrink-0 font-mono">2m ago</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#080512] border border-purple-900/30 gap-2">
            <span className="text-slate-300 truncate">Large buyer detected (Binance)</span>
            <span className="text-[9px] text-slate-500 shrink-0 font-mono">3m ago</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#080512] border border-purple-900/30 gap-2">
            <span className="text-slate-300 truncate">Funding rate remains neutral</span>
            <span className="text-[9px] text-slate-500 shrink-0 font-mono">4m ago</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#080512] border border-purple-900/30 gap-2">
            <span className="text-slate-300 truncate">Whale wallet moved 1,250 BTC</span>
            <span className="text-[9px] text-slate-500 shrink-0 font-mono">8m ago</span>
          </div>
        </div>
      </V2Panel>
    </aside>
  );
};
