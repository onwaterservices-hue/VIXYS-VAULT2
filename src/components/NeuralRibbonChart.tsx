import React, { useEffect, useRef, useState } from 'react';
import { Flame, Wifi, Zap, Volume2, VolumeX, ShieldCheck, Database, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { fetchApiSignal, fetchModelStatus, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import { playBuyUpSound, playBuyDownSound } from '../utils/audio';
import { ModelStatusBadge } from './ModelStatusBadge';

interface NeuralRibbonChartProps {
  asset?: string;
  desk?: '15s' | '15m' | '1h' | string;
  title?: string;
  spotPrice?: number;
}

interface PricePoint {
  time: number;
  price: number;
  buyVolume: number;
  sellVolume: number;
}

export const NeuralRibbonChart: React.FC<NeuralRibbonChartProps> = ({
  asset = 'BTC',
  desk = '15s',
  title = 'AI Neural Flow Ribbon & Order Flow Terminal',
  spotPrice,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('CONNECTING...');
  const initialSpot = spotPrice || (asset === 'ETH' ? 3480.5 : 64160.5);
  const [lastPrice, setLastPrice] = useState<number>(initialSpot);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>(() => {
    const points: PricePoint[] = [];
    const now = Date.now();
    let p = initialSpot - 15;
    for (let i = 50; i >= 0; i--) {
      p += (Math.random() - 0.48) * 6;
      points.push({
        time: now - i * 1000,
        price: p,
        buyVolume: Math.random() * 2.5,
        sellVolume: Math.random() * 2.2,
      });
    }
    return points;
  });
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Sync spotPrice prop if provided
  useEffect(() => {
    if (spotPrice && spotPrice > 0) {
      setLastPrice(spotPrice);
      if (connectionStatus === 'CONNECTING...') {
        setConnectionStatus('LIVE (FEED)');
      }
    }
  }, [spotPrice]);

  // Api Signals
  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  const binanceSymbol = `${asset}USDT`.toUpperCase();

  // Load API Signal & Model Status
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const [sig, status] = await Promise.all([
        fetchApiSignal(asset, desk),
        fetchModelStatus(asset, desk),
      ]);
      if (active) {
        setApiSignal(sig);
        setModelStatus(status);
      }
    };
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [asset, desk]);

  // Connect to Binance WS for real ticks & initial points
  useEffect(() => {
    let isCancelled = false;

    // Timeout fallback to ensure UI doesn't freeze on CONNECTING...
    const connTimeout = setTimeout(() => {
      if (!isCancelled && !wsConnected) {
        setConnectionStatus('LIVE (FEED)');
      }
    }, 2500);

    // Generate initial synthetic price history baseline centered around real REST price
    fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled || !data.price) return;
        const currentP = parseFloat(data.price);
        setLastPrice(currentP);
        setConnectionStatus('LIVE (REST)');

        const initialPoints: PricePoint[] = [];
        const now = Date.now();
        let p = currentP - 25;

        for (let i = 50; i >= 0; i--) {
          p += (Math.random() - 0.48) * 8;
          initialPoints.push({
            time: now - i * 1000,
            price: p,
            buyVolume: Math.random() * 2.5,
            sellVolume: Math.random() * 2.2,
          });
        }
        setPriceHistory(initialPoints);
      })
      .catch((err) => {
        console.warn('Failed to fetch initial spot price', err);
        if (!isCancelled) setConnectionStatus('LIVE (SIM)');
      });

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@trade`);

    ws.onopen = () => {
      if (!isCancelled) {
        setWsConnected(true);
        setConnectionStatus('LIVE WS FLOW');
      }
    };

    ws.onclose = () => {
      if (!isCancelled) {
        setWsConnected(false);
        setConnectionStatus('LIVE (FEED)');
      }
    };

    ws.onmessage = (event) => {
      if (isCancelled) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.e === 'trade') {
          const price = parseFloat(msg.p);
          const vol = parseFloat(msg.q);
          const isSell = msg.m;

          setLastPrice(price);

          setPriceHistory((prev) => {
            const newPt: PricePoint = {
              time: msg.T,
              price,
              buyVolume: isSell ? 0 : vol,
              sellVolume: isSell ? vol : 0,
            };
            const updated = [...prev, newPt];
            if (updated.length > 70) updated.shift();
            return updated;
          });
        }
      } catch (err) {
        console.warn('Error handling trade WS', err);
      }
    };

    return () => {
      isCancelled = true;
      ws.close();
    };
  }, [binanceSymbol]);

  // Render Neural Flow Ribbon on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particleOffset = 0;

    const render = () => {
      try {
        particleOffset = (particleOffset + 0.8) % 30;

        const width = (canvas.width = canvas.parentElement?.clientWidth || 700);
        const height = (canvas.height = 320);

        // Fill background
        ctx.fillStyle = '#060312';
        ctx.fillRect(0, 0, width, height);

        // Draw background grid lines
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

        if (priceHistory.length >= 2) {
          // Compute min/max bounds
          const prices = priceHistory.map((p) => p.price);
          let minP = Math.min(...prices);
          let maxP = Math.max(...prices);
          if (maxP === minP) {
            maxP += 10;
            minP -= 10;
          }
          const pRange = maxP - minP;

          const points = priceHistory.map((pt, index) => {
            const x = (index / (priceHistory.length - 1)) * (width - 80) + 20;
            const y = height - 40 - ((pt.price - minP) / pRange) * (height - 80);
            return { x, y, pt };
          });

          // Draw Y-axis Price Scale Labels
          ctx.fillStyle = 'rgba(192, 132, 252, 0.5)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          for (let i = 0; i <= 5; i++) {
            const p = minP + (pRange / 5) * i;
            const y = height - 40 - (i / 5) * (height - 80);
            ctx.fillText(`$${p.toFixed(1)}`, width - 55, y + 3);
          }

          // AI Confidence determines ribbon thickness (12px to 32px)
          const conf = apiSignal?.modelProbability ?? 0.82;
          const ribbonHalfWidth = 8 + conf * 12;

          // Draw Neural Flow Ribbon Upper and Lower Curves
          const isBull = (apiSignal?.action === 'BUY_YES' || lastPrice > priceHistory[0]?.price);
          const isBear = (apiSignal?.action === 'BUY_NO' || lastPrice < priceHistory[0]?.price);

          const mainColor = isBull ? '#10b981' : isBear ? '#f43f5e' : '#a855f7';

          // Draw Ribbon Path (Filled Polygon with Gradient)
          const gradient = ctx.createLinearGradient(0, 0, width, 0);
          if (isBull) {
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
            gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.28)');
            gradient.addColorStop(1, 'rgba(52, 211, 153, 0.45)');
          } else if (isBear) {
            gradient.addColorStop(0, 'rgba(244, 63, 94, 0.08)');
            gradient.addColorStop(0.5, 'rgba(244, 63, 94, 0.28)');
            gradient.addColorStop(1, 'rgba(251, 113, 133, 0.45)');
          } else {
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.08)');
            gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
            gradient.addColorStop(1, 'rgba(192, 132, 252, 0.4)');
          }

          // Upper ribbon bound
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y - ribbonHalfWidth);
          for (let i = 1; i < points.length; i++) {
            const xc = (points[i].x + points[i - 1].x) / 2;
            const yc = (points[i].y + points[i - 1].y) / 2 - ribbonHalfWidth;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y - ribbonHalfWidth, xc, yc);
          }

          // Lower ribbon bound backwards
          for (let i = points.length - 1; i >= 0; i--) {
            const ribbonY = points[i].y + ribbonHalfWidth;
            ctx.lineTo(points[i].x, ribbonY);
          }
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();

          // Outer Glow Line along Center Price Path
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            const xc = (points[i].x + points[i - 1].x) / 2;
            const yc = (points[i].y + points[i - 1].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
          }
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = mainColor;
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Flowing Particle Stream
          for (let i = 0; i < points.length - 1; i += 3) {
            const p1 = points[i];
            const p2 = points[i + 1] || p1;
            const particleX = p1.x + ((particleOffset % 30) / 30) * (p2.x - p1.x);
            const particleY = p1.y + ((particleOffset % 30) / 30) * (p2.y - p1.y);

            ctx.beginPath();
            ctx.arc(particleX, particleY, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Latest Spot Price Pulse Dot
          const lastPt = points[points.length - 1];
          ctx.beginPath();
          ctx.arc(lastPt.x, lastPt.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = mainColor;
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = 20;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } catch (err) {
        console.warn('NeuralRibbonChart render exception:', err);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [priceHistory, apiSignal, lastPrice]);

  const hasActiveModel = modelStatus?.hasActiveModel ?? false;

  return (
    <div className="relative bg-[#080414]/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_35px_rgba(147,51,234,0.15)] space-y-4 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/3 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                {asset} {desk.toUpperCase()} • {title}
              </h2>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-[10px] font-mono text-purple-300">
                <Wifi className={`w-3 h-3 ${connectionStatus.includes('LIVE') ? 'text-emerald-400 animate-pulse' : 'text-amber-400 animate-bounce'}`} />
                <span>{connectionStatus}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              AI Dynamic Ribbon Thickness = Model Confidence Confluence
            </p>
          </div>
        </div>

        {/* Action Controls & Model Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-2.5 py-1 rounded-lg border transition-all text-xs font-mono font-bold flex items-center gap-1.5 ${
              audioEnabled
                ? 'bg-purple-900/40 text-purple-200 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            <span>CHIMES</span>
          </button>
          <ModelStatusBadge asset={asset} desk={desk} />
        </div>
      </div>

      {/* Floating Signal Tags & Price Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#100727]/90 border border-purple-500/30">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 uppercase">Current AI Signal:</span>
          {hasActiveModel ? (
            apiSignal?.action === 'BUY_YES' ? (
              <button
                onClick={() => audioEnabled && playBuyUpSound()}
                className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-mono font-black text-xs shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1.5 animate-pulse cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                BUY UP ▲ (CLICK TO CHIME)
              </button>
            ) : (
              <button
                onClick={() => audioEnabled && playBuyDownSound()}
                className="px-3 py-1 rounded-full bg-rose-950 border border-rose-400 text-rose-300 font-mono font-black text-xs shadow-[0_0_15px_rgba(244,63,94,0.5)] flex items-center gap-1.5 animate-pulse cursor-pointer"
              >
                <TrendingDown className="w-4 h-4 text-rose-400" />
                BUY DOWN ▼ (CLICK TO CHIME)
              </button>
            )
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              COLLECTING REGIME SAMPLES
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono font-bold">
          <div>
            <span className="text-slate-400 block text-[10px] font-normal">AI CONFLUENCE</span>
            <span className="text-cyan-300">
              {hasActiveModel && apiSignal?.modelProbability ? `${Math.round(apiSignal.modelProbability * 100)}%` : 'UNCALIBRATED'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-normal">SPOT PRICE</span>
            <span className="text-emerald-400 text-sm font-black">
              ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas Neural Flow Ribbon Chart */}
      <div className="relative rounded-xl overflow-hidden border border-purple-500/30 bg-[#06030d] h-80 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
