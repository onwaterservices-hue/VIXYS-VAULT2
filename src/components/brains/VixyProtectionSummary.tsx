import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Lock,
  Clock
} from 'lucide-react';
import { PredictionSignal, BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';
import { ProtectionBrain } from './ProtectionBrain';

interface VixyProtectionSummaryProps {
  isActuallyLocked: boolean;
  signal?: PredictionSignal | null;
  ticker?: BTCTicker | null;
  rawApiData?: any;
  isProtectState: boolean;
  reversalRisk: number;
  currentPrice: number;
  targetPrice: number;
  timeRemainingSec: number;
  onExecute: () => void;
}

export const VixyProtectionSummary: React.FC<VixyProtectionSummaryProps> = ({
  isActuallyLocked,
  signal,
  ticker,
  rawApiData,
  isProtectState,
  reversalRisk,
  currentPrice,
  targetPrice,
  timeRemainingSec,
  onExecute,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Phase 1: Main card is still analyzing / qualifying (not yet locked) - Dormant / standby state (Step 1)
  if (!isActuallyLocked) {
    const rawStage = rawApiData?.stage || rawApiData?.cycleStage || rawApiData?.status || 'ANALYZING';
    const phaseLabel = rawStage === 'CALIBRATING' ? 'CALIBRATING ENGINE' :
                       rawStage === 'QUALIFYING' ? 'QUALIFYING CONFLUENCE' :
                       rawStage === 'VALIDATING' ? 'VALIDATING EVIDENCE' : 'PRIMARY CYCLE ACTIVE';

    return (
      <div className="relative overflow-hidden rounded-2xl border border-purple-950/60 vixy-card hud-corners px-4 py-3 flex items-center justify-between text-xs font-mono shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold tracking-wider text-xs">VIXY PROTECTION</span>
              <span className="text-purple-500/80 text-[10px] tracking-widest uppercase font-semibold">POSITION GUARDIAN</span>
            </div>
            <div className="text-[11px] text-purple-300/80 font-medium tracking-wide mt-0.5">
              PROTECTION STANDBY — PRIMARY 15M CYCLE ACTIVE ({phaseLabel})
            </div>
          </div>
        </div>
        <div className="text-[10px] text-purple-400/70 tracking-widest font-bold flex items-center gap-1.5 tabular-nums bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-900/40">
          <Clock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>AWAITING 15M LOCK</span>
        </div>
      </div>
    );
  }

  // Phase 2: Main card has locked a direction -> Active Guardian
  return (
    <div className="animate-fadeIn w-full relative z-10 transition-all duration-500">
      <ProtectionBrain
        signal={signal}
        ticker={ticker}
        isDiscordVerified={true}
        rawApiData={rawApiData}
      />
    </div>
  );
};
