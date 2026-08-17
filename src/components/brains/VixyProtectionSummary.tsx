import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Lock,
  Clock
} from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';
import { ProtectionBrain } from './ProtectionBrain';

interface VixyProtectionSummaryProps {
  isActuallyLocked: boolean;
  signal?: PredictionSignal | null;
  ticker?: BTCTicker | null;
  rawApiData?: any;
  isProtectState: boolean;
  reversalRisk: number;
  currentPrice: number;
  targetPrice: number;
  timeRemainingSec: number;
  onExecute: () => void;
}

export const VixyProtectionSummary: React.FC<VixyProtectionSummaryProps> = ({
  isActuallyLocked,
  signal,
  ticker,
  rawApiData,
  isProtectState,
  reversalRisk,
  currentPrice,
  targetPrice,
  timeRemainingSec,
  onExecute,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Phase 1: Main card is still analyzing / qualifying (not yet locked) - Quiet, low-glow provisional strip
  if (!isActuallyLocked) {
    const rawStage = rawApiData?.stage || rawApiData?.cycleStage || rawApiData?.status || 'ANALYZING';
    const phaseLabel = rawStage === 'CALIBRATING' ? 'CALIBRATING ENGINE' :
                       rawStage === 'QUALIFYING' ? 'QUALIFYING CONFLUENCE' :
                       rawStage === 'VALIDATING' ? 'VALIDATING EVIDENCE' : 'SAMPLING 15M MATRIX';

    return (
      <div className="relative overflow-hidden rounded-xl border border-purple-950/40 bg-[#040208]/80 px-4 py-2.5 flex items-center justify-between text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-purple-950/50 border border-purple-800/30 flex items-center justify-center">
            <ShieldCheck className="w-3 h-3 text-purple-400 opacity-80" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold tracking-wider text-[11px]">VIXY PROTECTION GUARDIAN:</span>
            <span className="text-purple-300 font-semibold tracking-widest uppercase text-[11px]">{phaseLabel}</span>
          </div>
        </div>
        <div className="text-[10px] text-purple-500/70 tracking-wider flex items-center gap-1.5 tabular-nums">
          <Clock className="w-3 h-3 text-purple-500" />
          <span>AWAITING CYCLE LOCK</span>
        </div>
      </div>
    );
  }

  // Phase 2: Main card has locked a direction -> Active Guardian with risk-scaled glow
  const spotVsStrikeDelta = currentPrice - targetPrice;
  const relationStr = `$${safeToFixed(Math.abs(spotVsStrikeDelta), 2)}`;
  const relativePos = spotVsStrikeDelta >= 0 ? 'above' : 'below';

  const minutesLeft = Math.max(1, Math.floor(timeRemainingSec / 60));
  const rawReversal = reversalRisk;
  const survivalScore = Math.max(5, 100 - rawReversal);

  const backendGuardianAction = rawApiData?.guardianDecision?.action;
  const activeAction = backendGuardianAction || (
    survivalScore >= 75 ? 'TAKE PROFIT' :
    survivalScore >= 55 ? 'MOVE STOP' :
    survivalScore >= 35 ? 'WAIT' : 'EXIT'
  );

  const isHighRisk = rawReversal >= 50 || isProtectState;
  const isElevatedRisk = rawReversal >= 30 && !isHighRisk;

  // Design tokens aligned with app's emerald/coral/amber palette & glow intensity tied to real state
  const glowStyle = isHighRisk 
    ? 'border-rose-500/50 bg-rose-950/25 shadow-[0_0_20px_rgba(255,51,102,0.2)] text-rose-300'
    : isElevatedRisk
    ? 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_15px_rgba(251,191,36,0.15)] text-amber-200'
    : 'border-emerald-500/40 bg-emerald-950/15 shadow-[0_0_15px_rgba(0,255,157,0.12)] text-emerald-300';

  const riskLabel = isHighRisk ? 'CRITICAL THREAT' : isElevatedRisk ? 'ELEVATED' : 'LOW THREAT';

  const summaryText = activeAction === 'WAIT'
    ? `VIXY GUARDIAN: WAITING — reversal risk <span class="tabular-nums font-bold">${rawReversal}%</span> (${riskLabel}), spot <span class="tabular-nums font-bold">${relationStr}</span> ${relativePos} strike with <span class="tabular-nums font-bold">${minutesLeft}m</span> left`
    : activeAction === 'ENTER' || activeAction === 'TAKE PROFIT'
    ? `VIXY GUARDIAN: HOLDING POSITION — survival score <span class="tabular-nums font-bold">${survivalScore}%</span>, spot <span class="tabular-nums font-bold">${relationStr}</span> ${relativePos} strike`
    : `VIXY GUARDIAN: DEFENSIVE ACTION — risk elevated <span class="tabular-nums font-bold">${rawReversal}%</span>, spot <span class="tabular-nums font-bold">${relationStr}</span> ${relativePos} strike`;

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-3.5 space-y-2.5 font-mono transition-all duration-300 ${glowStyle}`}>
      {/* Compact Header & Primary Status Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${isHighRisk ? 'bg-rose-900/40 border-rose-500' : isElevatedRisk ? 'bg-amber-900/40 border-amber-500' : 'bg-emerald-900/40 border-emerald-500'}`}>
            {isHighRisk ? <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-slate-100">VIXY PROTECTION GUARDIAN</span>
              <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tabular-nums ${isHighRisk ? 'bg-rose-950/60 text-rose-300 border-rose-600/50' : isElevatedRisk ? 'bg-amber-950/60 text-amber-300 border-amber-600/50' : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'}`}>
                SURVIVAL: <span className="tabular-nums">{survivalScore}%</span> | REVERSAL: <span className="tabular-nums">{rawReversal}%</span>
              </span>
            </div>
            <p 
              className="text-[11px] font-medium mt-0.5 text-slate-200"
              dangerouslySetInnerHTML={{ __html: summaryText }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              onExecute();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-700/60 bg-[#06020c]/80 hover:bg-[#06020c] text-[10px] font-bold text-cyan-300 tracking-wider transition-colors shadow-sm"
          >
            <span>{isExpanded ? 'COLLAPSE EVIDENCE' : 'SHOW FULL EVIDENCE'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Detailed Guardian & Intelligence Matrix */}
      {isExpanded && (
        <div className="pt-3 border-t border-purple-900/40 animate-fadeIn space-y-3 bg-[#030106]/80 rounded-xl p-3">
          <ProtectionBrain
            signal={signal}
            ticker={ticker}
            isDiscordVerified={true}
            rawApiData={rawApiData}
          />
        </div>
      )}
    </div>
  );
};
