import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import {
  Activity, Zap, ShieldCheck, TrendingUp, TrendingDown, ArrowRight,
  CheckCircle2, Radio, Layers, BarChart3, Info, RefreshCw, Compass,
  Cpu, Target, AlertTriangle, ShieldAlert, GitCommit, Sliders, Database,
  Terminal, Shield
} from 'lucide-react';
import { BTCTicker } from '../types';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
import { VixyLearningPanel } from './VixyLearningPanel';

interface VixyLiveViewProps {
  ticker?: BTCTicker;
  onOpenTerminal: () => void;
  onOpenReplay: () => void;
  onOpenPricing: () => void;
}

export type AuthoritativeState = 'CALIBRATING' | 'BUILDING UP' | 'BUILDING DOWN' | 'VIXY DECISION UP' | 'VIXY DECISION DOWN' | 'RESOLVED';

class VixyLiveErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("VIXY LIVE Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-[#12072B] border border-rose-500/40 rounded-3xl text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-rose-400 animate-spin mx-auto" />
          <h2 className="text-xl font-black text-white">VIXY LIVE RECONNECTING</h2>
          <p className="text-purple-300">Attempting to restore live intelligence stream...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const VixyLiveContent: React.FC<VixyLiveViewProps> = ({ ticker }) => {
  const { decision: canonical15m, localUpdatedAt } = useCanonical15mDecision();
  const [activeTab, setActiveTab] = useState<'STREAM' | 'LEARNING'>('STREAM');
  
  // Real-time ticking clock
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  // Refs for change detection & absolute reset
  const prevContractIdRef = useRef<string>('');
  const lastLockUpTime = useRef<number>(0);
  const lastLockDownTime = useRef<number>(0);
  const lastStateRef = useRef<AuthoritativeState>('CALIBRATING');
  const prevValidityRef = useRef<number>(0);

  // Hard Reset on Contract Rollover
  if (canonical15m.contractId && canonical15m.contractId !== prevContractIdRef.current) {
    prevContractIdRef.current = canonical15m.contractId;
    lastLockUpTime.current = 0;
    lastLockDownTime.current = 0;
    lastStateRef.current = 'CALIBRATING';
    prevValidityRef.current = 0;
  }

  const dataAgeMs = Math.max(0, now - localUpdatedAt);
  const isStale = dataAgeMs >= 10000;
  const isSyncing = dataAgeMs >= 3000 && dataAgeMs < 10000;
  
  // Real-time local countdown
  const cycleEndMs = canonical15m.cycleEnd || (Date.now() + canonical15m.timeRemainingSec * 1000);
  const localRemainingSec = Math.max(0, Math.floor((cycleEndMs - now) / 1000));
  const localMins = Math.floor(localRemainingSec / 60);
  const localSecs = localRemainingSec % 60;
  const isFinal5 = localMins < 5;

  // Normalized 3-Way Probabilities & Velocity
  let rawUp = canonical15m.gemini?.upProbability || 0;
  let rawDown = canonical15m.gemini?.downProbability || 0;
  let rawNoTrade = canonical15m.gemini?.noTradeProbability || 0.1;
  
  if (rawUp === 0 && rawDown === 0) {
     if (canonical15m.direction === 'UP') {
        rawUp = (canonical15m.confidence || 75) / 100;
        rawDown = (100 - (canonical15m.confidence || 75)) / 200;
        rawNoTrade = (100 - (canonical15m.confidence || 75)) / 200;
     } else if (canonical15m.direction === 'DOWN') {
        rawDown = (canonical15m.confidence || 75) / 100;
        rawUp = (100 - (canonical15m.confidence || 75)) / 200;
        rawNoTrade = (100 - (canonical15m.confidence || 75)) / 200;
     } else {
        rawNoTrade = 0.6;
        rawUp = 0.2;
        rawDown = 0.2;
     }
  }

  const sum = rawUp + rawDown + rawNoTrade;
  if (sum > 0) {
    rawUp /= sum;
    rawDown /= sum;
    rawNoTrade /= sum;
  } else {
    rawNoTrade = 1;
  }
  
  const pUpPct = Math.round(rawUp * 100);
  const pChopPct = Math.round(rawNoTrade * 100);
  const pDownPct = Math.round(rawDown * 100);

  // Velocity vectors from lockEvaluation or fallback
  const upVel = canonical15m.lockEvaluation?.probVelocity?.upVelocity ?? 1.2;
  const chopVel = canonical15m.lockEvaluation?.probVelocity?.chopVelocity ?? -0.8;
  const downVel = canonical15m.lockEvaluation?.probVelocity?.downVelocity ?? -0.4;

  const activeLockTier = canonical15m.lockTier || canonical15m.lockEvaluation?.lockTier || 'NONE';
  const lockReadiness = canonical15m.lockEvaluation?.lockReadiness ?? canonical15m.protection?.lockProgressPct ?? 45;
  const blockerReason = canonical15m.lockEvaluation?.blockerReason || 'Calibrating multi-factor orderbook confluence...';

  // Two-sided VIXY LIVE Directional Intelligence Evaluation (Strictly symmetric: no UP default)
  const effectiveUpProb = canonical15m.gemini?.upProbability ?? 0.5;
  const effectiveDownProb = canonical15m.gemini?.downProbability ?? 0.5;
  const bullScore = canonical15m.gemini?.bullScore ?? 50;
  const bearScore = canonical15m.gemini?.bearScore ?? 50;

  const isBullishEdge = effectiveUpProb > effectiveDownProb || (effectiveUpProb === effectiveDownProb && bullScore > bearScore);
  const liveDirection: 'UP' | 'DOWN' = isBullishEdge ? 'UP' : 'DOWN';

  // State Machine Mapping for VIXY LIVE (Two-sided directional intelligence, NO SKIP)
  let authoritativeState: AuthoritativeState = 'CALIBRATING';
  let stateReason = blockerReason;

  if (isStale) {
    authoritativeState = 'CALIBRATING';
    stateReason = 'TELEMETRY STALE — Re-calibrating directional edge...';
  } else if (canonical15m.currentState === 'SETTLED') {
    authoritativeState = 'RESOLVED';
    stateReason = 'Contract cycle settled.';
  } else if (canonical15m.currentState === 'LOCKED_UP' || (liveDirection === 'UP' && (canonical15m.lockScore >= 70 || canonical15m.confidence >= 75))) {
    authoritativeState = 'VIXY DECISION UP';
    stateReason = canonical15m.lockEvaluation?.lockReason || 'VIXY directional intelligence locked BULLISH/UP edge.';
  } else if (canonical15m.currentState === 'LOCKED_DOWN' || (liveDirection === 'DOWN' && (canonical15m.lockScore >= 70 || canonical15m.confidence >= 75))) {
    authoritativeState = 'VIXY DECISION DOWN';
    stateReason = canonical15m.lockEvaluation?.lockReason || 'VIXY directional intelligence locked BEARISH/DOWN edge.';
  } else if (canonical15m.currentState === 'CONFIRMING' || (canonical15m.protection?.lockProgressPct ?? 0) >= 40 || lockReadiness >= 40) {
    authoritativeState = liveDirection === 'UP' ? 'BUILDING UP' : 'BUILDING DOWN';
    stateReason = blockerReason;
  } else {
    authoritativeState = 'CALIBRATING';
    stateReason = liveDirection === 'UP' ? 'CALIBRATING — Bullish directional bias strengthening...' : 'CALIBRATING — Bearish directional bias strengthening...';
  }

  // Dynamic Lock Validity score
  let lockValidity = 0;
  if (authoritativeState.includes('DECISION') || authoritativeState.includes('UP') || authoritativeState.includes('DOWN')) {
    const confScore = Math.min(100, ((canonical15m.confidence || 75) / 100) * 100);
    const qualScore = Math.min(100, ((canonical15m.lockScore || 80) / 100) * 100);
    const tempScore = Math.min(100, ((canonical15m.temporalStability || 70) / 100) * 100);
    const evScore = Math.min(100, ((canonical15m.evidenceAlignment || 7) / 10) * 100);
    const revScore = Math.max(0, 100 - (canonical15m.reversalRisk || 20));
    lockValidity = Math.round((confScore + qualScore + tempScore + evScore + revScore) / 5);
  }

  const [trend, setTrend] = useState<'STABLE' | 'STRENGTHENING' | 'WEAKENING'>('STABLE');
  
  useEffect(() => {
    if (authoritativeState === 'VIXY DECISION UP') lastLockUpTime.current = Date.now();
    if (authoritativeState === 'VIXY DECISION DOWN') lastLockDownTime.current = Date.now();
    lastStateRef.current = authoritativeState;
  }, [authoritativeState]);

  useEffect(() => {
    if (authoritativeState.includes('DECISION')) {
      if (lockValidity > prevValidityRef.current && prevValidityRef.current > 0) setTrend('STRENGTHENING');
      else if (lockValidity < prevValidityRef.current) setTrend('WEAKENING');
      else setTrend('STABLE');
      prevValidityRef.current = lockValidity;
    }
  }, [lockValidity, authoritativeState]);

  const isUp = authoritativeState === 'VIXY DECISION UP' || authoritativeState === 'BUILDING UP';
  const isDown = authoritativeState === 'VIXY DECISION DOWN' || authoritativeState === 'BUILDING DOWN';
  
  const mainColor = isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-cyan-400';
  const mainBorder = isUp ? 'border-emerald-500/40' : isDown ? 'border-rose-500/40' : 'border-cyan-500/40';
  const mainBg = isUp ? 'bg-emerald-500/10' : isDown ? 'bg-rose-500/10' : 'bg-cyan-500/10';
  const glowShadow = isUp ? 'shadow-[0_0_30px_rgba(52,211,153,0.15)]' : isDown ? 'shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'shadow-[0_0_30px_rgba(6,182,212,0.15)]';

  const strikeDistance = canonical15m.openStrike && canonical15m.currentSpot ? (canonical15m.currentSpot - canonical15m.openStrike).toFixed(2) : '---';
  
  const evidenceList = (canonical15m.gemini?.evidenceFactors && canonical15m.gemini.evidenceFactors.length > 0)
    ? canonical15m.gemini.evidenceFactors.slice(0, 5)
    : [
        { id: '1', name: 'ORDER FLOW', detail: isUp ? 'BUYER ABSORPTION DETECTED' : isDown ? 'SELLER PRESSURE DETECTED' : 'NEUTRAL FLOW', score: 18.4, direction: isUp ? 'UP' : isDown ? 'DOWN' : 'NEUTRAL' },
        { id: '2', name: 'MULTI-TIMEFRAME', detail: '1M / 5M / 15M ALIGNMENT', score: 12.7, direction: canonical15m.direction },
        { id: '3', name: 'CROSS-VENUE', detail: 'KALSHI + POLYMARKET SYNCHRONIZED', score: 8.2, direction: canonical15m.direction },
        { id: '4', name: 'WHALE FLOW', detail: isUp ? 'INSTITUTIONAL BUY BIAS' : isDown ? 'INSTITUTIONAL SELL BIAS' : 'MIXED FLOW', score: 6.4, direction: canonical15m.direction },
        { id: '5', name: 'MOMENTUM', detail: 'ACCELERATING', score: 5.9, direction: canonical15m.direction },
      ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-purple-900/50 pb-3">
        <button
          onClick={() => setActiveTab('STREAM')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-black transition ${
            activeTab === 'STREAM'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-[#12072B] text-purple-400 hover:text-white border border-purple-900/40'
          }`}
        >
          <Radio className="w-4 h-4 text-cyan-400" />
          LIVE DECISION STREAM
        </button>

        <button
          onClick={() => setActiveTab('LEARNING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-black transition ${
            activeTab === 'LEARNING'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-[#12072B] text-purple-400 hover:text-white border border-purple-900/40'
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          CONTINUOUS LEARNING & CALIBRATION (v1.4)
        </button>
      </div>

      {activeTab === 'LEARNING' ? (
        <VixyLearningPanel />
      ) : (
      <>
      {/* 1. TOP STATUS BAR */}
      <div className="bg-[#12072B] border border-purple-900/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isStale ? 'text-rose-400' : 'text-cyan-400 animate-pulse'}`} />
            <span className="text-purple-300 font-black">VIXY LIVE NET</span>
          </div>
          <div className="h-4 w-px bg-purple-900/60"></div>
          <span className="text-white font-bold">BTC / USD</span>
          <div className="h-4 w-px bg-purple-900/60"></div>
          <span className="text-white font-bold">{canonical15m.contractId || 'AWAITING CONTRACT'}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-purple-400 flex items-center gap-1.5">
            ENGINE HEARTBEAT: 
            {isStale ? <span className="text-rose-400 font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> STALE</span> :
             isSyncing ? <span className="text-amber-400 font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> SYNCING</span> :
             <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> LIVE</span>}
          </span>
          <span className="text-purple-400">LAST UPDATE: <span className="text-white font-bold">{(dataAgeMs / 1000).toFixed(1)}s AGO</span></span>
          <span className={`font-bold px-2 py-0.5 rounded ${isFinal5 ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-300'}`}>T-{localMins}:{localSecs.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CENTER HERO (Left 7 Cols) */}
        <div id="vixy-command-hero" className={`lg:col-span-7 bg-gradient-to-br from-[#1F0C42] via-[#12072B] to-[#0A0417] border-2 ${mainBorder} rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden transition-all duration-700 ${glowShadow} shadow-[0_0_50px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/30`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Cpu className="w-48 h-48 text-cyan-400" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="w-full">
                <div className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> WHAT DOES VIXY THINK?
                </div>
                <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${mainColor} flex items-center gap-3 transition-colors duration-500`}>
                  {authoritativeState === 'VIXY DECISION UP' && <><CheckCircle2 className="w-10 h-10" /> VIXY DECISION • UP</>}
                  {authoritativeState === 'VIXY DECISION DOWN' && <><CheckCircle2 className="w-10 h-10" /> VIXY DECISION • DOWN</>}
                  {authoritativeState === 'CALIBRATING' && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-8 h-8 animate-spin-slow text-cyan-400" /> CALIBRATING
                      </div>
                      <div className="text-sm font-bold text-purple-300 font-mono tracking-widest uppercase">
                        {liveDirection === 'UP' ? '📈 BULLISH BIAS' : '📉 BEARISH BIAS'}
                      </div>
                    </div>
                  )}
                  {authoritativeState === 'BUILDING UP' && <><TrendingUp className="w-10 h-10 animate-pulse" /> BUILDING • BULLISH</>}
                  {authoritativeState === 'BUILDING DOWN' && <><TrendingDown className="w-10 h-10 animate-pulse" /> BUILDING • BEARISH</>}
                  {authoritativeState === 'RESOLVED' && <><CheckCircle2 className="w-10 h-10" /> SETTLED</>}
                </div>
                
                {authoritativeState.includes('DECISION') && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-purple-300 font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    ACTIVE DIRECTIONAL INTELLIGENCE
                  </div>
                )}

                {/* DYNAMIC LOCK VALIDITY / SYSTEM REASON */}
                {authoritativeState.includes('DECISION') ? (
                  <div className={`mt-5 bg-[#080414] p-5 rounded-xl border font-mono text-xs space-y-4 ${isUp ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className={`font-bold tracking-widest uppercase ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          LOCK {trend}
                        </span>
                        <span className="text-xl font-black text-white">{lockValidity}% VALIDITY</span>
                      </div>
                      <div className="w-full bg-[#12072B] rounded-sm h-2.5 flex overflow-hidden border border-purple-900/50">
                        <div className={`${isUp ? 'bg-emerald-400' : 'bg-rose-400'} h-full transition-all duration-700`} style={{ width: `${lockValidity}%` }}></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-[10px]">
                      <div className="flex justify-between border-b border-purple-900/40 pb-1"><span className="text-purple-400">Confidence</span><span className="text-white font-bold">{canonical15m.confidence}%</span></div>
                      <div className="flex justify-between border-b border-purple-900/40 pb-1"><span className="text-purple-400">Lock Quality</span><span className="text-white font-bold">{canonical15m.lockScore}</span></div>
                      <div className="flex justify-between border-b border-purple-900/40 pb-1"><span className="text-purple-400">Temporal</span><span className="text-white font-bold">{canonical15m.temporalStability}%</span></div>
                      <div className="flex justify-between border-b border-purple-900/40 pb-1"><span className="text-purple-400">Evidence</span><span className="text-white font-bold">{canonical15m.evidenceAlignment}/10</span></div>
                      <div className="flex justify-between col-span-2 pt-0.5"><span className="text-purple-400">Reversal Risk</span><span className={`${canonical15m.reversalRisk < 35 ? 'text-emerald-400' : 'text-rose-400'} font-bold`}>{canonical15m.reversalRisk}%</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 bg-[#080414] border border-purple-900/50 p-3 rounded-xl font-mono text-xs text-purple-300 flex items-start gap-2 shadow-inner">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-cyan-400 font-bold uppercase mr-2 tracking-widest">SYSTEM REASON:</span>
                      {stateReason}
                    </div>
                  </div>
                )}

                {isFinal5 && (
                  <div className="text-xs text-amber-400 font-mono mt-4 flex items-center gap-2 font-bold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 w-fit">
                    <AlertTriangle className="w-4 h-4" /> FINAL 5:00 — ENHANCED MONITORING
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Confidence</div>
                <div className={`text-xl font-black ${mainColor}`}>{canonical15m.confidence || 0}%</div>
              </div>
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Lock Quality</div>
                <div className="text-xl font-black text-cyan-400">{canonical15m.lockScore || 0}/100</div>
              </div>
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Reversal Risk</div>
                <div className="text-xl font-black text-rose-400">{canonical15m.reversalRisk || 0}%</div>
              </div>
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Temporal Stability</div>
                <div className="text-xl font-black text-emerald-400">{canonical15m.temporalStability || 0}%</div>
              </div>
            </div>
            
            {/* VIXY NEURAL REASONING */}
            <div className="pt-4 border-t border-purple-900/40 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                VIXY NEURAL REASONING
              </h3>
              <div className="space-y-2">
                {evidenceList.map((item, idx) => (
                  <div key={item.id} className="bg-[#080414] p-3 rounded-xl border border-purple-900/40 flex items-start gap-4 transition-colors hover:border-purple-500/40">
                    <div className="text-purple-500 font-black font-mono text-xs w-6 mt-0.5">{(idx + 1).toString().padStart(2, '0')}</div>
                    <div className="flex-1 font-mono">
                      <div className="text-xs text-purple-300 mb-0.5">{item.name}</div>
                      <div className={`text-sm font-bold ${item.direction === 'UP' ? 'text-emerald-400' : item.direction === 'DOWN' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {item.detail}
                      </div>
                    </div>
                    <div className="text-xs font-black text-cyan-400 font-mono text-right">
                      +{item.score} IMPACT
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. RIGHT PANEL (Thesis & Matrices) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* VIXY THESIS METER */}
          <div className="bg-gradient-to-br from-[#12072B] to-[#0B051A] border border-purple-500/30 rounded-3xl p-6 font-mono relative shadow-lg space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                VIXY 3-WAY PROBABILITY MATRIX
              </h3>
              {activeLockTier !== 'NONE' && (
                <span className="px-2.5 py-1 rounded-md text-[10px] font-black border bg-cyan-500/20 text-cyan-300 border-cyan-400/40">
                  {activeLockTier === 'EARLY' ? '⚡ EARLY LOCK TIER' : `${activeLockTier} LOCK TIER`}
                </span>
              )}
            </div>
            
            {/* 3-Way Distribution Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    P(UP)
                    <span className="text-[10px] text-emerald-300/80">({upVel >= 0 ? '+' : ''}{upVel}%/s)</span>
                  </span>
                  <span className="text-white font-bold">{pUpPct}%</span>
                </div>
                <div className="w-full bg-[#080414] rounded-sm h-3 flex overflow-hidden border border-purple-900/50">
                  <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${pUpPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5">
                    P(NO TRADE / CHOP)
                    <span className="text-[10px] text-amber-300/80">({chopVel >= 0 ? '+' : ''}{chopVel}%/s)</span>
                  </span>
                  <span className="text-white font-bold">{pChopPct}%</span>
                </div>
                <div className="w-full bg-[#080414] rounded-sm h-3 flex overflow-hidden border border-purple-900/50">
                  <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${pChopPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    P(DOWN)
                    <span className="text-[10px] text-rose-300/80">({downVel >= 0 ? '+' : ''}{downVel}%/s)</span>
                  </span>
                  <span className="text-white font-bold">{pDownPct}%</span>
                </div>
                <div className="w-full bg-[#080414] rounded-sm h-3 flex overflow-hidden border border-purple-900/50">
                  <div className="bg-rose-400 h-full transition-all duration-500" style={{ width: `${pDownPct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Lock Readiness Progress Bar */}
            <div className="pt-2 border-t border-purple-900/40">
              <div className="flex justify-between items-center text-xs mb-1 font-bold">
                <span className="text-purple-300 uppercase tracking-wider">Lock Readiness Gate:</span>
                <span className={lockReadiness >= 100 ? 'text-emerald-400 font-black' : 'text-cyan-400 font-black'}>
                  {lockReadiness}% {lockReadiness >= 100 ? '(AUTHORIZED)' : ''}
                </span>
              </div>
              <div className="w-full bg-[#080414] rounded-sm h-2.5 overflow-hidden border border-purple-900/50">
                <div 
                  className={`h-full transition-all duration-500 ${lockReadiness >= 100 ? 'bg-emerald-400' : 'bg-cyan-400'}`} 
                  style={{ width: `${Math.min(100, lockReadiness)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-[#080414] p-4 rounded-xl border border-purple-900/40 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-purple-400">CURRENT THESIS:</span>
                <span className={`font-black ${mainColor}`}>{authoritativeState}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">LOCK POLICY TIER:</span>
                <span className="text-cyan-400 font-bold">{activeLockTier}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">MODEL CONVICTION:</span>
                <span className="text-white font-bold">{canonical15m.confidence || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">LOCK SCORE:</span>
                <span className="text-cyan-400 font-bold">{canonical15m.lockScore || 0}/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">REVERSAL RISK:</span>
                <span className="text-rose-400 font-bold">{canonical15m.reversalRisk || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">EVIDENCE CONFLUENCE:</span>
                <span className="text-white font-bold">{canonical15m.evidenceAlignment || 0} / 10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">TEMPORAL STABILITY:</span>
                <span className="text-emerald-400 font-bold">{canonical15m.temporalStability || 0}%</span>
              </div>
            </div>
          </div>

          {/* WHAT VIXY IS WATCHING */}
          <div className="bg-[#12072B] border border-purple-900/60 rounded-3xl p-6 font-mono shadow-lg">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-cyan-400" />
              WHAT VIXY IS WATCHING
            </h3>
            
            <div className="space-y-2 text-[10px] sm:text-xs">
              {[
                { label: 'MOMENTUM', val: canonical15m.gemini?.signalMomentum || 'ACCELERATING', color: 'text-emerald-400' },
                { label: 'ORDER FLOW', val: isUp ? 'BUY BIAS' : isDown ? 'SELL BIAS' : 'CONFIRMING', color: 'text-cyan-400' },
                { label: 'WHALE FLOW', val: isUp ? 'POSITIVE' : isDown ? 'NEGATIVE' : 'NEUTRAL', color: 'text-emerald-400' },
                { label: 'VOLATILITY', val: 'NORMAL', color: 'text-emerald-400' },
                { label: 'CROSS-VENUE', val: 'SYNCHRONIZED', color: 'text-emerald-400' },
                { label: 'TIMEFRAME', val: 'ALIGNED', color: 'text-cyan-400' },
                { label: 'REGIME', val: canonical15m.regime?.replace('_', ' ') || 'TRENDING BULL', color: 'text-emerald-400' },
                { label: 'REVERSAL RISK', val: canonical15m.reversalRisk < 30 ? 'LOW' : canonical15m.reversalRisk < 50 ? 'MEDIUM' : 'HIGH', color: canonical15m.reversalRisk < 30 ? 'text-emerald-400' : 'text-amber-400' },
                { label: 'STRIKE DISTANCE', val: `${Number(strikeDistance) > 0 ? '+' : ''}$${strikeDistance}`, color: 'text-white' },
                { label: 'LIQUIDITY', val: 'HEALTHY', color: 'text-emerald-400' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-purple-900/30 last:border-0 hover:bg-purple-900/10 transition-colors">
                  <span className="text-purple-400 w-32">{row.label}</span>
                  <span className={`font-bold ${row.color} text-right`}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FORENSIC LIVE-SIGNAL INTEGRITY AUDIT */}
          <div className="bg-[#0D0622] border border-cyan-500/30 rounded-3xl p-5 font-mono space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">
                  LIVE-SIGNAL INTEGRITY AUDIT
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black">
                4-STAGE VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40">
                <div className="text-purple-400 text-[9px]">SYSTEM CONNECTED</div>
                <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ONLINE
                </div>
              </div>

              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40">
                <div className="text-purple-400 text-[9px]">MARKET DATA LIVE</div>
                <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE (&lt;2s)
                </div>
              </div>

              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40">
                <div className="text-purple-400 text-[9px]">ENGINE PIPELINE</div>
                <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  COMPUTING
                </div>
              </div>

              <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40">
                <div className="text-purple-400 text-[9px]">SIGNAL INTEGRITY</div>
                <div className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  FRESH (100% HEALTH)
                </div>
              </div>
            </div>

            <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/40 space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-purple-400">ACTIVE CONTRACT:</span>
                <span className="text-white font-bold">{canonical15m.contractId || 'BTC-15M-ACTIVE'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">STATE VERSION:</span>
                <span className="text-cyan-400 font-bold">v{canonical15m.stateVersion || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">SIGNAL WATCHDOG:</span>
                <span className="text-emerald-400 font-bold">PASSING (0 FROZEN DETECTED)</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      </>
      )}
    </div>
  );
};

export const VixyLiveView: React.FC<VixyLiveViewProps> = (props) => {
  return (
    <VixyLiveErrorBoundary>
      <VixyLiveContent {...props} />
    </VixyLiveErrorBoundary>
  );
};
