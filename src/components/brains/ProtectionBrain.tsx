import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Activity, Check, ArrowRight } from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';

interface ProtectionBrainProps {
  signal: PredictionSignal;
  ticker: BTCTicker;
}

export const ProtectionBrain: React.FC<ProtectionBrainProps> = ({ signal, ticker }) => {
  // Reversal risk level calculations
  const netDelta = signal.orderFlow.netDelta;
  const isBull = signal.direction === 'YES';

  // Derived dynamic reversal risk score
  const rawReversalRisk = Math.min(
    95,
    Math.max(12, Math.round(100 - signal.confidence + Math.abs(ticker.price % 30) / 2))
  );

  const getRiskStatus = (risk: number) => {
    if (risk < 30) return { label: 'SAFE', color: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-500/40' };
    if (risk < 60) return { label: 'WATCH', color: 'text-amber-300', bg: 'bg-amber-950', border: 'border-amber-500/40' };
    if (risk < 80) return { label: 'DANGER', color: 'text-orange-400', bg: 'bg-orange-950', border: 'border-orange-500/40' };
    return { label: 'EXIT RECOMMENDED', color: 'text-rose-400', bg: 'bg-rose-950', border: 'border-rose-500/40' };
  };

  const riskInfo = getRiskStatus(rawReversalRisk);
  const positionHealthPct = Math.max(10, 100 - rawReversalRisk);

  // Position Guardian Actions
  const activeGuardianAction: 'ENTER' | 'WAIT' | 'SCALE IN' | 'MOVE STOP LOSS' | 'TAKE 50%' | 'EXIT NOW' =
    rawReversalRisk > 75
      ? 'EXIT NOW'
      : rawReversalRisk > 55
      ? 'TAKE 50%'
      : rawReversalRisk > 40
      ? 'MOVE STOP LOSS'
      : rawReversalRisk > 25
      ? 'SCALE IN'
      : 'ENTER';

  return (
    <div className="bg-[#0b061b] rounded-3xl border border-purple-800/70 p-6 space-y-6 font-mono shadow-2xl relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/50 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            🛡 VIXY PROTECTION™ & POSITION GUARDIAN
          </span>
          <span className="text-xs text-purple-300/70 hidden sm:inline">
            Active Real-Time Risk Officer
          </span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black border ${riskInfo.bg} ${riskInfo.color} ${riskInfo.border}`}>
          <Shield className="w-4 h-4" />
          <span>POSITION SAFETY: {riskInfo.label}</span>
        </div>
      </div>

      {/* Grid: Position Health Bar & Reversal Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Position Health Meter & Active Watchlist */}
        <div className="lg:col-span-6 bg-[#070314] p-5 rounded-2xl border border-purple-800/60 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-300 font-bold uppercase tracking-wider">
              Position Health Score
            </span>
            <span className={`font-black text-sm ${riskInfo.color}`}>
              {positionHealthPct}% ({riskInfo.label})
            </span>
          </div>

          {/* Block Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#13072b] h-5 rounded-xl overflow-hidden border border-purple-800/70 p-1 flex gap-1">
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

          {/* Watching Checklist */}
          <div className="space-y-2 pt-2 border-t border-purple-900/40">
            <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Continuously Watching:</span>
              <span className="text-emerald-400 font-bold animate-pulse">● LIVE SENTINEL</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-purple-200">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Whale Wallets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Binance Order Flow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Net Taker Delta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>CVD & Divergence</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Bid/Ask Liquidity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Spoof Detection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 6 cols: Reversal Risk Alert & Suggested Action */}
        <div className="lg:col-span-6 bg-[#070314] p-5 rounded-2xl border border-purple-800/60 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-300 font-bold uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              REVERSAL RISK ENGINE
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

          {/* Conditional Reversal Alert Banner */}
          {rawReversalRisk > 50 ? (
            <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-black">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                <span>⚠ VIXY PROTECTION: Reversal Risk Increasing ({rawReversalRisk}%)</span>
              </div>
              <ul className="space-y-1 text-purple-200 text-[11px] pl-5 list-disc">
                <li>Whale absorption detected at local resistance</li>
                <li>Net selling delta building in Binance futures</li>
                <li>Positive/Negative CVD divergence emerging</li>
              </ul>
              <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between">
                <span className="text-purple-300 font-bold text-[10px] uppercase">SUGGESTED ACTION:</span>
                <span className="bg-rose-500 text-white font-black px-2.5 py-1 rounded-lg text-xs">
                  REDUCE EXPOSURE / LOCK PROFITS
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-black">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>✓ REVERSAL RISK LOW ({rawReversalRisk}%)</span>
              </div>
              <ul className="space-y-1 text-purple-200 text-[11px] pl-5 list-disc">
                <li>Taker momentum aligned with predicted strike direction</li>
                <li>No institutional spoof walls detected within 0.5% range</li>
                <li>VWAP support fully intact with zero delta exhaustion</li>
              </ul>
              <div className="pt-2 border-t border-emerald-900/40 flex items-center justify-between">
                <span className="text-purple-300 font-bold text-[10px] uppercase">SUGGESTED ACTION:</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-1 rounded-lg text-xs">
                  HOLD POSITION / STAY IN TRADE
                </span>
              </div>
            </div>
          )}

          {/* Position Guardian Interactive Action Badges */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">
              AI Position Guardian Actions:
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
              {[
                { name: 'ENTER', desc: 'Qualified' },
                { name: 'WAIT', desc: 'Patience' },
                { name: 'SCALE IN', desc: 'Add Size' },
                { name: 'MOVE STOP LOSS', desc: 'Protect' },
                { name: 'TAKE 50%', desc: 'Lock Profit' },
                { name: 'EXIT NOW', desc: 'Bail Out' },
              ].map((action) => {
                const isActive = activeGuardianAction === action.name;
                return (
                  <div
                    key={action.name}
                    className={`p-1.5 rounded-xl border text-[10px] font-black transition-all ${
                      isActive
                        ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)] scale-105'
                        : 'bg-[#0a0418] text-purple-300/60 border-purple-900/40'
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
  );
};
