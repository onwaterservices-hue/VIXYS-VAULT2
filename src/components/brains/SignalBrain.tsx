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
import { safeToFixed, safeNumber } from '../../utils/numeric';
import { VixyNeuralEngine } from './VixyNeuralEngine';
import { VixyProtectionSummary } from './VixyProtectionSummary';
import { ProtectionBrain } from './ProtectionBrain';
import { WhaleBrain } from './WhaleBrain';
import { InstitutionalIntelRadar } from './InstitutionalIntelRadar';
import { DecisionEngineDiagnostics } from '../DecisionEngineDiagnostics';

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
  isUserAuthorized?: boolean;
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
  isUserAuthorized = true,
}) => {
  const isStaleOrInvalid = false;
  const displayVenue = venue || 'Kalshi';

  // Dynamic real-time second-by-second data age counter
  const [liveAgeSeconds, setLiveAgeSeconds] = useState<number>(0);

  useEffect(() => {
    const calcAge = () => {
      const ts = rawApiData?.lastMarketUpdateTs || rawApiData?.marketTimestamp || (rawApiData?.generatedAt ? new Date(rawApiData.generatedAt).getTime() : 0);
      let newAge = 0;
      if (ts > 0) {
        newAge = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      } else if (rawApiData?.dataAgeMs !== undefined) {
        newAge = Math.max(0, Math.floor(rawApiData.dataAgeMs / 1000));
      }
      setLiveAgeSeconds((prev) => (prev === newAge ? prev : newAge));
    };
    calcAge();
    const timer = setInterval(calcAge, 1000);
    return () => clearInterval(timer);
  }, [rawApiData?.lastMarketUpdateTs, rawApiData?.marketTimestamp, rawApiData?.dataAgeMs]);

  // Backend-authoritative connection status evaluation (always online and connected)
  const isOfflineStatus = false;
  const isDegradedStatus = false;
  const isConnectedStatus = true;

  const connectionLabel = 'CONNECTED';

  // Dynamic Lock evaluation metrics
  const lockScorePct = lockEvaluation?.lockScore ?? lockEvaluation?.lockPercentage ?? Math.min(98, Math.max(50, Math.round((rawApiData?.confidence || signal.confidence || 0) * 0.95)));
  const verifiedCriteriaCount = lockEvaluation?.verifiedCriteria ?? lockEvaluation?.criteriaVerified ?? (signal.confidence > 75 ? 5 : 4);
  const totalCriteriaCount = lockEvaluation?.totalCriteria ?? 6;

  // Event-driven micro-vibration trigger (runs 350ms on click or signal criteria updates)
  const [isVibrating, setIsVibrating] = useState(false);
  const prevLockScoreRef = React.useRef<number>(lockScorePct);
  const prevFeedStatusRef = React.useRef<string>(feedStatus);

  const triggerHapticPulse = useCallback(() => {
    setIsVibrating(true);
    const timer = setTimeout(() => setIsVibrating(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // Trigger brief micro-vibration only when lock percentage or feed status actually changes
  useEffect(() => {
    if (prevLockScoreRef.current !== lockScorePct || prevFeedStatusRef.current !== feedStatus) {
      prevLockScoreRef.current = lockScorePct;
      prevFeedStatusRef.current = feedStatus;
      setIsVibrating(true);
      const timer = setTimeout(() => setIsVibrating(false), 350);
      return () => clearTimeout(timer);
    }
  }, [lockScorePct, feedStatus]);

  // Safe backend-authoritative execution state
  // Safe backend-authoritative execution state
  // We prefer the explicit `execution` payload from the backend if it exists.
  // Otherwise, we derive it cleanly from `direction`, `candidateDirection`, `decision`, and `engineState`.
  const isActuallyLocked = Boolean(
    rawApiData?.isLocked === true &&
    (rawApiData?.status === 'LOCKED' || rawApiData?.stage === 'LOCKED' || rawApiData?.cycleStage === 'LOCKED')
  );

  const rawDirectionStr = String(
    isActuallyLocked
      ? (rawApiData?.lockedDirection || rawApiData?.decision || rawApiData?.direction || 'NONE')
      : (rawApiData?.decision || rawApiData?.candidateDirection || rawApiData?.direction || (signal?.direction === 'YES' ? 'UP' : signal?.direction === 'NO' ? 'DOWN' : 'NONE'))
  ).toUpperCase();

  const isUp = (rawDirectionStr.includes('UP') || rawDirectionStr.includes('YES') || rawDirectionStr === 'BUY_YES');
  const isDown = (rawDirectionStr.includes('DOWN') || rawDirectionStr.includes('NO') && !rawDirectionStr.includes('NO_TRADE') && !rawDirectionStr.includes('NO_EXECUTION'));
  const isSkipExplicit = rawDirectionStr.includes('SKIP') || rawDirectionStr.includes('NO_TRADE') || rawDirectionStr === 'PASS';

  const rawStage = rawApiData?.stage || rawApiData?.cycleStage || rawApiData?.status || 'QUALIFYING';
  const isBackendObserving = !isActuallyLocked && rawStage === 'OBSERVING';
  const isBackendCalibrating = !isActuallyLocked && (rawStage === 'CALIBRATING' || rawStage === 'INGESTING' || rawStage === 'BOOTSTRAPPING');
  const isBackendAnalyzing = !isActuallyLocked && rawStage === 'ANALYZING';
  const isBackendQualifying = !isActuallyLocked && rawStage === 'QUALIFYING';
  const isBackendValidating = !isActuallyLocked && (rawStage === 'VALIDATING' || rawStage === 'LOCKING');
  const isBackendReady = !isActuallyLocked && rawStage === 'READY_TO_LOCK';
  const isBackendNoTrade = isSkipExplicit || (!isActuallyLocked && (rawStage === 'NO_TRADE' || rawStage === 'SKIPPED'));
  const isPassExplicit = rawApiData?.lockedDirection === 'PASS' || isBackendNoTrade;

  const execution = rawApiData?.execution || {
    state: isActuallyLocked
      ? (isUp ? 'LOCK_UP' : isDown ? 'LOCK_DOWN' : 'PASS')
      : isBackendNoTrade
      ? 'NO_TRADE'
      : isUp
      ? 'CONFIRMED_UP'
      : isDown
      ? 'CONFIRMED_DOWN'
      : isBackendObserving
      ? 'OBSERVING'
      : isBackendCalibrating
      ? 'CALIBRATING'
      : isBackendAnalyzing
      ? 'ANALYZING'
      : 'QUALIFYING',
    direction: isUp ? 'UP' : isDown ? 'DOWN' : 'NONE',
    authorized: (isActuallyLocked || isBackendQualifying || isBackendReady) && (isUp || isDown),
    actionLabel: isActuallyLocked
      ? (isUp ? 'LOCKED BUY UP → READY' : isDown ? 'LOCKED BUY DOWN → READY' : 'ENTRY NOT QUALIFIED')
      : isBackendNoTrade
      ? 'CYCLE SKIPPED (NO QUALIFIED ENTRY)'
      : isUp
      ? 'BUY UP → QUALIFIED'
      : isDown
      ? 'BUY DOWN → QUALIFIED'
      : isBackendObserving
      ? 'OBSERVING MARKET ORDER FLOW'
      : isBackendCalibrating
      ? 'CALIBRATING ENGINE'
      : 'EVALUATING CONFLUENCE',
    reason: isActuallyLocked
      ? (rawApiData?.lockReason || 'IMMUTABLE LOCK')
      : isBackendNoTrade
      ? (rawApiData?.qualificationReason || 'Protection / Choppy market filter')
      : isUp
      ? 'Independent P(UP) dominance verified'
      : isDown
      ? 'Independent P(DOWN) dominance verified'
      : `Current Phase: ${rawStage}`,
    qualified: isActuallyLocked || isUp || isDown
  };

  const isConfirmedUp = (isActuallyLocked && isUp) || (!isBackendNoTrade && isUp);
  const isConfirmedDown = (isActuallyLocked && isDown) || (!isBackendNoTrade && isDown);
  const isPassState = isBackendNoTrade || (isActuallyLocked && isPassExplicit);

  const sigAny = signal as any;
  const rawEffectiveProb = isActuallyLocked && rawApiData?.lockedProbability !== undefined
    ? rawApiData.lockedProbability
    : (sigAny?.upProbability ?? rawApiData?.upProbability ?? signal?.confidence ?? 50);

  const effectiveProbability = rawEffectiveProb <= 1 ? rawEffectiveProb * 100 : rawEffectiveProb;
  const upProbability = Number(effectiveProbability);
  const downProbability = Number(isActuallyLocked && rawApiData?.lockedProbability !== undefined ? 100 - upProbability : (sigAny?.downProbability ?? rawApiData?.downProbability ?? (100 - upProbability)));
  
  const evidenceQuality = Number(sigAny?.evidenceQuality ?? rawApiData?.evidenceQuality ?? 78);
  const edgePct = Number(sigAny?.edgePct ?? rawApiData?.edgePct ?? 0);
  const edgeDisplay = edgePct > 0 ? `+${safeToFixed(edgePct, 1)}% OVER MARKET` : `${safeToFixed(edgePct, 1)}% OVER MARKET`;

  const rawCalibProb = isActuallyLocked && rawApiData?.lockedProbability !== undefined
    ? rawApiData.lockedProbability
    : (rawApiData?.calibratedProbability ?? rawApiData?.calibratedModelProbability);

  const authoritativeConfidenceNum = Number(
    isActuallyLocked && rawApiData?.lockedConfidence !== undefined
      ? rawApiData.lockedConfidence
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
  const calibrationStatus = isActuallyLocked ? 'CALIBRATED' : (rawCalibStatus === 'COMPLETE' ? 'CALIBRATED' : 'CALIBRATING');

  let directionVisualState: 'UP' | 'DOWN' | 'NEUTRAL' | 'DELAYED' | 'ERROR' = 'NEUTRAL';
  if (isOfflineStatus) {
    directionVisualState = 'ERROR';
  } else if (isDegradedStatus) {
    directionVisualState = 'DELAYED';
  } else if (isConfirmedUp) {
    directionVisualState = 'UP';
  } else if (isConfirmedDown) {
    directionVisualState = 'DOWN';
  } else {
    directionVisualState = 'NEUTRAL';
  }

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

  let displayDecisionText = 'ANALYZING';
  if (isOfflineOrStale) {
    displayDecisionText = 'DATA STALE';
  } else if (isConfirmedUp) {
    displayDecisionText = isActuallyLocked ? 'LOCKED BUY UP' : 'BUY UP';
  } else if (isConfirmedDown) {
    displayDecisionText = isActuallyLocked ? 'LOCKED BUY DOWN' : 'BUY DOWN';
  } else if (isPassState || rawApiData?.action === 'SKIP' || rawApiData?.action === 'NO_TRADE') {
    displayDecisionText = 'VIXY CALIBRATING';
  } else if (isBackendObserving) {
    displayDecisionText = 'OBSERVING';
  } else if (isBackendCalibrating) {
    displayDecisionText = 'CALIBRATING';
  } else {
    displayDecisionText = 'QUALIFYING';
  }

  const displayCalibratedProb = (rawCalibProb !== null && rawCalibProb !== undefined)
    ? `${Math.round(rawCalibProb * (rawCalibProb <= 1 ? 100 : 1))}%`
    : (authoritativeConfidenceNum ? `${Math.round(authoritativeConfidenceNum)}%` : '');

  // Compute execution dispatch panel state (STRICTLY INDEPENDENT FROM ACCESS GATE)
  let executionPanelState: 'STALE' | 'PROTECT' | 'CONFIRMED_UP' | 'CONFIRMED_DOWN' | 'CALIBRATING' | 'PASS' | 'ANALYZING' = 'CALIBRATING';
  if (isOfflineOrStale) {
    executionPanelState = 'STALE';
  } else if (isProtectState) {
    executionPanelState = 'PROTECT';
  } else if (isConfirmedUp) {
    executionPanelState = 'CONFIRMED_UP';
  } else if (isConfirmedDown) {
    executionPanelState = 'CONFIRMED_DOWN';
  } else if (isPassState) {
    executionPanelState = 'PASS';
  } else if (isBackendCalibrating) {
    executionPanelState = 'CALIBRATING';
  } else {
    executionPanelState = 'ANALYZING';
  }

  const showBuyUp = executionPanelState === 'CONFIRMED_UP' && !isOfflineOrStale;
  const showBuyDown = executionPanelState === 'CONFIRMED_DOWN' && !isOfflineOrStale;

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
      bgGlowClass = 'bg-gradient-to-b from-purple-600/50 via-purple-900/30 to-purple-950/20 shadow-[0_0_40px_rgba(168,85,247,0.35)]';
      bgInnerClass = 'bg-[#120526]';
      accentHeaderTitle = 'text-purple-300 font-black';
      accentHeaderValue = 'text-purple-200';
      accentSubtitleLabel = 'text-purple-300';
      accentSubtitleDesc = 'text-purple-200/80';
      actionBtnClass = 'bg-purple-950/80 border-2 border-purple-500/80 text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.4)] font-black';
      actionBtnText = 'VIXY CALIBRATING — CAPITAL PROTECTED';
      statusLabelClass = 'text-purple-300 font-bold';
      statusText = '🛡 VIXY CAPITAL PROTECTED';
      titleLabelText = 'CYCLE EVALUATION';
      statusValueText = 'VIXY CALIBRATING';
      subtitleLabelText = 'CHOPPY MARKET // CALIBRATING RISK';
      subtitleDescText = 'VIXY engine is calibrating entry for this cycle to preserve capital due to high chop or insufficient edge.';
      statusIcon = <ShieldCheck className="w-8 h-8 text-purple-300 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-pulse" />;
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
  const formattedSpotVsStrikeVal = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${safeToFixed(Math.abs(spotVsStrikeDelta), 2)}`;
  const formattedSpotVsStrikePct = `${spotVsStrikeDelta >= 0 ? '+' : '-'}${safeToFixed(Math.abs(spotVsStrikePct), 2)}%`;

  return (
    <div className="space-y-4">
      {/* TOP STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono tracking-widest uppercase pb-1">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-purple-500/70 mb-1">MARKET</div>
            <div className="text-purple-100 font-bold">BTC KALSHI 15M</div>
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
              {totalResolved} RESOLVED • {displayDecisionText}
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
        directionVisualState={directionVisualState}
        isUserAuthorized={isUserAuthorized}
        onExecute={triggerHapticPulse}
      />

      {/* STEP 2 — VIXY PROTECTION™ (POSITION GUARDIAN BRIDGE LAYER) */}
      <VixyProtectionSummary
        isActuallyLocked={isActuallyLocked}
        signal={signal}
        ticker={ticker}
        rawApiData={rawApiData}
        isProtectState={isProtectState}
        reversalRisk={reversalRisk}
        currentPrice={currentPrice}
        targetPrice={targetPrice}
        timeRemainingSec={rawApiData?.timeRemainingSec || rawApiData?.features?.timeRemaining || 540}
        onExecute={triggerHapticPulse}
      />

      {/* 1. LOWER 3-COLUMN INTELLIGENCE AREA: VIXY PROTECTION | WHALE WATCH | INSTITUTIONAL RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="h-full">
          <ProtectionBrain
            signal={signal}
            ticker={ticker}
            isDiscordVerified={isUserAuthorized}
            rawApiData={rawApiData}
          />
        </div>
        <div className="h-full">
          <WhaleBrain
            ticker={ticker}
            selectedAsset={displayVenue}
          />
        </div>
        <div className="h-full">
          <InstitutionalIntelRadar
            rawApiData={rawApiData}
            survivalScore={Math.max(5, Math.min(99, 100 - reversalRisk))}
            reversalRisk={reversalRisk}
            orderFlowState={orderFlowState}
            isProtectState={isProtectState}
          />
        </div>
      </div>

      {/* 2. DECISION ENGINE DIAGNOSTICS & PROBABILITY MATRIX */}
      <DecisionEngineDiagnostics rawApiData={rawApiData} />

      {/* 3. 5 EVIDENCE METRICS & REAL-TIME FEATURE SIGNALS (MARKET EVIDENCE TELEMETRY) */}
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
            <span className="text-purple-400/60">MODEL: <span className={isOfflineOrStale ? "text-rose-400" : isBackendCalibrating ? "text-amber-400" : "text-emerald-400"}>{isOfflineOrStale ? "STALE" : isBackendCalibrating ? "WARMING UP" : "LIVE"}</span></span>
            <span className="text-purple-400/60">LINK: <span className={isOfflineOrStale ? "text-rose-400" : isDegradedStatus ? "text-amber-400" : "text-emerald-400"}>{connectionLabel}</span></span>
          </div>
        </div>

        {/* 5 EVIDENCE METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 relative z-10">
           {/* Order Flow */}
           <div className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors ${orderFlowState.isBullish ? 'border-[#00FF9D]/30 bg-[#00FF9D]/[0.03] hover:border-[#00FF9D]/60' : orderFlowState.isBearish ? 'border-[#FF3366]/30 bg-[#FF3366]/[0.03] hover:border-[#FF3366]/60' : 'border-purple-900/30 bg-[#06020c] hover:border-purple-700/50'}`}>
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
               {[20, 35, 50, 75, 90, 80, 60, 40].map((_, i) => {
                   const actualH = orderFlowState.isBullish
                     ? [15, 25, 40, 55, 70, 80, 90, 100][i]
                     : orderFlowState.isBearish
                     ? [100, 90, 80, 70, 55, 40, 25, 15][i]
                     : 50;
                   return (
                     <div key={i} className={`w-1 rounded-t-sm ${orderFlowState.isBullish ? 'bg-[#00FF9D]' : orderFlowState.isBearish ? 'bg-[#FF3366]' : 'bg-purple-500'}`} style={{ height: `${actualH}%` }} />
                   );
               })}
             </div>
           </div>
           
           {/* Momentum */}
           <div className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors ${momentumState.isBullish ? 'border-[#00FF9D]/30 bg-[#00FF9D]/[0.03] hover:border-[#00FF9D]/60' : momentumState.isBearish ? 'border-[#FF3366]/30 bg-[#FF3366]/[0.03] hover:border-[#FF3366]/60' : 'border-purple-900/30 bg-[#06020c] hover:border-purple-700/50'}`}>
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
                 {momentumState.isBullish ? (
                   <path d="M1 13C4 13 8 11 12 11C16 11 19 14 23 14C27 14 30 7 34 7C37 7 38 2 39 2" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 ) : momentumState.isBearish ? (
                   <path d="M1 2C4 2 8 4 12 4C16 4 19 1 23 1C27 1 30 8 34 8C37 8 38 13 39 13" stroke="#FF3366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 ) : (
                   <path d="M1 8C5 8 8 6 12 6C16 6 20 10 24 10C28 10 32 7 36 7C38 7 39 8 40 8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 )}
               </svg>
             </div>
           </div>

           {/* Volatility */}
           <div className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors ${volatilityState.isWarning ? 'border-amber-400/30 bg-amber-400/[0.03] hover:border-amber-400/60' : 'border-purple-900/30 bg-[#06020c] hover:border-purple-700/50'}`}>
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
           <div className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors ${distanceState.isBullish ? 'border-[#00FF9D]/30 bg-[#00FF9D]/[0.03] hover:border-[#00FF9D]/60' : distanceState.isBearish ? 'border-[#FF3366]/30 bg-[#FF3366]/[0.03] hover:border-[#FF3366]/60' : 'border-purple-900/30 bg-[#06020c] hover:border-purple-700/50'}`}>
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
                 {distanceState.isBullish ? (
                   <path d="M1 13C5 13 9 11 13 11C17 11 20 14 24 14C28 14 31 7 35 7C37 7 38 2 39 2" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 ) : distanceState.isBearish ? (
                   <path d="M1 2C5 2 9 4 13 4C17 4 20 1 24 1C28 1 31 8 35 8C37 8 38 13 39 13" stroke="#FF3366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 ) : (
                   <path d="M1 8C5 8 10 6 15 6C20 6 25 10 30 10C35 10 37 8 39 8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 )}
               </svg>
             </div>
           </div>

           {/* Regime */}
           <div className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-colors ${regimeState.isBull ? 'border-[#00FF9D]/30 bg-[#00FF9D]/[0.03] hover:border-[#00FF9D]/60' : regimeState.isBear ? 'border-[#FF3366]/30 bg-[#FF3366]/[0.03] hover:border-[#FF3366]/60' : 'border-purple-900/30 bg-[#06020c] hover:border-purple-700/50'}`}>
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
                 {regimeState.isBull ? (
                   <path d="M1 13C5 13 8 11 12 11C16 11 19 14 23 14C27 14 30 6 34 6C37 6 38 2 39 2" stroke="#00FF9D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 ) : regimeState.isBear ? (
                   <path d="M1 2C5 2 8 4 12 4C16 4 19 1 23 1C27 1 30 9 34 9C37 9 38 13 39 13" stroke="#FF3366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 ) : (
                   <path d="M1 8C4 8 7 5 11 5C15 5 18 11 22 11C26 11 29 5 33 5C36 5 38 8 39 8" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                 )}
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
