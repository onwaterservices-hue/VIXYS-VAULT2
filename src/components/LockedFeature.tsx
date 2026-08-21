import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LockedFeatureProps {
  isAuthorized: boolean;
  featureName: string;
  requiredPlanText?: string;
  children: React.ReactNode;
}

export function LockedFeature({ isAuthorized, featureName, requiredPlanText = 'Upgrade to access', children }: LockedFeatureProps) {
  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="relative group overflow-hidden rounded-xl">
      <div className="blur-md opacity-30 select-none pointer-events-none transition-all duration-300">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl">
        <Lock className="w-8 h-8 text-purple-400 mb-3 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
        <h4 className="text-white font-bold font-mono uppercase tracking-wider mb-2">{featureName} Locked</h4>
        <p className="text-purple-300/80 text-sm mb-4 max-w-xs">{requiredPlanText}</p>
        <button 
          onClick={() => window.location.href = '#pricing'}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
        >
          UPGRADE PLAN
        </button>
      </div>
    </div>
  );
}
