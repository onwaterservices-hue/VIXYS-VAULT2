import React from 'react';
import { Lock, ShieldAlert, MessageSquare, ArrowRight } from 'lucide-react';

interface IntelligenceLockGateProps {
  isVerified: boolean;
  isAdmin?: boolean;
  userRole?: string;
  onOpenDiscordModal?: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const IntelligenceLockGate: React.FC<IntelligenceLockGateProps> = ({
  isVerified,
  isAdmin = false,
  userRole,
  onOpenDiscordModal,
  children,
  title = 'VIXY VAULT INTELLIGENCE LOCKED',
  subtitle = 'Discord verification required to unlock live predictions, probabilities, order flow telemetry, and AI signals.',
  className = '',
}) => {
  // Authoritative Admin bypass - Admin has immediate unconditional access
  const isPrivileged = isAdmin || userRole === 'ADMIN' || userRole === 'OWNER';
  if (isPrivileged || isVerified) {
    return <>{children}</>;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Obscured & Blurred Content Layer */}
      <div className="filter blur-xl opacity-15 pointer-events-none select-none transition-all duration-500 max-h-[650px] overflow-hidden">
        {children}
      </div>

      {/* Lock Overlay Shield */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl bg-[#04010b]/90 border-2 border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(147,51,234,0.3)] space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-xl shadow-purple-600/30">
          <Lock className="w-7 h-7 text-purple-200 animate-pulse" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-extrabold uppercase tracking-widest font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>STATUS: UNVERIFIED • ACCESS RESTRICTED</span>
          </div>
          <h3 className="text-lg font-black text-white font-sans tracking-wide">
            {title}
          </h3>
          <p className="text-xs text-purple-200/70 font-sans leading-relaxed">
            {subtitle}
          </p>
        </div>

        {onOpenDiscordModal && (
          <button
            onClick={onOpenDiscordModal}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-purple-600/40 transition-all flex items-center gap-2 border border-purple-400/40 active:scale-95 cursor-pointer font-mono"
          >
            <MessageSquare className="w-4 h-4 text-purple-200" />
            <span>VERIFY DISCORD MEMBERSHIP TO UNLOCK</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
