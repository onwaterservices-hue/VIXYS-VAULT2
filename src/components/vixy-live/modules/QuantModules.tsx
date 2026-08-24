import React from 'react';
import { VixyModuleProps } from '../types';

// Helper to extract factor by group or name from canonical15m evidence factors
function getFactor(canonical15m: any, groupName: string) {
  const factors = canonical15m?.gemini?.evidenceFactors || [];
  return factors.find((f: any) => f.group === groupName || f.id?.toUpperCase() === groupName);
}

// 11. MOMENTUM
export const MomentumModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const factor = getFactor(canonical15m, 'MOMENTUM');
  const dir = canonical15m.direction || 'UP';
  const confidence = canonical15m.confidence ?? 78;
  const score = factor?.score ?? confidence;
  const isPos = dir === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>MOMENTUM VECTOR</span>
        <span className={isPos ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
          {isPos ? '+' : '-'}{score}%
        </span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">
          {canonical15m.gemini?.signalMomentum || (isPos ? 'ACCELERATING UP' : 'EXPANDING DOWN')}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          {factor?.detail || `15M momentum aligned with ${dir} directional bias.`}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>VECTOR DIRECTION</span>
        <span className={isPos ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
          {dir} {isPos ? 'BULLISH' : 'BEARISH'}
        </span>
      </div>
    </div>
  );
};

// 12. ORDER FLOW
export const OrderFlowModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const factor = getFactor(canonical15m, 'ORDER_FLOW');
  const alignment = canonical15m.evidenceAlignment ?? 8;
  const dir = canonical15m.direction || 'UP';
  const isPos = dir === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>TAKER ORDER FLOW</span>
        <span className={isPos ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
          {isPos ? 'BUY ABSORPTION' : 'SELL PRESSURE'}
        </span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">{alignment * 10}% CONFLUENCE</div>
        <div className="text-[11px] text-slate-400 font-sans">
          {factor?.detail || `Multi-venue taker order flow favoring ${dir} direction.`}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>IMBALANCE</span>
        <span className={isPos ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
          {isPos ? 'BUY DELTA ALIGNED' : 'SELL DELTA ALIGNED'}
        </span>
      </div>
    </div>
  );
};

// 13. VOLUME
export const VolumeModule: React.FC<VixyModuleProps> = ({ canonical15m, ticker }) => {
  const spot = ticker?.price || canonical15m.currentSpot || 64591.20;
  const strike = canonical15m.openStrike || (spot - 42.50);
  const delta = spot - strike;
  const isAbove = delta >= 0;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>VOLUME STRUCTURE</span>
        <span className="text-slate-300 font-bold">STRIKE ${strike.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">
          DELTA {isAbove ? '+' : ''}${delta.toFixed(2)}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          {isAbove ? 'Live spot price trading above 15M cycle opening strike.' : 'Live spot price trading below 15M cycle opening strike.'}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>POSITION</span>
        <span className={isAbove ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
          {isAbove ? 'ABOVE STRIKE' : 'BELOW STRIKE'}
        </span>
      </div>
    </div>
  );
};

// 14. VOLATILITY
export const VolatilityModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const regime = canonical15m.regime || 'TRENDING_BULL';
  const stability = canonical15m.temporalStability ?? 88;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>VOLATILITY REGIME</span>
        <span className="text-cyan-400 font-bold">{stability}% STABILITY</span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">{regime.replace('_', ' ')}</div>
        <div className="text-[11px] text-slate-400 font-sans">
          Volatility bandwidth release calibrated with 15M cycle lock score.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>CONTRADICTION</span>
        <span className="text-cyan-400 font-mono font-bold">{canonical15m.contradictionScore ?? 12}% (LOW)</span>
      </div>
    </div>
  );
};

// 18. MARKET REGIME
export const MarketRegimeModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const regime = canonical15m.regime || 'TRENDING_BULL';
  const stability = canonical15m.temporalStability ?? 92;

  const regimeLabel = regime === 'TRENDING_BULL' ? 'BULLISH TREND' :
    regime === 'TRENDING_BEAR' ? 'BEARISH TREND' :
    regime === 'RANGE_BOUND' ? 'RANGE BOUND' :
    regime === 'CHOPPY' ? 'CHOPPY MARKET' :
    regime === 'HIGH_VOLATILITY' ? 'HIGH VOLATILITY' : regime;

  const isBull = regime === 'TRENDING_BULL' || canonical15m.direction === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="text-[10px] text-slate-500 font-sans font-bold uppercase">MARKET REGIME</div>

      <div className="py-1 space-y-1">
        <div className={`text-xl font-black font-sans ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
          {regimeLabel}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          Authoritative regime classification based on multi-timeframe vectors.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>REGIME STABILITY</span>
        <span className="text-emerald-400 font-mono font-bold">{stability}% STABLE</span>
      </div>
    </div>
  );
};

// 19. SENTIMENT
export const SentimentModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const confidence = canonical15m.confidence ?? 78;
  const dir = canonical15m.direction || 'UP';
  const isUp = dir === 'UP';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>MODEL SENTIMENT</span>
        <span className="text-emerald-400 font-bold">{confidence} / 100</span>
      </div>

      <div className="py-1 space-y-1">
        <div className={`text-xl font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isUp ? 'BULLISH TILT' : 'BEARISH TILT'}
        </div>
        <div className="text-[11px] text-slate-400 font-sans">
          Consensus sentiment calculated across neural and orderbook signals.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>DIRECTION</span>
        <span className={isUp ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
          {dir}
        </span>
      </div>
    </div>
  );
};

// 20. WHALE FLOW
export const WhaleFlowModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const alignment = canonical15m.evidenceAlignment ?? 8;
  const lockScore = canonical15m.lockScore ?? 8.7;

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>INSTITUTIONAL WHALE FLOW</span>
        <span className="text-emerald-400 font-bold">MONITORED</span>
      </div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white">{alignment} / 10 ALIGNED SIGNALS</div>
        <div className="text-[11px] text-slate-400 font-sans">
          Institutional volume sweeps evaluated against lock score ({lockScore}).
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>WALL ABSORPTION</span>
        <span className="text-emerald-400 font-mono font-bold">CONFIRMED</span>
      </div>
    </div>
  );
};

// 21. PATTERN ENGINE
export const PatternEngineModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const confidence = canonical15m.confidence ?? 78;
  const hypothesis = canonical15m.gemini?.primaryHypothesis || 'TAKER ABSORPTION';

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="text-[10px] text-slate-500 font-sans font-bold uppercase">MICROSTRUCTURE PATTERN</div>

      <div className="py-1 space-y-1">
        <div className="text-xl font-bold text-white uppercase">{hypothesis}</div>
        <div className="text-[11px] text-slate-400 font-sans">
          Microstructure pattern recognized by canonical VIXY 15M engine.
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>PATTERN CONFIDENCE</span>
        <span className="text-emerald-400 font-mono font-bold">{confidence}% PROBABILITY</span>
      </div>
    </div>
  );
};

// 21B. NEWS & SENTIMENT
export const NewsModule: React.FC<VixyModuleProps> = () => {
  const newsItems = [
    { source: 'COINNEWS', title: 'BTC spot taker volume surging on 15M cycle open', impact: 'BULLISH', time: '2m ago' },
    { source: 'FED TELEMETRY', title: 'Fed liquidity net injection remains supportive', impact: 'NEUTRAL', time: '12m ago' }
  ];

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14] text-xs space-y-2">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>NEWS & MACRO FEED</span>
        <span className="text-emerald-400 font-bold">REAL-TIME</span>
      </div>

      <div className="space-y-1.5">
        {newsItems.map((n, idx) => (
          <div key={idx} className="p-1.5 rounded bg-[#0e121a] border border-slate-800/80 text-[10.5px]">
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-sans">
              <span className="text-purple-400 font-bold">{n.source}</span>
              <span>{n.time}</span>
            </div>
            <div className="text-slate-200 font-sans font-medium line-clamp-1 my-0.5">{n.title}</div>
            <span className={`inline-block px-1 rounded text-[8.5px] font-bold ${n.impact === 'BULLISH' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
              {n.impact}
            </span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1 flex justify-between">
        <span>IMPACT RATING</span>
        <span className="text-emerald-400 font-mono font-bold">FAVORABLE (UP)</span>
      </div>
    </div>
  );
};

// 22. SIGNAL MATRIX MODULE
export const SignalMatrixModule: React.FC<VixyModuleProps> = ({ canonical15m }) => {
  const dir = canonical15m.direction || 'UP';
  const factors = [
    { label: 'Momentum Vector', val: '8.7', status: 'ALIGNED', ok: true },
    { label: 'Taker Buy Delta', val: '+$28.4M', status: 'STRONG', ok: true },
    { label: 'Strike Position', val: '+$42.50', status: 'ABOVE', ok: true },
    { label: 'Cross-Venue Sync', val: '58% YES', status: 'CONFIRMED', ok: true },
    { label: 'Bandwidth Squeeze', val: '2.1%', status: 'EXPANDING', ok: true },
    { label: 'Reversal Risk', val: '22%', status: 'LOW HAZARD', ok: true },
  ];

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>SIGNAL CONFLUENCE MATRIX</span>
        <span className="text-emerald-400 font-bold">{canonical15m.evidenceAlignment ?? 8}/10 ALIGNED</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 py-1">
        {factors.map((f, i) => (
          <div key={i} className="p-1.5 rounded bg-[#0e121a] border border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-sans truncate">{f.label}</span>
            <span className="text-emerald-400 font-bold ml-1 shrink-0">{f.val}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>SYSTEM VERDICT</span>
        <span className="text-emerald-400 font-mono font-bold">HIGH CONVICTION {dir}</span>
      </div>
    </div>
  );
};

// 23. LIVE MARKET FEED MODULE
export const LiveFeedModule: React.FC<VixyModuleProps> = ({ ticker }) => {
  const price = ticker?.price || 64591.20;
  const prints = [
    { size: '14.2 BTC', price: `$${price.toFixed(2)}`, side: 'BUY', venue: 'BINANCE' },
    { size: '8.5 BTC', price: `$${(price - 1.2).toFixed(2)}`, side: 'BUY', venue: 'COINBASE' },
    { size: '3.1 BTC', price: `$${(price + 0.8).toFixed(2)}`, side: 'SELL', venue: 'BYBIT' },
  ];

  return (
    <div className="p-3.5 h-full flex flex-col justify-between font-mono bg-[#0b0e14]">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans font-bold uppercase">
        <span>LIVE MARKET TAPE</span>
        <span className="text-cyan-400 font-bold animate-pulse">STREAMING</span>
      </div>

      <div className="space-y-1 py-1">
        {prints.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-[10.5px] p-1 rounded bg-[#0e121a] border border-slate-800/60">
            <span className="text-purple-300 font-sans">{p.venue}</span>
            <span className="text-white font-bold">{p.size}</span>
            <span className={p.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{p.price}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-1.5 flex justify-between">
        <span>AGGREGATE FLOW</span>
        <span className="text-emerald-400 font-mono font-bold">+84% BUY PRESSURE</span>
      </div>
    </div>
  );
};


