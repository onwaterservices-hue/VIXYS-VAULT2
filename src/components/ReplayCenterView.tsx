import React, { useState } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, History, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ReplayCenterView: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const scenarios = [
    {
      id: 'SCEN-01',
      title: 'March 18 Volume Spike Squeeze (+3.8% Expiry Rally)',
      asset: 'BTC',
      date: 'March 18, 2026',
      totalSteps: 5,
      steps: [
        { time: 'T-15m', conf: 68, edge: '+3.2%', event: 'Orderbook balanced, low delta', status: 'WAIT' },
        { time: 'T-12m', conf: 74, edge: '+5.8%', event: 'Volume surge: +$1.4M YES contracts bought', status: 'WATCH' },
        { time: 'T-8m', conf: 84, edge: '+9.4%', event: 'Net CVD delta flips +840 BTC positive', status: 'SIGNAL: YES' },
        { time: 'T-4m', conf: 92, edge: '+14.1%', event: 'VWAP floor reclaimed with 3.4x bid depth', status: 'SIGNAL: YES (HIGH)' },
        { time: 'T-0m', conf: 96, edge: '+18.2%', event: 'Contract settled YES with +$380 price expansion', status: 'WIN RESOLVED' },
      ],
    },
    {
      id: 'SCEN-02',
      title: 'July 24 Polymarket Ask Liquidity Sweep (+2.4% Rally)',
      asset: 'ETH',
      date: 'July 24, 2026',
      totalSteps: 5,
      steps: [
        { time: 'T-15m', conf: 62, edge: '+2.1%', event: 'ETH sideways consolidation at $3,400', status: 'WAIT' },
        { time: 'T-10m', conf: 76, edge: '+6.5%', event: 'Binance spot bid imbalance increases +24%', status: 'WATCH' },
        { time: 'T-6m', conf: 86, edge: '+10.8%', event: 'Large taker orders sweep ask wall', status: 'SIGNAL: YES' },
        { time: 'T-2m', conf: 94, edge: '+15.4%', event: 'Model probability reaches peak divergence vs odds', status: 'SIGNAL: YES (HIGH)' },
        { time: 'T-0m', conf: 98, edge: '+19.0%', event: 'Contract settled YES smoothly', status: 'WIN RESOLVED' },
      ],
    },
  ];

  const active = scenarios[selectedScenario];
  const stepData = active.steps[currentStep];

  React.useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= active.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, active.steps.length]);

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">
            <History className="w-4 h-4 text-purple-400" />
            <span>Sub-Second Microstructure Playback</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Signal Replay Center</h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Step through historical high-conviction signals frame by frame to observe model reasoning in real-time.
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {scenarios.map((scen, idx) => (
            <button
              key={scen.id}
              onClick={() => {
                setSelectedScenario(idx);
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedScenario === idx
                  ? 'bg-purple-600 text-white font-black shadow'
                  : 'bg-[#0D081D] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {scen.asset} Precedent ({scen.date})
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Replay Terminal */}
      <div className="bg-[#070410] rounded-2xl border border-slate-800 p-6 space-y-6">
        {/* Playback Controls & Timeline Progress */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={() => {
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className="p-3 rounded-xl bg-[#0D081D] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <div className="font-mono text-xs">
              <span className="text-white font-bold block">{active.title}</span>
              <span className="text-slate-400">Step {currentStep + 1} of {active.totalSteps}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs text-slate-400">Current Timeframe State:</span>
            <span className="px-3 py-1 rounded-xl bg-purple-900/40 text-purple-300 font-bold border border-purple-500/30 text-xs">
              {stepData.time}
            </span>
          </div>
        </div>

        {/* Timeline Stepper */}
        <div className="grid grid-cols-5 gap-2 font-mono text-xs">
          {active.steps.map((st, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentStep(i);
                setIsPlaying(false);
              }}
              className={`p-3 rounded-xl border text-center space-y-1 transition-all ${
                i === currentStep
                  ? 'bg-[#130B28] border-purple-500 text-white shadow-lg ring-1 ring-purple-400'
                  : i < currentStep
                  ? 'bg-[#0D081D] border-slate-800 text-slate-300'
                  : 'bg-[#070410] border-slate-800/60 text-slate-600'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-bold">{st.time}</div>
              <div className="font-black text-sm text-emerald-400">{st.conf}%</div>
              <div className="text-[10px] text-purple-300 font-bold">{st.status}</div>
            </button>
          ))}
        </div>

        {/* Active Frame Inspection */}
        <div className="bg-[#0D081D] p-6 rounded-2xl border border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          <div className="space-y-2">
            <span className="text-slate-400 text-xs block">Frame Decision</span>
            <div className="text-3xl font-black text-emerald-400">{stepData.status}</div>
            <div className="text-xs text-purple-300">Model Edge: {stepData.edge}</div>
          </div>

          <div className="lg:col-span-2 space-y-2 font-sans">
            <span className="text-slate-400 text-xs font-mono block">Observed L2 Microstructure Event</span>
            <div className="bg-[#070312] p-4 rounded-xl border border-slate-800 text-sm text-slate-200 leading-relaxed font-mono">
              "{stepData.event}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
