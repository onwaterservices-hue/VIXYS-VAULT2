import React from 'react';
import { CreditCard, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft, LifeBuoy } from 'lucide-react';

interface RefundPolicyViewProps {
  onReturnToTerminal?: () => void;
  onOpenPricing?: () => void;
}

export const RefundPolicyView: React.FC<RefundPolicyViewProps> = ({
  onReturnToTerminal,
  onOpenPricing,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 font-sans text-purple-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0b051a] to-[#180a36] border border-purple-500/30 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              <span>BILLING & CANCELLATIONS • AUGUST 2026</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
              Refund & Cancellation Policy
            </h1>
            <p className="text-sm text-purple-300/80 font-sans max-w-2xl leading-relaxed">
              Transparent, self-service cancellation and refund guidelines managed directly through our Stripe Customer Portal.
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
        
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            <h2>1. Self-Service Instant Cancellation</h2>
          </div>
          <p className="text-purple-200/80">
            You may cancel your Vixy's Vault Starter, Professional, or Elite subscription at any time with zero hassle or support intervention required.
          </p>
          <div className="p-4 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-xs text-purple-200/90 space-y-2">
            <p className="font-mono font-bold text-purple-300">How to Cancel in 2 Clicks:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Navigate to <strong>Settings → Subscription & Billing</strong> inside the terminal.</li>
              <li>Click <strong>Manage Billing & Receipts (Stripe Customer Portal)</strong>.</li>
              <li>Click <strong>Cancel Subscription</strong>. Your subscription will remain active until the end of your current billing period.</li>
            </ol>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2>2. 14-Day Money-Back Guarantee (First Purchase)</h2>
          </div>
          <p className="text-purple-200/80">
            If you are unsatisfied with your first subscription purchase on Vixy's Vault, you may request a <strong>100% full refund within 14 days</strong> of your initial signup date.
          </p>
          <p className="text-purple-200/80 text-xs">
            To claim a first-purchase refund, simply send an email to <span className="text-white font-mono font-bold">vixyvault0@gmail.com</span> with your registered email address and "14-Day Refund Request" in the subject line. Refunds are credited back to your original payment method via Stripe within 3-5 business days.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2>3. Subsequent Billing Cycles & Partial Refunds</h2>
          </div>
          <p className="text-purple-200/80">
            After the initial 14-day window, recurring subscription payments are non-refundable. When you cancel, you retain full access to all terminal features, API endpoints, and signals through the final date of your paid billing period.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <LifeBuoy className="w-5 h-5 text-purple-400" />
            <h2>4. Billing Inquiries & Dispute Prevention</h2>
          </div>
          <p className="text-purple-200/80">
            Before initiating a credit card chargeback or bank dispute, please reach out directly to our dedicated billing desk at <span className="text-white font-mono font-bold">vixyvault0@gmail.com</span>. We respond to all billing inquiries within 24 hours and resolve any billing discrepancies immediately.
          </p>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-purple-900/40 text-xs text-purple-400/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>Billing Desk: <span className="text-white">vixyvault0@gmail.com</span></div>
          <div>Stripe Certified Secure Payments</div>
        </div>

      </div>
    </div>
  );
};
