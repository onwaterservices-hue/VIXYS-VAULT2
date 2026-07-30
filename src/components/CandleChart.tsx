import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Activity,
  Info,
} from 'lucide-react';
import { Candle } from '../types';

export interface ModelSignalInfo {
  direction: 'YES' | 'NO';
  confidence: number;
  targetPrice?: number;
  n?: number;
}

export interface CandleChartProps {
  candles: Candle[];
  targetPrice?: number;
  currentPrice: number;
  timeframe?: '15M' | '1H';
  onTimeframeChange?: (tf: '15M' | '1H') => void;
  predictedDirection?: 'YES' | 'NO';
  dataSource?: 'mock' | 'live';
  modelSignal?: ModelSignalInfo;
}

const THEME = {
  bg: '#0d0a1a',
  panel: '#150f28',
  border: '#2a2340',
  bull: '#2dd4bf',
  bear: '#f56565',
  purple: '#8b5cf6',
  purpleBright: '#a78bfa',
  amber: '#f5b942',
  textDim: '#8b84a8',
  text: '#e5e0f5',
};

// ---------- Indicator math — all derived directly from the input data ----------

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] || 0;
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

function rsi(closes: number[], period = 14): (number | null)[] {
  const out = new Array(closes.length).fill(null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
    }
  }
  return out;
}

function vwap(candles: Candle[]): number[] {
  let cumPV = 0;
  let cumV = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
    return cumV === 0 ? typical : cumPV / cumV;
  });
}

function volumeZScore(volumes: number[], window = 20): number[] {
  return volumes.map((v, i) => {
    if (i < window) return 0;
    const slice = volumes.slice(i - window, i);
    const mean = slice.reduce((a, b) => a + b, 0) / window;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / window;
    const std = Math.sqrt(variance);
    return std === 0 ? 0 : (v - mean) / std;
  });
}

function isDoji(c: Candle, threshold = 0.1): boolean {
  const range = c.high - c.low;
  return range > 0 && Math.abs(c.close - c.open) / range < threshold;
}

export interface AnnotationItem {
  idx: number;
  price: number;
  kind: 'pattern' | 'crossover' | 'volume';
  label: string;
  detail: string;
}

// ---------- Annotation building — derived strictly from stateable rules ----------

function buildAnnotations(
  candles: Candle[],
  ema9Val: number[],
  ema21Val: number[],
  volZ: number[]
): AnnotationItem[] {
  const anns: AnnotationItem[] = [];
  candles.forEach((c, i) => {
    if (isDoji(c)) {
      anns.push({
        idx: i,
        price: c.close,
        kind: 'pattern',
        label: `Candle #${i + 1}: Doji`,
        detail:
          'Open and close within 10% of high-low range — reflects indecision, not a directional directive by itself.',
      });
    }
    if (i > 0 && ema9Val[i - 1] < ema21Val[i - 1] && ema9Val[i] >= ema21Val[i]) {
      anns.push({
        idx: i,
        price: c.close,
        kind: 'crossover',
        label: `Candle #${i + 1}: EMA9 Bullish Crossover`,
        detail:
          'Short-term average moved above longer-term average — a commonly watched momentum shift.',
      });
    }
    if (i > 0 && ema9Val[i - 1] > ema21Val[i - 1] && ema9Val[i] <= ema21Val[i]) {
      anns.push({
        idx: i,
        price: c.close,
        kind: 'crossover',
        label: `Candle #${i + 1}: EMA9 Bearish Crossover`,
        detail:
          'Short-term average moved below longer-term average — a commonly watched bearish shift.',
      });
    }
    if (volZ[i] > 2) {
      anns.push({
        idx: i,
        price: c.close,
        kind: 'volume',
        label: `Candle #${i + 1}: Volume spike (z=${volZ[i].toFixed(1)})`,
        detail:
          'Traded volume >2 std dev above trailing 20-bar mean. Reflects feed volume delta, not identified whale entity.',
      });
    }
  });
  return anns;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  targetPrice,
  currentPrice,
  timeframe = '15M',
  onTimeframeChange,
  predictedDirection = 'YES',
  dataSource = 'mock',
  modelSignal,
}) => {
  const [mode, setMode] = useState<'beginner' | 'pro'>('beginner');
  const [hoveredAnnIdx, setHoveredAnnIdx] = useState<number | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!candles || candles.length === 0) {
    return (
      <div className="h-72 bg-[#0d0a1a] rounded-2xl border border-[#2a2340] flex items-center justify-center text-[#8b84a8] font-mono text-xs">
        Loading {timeframe} Candlestick Data Feed...
      </div>
    );
  }

  // Handle zoom slicing
  const visibleCount = Math.max(8, Math.round(candles.length / zoomLevel));
  const visibleCandles = candles.slice(candles.length - visibleCount);

  const activeSignal: ModelSignalInfo = modelSignal || {
    direction: predictedDirection,
    confidence: 0.91,
    targetPrice: targetPrice,
    n: 120,
  };

  const closes = visibleCandles.map((c) => c.close);
  const volumes = visibleCandles.map((c) => c.volume);

  const ema9Val = useMemo(() => ema(closes, 9), [closes]);
  const ema21Val = useMemo(() => ema(closes, 21), [closes]);
  const vwapLine = useMemo(() => vwap(visibleCandles), [visibleCandles]);
  const rsiLine = useMemo(() => rsi(closes, 14), [closes]);
  const volZ = useMemo(() => volumeZScore(volumes, 20), [volumes]);

  const annotations = useMemo(
    () => buildAnnotations(visibleCandles, ema9Val, ema21Val, volZ),
    [visibleCandles, ema9Val, ema21Val, volZ]
  );

  const width = 840;
  const height = mode === 'pro' ? 520 : 340;
  const chartHeight = mode === 'pro' ? 280 : 250;
  const volumeHeight = mode === 'pro' ? 70 : 0;
  const rsiHeight = mode === 'pro' ? 80 : 0;
  const marginLeft = 60;
  const marginRight = 16;
  const marginTop = 16;

  const lowPrices = visibleCandles.map((c) => c.low);
  const highPrices = visibleCandles.map((c) => c.high);
  let priceMin = Math.min(...lowPrices);
  let priceMax = Math.max(...highPrices);

  const refSpot = currentPrice > 0 ? currentPrice : closes[closes.length - 1] || 100;
  if (activeSignal.targetPrice) {
    priceMin = Math.min(priceMin, activeSignal.targetPrice);
    priceMax = Math.max(priceMax, activeSignal.targetPrice);
  }
  priceMin = Math.min(priceMin, refSpot);
  priceMax = Math.max(priceMax, refSpot);

  const pad = (priceMax - priceMin) * 0.08 || refSpot * 0.01;
  const yMin = priceMin - pad;
  const yMax = priceMax + pad;

  const plotWidth = width - marginLeft - marginRight;
  const candleSlot = plotWidth / visibleCandles.length;
  const candleWidth = Math.max(3, candleSlot * 0.65);

  const x = (i: number) => marginLeft + i * candleSlot + candleSlot / 2;
  const y = (price: number) =>
    marginTop + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;

  const maxVol = Math.max(...volumes) || 1;
  const yVol = (v: number) => (v / maxVol) * (volumeHeight - 8);

  const rsiTop = marginTop + chartHeight + (mode === 'pro' ? volumeHeight + 20 : 0);
  const yRsi = (v: number) => rsiTop + rsiHeight - (v / 100) * rsiHeight;

  const linePath = (values: number[], yFn: (val: number) => number) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yFn(v)}`).join(' ');

  const latestClose = closes[closes.length - 1] || refSpot;

  const chartInner = (
    <div
      style={{
        background: THEME.bg,
        borderRadius: 16,
        border: `1px solid ${THEME.border}`,
        padding: 16,
        fontFamily: "'JetBrains Mono', monospace",
        color: THEME.text,
      }}
      className="shadow-2xl space-y-3"
    >
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2a2340]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Data Feed Source Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 8,
              background:
                dataSource === 'live'
                  ? 'rgba(45,212,191,0.12)'
                  : 'rgba(245,185,66,0.12)',
              color: dataSource === 'live' ? THEME.bull : THEME.amber,
              border: `1px solid ${
                dataSource === 'live'
                  ? 'rgba(45,212,191,0.3)'
                  : 'rgba(245,185,66,0.3)'
              }`,
            }}
            title="Sample data stream from backtest database"
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'currentColor',
              }}
            />
            {dataSource === 'live' ? 'Live venue feed' : 'Sample stream (Backtest)'}
          </span>

          <span className="text-[#8b84a8]">Spot:</span>
          <span className="font-extrabold text-white text-sm bg-[#150f28] px-2.5 py-0.5 rounded border border-[#2a2340]">
            ${latestClose.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </span>

          {/* Timeframe selector if handler exists */}
          {onTimeframeChange && (
            <div className="flex items-center gap-1 bg-[#150f28] p-1 rounded-lg border border-[#2a2340]">
              <button
                onClick={() => onTimeframeChange('15M')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  timeframe === '15M'
                    ? 'bg-purple-600 text-white'
                    : 'text-[#8b84a8] hover:text-white'
                }`}
              >
                15M
              </button>
              <button
                onClick={() => onTimeframeChange('1H')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  timeframe === '1H'
                    ? 'bg-purple-600 text-white'
                    : 'text-[#8b84a8] hover:text-white'
                }`}
              >
                1H
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#150f28] p-1 rounded-lg border border-[#2a2340]">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1 rounded hover:bg-[#2a2340] text-[#8b84a8] hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
              className="p-1 rounded hover:bg-[#2a2340] text-[#8b84a8] hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={() => setZoomLevel(1)}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold hover:bg-[#2a2340] text-purple-300"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Mode Switcher + Fullscreen */}
        <div className="flex items-center gap-2">
          <div
            style={{
              display: 'inline-flex',
              background: THEME.panel,
              borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              padding: 2,
            }}
          >
            {(['beginner', 'pro'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  fontWeight: 700,
                  background: mode === m ? THEME.purple : 'transparent',
                  color: mode === m ? '#fff' : THEME.textDim,
                  transition: 'all 0.15s ease',
                }}
              >
                {m === 'beginner' ? 'Beginner Mode' : 'Pro Quant'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#150f28] hover:bg-[#2a2340] border border-[#2a2340] text-[#8b84a8] hover:text-white transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Beginner plain-English read */}
      {mode === 'beginner' && (
        <div
          style={{
            background: THEME.panel,
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            lineHeight: 1.5,
          }}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <div>
            <span style={{ color: THEME.textDim }}>Model Directional Lean: </span>
            <span
              style={{
                color: activeSignal.direction === 'YES' ? THEME.bull : THEME.bear,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              SIGNAL: {activeSignal.direction}
            </span>
            <span style={{ color: THEME.textDim }}>
              {' '}&middot; Model Confidence: Math.round({Math.round(activeSignal.confidence * 100)}%)
              {activeSignal.n && activeSignal.n < 100 && ` (n=${activeSignal.n} — early, treat as noisy)`}
            </span>
          </div>

          <span className="text-[11px] text-[#8b84a8] flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-purple-400" /> Single clean trend overview (EMA9)
          </span>
        </div>
      )}

      {/* Hover Inspection Bar */}
      {hoveredCandle && (
        <div className="bg-[#150f28] px-3 py-1.5 rounded-lg border border-[#2a2340] flex flex-wrap items-center gap-4 text-xs font-mono">
          <span className="text-[#8b84a8]">Candle Detail:</span>
          <span>O: <strong className="text-white">${hoveredCandle.open.toFixed(1)}</strong></span>
          <span>H: <strong className="text-white">${hoveredCandle.high.toFixed(1)}</strong></span>
          <span>L: <strong className="text-white">${hoveredCandle.low.toFixed(1)}</strong></span>
          <span>
            C:{' '}
            <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-[#2dd4bf]' : 'text-[#f56565]'}>
              ${hoveredCandle.close.toFixed(1)}
            </strong>
          </span>
          <span>Vol: <strong className="text-purple-300">{hoveredCandle.volume.toFixed(1)} BTC</strong></span>
        </div>
      )}

      {/* SVG Plot & Side Panel Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="w-full flex-1 overflow-x-auto">
          <svg width={width} height={height} className="w-full h-auto select-none">
            {/* Price grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const price = yMin + f * (yMax - yMin);
              return (
                <g key={f}>
                  <line
                    x1={marginLeft}
                    x2={width - marginRight}
                    y1={y(price)}
                    y2={y(price)}
                    stroke={THEME.border}
                    strokeDasharray="2,3"
                  />
                  <text
                    x={marginLeft - 8}
                    y={y(price) + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill={THEME.textDim}
                    fontFamily="monospace"
                  >
                    ${price.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Target Price Line */}
            {activeSignal.targetPrice && (
              <g>
                <line
                  x1={marginLeft}
                  x2={width - marginRight}
                  y1={y(activeSignal.targetPrice)}
                  y2={y(activeSignal.targetPrice)}
                  stroke={activeSignal.direction === 'YES' ? THEME.bull : THEME.bear}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <rect
                  x={width - marginRight - 120}
                  y={y(activeSignal.targetPrice) - 9}
                  width="120"
                  height="18"
                  rx="4"
                  fill={activeSignal.direction === 'YES' ? '#042f2e' : '#450a0a'}
                  stroke={activeSignal.direction === 'YES' ? THEME.bull : THEME.bear}
                  strokeWidth="1"
                />
                <text
                  x={width - marginRight - 60}
                  y={y(activeSignal.targetPrice) + 3}
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  TARGET: ${Math.round(activeSignal.targetPrice)}
                </text>
              </g>
            )}

            {/* Candlesticks */}
            {visibleCandles.map((c, i) => {
              const bull = c.close >= c.open;
              const color = bull ? THEME.bull : THEME.bear;
              const bodyTop = y(Math.max(c.open, c.close));
              const bodyBottom = y(Math.min(c.open, c.close));
              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredCandle(c)}
                  onMouseLeave={() => setHoveredCandle(null)}
                  className="cursor-pointer"
                >
                  <line
                    x1={x(i)}
                    x2={x(i)}
                    y1={y(c.high)}
                    y2={y(c.low)}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect
                    x={x(i) - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={Math.max(1, bodyBottom - bodyTop)}
                    fill={color}
                  />
                </g>
              );
            })}

            {/* EMA9 Trendline — shown in both modes */}
            <path
              d={linePath(ema9Val, y)}
              stroke={THEME.purpleBright}
              strokeWidth="1.5"
              fill="none"
            />

            {/* Pro Quant Indicators */}
            {mode === 'pro' && (
              <>
                {/* EMA21 Line */}
                <path
                  d={linePath(ema21Val, y)}
                  stroke="#6ea8fe"
                  strokeWidth="1.5"
                  strokeDasharray="4,2"
                  fill="none"
                />

                {/* VWAP Line */}
                <path
                  d={linePath(vwapLine, y)}
                  stroke={THEME.amber}
                  strokeWidth="1.2"
                  fill="none"
                  opacity="0.8"
                />

                {/* Annotation markers on plot area — small dot only, details are in the side panel */}
                {annotations.map((a, i) => (
                  <circle
                    key={i}
                    cx={x(a.idx)}
                    cy={y(a.price)}
                    r={hoveredAnnIdx === i ? 6 : 3.5}
                    fill={
                      a.kind === 'pattern'
                        ? THEME.amber
                        : a.kind === 'volume'
                        ? THEME.purpleBright
                        : THEME.bull
                    }
                    stroke={THEME.bg}
                    strokeWidth="1.5"
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={() => setHoveredAnnIdx(i)}
                    onMouseLeave={() => setHoveredAnnIdx(null)}
                  />
                ))}

                {/* Volume panel */}
                <g transform={`translate(0, ${marginTop + chartHeight + 12})`}>
                  <line
                    x1={marginLeft}
                    x2={width - marginRight}
                    y1="0"
                    y2="0"
                    stroke={THEME.border}
                    strokeWidth="1"
                  />
                  {visibleCandles.map((c, i) => {
                    const bull = c.close >= c.open;
                    return (
                      <rect
                        key={i}
                        x={x(i) - candleWidth / 2}
                        y={volumeHeight - yVol(c.volume)}
                        width={candleWidth}
                        height={yVol(c.volume)}
                        fill={bull ? THEME.bull : THEME.bear}
                        opacity="0.45"
                      />
                    );
                  })}
                  <text
                    x={marginLeft}
                    y="12"
                    fontSize="9"
                    fill={THEME.textDim}
                    fontFamily="monospace"
                  >
                    Volume (BTC)
                  </text>
                </g>

                {/* RSI panel */}
                <g>
                  <line
                    x1={marginLeft}
                    x2={width - marginRight}
                    y1={rsiTop}
                    y2={rsiTop}
                    stroke={THEME.border}
                    strokeWidth="1"
                  />
                  <line
                    x1={marginLeft}
                    x2={width - marginRight}
                    y1={yRsi(70)}
                    y2={yRsi(70)}
                    stroke={THEME.bear}
                    strokeDasharray="2,3"
                    opacity="0.4"
                  />
                  <line
                    x1={marginLeft}
                    x2={width - marginRight}
                    y1={yRsi(30)}
                    y2={yRsi(30)}
                    stroke={THEME.bull}
                    strokeDasharray="2,3"
                    opacity="0.4"
                  />
                  <path
                    d={rsiLine
                      .map((v, i) =>
                        v == null
                          ? ''
                          : `${i === 0 || rsiLine[i - 1] == null ? 'M' : 'L'} ${x(i)} ${yRsi(v)}`
                      )
                      .join(' ')}
                    stroke={THEME.purpleBright}
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <text
                    x={marginLeft}
                    y={rsiTop - 6}
                    fontSize="10"
                    fill={THEME.textDim}
                    fontFamily="monospace"
                  >
                    RSI(14):{' '}
                    <tspan fill={THEME.text}>
                      {rsiLine[rsiLine.length - 1]?.toFixed(1) ?? '—'}
                    </tspan>
                  </text>
                </g>
              </>
            )}
          </svg>
        </div>

        {/* Annotation list panel — structurally moves labels off plot area to eliminate overlap collisions */}
        {mode === 'pro' && (
          <div className="w-full lg:w-60 flex-shrink-0 bg-[#150f28] rounded-xl border border-[#2a2340] p-3 space-y-2 max-h-[500px] overflow-y-auto">
            <div className="text-[10px] font-bold text-[#8b84a8] uppercase tracking-wider flex items-center justify-between border-b border-[#2a2340] pb-2">
              <span>Rule Annotations ({annotations.length})</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>

            {annotations.length === 0 ? (
              <p className="text-xs text-[#8b84a8] italic py-3 text-center">
                No technical patterns matched mathematical detection criteria in this window.
              </p>
            ) : (
              annotations.map((a, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredAnnIdx(i)}
                  onMouseLeave={() => setHoveredAnnIdx(null)}
                  style={{
                    background:
                      hoveredAnnIdx === i
                        ? 'rgba(139,92,246,0.18)'
                        : 'rgba(13,10,26,0.6)',
                    border: `1px solid ${
                      hoveredAnnIdx === i ? THEME.purple : THEME.border
                    }`,
                    borderRadius: 8,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div className="font-bold text-xs text-white mb-1 flex items-center justify-between">
                    <span>{a.label}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          a.kind === 'pattern'
                            ? THEME.amber
                            : a.kind === 'volume'
                            ? THEME.purpleBright
                            : THEME.bull,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-[#8b84a8] leading-relaxed">
                    {a.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chart Footer Legend */}
      <div className="pt-2 text-[11px] text-[#8b84a8] flex flex-wrap items-center justify-between gap-3 border-t border-[#2a2340]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span style={{ color: THEME.bull }}>●</span> Bullish
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: THEME.bear }}>●</span> Bearish
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: THEME.purpleBright }}>—</span> EMA9
          </span>
          {mode === 'pro' && (
            <>
              <span className="flex items-center gap-1.5">
                <span style={{ color: '#6ea8fe' }}>--</span> EMA21
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ color: THEME.amber }}>—</span> VWAP
              </span>
            </>
          )}
        </div>

        <div className="text-[10px] text-[#8b84a8]">
          Hover annotation card to highlight candle position
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070414]/95 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fadeIn flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 bg-[#150f28] p-3 rounded-2xl border border-[#2a2340]">
          <div className="flex items-center gap-3 font-mono">
            <span className="px-3 py-1 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-200 text-xs font-bold">
              FULLSCREEN TERMINAL CHART
            </span>
            <h2 className="text-sm sm:text-base font-black text-white">
              BTC/USDT {timeframe} PRO CANDLESTICK ENGINE
            </h2>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all border border-purple-400/50 flex items-center gap-2 text-xs font-bold shadow-lg"
          >
            <X className="w-4 h-4" />
            <span>CLOSE FULLSCREEN</span>
          </button>
        </div>
        <div className="flex-1">{chartInner}</div>
      </div>
    );
  }

  return chartInner;
};
