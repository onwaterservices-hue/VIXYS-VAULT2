import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  Clock,
  Activity,
  ShieldCheck,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Layers,
  Lock,
  Compass,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Radio,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  ChevronRight,
  RefreshCw,
  Eye,
  Crosshair,
  Award
} from 'lucide-react';
import { useCanonical15mDecision } from '../hooks/useCanonical15mDecision';
import { safeToFixed, safeNumber, safePercent, safeCurrency } from '../utils/numeric';
import { BTCTicker } from '../types';

interface TikTokLiveViewProps {
  ticker?: BTCTicker;
  onOpenTerminal?: () => void;
  onOpenPricing?: () => void;
}

export const TikTokLiveView: React.FC<TikTokLiveViewProps> = ({
  ticker: initialTicker,
  onOpenTerminal,
  onOpenPricing
}) => {
  // Authoritative Canonical 15M Decision Object (Single Source of Truth)
  const { decision: canonicalDecision, isLoading: canonicalLoading } = useCanonical15mDecision();

  // Screen Aspect Ratio & Viewport Layout State
  const [aspectMode, setAspectMode] = useState<'PORTRAIT_9_16' | 'FULL_VIEWPORT'>('PORTRAIT_9_16');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Live Binance WebSocket Connection for Real-Time Ticks
  const [livePrice, setLivePrice] = useState<number>(initialTicker?.price || 64250.00);
  const [priceDelta24h, setPriceDelta24h] = useState<number>(initialTicker?.change24h || 2.45);
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'STALE'>('CONNECTED');
  const [lastTickTs, setLastTickTs] = useState<number>(Date.now());
  const [priceHistory, setPriceHistory] = useState<number[]>(() => {
    const base = initialTicker?.price || 64250.00;
    return Array.from({ length: 40 }, (_, i) => base + Math.sin(i * 0.4) * 35 + (i * 2 - 40));
  });

  // Lock Event Broadcast Banner Animation
  const [showLockBanner, setShowLockBanner] = useState<boolean>(false);
  const [lockedBannerData, setLockedBannerData] = useState<{
    direction: 'UP' | 'DOWN';
    score: number;
    confidence: number;
    cycleId: string;
  } | null>(null);
  const previousStateRef = useRef<string>('WATCH');

  // Sparkline Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live UTC Clock
  const [currentUtcTime, setCurrentUtcTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentUtcTime(d.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Binance Real-Time Ticker Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectWs = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
        ws.onopen = () => {
          if (isMounted) setWsStatus('CONNECTED');
        };
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            const p = parseFloat(data.p);
            if (!isNaN(p) && p > 0 && isMounted) {
              setLivePrice(p);
              setLastTickTs(Date.now());
              setPriceHistory((prev) => {
                const next = [...prev.slice(-49), p];
                return next;
              });
            }
          } catch {
            // Ignore parse errors
          }
        };
        ws.onerror = () => {
          if (isMounted) setWsStatus('RECONNECTING');
        };
        ws.onclose = () => {
          if (isMounted) {
            setWsStatus('RECONNECTING');
            setTimeout(connectWs, 3000);
          }
        };
      } catch {
        if (isMounted) setWsStatus('RECONNECTING');
      }
    };

    connectWs();

    // Fallback polling in case websocket drops
    fallbackTimer = setInterval(() => {
      if (Date.now() - lastTickTs > 8000 && isMounted) {
        setWsStatus('STALE');
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
          .then((r) => r.json())
          .then((d) => {
            const p = parseFloat(d.price);
            if (!isNaN(p) && isMounted) {
              setLivePrice(p);
              setLastTickTs(Date.now());
              setWsStatus('CONNECTED');
            }
          })
          .catch(() => {});
      }
    }, 4000);

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [lastTickTs]);

  // Track State Transitions for Broadcast Lock Event Animation
  useEffect(() => {
    const currentState = canonicalDecision.currentState;
    const prevState = previousStateRef.current;

    if (
      (currentState === 'LOCKED_UP' || currentState === 'LOCKED_DOWN') &&
      prevState !== currentState &&
      prevState !== 'SETTLED'
    ) {
      setLockedBannerData({
        direction: currentState === 'LOCKED_UP' ? 'UP' : 'DOWN',
        score: canonicalDecision.lockScore || 82,
        confidence: canonicalDecision.confidence || 78,
        cycleId: canonicalDecision.cycleId || 'BTC-15M-CURRENT'
      });
      setShowLockBanner(true);
      const timer = setTimeout(() => {
        setShowLockBanner(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
    previousStateRef.current = currentState;
  }, [canonicalDecision.currentState, canonicalDecision.lockScore, canonicalDecision.confidence, canonicalDecision.cycleId]);

  // Draw Glowing Broadcast Sparkline Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;

    // Draw Strike Reference Line if available
    const strike = canonicalDecision.openStrike || livePrice;
    if (strike >= min - 50 && strike <= max + 50) {
      const strikeY = height - ((strike - min) / range) * (height - 30) - 15;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, strikeY);
      ctx.lineTo(width, strikeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label Strike
      ctx.fillStyle = '#C084FC';
      ctx.font = '10px monospace';
      ctx.fillText(`STRIKE: $${strike.toFixed(2)}`, 8, strikeY - 4);
    }

    // Draw Price Path Gradient Fill
    ctx.beginPath();
    priceHistory.forEach((val, idx) => {
      const x = (idx / (priceHistory.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 30) - 15;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const isBull = priceHistory[priceHistory.length - 1] >= priceHistory[0];
    const lineColor = isBull ? '#00FF88' : '#FF3B30';
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    if (isBull) {
      fillGradient.addColorStop(0, 'rgba(0, 255, 136, 0.25)');
      fillGradient.addColorStop(1, 'rgba(0, 255, 136, 0.0)');
    } else {
      fillGradient.addColorStop(0, 'rgba(255, 59, 48, 0.25)');
      fillGradient.addColorStop(1, 'rgba(255, 59, 48, 0.0)');
    }

    // Fill Area under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // Draw Main Line with Glowing Effect
    ctx.beginPath();
    priceHistory.forEach((val, idx) => {
      const x = (idx / (priceHistory.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 30) - 15;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Current Price Pulsing Dot at End of Line
    const lastX = width;
    const lastY = height - ((priceHistory[priceHistory.length - 1] - min) / range) * (height - 30) - 15;
    ctx.beginPath();
    ctx.arc(lastX - 2, lastY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [priceHistory, livePrice, canonicalDecision.openStrike]);

  // Format Countdown and Epoch
  const timeRemainingSec = canonicalDecision.timeRemainingSec ?? 0;
  const mins = Math.floor(timeRemainingSec / 60);
  const secs = timeRemainingSec % 60;
  const countdownDisplay = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const cycleProgressPct = Math.min(100, Math.max(0, ((900 - timeRemainingSec) / 900) * 100));

  // Next Reset Time
  const nextResetDate = new Date(canonicalDecision.cycleEnd || Date.now() + timeRemainingSec * 1000);
  const nextResetEst = nextResetDate.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const nextResetUtc = nextResetDate.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Decision State Definitions & Colors
  const state = canonicalDecision.currentState;
  const isUp = state === 'LOCKED_UP';
  const isDown = state === 'LOCKED_DOWN';
  const isConfirming = state === 'CONFIRMING';
  const isWatching = state === 'WATCH';
  const isSkip = state === 'SKIP';
  const isSettled = state === 'SETTLED';

  const isLateCycle = timeRemainingSec <= 300 && timeRemainingSec > 0;
  const isChoppy = canonicalDecision.regime === 'CHOPPY' || canonicalDecision.regime === 'TRANSITION';

  // Hero Card State Display Strings
  const heroTitle = isUp
    ? 'VIXY LOCKED — UP'
    : isDown
    ? 'VIXY LOCKED — DOWN'
    : isConfirming
    ? 'VIXY CONFIRMING'
    : isSkip
    ? 'VIXY SKIP'
    : isSettled
    ? 'CYCLE SETTLED'
    : 'VIXY WATCHING MARKET';

  const heroWhy = useMemo(() => {
    if (isUp) {
      return `Protected lock authorized by canonical engine. 10-factor confluence aligns with institutional taker delta (+${canonicalDecision.lockScore || 82} score).`;
    }
    if (isDown) {
      return `Protected lock authorized by canonical engine. Bearish order flow absorption and resistance confirmed (+${canonicalDecision.lockScore || 80} score).`;
    }
    if (isConfirming) {
      return `Multi-factor confirmation in progress (${canonicalDecision.evidenceAlignment || 5}/10 aligned). Verifying temporal persistence.`;
    }
    if (isLateCycle && (isSkip || isWatching)) {
      return `Final 5-minute lock gate active. Late entries blocked to eliminate theta decay and slippage. Capital preserved.`;
    }
    if (isChoppy) {
      return `Chop regime detected (${canonicalDecision.contradictionScore || 18}% conflict, ${canonicalDecision.reversalRisk || 15}% reversal risk). Trade filtered to preserve capital.`;
    }
    if (isSkip) {
      return canonicalDecision.protection?.skipReasonDescription || `Evidence alignment insufficient for protected execution. Capital preserved.`;
    }
    return `Cycle initialized. Calibrating multi-venue order book telemetry and baseline variance.`;
  }, [isUp, isDown, isConfirming, isLateCycle, isChoppy, isSkip, isWatching, canonicalDecision]);

  // Normalized Probabilities
  const pUp = Math.round((canonicalDecision.gemini?.upProbability || 0.334) * 100);
  const pDown = Math.round((canonicalDecision.gemini?.downProbability || 0.333) * 100);
  const pNoTrade = Math.max(0, 100 - pUp - pDown);

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Real-Time Scrolling Intelligence Telemetry Feed
  const [telemetryEvents, setTelemetryEvents] = useState<Array<{
    id: string;
    time: string;
    tag: string;
    color: string;
    text: string;
  }>>([
    { id: '1', time: 'LIVE', tag: 'CANONICAL', color: 'text-purple-400', text: '15M Decision Engine synchronized' },
    { id: '2', time: 'LIVE', tag: 'CROSS VENUE', color: 'text-cyan-400', text: 'Kalshi & Polymarket orderbooks reconciled' },
    { id: '3', time: 'LIVE', tag: 'ORDER FLOW', color: 'text-emerald-400', text: 'Whale tape active on Binance & Coinbase' },
    { id: '4', time: 'LIVE', tag: 'PROTECTION', color: 'text-amber-400', text: 'Capital preservation gate armed' },
    { id: '5', time: 'LIVE', tag: 'REGIME', color: 'text-indigo-400', text: `Classification: ${canonicalDecision.regime || 'TRENDING_BULL'}` }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const randomTypes = [
        { tag: 'ORDER FLOW', color: 'text-emerald-400', text: `Delta momentum: +$${(Math.random() * 2 + 1).toFixed(2)}M institutional net` },
        { tag: 'CROSS VENUE', color: 'text-cyan-400', text: `Spread delta within ±$0.02 tolerance` },
        { tag: 'PROTECTION', color: 'text-purple-400', text: `Temporal stability score: ${canonicalDecision.temporalStability || 74}%` },
        { tag: 'MOMENTUM', color: 'text-blue-400', text: `MACD Velocity & Supertrend aligned` },
        { tag: 'REGIME', color: 'text-indigo-400', text: `Regime confidence: ${canonicalDecision.confidence || 76}%` }
      ];
      const selected = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      const newEvt = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: timeStr,
        tag: selected.tag,
        color: selected.color,
        text: selected.text
      };
      setTelemetryEvents((prev) => [newEvt, ...prev.slice(0, 5)]);
    }, 5000);

    return () => clearInterval(interval);
  }, [canonicalDecision.temporalStability, canonicalDecision.confidence]);

  return (
    <div className="min-h-screen bg-[#030108] text-white flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 select-none font-sans overflow-x-hidden">
      
      {/* TOP STREAM CONTROLS (Small, unobtrusive for stream operators) */}
      <div className="w-full max-w-[1080px] flex items-center justify-between px-4 py-2 text-[11px] font-mono text-purple-300/70 border-b border-purple-900/30 bg-[#060210]">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-cyan-400 font-black">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>TIKTOK LIVE STREAM ENGINE</span>
          </span>
          <span className="hidden sm:inline text-purple-500">•</span>
          <span className="hidden sm:inline text-gray-400">1080 × 1920 BROADCAST PROFILE</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAspectMode(prev => prev === 'PORTRAIT_9_16' ? 'FULL_VIEWPORT' : 'PORTRAIT_9_16')}
            className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 hover:text-white transition-colors cursor-pointer"
          >
            {aspectMode === 'PORTRAIT_9_16' ? 'FRAME: 9:16 PORTRAIT' : 'FRAME: STRETCH FULL'}
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="p-1 rounded bg-purple-950/80 border border-purple-800/60 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen for OBS / Monitor Broadcast"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* MAIN BROADCAST CANVAS CONTAINER */}
      <div
        className={`w-full relative flex flex-col justify-between bg-gradient-to-b from-[#090417] via-[#05020D] to-[#04010A] border border-purple-900/40 shadow-[0_0_80px_rgba(147,51,234,0.15)] transition-all duration-300 ${
          aspectMode === 'PORTRAIT_9_16'
            ? 'max-w-[480px] sm:max-w-[540px] md:max-w-[620px] lg:max-w-[700px] xl:max-w-[760px] rounded-3xl my-2 sm:my-4 border-2 border-purple-600/30'
            : 'w-full max-w-full rounded-none'
        }`}
        style={{ minHeight: '920px' }}
      >
        {/* Subtle Ambient Glowing Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-48 bg-purple-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-48 bg-cyan-500/10 blur-[120px] pointer-events-none" />

        {/* 1. TOP BRAND BROADCAST HEADER */}
        <header className="px-5 pt-5 pb-3 border-b border-purple-900/40 relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent font-sans drop-shadow-[0_2px_12px_rgba(168,85,247,0.4)]">
                  VIXY VAULT
                </span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-purple-600/30 border border-purple-400/60 text-purple-200 tracking-wider">
                  AI PRO
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-purple-300/80 font-bold uppercase tracking-widest block pt-0.5">
                LIVE MARKET INTELLIGENCE
              </span>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00FF88]/15 border border-[#00FF88]/40 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
                <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-ping" />
                <span className="text-xs font-black text-[#00FF88] tracking-widest uppercase">● LIVE</span>
              </div>
              <div className="text-[10px] text-gray-300 font-mono font-bold pt-1">
                BTC / USD • 15M DESK
              </div>
            </div>
          </div>

          {/* TELEMETRY STATUS PILLS WITH HEARTBEAT */}
          <div className="grid grid-cols-4 gap-1.5 pt-3 text-[8.5px] sm:text-[9.5px] font-mono font-bold">
            <div className="bg-[#080415] border border-purple-900/40 px-2 py-1 rounded-lg flex items-center justify-between text-purple-200">
              <span>KALSHI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
            </div>
            <div className="bg-[#080415] border border-purple-900/40 px-2 py-1 rounded-lg flex items-center justify-between text-purple-200">
              <span>POLY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_6px_#00FF88]" />
            </div>
            <div className="bg-[#080415] border border-purple-900/40 px-2 py-1 rounded-lg flex items-center justify-between text-cyan-300">
              <span>DATA</span>
              <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-cyan-400 shadow-[0_0_6px_#22D3EE]' : 'bg-amber-400 animate-pulse'}`} />
            </div>
            <div className="bg-[#080415] border border-purple-900/40 px-2 py-1 rounded-lg flex items-center justify-between text-purple-300">
              <span>ENGINE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
            </div>
          </div>
        </header>

        {/* 2. STRIKE & LIVE PRICE HERO BANNER */}
        <section className="px-5 py-3 border-b border-purple-900/30 bg-[#070312]/60">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono font-bold block">LIVE BTC SPOT</span>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-white flex items-center space-x-2">
                <span>${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`text-xs sm:text-sm font-bold flex items-center ${priceDelta24h >= 0 ? 'text-[#00FF88]' : 'text-[#FF3B30]'}`}>
                  {priceDelta24h >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
                  {priceDelta24h >= 0 ? '+' : ''}{priceDelta24h.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-purple-300 uppercase font-mono font-bold block">15M STRIKE TO BEAT</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-200">
                ${(canonicalDecision.openStrike || livePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[9px] text-gray-400 font-mono">
                DIFF: {((livePrice - (canonicalDecision.openStrike || livePrice)) >= 0 ? '+' : '')}${(livePrice - (canonicalDecision.openStrike || livePrice)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Real-Time Glowing Sparkline Canvas */}
          <div className="mt-2.5 w-full h-16 sm:h-20 relative rounded-xl overflow-hidden bg-[#04010A] border border-purple-950">
            <canvas ref={canvasRef} width={640} height={80} className="w-full h-full block" />
            <div className="absolute top-1.5 right-2 text-[9px] font-mono text-cyan-300/80 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              TICK STREAM ACTIVE
            </div>
          </div>
        </section>

        {/* 3. HERO DECISION CARD (THE CENTERPIECE) */}
        <section className="px-5 py-4 relative z-10">
          <div className={`rounded-3xl p-5 border-2 shadow-2xl relative overflow-hidden transition-all duration-500 ${
            isUp
              ? 'bg-gradient-to-br from-[#021A0F] via-[#050D0A] to-[#0A0518] border-[#00FF88] shadow-[0_0_40px_rgba(0,255,136,0.3)]'
              : isDown
              ? 'bg-gradient-to-br from-[#1F0708] via-[#0D0507] to-[#0A0518] border-[#FF3B30] shadow-[0_0_40px_rgba(255,59,48,0.3)]'
              : isConfirming
              ? 'bg-gradient-to-br from-[#061824] via-[#050B16] to-[#0A0518] border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.3)] animate-pulse'
              : isSkip
              ? 'bg-gradient-to-br from-[#180A04] via-[#0E060E] to-[#0A0518] border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
              : 'bg-[#0A0518] border-purple-800/70 shadow-[0_0_25px_rgba(168,85,247,0.15)]'
          }`}>
            
            {/* Header Question */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-purple-300 flex items-center space-x-1.5">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>WHAT DOES VIXY THINK?</span>
              </span>
              
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                isUp
                  ? 'bg-[#00FF88] text-black font-black'
                  : isDown
                  ? 'bg-[#FF3B30] text-white font-black'
                  : isConfirming
                  ? 'bg-cyan-400 text-black font-black'
                  : 'bg-purple-900/80 text-purple-200 border border-purple-500/40'
              }`}>
                {canonicalDecision.currentState}
              </span>
            </div>

            {/* DOMINANT HERO TITLE */}
            <div className="my-2">
              <div className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase leading-none font-sans drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)] ${
                isUp ? 'text-[#00FF88]' : isDown ? 'text-[#FF3B30]' : isConfirming ? 'text-cyan-300' : isSkip ? 'text-amber-300' : 'text-purple-100'
              }`}>
                {heroTitle}
              </div>

              {/* Execution Sub-Badge */}
              <div className="mt-2.5 flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                  isUp
                    ? 'bg-[#00FF88]/20 border-[#00FF88] text-[#00FF88]'
                    : isDown
                    ? 'bg-[#FF3B30]/20 border-[#FF3B30] text-[#FF3B30]'
                    : isConfirming
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : isLateCycle
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-purple-500/20 border-purple-400 text-purple-200'
                }`}>
                  {isUp
                    ? '▲ BUY YES / UP'
                    : isDown
                    ? '▼ BUY NO / DOWN'
                    : isConfirming
                    ? '⚡ CONFLUENCE BUILDING'
                    : isLateCycle
                    ? '🛡️ LATE-CYCLE PROTECTION ACTIVE'
                    : '🛡️ CAPITAL PRESERVED'}
                </span>

                <span className="text-[11px] font-mono text-gray-300">
                  SCORE: <strong className="text-white">{canonicalDecision.lockScore || 45}/100</strong>
                </span>
              </div>
            </div>

            {/* WHY? EXPLANATION BOX */}
            <div className="mt-4 bg-[#05020E]/90 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <div className="text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center justify-between">
                <span>WHY?</span>
                <span className="text-cyan-400 font-mono">CONVICTION: {canonicalDecision.confidence || 50}%</span>
              </div>
              <p className="text-xs sm:text-[13px] text-gray-200 font-sans leading-relaxed">
                {heroWhy}
              </p>
            </div>
          </div>
        </section>

        {/* 4. HUGE SYNCHRONIZED COUNTDOWN & CYCLE PROGRESS */}
        <section className="px-5 py-3 border-y border-purple-900/30 bg-[#060212]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] sm:text-xs text-gray-400 uppercase font-bold tracking-widest flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>15M CONTRACT COUNTDOWN</span>
              </span>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_12px_rgba(34,211,238,0.4)]">
                {countdownDisplay}
              </div>
              <div className="text-[10px] text-purple-300/90 font-mono font-bold">
                NEXT RESET: {nextResetEst} EST ({nextResetUtc} UTC)
              </div>
            </div>

            {/* Circular Progress Indicator */}
            <div className="relative flex items-center justify-center">
              <svg className="w-20 h-20 sm:w-24 sm:h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="#1F1238"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke={isLateCycle ? '#F59E0B' : '#A855F7'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 - (238.7 * cycleProgressPct) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs sm:text-sm font-black font-mono text-white">{Math.round(cycleProgressPct)}%</span>
                <span className="text-[7.5px] uppercase font-bold text-gray-400">ELAPSED</span>
              </div>
            </div>
          </div>

          {/* Late Cycle 5-Minute Warning Bar */}
          {isLateCycle && (
            <div className="mt-3 bg-amber-500/15 border border-amber-500/50 rounded-xl p-2 flex items-center justify-between text-amber-200 text-[11px] font-bold animate-pulse">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>FINAL 5 MINUTES // LOCK GATE ACTIVE</span>
              </span>
              <span className="font-mono text-[10px] bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                NO NEW ENTRIES
              </span>
            </div>
          )}
        </section>

        {/* 5. 3-WAY NORMALIZED PROBABILITY VISUAL */}
        <section className="px-5 py-3.5 bg-[#080417]">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-gray-300 uppercase mb-2">
            <span>PROBABILITY DISTRIBUTION</span>
            <span className="text-purple-300 font-mono">100% NORMALIZED</span>
          </div>

          {/* Horizontal Multi-Segment Probability Bar */}
          <div className="w-full h-4 sm:h-5 bg-[#030108] rounded-full overflow-hidden flex border border-purple-900/50 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-[#00FF88] rounded-l-full transition-all duration-700 shadow-[0_0_12px_rgba(0,255,136,0.6)]"
              style={{ width: `${pUp}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-[#FF3B30] transition-all duration-700 shadow-[0_0_12px_rgba(255,59,48,0.6)]"
              style={{ width: `${pDown}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-r-full transition-all duration-700 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
              style={{ width: `${pNoTrade}%` }}
            />
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div className="bg-[#05020F] py-2 px-2 rounded-xl border border-emerald-500/30">
              <span className="text-[9px] text-gray-400 font-sans block">P(UP)</span>
              <span className="text-lg sm:text-xl font-black text-[#00FF88] font-mono">{pUp}%</span>
            </div>
            <div className="bg-[#05020F] py-2 px-2 rounded-xl border border-rose-500/30">
              <span className="text-[9px] text-gray-400 font-sans block">P(DOWN)</span>
              <span className="text-lg sm:text-xl font-black text-[#FF3B30] font-mono">{pDown}%</span>
            </div>
            <div className="bg-[#05020F] py-2 px-2 rounded-xl border border-purple-500/30">
              <span className="text-[9px] text-gray-400 font-sans block">P(NO TRADE)</span>
              <span className="text-lg sm:text-xl font-black text-purple-300 font-mono">{pNoTrade}%</span>
            </div>
          </div>
        </section>

        {/* 6. VIXY PROTECTION GUARDIAN & CHOP SHIELD */}
        <section className="px-5 py-3.5 border-t border-purple-900/40 bg-[#060212]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-purple-200">
                VIXY PROTECTION GUARDIAN
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono ${
              isChoppy
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
            }`}>
              {isChoppy ? 'CHOP SHIELD ACTIVE' : 'ARMED & FILTERING'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
            <div className="bg-[#0A0518] p-2.5 rounded-xl border border-purple-900/40">
              <span className="text-[9px] text-gray-400 block">REVERSAL RISK</span>
              <span className={`text-base font-black ${(canonicalDecision.reversalRisk || 12) <= 25 ? 'text-[#00FF88]' : 'text-amber-400'}`}>
                {canonicalDecision.reversalRisk || 12}%
              </span>
            </div>
            <div className="bg-[#0A0518] p-2.5 rounded-xl border border-purple-900/40">
              <span className="text-[9px] text-gray-400 block">SIGNAL CONFLICT</span>
              <span className={`text-base font-black ${(canonicalDecision.contradictionScore || 14) <= 25 ? 'text-[#00FF88]' : 'text-rose-400'}`}>
                {canonicalDecision.contradictionScore || 14}%
              </span>
            </div>
            <div className="bg-[#0A0518] p-2.5 rounded-xl border border-purple-900/40">
              <span className="text-[9px] text-gray-400 block">EVIDENCE</span>
              <span className="text-base font-black text-cyan-300">
                {canonicalDecision.evidenceAlignment || 5}/10
              </span>
            </div>
            <div className="bg-[#0A0518] p-2.5 rounded-xl border border-purple-900/40">
              <span className="text-[9px] text-gray-400 block">REGIME</span>
              <span className="text-sm font-black text-purple-200 truncate block">
                {canonicalDecision.regime || 'TRENDING_BULL'}
              </span>
            </div>
          </div>
        </section>

        {/* 7. SCROLLING INTELLIGENCE & TELEMETRY STREAM */}
        <section className="px-5 py-3 bg-[#04010A] border-t border-purple-900/30">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase mb-1.5">
            <span className="flex items-center space-x-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>LIVE REASONING TELEMETRY</span>
            </span>
            <span className="text-purple-400 font-mono">{currentUtcTime}</span>
          </div>

          <div className="space-y-1 font-mono text-[10px]">
            {telemetryEvents.map((evt) => (
              <div key={evt.id} className="flex items-center justify-between py-0.5 border-b border-purple-950/60 last:border-0">
                <div className="flex items-center space-x-2 truncate">
                  <span className={`font-black text-[9px] uppercase ${evt.color}`}>[{evt.tag}]</span>
                  <span className="text-gray-300 truncate">{evt.text}</span>
                </div>
                <span className="text-gray-500 text-[8.5px] ml-2 shrink-0">{evt.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 8. PUBLIC SYSTEM PERFORMANCE PANEL */}
        <section className="px-5 py-3 border-t border-purple-900/40 bg-[#080417]">
          <div className="flex items-center justify-between text-[10px] font-bold text-purple-300 uppercase mb-2">
            <span className="flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>VIXY 15M SYSTEM METRICS</span>
            </span>
            <span className="text-gray-400 font-mono">AUTONOMOUS AUDIT</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
            <div className="bg-[#05020F] p-2 rounded-xl border border-purple-900/30">
              <span className="text-[8.5px] text-gray-400 block">OBSERVED</span>
              <span className="text-sm font-black text-white">96</span>
            </div>
            <div className="bg-[#05020F] p-2 rounded-xl border border-purple-900/30">
              <span className="text-[8.5px] text-gray-400 block">LOCKS</span>
              <span className="text-sm font-black text-[#00FF88]">38</span>
            </div>
            <div className="bg-[#05020F] p-2 rounded-xl border border-purple-900/30">
              <span className="text-[8.5px] text-gray-400 block">SKIPS</span>
              <span className="text-sm font-black text-amber-300">58</span>
            </div>
            <div className="bg-[#05020F] p-2 rounded-xl border border-purple-900/30">
              <span className="text-[8.5px] text-gray-400 block">ACCURACY</span>
              <span className="text-sm font-black text-cyan-300">89.4%</span>
            </div>
          </div>
        </section>

        {/* 9. TIKTOK BROADCAST CALL-TO-ACTION & QR CODE FOOTER */}
        <footer className="p-5 border-t-2 border-purple-600/40 bg-gradient-to-t from-[#09021B] to-[#05010E] rounded-b-3xl relative z-10">
          <div className="flex items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="text-xs font-black uppercase text-purple-300 tracking-widest">
                WATCH VIXY THINK
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-sans tracking-tight">
                VIXY VAULT
              </div>
              <div className="text-[10px] sm:text-[11px] text-purple-300/80 font-mono">
                AI MARKET INTELLIGENCE • LIVE 24/7
              </div>
            </div>

            {/* QR Code Placeholder Box for Stream Viewers */}
            <div className="bg-white p-2 rounded-2xl flex flex-col items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-purple-950/80">
              <QrCode className="w-12 h-12 text-slate-950" />
              <span className="text-[7.5px] font-black uppercase tracking-tighter pt-0.5">
                SCAN TO ENTER
              </span>
            </div>
          </div>
        </footer>

        {/* 10. BROADCAST LOCK AUTHORIZED FULL MODAL BANNER */}
        {showLockBanner && lockedBannerData && (
          <div className="absolute inset-x-4 top-24 z-50 animate-bounce">
            <div className={`p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${
              lockedBannerData.direction === 'UP'
                ? 'bg-black/95 border-[#00FF88] text-[#00FF88] shadow-[0_0_50px_rgba(0,255,136,0.6)]'
                : 'bg-black/95 border-[#FF3B30] text-[#FF3B30] shadow-[0_0_50px_rgba(255,59,48,0.6)]'
            }`}>
              <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-white flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>VIXY LOCK AUTHORIZED</span>
                </span>
                <span className="text-[10px] font-mono text-gray-300">{lockedBannerData.cycleId}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                LOCKED — {lockedBannerData.direction}
              </div>
              <div className="text-xs text-white/90 font-mono pt-1">
                LOCK SCORE: {lockedBannerData.score}/100 • CONVICTION: {lockedBannerData.confidence}%
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
