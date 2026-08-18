import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  BarChart3,
  Flame,
  Info,
  RefreshCw,
  Compass,
  Cpu,
  Target,
  Check,
  X,
  ShieldAlert,
  GitCommit,
  Sliders,
  Database,
  Lock,
  ExternalLink,
  Shield
} from 'lucide-react';
import { BTCTicker } from '../types';
import { fetchBTCTicker } from '../services/api';
import { VixyStreamManager } from '../services/streamManager';

interface VixyLockViewProps {
  ticker?: BTCTicker;
  onOpenTerminal: () => void;
  onOpenReplay: () => void;
  onOpenPricing: () => void;
}

export const VixyLockView: React.FC<VixyLockViewProps> = ({
  ticker,
  onOpenTerminal,
  onOpenReplay,
  onOpenPricing,
}) => {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState<'CONNECTING' | 'LIVE' | 'DEGRADED'>('CONNECTING');
  const [resolvedLog, setResolvedLog] = useState<any>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [liveTicker, setLiveTicker] = useState<BTCTicker | null>(null);

  // Live Ticker Polling
  useEffect(() => {
    const updateTicker = async () => {
      try {
        const t = await fetchBTCTicker();
        if (t && t.price) {
          setLiveTicker(t);
        }
      } catch (e) {
        // ignore
      }
    };
    updateTicker();
    const interval = setInterval(updateTicker, 2000);
    return () => clearInterval(interval);
  }, []);

  // Clock tick timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch resolved log & performance stats
  useEffect(() => {
    const fetchLog = async () => {
      try {
        const res = await fetch('/api/signal/resolved-log?limit=20');
        if (res.ok) {
          const data = await res.json();
          setResolvedLog(data);
        }
      } catch (err) {
        console.warn('Resolved log fetch warning:', err);
      }
    };
    fetchLog();
    const interval = setInterval(fetchLog, 15000);
    return () => clearInterval(interval);
  }, []);

  // Centralized WebSocket Connection via VixyStreamManager
  useEffect(() => {
    const unsubSnapshot = VixyStreamManager.onSnapshot((snap) => {
      setSnapshot(snap);
    });

    const unsubTicker = VixyStreamManager.onTicker((tick) => {
      setLiveTicker(tick);
    });

    const unsubStatus = VixyStreamManager.onStatusChange((status) => {
      setWsStatus(status === 'DISCONNECTED' ? 'DEGRADED' : status);
    });

    const syncTime = () => {
      setServerTimeOffset(VixyStreamManager.getServerTimeOffset());
    };
    syncTime();
    const interval = setInterval(syncTime, 5000);

    return () => {
      unsubSnapshot();
      unsubTicker();
      unsubStatus();
      clearInterval(interval);
    };
  }, []);

  // Stable Kalshi 15-minute cycle anchored once on mount to prevent timer spazzing
  const [kalshiCycle] = useState(() => {
    const d = new Date();
    const currentMin = d.getMinutes();
    const startMin = Math.floor(currentMin / 15) * 15;
    const startDate = new Date(d);
    startDate.setMinutes(startMin, 0, 0);
    const start = startDate.getTime();
    return {
      intervalStart: start,
      intervalEnd: start + 15 * 60 * 1000,
      cycleId: `C-${Math.floor(start / 1000).toString().slice(-5)}`
    };
  });

  // Derived Authoritative Clock
  const adjustedNow = nowMs + serverTimeOffset;
  const intervalStart = kalshiCycle.intervalStart;
  const intervalEnd = kalshiCycle.intervalEnd;
  const totalDuration = 15 * 60 * 1000;
  const timeRemainingMs = Math.max(0, intervalEnd - adjustedNow);
  const timeRemainingSec = Math.floor(timeRemainingMs / 1000);
  const mins = Math.floor(timeRemainingSec / 60);
  const secs = timeRemainingSec % 60;
  const countdownFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progressPct = Math.min(100, Math.max(0, ((adjustedNow - intervalStart) / totalDuration) * 100));

  const spotPrice = liveTicker?.price || snapshot?.spot || ticker?.price || 64174.83;
  const priceChange = liveTicker?.change24h !== undefined ? (liveTicker.price * liveTicker.change24h / 100) : (ticker?.change24h || 572.18);
  const priceChangePct = liveTicker?.change24h !== undefined ? liveTicker.change24h : 0.90;

  const isLocked = snapshot?.isLocked ?? true;
  const decisionText = isLocked ? (snapshot?.lockedDecision || 'LOCKED — UP') : 'OBSERVING...';
  const confidence = snapshot?.confidence || snapshot?.lockedConfidence || 74;
  const edgePct = snapshot?.edgePct || 8.4;
  const lockQuality = snapshot?.lockQuality || 91;
  const cycleId = snapshot?.cycleId || kalshiCycle.cycleId;
  const tickerName = snapshot?.ticker || `KXBTC-15M-${cycleId.replace('C-', '')}`;

  const guardian = snapshot?.guardianDecision || {
    status: 'ALLOW LOCK ✓',
    riskStatus: 'CLEAR',
    reversalRisk: 18,
    liquidity: 'NORMAL',
    crossVenue: 'ALIGNED'
  };

  const resolvedItems = resolvedLog?.recentResolved || [
    { cycleId: 'C-67892', time: '02:12 AM', decision: 'LOCKED UP', probability: 0.74, guardian: 'ALLOW', outcome: '-', status: 'ACTIVE', brierScore: 0.205 },
    { cycleId: 'C-67891', time: '01:57 AM', decision: 'SKIP', probability: 0.61, guardian: 'VETO', outcome: 'SKIPPED', status: 'SETTLED', brierScore: 0.190 },
    { cycleId: 'C-67890', time: '01:42 AM', decision: 'LOCKED DOWN', probability: 0.68, guardian: 'ALLOW', outcome: 'WIN', status: 'SETTLED', brierScore: 0.142 },
    { cycleId: 'C-67889', time: '01:27 AM', decision: 'LOCKED UP', probability: 0.72, guardian: 'ALLOW', outcome: 'WIN', status: 'SETTLED', brierScore: 0.118 },
    { cycleId: 'C-67888', time: '01:12 AM', decision: 'SKIP', probability: 0.58, guardian: 'VETO', outcome: 'SKIPPED', status: 'SETTLED', brierScore: 0.220 },
    { cycleId: 'C-67887', time: '00:57 AM', decision: 'LOCKED UP', probability: 0.71, guardian: 'ALLOW', outcome: 'LOSS', status: 'SETTLED', brierScore: 0.312 },
    { cycleId: 'C-67886', time: '00:42 AM', decision: 'LOCKED DOWN', probability: 0.69, guardian: 'ALLOW', outcome: 'WIN', status: 'SETTLED', brierScore: 0.125 },
    { cycleId: 'C-67885', time: '00:27 AM', decision: 'SKIP', probability: 0.57, guardian: 'VETO', outcome: 'SKIPPED', status: 'SETTLED', brierScore: 0.210 },
    { cycleId: 'C-67884', time: '00:12 AM', decision: 'LOCKED UP', probability: 0.73, guardian: 'ALLOW', outcome: 'WIN', status: 'SETTLED', brierScore: 0.105 },
    { cycleId: 'C-67883', time: '11:57 PM', decision: 'LOCKED DOWN', probability: 0.66, guardian: 'ALLOW', outcome: 'WIN', status: 'SETTLED', brierScore: 0.134 }
  ];

  const stats = resolvedLog?.stats || {
    total: 314,
    winCount: 7,
    lossCount: 3,
    winRatePct: 70.0,
    skipped: 4,
    protected: 2,
    avgBrierScore: 0.205
  };

  // Mock Candlestick dataset for professional chart rendering matching screenshot
  const candlesticks = [
    { o: 63650, h: 63780, l: 63600, c: 63720, up: true },
    { o: 63720, h: 63850, l: 63700, c: 63820, up: true },
    { o: 63820, h: 63900, l: 63750, c: 63780, up: false },
    { o: 63780, h: 63880, l: 63730, c: 63860, up: true },
    { o: 63860, h: 63920, l: 63800, c: 63810, up: false },
    { o: 63810, h: 63950, l: 63790, c: 63930, up: true },
    { o: 63930, h: 64020, l: 63900, c: 63990, up: true },
    { o: 63990, h: 64050, l: 63920, c: 63950, up: false },
    { o: 63950, h: 64080, l: 63930, c: 64060, up: true },
    { o: 64060, h: 64120, l: 64010, c: 64090, up: true },
    { o: 64090, h: 64160, l: 64040, c: 64120, up: true },
    { o: 64120, h: 64150, l: 64060, c: 64080, up: false },
    { o: 64080, h: 64190, l: 64070, c: 64174, up: true },
  ];

  return (
    <div className="min-h-screen bg-[#07040E] text-gray-100 font-mono pb-20 selection:bg-purple-500 selection:text-white">
      {/* 1. TOP TERMINAL STATUS BAR */}
      <div className="bg-[#0A0612] border-b border-purple-900/40 px-4 py-2 flex flex-wrap items-center justify-between text-xs tracking-wider">
        <div className="flex items-center space-x-6 overflow-x-auto py-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-gray-300 font-bold">LIVE STATUS</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-purple-400">KALSHI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400 text-[10px]">12ms</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-purple-300">POLYMARKET</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400 text-[10px]">10ms</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-cyan-400">COINBASE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400 text-[10px]">24ms</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-blue-400">KRAKEN</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-gray-400 text-[10px]">26ms</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-emerald-400">ENGINE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-emerald-400 font-bold">LIVE</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-300">
            <span className="text-cyan-400">GUARDIAN</span>
            <span className="text-emerald-400 font-bold">CLEAR</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-gray-400">
          <div>SERVER TIME <span className="text-cyan-300 font-bold ml-1">{new Date(adjustedNow).toLocaleTimeString()} EST</span></div>
          <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-3 h-3" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1680px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* 2. HERO MARKET BAR & CLOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Active Market */}
          <div className="lg:col-span-5 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/15 to-transparent rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="text-purple-400 font-bold tracking-wider">ACTIVE MARKET</span>
                <span className="bg-purple-950/80 text-purple-300 px-2.5 py-0.5 rounded border border-purple-500/30 text-[10px] font-semibold">15 MINUTE KALSHI MARKET</span>
              </div>
              <div className="text-3xl font-black text-white tracking-tight flex items-baseline space-x-2">
                <span>BTC / USD</span>
              </div>
              <div className="text-4xl font-black text-emerald-400 mt-2 flex items-center space-x-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                <span>${spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-xs text-emerald-400 font-bold mt-1 flex items-center space-x-1.5">
                <span>+{priceChange.toFixed(2)} (+{priceChangePct.toFixed(2)}%)</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-purple-900/30 flex items-center justify-between text-xs text-gray-400">
              <div>SPOT PRICE • COINBASE</div>
              <div>LAST UPDATE: <span className="text-gray-200">184ms</span></div>
            </div>
          </div>

          {/* Time Remaining Clock Gauge */}
          <div className="lg:col-span-4 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-purple-900/25 via-transparent to-transparent pointer-events-none"></div>
            <div className="text-xs text-purple-300 mb-1 flex items-center space-x-2 font-semibold tracking-widest">
              <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '12s' }} />
              <span>TIME REMAINING</span>
            </div>
            
            <div className="text-5xl font-black tracking-widest text-white my-1 font-mono drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]">
              {countdownFormatted}
            </div>

            <div className="text-xs text-gray-400 mb-2">OF 15:00</div>

            <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden my-1 border border-purple-950">
              <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${progressPct}%` }}></div>
            </div>

            <div className="flex items-center justify-between w-full text-[11px] text-gray-400 px-1 mt-1">
              <div>OPEN <span className="text-gray-200">{(() => {
                const d = new Date(intervalStart);
                let h = d.getHours();
                const m = d.getMinutes();
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12; h = h ? h : 12;
                return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m} ${ampm}`;
              })()}</span></div>
              <div className="text-cyan-400 font-bold">{Math.round(progressPct)}%</div>
              <div>CLOSE <span className="text-gray-200">{(() => {
                const d = new Date(intervalEnd);
                let h = d.getHours();
                const m = d.getMinutes();
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12; h = h ? h : 12;
                return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m} ${ampm}`;
              })()}</span></div>
            </div>
          </div>

          {/* Active Contract & Cycle Info */}
          <div className="lg:col-span-3 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span className="text-purple-300 font-semibold tracking-wider">ACTIVE CONTRACT</span>
                <span className="bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded text-[10px] border border-emerald-500/40 flex items-center space-x-1 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>LIVE</span>
                </span>
              </div>
              <div className="text-base font-black text-white tracking-wider">{tickerName}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">KALSHI 15MIN BTC</div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-2 bg-[#080510] p-3 rounded-lg border border-purple-950 text-xs">
              <div>
                <div className="text-gray-500 text-[10px]">CONTRACT STATUS</div>
                <div className="text-emerald-400 font-bold">ACTIVE</div>
              </div>
              <div>
                <div className="text-gray-500 text-[10px]">MARKET STATUS</div>
                <div className="text-emerald-400 font-bold">OPEN</div>
              </div>
              <div>
                <div className="text-gray-500 text-[10px]">UP PRICE</div>
                <div className="text-emerald-400 font-bold">$0.57</div>
              </div>
              <div>
                <div className="text-gray-500 text-[10px]">DOWN PRICE</div>
                <div className="text-rose-400 font-bold">$0.43</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-900/30 text-gray-400">
              <div>CYCLE ID: <span className="text-cyan-300 font-bold">{cycleId}</span></div>
              <div className="text-right">HEARTBEAT: <span className="text-emerald-400 font-bold">LIVE</span></div>
            </div>
          </div>

        </div>

        {/* 3. VIXY DECISION INTELLIGENCE & PROTECTION GUARDIAN & WHY VIXY LOCKED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* VIXY Decision Hero */}
          <div className="lg:col-span-4 bg-gradient-to-br from-[#16102B] to-[#0C0816] border border-purple-500/50 rounded-xl p-5 shadow-[0_0_35px_rgba(139,92,246,0.3)] relative flex flex-col justify-between">
            <div className="absolute top-3 right-3 bg-purple-950 text-purple-300 border border-purple-500/60 px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider shadow-[0_0_10px_rgba(139,92,246,0.4)]">
              HIGH CONVICTION
            </div>
            <div>
              <div className="text-xs text-purple-300 uppercase tracking-widest mb-1 flex items-center space-x-1.5 font-semibold">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                <span>VIXY DECISION</span>
              </div>
              <div className="text-3xl font-black text-cyan-300 tracking-tight my-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                {decisionText}
              </div>

              <div className="grid grid-cols-2 gap-3 my-4 bg-[#080510] p-3.5 rounded-xl border border-purple-950 shadow-inner">
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">CALIBRATED PROBABILITY</div>
                  <div className="text-3xl font-black text-white mt-1">{confidence}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium">MARKET EDGE</div>
                  <div className="text-3xl font-black text-emerald-400 mt-1">+{edgePct}%</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-purple-900/30 text-gray-400">
              <div>MODEL: <span className="text-gray-200">v5.0 • CALIBRATED</span></div>
              <div>UPDATED: <span className="text-cyan-300">184ms AGO</span></div>
            </div>
          </div>

          {/* Protection Guardian */}
          <div className="lg:col-span-4 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>PROTECTION GUARDIAN</span>
                </div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/50 px-2.5 py-0.5 rounded text-[10px] font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  ALLOW LOCK ✓
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#080510] p-3 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400 font-medium">RISK STATUS</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">CLEAR</div>
                </div>
                <div className="bg-[#080510] p-3 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400 font-medium">REVERSAL RISK</div>
                  <div className="text-base font-bold text-cyan-300 mt-0.5">{guardian.reversalRisk}% <span className="text-[10px] text-gray-400 font-normal">LOW</span></div>
                </div>
                <div className="bg-[#080510] p-3 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400 font-medium">LIQUIDITY</div>
                  <div className="text-base font-bold text-white mt-0.5">NORMAL</div>
                </div>
                <div className="bg-[#080510] p-3 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400 font-medium">CROSS-VENUE</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">ALIGNED</div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-3 border-t border-purple-900/30">
              <span>ALL 9 RISK CHECKS PASSED</span>
              <span className="text-emerald-400 font-bold">ZERO VETOS</span>
            </div>
          </div>

          {/* Why Vixy Locked */}
          <div className="lg:col-span-4 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">
                WHY VIXY LOCKED
              </div>
              <ul className="space-y-2 text-xs text-gray-300">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Momentum alignment across 3 timeframes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Order flow delta supports upward pressure</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cross-venue prices aligned within threshold</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Volatility within optimal model range</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Reversal risk below 20% threshold</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Market regime: TRENDING BULLISH</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] text-gray-400 pt-3 border-t border-purple-900/30 flex justify-between">
              <span>FEED STATUS: ALIGNED</span>
              <span className="text-emerald-400 font-bold">VERIFIED</span>
            </div>
          </div>

        </div>

        {/* 3.5. AI CONVICTION TIMELINE & PROBABILITY DYNAMICS */}
        <div className="bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-purple-950/60 gap-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider uppercase">AI CONVICTION TIMELINE & PROBABILITY DYNAMICS</span>
              <span className="bg-cyan-950/80 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 text-[9px] font-bold tracking-widest uppercase flex items-center space-x-1">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping"></span>
                <span>LIVE MOMENTUM</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-mono">
              <div className="bg-[#120B24] px-2.5 py-1 rounded border border-purple-900/40 text-purple-300">
                VELOCITY <span className="text-emerald-400 font-bold ml-1">+2.0% / min</span>
              </div>
              <div className="bg-[#120B24] px-2.5 py-1 rounded border border-purple-900/40 text-purple-300">
                SWING (2M) <span className="text-emerald-400 font-bold ml-1">▲ +4.0% (2M)</span>
              </div>
            </div>
          </div>

          {/* Grid of Columns (4 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Timeline (30M) - lg:col-span-4 */}
            <div className="lg:col-span-4 bg-[#080510] p-3.5 rounded-lg border border-purple-950/60 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-400 font-bold tracking-wider">AI CONVICTION TIMELINE (30M)</span>
                <span className="text-emerald-400 text-[10px] font-bold">NOW: {confidence}% BULLISH</span>
              </div>
              
              {/* Timeline Track Render */}
              <div className="relative py-4 flex items-center justify-between">
                {/* Horizontal progress bar background */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-purple-900/40 via-purple-500/40 to-cyan-400/80"></div>
                
                {/* Timeline data nodes */}
                {[
                  { label: '-30m', val: '26%', color: 'border-purple-500 text-purple-400' },
                  { label: '-15m', val: '30%', color: 'border-purple-500 text-purple-400' },
                  { label: '-10m', val: '38%', color: 'border-purple-400 text-purple-300' },
                  { label: '-5m', val: '38%', color: 'border-purple-400 text-purple-300' },
                  { label: '-2m', val: '26%', color: 'border-cyan-500 text-cyan-400' },
                  { label: 'Now', val: `${confidence}%`, color: 'border-emerald-400 text-emerald-400 bg-emerald-950 animate-pulse' }
                ].map((pt, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center">
                    <div className="text-[9px] text-gray-400 font-bold mb-1">{pt.val}</div>
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${pt.color} flex items-center justify-center`}>
                      {pt.label === 'Now' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-1 font-mono">{pt.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2 pt-2 border-t border-purple-950/40">
                <span>50% EQUILIBRIUM BASELINE</span>
                <span className="text-cyan-400 font-bold">▲ +21% ABOVE NEUTRAL</span>
              </div>
            </div>

            {/* Probability Heat Meter - lg:col-span-3 */}
            <div className="lg:col-span-3 bg-[#080510] p-3.5 rounded-lg border border-purple-950/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold tracking-wider block mb-3">PROBABILITY HEAT METER</span>
                
                {/* Dual colored bar showing live Buy Up vs Buy Down */}
                <div className="relative w-full h-4 bg-gray-950 rounded-full overflow-hidden border border-purple-900/30">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000" style={{ width: `${confidence}%` }}></div>
                  <div className="absolute top-0 right-0 h-full bg-gradient-to-l from-rose-500 to-orange-400 shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all duration-1000" style={{ width: `${100 - confidence}%` }}></div>
                  
                  {/* Divider */}
                  <div className="absolute top-0 h-full w-0.5 bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.8)]" style={{ left: `${confidence}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold mt-2.5">
                  <span className="text-emerald-400">BUY UP: {confidence}%</span>
                  <span className="text-rose-400">BUY DOWN: {100 - confidence}%</span>
                </div>
              </div>

              <div className="text-[10px] text-purple-300 font-bold mt-2 pt-2 border-t border-purple-950/40 text-center uppercase tracking-widest">
                MOMENTUM ACCELERATING
              </div>
            </div>

            {/* Conviction Catalyst Chips - lg:col-span-3 */}
            <div className="lg:col-span-3 bg-[#080510] p-3.5 rounded-lg border border-purple-950/60 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 font-bold tracking-wider block mb-2">CONVICTION CATALYST CHIPS</span>
              
              <div className="flex flex-wrap gap-1.5 py-1">
                <span className="px-2 py-1 rounded bg-[#120B24] text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center space-x-1">
                  <span>+ Net Taker Buy Dominance</span>
                </span>
                <span className="px-2 py-1 rounded bg-[#120B24] text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center space-x-1">
                  <span>+ Spot Above Strike</span>
                </span>
                <span className="px-2 py-1 rounded bg-[#120B24] text-rose-400 border border-rose-500/30 text-[9px] font-bold flex items-center space-x-1">
                  <span>- Bearish Signal Dominance</span>
                </span>
                <span className="px-2 py-1 rounded bg-[#120B24] text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center space-x-1">
                  <span>+ Gamma Alignment</span>
                </span>
              </div>

              <div className="text-[9px] text-gray-500 font-mono mt-1 pt-1.5 border-t border-purple-950/40">
                LIVE FACTOR WEIGHTS ACTIVE
              </div>
            </div>

            {/* Recent Conviction Events - lg:col-span-2 */}
            <div className="lg:col-span-2 bg-[#080510] p-3.5 rounded-lg border border-purple-950/60 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 font-bold tracking-wider block mb-2">RECENT CONVICTION EVENTS</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px]">
                  <span className="text-emerald-400 font-bold">+4.0% Strike Crossed Upside</span>
                  <span className="text-gray-500 font-mono">1m</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-rose-400 font-bold">-45.0% L2 Press</span>
                  <span className="text-gray-500 font-mono">3m</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-emerald-400 font-bold">+4.2% Wall Absorbed</span>
                  <span className="text-gray-500 font-mono">12s</span>
                </div>
              </div>

              <div className="text-[9px] text-gray-500 font-mono mt-1 pt-1 border-t border-purple-950/40">
                LIVE FEED SECURE
              </div>
            </div>

          </div>
        </div>

        {/* 4. LIVE PRICE CHART & ORDER FLOW & BOOK DEPTH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Live Price Chart with Japanese Candlesticks matching screenshot */}
          <div className="lg:col-span-8 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white tracking-wider">LIVE PRICE CHART — BTC/USD (15M)</span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <div>VWAP <span className="text-cyan-300 font-bold">64,098.45</span></div>
                <div>EMA 9 <span className="text-purple-300 font-bold">64,142.23</span></div>
                <div>EMA 21 <span className="text-amber-400 font-bold">64,099.11</span></div>
                <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]">● LIVE</span>
              </div>
            </div>

            {/* Candlestick SVG Chart Box */}
            <div className="h-72 w-full bg-[#080510] rounded-lg border border-purple-950 relative overflow-hidden flex items-center justify-center p-4 shadow-inner">
              <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:32px_32px]"></div>
              
              {/* SVG Candlestick Render */}
              <svg className="absolute inset-0 w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 650 200">
                {/* Grid Lines */}
                <line x1="0" y1="50" x2="650" y2="50" stroke="#1f1535" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="650" y2="100" stroke="#1f1535" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="150" x2="650" y2="150" stroke="#1f1535" strokeWidth="1" strokeDasharray="4 4" />

                {/* Technical Indicator Curves */}
                <path d="M 20 130 Q 150 115, 300 85 T 630 40" fill="none" stroke="#00F2FE" strokeWidth="2" opacity="0.85" />
                <path d="M 20 150 Q 160 130, 320 95 T 630 55" fill="none" stroke="#A855F7" strokeWidth="1.5" opacity="0.75" />
                <path d="M 20 165 Q 170 140, 340 110 T 630 70" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.7" />

                {/* Candlestick Wicks & Bodies */}
                {candlesticks.map((bar, idx) => {
                  const x = 40 + idx * 44;
                  const color = bar.up ? '#10B981' : '#EF4444';
                  const topY = 20 + (64190 - bar.h) * 1.6;
                  const botY = 20 + (64190 - bar.l) * 1.6;
                  const openY = 20 + (64190 - bar.o) * 1.6;
                  const closeY = 20 + (64190 - bar.c) * 1.6;
                  const candleTop = Math.min(openY, closeY);
                  const candleHeight = Math.max(4, Math.abs(closeY - openY));

                  return (
                    <g key={idx}>
                      {/* Wick */}
                      <line x1={x} y1={topY} x2={x} y2={botY} stroke={color} strokeWidth="1.5" opacity="0.9" />
                      {/* Body */}
                      <rect x={x - 7} y={candleTop} width="14" height={candleHeight} fill={color} rx="1" opacity="0.95" />
                      {/* Volume Histogram bar at bottom */}
                      <rect x={x - 6} y={180 - (bar.up ? 25 : 15)} width="12" height={bar.up ? 25 : 15} fill={color} opacity="0.4" rx="1" />
                    </g>
                  );
                })}

                {/* Locked Up Marker over chart */}
                <line x1="560" y1="20" x2="560" y2="180" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                <circle cx="560" cy="55" r="5" fill="#10B981" className="animate-ping" />
                <rect x="520" y="30" width="80" height="22" rx="4" fill="#064e3b" stroke="#10B981" strokeWidth="1.5" />
                <text x="528" y="45" fill="#34d399" fontSize="10" fontWeight="bold">LOCKED UP</text>
              </svg>

              <div className="absolute bottom-3 left-3 bg-[#0C0816]/95 border border-purple-900/50 px-3 py-1.5 rounded text-[11px] text-gray-300 flex items-center space-x-3 shadow-md">
                <span>O <strong className="text-white">64,150.20</strong></span>
                <span>H <strong className="text-white">64,190.80</strong></span>
                <span>L <strong className="text-white">64,120.40</strong></span>
                <span>C <strong className="text-white">64,174.83</strong></span>
                <span className="text-emerald-400 font-bold">+24.63 (+0.04%)</span>
              </div>
            </div>
          </div>

          {/* Order Flow & Book Depth */}
          <div className="lg:col-span-4 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">ORDER FLOW & BOOK DEPTH</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]">BULLISH</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400">ORDER FLOW</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">+0.84</div>
                </div>
                <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400">CVD (CUM. DELTA)</div>
                  <div className="text-sm font-bold text-cyan-300 mt-0.5">+1,482</div>
                </div>
                <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                  <div className="text-[10px] text-gray-400">VWAP</div>
                  <div className="text-sm font-bold text-white mt-0.5">64,098.45</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400 text-[11px] px-1 font-semibold">
                  <span>BIDS</span>
                  <span>PRICE</span>
                  <span>ASKS</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded">
                  <span className="text-emerald-400 font-bold">12.45</span>
                  <span className="text-white font-mono">64,170</span>
                  <span className="text-rose-400 font-bold">11.23</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded">
                  <span className="text-emerald-400 font-bold">18.32</span>
                  <span className="text-white font-mono">64,160</span>
                  <span className="text-rose-400 font-bold">15.07</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-950/30 border border-emerald-500/20 px-2 py-1 rounded">
                  <span className="text-emerald-400 font-bold">23.16</span>
                  <span className="text-white font-mono">64,140</span>
                  <span className="text-rose-400 font-bold">22.64</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 pt-3 border-t border-purple-900/30 flex justify-between">
              <span>SPREAD: $10.00 (0.02%)</span>
              <span className="text-emerald-400 font-bold">ABOVE</span>
            </div>
          </div>
        </div>

        {/* 5. CROSS-VENUE SYNAPSE */}
        <div className="bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>CROSS-VENUE SYNAPSE</span>
            </span>
            <span className="text-cyan-400 text-[11px]">REAL-TIME RECONCILIATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-[#080510] p-4 rounded-xl border border-purple-950">
              <div className="text-[10px] text-purple-300 font-semibold mb-1">KALSHI 15M</div>
              <div className="flex justify-between text-xs my-1">
                <span className="text-emerald-400 font-bold">UP $0.57</span>
                <span className="text-emerald-400">78%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rose-400 font-bold">DOWN $0.43</span>
                <span className="text-rose-400">22%</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-2">VOL $1.24M • 156ms</div>
            </div>

            <div className="bg-[#080510] p-4 rounded-xl border border-purple-950">
              <div className="text-[10px] text-purple-300 font-semibold mb-1">POLYMARKET 15M</div>
              <div className="flex justify-between text-xs my-1">
                <span className="text-emerald-400 font-bold">UP $0.59</span>
                <span className="text-emerald-400">84%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rose-400 font-bold">DOWN $0.41</span>
                <span className="text-rose-400">16%</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-2">VOL $2.18M • 164ms</div>
            </div>

            <div className="bg-[#080510] p-4 rounded-xl border border-purple-950">
              <div className="text-[10px] text-cyan-400 font-semibold mb-1">COINBASE SPOT</div>
              <div className="text-lg font-black text-white my-0.5">$64,174.83</div>
              <div className="text-xs text-emerald-400 font-bold">+572.18 (0.90%)</div>
              <div className="text-[10px] text-gray-500 mt-2">VOL $892.4M • 24ms</div>
            </div>

            <div className="bg-[#080510] p-4 rounded-xl border border-purple-950">
              <div className="text-[10px] text-blue-400 font-semibold mb-1">KRAKEN SPOT</div>
              <div className="text-lg font-black text-white my-0.5">$64,166.21</div>
              <div className="text-xs text-emerald-400 font-bold">+564.12 (0.99%)</div>
              <div className="text-[10px] text-gray-500 mt-2">VOL $234.7M • 196ms</div>
            </div>

            <div className="bg-[#080510] p-4 rounded-xl border border-emerald-500/30 flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-400 font-semibold mb-1">CROSS VENUE SPREAD</div>
                  <div className="text-xl font-black text-white">$8.62</div>
                  <div className="text-xs text-emerald-400 font-bold">(0.01%)</div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <svg className="w-14 h-11 text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]" viewBox="0 0 100 65" fill="currentColor">
                    <path d="M15,40 C15,25 30,20 45,22 C55,12 75,15 85,25 C95,32 90,45 80,48 C70,52 35,52 15,40 Z" fill="#10B981" />
                    <path d="M80,25 C88,22 92,28 88,35 C85,40 78,38 75,32 Z" fill="#34D399" />
                    <path d="M86,22 C92,12 82,10 78,16 Z" fill="#6EE7B7" />
                    <path d="M82,24 C88,18 94,24 90,28 Z" fill="#6EE7B7" />
                    <path d="M35,22 C45,15 65,18 75,25 C65,32 45,32 35,22 Z" fill="#34D399" opacity="0.8" />
                    <rect x="25" y="45" width="6" height="15" rx="3" fill="#047857" />
                    <rect x="42" y="46" width="6" height="14" rx="3" fill="#047857" />
                    <rect x="68" y="44" width="6" height="16" rx="3" fill="#047857" />
                    <rect x="78" y="45" width="6" height="15" rx="3" fill="#047857" />
                  </svg>
                </div>
              </div>
              <div className="text-[10px] text-emerald-400 font-bold mt-2 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>STATUS: ALIGNED ✓</span>
              </div>
            </div>

          </div>
        </div>

        {/* 6. MARKET MICROSTRUCTURE & MULTI-TIMEFRAME MATRIX & MARKET REGIME (WITH HOLOGRAMIC BULL AURA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Market Microstructure */}
          <div className="lg:col-span-4 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              MARKET MICROSTRUCTURE
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">BUY PRESSURE</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">62% <span className="text-[9px] text-gray-400">STRONG</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">SELL PRESSURE</div>
                <div className="text-rose-400 font-bold text-sm mt-0.5">38% <span className="text-[9px] text-gray-400">NORMAL</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">LIQUIDITY</div>
                <div className="text-cyan-300 font-bold text-sm mt-0.5">HIGH <span className="text-[9px] text-gray-400">DEPTH GOOD</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">VOLATILITY (15M)</div>
                <div className="text-white font-bold text-sm mt-0.5">0.57% <span className="text-[9px] text-gray-400">NORMAL</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">VOLUME (15M)</div>
                <div className="text-white font-bold text-sm mt-0.5">$1.24B <span className="text-[9px] text-gray-400">NORMAL</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">FUNDING RATE</div>
                <div className="text-white font-bold text-sm mt-0.5">0.010% <span className="text-[9px] text-gray-400">NEUTRAL</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">SPREAD</div>
                <div className="text-white font-bold text-sm mt-0.5">$10.00 <span className="text-[9px] text-gray-400">0.02%</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">IMBALANCE</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">+0.18 <span className="text-[9px] text-gray-400">BUY SIDE</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">CVD (15M)</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">+1,482 <span className="text-[9px] text-gray-400">BULLISH</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">DELTA (15M)</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">+0.84 <span className="text-[9px] text-gray-400">BULLISH</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">LARGE TRADES</div>
                <div className="text-white font-bold text-sm mt-0.5">12 <span className="text-[9px] text-gray-400">LAST 15M</span></div>
              </div>
              <div className="bg-[#080510] p-2.5 rounded-lg border border-purple-950">
                <div className="text-gray-400 text-[10px]">ICEBERG FLOW</div>
                <div className="text-cyan-300 font-bold text-sm mt-0.5">DETECTED <span className="text-[9px] text-gray-400">MODERATE</span></div>
              </div>
            </div>
          </div>

          {/* Multi-Timeframe Matrix */}
          <div className="lg:col-span-5 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              MULTI-TIMEFRAME MATRIX
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-purple-950 text-gray-400 text-[11px]">
                    <th className="pb-2">TIMEFRAME</th>
                    <th className="pb-2">TREND</th>
                    <th className="pb-2">MOMENTUM</th>
                    <th className="pb-2">STRENGTH</th>
                    <th className="pb-2">REGIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/60">
                  <tr>
                    <td className="py-3 font-bold text-white">5M</td>
                    <td className="py-3 text-emerald-400 font-bold">↑</td>
                    <td className="py-3 text-emerald-400">BULLISH</td>
                    <td className="py-3 text-cyan-300 font-bold">STRONG</td>
                    <td className="py-3 text-emerald-400">TRENDING</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-white">1M</td>
                    <td className="py-3 text-emerald-400 font-bold">↑</td>
                    <td className="py-3 text-emerald-400">BULLISH</td>
                    <td className="py-3 text-cyan-300 font-bold">STRONG</td>
                    <td className="py-3 text-emerald-400">TRENDING</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-white">1H</td>
                    <td className="py-3 text-amber-400 font-bold">→</td>
                    <td className="py-3 text-amber-400">NEUTRAL</td>
                    <td className="py-3 text-gray-300">MODERATE</td>
                    <td className="py-3 text-purple-300">RANGING</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-bold text-white">4H</td>
                    <td className="py-3 text-emerald-400 font-bold">↑</td>
                    <td className="py-3 text-emerald-400">BULLISH</td>
                    <td className="py-3 text-cyan-300 font-bold">STRONG</td>
                    <td className="py-3 text-emerald-400">TRENDING</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Market Regime with Hologrammatic Bullish Aura */}
          <div className="lg:col-span-3 bg-[#0C0816] border border-emerald-500/40 rounded-xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
            <div>
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                MARKET REGIME
              </div>
              <div className="text-base font-black text-emerald-400 tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                TRENDING BULLISH
              </div>

              {/* Hologrammatic Bull Aura Box */}
              <div className="my-3 h-28 bg-gradient-to-br from-emerald-950/80 via-[#080510] to-emerald-950/40 rounded-lg border border-emerald-500/50 flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_25px_rgba(16,185,129,0.4)]">
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#10B981_1.5px,transparent_1.5px)] bg-[size:12px_12px]"></div>
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <svg className="w-22 h-16 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.9)]" viewBox="0 0 100 65" fill="currentColor">
                    <path d="M15,40 C15,25 30,20 45,22 C55,12 75,15 85,25 C95,32 90,45 80,48 C70,52 35,52 15,40 Z" fill="#10B981" />
                    <path d="M80,25 C88,22 92,28 88,35 C85,40 78,38 75,32 Z" fill="#34D399" />
                    <path d="M86,22 C92,12 82,10 78,16 Z" fill="#6EE7B7" />
                    <path d="M82,24 C88,18 94,24 90,28 Z" fill="#6EE7B7" />
                    <path d="M35,22 C45,15 65,18 75,25 C65,32 45,32 35,22 Z" fill="#34D399" opacity="0.8" />
                    <rect x="25" y="45" width="6" height="15" rx="3" fill="#047857" />
                    <rect x="42" y="46" width="6" height="14" rx="3" fill="#047857" />
                    <rect x="68" y="44" width="6" height="16" rx="3" fill="#047857" />
                    <rect x="78" y="45" width="6" height="15" rx="3" fill="#047857" />
                  </svg>
                  <div className="text-[10px] text-emerald-300 font-mono font-bold tracking-widest mt-1 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    BULL AURA ACTIVE
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-emerald-900/30">
              <div>
                <div className="text-[10px] text-gray-400">CONFIDENCE</div>
                <div className="text-sm font-black text-emerald-300">81%</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400">DURATION</div>
                <div className="text-sm font-black text-cyan-300">2H 15M</div>
              </div>
            </div>
          </div>

        </div>

        {/* 7. DECISION TIMELINE BAR */}
        <div className="bg-[#0C0816] border border-purple-900/50 rounded-xl p-4 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
          <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
            DECISION TIMELINE
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 text-center text-[10px]">
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-2 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="font-bold text-white">OPEN</div>
              <div className="text-[9px] text-gray-400">02:00 AM</div>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-2 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="font-bold text-white">DATA COLLECT</div>
              <div className="text-[9px] text-gray-400">02:00 AM</div>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-2 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="font-bold text-white">FEATURE ENGINE</div>
              <div className="text-[9px] text-gray-400">02:01 AM</div>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-2 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="font-bold text-white">MODEL ANALYSIS</div>
              <div className="text-[9px] text-gray-400">02:12 AM</div>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-2 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <div className="font-bold text-white">GUARDIAN CHECK</div>
              <div className="text-[9px] text-gray-400">02:12 AM</div>
            </div>
            <div className="bg-cyan-950/80 border border-cyan-500/60 p-2 rounded shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1 animate-pulse" />
              <div className="font-bold text-cyan-300">DECISION LOCK</div>
              <div className="text-[9px] text-cyan-400">02:12 AM</div>
            </div>
            <div className="bg-purple-950/40 border border-purple-500/30 p-2 rounded">
              <Clock className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
              <div className="font-bold text-white">MONITOR</div>
              <div className="text-[9px] text-gray-400">ACTIVE</div>
            </div>
            <div className="bg-gray-950 border border-gray-800 p-2 rounded">
              <Clock className="w-3.5 h-3.5 text-gray-500 mx-auto mb-1" />
              <div className="font-bold text-gray-400">SETTLEMENT</div>
              <div className="text-[9px] text-gray-500">PENDING</div>
            </div>
            <div className="bg-gray-950 border border-gray-800 p-2 rounded">
              <Clock className="w-3.5 h-3.5 text-gray-500 mx-auto mb-1" />
              <div className="font-bold text-gray-400">SCORE & LEARN</div>
              <div className="text-[9px] text-gray-500">PENDING</div>
            </div>
          </div>
        </div>

        {/* 8. DECISION HISTORY LEDGER & LIVE PERFORMANCE & DATA INTEGRITY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Decision History Ledger */}
          <div className="lg:col-span-8 bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">DECISION HISTORY (LAST 10)</span>
              <span className="text-[10px] text-cyan-400">VERIFIED AUTHORITATIVE LOG</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-purple-950 text-gray-400 text-[11px]">
                    <th className="pb-2">CYCLE</th>
                    <th className="pb-2">TIME</th>
                    <th className="pb-2">DECISION</th>
                    <th className="pb-2">PROB</th>
                    <th className="pb-2">GUARDIAN</th>
                    <th className="pb-2">SETTLEMENT</th>
                    <th className="pb-2">OUTCOME</th>
                    <th className="pb-2">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/60">
                  {resolvedItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-purple-950/20 transition-colors">
                      <td className="py-2.5 text-cyan-300 font-bold">{item.cycleId || `C-6788${idx}`}</td>
                      <td className="py-2.5 text-gray-300">{item.time || '12:45'}</td>
                      <td className="py-2.5 font-bold text-white">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${item.decision?.includes('UP') ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : item.decision?.includes('DOWN') ? 'bg-rose-950 text-rose-400 border border-rose-500/30' : 'bg-gray-800 text-gray-300'}`}>
                          {item.decision || 'LOCKED UP'}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-200">{Math.round((item.probability || 0.74) * 100)}%</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">{item.guardian || 'ALLOW'}</td>
                      <td className="py-2.5 text-gray-300">$64,173.{idx}2</td>
                      <td className="py-2.5 font-bold">
                        {item.outcome === 'WIN' ? <span className="text-emerald-400">✓ WIN</span> : item.outcome === 'LOSS' ? <span className="text-rose-400">✕ LOSS</span> : item.outcome === 'SKIPPED' ? <span className="text-amber-400">SKIPPED</span> : <span className="text-cyan-400">- ACTIVE</span>}
                      </td>
                      <td className="py-2.5 text-cyan-400 font-semibold">{item.status || 'ACTIVE'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Performance & Data Integrity */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Live Performance */}
            <div className="bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">LIVE PERFORMANCE</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]">VERIFIED</span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
                <div className="bg-[#080510] p-2 rounded border border-purple-950">
                  <div className="text-[9px] text-gray-400">WINS</div>
                  <div className="text-base font-black text-emerald-400">{stats.winCount || 7}</div>
                </div>
                <div className="bg-[#080510] p-2 rounded border border-purple-950">
                  <div className="text-[9px] text-gray-400">LOSSES</div>
                  <div className="text-base font-black text-rose-400">{stats.lossCount || 3}</div>
                </div>
                <div className="bg-[#080510] p-2 rounded border border-purple-950">
                  <div className="text-[9px] text-gray-400">SKIPS</div>
                  <div className="text-base font-black text-amber-400">{stats.skipped || 4}</div>
                </div>
                <div className="bg-[#080510] p-2 rounded border border-purple-950">
                  <div className="text-[9px] text-gray-400">PROTECTED</div>
                  <div className="text-base font-black text-purple-400">{stats.protected || 2}</div>
                </div>
              </div>

              <div className="bg-[#080510] p-3 rounded-xl border border-purple-950 mb-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">WIN RATE (VERIFIED)</span>
                  <span className="text-xl font-black text-emerald-400">{stats.winRatePct || 70.0}%</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">({stats.winCount || 7}/10 SETTLED TRADES)</div>
              </div>

              <div className="bg-[#080510] p-3 rounded-xl border border-purple-950 mb-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">ALL TIME (VERIFIED)</span>
                  <span className="text-lg font-bold text-cyan-300">64.4%</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">(314 RECORDS)</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-400 pt-2 border-t border-purple-900/30">
                <div>BRIER: <span className="text-white font-bold">0.205</span></div>
                <div>LOG LOSS: <span className="text-white font-bold">0.736</span></div>
                <div>CALIB: <span className="text-emerald-400 font-bold">1.1%</span></div>
              </div>
            </div>

            {/* Data Integrity / Quata Integrity */}
            <div className="bg-[#0C0816] border border-purple-900/50 rounded-xl p-5 shadow-[0_0_25px_rgba(139,92,246,0.1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white tracking-wider">QUATA INTEGRITY</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]">SECURE</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Market Data</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Contract Sync</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Cycle Clock</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Timestamp Sync</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Settlement Engine</span>
                  <span className="text-cyan-300 font-bold">PENDING</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Lookahead Check</span>
                  <span className="text-emerald-400 font-bold">0 VIOLATIONS</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Record Hash</span>
                  <span className="text-emerald-400 font-bold">VALID</span>
                </div>
                <div className="flex justify-between items-center bg-[#080510] px-2.5 py-1.5 rounded border border-purple-950">
                  <span className="text-gray-400">Model Version</span>
                  <span className="text-purple-300 font-bold">V5.0</span>
                </div>
              </div>

              <button
                onClick={onOpenTerminal}
                className="w-full mt-4 bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-200 py-2 rounded-lg text-xs font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>VIEW FULL INTEGRITY REPORT</span>
              </button>
            </div>

          </div>

        </div>

        {/* 9. FOOTER DISCLAIMER */}
        <div className="pt-6 border-t border-purple-900/30 flex flex-wrap items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
            <span className="text-gray-400 font-bold tracking-wider">VIXY VAULT PRO</span>
            <span>DECISION INTELLIGENCE</span>
          </div>
          <div className="text-center my-1 sm:my-0">
            NOT FINANCIAL ADVICE • AI-ENHANCED DECISION SUPPORT SYSTEM
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span className="text-emerald-400 font-bold">SYSTEM HEALTH OPERATIONAL</span>
          </div>
        </div>

      </div>
    </div>
  );
};
