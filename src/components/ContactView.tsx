import React, { useState } from 'react';
import { Mail, MessageSquare, Clock, Send, CheckCircle2, ShieldCheck, ArrowLeft, LifeBuoy } from 'lucide-react';

interface ContactViewProps {
  onReturnToTerminal?: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onReturnToTerminal }) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Terminal & API Support');
  const [category, setCategory] = useState<'GENERAL' | 'BILLING' | 'API' | 'QUANT'>('GENERAL');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; time: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedTicket({
        id: `TICKET-${Math.floor(100000 + Math.random() * 900000)}`,
        time: new Date().toLocaleTimeString(),
      });
      setMessage('');
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 font-sans text-purple-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12072b] via-[#0b051a] to-[#180a36] border border-purple-500/30 rounded-2xl p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold uppercase tracking-wider">
              <LifeBuoy className="w-3.5 h-3.5 text-purple-400" />
              <span>24/7 QUANT DESK & TRADER SUPPORT</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
              Contact & Support
            </h1>
            <p className="text-sm text-purple-300/80 font-sans max-w-2xl leading-relaxed">
              Have a question about model probabilities, API access, or billing? Reach out directly to our quant engineering team.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Support Channels Info */}
        <div className="space-y-4">
          <div className="bg-[#0a0518]/90 border border-purple-900/40 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-mono font-black text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              Direct Support Email
            </h2>
            <div className="space-y-2 text-xs text-purple-300/80">
              <p>For instant assistance or enterprise API requests:</p>
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800/40 font-mono text-white font-bold flex items-center justify-between">
                <span>vixyvault0@gmail.com</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0518]/90 border border-purple-900/40 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-mono font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Response SLAs
            </h2>
            <div className="space-y-2 text-xs text-purple-300/80 font-mono">
              <div className="flex justify-between border-b border-purple-900/30 pb-2">
                <span>Starter Tier:</span>
                <span className="text-purple-200">&lt; 12 Hours</span>
              </div>
              <div className="flex justify-between border-b border-purple-900/30 pb-2">
                <span>Professional Tier:</span>
                <span className="text-amber-300 font-bold">&lt; 2 Hours</span>
              </div>
              <div className="flex justify-between">
                <span>Elite Quant Tier:</span>
                <span className="text-emerald-400 font-bold">1-on-1 Priority Channel</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0518]/90 border border-purple-900/40 rounded-2xl p-6 space-y-3 shadow-xl text-xs text-purple-300/80">
            <div className="flex items-center gap-2 text-white font-mono font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Security & Bug Bounty</span>
            </div>
            <p className="leading-relaxed">
              If you discover a potential security vulnerability, please submit report to <span className="text-white font-mono font-bold">security@vixysvault.com</span>.
            </p>
          </div>
        </div>

        {/* Support Ticket Submission Form */}
        <div className="lg:col-span-2 bg-[#0a0518]/90 border border-purple-900/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative">
          <h2 className="text-2xl font-mono font-black text-white">Submit Support Ticket</h2>

          {submittedTicket ? (
            <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-mono font-black text-white">Ticket Created Successfully</h3>
              <p className="text-xs text-emerald-200/90 font-mono max-w-md mx-auto">
                Ticket Reference <strong className="text-white">{submittedTicket.id}</strong> logged at {submittedTicket.time}. Our quant desk has received your request and will reply via email shortly.
              </p>
              <button
                onClick={() => setSubmittedTicket(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-black transition-all shadow-lg"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-purple-300 font-bold">Your Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="trader@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-4 py-3 text-white placeholder-purple-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-purple-300 font-bold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="GENERAL">General Platform Question</option>
                    <option value="BILLING">Stripe Subscription / Billing</option>
                    <option value="API">REST / WebSocket API Integration</option>
                    <option value="QUANT">Quant Signal & Model Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-purple-300 font-bold">Subject Line</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of your request..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-4 py-3 text-white placeholder-purple-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-purple-300 font-bold">Message Details</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Describe your question or issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-4 py-3 text-white placeholder-purple-600 focus:outline-none focus:border-purple-500 transition-colors font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-sm shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Dispatching Ticket to Quant Desk...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Support Ticket</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
