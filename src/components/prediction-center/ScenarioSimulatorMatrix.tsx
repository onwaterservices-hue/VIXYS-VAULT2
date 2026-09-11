import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Calculator,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ScenarioSimulatorMatrixProps {
  spotPrice: number;
  strikePrice: number;
  /** What the strike number is (Kalshi strike, placeholder, cycle-open reference). */
  strikeLabel: string;
  asset: string;
}

// Everything in this panel is price arithmetic or the user's own input. The engine
// cannot be re-scored client-side, so no conviction, lock quality, reversal risk
// or win probability is produced here for a hypothetical price.

const validPrice = (n: number) => typeof n === 'number' && Number.isFinite(n) && n > 0;

// The server settles a 15M cycle UP when the settlement price is >= the strike
// (server.ts: settlementPrice >= strike ? "UP" : "DOWN").
function settlingSideAt(price: number, strike: number): 'UP' | 'DOWN' | null {
  if (!validPrice(price) || !validPrice(strike)) return null;
  return price >= strike ? 'UP' : 'DOWN';
}

// Win rate a binary contract needs to break even: cost / payout.
function breakEvenWinProbability(cost: number, payout: number): number | null {
  if (!validPrice(cost) || !validPrice(payout)) return null;
  return cost / payout;
}

// EV per contract from a win probability the USER typed (0-100). Never fed by the
// engine score: that score is not a probability.
function expectedValueFromUserEstimate(userWinPct: number | null, cost: number, payout: number): { ev: number; roiPct: number } | null {
  if (typeof userWinPct !== 'number' || !Number.isFinite(userWinPct) || userWinPct < 0 || userWinPct > 100) return null;
  if (!validPrice(cost) || !validPrice(payout)) return null;
  const ev = (userWinPct / 100) * payout - cost;
  return { ev, roiPct: (ev / cost) * 100 };
}

const parseNum = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const ScenarioSimulatorMatrix: React.FC<ScenarioSimulatorMatrixProps> = ({
  spotPrice,
  strikePrice,
  strikeLabel,
  asset,
}) => {
  const [simulatedOffsetPct, setSimulatedOffsetPct] = useState<number>(0);
  // Example contract terms; both are editable by the user.
  const [contractPayoutInput, setContractPayoutInput] = useState<string>('100');
  const [contractCostInput, setContractCostInput] = useState<string>('55');
  // The user's own win-probability estimate. Empty until they type one.
  const [userWinPctInput, setUserWinPctInput] = useState<string>('');

  const pricePrecision = asset === 'XRP' || asset === 'DOGE' ? 4 : 2;

  // Hypothetical price and where it sits against the strike.
  const hypothetical = useMemo(() => {
    const simPrice = validPrice(spotPrice) ? spotPrice * (1 + simulatedOffsetPct / 100) : null;
    const distanceToStrikePct =
      simPrice !== null && validPrice(strikePrice) ? ((simPrice - strikePrice) / strikePrice) * 100 : null;
    const side = simPrice !== null ? settlingSideAt(simPrice, strikePrice) : null;
    return { simPrice, distanceToStrikePct, side };
  }, [spotPrice, strikePrice, simulatedOffsetPct]);

  const contractCost = parseNum(contractCostInput) ?? NaN;
  const contractPayout = parseNum(contractPayoutInput) ?? NaN;
  const breakEven = breakEvenWinProbability(contractCost, contractPayout);
  const userEv = expectedValueFromUserEstimate(parseNum(userWinPctInput), contractCost, contractPayout);

  // Fixed price levels around spot; each shows only its price, its distance to the
  // strike and which side would settle in the money there.
  const scenarios = useMemo(() => {
    const step = asset === 'BTC' ? 100 : asset === 'ETH' ? 10 : 1;
    const level = (label: string, targetPrice: number) => ({
      label,
      targetPrice: validPrice(targetPrice) ? targetPrice : null,
      side: settlingSideAt(targetPrice, strikePrice),
      distanceToStrikePct:
        validPrice(targetPrice) && validPrice(strikePrice) ? ((targetPrice - strikePrice) / strikePrice) * 100 : null,
    });
    const hasSpot = validPrice(spotPrice);
    return [
      level(`+$${step * 3}`, hasSpot ? spotPrice + step * 3 : NaN),
      level(`+$${step}`, hasSpot ? spotPrice + step : NaN),
      level('AT STRIKE', strikePrice),
      level(`-$${step}`, hasSpot ? spotPrice - step : NaN),
      level(`-$${step * 3}`, hasSpot ? spotPrice - step * 3 : NaN),
    ];
  }, [spotPrice, strikePrice, asset]);

  const inputClass =
    'w-20 px-1.5 py-0.5 rounded-md bg-[#0d0422] border border-purple-800/40 font-mono font-bold text-white text-right focus:outline-none focus:ring-1 focus:ring-purple-500';

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
              <span>WHAT-IF PRICE LEVELS & CONTRACT MATH</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] border border-emerald-500/30">
                PRICE MATH ONLY
              </span>
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono">
              Where a hypothetical price sits vs the strike. The engine is not re-scored here.
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

      {/* Interactive Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left 7 cols: Interactive Slider & Quick Shift Buttons */}
        <div className="lg:col-span-7 space-y-4 p-4 rounded-2xl bg-[#12072e]/90 border border-purple-800/40">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Hypothetical Price Shift</span>
            </div>
            <div className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
              simulatedOffsetPct > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : simulatedOffsetPct < 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-purple-900/30 text-purple-300'
            }`}>
              {simulatedOffsetPct > 0 ? '+' : ''}{simulatedOffsetPct.toFixed(2)}% ({hypothetical.simPrice === null ? '—' : `$${hypothetical.simPrice.toFixed(pricePrecision)}`})
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
              <span>-1.00%</span>
              <span>LIVE SPOT</span>
              <span>+1.00%</span>
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

          {/* Hypothetical price vs strike: arithmetic only */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-900/30 font-mono text-xs">
            <div className="p-2 rounded-xl bg-[#0d0422] border border-purple-800/30 text-center">
              <div className="text-[9px] text-purple-400">HYPOTHETICAL PRICE</div>
              <div className="text-base font-black mt-0.5 text-white">
                {hypothetical.simPrice === null ? '—' : `$${hypothetical.simPrice.toFixed(pricePrecision)}`}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#0d0422] border border-purple-800/30 text-center">
              <div className="text-[9px] text-purple-400">VS {strikeLabel.toUpperCase()}</div>
              <div className="text-base font-black text-cyan-300 mt-0.5">
                {hypothetical.distanceToStrikePct === null
                  ? '—'
                  : `${hypothetical.distanceToStrikePct >= 0 ? '+' : ''}${hypothetical.distanceToStrikePct.toFixed(3)}%`}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-[#0d0422] border border-purple-800/30 text-center">
              <div className="text-[9px] text-purple-400">IN THE MONEY AT THIS PRICE</div>
              <div className={`text-base font-black mt-0.5 ${
                hypothetical.side === 'UP' ? 'text-emerald-400' : hypothetical.side === 'DOWN' ? 'text-rose-400' : 'text-purple-300'
              }`}>
                {hypothetical.side ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 cols: Binary contract break-even and user-estimate EV */}
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
              <label className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">Contract cost ($):</span>
                <input type="number" min="0" step="any" inputMode="decimal" value={contractCostInput} onChange={(e) => setContractCostInput(e.target.value)} className={inputClass} />
              </label>
              <label className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">Payout if it wins ($):</span>
                <input type="number" min="0" step="any" inputMode="decimal" value={contractPayoutInput} onChange={(e) => setContractPayoutInput(e.target.value)} className={inputClass} />
              </label>
              <div className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">Break-even win rate (cost ÷ payout):</span>
                <span className="font-mono font-black text-white">
                  {breakEven === null ? '—' : `${(breakEven * 100).toFixed(1)}%`}
                </span>
              </div>
              <div className="text-[10px] text-purple-300/80 leading-relaxed">
                {breakEven === null
                  ? 'Enter a cost and payout above zero.'
                  : breakEven >= 1
                    ? `At $${contractCost.toFixed(2)} cost for a $${contractPayout.toFixed(2)} payout a win returns no profit.`
                    : `At $${contractCost.toFixed(2)} cost for a $${contractPayout.toFixed(2)} payout you need to win more than ${(breakEven * 100).toFixed(1)}% of the time to profit.`}
              </div>
              <label className="flex items-center justify-between text-purple-200 pt-1 border-t border-purple-900/30">
                <span className="text-[11px]">Your win-probability estimate (%):</span>
                <input type="number" min="0" max="100" step="any" inputMode="decimal" placeholder="your estimate" value={userWinPctInput} onChange={(e) => setUserWinPctInput(e.target.value)} className={inputClass} />
              </label>
              <div className="flex items-center justify-between text-purple-200">
                <span className="text-[11px]">EV per contract (your estimate):</span>
                <span className={`font-mono font-black ${userEv === null ? 'text-purple-300' : userEv.ev >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {userEv === null ? '—' : `${userEv.ev >= 0 ? '+' : '−'}$${Math.abs(userEv.ev).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${
            userEv === null
              ? 'bg-purple-950/30 border-purple-700/40 text-purple-300'
              : userEv.roiPct >= 0
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}>
            <div className="text-[9px] font-bold uppercase tracking-wider">RETURN ON RISK · YOUR ESTIMATE</div>
            <div className="text-xl font-black font-mono mt-0.5">
              {userEv === null ? '—' : `${userEv.roiPct >= 0 ? '+' : ''}${userEv.roiPct.toFixed(1)}% ROI`}
            </div>
            <div className="text-[9px] mt-1 opacity-80">
              Uses only the probability you enter. VIXY's engine score is not a win probability and is not used here.
            </div>
          </div>
        </div>

      </div>

      {/* Price levels vs strike */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-bold text-purple-300 font-sans">
          PRICE LEVELS VS STRIKE · SIDE IN THE MONEY
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {scenarios.map((sc, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#0c0420] border border-purple-800/30 font-mono text-xs space-y-1 text-center"
            >
              <div className="text-[10px] text-purple-400 font-bold">{sc.label}</div>
              <div className="text-white font-bold text-xs">{sc.targetPrice === null ? '—' : `$${sc.targetPrice.toFixed(pricePrecision)}`}</div>
              <div className={`text-xs font-black ${
                sc.side === 'UP' ? 'text-emerald-400' : sc.side === 'DOWN' ? 'text-rose-400' : 'text-purple-300'
              }`}>
                {sc.side === null ? '—' : `${sc.side} WINS`}
              </div>
              <div className="text-[9px] text-purple-400/70 font-sans uppercase truncate">
                {sc.distanceToStrikePct === null ? '—' : `${sc.distanceToStrikePct >= 0 ? '+' : ''}${sc.distanceToStrikePct.toFixed(3)}% vs strike`}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
