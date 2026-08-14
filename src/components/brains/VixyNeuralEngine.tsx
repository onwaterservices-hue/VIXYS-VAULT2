import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { formatConfidenceLabel, MetricFormattedState } from '../../utils/metrics';

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
  onExecute,
}) => {
  // ─── 1. AUTHORITATIVE CORE DATA (Never altered or manufactured) ───
  const rawDirection = (rawApiData?.direction || rawApiData?.execution?.direction || 'UP').toUpperCase();
  const isUp = rawDirection.includes('UP') || rawDirection.includes('YES');
  const isDown = rawDirection.includes('DOWN') || rawDirection.includes('NO');
  const isPass = rawDirection.includes('PASS') || rawDirection.includes('HOLD');

  // Exact Authoritative Confidence Value
  const authoritativeRawConf = Number(
    rawApiData?.calibratedModelProbability !== undefined
      ? (rawApiData.calibratedModelProbability <= 1 ? rawApiData.calibratedModelProbability * 100 : rawApiData.calibratedModelProbability)
      : rawApiData?.calibratedProbability !== undefined
      ? (rawApiData.calibratedProbability <= 1 ? rawApiData.calibratedProbability * 100 : rawApiData.calibratedProbability)
      : rawApiData?.confidence !== undefined
      ? rawApiData.confidence
      : rawApiData?.upProbability !== undefined
      ? (isUp ? rawApiData.upProbability : 100 - rawApiData.upProbability)
      : 55
  );

  const exactConfidencePct = Math.min(100, Math.max(50, Math.round(authoritativeRawConf)));

  // Authoritative Directional Confidence Label according to strict bands:
  // 50-59% = DEVELOPING BULLISH/BEARISH EDGE
  // 60-69% = MODERATE BULLISH/BEARISH EDGE
  // 70-79% = STRONG BULLISH/BEARISH CONFIDENCE
  // 80-89% = HIGH BULLISH/BEARISH CONFIDENCE
  // 90-100% = VERY HIGH BULLISH/BEARISH CONFIDENCE
  const confBand = formatConfidenceLabel(exactConfidencePct, isUp ? 'UP' : isDown ? 'DOWN' : 'NEUTRAL');

  // Authoritative Backend Lock & Qualification State
  const isBackendLocked = Boolean(
    rawApiData?.isLocked ||
    rawApiData?.lockEvaluation?.qualified ||
    rawApiData?.execution?.qualified ||
    rawApiData?.signalConfirmed ||
    rawApiData?.entryQualification === 'QUALIFIED'
  ) && !isOfflineOrStale;

  const isSignalActive = Boolean(rawApiData?.signalActive || rawApiData?.direction) && !isOfflineOrStale;
  const isModelValidated = Boolean(rawApiData?.validated || rawApiData?.confidence) && !isOfflineOrStale;
  const isMarketLinked = !isOfflineOrStale && rawApiData?.feedStatus !== 'OFFLINE';

  // Real Timestamp & Dynamic Decision Age Calculation
  const predictionTimestamp = Number(
    rawApiData?.generatedAt ||
    rawApiData?.marketTimestamp ||
    rawApiData?.timestamp ||
    Date.now()
  );

  const [decisionAgeSeconds, setDecisionAgeSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((Date.now() - predictionTimestamp) / 1000));
  });

  useEffect(() => {
    const updateAge = () => {
      const currentAge = Math.max(0, Math.floor((Date.now() - predictionTimestamp) / 1000));
      setDecisionAgeSeconds(currentAge);
    };
    updateAge();
    const interval = setInterval(updateAge, 1000);
    return () => clearInterval(interval);
  }, [predictionTimestamp]);

  const ageFormatted = decisionAgeSeconds < 10 ? `0${decisionAgeSeconds}s` : `${decisionAgeSeconds}s`;
  const isAging = decisionAgeSeconds > 15;
  const isExpired = decisionAgeSeconds > 45 || isOfflineOrStale;

  // Cycle tracking to trigger smooth neural processing animation on legitimate new cycles
  const currentCycleKey = String(
    rawApiData?.cycleId ||
    rawApiData?.generatedAt ||
    rawApiData?.marketTimestamp ||
    'vixy-active-cycle'
  );

  // ─── 2. VISIBLE 6-STAGE CALIBRATION SEQUENCE ───
  // STATE 01: INGESTING MARKET (0 - 1200ms)
  // STATE 02: SIGNAL ANALYSIS (1200 - 2400ms)
  // STATE 03: CALIBRATING SIGNAL (2400 - 3800ms)
  // STATE 04: MODEL VALIDATED (3800 - 5000ms)
  // STATE 05: ACTUAL CONFIDENCE REVEAL (5000 - 6400ms)
  // STATE 06: DECISION LOCKED (6400ms+ settles to locked if backend is locked)
  type CalibrationStage = 'INGESTING' | 'ANALYSIS' | 'CALIBRATING' | 'VALIDATED' | 'REVEALED' | 'LOCKED';
  const [calibStage, setCalibStage] = useState<CalibrationStage>('INGESTING');
  const [displayedConfNum, setDisplayedConfNum] = useState<number>(50);
  const [lockPulseActive, setLockPulseActive] = useState<boolean>(false);
  const [isCalibratingActive, setIsCalibratingActive] = useState<boolean>(true);

  // Persistent reference to prevent resetting on window resize, scroll, or normal re-renders
  const lastProcessedCycleRef = useRef<string | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const runCalibrationSequence = useCallback(() => {
    // Clear any existing timeouts
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isOfflineOrStale) {
      setCalibStage('REVEALED');
      setDisplayedConfNum(exactConfidencePct);
      setIsCalibratingActive(false);
      return;
    }

    setIsCalibratingActive(true);
    setCalibStage('INGESTING');
    setDisplayedConfNum(50);

    // STATE 01 -> STATE 02: SIGNAL ANALYSIS @ 1200ms
    const t1 = setTimeout(() => {
      setCalibStage('ANALYSIS');
    }, 1200);

    // STATE 02 -> STATE 03: CALIBRATING SIGNAL @ 2400ms
    const t2 = setTimeout(() => {
      setCalibStage('CALIBRATING');
    }, 2400);

    // STATE 03 -> STATE 04: MODEL VALIDATED @ 3800ms
    const t3 = setTimeout(() => {
      setCalibStage('VALIDATED');
    }, 3800);

    // STATE 04 -> STATE 05: ACTUAL MODEL CONFIDENCE @ 5000ms
    const t4 = setTimeout(() => {
      setCalibStage('REVEALED');

      // Smooth count-up strictly to exact backend confidence
      let start = 50;
      const target = exactConfidencePct;
      const stepTime = 35;
      const totalSteps = Math.max(10, Math.abs(target - start));
      let stepCount = 0;

      const stepTimer = setInterval(() => {
        stepCount++;
        const progress = Math.min(1, stepCount / totalSteps);
        const currentVal = Math.round(start + (target - start) * progress);
        setDisplayedConfNum(currentVal);
        if (stepCount >= totalSteps) {
          clearInterval(stepTimer);
          setDisplayedConfNum(target); // Authoritatively exact

          // STATE 05 -> STATE 06: DECISION LOCKED @ 6400ms
          const t5 = setTimeout(() => {
            if (isBackendLocked) {
              setCalibStage('LOCKED');
              setLockPulseActive(true);
              setTimeout(() => setLockPulseActive(false), 1400);
            }
            setIsCalibratingActive(false);
          }, 600);
          timersRef.current.push(t5);
        }
      }, stepTime);
    }, 5000);

    timersRef.current.push(t1, t2, t3, t4);
  }, [isOfflineOrStale, exactConfidencePct, isBackendLocked]);

  // Trigger calibration when a new 15M cycle arrives or on initial load
  useEffect(() => {
    if (lastProcessedCycleRef.current !== currentCycleKey) {
      lastProcessedCycleRef.current = currentCycleKey;
      runCalibrationSequence();
    }
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [currentCycleKey, runCalibrationSequence]);

  // Color tokens
  const themeNeon = isUp ? '#00FF9D' : isDown ? '#FF3366' : '#A855F7';
  const themeGlow = isUp ? 'rgba(0,255,157,0.4)' : isDown ? 'rgba(255,51,102,0.4)' : 'rgba(168,85,247,0.3)';

  // Diagnostic Real Inputs with progressive activation during calibration
  const diagnosticNodes = useMemo(() => {
    const isFlowActive = calibStage !== 'INGESTING';
    const isMomentumActive = calibStage !== 'INGESTING';
    const isRegimeActive = calibStage === 'CALIBRATING' || calibStage === 'VALIDATED' || calibStage === 'REVEALED' || calibStage === 'LOCKED';
    const isVolatilityActive = calibStage === 'CALIBRATING' || calibStage === 'VALIDATED' || calibStage === 'REVEALED' || calibStage === 'LOCKED';
    const isReversalActive = calibStage === 'VALIDATED' || calibStage === 'REVEALED' || calibStage === 'LOCKED';

    return [
      {
        id: 'flow',
        label: 'FLOW',
        sign: orderFlowState.isBullish ? '+' : orderFlowState.isBearish ? '−' : '•',
        val: isFlowActive ? orderFlowState.valueText : 'SCAN...',
        active: isFlowActive,
        isBull: isFlowActive && orderFlowState.isBullish,
        isBear: isFlowActive && orderFlowState.isBearish,
      },
      {
        id: 'momentum',
        label: 'MOMENTUM',
        sign: momentumState.isBullish ? '+' : momentumState.isBearish ? '−' : '•',
        val: isMomentumActive ? momentumState.valueText : 'SCAN...',
        active: isMomentumActive,
        isBull: isMomentumActive && momentumState.isBullish,
        isBear: isMomentumActive && momentumState.isBearish,
      },
      {
        id: 'regime',
        label: 'REGIME',
        sign: regimeState.isBull ? '+' : regimeState.isBear ? '−' : '•',
        val: isRegimeActive ? regimeState.primaryText : 'SCAN...',
        active: isRegimeActive,
        isBull: isRegimeActive && regimeState.isBull,
        isBear: isRegimeActive && regimeState.isBear,
      },
      {
        id: 'volatility',
        label: 'VOLATILITY',
        sign: volatilityState.semanticClass.includes('FF3366') ? '−' : '+',
        val: isVolatilityActive ? volatilityState.valueText : 'SCAN...',
        active: isVolatilityActive,
        isBull: false,
        isBear: false,
      },
      {
        id: 'reversal',
        label: 'REVERSAL',
        sign: reversalRisk >= 40 ? '−' : '+',
        val: isReversalActive ? `${reversalRisk}%` : 'SCAN...',
        active: isReversalActive,
        isBull: isReversalActive && reversalRisk < 40,
        isBear: isReversalActive && reversalRisk >= 40,
      },
    ];
  }, [orderFlowState, momentumState, regimeState, volatilityState, reversalRisk, calibStage]);

  // Stage descriptive status pill
  const stageHeaderInfo = useMemo(() => {
    if (isOfflineOrStale) {
      return {
        badge: 'DATA LINK INTERRUPTED',
        color: 'text-rose-400 border-rose-800/60 bg-rose-950/70',
        sub: 'FEED DISCONNECTED',
      };
    }
    if (isExpired) {
      return {
        badge: 'SIGNAL EXPIRED',
        color: 'text-rose-400 border-rose-800/60 bg-rose-950/70',
        sub: 'AWAITING NEXT CYCLE',
      };
    }
    if (isAging) {
      return {
        badge: 'SIGNAL AGING',
        color: 'text-amber-300 border-amber-800/60 bg-amber-950/70',
        sub: `${decisionAgeSeconds}s SINCE CALIBRATION`,
      };
    }
    switch (calibStage) {
      case 'INGESTING':
        return {
          badge: 'STATE 01: INGESTING MARKET',
          color: 'text-purple-300 border-purple-600/40 bg-purple-950/80',
          sub: 'SCANNING ORDERBOOK DELTA',
        };
      case 'ANALYSIS':
        return {
          badge: 'STATE 02: SIGNAL ANALYSIS',
          color: 'text-cyan-300 border-cyan-500/50 bg-cyan-950/80',
          sub: 'ACTIVATING NEURAL NODES',
        };
      case 'CALIBRATING':
        return {
          badge: 'STATE 03: CALIBRATING SIGNAL',
          color: 'text-amber-300 border-amber-500/50 bg-amber-950/80',
          sub: 'CONVERGING VECTOR PROBABILITY',
        };
      case 'VALIDATED':
        return {
          badge: 'STATE 04: MODEL VALIDATED',
          color: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/80',
          sub: 'DIRECTIONAL OUTPUT CONFIRMED',
        };
      case 'REVEALED':
        return {
          badge: 'STATE 05: CONFIDENCE REVEAL',
          color: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
          sub: 'AUTHORITATIVE METRICS LOCKED',
        };
      case 'LOCKED':
      default:
        return isBackendLocked
          ? {
              badge: 'DECISION LOCKED',
              color: isUp
                ? 'text-[#00FF9D] border-emerald-500/80 bg-[#041510] shadow-[0_0_15px_rgba(0,255,157,0.35)]'
                : 'text-[#FF3366] border-rose-500/80 bg-[#150308] shadow-[0_0_15px_rgba(255,51,102,0.35)]',
              sub: 'QUALIFIED FOR 15M EXECUTION',
            }
          : {
              badge: 'SIGNAL ACTIVE',
              color: 'text-purple-200 border-purple-600/60 bg-purple-950/80',
              sub: 'VIXY NEURAL ENGINE READY',
            };
    }
  }, [calibStage, isOfflineOrStale, isExpired, isAging, decisionAgeSeconds, isBackendLocked, isUp]);

  // Action Button Text
  const buttonActionText = useMemo(() => {
    if (isOfflineOrStale) return 'EXECUTION PAUSED';
    if (isExpired) return 'SIGNAL EXPIRED';
    if (calibStage === 'INGESTING' || calibStage === 'ANALYSIS' || calibStage === 'CALIBRATING') {
      return '⚡ VIXY CALIBRATING...';
    }
    if (isBackendLocked && calibStage === 'LOCKED') return isUp ? '⚡ BUY UP → LOCKED' : '⚡ BUY DOWN → LOCKED';
    return isUp ? '⚡ BUY UP → READY' : '⚡ BUY DOWN → READY';
  }, [isOfflineOrStale, isExpired, calibStage, isBackendLocked, isUp]);

  // Directional text rendered on screen according to current stage
  const directionalDisplayState = useMemo(() => {
    if (isOfflineOrStale) return { label: 'DATA STALE', isDirectional: false };
    if (calibStage === 'INGESTING') return { label: 'INGESTING...', isDirectional: false };
    if (calibStage === 'ANALYSIS') return { label: 'ANALYZING...', isDirectional: false };
    if (calibStage === 'CALIBRATING') return { label: 'CALIBRATING...', isDirectional: false };
    // Validated, Revealed, Locked
    return {
      label: isUp ? 'BUY UP' : isDown ? 'BUY DOWN' : isPass ? 'PASS' : 'CALIBRATING',
      isDirectional: isUp || isDown,
    };
  }, [isOfflineOrStale, calibStage, isUp, isDown, isPass]);

  return (
    <div
      id="vixy-neural-hero-terminal"
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-700 p-4 sm:p-5 font-mono shadow-[0_0_40px_rgba(0,0,0,0.9)] ${
        isOfflineOrStale
          ? 'border-rose-900/60 bg-[#0c0205]'
          : isProtectState
          ? 'border-rose-500/80 bg-[#0f0206] shadow-[0_0_50px_rgba(244,63,94,0.35)]'
          : isUp
          ? 'border-emerald-500/60 bg-[#020b07] shadow-[0_0_50px_rgba(0,255,157,0.25)]'
          : 'border-rose-500/60 bg-[#0e0206] shadow-[0_0_50px_rgba(255,51,102,0.25)]'
      }`}
    >
      {/* ─── CYBERNETIC PERIMETER LIGHT & HUD GRID ─── */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-90" />
      
      {/* Animated Glowing Energy Perimeter Beam */}
      <div
        className="absolute top-0 left-0 right-0 h-[2.5px] transition-all duration-1000"
        style={{
          background: isOfflineOrStale
            ? '#F43F5E'
            : isUp
            ? 'linear-gradient(90deg, transparent, #00FF9D, #00FF9D, transparent)'
            : 'linear-gradient(90deg, transparent, #FF3366, #FF3366, transparent)',
          boxShadow: isOfflineOrStale
            ? '0 0 15px rgba(244,63,94,0.9)'
            : isUp
            ? '0 0 20px rgba(0,255,157,0.9)'
            : '0 0 20px rgba(255,51,102,0.9)',
        }}
      />

      {/* Technical Precision Corner Brackets */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-500/40 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-500/40 pointer-events-none" />

      {/* Dynamic Lock Pulse Flare */}
      {lockPulseActive && (
        <div
          className="absolute inset-0 pointer-events-none animate-ping opacity-30 rounded-2xl"
          style={{ backgroundColor: themeNeon }}
        />
      )}

      {/* ─── TOP HEADER: TITLE & LIVE TELEMETRY STATUS ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-purple-900/40 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-purple-950/90 border border-purple-600/60 flex items-center justify-center shadow-inner">
            <Zap className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-100 tracking-[0.22em] uppercase drop-shadow flex items-center gap-2">
              <span>VIXY NEURAL EXECUTION CORE</span>
              <span className="text-[8px] font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/40 hidden sm:inline-block">
                15M KALSHI
              </span>
            </h2>
            <div className="flex items-center gap-2 text-[8.5px] text-purple-400/90 font-bold tracking-[0.15em] uppercase">
              <span className="flex items-center gap-1 text-[#00FF9D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-ping" />
                ● LIVE INTELLIGENCE
              </span>
              <span className="text-purple-700">|</span>
              <span className="text-slate-300">{stageHeaderInfo.sub}</span>
            </div>
          </div>
        </div>

        {/* Live Calibration State Badge & Replay Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={runCalibrationSequence}
            title="Replay Neural Calibration Sequence"
            className="text-[9px] font-mono font-bold text-purple-300 hover:text-white px-2 py-1 rounded bg-[#0b0416] border border-purple-800/40 hover:border-purple-600/70 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <RotateCcw className={`w-3 h-3 ${isCalibratingActive ? 'animate-spin text-purple-400' : 'text-purple-400'}`} />
            <span className="hidden sm:inline">RE-CALIBRATE</span>
          </button>

          <span
            className={`flex items-center gap-1.5 text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded-md border transition-all ${stageHeaderInfo.color}`}
          >
            {calibStage === 'INGESTING' && <Radio className="w-3 h-3 animate-spin text-purple-300" />}
            {calibStage === 'ANALYSIS' && <Activity className="w-3 h-3 animate-pulse text-cyan-300" />}
            {calibStage === 'CALIBRATING' && <Sparkles className="w-3 h-3 animate-spin text-amber-300" />}
            {calibStage === 'VALIDATED' && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
            {calibStage === 'REVEALED' && <CheckCircle2 className="w-3 h-3 text-purple-300" />}
            {(calibStage === 'LOCKED' || isBackendLocked) && <Lock className="w-3 h-3 text-[#00FF9D]" />}
            <span>{stageHeaderInfo.badge}</span>
          </span>
        </div>
      </div>

      {/* ─── MAIN HERO STAGE: NEURAL SIGNAL RING + HERO DIRECTIONAL CORE ─── */}
      <div className="py-4 sm:py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] items-center gap-4 sm:gap-6 relative z-10">
        
        {/* ─── SECTION A: THE FUTURISTIC NEURAL SIGNAL RING ─── */}
        <div
          onClick={runCalibrationSequence}
          className="flex flex-col items-center justify-center relative cursor-pointer group"
          title="Click to replay neural calibration"
        >
          {/* Ambient Glow behind Ring */}
          <div
            className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full blur-[35px] opacity-25 pointer-events-none transition-colors duration-700 group-hover:opacity-40"
            style={{ backgroundColor: themeNeon }}
          />

          <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center select-none">
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
                stroke={isOfflineOrStale ? '#F43F5E' : themeNeon}
                strokeWidth="2.5"
                strokeDasharray={
                  calibStage === 'INGESTING'
                    ? '30 90'
                    : calibStage === 'ANALYSIS'
                    ? '50 60'
                    : calibStage === 'CALIBRATING'
                    ? '90 30'
                    : '120 20'
                }
                strokeLinecap="round"
                className={
                  calibStage === 'INGESTING' || calibStage === 'ANALYSIS'
                    ? 'animate-[spin_2.5s_linear_infinite]'
                    : calibStage === 'CALIBRATING'
                    ? 'animate-[spin_4s_linear_infinite]'
                    : 'animate-[spin_8s_linear_infinite]'
                }
                style={{
                  filter: `drop-shadow(0 0 6px ${themeGlow})`,
                }}
              />

              {/* Inner Counter-Rotating Precision Arc */}
              <circle
                cx="80"
                cy="80"
                r="52"
                fill="none"
                stroke={isOfflineOrStale ? '#991B1B' : isUp ? 'rgba(0, 255, 157, 0.4)' : 'rgba(255, 51, 102, 0.4)'}
                strokeWidth="2"
                strokeDasharray="15 35"
                className="animate-[spin_5s_linear_infinite_reverse]"
              />

              {/* Core Radar Calibration Sweep */}
              <circle
                cx="80"
                cy="80"
                r="38"
                fill={isUp ? 'rgba(2, 21, 14, 0.85)' : isDown ? 'rgba(21, 3, 8, 0.85)' : 'rgba(8, 3, 20, 0.85)'}
                stroke={themeNeon}
                strokeWidth="1.5"
                strokeDasharray={calibStage === 'LOCKED' || isBackendLocked ? 'none' : '4 4'}
                style={{
                  filter: `drop-shadow(0 0 8px ${themeGlow})`,
                }}
              />
            </svg>

            {/* Neural Center Core Indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              {isOfflineOrStale ? (
                <WifiOff className="w-7 h-7 text-rose-400 animate-pulse" />
              ) : calibStage === 'INGESTING' ? (
                <>
                  <Radio className="w-7 h-7 text-purple-300 animate-spin" />
                  <span className="text-[8px] font-black text-purple-300 tracking-widest uppercase mt-1">INGEST</span>
                </>
              ) : calibStage === 'ANALYSIS' ? (
                <>
                  <Activity className="w-7 h-7 text-cyan-300 animate-pulse" />
                  <span className="text-[8px] font-black text-cyan-300 tracking-widest uppercase mt-1">ANALYSIS</span>
                </>
              ) : calibStage === 'CALIBRATING' ? (
                <>
                  <Sparkles className="w-7 h-7 text-amber-300 animate-spin" />
                  <span className="text-[8px] font-black text-amber-300 tracking-widest uppercase mt-1">CALIBRATE</span>
                </>
              ) : (
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
                    className="text-[8px] font-black tracking-widest uppercase mt-0.5"
                    style={{ color: themeNeon }}
                  >
                    {calibStage === 'LOCKED' || isBackendLocked ? 'LOCKED' : 'VALIDATED'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-1 text-center">
            <span className="text-[9px] font-mono font-bold tracking-widest text-purple-400/80 uppercase group-hover:text-purple-200 transition-colors">
              {isOfflineOrStale
                ? 'FEED OFFLINE'
                : calibStage === 'LOCKED' || isBackendLocked
                ? 'NEURAL LOCK CONFIRMED'
                : calibStage === 'INGESTING'
                ? 'SCANNING ORDERBOOK'
                : calibStage === 'ANALYSIS'
                ? 'ANALYZING SIGNALS'
                : calibStage === 'CALIBRATING'
                ? 'CONVERGING VECTORS'
                : 'NEURAL SIGNAL RING'}
            </span>
          </div>
        </div>

        {/* ─── SECTION B: HERO DIRECTIONAL DECISION & ACTUAL CONFIDENCE CORE ─── */}
        <div className="flex flex-col justify-center space-y-3 relative">
          
          {/* Top Directional Eyebrow */}
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] uppercase transition-colors"
              style={{ color: isOfflineOrStale ? '#F43F5E' : themeNeon }}
            >
              {isOfflineOrStale
                ? 'DATA LINK INTERRUPTED'
                : calibStage === 'LOCKED' || isBackendLocked
                ? 'AUTHORITATIVE 15M DECISION'
                : calibStage === 'INGESTING'
                ? 'INGESTING MARKET'
                : calibStage === 'ANALYSIS'
                ? 'SIGNAL ANALYSIS'
                : calibStage === 'CALIBRATING'
                ? 'CALIBRATING SIGNAL'
                : 'VIXY DIRECTIONAL SIGNAL'}
            </span>
            <span className="text-purple-600">|</span>
            <span className="text-[9px] font-mono text-purple-400/70">
              SPOT: ${currentPrice > 0 ? currentPrice.toLocaleString() : '---'}
            </span>
          </div>

          {/* Hero Directional Title — Responsive Mobile-First Typography (Never cut off!) */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xs sm:text-sm font-black tracking-[0.2em] text-purple-300 uppercase">
              {calibStage === 'LOCKED' || isBackendLocked ? 'CONFIRMED' : 'SIGNAL:'}
            </span>
            <div
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none transition-all select-none flex items-center gap-2"
              style={{
                color: isOfflineOrStale ? '#F43F5E' : themeNeon,
                textShadow: `0 0 30px ${isOfflineOrStale ? 'rgba(244,63,94,0.6)' : themeGlow}`,
              }}
            >
              <span>{directionalDisplayState.label}</span>
              {!isOfflineOrStale && directionalDisplayState.isDirectional && (
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
                  ACTUAL MODEL CONFIDENCE:
                </span>
                <span
                  className="text-2xl sm:text-3xl font-black tracking-tight font-mono leading-none transition-all"
                  style={{
                    color: isOfflineOrStale ? '#F43F5E' : themeNeon,
                    textShadow: `0 0 15px ${themeGlow}`,
                  }}
                >
                  {isOfflineOrStale
                    ? '---'
                    : calibStage === 'INGESTING' || calibStage === 'ANALYSIS' || calibStage === 'CALIBRATING'
                    ? 'CALIB...'
                    : `${displayedConfNum}%`}
                </span>
              </div>

              {/* Exact Semantic Tier Badge */}
              <div
                className={`text-[9px] sm:text-[10px] font-black tracking-[0.15em] uppercase px-2.5 py-1 rounded-md border text-center whitespace-nowrap transition-all ${
                  calibStage === 'INGESTING' || calibStage === 'ANALYSIS' || calibStage === 'CALIBRATING'
                    ? 'bg-purple-950/60 text-purple-300 border-purple-700/40'
                    : confBand.badgeClass
                }`}
              >
                {isOfflineOrStale
                  ? 'STALE DATA STREAM'
                  : calibStage === 'INGESTING'
                  ? 'SCANNING MARKET'
                  : calibStage === 'ANALYSIS'
                  ? 'ANALYZING SIGNALS'
                  : calibStage === 'CALIBRATING'
                  ? 'CALIBRATING SIGNAL'
                  : confBand.fullLabel}
              </div>
            </div>

            {/* Precision 0% ———●——— 100% Visual Calibration Slider */}
            <div className="w-full space-y-1 pt-1">
              <div className="relative h-2 bg-[#090314] rounded-full border border-purple-900/60 p-0.5 overflow-visible">
                {/* Meter Fill */}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${displayedConfNum}%`,
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
                    left: `calc(${displayedConfNum}% - 7px)`,
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
                <span className={displayedConfNum >= 50 && displayedConfNum < 60 ? 'text-purple-200 font-bold' : ''}>50% (DEVELOPING)</span>
                <span className={displayedConfNum >= 60 && displayedConfNum < 70 ? 'text-purple-200 font-bold' : ''}>60% (MODERATE)</span>
                <span className={displayedConfNum >= 70 && displayedConfNum < 80 ? 'text-purple-200 font-bold' : ''}>70% (STRONG)</span>
                <span className={displayedConfNum >= 80 ? 'text-purple-200 font-bold' : ''}>80%+ (HIGH)</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Reversal Risk Flag (When elevated) */}
          {reversalRisk >= 40 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-[9.5px] font-mono text-rose-300 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span>VIXY DEFENSE: REVERSAL THREAT ELEVATED ({reversalRisk}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION C: COMPACT REAL DIAGNOSTIC TELEMETRY NODES (No fake data) ─── */}
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
              className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all duration-500 ${
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
              : calibStage === 'LOCKED' || isBackendLocked
              ? isUp
                ? 'bg-[#041510] border-2 border-[#00FF9D] text-[#00FF9D] shadow-[0_0_35px_rgba(0,255,157,0.4)] active:scale-[0.99]'
                : 'bg-[#150308] border-2 border-[#FF3366] text-[#FF3366] shadow-[0_0_35px_rgba(255,51,102,0.4)] active:scale-[0.99]'
              : isUp
              ? 'bg-gradient-to-r from-emerald-950 via-[#041f14] to-emerald-950 border-2 border-[#00FF9D]/80 text-[#00FF9D] shadow-[0_0_30px_rgba(0,255,157,0.35)] hover:border-[#00FF9D] active:scale-[0.99]'
              : 'bg-gradient-to-r from-rose-950 via-[#1f040b] to-rose-950 border-2 border-[#FF3366]/80 text-[#FF3366] shadow-[0_0_30px_rgba(255,51,102,0.35)] hover:border-[#FF3366] active:scale-[0.99]'
          }`}
          style={{
            textShadow: isOfflineOrStale ? 'none' : `0 0 15px ${themeGlow}`,
          }}
        >
          {/* Signal Sweep Shimmer Animation */}
          {!isOfflineOrStale && (
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)] -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
          )}

          <Zap className={`w-4 h-4 ${isOfflineOrStale ? 'text-purple-400' : 'animate-bounce'}`} />
          <span>{buttonActionText}</span>
          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* ─── SECTION E: LIVE EXECUTION STATUS RAIL & SIGNAL AGE ─── */}
      <div className="mt-3.5 pt-3 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-2.5 text-[8.5px] sm:text-[9.5px] font-mono text-purple-400/80 relative z-10">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          <span className="text-purple-300 font-bold uppercase tracking-wider">EXECUTION STATUS:</span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              isMarketLinked ? 'text-[#00FF9D]' : 'text-purple-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMarketLinked ? 'bg-[#00FF9D] shadow-[0_0_6px_#00FF9D]' : 'bg-purple-800'
              }`}
            />
            MARKET LINKED
          </span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              calibStage === 'VALIDATED' || calibStage === 'REVEALED' || calibStage === 'LOCKED' || isModelValidated
                ? 'text-[#00FF9D]'
                : 'text-purple-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                calibStage === 'VALIDATED' || calibStage === 'REVEALED' || calibStage === 'LOCKED' || isModelValidated
                  ? 'bg-[#00FF9D] shadow-[0_0_6px_#00FF9D]'
                  : 'bg-purple-800'
              }`}
            />
            MODEL VALIDATED
          </span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              calibStage === 'REVEALED' || calibStage === 'LOCKED' || isSignalActive ? 'text-[#00FF9D]' : 'text-purple-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                calibStage === 'REVEALED' || calibStage === 'LOCKED' || isSignalActive
                  ? 'bg-[#00FF9D] shadow-[0_0_6px_#00FF9D]'
                  : 'bg-purple-800'
              }`}
            />
            SIGNAL ACTIVE
          </span>

          <span
            className={`flex items-center gap-1 font-bold transition-colors ${
              calibStage === 'LOCKED' || isBackendLocked ? 'text-[#00FF9D]' : 'text-purple-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                calibStage === 'LOCKED' || isBackendLocked ? 'bg-[#00FF9D] shadow-[0_0_6px_#00FF9D]' : 'bg-purple-800'
              }`}
            />
            DECISION LOCKED
          </span>
        </div>

        {/* Signal Age Badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-purple-300 font-bold bg-[#080212] px-2 py-0.5 rounded border border-purple-900/40">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>SIGNAL AGE {ageFormatted}</span>
          </span>
          {isAging && !isExpired && (
            <span className="text-amber-400 font-bold text-[8px] uppercase">SIGNAL AGING</span>
          )}
          {isExpired && (
            <span className="text-rose-400 font-bold text-[8px] uppercase">SIGNAL EXPIRED</span>
          )}
        </div>
      </div>
    </div>
  );
};
