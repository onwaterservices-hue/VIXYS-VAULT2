import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle2, Zap, UserCheck, CreditCard, ArrowRight } from 'lucide-react';

interface TradeExecutionGuardProps {
  isAuthenticated: boolean;
  hasActiveEntitlement: boolean;
  userEmail?: string;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenSubscription: () => void;
  onExecuteTrade?: () => void;
  actionLabel?: string;
  className?: string;
}

export const TradeExecutionGuard: React.FC<TradeExecutionGuardProps> = ({
  isAuthenticated,
  hasActiveEntitlement,
  userEmail,
  onOpenAuth,
  onOpenSubscription,
  onExecuteTrade,
  actionLabel = '⚡ EXECUTE VIXY LOCK / PLACE TRADE',
  className = '',
}) => {
  const [showWarningModal, setShowWarningModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !userEmail) {
      setShowWarningModal(true);
      onOpenAuth('register');
      return;
    }
    if (!hasActiveEntitlement) {
      setShowWarningModal(true);
      onOpenSubscription();
      return;
    }
    if (onExecuteTrade) {
      onExecuteTrade();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        onClick={handleClick}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-2xl shadow-cyan-950/80 border border-cyan-300/40 transition-all flex items-center justify-center gap-2.5 group cursor-pointer active:scale-[0.99]"
      >
        {!isAuthenticated ? (
          <>
            <UserCheck className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>CREATE ACCOUNT TO PLACE TRADE</span>
            <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
          </>
        ) : !hasActiveEntitlement ? (
          <>
            <CreditCard className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" />
            <span>ACTIVE STRIPE ENTITLEMENT REQUIRED</span>
            <ArrowRight className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform animate-pulse" />
            <span>{actionLabel}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          </>
        )}
      </button>

      {/* Compliance / Status Note */}
      <div className="flex items-center justify-between text-[10px] font-mono text-purple-300/80 px-1">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isAuthenticated && hasActiveEntitlement ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {!isAuthenticated
            ? 'Account registration required prior to trade execution'
            : !hasActiveEntitlement
            ? 'Active Stripe subscription / 24H pass required'
            : 'Account & Stripe entitlement verified'}
        </span>
        <span className="text-cyan-400/90 font-bold">100% Secure Gate</span>
      </div>
    </div>
  );
};
