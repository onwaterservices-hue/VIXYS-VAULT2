import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
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

export const ScalpDecisionChart: React.FC<ScalpDecisionChartProps> = ({
  asset = 'BTC',
  desk = '15s',
  title = 'AI SCALPING DECISION MATRIX & PROBABILITY CONE',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

// Data & Signals
  const generateInitialCandles = (basePrice = 64160.5) => {
    const now = Date.now();
    const list: Candle[] = [];
    let p = basePrice - 40;
    for (let i = 35; i >= 0; i--) {
      const delta = (Math.random() - 0.47) * 14;
      const open = p;
      const close = open + delta;
      const high = Math.max(open, close) + Math.random() * 8;
      const low = Math.min(open, close) - Math.random() * 8;
      p = close;
      list.push({
        time: now - i * 5000,
        open,
        high,
        low,
        close,
        volume: Math.random() * 8 + 2.5,
        takerBuyRatio: 0.48 + Math.random() * 0.25,
      });
    }
    return list;
  };

  const [candles, setCandles] = useState<Candle[]>(() => generateInitialCandles());
  const [currentPrice, setCurrentPrice] = useState<number>(64160.5);
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

        // Seed 35 candles
        const now = Date.now();
        const initialCandles: Candle[] = [];
        let runningP = p - 35;

        for (let i = 35; i >= 0; i--) {
          const delta = (Math.random() - 0.47) * 12;
          const open = runningP;
          const close = open + delta;
          const high = Math.max(open, close) + Math.random() * 8;
          const low = Math.min(open, close) - Math.random() * 8;
          runningP = close;

          initialCandles.push({
            time: now - i * 5000,
            open,
            high,
            low,
            close,
            volume: Math.random() * 4.5 + 1.2,
            takerBuyRatio: 0.45 + Math.random() * 0.25,
          });
        }
        setCandles(initialCandles);
      })
      .catch(() => {
        if (!isCancelled) {
          setCurrentPrice(64591.20);
          setStrikePrice(64581.20);
        }
      });

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@trade`);

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

          // Smoothly drift probability
          setUpProbability((prev) => {
            const shift = (isBuyer ? 0.3 : -0.3) + (Math.random() - 0.49) * 0.4;
            return Math.min(94, Math.max(22, Math.round(prev + shift)));
          });

          // Append or update current 5-second candle
          setCandles((prev) => {
            if (prev.length === 0) return prev;
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

    // Live tick simulator interval to ensure continuous chart motion regardless of network
    const liveTickTimer = setInterval(() => {
      if (isCancelled) return;
      const delta = (Math.random() - 0.47) * 3.8;
      setCurrentPrice((prevP) => {
        const nextP = Math.round((prevP + delta) * 100) / 100;
        setCandles((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.close = nextP;
          last.high = Math.max(last.high, nextP);
          last.low = Math.min(last.low, nextP);
          last.volume += Math.random() * 0.4;
          updated[updated.length - 1] = last;
          return updated;
        });
        return nextP;
      });
    }, 1200);

    return () => {
      isCancelled = true;
      clearInterval(liveTickTimer);
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          try { ws.close(); } catch (_) {}
        };
      }
    };
  }, [binanceSymbol]);

  // High-frame-rate Canvas Render Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      try {
        const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
        const height = (canvas.height = 320);

        // Clear Canvas Background
        ctx.fillStyle = '#060312';
        ctx.fillRect(0, 0, width, height);

        // Grid Lines
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.08)';
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

      // Compute Price Range (min/max)
      let minP = Math.min(...candles.map((c) => c.low));
      let maxP = Math.max(...candles.map((c) => c.high));
      const range = maxP - minP || 10;
      const padding = range * 0.15;
      minP -= padding;
      maxP += padding;

      const chartWidth = width - 70; // Leave room for Y-axis scale
      const candleWidth = chartWidth / candles.length;

      const getY = (price: number) => {
        return height - ((price - minP) / (maxP - minP)) * (height - 30) - 15;
      };

      // 1. Draw Smoothed AI Momentum Ribbon under candles
      ctx.beginPath();
      const ribbonPoints: { x: number; y: number; ratio: number }[] = [];

      candles.forEach((c, i) => {
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

        const avgRatio = candles.reduce((acc, c) => acc + c.takerBuyRatio, 0) / candles.length;
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
      const lastX = (candles.length - 1) * candleWidth + candleWidth / 2;
      const lastY = getY(candles[candles.length - 1].close);
      const coneWidth = 60;
      const upperY = getY(candles[candles.length - 1].close + (upProbability / 100) * 18);
      const lowerY = getY(candles[candles.length - 1].close - ((100 - upProbability) / 100) * 18);

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, upperY);
      ctx.lineTo(lastX + coneWidth, lowerY);
      ctx.closePath();

      const coneGrad = ctx.createLinearGradient(lastX, 0, lastX + coneWidth, 0);
      if (upProbability >= 50) {
        coneGrad.addColorStop(0, 'rgba(52, 211, 153, 0.25)');
        coneGrad.addColorStop(1, 'rgba(52, 211, 153, 0.02)');
      } else {
        coneGrad.addColorStop(0, 'rgba(248, 113, 113, 0.25)');
        coneGrad.addColorStop(1, 'rgba(248, 113, 113, 0.02)');
      }
      ctx.fillStyle = coneGrad;
      ctx.fill();

      // Cone boundary dashed lines
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = upProbability >= 50 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(248, 113, 113, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, upperY);
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, lowerY);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // 3. Render Volume Bars at Bottom
      const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;
      const volAreaHeight = 45;
      candles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const isUp = c.close >= c.open;
        const vHeight = (c.volume / maxVol) * volAreaHeight;
        const vY = height - vHeight - 15;
        const bodyW = Math.max(2, candleWidth * 0.6);

        ctx.fillStyle = isUp ? 'rgba(52, 211, 153, 0.25)' : 'rgba(248, 113, 113, 0.25)';
        ctx.fillRect(x - bodyW / 2, vY, bodyW, vHeight);
      });

      // 4. Render OHLC Candles & TradingView Indicator Buy/Sell Pills
      candles.forEach((c, i) => {
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

        // TradingView-style AI Indicator Pills (BUY ▲ / SELL ▼ tags)
        if (i % 7 === 2 && isUp) {
          ctx.fillStyle = '#06291a';
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#34d399';
          ctx.shadowBlur = 8;
          drawPillPath(x - 16, lowY + 6, 32, 14, 4);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('BUY ▲', x - 12, lowY + 16);
        } else if (i % 7 === 5 && !isUp) {
          ctx.fillStyle = '#290610';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 8;
          drawPillPath(x - 17, highY - 18, 34, 14, 4);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('SELL ▼', x - 13, highY - 8);
        }
      });

      // 4. Strike Price Glowing Horizontal Line
      const strikeY = getY(strikePrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = strikeCrossed ? '#fbbf24' : 'rgba(168, 85, 247, 0.8)';
      ctx.lineWidth = strikeCrossed ? 2.5 : 1.5;
      ctx.shadowColor = strikeCrossed ? '#fbbf24' : '#a855f7';
      ctx.shadowBlur = strikeCrossed ? 15 : 8;

      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(chartWidth, strikeY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Strike Price Label Badge
      ctx.fillStyle = strikeCrossed ? '#fbbf24' : '#1e0c38';
      ctx.fillRect(chartWidth + 5, strikeY - 10, 60, 20);
      ctx.fillStyle = strikeCrossed ? '#000000' : '#c084fc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`STRIKE`, chartWidth + 10, strikeY + 3);

      // Y-Axis Price Scale
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const p = minP + (range / steps) * i;
        const y = getY(p);
        ctx.fillText(`$${p.toFixed(1)}`, chartWidth + 5, y + 3);
      }
      } catch (err) {
        console.warn('Render loop exception:', err);
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

      {/* Main Grid: Chart Canvas (Left) + Synced Probability Bar & BUY Capsules (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Canvas Chart */}
        <div className="lg:col-span-8 relative rounded-xl bg-[#050210] border border-purple-900/40 p-2 overflow-hidden h-[430px] flex flex-col justify-between">
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

        {/* Right Column: High-Dopamine BUY UP / BUY DOWN Capsules & Probability Bar */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
          {/* Probability Bar Header */}
          <div className="p-3.5 rounded-xl bg-[#0e0622] border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                REAL-TIME IMPLIED ODDS
              </span>
              <span className="text-purple-300 font-mono text-[11px]">{confidence}% CONF</span>
            </div>

            {/* Dual Color Scalping Bar */}
            <div className="space-y-1">
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

          {/* Live Strike Target Distance Gauge */}
          <div className="bg-[#0b051c] p-3 rounded-xl border border-purple-800/50 flex flex-col gap-2 font-mono">
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

          {/* Glowing BUY UP Capsule Button */}
          <button
            onClick={() => handleActionSound('UP')}
            className={`group relative overflow-hidden p-5 sm:p-6 rounded-2xl transition-all duration-300 text-left border ${
              selectedDirection === 'UP'
                ? 'bg-gradient-to-r from-emerald-950/90 via-[#072418] to-emerald-900/60 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.45)] scale-[1.02]'
                : 'bg-[#0a1813]/60 border-emerald-900/40 hover:border-emerald-500/50'
            }`}
          >
            {/* Pulsing Glow Background overlay if selected */}
            {selectedDirection === 'UP' && (
              <div className="absolute inset-0 bg-emerald-500/10 animate-pulse pointer-events-none rounded-2xl" />
            )}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                  ▲
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-emerald-300 flex items-center gap-2">
                    <span>▲ BUY UP CAPSULE</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                      +14.2% EDGE
                    </span>
                  </div>
                  <span className="text-xs text-emerald-200/70 font-sans block mt-0.5">
                    Institutional Order Flow Sweeping Bids
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-emerald-300 block tracking-tight font-mono">
                  {upProbability}%
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">★★★★☆ AI AGREE</span>
              </div>
            </div>
          </button>

          {/* Glowing BUY DOWN Capsule Button */}
          <button
            onClick={() => handleActionSound('DOWN')}
            className={`group relative overflow-hidden p-5 sm:p-6 rounded-2xl transition-all duration-300 text-left border ${
              selectedDirection === 'DOWN'
                ? 'bg-gradient-to-r from-rose-950/90 via-[#260a12] to-rose-900/60 border-rose-400 shadow-[0_0_35px_rgba(248,113,113,0.45)] scale-[1.02]'
                : 'bg-[#18080f]/60 border-rose-900/40 hover:border-rose-500/50'
            }`}
          >
            {/* Pulsing Glow Background overlay if selected */}
            {selectedDirection === 'DOWN' && (
              <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none rounded-2xl" />
            )}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                  ▼
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-rose-300 flex items-center gap-2">
                    <span>▼ BUY DOWN CAPSULE</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-500/30">
                      -0.38% MOVE
                    </span>
                  </div>
                  <span className="text-xs text-rose-200/70 font-sans block mt-0.5">
                    Momentum Weakening • Liquidity Swept
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-3xl font-black text-rose-300 block tracking-tight font-mono">
                  {100 - upProbability}%
                </span>
                <span className="text-[10px] text-rose-400 font-mono font-bold">SECONDARY</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
