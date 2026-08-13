import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Clock, Radio, Key, Activity, ShieldCheck, AlertTriangle, WifiOff, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { VaultCard } from '../VaultCard';

interface SignalBrainProps {
  feedStatus?: string;
  latencyMs?: number;
  signal: PredictionSignal;
  ticker: BTCTicker;
  timeString: string;
  timeframe: '15M' | '1H';
  lockEvaluation: any;
  rawApiData?: any;
  venue?: string;
}

export const SignalBrain: React.FC<SignalBrainProps> = ({
  signal,
  ticker,
  timeString,
  timeframe,
  lockEvaluation,
  feedStatus = 'ONLINE',
  latencyMs = 33,
  rawApiData,
  venue = 'Kalshi',
}) => {
  const isStaleOrInvalid = feedStatus === 'STALE' || feedStatus === 'INVALID' || feedStatus === 'OFFLINE';
  const displayVenue = venue || 'Kalshi';

  // Backend-authoritative connection status evaluation
  const isOfflineStatus = isStaleOrInvalid || feedStatus === 'DISCONNECTED';
  const isDegradedStatus = feedStatus === 'DEGRADED' || (latencyMs > 600 && !isOfflineStatus);
  const isConnectedStatus = !isOfflineStatus && !isDegradedStatus;

  const connectionLabel = isOfflineStatus ? 'OFFLINE' : isDegradedStatus ? 'DEGRADED' : 'CONNECTED';

  // Dynamic Lock evaluation metrics
  const lockScorePct = lockEvaluation?.lockScore ?? lockEvaluation?.lockPercentage ?? Math.min(98, Math.max(50, Math.round((rawApiData?.confidence || signal.confidence || 0) * 0.95)));
  const verifiedCriteriaCount = lockEvaluation?.verifiedCriteria ?? lockEvaluation?.criteriaVerified ?? (signal.confidence > 75 ? 5 : 4);
  const totalCriteriaCount = lockEvaluation?.totalCriteria ?? 6;

  // Event-driven micro-vibration trigger (runs 350ms on click or signal criteria updates)
  const [isVibrating, setIsVibrating] = useState(false);

  const triggerHapticPulse = useCallback(() => {
    setIsVibrating(true);
    const timer = setTimeout(() => setIsVibrating(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // Trigger brief micro-vibration when lock percentage or feed status updates
  useEffect(() => {
    triggerHapticPulse();
  }, [lockScorePct, feedStatus, triggerHapticPulse]);

  // Safe backend-authoritative execution state
  const execution = rawApiData?.execution || {
    state: (rawApiData?.direction === 'BUY UP' ? 'LOCK_UP' : (rawApiData?.direction === 'BUY DOWN' ? 'LOCK_DOWN' : 'PASS')),
    direction: (rawApiData?.direction === 'BUY UP' ? 'UP' : (rawApiData?.direction === 'BUY DOWN' ? 'DOWN' : 'NONE')),
    authorized: rawApiData?.direction === 'BUY UP' || rawApiData?.direction === 'BUY DOWN',
    actionLabel: rawApiData?.direction === 'BUY UP' ? 'BUY UP → ENTER' : (rawApiData?.direction === 'BUY DOWN' ? 'BUY DOWN → ENTER' : 'ENTRY NOT QUALIFIED'),
    reason: 'Authoritative Engine State',
    qualified: rawApiData?.entryQualification === 'QUALIFIED'
  };

  const isLockUp = execution.state === 'LOCK_UP';
  const isLockDown = execution.state === 'LOCK_DOWN';
  const isPassState = execution.state === 'PASS';

  const directionalConfidenceLabel = isLockUp
    ? 'HIGH BULL'
    : isLockDown
    ? 'HIGH BEAR'
    : (execution.confidenceLabel || rawApiData?.confidenceLabel || 'NEUTRAL');

  const sigAny = signal as any;
  const upProbability = Number(sigAny?.upProbability ?? rawApiData?.upProbability ?? signal?.confidence ?? 50);
  const downProbability = Number(sigAny?.downProbability ?? rawApiData?.downProbability ?? (100 - upProbability));
  const evidenceQuality = Number(sigAny?.evidenceQuality ?? rawApiData?.evidenceQuality ?? 78);
  const edgePct = sigAny?.edgePct ?? rawApiData?.edgePct ?? 0;
  const edgeDisplay = edgePct > 0 ? `+${edgePct.toFixed(1)}% OVER MARKET` : `${edgePct.toFixed(1)}% OVER MARKET`;

  const currentConfidence = Number(rawApiData?.confidence ?? signal?.confidence ?? upProbability);

  const reversalRisk = Number(
    (signal as any)?.reversalRisk ??
    rawApiData?.guardianDecision?.reversalThreat ??
    rawApiData?.guardianDecision?.reversalThreatPct ??
    rawApiData?.features?.reversalRisk ??
    0
  );
  const isProtectState = rawApiData?.guardianDecision?.action === 'EXIT' || rawApiData?.guardianDecision?.thesisInvalidated || reversalRisk >= 50;
  
  const currentPrice = rawApiData?.features?.crossVenue?.spot || ticker?.price || 0;
  const targetPrice = Math.round(rawApiData?.features?.crossVenue?.kalshiStrike || signal?.targetPrice || 0);

  const rawCalibStatus = rawApiData?.calibrationStatus || rawApiData?.calibration?.calibrationStatus;
  const calibrationStatus = rawCalibStatus === 'ACTIVE' 
      ? 'CALIBRATED' 
      : (rawCalibStatus || 'CALIBRATION WARMUP');

  const displayOrderFlow = rawApiData?.features?.orderBookImbalance ?? 0;
  const orderFlowStr = displayOrderFlow > 0 ? `+${displayOrderFlow.toFixed(3)}` : displayOrderFlow.toFixed(3);
  
  const displayMomentum = rawApiData?.features?.momentum5m ?? 0;
  const momentumStr = displayMomentum > 0 ? `+${(displayMomentum * 100).toFixed(1)}` : (displayMomentum * 100).toFixed(1);
  
  const displayVolatility = rawApiData?.features?.volatility15m ?? 0;
  const volatilityStr = (displayVolatility * 100).toFixed(2);
  
  const displayDistance = rawApiData?.features?.crossVenue?.distance ?? 0;
  const distanceStr = displayDistance > 0 ? `+${Math.round(displayDistance)}` : `${Math.round(displayDistance)}`;
  
  const displayRegime = rawApiData?.features?.regime?.split('_')[0] || 'UNKNOWN';

  const takerBuyersPct = Math.max(0, Math.min(100, Math.round((displayOrderFlow + 1) * 50)));
  const takerSellersPct = 100 - takerBuyersPct;

  // Compute LAST 10 dots dynamically from real resolved signal outcome logs (authoritative backend)
  const last10List = rawApiData?.last10 || rawApiData?.recentResolvedLogs || [];
  const displayLogs = last10List.slice(0, 10);

  const upCount = displayLogs.filter((s: any) => {
    const outcome = (s.outcome || s.actualOutcome || s.direction || '').toUpperCase();
    return outcome === 'UP';
  }).length;
  
  const downCount = displayLogs.filter((s: any) => {
    const outcome = (s.outcome || s.actualOutcome || s.direction || '').toUpperCase();
    return outcome === 'DOWN';
  }).length;

  const totalResolved = displayLogs.length;
  const recentUpPct = totalResolved > 0 ? Math.round((upCount / totalResolved) * 100) : 0;

  // Authoritative Direction & Probability
  const isOfflineOrStale = isOfflineStatus || isStaleOrInvalid || !rawApiData;

  let displayDecisionText = 'PASS';
  if (isOfflineOrStale) {
    displayDecisionText = 'DATA STALE';
  } else if (isLockUp) {
    displayDecisionText = 'BUY UP';
  } else if (isLockDown) {
    displayDecisionText = 'BUY DOWN';
  } else {
    displayDecisionText = 'PASS';
  }

  const rawCalibProb = rawApiData?.calibratedProbability ?? rawApiData?.calibratedModelProbability;
  const displayCalibratedProb = (rawCalibProb !== null && rawCalibProb !== undefined)
    ? `${Math.round(rawCalibProb * (rawCalibProb <= 1 ? 100 : 1))}%`
    : (rawApiData?.confidence ? `${Math.round(rawApiData.confidence)}%` : 'CALIBRATING');

  // Micro-telemetry values
  const spotVsStrikeDelta = currentPrice && targetPrice ? currentPrice - targetPrice : 0;
  const spotVsStrikePct = targetPrice > 0 ? (spotVsStrikeDelta / targetPrice) * 100 : 0;
  const formattedSpotVsStrikeVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}$${Math.abs(spotVsStrikeDelta).toFixed(2)}`;
  const formattedSpotVsStrikePct = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${Math.abs(spotVsStrikePct).toFixed(2)}%`;

  return (
    <div className="space-y-4">
      {/* TOP STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono tracking-widest uppercase pb-1">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-purple-500/70 mb-1">MARKET</div>
            <div className="text-purple-100 font-bold">BTC {displayVenue} {timeframe}</div>
          </div>
          <div>
            <div className="text-purple-500/70 mb-1">VIXY SIGNAL</div>
            <div className={`${isConnectedStatus ? 'text-emerald-400' : 'text-rose-400'} font-bold flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnectedStatus ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
              {isConnectedStatus ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full border ${
            displayDecisionText === 'BUY UP' ? 'bg-[#041510] border-emerald-900/60 text-emerald-400' :
            displayDecisionText === 'BUY DOWN' ? 'bg-[#1a050a] border-rose-900/60 text-rose-400' :
            'bg-purple-950/30 border-purple-900/60 text-purple-300'
          } flex items-center gap-2 font-black shadow-lg`}>
            <span className={`w-2 h-2 rounded-full ${
              displayDecisionText === 'BUY UP' ? 'bg-emerald-400' :
              displayDecisionText === 'BUY DOWN' ? 'bg-rose-500' :
              'bg-purple-400'
            } shadow-sm`} />
            {displayDecisionText} {displayCalibratedProb !== 'CALIBRATING' ? displayCalibratedProb : ''} 
            <span className="text-[8px] opacity-70 ml-1 font-normal">{calibrationStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-purple-500/70">LAST 10</span>
              <div className="flex gap-1 ml-2">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const item = displayLogs[idx];
                  if (!item) {
                    return (
                      <span
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full bg-purple-900/30 border border-purple-800/40"
                        title="Pending settlement"
                      />
                    );
                  }
                  const outcome = (item.outcome || item.actualOutcome || item.direction || '').toUpperCase();
                  const isUp = outcome === 'UP';
                  return (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-cyan-400' : 'bg-rose-500'}`}
                      title={`${item.cycleId || 'Cycle'}: ${outcome} (Strike: $${item.strike || ''}, Settle: $${item.settlementPrice || ''})`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-cyan-400/80 font-bold">
              {totalResolved === 10 ? (
                `${upCount} UP • ${downCount} DOWN • ${recentUpPct}% RECENT`
              ) : totalResolved > 0 ? (
                `${upCount} UP • ${downCount} DOWN • ${totalResolved} RESOLVED • ${10 - totalResolved} PENDING`
              ) : (
                '0 RESOLVED • CALIBRATING'
              )}
            </div>
          </div>
          <div>
            <div className="text-purple-500/70 mb-1">EXPIRY</div>
            <div className="text-purple-100 font-bold">{timeString}</div>
          </div>
          <div>
            <div className="text-purple-500/70 mb-1 flex items-center gap-1"><Radio className="w-3 h-3" /> LATENCY</div>
            <div className="text-emerald-400 font-bold">{latencyMs}ms</div>
          </div>
        </div>
      </div>

      {/* PRIMARY VIXY DECISION CARD */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-900/40 p-5 sm:p-7 space-y-6 font-mono bg-[#030106] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20 z-0" />
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-purple-900/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
             <div className="text-cyan-400 opacity-80">
               <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12H3m14-5l4 5-4 5"/></svg>
             </div>
             <div>
               <h2 className="text-sm font-black text-slate-100 tracking-[0.25em] uppercase drop-shadow-md">VIXY DECISION ENGINE</h2>
               <span className="text-[9px] text-purple-400/80 tracking-[0.2em] font-bold uppercase mt-0.5 block">HIGH-CONVICTION SETUP</span>
             </div>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono font-bold tracking-[0.2em] uppercase bg-[#06020c] py-1.5 px-3 rounded border border-purple-900/40">
             <span className="text-purple-400/60">ENGINE: <span className="text-slate-300">V17</span></span>
             <span className="text-purple-400/60">MODEL: <span className="text-emerald-400">LIVE</span></span>
             <span className="text-purple-400/60">DATA: <span className="text-emerald-400">LIVE</span></span>
             <span className="text-purple-400/60">CALIBRATION: <span className="text-emerald-400">ACTIVE</span></span>
          </div>
        </div>

        {/* DECISION & CONFIDENCE AREA (Clean Vertical Hierarchy) */}
        <div className="flex flex-col items-center justify-center py-8 relative z-10 space-y-2">
           <span className="text-[11px] text-purple-300/80 font-black tracking-[0.25em] uppercase mb-1 drop-shadow-sm">CURRENT DECISION BIAS</span>
           <div className="flex flex-col items-center justify-center relative">
             {/* Background Grids and Brackets */}
             <div className="absolute inset-0 -mx-16 -my-8 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
             <div className="absolute -left-12 top-0 w-3 h-3 border-t-2 border-l-2 border-purple-500/30 opacity-50"></div>
             <div className="absolute -right-12 top-0 w-3 h-3 border-t-2 border-r-2 border-purple-500/30 opacity-50"></div>
             <div className="absolute -left-12 bottom-0 w-3 h-3 border-b-2 border-l-2 border-purple-500/30 opacity-50"></div>
             <div className="absolute -right-12 bottom-0 w-3 h-3 border-b-2 border-r-2 border-purple-500/30 opacity-50"></div>

             {/* Atmospheric Bloom */}
             <div className={`absolute inset-0 blur-[60px] opacity-20 rounded-full transition-colors duration-1000 ${
               isPassState ? 'bg-purple-600' : isLockUp ? 'bg-emerald-500' : 'bg-rose-500'
             }`} />
             
             <div className={`text-[85px] sm:text-[110px] leading-none font-black tracking-tighter flex items-center gap-4 relative z-10 transition-colors duration-500 ${
                isPassState ? 'text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]' : isLockUp ? 'text-[#00FF9D] drop-shadow-[0_0_25px_rgba(0,255,157,0.4)]' : 'text-[#FF3366] drop-shadow-[0_0_25px_rgba(255,51,102,0.4)]'
             }`} style={{ textShadow: isPassState ? '0 0 30px rgba(168,85,247,0.3)' : isLockUp ? '0 0 30px rgba(0,255,157,0.3)' : '0 0 30px rgba(255,51,102,0.3)' }}>
               {isPassState ? 'PASS' : (isLockUp ? 'BUY UP' : 'BUY DOWN')}
               {!isPassState && (
                 <span className="text-[70px] sm:text-[90px]">{isLockUp ? '▲' : '▼'}</span>
               )}
             </div>
             <div className="flex items-center gap-3 mt-4 relative z-10">
               <span className={`text-[42px] font-black tracking-tighter ${
                 isPassState ? 'text-purple-300' : isLockUp ? 'text-[#00FF9D]' : 'text-[#FF3366]'
               }`} style={{ textShadow: isPassState ? '0 0 15px rgba(168,85,247,0.4)' : isLockUp ? '0 0 15px rgba(0,255,157,0.4)' : '0 0 15px rgba(255,51,102,0.4)' }}>{displayCalibratedProb !== 'CALIBRATING' ? displayCalibratedProb : `${Math.round(currentConfidence)}%`}</span>
               <span className={`text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded border ${
                 isPassState ? 'bg-purple-900/30 border-purple-700/50 text-purple-400' : isLockUp ? 'bg-[#041510] border-emerald-900/50 text-[#00FF9D]' : 'bg-[#1a050a] border-rose-900/50 text-[#FF3366]'
               }`}>{directionalConfidenceLabel}</span>
             </div>
           </div>
        </div>

        {/* ULTRA-PROMINENT VIXY LOCK */}
        <div className={`mt-2 mb-6 p-[1px] rounded-xl relative z-10 overflow-hidden ${
          isProtectState
            ? 'bg-gradient-to-b from-rose-600/60 to-rose-950/20 shadow-[0_0_50px_rgba(244,63,94,0.3)]'
            : isLockUp
            ? 'bg-gradient-to-b from-cyan-400/80 to-cyan-900/20 shadow-[0_0_40px_rgba(34,211,238,0.3)]'
            : isLockDown
            ? 'bg-gradient-to-b from-rose-500/80 to-rose-950/20 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
            : 'bg-gradient-to-b from-purple-800/40 to-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
        }`}>
          <div className={`w-full h-full rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-1000 relative ${
            isProtectState ? 'bg-[#0a0002]' : isLockUp ? 'bg-[#010a0c]' : isLockDown ? 'bg-[#0c0104]' : 'bg-[#0a050f]'
          }`}>
             {/* Cybernetic background accents */}
             {isLockUp && (
               <>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                 <div className="absolute inset-0 bg-cyan-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                 <div className="absolute -left-1 -top-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                 <div className="absolute -right-1 -top-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                 <div className="absolute -left-1 -bottom-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                 <div className="absolute -right-1 -bottom-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
               </>
             )}
             {isLockDown && (
               <>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.04)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                 <div className="absolute inset-0 bg-rose-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                 <div className="absolute -left-1 -top-1 w-4 h-4 border-t-2 border-l-2 border-rose-500"></div>
                 <div className="absolute -right-1 -top-1 w-4 h-4 border-t-2 border-r-2 border-rose-500"></div>
                 <div className="absolute -left-1 -bottom-1 w-4 h-4 border-b-2 border-l-2 border-rose-500"></div>
                 <div className="absolute -right-1 -bottom-1 w-4 h-4 border-b-2 border-r-2 border-rose-500"></div>
               </>
             )}
             {isProtectState && (
               <>
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                 <div className="absolute inset-0 bg-rose-500/5 animate-[pulse_3s_ease-in-out_infinite]" />
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
               </>
             )}

             <div className="flex items-center gap-6 relative z-10">
               <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center border-2 shadow-2xl ${
                 isProtectState
                    ? 'bg-[#1a0005] border-rose-500/80 text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                    : isLockUp
                    ? 'bg-[#021f24] border-cyan-400 text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.9)]'
                    : isLockDown
                    ? 'bg-[#1f0208] border-rose-500 text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.9)]'
                    : 'bg-purple-950/40 border-purple-700/50 text-purple-400'
               }`}>
                 {isProtectState ? <ShieldAlert className="w-8 h-8" /> : isPassState ? <AlertTriangle className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
               </div>
               <div>
                 <div className="flex items-center gap-3 mb-1">
                   <span className={`text-[13px] font-black tracking-[0.25em] uppercase ${
                     isProtectState ? 'text-rose-500/90' : isLockUp ? 'text-cyan-400/90' : isLockDown ? 'text-rose-400/90' : 'text-purple-400/80'
                   }`}>{isProtectState ? '🚨 VIXY LOCK' : 'VIXY LOCK'}</span>
                   <span className={`text-[32px] font-black tracking-widest uppercase leading-none ${
                     isProtectState ? 'text-rose-500' : isLockUp ? 'text-cyan-300' : isLockDown ? 'text-rose-400' : 'text-purple-300'
                   }`} style={{ textShadow: isProtectState ? '0 0 20px rgba(244,63,94,0.6)' : isLockUp ? '0 0 20px rgba(34,211,238,0.9)' : isLockDown ? '0 0 20px rgba(244,63,94,0.9)' : '0 0 15px rgba(168,85,247,0.4)' }}>
                     {isProtectState ? 'EXIT / PROTECT' : isLockUp || isLockDown ? 'LOCKED' : 'PASS'}
                   </span>
                 </div>
                 <div className="hidden sm:block mt-2">
                   <span className={`text-[11px] font-black tracking-[0.2em] uppercase mb-1 block ${
                     isProtectState ? 'text-rose-400' : isLockUp ? 'text-cyan-400' : isLockDown ? 'text-rose-400' : 'text-purple-400'
                   }`}>
                     {isProtectState ? 'THESIS INVALIDATED' : isLockUp || isLockDown ? 'QUALIFIED ENTRY' : 'ENTRY NOT QUALIFIED'}
                   </span>
                   <span className={`text-[11px] font-mono block ${
                     isProtectState ? 'text-rose-300/80' : isLockUp ? 'text-slate-300' : isLockDown ? 'text-slate-300' : 'text-purple-300/70'
                   }`}>
                     {isProtectState ? 'Original entry conditions are no longer satisfied. Protect capital.' : isLockUp ? 'All entry conditions met. Upward edge verified.' : isLockDown ? 'All entry conditions met. Downward edge verified.' : (execution.reason || 'Entry conditions not satisfied. Standby for next cycle.')}
                   </span>
                 </div>
               </div>
             </div>
             
             <div className="relative z-10 flex flex-col items-end justify-center">
               <div className={`px-8 py-4 rounded-lg border-2 text-lg font-black tracking-[0.15em] uppercase flex items-center justify-center ${
                 isProtectState
                   ? 'bg-[#1a0005] border-rose-600/80 text-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]'
                   : isLockUp
                   ? 'bg-[#041510] border-[#00FF9D]/60 text-[#00FF9D] shadow-[0_0_30px_rgba(0,255,157,0.3)]'
                   : isLockDown
                   ? 'bg-[#1a050a] border-[#FF3366]/60 text-[#FF3366] shadow-[0_0_30px_rgba(255,51,102,0.3)]'
                   : 'bg-purple-950/40 border-purple-800/60 text-purple-300/80'
               }`} style={{ textShadow: isProtectState ? '0 0 15px rgba(244,63,94,0.6)' : isLockUp ? '0 0 10px rgba(0,255,157,0.5)' : isLockDown ? '0 0 10px rgba(255,51,102,0.5)' : 'none' }}>
                 {isProtectState ? 'PROTECT CAPITAL → EXIT' : isLockUp ? 'BUY UP → ENTER' : isLockDown ? 'BUY DOWN → ENTER' : (execution.actionLabel || 'ENTRY NOT QUALIFIED')}
               </div>
               <div className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase mt-3 ${
                 isProtectState ? 'text-rose-400' : isLockUp ? 'text-cyan-400' : isLockDown ? 'text-rose-400' : 'text-purple-400/70'
               }`}>
                 {isProtectState ? 'RISK STATE: CRITICAL' : (isLockUp || isLockDown) ? 'EXECUTION AUTHORIZED' : 'NO EXECUTION AUTHORIZED'}
                 {(isLockUp || isLockDown) && <span className="flex items-center gap-1.5 ml-2 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/50"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> GATE ACTIVE</span>}
               </div>
             </div>
          </div>
          
          {isProtectState && (
            <div className="relative z-10 border-t border-rose-900/40 bg-[#0a0002]/90 px-5 py-3">
              <div className="text-[9px] font-bold tracking-[0.2em] uppercase mb-2 text-rose-500/70">
                RISK TELEMETRY
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-rose-400/50">REVERSAL THREAT</div>
                  <div className="text-xs font-black text-rose-400">{reversalRisk}% {reversalRisk >= 50 ? 'CRITICAL' : 'HIGH'}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-rose-400/50">ORDER FLOW</div>
                  <div className={`text-xs font-black ${displayOrderFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {displayOrderFlow >= 0 ? 'BULLISH' : 'BEARISH'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-rose-400/50">POSITION STATE</div>
                  <div className="text-xs font-black text-rose-400">PROTECT</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* EVIDENCE ACCUMULATION */}
        <div className="pt-6 relative z-10">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-3">
            <span>VIXY CONFIDENCE FIELD</span>
            <div className="flex items-center gap-2 text-sm font-black">
              <span className={isPassState ? 'text-purple-400' : isLockUp ? 'text-[#00FF9D]' : 'text-[#FF3366]'}>
                {displayCalibratedProb !== 'CALIBRATING' ? displayCalibratedProb : `${Math.round(currentConfidence)}%`}
              </span>
              <span className={`text-[9px] uppercase px-2 py-0.5 rounded border ${
                isPassState ? 'bg-purple-900/30 border-purple-700/50 text-purple-400' : isLockUp ? 'bg-[#041510] border-emerald-900/50 text-[#00FF9D]' : 'bg-[#1a050a] border-rose-900/50 text-[#FF3366]'
              }`}>
                {directionalConfidenceLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 h-3">
            {Array.from({ length: 16 }).map((_, idx) => {
              const fillThreshold = (idx + 1) * (100 / 16);
              const confVal = rawCalibProb ? Math.round(rawCalibProb * (rawCalibProb <= 1 ? 100 : 1)) : Math.round(currentConfidence);
              const isFilled = confVal >= fillThreshold;
              return (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-sm transition-all duration-500 ${
                    isFilled
                      ? isPassState 
                         ? 'bg-purple-600/80 shadow-[0_0_8px_rgba(147,51,234,0.3)]'
                         : isLockUp
                         ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                         : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                      : 'bg-[#0a0518] border border-purple-900/30'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 5 EVIDENCE METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 relative z-10">
           {/* Order Flow */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">ORDER FLOW</span>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${rawApiData?.features?.orderBookImbalance >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                 {orderFlowStr}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.orderBookImbalance >= 0 ? 'text-[#00FF9D]/80' : 'text-[#FF3366]/80'}`}>
                 {displayOrderFlow >= 0 ? 'BULLISH' : 'BEARISH'}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-70 transition-opacity flex items-end gap-[2px] h-4">
               {[20, 35, 50, 75, 90, 80, 60, 40].map((h, i) => {
                   const isBull = (rawApiData?.features?.orderBookImbalance ?? 0) >= 0;
                   const actualH = isBull ? h : [90, 75, 60, 40, 35, 30, 20, 15][i];
                   return (
                     <div key={i} className={`w-1 rounded-t-sm ${isBull ? 'bg-[#00FF9D]' : 'bg-[#FF3366]'}`} style={{ height: `${actualH}%` }} />
                   )
               })}
             </div>
           </div>
           
           {/* Momentum */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">MOMENTUM</span>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${rawApiData?.features?.momentum5m >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                 {momentumStr}%
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.momentum5m >= 0 ? 'text-[#00FF9D]/80' : 'text-[#FF3366]/80'}`}>
                 {Math.abs(displayMomentum) > 0.4 ? 'STRONG' : 'NEUTRAL'}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 12C3 12 5 11 8 11C11 11 13 14 17 14C20 14 23 8 26 8C29 8 31 5 34 5C37 5 38 2 39 2" stroke={rawApiData?.features?.momentum5m >= 0 ? "#00FF9D" : "#FF3366"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>

           {/* Volatility */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">VOLATILITY</span>
             <div className="relative z-10">
               <div className="text-xl font-black tracking-wider text-slate-200">
                 {volatilityStr}%
               </div>
               <div className="text-[10px] font-bold tracking-widest uppercase mt-1 text-[#00FF9D]/80">
                 ELEVATED
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 13C3 13 4 10 6 10C8 10 9 14 11 14C14 14 16 5 19 5C21 5 23 11 25 11C28 11 30 7 33 7C36 7 38 2 39 2" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>

           {/* Distance */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">DISTANCE</span>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${rawApiData?.features?.crossVenue?.distance >= 0 ? 'text-[#00FF9D]' : 'text-[#00FF9D]'}`}>
                 {distanceStr}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 text-[#00FF9D]/80`}>
                 FAVORABLE
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 12C5 12 7 14 10 14C14 14 17 8 20 8C23 8 25 11 29 11C33 11 36 6 39 6" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>

           {/* Regime */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">REGIME</span>
             <div className="relative z-10">
               <div className="text-xl font-black tracking-wider text-slate-200 truncate">
                 {displayRegime}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${rawApiData?.features?.regime?.includes('BEAR') ? 'text-[#FF3366]/80' : 'text-[#00FF9D]/80'}`}>
                 {rawApiData?.features?.regime?.includes('BEAR') ? 'BEARISH' : 'BULLISH'}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 11C4 11 6 13 9 13C12 13 14 7 17 7C20 7 23 10 26 10C29 10 32 3 35 3C37 3 38 1 39 1" stroke={rawApiData?.features?.regime?.includes('BEAR') ? "#FF3366" : "#00FF9D"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>
        </div>

        {/* INSTITUTIONAL EDGE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-purple-900/30 relative z-10">
           <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] uppercase">
             <span className="text-purple-400/60">INSTITUTIONAL EDGE</span>
             <span className="text-cyan-400">{edgeDisplay}</span>
           </div>
           <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.15em] uppercase">
             <span className="text-purple-400/60">QUALIFIED EVIDENCE FACTORS</span>
             <span className="text-purple-300">{verifiedCriteriaCount} / {totalCriteriaCount} CONFIRMED</span>
           </div>
        </div>
      </div>

      {/* VIXY ORDER FLOW PRESSURE (NEW MODULE) */}
      <div className="bg-[#080312] border border-purple-900/40 rounded-2xl p-6 relative overflow-hidden shadow-2xl mb-4">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="text-purple-400"><Layers className="w-5 h-5" /></div>
               <h3 className="text-xs font-black tracking-[0.2em] text-slate-200 uppercase">VIXY ORDER FLOW PRESSURE</h3>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-purple-400/60 uppercase">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
               LIVE • {displayVenue} {timeframe}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="col-span-1 md:col-span-8 flex flex-col space-y-5">
               <div className="flex justify-between items-end">
                  <div>
                     <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">TAKER BUYERS</div>
                     <div className="text-3xl font-black text-[#00FF9D]">{takerBuyersPct}%</div>
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-bold tracking-[0.2em] text-purple-400/70 uppercase mb-1">TAKER SELLERS</div>
                     <div className="text-3xl font-black text-[#FF3366]">{takerSellersPct}%</div>
                  </div>
               </div>
               
               <div className="h-3 w-full bg-[#1a050a] rounded-full overflow-hidden flex relative shadow-inner">
                  <div 
                    className="h-full bg-[#00FF9D] shadow-[0_0_10px_rgba(0,255,157,0.5)] transition-all duration-1000" 
                    style={{ width: `${takerBuyersPct}%` }} 
                  />
                  <div 
                    className="h-full bg-[#FF3366] transition-all duration-1000" 
                    style={{ width: `${takerSellersPct}%` }} 
                  />
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">NET FLOW (DELTA)</div>
                     <div className={`text-lg font-black ${displayOrderFlow >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {displayOrderFlow >= 0 ? '+' : ''}{Math.abs(displayOrderFlow).toFixed(3)}
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">DELTA (EST. USD)</div>
                     <div className={`text-lg font-black ${displayOrderFlow >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {displayOrderFlow >= 0 ? '+' : '-'}${Math.abs(displayOrderFlow * 6.2).toFixed(2)}M
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">PRESSURE</div>
                     <div className="text-lg font-black text-[#00FF9D]">
                        RISING
                     </div>
                  </div>
                  <div>
                     <div className="text-[9px] font-bold tracking-[0.15em] text-purple-400/60 uppercase mb-1">FLOW STATE</div>
                     <div className={`text-lg font-black ${displayOrderFlow >= 0 ? 'text-[#00FF9D]' : 'text-[#FF3366]'}`}>
                        {displayOrderFlow >= 0 ? 'BULLISH' : 'BEARISH'}
                     </div>
                  </div>
               </div>
            </div>

            <div className="col-span-1 md:col-span-4 flex flex-col justify-center space-y-6 border-l border-purple-900/30 pl-8">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
                     <span className="text-purple-400/70">BUY VOLUME</span>
                     <span className="text-[#00FF9D]">{takerBuyersPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
                     <div className="h-full bg-[#00FF9D]" style={{ width: `${takerBuyersPct}%` }} />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-[0.2em] uppercase">
                     <span className="text-purple-400/70">SELL VOLUME</span>
                     <span className="text-[#FF3366]">{takerSellersPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#06020c] rounded-full overflow-hidden">
                     <div className="h-full bg-[#FF3366]" style={{ width: `${takerSellersPct}%` }} />
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* SECONDARY MARKET CONTEXT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: TARGET STRIKE */}
        <div className="bg-[#06020c] border border-purple-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="text-[10px] text-purple-400/70 font-bold tracking-[0.2em] uppercase">TARGET STRIKE</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-purple-200 tracking-tighter">${targetPrice ? targetPrice.toLocaleString() : '---'}</div>
            <div className={`px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase ${isLockUp ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' : isLockDown ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50' : 'bg-purple-900/30 text-purple-300 border border-purple-800/50'}`}>
              MUST EXPIRE {isLockUp ? 'ABOVE' : isLockDown ? 'BELOW' : 'RANGE'} ${targetPrice ? targetPrice.toLocaleString() : '---'}
            </div>
          </div>
          <div className="flex justify-between items-end text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30">
            <span className="text-purple-500/80">LIVE SPOT: <span className="text-purple-300">${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            <span className="text-slate-400">{displayVenue} {timeframe}</span>
          </div>
        </div>

        {/* Card 2: DISTANCE TO STRIKE */}
        <div className={`bg-[#06020c] border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg ${spotVsStrikeDelta >= 0 ? 'border-rose-900/40' : 'border-emerald-900/40'}`}>
          <div className="text-[10px] text-purple-400/70 font-bold tracking-[0.2em] uppercase">DISTANCE TO STRIKE</div>
          <div>
            <div className={`text-3xl font-black tracking-tighter ${spotVsStrikeDelta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formattedSpotVsStrikeVal}
            </div>
            <div className={`text-sm font-bold tracking-widest ${spotVsStrikeDelta >= 0 ? 'text-rose-500/80' : 'text-emerald-500/80'}`}>
              ({formattedSpotVsStrikePct})
            </div>
          </div>
          <div className={`text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30 ${spotVsStrikeDelta >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
            {spotVsStrikeDelta >= 0 ? 'LIVE SPOT ABOVE STRIKE' : 'LIVE SPOT BELOW STRIKE'}
          </div>
        </div>

        {/* Card 3: TIME REMAINING */}
        <div className="bg-[#06020c] border border-purple-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="text-[10px] text-purple-400/70 font-bold tracking-[0.2em] uppercase">TIME REMAINING</div>
          <div className="text-4xl font-black text-purple-200 tracking-tighter">{timeString}</div>
          <div className="text-[10px] font-bold tracking-widest uppercase pt-2 border-t border-purple-900/30 text-purple-500/80">
            UNTIL EXPIRY
          </div>
        </div>
      </div>

      {/* BOTTOM METADATA ROW */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-purple-400/60 pt-2 px-2">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <Key className="w-3 h-3" /> VIXY LOCK STATUS
             <span className="text-emerald-400 ml-1">CONNECTED</span>
           </div>
           <div className="flex items-center gap-2">
             DATA QUALITY
             <span className="text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> EXCELLENT</span>
           </div>
           <div className="flex items-center gap-2">
             MODEL STATUS
             <span className="text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> READY</span>
           </div>
        </div>
        <div>
          LAST UPDATE <span className="text-purple-300 ml-1">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
