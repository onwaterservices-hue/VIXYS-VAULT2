import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  Percent,
  Calculator,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface ScenarioSimulatorMatrixProps {
  spotPrice: number;
  strikePrice: number;
  asset: string;
  baseConviction: number;
  baseLockQuality: number;
  baseReversalRisk: number;
  isUp: boolean;
}

export const ScenarioSimulatorMatrix: React.FC<ScenarioSimulatorMatrixProps> = ({
  spotPrice,
  strikePrice,
  asset,
  baseConviction,
  baseLockQuality,
  baseReversalRisk,
  isUp,
}) => {
  const [simulatedOffsetPct, setSimulatedOffsetPct] = useState<number>(0);
  const [contractPayout, setContractPayout] = useState<number>(100); // $100 contract
  const [contractCost, setContractCost] = useState<number>(55); // $55 buy price

  // Calculate simulated price
  const simulatedPrice = useMemo(() => {
    return spotPrice * (1 + simulatedOffsetPct / 100);
  }, [spotPrice, simulatedOffsetPct]);

  // Recalculate dynamic outputs based on what-if shift
  const simulationResults = useMemo(() => {
    const isAboveStrike = simulatedPrice > strikePrice;
    const distanceToStrikePct = ((simulatedPrice - strikePrice) / strikePrice) * 100;

    let simConviction = baseConviction;
    let simLockQuality = baseLockQuality;
    let simReversalRisk = baseReversalRisk;

    if (isUp) {
      if (simulatedOffsetPct > 0) {
        simConviction = Math.min(96, baseConviction + simulatedOffsetPct * 18);
        simLockQuality = Math.min(98, baseLockQuality + simulatedOffsetPct * 14);
        simReversalRisk = Math.max(5, baseReversalRisk - simulatedOffsetPct * 12);
      } else if (simulatedOffsetPct < 0) {
        simConviction = Math.max(35, baseConviction + simulatedOffsetPct * 30);
        simLockQuality = Math.max(25, baseLockQuality + simulatedOffsetPct * 35);
        simReversalRisk = Math.min(88, baseReversalRisk - simulatedOffsetPct * 40);
      }
    } else {
      if (simulatedOffsetPct < 0) {
        simConviction = Math.min(96, baseConviction - simulatedOffsetPct * 18);
        simLockQuality = Math.min(98, baseLockQuality - simulatedOffsetPct * 14);
        simReversalRisk = Math.max(5, baseReversalRisk + simulatedOffsetPct * 12);
      } else if (simulatedOffsetPct > 0) {
        simConviction = Math.max(35, baseConviction - simulatedOffsetPct * 30);
        simLockQuality = Math.max(25, baseLockQuality - simulatedOffsetPct * 35);
        simReversalRisk = Math.min(88, baseReversalRisk + simulatedOffsetPct * 40);
      }
    }

    // Expected Value: (WinProb * Payout) - Cost
    const winProbDecimal = simConviction / 100;
    const expectedValue = winProbDecimal * contractPayout - contractCost;
    const roiPct = (expectedValue / contractCost) * 100;

    return {
      simPrice: simulatedPrice,
      simConviction: Math.round(simConviction),
      simLockQuality: Math.round(simLockQuality),
      simReversalRisk: Math.round(simReversalRisk),
      isAboveStrike,
      distanceToStrikePct,
      expectedValue,
      roiPct,
    };
  }, [simulatedPrice, strikePrice, baseConviction, baseLockQuality, baseReversalRisk, isUp, simulatedOffsetPct, contractPayout, contractCost]);

  // Scenario spectrum intervals
  const scenarios = useMemo(() => {
    const step = asset === 'BTC' ? 100 : asset === 'ETH' ? 10 : 1;
    return [
      {
        label: `+$${step * 3}`,
        offsetPct: +0.45,
        targetPrice: spotPrice + step * 3,
        winProb: isUp ? 91 : 24,
        scenario: 'BULL ACCELERATION',
      },
      {
        label: `+$${step}`,
        offsetPct: +0.15,
        targetPrice: spotPrice + step,
        winProb: isUp ? 84 : 38,
        scenario: 'STEADY CONTRACTION',
      },
      {
        label: 'AT STRIKE',
        offsetPct: 0,
        targetPrice: strikePrice,
        winProb: 50,
        scenario: 'PIN CONVERGENCE',
      },
      {
        label: `-$${step}`,
        offsetPct: -0.15,
        targetPrice: spotPrice - step,
        winProb: isUp ? 42 : 79,
        scenario: 'PULLBACK TEST',
      },
      {
        label: `-$${step * 3}`,
        offsetPct: -0.45,
        targetPrice: spotPrice - step * 3,
        winProb: isUp ? 18 : 92,
        scenario: 'BEAR SWEEP',
      },
    ];
  }, [spotPrice, strikePrice, asset, isUp]);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#100728]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/40 shadow-2xl space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-400/40 before:to-transparent">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-950 border border-purple-700/50 text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white font-sans flex items-center gap-1.5">
              <span>QUANTITATIVE SCENARIO & WHAT-IF SIMULATOR</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] border border-emerald-500/30">
                LIVE RECALC
              </span>
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono">
              Stress-test VIXY lock parameters under simulated price deviations
            </div>
          </div>
        </div>

        {simulatedOffsetPct !== 0 && (
          <button
            onClick={() => setSimulatedOffsetPct(0)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950 border border-purple-700/50 text-[10px] font-mono text-purple-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET TO LIVE</span>
          </button>
        )}
      </div>

      {/* Interactive Simulation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left 7 cols: Interactive Slider & Quick Shift Buttons */}
        <div className="lg:col-span-7 space-y-4 p-4 rounded-2xl bg-[#12072e]/90 border border-purple-800/40">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Simulate Instant Price Shift</span>
            </div>
            <div className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
              simulatedOffsetPct > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : simulatedOffsetPct < 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-purple-900/30 text-purple-300'
            }`}>
              {simulatedOffsetPct > 0 ? '+' : ''}{simulatedOffsetPct.toFixed(2)}% (${simulationResults.simPrice.toFixed(2)})
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={simulatedOffsetPct}
              onChange={(e) => setSimulatedOffsetPct(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-2 bg-[#1f0f4a] rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-purple-400">
              <span>-1.00% (Dump)</span>
              <span>LIVE SPOT</span>
              <span>+1.00% (Pump)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {[
              { label: '-0.50%', val: -0.5 },
              { label: '-0.20%', val: -0.2 },
              { label: 'LIVE', val: 0 },
              { label: '+0.20%', val: 0.2 },
              { label: '+0.50%', val: 0.5 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setSimulatedOffsetPct(preset.val)}
                className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  simulatedOffsetPct === preset.val
                    ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                    : 'bg-[#18093c] text-purple-300 hover:text-white border border-purple-800/30'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Dynamic Recalibrated Telemetry Output */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-900/30 font-mono text-xs">
            <div className="p-2 rounded-xl bg-[#0d0422] border border-purple-800/30 text-center">
              <div className="text-[9px] text-purple-400">SIM CONVICTION</div>
              <div className={`text-base font-black mt-0.5 ${
                simulationResults.simConviction >= 70 ? 'text-emerald-400' : simulationResults.simConviction >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {simulationResults.simConviction}%
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#0d0422] border border-purple-800/30 text-center">
              <div className="text-[9px] text-purple-400">SIM LOCK QUALITY</div>
              <div className="text-base font-black text-cyan-300 mt-0.5">
                {simulationResults.simLockQuality} / 100
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#0d0422] border border-purple-800/30 text-center">
              <div className="text-[9px] text-purple-400">SIM REVERSAL RISK</div>
              <div className={`text-base font-black mt-0.5 ${
                simulationResults.simReversalRisk <= 25 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {simulationResults.simReversalRisk}%
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Expected Value & Binary Contract Calculus */}
        <div className="lg:col-span-5 space-y-3 p-4 rounded-2xl bg-[#12072e]/90 border border-purple-800/40 font-sans flex flex-col justify-between">
          <div>
            <div className="text-xs font-black text-white flex items-center justify-between pb-2 border-b border-purple-900/30">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span>Binary Contract EV Calculator</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">15M DESK</span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">Contract Entry Price:</span>
                <span className="font-mono font-bold text-white">${contractCost} / share</span>
              </div>
              <div className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">Settlement Payout:</span>
                <span className="font-mono font-bold text-emerald-400">${contractPayout} (Win)</span>
              </div>
              <div className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">Expected Value (EV):</span>
                <span className={`font-mono font-black ${simulationResults.expectedValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simulationResults.expectedValue >= 0 ? '+' : ''}${simulationResults.expectedValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            simulationResults.roiPct >= 0
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}>
            <div className="text-[9px] font-bold uppercase tracking-wider">EXPECTED RETURN ON RISK</div>
            <div className="text-xl font-black font-mono mt-0.5">
              {simulationResults.roiPct >= 0 ? '+' : ''}{simulationResults.roiPct.toFixed(1)}% ROI
            </div>
          </div>
        </div>

      </div>

      {/* Scenario Spectrum Table */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-bold text-purple-300 font-sans">
          PRICE LEVEL PROBABILITY SPECTRUM
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {scenarios.map((sc, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#0c0420] border border-purple-800/30 font-mono text-xs space-y-1 text-center"
            >
              <div className="text-[10px] text-purple-400 font-bold">{sc.label}</div>
              <div className="text-white font-bold text-xs">${sc.targetPrice.toFixed(1)}</div>
              <div className={`text-xs font-black ${
                sc.winProb >= 70 ? 'text-emerald-400' : sc.winProb >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {sc.winProb}% Win
              </div>
              <div className="text-[9px] text-purple-400/70 font-sans uppercase truncate">{sc.scenario}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
