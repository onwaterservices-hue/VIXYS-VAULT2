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
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { Candle, SignalDirection } from '../types';
import { playBuyUpSound, playBuyDownSound } from '../utils/audio';

export interface ModelSignalInfo {
  direction: SignalDirection;
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
  predictedDirection?: SignalDirection;
  dataSource?: 'mock' | 'live';
  modelSignal?: ModelSignalInfo;
  venue?: string;
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
function useContainerSize() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(510);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setHeight(Math.floor(entry.contentRect.height));
          setWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { containerRef, width, height };
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
        time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
        time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
            time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
            time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
            time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
            time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
          time: typeof c.time === 'number' ? new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : String(c.time || `Bar #${i + 1}`),
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
  venue = 'Kalshi',
}) => {
  const { containerRef, width: measuredWidth, height: measuredHeight } = useContainerSize();
  const [hoveredSignalIdx, setHoveredSignalIdx] = useState<number | null>(null);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Indicator Toggles
  const [showTikTokAiOverlay, setShowTikTokAiOverlay] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
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
  const gapX = isWide ? 16 : 0;
  const paddingX = 32;
  const chartSvgWidth = Math.max(280, measuredWidth - sidePanelWidth - gapX - paddingX);

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

  if (safeCandles.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-[450px] rounded-2xl bg-[#080314] border border-purple-900/60 p-8 flex flex-col items-center justify-center text-center font-mono space-y-3 shadow-2xl relative overflow-hidden my-4"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-rose-900/10 pointer-events-none" />
        <WifiOff className="w-12 h-12 text-rose-400 animate-pulse relative z-10" />
        <span className="text-white font-black text-sm md:text-base tracking-widest uppercase relative z-10">
          CHART DATA UNAVAILABLE — RECONNECTING...
        </span>
        <p className="text-xs text-purple-300/70 max-w-md leading-relaxed relative z-10">
          Live exchange OHLC market stream is unreachable or re-establishing connection.
        </p>
      </div>
    );
  }

  const volumeHeight = 60;
  const rsiHeight = showRSI ? 75 : 0;
  const marginTop = 25;
  const marginBottom = 35;
  const svgHeight = Math.max(480, measuredHeight - 160);
  const chartHeight = Math.max(250, svgHeight - volumeHeight - rsiHeight - marginTop - marginBottom);

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
      const rawTime = visibleCandles[candleIdx]?.time;
      const timeVal = typeof rawTime === 'number'
        ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : String(rawTime || `Bar #${candleIdx + 1}`);

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
      viewBox={`0 0 ${chartSvgWidth} ${svgHeight}`}
      className="w-full h-full overflow-visible select-none cursor-crosshair block"
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

        {/* Glow Filters for Explosive TikTok BUY UP / BUY DOWN AI Indicator */}
        <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-purple" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Plot Background */}
      <rect x={marginLeft} y={marginTop} width={plotWidth} height={chartHeight} fill="#080414" />

      {/* VIXY Technical Grid System (Horizontal & Vertical Lines) */}
      <g opacity="0.6">
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, idx) => {
          const gridY = marginTop + chartHeight * pct;
          return (
            <line
              key={`h-grid-${idx}`}
              x1={marginLeft}
              y1={gridY}
              x2={marginLeft + plotWidth}
              y2={gridY}
              stroke="#1a1236"
              strokeWidth="0.75"
            />
          );
        })}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, idx) => {
          const gridX = marginLeft + plotWidth * pct;
          return (
            <line
              key={`v-grid-${idx}`}
              x1={gridX}
              y1={marginTop}
              x2={gridX}
              y2={marginTop + chartHeight}
              stroke="#160f2e"
              strokeWidth="0.75"
            />
          );
        })}
      </g>

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
            fontFamily="monospace"
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
            fontFamily="monospace"
          >
            RESISTANCE ${currentResistance.toFixed(1)}
          </text>
        </g>
      )}

      {/* VIXY AI Projection Trajectory Curve */}
      {visibleCandles.length > 0 && (
        <g>
          {(() => {
            const isBullish = activeSignal.direction === 'YES';
            const lastCandleX = x(visibleCandles.length - 1);
            const lastCandleY = y(latestClose);
            const targetY = y(activeSignal.targetPrice || (isBullish ? latestClose + 120 : latestClose - 120));
            const endX = marginLeft + plotWidth;
            const midX = lastCandleX + (endX - lastCandleX) * 0.5;
            const projPathD = `M ${lastCandleX} ${lastCandleY} C ${midX} ${lastCandleY}, ${midX} ${targetY}, ${endX} ${targetY}`;
            const projColor = isBullish ? '#10b981' : '#f43f5e';

            return (
              <g>
                {/* Glowing Backdrop Aura Path */}
                <path
                  d={projPathD}
                  fill="none"
                  stroke={projColor}
                  strokeWidth="5"
                  strokeOpacity="0.25"
                  filter={isBullish ? 'url(#glow-green)' : 'url(#glow-red)'}
                />
                {/* Dashed Animated Projection Line */}
                <path
                  d={projPathD}
                  fill="none"
                  stroke={projColor}
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                  className="animate-pulse"
                />
                {/* Projection Label Capsule */}
                <g transform={`translate(${(lastCandleX + endX) / 2 - 40}, ${(lastCandleY + targetY) / 2 - 12})`}>
                  <rect
                    width="80"
                    height="16"
                    rx="8"
                    fill="#0a041c"
                    stroke={projColor}
                    strokeWidth="1"
                    className="shadow-lg"
                  />
                  <text
                    x="40"
                    y="11"
                    fill={projColor}
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono tracking-wider"
                  >
                    AI PROJECTION ➔
                  </text>
                </g>
              </g>
            );
          })()}
        </g>
      )}

      {/* VIXY Target Band - Neon Glowing Institutional Banner */}
      {activeSignal.targetPrice && (
        <g>
          {(() => {
            const isBullish = activeSignal.direction === 'YES';
            return (
              <g>
                {/* Outer Glowing Aura Backdrop Band */}
                <line
                  x1={marginLeft}
                  y1={y(activeSignal.targetPrice)}
                  x2={marginLeft + plotWidth}
                  y2={y(activeSignal.targetPrice)}
                  stroke={isBullish ? '#10b981' : '#f43f5e'}
                  strokeWidth="8"
                  strokeOpacity="0.2"
                  filter={isBullish ? 'url(#glow-green)' : 'url(#glow-red)'}
                />
                {/* Core Solid Dashed Line */}
                <line
                  x1={marginLeft}
                  y1={y(activeSignal.targetPrice)}
                  x2={marginLeft + plotWidth}
                  y2={y(activeSignal.targetPrice)}
                  stroke={isBullish ? '#34d399' : '#fb7185'}
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                {/* Target Strike Badge Tag on Right Y-Axis */}
                <rect
                  x={marginLeft + plotWidth + 4}
                  y={y(activeSignal.targetPrice) - 14}
                  width="95"
                  height="28"
                  rx="6"
                  fill="#090317"
                  stroke={isBullish ? '#10b981' : '#f43f5e'}
                  strokeWidth="1.5"
                />
                <text
                  x={marginLeft + plotWidth + 10}
                  y={y(activeSignal.targetPrice) - 2}
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="900"
                  className="font-mono tracking-wider"
                >
                  TARGET ${Math.round(activeSignal.targetPrice).toLocaleString()}
                </text>
                <text
                  x={marginLeft + plotWidth + 10}
                  y={y(activeSignal.targetPrice) + 9}
                  fill={isBullish ? '#34d399' : '#fb7185'}
                  fontSize="8"
                  fontWeight="bold"
                  className="font-mono"
                >
                  {isBullish ? '▲ STRIKE (+0.42%)' : '▼ STRIKE (-0.38%)'}
                </text>
              </g>
            );
          })()}
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

            {/* TikTok Style AI Indicator Floating Badges (BUY UP / BUY DOWN) */}
            {showTikTokAiOverlay && (hasSignal || i % 3 === 0 || i === visibleCandles.length - 1) && (
              <g className="transition-all duration-300">
                {isBull ? (
                  <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); if (audioEnabled) playBuyUpSound(); }}>
                    <rect
                      x={cx - 28}
                      y={y(c.low) + 10}
                      width="56"
                      height="16"
                      rx="8"
                      fill="#042f2e"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      filter="url(#glow-green)"
                    />
                    <text
                      x={cx}
                      y={y(c.low) + 21}
                      fill="#34d399"
                      fontSize="8.5"
                      fontWeight="900"
                      textAnchor="middle"
                      className="font-mono tracking-wider pointer-events-none"
                    >
                      BUY UP ▲
                    </text>
                  </g>
                ) : (
                  <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); if (audioEnabled) playBuyDownSound(); }}>
                    <rect
                      x={cx - 34}
                      y={y(c.high) - 24}
                      width="68"
                      height="16"
                      rx="8"
                      fill="#4c0519"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      filter="url(#glow-red)"
                    />
                    <text
                      x={cx}
                      y={y(c.high) - 13}
                      fill="#fb7185"
                      fontSize="8.5"
                      fontWeight="900"
                      textAnchor="middle"
                      className="font-mono tracking-wider pointer-events-none"
                    >
                      BUY DOWN ▼
                    </text>
                  </g>
                )}
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

      {/* Crosshair Overlay with AI Delta Tooltip */}
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
            opacity="0.8"
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
            opacity="0.8"
          />
          {/* Price Capsule on Right Axis */}
          <rect
            x={marginLeft + plotWidth + 4}
            y={crosshairPos.y - 10}
            width="80"
            height="20"
            rx="5"
            fill="#3b0764"
            stroke="#c084fc"
            strokeWidth="1.5"
            className="shadow-lg"
          />
          <text
            x={marginLeft + plotWidth + 10}
            y={crosshairPos.y + 3}
            fill="#ffffff"
            fontSize="9"
            fontWeight="bold"
            className="font-mono tracking-wider"
          >
            ${crosshairPos.price.toFixed(1)}
          </text>

          {/* Floating AI Delta Tooltip near Cursor */}
          {(() => {
            const priceDelta = crosshairPos.price - latestClose;
            const pctDelta = (priceDelta / latestClose) * 100;
            const isPos = priceDelta >= 0;
            return (
              <g transform={`translate(${Math.min(marginLeft + plotWidth - 90, crosshairPos.x + 12)}, ${Math.max(marginTop + 10, crosshairPos.y - 25)})`}>
                <rect
                  width="85"
                  height="18"
                  rx="4"
                  fill="#080214"
                  stroke={isPos ? '#10b981' : '#f43f5e'}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x="42"
                  y="12"
                  fill={isPos ? '#34d399' : '#fb7185'}
                  fontSize="8"
                  fontWeight="black"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {isPos ? '+' : ''}${priceDelta.toFixed(1)} ({isPos ? '+' : ''}{pctDelta.toFixed(2)}%)
                </text>
              </g>
            );
          })()}

          {/* Timestamp Capsule at Bottom */}
          <rect
            x={crosshairPos.x - 32}
            y={marginTop + chartHeight + (showRSI ? volumeHeight + rsiHeight + 25 : volumeHeight + 15)}
            width="64"
            height="16"
            rx="4"
            fill="#3b0764"
            stroke="#c084fc"
            strokeWidth="1"
          />
          <text
            x={crosshairPos.x}
            y={marginTop + chartHeight + (showRSI ? volumeHeight + rsiHeight + 36 : volumeHeight + 26)}
            fill="#ffffff"
            fontSize="8"
            fontWeight="bold"
            textAnchor="middle"
            className="font-mono"
          >
            {crosshairPos.timeLabel}
          </text>
        </g>
      )}

      {/* Right Y-Axis Price Scale Labels */}
      <g className="font-mono">
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const val = yMax - (yMax - yMin) * pct;
          const labelY = marginTop + chartHeight * pct;
          return (
            <text
              key={i}
              x={marginLeft + plotWidth + 8}
              y={labelY + 3}
              fill="#8b84a8"
              fontSize="8.5"
              fontWeight="bold"
              className="font-mono"
            >
              ${Math.round(val).toLocaleString()}
            </text>
          );
        })}
      </g>

      {/* Bottom X-Axis Time Ticks & Time-State Badges */}
      <g className="font-mono">
        {(() => {
          if (visibleCandles.length === 0) return null;
          const ticksCount = 4;
          return Array.from({ length: ticksCount }).map((_, idx) => {
            const candleIdx = Math.min(
              visibleCandles.length - 1,
              Math.floor((idx / (ticksCount - 1)) * (visibleCandles.length - 1))
            );
            const c = visibleCandles[candleIdx];
            if (!c) return null;
            const pct = (candleIdx + 0.5) / visibleCandles.length;
            const tickX = marginLeft + plotWidth * pct;
            const tickY = marginTop + chartHeight + 12;
            const timeFormatted = typeof c.time === 'number'
              ? new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : String(c.time || '');
            const badge = idx === ticksCount - 1 ? 'LIVE' : idx === 0 ? 'OPEN' : `+${idx * 15}M`;

            return (
              <g key={idx}>
                <text x={tickX} y={tickY} fill="#8b84a8" fontSize="8" textAnchor="middle" fontWeight="bold">
                  {timeFormatted}
                </text>
                <rect
                  x={tickX - 16}
                  y={tickY + 3}
                  width="32"
                  height="10"
                  rx="3"
                  fill={badge === 'LIVE' ? '#064e3b' : '#0d0a1a'}
                  stroke={badge === 'LIVE' ? '#10b981' : '#2a2340'}
                  strokeWidth="0.75"
                />
                <text
                  x={tickX}
                  y={tickY + 10}
                  fill={badge === 'LIVE' ? '#34d399' : '#8b84a8'}
                  fontSize="6.5"
                  fontWeight="extrabold"
                  textAnchor="middle"
                >
                  {badge}
                </text>
              </g>
            );
          });
        })()}
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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#080316] rounded-2xl border border-purple-800/60 font-mono text-xs mb-3 shadow-xl">
      {/* Title & Status Chips */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-white font-extrabold uppercase text-xs tracking-wider flex items-center gap-1.5 bg-[#12072a] px-3 py-1 rounded-xl border border-purple-700/60">
          <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          BTC {timeframe} • VIXY NEURAL RIBBON
        </span>

        {/* Live Status Chip */}
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-black text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          LIVE
        </span>

        {/* Venue Chip */}
        <span className="px-2 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-[10px] font-bold text-purple-300">
          {venue.toUpperCase()}
        </span>

        {/* AI Confidence Chip */}
        <span className="px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-extrabold text-cyan-300">
          AI CONF {(activeSignal.confidence * 100).toFixed(0)}%
        </span>

        {/* Edge Chip */}
        <span className="hidden sm:inline-block px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-400">
          EDGE +12.2%
        </span>
      </div>

      {/* Spot Price & Controls */}
      <div className="flex items-center gap-3">
        <div className="bg-[#0e0622] px-3 py-1 rounded-xl border border-purple-800/50 flex items-center gap-2">
          <span className="text-[#8b84a8] text-[10px]">SPOT:</span>
          <span className="font-extrabold text-white text-xs">${latestClose.toFixed(1)}</span>
          <span
            className={`text-[10px] font-bold ${
              lastPriceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {lastPriceChange >= 0 ? '+' : ''}
            {lastPriceChangePct.toFixed(2)}%
          </span>
        </div>

        {/* Timeframe & Zoom buttons */}
        <div className="flex items-center gap-1">
          {(['15M', '1H'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange && onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                timeframe === tf
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'bg-[#0d0a1a] text-[#8b84a8] border-[#2a2340] hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
          <button
            onClick={zoomIn}
            title="Zoom In"
            className="p-1 rounded bg-[#0d0a1a] text-[#8b84a8] hover:text-white border border-[#2a2340]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={zoomOut}
            title="Zoom Out"
            className="p-1 rounded bg-[#0d0a1a] text-[#8b84a8] hover:text-white border border-[#2a2340]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
            className="p-1 rounded bg-[#0d0a1a] text-purple-300 hover:text-white border border-purple-500/30"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
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
        onClick={() => setShowTikTokAiOverlay(!showTikTokAiOverlay)}
        className={`px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 font-extrabold ${
          showTikTokAiOverlay
            ? 'bg-gradient-to-r from-emerald-950 via-purple-950 to-rose-950 text-emerald-300 border-emerald-400 shadow-lg shadow-emerald-500/20'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
      >
        <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>⚡ TIKTOK AI PILOT (BUY UP / DOWN)</span>
      </button>

      <button
        onClick={() => setAudioEnabled(!audioEnabled)}
        className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
          audioEnabled
            ? 'bg-purple-900/40 text-purple-200 border-purple-500/40 font-bold'
            : 'bg-[#150f28] text-slate-500 border-[#2a2340]'
        }`}
        title="Toggle TikTok Cyber Audio Chimes on Buy Up/Down Signals"
      >
        {audioEnabled ? <Volume2 className="w-3 h-3 text-purple-300" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
        <span>CHIMES</span>
      </button>

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
      className="w-full h-[520px] md:h-[650px] lg:h-[750px] flex flex-col bg-[#0d0a1a] rounded-2xl border border-[#2a2340] p-4 text-[#e5e0f5] font-mono shadow-2xl"
    >
      {controlsBar}
      {candleHudHeader}
      {indicatorToolbar}

      <div className={`flex-1 grid gap-4 overflow-hidden ${isWide ? 'grid-cols-[1fr_260px]' : 'grid-cols-1'}`}>
        <div className="w-full h-full overflow-hidden flex justify-center items-center">{mainSvgContent}</div>
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
