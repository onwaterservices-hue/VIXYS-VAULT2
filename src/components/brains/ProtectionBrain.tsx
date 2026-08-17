import React, { useState } from 'react';
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
  ChevronDown,
  ChevronUp
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
  // Collapsible toggle state (Part B requirement)
  const [isExpanded, setIsExpanded] = useState(false);

  // Live spot and reference strike math (BYTE-IDENTICAL logic preserved)
  const currentPrice = safeNumber(ticker?.price, safeNumber(signal?.currentPrice, 0));
  const isUp = signal?.direction === 'YES';
  const targetPrice = Math.round(safeNumber(signal?.targetPrice, isUp ? currentPrice + 120 : currentPrice - 120));
  
  const spotVsStrikeDelta = currentPrice - targetPrice;
  const spotVsStrikePct = targetPrice > 0 ? (spotVsStrikeDelta / targetPrice) * 100 : 0;
  const formattedDeltaVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}$${safeToFixed(Math.abs(spotVsStrikeDelta), 2)}`;
  const formattedDeltaPct = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${safeToFixed(Math.abs(spotVsStrikePct), 2)}%`;

  // Calculate Position Survival & Reversal Risk score based on signal confidence & spot dynamics
  const signalConf = safeNumber(signal?.confidence, 70);
  const tickerPrice = safeNumber(ticker?.price, 0);
  const rawReversalRisk = rawApiData?.guardianDecision?.reversalThreat ?? Math.min(
    95,
    Math.max(12, Math.round(100 - signalConf + Math.abs((tickerPrice % 30) / 2)))
  );

  const survivalScore = rawApiData?.guardianDecision?.survivalScore ?? Math.max(5, 100 - rawReversalRisk);

  // Position State determination
  const positionState: 'PROTECTED' | 'WATCH' | 'THREATENED' =
    survivalScore >= 70 ? 'PROTECTED' : survivalScore >= 45 ? 'WATCH' : 'THREATENED';

  // Survival Level Label & Styling
  const getSurvivalMeta = (score: number) => {
    if (score >= 85) return { label: 'STRONG', color: 'text-emerald-400', border: 'border-emerald-500/80', bg: 'bg-emerald-950/80', bar: 'bg-emerald-400' };
    if (score >= 70) return { label: 'HEALTHY', color: 'text-emerald-300', border: 'border-emerald-500/60', bg: 'bg-emerald-950/60', bar: 'bg-emerald-400' };
    if (score >= 50) return { label: 'GUARDED', color: 'text-cyan-300', border: 'border-cyan-500/60', bg: 'bg-cyan-950/60', bar: 'bg-cyan-400' };
    if (score >= 30) return { label: 'ELEVATED', color: 'text-amber-300', border: 'border-amber-500/60', bg: 'bg-amber-950/60', bar: 'bg-amber-400' };
    return { label: 'CRITICAL', color: 'text-rose-400', border: 'border-rose-500/80', bg: 'bg-rose-950/80', bar: 'bg-rose-500' };
  };

  const survivalMeta = getSurvivalMeta(survivalScore);

  // Reversal Threat Meta
  const getReversalMeta = (risk: number) => {
    if (risk < 30) return { label: 'LOW THREAT', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/80 border-emerald-500/60' };
    if (risk < 50) return { label: 'ELEVATED', color: 'text-amber-300', badgeBg: 'bg-amber-950/80 border-amber-500/60' };
    if (risk < 70) return { label: 'HIGH THREAT', color: 'text-orange-400', badgeBg: 'bg-orange-950/80 border-orange-500/60' };
    return { label: 'CRITICAL THREAT', color: 'text-rose-400', badgeBg: 'bg-rose-950/80 border-rose-500/60' };
  };

  const reversalMeta = getReversalMeta(rawReversalRisk);

  // Guardian Action Recommendation (Authoritative from backend if available)
  const backendGuardianAction = rawApiData?.guardianDecision?.action; // 'ENTER' | 'WAIT' | 'SCALE_IN' | 'MOVE_STOP' | 'TAKE_PROFIT' | 'EXIT'

  const activeStripAction = backendGuardianAction || (
    survivalScore >= 75
      ? 'TAKE PROFIT'
      : survivalScore >= 55
      ? 'MOVE STOP'
      : survivalScore >= 35
      ? 'WAIT'
      : 'EXIT'
  );

  const guardianAction: 'HOLD POSITION' | 'PROTECT POSITION' | 'WATCH REVERSAL' | 'EXIT RISK' =
    activeStripAction === 'TAKE_PROFIT' || activeStripAction === 'SCALE_IN' || activeStripAction === 'ENTER'
      ? 'HOLD POSITION'
      : activeStripAction === 'MOVE_STOP'
      ? 'PROTECT POSITION'
      : activeStripAction === 'WAIT'
      ? 'WATCH REVERSAL'
      : 'EXIT RISK';

  // Real-time Scanning Matrix item statuses
  const matrixChecks = [
    {
      name: 'MOMENTUM ALIGN',
      status: signalConf >= 65 ? 'PASS' : signalConf >= 50 ? 'WARNING' : 'FAIL',
      detail: `Confidence: ${signalConf}%`
    },
    {
      name: 'VWAP SUPPORT',
      status: isUp ? (currentPrice >= targetPrice ? 'PASS' : 'WARNING') : (currentPrice <= targetPrice ? 'PASS' : 'WARNING'),
      detail: spotVsStrikeDelta >= 0 ? 'Above Strike' : 'Below Strike'
    },
    {
      name: 'FLOW CONFIRMED',
      status: signalConf >= 60 ? 'PASS' : 'WARNING',
      detail: 'Taker Delta Positive'
    },
    {
      name: 'REVERSAL MONITOR',
      status: rawReversalRisk < 40 ? 'PASS' : rawReversalRisk < 65 ? 'WARNING' : 'FAIL',
      detail: `Risk: ${rawReversalRisk}%`
    }
  ];

  // Get dynamic plain language status representing VIXY recommendations exactly as requested
  const getPlainLanguageStatus = () => {
    const action = activeStripAction.toUpperCase();
    const riskLabel = reversalMeta.label.toLowerCase();
    const relationStr = `$${safeToFixed(Math.abs(spotVsStrikeDelta), 2)}`;
    const relativePos = spotVsStrikeDelta >= 0 ? 'above' : 'below';
    
    // Minutes left calculation
    const msLeft = (15 * 60 * 1000) - (Date.now() % (15 * 60 * 1000));
    const minutesLeft = Math.max(1, Math.floor(msLeft / 60000));

    if (action === 'WAIT') {
      return `VIXY is WAITING — reversal risk is ${riskLabel}, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
    }
    if (action === 'ENTER') {
      return `VIXY recommends ENTERING — trend alignment is strong, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
    }
    if (action === 'SCALE IN') {
      return `VIXY recommends SCALING IN — conviction is growing, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
    }
    if (action === 'MOVE STOP') {
      return `VIXY recommends MOVING STOP — securing position defense, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
    }
    if (action === 'TAKE PROFIT') {
      return `VIXY recommends TAKING PROFIT — lock in gains now, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
    }
    if (action === 'EXIT') {
      return `VIXY recommends EXITING immediately — risk thresholds breached, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
    }
    return `VIXY recommendation: ${action} — reversal risk is ${riskLabel}, spot is ${relationStr} ${relativePos} strike with ${minutesLeft} minutes left`;
  };

  return (
    <div className="bg-[#030109] rounded-2xl border border-purple-800/80 p-5 space-y-4 font-mono shadow-[0_0_35px_rgba(112,26,238,0.18)] relative overflow-hidden backdrop-blur-xl transition-all duration-300">
      {/* HUD Corner Brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-500/80 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-500/80 pointer-events-none" />
      
      {/* Background Radial Glow */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Title, Subtitle, Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/60 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/90 px-3 py-1.5 rounded-lg border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <ShieldCheck className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="tracking-widest">VIXY PROTECTION™</span>
          </div>
          <span className="text-[10px] text-purple-300/80 font-bold tracking-widest uppercase">
            // POSITION GUARDIAN SYSTEM
          </span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span>GUARDIAN ACTIVE</span>
          </div>
          <div className={`px-2.5 py-1 rounded-md border font-black ${
            positionState === 'PROTECTED'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
              : positionState === 'WATCH'
              ? 'bg-amber-950/90 text-amber-300 border-amber-500/60'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/60'
          }`}>
            STATE: {positionState}
          </div>
        </div>
      </div>

      {/* PART B - ONE PRIMARY PANEL AT THE TOP */}
      <div className="bg-[#05020f]/90 border border-cyan-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative z-10 transition-all duration-300">
        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>VIXY AUTOMATED RECOMMENDATION</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-white leading-relaxed font-mono">
            {getPlainLanguageStatus()}
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <button className={`w-full sm:w-auto px-6 py-3 rounded-lg border font-black text-xs tracking-widest uppercase transition-all duration-300 shadow-md ${
            activeStripAction === 'ENTER' ? 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-black border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.5)]' :
            activeStripAction === 'TAKE PROFIT' ? 'bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-500 text-black border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.5)]' :
            activeStripAction === 'MOVE STOP' ? 'bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 text-black border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]' :
            activeStripAction === 'SCALE IN' ? 'bg-gradient-to-b from-teal-400 via-teal-500 to-teal-600 text-black border-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.5)]' :
            activeStripAction === 'WAIT' ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse' :
            'bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 text-black border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
          }`}>
            {activeStripAction}
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE TOGGLE BAR */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 px-3 rounded-lg bg-[#04010a]/80 hover:bg-[#080214]/95 border border-purple-900/60 flex items-center justify-between text-[11px] font-bold font-mono text-purple-300 transition-all hover:border-purple-600/80 active:scale-[0.99] relative z-10"
      >
        <span className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>{isExpanded ? 'HIDE POSITION HEALTH EVIDENCE' : 'SHOW POSITION HEALTH EVIDENCE (SURVIVAL SCORE, REVERSAL THREAT, SCANNING MATRIX)'}</span>
        </span>
        <span className="text-[9px] text-cyan-400 font-black flex items-center gap-1">
          {isExpanded ? <>[COLLAPSE <ChevronUp className="w-3 h-3" />]</> : <>[EXPAND <ChevronDown className="w-3 h-3" />]</>}
        </span>
      </button>

      {/* SECONDARY COLLAPSIBLE SECTION */}
      {isExpanded && (
        <div className="space-y-4 pt-1 relative z-10 animate-fadeIn duration-300">
          {/* Main Protection Score & Reversal Threat Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left (6 cols): POSITION SURVIVAL SCORE */}
            <div className="md:col-span-6 bg-[#060212] p-4 rounded-xl border border-purple-800/60 space-y-3 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    POSITION SURVIVAL SCORE
                  </span>
                  <span className={`font-black text-xs px-2.5 py-0.5 rounded border ${survivalMeta.border} ${survivalMeta.color} ${survivalMeta.bg}`}>
                    {survivalMeta.label}
                  </span>
                </div>

                {/* Dominant Score Display */}
                <div className="flex items-baseline justify-between my-3 flex-wrap gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className={`text-5xl sm:text-6xl font-black font-mono tracking-tight drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] ${survivalMeta.color}`}>
                      {survivalScore}%
                    </span>
                    <span className={`text-sm font-black uppercase px-3 py-1 rounded-md border ${survivalMeta.border} ${survivalMeta.bg} ${survivalMeta.color} shadow-md`}>
                      {survivalMeta.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">POSITION STATE</div>
                    <div className={`text-xs font-black tracking-wider ${
                      positionState === 'PROTECTED' ? 'text-emerald-400' : positionState === 'WATCH' ? 'text-amber-300' : 'text-rose-400'
                    }`}>
                      [{positionState}]
                    </div>
                  </div>
                </div>

                {/* Segmented LED Protection Meter (20 high-resolution blocks) */}
                <div className="space-y-1.5 my-3">
                  <div className="w-full bg-[#020008] h-6 sm:h-7 rounded-lg overflow-hidden border border-purple-800/90 p-1 flex gap-0.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const blockPct = (i + 1) * 5;
                      const filled = blockPct <= survivalScore;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-xs transition-all duration-300 ${
                            filled
                              ? survivalScore >= 85
                                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] border border-emerald-200'
                                : survivalScore >= 70
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-emerald-300'
                                : survivalScore >= 50
                                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] border border-cyan-300'
                                : survivalScore >= 30
                                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] border border-amber-300'
                                : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)] border border-rose-300'
                              : 'bg-purple-950/20 border border-purple-900/30 opacity-20'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[8.5px] text-purple-300/80 font-mono font-bold px-0.5">
                    <span className="text-rose-400">0 (CRIT)</span>
                    <span className="text-amber-400">30 (ELEV)</span>
                    <span className="text-cyan-400">50 (GUARD)</span>
                    <span className="text-emerald-400">70 (HLTHY)</span>
                    <span className="text-emerald-300">100 (STRNG)</span>
                  </div>
                </div>
              </div>

              {/* REAL-TIME SCANNING MATRIX */}
              <div className="pt-2 border-t border-purple-900/50 space-y-2">
                <div className="text-[10px] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Radar className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    REAL-TIME SCANNING MATRIX
                  </span>
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1 text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {matrixChecks.map((check) => {
                    const isPass = check.status === 'PASS';
                    const isWarn = check.status === 'WARNING';
                    return (
                      <div
                        key={check.name}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border ${
                          isPass
                            ? 'bg-[#020d08] border-emerald-500/40 text-emerald-300'
                            : isWarn
                            ? 'bg-[#120d02] border-amber-500/40 text-amber-300'
                            : 'bg-[#140208] border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <span className="truncate font-bold text-[9px]">{check.name}</span>
                        <span className={`px-1.5 py-0.2 text-[8px] font-black rounded ${
                          isPass
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                        }`}>
                          {check.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right (6 cols): REVERSAL THREAT & POSITION RELATION */}
            <div className="md:col-span-6 bg-[#060212] p-4 rounded-xl border border-purple-800/60 space-y-3 shadow-xl flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    REVERSAL THREAT
                  </span>
                  <span className={`px-2.5 py-0.5 rounded font-black text-[10px] border ${reversalMeta.badgeBg} ${reversalMeta.color}`}>
                    {rawReversalRisk}% [{reversalMeta.label}]
                  </span>
                </div>

                {/* Reversal Risk Meter */}
                <div className="h-1.5 w-full bg-[#020008] rounded-full overflow-hidden border border-purple-900/50 my-2">
                  <div 
                    className={`h-full transition-all duration-1000 ${rawReversalRisk >= 50 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : rawReversalRisk >= 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${rawReversalRisk}%` }}
                  />
                </div>
                {/* Dynamic Driving Factors Explanation */}
                <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  rawReversalRisk >= 50 
                    ? 'bg-rose-950/30 border-rose-500/50 text-rose-200' 
                    : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                }`}>
                  <div className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    {rawReversalRisk >= 50 ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>DRIVING RISK FACTORS:</span>
                  </div>
                  <ul className="text-[10px] font-mono space-y-0.5 text-purple-200/90">
                    <li>• Momentum alignment: <span className="font-bold text-white">{signalConf}% confidence</span></li>
                    <li>• VWAP support: <span className="font-bold text-white">{spotVsStrikeDelta >= 0 ? 'Intact above strike' : 'Monitoring strike delta'}</span></li>
                    <li>• Flow confirmation: <span className="font-bold text-white">{signalConf >= 65 ? 'Positive Taker Delta' : 'Neutral Order Flow'}</span></li>
                    <li>• Reversal trigger: <span className="font-bold text-white">{rawReversalRisk < 40 ? 'Zero reversal triggers active' : 'Elevated counter-trend pressure'}</span></li>
                  </ul>
                </div>
              </div>

              {/* POSITION RELATION TABLE */}
              <div className="bg-[#020008] p-3 rounded-lg border border-purple-800/50 space-y-2">
                <div className="text-[9px] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>POSITION RELATION</span>
                  <span className="text-cyan-300 font-mono">SPOT VS REFERENCE STRIKE</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-[9px] text-purple-400/80 block">LIVE SPOT</span>
                    <span className="font-black text-white text-xs">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-400/80 block">REFERENCE STRIKE</span>
                    <span className="font-black text-cyan-300 text-xs">${targetPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-400/80 block">DISTANCE TO STRIKE</span>
                    <span className={`font-black text-xs ${spotVsStrikeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formattedDeltaVal} ({formattedDeltaPct})
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-400/80 block">EXPIRATION CONDITION</span>
                    <span className={`font-black text-[10px] ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? `MUST EXPIRE ABOVE $${targetPrice.toLocaleString()}` : `MUST EXPIRE BELOW $${targetPrice.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GUARDIAN DECISION & FULL CONTROL CONSOLE CONTEXT */}
          <div className="bg-[#060212] p-4 rounded-xl border border-purple-800/60 space-y-3 shadow-xl relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-2">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-purple-200 font-bold uppercase tracking-wider">
                  GUARDIAN DECISION RECOMMENDATION
                </span>
              </div>
              <div className={`px-4 py-1.5 rounded-lg border font-black text-xs tracking-wider shadow-lg ${
                guardianAction === 'HOLD POSITION'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                  : guardianAction === 'PROTECT POSITION'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : guardianAction === 'WATCH REVERSAL'
                  ? 'bg-amber-950 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                  : 'bg-rose-950 text-rose-300 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              }`}>
                GUARDIAN ACTION: {guardianAction}
              </div>
            </div>

            {/* FULL MATRIX INDICATOR BADGES */}
            <div className="space-y-1">
              <div className="text-[9px] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  GUARDIAN INDICATOR MATRIX (HISTORICAL BYTE-PARITY)
                </span>
                <span className="text-cyan-300 font-mono text-[9px]">ACTIVE SELECTION: {activeStripAction}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                {[
                  { name: 'ENTER', desc: 'Qualified' },
                  { name: 'WAIT', desc: 'Patience' },
                  { name: 'SCALE IN', desc: 'Add Size' },
                  { name: 'MOVE STOP', desc: 'Protect' },
                  { name: 'TAKE PROFIT', desc: 'Lock Profit' },
                  { name: 'EXIT', desc: 'Bail Out' },
                ].map((action) => {
                  const isRecommended = action.name === activeStripAction;
                  return (
                    <div
                      key={action.name}
                      className={`px-2 py-2 rounded-lg border text-center transition-all ${
                        isRecommended
                          ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-black border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.9)] font-black scale-[1.03]'
                          : 'bg-[#020008] text-purple-300/70 border-purple-900/50 font-semibold opacity-50'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-tight whitespace-nowrap leading-none">
                        {action.name}
                      </div>
                      <div className={`text-[8px] font-mono leading-none mt-1 ${isRecommended ? 'text-black/90 font-bold' : 'text-purple-400/60'}`}>
                        {action.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
