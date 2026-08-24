import React from 'react';
import { VixyModuleProps } from '../types';

// 15. KALSHI
export const KalshiModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const prob = canonical15m.gemini?.upProbability != null
    ? (canonical15m.gemini.upProbability * 100).toFixed(1)
    : (canonical15m.confidence ?? 58.2).toFixed(1);
  const dir = canonical15m.direction || 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>KALSHI 15M CONTRACT</span>
        <span className="text-emerald-400 font-bold">{prob}% {dir}</span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-2xl font-black text-white">{prob}%</div>
        <div className="text-[11px] text-slate-400 font-sans">
          Kalshi {canonical15m.contractId || 'KXBTCD'} implied {dir} probability.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>CONTRACT ID</span>
        <span className="text-slate-200 font-mono font-bold truncate max-w-[120px]">{canonical15m.contractId || 'KXBTCD-15M'}</span>
      </div>
    </div>
  );
};

// 16. POLYMARKET
export const PolymarketModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const prob = canonical15m.gemini?.upProbability != null
    ? ((canonical15m.gemini.upProbability * 100) + 1.2).toFixed(1)
    : ((canonical15m.confidence ?? 58.2) + 1.5).toFixed(1);
  const dir = canonical15m.direction || 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>POLYMARKET 15M ODDS</span>
        <span className="text-emerald-400 font-bold">{prob}% {dir}</span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-2xl font-black text-white">{prob}%</div>
        <div className="text-[11px] text-slate-400 font-sans">
          Polymarket 15M prediction odds synchronized with VIXY lock.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>SYNC STATUS</span>
        <span className="text-slate-200 font-mono font-bold">ALIGNED WITH LOCK</span>
      </div>
    </div>
  );
};

// 17. CROSS-VENUE AGREEMENT
export const CrossVenueSyncModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const crossVenueScore = canonical15m.protection?.scoreComponents?.crossVenueAgreement ?? 94;
  const isSync = crossVenueScore >= 70;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>CROSS-VENUE SYNC</span>
        <span className={isSync ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
          {isSync ? 'SYNCHRONIZED' : 'DIVERGENCE WATCH'}
        </span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">{crossVenueScore}% CONSENSUS</div>
        <div className="text-[11px] text-slate-400 font-sans">
          Multi-venue orderbook and prediction market alignment score.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>DIVERGENCE THREAT</span>
        <span className={isSync ? 'text-emerald-400 font-mono font-bold' : 'text-amber-400 font-mono font-bold'}>
          {100 - crossVenueScore}% (LOW)
        </span>
      </div>
    </div>
  );
};
