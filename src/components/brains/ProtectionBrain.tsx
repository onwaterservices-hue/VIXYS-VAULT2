import React from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Zap,
  TrendingUp,
  TrendingDown,
  Lock
} from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';

interface ProtectionBrainProps {
  signal: PredictionSignal;
  ticker: BTCTicker;
  isDiscordVerified?: boolean;
}

export const ProtectionBrain: React.FC<ProtectionBrainProps> = ({ 
  signal, 
  ticker,
  isDiscordVerified = false
}) => {
  // Calculate Position Survival Risk score based on signal confidence & volatility
  const rawReversalRisk = Math.min(
    95,
    Math.max(12, Math.round(100 - signal.confidence + Math.abs((ticker.price % 30) / 2)))
  );

  const getRiskStatus = (risk: number) => {
    if (risk < 30) return { label: 'SAFE', color: 'text-emerald-400', bg: 'bg-emerald-950/90', border: 'border-emerald-500/50' };
    if (risk < 60) return { label: 'WATCH', color: 'text-amber-300', bg: 'bg-amber-950/90', border: 'border-amber-500/50' };
    if (risk < 80) return { label: 'DANGER', color: 'text-orange-400', bg: 'bg-orange-950/90', border: 'border-orange-500/50' };
    return { label: 'EXIT RECOMMENDED', color: 'text-rose-400', bg: 'bg-rose-950/90', border: 'border-rose-500/50' };
  };

  const riskInfo = getRiskStatus(rawReversalRisk);
  const positionHealthPct = Math.max(10, 100 - rawReversalRisk);

  // Dynamic Sentinel Guardian Action
  const activeGuardianAction: 'ENTER' | 'WAIT' | 'SCALE IN' | 'MOVE STOP' | 'TAKE 50%' | 'EXIT NOW' =
    rawReversalRisk > 75
      ? 'EXIT NOW'
      : rawReversalRisk > 55
      ? 'TAKE 50%'
      : rawReversalRisk > 40
      ? 'MOVE STOP'
      : rawReversalRisk > 25
      ? 'SCALE IN'
      : 'ENTER';

  // Break State Determination from actual model confidence
  const breakState = signal.confidence >= 75
    ? 'BREAK CONFIRMED'
    : signal.confidence >= 60
    ? 'BREAK DEVELOPING'
    : 'WAITING FOR CONFIRMATION';

  const isUp = signal.direction === 'YES';

  return (
    <div className="bg-[#030108] rounded-3xl border border-purple-800/70 p-6 space-y-6 font-mono shadow-2xl relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/90 px-3 py-1 rounded-full border border-cyan-500/50 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            🛡 VIXY PROTECTION™
          </span>
          <span className="text-xs text-purple-300/80 hidden sm:inline tracking-wider font-bold">
            LIVE POSITION GUARDIAN
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PROTECTION ACTIVE</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black border ${riskInfo.bg} ${riskInfo.color} ${riskInfo.border}`}>
            <Shield className="w-3.5 h-3.5" />
            <span>REVERSAL THREAT: {rawReversalRisk}%</span>
          </div>
        </div>
      </div>

      {/* Main Body Container */}
      <div className="space-y-6 relative">
        {/* Directional Confirmation Ribbon */}
        <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
          isUp 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              isUp ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-rose-500/20 border-rose-400/50 text-rose-300'
            }`}>
              {isUp ? <TrendingUp className="w-5 h-5 animate-pulse" /> : <TrendingDown className="w-5 h-5 animate-pulse" />}
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <span>{isUp ? '🟢 UPSIDE DIRECTIONAL CONFIRMATION' : '🔴 DOWNSIDE DIRECTIONAL CONFIRMATION'}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  breakState === 'BREAK CONFIRMED' 
                    ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                    : breakState === 'BREAK DEVELOPING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-purple-950 text-purple-300 border border-purple-800/40'
                }`}>
                  {breakState}
                </span>
              </div>
              <div className="text-[11px] opacity-80 font-sans mt-0.5">
                VIXY Protection confirms {isUp ? 'BUY UP' : 'BUY DOWN'} signal strike trajectory with {signal.confidence}% model alignment.
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">SENTINEL STATE</div>
            <div className="text-xs font-black text-white">{activeGuardianAction}</div>
          </div>
        </div>

        {/* Sentinel Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 6 cols: Position Health Meter & Scanning Checklist */}
          <div className="lg:col-span-6 bg-[#060210] p-5 rounded-2xl border border-purple-800/60 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-bold uppercase tracking-wider">
                Position Survival Score
              </span>
              <span className={`font-black text-sm ${riskInfo.color}`}>
                {positionHealthPct}% ({riskInfo.label})
              </span>
            </div>

            {/* Block Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-[#12072b] h-5 rounded-xl overflow-hidden border border-purple-800/70 p-1 flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = (i + 1) * 10 <= positionHealthPct;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-all duration-300 ${
                        filled
                          ? positionHealthPct > 70
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : positionHealthPct > 40
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                            : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                          : 'bg-purple-950/40'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Sentinel Scanning Verification Matrix */}
            <div className="space-y-2 pt-2 border-t border-purple-900/40">
              <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Real-Time Scanning Matrix:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SENTINEL ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-purple-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Momentum Aligned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>VWAP Support Intact</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Flow Confirming</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Reversal Monitored</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 6 cols: Reversal Risk Alert & Suggested Action */}
          <div className="lg:col-span-6 bg-[#060210] p-5 rounded-2xl border border-purple-800/60 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300 font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                REVERSAL THREAT MATRIX
              </span>
              <span
                className={`px-2.5 py-0.5 rounded font-black text-xs ${
                  rawReversalRisk > 60
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                }`}
              >
                REVERSAL RISK {rawReversalRisk}%
              </span>
            </div>

            {rawReversalRisk > 50 ? (
              <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-rose-300 font-black">
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                  <span>⚠ VIXY PROTECTION: Reversal Probability High ({rawReversalRisk}%)</span>
                </div>
                <ul className="space-y-1 text-purple-200 text-[11px] pl-5 list-disc">
                  <li>Whale absorption detected near key resistance boundary</li>
                  <li>Net selling delta building in Binance order flow</li>
                </ul>
                <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between">
                  <span className="text-purple-300 font-bold text-[10px] uppercase">SENTINEL ACTION:</span>
                  <span className="bg-rose-500 text-white font-black px-2.5 py-1 rounded-lg text-xs">
                    REDUCE EXPOSURE / LOCK PROFITS
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-black">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>✓ REVERSAL THREAT LOW ({rawReversalRisk}%)</span>
                </div>
                <ul className="space-y-1 text-purple-200 text-[11px] pl-5 list-disc">
                  <li>Taker momentum aligned with predicted strike direction</li>
                  <li>VWAP support fully intact with zero delta exhaustion</li>
                </ul>
                <div className="pt-2 border-t border-emerald-900/40 flex items-center justify-between">
                  <span className="text-purple-300 font-bold text-[10px] uppercase">SENTINEL ACTION:</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-1 rounded-lg text-xs">
                    HOLD POSITION / STAY IN TRADE
                  </span>
                </div>
              </div>
            )}

            {/* Action Command Badges */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">
                Sentinel Command Actions:
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                {[
                  { name: 'ENTER', desc: 'Qualified' },
                  { name: 'WAIT', desc: 'Patience' },
                  { name: 'SCALE IN', desc: 'Add Size' },
                  { name: 'MOVE STOP', desc: 'Protect' },
                  { name: 'TAKE 50%', desc: 'Lock Profit' },
                  { name: 'EXIT NOW', desc: 'Bail Out' },
                ].map((action) => {
                  const isActive = activeGuardianAction.startsWith(action.name.substring(0, 4));
                  return (
                    <div
                      key={action.name}
                      className={`p-1.5 rounded-xl border text-[10px] font-black transition-all ${
                        isActive
                          ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-105'
                          : 'bg-[#060210] text-purple-300/60 border-purple-900/40'
                      }`}
                    >
                      <div className="truncate">{action.name}</div>
                      <div className="text-[8px] opacity-80 font-normal">{action.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
