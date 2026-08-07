import React from 'react';
import { Sparkles, Cpu, Layers, ShieldCheck, ArrowLeft, Globe, Award } from 'lucide-react';

interface AboutViewProps {
  onReturnToTerminal?: () => void;
  onOpenPricing?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onReturnToTerminal, onOpenPricing }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 font-sans text-purple-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0b051a] to-[#180a36] border border-purple-500/30 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>QUANT RESEARCH LAB • EST. 2026</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
              About VIXY AI
            </h1>
            <p className="text-sm text-purple-300/80 font-sans max-w-2xl leading-relaxed">
              Institutional-grade decision intelligence for sub-minute and 1-hour prediction market traders on Kalshi, Polymarket, and DraftKings.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenPricing && (
              <button
                onClick={onOpenPricing}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg"
              >
                View Plans
              </button>
            )}
            {onReturnToTerminal && (
              <button
                onClick={onReturnToTerminal}
                className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Terminal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[#0b061a]/90 border border-purple-900/40 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-xl shadow-xl font-sans leading-relaxed text-sm">
        
        {/* Our Mission */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Globe className="w-5 h-5 text-purple-400" />
            <h2>Our Mission: Democratizing Quantitative Edge</h2>
          </div>
          <p className="text-purple-200/80">
            Prediction markets are the fastest-growing financial innovation of the decade. Yet retail traders have historically lacked the sub-second microstructure analytics, orderbook delta processing, and neural pattern recognition available to high-frequency trading firms.
          </p>
          <p className="text-purple-200/80">
            <strong>VIXY AI</strong> bridges this gap by aggregating live L2 order flow from Binance, Coinbase, Kalshi, and Polymarket, feeding it through multi-algorithm ensemble models to output real-time probability estimates and Kelly Criterion position sizing.
          </p>
        </section>

        {/* Core Infrastructure Pillars */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h2>Core Infrastructure Pillars</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-900/40 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-white font-mono font-bold text-base">Sub-Second Microstructure</h3>
              <p className="text-xs text-purple-300/70 leading-relaxed">
                Direct WebSocket feeds processing taker volume delta, net order flow imbalance, and whale liquidity sweeps in under 15ms.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-900/40 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-white font-mono font-bold text-base">Neural Ribbon Matching</h3>
              <p className="text-xs text-purple-300/70 leading-relaxed">
                Pattern matching engine scanning 18,000+ historical contract settlements to find high-confluence setup parallels.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-900/40 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-white font-mono font-bold text-base">SHA-256 Verifiable Logs</h3>
              <p className="text-xs text-purple-300/70 leading-relaxed">
                Every trade journal entry and signal snapshot generates a cryptographic SHA-256 hash ensuring zero retroactive editing.
              </p>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Award className="w-5 h-5 text-purple-400" />
            <h2>Organization & Compliance</h2>
          </div>
          <div className="p-5 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-xs text-purple-200/90 space-y-2 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-purple-400">Company Name:</span> VIXY AI Quant Research Lab
              </div>
              <div>
                <span className="text-purple-400">Infrastructure:</span> Cloud Run Multi-Region Edge Containers
              </div>
              <div>
                <span className="text-purple-400">Primary Venues:</span> Kalshi, Polymarket, DraftKings
              </div>
              <div>
                <span className="text-purple-400">Payment Processor:</span> Stripe, Inc. (PCI-DSS Level 1)
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-purple-900/40 text-xs text-purple-400/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>General Contact: <span className="text-white">vixyvault0@gmail.com</span></div>
          <div>VIXY AI Quant Research Lab • All Rights Reserved</div>
        </div>

      </div>
    </div>
  );
};
