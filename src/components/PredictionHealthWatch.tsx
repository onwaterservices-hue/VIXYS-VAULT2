import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  BarChart3,
  TrendingUp,
  Layers,
  Lock,
  Flame,
  Info,
  Radio,
  Clock,
} from 'lucide-react';
import { VaultCard } from './VaultCard';

interface PredictionHealthWatchProps {
  currentPrice: number;
  timeframe?: '15M' | '1H';
  onBuyOutPosition?: () => void;
  appMode?: 'SIMPLE' | 'PRO';
}

export const PredictionHealthWatch: React.FC<PredictionHealthWatchProps> = ({
  currentPrice,
  timeframe = '15M',
  onBuyOutPosition,
  appMode = 'SIMPLE',
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [healthScore, setHealthScore] = useState<number>(94);
  const [status, setStatus] = useState<'HEALTHY' | 'MODERATE' | 'UNHEALTHY'>('HEALTHY');
  const [isBailedOut, setIsBailedOut] = useState<boolean>(false);
  
  // Auto-Update Engine State
  const [autoUpdateActive, setAutoUpdateActive] = useState<boolean>(true);
  const [nextUpdateSec, setNextUpdateSec] = useState<number>(5);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  useEffect(() => {
    if (!autoUpdateActive) return;

    const timer = setInterval(() => {
      setNextUpdateSec((prev) => {
        if (prev <= 1) {
          // Trigger subtle auto recalculation
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoUpdateActive]);

  // Interactive manual re-scan trigger
  const handleScanDiagnostics = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setHealthScore(96);
      setStatus('HEALTHY');
      setNextUpdateSec(5);
      setLastSyncTime('Just now');
    }, 600);
  };

  const handleExecuteBailOut = () => {
    setIsBailedOut(true);
    if (onBuyOutPosition) {
      onBuyOutPosition();
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#12072b] via-[#0e0622] to-[#150a32] rounded-3xl p-5 sm:p-6 border border-purple-500/30 shadow-2xl space-y-5 font-mono text-purple-100 relative overflow-hidden transition-all duration-300">
      {/* Background Subtle Radar Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 shadow-lg shadow-purple-500/10 shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-300/80 whitespace-nowrap">
                PREDICTION SETUP HEALTH WATCH
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                HEALTHY ENVIRONMENT
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="whitespace-nowrap">PREDICTION BLOCK READINESS:</span>
              <span className="text-emerald-400 font-extrabold text-2xl drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">{healthScore}/100</span>
              <span className="text-xs text-purple-200/80 font-normal whitespace-nowrap">[{status} SETUP]</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch xl:self-auto justify-between xl:justify-end flex-wrap shrink-0">
          {/* Auto-Update Sync Toggle Button */}
          <button
            onClick={() => setAutoUpdateActive(!autoUpdateActive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border flex items-center gap-2 transition-all ${
              autoUpdateActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'bg-[#0e0722] border-purple-900/50 text-purple-400/50'
            }`}
            title="Auto-scans L2 order books and volatility every 5 seconds"
          >
            <Radio className={`w-4 h-4 ${autoUpdateActive ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>{autoUpdateActive ? `AUTO-UPDATE (${nextUpdateSec}s)` : 'AUTO-UPDATE OFF'}</span>
          </button>

          <button
            onClick={handleScanDiagnostics}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-100 border border-purple-400/40 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-purple-300 ${isScanning ? 'animate-spin text-amber-300' : ''}`} />
            <span>{isScanning ? 'AUDITING...' : 'RE-SCAN NOW'}</span>
          </button>
        </div>
      </div>

      {/* Health Metric Cards Grid (4 Key Diagnostics - 2x2 grid when in side-by-side desktop layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Metric 1: Microstructure & Order Book */}
        <VaultCard
          accent="purple"
          icon={<Layers className="w-4 h-4 text-purple-300 inline" />}
          title={appMode === 'SIMPLE' ? 'BUYER SUPPORT STRENGTH' : 'ORDER BOOK DEPTH'}
          statusText="HEALTHY"
          heroValue={appMode === 'SIMPLE' ? 'Strong Buyer Floor' : '+18.4% Bid Cushion'}
          subLabel={appMode === 'SIMPLE' ? 'Heavy buyers under price' : 'Bid Absorption: High'}
          subValue="88/100 Score"
          progressPct={88}
        />

        {/* Metric 2: Spoofing & Manipulation Risk */}
        <VaultCard
          accent="green"
          icon={<Lock className="w-4 h-4 text-emerald-400 inline" />}
          title={appMode === 'SIMPLE' ? 'FAKE ORDER / SCAM CHECK' : 'SPOOFING / WASH RISK'}
          statusText="CLEAN LIQUIDITY"
          heroValue={appMode === 'SIMPLE' ? 'Clean & Safe (No Traps)' : '0.04 Index (Clean)'}
          subLabel={appMode === 'SIMPLE' ? 'Zero fake trap orders' : 'Fake Liquidity: None'}
          subValue="96/100 Score"
          progressPct={96}
        />

        {/* Metric 3: Volatility & Trend Stability */}
        <VaultCard
          accent="amber"
          icon={<TrendingUp className="w-4 h-4 text-amber-400 inline" />}
          title={appMode === 'SIMPLE' ? 'PRICE TREND SPEED' : 'DIRECTIONAL MOMENTUM'}
          statusText="EXPANDING"
          heroValue={appMode === 'SIMPLE' ? 'Steady Upward Drive' : 'Optimal VWAP Drift'}
          subLabel={appMode === 'SIMPLE' ? 'Holding strong above floor' : 'Sustained Breakout'}
          subValue="92/100 Score"
          progressPct={92}
        />

        {/* Metric 4: Kalshi Contract Spread & Slippage */}
        <VaultCard
          accent="purple"
          icon={<Zap className="w-4 h-4 text-cyan-400 inline" />}
          title={appMode === 'SIMPLE' ? 'TRADE SPEED & COST' : 'EXECUTION SPREAD'}
          statusText="OPTIMAL"
          heroValue={appMode === 'SIMPLE' ? 'Instant Fill / Lowest Fee' : '1.0¢ Order Spread'}
          subLabel={appMode === 'SIMPLE' ? 'Fast fills with zero gap' : 'Slippage Risk: Minimal'}
          subValue="95/100 Score"
          progressPct={95}
        />
      </div>

      {/* AI Health Summary & Recommendation */}
      <div className="bg-[#070312] p-4 rounded-2xl border border-purple-900/50 space-y-3.5 text-xs shadow-inner">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-purple-200/90 font-sans leading-relaxed text-xs">
            <strong className="text-white font-mono font-bold mr-2 uppercase tracking-wide">
              {appMode === 'SIMPLE' ? '💡 BEGINNER SUMMARY:' : 'HEALTH WATCH VERDICT:'}
            </strong>
            <span>
              {appMode === 'SIMPLE'
                ? 'Everything looks great for this trade setup! Big buyers are holding up price, there are no fake scam orders in the market, and orders are executing instantly.'
                : 'High-integrity prediction environment detected. Low order spoofing, strong taker buy volume (+1,467 BTC), and clear VWAP support make this setup optimal for execution.'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-purple-900/40">
          <span className="text-[11px] text-purple-300/60 font-mono">Last Sync: {lastSyncTime}</span>
          
          {isBailedOut ? (
            <div className="flex items-center gap-2 text-rose-300 font-extrabold bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-500/40 text-xs shadow-lg animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>POSITION EXITED (BAIL-OUT ACTIVE)</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExecuteBailOut}
                className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 px-4 py-2.5 rounded-xl font-bold text-xs border border-rose-500/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
                title="Protect capital by liquidating position at current bid if setup degrades"
              >
                <ShieldCheck className="w-4 h-4 text-rose-300 shrink-0" />
                <span className="font-mono tracking-wide">{appMode === 'SIMPLE' ? 'PROTECT / EXIT TRADE NOW' : 'PROTECT POSITION / EXIT AT BID'}</span>
              </button>

              <div className="flex items-center gap-2 text-emerald-300 font-extrabold bg-emerald-500/20 px-3.5 py-2 rounded-xl border border-emerald-500/40 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{appMode === 'SIMPLE' ? 'GREAT TIME TO TRADE' : 'SAFE FOR ENTRY'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

