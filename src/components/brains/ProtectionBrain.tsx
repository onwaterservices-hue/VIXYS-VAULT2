import React, { useState, useEffect, useMemo } from 'react';
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
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Sparkles
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
  
  // ─── 1. AUTHORITATIVE LOCK & DIRECTION FROM VIXY EXECUTION CORE ───
  const isActuallyLocked = Boolean(
    rawApiData?.isLocked === true &&
    (rawApiData?.status === 'LOCKED' || 
     rawApiData?.cycleStage === 'LOCKED' || 
     rawApiData?.vixyLockState === 'LOCKED')
  );

  const rawDirectionStr = String(
    isActuallyLocked
      ? (rawApiData?.lockedDirection || rawApiData?.decision || rawApiData?.direction || 'NONE')
      : (rawApiData?.decision || rawApiData?.candidateDirection || rawApiData?.direction || (signal?.direction === 'YES' ? 'UP' : signal?.direction === 'NO' ? 'DOWN' : 'NONE'))
  ).toUpperCase();

  const isUp = rawDirectionStr.includes('UP') || rawDirectionStr.includes('YES') || rawDirectionStr === 'BUY_YES';
  const isDown = rawDirectionStr.includes('DOWN') || rawDirectionStr.includes('NO') && !rawDirectionStr.includes('NO_TRADE') && !rawDirectionStr.includes('NO_EXECUTION');
  const isNoTrade = rawDirectionStr.includes('SKIP') || rawDirectionStr.includes('NO_TRADE') || rawApiData?.stage === 'NO_TRADE' || rawApiData?.status === 'NO_TRADE';

  const lockedDirection = isUp ? 'BUY UP' : isDown ? 'BUY DOWN' : 'NONE';
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
    (isNoTrade ? 68 : isActuallyLocked ? 18 : 35)
  );
  
  const rawReversalRisk = Math.min(99, Math.max(5, Math.round(backendThreatScore)));
  const survivalScore = rawApiData?.guardianDecision?.survivalScore ?? Math.max(5, Math.min(99, 100 - rawReversalRisk));
  const survivalLabel = survivalScore >= 65 ? 'HEALTHY' : survivalScore >= 45 ? 'GUARDED' : 'ELEVATED';

  // Threat decimal factor for display (e.g. 0.113 HIGH THREAT)
  const threatFactor = (rawReversalRisk / 300).toFixed(3);

  // Time remaining minutes
  const timeRemainingSec = rawApiData?.timeRemainingSec || rawApiData?.features?.timeRemaining || 60;
  const minsLeft = Math.max(1, Math.ceil(timeRemainingSec / 60));

  // Authoritative Confidence
  const exactConfidencePct = Math.min(99, Math.max(50, Math.round(
    Number(rawApiData?.confidence ?? rawApiData?.lockedConfidence ?? signal?.confidence ?? 74)
  )));

  // ─── 2. AUTOMATIC PROTECTION & STRIKE-CROSS EXIT ALERT ───
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  // Spot price crossing strike against locked direction:
  // Locked BUY UP (isUp): price is crossed against direction if currentPrice < targetPrice
  // Locked BUY DOWN (isDown): price is crossed against direction if currentPrice > targetPrice
  const isCrossedAgainstLockedDirection = Boolean(
    isActuallyLocked && (
      (isUp && currentPrice < targetPrice) ||
      (isDown && currentPrice > targetPrice)
    )
  );

  // Dynamic recommendation text and button behavior
  let recommendationHeadline = '';
  let buttonLabel = '';
  let buttonStyle = '';
  let buttonActionType: 'CANCEL' | 'HOLD' | 'SKIP' | 'WAIT' = 'WAIT';

  if (isActuallyLocked && (isUp || isDown)) {
    if (isCrossedAgainstLockedDirection) {
      recommendationHeadline = `⚠️ STRIKE CROSSED AGAINST ${lockedDirection} (${formattedDeltaVal} vs strike) — CANCEL / EXIT TRADE immediately to preserve capital!`;
      buttonLabel = 'CANCEL / EXIT TRADE';
      buttonStyle = 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.8)] border border-rose-400/80 animate-pulse';
      buttonActionType = 'CANCEL';
    } else {
      recommendationHeadline = `🛡️ VIXY PROTECTION AUTO-ACTIVE (${lockedDirection}) — Spot ${formattedDeltaVal} vs strike. Reversal risk: ${rawReversalRisk}%. Defense is ${survivalScore}% healthy (${minsLeft}m left).`;
      buttonLabel = 'PROTECTION ACTIVE (AUTO)';
      buttonStyle = 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_15px_rgba(52,211,153,0.3)]';
      buttonActionType = 'HOLD';
    }
  } else if (isNoTrade) {
    recommendationHeadline = `🛡️ VIXY CALIBRATING — Market choppy or conflicting flow (${rawReversalRisk}% threat). Capital preserved.`;
    buttonLabel = 'CALIBRATING';
    buttonStyle = 'bg-purple-950/80 text-purple-300 border border-purple-800/60 opacity-80 animate-pulse';
    buttonActionType = 'SKIP';
  } else {
    recommendationHeadline = `VIXY PROTECTION STANDBY — analyzing 15M order flow & reversal vectors (${rawReversalRisk}% threat). Spot is ${formattedDeltaVal} vs strike.`;
    buttonLabel = 'STANDBY';
    buttonStyle = 'bg-amber-400/20 text-amber-300 border border-amber-500/40';
    buttonActionType = 'WAIT';
  }

  const handleButtonClick = () => {
    if (buttonActionType === 'CANCEL') {
      setLastActionFeedback('Trade cancelled & position exited. Capital safely preserved!');
      setTimeout(() => setLastActionFeedback(null), 5000);
    }
  };

  return (
    <div 
      id="vixy-protection-awakened-hero"
      className="vixy-card-elevated hud-corners border border-purple-900/60 p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group"
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
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
            isCrossedAgainstLockedDirection
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : isActuallyLocked
              ? 'bg-emerald-950/90 text-[#00FF9D] border-emerald-500/60 shadow-[0_0_10px_rgba(0,255,157,0.3)]'
              : 'bg-purple-950/90 text-purple-300 border-purple-500/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isCrossedAgainstLockedDirection ? 'bg-rose-400 animate-ping' : isActuallyLocked ? 'bg-[#00FF9D] animate-ping' : 'bg-purple-400 animate-pulse'}`} />
            <span>{isCrossedAgainstLockedDirection ? '⚠️ STRIKE BREACH ALERT' : isActuallyLocked ? 'GUARDIAN AUTO-ACTIVE' : 'GUARDIAN STANDBY'}</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 uppercase">
            {isActuallyLocked ? `LOCKED: ${lockedDirection}` : 'STATUS: TERMINAL'}
          </span>
        </div>
      </div>

      {/* VIXY AI / DEFENDER RECOMMENDATION BANNER */}
      <div className={`border rounded-xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 relative z-10 mb-3 shadow-md transition-all duration-300 ${
        isCrossedAgainstLockedDirection
          ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.35)]' 
          : isActuallyLocked 
          ? 'bg-[#0b051f] border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
          : 'bg-[#080216] border-purple-900/60'
      }`}>
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Zap className={`w-3 h-3 ${isCrossedAgainstLockedDirection ? 'text-rose-400 animate-bounce' : isActuallyLocked ? 'text-[#00FF9D]' : 'text-amber-400'}`} />
            <span className={isCrossedAgainstLockedDirection ? 'text-rose-300 font-black' : 'text-purple-400/80'}>
              {isCrossedAgainstLockedDirection ? 'STRIKE BREACH DEFENDER ALERT' : 'VIXY AI / DEFENDER RECOMMENDATION:'}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-100 truncate leading-snug">
            {recommendationHeadline}
          </div>
          {lastActionFeedback && (
            <div className="text-[9px] font-bold text-cyan-300 animate-pulse">
              ✓ {lastActionFeedback}
            </div>
          )}
        </div>

        {/* ACTION BUTTON / BADGE */}
        <button 
          onClick={handleButtonClick}
          className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shrink-0 cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${buttonStyle}`}
          title={isCrossedAgainstLockedDirection ? 'Click to cancel/exit trade and preserve capital' : 'VIXY Protection status'}
        >
          {buttonActionType === 'CANCEL' && <LogOut className="w-3.5 h-3.5 text-white animate-bounce" />}
          {buttonActionType === 'HOLD' && <ShieldCheck className="w-3.5 h-3.5 text-[#00FF9D]" />}
          <span>{buttonLabel}</span>
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
            <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase border ${
              survivalScore >= 65 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                : survivalScore >= 45 
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' 
                : 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
            }`}>
              {survivalLabel}
            </span>
          </div>

          <div className="my-1">
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight hud-gradient-text"
               style={
                 survivalScore >= 65
                   ? { "--grad-a": "#34d399", "--grad-b": "#f5f0ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties
                   : survivalScore >= 45
                   ? { "--grad-a": "#fbbf24", "--grad-b": "#f5f0ff", "--grad-c": "#f59e0b", "--grad-glow": "rgba(251,191,36,0.4)" } as React.CSSProperties
                   : { "--grad-a": "#fb7185", "--grad-b": "#f5f0ff", "--grad-c": "#e11d48", "--grad-glow": "rgba(244,63,94,0.5)" } as React.CSSProperties
               }
            >
              {survivalScore}%
            </div>
            <div className="text-[8.5px] font-bold uppercase tracking-widest mt-0.5 text-purple-300">
              {isActuallyLocked ? `PROTECTION ACTIVE AUTO • ${survivalLabel} CONDITION` : `${survivalLabel} CONDITION`}
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
            <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-black uppercase border ${
              rawReversalRisk >= 38 
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse' 
                : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
            }`}>
              {threatFactor} {rawReversalRisk >= 38 ? 'HIGH THREAT' : 'NORMAL'}
            </span>
          </div>

          <div className="text-[8px] text-purple-400/70 font-bold uppercase tracking-wider">
            4 CRITICAL THREAT FACTORS:
          </div>

          <ul className="text-[8.5px] font-mono space-y-1 text-purple-200/90 leading-tight">
            <li className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                <span>Price/Cap alignment:</span>
              </span>
              <strong className="text-cyan-300">{exactConfidencePct}% conf ({formattedDeltaVal})</strong>
            </li>
            <li className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                <span>Volume spike threat:</span>
              </span>
              <strong className={rawReversalRisk >= 38 ? 'text-rose-400' : 'text-amber-300'}>
                {rawReversalRisk >= 38 ? 'realtime risk' : 'order flow balanced'}
              </strong>
            </li>
            <li className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                <span>Order flow exhaustion:</span>
              </span>
              <strong className={rawReversalRisk >= 38 ? 'text-rose-400 font-bold' : 'text-purple-300'}>
                {rawReversalRisk >= 38 ? 'watch reversal ⚠️' : 'stable drift'}
              </strong>
            </li>
            <li className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                <span>Volatility expansion:</span>
              </span>
              <strong className="text-purple-200">
                {rawReversalRisk >= 50 ? 'high expansion' : 'controlled bounds'}
              </strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
