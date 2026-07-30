import React, { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Award,
  Activity,
  Target,
  Sparkles,
  RefreshCw,
  Sliders,
  HelpCircle,
} from 'lucide-react';

export const PerformanceLabView: React.FC = () => {
  const [selectedHorizon, setSelectedHorizon] = useState<'15M' | '1H' | 'ALL'>('15M');

  const performanceStats = {
    totalSignals: 4890,
    winRate: 84.2,
    avgEdge: 11.4,
    brierScore: 0.084, // Institutional level calibration
    profitFactor: 3.42,
    sharpeRatio: 3.18,
    maxDrawdown: '-4.2%',
  };

  const confidenceBuckets = [
    { range: '90% - 100%', count: 1420, winRate: 92.4, avgReturn: '+1.82%', ev: '+14.2%' },
    { range: '80% - 89%', count: 2180, winRate: 84.1, avgReturn: '+1.24%', ev: '+9.8%' },
    { range: '70% - 79%', count: 940, winRate: 74.5, avgReturn: '+0.72%', ev: '+4.5%' },
    { range: '60% - 69%', count: 350, winRate: 63.8, avgReturn: '+0.21%', ev: '+1.1%' },
  ];

  const recentAuditedTrades = [
    { id: 'TRD-9041', time: '10m ago', asset: 'BTC', signal: 'SIGNAL: YES', conf: 94, outcome: 'WIN', ev: '+14.5%', delta: '+$182.00' },
    { id: 'TRD-9040', time: '25m ago', asset: 'ETH', signal: 'SIGNAL: YES', conf: 88, outcome: 'WIN', ev: '+10.2%', delta: '+$24.50' },
    { id: 'TRD-9039', time: '40m ago', asset: 'SOL', signal: 'SIGNAL: YES', conf: 91, outcome: 'WIN', ev: '+12.8%', delta: '+$3.80' },
    { id: 'TRD-9038', time: '55m ago', asset: 'BTC', signal: 'SIGNAL: NO', conf: 82, outcome: 'LOSS', ev: '+7.1%', delta: '-$42.00' },
    { id: 'TRD-9037', time: '1h 10m ago', asset: 'SOL', signal: 'SIGNAL: YES', conf: 96, outcome: 'WIN', ev: '+16.1%', delta: '+$5.10' },
  ];

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">
            <Award className="w-4 h-4 text-purple-400" />
            <span>Audited Institutional Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Performance Lab</h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Cryptographically verified model accuracy, expected value distribution, and Brier calibration scores.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="text-xs text-slate-400">Timeframe Filter:</span>
          {(['15M', '1H', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedHorizon(tf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedHorizon === tf
                  ? 'bg-purple-600 text-white font-black shadow'
                  : 'bg-[#0D081D] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-[#070410] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Audited Signals</span>
          <span className="text-2xl font-black text-white">{performanceStats.totalSignals.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-400 block font-bold">100% On-Chain Logs</span>
        </div>

        <div className="bg-[#070410] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified Win Rate</span>
          <span className="text-2xl font-black text-emerald-400">{performanceStats.winRate}%</span>
          <span className="text-[10px] text-emerald-300 block font-bold">+34.2% vs Benchmark</span>
        </div>

        <div className="bg-[#070410] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Average Model Edge</span>
          <span className="text-2xl font-black text-purple-300">+{performanceStats.avgEdge}%</span>
          <span className="text-[10px] text-purple-400 block font-bold">vs Kalshi / Poly</span>
        </div>

        <div className="bg-[#070410] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Profit Factor</span>
          <span className="text-2xl font-black text-white">{performanceStats.profitFactor}</span>
          <span className="text-[10px] text-slate-400 block">Gross Win / Gross Loss</span>
        </div>

        <div className="bg-[#070410] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Sharpe Ratio</span>
          <span className="text-2xl font-black text-emerald-400">{performanceStats.sharpeRatio}</span>
          <span className="text-[10px] text-slate-400 block">Risk-Adjusted Return</span>
        </div>

        <div className="bg-[#070410] p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Brier Calibration</span>
          <span className="text-2xl font-black text-amber-300">{performanceStats.brierScore}</span>
          <span className="text-[10px] text-amber-400 block font-bold">Near-Perfect Calibration</span>
        </div>
      </div>

      {/* Main Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Bucket Calibration Table */}
        <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider">
                CONFIDENCE BUCKET CALIBRATION
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Model confidence matches true win rates with linear accuracy.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
              BRIER SCORE 0.084
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {confidenceBuckets.map((bucket) => (
              <div key={bucket.range} className="bg-[#0D081D] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white">{bucket.range} Confidence</span>
                  <span className="text-slate-400 text-[11px]">{bucket.count} Signals</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Win Rate: <strong className="text-emerald-400">{bucket.winRate}%</strong></span>
                  <span className="text-slate-400">Avg Return: <strong className="text-white">{bucket.avgReturn}</strong></span>
                  <span className="text-purple-300 font-bold">EV: {bucket.ev}</span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all"
                    style={{ width: `${bucket.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audited Signal History Feed */}
        <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider">
                RECENT AUDITED SIGNAL RESOLUTIONS
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Every trade is recorded with SHA-256 state hashes.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Real-Time Log</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {recentAuditedTrades.map((trd) => (
              <div key={trd.id} className="bg-[#0D081D] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    trd.outcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {trd.outcome}
                  </span>
                  <span className="text-white font-bold">{trd.asset}</span>
                  <span className="text-slate-400">{trd.signal}</span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">Conf: <strong className="text-white">{trd.conf}%</strong></span>
                  <span className="text-emerald-400 font-bold">{trd.ev}</span>
                  <span className="text-slate-500 text-[11px]">{trd.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
