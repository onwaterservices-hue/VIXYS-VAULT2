import re

new_content = """import React, { useState, useEffect, useRef, useMemo } from 'react';
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

export const VixyLiveView: React.FC<VixyLiveViewProps> = ({
  ticker, onOpenTerminal, onOpenReplay, onOpenPricing
}) => {
  const { decision: canonical15m } = useCanonical15mDecision();
  
  // Ref for tracking state transitions to populate thought stream
  const [thoughtStream, setThoughtStream] = useState<{id: string, text: string, type: 'info'|'alert'|'success'|'warning'}[]>([]);
  const prevContractIdRef = useRef<string>('');
  
  // Real-time VIXY LIVE state machine (completely independent of normal dashboard SKIP)
  const elapsedSec = 900 - canonical15m.timeRemainingSec;
  const isStale = (Date.now() - (canonical15m.updatedAt ? new Date(canonical15m.updatedAt).getTime() : Date.now())) > 25000;
  
  let authoritativeState: AuthoritativeState = 'CALIBRATING';
  
  const pUp = canonical15m.gemini?.upProbability || 0;
  const pDown = canonical15m.gemini?.downProbability || 0;
  
  if (canonical15m.currentState === 'SETTLED') {
    authoritativeState = 'RESOLVED';
  } else if (isStale) {
    authoritativeState = 'REASSESSING';
  } else if (canonical15m.currentState === 'LOCKED_UP') {
    authoritativeState = 'LOCKED UP';
  } else if (canonical15m.currentState === 'LOCKED_DOWN') {
    authoritativeState = 'LOCKED DOWN';
  } else if (canonical15m.protection.protectionStatus === 'VETOED' || canonical15m.reversalRisk > 45) {
    authoritativeState = 'REASSESSING';
  } else if (elapsedSec < 15) {
    authoritativeState = 'CALIBRATING';
  } else {
    if (canonical15m.direction === 'UP' || pUp > pDown + 0.05) {
      authoritativeState = 'BUILDING UP';
    } else if (canonical15m.direction === 'DOWN' || pDown > pUp + 0.05) {
      authoritativeState = 'BUILDING DOWN';
    } else {
      authoritativeState = 'CALIBRATING';
    }
  }

  // Update thought stream on major state changes
  useEffect(() => {
    if (canonical15m.contractId && canonical15m.contractId !== prevContractIdRef.current) {
      prevContractIdRef.current = canonical15m.contractId;
      setThoughtStream([
        { id: Date.now().toString() + '-1', text: `NEW 15M CONTRACT DETECTED: ${canonical15m.contractId}`, type: 'alert' },
        { id: Date.now().toString() + '-2', text: `REBUILDING MARKET BASELINE`, type: 'info' }
      ]);
      return;
    }
    
    // Add dynamic thoughts based on state
    setThoughtStream(prev => {
      const newStream = [...prev];
      const addIfNew = (text: string, type: 'info'|'alert'|'success'|'warning' = 'info') => {
        if (!newStream.some(item => item.text === text)) {
          newStream.push({ id: Date.now().toString() + Math.random(), text, type });
        }
      };

      if (authoritativeState === 'LOCKED UP') addIfNew(`UP THESIS CLEARED VIXY LIVE AUTHORIZATION THRESHOLD`, 'success');
      if (authoritativeState === 'LOCKED DOWN') addIfNew(`DOWN THESIS CLEARED VIXY LIVE AUTHORIZATION THRESHOLD`, 'success');
      if (authoritativeState === 'BUILDING UP') addIfNew(`UP EVIDENCE ACCUMULATING`, 'info');
      if (authoritativeState === 'BUILDING DOWN') addIfNew(`DOWN EVIDENCE ACCUMULATING`, 'info');
      if (authoritativeState === 'REASSESSING') addIfNew(`MARKET STRUCTURE CHANGED — REASSESSING ACTIVE THESIS`, 'warning');
      
      if (canonical15m.reversalRisk > 30) addIfNew(`REVERSAL RISK ELEVATED: ${canonical15m.reversalRisk}%`, 'warning');
      if (canonical15m.lockScore > 80) addIfNew(`LOCK SCORE STRONG: ${canonical15m.lockScore}/100`, 'success');

      // Keep last 8 thoughts
      return newStream.slice(-8);
    });
  }, [authoritativeState, canonical15m.contractId, canonical15m.reversalRisk, canonical15m.lockScore]);

  // Derived display values
  const isUp = authoritativeState === 'LOCKED UP' || authoritativeState === 'BUILDING UP';
  const isDown = authoritativeState === 'LOCKED DOWN' || authoritativeState === 'BUILDING DOWN';
  const isCalibrating = authoritativeState === 'CALIBRATING';
  const isReassessing = authoritativeState === 'REASSESSING';
  
  const mainColor = isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : isReassessing ? 'text-amber-400' : 'text-cyan-400';
  const mainBorder = isUp ? 'border-emerald-500/40' : isDown ? 'border-rose-500/40' : isReassessing ? 'border-amber-500/40' : 'border-cyan-500/40';
  const mainBg = isUp ? 'bg-emerald-500/10' : isDown ? 'bg-rose-500/10' : isReassessing ? 'bg-amber-500/10' : 'bg-cyan-500/10';
  const glowShadow = isUp ? 'shadow-[0_0_20px_rgba(52,211,153,0.15)]' : isDown ? 'shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'shadow-none';

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
          <span className="text-white font-bold">{canonical15m.contractId || 'AWAITING CONTRACT'}</span>
          <div className="h-4 w-px bg-purple-900/60 hidden sm:block"></div>
          <span className="text-purple-300 hidden sm:block">BTC Spot: <span className="text-white font-bold">${canonical15m.currentSpot?.toLocaleString() || '---'}</span></span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-purple-400">DATA HEALTH: {isStale ? <span className="text-rose-400 font-bold">STALE</span> : <span className="text-emerald-400 font-bold">OPTIMAL</span>}</span>
          <span className="text-purple-400">LATENCY: <span className="text-cyan-400 font-bold">{canonical15m.gemini?.latencyMs || 0}ms</span></span>
          <span className="text-purple-400">T-{canonical15m.minutesRemaining}:{canonical15m.secondsRemaining.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2. MAIN VIXY THOUGHT & DECISION (Left 7 Cols) */}
        <div className={`lg:col-span-7 bg-gradient-to-br from-[#1B0A38] via-[#100626] to-[#0B051A] border border-purple-500/40 rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden ${glowShadow}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Cpu className="w-48 h-48 text-cyan-400" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> WHAT DOES VIXY THINK?
                </div>
                <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${mainColor} flex items-center gap-3`}>
                  {authoritativeState === 'LOCKED UP' && <><CheckCircle2 className="w-10 h-10" /> VIXY LOCKED — UP</>}
                  {authoritativeState === 'LOCKED DOWN' && <><CheckCircle2 className="w-10 h-10" /> VIXY LOCKED — DOWN</>}
                  {authoritativeState === 'CALIBRATING' && <><RefreshCw className="w-10 h-10 animate-spin-slow" /> VIXY CALIBRATING</>}
                  {authoritativeState === 'BUILDING UP' && <><TrendingUp className="w-10 h-10 animate-pulse" /> VIXY BUILDING UP</>}
                  {authoritativeState === 'BUILDING DOWN' && <><TrendingDown className="w-10 h-10 animate-pulse" /> VIXY BUILDING DOWN</>}
                  {authoritativeState === 'REASSESSING' && <><AlertTriangle className="w-10 h-10 animate-pulse text-amber-400" /> VIXY REASSESSING</>}
                  {authoritativeState === 'RESOLVED' && <><CheckCircle2 className="w-10 h-10" /> SETTLED</>}
                </div>
              </div>
            </div>

            <div className="bg-[#0A0518] border border-purple-900/60 p-4 rounded-2xl font-mono text-sm text-purple-200">
              {canonical15m.gemini?.reasoning || "AWAITING DATA — VIXY is evaluating market conditions for the active contract."}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Thesis Strength</div>
                <div className="w-full bg-purple-950 rounded-full h-1.5 mb-1.5">
                  <div className={`h-1.5 rounded-full ${mainBg.replace('bg-', 'bg-').replace('/10', '')}`} style={{ width: `${Math.min(100, Math.max(0, canonical15m.confidence))}%` }}></div>
                </div>
                <div className={`text-xl font-black ${mainColor}`}>{canonical15m.confidence || 0}%</div>
              </div>
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Lock Quality</div>
                <div className="text-xl font-black text-cyan-400">{canonical15m.lockScore || 0}/100</div>
              </div>
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Market Edge</div>
                <div className="text-xl font-black text-emerald-400">+{canonical15m.protection.scoreComponents?.directionalEdge || 0}%</div>
              </div>
              <div className="bg-[#12072B] p-4 rounded-2xl border border-purple-900/40">
                <div className="text-[10px] text-purple-400 uppercase font-mono mb-1">Reversal Risk</div>
                <div className="text-xl font-black text-rose-400">{canonical15m.reversalRisk || 0}%</div>
              </div>
            </div>
            
            {/* WHY VIXY THINKS THIS (EVIDENCE MATRIX) */}
            <div className="pt-4 border-t border-purple-900/40 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">WHY VIXY THINKS THIS</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/60 flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-mono">Market Structure</span>
                  <span className="text-xs font-bold text-emerald-400">{canonical15m.regime.replace('_', ' ')}</span>
                </div>
                <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/60 flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-mono">Order Flow Delta</span>
                  <span className="text-xs font-bold text-cyan-400">SYNCHRONIZED</span>
                </div>
                <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/60 flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-mono">MTF Alignment</span>
                  <span className="text-xs font-bold text-emerald-400">{canonical15m.evidenceAlignment}/10 BULLISH</span>
                </div>
                <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/60 flex items-center justify-between">
                  <span className="text-xs text-purple-300 font-mono">Temporal Stability</span>
                  <span className="text-xs font-bold text-cyan-400">{canonical15m.temporalStability}% OPTIMAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. RIGHT PANEL (Terminal & Protection) (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* VIXY THOUGHT STREAM TERMINAL */}
          <div className="bg-[#0A0518] border border-purple-900/60 rounded-3xl p-6 font-mono relative shadow-lg h-[280px] flex flex-col">
            <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3 mb-3">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">VIXY BRAIN TERMINAL</h3>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[9px] text-cyan-400 font-bold tracking-widest">LIVE</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar flex flex-col justify-end">
              {thoughtStream.map((item, i) => (
                <div key={item.id} className="text-xs flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                  <span className="text-purple-600 font-bold w-5 shrink-0">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className={`${
                    item.type === 'alert' ? 'text-amber-400' :
                    item.type === 'success' ? 'text-emerald-400' :
                    item.type === 'warning' ? 'text-rose-400' :
                    'text-cyan-300'
                  }`}>{item.text}</span>
                </div>
              ))}
              {thoughtStream.length === 0 && (
                <div className="text-xs text-purple-500 italic">Initializing Vixy cognitive engine...</div>
              )}
            </div>
          </div>

          {/* VIXY PROTECTION & COUNTER THESIS */}
          <div className="bg-gradient-to-br from-[#12072B] to-[#0B051A] border-2 border-purple-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${canonical15m.protection.protectionStatus === 'CLEAR' ? 'text-emerald-400' : 'text-amber-400'}`} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">GUARDIAN & COUNTER-THESIS</h3>
              </div>
            </div>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#080414] p-3 rounded-xl border border-purple-900/40 text-purple-300">
                <div className="text-rose-400 font-bold mb-1">INVALIDATION WATCH</div>
                {canonical15m.gemini?.counterHypothesis || "Monitoring for sudden downside acceleration or cross-venue divergence."}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40 flex justify-between items-center">
                  <span className="text-purple-400">Contradiction</span>
                  <span className="text-emerald-400 font-bold">{canonical15m.contradictionScore}/100</span>
                </div>
                <div className="bg-[#080414] p-2.5 rounded-xl border border-purple-900/40 flex justify-between items-center">
                  <span className="text-purple-400">Guardian</span>
                  <span className={`${canonical15m.protection.protectionStatus === 'CLEAR' ? 'text-emerald-400' : 'text-amber-400'} font-bold`}>{canonical15m.protection.protectionStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM PROBABILITY DIST */}
      <div className="bg-[#12072B] border border-purple-900/60 rounded-3xl p-6 font-mono">
        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>NEURAL PROBABILITY DISTRIBUTION</span>
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0A0518] p-4 rounded-2xl border border-purple-900/40">
            <div className="flex justify-between items-end mb-2">
              <span className="text-emerald-400 font-bold">UP</span>
              <span className="text-xl font-black text-white">{Math.round(pUp * 100)}%</span>
            </div>
            <div className="w-full bg-purple-950 rounded-full h-1.5">
              <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${pUp * 100}%` }}></div>
            </div>
          </div>
          
          <div className="bg-[#0A0518] p-4 rounded-2xl border border-purple-900/40">
            <div className="flex justify-between items-end mb-2">
              <span className="text-amber-400 font-bold">NO TRADE</span>
              <span className="text-xl font-black text-white">{Math.round((canonical15m.gemini?.noTradeProbability || 0) * 100)}%</span>
            </div>
            <div className="w-full bg-purple-950 rounded-full h-1.5">
              <div className="bg-amber-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(canonical15m.gemini?.noTradeProbability || 0) * 100}%` }}></div>
            </div>
          </div>

          <div className="bg-[#0A0518] p-4 rounded-2xl border border-purple-900/40">
            <div className="flex justify-between items-end mb-2">
              <span className="text-rose-400 font-bold">DOWN</span>
              <span className="text-xl font-black text-white">{Math.round(pDown * 100)}%</span>
            </div>
            <div className="w-full bg-purple-950 rounded-full h-1.5">
              <div className="bg-rose-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${pDown * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

with open("src/components/VixyLiveView.tsx", "w") as f:
    f.write(new_content)

print("VixyLiveView rewritten successfully!")
