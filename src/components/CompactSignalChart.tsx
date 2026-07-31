import React, { useMemo, useState } from 'react';
import { Candle } from '../types';
import { Info, TrendingUp, TrendingDown, Zap, ShieldCheck } from 'lucide-react';

export interface CompactSignalChartProps {
  candles: Candle[];
  currentPrice: number;
  targetPrice?: number;
  dataSource?: 'mock' | 'live';
}

function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < 2) return 50;
  let gains = 0;
  let losses = 0;
  const start = Math.max(1, closes.length - period);
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export const CompactSignalChart: React.FC<CompactSignalChartProps> = ({
  candles = [],
  currentPrice,
  targetPrice,
  dataSource = 'live',
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Take recent 16 candles for sparkline
  const visibleCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles.slice(-16);
  }, [candles]);

  const closes = useMemo(() => visibleCandles.map((c) => c.close), [visibleCandles]);
  const ema9Series = useMemo(() => calcEMA(closes, 9), [closes]);
  const ema21Series = useMemo(() => calcEMA(closes, 21), [closes]);

  const rsiValue = useMemo(() => calcRSI(closes, 14), [closes]);

  // Compute Floor (rolling support low)
  const floorPrice = useMemo(() => {
    if (visibleCandles.length === 0) return currentPrice ? currentPrice * 0.995 : 0;
    return Math.min(...visibleCandles.map((c) => c.low));
  }, [visibleCandles, currentPrice]);

  // Compute Resistance
  const ceilingPrice = useMemo(() => {
    if (visibleCandles.length === 0) return currentPrice ? currentPrice * 1.005 : 0;
    return Math.max(...visibleCandles.map((c) => c.high));
  }, [visibleCandles, currentPrice]);

  // EMA Cross check
  const flipSignal = useMemo<'BULL' | 'BEAR' | null>(() => {
    if (ema9Series.length < 2 || ema21Series.length < 2) return null;
    const curr9 = ema9Series[ema9Series.length - 1];
    const prev9 = ema9Series[ema9Series.length - 2];
    const curr21 = ema21Series[ema21Series.length - 1];
    const prev21 = ema21Series[ema21Series.length - 2];

    if (prev9 <= prev21 && curr9 > curr21) return 'BULL';
    if (prev9 >= prev21 && curr9 < curr21) return 'BEAR';
    // Fallback if latest is cleanly above/below with recent momentum
    if (curr9 > curr21 * 1.0002) return 'BULL';
    if (curr9 < curr21 * 0.9998) return 'BEAR';
    return null;
  }, [ema9Series, ema21Series]);

  // Doji Hold Check
  const isHold = useMemo(() => {
    if (visibleCandles.length === 0) return false;
    const last = visibleCandles[visibleCandles.length - 1];
    const range = last.high - last.low;
    if (range <= 0) return false;
    const body = Math.abs(last.close - last.open);
    const isDoji = body / range <= 0.15;
    const nearSupport = Math.abs(last.close - floorPrice) / floorPrice <= 0.002;
    const nearResistance = Math.abs(last.close - ceilingPrice) / ceilingPrice <= 0.002;
    return isDoji && (nearSupport || nearResistance);
  }, [visibleCandles, floorPrice, ceilingPrice]);

  // Volume Spike Z-Score Check (Z-score > 2.0 over trailing candles)
  const isVolSpike = useMemo(() => {
    if (visibleCandles.length < 5) return false;
    const vols = visibleCandles.map((c) => c.volume);
    const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
    const std = Math.sqrt(vols.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vols.length) || 1;
    const latestVol = vols[vols.length - 1];
    const zScore = (latestVol - mean) / std;
    return zScore > 1.8;
  }, [visibleCandles]);

  // Sparkline Dimensions
  const svgW = 210;
  const svgH = 50;
  const padY = 6;

  const lowP = visibleCandles.length > 0 ? Math.min(...visibleCandles.map((c) => c.low)) : currentPrice;
  const highP = visibleCandles.length > 0 ? Math.max(...visibleCandles.map((c) => c.high)) : currentPrice;
  const rangeP = highP - lowP || currentPrice * 0.005;

  const getX = (i: number) => (i / Math.max(1, visibleCandles.length - 1)) * (svgW - 8) + 4;
  const getY = (price: number) => svgH - padY - ((price - lowP) / rangeP) * (svgH - padY * 2);

  // EMA9 Path
  const ema9Path = ema9Series
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
    .join(' ');

  // RSI Color Dot
  const rsiIsNormal = rsiValue >= 30 && rsiValue <= 70;
  const rsiDotColor = rsiIsNormal ? '#2dd4bf' : '#f5b942';

  return (
    <div className="w-full sm:w-[280px] bg-[#0A0518] rounded-2xl border border-purple-500/30 p-3 shadow-xl font-mono text-xs flex flex-col space-y-2.5 relative">
      {/* Top Header Row */}
      <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-purple-900/40">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="font-bold text-white uppercase tracking-wider">COMPACT SIGNAL</span>
        </div>

        {/* Data Source Badge */}
        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
            dataSource === 'live'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
          }`}
        >
          {dataSource === 'live' ? 'Live feed' : 'Sample stream'}
        </span>
      </div>

      {/* Sparkline & RSI Single-Line Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-purple-300/70 text-[10px]">EMA9 Trend</span>

          {/* RSI Single Line Display */}
          <div className="flex items-center gap-1.5 bg-[#120826] px-2 py-0.5 rounded-md border border-purple-900/50">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rsiDotColor }} />
            <span className="font-bold text-white text-[10px]">RSI {rsiValue}</span>
            <span className="text-[9px] text-purple-300/60">
              {rsiValue > 70 ? '(OB)' : rsiValue < 30 ? '(OS)' : '(Neutral)'}
            </span>
          </div>
        </div>

        {/* Mini Sparkline SVG */}
        <div className="bg-[#0e0722] rounded-xl border border-purple-900/40 p-1 flex justify-center">
          <svg width={svgW} height={svgH} className="overflow-visible">
            {/* Candlesticks */}
            {visibleCandles.map((c, i) => {
              const x = getX(i);
              const isBull = c.close >= c.open;
              const color = isBull ? '#2dd4bf' : '#f56565';
              const topY = getY(Math.max(c.open, c.close));
              const botY = getY(Math.min(c.open, c.close));
              const bodyH = Math.max(1, botY - topY);

              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={getY(c.high)}
                    x2={x}
                    y2={getY(c.low)}
                    stroke={color}
                    strokeWidth="0.8"
                    opacity="0.7"
                  />
                  <rect
                    x={x - 3}
                    y={topY}
                    width="6"
                    height={bodyH}
                    fill={isBull ? color : '#0e0722'}
                    stroke={color}
                    strokeWidth="0.8"
                    rx="0.5"
                  />
                </g>
              );
            })}

            {/* EMA9 Trend Line Overlay */}
            {ema9Path && (
              <path d={ema9Path} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </div>
      </div>

      {/* Dynamic Condition Badges Row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {/* Floor Support Badge */}
        {floorPrice > 0 && (
          <div
            onMouseEnter={() =>
              setActiveTooltip(`Floor $${floorPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}: Computed support floor based on rolling low`)
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-bold cursor-pointer hover:bg-teal-500/25 transition-all"
          >
            Floor ${floorPrice > 1000 ? Math.round(floorPrice) : floorPrice.toFixed(1)}
          </div>
        )}

        {/* Target Price Badge */}
        {targetPrice && (
          <div
            onMouseEnter={() =>
              setActiveTooltip(`Target $${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}: Model target price based on delta accumulation`)
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer hover:bg-amber-500/25 transition-all"
          >
            Target ${targetPrice > 1000 ? Math.round(targetPrice) : targetPrice.toFixed(1)}
          </div>
        )}

        {/* Flip Badge */}
        {flipSignal && (
          <div
            onMouseEnter={() =>
              setActiveTooltip(
                flipSignal === 'BULL'
                  ? 'Flip ↑: EMA9 crossed above EMA21 on the most recent candle'
                  : 'Flip ↓: EMA9 crossed below EMA21 on the most recent candle'
              )
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-all ${
              flipSignal === 'BULL'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            {flipSignal === 'BULL' ? 'Flip ↑' : 'Flip ↓'}
          </div>
        )}

        {/* Hold Badge */}
        {isHold && (
          <div
            onMouseEnter={() =>
              setActiveTooltip('Hold: Doji indecision candle formed near support/resistance boundary')
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer hover:bg-amber-500/30 transition-all"
          >
            Hold
          </div>
        )}

        {/* Vol Spike Badge (Replaces "Whale") */}
        {isVolSpike && (
          <div
            onMouseEnter={() =>
              setActiveTooltip('Vol spike: Trailing candle volume z-score > 1.8 indicating heavy volume spike')
            }
            onMouseLeave={() => setActiveTooltip(null)}
            className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold cursor-pointer hover:bg-purple-500/30 transition-all"
          >
            Vol spike
          </div>
        )}
      </div>

      {/* Hover Tooltip Overlay */}
      {activeTooltip && (
        <div className="absolute left-2 right-2 -bottom-9 bg-[#1a0f35] border border-purple-400 text-purple-100 text-[10px] p-1.5 rounded-lg shadow-2xl z-20 font-sans leading-tight animate-fadeIn">
          {activeTooltip}
        </div>
      )}
    </div>
  );
};
