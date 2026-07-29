import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle,
  X,
  FileText,
  Quote,
  Clock,
  Flame,
} from 'lucide-react';
import { UserSubscription } from '../types';

interface SubscriptionViewProps {
  subscription: UserSubscription;
  setSubscription: React.Dispatch<React.SetStateAction<UserSubscription>>;
  userRole: 'DEMO' | 'PRO' | 'ADMIN';
  setUserRole: (role: 'DEMO' | 'PRO' | 'ADMIN') => void;
  trialSeconds?: number;
  onResetTrial?: () => void;
  onExpireTrial?: () => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  subscription,
  setSubscription,
  userRole,
  setUserRole,
  trialSeconds = 10800,
  onResetTrial,
  onExpireTrial,
}) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('annual');
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'STARTER' | 'PRO' | 'ELITE'>('PRO');
  const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState<string>('12/28');
  const [cvc, setCvc] = useState<string>('888');
  const [isProcessingStripe, setIsProcessingStripe] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const formatTrialTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const plans = {
    STARTER: {
      name: 'Starter Tier',
      monthlyPrice: 29,
      annualPrice: 24,
      desc: 'Essential 15m probability intelligence for individual prediction market traders.',
      features: [
        'Real-time 15m Candle Model Forecasts',
        'Model vs Market Implied Probability',
        'Confidence Filter Rating (≥80%)',
        'Web Terminal Access & Mobile Layout',
        'Standard Email Alerts',
      ],
    },
    PRO: {
      name: 'Professional',
      monthlyPrice: 79,
      annualPrice: 64,
      desc: 'Complete L2 order flow, webhook automation, and historical setup matching.',
      features: [
        'Everything in Starter Plan',
        'L2 Net Taker Volume Delta Depth',
        'Historical Setup Pattern Matcher (300+ matches)',
        'Discord & Telegram Instant Webhook Alerts',
        'High-Confidence Filter (≥85% & ≥90%)',
        'Execution Log & Trade Journaling Engine',
      ],
    },
    ELITE: {
      name: 'Elite Quant',
      monthlyPrice: 199,
      annualPrice: 159,
      desc: 'REST & WebSocket API keys, unlimited webhooks, and direct quant team priority support.',
      features: [
        'Everything in Professional Plan',
        'Full REST & WebSocket API Keys Access',
        'Real-Time Orderbook Imbalance Engine',
        'Unlimited Custom Bot Execution Webhooks',
        'Priority 1-on-1 Quant Desk Support',
        'SHA-256 Verifiable Signal Exporting',
      ],
    },
  };

  const handleOpenCheckout = (plan: 'STARTER' | 'PRO' | 'ELITE') => {
    setSelectedPlanToBuy(plan);
    setShowCheckoutModal(true);
    setSuccessMessage('');
  };

  const handleSimulateStripePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingStripe(true);
    setTimeout(() => {
      setIsProcessingStripe(false);
      setSubscription({
        plan: selectedPlanToBuy,
        status: 'active',
        renewalDate: '30 days from today',
        paymentMethod: 'Visa ending in 4242',
        billingInterval,
      });
      setUserRole('PRO');
      setSuccessMessage(`Payment Authorized! Welcome to VIXY's Vault ${selectedPlanToBuy} Tier.`);
      setTimeout(() => {
        setShowCheckoutModal(false);
      }, 1400);
    }, 1200);
  };

  const priceFor = (planKey: 'STARTER' | 'PRO' | 'ELITE') => {
    return billingInterval === 'annual' ? plans[planKey].annualPrice : plans[planKey].monthlyPrice;
  };

  return (
    <div className="space-y-12 py-4 font-sans text-purple-100">
      {/* High-Impact Psychological Conversion Quote Callout - Bigger & Bolder */}
      <div className="bg-gradient-to-br from-[#1B0A38] via-[#0B051A] to-[#12072B] border-2 border-purple-500/50 rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl shadow-purple-950/80 font-mono">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-radial from-purple-600/20 via-transparent to-transparent opacity-80 pointer-events-none" />

        <Quote className="w-16 h-16 sm:w-24 sm:h-24 text-purple-400/10 absolute top-4 left-4 pointer-events-none" />
        <Quote className="w-16 h-16 sm:w-24 sm:h-24 text-purple-400/10 absolute bottom-4 right-4 pointer-events-none rotate-180" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs sm:text-sm font-black uppercase tracking-widest shadow-md">
            <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
            <span>THE GOLDEN RULE OF QUANTITATIVE EDGE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono tracking-tight leading-[1.05] text-white">
            "YOU NEED TO SPEND MONEY
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-violet-200 drop-shadow-[0_4px_12px_rgba(168,85,247,0.4)]">
              TO MAKE MONEY"
            </span>
          </h1>

          <p className="text-purple-200/90 text-sm sm:text-base font-sans max-w-2xl mx-auto leading-relaxed">
            Gain an insurmountable mathematical edge on Kalshi & Polymarket. Institutional traders don't gamble on intuition—they invest in real-time L2 net taker order flow, sub-second microstructure feeds, and probability intelligence.
          </p>

          {/* 3-Hour Trial Live Banner in Quote Box */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-purple-200 font-bold">
            <div className="bg-[#0B061A]/90 px-4 py-2 rounded-2xl border border-purple-500/40 flex items-center gap-2 shadow-lg">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>3-Hour Free Trial Pass:</span>
              <span className="font-mono text-white font-black text-base tracking-wider bg-purple-950 px-2 py-0.5 rounded border border-purple-700/50">
                {formatTrialTime(trialSeconds)}
              </span>
            </div>

            {userRole === 'DEMO' && onExpireTrial && (
              <button
                onClick={onExpireTrial}
                className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition-all"
              >
                Simulate Expired Lockout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header Banner & Monthly / Annual Toggle */}
      <div className="text-center space-y-4 max-w-3xl mx-auto font-mono">
        <div className="inline-flex items-center gap-3 p-1.5 bg-[#120B28] border border-purple-900/40 rounded-2xl text-xs">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              billingInterval === 'monthly' ? 'bg-[#1A1038] text-white shadow' : 'text-purple-300/60 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingInterval('annual')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              billingInterval === 'annual' ? 'bg-purple-600 text-white shadow shadow-purple-600/30 font-black' : 'text-purple-300/60 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B061A] text-purple-300 font-bold">SAVE 20%</span>
          </button>
        </div>
      </div>

      {/* Active Subscription Banner */}
      <div className="bg-[#120B28] rounded-2xl border border-purple-500/30 p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-300/60">Your Subscription:</span>
              <span className="font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                {subscription.plan} ACTIVE
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              VIXY'S VAULT {subscription.plan} Tier
            </h2>
            <p className="text-purple-300/60 text-xs font-sans mt-0.5">
              Status: Active • Renews {subscription.renewalDate} via {subscription.paymentMethod}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-purple-300 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-purple-400" /> Account Active
          </span>
        </div>
      </div>

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
        {/* STARTER */}
        <div className="bg-[#120B28] rounded-2xl border border-purple-900/40 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl">
          <div className="space-y-4">
            <div className="text-xs font-bold text-purple-300/60 uppercase tracking-widest">{plans.STARTER.name}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">${priceFor('STARTER')}</span>
              <span className="text-purple-300/60 text-xs">/ month</span>
            </div>
            <p className="text-purple-300/70 text-xs font-sans leading-relaxed">{plans.STARTER.desc}</p>

            <ul className="space-y-3 text-xs text-purple-200 pt-2 font-sans">
              {plans.STARTER.features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleOpenCheckout('STARTER')}
            className="w-full py-3 rounded-xl bg-[#1A1038] hover:bg-[#221648] text-white font-bold text-xs transition-all border border-purple-900/40"
          >
            {subscription.plan === 'STARTER' ? 'Current Tier' : 'Select Starter'}
          </button>
        </div>

        {/* PROFESSIONAL (POPULAR) */}
        <div className="bg-[#120B28] rounded-2xl border-2 border-purple-500 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-2xl relative">
          <div className="absolute -top-3.5 right-6 bg-purple-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
            RECOMMENDED FOR TRADERS
          </div>

          <div className="space-y-4">
            <div className="text-xs font-bold text-purple-300 uppercase tracking-widest">{plans.PRO.name}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white">${priceFor('PRO')}</span>
              <span className="text-purple-300/60 text-xs">/ month</span>
            </div>
            <p className="text-purple-300/70 text-xs font-sans leading-relaxed">{plans.PRO.desc}</p>

            <ul className="space-y-3 text-xs text-purple-100 pt-2 font-sans">
              {plans.PRO.features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className={i === 1 ? 'font-bold text-purple-300' : ''}>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleOpenCheckout('PRO')}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{subscription.plan === 'PRO' ? 'Current Active Tier' : 'Start 3-Hour Free Trial Pass'}</span>
          </button>
        </div>

        {/* ELITE */}
        <div className="bg-[#120B28] rounded-2xl border border-purple-900/40 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xl">
          <div className="space-y-4">
            <div className="text-xs font-bold text-violet-400 uppercase tracking-widest">{plans.ELITE.name}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">${priceFor('ELITE')}</span>
              <span className="text-purple-300/60 text-xs">/ month</span>
            </div>
            <p className="text-purple-300/70 text-xs font-sans leading-relaxed">{plans.ELITE.desc}</p>

            <ul className="space-y-3 text-xs text-purple-200 pt-2 font-sans">
              {plans.ELITE.features.map((feat, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className={i === 1 ? 'font-bold text-violet-300' : ''}>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleOpenCheckout('ELITE')}
            className="w-full py-3 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{subscription.plan === 'ELITE' ? 'Current Tier' : 'Select Elite Tier'}</span>
          </button>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="bg-[#120B28] border border-purple-900/40 rounded-3xl p-6 sm:p-8 space-y-6 font-mono text-xs">
        <h2 className="text-xl font-black text-white text-center">Comprehensive Tier Comparison</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-purple-900/40">
            <thead>
              <tr className="text-purple-300/60">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Starter ($29/mo)</th>
                <th className="py-3 px-4 text-purple-300 font-bold">Professional ($79/mo)</th>
                <th className="py-3 px-4 text-violet-300 font-bold">Elite Quant ($199/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30 font-sans text-purple-200">
              <tr>
                <td className="py-3 px-4 font-bold text-white">15m Model Probabilities</td>
                <td className="py-3 px-4">✓ Included</td>
                <td className="py-3 px-4 text-purple-300 font-bold">✓ Included</td>
                <td className="py-3 px-4 text-violet-300 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">L2 Net Taker Volume Delta</td>
                <td className="py-3 px-4 text-purple-300/40">—</td>
                <td className="py-3 px-4 text-purple-300 font-bold">✓ Real-time</td>
                <td className="py-3 px-4 text-violet-300 font-bold">✓ Real-time</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Historical Similar Setup Matching</td>
                <td className="py-3 px-4 text-purple-300/40">—</td>
                <td className="py-3 px-4 text-purple-300 font-bold">✓ 300+ Match Scan</td>
                <td className="py-3 px-4 text-violet-300 font-bold">✓ Unlimited Scan</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Discord & Telegram Webhooks</td>
                <td className="py-3 px-4 text-purple-300/40">—</td>
                <td className="py-3 px-4 text-purple-300 font-bold">✓ Included</td>
                <td className="py-3 px-4 text-violet-300 font-bold">✓ Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">REST & WebSocket API Keys</td>
                <td className="py-3 px-4 text-purple-300/40">—</td>
                <td className="py-3 px-4 text-purple-300/40">—</td>
                <td className="py-3 px-4 text-violet-300 font-bold">✓ Dedicated Key</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-white">Execution Journal & Log Engine</td>
                <td className="py-3 px-4">✓ Basic</td>
                <td className="py-3 px-4 text-purple-300 font-bold">✓ Full Analytics</td>
                <td className="py-3 px-4 text-violet-300 font-bold">✓ Full Analytics</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Disclosure / Disclaimer */}
      <div className="bg-[#0B061A] border border-purple-900/40 rounded-2xl p-6 text-xs text-purple-300/60 font-mono space-y-2">
        <div className="flex items-center gap-2 font-bold text-purple-300">
          <FileText className="w-4 h-4 text-purple-400" />
          <span>RESPONSIBLE TRADING & RISK DISCLOSURE</span>
        </div>
        <p className="leading-relaxed font-sans text-[11px]">
          VIXY'S VAULT is an analytical decision-support tool created for informational and probability research purposes. VIXY'S VAULT does NOT guarantee profits or offer personalized financial, investment, or trading advice. Prediction market trading carries significant financial risk. Users remain solely responsible for managing their own risk and execution decisions.
        </p>
      </div>

      {/* Simulated Stripe Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0518]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120B28] border border-purple-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 font-mono text-xs text-purple-100">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2 text-white">
                <Lock className="w-4 h-4 text-purple-400" />
                <span className="font-bold">Stripe Subscription Checkout</span>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-purple-300/60 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMessage ? (
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto" />
                <p className="text-purple-300 font-bold text-xs">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSimulateStripePayment} className="space-y-4">
                <div className="bg-[#0B061A] p-3 rounded-xl border border-purple-900/40 flex justify-between items-center text-xs">
                  <span className="text-purple-300/60">Selected Tier:</span>
                  <span className="text-purple-300 font-bold">
                    VIXY {selectedPlanToBuy} (${priceFor(selectedPlanToBuy)}/mo)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-purple-300/60 text-[11px] block font-semibold">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    defaultValue="Alex Mercer"
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-purple-300/60 text-[11px] block font-semibold">Card Number</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-purple-300/60 text-[11px] block font-semibold">Expires (MM/YY)</label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-purple-300/60 text-[11px] block font-semibold">CVC</label>
                    <input
                      type="text"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingStripe}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingStripe ? 'Authorizing Stripe Payment...' : `Start 3-Hour Free Pass (${priceFor(selectedPlanToBuy)}/mo)`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
