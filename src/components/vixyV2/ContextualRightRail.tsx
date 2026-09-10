import React, { useState, useEffect, useMemo } from 'react';
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
import { confidenceLabel } from '../../lib/engineSemantics';
import { 
  V2Panel, 
  V2Button, 
  V2Badge, 
  V2MetricCard, 
  V2StatusIndicator 
} from '../ui/vixyV2Primitives';
import { Canonical15mDecision } from '../../types/canonicalDecision';
import { calculateCycleSecondsRemaining, formatCountdownMmSs } from '../../utils/cycleTime';
import { computeEvidenceVectors } from '../../utils/evidenceVectors';
import { getReversalRiskAssessment } from '../../utils/reversalRisk';
import { fetchResolvedLogApi } from '../../services/api';

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
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Second-by-second smooth tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const direction = decision?.direction || 'UP';
  // No invented 78: the rail shows the engine's number or none at all.
  const confidence: number | null =
    typeof decision?.confidence === 'number' && Number.isFinite(decision.confidence) ? decision.confidence : null;
  const isUp = direction === 'UP';

  const secondsRemaining = useMemo(() => {
    return calculateCycleSecondsRemaining(900, decision?.cycleEnd, nowMs);
  }, [decision?.cycleEnd, nowMs]);

  const formattedTimer = useMemo(() => {
    return formatCountdownMmSs(secondsRemaining);
  }, [secondsRemaining]);

  // Genuine computed evidence vectors from real market data
  const evidenceSummary = useMemo(() => {
    return computeEvidenceVectors(decision);
  }, [decision]);

  // No invented 28: when the engine has not reported a reversal risk the
  // panel says so instead of grading a number nobody computed.
  const reversalRiskRaw: number | null =
    typeof decision?.reversalRisk === 'number' && Number.isFinite(decision.reversalRisk) ? decision.reversalRisk : null;
  const reversalAssessment = useMemo(() => {
    return getReversalRiskAssessment(reversalRiskRaw ?? 0);
  }, [reversalRiskRaw]);

  // Engine event feed: settled cycles from the ledger (polled every 60s) plus
  // this cycle's lock. Replaces a list of templated "whale" lines that were
  // never measured.
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const j: any = await fetchResolvedLogApi();
        if (cancelled || !j) return;
        const rows = Array.isArray(j.recentResolved)
          ? j.recentResolved.filter((r: any) => r && (r.decision === 'BUY_UP' || r.decision === 'BUY_DOWN' || r.decision === 'SKIP')).slice(0, 4)
          : [];
        setLedgerRows(rows);
      } catch {
        // The panel shows its empty state; nothing is invented to fill it.
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const feedItems = useMemo(() => {
    const items: Array<{ key: string; text: string; tMs: number; tone: 'up' | 'down' | 'skip' | 'lock' }> = [];
    if (decision && (decision.currentState === 'LOCKED_UP' || decision.currentState === 'LOCKED_DOWN') && typeof decision.lockedAt === 'number') {
      items.push({
        key: 'lock',
        text: `Locked ${decision.direction} this cycle${confidence !== null ? ` · engine score ${confidence}` : ''}`,
        tMs: decision.lockedAt,
        tone: 'lock',
      });
    }
    for (const r of ledgerRows) {
      const t = r.intervalEnd ? Date.parse(r.intervalEnd) : r.resolvedAt ? Date.parse(r.resolvedAt) : NaN;
      if (!Number.isFinite(t)) continue;
      if (r.decision === 'SKIP') {
        items.push({ key: `s-${t}`, text: 'Cycle skipped — lock gate not met', tMs: t, tone: 'skip' });
      } else {
        const px = typeof r.settlementPrice === 'number' && r.settlementPrice > 0 ? ` @ $${Math.round(r.settlementPrice).toLocaleString()}` : '';
        items.push({ key: `r-${t}`, text: `${r.direction} lock settled ${r.wasCorrect ? 'WIN' : 'LOSS'}${px}`, tMs: t, tone: r.wasCorrect ? 'up' : 'down' });
      }
    }
    return items.sort((a, b) => b.tMs - a.tMs).slice(0, 4);
  }, [decision, ledgerRows, confidence]);

  const ago = (t: number) => {
    const m = Math.max(0, Math.round((nowMs - t) / 60000));
    return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
  };

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
                  <V2Badge variant={(confidence ?? 0) >= 75 ? 'emerald' : 'amber'} size="xs">
                    {confidence !== null ? `${confidence}%` : '—'}
                  </V2Badge>
                </div>
                <div className="text-[9.5px] text-slate-400 uppercase tracking-wider font-bold truncate">
                  {confidenceLabel(confidence)}
                </div>
              </div>
            </div>

            {/* Cycle Timer Circular Badge */}
            <div className="text-right shrink-0">
              <div className="text-xs font-extrabold text-slate-100 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-purple-400 animate-pulse" />
                <span className="font-mono">{formattedTimer}</span>
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
              <span>{evidenceSummary.signalsAlignedHeader}</span>
            </span>
            <span className="text-slate-400 font-mono text-[9.5px]">{evidenceSummary.convictionHeaderText}</span>
          </div>

          <div className="space-y-2 pt-0.5">
            {evidenceSummary.vectors.map((factor, idx) => {
              const name = factor.name;
              const isAvailable = factor.score !== null && !factor.isStaleOrMissing;
              const percent = factor.percent;
              const displayScore = isAvailable ? `${factor.score?.toFixed(1)} / 10` : factor.displayScore;
              const detail = factor.detail;

              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-200 font-bold">{name}</span>
                    <span className={`font-black font-mono ${
                      isAvailable
                        ? factor.aligned ? 'text-emerald-400' : 'text-amber-400'
                        : 'text-slate-500'
                    }`}>
                      {displayScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#080512] rounded-full overflow-hidden border border-purple-900/30">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isAvailable
                          ? factor.aligned
                            ? 'bg-gradient-to-r from-purple-500 to-emerald-400'
                            : 'bg-gradient-to-r from-purple-900 to-amber-500'
                          : 'bg-slate-800'
                      }`}
                      style={{ width: `${isAvailable ? percent : 0}%` }}
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
              <span>{evidenceSummary.convictionPercentText}</span>
            </span>
            <span className="text-purple-300 font-mono text-[9.5px]">{evidenceSummary.compositeFooterText}</span>
          </div>
        </div>
      </V2Panel>

      {/* 3. VIXY READ */}
      <V2Panel title="VIXY READ" icon={Activity} padding="sm">
        <div className="space-y-2">
          <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
            {evidenceSummary.dynamicExplanation}
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
              <div className={`p-1.5 rounded-lg border shrink-0 ${reversalAssessment.cardClass}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className={`text-[11px] font-bold uppercase leading-none ${reversalAssessment.colorClass}`}>
                  {reversalAssessment.tier === 'HIGH' ? 'HAZARD ELEVATED' : 'ACTIVE'}
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5">Reversal Risk</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-sm font-black text-slate-100 font-mono">{reversalRiskRaw === null ? '—' : `${reversalAssessment.score}%`}</div>
              <div className={`text-[8.5px] font-bold uppercase ${reversalRiskRaw === null ? 'text-slate-500' : reversalAssessment.colorClass}`}>
                {reversalRiskRaw === null ? 'NO DATA' : reversalAssessment.label}
              </div>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-[#080512] border border-purple-900/30 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">SHIELD STATUS:</span>
            <span className={`font-bold ${reversalRiskRaw === null ? 'text-slate-500' : reversalAssessment.tier === 'LOW' ? 'text-emerald-400' : reversalAssessment.tier === 'MODERATE' ? 'text-amber-400' : 'text-rose-400'}`}>
              {reversalRiskRaw === null ? 'NO DATA' : reversalAssessment.tier === 'LOW' ? 'STABLE (0 DIVERGENCE)' : reversalAssessment.tier === 'MODERATE' ? 'WATCH (MODERATE EXPOSURE)' : 'VETO ACTIVE (HIGH VOLATILITY)'}
            </span>
          </div>
        </div>
      </V2Panel>

      {/* 5. ENGINE EVENT FEED — real locks and settlements from the ledger */}
      <V2Panel title="ENGINE EVENT FEED" icon={Zap} padding="sm">
        <div className="space-y-1.5 text-[10.5px]">
          {feedItems.length === 0 ? (
            <div className="p-2 rounded-lg bg-[#080512] border border-purple-900/30 text-slate-500">
              No engine events loaded yet.
            </div>
          ) : (
            feedItems.map((it) => (
              <div key={it.key} className="flex items-center justify-between p-2 rounded-lg bg-[#080512] border border-purple-900/30 gap-2">
                <span className={`truncate ${it.tone === 'up' ? 'text-emerald-300' : it.tone === 'down' ? 'text-rose-300' : it.tone === 'lock' ? 'text-cyan-300' : 'text-amber-300'}`}>
                  {it.text}
                </span>
                <span className="text-[9px] text-slate-500 shrink-0 font-mono">{ago(it.tMs)}</span>
              </div>
            ))
          )}
        </div>
      </V2Panel>
    </aside>
  );
};
