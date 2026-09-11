import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Zap,
  Volume2,
  VolumeX,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart2,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  Cpu,
} from 'lucide-react';
import { playBuyUpSound, playBuyDownSound } from '../utils/audio';
import { headline } from '../lib/engineSemantics';

/**
 * Scalping desk chart.
 *
 * Everything drawn here is observed:
 *   - candles are real 1-minute exchange candles from /api/crypto/klines
 *     (Coinbase, with the server's Binance fallback), refreshed every 15s;
 *   - EMA, Bollinger bands and the breakout marker are computed from those
 *     same candles, and the breakout marker is labelled as a fixed rule;
 *   - the probability, strike, Kalshi price, conviction trail and lock gates
 *     come from the live canonical 15-minute engine payload, which covers BTC
 *     only and is shown only while that feed is LIVE.
 *
 * VIXY has no 15-second model and no model for other assets. When a source is
 * missing, the chart says so instead of drawing a stand-in.
 */

interface ScalpDecisionChartProps {
  asset?: string;
  desk?: string;
  title?: string;
  /** Live canonical 15M decision payload. */
  engineDecision?: any;
  engineFeedHealth?: string | null;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type FeedStatus = 'LOADING' | 'LIVE' | 'UNAVAILABLE';

const CANDLE_POLL_MS = 15000;

// EMA calculator
function calcEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] || 0;
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

// Bollinger Bands calculator
function calcBollingerBands(closes: number[], period = 14, multiplier = 2) {
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

function parseCandles(data: unknown): Candle[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((d: any) => ({
      time: Number(d?.time),
      open: Number(d?.open),
      high: Number(d?.high),
      low: Number(d?.low),
      close: Number(d?.close),
      volume: Number(d?.volume),
    }))
    .filter(
      (c) =>
        [c.time, c.open, c.high, c.low, c.close, c.volume].every((v) => Number.isFinite(v)) &&
        c.low > 0 &&
        c.high >= c.low
    )
    .sort((a, b) => a.time - b.time);
}

const fmtPrice = (v: number | null | undefined): string => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return '—';
  if (v >= 1000) return `$${v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  if (v >= 10) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
};

const fmtNum = (v: number): string => (v >= 1000 ? v.toFixed(1) : v >= 10 ? v.toFixed(2) : v.toFixed(4));
const fmtVol = (v: number): string => (v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(3));
const fmtClock = (ms: number): string => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtCycleSec = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const ScalpDecisionChart: React.FC<ScalpDecisionChartProps> = ({
  asset = 'BTC',
  title,
  engineDecision,
  engineFeedHealth,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('LOADING');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Indicator Toggles
  const [showEma, setShowEma] = useState<boolean>(true);
  const [showBands, setShowBands] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  const [hoverData, setHoverData] = useState<{ x: number; y: number } | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN' | null>(null);

  // 1. Real 1-minute candles, polled. A failed poll keeps the last real
  // candles on screen and flips the badge; it never draws a stand-in.
  useEffect(() => {
    let alive = true;
    setCandles([]);
    setFeedStatus('LOADING');
    setFetchedAt(null);
    const sym = encodeURIComponent(asset);

    const load = async () => {
      try {
        const res = await fetch(`/api/crypto/klines?symbol=${sym}&interval=1m&_t=${Date.now()}`, { cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (!alive) return;
        const parsed = parseCandles(data);
        if (parsed.length >= 2) {
          setCandles(parsed);
          setFeedStatus('LIVE');
          setFetchedAt(Date.now());
        } else {
          setFeedStatus('UNAVAILABLE');
        }
      } catch {
        if (alive) setFeedStatus('UNAVAILABLE');
      }
    };

    load();
    const timer = setInterval(load, CANDLE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [asset]);

  // 2. Engine read. The canonical engine is BTC-only and is shown only while
  // its feed is LIVE.
  const isBtc = asset.toUpperCase() === 'BTC';
  const engineLive = isBtc && engineFeedHealth === 'LIVE' && Boolean(engineDecision);
  const head = engineLive ? headline(engineDecision) : null;
  const calibrated = engineLive ? engineDecision?.calibrated ?? null : null;
  const side: 'UP' | 'DOWN' | null =
    calibrated?.currentSide === 'UP' || calibrated?.currentSide === 'DOWN' ? calibrated.currentSide : null;
  // P(settle UP) in whole percent. Only a calibrated P(win) with a known side
  // becomes a probability; an engine score never does.
  const pUp: number | null =
    head?.kind === 'PWIN' && typeof head.value === 'number' && side ? (side === 'UP' ? head.value : 100 - head.value) : null;
  const market =
    engineLive && engineDecision?.marketRead?.real === true && typeof engineDecision?.marketRead?.kalshiImpliedYes === 'number'
      ? (engineDecision.marketRead as { kalshiImpliedYes: number; ageMs: number | null })
      : null;
  const yesCents = market ? Math.round(market.kalshiImpliedYes * 100) : null;
  const noCents = yesCents !== null ? 100 - yesCents : null;
  const edgePts: number | null = typeof calibrated?.edgeVsMarketPct === 'number' ? calibrated.edgeVsMarketPct : null;
  const strike: number | null =
    engineLive && Number(engineDecision?.openStrike) > 0 ? Number(engineDecision?.openStrike) : null;
  const engineSpot: number | null =
    engineLive && Number(engineDecision?.currentSpot) > 0 ? Number(engineDecision?.currentSpot) : null;
  const timeLeft: number | null =
    engineLive && Number.isFinite(Number(engineDecision?.timeRemainingSec)) ? Math.max(0, Number(engineDecision?.timeRemainingSec)) : null;
  const engineDirection: 'UP' | 'DOWN' | null =
    engineLive && (engineDecision?.direction === 'UP' || engineDecision?.direction === 'DOWN') ? engineDecision.direction : null;
  const bias: 'UP' | 'DOWN' | null = side ?? engineDirection;
  const lastCandle = candles.length ? candles[candles.length - 1] : null;

  // Conviction trail, restated as P(settle UP) so a side flip reads correctly.
  const trail = useMemo(() => {
    if (!engineLive) return [] as Array<{ t: number; pUp: number }>;
    const raw = Array.isArray(engineDecision?.convictionTrail) ? engineDecision.convictionTrail : [];
    return raw
      .filter((pt: any) => pt && typeof pt.p === 'number' && Number.isFinite(Number(pt.t)) && (pt.side === 'UP' || pt.side === 'DOWN'))
      .map((pt: any) => ({ t: Number(pt.t), pUp: Math.round((pt.side === 'UP' ? pt.p : 1 - pt.p) * 100) }));
  }, [engineLive, engineDecision]);

  const trailNodes = useMemo(() => {
    if (trail.length <= 6) return trail;
    return Array.from({ length: 6 }, (_, k) => trail[Math.round((k * (trail.length - 1)) / 5)]);
  }, [trail]);

  const trailChange: number | null = trail.length >= 2 ? trail[trail.length - 1].pUp - trail[0].pUp : null;

  const gateChecks: Array<{ id: string; label: string; pass: boolean; current: string | number; required: string }> =
    engineLive && Array.isArray(engineDecision?.lockGate?.checks)
      ? engineDecision.lockGate.checks.filter((c: any) => c && c.gating !== false && c.id !== 'CALIBRATED_P')
      : [];
  const gatesPassing = gateChecks.filter((c) => c.pass).length;
  const lockEligible = Boolean(engineDecision?.lockEligibility?.eligible ?? engineDecision?.lockGate?.eligible ?? false);

  // Audio trigger
  const handleActionSound = (direction: 'UP' | 'DOWN') => {
    setSelectedDirection(direction);
    if (audioEnabled) {
      if (direction === 'UP') playBuyUpSound();
      else playBuyDownSound();
    }
  };

  // Mouse hover listener for crosshair
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setHoverData({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverData(null);
  }, []);

  // 3. Canvas rendering loop
  useEffect(() => {
    let animId = 0;

    const render = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;

      if (cssWidth === 0 || cssHeight === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = cssWidth;
      const height = cssHeight;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#060312');
      bgGrad.addColorStop(0.5, '#09041a');
      bgGrad.addColorStop(1, '#04020b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient aura follows the engine's live side; neutral when there is none.
      const auraGrad = ctx.createRadialGradient(width * 0.55, height * 0.42, 20, width * 0.55, height * 0.42, width * 0.55);
      const auraRgb = bias === 'UP' ? '0, 255, 136' : bias === 'DOWN' ? '255, 59, 48' : '168, 85, 247';
      auraGrad.addColorStop(0, `rgba(${auraRgb}, 0.08)`);
      auraGrad.addColorStop(0.5, `rgba(${auraRgb}, 0.035)`);
      auraGrad.addColorStop(1, 'rgba(6, 3, 18, 0)');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, width, height);

      const bottomVolumeHeight = showVolume ? 48 : 22;
      const timeAxisHeight = 18;
      const plotHeight = height - bottomVolumeHeight - timeAxisHeight - 16;
      const rightMargin = width < 640 ? 68 : 88;
      const chartWidth = Math.max(100, width - rightMargin);

      if (candles.length < 2) {
        ctx.fillStyle = 'rgba(196, 181, 253, 0.75)';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const msg =
          feedStatus === 'LOADING'
            ? `Loading ${asset} 1-minute candles…`
            : `${asset} candle feed unavailable. Nothing is drawn in its place.`;
        ctx.fillText(msg, width / 2, height / 2);
        ctx.textAlign = 'left';
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // Price range
      let rawMinP = Math.min(...candles.map((c) => c.low));
      let rawMaxP = Math.max(...candles.map((c) => c.high));
      const span0 = rawMaxP - rawMinP || rawMaxP * 0.0005;
      if (strike !== null && Math.abs(strike - (rawMinP + rawMaxP) / 2) < span0 * 1.8) {
        rawMinP = Math.min(rawMinP, strike);
        rawMaxP = Math.max(rawMaxP, strike);
      }
      let priceSpan = rawMaxP - rawMinP;
      const minSpan = ((rawMaxP + rawMinP) / 2) * 0.0004;
      if (priceSpan < minSpan) {
        const mid = (rawMaxP + rawMinP) / 2;
        rawMinP = mid - minSpan / 2;
        rawMaxP = mid + minSpan / 2;
        priceSpan = minSpan;
      }
      const pad = priceSpan * 0.12;
      const minP = rawMinP - pad;
      const maxP = rawMaxP + pad;
      const totalRange = maxP - minP || 1;
      const getY = (price: number) => 16 + plotHeight - ((price - minP) / totalRange) * plotHeight;

      // Grid and price scale
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
      ctx.lineWidth = 1;
      const gridRows = 6;
      for (let i = 0; i <= gridRows; i++) {
        const y = 16 + (plotHeight / gridRows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.fillText(fmtPrice(maxP - (totalRange / gridRows) * i), chartWidth + 6, y + 3.5);
      }

      const candleAreaWidth = Math.max(80, chartWidth - 6);
      const candleWidth = candleAreaWidth / candles.length;

      // Indicators, computed from the candles on screen
      const closePrices = candles.map((c) => c.close);
      const ema9 = calcEma(closePrices, 9);
      const ema21 = calcEma(closePrices, 21);
      const bb = calcBollingerBands(closePrices, 14, 2);

      if (showBands && bb.upper.length > 0) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < candles.length; i++) {
          const u = bb.upper[i];
          if (u !== null) {
            const x = i * candleWidth + candleWidth / 2;
            if (!started) {
              ctx.moveTo(x, getY(u));
              started = true;
            } else {
              ctx.lineTo(x, getY(u));
            }
          }
        }
        for (let i = candles.length - 1; i >= 0; i--) {
          const l = bb.lower[i];
          if (l !== null) ctx.lineTo(i * candleWidth + candleWidth / 2, getY(l));
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(147, 51, 234, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showEma && ema21.length > 2) {
        ctx.beginPath();
        candles.forEach((_, i) => {
          const x = i * candleWidth + candleWidth / 2;
          if (i === 0) ctx.moveTo(x, getY(ema21[i]));
          else ctx.lineTo(x, getY(ema21[i]));
        });
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (showEma && ema9.length > 2) {
        // EMA 9 is green above EMA 21 and red below it.
        const emaBull = ema9[ema9.length - 1] >= ema21[ema21.length - 1];
        ctx.beginPath();
        candles.forEach((_, i) => {
          const x = i * candleWidth + candleWidth / 2;
          if (i === 0) ctx.moveTo(x, getY(ema9[i]));
          else ctx.lineTo(x, getY(ema9[i]));
        });
        ctx.strokeStyle = emaBull ? 'rgba(0, 255, 136, 0.85)' : 'rgba(255, 59, 48, 0.85)';
        ctx.shadowColor = emaBull ? '#00FF88' : '#FF3B30';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Candlesticks and the breakout rule marker
      let lastBreakIndex = -10;
      candles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);
        const isUp = c.close >= c.open;
        const candleColor = isUp ? '#00FF88' : '#FF3B30';

        ctx.strokeStyle = candleColor;
        ctx.lineWidth = Math.max(1.2, Math.min(2.2, candleWidth * 0.15));
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2.5, Math.abs(openY - closeY));
        const bodyW = Math.max(3.5, Math.min(22, candleWidth * 0.68));
        const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bodyHeight);
        if (isUp) {
          bodyGrad.addColorStop(0, '#00FF88');
          bodyGrad.addColorStop(1, '#059669');
        } else {
          bodyGrad.addColorStop(0, '#FF3B30');
          bodyGrad.addColorStop(1, '#be123c');
        }
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(x - bodyW / 2, bodyTop, bodyW, bodyHeight, Math.min(2, bodyW / 3, bodyHeight / 2));
        ctx.fill();
        ctx.strokeStyle = isUp ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 59, 48, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Fixed rule: a close above the prior six highs. Not a model call.
        const isBreakout =
          isUp &&
          i >= 8 &&
          i - lastBreakIndex >= 9 &&
          c.close > Math.max(...candles.slice(i - 6, i).map((item) => item.high)) &&
          i < candles.length - 2;

        if (isBreakout) {
          lastBreakIndex = i;
          ctx.fillStyle = '#00FF88';
          ctx.beginPath();
          ctx.arc(x, lowY + 5, 2.5, 0, Math.PI * 2);
          ctx.fill();

          const badgeW = 44;
          const badgeH = 15;
          ctx.fillStyle = 'rgba(6, 35, 24, 0.95)';
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x - badgeW / 2, lowY + 10, badgeW, badgeH, 3.5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#00FF88';
          ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('▲ BREAK', x, lowY + 20.5);
          ctx.textAlign = 'left';
        }
      });

      // Kalshi open strike from the engine
      if (strike !== null) {
        const strikeY = getY(strike);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, strikeY);
        ctx.lineTo(chartWidth, strikeY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#221505';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(chartWidth + 3, strikeY - 9.5, rightMargin - 4, 19, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
        ctx.fillText(fmtPrice(strike), chartWidth + 5.5, strikeY + 3);
      }

      // Last price node
      const last = candles[candles.length - 1];
      const lastUp = last.close >= last.open;
      const lastX = (candles.length - 1) * candleWidth + candleWidth / 2;
      const lastY = getY(last.close);

      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, lastY);
      ctx.lineTo(chartWidth, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      const pulseRadius = 7 + Math.sin(Date.now() / 250) * 2;
      ctx.beginPath();
      ctx.arc(lastX, lastY, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = lastUp ? 'rgba(0, 255, 136, 0.35)' : 'rgba(255, 59, 48, 0.35)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.fillStyle = lastUp ? '#042817' : '#300810';
      ctx.strokeStyle = lastUp ? '#00FF88' : '#FF3B30';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(chartWidth + 3, lastY - 9.5, rightMargin - 4, 19, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = lastUp ? '#00FF88' : '#FF3B30';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.fillText(fmtPrice(last.close), chartWidth + 5.5, lastY + 3.5);

      // Volume, coloured by candle direction. The candle feed has no aggressor split.
      if (showVolume) {
        const vTop = height - timeAxisHeight - bottomVolumeHeight;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, vTop);
        ctx.lineTo(chartWidth, vTop);
        ctx.stroke();

        const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;
        const vMaxHeight = bottomVolumeHeight - 6;
        candles.forEach((c, i) => {
          const x = i * candleWidth + candleWidth / 2;
          const vHeight = Math.max(2, (c.volume / maxVol) * vMaxHeight);
          const bodyW = Math.max(2.5, candleWidth * 0.65);
          ctx.fillStyle = c.close >= c.open ? 'rgba(0, 255, 136, 0.45)' : 'rgba(255, 59, 48, 0.4)';
          ctx.fillRect(x - bodyW / 2, height - timeAxisHeight - vHeight - 2, bodyW, vHeight);
        });

        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '600 7.5px "JetBrains Mono", monospace';
        ctx.fillText('VOL (1M)', chartWidth + 6, height - timeAxisHeight - 8);
      }

      // Time axis from the candles' own timestamps
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const ticks = Math.min(6, candles.length);
      for (let k = 0; k < ticks; k++) {
        const idx = Math.round((k * (candles.length - 1)) / (ticks - 1));
        const x = idx * candleWidth + candleWidth / 2;
        ctx.fillText(fmtClock(candles[idx].time), Math.min(chartWidth - 18, Math.max(18, x)), height - 4);
      }
      ctx.textAlign = 'left';

      // Hover crosshair
      if (hoverData && hoverData.x > 0 && hoverData.x < chartWidth && hoverData.y > 0 && hoverData.y < height) {
        const hoverIdx = Math.max(0, Math.min(candles.length - 1, Math.floor(hoverData.x / candleWidth)));
        const c = candles[hoverIdx];

        ctx.strokeStyle = 'rgba(216, 180, 254, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hoverData.x, 0);
        ctx.lineTo(hoverData.x, height - timeAxisHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, hoverData.y);
        ctx.lineTo(chartWidth, hoverData.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const hoveredPrice = maxP - ((hoverData.y - 16) / plotHeight) * totalRange;
        ctx.fillStyle = '#4c1d95';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(chartWidth + 3, hoverData.y - 9, rightMargin - 4, 18, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillText(fmtPrice(hoveredPrice), chartWidth + 5.5, hoverData.y + 3.5);

        if (c) {
          ctx.font = '600 8.5px "JetBrains Mono", monospace';
          const hudText = `${fmtClock(c.time)}  O ${fmtNum(c.open)}  H ${fmtNum(c.high)}  L ${fmtNum(c.low)}  C ${fmtNum(c.close)}  V ${fmtVol(c.volume)}`;
          const hudW = Math.min(chartWidth - 16, ctx.measureText(hudText).width + 16);
          ctx.fillStyle = 'rgba(10, 5, 25, 0.92)';
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(8, 44, hudW, 22, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = c.close >= c.open ? '#a7f3d0' : '#fecdd3';
          ctx.fillText(hudText, 16, 58);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [candles, feedStatus, strike, bias, showEma, showBands, showVolume, hoverData, asset]);

  // Sparkline path for the conviction trail (P(settle UP), 0-100 scale)
  const { lineD, areaD } = useMemo(() => {
    if (trail.length < 2) return { lineD: '', areaD: '' };
    const points = trail.map((item, idx) => {
      const x = (idx / (trail.length - 1)) * 100;
      const y = 35 - (item.pUp / 100) * 30;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const linePath = `M ${points.join(' L ')}`;
    return { lineD: linePath, areaD: `${linePath} L 100,38 L 0,38 Z` };
  }, [trail]);

  const feedBadge =
    feedStatus === 'LIVE'
      ? { text: '● LIVE · 1M CANDLES', cls: 'bg-emerald-500/20 border-emerald-400/40 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)]' }
      : feedStatus === 'LOADING'
      ? { text: '○ CONNECTING', cls: 'bg-purple-500/15 border-purple-400/40 text-purple-200' }
      : { text: '○ FEED UNAVAILABLE', cls: 'bg-rose-500/15 border-rose-400/40 text-rose-300' };

  const feedHealthWord = engineFeedHealth ? engineFeedHealth.toLowerCase().replace(/_/g, ' ') : 'not connected';

  const renderCapsule = (dir: 'UP' | 'DOWN') => {
    const isUpCard = dir === 'UP';
    const pSide = pUp === null ? null : isUpCard ? pUp : 100 - pUp;
    const cents = isUpCard ? yesCents : noCents;
    const isEngineSide = side === dir;
    const selected = selectedDirection === dir;
    const accent = isUpCard
      ? { text: 'text-[#00FF88]', soft: 'text-emerald-300', ring: 'border-emerald-400 shadow-[0_0_35px_rgba(0,255,136,0.35)]', rest: 'border-emerald-500/50', bg: 'from-[#081F15]/95', chip: 'bg-emerald-500/20 border-emerald-400/40' }
      : { text: 'text-[#FF3B30]', soft: 'text-rose-300', ring: 'border-rose-400 shadow-[0_0_35px_rgba(255,59,48,0.35)]', rest: 'border-rose-500/50', bg: 'from-[#240A13]/95', chip: 'bg-rose-500/20 border-rose-400/40' };

    return (
      <button
        onClick={() => handleActionSound(dir)}
        className={`p-5 rounded-2xl text-left border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
          selected
            ? `bg-gradient-to-br ${accent.bg} via-[#0D0A20]/95 to-[#06030D]/95 ${accent.ring} scale-[1.01]`
            : isEngineSide
            ? `bg-[#0a0518] ${accent.rest}`
            : 'bg-[#0a0518] border-purple-900/40 hover:border-purple-500/50'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl ${accent.chip} ${accent.text} border flex items-center justify-center font-black text-lg`}>
              {isUpCard ? '▲' : '▼'}
            </div>
            <div>
              <span className={`text-xs font-black ${accent.soft} tracking-wider block uppercase`}>{dir} SIDE</span>
              <span className="text-[9px] text-gray-400 font-sans">
                {isEngineSide ? 'Engine side · spot is here now' : side ? 'Other side' : 'No side yet'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-2xl sm:text-3xl font-black ${accent.text} font-mono block leading-none`}>
              {pSide !== null ? `${pSide}%` : '—'}
            </span>
            <span className={`text-[9px] ${accent.soft} font-bold`}>P(SETTLE {dir})</span>
          </div>
        </div>

        <div className="space-y-1.5 text-[10px] bg-[#0a0518] p-3 rounded-2xl border border-purple-900/30">
          <div className="flex justify-between">
            <span className="text-gray-400">KALSHI {isUpCard ? 'YES' : 'NO'} PRICE:</span>
            <span className="text-white font-bold">{cents !== null ? `${cents}¢` : 'no fresh read'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">EDGE VS MARKET:</span>
            <span className={`font-bold ${isEngineSide && edgePts !== null ? (edgePts >= 0 ? 'text-[#00FF88]' : 'text-amber-400') : 'text-gray-500'}`}>
              {isEngineSide && edgePts !== null ? `${edgePts >= 0 ? '+' : '−'}${Math.abs(edgePts)} pts` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">SPOT VS STRIKE:</span>
            <span className="text-cyan-300 font-bold">
              {engineSpot !== null && strike !== null
                ? `${engineSpot >= strike ? '+' : '−'}${fmtPrice(Math.abs(engineSpot - strike))}`
                : '—'}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 font-mono text-gray-200 w-full min-w-0">
      {/* 1. HEADER */}
      <div className="bg-gradient-to-r from-[#14082e] via-[#0e0521] to-[#080214] border border-purple-500/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_35px_rgba(168,85,247,0.22)] relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/25 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Zap className={`w-5 h-5 text-purple-300 ${feedStatus === 'LIVE' ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-white tracking-wider font-sans uppercase">
                {title || `${asset} SCALP CHART`}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${feedBadge.cls}`}>
                {feedBadge.text}
              </span>
            </div>
            <p className="text-[10px] text-purple-300/80 font-sans mt-0.5">
              Real 1-minute candles, refreshed every 15 seconds{isBtc ? ', read beside the BTC 15-minute engine' : ''}.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 relative z-10 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0a0518]/90 border border-purple-500/40 text-[11px] flex items-center space-x-2 shadow-inner">
            <span className="text-purple-300 font-semibold">LAST 1M CLOSE:</span>
            <span className="font-black text-white font-mono text-xs sm:text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {fmtPrice(lastCandle?.close)}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1 bg-[#0a0518] p-1 rounded-xl border border-purple-900/40 text-[10px]">
            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer font-bold ${showEma ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Toggle EMA 9/21"
            >
              EMA
            </button>
            <button
              onClick={() => setShowBands(!showBands)}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer font-bold ${showBands ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Toggle Bollinger bands"
            >
              BB
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 rounded-xl transition-all cursor-pointer font-bold ${showVolume ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Toggle volume"
            >
              VOL
            </button>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-purple-950/80 border-purple-400/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
            title="Toggle audio feedback"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. CANDLESTICK CHART */}
      <div className="bg-[#0c0620]/95 border border-purple-500/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_35px_rgba(168,85,247,0.18)] space-y-3.5 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between text-xs border-b border-purple-900/40 pb-2.5 gap-2">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white text-xs tracking-wider uppercase font-mono">{asset}/USD 1-MINUTE CANDLES</span>
            <span className="text-[9px] text-purple-400 font-mono">
              • {fetchedAt ? `UPDATED ${new Date(fetchedAt).toLocaleTimeString()}` : 'WAITING FOR FEED'}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-mono flex-wrap">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
              <span className="text-emerald-300">UP CANDLE</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] shadow-[0_0_6px_#FF3B30]" />
              <span className="text-rose-300">DOWN CANDLE</span>
            </span>
            {strike !== null && (
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                <span className="text-amber-300">KALSHI STRIKE</span>
              </span>
            )}
          </div>
        </div>

        <div className="relative rounded-2xl bg-[#0a0518] border border-purple-500/30 overflow-hidden h-[440px] sm:h-[490px] lg:h-[530px] shadow-[inset_0_0_40px_rgba(0,0,0,0.85)] w-full">
          <div ref={containerRef} className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />

            <div className="absolute top-2.5 left-2.5 flex items-center space-x-2 bg-[#0c0620]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/40 text-[10px] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <Radio className={`w-3 h-3 ${engineLive ? 'text-[#00FF88] animate-pulse' : 'text-purple-400/60'}`} />
              {head && head.kind !== 'NONE' ? (
                <>
                  <span className="text-gray-300 font-bold">15M ENGINE · {head.label}:</span>
                  <span className="text-cyan-300 font-black">{head.kind === 'PWIN' ? `${head.value}%` : head.value}</span>
                </>
              ) : (
                <span className="text-gray-300 font-bold">{isBtc ? '15M ENGINE: NO LIVE READ' : `NO VIXY MODEL FOR ${asset}`}</span>
              )}
            </div>

            {strike !== null && timeLeft !== null && (
              <div className="absolute top-2.5 right-2.5 bg-[#0c0620]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 text-[10px] text-amber-200 font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                STRIKE <strong className="text-white">{fmtPrice(strike)}</strong> · {fmtCycleSec(timeLeft)} LEFT
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-purple-300/60 font-sans leading-relaxed">
          Candles come from Coinbase through the VIXY server, which falls back to Binance if Coinbase does not answer.
          ▲ BREAK marks a 1-minute close above the prior six highs. That is a fixed chart rule, not a model call.
          EMA and Bollinger bands are computed from these same candles.
        </p>
      </div>

      {/* 3. ENGINE READ */}
      <div className="bg-[#0c0620]/95 border border-purple-500/40 rounded-2xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] space-y-2.5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white tracking-wider uppercase text-xs sm:text-sm">15-MINUTE ENGINE READ</span>
          </div>
          <span className="text-[9.5px] text-purple-300/80 font-sans italic">
            VIXY's one model. It prices the current 15-minute Kalshi BTC window, not the next 15 seconds.
          </span>
        </div>

        {!isBtc ? (
          <p className="text-[11px] text-purple-200/80 font-sans">
            VIXY has no model for {asset}. The only model is the BTC 15-minute engine, so this desk shows {asset} market data without a probability.
          </p>
        ) : !engineLive ? (
          <p className="text-[11px] text-purple-200/80 font-sans">
            The 15-minute engine feed is {feedHealthWord}. No probability is shown until it is live again.
          </p>
        ) : pUp !== null && head ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-center my-1">
              <div className="bg-[#0a0518] py-2.5 px-3 rounded-2xl border border-emerald-500/50 shadow-[0_0_15px_rgba(0,255,136,0.15)] flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 flex items-center space-x-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>UP</span>
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#00FF88] font-mono drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">{pUp}%</span>
              </div>
              <div className="bg-[#0a0518] py-2.5 px-3 rounded-2xl border border-rose-500/50 shadow-[0_0_15px_rgba(255,59,48,0.15)] flex items-center justify-between">
                <span className="text-xs font-black text-rose-400 flex items-center space-x-1">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>DOWN</span>
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#FF3B30] font-mono drop-shadow-[0_0_10px_rgba(255,59,48,0.5)]">{100 - pUp}%</span>
              </div>
            </div>

            <div className="h-3.5 w-full bg-[#0a0518] rounded-full overflow-hidden p-0.5 border border-purple-500/40 flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-[#00FF88] rounded-l-full transition-all duration-300 shadow-[0_0_12px_rgba(0,255,136,0.8)]"
                style={{ width: `${pUp}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-[#FF3B30] rounded-r-full transition-all duration-300 shadow-[0_0_12px_rgba(255,59,48,0.8)]"
                style={{ width: `${100 - pUp}%` }}
              />
            </div>
            <p className="text-[10px] text-purple-300/70 font-sans">
              Spot is on the {side} side of the strike. Similar past cycles settled on that side {head.value}% of the time
              {head.n !== null ? `, across ${head.n} of them` : ''}. The other side is the complement.
            </p>
          </>
        ) : head?.kind === 'ENGINE_SCORE' ? (
          <p className="text-[11px] text-purple-200/80 font-sans">
            Engine score <strong className="text-white">{head.value}</strong>. This is not a probability.{' '}
            {calibrated?.reason ? `Calibrated P(win) is unavailable this tick (${calibrated.reason}).` : 'Calibrated P(win) is unavailable this tick.'}
          </p>
        ) : (
          <p className="text-[11px] text-purple-200/80 font-sans">The engine has not produced a read for this window yet.</p>
        )}
      </div>

      {/* 4. SIDE CAPSULES (BTC engine only) */}
      {engineLive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderCapsule('UP')}
          {renderCapsule('DOWN')}
        </div>
      )}

      {/* 5. ENGINE CONVICTION TRAIL (BTC engine only) */}
      {engineLive && (
        <div className="vixy-card-elevated p-5 shadow-[0_0_25px_rgba(0,0,0,0.5)] space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-purple-900/30 pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase font-sans">ENGINE CONVICTION TRAIL</h3>
                <p className="text-[10px] text-gray-400 font-sans">
                  How P(settle UP) moved through this window, one point per engine tick this server instance saw.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs">
              <div className="px-3 py-1 rounded-xl bg-[#0a0518] border border-emerald-500/40 text-[10px]">
                <span className="text-gray-400">CHANGE: </span>
                <span className={`font-black ${trailChange === null ? 'text-gray-500' : trailChange >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
                  {trailChange === null ? '—' : `${trailChange >= 0 ? '+' : '−'}${Math.abs(trailChange)} pts`}
                </span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#0a0518] border border-cyan-500/40 text-[10px]">
                <span className="text-gray-400">GATES: </span>
                <span className="text-cyan-300 font-black">
                  {gateChecks.length ? `${gatesPassing}/${gateChecks.length} PASSING` : 'NO GATE DATA'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 bg-[#0a0518] p-4 rounded-2xl border border-purple-900/30 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-purple-300 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>P(SETTLE UP) THROUGH THE WINDOW</span>
                </span>
                <span className="text-[#00FF88] font-mono">NOW: {pUp !== null ? `${pUp}% UP` : '—'}</span>
              </div>

              {trail.length >= 2 ? (
                <div className="relative pt-2 pb-1 h-24 w-full">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="trailGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00FF88" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#00FF88" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#trailGrad)" />
                    <path d={lineD} fill="none" stroke="#00FF88" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>

                  <div className="absolute inset-0 flex justify-between items-end px-1 pointer-events-none font-mono">
                    {trailNodes.map((pt, idx) => {
                      const isNow = idx === trailNodes.length - 1;
                      return (
                        <div key={`${pt.t}-${idx}`} className="flex flex-col items-center gap-1 relative z-10">
                          <div
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                              isNow
                                ? 'bg-[#00FF88] text-black shadow-[0_0_10px_rgba(0,255,136,0.6)]'
                                : pt.pUp >= 50
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                : 'bg-rose-950 text-rose-300 border border-rose-800/80'
                            }`}
                          >
                            {pt.pUp}%
                          </div>
                          <div className={`w-2 h-2 rounded-full border ${isNow ? 'bg-[#00FF88] border-white ring-2 ring-emerald-500/40' : 'bg-[#0a0518] border-purple-400'}`} />
                          <span className="text-[9px] text-gray-400">{fmtCycleSec(pt.t)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-[10px] text-purple-300/50 font-sans">
                  The trail draws as the cycle runs.
                </div>
              )}

              <div className="pt-2 border-t border-purple-900/30 space-y-1.5">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider block">LOCK GATE CHECKS</span>
                {gateChecks.length === 0 ? (
                  <span className="text-[10px] text-purple-300/50 font-sans">The engine has not reported its gate checks this tick.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {gateChecks.map((c) => (
                      <span
                        key={c.id}
                        className={`px-2 py-0.5 rounded-xl text-[9.5px] font-bold flex items-center space-x-1 border ${
                          c.pass ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {c.pass ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <XCircle className="w-2.5 h-2.5 text-rose-400" />}
                        <span>
                          {c.label}: {String(c.current)} / {c.required}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#0a0518] p-4 rounded-2xl border border-purple-900/30 space-y-2.5 flex flex-col justify-between">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-purple-300 flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>ENGINE STATE</span>
                </span>
                <span className="text-[#00FF88] text-[9px]">LIVE</span>
              </div>

              <div className="space-y-1.5 text-[10px] font-mono">
                {[
                  ['Stage', engineDecision?.engineStage ?? '—'],
                  ['State', engineDecision?.currentState ?? '—'],
                  ['Direction', engineDecision?.direction ?? '—'],
                  ['Regime', engineDecision?.regime ?? '—'],
                  ['Time left in window', timeLeft !== null ? fmtCycleSec(timeLeft) : '—'],
                  ['Calibration sample', typeof calibrated?.n === 'number' && calibrated.n > 0 ? `n=${calibrated.n}` : '—'],
                  ['Kalshi read age', market && typeof market.ageMs === 'number' ? `${Math.round(market.ageMs / 1000)}s` : 'no fresh read'],
                  ['Lock eligible', lockEligible ? 'YES' : 'NOT YET'],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 rounded-xl bg-[#0c0620] border border-purple-900/30 flex items-center justify-between">
                    <span className="text-gray-400">{k}</span>
                    <span className="text-white font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>

              <div className="text-[8.5px] text-gray-500 pt-1.5 border-t border-purple-900/30 font-sans">
                Every value here is read from the live engine payload.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
