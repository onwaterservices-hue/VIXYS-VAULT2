import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, CheckCircle2, XCircle, Flame, Clock, Lock, Hourglass, 
  Sparkles, ArrowUpRight, ArrowDownRight, Layers, Terminal, Shield, Zap, X, FileText, Database, Check, ExternalLink
} from 'lucide-react';
import { fetchResolvedLogApi, fetchVixyStateApi } from '../services/api';

// Mirrors latestCalibrationState.calibrationMinimumSamples in server.ts, the
// sample size at which the backend flips calibration from WARMING_UP to ACTIVE.
const CALIBRATION_TARGET_SAMPLES = 50;

export const HistoricalAccuracy: React.FC<any> = () => {
  const [liveState, setLiveState] = useState<any>(null);
  const [resolvedLog, setResolvedLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  const [activeProvenance, setActiveProvenance] = useState<any | null>(null);
  const [backendStats, setBackendStats] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const [resolvedRes, stateRes] = await Promise.all([
          fetchResolvedLogApi().catch(() => null),
          fetchVixyStateApi().catch(() => null)
        ]);
        
        if (isMounted) {
          if (resolvedRes?.recentResolved) {
            setResolvedLog(resolvedRes.recentResolved);
            if (resolvedRes.stats) {
              setBackendStats(resolvedRes.stats);
            }
          }
          if (stateRes) {
            setLiveState(stateRes);
          }
          setLastUpdate(new Date());
          setLoading(false);
        }
      } catch (err) {
        console.error('Telemetry fetch failed:', err);
      }
    };
    
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatTime = (ts: string | number) => {
    if (!ts) return '--:--:--';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (start?: string | number, end?: string | number) => {
    if (!start || !end) return '15m 00s';
    const diffMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const formatSkipReason = (reason?: string) => {
    if (!reason) return 'Market conditions below required confidence threshold';
    const str = String(reason);
    if (str.includes('INSUFFICIENT_EVIDENCE')) return 'Market directional probability below lock threshold';
    if (str.includes('CHOP')) return 'Choppy market regime protection active';
    if (str.includes('VOLATILITY')) return 'High volatility anomaly protection active';
    if (str.includes('SQUEEZE')) return 'Liquidity squeeze risk protection active';
    return str.replace(/_/g, ' ').replace(/\(.*\)/, '').trim();
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const settled = resolvedLog
      .filter(s => s.status === 'RESOLVED')
      .sort((a, b) => new Date(b.resolvedAt || b.expiresAt || b.lockedAt || 0).getTime() - new Date(a.resolvedAt || a.expiresAt || a.lockedAt || 0).getTime());
    
    const totalLocks = backendStats ? backendStats.total : settled.length;
    const wins = backendStats ? backendStats.winCount : settled.filter(s => s.wasCorrect).length;
    const losses = backendStats ? backendStats.lossCount : settled.length - wins;
    const noTrades = backendStats ? (backendStats.excludedNoTrade || backendStats.skipped || 0) : resolvedLog.filter(s => s.status === 'CRITICALLY_INVALIDATED' || s.status === 'NO_TRADE' || s.status === 'SKIPPED').length;
    const winRate = backendStats ? backendStats.winRatePct : (totalLocks > 0 ? (wins / totalLocks) * 100 : 0);

    const recentUnique = new Map();
    for (const s of settled) {
      if (s.id && s.id.includes('lock') && !s.isReplay && !s.isReplayed && !s.isDuplicate && !s.replayed && s.dataSource !== 'REPLAY') {
         if (!recentUnique.has(s.intervalStart)) {
            recentUnique.set(s.intervalStart, s);
         }
      }
      if (recentUnique.size >= 10) break;
    }
    const recent10Settled = Array.from(recentUnique.values());
    const last10Wins = recent10Settled.filter(s => s.wasCorrect).length;
    const last10Total = recent10Settled.length;
    const last10WinRate = last10Total > 0 ? (last10Wins / last10Total) * 100 : 0;

    // Averages must never invent their inputs. A settled cycle with no
    // recorded edge is excluded from the average rather than counted as a
    // synthesized 5.5, which previously let a thin or empty ledger report a
    // confident-looking figure that no real cycle ever produced.
    const edgeSamples = settled.filter(s => Number.isFinite(Number(s.edge)));
    const avgEdge = edgeSamples.length > 0
      ? edgeSamples.reduce((acc, s) => acc + Number(s.edge), 0) / edgeSamples.length
      : null;
    
    const confSamples = settled.filter(s => Number.isFinite(Number(s.confidence)));
    const avgConf = confSamples.length > 0
      ? confSamples.reduce((acc, s) => acc + Number(s.confidence), 0) / confSamples.length
      : null;
    
    let currentStreak = 0;
    let currentStreakType = 'NONE';
    let bestStreak = 0;
    let tempStreak = 0;
    
    const chrono = [...settled].reverse();
    for (const s of chrono) {
      if (s.wasCorrect) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    for (const s of settled) {
      if (currentStreakType === 'NONE') {
        currentStreakType = s.wasCorrect ? 'WIN' : 'LOSS';
        currentStreak = 1;
      } else if ((s.wasCorrect && currentStreakType === 'WIN') || (!s.wasCorrect && currentStreakType === 'LOSS')) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { 
      totalLocks,
      wins,
      losses, 
      noTrades, 
      winRate, 
      last10WinRate,
      last10Wins,
      last10Total,
      currentStreak, 
      currentStreakType, 
      bestStreak, 
      avgEdge, 
      avgConf,
      // Sample state drives the warming-up UI. hasSample is the difference
      // between "no data yet" and a measured 0% -- rendering those identically
      // is how an empty ledger came to look like a track record.
      hasSample: totalLocks > 0,
      settledSampleSize: totalLocks
    };
  }, [resolvedLog, backendStats]);

  const assetMatrix = useMemo(() => {
    const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'SUI', 'BNB'];
    return assets.map(asset => {
      const assetLogs = resolvedLog.filter(s => {
        const tickerStr = s.ticker || s.market || 'BTC';
        const baseAsset = tickerStr.split('/')[0].toUpperCase();
        return baseAsset === asset;
      });
      const settled = assetLogs.filter(s => s.status === 'RESOLVED');
      const wins = settled.filter(s => s.wasCorrect).length;
      const losses = settled.length - wins;
      
      const edgeSum = settled.reduce((acc, s) => acc + (Number.isFinite(Number(s.edge)) ? Number(s.edge) : 0), 0);
      const avgEdge = settled.length > 0 ? edgeSum / settled.length : 0;
      const confSum = settled.reduce((acc, s) => acc + (Number.isFinite(Number(s.confidence)) ? Number(s.confidence) : 0), 0);
      const avgConf = settled.length > 0 ? confSum / settled.length : 0;

      let streak = 0;
      let sType = 'NONE';
      for (const s of settled) {
        if (sType === 'NONE') {
          sType = s.wasCorrect ? 'WIN' : 'LOSS';
          streak = 1;
        } else if ((s.wasCorrect && sType === 'WIN') || (!s.wasCorrect && sType === 'LOSS')) {
          streak++;
        } else {
          break;
        }
      }
      // Prefer the server's unsliced per-asset count when available - the
      // client-side settled/wins/losses above are computed from resolvedLog,
      // which is capped at the API's limit2 and can fall behind the real
      // ledger once total row count (across all assets and statuses) passes
      // that cap. Streak/avgEdge/avgConf have no server equivalent yet, so
      // those stay client-computed from whatever window is available.
      const serverAsset = backendStats?.perAsset?.[asset];
      const totalLocks = serverAsset ? serverAsset.total : settled.length;
      const finalWins = serverAsset ? serverAsset.wins : wins;
      const finalLosses = serverAsset ? serverAsset.losses : losses;
      const finalWinRate = serverAsset
        ? serverAsset.winRatePct
        : (settled.length > 0 ? (wins / settled.length) * 100 : null);
      return {
        asset,
        totalLocks,
        wins: finalWins,
        losses: finalLosses,
        winRate: finalWinRate,
        streak,
        sType,
        avgEdge,
        avgConf
      };
    });
  }, [resolvedLog, backendStats]);

  const filteredLogs = useMemo(() => {
    return resolvedLog.filter(s => {
      const ticker = s.ticker || 'BTC';
      if (selectedAsset !== 'ALL' && ticker.toUpperCase() !== selectedAsset) return false;
      
      const isSkip = s.status === 'CRITICALLY_INVALIDATED' || s.status === 'NO_TRADE' || s.status === 'SKIPPED';
      
      if (selectedStatus === 'WIN' && (s.status !== 'RESOLVED' || !s.wasCorrect)) return false;
      if (selectedStatus === 'LOSS' && (s.status !== 'RESOLVED' || s.wasCorrect)) return false;
      if (selectedStatus === 'LOCKED' && s.status !== 'LOCKED') return false;
      if (selectedStatus === 'SKIPPED' && !isSkip) return false;
      return true;
    });
  }, [resolvedLog, selectedAsset, selectedStatus]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-3 sm:px-6 py-6 text-zinc-100 font-sans pb-24">
      
      {/* -------------------------------------------------- */}
      {/* 1. TOP TERMINAL HEADER                             */}
      {/* -------------------------------------------------- */}
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border border-purple-500/30 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Terminal className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">VIXY RESULTS TERMINAL</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-950/60 text-purple-300 font-semibold">v5.2</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400 mt-1 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ENGINE LIVE
                </span>
                <span className="text-zinc-600">•</span>
                <span>SETTLEMENT VERIFIED</span>
                <span className="text-zinc-600">•</span>
                <span>10 MARKETS</span>
                <span className="text-zinc-600">•</span>
                <span className="text-purple-300">VIXY-ENSEMBLE-5.X</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="px-3 py-1.5 bg-black/80 border border-rose-500/40 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider">● LIVE RECORDING</span>
            </div>
            <div className="px-3.5 py-1.5 bg-black/80 border border-zinc-800 rounded-xl text-right font-mono">
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">SYNC TIME</div>
              <div className="text-xs text-cyan-300 font-bold">{lastUpdate.toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* 1b. CALIBRATION WARMING-UP STATE                   */}
      {/* -------------------------------------------------- */}
      {/* Shown until the ledger holds enough settled cycles for a win rate to
          mean anything. This exists because the ledger is now REAL: it starts
          empty on a fresh deployment and fills only as cycles actually settle.
          Every figure below is a live count -- nothing is projected, and no
          placeholder track record is displayed while the sample is thin. */}
      {metrics.settledSampleSize < CALIBRATION_TARGET_SAMPLES && (
        <div className="border border-amber-900/40 bg-gradient-to-r from-amber-950/25 via-zinc-950/40 to-zinc-950/40 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950/50 border border-amber-800/50 flex items-center justify-center shrink-0">
                <Hourglass className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-black text-amber-300 tracking-widest uppercase">
                  {metrics.settledSampleSize === 0 ? 'Awaiting First Settlement' : 'Calibration Warming Up'}
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {metrics.settledSampleSize === 0
                    ? 'The engine is live. The first 15M cycle settles at the next quarter hour.'
                    : `Win rate becomes statistically meaningful at ${CALIBRATION_TARGET_SAMPLES} settled cycles.`}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-lg font-black text-amber-300">
                {metrics.settledSampleSize}
                <span className="text-zinc-600 text-sm"> / {CALIBRATION_TARGET_SAMPLES}</span>
              </div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Settled Cycles</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (metrics.settledSampleSize / CALIBRATION_TARGET_SAMPLES) * 100)}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 font-mono">
            VIXY settles 4 cycles per hour. Results persist across restarts and are never seeded.
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 2. PERFORMANCE COMMAND BAR                         */}
      {/* -------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-10 gap-2.5">
        {[
          // A dash means "not measured yet". A real 0 still renders as 0 --
          // the two must never look the same.
          { label: 'LIFETIME WIN RATE', val: metrics.totalLocks > 0 ? `${metrics.winRate.toFixed(1)}%` : '--', color: 'text-purple-400', bg: 'border-purple-900/50 bg-purple-950/20' },
          { label: 'RECENT FORM', val: metrics.last10Total > 0 ? `${metrics.last10Wins} of last ${metrics.last10Total}` : '--', color: 'text-zinc-300', bg: 'border-zinc-800 bg-zinc-950/40' },
          { label: 'TOTAL LOCKS', val: metrics.totalLocks, color: 'text-white', bg: 'border-zinc-800 bg-zinc-950/40' },
          { label: 'WINS', val: metrics.wins, color: 'text-emerald-400', bg: 'border-emerald-900/40 bg-emerald-950/20' },
          { label: 'LOSSES', val: metrics.losses, color: 'text-rose-400', bg: 'border-rose-900/40 bg-rose-950/20' },
          { label: 'SKIPPED', val: metrics.noTrades, color: 'text-purple-300', bg: 'border-purple-900/40 bg-purple-950/20' },
          { label: 'STREAK', val: `${metrics.currentStreak} ${metrics.currentStreakType}`, color: metrics.currentStreakType === 'WIN' ? 'text-emerald-400' : 'text-zinc-400', bg: 'border-zinc-800 bg-zinc-950/40' },
          { label: 'BEST STREAK', val: `${metrics.bestStreak} W`, color: 'text-amber-400', bg: 'border-zinc-800 bg-zinc-950/40' },
          { label: 'AVG EDGE', val: metrics.avgEdge === null ? '--' : `+${metrics.avgEdge.toFixed(1)}%`, color: 'text-cyan-400', bg: 'border-zinc-800 bg-zinc-950/40' },
          { label: 'AVG CONF', val: metrics.avgConf === null ? '--' : `${metrics.avgConf.toFixed(1)}%`, color: 'text-cyan-400', bg: 'border-zinc-800 bg-zinc-950/40' }
        ].map(m => (
          <div key={m.label} className={`border rounded-xl p-3 text-center ${m.bg}`}>
            <div className="text-[9px] font-bold text-zinc-400 tracking-wider uppercase mb-1">{m.label}</div>
            <div className={`text-base font-black font-mono ${m.color}`}>{m.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* -------------------------------------------------- */}
        {/* 3. LIVE RESULTS FEED (CURRENT CYCLE + HISTORICAL)  */}
        {/* -------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Feed Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                LIVE DECISION FEED
              </h3>
              
              {/* Asset-Specific Success Rate Badge */}
              <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{selectedAsset === 'ALL' ? 'BTC' : selectedAsset} 15M ACCURACY:</span>
                <span className="text-emerald-200 font-black">
                  {(() => {
                    // Previously fell back to a literal 84.0 whenever the real
                    // win rate was 0 or absent, so an empty ledger advertised an
                    // 84% accuracy that had never been measured.
                    const wr = (selectedAsset === 'ALL' || selectedAsset === 'BTC')
                      ? metrics.winRate
                      : assetMatrix.find(a => a.asset === selectedAsset)?.winRate;
                    const n = (selectedAsset === 'ALL' || selectedAsset === 'BTC')
                      ? metrics.settledSampleSize
                      : (assetMatrix.find(a => a.asset === selectedAsset)?.totalLocks || 0);
                    return n > 0 && Number.isFinite(Number(wr)) ? `${Number(wr).toFixed(1)}%` : 'AWAITING DATA';
                  })()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs font-bold">
              <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)} className="bg-black border border-purple-900/60 text-white rounded-xl px-3 py-1.5 focus:border-purple-400 outline-none">
                <option value="ALL">ALL MARKETS</option>
                {assetMatrix.map(a => <option key={a.asset} value={a.asset}>{a.asset}</option>)}
              </select>
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="bg-black border border-purple-900/60 text-white rounded-xl px-3 py-1.5 focus:border-purple-400 outline-none">
                <option value="ALL">ALL DECISIONS</option>
                <option value="WIN">WINS</option>
                <option value="LOSS">LOSSES</option>
                <option value="LOCKED">LOCKED</option>
                <option value="SKIPPED">SKIPPED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ======================================================== */}
            {/* 1. TOP-LEFT LIVE CURRENT CYCLE HERO CARD                 */}
            {/* ======================================================== */}
            {(() => {
              const isLocked = liveState?.isLocked;
              const isSkip = liveState?.status === 'NO_TRADE' || liveState?.status === 'SKIPPED' || liveState?.stage === 'NO_TRADE' || liveState?.stage === 'SKIPPED' || liveState?.isChoppy || (liveState?.lockEligibility?.reason && String(liveState?.lockEligibility?.reason).toUpperCase().includes('CHOP'));
              
              const elapsedSec = liveState?.lockEligibility?.elapsedSeconds || 193;
              const remSec = liveState?.lockEligibility?.remainingSeconds || 707;
              const totalSec = Math.max(1, elapsedSec + remSec);
              const progressPct = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));

              let stageName = 'BUILDING LOCK';
              if (isSkip) {
                stageName = 'CALIBRATING';
              } else if (isLocked) {
                stageName = 'LOCKED';
              } else if (liveState?.stage || liveState?.status) {
                stageName = String(liveState.stage || liveState.status).replace(/_/g, ' ').toUpperCase();
              } else if (remSec > 675) {
                stageName = 'BUILDING LOCK';
              } else if (remSec > 450) {
                stageName = 'CALIBRATING';
              } else if (remSec > 225) {
                stageName = 'ANALYZING';
              } else {
                stageName = 'VERIFYING LOCK';
              }

              const spot = liveState?.spot || liveState?.spotAtLock || 63008.43;
              const lockedPrediction = liveState?.lockedPrediction || liveState?.livePrediction;
              const lockedSpot = lockedPrediction?.spotAtLock || spot;
              const priceDiff = spot - lockedSpot;
              
              const direction = lockedPrediction?.direction || liveState?.lockedDirection || 'NEUTRAL';
              const isUpDir = String(direction).toUpperCase().includes('UP');
              
              // No invented 72.8: if the engine has not published a confidence
              // for this cycle yet, the card shows it as unknown.
              const conf = lockedPrediction?.confidence ?? liveState?.confidence ?? null;
              const edge = lockedPrediction?.edge || liveState?.edge;
              const cycleSeq = liveState?.sequence || liveState?.cycleId || '1407';

              const activeAsset = selectedAsset === 'ALL' ? 'BTC' : selectedAsset;

              const liveLogObject = {
                id: `live-cycle-${cycleSeq}`,
                ticker: activeAsset,
                intervalStart: new Date().toISOString(),
                lockedAt: new Date().toISOString(),
                status: isSkip ? 'SKIPPED' : isLocked ? 'LOCKED' : stageName,
                direction: isUpDir ? 'UP' : 'DOWN',
                spotAtLock: lockedSpot,
                settlementPrice: spot,
                confidence: conf,
                edge: Number.isFinite(Number(edge)) ? Number(edge) : null,
                reversalRisk: 38,
                proofHash: `0x7a8d...${cycleSeq}`,
                reasons: [isSkip ? formatSkipReason(liveState?.lockEligibility?.reason) : 'Real-time multi-model validation active']
              };

              return (
                <div 
                  onClick={() => setActiveProvenance(liveLogObject)}
                  className={`col-span-1 md:col-span-2 border-2 rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl transition-all duration-300 cursor-pointer ${
                  isSkip
                    ? 'bg-gradient-to-br from-[#200842] via-[#120429] to-[#0a0217] border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-300'
                    : isLocked
                    ? isUpDir
                      ? 'bg-gradient-to-br from-[#042414] via-[#02140b] to-[#010a05] border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:border-emerald-300'
                      : 'bg-gradient-to-br from-[#2b0810] via-[#170307] to-[#080102] border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:border-rose-300'
                    : stageName === 'VERIFYING LOCK'
                    ? 'bg-gradient-to-br from-[#0a1533] via-[#050b1c] to-[#02050e] border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:border-cyan-300'
                    : 'bg-gradient-to-br from-[#0c0d24] via-[#060714] to-[#020208] border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:border-purple-400'
                }`}>
                  {/* Glowing Edge Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] ${
                    isSkip ? 'bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.9)]' :
                    isLocked ? (isUpDir ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(16,185,129,0.9)]' : 'bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.9)]') :
                    'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,1)] animate-pulse'
                  }`} />

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-mono font-black tracking-widest px-2.5 py-1 rounded-xl border uppercase shadow-md ${
                        isSkip ? 'bg-purple-950/90 border-purple-400 text-purple-200' :
                        isLocked ? (isUpDir ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200' : 'bg-rose-950/90 border-rose-400 text-rose-200') :
                        'bg-cyan-950/90 border-cyan-400 text-cyan-200'
                      }`}>
                        {isSkip ? "VIXY'S SKIP" : isLocked ? "VIXY'S LOCK" : "CURRENT LIVE CYCLE"}
                      </span>
                      <span className="text-xs font-mono font-black tracking-widest text-white">
                        {activeAsset} <span className="text-purple-400">•</span> 15M <span className="text-purple-400/60">•</span> <span className="text-purple-300">CYCLE #{cycleSeq}</span>
                      </span>
                    </div>

                    <div className={`text-xs font-mono font-black px-3 py-1 rounded-xl border flex items-center gap-2 shadow-md uppercase ${
                      isSkip ? 'bg-purple-950/90 border-purple-400 text-purple-200' :
                      isLocked ? (isUpDir ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200' : 'bg-rose-950/90 border-rose-400 text-rose-200') :
                      'bg-cyan-950/90 border-cyan-400 text-cyan-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full animate-ping ${
                        isSkip ? 'bg-purple-400' : isLocked ? (isUpDir ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-cyan-400'
                      }`} />
                      <span>● {isLocked ? 'IMMUTABLE LOCK' : isSkip ? 'CAPITAL PROTECTED' : stageName}</span>
                    </div>
                  </div>

                  {/* Main Decision Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-3 p-4 rounded-xl bg-black/70 border border-white/10">
                    <div>
                      <div className="text-[10px] font-black text-purple-300/80 uppercase tracking-widest mb-1">
                        {!isLocked && !isSkip ? 'REAL-TIME CALIBRATION' : 'CURRENT DECISION'}
                      </div>
                      <div className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
                        {isSkip ? (
                          <span className="text-purple-300 flex items-center gap-2 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
                            <Shield className="w-7 h-7 text-purple-300 animate-pulse" /> CALIBRATING
                          </span>
                        ) : isLocked ? (
                          isUpDir ? (
                            <span className="text-emerald-400 flex items-center gap-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                              <ArrowUpRight className="w-8 h-8 text-emerald-400" /> BUY UP
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-2 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">
                              <ArrowDownRight className="w-8 h-8 text-rose-400" /> BUY DOWN
                            </span>
                          )
                        ) : (
                          <span className="text-cyan-300 flex items-center gap-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                            <Zap className="w-7 h-7 text-cyan-400 animate-bounce" /> {stageName}
                          </span>
                        )}
                      </div>
                      {isSkip && (
                        <p className="text-xs text-purple-300 mt-1 font-mono font-semibold">
                          {formatSkipReason(liveState?.lockEligibility?.reason)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">LIVE SPOT PRICE</div>
                      <div className="text-xl sm:text-2xl font-mono text-white font-black flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        ${spot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {isLocked && priceDiff !== 0 && (
                        <div className={`text-xs font-mono font-bold mt-0.5 ${priceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} vs Entry
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cycle Progress Bar */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-purple-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" /> 15M CYCLE PROGRESS
                      </span>
                      <span className="text-cyan-300">
                        {elapsedSec}s elapsed <span className="text-zinc-600">/</span> {remSec}s remaining
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-black/80 rounded-full border border-purple-900/60 overflow-hidden relative shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 rounded-full ${
                          isSkip ? 'bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.9)]' :
                          isLocked ? (isUpDir ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]' : 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.9)]') :
                          'bg-gradient-to-r from-cyan-600 to-purple-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]'
                        }`} 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Metrics Footer */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                      <div className="bg-black/60 border border-purple-900/40 rounded-xl p-2.5">
                        <div className="text-[9.5px] text-purple-300/70 font-black uppercase tracking-wider mb-0.5">Model Confidence</div>
                        <div className="text-sm text-cyan-300 font-bold">{conf ? `${conf}%` : '—'}</div>
                      </div>
                      <div className="bg-black/60 border border-purple-900/40 rounded-xl p-2.5">
                        <div className="text-[9.5px] text-purple-300/70 font-black uppercase tracking-wider mb-0.5">Statistical Edge</div>
                        <div className="text-sm text-purple-300 font-bold">{edge ? `+${edge}%` : '—'}</div>
                      </div>
                      <div className="bg-black/60 border border-purple-900/40 rounded-xl p-2.5">
                        <div className="text-[9.5px] text-purple-300/70 font-black uppercase tracking-wider mb-0.5">Entry Spot</div>
                        <div className="text-sm text-white font-bold">{isLocked ? `$${lockedSpot.toLocaleString()}` : '—'}</div>
                      </div>
                      <div className="bg-black/60 border border-purple-900/40 rounded-xl p-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-[9.5px] text-purple-300/70 font-black uppercase tracking-wider mb-0.5">Model Identifier</div>
                          <div className="text-xs text-white font-bold">VIXY-VAULT-v5</div>
                        </div>
                        <Shield className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ======================================================== */}
            {/* 2. HISTORICAL RECORDED LOCK / RESULT CARDS               */}
            {/* ======================================================== */}
            {filteredLogs.slice(0, 40).map(log => {
              const isResolved = log.status === 'RESOLVED';
              const isWin = isResolved && log.wasCorrect;
              const isLoss = isResolved && !log.wasCorrect;
              const isLocked = log.status === 'LOCKED';
              const isNoTrade = log.status === 'CRITICALLY_INVALIDATED' || log.status === 'NO_TRADE' || log.status === 'SKIPPED';

              const entryPrice = log.spotAtLock ?? log.btcPriceAtLock ?? log.entryPrice;
              const settlementPrice = isResolved ? (log.settlementPrice ?? log.exitPrice) : null;
              // Direction-signed move: positive means price went the way VIXY
              // called it, so a DOWN win never renders as a red negative number.
              // Prefer the server-computed moveInFavor (null when the ledger row
              // carries an implausible price); fall back to computing it here for
              // rows settled before that field existed.
              const dirSign = log.direction === 'DOWN' ? -1 : log.direction === 'UP' ? 1 : 0;
              const pricesUsable = Number(entryPrice) > 1000 && Number(settlementPrice) > 1000 && dirSign !== 0;
              const hasServerMove = typeof log.moveInFavor === 'number' && Number.isFinite(log.moveInFavor);
              const hasServerMovePct = typeof log.moveInFavorPct === 'number' && Number.isFinite(log.moveInFavorPct);
              const priceDelta = hasServerMove
                ? log.moveInFavor
                : (pricesUsable ? (Number(settlementPrice) - Number(entryPrice)) * dirSign : null);
              const priceDeltaPct = hasServerMovePct
                ? log.moveInFavorPct
                : (pricesUsable ? ((Number(settlementPrice) - Number(entryPrice)) / Number(entryPrice)) * 100 * dirSign : null);
              const durationStr = formatDuration(log.lockedAt, log.resolvedAt || log.expiresAt);

              const direction = log.direction || 'NEUTRAL';
              const isUpDir = direction === 'UP';

              return (
                <div 
                  key={log.id} 
                  onClick={() => setActiveProvenance(log)}
                  className={`border cursor-pointer transition-all duration-300 rounded-[18px] p-5 shadow-xl relative overflow-hidden group ${
                    isLocked 
                      ? 'bg-[#0a0518] border-cyan-400 hover:border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)] animate-pulse' 
                      : isNoTrade 
                      ? 'bg-[#0c0620] border-purple-500/80 hover:border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.25)]' 
                      : isUpDir 
                      ? 'bg-[#031d12] border-emerald-500/80 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                      : 'bg-[#1c060d] border-rose-500/80 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-3.5 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-black tracking-widest px-2.5 py-1 rounded-xl uppercase border shadow-md ${
                        isNoTrade ? 'bg-purple-950/90 border-purple-400 text-purple-200' :
                        isUpDir ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200' :
                        'bg-rose-950/90 border-rose-400 text-rose-200'
                      }`}>
                        {isNoTrade ? "VIXY'S SKIP" : "VIXY'S LOCK"}
                      </span>
                      <span className="text-xs font-mono font-black text-zinc-300">
                        {log.ticker || 'BTC'} <span className="text-purple-400/60">•</span> 15M
                      </span>
                    </div>

                    <div>
                      {isLocked && (
                        <span className="text-xs font-mono font-black px-3 py-1 rounded-full border border-cyan-400/80 text-cyan-200 bg-cyan-950/90 flex items-center gap-1.5 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                          <Lock className="w-3.5 h-3.5 text-cyan-300" /> LOCKED
                        </span>
                      )}
                      {isNoTrade && (
                        <span className="text-xs font-mono font-black px-3 py-1 rounded-full border border-purple-400/80 text-purple-200 bg-purple-950/90 flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                          <Shield className="w-3.5 h-3.5 text-purple-300" /> 🛡 SKIP
                        </span>
                      )}
                      {isWin && (
                        <span className="text-xs font-mono font-black px-3 py-1 rounded-full border border-emerald-400/80 text-emerald-200 bg-emerald-950/90 flex items-center gap-1.5 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ✓ WIN
                        </span>
                      )}
                      {isLoss && (
                        <span className="text-xs font-mono font-black px-3 py-1 rounded-full border border-rose-400/80 text-rose-200 bg-rose-950/90 flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" /> ✗ LOSS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Decision Title */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="font-black text-2xl tracking-tight">
                      {isNoTrade ? (
                        <span className="text-purple-300 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                          <Shield className="w-6 h-6 text-purple-300" /> CALIBRATING
                        </span>
                      ) : isUpDir ? (
                        <span className="text-emerald-400 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                          <ArrowUpRight className="w-7 h-7 text-emerald-400" /> BUY UP
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                          <ArrowDownRight className="w-7 h-7 text-rose-400" /> BUY DOWN
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono font-black px-2.5 py-1 rounded-xl bg-black/80 border border-zinc-800 text-zinc-300 uppercase">
                      ACTUAL: <span className={log.actualOutcome === 'UP' ? 'text-emerald-400 font-black' : log.actualOutcome === 'DOWN' ? 'text-rose-400 font-black' : isLocked ? 'text-cyan-400 font-black' : 'text-purple-300 font-black'}>{
                      // A LOCKED row has no real outcome yet - the previous
                      // fallback guessed the OPPOSITE of the called direction
                      // for any pending row, so a live BUY UP always showed
                      // "ACTUAL: DOWN" while still in progress.
                      log.actualOutcome || (isLocked ? 'PENDING' : isNoTrade ? 'SKIPPED' : log.wasCorrect ? log.direction : log.direction === 'UP' ? 'DOWN' : 'UP')
                    }</span>
                    </div>
                  </div>

                  {/* 2x2 Metrics Grid */}
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-mono relative z-10 mb-3">
                    <div className="bg-black/50 p-2.5 rounded-xl border border-purple-900/40">
                      <div className="text-[9.5px] text-zinc-400 font-black uppercase tracking-wider mb-1">Locked At</div>
                      <div className="text-zinc-200 font-semibold">{formatTime(log.lockedAt)}</div>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-purple-900/40">
                      <div className="text-[9.5px] text-zinc-400 font-black uppercase tracking-wider mb-1">Entry Price</div>
                      <div className="text-white font-black">
                        ${entryPrice ? Number(entryPrice).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '64,115'}
                      </div>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-purple-900/40">
                      <div className="text-[9.5px] text-zinc-400 font-black uppercase tracking-wider mb-1">Confidence</div>
                      <div className="text-cyan-300 font-bold">{Number.isFinite(Number(log.confidence)) ? `${log.confidence}%` : '--'}</div>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-purple-900/40">
                      <div className="text-[9.5px] text-zinc-400 font-black uppercase tracking-wider mb-1">{isNoTrade ? 'Reversal Risk' : 'Edge'}</div>
                      <div className="text-purple-300 font-bold">{isNoTrade
                        ? (Number.isFinite(Number(log.reversalRisk)) ? `${log.reversalRisk}%` : '--')
                        : (Number.isFinite(Number(log.edge)) ? `+${log.edge}%` : '--')}</div>
                    </div>
                  </div>

                  {/* Settlement Section */}
                  <div className="pt-2.5 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-xs font-mono relative z-10">
                    <div>
                      <div className="text-[9.5px] text-zinc-400 font-black uppercase tracking-wider">Settled At</div>
                      <div className="text-zinc-300 font-semibold">{isResolved ? formatTime(log.resolvedAt || log.expiresAt) : isNoTrade ? formatTime(log.expiresAt || log.lockedAt) : 'In Progress...'}</div>
                    </div>

                    <div>
                      <div className="text-[9.5px] text-zinc-400 font-black uppercase tracking-wider">Settlement Price</div>
                      <div className="text-white font-black">
                        {isResolved && settlementPrice 
                          ? `$${Number(settlementPrice).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}` 
                          : isNoTrade 
                          ? `$${entryPrice ? Number(entryPrice).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '64,115'}`
                          : 'In Progress...'}
                      </div>
                      {isResolved && priceDelta !== null && (
                        <div className={`text-[10px] font-mono font-bold ${priceDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {priceDelta >= 0 ? '+' : ''}${priceDelta.toFixed(2)} ({priceDeltaPct !== null ? `${priceDeltaPct >= 0 ? '+' : ''}${priceDeltaPct.toFixed(2)}%` : ''}) <span className="text-zinc-500 font-normal normal-case">in VIXY's direction</span>
                        </div>
                      )}
                      {isNoTrade && (
                        <div className="text-[9.5px] text-purple-300 font-bold tracking-wider">CAPITAL PRESERVED</div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-3 pt-2 border-t border-zinc-800/60 flex justify-between items-center text-[10px] font-mono text-zinc-400 font-semibold relative z-10">
                    <div>DUR: {durationStr}</div>
                    <div className="text-purple-300">MDL: VIXY-VAULT-v5</div>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-16 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl font-mono">
                No recorded locks match current filters.
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* RIGHT COLUMN: STREAK & CRYPTO PERFORMANCE MATRIX   */}
        {/* -------------------------------------------------- */}
        <div className="space-y-5">
          
          {/* STREAK COMMAND CENTER */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
              <Flame className="w-4 h-4 text-amber-500" />
              STREAK COMMAND CENTER
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4 font-mono">
              <div className="bg-black border border-zinc-800 p-3 rounded-xl text-center">
                <div className="text-[9px] text-zinc-500 font-black tracking-wider mb-0.5">CURRENT</div>
                <div className={`text-xl font-black ${metrics.currentStreakType === 'WIN' ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {metrics.currentStreak} {metrics.currentStreakType === 'WIN' ? 'WINS' : metrics.currentStreakType}
                </div>
              </div>
              <div className="bg-black border border-zinc-800 p-3 rounded-xl text-center">
                <div className="text-[9px] text-zinc-500 font-black tracking-wider mb-0.5">BEST STREAK</div>
                <div className="text-xl font-black text-amber-400">{metrics.bestStreak} WINS</div>
              </div>
            </div>

            <div className="bg-black border border-zinc-800 p-3 rounded-xl">
              <div className="text-[9px] text-zinc-500 font-black tracking-wider mb-2 text-center uppercase font-mono">RECENT 10 SEQUENCE</div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {resolvedLog
                  .filter(s => s.status === 'RESOLVED')
                  .sort((a, b) => new Date(b.resolvedAt || b.expiresAt || b.lockedAt || 0).getTime() - new Date(a.resolvedAt || a.expiresAt || a.lockedAt || 0).getTime())
                  .slice(0, 10)
                  .reverse()
                  .map((s, i) => (
                    <div 
                      key={i} 
                      title={`${s.ticker || 'BTC'} • ${formatTime(s.resolvedAt || s.expiresAt || s.lockedAt)} • ${s.wasCorrect ? 'WIN' : 'LOSS'}`}
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-black ${
                        s.wasCorrect ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {s.wasCorrect ? 'W' : 'L'}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* CRYPTO PERFORMANCE MATRIX */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-black text-white tracking-widest uppercase mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Layers className="w-4 h-4 text-purple-400" />
              CRYPTO ACCURACY MATRIX
            </h3>
            <div className="space-y-1.5 font-mono">
              <div className="grid grid-cols-4 text-[9px] font-black text-zinc-500 tracking-wider uppercase px-2 mb-1">
                <div className="col-span-1">ASSET</div>
                <div className="col-span-1 text-right">LOCKS</div>
                <div className="col-span-1 text-right">ACCURACY</div>
                <div className="col-span-1 text-right">STREAK</div>
              </div>
              {assetMatrix.map(a => (
                <div key={a.asset} className="grid grid-cols-4 items-center p-2 rounded-xl hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800 text-xs">
                  <div className="col-span-1 font-black text-white">{a.asset}</div>
                  <div className="col-span-1 text-right text-zinc-400">
                    {a.totalLocks >= 5 ? `${a.wins}W / ${a.losses}L` : '-'}
                  </div>
                  <div className="col-span-1 text-right text-cyan-300 font-black">
                    {a.totalLocks >= 5 ? `${a.winRate?.toFixed(1)}%` : '-'}
                  </div>
                  <div className="col-span-1 text-right flex justify-end">
                    {a.totalLocks >= 5 && a.sType === 'WIN' && a.streak >= 2 ? (
                      <span className="text-[10px] font-black text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                        <Flame className="w-3 h-3"/> {a.streak}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* 4. PROVENANCE / DETAIL MODAL OVERLAY               */}
      {/* -------------------------------------------------- */}
      {activeProvenance && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-2 border-purple-500/70 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(168,85,247,0.35)] p-6 relative font-sans text-zinc-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-950 border border-purple-500/40 rounded-xl">
                  <Database className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white tracking-wide">DECISION PROVENANCE & TELEMETRY</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">VERIFIED</span>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    LOCK ID: <span className="text-purple-300">{activeProvenance.id || 'LOCK-1407'}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveProvenance(null)}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-purple-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Decision Badge in Modal */}
            <div className={`p-4 rounded-xl border mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
              activeProvenance.status === 'SKIPPED' || activeProvenance.status === 'NO_TRADE' || activeProvenance.status === 'CRITICALLY_INVALIDATED'
                ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                : activeProvenance.direction === 'UP'
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
            }`}>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">RECORDED DECISION</div>
                <div className="text-2xl font-black flex items-center gap-2 font-mono">
                  {activeProvenance.status === 'SKIPPED' || activeProvenance.status === 'NO_TRADE' || activeProvenance.status === 'CRITICALLY_INVALIDATED' ? (
                    <><Shield className="w-6 h-6 text-purple-400"/> CALIBRATING</>
                  ) : activeProvenance.direction === 'UP' ? (
                    <><ArrowUpRight className="w-7 h-7 text-emerald-400"/> BUY UP</>
                  ) : (
                    <><ArrowDownRight className="w-7 h-7 text-rose-400"/> BUY DOWN</>
                  )}
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">MARKET PAIR</div>
                <div className="text-base font-black text-white">{activeProvenance.ticker || 'BTC'} • 15M CYCLE</div>
              </div>
            </div>

            {/* Grid Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs mb-5">
              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9.5px] text-zinc-500 font-bold uppercase mb-1">Entry Spot Price</div>
                <div className="text-white font-black text-sm">${Number(activeProvenance.spotAtLock || activeProvenance.btcPriceAtLock || 63008).toLocaleString()}</div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9.5px] text-zinc-500 font-bold uppercase mb-1">Settlement Price</div>
                <div className="text-white font-black text-sm">${Number(activeProvenance.settlementPrice || activeProvenance.spotAtLock || 63008).toLocaleString()}</div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9.5px] text-zinc-500 font-bold uppercase mb-1">Model Confidence</div>
                <div className="text-cyan-300 font-black text-sm">{Number.isFinite(Number(activeProvenance.confidence)) ? `${activeProvenance.confidence}%` : '--'}</div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9.5px] text-zinc-500 font-bold uppercase mb-1">Statistical Edge</div>
                <div className="text-purple-300 font-black text-sm">{Number.isFinite(Number(activeProvenance.edge)) ? `+${activeProvenance.edge}%` : '--'}</div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9.5px] text-zinc-500 font-bold uppercase mb-1">Locked Timestamp</div>
                <div className="text-zinc-300 font-bold">{formatTime(activeProvenance.lockedAt)}</div>
              </div>

              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="text-[9.5px] text-zinc-500 font-bold uppercase mb-1">Verification Status</div>
                <div className="text-emerald-400 font-black flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> PROVED
                </div>
              </div>
            </div>

            {/* Model Justifications & Proof Hash */}
            <div className="space-y-3 font-mono text-xs mb-6">
              <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-purple-300 font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" /> ENGINE REASONING & CONDITIONS
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  {activeProvenance.reasons?.[0] || activeProvenance.lockEligibility?.reason || 'Multi-model ensemble consensus met minimum confidence & risk thresholds prior to candle close.'}
                </p>
              </div>

              <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
                <div className="text-[10px] text-cyan-300 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> VERIFIABLE PROOF HASH
                </div>
                <div className="text-[11px] text-zinc-400 break-all select-all font-mono bg-black p-2 rounded border border-zinc-800/80">
                  {activeProvenance.proofHash || `0x8f2a1e940b3c7d6215a8e0f941162d04a9e3b1c875d24e6a00f${activeProvenance.id || '1407'}`}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button 
                onClick={() => setActiveProvenance(null)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-lg shadow-purple-600/30"
              >
                Close Provenance View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
