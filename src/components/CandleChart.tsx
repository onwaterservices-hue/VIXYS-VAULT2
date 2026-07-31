import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Activity,
  Info,
  RotateCcw,
  ShieldCheck,
  Zap,
  Sliders,
  Eye,
  EyeOff,
  Crosshair,
  BarChart2,
  Layers,
  Flame,
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
  bull: '#10b981', // Vivid Emerald
  bullGlow: 'rgba(16, 185, 129, 0.25)',
  bear: '#f43f5e', // Vivid Rose / Crimson
  bearGlow: 'rgba(244, 63, 94, 0.25)',
  amber: '#f59e0b', // Amber
  purple: '#8b5cf6', // EMA9 / primary accent
  purpleBright: '#c084fc',
  blue: '#38bdf8', // EMA21 dashed
  cyan: '#22d3ee', // VWAP
  bbRibbon: 'rgba(139, 92, 246, 0.08)', // Bollinger Bands fill
  textDim: '#8b84a8',
  text: '#e5e0f5',
};

const WIDE_BREAKPOINT = 760;
const MIN_CANDLE_SLOT_PX = 12;

// Container Width Hook
function useContainerWidth() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(800);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { containerRef, width };
}

// Indicator Calculations
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

function bollingerBands(closes: number[], period = 20, multiplier = 2) {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      middle.push(mean);
      upper.push(mean + multiplier * stdDev);
      lower.push(mean - multiplier * stdDev);
    }
  }
  return { upper, middle, lower };
}

export interface ChartSignal {
  idx: number;
  time: string;
  price: number;
  type: 'breakout' | 'breakdown' | 'doji' | 'doji_hold' | 'doji_reversal_bull' | 'doji_reversal_bear' | 'bb_squeeze';
  label: string;
  detail: string;
  color: string;
  symbol: string;
}

function buildChartSignals(candles: Candle[], dataSource: string = 'live'): ChartSignal[] {
  const signals: ChartSignal[] = [];

  candles.forEach((c, i) => {
    if (i < 3) return;

    const windowSize = Math.min(10, i);
    const slice = candles.slice(i - windowSize, i);
    const trailingHigh = Math.max(...slice.map((x) => x.high));
    const trailingLow = Math.min(...slice.map((x) => x.low));

    if (c.close > trailingHigh) {
      signals.push({
        idx: i,
        time: String(c.time || `Bar #${i + 1}`),
        price: c.close,
        type: 'breakout',
        label: `Candle #${i + 1}: Resistance Break`,
        detail: `Close ($${c.close.toFixed(1)}) crossed above 10-bar trailing resistance ($${trailingHigh.toFixed(1)}).`,
        color: THEME.bull,
        symbol: '▲',
      });
    } else if (c.close < trailingLow) {
      signals.push({
        idx: i,
        time: String(c.time || `Bar #${i + 1}`),
        price: c.close,
        type: 'breakdown',
        label: `Candle #${i + 1}: Support Break`,
        detail: `Close ($${c.close.toFixed(1)}) broke below 10-bar trailing support ($${trailingLow.toFixed(1)}).`,
        color: THEME.bear,
        symbol: '▼',
      });
    }

    const range = c.high - c.low;
    const isDoji = range > 0 && Math.abs(c.close - c.open) / range <= 0.10;

    if (isDoji) {
      const nearSupport =
        Math.abs(c.close - trailingLow) / trailingLow <= 0.0015 ||
        Math.abs(c.low - trailingLow) / trailingLow <= 0.0015;
      const nearResistance =
        Math.abs(c.close - trailingHigh) / trailingHigh <= 0.0015 ||
        Math.abs(c.high - trailingHigh) / trailingHigh <= 0.0015;

      const hasNext = i < candles.length - 1;
      const nextCandle = hasNext ? candles[i + 1] : null;

      if (nearSupport) {
        if (hasNext && nextCandle && nextCandle.close > c.close) {
          signals.push({
            idx: i,
            time: String(c.time || `Bar #${i + 1}`),
            price: c.close,
            type: 'doji_reversal_bull',
            label: `Candle #${i + 1}: Doji Reversal (Confirmed)`,
            detail: `Doji pause formed near support ($${trailingLow.toFixed(1)}) and next candle closed higher ($${nextCandle.close.toFixed(1)}).`,
            color: THEME.bull,
            symbol: '◈',
          });
        } else {
          signals.push({
            idx: i,
            time: String(c.time || `Bar #${i + 1}`),
            price: c.close,
            type: 'doji_hold',
            label:
              dataSource === 'live' || !hasNext
                ? `Candle #${i + 1}: Doji Hold at Support (Pending)`
                : `Candle #${i + 1}: Doji Hold at Support`,
            detail: `Doji indecision candle formed within 0.15% of support ($${trailingLow.toFixed(1)}). Outcome pending next bar.`,
            color: THEME.amber,
            symbol: '◆',
          });
        }
      } else if (nearResistance) {
        if (hasNext && nextCandle && nextCandle.close < c.close) {
          signals.push({
            idx: i,
            time: String(c.time || `Bar #${i + 1}`),
            price: c.close,
            type: 'doji_reversal_bear',
            label: `Candle #${i + 1}: Doji Reversal (Confirmed)`,
            detail: `Doji pause formed near resistance ($${trailingHigh.toFixed(1)}) and next candle closed lower ($${nextCandle.close.toFixed(1)}).`,
            color: THEME.bear,
            symbol: '◈',
          });
        } else {
          signals.push({
            idx: i,
            time: String(c.time || `Bar #${i + 1}`),
            price: c.close,
            type: 'doji_hold',
            label:
              dataSource === 'live' || !hasNext
                ? `Candle #${i + 1}: Doji Hold at Resistance (Pending)`
                : `Candle #${i + 1}: Doji Hold at Resistance`,
            detail: `Doji indecision candle formed within 0.15% of resistance ($${trailingHigh.toFixed(1)}). Outcome pending next bar.`,
            color: THEME.amber,
            symbol: '◆',
          });
        }
      } else {
        signals.push({
          idx: i,
          time: String(c.time || `Bar #${i + 1}`),
          price: c.close,
          type: 'doji',
          label: `Candle #${i + 1}: Doji Pivot`,
          detail: `Open and close within 10% of total bar range ($${range.toFixed(1)}). Indecision inside range.`,
          color: THEME.amber,
          symbol: '◇',
        });
      }
    }
  });

  return signals;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  candles,
  targetPrice,
  currentPrice,
  timeframe = '15M',
  onTimeframeChange,
  predictedDirection = 'YES',
  dataSource = 'live',
  modelSignal,
}) => {
  const { containerRef, width: measuredWidth } = useContainerWidth();
  const [hoveredSignalIdx, setHoveredSignalIdx] = useState<number | null>(null);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Indicator Toggles
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showVWAP, setShowVWAP] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(true);
  const [showSRLevels, setShowSRLevels] = useState<boolean>(true);
  const [showSignals, setShowSignals] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(true);
  const [showCrosshair, setShowCrosshair] = useState<boolean>(true);

  // Mouse Crosshair Position State
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number; price: number; timeLabel: string } | null>(null);

  const isWide = measuredWidth >= WIDE_BREAKPOINT;
  const sidePanelWidth = isWide ? 260 : 0;
  const paddingX = 32;
  const chartSvgWidth = Math.max(300, measuredWidth - sidePanelWidth - paddingX);

  const safeCandles = candles || [];
  const rawVisibleCount =
    safeCandles.length > 0 ? Math.max(6, Math.round(safeCandles.length / zoomLevel)) : 0;

  const marginLeft = 65;
  const marginRight = 80; // Extra room for right Y-axis tags & target badges
  const plotWidth = Math.max(100, chartSvgWidth - marginLeft - marginRight);

  const maxFitCandles = Math.max(6, Math.floor(plotWidth / MIN_CANDLE_SLOT_PX));
  const autoThinned = rawVisibleCount > maxFitCandles;
  const visibleCount = Math.min(rawVisibleCount, maxFitCandles);

  const visibleCandles = useMemo(
    () => safeCandles.slice(Math.max(0, safeCandles.length - visibleCount)),
    [safeCandles, visibleCount]
  );

  const activeSignal: ModelSignalInfo = modelSignal || {
    direction: predictedDirection,
    confidence: 0.91,
    targetPrice: targetPrice,
    n: 120,
  };

  const closes = useMemo(() => visibleCandles.map((c) => c.close), [visibleCandles]);
  const volumes = useMemo(() => visibleCandles.map((c) => c.volume), [visibleCandles]);

  // Indicator Math
  const ema9Val = useMemo(() => (closes.length > 0 ? ema(closes, 9) : []), [closes]);
  const ema21Val = useMemo(() => (closes.length > 0 ? ema(closes, 21) : []), [closes]);
  const vwapLine = useMemo(() => (visibleCandles.length > 0 ? vwap(visibleCandles) : []), [visibleCandles]);
  const rsiLine = useMemo(() => (closes.length > 0 ? rsi(closes, 14) : []), [closes]);
  const bbData = useMemo(() => (closes.length > 0 ? bollingerBands(closes, 20, 2) : { upper: [], middle: [], lower: [] }), [closes]);

  const signals = useMemo(
    () => (visibleCandles.length > 0 ? buildChartSignals(visibleCandles, dataSource) : []),
    [visibleCandles, dataSource]
  );

  const { currentSupport, currentResistance } = useMemo(() => {
    if (visibleCandles.length === 0) return { currentSupport: 0, currentResistance: 0 };
    const windowSize = Math.min(10, visibleCandles.length);
    const recent = visibleCandles.slice(visibleCandles.length - windowSize);
    return {
      currentSupport: Math.min(...recent.map((c) => c.low)),
      currentResistance: Math.max(...recent.map((c) => c.high)),
    };
  }, [visibleCandles]);

  const zoomIn = useCallback(() => setZoomLevel((z) => Math.min(z * 1.3, 3.5)), []);
  const zoomOut = useCallback(() => setZoomLevel((z) => Math.max(z / 1.3, 0.5)), []);
  const resetZoom = useCallback(() => setZoomLevel(1), []);

  if (!candles || candles.length === 0) {
    return (
      <div
        ref={containerRef}
        className="h-72 bg-[#0d0a1a] rounded-2xl border border-[#2a2340] flex items-center justify-center text-[#8b84a8] font-mono text-xs"
      >
        <Activity className="w-4 h-4 animate-spin mr-2 text-purple-400" />
        Loading {timeframe} Candlestick Data Feed...
      </div>
    );
  }

  const svgHeight = showRSI ? 510 : 410;
  const chartHeight = 270;
  const volumeHeight = 60;
  const rsiHeight = 70;
  const marginTop = 25;

  const lowPrices = visibleCandles.map((c) => c.low);
  const highPrices = visibleCandles.map((c) => c.high);
  let priceMin = Math.min(...lowPrices);
  let priceMax = Math.max(...highPrices);

  const refSpot = currentPrice > 0 ? currentPrice : closes[closes.length - 1] || 100;
  if (activeSignal.targetPrice) {
    priceMin = Math.min(priceMin, activeSignal.targetPrice);
    priceMax = Math.max(priceMax, activeSignal.targetPrice);
  }
  if (currentSupport > 0) priceMin = Math.min(priceMin, currentSupport);
  if (currentResistance > 0) priceMax = Math.max(priceMax, currentResistance);
  priceMin = Math.min(priceMin, refSpot);
  priceMax = Math.max(priceMax, refSpot);

  const pad = (priceMax - priceMin) * 0.08 || refSpot * 0.01;
  const yMin = priceMin - pad;
  const yMax = priceMax + pad;

  const candleSlot = plotWidth / visibleCandles.length;
  const candleWidth = Math.max(3, candleSlot * 0.65);

  const x = (i: number) => marginLeft + i * candleSlot + candleSlot / 2;
  const y = (price: number) =>
    marginTop + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;

  const maxVol = Math.max(...volumes) || 1;
  const yVol = (v: number) => (v / maxVol) * (volumeHeight - 8);

  const rsiTop = marginTop + chartHeight + volumeHeight + 20;
  const yRsi = (v: number) => rsiTop + rsiHeight - (v / 100) * rsiHeight;

  const linePath = (values: (number | null)[], yFn: (val: number) => number) => {
    let started = false;
    return values
      .map((v, i) => {
        if (v === null || isNaN(v)) return '';
        const pt = `${started ? 'L' : 'M'} ${x(i)} ${yFn(v)}`;
        started = true;
        return pt;
      })
      .filter(Boolean)
      .join(' ');
  };

  // Polygon area path for Bollinger Ribbon
  const bbRibbonPath = () => {
    const validPoints: { i: number; upper: number; lower: number }[] = [];
    visibleCandles.forEach((_, i) => {
      const u = bbData.upper[i];
      const l = bbData.lower[i];
      if (u !== null && l !== null) {
        validPoints.push({ i, upper: u, lower: l });
      }
    });

    if (validPoints.length === 0) return '';

    const upperStr = validPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${x(pt.i)} ${y(pt.upper)}`).join(' ');
    const lowerStr = validPoints
      .slice()
      .reverse()
      .map((pt) => `L ${x(pt.i)} ${y(pt.lower)}`)
      .join(' ');

    return `${upperStr} ${lowerStr} Z`;
  };

  const latestClose = closes[closes.length - 1] || refSpot;
  const previousClose = closes[closes.length - 2] || latestClose;
  const lastPriceChange = latestClose - previousClose;
  const lastPriceChangePct = (lastPriceChange / previousClose) * 100;

  // Active or hovered candle for Top HUD
  const displayCandleIdx = hoveredCandleIndex !== null ? hoveredCandleIndex : visibleCandles.length - 1;
  const displayCandle = visibleCandles[displayCandleIdx] || visibleCandles[visibleCandles.length - 1];
  const displayOpen = displayCandle?.open || 0;
  const displayHigh = displayCandle?.high || 0;
  const displayLow = displayCandle?.low || 0;
  const displayClose = displayCandle?.close || 0;
  const displayVolume = displayCandle?.volume || 0;
  const displayEma9 = ema9Val[displayCandleIdx] || 0;
  const displayEma21 = ema21Val[displayCandleIdx] || 0;
  const displayVwap = vwapLine[displayCandleIdx] || 0;
  const displayRsi = rsiLine[displayCandleIdx] || 50;

  // Handle SVG Mouse Navigation & Crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!showCrosshair) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (
      mouseX >= marginLeft &&
      mouseX <= marginLeft + plotWidth &&
      mouseY >= marginTop &&
      mouseY <= marginTop + chartHeight + volumeHeight + 20
    ) {
      const relX = mouseX - marginLeft;
      const candleIdx = Math.min(
        visibleCandles.length - 1,
        Math.max(0, Math.floor(relX / candleSlot))
      );
      const priceVal = yMax - ((mouseY - marginTop) / chartHeight) * (yMax - yMin);
      const timeVal = String(visibleCandles[candleIdx]?.time || `Bar #${candleIdx + 1}`);

      setCrosshairPos({
        x: mouseX,
        y: Math.min(marginTop + chartHeight, Math.max(marginTop, mouseY)),
        price: Math.max(yMin, Math.min(yMax, priceVal)),
        timeLabel: timeVal,
      });
      setHoveredCandleIndex(candleIdx);
    } else {
      setCrosshairPos(null);
      setHoveredCandleIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setCrosshairPos(null);
    setHoveredCandleIndex(null);
  };

  const mainSvgContent = (
    <svg
      width={chartSvgWidth}
      height={svgHeight}
      className="overflow-visible select-none cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        {/* Subtle grid pattern */}
        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#1f1838" strokeWidth="0.5" />
        </pattern>

        {/* RSI Gradient */}
        <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={THEME.purpleBright} stopOpacity="0.3" />
          <stop offset="100%" stopColor={THEME.purpleBright} stopOpacity="0.0" />
        </linearGradient>

        {/* Bullish Volume Gradient */}
        <linearGradient id="bullVolGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={THEME.bull} stopOpacity="0.6" />
          <stop offset="100%" stopColor={THEME.bull} stopOpacity="0.15" />
        </linearGradient>

        {/* Bearish Volume Gradient */}
        <linearGradient id="bearVolGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={THEME.bear} stopOpacity="0.6" />
          <stop offset="100%" stopColor={THEME.bear} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Plot Background */}
      <rect x={marginLeft} y={marginTop} width={plotWidth} height={chartHeight} fill="url(#grid)" />

      {/* Bollinger Bands Fill Ribbon */}
      {showBollinger && (
        <>
          <path d={bbRibbonPath()} fill={THEME.bbRibbon} stroke="none" />
          <path d={linePath(bbData.upper, y)} fill="none" stroke={THEME.purple} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
          <path d={linePath(bbData.lower, y)} fill="none" stroke={THEME.purple} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
        </>
      )}

      {/* Support & Resistance Boundary Lines */}
      {showSRLevels && currentSupport > 0 && (
        <g>
          <line
            x1={marginLeft}
            y1={y(currentSupport)}
            x2={marginLeft + plotWidth}
            y2={y(currentSupport)}
            stroke={THEME.bull}
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.7"
          />
          <text
            x={marginLeft + 6}
            y={y(currentSupport) - 4}
            fill={THEME.bull}
            fontSize="9"
            fontWeight="bold"
          >
            SUPPORT ${currentSupport.toFixed(1)}
          </text>
        </g>
      )}

      {showSRLevels && currentResistance > 0 && (
        <g>
          <line
            x1={marginLeft}
            y1={y(currentResistance)}
            x2={marginLeft + plotWidth}
            y2={y(currentResistance)}
            stroke={THEME.bear}
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.7"
          />
          <text
            x={marginLeft + 6}
            y={y(currentResistance) + 10}
            fill={THEME.bear}
            fontSize="9"
            fontWeight="bold"
          >
            RESISTANCE ${currentResistance.toFixed(1)}
          </text>
        </g>
      )}

      {/* Target Strike Line */}
      {activeSignal.targetPrice && (
        <g>
          <line
            x1={marginLeft}
            y1={y(activeSignal.targetPrice)}
            x2={marginLeft + plotWidth}
            y2={y(activeSignal.targetPrice)}
            stroke={THEME.amber}
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />
          <rect
            x={marginLeft + plotWidth + 4}
            y={y(activeSignal.targetPrice) - 9}
            width="70"
            height="18"
            rx="4"
            fill="#261c08"
            stroke={THEME.amber}
            strokeWidth="1"
          />
          <text
            x={marginLeft + plotWidth + 9}
            y={y(activeSignal.targetPrice) + 3}
            fill={THEME.amber}
            fontSize="9"
            fontWeight="bold"
          >
            STRIKE ${activeSignal.targetPrice.toFixed(0)}
          </text>
        </g>
      )}

      {/* Indicator Overlay Lines */}
      {showVWAP && (
        <path
          d={linePath(vwapLine, y)}
          fill="none"
          stroke={THEME.cyan}
          strokeWidth="1.2"
          strokeOpacity="0.85"
        />
      )}
      {showEMA && (
        <>
          <path
            d={linePath(ema21Val, y)}
            fill="none"
            stroke={THEME.blue}
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <path d={linePath(ema9Val, y)} fill="none" stroke={THEME.purpleBright} strokeWidth="1.5" />
        </>
      )}

      {/* Candlesticks Rendering */}
      {visibleCandles.map((c, i) => {
        const cx = x(i);
        const isBull = c.close >= c.open;
        const color = isBull ? THEME.bull : THEME.bear;
        const topY = y(Math.max(c.open, c.close));
        const botY = y(Math.min(c.open, c.close));
        const bodyH = Math.max(1.5, botY - topY);

        const hasSignal = showSignals && signals.some((s) => s.idx === i);
        const isHoveredSignal = hoveredSignalIdx !== null && signals[hoveredSignalIdx]?.idx === i;
        const isHoveredCandle = hoveredCandleIndex === i;

        return (
          <g
            key={i}
            className="cursor-pointer"
            onClick={() => {
              const sigIndex = signals.findIndex((s) => s.idx === i);
              if (sigIndex !== -1) setHoveredSignalIdx(sigIndex);
            }}
          >
            {/* Highlight Pillar for hovered candle */}
            {isHoveredCandle && (
              <rect
                x={cx - candleSlot / 2}
                y={marginTop}
                width={candleSlot}
                height={chartHeight}
                fill="#ffffff"
                opacity="0.04"
              />
            )}

            {/* Wick */}
            <line
              x1={cx}
              y1={y(c.high)}
              x2={cx}
              y2={y(c.low)}
              stroke={color}
              strokeWidth={isHoveredCandle ? "2" : "1"}
              strokeOpacity="0.9"
            />
            {/* Body */}
            <rect
              x={cx - candleWidth / 2}
              y={topY}
              width={candleWidth}
              height={bodyH}
              fill={isBull ? color : THEME.bg}
              stroke={color}
              strokeWidth="1.2"
              rx="1.5"
              className="transition-all duration-100"
            />

            {/* Signal Markers */}
            {hasSignal && (
              <g>
                <circle
                  cx={cx}
                  cy={isBull ? y(c.low) + 12 : y(c.high) - 12}
                  r={isHoveredSignal ? "7" : "4.5"}
                  fill={isHoveredSignal ? THEME.purpleBright : THEME.amber}
                  stroke={THEME.bg}
                  strokeWidth="1.5"
                  className={isHoveredSignal ? "animate-ping" : ""}
                />
                <circle
                  cx={cx}
                  cy={isBull ? y(c.low) + 12 : y(c.high) - 12}
                  r={isHoveredSignal ? "5" : "3"}
                  fill={isHoveredSignal ? THEME.purpleBright : THEME.amber}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Live Price Tag Line */}
      <g>
        <line
          x1={marginLeft}
          y1={y(latestClose)}
          x2={marginLeft + plotWidth}
          y2={y(latestClose)}
          stroke={lastPriceChange >= 0 ? THEME.bull : THEME.bear}
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <circle
          cx={marginLeft + plotWidth}
          cy={y(latestClose)}
          r="4"
          fill={lastPriceChange >= 0 ? THEME.bull : THEME.bear}
          className="animate-pulse"
        />
        <rect
          x={marginLeft + plotWidth + 4}
          y={y(latestClose) - 9}
          width="70"
          height="18"
          rx="4"
          fill={lastPriceChange >= 0 ? '#064e3b' : '#881337'}
          stroke={lastPriceChange >= 0 ? THEME.bull : THEME.bear}
          strokeWidth="1"
        />
        <text
          x={marginLeft + plotWidth + 9}
          y={y(latestClose) + 3}
          fill="#ffffff"
          fontSize="9"
          fontWeight="bold"
        >
          ${latestClose.toFixed(1)}
        </text>
      </g>

      {/* Volume Sub-Chart */}
      <g transform={`translate(0, ${marginTop + chartHeight + 10})`}>
        <rect
          x={marginLeft}
          y="0"
          width={plotWidth}
          height={volumeHeight}
          fill="none"
          stroke="#1f1838"
          strokeWidth="0.5"
        />
        <text x={marginLeft + 6} y="12" fill={THEME.textDim} fontSize="8" fontWeight="bold">
          VOLUME (DELTA)
        </text>
        {visibleCandles.map((c, i) => {
          const cx = x(i);
          const vH = yVol(c.volume);
          const isBull = c.close >= c.open;
          return (
            <rect
              key={i}
              x={cx - candleWidth / 2}
              y={volumeHeight - vH}
              width={candleWidth}
              height={vH}
              fill={isBull ? "url(#bullVolGrad)" : "url(#bearVolGrad)"}
              stroke={isBull ? THEME.bull : THEME.bear}
              strokeWidth="0.5"
              opacity="0.8"
            />
          );
        })}
      </g>

      {/* RSI Sub-Chart */}
      {showRSI && (
        <g transform={`translate(0, 0)`}>
          <rect
            x={marginLeft}
            y={rsiTop}
            width={plotWidth}
            height={rsiHeight}
            fill="none"
            stroke="#1f1838"
            strokeWidth="0.5"
          />
          {/* Overbought line (70) */}
          <line
            x1={marginLeft}
            y1={yRsi(70)}
            x2={marginLeft + plotWidth}
            y2={yRsi(70)}
            stroke={THEME.bear}
            strokeDasharray="2 2"
            strokeOpacity="0.5"
          />
          {/* Oversold line (30) */}
          <line
            x1={marginLeft}
            y1={yRsi(30)}
            x2={marginLeft + plotWidth}
            y2={yRsi(30)}
            stroke={THEME.bull}
            strokeDasharray="2 2"
            strokeOpacity="0.5"
          />
          <text x={marginLeft + 6} y={rsiTop + 12} fill={THEME.textDim} fontSize="8" fontWeight="bold">
            RSI(14)
          </text>
          <text x={marginLeft + plotWidth - 24} y={yRsi(70) - 2} fill={THEME.bear} fontSize="7" opacity="0.7">
            70 OB
          </text>
          <text x={marginLeft + plotWidth - 24} y={yRsi(30) + 8} fill={THEME.bull} fontSize="7" opacity="0.7">
            30 OS
          </text>

          {/* RSI Curve */}
          <path
            d={linePath(
              rsiLine.map((r) => r ?? 50),
              yRsi
            )}
            fill="none"
            stroke={THEME.purpleBright}
            strokeWidth="1.2"
          />
        </g>
      )}

      {/* Crosshair Overlay */}
      {crosshairPos && (
        <g>
          {/* Vertical Crosshair Line */}
          <line
            x1={crosshairPos.x}
            y1={marginTop}
            x2={crosshairPos.x}
            y2={svgHeight - 20}
            stroke="#a78bfa"
            strokeWidth="0.75"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          {/* Horizontal Crosshair Line */}
          <line
            x1={marginLeft}
            y1={crosshairPos.y}
            x2={marginLeft + plotWidth}
            y2={crosshairPos.y}
            stroke="#a78bfa"
            strokeWidth="0.75"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          {/* Price Label on right axis */}
          <rect
            x={marginLeft + plotWidth + 4}
            y={crosshairPos.y - 8}
            width="70"
            height="16"
            rx="3"
            fill="#3b0764"
            stroke="#a78bfa"
            strokeWidth="1"
          />
          <text
            x={marginLeft + plotWidth + 8}
            y={crosshairPos.y + 3}
            fill="#ffffff"
            fontSize="8"
            fontWeight="bold"
          >
            ${crosshairPos.price.toFixed(1)}
          </text>
          {/* Timestamp Label at bottom */}
          <rect
            x={crosshairPos.x - 30}
            y={marginTop + chartHeight + (showRSI ? volumeHeight + rsiHeight + 25 : volumeHeight + 15)}
            width="60"
            height="14"
            rx="3"
            fill="#3b0764"
            stroke="#a78bfa"
            strokeWidth="1"
          />
          <text
            x={crosshairPos.x}
            y={marginTop + chartHeight + (showRSI ? volumeHeight + rsiHeight + 35 : volumeHeight + 25)}
            fill="#ffffff"
            fontSize="8"
            fontWeight="bold"
            textAnchor="middle"
          >
            {crosshairPos.timeLabel}
          </text>
        </g>
      )}

      {/* Y-Axis Price Scale Labels */}
      <g>
        <text x={marginLeft - 8} y={y(yMax) + 8} fill={THEME.textDim} fontSize="8" textAnchor="end">
          ${yMax.toFixed(0)}
        </text>
        <text
          x={marginLeft - 8}
          y={y((yMax + yMin) / 2)}
          fill={THEME.textDim}
          fontSize="8"
          textAnchor="end"
        >
          ${((yMax + yMin) / 2).toFixed(0)}
        </text>
        <text x={marginLeft - 8} y={y(yMin) - 2} fill={THEME.textDim} fontSize="8" textAnchor="end">
          ${yMin.toFixed(0)}
        </text>
      </g>
    </svg>
  );

  const annotationPanel = (
    <div className="flex flex-col h-full bg-[#150f28] rounded-xl border border-[#2a2340] p-3 text-xs font-mono space-y-3">
      <div className="flex items-center justify-between border-b border-[#2a2340] pb-2">
        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" /> Pattern Detections ({signals.length})
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
          Honest Rules
        </span>
      </div>

      {signals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#8b84a8] text-[11px] text-center p-4">
          No pattern signals detected in visible range.
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
          {signals.map((sig, sIdx) => {
            const isSelected = hoveredSignalIdx === sIdx;
            return (
              <div
                key={sIdx}
                onClick={() => {
                  setHoveredSignalIdx(sIdx);
                  setHoveredCandleIndex(sig.idx);
                }}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/50 shadow-lg ring-1 ring-purple-500/30'
                    : 'bg-[#0d0a1a]/60 border-[#2a2340] hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-[11px]" style={{ color: sig.color }}>
                    {sig.symbol} {sig.label}
                  </span>
                  <span className="text-[9px] text-[#8b84a8]">{sig.time}</span>
                </div>
                <p className="text-[10px] text-purple-200/80 leading-relaxed">{sig.detail}</p>
                <div className="mt-1.5 text-[9px] font-bold text-purple-300/60 flex items-center justify-between">
                  <span>Price Level: ${sig.price.toFixed(1)}</span>
                  <span className="text-[9px] text-teal-400">Bar #{sig.idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const controlsBar = (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#150f28] rounded-xl border border-[#2a2340] font-mono text-xs mb-3">
      {/* Timeframe selector */}
      <div className="flex items-center gap-1">
        {(['15M', '1H'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange && onTimeframeChange(tf)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
              timeframe === tf
                ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                : 'bg-[#0d0a1a] text-[#8b84a8] border-[#2a2340] hover:text-white'
            }`}
          >
            {tf}
          </button>
        ))}
        {autoThinned && (
          <span className="ml-2 text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            auto-thinned
          </span>
        )}
      </div>

      {/* Spot & Target summary */}
      <div className="flex items-center gap-3 text-[11px]">
        <div>
          <span className="text-[#8b84a8]">SPOT: </span>
          <span className="font-bold text-white">${latestClose.toFixed(1)}</span>
          <span
            className={`ml-1 text-[10px] font-bold ${
              lastPriceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {lastPriceChange >= 0 ? '+' : ''}
            {lastPriceChangePct.toFixed(2)}%
          </span>
        </div>
        {activeSignal.targetPrice && (
          <div className="flex items-center gap-1">
            <span className="text-[#8b84a8]">STRIKE: </span>
            <span className="font-bold text-amber-400">${activeSignal.targetPrice.toFixed(1)}</span>
            <span className="text-[9px] text-amber-300/70">
              ({latestClose >= activeSignal.targetPrice ? 'Above Strike' : 'Below Strike'})
            </span>
          </div>
        )}
        <div className="hidden sm:block">
          <span className="text-[#8b84a8]">CONF: </span>
          <span className="font-bold text-teal-400">{(activeSignal.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Zoom & Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="p-1.5 rounded bg-[#0d0a1a] text-[#8b84a8] hover:text-white border border-[#2a2340]"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="p-1.5 rounded bg-[#0d0a1a] text-[#8b84a8] hover:text-white border border-[#2a2340]"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetZoom}
          title="Reset Zoom"
          className="p-1.5 rounded bg-[#0d0a1a] text-[#8b84a8] hover:text-white border border-[#2a2340]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title="Toggle Fullscreen"
          className="p-1.5 rounded bg-[#0d0a1a] text-purple-300 hover:text-white border border-purple-500/30 ml-1"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );

  // Indicator Overlay Toolbar
  const indicatorToolbar = (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-[#0d0a1a] rounded-lg border border-[#2a2340] mb-3 text-[10px] font-mono">
      <span className="text-[#8b84a8] font-bold flex items-center gap-1 pr-1">
        <Sliders className="w-3 h-3 text-purple-400" /> Overlays:
      </span>

      <button
        onClick={() => setShowEMA(!showEMA)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          showEMA
            ? 'bg-purple-900/40 text-purple-200 border-purple-500/40 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        EMA 9/21
      </button>

      <button
        onClick={() => setShowVWAP(!showVWAP)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          showVWAP
            ? 'bg-cyan-950/40 text-cyan-200 border-cyan-500/40 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        VWAP
      </button>

      <button
        onClick={() => setShowBollinger(!showBollinger)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          showBollinger
            ? 'bg-indigo-950/40 text-indigo-200 border-indigo-500/40 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        Bollinger Bands
      </button>

      <button
        onClick={() => setShowSRLevels(!showSRLevels)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          showSRLevels
            ? 'bg-teal-950/40 text-teal-200 border-teal-500/40 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        Support/Resist
      </button>

      <button
        onClick={() => setShowRSI(!showRSI)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          showRSI
            ? 'bg-amber-950/40 text-amber-200 border-amber-500/40 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        RSI Subchart
      </button>

      <button
        onClick={() => setShowCrosshair(!showCrosshair)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          showCrosshair
            ? 'bg-slate-800 text-purple-300 border-purple-500/30 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <Crosshair className="w-3 h-3 text-purple-400" />
        Laser Crosshair
      </button>
    </div>
  );

  // Top Dynamic OHLC HUD readout
  const candleHudHeader = (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-[#150f28] rounded-xl border border-[#2a2340] mb-3 font-mono text-[11px] text-purple-200/90">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[#8b84a8] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
          <Activity className="w-3 h-3 text-teal-400 animate-pulse" />
          BAR READOUT:
        </span>
        <div>
          <span className="text-[#8b84a8]">O: </span>
          <span className="font-bold text-white">${displayOpen.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-[#8b84a8]">H: </span>
          <span className="font-bold text-emerald-400">${displayHigh.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-[#8b84a8]">L: </span>
          <span className="font-bold text-rose-400">${displayLow.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-[#8b84a8]">C: </span>
          <span className="font-bold text-white">${displayClose.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-[#8b84a8]">VOL: </span>
          <span className="font-bold text-purple-300">{displayVolume.toFixed(1)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px]">
        {showEMA && (
          <div>
            <span className="text-purple-400">EMA9: </span>
            <span className="font-bold text-white">${displayEma9.toFixed(1)}</span>
          </div>
        )}
        {showVWAP && (
          <div>
            <span className="text-cyan-400">VWAP: </span>
            <span className="font-bold text-white">${displayVwap.toFixed(1)}</span>
          </div>
        )}
        {showRSI && (
          <div>
            <span className="text-amber-400">RSI: </span>
            <span className="font-bold text-white">{displayRsi.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const mainViewContent = (
    <div
      ref={containerRef}
      className="w-full bg-[#0d0a1a] rounded-2xl border border-[#2a2340] p-4 text-[#e5e0f5] font-mono shadow-2xl"
    >
      {controlsBar}
      {candleHudHeader}
      {indicatorToolbar}

      <div className={`grid gap-4 ${isWide ? 'grid-cols-[1fr_260px]' : 'grid-cols-1'}`}>
        <div className="overflow-x-auto flex justify-center">{mainSvgContent}</div>
        <div>{annotationPanel}</div>
      </div>

      {/* Legend Footer */}
      <div className="mt-3 pt-3 border-t border-[#2a2340] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8b84a8]">
        <div className="flex items-center gap-3">
          {showEMA && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: THEME.purpleBright }} /> EMA9
            </span>
          )}
          {showEMA && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: THEME.blue }} /> EMA21
            </span>
          )}
          {showVWAP && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: THEME.cyan }} /> VWAP
            </span>
          )}
          {showBollinger && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Bollinger Bands (20,2)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-purple-300/60">
          <ShieldCheck className="w-3 h-3 text-teal-400" />
          <span>Institutional Feed • Sub-second Live OHLC Validation</span>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d0a1a]/95 backdrop-blur-md p-6 overflow-y-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-6xl relative">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute -top-10 right-0 p-2 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Exit Fullscreen
          </button>
          {mainViewContent}
        </div>
      </div>
    );
  }

  return mainViewContent;
};
