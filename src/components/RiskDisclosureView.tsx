import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, Zap, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface RiskDisclosureViewProps {
  onReturnToTerminal?: () => void;
}

export const RiskDisclosureView: React.FC<RiskDisclosureViewProps> = ({ onReturnToTerminal }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 font-sans text-purple-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2a0b12] via-[#120510] to-[#24081c] border-2 border-rose-500/40 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>HIGH-VELOCITY MARKET WARNING • AUGUST 2026</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
              Risk Disclosure & Disclaimer
            </h1>
            <p className="text-sm text-rose-200/80 font-sans max-w-2xl leading-relaxed">
              15-Second and 1-Hour Prediction Market Contracts (Kalshi, Polymarket, DraftKings) carry extreme velocity, leverage, and risk of capital loss.
            </p>
          </div>

          {onReturnToTerminal && (
            <button
              onClick={onReturnToTerminal}
              className="px-5 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-white font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Terminal</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[#0c0514]/90 border border-rose-900/40 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-xl shadow-xl font-sans leading-relaxed text-sm">
        
        {/* Warning Box */}
        <div className="p-6 rounded-2xl bg-rose-950/40 border-2 border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-mono font-black text-base">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>SUB-MINUTE CONTRACT VELOCITY NOTICE</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
            Prediction market binary contracts settle at 100¢ ($1.00) or 0¢ ($0.00). Price fluctuations occur within milliseconds as orderbooks adjust to spot price movements on Binance, Coinbase, and L2 exchanges. Never trade with funds you cannot afford to lose entirely.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2>1. Nature of Binary Prediction Contracts</h2>
          </div>
          <p className="text-purple-200/80">
            Binary option contracts offered on platforms such as Kalshi and Polymarket pay out a fixed return if an outcome occurs (YES) or expire worthless if it does not (NO). Because payouts are all-or-nothing:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-purple-200/80 text-xs">
            <li><strong>Total Capital Loss:</strong> A single adverse price spike in the final seconds before expiry can result in a 100% loss of your position stake.</li>
            <li><strong>Slippage & Illiquidity:</strong> During high volatility news events, bid-ask spreads on venue orderbooks can widen significantly, making exit prior to expiration expensive or difficult.</li>
            <li><strong>Cross-Venue Latency:</strong> Price differences between spot index feeds and venue binary contract implied probabilities may change rapidly due to network latency.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <h2>2. Model Signals & Historical Performance</h2>
          </div>
          <p className="text-purple-200/80">
            Vixy's Vault neural ribbon charts, model confidence scores, and Kelly criterion recommendations are calculated using live L2 order flow data and historical pattern matching.
          </p>
          <p className="text-purple-200/80 text-xs">
            <strong>Past Performance Is No Guarantee of Future Results:</strong> Statistical probability models are estimation tools, not crystal balls. Unusual market regimes, flash crashes, regulatory actions, or exchange downtime can invalidate statistical edges.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2>3. Responsible Bankroll Management</h2>
          </div>
          <p className="text-purple-200/80">
            We strongly advocate for strict position sizing rules. The Vixy's Vault Kelly Criterion Position Sizer defaults to fractional Kelly (0.25x or 0.10x) to reduce bankroll drawdown risk. Always maintain strict stop losses and risk limits.
          </p>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-purple-900/40 text-xs text-purple-400/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>Risk Management Help: <span className="text-white">vixyvault0@gmail.com</span></div>
          <div>Vixy's Vault Quant Research Lab</div>
        </div>

      </div>
    </div>
  );
};
