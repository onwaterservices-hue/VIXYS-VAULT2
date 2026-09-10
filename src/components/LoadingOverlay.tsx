import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { Sparkles, ShieldCheck, Zap, Activity, CheckCircle2 } from 'lucide-react';

interface LoadingOverlayProps {
  onComplete: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  // Boot steps mirror what the shell actually does on load: mount the terminal,
  // restore the persisted session, subscribe to the 15M engine + spot feeds, launch.
  const statusMessages = [
    'Mounting terminal shell...',
    'Restoring your vault session...',
    'Subscribing to the 15-minute decision engine...',
    'Syncing Coinbase spot & Kalshi cycle feeds...',
    'Launching decision terminal...',
  ];

  // Keep the latest onComplete in a ref so the boot timer never restarts when the
  // parent re-renders (App re-renders on every ticker/engine update; the old
  // [onComplete] dependency reset the interval on each render and starved the bar).
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const BOOT_MS = 1300;
    const start = performance.now();
    let done = false;
    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, Math.round((elapsed / BOOT_MS) * 100));
      setProgress(pct);
      if (pct > 20 && pct < 45) setStatusIndex(1);
      else if (pct >= 45 && pct < 70) setStatusIndex(2);
      else if (pct >= 70 && pct < 90) setStatusIndex(3);
      else if (pct >= 90) setStatusIndex(4);
      if (pct >= 100 && !done) {
        done = true;
        clearInterval(interval);
        setTimeout(() => onCompleteRef.current(), 260);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#070312] flex flex-col items-center justify-center p-6 text-purple-100 font-mono select-none overflow-hidden">
      {/* Background Animated Ambient Lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-md w-full space-y-8 text-center bg-[#0F0820]/80 p-8 rounded-3xl border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-950/80">
        {/* Animated Brand Emblem */}
        <div className="flex justify-center">
          <div className="scale-125 hover:scale-130 transition-transform">
            <Logo size="xl" showText={false} />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">
            VIXY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">VAULT</span>
          </h1>
          <p className="text-[11px] text-purple-300/70 font-sans tracking-wide uppercase font-semibold">
            Professional Decision Intelligence Engine
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span className="flex items-center gap-1.5 text-purple-200">
              <Zap className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>INITIALIZING SYSTEM</span>
            </span>
            <span className="font-mono text-purple-300 text-sm">{progress}%</span>
          </div>

          <div className="w-full bg-[#080313] h-3 rounded-full overflow-hidden p-0.5 border border-purple-900/50 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500 rounded-full transition-all duration-200 shadow-md shadow-purple-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Feed Lines */}
        <div className="bg-[#080313] p-3.5 rounded-2xl border border-purple-900/40 text-left text-xs space-y-2 min-h-[72px] flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{statusMessages[statusIndex]}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-purple-300/50 font-sans">
            <span>• Kalshi 15M Feed</span>
            <span>• Polymarket USDC</span>
            <span>• DraftKings Micro</span>
          </div>
        </div>

        {/* Skip button for instant bypass */}
        <button
          onClick={onComplete}
          className="text-[11px] text-purple-300/60 hover:text-purple-200 underline underline-offset-4 font-mono transition-colors"
        >
          Skip Initialization & Launch Terminal
        </button>
      </div>
    </div>
  );
};
