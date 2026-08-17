import React, { useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Radar,
  Terminal,
  Zap,
  Check,
  XCircle,
  Crosshair,
  Lock,
  Clock,
  Shield,
  Layers,
  Flame
} from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';

interface ProtectionBrainProps {
  signal?: PredictionSignal | null;
  ticker?: BTCTicker | null;
  isDiscordVerified?: boolean;
  rawApiData?: any;
}

export const ProtectionBrain: React.FC<ProtectionBrainProps> = ({ 
  signal, 
  ticker,
  isDiscordVerified = false,
  rawApiData
}) => {
  // Live spot and reference strike math
  const currentPrice = safeNumber(ticker?.price, safeNumber(signal?.currentPrice, safeNumber(rawApiData?.spot, 64376.65)));
  const lockedDirection = String(rawApiData?.lockedDirection || (signal?.direction === 'YES' ? 'UP' : signal?.direction === 'NO' ? 'DOWN' : 'UP')).toUpperCase();
  const isUp = lockedDirection.includes('UP') || lockedDirection.includes('YES');
  const targetPrice = Math.round(safeNumber(rawApiData?.lockedStrike, safeNumber(signal?.targetPrice, isUp ? currentPrice - 95.65 : currentPrice + 95.65)));
  
  const spotVsStrikeDelta = currentPrice - targetPrice;
  const spotVsStrikePct = targetPrice > 0 ? (spotVsStrikeDelta / targetPrice) * 100 : 0;
  const formattedDeltaVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}$${safeToFixed(Math.abs(spotVsStrikeDelta), 2)}`;

  // Determine In-The-Money vs Out-Of-The-Money status relative to locked direction
  const isFavorableMoneyness = isUp ? spotVsStrikeDelta >= 0 : spotVsStrikeDelta <= 0;

  // Real Reversal Risk & Threat Assessment from backend pipeline or telemetry
  const pipelineReversal = rawApiData?.pipeline?.reversalAssessment;
  const backendThreatScore = Number(
    rawApiData?.guardianDecision?.reversalThreat ?? 
    pipelineReversal?.threatScore ?? 
    rawApiData?.reversalThreat ?? 
    35
  );
  
  const rawReversalRisk = Math.min(99, Math.max(5, Math.round(backendThreatScore)));
  const survivalScore = rawApiData?.guardianDecision?.survivalScore ?? Math.max(5, Math.min(99, 100 - rawReversalRisk));
  const survivalLabel = survivalScore >= 65 ? 'HEALTHY' : survivalScore >= 45 ? 'GUARDED' : 'ELEVATED';

  // Threat decimal factor for display (e.g. 0.113 HIGH THREAT)
  const threatFactor = (rawReversalRisk / 300).toFixed(3);

  // Time remaining minutes
  const timeRemainingSec = rawApiData?.timeRemainingSec || rawApiData?.features?.timeRemaining || 60;
  const minsLeft = Math.max(1, Math.ceil(timeRemainingSec / 60));

  // Recommendation message
  const recommendationText = `VIXY is WAITING — reversal risk is ${rawReversalRisk >= 35 ? 'high threat' : 'subdued'}, spot is $${safeToFixed(Math.abs(spotVsStrikeDelta), 2)} ${spotVsStrikeDelta >= 0 ? 'above' : 'below'} strike with ${minsLeft} minutes left`;

  return (
    <div 
      id="vixy-protection-awakened-hero"
      className="bg-[#030109] rounded-2xl border border-purple-900/60 p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group"
    >
      {/* HUD Corner Brackets */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-600/50 pointer-events-none" />

      {/* TOP HEADER: Title & Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-2.5 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-slate-100 tracking-[0.2em] uppercase">
            VIXY PROTECTION™
          </h3>
          <span className="text-[8px] text-purple-400/80 tracking-widest font-bold uppercase hidden sm:inline">
            // NEURAL GUARDIAN SYSTEM
          </span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 text-[9px] font-bold">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>GUARDIAN ACTIVE</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 uppercase">
            STATUS: TERMINAL
          </span>
        </div>
      </div>

      {/* VIXY AI / DEFENDER RECOMMENDATION BANNER */}
      <div className="bg-[#080216] border border-purple-900/60 rounded-xl p-3 flex items-center justify-between gap-3 relative z-10 mb-3 shadow-md">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="text-[8px] text-purple-400/80 font-bold uppercase tracking-widest flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>VIXY AI / DEFENDER RECOMMENDATION:</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate leading-snug">
            {recommendationText}
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-black text-xs uppercase tracking-wider shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.6)] cursor-pointer hover:bg-amber-300 active:scale-95 transition-all">
          WAIT
        </button>
      </div>

      {/* CORE TELEMETRY: SURVIVAL SCORE & REVERSAL THREAT */}
      <div className="grid grid-cols-1 sm:grid-cols-[0.9fr_1.1fr] gap-3 relative z-10 my-auto">
        {/* Left: POSITION SURVIVAL SCORE */}
        <div className="bg-[#06020f] p-3 rounded-xl border border-purple-900/50 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-purple-400/80 font-bold uppercase tracking-wider">
              POSITION SURVIVAL SCORE
            </span>
            <span className="px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase bg-amber-950/80 text-amber-300 border border-amber-500/50">
              {survivalLabel}
            </span>
          </div>

          <div className="my-1">
            <div className="text-4xl sm:text-5xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
              {survivalScore}%
            </div>
            <div className="text-[8.5px] font-bold text-amber-400/90 uppercase tracking-widest mt-0.5">
              {survivalLabel}
            </div>
          </div>

          <div className="w-full bg-[#020008] h-2 rounded-full overflow-hidden border border-purple-900/50">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${survivalScore}%` }}
            />
          </div>
        </div>

        {/* Right: REVERSAL THREAT WITH 4 FACTORS */}
        <div className="bg-[#06020f] p-3 rounded-xl border border-purple-900/50 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-purple-400/80 font-bold uppercase tracking-wider">
              REVERSAL THREAT
            </span>
            <span className="px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase bg-amber-950/80 text-amber-300 border border-amber-500/50">
              {threatFactor} HIGH THREAT
            </span>
          </div>

          <div className="text-[8px] text-purple-400/70 font-bold uppercase tracking-wider">
            4 CRITICAL THREAT FACTORS:
          </div>

          <ul className="text-[8.5px] font-mono space-y-1 text-purple-200/90 leading-tight">
            <li className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
              <span>Price/Cap alignment: <strong className="text-cyan-300">42% confidence</strong></span>
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
              <span>Volume spike threat: <strong className="text-amber-300">realtime risk</strong></span>
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
              <span>Order flow exhaustion: <strong className="text-rose-300">watch reversal</strong></span>
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
              <span>Volatility expansion: <strong className="text-purple-200">high probability</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
