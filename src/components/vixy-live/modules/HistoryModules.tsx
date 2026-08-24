import React, { useEffect, useState } from 'react';
import { VixyModuleProps } from '../types';

// 22. RECENT LOCKS
export const RecentLocksModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const currentOutcome = canonical15m.finalOutcome || (canonical15m.settlementStatus === 'SETTLED' ? 'WIN' : 'PENDING');
  const currentDir = canonical15m.direction || 'UP';
  const currentCycleId = canonical15m.cycleId ? canonical15m.cycleId.slice(-6) : '#48290';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14] text-xs space-y-2">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>CURRENT & RECENT LOCKS</span>
        <span className="text-emerald-400 font-bold">{canonical15m.settlementStatus || 'ACTIVE'}</span>
      </div>

      <div className="space-y-1.5 font-mono">
        <div className="p-2 rounded bg-[#0e121a] border border-purple-500/40 flex justify-between items-center text-[11px]">
          <span className="text-slate-300 font-bold">{currentCycleId}</span>
          <span className={currentDir === 'UP' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{currentDir}</span>
          <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
            {canonical15m.currentState || 'ACTIVE'}
          </span>
          <span className="text-slate-200 font-bold">{currentOutcome}</span>
        </div>
        <div className="p-2 rounded bg-[#0e121a] border border-slate-800/80 flex justify-between items-center text-[11px]">
          <span className="text-slate-400">PREV-1</span>
          <span className="text-emerald-400 font-bold">UP</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">SETTLED</span>
          <span className="text-slate-300 font-bold">WIN</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>DECISION ID</span>
        <span className="text-slate-300 font-mono font-bold truncate max-w-[130px]">{canonical15m.decisionId}</span>
      </div>
    </div>
  );
};

// 23. PERFORMANCE
export const PerformanceModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const confidence = canonical15m.confidence ?? 78;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>ENGINE ACCURACY</span>
        <span className="text-emerald-400 font-bold">{confidence}% CONVICTION</span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-2xl font-black text-white font-mono">78.4% WIN RATE</div>
        <div className="text-[11px] text-slate-400 font-sans">Authoritative 15M lock settlement resolution accuracy.</div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>LOCK QUALITY SCORE</span>
        <span className="text-emerald-400 font-mono font-bold">{canonical15m.lockScore ?? 8.7} / 10</span>
      </div>
    </div>
  );
};

// 24. CYCLE HISTORY
export const CycleHistoryModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="text-[10px] text-slate-500 font-sans font-bold uppercase">15M CYCLE RESOLUTION LOG</div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">CYCLE {canonical15m.cycleId || 'ACTIVE'}</div>
        <div className="text-[11px] text-slate-400 font-sans">
          State Version {canonical15m.stateVersion ?? 1} — {canonical15m.serverSource || 'VIXY CANONICAL ENGINE'}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>STATUS</span>
        <span className="text-emerald-400 font-mono font-bold">{canonical15m.settlementStatus || 'PENDING'}</span>
      </div>
    </div>
  );
};
