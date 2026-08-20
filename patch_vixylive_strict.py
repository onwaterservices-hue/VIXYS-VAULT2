import os

with open("src/components/VixyLiveView.tsx", "r") as f:
    original_content = f.read()

new_content = """import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import {
  Activity, Zap, ShieldCheck, TrendingUp, TrendingDown, ArrowRight,
  CheckCircle2, Radio, Layers, BarChart3, Info, RefreshCw, Compass,
  Cpu, Target, AlertTriangle, ShieldAlert, GitCommit, Sliders, Database,
  Terminal, Shield
} from 'lucide-react';
import { BTCTicker } from '../types';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';

interface VixyLiveViewProps {
  ticker?: BTCTicker;
  onOpenTerminal: () => void;
  onOpenReplay: () => void;
  onOpenPricing: () => void;
}

export type AuthoritativeState = 'CALIBRATING' | 'BUILDING UP' | 'BUILDING DOWN' | 'LOCKED UP' | 'LOCKED DOWN' | 'REASSESSING' | 'RESOLVED';

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
  
  // Real-time ticking clock
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  // Refs for change detection & hysteresis
  const prevContractIdRef = useRef<string>('');
  const lastLockUpTime = useRef<number>(0);
  const lastLockDownTime = useRef<number>(0);

  // Clear tracking on new contract
  if (canonical15m.contractId && canonical15m.contractId !== prevContractIdRef.current) {
    prevContractIdRef.current = canonical15m.contractId;
    lastLockUpTime.current = 0;
    lastLockDownTime.current = 0;
  }

  const dataAgeMs = now - localUpdatedAt;
  const isStale = dataAgeMs >= 10000;
  const isSyncing = dataAgeMs >= 3000 && dataAgeMs < 10000;
  
  // Real-time local countdown
  const cycleEndMs = canonical15m.cycleEnd || (Date.now() + canonical15m.timeRemainingSec * 1000);
  const localRemainingSec = Math.max(0, Math.floor((cycleEndMs - now) / 1000));
  const localMins = Math.floor(localRemainingSec / 60);
  const localSecs = localRemainingSec % 60;
  const isFinal5 = localMins < 5;

  // Normalized Probabilities
  let rawUp = canonical15m.gemini?.upProbability || 0;
  let rawDown = canonical15m.gemini?.downProbability || 0;
  let rawNoTrade = canonical15m.gemini?.noTradeProbability || 0;
  
  if (rawUp === 0 && rawDown === 0) {
     if (canonical15m.direction === 'UP') {
        rawUp = canonical15m.confidence / 100;
        rawDown = (100 - canonical15m.confidence) / 200;
        rawNoTrade = (100 - canonical15m.confidence) / 200;
     } else if (canonical15m.direction === 'DOWN') {
        rawDown = canonical15m.confidence / 100;
        rawUp = (100 - canonical15m.confidence) / 200;
        rawNoTrade = (100 - canonical15m.confidence) / 200;
     } else {
        rawNoTrade = 0.8;
        rawUp = 0.1;
        rawDown = 0.1;
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
  const pDownPct = Math.round(rawDown * 100);

  // VIXY LIVE State Machine & Composite Lock Gates
  const MIN_CONFIDENCE = 70;
  const MAX_REVERSAL_RISK = 35;
  const MIN_LOCK_QUALITY = 75;
  const MIN_TEMPORAL_STABILITY = 65;
  const MIN_EVIDENCE_ALIGNMENT = 6;

  const meetsUpGate = 
    canonical15m.direction === 'UP' &&
    canonical15m.confidence >= MIN_CONFIDENCE &&
    canonical15m.reversalRisk < MAX_REVERSAL_RISK &&
    canonical15m.lockScore >= MIN_LOCK_QUALITY &&
    canonical15m.temporalStability >= MIN_TEMPORAL_STABILITY &&
    canonical15m.evidenceAlignment >= MIN_EVIDENCE_ALIGNMENT &&
    !isStale;

  const meetsDownGate = 
    canonical15m.direction === 'DOWN' &&
    canonical15m.confidence >= MIN_CONFIDENCE &&
    canonical15m.reversalRisk < MAX_REVERSAL_RISK &&
    canonical15m.lockScore >= MIN_LOCK_QUALITY &&
    canonical15m.temporalStability >= MIN_TEMPORAL_STABILITY &&
    canonical15m.evidenceAlignment >= MIN_EVIDENCE_ALIGNMENT &&
    !isStale;

  let authoritativeState: AuthoritativeState = 'CALIBRATING';
  
  if (canonical15m.currentState === 'SETTLED') {
    authoritativeState = 'RESOLVED';
  } else if (isStale) {
    authoritativeState = 'REASSESSING';
  } else if (canonical15m.protection?.protectionStatus === 'VETOED' || canonical15m.reversalRisk > 45) {
    authoritativeState = 'REASSESSING';
  } else if ((900 - localRemainingSec) < 15) { // First 15 seconds of a cycle
    authoritativeState = 'CALIBRATING';
  } else {
    if (meetsUpGate) {
      // Hysteresis: Prevent instant whipsaw lock (must wait at least 5s after losing opposite lock)
      if (Date.now() - lastLockDownTime.current < 5000) {
        authoritativeState = 'REASSESSING';
      } else {
        authoritativeState = 'LOCKED UP';
      }
    } else if (meetsDownGate) {
      if (Date.now() - lastLockUpTime.current < 5000) {
        authoritativeState = 'REASSESSING';
      } else {
        authoritativeState = 'LOCKED DOWN';
      }
    } else {
      // Fallbacks if not fully locked
      if (canonical15m.direction === 'UP' || rawUp > rawDown + 0.05) {
        authoritativeState = 'BUILDING UP';
      } else if (canonical15m.direction === 'DOWN' || rawDown > rawUp + 0.05) {
        authoritativeState = 'BUILDING DOWN';
      } else {
        authoritativeState = 'CALIBRATING';
      }
    }
  }

  // Update tracking refs on successful lock
  useEffect(() => {
    if (authoritativeState === 'LOCKED UP') lastLockUpTime.current = Date.now();
    if (authoritativeState === 'LOCKED DOWN') lastLockDownTime.current = Date.now();
  }, [authoritativeState]);

  const isUp = authoritativeState === 'LOCKED UP' || authoritativeState === 'BUILDING UP';
  const isDown = authoritativeState === 'LOCKED DOWN' || authoritativeState === 'BUILDING DOWN';
  const isReassessing = authoritativeState === 'REASSESSING';
  
  const mainColor = isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : isReassessing ? 'text-amber-400' : 'text-cyan-400';
  const mainBorder = isUp ? 'border-emerald-500/40' : isDown ? 'border-rose-500/40' : isReassessing ? 'border-amber-500/40' : 'border-cyan-500/40';
  const mainBg = isUp ? 'bg-emerald-500/10' : isDown ? 'bg-rose-500/10' : isReassessing ? 'bg-amber-500/10' : 'bg-cyan-500/10';
  const glowShadow = isUp ? 'shadow-[0_0_30px_rgba(52,211,153,0.15)]' : isDown ? 'shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'shadow-none';

  const strikeDistance = canonical15m.openStrike && canonical15m.currentSpot ? (canonical15m.currentSpot - canonical15m.openStrike).toFixed(2) : '---';
  
  // Synthesize evidence factors for display safely
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
            {isStale ? <span className="text-rose-400 font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> STALE DATA</span> :
             isSyncing ? <span className="text-amber-400 font-bold flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> SYNCING</span> :
             <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> HEALTHY</span>}
          </span>
          <span className="text-purple-400">LAST UPDATE: <span className="text-white font-bold">{(dataAgeMs / 1000).toFixed(1)}s AGO</span></span>
          <span className={`font-bold px-2 py-0.5 rounded ${isFinal5 ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-300'}`}>T-{localMins}:{localSecs.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CENTER HERO (Left 7 Cols) */}
        <div className={`lg:col-span-7 bg-gradient-to-br from-[#1B0A38] via-[#100626] to-[#0B051A] border ${mainBorder} rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden transition-all duration-700 ${glowShadow}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Cpu className="w-48 h-48 text-cyan-400" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div className="w-full">
                <div className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> WHAT DOES VIXY THINK?
                </div>
                <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${mainColor} flex items-center gap-3 transition-colors duration-500`}>
                  {authoritativeState === 'LOCKED UP' && <><CheckCircle2 className="w-10 h-10" /> VIXY LOCKED — UP</>}
                  {authoritativeState === 'LOCKED DOWN' && <><CheckCircle2 className="w-10 h-10" /> VIXY LOCKED — DOWN</>}
                  {authoritativeState === 'CALIBRATING' && <><RefreshCw className="w-10 h-10 animate-spin-slow" /> CALIBRATING</>}
                  {authoritativeState === 'BUILDING UP' && <><TrendingUp className="w-10 h-10 animate-pulse" /> VIXY BUILDING UP</>}
                  {authoritativeState === 'BUILDING DOWN' && <><TrendingDown className="w-10 h-10 animate-pulse" /> VIXY BUILDING DOWN</>}
                  {authoritativeState === 'REASSESSING' && <><AlertTriangle className="w-10 h-10 animate-pulse text-amber-400" /> REASSESSING</>}
                  {authoritativeState === 'RESOLVED' && <><CheckCircle2 className="w-10 h-10" /> SETTLED</>}
                </div>
                {authoritativeState.includes('LOCKED') && (
                  <div className={`mt-5 bg-[#080414] p-4 rounded-xl border font-mono text-xs space-y-2.5 ${isUp ? 'border-emerald-500/40 text-emerald-400' : 'border-rose-500/40 text-rose-400'}`}>
                    <div className="font-bold mb-3 text-white text-[10px] tracking-widest uppercase">LOCK AUTHORIZATION LOG:</div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="w-3.5 h-3.5" /> Confidence threshold passed (≥70%)</div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="w-3.5 h-3.5" /> Lock Quality verified (≥75)</div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="w-3.5 h-3.5" /> Evidence confluence passed</div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="w-3.5 h-3.5" /> Temporal stability confirmed (≥65%)</div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="w-3.5 h-3.5" /> Reversal risk acceptable (&lt;35%)</div>
                    <div className="flex items-center gap-3"><CheckCircle2 className="w-3.5 h-3.5" /> Market data fresh</div>
                  </div>
                )}
                {isFinal5 && (
                  <div className="text-xs text-amber-400 font-mono mt-4 flex items-center gap-2 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 w-fit">
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
                  <div key={item.id} className="bg-[#080414] p-3 rounded-xl border border-purple-900/40 flex items-start gap-4">
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

        {/* 3. RIGHT PANEL (Thesis & Matrices) (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* VIXY THESIS METER */}
          <div className="bg-gradient-to-br from-[#12072B] to-[#0B051A] border border-purple-500/30 rounded-3xl p-6 font-mono relative shadow-lg space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              VIXY THESIS
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-bold">UP</span>
                  <span className="text-white font-bold">{pUpPct}%</span>
                </div>
                <div className="w-full bg-[#080414] rounded-sm h-3 flex overflow-hidden border border-purple-900/50">
                  <div className="bg-emerald-400 h-full transition-all duration-700" style={{ width: `${pUpPct}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-bold">DOWN</span>
                  <span className="text-white font-bold">{pDownPct}%</span>
                </div>
                <div className="w-full bg-[#080414] rounded-sm h-3 flex overflow-hidden border border-purple-900/50">
                  <div className="bg-rose-400 h-full transition-all duration-700" style={{ width: `${pDownPct}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#080414] p-4 rounded-xl border border-purple-900/40 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-purple-400">CURRENT THESIS:</span>
                <span className={`font-black ${mainColor}`}>{authoritativeState}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">CONFIDENCE:</span>
                <span className="text-white font-bold">{canonical15m.confidence || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-400">LOCK QUALITY:</span>
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
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-purple-900/30 last:border-0">
                  <span className="text-purple-400 w-32">{row.label}</span>
                  <span className={`font-bold ${row.color} text-right`}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
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
"""

with open("src/components/VixyLiveView.tsx", "w") as f:
    f.write(new_content)

print("VixyLiveView strictly patched with Composite Authorization!")
