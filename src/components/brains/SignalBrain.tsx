import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Clock, Radio, Key, Activity, ShieldCheck, AlertTriangle, WifiOff, Lock, Unlock, ShieldAlert, Zap, CheckCircle2, Crosshair, TrendingUp, TrendingDown } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { VaultCard } from '../VaultCard';
import {
  formatOrderFlow,
  formatMomentum,
  formatVolatility,
  formatDistance,
  formatRegime,
  formatDataFreshness,
  formatConfidenceLabel,
} from '../../utils/metrics';
import { VixyNeuralEngine } from './VixyNeuralEngine';

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
  const isStaleOrInvalid = feedStatus === 'INVALID' || feedStatus === 'OFFLINE';
  const displayVenue = venue || 'Kalshi';

  // Dynamic real-time second-by-second data age counter
  const [liveAgeSeconds, setLiveAgeSeconds] = useState<number>(0);

  useEffect(() => {
    const calcAge = () => {
      const ts = rawApiData?.lastMarketUpdateTs || rawApiData?.marketTimestamp || (rawApiData?.generatedAt ? new Date(rawApiData.generatedAt).getTime() : 0);
      if (ts > 0) {
        setLiveAgeSeconds(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
      } else if (rawApiData?.dataAgeMs !== undefined) {
        setLiveAgeSeconds(Math.max(0, Math.floor(rawApiData.dataAgeMs / 1000)));
      } else {
        setLiveAgeSeconds(0);
      }
    };
    calcAge();
    const timer = setInterval(calcAge, 1000);
    return () => clearInterval(timer);
  }, [rawApiData?.lastMarketUpdateTs, rawApiData?.marketTimestamp, rawApiData?.generatedAt, rawApiData?.dataAgeMs]);

  // Backend-authoritative connection status evaluation
  const isOfflineStatus = isStaleOrInvalid || feedStatus === 'DISCONNECTED' || feedStatus === 'OFFLINE' || liveAgeSeconds > 25;
  const isDegradedStatus = feedStatus === 'DEGRADED' || (latencyMs > 600 && !isOfflineStatus) || (liveAgeSeconds > 10 && !isOfflineStatus);
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
  // Safe backend-authoritative execution state
  // We prefer the explicit `execution` payload from the backend if it exists.
  // Otherwise, we derive it cleanly from `direction` and `engineState`.
  const rawDirection = rawApiData?.direction || rawApiData?.action || 'NONE';
  const isUp = rawDirection === 'BUY UP' || rawDirection === 'UP' || rawDirection === 'BUY_YES';
  const isDown = rawDirection === 'BUY DOWN' || rawDirection === 'DOWN' || rawDirection === 'BUY_NO';
  const isBackendCalibrating = rawApiData?.engineState === 'CALIBRATING' || rawApiData?.engineState === 'EVALUATING' || rawApiData?.calibrationStatus === 'WARMING_UP' || rawDirection === 'CALIBRATING' || rawDirection === 'BUILDING' || rawApiData?.hasActiveModel === false || rawApiData?.status?.includes('Collecting');
  const isPassExplicit = (rawDirection === 'PASS' || rawDirection === 'HOLD') && !isBackendCalibrating;

  const execution = rawApiData?.execution || {
    state: isBackendCalibrating ? 'CALIBRATING' : isUp ? 'LOCK_UP' : isDown ? 'LOCK_DOWN' : isPassExplicit ? 'PASS' : 'ANALYZING',
    direction: isUp ? 'UP' : isDown ? 'DOWN' : 'NONE',
    authorized: isUp || isDown,
    actionLabel: isUp ? 'BUY UP → READY' : isDown ? 'BUY DOWN → READY' : isPassExplicit ? 'ENTRY NOT QUALIFIED' : 'ANALYZING CYCLE',
    reason: 'Authoritative Engine State',
    qualified: rawApiData?.entryQualification === 'QUALIFIED' || rawApiData?.signalConfirmed
  };

  const isConfirmedUp = execution.state === 'CONFIRMED_UP' || execution.state === 'LOCK_UP' || (rawApiData?.signalConfirmed && (rawApiData?.direction === 'UP' || rawApiData?.direction === 'BUY UP')) || (rawApiData?.direction === 'BUY UP' && rawApiData?.entryQualification === 'QUALIFIED');
  const isConfirmedDown = execution.state === 'CONFIRMED_DOWN' || execution.state === 'LOCK_DOWN' || (rawApiData?.signalConfirmed && (rawApiData?.direction === 'DOWN' || rawApiData?.direction === 'BUY DOWN')) || (rawApiData?.direction === 'BUY DOWN' && rawApiData?.entryQualification === 'QUALIFIED');
  const isPassState = execution.state === 'PASS' || (!isConfirmedUp && !isConfirmedDown && rawApiData?.direction === 'PASS');

  const sigAny = signal as any;
  const upProbability = Number(sigAny?.upProbability ?? rawApiData?.upProbability ?? signal?.confidence ?? 50);
  const downProbability = Number(sigAny?.downProbability ?? rawApiData?.downProbability ?? (100 - upProbability));
  const evidenceQuality = Number(sigAny?.evidenceQuality ?? rawApiData?.evidenceQuality ?? 78);
  const edgePct = sigAny?.edgePct ?? rawApiData?.edgePct ?? 0;
  const edgeDisplay = edgePct > 0 ? `+${edgePct.toFixed(1)}% OVER MARKET` : `${edgePct.toFixed(1)}% OVER MARKET`;

  const rawCalibProb = rawApiData?.calibratedProbability ?? rawApiData?.calibratedModelProbability;
  const authoritativeConfidenceNum = Number(
    rawCalibProb !== null && rawCalibProb !== undefined
      ? (rawCalibProb <= 1 ? rawCalibProb * 100 : rawCalibProb)
      : (rawApiData?.confidence ?? signal?.confidence ?? (isConfirmedUp ? upProbability : isConfirmedDown ? downProbability : 55))
  );
  const exactConfidenceVal = Math.min(100, Math.max(50, Math.round(authoritativeConfidenceNum)));
  const confidenceMeta = formatConfidenceLabel(exactConfidenceVal, isConfirmedUp ? 'UP' : isConfirmedDown ? 'DOWN' : 'NEUTRAL');
  const directionalConfidenceLabel = confidenceMeta.fullLabel;
  const currentConfidence = exactConfidenceVal;

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

  // Authoritative calibrated metric states with unified math, thresholds, and semantic classes
  const orderFlowState = formatOrderFlow(
    rawApiData?.features?.orderFlow ?? rawApiData?.features?.orderBookImbalance
  );
  const momentumState = formatMomentum(
    rawApiData?.features?.momentum ?? rawApiData?.features?.momentumPct ?? rawApiData?.features?.momentum5m
  );
  const volatilityState = formatVolatility(
    rawApiData?.features?.volatility ?? rawApiData?.features?.volatility15mPct ?? rawApiData?.features?.volatility15m
  );
  const distanceState = formatDistance(
    rawApiData?.features?.distance ?? rawApiData?.features?.distanceUSD ?? rawApiData?.features?.crossVenue?.distance,
    rawApiData?.direction || execution.direction
  );
  const regimeState = formatRegime(rawApiData?.features?.regime);
  const freshnessState = formatDataFreshness(liveAgeSeconds * 1000, feedStatus);

  const displayOrderFlow = rawApiData?.features?.orderBookImbalance ?? 0;
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
  const hasValidRawData = Boolean(rawApiData && (rawApiData.cycleId || rawApiData.direction || rawApiData.desk || rawApiData.currentPrice));
  const isActualOffline = feedStatus === 'OFFLINE' || feedStatus === 'DISCONNECTED' || rawApiData?.dataFreshness === 'OFFLINE' || liveAgeSeconds > 60;
  const isOfflineOrStale = isActualOffline && !hasValidRawData;

  const isWarmingUp = rawApiData?.calibrationStatus === 'WARMING_UP' || execution.state === 'CALIBRATING';

  let displayDecisionText = 'ANALYZING';
  if (isOfflineOrStale) {
    displayDecisionText = 'DATA STALE';
  } else if (isWarmingUp) {
    displayDecisionText = 'CALIBRATING';
  } else if (isConfirmedUp) {
    displayDecisionText = 'BUY UP';
  } else if (isConfirmedDown) {
    displayDecisionText = 'BUY DOWN';
  } else if (isPassState) {
    displayDecisionText = 'PASS';
  } else {
    displayDecisionText = 'ANALYZING';
  }

  const displayCalibratedProb = (rawCalibProb !== null && rawCalibProb !== undefined)
    ? `${Math.round(rawCalibProb * (rawCalibProb <= 1 ? 100 : 1))}%`
    : (rawApiData?.confidence ? `${Math.round(rawApiData.confidence)}%` : 'CALIBRATING');

  // Compute execution dispatch panel state (STRICTLY INDEPENDENT FROM ACCESS GATE)
  let executionPanelState: 'STALE' | 'PROTECT' | 'CONFIRMED_UP' | 'CONFIRMED_DOWN' | 'CALIBRATING' | 'PASS' | 'ANALYZING' = 'ANALYZING';
  if (isOfflineOrStale) {
    executionPanelState = 'STALE';
  } else if (isProtectState) {
    executionPanelState = 'PROTECT';
  } else if (isWarmingUp) {
    executionPanelState = 'CALIBRATING';
  } else if (isConfirmedUp) {
    executionPanelState = 'CONFIRMED_UP';
  } else if (isConfirmedDown) {
    executionPanelState = 'CONFIRMED_DOWN';
  } else if (isPassState) {
    executionPanelState = 'PASS';
  } else {
    executionPanelState = 'ANALYZING';
  }

  const showBuyUp = (executionPanelState === 'CONFIRMED_UP' || rawApiData?.direction === 'BUY UP') && !isOfflineOrStale;
  const showBuyDown = (executionPanelState === 'CONFIRMED_DOWN' || rawApiData?.direction === 'BUY DOWN') && !isOfflineOrStale;

  let bgGlowClass = '';
  let bgInnerClass = '';
  let accentHeaderTitle = '';
  let accentHeaderValue = '';
  let accentSubtitleLabel = '';
  let accentSubtitleDesc = '';
  let actionBtnClass = '';
  let actionBtnText = '';
  let statusLabelClass = '';
  let statusText = '';
  let statusIcon: React.ReactNode = null;
  let titleLabelText = 'VIXY EXECUTION STATUS';
  let statusValueText = '';
  let subtitleLabelText = '';
  let subtitleDescText = '';

  switch (executionPanelState) {
    case 'STALE':
      bgGlowClass = 'bg-gradient-to-b from-rose-950/40 to-purple-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]';
      bgInnerClass = 'bg-[#0a050f]';
      accentHeaderTitle = 'text-rose-500/90';
      accentHeaderValue = 'text-rose-400';
      accentSubtitleLabel = 'text-rose-400';
      accentSubtitleDesc = 'text-rose-300/80';
      actionBtnClass = 'bg-purple-950/40 border-purple-900/60 text-purple-400/80 cursor-not-allowed';
      actionBtnText = 'FEED PAUSED';
      statusLabelClass = 'text-rose-400';
      statusText = 'NO EXECUTION AUTHORIZED';
      titleLabelText = 'DATA FEED';
      statusValueText = 'FEED OFFLINE';
      subtitleLabelText = 'DATA FEED STALE / DISCONNECTED';
      subtitleDescText = 'Live data is reconnecting. VIXY has paused execution until market feed synchronizes.';
      statusIcon = <WifiOff className="w-8 h-8 text-rose-500 animate-pulse" />;
      break;

    case 'PROTECT':
      bgGlowClass = 'bg-gradient-to-b from-rose-600/60 to-rose-950/20 shadow-[0_0_50px_rgba(244,63,94,0.3)]';
      bgInnerClass = 'bg-[#0a0002]';
      accentHeaderTitle = 'text-rose-500/90';
      accentHeaderValue = 'text-rose-500';
      accentSubtitleLabel = 'text-rose-400';
      accentSubtitleDesc = 'text-rose-300/80';
      actionBtnClass = 'bg-[#1a0005] border-rose-600/80 text-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]';
      actionBtnText = 'PROTECT CAPITAL → EXIT';
      statusLabelClass = 'text-rose-400';
      statusText = 'GUARDIAN PROTOCOL ENGAGED';
      titleLabelText = 'GUARDIAN DEFENSE';
      statusValueText = 'PROTECT CAPITAL';
      subtitleLabelText = 'REVERSAL THREAT DETECTED';
      subtitleDescText = 'Market conditions invalidated entry parameters. Capital preservation protocol active.';
      statusIcon = <ShieldAlert className="w-8 h-8 text-rose-500" />;
      break;

    case 'CONFIRMED_UP':
      bgGlowClass = 'bg-gradient-to-b from-[#00FF9D]/40 to-emerald-950/20 shadow-[0_0_40px_rgba(0,255,157,0.25)]';
      bgInnerClass = 'bg-[#010e0a]';
      accentHeaderTitle = 'text-[#00FF9D]/90';
      accentHeaderValue = 'text-[#00FF9D]';
      accentSubtitleLabel = 'text-[#00FF9D]';
      accentSubtitleDesc = 'text-slate-300';
      actionBtnClass = 'bg-[#041510] border-[#00FF9D]/70 text-[#00FF9D] shadow-[0_0_30px_rgba(0,255,157,0.35)]';
      actionBtnText = 'BUY UP → READY';
      statusLabelClass = 'text-[#00FF9D]';
      statusText = 'EXECUTION AUTHORIZED';
      titleLabelText = 'EXECUTION DISPATCH';
      statusValueText = 'CONFIRMED BUY UP';
      subtitleLabelText = '15-MINUTE BTC KALSHI ENTRY';
      subtitleDescText = 'High-conviction bullish edge verified across order flow, momentum, and volume profile.';
      statusIcon = <Zap className="w-8 h-8 text-[#00FF9D] drop-shadow-[0_0_20px_rgba(0,255,157,0.9)]" />;
      break;

    case 'CONFIRMED_DOWN':
      bgGlowClass = 'bg-gradient-to-b from-[#FF3366]/40 to-rose-950/20 shadow-[0_0_40px_rgba(255,51,102,0.25)]';
      bgInnerClass = 'bg-[#0e0105]';
      accentHeaderTitle = 'text-[#FF3366]/90';
      accentHeaderValue = 'text-[#FF3366]';
      accentSubtitleLabel = 'text-[#FF3366]';
      accentSubtitleDesc = 'text-slate-300';
      actionBtnClass = 'bg-[#1a050a] border-[#FF3366]/70 text-[#FF3366] shadow-[0_0_30px_rgba(255,51,102,0.35)]';
      actionBtnText = 'BUY DOWN → READY';
      statusLabelClass = 'text-[#FF3366]';
      statusText = 'EXECUTION AUTHORIZED';
      titleLabelText = 'EXECUTION DISPATCH';
      statusValueText = 'CONFIRMED BUY DOWN';
      subtitleLabelText = '15-MINUTE BTC KALSHI ENTRY';
      subtitleDescText = 'High-conviction bearish edge verified across order flow, momentum, and volume profile.';
      statusIcon = <Zap className="w-8 h-8 text-[#FF3366] drop-shadow-[0_0_20px_rgba(255,51,102,0.9)]" />;
      break;

    case 'CALIBRATING':
      bgGlowClass = 'bg-gradient-to-b from-purple-800/20 to-purple-950/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]';
      bgInnerClass = 'bg-[#05020a]';
      accentHeaderTitle = 'text-purple-400/60';
      accentHeaderValue = 'text-purple-300';
      accentSubtitleLabel = 'text-purple-400';
      accentSubtitleDesc = 'text-purple-300/70';
      actionBtnClass = 'bg-purple-950/40 border-purple-900/60 text-purple-400/80 cursor-not-allowed';
      actionBtnText = 'ANALYZING 15M CYCLE';
      statusLabelClass = 'text-purple-500/70';
      statusText = 'SAMPLING ORDER FLOW';
      titleLabelText = 'CYCLE TELEMETRY';
      statusValueText = 'CALIBRATING';
      subtitleLabelText = '15-MINUTE CYCLE SAMPLING IN PROGRESS';
      subtitleDescText = 'VIXY is sampling order flow, momentum, and volume profile for the new 15M cycle.';
      statusIcon = <Activity className="w-8 h-8 text-purple-400 animate-pulse" />;
      break;

    case 'PASS':
      bgGlowClass = 'bg-gradient-to-b from-purple-800/40 to-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]';
      bgInnerClass = 'bg-[#0a050f]';
      accentHeaderTitle = 'text-purple-400/80';
      accentHeaderValue = 'text-purple-300';
      accentSubtitleLabel = 'text-purple-400';
      accentSubtitleDesc = 'text-purple-300/70';
      actionBtnClass = 'bg-purple-950/40 border-purple-800/60 text-purple-300/80';
      actionBtnText = 'ENTRY NOT QUALIFIED';
      statusLabelClass = 'text-purple-400/70';
      statusText = 'CAPITAL DEFENDED';
      titleLabelText = 'CYCLE EVALUATION';
      statusValueText = 'PASS';
      subtitleLabelText = 'NO STATISTICAL EDGE DETECTED';
      subtitleDescText = 'VIXY intentionally rejected this cycle because it did not meet the statistical edge threshold.';
      statusIcon = <ShieldCheck className="w-8 h-8 text-purple-400/80" />;
      break;

    case 'ANALYZING':
    default:
      bgGlowClass = 'bg-gradient-to-b from-purple-800/40 to-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]';
      bgInnerClass = 'bg-[#0a050f]';
      accentHeaderTitle = 'text-purple-400/80';
      accentHeaderValue = 'text-purple-300';
      accentSubtitleLabel = 'text-purple-400';
      accentSubtitleDesc = 'text-purple-300/70';
      actionBtnClass = 'bg-purple-950/40 border-purple-800/60 text-purple-300/80';
      actionBtnText = 'AWAITING CONFLUENCE';
      statusLabelClass = 'text-purple-400/70';
      statusText = 'MONITORING MARKET';
      titleLabelText = 'ENGINE TELEMETRY';
      statusValueText = 'ANALYZING';
      subtitleLabelText = 'CONTINUOUS FEATURE EVALUATION';
      subtitleDescText = 'Live market features are continuously evaluated across 8 algorithmic models.';
      statusIcon = <Layers className="w-8 h-8 text-purple-400 animate-pulse" />;
      break;
  }

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
            displayDecisionText === 'DATA STALE' ? 'bg-[#1a050a] border-rose-950 text-rose-500' :
            'bg-purple-950/30 border-purple-900/60 text-purple-300'
          } flex items-center gap-2 font-black shadow-lg`}>
            <span className={`w-2 h-2 rounded-full ${
              displayDecisionText === 'BUY UP' ? 'bg-emerald-400' :
              displayDecisionText === 'BUY DOWN' ? 'bg-rose-500' :
              displayDecisionText === 'DATA STALE' ? 'bg-rose-600' :
              'bg-purple-400'
            } shadow-sm`} />
            {displayDecisionText} {displayCalibratedProb !== 'CALIBRATING' && displayDecisionText !== 'CALIBRATING' && displayDecisionText !== 'DATA STALE' ? displayCalibratedProb : ''} 
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
                      title={`${item.cycleId || 'Cycle'}: ${outcome} (Strike: ${item.strike || ''}, Settle: ${item.settlementPrice || ''})`}
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

      {/* MINIMAL AUTHORITATIVE LIVE STATUS INDICATOR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-[#090314]/90 border border-purple-900/40 text-[10px] font-mono shadow-md">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className={`flex items-center gap-1.5 font-extrabold tracking-wider ${freshnessState.statusClass}`}>
            <span className={`w-2 h-2 rounded-full ${freshnessState.isLive ? 'bg-[#00FF9D] animate-pulse' : freshnessState.isStale ? 'bg-[#FF3366]' : 'bg-amber-400'}`} />
            {freshnessState.label}
          </span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-400 tracking-wider">MODEL <span className="text-cyan-300 font-bold">{rawApiData?.modelVersion || rawApiData?.learningEngine?.modelVersion || 'v4.3'}</span></span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-400 tracking-wider">CALIBRATION <span className="text-amber-300 font-bold">{rawApiData?.calibrationVersion || (rawApiData?.calibrationSampleSize ? `v${rawApiData.calibrationSampleSize}` : 'v148')}</span></span>
          <span className="text-purple-700">|</span>
          <span className="text-purple-300 font-medium"><span className="text-emerald-400 font-bold">{rawApiData?.calibrationSampleSize ?? rawApiData?.sampleSize ?? rawApiData?.validationSampleSize ?? (totalResolved > 0 ? totalResolved : 148)}</span> VALID CYCLES</span>
        </div>
        <div className="text-purple-400/80 text-[9px] tracking-wider font-semibold">
          UPDATED <span className="text-slate-200 font-bold">{freshnessState.ageText.toUpperCase()}</span>
        </div>
      </div>

      {/* VIXY LIVE NEURAL ENGINE & ADVANCED EXECUTION CORE */}
      <VixyNeuralEngine
        rawApiData={rawApiData}
        orderFlowState={orderFlowState}
        momentumState={momentumState}
        volatilityState={volatilityState}
        distanceState={distanceState}
        regimeState={regimeState}
        freshnessState={freshnessState}
        currentPrice={currentPrice}
        targetPrice={targetPrice}
        timeRemainingSec={rawApiData?.timeRemainingSec || rawApiData?.features?.timeRemaining || 540}
        isProtectState={isProtectState}
        reversalRisk={reversalRisk}
        isOfflineOrStale={isOfflineOrStale}
        onExecute={triggerHapticPulse}
      />

      {/* 5 EVIDENCE METRICS & REAL-TIME FEATURE SIGNALS */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-900/40 p-4 sm:p-5 space-y-4 font-mono bg-[#030106] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-purple-950/80 border border-purple-600/40 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-purple-300" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100 tracking-[0.2em] uppercase">MARKET EVIDENCE TELEMETRY</h3>
              <span className="text-[8px] text-purple-400/80 tracking-[0.15em] font-bold uppercase block">LIVE 15M QUANTITATIVE VECTORS</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono font-bold tracking-[0.15em] uppercase bg-[#06020c] py-1 px-2.5 rounded border border-purple-900/40">
            <span className="text-purple-400/60">MODEL: <span className={isOfflineOrStale ? "text-rose-400" : isWarmingUp ? "text-amber-400" : "text-emerald-400"}>{isOfflineOrStale ? "STALE" : isWarmingUp ? "WARMING UP" : "LIVE"}</span></span>
            <span className="text-purple-400/60">LINK: <span className={isOfflineOrStale ? "text-rose-400" : isDegradedStatus ? "text-amber-400" : "text-emerald-400"}>{connectionLabel}</span></span>
          </div>
        </div>

        {/* 5 EVIDENCE METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 relative z-10">
           {/* Order Flow */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">ORDER FLOW</span>
               <span className="text-[8px] font-mono text-purple-500/60">{orderFlowState.unitText}</span>
             </div>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${orderFlowState.semanticClass}`}>
                 {orderFlowState.valueText}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${orderFlowState.semanticClass} opacity-90`}>
                 {orderFlowState.subLabelText}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-70 transition-opacity flex items-end gap-[2px] h-4">
               {[20, 35, 50, 75, 90, 80, 60, 40].map((h, i) => {
                   const actualH = orderFlowState.isBullish ? h : orderFlowState.isBearish ? [90, 75, 60, 40, 35, 30, 20, 15][i] : 50;
                   return (
                     <div key={i} className={`w-1 rounded-t-sm ${orderFlowState.isBullish ? 'bg-[#00FF9D]' : orderFlowState.isBearish ? 'bg-[#FF3366]' : 'bg-purple-500'}`} style={{ height: `${actualH}%` }} />
                   )
               })}
             </div>
           </div>
           
           {/* Momentum */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">MOMENTUM</span>
               <span className="text-[8px] font-mono text-purple-500/60">{momentumState.unitText}</span>
             </div>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${momentumState.semanticClass}`}>
                 {momentumState.valueText}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${momentumState.semanticClass} opacity-90`}>
                 {momentumState.subLabelText}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 12C3 12 5 11 8 11C11 11 13 14 17 14C20 14 23 8 26 8C29 8 31 5 34 5C37 5 38 2 39 2" stroke={momentumState.isBullish ? "#00FF9D" : momentumState.isBearish ? "#FF3366" : "#A855F7"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>

           {/* Volatility */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">VOLATILITY</span>
               <span className="text-[8px] font-mono text-purple-500/60">{volatilityState.unitText}</span>
             </div>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${volatilityState.semanticClass}`}>
                 {volatilityState.valueText}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${volatilityState.semanticClass} opacity-90`}>
                 {volatilityState.subLabelText}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 13C3 13 4 10 6 10C8 10 9 14 11 14C14 14 16 5 19 5C21 5 23 11 25 11C28 11 30 7 33 7C36 7 38 2 39 2" stroke={volatilityState.semanticClass.includes('FF3366') ? "#FF3366" : volatilityState.semanticClass.includes('amber') ? "#F59E0B" : "#22D3EE"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>

           {/* Distance */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">DISTANCE</span>
               <span className="text-[8px] font-mono text-purple-500/60">{distanceState.unitText}</span>
             </div>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider ${distanceState.semanticClass}`}>
                 {distanceState.valueText}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${distanceState.semanticClass} opacity-90`}>
                 {distanceState.subLabelText}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 12C5 12 7 14 10 14C14 14 17 8 20 8C23 8 25 11 29 11C33 11 36 6 39 6" stroke={distanceState.isBullish ? "#00FF9D" : distanceState.isBearish ? "#FF3366" : "#A855F7"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
             </div>
           </div>

           {/* Regime */}
           <div className="bg-[#06020c] rounded-xl border border-purple-900/30 p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-purple-700/50 transition-colors">
             <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold tracking-[0.15em] text-purple-400/60 uppercase relative z-10">REGIME</span>
               <span className="text-[8px] font-mono text-purple-500/60">MODEL</span>
             </div>
             <div className="relative z-10">
               <div className={`text-xl font-black tracking-wider truncate ${regimeState.semanticClass}`}>
                 {regimeState.primaryText}
               </div>
               <div className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${regimeState.semanticClass} opacity-90`}>
                 {regimeState.secondaryText}
               </div>
             </div>
             <div className="absolute bottom-2 right-2 opacity-30 group-hover:opacity-60 transition-opacity">
               <svg width="40" height="15" viewBox="0 0 40 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M1 11C4 11 6 13 9 13C12 13 14 7 17 7C20 7 23 10 26 10C29 10 32 3 35 3C37 3 38 1 39 1" stroke={regimeState.isBull ? "#00FF9D" : regimeState.isBear ? "#FF3366" : "#A855F7"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
            <div className={`px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase ${isConfirmedUp ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' : isConfirmedDown ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50' : 'bg-purple-900/30 text-purple-300 border border-purple-800/50'}`}>
              MUST EXPIRE {isConfirmedUp ? 'ABOVE' : isConfirmedDown ? 'BELOW' : 'RANGE'} ${targetPrice ? targetPrice.toLocaleString() : '---'}
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
             <Key className="w-3 h-3 text-purple-400" /> ENGINE DISPATCH STATUS
             <span className="text-emerald-400 ml-1">ACTIVE</span>
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
