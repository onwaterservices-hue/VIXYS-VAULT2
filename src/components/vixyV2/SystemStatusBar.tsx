import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ShieldCheck, Database, Cpu, Zap, Wifi } from 'lucide-react';
import { calculateCycleSecondsRemaining, formatCountdownMmSs } from '../../utils/cycleTime';

interface SystemStatusBarProps {
  secondsRemaining?: number;
  cycleEnd?: number;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  secondsRemaining,
  cycleEnd,
}) => {
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timer = useMemo(() => {
    return calculateCycleSecondsRemaining(900, cycleEnd, nowMs);
  }, [cycleEnd, nowMs]);

  const formattedTimer = useMemo(() => {
    return formatCountdownMmSs(timer);
  }, [timer]);

  return (
    <div className="bg-[#05030b] border-t border-purple-900/40 px-4 py-2 text-[11px] font-mono text-slate-300 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left System Identifiers */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2 font-black text-white tracking-wider">
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-600 border border-purple-400 rotate-45" />
          <span>VIXY VAULT</span>
          <span className="text-[10px] text-purple-400/80 font-bold px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-800/40">
            v2.0
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[10.5px]">
          {/* Status Item 1: System */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="text-slate-400">SYSTEM</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          <span className="text-purple-900">•</span>

          {/* Status Item 2: Data Feed */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">DATA FEED:</span>
            <span className="text-emerald-400 font-bold">LIVE</span>
          </div>

          <span className="text-purple-900">•</span>

          {/* Status Item 3: Latency */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-400">LATENCY:</span>
            <span className="text-cyan-300 font-bold">0.8s</span>
          </div>

          <span className="text-purple-900">•</span>

          {/* Status Item 4: Engine */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">VIXY ENGINE:</span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>

          <span className="text-purple-900">•</span>

          {/* Status Item 5: Firestore */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">FIRESTORE:</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Right Cycle Timer & Slogan */}
      <div className="flex items-center gap-4 sm:gap-6 ml-auto">
        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-[#0c071d] border border-purple-800/40 text-[11px]">
          <span className="text-purple-300 font-bold">NEXT BTC CYCLE:</span>
          <span className="text-emerald-400 font-black font-mono">{formattedTimer}</span>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-purple-400/80 text-[10.5px] font-bold tracking-wider">
          <svg className="w-8 h-3 text-purple-500" viewBox="0 0 40 12" fill="none">
            <path d="M1 11L10 3L20 9L30 1L39 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="uppercase text-purple-300/90">SEE THE PATTERN. TRADE THE EDGE.</span>
        </div>
      </div>
    </div>
  );
};
