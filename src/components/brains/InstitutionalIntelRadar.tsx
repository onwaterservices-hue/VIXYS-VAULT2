import React from 'react';
import { Radar, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { safeNumber, safeToFixed } from '../../utils/numeric';

interface InstitutionalIntelRadarProps {
  rawApiData?: any;
  survivalScore?: number;
  reversalRisk?: number;
  orderFlowState?: any;
  isProtectState?: boolean;
}

export const InstitutionalIntelRadar: React.FC<InstitutionalIntelRadarProps> = ({
  rawApiData,
  survivalScore = 85,
  reversalRisk = 15,
  orderFlowState,
  isProtectState = false,
}) => {
  // Derive real status values
  const healthScore = Math.min(99, Math.max(10, survivalScore));
  const isElevatedChop = isProtectState || (rawApiData?.chopScore && rawApiData.chopScore > 40);
  const chopRiskLabel = isElevatedChop ? 'ELEVATED' : 'MINIMAL';

  const isBearishFlow = orderFlowState?.isBearish || rawApiData?.orderFlow?.takerBuyRatio < 0.9;
  const isBullishFlow = orderFlowState?.isBullish || rawApiData?.orderFlow?.takerBuyRatio > 1.1;
  const flowLabel = isBearishFlow ? 'BEARISH PRESSURE' : isBullishFlow ? 'BULLISH PRESSURE' : 'BALANCED FLOW';

  const riskLabel = reversalRisk > 40 ? 'CRITICAL' : reversalRisk > 25 ? 'ELEVATED' : 'GUARDIAN';

  return (
    <div className="bg-[#03010a] rounded-2xl border border-purple-900/60 p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group">
      {/* HUD Corner Brackets */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-600/50 pointer-events-none" />

      {/* Top Header */}
      <div className="border-b border-purple-900/40 pb-2.5 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-black text-slate-100 tracking-[0.2em] uppercase">
            INSTITUTIONAL INTEL RADAR
          </h3>
        </div>
        <span className="text-[8px] text-purple-400/80 tracking-[0.15em] font-bold uppercase block mt-0.5">
          POSITIONAL FLOW MAP • HEAT • IMPACT
        </span>
      </div>

      {/* Main Body: Radar Display + Telemetry Column */}
      <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_0.9fr] items-center gap-3 relative z-10 my-auto">
        {/* Radar Graphic */}
        <div className="relative flex items-center justify-center p-2">
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-cyan-500/30 bg-[#020008] flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden">
            {/* Concentric Grid Rings */}
            <div className="absolute inset-2 rounded-full border border-purple-900/40" />
            <div className="absolute inset-6 rounded-full border border-cyan-500/20" />
            <div className="absolute inset-10 rounded-full border border-purple-900/40" />
            <div className="absolute inset-14 rounded-full border border-cyan-400/30" />

            {/* Crosshair Axes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-[1px] bg-cyan-500/20" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-[1px] bg-cyan-500/20" />
            </div>

            {/* Rotating Radar Sweep Line */}
            <div 
              className="absolute inset-0 rounded-full origin-center animate-spin"
              style={{ 
                animationDuration: '4s',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                background: 'conic-gradient(from 0deg, rgba(6,182,212,0.3) 0deg, rgba(168,85,247,0.1) 45deg, transparent 90deg, transparent 360deg)'
              }}
            />

            {/* Center Core Dot */}
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-20" />

            {/* Pulsing Target Nodes / Blips */}
            <div 
              className="absolute w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-ping"
              style={{ top: '28%', left: '68%' }}
            />
            <div 
              className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"
              style={{ top: '28%', left: '68%' }}
            />

            <div 
              className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-ping"
              style={{ bottom: '24%', left: '32%', animationDelay: '1s' }}
            />
            <div 
              className="absolute w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"
              style={{ bottom: '24%', left: '32%' }}
            />

            <div 
              className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"
              style={{ top: '65%', right: '25%' }}
            />
          </div>
        </div>

        {/* Telemetry Metrics Column */}
        <div className="space-y-2.5 text-[9px] font-mono">
          <div className="bg-[#06020f] border border-purple-900/50 rounded-lg p-2">
            <div className="text-purple-400/70 font-bold uppercase text-[8px] tracking-wider">POSITION DEFENSE</div>
            <div className="text-emerald-400 font-black text-[10px]">HEALTH: {healthScore}%</div>
          </div>

          <div className="bg-[#06020f] border border-purple-900/50 rounded-lg p-2">
            <div className="text-purple-400/70 font-bold uppercase text-[8px] tracking-wider">RISK</div>
            <div className={`font-black text-[10px] ${riskLabel === 'CRITICAL' ? 'text-rose-400' : riskLabel === 'ELEVATED' ? 'text-amber-400' : 'text-cyan-300'}`}>
              {riskLabel}
            </div>
          </div>

          <div className="bg-[#06020f] border border-purple-900/50 rounded-lg p-2">
            <div className="text-purple-400/70 font-bold uppercase text-[8px] tracking-wider">INSTITUTIONAL FLOW</div>
            <div className={`font-black text-[10px] truncate ${isBearishFlow ? 'text-rose-400' : isBullishFlow ? 'text-emerald-400' : 'text-purple-300'}`}>
              {flowLabel}
            </div>
          </div>

          <div className="bg-[#06020f] border border-purple-900/50 rounded-lg p-2">
            <div className="text-purple-400/70 font-bold uppercase text-[8px] tracking-wider">CHOP RISK</div>
            <div className={`font-black text-[10px] ${isElevatedChop ? 'text-amber-400' : 'text-emerald-400'}`}>
              {chopRiskLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
