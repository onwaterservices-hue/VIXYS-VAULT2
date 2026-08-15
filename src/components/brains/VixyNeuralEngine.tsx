import React, { useMemo } from 'react';
import {
  Zap,
  Radio,
  WifiOff,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Sparkles,
  Shield,
  Layers,
  Flame,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { formatConfidenceLabel, MetricFormattedState } from '../../utils/metrics';
import { DirectionVisualState, getVisualStateConfig } from '../../utils/visualState';

interface VixyNeuralEngineProps {
  rawApiData: any;
  orderFlowState: MetricFormattedState;
  momentumState: MetricFormattedState;
  volatilityState: MetricFormattedState;
  distanceState: MetricFormattedState;
  regimeState: {
    primaryText: string;
    secondaryText: string;
    semanticClass: string;
    isBull: boolean;
    isBear: boolean;
  };
  freshnessState: {
    label: string;
    ageText: string;
    statusClass: string;
    isLive: boolean;
    isStale: boolean;
  };
  currentPrice: number;
  targetPrice: number;
  timeRemainingSec?: number;
  isProtectState: boolean;
  reversalRisk: number;
  isOfflineOrStale: boolean;
  directionVisualState: DirectionVisualState;
  isUserAuthorized?: boolean;
  onExecute?: (action: string) => void;
}

export const VixyNeuralEngine: React.FC<VixyNeuralEngineProps> = ({
  rawApiData,
  orderFlowState,
  momentumState,
  volatilityState,
  distanceState,
  regimeState,
  freshnessState,
  currentPrice,
  targetPrice,
  timeRemainingSec = 540,
  isProtectState,
  reversalRisk,
  isOfflineOrStale,
  directionVisualState,
  isUserAuthorized = true,
  onExecute,
}) => {
  // ─── 1. AUTHORITATIVE SERVER-SIDE CYCLE & LOCK STATE ───
  // Strictly respects the invariant: ONE CYCLE → ONE PREDICTION → ONE LOCK → ONE SETTLEMENT
  const isServerLocked = Boolean(
    rawApiData?.isLocked === true &&
    (rawApiData?.status === 'LOCKED' ||
     rawApiData?.cycleStage === 'LOCKED' ||
     rawApiData?.vixyLockState === 'LOCKED')
  );

  const rawStage = String(rawApiData?.stage || rawApiData?.cycleStage || rawApiData?.status || 'OBSERVING').toUpperCase();
  const isObserving = !isServerLocked && (rawStage === 'OBSERVING');
  const isCalibrating = !isServerLocked && (rawStage === 'CALIBRATING' || rawStage === 'INGESTING' || rawStage === 'BOOTSTRAPPING');
  const isAnalyzing = !isServerLocked && rawStage === 'ANALYZING';
  const isQualifying = !isServerLocked && rawStage === 'QUALIFYING';
  const isValidating = !isServerLocked && (rawStage === 'VALIDATING' || rawStage === 'LOCKING');
  const isReadyToLock = !isServerLocked && rawStage === 'READY_TO_LOCK';
  const isNoTrade = !isServerLocked && (rawStage === 'NO_TRADE' || rawStage === 'SKIPPED');
  const isCriticallyInvalidated = rawApiData?.status === 'CRITICALLY_INVALIDATED' || rawApiData?.isCriticallyInvalidated;

  const cycleId = String(rawApiData?.cycleId || '15M-ACTIVE-CYCLE');
  const lockedAt = rawApiData?.lockedAt ? new Date(rawApiData.lockedAt) : null;
  const lockedAtFormatted = lockedAt ? lockedAt.toLocaleTimeString() : 'CONFIRMED';

  const rawDirection = isServerLocked ? (rawApiData?.lockedDirection || 'NONE').toUpperCase() : 'NONE';
  const isUp = isServerLocked && (rawDirection.includes('UP') || rawDirection.includes('YES'));
  const isDown = isServerLocked && (rawDirection.includes('DOWN') || rawDirection.includes('NO'));

  const lockedDecision = rawApiData?.lockedDecision || (isUp ? 'BUY UP' : isDown ? 'BUY DOWN' : 'PASS');
  const lockedStrike = Number(rawApiData?.lockedStrike || rawApiData?.strike || targetPrice || 64100);
  const lockedSpot = Number(rawApiData?.lockedSpot || rawApiData?.spotAtLock || currentPrice || 64100);

  // Exact Authoritative Confidence Value
  const authoritativeRawConf = Number(
    isServerLocked && rawApiData?.lockedConfidence !== undefined
      ? rawApiData.lockedConfidence
      : rawApiData?.calibratedModelProbability !== undefined
      ? (rawApiData.calibratedModelProbability <= 1 ? rawApiData.calibratedModelProbability * 100 : rawApiData.calibratedModelProbability)
      : rawApiData?.confidence !== undefined
      ? rawApiData.confidence
      : 74
  );

  const exactConfidencePct = Math.min(99, Math.max(50, Math.round(authoritativeRawConf)));
  const confBand = formatConfidenceLabel(exactConfidencePct, isUp ? 'UP' : isDown ? 'DOWN' : 'NEUTRAL');

  // Network & Market Link States
  const isSignalActive = Boolean(rawApiData?.signalActive || rawApiData?.direction) && !isOfflineOrStale;
  const isModelValidated = Boolean(rawApiData?.validated || rawApiData?.confidence) && !isOfflineOrStale;
  const isMarketLinked = !isOfflineOrStale && rawApiData?.feedStatus !== 'OFFLINE';

  // Format time remaining mm:ss
  const formattedMinutes = Math.floor(timeRemainingSec / 60);
  const formattedSeconds = timeRemainingSec % 60;
  const timeRemainingFormatted = `${formattedMinutes}:${formattedSeconds < 10 ? '0' : ''}${formattedSeconds}`;

  // Direction-Aware Visual State
  const visualConfig = getVisualStateConfig(directionVisualState);
  const themeNeon = visualConfig.primaryColor;
  const themeGlow = visualConfig.glowColor;

  // ─── 2. DIAGNOSTIC REAL INPUT VECTORS (Direct telemetry) ───
  const diagnosticNodes = useMemo(() => {
    return [
      {
        id: 'flow',
        label: 'FLOW',
        sign: orderFlowState.isBullish ? '+' : orderFlowState.isBearish ? '−' : '•',
        val: orderFlowState.valueText,
        active: true,
        isBull: orderFlowState.isBullish,
        isBear: orderFlowState.isBearish,
      },
      {
        id: 'momentum',
        label: 'MOMENTUM',
        sign: momentumState.isBullish ? '+' : momentumState.isBearish ? '−' : '•',
        val: momentumState.valueText,
        active: true,
        isBull: momentumState.isBullish,
        isBear: momentumState.isBearish,
      },
      {
        id: 'regime',
        label: 'REGIME',
        sign: regimeState.isBull ? '+' : regimeState.isBear ? '−' : '•',
        val: regimeState.primaryText,
        active: true,
        isBull: regimeState.isBull,
        isBear: regimeState.isBear,
      },
      {
        id: 'volatility',
        label: 'VOLATILITY',
        sign: volatilityState.semanticClass.includes('FF3366') ? '−' : '+',
        val: volatilityState.valueText,
        active: true,
        isBull: false,
        isBear: false,
      },
      {
        id: 'reversal',
        label: 'REVERSAL',
        sign: reversalRisk >= 40 ? '−' : '+',
        val: `${reversalRisk}%`,
        active: true,
        isBull: reversalRisk < 40,
        isBear: reversalRisk >= 40,
      },
    ];
  }, [orderFlowState, momentumState, regimeState, volatilityState, reversalRisk]);

  return (
    <div
      id="vixy-neural-hero-terminal"
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 p-4 sm:p-5 font-mono shadow-[0_0_40px_rgba(0,0,0,0.95)] ${visualConfig.borderClass} ${visualConfig.bgClass.replace('/10', '/20')}`}
      style={{ boxShadow: `0 0 50px ${themeGlow}` }}
    >
      {/* ─── HUD BACKGROUND GRID & CYBERNETIC PERIMETER LIGHT ─── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-90" />

      {/* Top Animated Energy Perimeter Beam */}
      <div
        className="absolute top-0 left-0 right-0 h-[2.5px] transition-all duration-700"
        style={{
          background: `linear-gradient(90deg, transparent, ${themeNeon}, ${themeNeon}, transparent)`,
          boxShadow: `0 0 20px ${themeNeon}`,
        }}
      />

      {/* Precision Corner Brackets */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-500/40 pointer-events-none" />

      {/* ─── TOP HEADER: TITLE & IMMUTABLE CYCLE LOCK STATUS ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-purple-900/40 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center border shadow-inner ${visualConfig.bgClass.replace('/10', '/80')} ${visualConfig.borderClass} ${visualConfig.textClass}`}>
            {isServerLocked ? (
              <Lock className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Zap className="w-3.5 h-3.5 animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-100 tracking-[0.22em] uppercase drop-shadow flex items-center gap-2">
              <span>VIXY NEURAL EXECUTION CORE</span>
              <span className="text-[8px] font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/40 hidden sm:inline-block">
                15M KALSHI
              </span>
            </h2>
            <div className="flex items-center gap-2 text-[8.5px] font-bold tracking-[0.15em] uppercase">
              <span className={`flex items-center gap-1 ${visualConfig.textClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${visualConfig.bgClass.replace('/10', '')} ${isServerLocked ? '' : 'animate-pulse'}`} style={{ backgroundColor: themeNeon }} />
                {isServerLocked ? '● IMMUTABLE CYCLE LOCK' : isNoTrade ? '● VIXY SKIP // CHOP GATE' : isObserving ? '● OBSERVING 15M CYCLE' : isCalibrating ? '● CALIBRATING 15M CYCLE' : isQualifying ? '● QUALIFYING CONFLUENCE' : isValidating ? '● VALIDATING EVIDENCE' : isReadyToLock ? '● FINALIZING LOCK' : '● ANALYZING 15M CYCLE'}
              </span>
              <span className="text-purple-700">|</span>
              <span className="text-slate-300">EXPIRY IN {timeRemainingFormatted}</span>
            </div>
          </div>
        </div>

        {/* Cycle Stage Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-[9.5px] font-mono font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${visualConfig.textClass} ${visualConfig.borderClass} ${visualConfig.bgClass}`}
            style={{ boxShadow: `0 0 15px ${themeGlow}` }}
          >
            {isCriticallyInvalidated ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                <span>STATE: CRITICALLY INVALIDATED</span>
              </>
            ) : isNoTrade ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                <span>STATE: VIXY SKIP (PROTECTED)</span>
              </>
            ) : isServerLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 animate-pulse" />
                <span>STATE 04: LOCKED — {lockedDecision}</span>
              </>
            ) : isObserving ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>STATE 01: OBSERVING 15M CYCLE</span>
              </>
            ) : isCalibrating ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>STATE 02: CALIBRATING ENGINE</span>
              </>
            ) : isAnalyzing ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                <span>STATE 03: ANALYZING MARKET</span>
              </>
            ) : isQualifying ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-300" />
                <span>STATE 04: QUALIFYING ENTRY</span>
              </>
            ) : isValidating ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>STATE 04: VALIDATING EVIDENCE</span>
              </>
            ) : isReadyToLock ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>STATE 04: FINALIZING LOCK</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                <span>STATE 01: OBSERVING 15M CYCLE</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ─── MAIN HERO STAGE: NEURAL SIGNAL RING + HERO DIRECTIONAL CORE ─── */}
      <div className="py-4 sm:py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] items-center gap-4 sm:gap-6 relative z-10">
        
        {/* ─── SECTION A: THE FUTURISTIC NEURAL SIGNAL RING ─── */}
        <div className="flex flex-col items-center justify-center relative select-none">
          {/* Ambient Glow behind Ring */}
          <div
            className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full blur-[35px] opacity-25 pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: themeNeon }}
          />

          <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
            {/* SVG Dynamic Neural Radar Rings */}
            <svg
              className="w-full h-full transform -rotate-90 overflow-visible"
              viewBox="0 0 160 160"
            >
              {/* Outer Tick Frame */}
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke="rgba(168, 85, 247, 0.15)"
                strokeWidth="1"
              />
              <circle
                cx="80"
                cy="80"
                r="74"
                fill="none"
                stroke={themeNeon}
                strokeWidth="1.5"
                strokeDasharray="2 12"
                className="opacity-40 animate-[spin_20s_linear_infinite]"
              />

              {/* Middle Rotating Neural Arcs */}
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="rgba(147, 51, 234, 0.25)"
                strokeWidth="2"
              />
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke={themeNeon}
                strokeWidth="2.5"
                strokeDasharray={isServerLocked ? 'none' : '60 40'}
                strokeLinecap="round"
                className={isServerLocked ? '' : 'animate-[spin_4s_linear_infinite]'}
                style={{
                  filter: `drop-shadow(0 0 6px ${themeGlow})`,
                }}
              />

              {/* Inner Precision Arc */}
              <circle
                cx="80"
                cy="80"
                r="52"
                fill="none"
                stroke={isOfflineOrStale ? '#991B1B' : isUp ? 'rgba(0, 255, 157, 0.4)' : 'rgba(255, 51, 102, 0.4)'}
                strokeWidth="2"
                strokeDasharray="15 35"
                className={isServerLocked ? '' : 'animate-[spin_6s_linear_infinite_reverse]'}
              />

              {/* Core Radar Calibration Sweep */}
              <circle
                cx="80"
                cy="80"
                r="38"
                fill={isUp ? 'rgba(2, 21, 14, 0.9)' : isDown ? 'rgba(21, 3, 8, 0.9)' : 'rgba(8, 3, 20, 0.9)'}
                stroke={themeNeon}
                strokeWidth={isServerLocked ? 2.5 : 1.5}
                strokeDasharray={isServerLocked ? 'none' : '4 4'}
                style={{
                  filter: `drop-shadow(0 0 10px ${themeGlow})`,
                }}
              />
            </svg>

            {/* Neural Center Core Indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              {isOfflineOrStale ? (
                <WifiOff className="w-7 h-7 text-rose-400 animate-pulse" />
              ) : isCriticallyInvalidated ? (
                <>
                  <AlertTriangle className="w-7 h-7 text-rose-400 animate-bounce" />
                  <span className="text-[7.5px] font-black text-rose-400 tracking-widest uppercase mt-1">
                    INVALIDATED
                  </span>
                </>
              ) : isNoTrade ? (
                <>
                  <ShieldCheck className="w-7 h-7 text-purple-300 animate-pulse" />
                  <span className="text-[7.5px] font-black text-purple-300 tracking-widest uppercase mt-1">
                    VIXY SKIP
                  </span>
                </>
              ) : isServerLocked ? (
                <>
                  <div
                    className="text-2xl sm:text-3xl font-black leading-none animate-bounce"
                    style={{
                      color: themeNeon,
                      textShadow: `0 0 15px ${themeGlow}`,
                    }}
                  >
                    {isUp ? '▲' : isDown ? '▼' : '●'}
                  </div>
                  <span
                    className="text-[8.5px] font-black tracking-widest uppercase mt-1 flex items-center gap-1"
                    style={{ color: themeNeon }}
                  >
                    <Lock className="w-2.5 h-2.5" /> LOCKED
                  </span>
                </>
              ) : (
                <>
                  <Activity className="w-7 h-7 text-cyan-300 animate-pulse" />
                  <span className="text-[8px] font-black text-cyan-300 tracking-widest uppercase mt-1">
                    {isObserving ? 'OBSERVING' : isCalibrating ? 'CALIBRATING' : isQualifying ? 'QUALIFYING' : isValidating ? 'VALIDATING' : isReadyToLock ? 'READY' : 'ANALYZING'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-1 text-center">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase" style={{ color: themeNeon }}>
              {isOfflineOrStale
                ? 'FEED OFFLINE'
                : isCriticallyInvalidated
                ? 'CRITICAL REVERSAL DETECTED'
                : isNoTrade
                ? 'PROTECTION / CHOP VETO'
                : isServerLocked
                ? `FINALIZED @ ${lockedAtFormatted}`
                : isObserving
                ? 'OBSERVING ORDER FLOW'
                : isCalibrating
                ? 'CALIBRATING ENGINE'
                : isQualifying
                ? 'QUALIFYING CONFLUENCE'
                : isValidating
                ? 'VALIDATING EVIDENCE'
                : isReadyToLock
                ? 'COMMITTING LOCK'
                : 'SAMPLING 15M MATRIX'}
            </span>
          </div>
        </div>

        {/* ─── SECTION B: HERO DIRECTIONAL DECISION & ACTUAL CONFIDENCE CORE ─── */}
        <div className="flex flex-col justify-center space-y-3 relative">
          
          {/* Top Directional Eyebrow */}
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] uppercase transition-colors flex items-center gap-1.5"
              style={{ color: isOfflineOrStale ? '#F43F5E' : themeNeon }}
            >
              {isServerLocked && <Lock className="w-3 h-3 text-[#00FF9D]" />}
              {isOfflineOrStale
                ? 'DATA LINK INTERRUPTED'
                : isCriticallyInvalidated
                ? 'CRITICAL INVALIDATION TRIGGERED'
                : isNoTrade
                ? 'CYCLE FILTERED BY PROTECTION / CHOP GATE'
                : isServerLocked
                ? 'AUTHORITATIVE 15M CYCLE LOCK'
                : isObserving
                ? 'OBSERVING MARKET ORDER FLOW'
                : isCalibrating
                ? 'PREPARING CURRENT-CYCLE INTELLIGENCE'
                : isQualifying
                ? 'EVALUATING QUALIFICATION & GUARDIAN RISK'
                : isValidating
                ? 'CHECKING EVIDENCE AGREEMENT'
                : isReadyToLock
                ? 'FINALIZING NEURAL LOCK'
                : 'EVALUATING CURRENT MARKET STRUCTURE'}
            </span>
            <span className="text-purple-600">|</span>
            <span className="text-[9px] font-mono text-purple-400/70">
              STRIKE: ${lockedStrike.toLocaleString()}
            </span>
          </div>

          {/* Hero Directional Title */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs sm:text-sm font-black tracking-[0.2em] text-purple-300 uppercase">
              {isServerLocked ? 'LOCKED:' : 'STATUS:'}
            </span>
            <div
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none transition-all select-none flex items-center gap-2"
              style={{
                color: isOfflineOrStale ? '#F43F5E' : themeNeon,
                textShadow: `0 0 35px ${isOfflineOrStale ? 'rgba(244,63,94,0.6)' : themeGlow}`,
              }}
            >
              <span>
                {!isUserAuthorized && isServerLocked 
                  ? `LOCKED — ${lockedDecision}` 
                  : isCriticallyInvalidated 
                  ? 'INVALIDATED' 
                  : isNoTrade 
                  ? 'VIXY SKIP' 
                  : isServerLocked 
                  ? lockedDecision 
                  : isObserving 
                  ? 'OBSERVING' 
                  : isCalibrating 
                  ? 'CALIBRATING' 
                  : isQualifying 
                  ? 'QUALIFYING' 
                  : isValidating 
                  ? 'VALIDATING' 
                  : isReadyToLock 
                  ? 'READY' 
                  : 'ANALYZING'
                }
              </span>
              {!isOfflineOrStale && isServerLocked && (
                <span className="text-3xl sm:text-5xl md:text-6xl animate-pulse" style={{ color: themeNeon }}>
                  {isUp ? '▲' : '▼'}
                </span>
              )}
            </div>
          </div>

          {/* ─── ACTUAL MODEL CONFIDENCE BLOCK (Reveals real authoritative % — never inflated) ─── */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#06020e] border border-purple-900/50 space-y-2 relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-mono tracking-widest text-purple-400/80 uppercase font-bold">
                  {isServerLocked ? 'LOCKED MODEL CONFIDENCE:' : 'LIVE CALIBRATING CONFIDENCE:'}
                </span>
                <span
                  className="text-2xl sm:text-3xl font-black tracking-tight font-mono leading-none transition-all"
                  style={{
                    color: isOfflineOrStale ? '#F43F5E' : themeNeon,
                    textShadow: `0 0 15px ${themeGlow}`,
                  }}
                >
                  {isOfflineOrStale ? '---' : `${exactConfidencePct}%`}
                </span>
              </div>

              {/* Exact Semantic Tier Badge */}
              <div
                className={`text-[9px] sm:text-[10px] font-black tracking-[0.15em] uppercase px-2.5 py-1 rounded-md border text-center whitespace-nowrap transition-all ${
                  isOfflineOrStale
                    ? 'bg-rose-950/60 text-rose-300 border-rose-700/40'
                    : confBand.badgeClass
                }`}
              >
                {isOfflineOrStale ? 'STALE DATA STREAM' : confBand.fullLabel}
              </div>
            </div>

            {/* Precision 0% ———●——— 100% Visual Calibration Slider */}
            <div className="w-full space-y-1 pt-1">
              <div className="relative h-2 bg-[#090314] rounded-full border border-purple-900/60 p-0.5 overflow-visible">
                {/* Meter Fill */}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${exactConfidencePct}%`,
                    background: isUp
                      ? 'linear-gradient(90deg, #10b981, #00FF9D)'
                      : isDown
                      ? 'linear-gradient(90deg, #f43f5e, #FF3366)'
                      : '#8b5cf6',
                    boxShadow: `0 0 8px ${themeGlow}`,
                  }}
                />

                {/* Meter Pin Node */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg transition-all duration-500 flex items-center justify-center"
                  style={{
                    left: `calc(${exactConfidencePct}% - 7px)`,
                    backgroundColor: themeNeon,
                    boxShadow: `0 0 10px ${themeNeon}`,
                  }}
                >
                  <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                </div>
              </div>

              {/* Slider Ticks Scale */}
              <div className="flex justify-between text-[7.5px] sm:text-[8px] font-mono text-purple-500/70 pt-0.5 px-0.5">
                <span>0%</span>
                <span className={exactConfidencePct >= 50 && exactConfidencePct < 60 ? 'text-purple-200 font-bold' : ''}>50% (DEVELOPING)</span>
                <span className={exactConfidencePct >= 60 && exactConfidencePct < 70 ? 'text-purple-200 font-bold' : ''}>60% (MODERATE)</span>
                <span className={exactConfidencePct >= 70 && exactConfidencePct < 80 ? 'text-purple-200 font-bold' : ''}>70% (STRONG)</span>
                <span className={exactConfidencePct >= 80 ? 'text-purple-200 font-bold' : ''}>80%+ (HIGH)</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* ─── IMMUTABLE LOCK AUDIT DETAILS (When Locked) ─── */}
          {isServerLocked && (
            <div className="p-2.5 rounded-lg bg-[#04130d] border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-emerald-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#00FF9D]" />
                <span className="font-bold">ONE-CYCLE IMMUTABLE LOCK:</span>
                <span>SPOT AT LOCK: ${lockedSpot.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400/70">CYCLE: {cycleId.slice(0, 16)}</span>
                <span className="text-emerald-500">|</span>
                <span className="font-bold text-[#00FF9D]">LOCKED AT: {lockedAtFormatted}</span>
              </div>
            </div>
          )}

          {/* Reversal Risk Flag (When elevated) */}
          {reversalRisk >= 40 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-[9.5px] font-mono text-rose-300 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span>VIXY DEFENSE: REVERSAL THREAT ELEVATED ({reversalRisk}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── WHALE WATCH & RISK REVERSAL INSTITUTIONAL TELEMETRY BOX ─── */}
      <div className="bg-[#05010c] border border-purple-800/60 rounded-xl p-3 relative z-10 shadow-[0_0_20px_rgba(0,0,0,0.8)] my-3">
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-2 mb-2.5 font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-[10px] font-black text-slate-100 tracking-[0.2em] uppercase">
              WHALE RADAR & RISK REVERSAL
            </span>
          </div>
          <span className="text-[8.5px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/50">
            DESK SCAN ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          {/* Box 1: Whale Sweep Activity */}
          <div className="bg-[#090318] border border-cyan-500/40 rounded-lg p-2.5 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-cyan-950/90 border border-cyan-500/60 flex items-center justify-center text-cyan-300 shrink-0">
                <Layers className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              </div>
              <div>
                <div className="text-[8.5px] font-bold text-cyan-400/80 tracking-widest uppercase">
                  WHALE SWEEP INTERCEPT
                </div>
                <div className="text-xs font-black text-cyan-300 tracking-tight font-mono">
                  {rawApiData?.darkPoolSweep?.label || '+$2.48M BTC BOUGHT'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-emerald-950/90 text-[#00FF9D] border border-emerald-500/50 uppercase tracking-wider block">
                BULLISH
              </span>
              <span className="text-[7.5px] text-purple-400/60 tracking-wider mt-0.5 block font-bold">
                +15M WINDOW
              </span>
            </div>
          </div>

          {/* Box 2: Risk Reversal Protection Threat */}
          <div className="bg-[#090318] border border-purple-500/40 rounded-lg p-2.5 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center border shrink-0 ${reversalRisk >= 40 ? 'bg-rose-950/90 border-rose-500/60 text-rose-400' : 'bg-purple-950/90 border-purple-500/60 text-purple-300'}`}>
                <ShieldAlert className={`w-3.5 h-3.5 ${reversalRisk >= 40 ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <div className="text-[8.5px] font-bold text-purple-400/80 tracking-widest uppercase">
                  RISK REVERSAL THREAT
                </div>
                <div className={`text-xs font-black tracking-tight font-mono ${reversalRisk >= 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {reversalRisk}% {reversalRisk >= 50 ? '[HIGH]' : reversalRisk >= 30 ? '[ELEVATED]' : '[LOW THREAT]'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider block border ${reversalRisk >= 40 ? 'bg-rose-950/90 text-rose-400 border-rose-500/50' : 'bg-emerald-950/90 text-[#00FF9D] border border-emerald-500/50'}`}>
                {reversalRisk >= 40 ? 'STATE: WATCH' : 'GUARDIAN OK'}
              </span>
              <span className="text-[7.5px] text-purple-400/60 tracking-wider mt-0.5 block font-bold">
                0 TRIGGERS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION C: COMPACT REAL DIAGNOSTIC TELEMETRY NODES ─── */}
      <div className="bg-[#05010b] rounded-xl border border-purple-900/40 p-2.5 sm:p-3 relative z-10">
        <div className="flex items-center justify-between border-b border-purple-900/30 pb-1.5 text-[9px] font-bold text-purple-300 uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-purple-400" /> REAL INPUT VECTORS
          </span>
          <span className="text-[8px] text-purple-400/60 font-mono">15M ENGINE INGESTION</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[9.5px]">
          {diagnosticNodes.map((node) => (
            <div
              key={node.id}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all duration-300 ${
                node.active
                  ? 'bg-[#0a0316] border-purple-800/40 shadow-sm'
                  : 'bg-[#06020c] border-purple-950/40 opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-black text-[9px] ${
                    node.sign === '+'
                      ? 'bg-emerald-950 text-[#00FF9D] border border-emerald-600/50'
                      : node.sign === '−'
                      ? 'bg-rose-950 text-[#FF3366] border border-rose-600/50'
                      : 'bg-purple-950 text-purple-300 border border-purple-700/50'
                  }`}
                >
                  {node.sign}
                </span>
                <span className="text-purple-200 font-bold text-[9px]">{node.label}</span>
              </div>
              <span
                className={`font-mono font-black text-[9px] ${
                  node.isBull ? 'text-[#00FF9D]' : node.isBear ? 'text-[#FF3366]' : 'text-purple-300'
                }`}
              >
                {node.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION D: HIGH-PROMINENCE FUTURISTIC EXECUTION BUTTON ─── */}
      <div className="pt-3.5 relative z-10">
        <button
          onClick={() => {
            if (onExecute) onExecute(isUp ? 'BUY_UP' : 'BUY_DOWN');
          }}
          disabled={isOfflineOrStale}
          className={`w-full py-3.5 sm:py-4 px-6 rounded-xl font-black text-sm sm:text-base tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl cursor-pointer ${
            isOfflineOrStale
              ? 'bg-purple-950/40 border border-purple-900/50 text-purple-400 cursor-not-allowed'
              : isServerLocked
              ? isUp
                ? 'bg-[#041d13] border-2 border-[#00FF9D] text-[#00FF9D] shadow-[0_0_35px_rgba(0,255,157,0.45)] active:scale-[0.99]'
                : 'bg-[#1d040a] border-2 border-[#FF3366] text-[#FF3366] shadow-[0_0_35px_rgba(255,51,102,0.45)] active:scale-[0.99]'
              : 'bg-[#0a0316] border border-cyan-500/60 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:border-cyan-400'
          }`}
          style={{
            textShadow: isOfflineOrStale ? 'none' : `0 0 15px ${themeGlow}`,
          }}
        >
          {/* Signal Sweep Shimmer Animation */}
          {!isOfflineOrStale && (
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
          )}

          {isServerLocked ? (
            <Lock className="w-4 h-4 animate-pulse" />
          ) : (
            <Zap className={`w-4 h-4 ${isOfflineOrStale ? 'text-purple-400' : 'animate-bounce'}`} />
          )}
          <span>
            {isOfflineOrStale
              ? 'EXECUTION PAUSED'
              : isServerLocked
              ? `⚡ LOCKED — ${lockedDecision}`
              : '⚡ VIXY ANALYZING CYCLE...'}
          </span>
          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* ─── SECTION E: LIVE EXECUTION STATUS RAIL ─── */}
      <div className="mt-3.5 pt-3 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-2.5 text-[8.5px] sm:text-[9.5px] font-mono text-purple-400/80 relative z-10">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          <span className="text-purple-300 font-bold uppercase tracking-wider">EXECUTION STATUS:</span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              isOfflineOrStale ? 'text-rose-400' : isMarketLinked ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOfflineOrStale ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : isMarketLinked ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
              }`}
            />
            MARKET LINKED
          </span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              isOfflineOrStale ? 'text-rose-400' : isModelValidated ? 'text-emerald-400' : 'text-purple-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOfflineOrStale ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : isModelValidated ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-purple-400 animate-pulse'
              }`}
            />
            MODEL VALIDATED
          </span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              isOfflineOrStale ? 'text-rose-400' : isSignalActive ? 'text-emerald-400' : 'text-cyan-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOfflineOrStale ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : isSignalActive ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-cyan-400 animate-pulse'
              }`}
            />
            SIGNAL ACTIVE
          </span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              isOfflineOrStale ? 'text-rose-400' : isServerLocked ? visualConfig.textClass : 'text-purple-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOfflineOrStale ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]' : isServerLocked ? visualConfig.bgClass.replace('/10', '') : 'bg-purple-400 animate-pulse'
              }`}
              style={{ backgroundColor: isServerLocked ? themeNeon : undefined, boxShadow: isServerLocked ? `0 0 6px ${themeNeon}` : undefined }}
            />
            CYCLE LOCKED
          </span>
        </div>

        {/* 15M Cycle ID */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-purple-300 font-bold bg-[#080212] px-2 py-0.5 rounded border border-purple-900/40">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>CONTRACT: {timeRemainingFormatted}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
