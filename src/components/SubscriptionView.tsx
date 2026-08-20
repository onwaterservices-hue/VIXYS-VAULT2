import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
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
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { UserSubscription, AuthState } from '../types';
import { STRIPE_PAYMENT_LINKS, getStripePaymentUrl } from '../config/stripeLinks';
import { getEntitlementsApi, createDayPassCheckoutApi } from '../services/api';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51TyidvCYsvFDvgUJoTUSzlu4HxZfVMq33TF3pXLnM4QisUgTwnGxDXmYN9631EIlMvzJaC5IYLTnLvlbmG9vYb1M00SkYFLSBF';
const stripePromise = loadStripe(stripePublishableKey);

interface SubscriptionViewProps {
  subscription: UserSubscription;
  setSubscription: React.Dispatch<React.SetStateAction<UserSubscription>>;
  userRole: 'UNPAID' | 'PRO' | 'ADMIN';
  setUserRole: (role: 'UNPAID' | 'PRO' | 'ADMIN') => void;
  onResetTrial?: () => void;
  onExpireTrial?: () => void;
  authState?: AuthState;
  onOpenAuth?: (mode: 'login' | 'register', prefillEmail?: string) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  subscription,
  setSubscription,
  userRole,
  setUserRole,
  onResetTrial,
  onExpireTrial,
  authState,
  onOpenAuth,
}) => {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'STARTER' | 'PRO' | 'ELITE'>('PRO');
  const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState<string>('12/28');
  const [cvc, setCvc] = useState<string>('888');
  const [isProcessingStripe, setIsProcessingStripe] = useState<boolean>(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState<boolean>(false);
  const [stripeError, setStripeError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [customStripeUrl, setCustomStripeUrl] = useState<string>('');
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number; promoterName: string; desc: string } | null>(null);
  const [promoStatusMsg, setPromoStatusMsg] = useState<string>('');
  const [isValidatingPromo, setIsValidatingPromo] = useState<boolean>(false);

  const handleValidatePromo = async () => {
    if (!promoCodeInput.trim()) return;
    setIsValidatingPromo(true);
    setPromoStatusMsg('');
    setStripeError('');

    try {
      const res = await fetch('/api/stripe/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCodeInput }),
      });
      const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
      setIsValidatingPromo(false);

      if (res.ok && data.valid) {
        setAppliedPromo({
          code: data.code,
          discountPct: data.discountPct,
          promoterName: data.promoterName,
          desc: data.desc,
        });
        setPromoStatusMsg(`Code Applied! ${data.desc} (${data.promoterName})`);
      } else {
        setAppliedPromo(null);
        setPromoStatusMsg(data.message || 'Invalid or expired code.');
      }
    } catch (err) {
      setIsValidatingPromo(false);
      setAppliedPromo(null);
      setPromoStatusMsg('Error validating code.');
    }
  };

  const formatTrialTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const plans = {
    STARTER: {
      name: 'VIXY Vault Starter',
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
      name: 'VIXY Vault Pro',
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
      name: 'VIXY Vault Elite Quant',
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

  // Helper to get direct Stripe URL for any plan
  const getDirectStripeUrl = (planKey: 'STARTER' | 'PRO' | 'ELITE') => {
    const currentUserEmail = authState?.user?.email || '';
    const currentUid = authState?.user?.id || '';
    return getStripePaymentUrl(planKey, billingInterval, {
      email: currentUserEmail,
      uid: currentUid,
      promoCode: appliedPromo?.code || (promoCodeInput.trim() ? promoCodeInput.trim() : undefined),
    });
  };

  const [isVerifyingWebhook, setIsVerifyingWebhook] = useState<boolean>(false);
  const [webhookVerificationStatus, setWebhookVerificationStatus] = useState<string>('');

  // Auto-detect returning from Stripe Checkout: Poll server-authoritative entitlements
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('stripe_status');
    const sessionId = params.get('session_id');

    if (status === 'success' || sessionId) {
      setIsVerifyingWebhook(true);
      setWebhookVerificationStatus('Connecting to Stripe & verifying webhook signature with Firestore...');

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const userEmail = authState?.user?.email;
          const userId = authState?.user?.id;
          const ent = await getEntitlementsApi(userEmail, userId);
          
          if (ent && (ent.stripeVerified || ent.status === 'active')) {
            clearInterval(pollInterval);
            setIsVerifyingWebhook(false);
            const planKey = ent.plan === 'ELITE_QUANT' ? 'ELITE' : (ent.plan === 'PRO_QUANT' ? 'PRO' : 'STARTER');
            setSubscription({
              plan: planKey,
              status: 'active',
              renewalDate: '30 days from today',
              paymentMethod: 'Stripe Credit Card',
              billingInterval: ent.billing === 'YEARLY' ? 'annual' : 'monthly',
            });
            setUserRole(ent.entitlements.canAccessAdminPanel ? 'ADMIN' : 'PRO');
            setSuccessMessage(`Stripe Payment Verified! Entitlements unlocked for ${ent.plan.replace('_', ' ')}.`);
            setWebhookVerificationStatus('');
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (attempts >= 8) {
            clearInterval(pollInterval);
            setIsVerifyingWebhook(false);
            setWebhookVerificationStatus('Payment received. Webhook reconciliation is processing in background.');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          if (attempts >= 8) {
            clearInterval(pollInterval);
            setIsVerifyingWebhook(false);
          }
        }
      }, 2500);

      return () => clearInterval(pollInterval);
    }
  }, [authState?.user?.email, authState?.user?.id, setSubscription, setUserRole]);



  const handlePlanClick = (e: React.MouseEvent, planKey: 'STARTER' | 'PRO' | 'ELITE') => {
    e.preventDefault();
    if (!authState?.isAuthenticated) {
      if (onOpenAuth) {
        onOpenAuth('register');
      }
      return;
    }
    handleInitiateRealStripeCheckout(planKey);
  };

  const handleDirectStripeCheckout = (planKey: 'STARTER' | 'PRO' | 'ELITE') => {
    if (!authState?.isAuthenticated) {
      if (onOpenAuth) {
        onOpenAuth('register');
      }
      return;
    }
    handleInitiateRealStripeCheckout(planKey);
  };

  const handleInitiateRealStripeCheckout = async (targetPlan?: 'STARTER' | 'PRO' | 'ELITE') => {
    if (!authState?.isAuthenticated) {
      if (onOpenAuth) {
        onOpenAuth('register');
      }
      return;
    }

    const planToCheckout = targetPlan || selectedPlanToBuy || 'PRO';
    setSelectedPlanToBuy(planToCheckout);
    setIsProcessingStripe(true);
    setStripeError('');

    const currentUserEmail = authState?.user?.email || '';
    const currentUid = authState?.user?.id || '';
    const directFallbackUrl = getStripePaymentUrl(planToCheckout, billingInterval, {
      email: currentUserEmail,
      uid: currentUid,
      promoCode: appliedPromo?.code || (promoCodeInput !== 'PROMOTER20' ? promoCodeInput : undefined),
    });

    if (customStripeUrl) {
      window.location.href = customStripeUrl;
      return;
    }

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUserEmail,
          'x-user-uid': currentUid,
        },
        body: JSON.stringify({
          plan: planToCheckout,
          interval: billingInterval,
          promoCode: appliedPromo?.code || promoCodeInput,
          referralCode: appliedPromo?.code || promoCodeInput,
          userEmail: currentUserEmail,
          uid: currentUid,
          userName: authState?.user?.name,
        }),
      });

      const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : {};
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.ok && data.sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await (stripe as any).redirectToCheckout({ sessionId: data.sessionId });
          if (error) {
            window.location.href = directFallbackUrl;
          }
        } else if (data.url) {
          window.location.href = data.url;
        } else {
          window.location.href = directFallbackUrl;
        }
      } else {
        // Smoothly redirect to direct Stripe payment link
        window.location.href = directFallbackUrl;
      }
    } catch (err: any) {
      console.warn('Stripe API fallback redirecting to payment link:', err);
      window.location.href = directFallbackUrl;
    }
  };

  const handleBuyDayPass = async () => {
    if (!authState?.isAuthenticated) {
      if (onOpenAuth) {
        onOpenAuth('register');
      }
      return;
    }

    setIsProcessingStripe(true);
    setStripeError('');
    const currentUserEmail = authState?.user?.email || '';
    const currentUid = authState?.user?.id || '';

    try {
      const res = await createDayPassCheckoutApi({
        userEmail: currentUserEmail,
        uid: currentUid,
        referralCode: appliedPromo?.code || promoCodeInput,
      });

      if (res.url) {
        window.location.href = res.url;
      } else {
        setStripeError('Failed to launch Day Pass checkout. Please try again.');
        setIsProcessingStripe(false);
      }
    } catch (err: any) {
      setStripeError(err?.message || 'Failed to initiate Day Pass purchase.');
      setIsProcessingStripe(false);
    }
  };

  const handleSimulateStripePayment = (e: React.FormEvent) => {
    e.preventDefault();
    handleInitiateRealStripeCheckout();
  };

  const handleOpenCustomerPortal = async () => {
    if (isOpeningPortal) return;
    setIsOpeningPortal(true);
    setStripeError('');
    try {
      const activeUserEmail =
        authState?.user?.email ||
        subscription.email ||
        localStorage.getItem('vixy_user_email') ||
        'vixyvault0@gmail.com';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeUserEmail) {
        headers['x-user-email'] = activeUserEmail;
      }

      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userEmail: activeUserEmail }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
      } else {
        setStripeError(data.message || data.error || 'Unable to connect to Stripe Customer Portal');
        setIsOpeningPortal(false);
      }
    } catch (err: any) {
      setStripeError('Network error connecting to Stripe Customer Portal');
      setIsOpeningPortal(false);
    }
  };

  const priceFor = (planKey: 'STARTER' | 'PRO' | 'ELITE') => {
    return billingInterval === 'annual' ? plans[planKey].annualPrice : plans[planKey].monthlyPrice;
  };

  const finalPriceFor = (planKey: 'STARTER' | 'PRO' | 'ELITE') => {
    const base = priceFor(planKey);
    if (!appliedPromo) return base;
    const discounted = Math.max(1, Math.round(base * (1 - appliedPromo.discountPct / 100)));
    return discounted;
  };

  return (
    <>
      {!authState?.isAuthenticated ? (
        <div className="max-w-3xl mx-auto py-12 px-4 font-sans text-purple-100">
          <div className="bg-gradient-to-br from-[#1B0A38] via-[#0B051A] to-[#12072B] border-2 border-purple-500/60 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-purple-950/90 font-mono">
            <div className="w-16 h-16 bg-purple-500/20 border-2 border-purple-400/50 rounded-2xl flex items-center justify-center mx-auto text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
              <Lock className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                ACCOUNT CREATION REQUIRED
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                Create Account Before Viewing Billing Info
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/90 max-w-xl mx-auto font-sans">
                To ensure your Stripe payment and subscription link directly to your VIXY Vault account and Elite Discord role without orphan transactions, you must create your account or sign in first.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-2">
              <button
                onClick={() => onOpenAuth && onOpenAuth('register')}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-950/80 border border-cyan-300/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4 text-cyan-200" />
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="w-full py-3.5 px-5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 font-bold text-xs uppercase tracking-wider border border-purple-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Lock className="w-4 h-4 text-purple-300" />
                <span>Sign In</span>
              </button>
            </div>

            <div className="bg-[#080414] border border-purple-900/60 rounded-2xl p-4 text-left space-y-2 max-w-lg mx-auto text-[11px] text-purple-300/80">
              <div className="font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Why account creation first matters:</span>
              </div>
              <div className="space-y-1 text-purple-200/90 font-sans">
                <div>• Binds your Stripe Customer ID & Subscription ID instantly to your login.</div>
                <div>• Automatically assigns your Elite Discord role upon successful payment.</div>
                <div>• Prevents duplicate accounts or unlinked payment receipts.</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12 py-4 font-sans text-purple-100">
      {/* High-Impact Psychological Conversion Quote Callout - Bigger & Bolder */}
      <div className="bg-gradient-to-br from-[#1B0A38] via-[#0B051A] to-[#12072B] border-2 border-purple-500/50 rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl shadow-purple-950/80 font-mono">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-radial from-purple-600/20 via-transparent to-transparent opacity-80 pointer-events-none" />

        <Quote className="w-16 h-16 sm:w-24 sm:h-24 text-purple-400/10 absolute top-4 left-4 pointer-events-none" />
        <Quote className="w-16 h-16 sm:w-24 sm:h-24 text-purple-400/10 absolute bottom-4 right-4 pointer-events-none rotate-180" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-2 border-amber-400/60 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>THE #1 LAW OF QUANTITATIVE PROFIT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight leading-[1.15] uppercase max-w-4xl mx-auto">
            <span className="text-white drop-shadow-md">"YOU NEED TO </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 drop-shadow-[0_0_35px_rgba(251,191,36,0.95)] underline decoration-amber-400/50 underline-offset-8">
              SPEND MONEY
            </span>
            <br />
            <span className="text-white drop-shadow-md">TO </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-200 drop-shadow-[0_0_40px_rgba(52,211,153,1)] underline decoration-emerald-400/50 underline-offset-8">
              MAKE MONEY"
            </span>
          </h1>

          {/* VIXY 24-Hour Day Pass CTA Box */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="bg-[#0D0722]/90 border-2 border-amber-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-amber-500/10">
              <div className="text-left space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                    DAY PASS
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-300">$9.99 / 24 HOURS</span>
                </div>
                <div className="text-sm font-black text-white font-mono">24-Hour Terminal Access Pass</div>
                <div className="text-[11px] text-slate-300">Instant unfiltered access to live predictions, Locks & Discord</div>
              </div>
              <button
                onClick={handleBuyDayPass}
                disabled={isProcessingStripe}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isProcessingStripe ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Sparkles className="w-4 h-4 text-slate-950" />}
                <span>Get Day Pass ($9.99)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Header Banner & Monthly / Annual Toggle */}
      <div className="text-center space-y-4 max-w-3xl mx-auto font-mono">
        <div className="inline-flex items-center gap-3 p-2 bg-gradient-to-r from-[#0d0421] to-[#150a30] border-2 border-purple-500/30 rounded-3xl text-xs shadow-[0_0_35px_rgba(139,92,246,0.15)] shadow-purple-950/80 backdrop-blur-md relative overflow-hidden">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`relative px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 ${
              billingInterval === 'monthly'
                ? 'bg-gradient-to-r from-[#21074a] to-[#360875] text-white border-2 border-white ring-2 ring-blue-500 ring-offset-1 ring-offset-[#0d0421] shadow-[0_0_15px_rgba(59,130,246,0.6)] font-black'
                : 'text-purple-300/50 hover:text-purple-100 font-bold'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingInterval('annual')}
            className={`relative px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-2.5 ${
              billingInterval === 'annual'
                ? 'bg-gradient-to-r from-[#21074a] to-[#360875] text-white border-2 border-white ring-2 ring-blue-500 ring-offset-1 ring-offset-[#0d0421] shadow-[0_0_15px_rgba(59,130,246,0.6)] font-black'
                : 'text-purple-300/50 hover:text-purple-100 font-bold'
            }`}
          >
            <span>Annual Billing</span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black border transition-all ${
              billingInterval === 'annual'
                ? 'bg-[#0B061A] text-cyan-300 border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-[#0B061A]/40 text-purple-400/60 border-purple-500/20'
            }`}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Stripe Webhook Real-time Verification Banner */}
      {isVerifyingWebhook && (
        <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-amber-200 shadow-xl font-mono animate-pulse">
          <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-300 shrink-0">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <span>Authoritative Payment Verification in Progress</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 uppercase">Stripe Webhook → Firestore</span>
            </div>
            <p className="text-xs text-amber-200/80 font-sans">
              {webhookVerificationStatus || 'Validating cryptographic signature and updating authoritative access permissions...'}
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && !isVerifyingWebhook && (
        <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-2xl p-4 flex items-center gap-3 text-emerald-200 shadow-xl font-mono">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successMessage}</span>
        </div>
      )}

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
              VIXY AI {subscription.plan} Tier
            </h2>
            <p className="text-purple-300/60 text-xs font-sans mt-0.5">
              Status: Active • Renews {subscription.renewalDate} via {subscription.paymentMethod}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-purple-300 text-xs font-bold flex items-center gap-1.5 mr-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" /> Account Active
          </span>
          <button
            onClick={handleOpenCustomerPortal}
            disabled={isOpeningPortal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all border border-purple-400/40 shadow-lg shadow-purple-900/30 flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {isOpeningPortal ? 'Launching Stripe Portal...' : 'Manage Billing (Stripe Customer Portal)'}
          </button>
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

          <div className="space-y-2 pt-2">
            <a
              href={getDirectStripeUrl('STARTER')}
              onClick={(e) => handlePlanClick(e, 'STARTER')}
              className="w-full py-3 rounded-xl bg-purple-900/50 hover:bg-purple-900/80 text-white font-bold text-xs transition-all border border-purple-600/40 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>{subscription.plan === 'STARTER' ? 'Active Tier (Renew)' : 'Instant Stripe Checkout'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-300" />
            </a>
          </div>
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

          <div className="space-y-2 pt-2">
            <a
              href={getDirectStripeUrl('PRO')}
              onClick={(e) => handlePlanClick(e, 'PRO')}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{subscription.plan === 'PRO' ? 'Active Tier (Renew)' : 'Instant Stripe Checkout ($' + priceFor('PRO') + '/mo)'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-200" />
            </a>
          </div>
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

          <div className="space-y-2 pt-2">
            <a
              href={getDirectStripeUrl('ELITE')}
              onClick={(e) => handlePlanClick(e, 'ELITE')}
              className="w-full py-3.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{subscription.plan === 'ELITE' ? 'Active Tier (Renew)' : 'Instant Stripe Checkout ($' + priceFor('ELITE') + '/mo)'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-violet-200" />
            </a>
          </div>
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
          VIXY AI is an analytical decision-support tool created for informational and probability research purposes. VIXY AI does NOT guarantee profits or offer personalized financial, investment, or trading advice. Prediction market trading carries significant financial risk. Users remain solely responsible for managing their own risk and execution decisions.
        </p>
      </div>
        </div>
      )}
    </>
  );
};
