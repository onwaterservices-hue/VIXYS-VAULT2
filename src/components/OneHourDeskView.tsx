import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Target,
  Calculator,
  Volume2,
  VolumeX,
  AlertTriangle,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { BTCTicker, AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import { calculatePositionSize } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// 1-HOUR DESK — structure only, no model.
//
// VIXY has no measured 1-hour model. The server's /api/signal route ignores
// the `desk` parameter and returns the 15-minute cycle, and no 1-hour Kalshi
// contract feed is wired to this desk. Every earlier version of this view
// filled that gap with literals (72¢ / 28¢, "MODEL WIN PROB 94%", "+2,840 BTC
// whale sweep", a 74→91.6% conviction timeline, "3/3 PASSED"). None of those
// were computed from anything. This version shows what is real — the live
// spot, the hourly clock, strike distances that are plain arithmetic, and a
// position-size calculator driven by numbers the USER types — and says
// plainly where a model would go once one exists and has been measured.
// ─────────────────────────────────────────────────────────────────────────────

interface OneHourDeskViewProps {
  ticker: BTCTicker;
  spotPrices?: Record<string, { price: number; change24h: number }>;
  selectedAsset?: string;
  userRole: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

interface StrikeRow {
  strike: number;
  label: string;
  distanceUsd: number;
  distanceBps: number;
}

export const OneHourDeskView: React.FC<OneHourDeskViewProps> = ({
  ticker,
  spotPrices = {},
  selectedAsset = 'BTC',
  userRole,
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real: seconds to the top of the hour.
  const totalSecRemaining1H = useMemo(() => {
    const epochSec = Math.floor(nowMs / 1000);
    const rem = 3600 - (epochSec % 3600);
    return rem === 0 ? 3600 : rem;
  }, [nowMs]);
  const timeRemainingMin = Math.floor(totalSecRemaining1H / 60);
  const timeRemainingSec = totalSecRemaining1H % 60;

  const isUserAdmin = userRole === 'ADMIN' || userRole === 'OWNER' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(String(userRole).toUpperCase());
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified;

  // Real: the live spot from the ticker feed. 0 when no feed — never a literal.
  const spotPrice: number =
    Number(spotPrices?.[selectedAsset]?.price) || Number(spotPrices?.['BTC']?.price) || Number(ticker?.price) || 0;

  const step = useMemo(() => {
    if (selectedAsset === 'ETH') return 10;
    if (selectedAsset === 'SOL') return 1;
    if (selectedAsset === 'XRP') return 0.02;
    return 100;
  }, [selectedAsset]);

  // Real arithmetic only: three round strikes around spot and their distance.
  const strikeRows: StrikeRow[] = useMemo(() => {
    if (!(spotPrice > 0)) return [];
    const mk = (strike: number, label: string): StrikeRow => ({
      strike,
      label,
      distanceUsd: spotPrice - strike,
      distanceBps: ((spotPrice - strike) / strike) * 1e4,
    });
    const low = Math.max(step, Math.floor((spotPrice * 0.996) / step) * step);
    const mid = Math.max(step, Math.round((spotPrice * 1.001) / step) * step);
    const high = Math.max(step, Math.ceil((spotPrice * 1.006) / step) * step);
    return [mk(low, 'BELOW SPOT (−0.4%)'), mk(mid, 'NEAR SPOT (+0.1%)'), mk(high, 'ABOVE SPOT (+0.6%)')];
  }, [spotPrice, step]);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  useEffect(() => {
    if (strikeRows.length && (selectedStrike === null || !strikeRows.some((r) => r.strike === selectedStrike))) {
      setSelectedStrike(strikeRows[1].strike);
    }
  }, [strikeRows, selectedStrike]);
  const selectedRow = strikeRows.find((r) => r.strike === selectedStrike) ?? null;

  // Position sizer: the USER supplies the contract price and their own P(win).
  // There is no model here to supply either; blank until both are entered.
  const [bankroll, setBankroll] = useState<number>(10000);
  const [kellyFraction, setKellyFraction] = useState<number>(0.25);
  const [contractPriceCents, setContractPriceCents] = useState<string>('');
  const [userWinProbPct, setUserWinProbPct] = useState<string>('');
  const [kellyResult, setKellyResult] = useState<{ recommendedStake?: number; appliedFraction?: number; expectedValue?: number } | null>(null);
  const [kellyError, setKellyError] = useState<string | null>(null);
  const priceP = Number(contractPriceCents) / 100;
  const winP = Number(userWinProbPct) / 100;
  const kellyInputsValid = priceP > 0 && priceP < 1 && winP > 0 && winP < 1;

  useEffect(() => {
    let active = true;
    if (!kellyInputsValid) { setKellyResult(null); return; }
    const run = async () => {
      try {
        const res = await calculatePositionSize({
          asset: selectedAsset || 'BTC',
          desk: '1h',
          bankroll: bankroll || 0,
          kellyFraction: kellyFraction || 0.25,
          winProb: winP,
          livePrice: priceP,
        });
        if (active) { setKellyResult(res ?? null); setKellyError(res ? null : 'sizer unavailable'); }
      } catch (e) {
        if (active) { setKellyResult(null); setKellyError(String((e as Error)?.message || e)); }
      }
    };
    run();
    return () => { active = false; };
  }, [bankroll, kellyFraction, winP, priceP, kellyInputsValid, selectedAsset]);

  const fmtUsd = (v: number, d = 2) => `$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

  return (
    <div className="space-y-8 sm:space-y-10 font-mono text-purple-100 animate-fadeIn relative w-full max-w-7xl mx-auto min-w-0">
      {/* 1. HEADER */}
      <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden w-full min-w-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 relative z-10 min-w-0">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg font-bold bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>60-MINUTE CONTRACT DESK</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs flex items-center gap-1.5" title="No 1-hour model has been built or measured. This desk shows structure only.">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>1H MODEL: NOT BUILT · STRUCTURE ONLY</span>
              </span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">1-HOUR DESK</h1>
              <p className="text-xs sm:text-sm text-purple-200/80 font-sans tracking-wide mt-1">
                Live spot, the hourly clock, and strike distances. No probabilities are shown here because none have been measured for the 1-hour horizon.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-xl bg-[#0d0722] border border-purple-800/40 text-xs flex items-center space-x-2.5 shadow-md">
              <span className="text-purple-300 font-semibold">LIVE SPOT:</span>
              <span className="font-black text-white font-mono text-sm sm:text-base">{spotPrice > 0 ? fmtUsd(spotPrice) : '—'}</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#0d0722] border border-purple-800/40 text-xs flex items-center space-x-2.5 shadow-md">
              <span className="text-purple-300 font-semibold">HOUR CLOSES IN:</span>
              <span className="font-black text-white font-mono text-sm">{timeRemainingMin}m {String(timeRemainingSec).padStart(2, '0')}s</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${soundEnabled ? 'bg-purple-950/80 border-purple-600/50 text-purple-200 shadow-md' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}
              title="Toggle audio feedback (no alerts are produced on this desk yet)"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenDiscordModal}
        title="1-HOUR DESK LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock the 1-hour desk."
      >
        <div className="space-y-8 sm:space-y-10 w-full min-w-0">
          {/* 2. WHERE THE MODEL WOULD GO */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs font-sans text-amber-100/90 space-y-1.5">
              <p className="font-bold text-amber-200 font-mono uppercase tracking-wider">What this desk does not have</p>
              <p>
                There is no 1-hour prediction model in VIXY today, and no 1-hour Kalshi contract feed is wired to this page.
                Earlier versions of this desk showed a win probability, an edge, a conviction timeline and order-flow catalysts
                here; those were fixed numbers, not measurements, and have been removed.
              </p>
              <p>
                VIXY's measured model is the <strong>15-minute strike-side engine</strong> (calibrated P(win) with sample size,
                falsified on untouched data). It lives in the 15M Prediction Center.
              </p>
            </div>
          </div>

          {/* 3. STRIKE LADDER — real arithmetic */}
          <div className="bg-[#080414] border border-purple-800/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white font-mono tracking-wider">STRIKE DISTANCES FROM SPOT</h3>
                  <p className="text-xs text-purple-300/70 font-sans mt-0.5">Round strikes around the live spot and how far price is from each — arithmetic, not a forecast.</p>
                </div>
              </div>
              {selectedRow && (
                <div className="flex items-center space-x-2 text-xs text-purple-300 font-mono">
                  <span className="text-purple-300/60">SELECTED:</span>
                  <span className="font-bold text-purple-200 px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-700/40">${selectedRow.strike.toLocaleString()}</span>
                </div>
              )}
            </div>

            {strikeRows.length === 0 ? (
              <div className="text-xs font-mono text-purple-300/60">No live spot yet — strikes appear when the price feed is connected.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {strikeRows.map((row) => {
                  const isSelected = selectedStrike === row.strike;
                  const above = row.distanceUsd >= 0;
                  return (
                    <button
                      key={row.strike}
                      onClick={() => setSelectedStrike(row.strike)}
                      className={`p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden cursor-pointer flex flex-col justify-between ${isSelected ? 'bg-[#0f0728] border-purple-500 shadow-lg ring-1 ring-purple-500/50' : 'bg-[#0d0722]/80 border-purple-800/30 hover:border-purple-600/50'}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg font-mono bg-purple-600/20 text-purple-200 border border-purple-500/30">{row.label}</span>
                        {isSelected && <span className="text-[10px] font-bold text-purple-200 bg-purple-900/60 px-2 py-0.5 rounded-lg border border-purple-500/40">SELECTED</span>}
                      </div>
                      <div className="space-y-1.5 my-1">
                        <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">${row.strike.toLocaleString()}</div>
                        <div className={`text-sm font-black font-mono ${above ? 'text-emerald-400' : 'text-rose-400'}`}>
                          spot {above ? '+' : '−'}{fmtUsd(Math.abs(row.distanceUsd))} · {Math.abs(row.distanceBps).toFixed(1)} bps {above ? 'above' : 'below'}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-purple-800/30 grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-[#080414] p-2 rounded-xl border border-purple-800/30">
                          <span className="text-[9px] text-purple-300/60 block font-sans">P(WIN)</span>
                          <strong className="text-purple-300/70 font-bold text-sm">not measured</strong>
                        </div>
                        <div className="bg-[#080414] p-2 rounded-xl border border-purple-800/30">
                          <span className="text-[9px] text-purple-300/60 block font-sans">CONTRACT PRICE</span>
                          <strong className="text-purple-300/70 font-bold text-sm">no 1H feed</strong>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. POSITION SIZER — user-supplied inputs only */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 vixy-card p-5 space-y-4">
              <div className="font-bold text-white flex items-center justify-between border-b border-purple-900/40 pb-3">
                <span className="flex items-center gap-2 text-sm font-mono tracking-wide">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>POSITION SIZER (YOUR INPUTS)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 text-[10px] font-bold">NOT A MODEL OUTPUT</span>
              </div>
              <p className="text-[11px] font-sans text-purple-300/70">
                Enter the contract price you can actually buy and your own probability estimate. The sizer applies fractional Kelly to those two numbers. It does not know anything about the market that you did not type.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
                <label className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold">Bankroll ($USD)</span>
                  <input type="number" value={bankroll} onChange={(e) => setBankroll(Math.max(1, Number(e.target.value)))} className="w-32 bg-[#0a0518] border border-purple-500/40 focus:border-purple-400 focus:outline-none rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold">Kelly fraction</span>
                  <select value={kellyFraction} onChange={(e) => setKellyFraction(Number(e.target.value))} className="w-32 bg-[#0a0518] border border-purple-500/40 focus:border-purple-400 focus:outline-none rounded-xl px-3 py-2.5 sm:py-1.5 text-white font-mono text-right font-bold cursor-pointer">
                    <option value={0.125}>1/8 (0.125)</option>
                    <option value={0.25}>1/4 (0.25)</option>
                    <option value={0.5}>1/2 (0.50)</option>
                    <option value={1.0}>Full (1.00)</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold">Contract price (¢)</span>
                  <input type="number" min={1} max={99} placeholder="e.g. 72" value={contractPriceCents} onChange={(e) => setContractPriceCents(e.target.value)} className="w-32 bg-[#0a0518] border border-purple-500/40 focus:border-purple-400 focus:outline-none rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold placeholder:text-purple-700" />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold">Your P(win) (%)</span>
                  <input type="number" min={1} max={99} placeholder="your estimate" value={userWinProbPct} onChange={(e) => setUserWinProbPct(e.target.value)} className="w-32 bg-[#0a0518] border border-purple-500/40 focus:border-purple-400 focus:outline-none rounded-xl px-3 py-1.5 text-white font-mono text-right font-bold placeholder:text-purple-700" />
                </label>
              </div>
              <div className="bg-[#0a0518] p-4 rounded-2xl border border-purple-500/40 space-y-2.5 font-mono text-xs mt-2">
                {!kellyInputsValid ? (
                  <div className="text-purple-300/60">Enter a contract price between 1¢ and 99¢ and a P(win) between 1% and 99% to size a position.</div>
                ) : kellyError ? (
                  <div className="text-rose-300">Sizer unavailable: {kellyError}</div>
                ) : kellyResult ? (
                  <>
                    <div className="flex justify-between items-center pb-1.5 border-b border-purple-900/40">
                      <span className="text-purple-300 font-semibold">Recommended stake</span>
                      <strong className="text-emerald-400 text-sm font-black tabular-nums">{typeof kellyResult.recommendedStake === 'number' ? fmtUsd(kellyResult.recommendedStake, 0) : '—'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-400 font-semibold">Fraction of capital</span>
                      <strong className="text-white font-bold tabular-nums">{typeof kellyResult.appliedFraction === 'number' ? `${(kellyResult.appliedFraction * 100).toFixed(1)}%` : '—'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-400 font-semibold">Payout multiplier at that price</span>
                      <strong className="text-cyan-300 font-bold tabular-nums">{(1 / priceP).toFixed(2)}x</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-400 font-semibold">Expected value (from YOUR P(win))</span>
                      <strong className="text-amber-300 font-bold tabular-nums">{typeof kellyResult.expectedValue === 'number' ? fmtUsd(kellyResult.expectedValue, 0) : '—'}</strong>
                    </div>
                  </>
                ) : (
                  <div className="text-purple-300/60">Sizing…</div>
                )}
              </div>
            </div>

            {/* 5. WHERE THE MEASURED MODEL IS */}
            <div className="bg-[#0c0620]/95 rounded-2xl p-5 border border-purple-900/50 space-y-3 text-xs shadow-xl">
              <div className="font-bold text-white flex items-center gap-2 border-b border-purple-900/40 pb-3 font-mono tracking-wide text-sm">
                <ArrowUpRight className="w-4 h-4 text-cyan-300" />
                <span>MEASURED MODEL</span>
              </div>
              <p className="font-sans text-purple-200/80 leading-relaxed">
                The 15-minute engine's calibrated P(win) is computed every tick from a table fitted on 2,591 real cycles and checked on 209 cycles it never saw. That is the number VIXY stands behind. A 1-hour equivalent will appear on this desk only after it has been fitted and falsified the same way.
              </p>
              {selectedRow && (
                <div className="rounded-xl bg-black/40 border border-purple-900/50 px-3 py-2 font-mono text-[11px] text-purple-200">
                  Selected strike ${selectedRow.strike.toLocaleString()} is {Math.abs(selectedRow.distanceBps).toFixed(1)} bps {selectedRow.distanceUsd >= 0 ? 'below' : 'above'} spot.
                </div>
              )}
            </div>
          </div>
        </div>
      </IntelligenceLockGate>
    </div>
  );
};
