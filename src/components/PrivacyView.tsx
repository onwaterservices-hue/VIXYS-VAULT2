import React from 'react';
import { ShieldCheck, Lock, Database, Cookie, Mail, ArrowLeft } from 'lucide-react';

interface PrivacyViewProps {
  onReturnToTerminal?: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onReturnToTerminal }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 font-sans text-purple-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0b051a] to-[#180a36] border border-purple-500/30 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>DATA PROTECTION POLICY • AUGUST 2026</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="text-sm text-purple-300/80 font-sans max-w-2xl leading-relaxed">
              At Vixy's Vault, we respect your privacy and are committed to protecting the personal data and credentials you share with our intelligence terminal.
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

      {/* Main Policy Content */}
      <div className="bg-[#0b061a]/90 border border-purple-900/40 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-xl shadow-xl font-sans leading-relaxed text-sm">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Database className="w-5 h-5 text-purple-400" />
            <h2>1. Information We Collect</h2>
          </div>
          <p className="text-purple-200/80">
            When you register an account, subscribe to a plan, or configure webhook notifications on Vixy's Vault, we collect the following types of information:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-purple-200/80 text-xs">
            <li><strong>Account Data:</strong> Email address, name, account role, and hashed authentication tokens.</li>
            <li><strong>Configuration Preferences:</strong> Discord Webhook URLs, Telegram Chat IDs, email alert preferences, and minimum confidence threshold settings.</li>
            <li><strong>Trading Journal Logs:</strong> Trade entries, asset selections, position sizing notes, and SHA-256 entry hashes created within your private journal.</li>
            <li><strong>Technical & Telemetry Data:</strong> IP address, browser user-agent, operating system, and WebSocket connection latency metrics.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Lock className="w-5 h-5 text-purple-400" />
            <h2>2. Payment & Stripe Data Handling</h2>
          </div>
          <p className="text-purple-200/80">
            All credit card and subscription processing is handled externally by <strong>Stripe, Inc.</strong> We never receive, process, or store raw credit card numbers or CVC security codes on Vixy's Vault servers.
          </p>
          <div className="p-4 rounded-2xl bg-purple-950/50 border border-purple-800/40 text-xs text-purple-200/90 space-y-2">
            <p className="font-mono font-bold text-purple-300">Stripe Customer Portal Data:</p>
            <p>
              Stripe collects your billing name, billing address, card last 4 digits, card expiration date, and transaction history. For details on how Stripe manages payment information, please review the <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="text-purple-300 underline font-semibold">Stripe Privacy Policy</a>.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Cookie className="w-5 h-5 text-purple-400" />
            <h2>3. Cookies & Local Storage</h2>
          </div>
          <p className="text-purple-200/80">
            We use essential local storage (`vixy_auth`, active tab state) and cookies strictly for session persistence, account authorization, and preference retention. We do NOT use third-party cross-site tracking cookies or sell your personal information to advertising networks.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h2>4. Exchange API Keys Security</h2>
          </div>
          <p className="text-purple-200/80">
            If you connect direct Kalshi or Polymarket Exchange API keys for Elite Quant features, keys are stored in encrypted client-side memory or passed via secure HTTPS headers. We recommend using <strong>Read-Only</strong> or <strong>Trade-Only</strong> keys with zero withdrawal permissions.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 text-purple-300 font-mono font-black text-lg border-b border-purple-900/40 pb-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <h2>5. Your Rights & Data Deletion</h2>
          </div>
          <p className="text-purple-200/80">
            You have the right to request a full export of your account journal data or request permanent deletion of your account and associated webhook configurations.
          </p>
          <p className="text-purple-200/80 text-xs">
            To request data deletion, contact our privacy officer at <span className="text-white font-mono font-bold">privacy@vixysvault.com</span>. Requests are processed within 48 business hours.
          </p>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-purple-900/40 text-xs text-purple-400/80 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div>Privacy Contact: <span className="text-white">privacy@vixysvault.com</span></div>
          <div>Compliant with GDPR & CCPA Standard Practices</div>
        </div>

      </div>
    </div>
  );
};
