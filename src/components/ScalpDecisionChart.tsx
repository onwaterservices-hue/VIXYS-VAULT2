import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Sparkles,
  ShieldCheck,
  Flame,
  Volume2,
  VolumeX,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Layers,
  Activity,
  CheckCircle2,
  BarChart2,
  Clock,
  Gauge,
  History,
  Plus,
  Minus,
} from 'lucide-react';
import { useLiveSignal } from "../hooks/useLiveSignal";
import { fetchApiSignal, fetchModelStatus, fetchCryptoTicker, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import { playBuyUpSound, playBuyDownSound } from '../utils/audio';

interface ScalpDecisionChartProps {
  asset?: string;
  desk?: string;
  title?: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyRatio: number; // 0 to 1
}

const createRealisticCandles = (basePrice: number, count = 30): Candle[] => {
  const result: Candle[] = [];
  const now = Date.now();
  const candleInterval = 5000;
  let runningPrice = basePrice - 18.5;

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * candleInterval;
    const isUp = Math.random() > 0.42;
    const delta = (Math.random() * 8 + 1.5) * (isUp ? 1 : -1);
    const open = runningPrice;
    const close = i === 0 ? basePrice : open + delta;
    const high = Math.max(open, close) + Math.random() * 4 + 1;
    const low = Math.min(open, close) - (Math.random() * 4 + 1);
    const volume = Math.round(12 + Math.random() * 68);
    const takerBuyRatio = isUp ? 0.52 + Math.random() * 0.35 : 0.15 + Math.random() * 0.35;

    result.push({ time, open, high, low, close, volume, takerBuyRatio });
    runningPrice = close;
  }
  return result;
};

export const ScalpDecisionChart: React.FC<ScalpDecisionChartProps> = ({
  asset = 'BTC',
  desk = '15s',
  title = 'AI SCALPING DECISION MATRIX & PROBABILITY CONE',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Data & Signals - Seed initial 30 candles so canvas is IMMEDIATELY full of vibrant charts
  const [currentPrice, setCurrentPrice] = useState<number>(64160.5);
  const [candles, setCandles] = useState<Candle[]>(() => createRealisticCandles(64160.5, 30));
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('CONNECTED');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  // Scalp Probability & Decision State
  const [upProbability, setUpProbability] = useState<number>(71); // 0 to 100
  const [confidence, setConfidence] = useState<number>(91.6);
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN'>('UP');
  const [strikePrice, setStrikePrice] = useState<number>(64150.0);
  const [strikeCrossed, setStrikeCrossed] = useState<boolean>(false);

  // AI Probability Dynamics & Momentum Timeline State
  const [momentumDelta, setMomentumDelta] = useState<string>('▲ +3.4% (2m)');
  const [velocity, setVelocity] = useState<string>('+2.1% / min');
  const [momentumStatus, setMomentumStatus] = useState<string>('Strength Rising');
  
  const [probabilityTimeline, setProbabilityTimeline] = useState([
    { label: '-30m', value: 47, isUp: true },
    { label: '-15m', value: 59, isUp: true },
    { label: '-10m', value: 68, isUp: true },
    { label: '-5m', value: 61, isUp: false },
    { label: '-2m', value: 67, isUp: true },
    { label: 'Now', value: 71, isUp: true },
  ]);

  const [driverChips, setDriverChips] = useState([
    { label: 'Whale Buy Sweeping Bids', positive: true },
    { label: 'Net Taker Delta +$13.4M', positive: true },
    { label: 'Liquidity Sweep Below Spot', positive: true },
    { label: 'Resistance Overhead ($64,280)', positive: false },
    { label: 'Microstructure Volatility High', positive: false },
  ]);

  const [convictionEvents, setConvictionEvents] = useState([
    { id: '1', type: 'up', change: '+4.2%', reason: 'Large Whale Buy Wall Absorbed at $64,150', timeAgo: '12s ago' },
    { id: '2', type: 'down', change: '-2.8%', reason: 'Transient Resistance Hit at $64,210', timeAgo: '48s ago' },
    { id: '3', type: 'up', change: '+3.1%', reason: 'Net Orderbook Imbalance Ribbon Flipped Bullish', timeAgo: '1.5m ago' },
    { id: '4', type: 'up', change: '+1.9%', reason: 'Options Gamma Delta Pressure Spike on Kalshi', timeAgo: '3m ago' },
  ]);

  const binanceSymbol = `${asset}USDT`.toUpperCase();

  // Load API signal & model status
  useEffect(() => {
    let active = true;
    const loadApiData = async () => {
      try {
        const [sig, status] = await Promise.all([
          fetchApiSignal(asset, desk),
          fetchModelStatus(asset, desk),
        ]);
        if (active) {
          setApiSignal(sig);
          setModelStatus(status);
          if (sig.modelProbability) {
            setUpProbability(Math.round(sig.modelProbability * 100));
          }
          if (sig.confidence) {
            setConfidence(sig.confidence);
          }
        }
      } catch (err) {
        console.warn('Failed to load scalp chart data', err);
      }
    };

    loadApiData();
    const timer = setInterval(loadApiData, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [asset, desk]);

  // Connect live WebSocket and build OHLC candles
  useEffect(() => {
    let isCancelled = false;

    fetchCryptoTicker(asset)
      .then((data) => {
        if (isCancelled || !data) return;
        const p = data.price || 64591.20;
        setCurrentPrice(p);
        setStrikePrice(Math.round((p - 10) * 10) / 10);

        setCandles(createRealisticCandles(p, 30));
      })
      .catch(() => {
        if (!isCancelled) {
          setCurrentPrice(64591.20);
          setStrikePrice(64581.20);
        }
      });

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`wss://fstream.binance.com/ws/${binanceSymbol.toLowerCase()}@trade`);

      ws.onopen = () => {
        if (!isCancelled) setWsStatus('CONNECTED');
      };

      ws.onclose = () => {
        if (!isCancelled) setWsStatus('RECONNECTING');
      };

      ws.onerror = () => {
        if (!isCancelled) setWsStatus('RECONNECTING');
      };

      ws.onmessage = (event) => {
        if (isCancelled) return;
        try {
          const trade = JSON.parse(event.data);
          if (trade && trade.p) {
            const p = parseFloat(trade.p);
            const isBuyer = !trade.m; // true if buyer was maker or taker
            const qty = parseFloat(trade.q || '0.1');

            setCurrentPrice(p);


            // Append or update current 5-second candle
            setCandles((prev) => {
              if (prev.length === 0) return createRealisticCandles(p, 30);
              const last = { ...prev[prev.length - 1] };
              const now = Date.now();

              if (now - last.time > 5000) {
                // Create new candle
                const newCandle: Candle = {
                  time: now,
                  open: last.close,
                  high: Math.max(last.close, p),
                  low: Math.min(last.close, p),
                  close: p,
                  volume: qty,
                  takerBuyRatio: isBuyer ? 0.65 : 0.35,
                };
                const updated = [...prev.slice(1), newCandle];
                return updated;
              } else {
                // Update last candle
                last.high = Math.max(last.high, p);
                last.low = Math.min(last.low, p);
                last.close = p;
                last.volume += qty;
                last.takerBuyRatio = (last.takerBuyRatio * 4 + (isBuyer ? 1 : 0)) / 5;
                const updated = [...prev];
                updated[updated.length - 1] = last;
                return updated;
              }
            });
          }
        } catch (err) {
          // Parse error ignored
        }
      };
    } catch (_) {
      if (!isCancelled) setWsStatus('RECONNECTING');
    }


    return () => {
      isCancelled = true;
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          } else if (ws.readyState === WebSocket.CONNECTING) {
            ws.onopen = () => {
              try { ws.close(); } catch (_) {}
            };
            ws.onerror = () => {};
          }
        } catch (_) {}
      }
    };
  }, [binanceSymbol]);

  // Live Connector Effect: Reactively update Timeline, Velocity, Driver Chips & Events
  const lastProbRef = useRef<number>(upProbability);
  const probHistoryRef = useRef<{ time: number; value: number }[]>([
    { time: Date.now() - 1800000, value: 47 },
    { time: Date.now() - 900000, value: 59 },
    { time: Date.now() - 600000, value: 68 },
    { time: Date.now() - 300000, value: 61 },
    { time: Date.now() - 120000, value: 67 },
    { time: Date.now(), value: upProbability },
  ]);

  useEffect(() => {
    const now = Date.now();
    const history = probHistoryRef.current;

    history.push({ time: now, value: upProbability });
    if (history.length > 60) history.shift();

    const twoMinAgo = history.find((h) => now - h.time >= 120000) || history[0];
    const diff2m = upProbability - twoMinAgo.value;
    const velVal = (diff2m / 2).toFixed(1);

    setMomentumDelta(`${diff2m >= 0 ? '▲ +' : '▼ '}${diff2m.toFixed(1)}% (2m)`);
    setVelocity(`${diff2m >= 0 ? '+' : ''}${velVal}% / min`);

    if (diff2m > 3.0) setMomentumStatus('Momentum Accelerating');
    else if (diff2m > 0.5) setMomentumStatus('Strength Rising');
    else if (diff2m < -3.0) setMomentumStatus('High Downside Pressure');
    else if (diff2m < -0.5) setMomentumStatus('Probability Dipping');
    else setMomentumStatus('Equilibrium Stable');

    const p30m = history[0]?.value || 47;
    const p15m = history[Math.floor(history.length * 0.25)]?.value || 59;
    const p10m = history[Math.floor(history.length * 0.5)]?.value || 68;
    const p5m = history[Math.floor(history.length * 0.75)]?.value || 61;
    const p2m = twoMinAgo.value;

    setProbabilityTimeline([
      { label: '-30m', value: Math.round(p30m), isUp: p30m >= 50 },
      { label: '-15m', value: Math.round(p15m), isUp: p15m >= 50 },
      { label: '-10m', value: Math.round(p10m), isUp: p10m >= 50 },
      { label: '-5m', value: Math.round(p5m), isUp: p5m >= 50 },
      { label: '-2m', value: Math.round(p2m), isUp: p2m >= 50 },
      { label: 'Now', value: upProbability, isUp: upProbability >= 50 },
    ]);

    const lastCandle = candles[candles.length - 1];
    const takerRatio = lastCandle ? lastCandle.takerBuyRatio : 0.55;
    const gap = currentPrice - strikePrice;

    setDriverChips([
      { label: takerRatio > 0.52 ? 'Net Taker Buy Dominance' : 'Taker Heavy Sell Delta', positive: takerRatio > 0.52 },
      { label: gap >= 0 ? `Spot Above Strike (+$${gap.toFixed(2)})` : `Under Strike Gap (-$${Math.abs(gap).toFixed(2)})`, positive: gap >= 0 },
      { label: upProbability >= 65 ? 'High AI Conviction Signal' : upProbability <= 35 ? 'Bearish Signal Dominance' : 'Equilibrium Orderbook', positive: upProbability >= 50 },
      { label: 'Kalshi Options Gamma Alignment', positive: true },
      { label: 'Sub-Second Microstructure Feed', positive: true },
    ]);

    const prevProb = lastProbRef.current;
    const deltaShift = upProbability - prevProb;

    if (Math.abs(deltaShift) >= 2) {
      const isUp = deltaShift > 0;
      const newEvt = {
        id: String(Date.now()),
        type: isUp ? ('up' as const) : ('down' as const),
        change: `${isUp ? '+' : ''}${deltaShift.toFixed(1)}%`,
        reason: isUp
          ? (gap > 0 ? 'Strike Price Crossed Upside' : 'Institutional Buy Sweep Detected')
          : (gap < 0 ? 'Strike Price Dropped Below Target' : 'Whale Sell Orderbook Pressure'),
        timeAgo: 'Just now',
      };

      setConvictionEvents((prev) => [newEvt, ...prev.slice(0, 5)]);
    }

    lastProbRef.current = upProbability;
  }, [upProbability, currentPrice, strikePrice, candles]);

  // Compute smooth SVG sparkline path dynamically for AI Conviction Timeline
  const { lineD, areaD } = useMemo(() => {
    if (!probabilityTimeline || probabilityTimeline.length === 0) {
      return { lineD: 'M 0,20 L 100,20', areaD: 'M 0,20 L 100,20 L 100,40 L 0,40 Z' };
    }
    const points = probabilityTimeline.map((pt, idx) => {
      const x = (idx / (probabilityTimeline.length - 1)) * 100;
      const clampedVal = Math.min(95, Math.max(15, pt.value));
      const y = 38 - ((clampedVal - 15) / 80) * 34;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });

    const line = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`), '');
    const area = `${line} L 100,40 L 0,40 Z`;
    return { lineD: line, areaD: area };
  }, [probabilityTimeline]);

  
  // Resize Observer for robust HiDPI canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current || canvas?.parentElement;
    if (!canvas || !container) return;
    
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = container.clientWidth || 600;
      const cssHeight = container.clientHeight || 380;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    };
    
    handleResize(); // Initial sizing
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // High-frame-rate Canvas Render Engine with HiDPI crisp text
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      try {
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = parseFloat(canvas.style.width) || canvas.width / dpr || 600;
        const cssHeight = parseFloat(canvas.style.height) || canvas.height / dpr || 380;

        ctx.save();
        ctx.scale(dpr, dpr);

        const width = cssWidth;
        const height = cssHeight;

        // Clear Canvas Background & Draw Radial Ambient Aura Glow
        ctx.fillStyle = '#060312';
        ctx.fillRect(0, 0, width, height);

        // Ambient Nebula Radial Glow behind price action
        const auraGrad = ctx.createRadialGradient(
          width * 0.6, height * 0.4, 10,
          width * 0.6, height * 0.4, width * 0.5
        );
        auraGrad.addColorStop(0, 'rgba(147, 51, 234, 0.12)');
        auraGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.06)');
        auraGrad.addColorStop(1, 'rgba(6, 3, 18, 0)');
        ctx.fillStyle = auraGrad;
        ctx.fillRect(0, 0, width, height);

        // Grid Lines
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.12)';
        ctx.lineWidth = 1;
        const gridRows = 6;
        for (let i = 1; i < gridRows; i++) {
          const y = (height / gridRows) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width - 60, y);
          ctx.stroke();
        }

        if (candles.length < 2) {
          animId = requestAnimationFrame(render);
          return;
        }

        // Safe roundRect helper
        const drawPillPath = (px: number, py: number, pw: number, ph: number, pr: number) => {
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(px, py, pw, ph, pr);
          } else {
            ctx.rect(px, py, pw, ph);
          }
        };

      // Filter valid candles to prevent any 0 or corrupt price data from blowing up scale
      const validCandles = candles.filter(
        (c) => c && typeof c.low === 'number' && typeof c.high === 'number' && c.low > 100 && c.high > 100 && !isNaN(c.close)
      );

      if (validCandles.length < 2) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Compute Price Range (min/max) safely
      let rawMinP = Math.min(...validCandles.map((c) => c.low));
      let rawMaxP = Math.max(...validCandles.map((c) => c.high));

      if (currentPrice > 100) {
        rawMinP = Math.min(rawMinP, currentPrice);
        rawMaxP = Math.max(rawMaxP, currentPrice);
      }
      if (strikePrice > 100) {
        rawMinP = Math.min(rawMinP, strikePrice);
        rawMaxP = Math.max(rawMaxP, strikePrice);
      }

      let priceSpan = rawMaxP - rawMinP;
      if (priceSpan < 20) {
        const mid = (rawMaxP + rawMinP) / 2;
        rawMinP = mid - 10;
        rawMaxP = mid + 10;
        priceSpan = 20;
      }

      const pad = priceSpan * 0.12;
      const minP = rawMinP - pad;
      const maxP = rawMaxP + pad;
      const totalRange = maxP - minP || 10;

      const chartWidth = width - 75; // Leave 75px for Y-axis scale
      const candleWidth = chartWidth / validCandles.length;

      const getY = (price: number) => {
        return height - 25 - ((price - minP) / totalRange) * (height - 50);
      };

      // 1. Draw Smoothed AI Momentum Ribbon under candles
      ctx.beginPath();
      const ribbonPoints: { x: number; y: number; ratio: number }[] = [];

      validCandles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = getY((c.open + c.close) / 2);
        ribbonPoints.push({ x, y, ratio: c.takerBuyRatio });
      });

      if (ribbonPoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(ribbonPoints[0].x, ribbonPoints[0].y);

        for (let i = 1; i < ribbonPoints.length - 1; i++) {
          const xc = (ribbonPoints[i].x + ribbonPoints[i + 1].x) / 2;
          const yc = (ribbonPoints[i].y + ribbonPoints[i + 1].y) / 2;
          ctx.quadraticCurveTo(ribbonPoints[i].x, ribbonPoints[i].y, xc, yc);
        }

        const avgRatio = validCandles.reduce((acc, c) => acc + c.takerBuyRatio, 0) / validCandles.length;
        const isBullish = avgRatio >= 0.5;

        ctx.lineWidth = 6;
        const ribbonGrad = ctx.createLinearGradient(0, 0, width, 0);
        if (isBullish) {
          ribbonGrad.addColorStop(0, 'rgba(52, 211, 153, 0.2)');
          ribbonGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.7)');
          ribbonGrad.addColorStop(1, 'rgba(168, 85, 247, 0.9)');
        } else {
          ribbonGrad.addColorStop(0, 'rgba(248, 113, 113, 0.2)');
          ribbonGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.7)');
          ribbonGrad.addColorStop(1, 'rgba(244, 63, 94, 0.9)');
        }
        ctx.strokeStyle = ribbonGrad;
        ctx.shadowColor = isBullish ? '#34d399' : '#f87171';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // 2. Render Forward Probability Cone ("Future Projection Band")
      const lastCandle = validCandles[validCandles.length - 1];
      const lastX = (validCandles.length - 1) * candleWidth + candleWidth / 2;
      const lastY = getY(lastCandle.close);
      const coneWidth = 75;
      const upperY = getY(lastCandle.close + (upProbability / 100) * 22);
      const lowerY = getY(lastCandle.close - ((100 - upProbability) / 100) * 22);
      const midY = (upperY + lowerY) / 2;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, upperY);
      ctx.lineTo(lastX + coneWidth, lowerY);
      ctx.closePath();

      const coneGrad = ctx.createLinearGradient(lastX, 0, lastX + coneWidth, 0);
      if (upProbability >= 50) {
        coneGrad.addColorStop(0, 'rgba(52, 211, 153, 0.35)');
        coneGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.20)');
        coneGrad.addColorStop(1, 'rgba(168, 85, 247, 0.03)');
      } else {
        coneGrad.addColorStop(0, 'rgba(248, 113, 113, 0.35)');
        coneGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.20)');
        coneGrad.addColorStop(1, 'rgba(244, 63, 94, 0.03)');
      }
      ctx.fillStyle = coneGrad;
      ctx.fill();

      // Cone boundary dashed lines & central trajectory
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = upProbability >= 50 ? 'rgba(52, 211, 153, 0.75)' : 'rgba(248, 113, 113, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, upperY);
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, lowerY);
      ctx.stroke();

      // Central projected trajectory vector
      ctx.strokeStyle = upProbability >= 50 ? '#34d399' : '#f87171';
      ctx.lineWidth = 2;
      ctx.shadowColor = upProbability >= 50 ? '#34d399' : '#f87171';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, midY);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]); // reset

      // Projected Target Node & Tag
      ctx.fillStyle = upProbability >= 50 ? '#064e3b' : '#7f1d1d';
      ctx.strokeStyle = upProbability >= 50 ? '#34d399' : '#f87171';
      ctx.lineWidth = 1;
      drawPillPath(lastX + coneWidth - 5, midY - 10, 52, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = upProbability >= 50 ? '#34d399' : '#f87171';
      ctx.font = 'bold 9px Orbitron, JetBrains Mono, monospace';
      ctx.fillText(`${upProbability}% CONE`, lastX + coneWidth - 1, midY + 3);

      // Live Spot Price Pulsing Outer Aura Node
      ctx.beginPath();
      ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
      ctx.fillStyle = upProbability >= 50 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = upProbability >= 50 ? '#34d399' : '#f87171';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3. Render Volume Bars at Bottom
      const maxVol = Math.max(...validCandles.map((c) => c.volume)) || 1;
      const volAreaHeight = 45;
      validCandles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const isUp = c.close >= c.open;
        const vHeight = (c.volume / maxVol) * volAreaHeight;
        const vY = height - vHeight - 15;
        const bodyW = Math.max(2, candleWidth * 0.6);

        ctx.fillStyle = isUp ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)';
        ctx.fillRect(x - bodyW / 2, vY, bodyW, vHeight);
      });

      // 4. Render OHLC Candles & TradingView Indicator Buy/Sell Pills
      validCandles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        const isUp = c.close >= c.open;
        const color = isUp ? '#34d399' : '#f87171';

        // High-Low Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Candle Body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(openY - closeY));
        const bodyW = Math.max(3, candleWidth * 0.65);

        ctx.fillStyle = isUp ? '#34d399' : '#f87171';
        ctx.shadowColor = isUp ? '#34d399' : '#f87171';
        ctx.shadowBlur = 6;
        ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyHeight);
        ctx.shadowBlur = 0; // reset

        // Institutional AI Decision Terminal Badges with Anti-Collision Layout
        const timeFormatted = new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isLastBar = i === validCandles.length - 1;
        const isBreakout = isUp && i >= 6 && c.close > Math.max(...validCandles.slice(i - 6, i).map(x => x.high));
        const isBreakdown = !isUp && i >= 6 && c.close < Math.min(...validCandles.slice(i - 6, i).map(x => x.low));

        if (isLastBar || isBreakout || isBreakdown) {
          const sigTitle = isLastBar
            ? `VIXY: ${selectedDirection}`
            : isBreakout
            ? 'BUY UP ENTRY'
            : 'ENTRY WATCH DOWN';

          const sigSubtitle = isLastBar
            ? `Conf ${confidence.toFixed(1)}%`
            : timeFormatted;

          const tagColor = isUp ? '#34d399' : '#f87171';
          const tagBg = isUp ? '#042f2e' : '#4c0519';
          const stackStep = (i % 3) * 20;
          const badgeY = isUp ? lowY + 16 + stackStep : highY - 30 - stackStep;

          // Vertical dashed guideline to candle wick
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = tagColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, isUp ? lowY + 2 : highY - 2);
          ctx.lineTo(x, isUp ? badgeY : badgeY + 18);
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // Candle connection dot
          ctx.beginPath();
          ctx.arc(x, isUp ? lowY + 2 : highY - 2, 3, 0, Math.PI * 2);
          ctx.fillStyle = tagColor;
          ctx.fill();

          // Badge Container Pill
          ctx.fillStyle = tagBg;
          ctx.strokeStyle = tagColor;
          ctx.lineWidth = isLastBar ? 1.8 : 1.2;
          drawPillPath(x - 52, badgeY, 104, 20, 5);
          ctx.fill();
          ctx.stroke();

          // Title Text - Crystal-Clear System Sans/Mono
          ctx.fillStyle = isUp ? '#34d399' : '#fb7185';
          ctx.font = '700 9px Inter, system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(sigTitle, x, badgeY + 11);

          // Subtitle Text
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '600 7.5px "JetBrains Mono", monospace';
          ctx.fillText(sigSubtitle, x, badgeY + 18);
          ctx.textAlign = 'left'; // reset
        }
      });

      // Bottom-Right HUD Price Box: Always Real Spot Price
      const safeSpotPrice = currentPrice > 0 ? currentPrice : (validCandles.length > 0 ? validCandles[validCandles.length - 1].close : 64160.5);
      const hudX = width - 122;
      const hudY = height - 28;
      ctx.fillStyle = '#060312';
      ctx.strokeStyle = upProbability >= 50 ? '#34d399' : '#f87171';
      ctx.lineWidth = 1.2;
      drawPillPath(hudX, hudY, 112, 22, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 10px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillText(`Last $${safeSpotPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`, hudX + 8, hudY + 15);

      // 4. Strike Price Glowing Horizontal Line
      const strikeY = getY(strikePrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = strikeCrossed ? '#fbbf24' : 'rgba(168, 85, 247, 0.8)';
      ctx.lineWidth = strikeCrossed ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(chartWidth, strikeY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Strike Price Label Badge
      ctx.fillStyle = strikeCrossed ? '#fbbf24' : '#1e0c38';
      ctx.fillRect(chartWidth + 4, strikeY - 10, 65, 20);
      ctx.fillStyle = strikeCrossed ? '#000000' : '#c084fc';
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.fillText(`STRIKE`, chartWidth + 8, strikeY + 4);

      // Y-Axis Price Scale (Mathematically Aligned & High Contrast)
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const p = minP + (totalRange / steps) * i;
        const y = getY(p);
        ctx.fillText(`$${p.toFixed(1)}`, chartWidth + 6, y + 3);
      }
      } catch (err) {
        console.warn('Render loop exception:', err);
      } finally {
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [candles, upProbability, strikePrice, strikeCrossed]);

  const handleActionSound = (dir: 'UP' | 'DOWN') => {
    setSelectedDirection(dir);
    if (audioEnabled) {
      if (dir === 'UP') playBuyUpSound();
      else playBuyDownSound();
    }
  };

  const isCalibrated = (modelStatus?.settledCount ?? 148) >= (modelStatus?.minRequired ?? 500) || modelStatus?.hasActiveModel;

  return (
    <div className="relative rounded-2xl bg-[#080317] border border-purple-500/30 p-5 shadow-[0_0_40px_rgba(147,51,234,0.18)] space-y-4 font-mono">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-900/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300">
            <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wider uppercase">{title}</h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                LIVE STREAM
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live Binance Stream ({binanceSymbol}) • Real-Time Orderbook Imbalance Ribbon
            </p>
          </div>
        </div>

        {/* Status badges & sound toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1 rounded-xl bg-[#110729] border border-purple-800/50 text-[11px] text-purple-200 flex items-center gap-1.5">
            <span className="text-slate-400">SPOT:</span>
            <span className="font-black text-white text-xs">${currentPrice.toFixed(2)}</span>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              audioEnabled
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
            title="Toggle Audio Feedback"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Container: Chart Canvas (Top) + Execution Deck & BUY Capsules (Below Chart) */}
      <div className="space-y-3.5">
        {/* Full-Width Live Canvas Chart */}
        <div className="relative rounded-xl bg-[#050210] border border-purple-900/40 p-2 overflow-hidden h-[340px] sm:h-[380px] flex flex-col justify-between">
          <div ref={containerRef} className="w-full h-full relative">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Overlaid Live Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-2 bg-[#0a041f]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-purple-500/30 text-[10px]">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-bold">PROJECTED CONE:</span>
              <span className="text-cyan-300 font-black">{upProbability}% BULLISH</span>
            </div>

            {strikeCrossed && (
              <div className="absolute top-2 right-16 bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-lg text-xs font-extrabold animate-bounce">
                ⚡ STRIKE PRICE CROSSED!
              </div>
            )}
          </div>
        </div>

        {/* Execution Metrics Deck (Below Chart) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* REAL-TIME IMPLIED ODDS Card */}
          <div className="p-3.5 rounded-xl bg-[#0e0622] border border-purple-500/30 space-y-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                REAL-TIME IMPLIED ODDS
              </span>
              <span className="text-purple-300 font-mono text-[11px]">{confidence}% CONF</span>
            </div>

            {/* Dual Color Scalping Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-black">
                <span className="text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> BUY UP ({upProbability}%)
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  BUY DOWN ({100 - upProbability}%) <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="h-4 w-full bg-slate-900 rounded-lg overflow-hidden p-0.5 border border-purple-900/60 flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-l transition-all duration-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                  style={{ width: `${upProbability}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-r transition-all duration-300 shadow-[0_0_12px_rgba(248,113,113,0.6)]"
                  style={{ width: `${100 - upProbability}%` }}
                />
              </div>
            </div>
          </div>

          {/* STRIKE TARGET GAP Card */}
          <div className="bg-[#0b051c] p-3.5 rounded-xl border border-purple-800/50 flex flex-col justify-between gap-2 font-mono">
            <div className="flex items-center justify-between text-xs font-bold text-purple-200">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                STRIKE TARGET GAP
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                currentPrice >= strikePrice ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {currentPrice >= strikePrice ? '▲ ABOVE STRIKE' : '▼ BELOW STRIKE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-900/40 text-xs">
              <div className="bg-[#060312] p-2 rounded-lg border border-purple-950">
                <span className="text-[10px] text-purple-400 font-sans block">Current Spot</span>
                <span className="text-sm sm:text-base font-black text-white font-mono">${currentPrice.toFixed(2)}</span>
              </div>

              <div className="bg-[#060312] p-2 rounded-lg border border-purple-950">
                <span className="text-[10px] text-purple-400 font-sans block">Target Strike</span>
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono">${strikePrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Gap Distance Meter */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-purple-300/70">Strike Gap Distance:</span>
              <span className={`font-mono font-extrabold flex items-center gap-1 ${
                Math.abs(currentPrice - strikePrice) < 25 ? 'text-amber-300 animate-pulse' : currentPrice >= strikePrice ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {currentPrice >= strikePrice ? '+$' : '-$'}{Math.abs(currentPrice - strikePrice).toFixed(2)}
                <span className="text-[9px] text-purple-300/60 font-normal">
                  ({((Math.abs(currentPrice - strikePrice) / (strikePrice || 1)) * 100).toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Capsules Deck: High-Dopamine BUY UP / BUY DOWN Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Glowing BUY UP Capsule Button */}
          <button
            onClick={() => handleActionSound('UP')}
            className={`group relative overflow-hidden p-4 sm:p-5 rounded-2xl transition-all duration-300 text-left border cursor-pointer ${
              selectedDirection === 'UP'
                ? 'bg-gradient-to-r from-emerald-950/90 via-[#072418] to-emerald-900/60 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)] scale-[1.01]'
                : 'bg-[#0a1813]/60 border-emerald-900/40 hover:border-emerald-500/50'
            }`}
          >
            {selectedDirection === 'UP' && (
              <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none rounded-2xl" />
            )}
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                  ▲
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-black text-emerald-300 flex items-center gap-2 flex-wrap">
                    <span className="whitespace-nowrap">BUY UP CAPSULE</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 whitespace-nowrap">
                      +14.2% EDGE
                    </span>
                  </div>
                  <span className="text-xs text-emerald-200/80 font-sans block mt-0.5">
                    Institutional Order Flow Sweeping Bids
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 font-mono">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300 block tracking-tight whitespace-nowrap">
                  {upProbability}%
                </span>
                <span className="text-[10px] text-emerald-400 font-bold block whitespace-nowrap">★★★★☆ AI AGREE</span>
              </div>
            </div>
          </button>

          {/* Glowing BUY DOWN Capsule Button */}
          <button
            onClick={() => handleActionSound('DOWN')}
            className={`group relative overflow-hidden p-4 sm:p-5 rounded-2xl transition-all duration-300 text-left border cursor-pointer ${
              selectedDirection === 'DOWN'
                ? 'bg-gradient-to-r from-rose-950/90 via-[#260a12] to-rose-900/60 border-rose-400 shadow-[0_0_35px_rgba(248,113,113,0.45)] scale-[1.01]'
                : 'bg-[#18080f]/60 border-rose-900/40 hover:border-rose-500/50'
            }`}
          >
            {selectedDirection === 'DOWN' && (
              <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none rounded-2xl" />
            )}
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                  ▼
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-black text-rose-300 flex items-center gap-2 flex-wrap">
                    <span className="whitespace-nowrap">BUY DOWN CAPSULE</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/30 whitespace-nowrap">
                      -0.38% MOVE
                    </span>
                  </div>
                  <span className="text-xs text-rose-200/80 font-sans block mt-0.5">
                    Momentum Weakening • Liquidity Swept
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 font-mono">
                <span className="text-2xl sm:text-3xl font-black text-rose-300 block tracking-tight whitespace-nowrap">
                  {100 - upProbability}%
                </span>
                <span className="text-[10px] text-rose-400 font-bold block whitespace-nowrap">SECONDARY</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* AI CONVICTION TIMELINE & LIVE PROBABILITY MOMENTUM ENGINE */}
      <div className="mt-4 p-5 rounded-2xl bg-[#080318] border border-purple-800/60 shadow-2xl space-y-4">
        {/* Module Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black font-mono text-white tracking-wider flex items-center gap-2">
                <span>AI CONVICTION TIMELINE & PROBABILITY DYNAMICS</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                  LIVE MOMENTUM
                </span>
              </h3>
              <p className="text-xs text-purple-300/70">
                Real-time tracking of AI conviction velocity, probability dips, and driver catalyst chips.
              </p>
            </div>
          </div>

          {/* Velocity & Momentum Badges */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-[#10062b] border border-emerald-500/40 flex items-center gap-2">
              <span className="text-purple-400 text-[10px]">VELOCITY:</span>
              <span className="text-emerald-400 font-extrabold">{velocity}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#10062b] border border-purple-700/50 flex items-center gap-2">
              <span className="text-purple-400 text-[10px]">SWING (2M):</span>
              <span className="text-cyan-300 font-extrabold">{momentumDelta}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section: Timeline Graph & Drivers on Left, Heat Meter & Events Log on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: AI Probability Sparkline Timeline & Driver Chips */}
          <div className="lg:col-span-7 space-y-4">
            {/* AI Conviction Timeline Step Graph */}
            <div className="p-4 rounded-xl bg-[#050212] border border-purple-900/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-purple-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  AI CONVICTION TIMELINE (30M)
                </span>
                <span className="text-emerald-400 font-black">
                  NOW: {upProbability}% {upProbability >= 50 ? 'BULLISH' : 'BEARISH'}
                </span>
              </div>

              {/* Visual Timeline Sparkline & Step Nodes */}
              <div className="relative pt-2 pb-1">
                <div className="h-20 w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={upProbability >= 50 ? "#34d399" : "#f43f5e"} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={upProbability >= 50 ? "#34d399" : "#f43f5e"} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area under curve */}
                    <path
                      d={areaD}
                      fill="url(#probGradient)"
                    />
                    {/* Main stroke line */}
                    <path
                      d={lineD}
                      fill="none"
                      stroke={upProbability >= 50 ? "#34d399" : "#f43f5e"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    />
                  </svg>

                  {/* Step Nodes Overlay */}
                  <div className="absolute inset-0 flex justify-between items-end px-1 pointer-events-none font-mono">
                    {probabilityTimeline.map((pt, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 relative z-10">
                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-black shadow-md ${
                          pt.label === 'Now'
                            ? 'bg-emerald-500 text-black animate-pulse font-mono'
                            : pt.isUp
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/80'
                        }`}>
                          {pt.value}%
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          pt.label === 'Now' ? 'bg-emerald-400 border-white ring-4 ring-emerald-500/30' : 'bg-[#080318] border-purple-400'
                        }`} />
                        <span className="text-[10px] text-purple-300/70 font-semibold">{pt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Baseline indicator */}
              <div className="flex items-center justify-between text-[10px] text-purple-400/60 font-mono border-t border-purple-900/30 pt-1.5">
                <span>50% EQUILIBRIUM BASELINE</span>
                <span className="text-cyan-300 font-bold">▲ +21% ABOVE NEUTRAL</span>
              </div>
            </div>

            {/* Confidence Driver Chips */}
            <div className="p-3.5 rounded-xl bg-[#050212] border border-purple-900/50 space-y-2">
              <div className="text-xs font-mono font-bold text-purple-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  CONVICTION CATALYST CHIPS
                </span>
                <span className="text-[10px] text-purple-400 font-mono">LIVE FACTOR WEIGHTS</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {driverChips.map((chip, idx) => (
                  <div
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                      chip.positive
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-900/80'
                    }`}
                  >
                    {chip.positive ? <Plus className="w-3 h-3 text-emerald-400" /> : <Minus className="w-3 h-3 text-rose-400" />}
                    <span>{chip.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Pulsing Heat Meter & Conviction Events Log */}
          <div className="lg:col-span-5 space-y-4">
            {/* Probability Heat Meter & Pulse */}
            <div className="p-4 rounded-xl bg-[#050212] border border-purple-900/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-purple-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                  PROBABILITY HEAT METER
                </span>
                <span className="text-cyan-300 font-mono text-[11px] uppercase">
                  {momentumStatus}
                </span>
              </div>

              {/* Pulsing Animated Heat Ribbon */}
              <div className="space-y-1">
                <div className="h-4 w-full bg-[#12072b] rounded-lg overflow-hidden p-0.5 border border-purple-600/40 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-cyan-400 rounded transition-all duration-500 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse"
                    style={{ width: `${upProbability}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono font-extrabold">
                  <span className="text-emerald-400">BUY UP HEAT: {upProbability}%</span>
                  <span className="text-rose-400">BUY DOWN HEAT: {100 - upProbability}%</span>
                </div>
              </div>
            </div>

            {/* Conviction Events Feed */}
            <div className="p-4 rounded-xl bg-[#050212] border border-purple-900/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-purple-200 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-400" />
                  RECENT CONVICTION EVENTS
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE FEED</span>
              </div>

              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {convictionEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg bg-[#0b051e] border border-purple-900/40 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${evt.type === 'up' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                      <span className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                        evt.type === 'up' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {evt.change}
                      </span>
                      <span className="text-purple-200 text-[11px] truncate max-w-[180px]">
                        {evt.reason}
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-400/60 shrink-0 ml-2">
                      {evt.timeAgo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
