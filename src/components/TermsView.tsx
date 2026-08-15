import React from 'react';
import { FileText, ShieldAlert, Scale, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface TermsViewProps {
  onReturnToTerminal?: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onReturnToTerminal }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 font-sans text-purple-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0b051a] to-[#180a36] border border-purple-500/30 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span>LEGAL AGREEMENT • EFFECTIVE AUGUST 2026</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
              Terms of Service
            </h1>
            <p className="text-sm text-purple-300/80 font-sans max-w-2xl leading-relaxed">
              Please read these Terms of Service carefully before accessing or using VIXY AI prediction market intelligence platform and automated signal endpoints.
            </p>
          </div>

          {onReturnToTerminal && (
            <button
              onClick={onReturnToTerminal}
              className="px-5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-white font-mono text-xs font-bold transition-all shrink-0 flex items-center gap-2 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Terminal</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Document Content */}
      <div className="bg-[#0b061a]/90 border border-purple-900/40 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-xl shadow-xl font-sans leading-relaxed text-sm">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <span className="text-purple-500">01.</span>
            <h2>Acceptance of Terms</h2>
          </div>
          <p className="text-purple-200/80">
            By accessing, creating an account, or subscribing to <strong>VIXY AI</strong> ("the Service", "Platform", "we", "us"), you agree to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <span className="text-purple-500">02.</span>
            <h2>No Financial or Investment Advice</h2>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>IMPORTANT NON-ADVISORY DISCLAIMER</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              VIXY AI is an algorithmic analytics and prediction market decision support utility. Content, AI probability scores, order flow delta metrics, Kelly criterion position recommendations, and signals provided by the platform are for <strong>informational and educational purposes only</strong>.
            </p>
          </div>
          <p className="text-purple-200/80">
            We are not a registered broker-dealer, investment advisor, commodity trading advisor (CTA), or financial planner. Nothing on the Service constitutes a solicitation, recommendation, endorsement, or offer to buy or sell any prediction market contracts (Kalshi, Polymarket, DraftKings), crypto assets, options, or derivatives.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <span className="text-purple-500">03.</span>
            <h2>Subscriptions, 24-Hour Day Passes & Billing</h2>
          </div>
          <p className="text-purple-200/80">
            Access to VIXY AI prediction market intelligence is granted via recurring monthly/annual subscriptions or 24-Hour Day Passes ($9.99), processed securely through Stripe.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-purple-200/80 text-xs">
            <li><strong>24-Hour Day Pass ($9.99):</strong> Grants 24 full hours of continuous, unthrottled access to all Elite 15m signal streams, neural ribbon models, and Discord Elite VIP role access from the exact timestamp of payment completion. Day Passes are non-recurring, one-time charges.</li>
            <li><strong>Auto-Renewal Subscriptions:</strong> Starter, Pro, and Elite monthly/annual subscriptions automatically renew at the end of each billing cycle unless cancelled prior to your renewal date via the Customer Portal.</li>
            <li><strong>Price Changes:</strong> We reserve the right to adjust plan pricing upon 30 days prior notice to active subscribers.</li>
            <li><strong>Payment Processing:</strong> Payments are processed securely via Stripe. We do not collect or store raw credit card numbers on our servers.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <span className="text-purple-500">04.</span>
            <h2>API & Account Usage Restrictions</h2>
          </div>
          <p className="text-purple-200/80">
            Subscribers are granted a non-exclusive, non-transferable, revocable license to access the terminal and API endpoints according to their tier limits. You agree NOT to:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/40 text-xs text-purple-300/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>Share API keys or login credentials with unauthorized third parties.</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/40 text-xs text-purple-300/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>Resell, re-broadcast, or scrape live L2 order flow data or AI signal feeds.</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/40 text-xs text-purple-300/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>Execute automated denial of service attacks against terminal WebSocket feeds.</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-900/40 text-xs text-purple-300/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>Reverse engineer neural ribbon or pattern matching algorithms.</span>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <span className="text-purple-500">05.</span>
            <h2>Intellectual Property</h2>
          </div>
          <p className="text-purple-200/80">
            The Service, including its neural ribbon charts, L2 order flow delta engines, Kelly criterion solvers, proprietary algorithms, design, code, graphics, and documentation are the exclusive intellectual property of VIXY AI Quant Research Lab.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <span className="text-purple-500">06.</span>
            <h2>Limitation of Liability</h2>
          </div>
          <p className="text-purple-200/80 text-xs leading-relaxed">
            IN NO EVENT SHALL VIXY AI, ITS DIRECTORS, EMPLOYEES, PARTNERS, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (II) ANY TRADING LOSSES INCURRED ON KALSHI, POLYMARKET, OR OTHER EXCHANGES; (III) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR TRANSMISSIONS.
          </p>
        </section>

        {/* Contact info footer */}
        <div className="pt-6 border-t border-purple-900/40 text-xs text-purple-400/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>Questions regarding Terms? Contact: <span className="text-white">vixyvault0@gmail.com</span></div>
          <div>Last Updated: August 5, 2026</div>
        </div>

      </div>
    </div>
  );
};
