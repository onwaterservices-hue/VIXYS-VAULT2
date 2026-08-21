import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Crown, Zap, Sparkles, X, UserCheck, KeyRound } from 'lucide-react';

export interface AuthToastData {
  id: string;
  role: string;
  plan?: string;
  email?: string;
  name?: string;
  isNewUser?: boolean;
}

interface AuthToastProps {
  toast: AuthToastData | null;
  onClose: () => void;
  durationMs?: number;
}

export const AuthToast: React.FC<AuthToastProps> = ({
  toast,
  onClose,
  durationMs = 4000
}) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    setProgress(100);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsVisible(false);
        setTimeout(onClose, 250);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [toast, durationMs, onClose]);

  if (!toast && !isVisible) return null;

  const roleStr = String(toast?.role || '').toUpperCase();
  const planStr = String(toast?.plan || '').toUpperCase();

  // Role info resolution
  let roleTitle = 'Free Member';
  let badgeLabel = 'FREE';
  let badgeClasses = 'bg-purple-900/60 border border-purple-500/40 text-purple-200';
  let accentBorder = 'border-purple-500/30';
  let glowColor = 'shadow-[0_10px_30px_rgba(147,51,234,0.25)]';
  let IconComponent = CheckCircle2;
  let iconColor = 'text-purple-400';
  let subtitle = 'Authenticated session active • Select a tier to unlock live signals';

  if (roleStr === 'OWNER') {
    roleTitle = 'Master Admin';
    badgeLabel = 'LEVEL 0 ROOT';
    badgeClasses = 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-black';
    accentBorder = 'border-amber-400/60';
    glowColor = 'shadow-[0_10px_35px_rgba(245,158,11,0.35)]';
    IconComponent = Crown;
    iconColor = 'text-amber-400';
    subtitle = 'Full system access & admin intelligence unlocked';
  } else if (roleStr === 'ADMIN' || roleStr === 'SUPPORT') {
    roleTitle = 'Admin Member';
    badgeLabel = 'ADMIN CLEARANCE';
    badgeClasses = 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black';
    accentBorder = 'border-purple-400/60';
    glowColor = 'shadow-[0_10px_35px_rgba(168,85,247,0.35)]';
    IconComponent = ShieldCheck;
    iconColor = 'text-purple-300';
    subtitle = 'Admin clearance active • System controls and terminal unlocked';
  } else if (roleStr === 'ELITE' || planStr.includes('ELITE')) {
    roleTitle = 'Elite Quant Member';
    badgeLabel = 'ELITE QUANT';
    badgeClasses = 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black';
    accentBorder = 'border-yellow-400/60';
    glowColor = 'shadow-[0_10px_35px_rgba(234,179,8,0.35)]';
    IconComponent = Sparkles;
    iconColor = 'text-yellow-400';
    subtitle = 'Full 15M/1H models & direct API intelligence unlocked';
  } else if (planStr === 'DAY_PASS') {
    roleTitle = '24H Pass Member';
    badgeLabel = '24H PASS';
    badgeClasses = 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-black';
    accentBorder = 'border-cyan-400/60';
    glowColor = 'shadow-[0_10px_35px_rgba(6,182,212,0.35)]';
    IconComponent = Zap;
    iconColor = 'text-cyan-400';
    subtitle = '24-Hour live terminal unlocked • Real-time signals ready';
  } else if (planStr === 'STARTER') {
    roleTitle = 'Starter Member';
    badgeLabel = 'STARTER';
    badgeClasses = 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black';
    accentBorder = 'border-cyan-400/60';
    glowColor = 'shadow-[0_10px_35px_rgba(6,182,212,0.35)]';
    IconComponent = CheckCircle2;
    iconColor = 'text-cyan-400';
    subtitle = 'Live terminal predictions unlocked';
  } else if (roleStr === 'PRO' || planStr.includes('PRO')) {
    roleTitle = 'Pro Member';
    badgeLabel = 'PRO QUANT';
    badgeClasses = 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black';
    accentBorder = 'border-cyan-400/60';
    glowColor = 'shadow-[0_10px_35px_rgba(6,182,212,0.35)]';
    IconComponent = Zap;
    iconColor = 'text-cyan-400';
    subtitle = 'Real-time terminal & L2 orderflow intelligence unlocked';
  }

  const greeting = toast?.isNewUser ? 'Welcome to VIXY Vault' : `Welcome back, ${roleTitle}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-5 right-4 sm:right-6 z-[300] max-w-sm w-[calc(100vw-2rem)] transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#0b051c]/95 backdrop-blur-xl border ${accentBorder} ${glowColor} p-4 text-purple-100 font-mono shadow-2xl`}
      >
        {/* Subtle accent glow top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500" />

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center shadow-inner">
            <IconComponent className={`w-5 h-5 ${iconColor}`} />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shadow-sm ${badgeClasses}`}>
                {badgeLabel}
              </span>
              {toast?.email && (
                <span className="text-[11px] text-purple-300/70 truncate max-w-[170px]" title={toast.email}>
                  {toast.email}
                </span>
              )}
            </div>

            <h4 className="text-sm font-black text-white tracking-tight leading-tight">
              {greeting}
            </h4>

            <p className="text-xs text-purple-300/80 mt-1 leading-relaxed line-clamp-2">
              {subtitle}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 250);
            }}
            className="absolute top-3.5 right-3 p-1 rounded-lg text-purple-400 hover:text-white hover:bg-purple-800/40 transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar countdown */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-950/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
