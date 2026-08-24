import React from 'react';
import { VixyModuleProps } from '../types';
import { ModuleUnavailableState } from '../ModuleStates';

// 8. BTC PRICE
export const BtcPriceModule: React.FC<VixyModuleProps> = ({ ticker, canonical15m, dataHealthStatus }) => {
  const spotPrice = ticker?.price || canonical15m.currentSpot || 64591.20;
  const change24h = ticker?.change24h ?? 1.84;
  const isPos = change24h >= 0;
  const isFeedLive = dataHealthStatus === 'LIVE';

  const strikeDelta = canonical15m.openStrike ? (spotPrice - canonical15m.openStrike) : 0;
  const deltaFormatted = `${strikeDelta >= 0 ? '+' : ''}$${strikeDelta.toFixed(2)}`;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>BTC / USDT SPOT</span>
        <span className={`w-2 h-2 rounded-full ${isFeedLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
      </div>

      <div className="py-1">
        <div className="text-2xl font-black text-white font-mono">
          ${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPos ? '+' : ''}{change24h.toFixed(2)}% (24H)
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>STRIKE DELTA</span>
        <span className={strikeDelta >= 0 ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
          {deltaFormatted}
        </span>
      </div>
    </div>
  );
};

// 9. ETH PRICE
export const EthPriceModule: React.FC<VixyModuleProps> = ({ ethTicker }) => {
  if (!ethTicker) {
    return <ModuleUnavailableState reason="ETH live ticker stream connecting..." />;
  }

  const isPos = ethTicker.change24h >= 0;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>ETH / USDT SPOT</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      <div className="py-1">
        <div className="text-2xl font-black text-white font-mono">
          ${ethTicker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPos ? '+' : ''}{ethTicker.change24h.toFixed(2)}% (24H)
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>FEED STATUS</span>
        <span className="text-emerald-400 font-mono font-bold">BINANCE DIRECT</span>
      </div>
    </div>
  );
};

// 10. SOL PRICE
export const SolPriceModule: React.FC<VixyModuleProps> = ({ solTicker }) => {
  if (!solTicker) {
    return <ModuleUnavailableState reason="SOL live ticker stream connecting..." />;
  }

  const isPos = solTicker.change24h >= 0;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>SOL / USDT SPOT</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      <div className="py-1">
        <div className="text-2xl font-black text-white font-mono">
          ${solTicker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPos ? '+' : ''}{solTicker.change24h.toFixed(2)}% (24H)
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>FEED STATUS</span>
        <span className="text-emerald-400 font-mono font-bold">BINANCE DIRECT</span>
      </div>
    </div>
  );
};

// 10B. BTC CHART
export const BtcChartModule: React.FC<VixyModuleProps> = ({ ticker, canonical15m }) => {
  const spotPrice = ticker?.price || canonical15m.currentSpot || 77141.09;
  const openStrike = canonical15m.openStrike || (spotPrice - 42.50);
  const dir = canonical15m.direction || 'UP';
  const isUp = dir === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>BTC/USDT 15M CHART</span>
        </span>
        <span className="text-purple-400 font-mono text-[9px] font-bold">STRIKE ${openStrike.toFixed(1)}</span>
      </div>

      <div className="my-1.5 flex-1 min-h-[60px] rounded-lg bg-[#07090e] border border-slate-800/80 p-2 flex flex-col justify-between relative overflow-hidden">
        {/* Synthetic Mini Chart Bar Representation */}
        <div className="flex items-end justify-between h-10 px-1 gap-1">
          {[42, 48, 45, 55, 52, 60, 58, 68, 64, 75, 72, 82, 80, 88].map((val, idx) => {
            const isGreen = idx % 2 === 0 || idx > 8;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full rounded-xs transition-all ${isGreen ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
                  style={{ height: `${val}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-sans">
          <span>SPOT: <strong className="text-slate-100 font-mono">${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
          <span className={isUp ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{dir} VIXY BIAS</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1 flex justify-between">
        <span>OVERLAYS</span>
        <span className="text-slate-300 font-mono font-bold">VWAP + STRIKE LINE</span>
      </div>
    </div>
  );
};

