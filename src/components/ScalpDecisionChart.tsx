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
  Cpu,
  Waves,
} from 'lucide-react';
import { fetchApiSignal, fetchModelStatus, fetchCryptoTicker, ApiSignalResponse, ModelStatusResponse } from '../services/api';
import { playBuyUpSound, playBuyDownSound } from '../utils/audio';

interface ScalpDecisionChartProps {
  asset?: string;
  desk?: string;
  title?: string;
  selectedStrike?: number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyRatio: number;
}

const createRealisticCandles = (basePrice: number, count = 30, interval = 5000, stepScale = 7): Candle[] => {
  const result: Candle[] = [];
  const now = Date.now();
  let runningPrice = basePrice - (stepScale * 2.2);

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * interval;
    const isUp = Math.random() > 0.42;
    const delta = (Math.random() * stepScale + 1.2) * (isUp ? 1 : -1);
    const open = runningPrice;
    const close = i === 0 ? basePrice : open + delta;
    const high = Math.max(open, close) + Math.random() * (stepScale * 0.5) + 0.8;
    const low = Math.min(open, close) - (Math.random() * (stepScale * 0.5) + 0.8);
    const volume = Math.round(15 + Math.random() * 65);
    const takerBuyRatio = isUp ? 0.54 + Math.random() * 0.32 : 0.18 + Math.random() * 0.32;

    result.push({ time, open, high, low, close, volume, takerBuyRatio });
    runningPrice = close;
  }
  return result;
};

export const ScalpDecisionChart: React.FC<ScalpDecisionChartProps> = ({
  asset = 'BTC',
  desk = '15s',
  title,
  selectedStrike,
}) => {
  const is1Hour = desk === '1h';
  const defaultTitle = is1Hour
    ? '1-HOUR BTC QUANTITATIVE STRUCTURE & PROBABILITY CONE'
    : '15S ALPHA INTELLIGENCE MATRIX & PROBABILITY CONE';
  const effectiveTitle = title || defaultTitle;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const candleInterval = is1Hour ? 120000 : 5000;
  const candleStepScale = is1Hour ? 32 : 7;

  // Live Data & Candle State
  const [currentPrice, setCurrentPrice] = useState<number>(64160.5);
  const [candles, setCandles] = useState<Candle[]>(() => createRealisticCandles(64160.5, 30, candleInterval, candleStepScale));
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('CONNECTED');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  const [apiSignal, setApiSignal] = useState<ApiSignalResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  // Scalp Probability & Direction State
  const [upProbability, setUpProbability] = useState<number>(is1Hour ? 78 : 69);
  const [confidence, setConfidence] = useState<number>(is1Hour ? 92.4 : 91.6);
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN'>('UP');
  const [strikePrice, setStrikePrice] = useState<number>(selectedStrike || (is1Hour ? 64200.0 : 64150.0));
  const [strikeCrossed, setStrikeCrossed] = useState<boolean>(false);

  // Keep strike price aligned and bounded to current price
  useEffect(() => {
    if (selectedStrike && Number.isFinite(selectedStrike) && currentPrice > 100) {
      if (Math.abs(selectedStrike - currentPrice) / currentPrice < 0.05) {
        setStrikePrice(selectedStrike);
      } else {
        setStrikePrice(Math.round((currentPrice - 10) * 10) / 10);
      }
    }
  }, [selectedStrike, currentPrice]);

  // AI Probability Dynamics & Neural Timeline State
  const [momentumDelta, setMomentumDelta] = useState<string>(is1Hour ? '▲ +6.8% (15m)' : '▲ +3.4% (2m)');
  const [velocity, setVelocity] = useState<string>(is1Hour ? '+0.85% / 15m' : '+2.1% / min');
  const [momentumStatus, setMomentumStatus] = useState<string>(is1Hour ? 'Macro Trend Channel Intact' : 'High Conviction Impulse');
  
  const [probabilityTimeline, setProbabilityTimeline] = useState(
    is1Hour
      ? [
          { label: '-60m', value: 54, isUp: true },
          { label: '-45m', value: 66, isUp: true },
          { label: '-30m', value: 72, isUp: true },
          { label: '-15m', value: 79, isUp: true },
          { label: '-5m', value: 84, isUp: true },
          { label: 'Now', value: 88, isUp: true },
        ]
      : [
          { label: '-30m', value: 47, isUp: true },
          { label: '-15m', value: 59, isUp: true },
          { label: '-10m', value: 68, isUp: true },
          { label: '-5m', value: 61, isUp: false },
          { label: '-2m', value: 67, isUp: true },
          { label: 'Now', value: 69, isUp: true },
        ]
  );

  const [driverChips, setDriverChips] = useState(
    is1Hour
      ? [
          { label: '1H VWAP Anchor Supported ($64,138)', positive: true },
          { label: 'Macro Taker Sweep (+2,840 BTC)', positive: true },
          { label: 'Kalshi / Polymarket 1H Consensus', positive: true },
          { label: 'Multi-TF Supertrend Alignment', positive: true },
          { label: 'Liquidity Void at $64,350', positive: false },
        ]
      : [
          { label: 'Whale Taker Sweep (+1,420 BTC)', positive: true },
          { label: 'Net Taker Delta +$13.4M', positive: true },
          { label: 'Bid Wall Stacking ($64,145)', positive: true },
          { label: 'Microstructure Volatility High', positive: false },
          { label: 'Transient Resistance ($64,280)', positive: false },
        ]
  );

  const [convictionEvents, setConvictionEvents] = useState(
    is1Hour
      ? [
          { id: '1', type: 'up', change: '+5.4%', reason: '[ORDER FLOW] Institutional Whale Inflow +2,840 BTC', timeAgo: '3m ago' },
          { id: '2', type: 'up', change: '+4.1%', reason: '[STRIKE GAP] Spot +$39.50 Above $64,200 Strike', timeAgo: '8m ago' },
          { id: '3', type: 'up', change: '+3.2%', reason: '[VOLATILITY] 1H Squeeze Expansion • Low Drag', timeAgo: '18m ago' },
          { id: '4', type: 'up', change: '+2.8%', reason: '[CROSS-VENUE] Kalshi 72¢ / Poly 74¢ Arbitrage Consensus', timeAgo: '28m ago' },
        ]
      : [
          { id: '1', type: 'up', change: '+4.2%', reason: 'Large Whale Buy Wall Absorbed at $64,150', timeAgo: '12s ago' },
          { id: '2', type: 'down', change: '-2.8%', reason: 'Transient Resistance Hit at $64,210', timeAgo: '48s ago' },
          { id: '3', type: 'up', change: '+3.1%', reason: 'Orderbook Imbalance Ribbon Flipped Bullish', timeAgo: '1.5m ago' },
          { id: '4', type: 'up', change: '+1.9%', reason: 'Kalshi / Polymarket 15s Odds Alignment', timeAgo: '3m ago' },
        ]
  );

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

  // Connect live WebSocket & maintain live candles
  useEffect(() => {
    let isCancelled = false;

    fetchCryptoTicker(asset)
      .then((data) => {
        if (isCancelled || !data) return;
        const p = data.price || 64160.50;
        setCurrentPrice(p);
        setStrikePrice(Math.round((p - 10) * 10) / 10);
        setCandles(createRealisticCandles(p, 30));
      })
      .catch(() => {
        if (!isCancelled) {
          setCurrentPrice(64160.50);
          setStrikePrice(64150.50);
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
            const isBuyer = !trade.m;
            const qty = parseFloat(trade.q || '0.1');

            setCurrentPrice(p);

            setCandles((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1];
              const now = Date.now();
              const isNewBar = now - last.time > 5000;

              if (isNewBar) {
                const newCandle: Candle = {
                  time: now,
                  open: p,
                  high: p,
                  low: p,
                  close: p,
                  volume: Math.round(qty),
                  takerBuyRatio: isBuyer ? 0.8 : 0.2,
                };
                return [...prev.slice(1), newCandle];
              } else {
                const updated: Candle = {
                  ...last,
                  high: Math.max(last.high, p),
                  low: Math.min(last.low, p),
                  close: p,
                  volume: last.volume + Math.round(qty),
                  takerBuyRatio: isBuyer
                    ? Math.min(1, last.takerBuyRatio + 0.05)
                    : Math.max(0, last.takerBuyRatio - 0.05),
                };
                return [...prev.slice(0, -1), updated];
              }
            });
          }
        } catch (e) {
          // ignore parsing error
        }
      };
    } catch (e) {
      console.warn('WS Init failed', e);
    }

    return () => {
      isCancelled = true;
      if (ws) ws.close();
    };
  }, [binanceSymbol, asset]);

  // Audio trigger
  const handleActionSound = (direction: 'UP' | 'DOWN') => {
    setSelectedDirection(direction);
    if (audioEnabled) {
      if (direction === 'UP') playBuyUpSound();
      else playBuyDownSound();
    }
  };

  // Canvas Rendering Loop
  useEffect(() => {
    let animId: number;

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

      // 1. Dark Institutional Background
      ctx.fillStyle = '#05020F';
      ctx.fillRect(0, 0, width, height);

      // Subtle ambient radiant glow behind price action
      const auraGrad = ctx.createRadialGradient(
        width * 0.55, height * 0.45, 10,
        width * 0.55, height * 0.45, width * 0.6
      );
      auraGrad.addColorStop(0, upProbability >= 50 ? 'rgba(0, 255, 136, 0.06)' : 'rgba(255, 59, 48, 0.06)');
      auraGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)');
      auraGrad.addColorStop(1, 'rgba(5, 2, 15, 0)');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.10)';
      ctx.lineWidth = 1;
      const gridRows = 5;
      for (let i = 1; i < gridRows; i++) {
        const y = (height / gridRows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width - 70, y);
        ctx.stroke();
      }

      const validCandles = candles.filter(
        (c) => c && typeof c.low === 'number' && typeof c.high === 'number' && c.low > 100 && c.high > 100 && !isNaN(c.close)
      );

      if (validCandles.length < 2) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // Price Scaling Calculation
      let rawMinP = Math.min(...validCandles.map((c) => c.low));
      let rawMaxP = Math.max(...validCandles.map((c) => c.high));

      if (currentPrice > 100) {
        rawMinP = Math.min(rawMinP, currentPrice);
        rawMaxP = Math.max(rawMaxP, currentPrice);
      }

      // Only include strike price in scale bounds if it is within 2.5% of current price
      if (strikePrice > 100 && currentPrice > 100) {
        const diffRatio = Math.abs(strikePrice - currentPrice) / currentPrice;
        if (diffRatio <= 0.025) {
          rawMinP = Math.min(rawMinP, strikePrice);
          rawMaxP = Math.max(rawMaxP, strikePrice);
        }
      }

      let priceSpan = rawMaxP - rawMinP;
      const minSpan = is1Hour ? 60 : 20;
      if (priceSpan < minSpan) {
        const mid = (rawMaxP + rawMinP) / 2;
        rawMinP = mid - minSpan / 2;
        rawMaxP = mid + minSpan / 2;
        priceSpan = minSpan;
      }

      const pad = priceSpan * 0.15;
      const minP = rawMinP - pad;
      const maxP = rawMaxP + pad;
      const totalRange = maxP - minP || 10;

      const chartWidth = width - 75;
      const candleWidth = chartWidth / validCandles.length;

      const getY = (price: number) => {
        const clampedPrice = Math.max(minP, Math.min(maxP, price));
        return height - 32 - ((clampedPrice - minP) / totalRange) * (height - 65);
      };

      // 2. Volume Bars at Bottom (Taker Buy vs Taker Sell alpha)
      const maxVol = Math.max(...validCandles.map((c) => c.volume)) || 1;
      const volAreaHeight = 36;
      validCandles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const isUp = c.close >= c.open;
        const vHeight = (c.volume / maxVol) * volAreaHeight;
        const vY = height - vHeight - 16;
        const bodyW = Math.max(2.5, candleWidth * 0.6);

        ctx.fillStyle = isUp ? 'rgba(0, 255, 136, 0.28)' : 'rgba(255, 59, 48, 0.28)';
        ctx.fillRect(x - bodyW / 2, vY, bodyW, vHeight);
      });

      // 3. AI Momentum Neural Ribbon under candles
      const ribbonPoints: { x: number; y: number }[] = [];
      validCandles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const y = getY((c.open + c.close) / 2);
        ribbonPoints.push({ x, y });
      });

      if (ribbonPoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(ribbonPoints[0].x, ribbonPoints[0].y);

        for (let i = 1; i < ribbonPoints.length - 1; i++) {
          const xc = (ribbonPoints[i].x + ribbonPoints[i + 1].x) / 2;
          const yc = (ribbonPoints[i].y + ribbonPoints[i + 1].y) / 2;
          ctx.quadraticCurveTo(ribbonPoints[i].x, ribbonPoints[i].y, xc, yc);
        }

        ctx.lineWidth = 4.5;
        const ribbonGrad = ctx.createLinearGradient(0, 0, width, 0);
        if (upProbability >= 50) {
          ribbonGrad.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
          ribbonGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.65)');
          ribbonGrad.addColorStop(1, 'rgba(0, 255, 136, 0.85)');
        } else {
          ribbonGrad.addColorStop(0, 'rgba(255, 59, 48, 0.15)');
          ribbonGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.65)');
          ribbonGrad.addColorStop(1, 'rgba(255, 59, 48, 0.85)');
        }
        ctx.strokeStyle = ribbonGrad;
        ctx.shadowColor = upProbability >= 50 ? '#00FF88' : '#FF3B30';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 4. Forward Probability Cone Projection
      const lastCandle = validCandles[validCandles.length - 1];
      const lastX = (validCandles.length - 1) * candleWidth + candleWidth / 2;
      const lastY = getY(lastCandle.close);
      const coneWidth = 72;
      const upperY = getY(lastCandle.close + (upProbability / 100) * (is1Hour ? 45 : 18));
      const lowerY = getY(lastCandle.close - ((100 - upProbability) / 100) * (is1Hour ? 45 : 18));
      const midY = (upperY + lowerY) / 2;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, upperY);
      ctx.lineTo(lastX + coneWidth, lowerY);
      ctx.closePath();

      const coneGrad = ctx.createLinearGradient(lastX, 0, lastX + coneWidth, 0);
      if (upProbability >= 50) {
        coneGrad.addColorStop(0, 'rgba(0, 255, 136, 0.28)');
        coneGrad.addColorStop(0.6, 'rgba(34, 211, 238, 0.15)');
        coneGrad.addColorStop(1, 'rgba(168, 85, 247, 0.02)');
      } else {
        coneGrad.addColorStop(0, 'rgba(255, 59, 48, 0.28)');
        coneGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.15)');
        coneGrad.addColorStop(1, 'rgba(244, 63, 94, 0.02)');
      }
      ctx.fillStyle = coneGrad;
      ctx.fill();

      // Cone Dashed Trajectory
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = upProbability >= 50 ? 'rgba(0, 255, 136, 0.7)' : 'rgba(255, 59, 48, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, upperY);
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, lowerY);
      ctx.stroke();

      // Vector Target Line
      ctx.strokeStyle = upProbability >= 50 ? '#00FF88' : '#FF3B30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + coneWidth, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target Marker Pill on Projected Vector
      ctx.fillStyle = upProbability >= 50 ? '#063826' : '#3d0a14';
      ctx.strokeStyle = upProbability >= 50 ? '#00FF88' : '#FF3B30';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(lastX + coneWidth - 4, midY - 10, 56, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = upProbability >= 50 ? '#00FF88' : '#FF3B30';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(`${upProbability}% CONE`, lastX + coneWidth, midY + 3);

      // 5. Render High-Definition OHLC Candlesticks with Vivid Radiant Glow
      validCandles.forEach((c, i) => {
        const x = i * candleWidth + candleWidth / 2;
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        const isUp = c.close >= c.open;
        const color = isUp ? '#00FF88' : '#FF3B30';
        const glowColor = isUp ? 'rgba(0, 255, 136, 0.9)' : 'rgba(255, 59, 48, 0.9)';

        // High-Low Wick with Neon Glow
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Candle Body with Radiant Neon Aura
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2.5, Math.abs(openY - closeY));
        const bodyW = Math.max(4, candleWidth * 0.68);

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyHeight);
        ctx.shadowBlur = 0; // reset shadow for next elements

        // Entry Marker on Breakthrough Bars
        const isBreakout = isUp && i >= 5 && c.close > Math.max(...validCandles.slice(i - 5, i).map((x) => x.high));
        if (isBreakout && i !== validCandles.length - 1) {
          ctx.fillStyle = '#00FF88';
          ctx.beginPath();
          ctx.arc(x, lowY + 6, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#062b1e';
          ctx.strokeStyle = '#00FF88';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x - 28, lowY + 12, 56, 14, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#00FF88';
          ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`▲ ENTRY`, x, lowY + 22);
          ctx.textAlign = 'left';
        }
      });

      // 6. Latest Live Spot Pulsing Node
      ctx.beginPath();
      ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
      ctx.fillStyle = upProbability >= 50 ? 'rgba(0, 255, 136, 0.35)' : 'rgba(255, 59, 48, 0.35)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 7. Dashed Strike Target Line
      const strikeY = getY(strikePrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(chartWidth, strikeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Strike Badge
      ctx.fillStyle = '#170b2e';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(chartWidth + 3, strikeY - 9, 68, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.fillText(`STRIKE`, chartWidth + 7, strikeY + 3);

      // 8. Right-Hand Price Scale Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 9px "JetBrains Mono", monospace';
      const steps = 5;
      for (let s = 0; s <= steps; s++) {
        const pVal = minP + (totalRange / steps) * s;
        const pY = getY(pVal);
        ctx.fillText(`$${pVal.toFixed(1)}`, chartWidth + 6, pY + 3);
      }

      // 9. Time Axis Labels at Bottom
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      const timeLabels = is1Hour
        ? ['-60m', '-45m', '-30m', '-15m', 'NOW']
        : ['-2m', '-1m30s', '-1m', '-30s', 'NOW'];
      const timeStepX = chartWidth / (timeLabels.length - 1);
      timeLabels.forEach((lbl, idx) => {
        ctx.fillText(lbl, idx * timeStepX + 4, height - 4);
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [candles, currentPrice, strikePrice, upProbability, is1Hour]);

  // SVG Area path generator for Neural Sparkline
  const { lineD, areaD } = useMemo(() => {
    if (!probabilityTimeline || probabilityTimeline.length === 0) return { lineD: '', areaD: '' };
    const maxVal = 100;
    const minVal = 0;
    const points = probabilityTimeline.map((item, idx) => {
      const x = (idx / (probabilityTimeline.length - 1)) * 100;
      const y = 35 - ((item.value - minVal) / (maxVal - minVal)) * 30;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `${linePath} L 100,38 L 0,38 Z`;
    return { lineD: linePath, areaD: areaPath };
  }, [probabilityTimeline]);

  return (
    <div className="space-y-4 font-mono text-gray-200">
      
      {/* 1. TOP HEADER: 15S or 1H QUANTITATIVE ENGINE WITH AURA GLOW */}
      <div className="bg-gradient-to-r from-[#14082e] via-[#0e0521] to-[#080214] border border-purple-500/40 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_35px_rgba(168,85,247,0.22)] relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/25 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Zap className="w-5 h-5 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-black text-white tracking-wider font-sans uppercase">
                {is1Hour ? '1-HOUR QUANTITATIVE STRUCTURE & PROBABILITY CONE' : '15S ALPHA INTELLIGENCE ENGINE'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                is1Hour
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                  : 'bg-emerald-500/20 border-emerald-400/40 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)]'
              }`}>
                {is1Hour ? '● 60-MIN MACRO STREAM' : '● SUB-SECOND STREAM'}
              </span>
            </div>
            <p className="text-[10px] text-purple-300/80 font-sans mt-0.5">
              {is1Hour
                ? 'MULTI-TIMEFRAME STRUCTURED PREDICTION INTELLIGENCE & VOLATILITY CONES'
                : 'HIGH-FREQUENCY SHORT-HORIZON PROBABILISTIC DECISION INTELLIGENCE'}
            </p>
          </div>
        </div>

        {/* Live Spot Metric & Audio Toggle */}
        <div className="flex items-center space-x-2.5 relative z-10">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#080414]/90 border border-purple-500/40 text-[11px] flex items-center space-x-2 shadow-inner">
            <span className="text-purple-300 font-semibold">SPOT PRICE:</span>
            <span className="font-black text-white font-mono text-xs sm:text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              ${currentPrice.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-purple-950/80 border-purple-400/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
            title="Toggle Audio Feedback"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. VISUAL CENTERPIECE: CANDLESTICK & PROBABILITY CONE CHART WITH AURA */}
      <div className="bg-[#0C0819]/95 border border-purple-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_35px_rgba(168,85,247,0.18)] space-y-3.5 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between text-xs border-b border-purple-900/40 pb-2.5 gap-2">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white text-xs tracking-wider uppercase">
              {is1Hour ? `${asset}/USD 1-HOUR STRUCTURE MATRIX` : `${asset}/USD 15S LIVE CANDLESTICK MATRIX`}
            </span>
            <span className="text-[9px] text-purple-400 font-mono">
              • {is1Hour ? '2M BAR RESOLUTION' : '5S TICK INTERVAL'}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-mono">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
              <span className="text-emerald-300">TAKER BUY</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] shadow-[0_0_6px_#FF3B30]" />
              <span className="text-rose-300">TAKER SELL</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <span className="text-cyan-300">AI CONE</span>
            </span>
          </div>
        </div>

        {/* Canvas Visualizer Frame with Glowing Border */}
        <div className="relative rounded-2xl bg-[#05020F] border border-purple-500/30 p-2 overflow-hidden h-[340px] sm:h-[380px] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
          <div ref={containerRef} className="w-full h-full relative">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Overlaid Active Indicators */}
            <div className="absolute top-2 left-2 flex items-center space-x-2 bg-[#0C0819]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-purple-500/40 text-[10px] shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <Radio className="w-3 h-3 text-[#00FF88] animate-pulse" />
              <span className="text-gray-300 font-bold">PROJECTED CONE:</span>
              <span className="text-cyan-300 font-black">{upProbability}% BULLISH</span>
            </div>

            <div className="absolute top-2 right-2 bg-[#0C0819]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-purple-500/40 text-[10px] text-purple-300 font-mono shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              CONFIDENCE: <strong className="text-white">{confidence}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLEAN PROBABILITY BAR (CLEARLY LABELED) */}
      <div className="bg-[#0C0819]/95 border border-purple-500/40 rounded-3xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] space-y-2.5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-white tracking-wider uppercase text-xs sm:text-sm">
              {is1Hour ? '1-HOUR PROBABILISTIC INFERENCE' : '15-SECOND PROBABILISTIC INFERENCE'}
            </span>
          </div>
          <span className="text-[9.5px] text-purple-300/80 font-sans italic">
            {is1Hour
              ? 'Multi-timeframe 60-minute quantitative trajectory'
              : 'Continuous short-horizon analytical stream (independent of 15M canonical lock)'}
          </span>
        </div>

        {/* Clean High-Contrast Bar Display */}
        <div className="grid grid-cols-2 gap-3 text-center my-1">
          <div className="bg-[#080414] py-2 px-3 rounded-2xl border border-emerald-500/50 shadow-[0_0_15px_rgba(0,255,136,0.15)] flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 flex items-center space-x-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>BUY UP</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#00FF88] font-mono drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
              {upProbability}%
            </span>
          </div>

          <div className="bg-[#080414] py-2 px-3 rounded-2xl border border-rose-500/50 shadow-[0_0_15px_rgba(255,59,48,0.15)] flex items-center justify-between">
            <span className="text-xs font-black text-rose-400 flex items-center space-x-1">
              <ArrowDownRight className="w-4 h-4" />
              <span>BUY DOWN</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#FF3B30] font-mono drop-shadow-[0_0_10px_rgba(255,59,48,0.5)]">
              {100 - upProbability}%
            </span>
          </div>
        </div>

        {/* Progress Bar Strip */}
        <div className="h-3.5 w-full bg-[#080414] rounded-full overflow-hidden p-0.5 border border-purple-500/40 flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#00FF88] rounded-l-full transition-all duration-300 shadow-[0_0_12px_rgba(0,255,136,0.8)]"
            style={{ width: `${upProbability}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-[#FF3B30] rounded-r-full transition-all duration-300 shadow-[0_0_12px_rgba(255,59,48,0.8)]"
            style={{ width: `${100 - upProbability}%` }}
          />
        </div>
      </div>

      {/* 4. PROBABILITY INTELLIGENCE CAPSULES (BUY UP & BUY DOWN CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* BUY UP CAPSULE */}
        <button
          onClick={() => handleActionSound('UP')}
          className={`p-5 rounded-3xl text-left border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
            selectedDirection === 'UP'
              ? 'bg-gradient-to-br from-[#081F15]/95 via-[#0D0A20]/95 to-[#06030D]/95 border-emerald-400 shadow-[0_0_35px_rgba(0,255,136,0.35)] scale-[1.01]'
              : 'bg-[#080414] border-purple-900/40 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-[#00FF88] border border-emerald-400/40 flex items-center justify-center font-black text-lg">
                ▲
              </div>
              <div>
                <span className="text-xs font-black text-emerald-300 tracking-wider block uppercase">BUY UP CAPSULE</span>
                <span className="text-[9px] text-gray-400 font-sans">PROBABILITY INTELLIGENCE</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-[#00FF88] font-mono block leading-none">
                {upProbability}%
              </span>
              <span className="text-[9px] text-emerald-400 font-bold">PRIMARY EDGE</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] bg-[#05020F] p-3 rounded-2xl border border-purple-900/30">
            <div className="flex justify-between">
              <span className="text-gray-400">EXPECTED EDGE:</span>
              <span className="text-[#00FF88] font-bold">+14.2% Net Edge</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">CATALYST REASON:</span>
              <span className="text-white font-medium truncate max-w-[200px]">Taker Absorption & Bid Support Inflow</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">MARKET CONDITION:</span>
              <span className="text-cyan-300 font-bold">Micro-Structure: Bullish Impulse Expansion</span>
            </div>
          </div>
        </button>

        {/* BUY DOWN CAPSULE */}
        <button
          onClick={() => handleActionSound('DOWN')}
          className={`p-5 rounded-3xl text-left border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
            selectedDirection === 'DOWN'
              ? 'bg-gradient-to-br from-[#240A13]/95 via-[#0D0A20]/95 to-[#06030D]/95 border-rose-400 shadow-[0_0_35px_rgba(255,59,48,0.35)] scale-[1.01]'
              : 'bg-[#080414] border-purple-900/40 hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-[#FF3B30] border border-rose-400/40 flex items-center justify-center font-black text-lg">
                ▼
              </div>
              <div>
                <span className="text-xs font-black text-rose-300 tracking-wider block uppercase">BUY DOWN CAPSULE</span>
                <span className="text-[9px] text-gray-400 font-sans">PROBABILITY INTELLIGENCE</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-[#FF3B30] font-mono block leading-none">
                {100 - upProbability}%
              </span>
              <span className="text-[9px] text-rose-400 font-bold">SECONDARY EDGE</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] bg-[#05020F] p-3 rounded-2xl border border-purple-900/30">
            <div className="flex justify-between">
              <span className="text-gray-400">EXPECTED EDGE:</span>
              <span className="text-amber-400 font-bold">-0.38% Net Move</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">CATALYST REASON:</span>
              <span className="text-white font-medium truncate max-w-[200px]">Resistance Ceiling & Liquidity Swept</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">MARKET CONDITION:</span>
              <span className="text-amber-300 font-bold">Micro-Structure: Exhaustion Sweep</span>
            </div>
          </div>
        </button>

      </div>

      {/* 5. AI CONVICTION TIMELINE & LIVE NEURAL SIGNAL HISTORY */}
      <div className="bg-[#0C0819] border border-purple-900/40 rounded-3xl p-5 shadow-[0_0_25px_rgba(0,0,0,0.5)] space-y-4">
        
        {/* Module Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-purple-900/30 pb-3 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase font-sans">
                AI CONVICTION TIMELINE & NEURAL SIGNAL HISTORY
              </h3>
              <p className="text-[10px] text-gray-400 font-sans">
                Dynamic tracking of AI conviction velocity, probability inflections, and driver chips.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <div className="px-3 py-1 rounded-xl bg-[#080414] border border-emerald-500/40 text-[10px]">
              <span className="text-gray-400">VELOCITY: </span>
              <span className="text-[#00FF88] font-black">{velocity}</span>
            </div>
            <div className="px-3 py-1 rounded-xl bg-[#080414] border border-cyan-500/40 text-[10px]">
              <span className="text-gray-400">SWING (2M): </span>
              <span className="text-cyan-300 font-black">{momentumDelta}</span>
            </div>
          </div>
        </div>

        {/* Neural Timeline Graph + Catalyst Chips */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left: Sparkline Curve & Step Nodes (7 cols) */}
          <div className="lg:col-span-7 bg-[#080414] p-4 rounded-2xl border border-purple-900/30 space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-purple-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>NEURAL PROBABILITY STEPS (30M HORIZON)</span>
              </span>
              <span className="text-[#00FF88] font-mono">CURRENT: {upProbability}% BULLISH</span>
            </div>

            {/* Sparkline Canvas / SVG */}
            <div className="relative pt-2 pb-1 h-24 w-full">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                <defs>
                  <linearGradient id="neuralGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF88" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00FF88" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaD} fill="url(#neuralGrad)" />
                <path d={lineD} fill="none" stroke="#00FF88" strokeWidth="2.2" strokeLinecap="round" />
              </svg>

              {/* Step Nodes Overlay */}
              <div className="absolute inset-0 flex justify-between items-end px-1 pointer-events-none font-mono">
                {probabilityTimeline.map((pt, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 relative z-10">
                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      pt.label === 'Now'
                        ? 'bg-[#00FF88] text-black animate-pulse shadow-[0_0_10px_rgba(0,255,136,0.6)]'
                        : pt.isUp
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                        : 'bg-rose-950 text-rose-300 border border-rose-800/80'
                    }`}>
                      {pt.value}%
                    </div>
                    <div className={`w-2 h-2 rounded-full border ${
                      pt.label === 'Now' ? 'bg-[#00FF88] border-white ring-2 ring-emerald-500/40' : 'bg-[#080318] border-purple-400'
                    }`} />
                    <span className="text-[9px] text-gray-400">{pt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Catalyst Chips */}
            <div className="pt-2 border-t border-purple-900/30 space-y-1.5">
              <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider block">
                CONVICTION CATALYST CHIPS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {driverChips.map((chip, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold flex items-center space-x-1 border ${
                      chip.positive
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {chip.positive ? <Plus className="w-2.5 h-2.5 text-emerald-400" /> : <Minus className="w-2.5 h-2.5 text-rose-400" />}
                    <span>{chip.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Conviction Events Stream (5 cols) */}
          <div className="lg:col-span-5 bg-[#080414] p-4 rounded-2xl border border-purple-900/30 space-y-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-purple-300 flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-purple-400" />
                <span>RECENT CONVICTION EVENTS</span>
              </span>
              <span className="text-[#00FF88] text-[9px]">LIVE FEED</span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {convictionEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2 rounded-xl bg-[#0C0819] border border-purple-900/30 flex items-center justify-between text-[10px] font-mono"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full ${evt.type === 'up' ? 'bg-[#00FF88] animate-ping' : 'bg-[#FF3B30]'}`} />
                    <span className={`font-black px-1.5 py-0.5 rounded text-[8.5px] ${
                      evt.type === 'up' ? 'bg-emerald-950 text-[#00FF88] border border-emerald-800' : 'bg-rose-950 text-[#FF3B30] border border-rose-800'
                    }`}>
                      {evt.change}
                    </span>
                    <span className="text-gray-300 truncate max-w-[150px]">{evt.reason}</span>
                  </div>
                  <span className="text-[8.5px] text-gray-500 shrink-0 ml-1.5">{evt.timeAgo}</span>
                </div>
              ))}
            </div>

            <div className="text-[8.5px] text-gray-500 pt-1.5 border-t border-purple-900/30 font-sans">
              Neural feedback loop updates probability state in real-time as microstructure shifts.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
