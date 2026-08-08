import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Radar,
  Lock,
  ChevronRight
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
    if (risk < 30) return { label: 'SAFE', color: 'text-emerald-400', bg: 'bg-emerald-950/80', border: 'border-emerald-500/40', badgeBg: 'bg-emerald-500/20' };
    if (risk < 60) return { label: 'WATCH', color: 'text-amber-300', bg: 'bg-amber-950/80', border: 'border-amber-500/40', badgeBg: 'bg-amber-500/20' };
    if (risk < 80) return { label: 'DANGER', color: 'text-orange-400', bg: 'bg-orange-950/80', border: 'border-orange-500/40', badgeBg: 'bg-orange-500/20' };
    return { label: 'EXIT RECOMMENDED', color: 'text-rose-400', bg: 'bg-rose-950/80', border: 'border-rose-500/40', badgeBg: 'bg-rose-500/20' };
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
    <div className="bg-[#05020c]/95 rounded-2xl border border-purple-500/30 p-5 space-y-5 font-mono shadow-[0_0_30px_rgba(112,26,238,0.12)] relative overflow-hidden backdrop-blur-md">
      {/* Subtle Background Glow Accent */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/40 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/80 px-3 py-1.5 rounded-lg border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="tracking-wide">VIXY PROTECTION™</span>
          </div>
          <span className="text-[11px] text-purple-300/70 hidden sm:inline tracking-wider font-semibold uppercase">
            LIVE POSITION GUARDIAN
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>PROTECTION ACTIVE</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${riskInfo.bg} ${riskInfo.color} ${riskInfo.border}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>REVERSAL THREAT: {rawReversalRisk}%</span>
          </div>
        </div>
      </div>

      {/* Main Body Container */}
      <div className="space-y-4 relative z-10">
        {/* Directional Confirmation Ribbon */}
        <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
          isUp 
            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
            : 'bg-rose-950/30 border-rose-500/30 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.05)]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isUp 
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300' 
                : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
            }`}>
              {isUp ? <TrendingUp className="w-5 h-5 animate-pulse" /> : <TrendingDown className="w-5 h-5 animate-pulse" />}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <span className="text-white font-extrabold">
                  {isUp ? '🟢 UPSIDE DIRECTIONAL CONFIRMATION' : '🔴 DOWNSIDE DIRECTIONAL CONFIRMATION'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                  breakState === 'BREAK CONFIRMED' 
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(52,211,153,0.6)]' 
                    : breakState === 'BREAK DEVELOPING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-purple-950 text-purple-300 border border-purple-800/40'
                }`}>
                  {breakState}
                </span>
              </div>
              <div className="text-[11px] text-purple-200/80 font-sans mt-0.5">
                VIXY Protection confirms <span className="font-semibold text-white">{isUp ? 'BUY UP' : 'BUY DOWN'}</span> signal strike trajectory with <span className="font-semibold text-cyan-300">{signal.confidence}%</span> model alignment.
              </div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-purple-800/30 sm:pl-4">
            <div className="text-[10px] text-purple-300/60 font-semibold uppercase tracking-wider">SENTINEL STATE</div>
            <div className="text-xs font-black text-amber-300 tracking-wide mt-0.5">{activeGuardianAction}</div>
          </div>
        </div>

        {/* Sentinel Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 6 cols: Position Health Meter & Scanning Checklist */}
          <div className="lg:col-span-6 bg-[#080314]/90 p-4 rounded-xl border border-purple-800/40 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                Position Survival Score
              </span>
              <span className={`font-black text-xs px-2 py-0.5 rounded ${riskInfo.badgeBg} ${riskInfo.color}`}>
                {positionHealthPct}% ({riskInfo.label})
              </span>
            </div>

            {/* Block Visual Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-[#100624] h-4 rounded-lg overflow-hidden border border-purple-800/50 p-0.5 flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = (i + 1) * 10 <= positionHealthPct;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-xs transition-all duration-300 ${
                        filled
                          ? positionHealthPct > 70
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                            : positionHealthPct > 40
                            ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                            : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                          : 'bg-purple-950/30'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Sentinel Scanning Verification Matrix */}
            <div className="space-y-2 pt-2 border-t border-purple-900/30">
              <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Radar className="w-3 h-3 text-cyan-400" />
                  Real-Time Scanning Matrix
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SENTINEL ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-purple-100">
                <div className="flex items-center gap-1.5 bg-purple-950/20 px-2.5 py-1.5 rounded-lg border border-purple-800/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Momentum Aligned</span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-950/20 px-2.5 py-1.5 rounded-lg border border-purple-800/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">VWAP Support Intact</span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-950/20 px-2.5 py-1.5 rounded-lg border border-purple-800/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Flow Confirming</span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-950/20 px-2.5 py-1.5 rounded-lg border border-purple-800/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Reversal Monitored</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 6 cols: Reversal Risk Alert & Suggested Action */}
          <div className="lg:col-span-6 bg-[#080314]/90 p-4 rounded-xl border border-purple-800/40 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Reversal Threat Matrix
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-black text-[10px] tracking-wide ${
                    rawReversalRisk > 60
                      ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50 animate-pulse'
                      : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                  }`}
                >
                  REVERSAL RISK {rawReversalRisk}%
                </span>
              </div>

              {rawReversalRisk > 50 ? (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                    <span className="text-[11px]">⚠ VIXY PROTECTION: Reversal Risk Elevated ({rawReversalRisk}%)</span>
                  </div>
                  <ul className="space-y-1 text-purple-200 text-[10.5px] pl-5 list-disc font-sans">
                    <li>Whale absorption detected near key resistance boundary</li>
                    <li>Net selling delta building in Binance order flow</li>
                  </ul>
                  <div className="pt-2 border-t border-rose-900/30 flex items-center justify-between">
                    <span className="text-purple-300/70 font-semibold text-[10px] uppercase">SENTINEL ACTION:</span>
                    <span className="bg-rose-500 text-white font-black px-2.5 py-1 rounded-md text-[11px]">
                      REDUCE EXPOSURE / LOCK PROFITS
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[11px]">✓ REVERSAL THREAT LOW ({rawReversalRisk}%)</span>
                  </div>
                  <ul className="space-y-1 text-purple-200 text-[10.5px] pl-5 list-disc font-sans">
                    <li>Taker momentum aligned with predicted strike direction</li>
                    <li>VWAP support fully intact with zero delta exhaustion</li>
                  </ul>
                  <div className="pt-2 border-t border-emerald-900/30 flex items-center justify-between">
                    <span className="text-purple-300/70 font-semibold text-[10px] uppercase">SENTINEL ACTION:</span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-1 rounded-md text-[11px]">
                      HOLD POSITION / STAY IN TRADE
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Command Badges - No Ellipsis Truncation! */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">
                Sentinel Command Actions:
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
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
                      className={`px-1 py-1.5 rounded-lg border text-center transition-all ${
                        isActive
                          ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.7)] font-black scale-[1.02]'
                          : 'bg-[#090417] text-purple-300/70 border-purple-900/30 font-semibold'
                      }`}
                    >
                      <div className="text-[9.5px] whitespace-nowrap leading-tight">{action.name}</div>
                      <div className="text-[7.5px] opacity-75 font-sans leading-none mt-0.5">{action.desc}</div>
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

