import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  KeyRound,
  Zap,
  Globe,
  Star,
  Flame,
  Check,
} from 'lucide-react';
import { AuthState } from '../types';
import { syncAuthUserApi } from '../services/api';
import { getStripeDayPassUrl } from '../config/stripeLinks';

interface AuthViewProps {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  setUserRole: (role: 'UNPAID' | 'PRO' | 'ADMIN') => void;
  onSuccessNavigate?: (role: 'UNPAID' | 'PRO' | 'ADMIN') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  authState,
  setAuthState,
  setUserRole,
  onSuccessNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'claim'>('login');
  const [claimStep, setClaimStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [claimOtp, setClaimOtp] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClaimRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setLoading(false);
      setErrorMsg('Please enter your account email.');
      return;
    }

    try {
      const res = await fetch('/api/auth/claim/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.ok || data.success) {
        setClaimStep('verify');
        setSuccessMsg(data.message || 'Verification code sent to your email.');
      } else {
        setErrorMsg(data.message || 'Failed to request verification code.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg('Network error requesting verification code. Please try again.');
    }
  };

  const handleClaimVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = claimOtp.trim();

    if (!cleanEmail || !cleanOtp || !claimPassword) {
      setLoading(false);
      setErrorMsg('Email, 6-digit code, and new password are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/claim/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          newPassword: claimPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setLoading(false);
        setErrorMsg(data.message || 'Invalid or expired verification code.');
        return;
      }

      const canonicalUser = data.user || {};
      const canonicalUserId = canonicalUser.id || canonicalUser.uid || `usr_${cleanEmail.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const finalRole = canonicalUser.role === 'ADMIN' || canonicalUser.role === 'OWNER' ? 'ADMIN' : (canonicalUser.role === 'PRO' || canonicalUser.role === 'ELITE' ? 'PRO' : 'UNPAID');

      setLoading(false);
      setAuthState({
        isAuthenticated: true,
        user: {
          id: canonicalUserId,
          email: cleanEmail,
          name: canonicalUser.name || cleanEmail.split('@')[0],
          role: finalRole,
          apiKey: canonicalUser.apiKey || `vault_live_${Math.random().toString(36).substring(2, 8)}`,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
      });
      setUserRole(finalRole as any);
      setSuccessMsg('Account claimed and password set successfully!');

      if (onSuccessNavigate) {
        setTimeout(() => onSuccessNavigate(finalRole as any), 1000);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Verification failed. Please check your code.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const userEmail = email.trim() || 'trader@vixysvault.com';
    const isAdminEmail = userEmail.toLowerCase() === 'vixyvault0@gmail.com';

    if (isAdminEmail) {
      localStorage.setItem('vixy_admin_email', userEmail.toLowerCase());
      localStorage.setItem('vixy_user_email', userEmail.toLowerCase());
    }

    const assignedRole: 'ADMIN' | 'UNPAID' | 'PRO' = isAdminEmail ? 'ADMIN' : 'UNPAID';
    const userName = fullName.trim() || (isAdminEmail ? `Master Admin (${userEmail.split('@')[0]})` : email ? email.split('@')[0] : 'VIXY Trader');

    try {
      let res;
      if (mode === 'register') {
        const fetchRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password, name: userName })
        });
        res = await fetchRes.json();
      } else {
        const fetchRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password })
        });
        res = await fetchRes.json();
      }

      if (!res?.success) {
        setLoading(false);
        if (res?.error === 'PASSWORD_CREDENTIAL_MISSING' || res?.error === 'ACCOUNT_NEEDS_CLAIM') {
          setErrorMsg('Account found with active Day Pass / Stripe entitlement! Please verify your email to claim your access.');
          setMode('claim');
          setClaimStep('request');
        } else {
          setErrorMsg(res?.message || 'Authentication failed. Please check your credentials.');
        }
        return;
      }

      const serverUser = res?.user || {};
      const newUserId = serverUser.id || serverUser.uid || `usr_${Math.random().toString(36).substring(2, 9)}`;

      setLoading(false);
      setAuthState({
        isAuthenticated: true,
        user: {
          id: newUserId,
          email: userEmail,
          name: userName,
          role: serverUser?.role || assignedRole,
          apiKey: serverUser.apiKey || `vault_live_${Math.random().toString(36).substring(2, 8)}`,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
      });
      const finalRole = serverUser?.role || assignedRole;
      setUserRole(finalRole as any);
      setSuccessMsg(
        isAdminEmail
          ? `Master Admin Verified! Full Vault Admin Control Center unlocked.`
          : mode === 'register'
          ? `Account created successfully! Redirecting to secure billing view...`
          : `Signed in successfully. Welcome back, ${userName}!`
      );

      if (onSuccessNavigate) {
        setTimeout(() => onSuccessNavigate(finalRole as any), 1000);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Authentication failed. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 font-mono text-purple-100 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>VIXY AI DECISION INTELLIGENCE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
          {mode === 'login' && 'SIGN IN TO YOUR TERMINAL'}
          {mode === 'register' && 'CREATE YOUR VIXY AI ACCOUNT'}
        </h1>
        <p className="text-xs sm:text-sm text-purple-300/70 font-sans">
          Access real-time 15m & 1H Kalshi prediction market signals, L2 order book delta sweeps, and automated Discord bot triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Features & Trust Badges */}
        <div className="lg:col-span-5 bg-[#120B28] rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <span>WHAT'S INCLUDED</span>
            </h3>
            <p className="text-xs text-purple-300/70 font-sans">
              Instant access to high-frequency decision intelligence tools built for prediction traders.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#0B051A] border border-purple-900/50">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">15S & 1H Pre-Spike Lead Signals</strong>
                <span className="text-purple-300/70 font-sans text-[11px]">
                  Detect price spikes 5-10s before contracts hit 80¢+.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#0B051A] border border-purple-900/50">
              <Flame className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">24-Hour Day Pass ($9.99)</strong>
                <span className="text-purple-300/70 font-sans text-[11px]">
                  Instant unfiltered terminal access to live decision locks, calibration feeds, and signals.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#0B051A] border border-purple-900/50">
              <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Discord & Telegram Bot Sync</strong>
                <span className="text-purple-300/70 font-sans text-[11px]">
                  Connect your webhooks for automated instant signal execution.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-purple-900/40 text-[11px] text-purple-300/60 font-sans space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-300" />
              <span>Trusted by 2,400+ Valhalla & Quant Traders</span>
            </div>
            <p>Verified 91.4% signal accuracy over 10,000+ Kalshi market settlement blocks.</p>
          </div>
        </div>

        {/* Right Column (7 cols): Interactive Auth Form Page */}
        <div className="lg:col-span-7 bg-[#120B28] rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-amber-400" />

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-[#0B051A] p-1.5 rounded-2xl border border-purple-900/60">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => {
                setMode('claim');
                setClaimStep('request');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'claim'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              Claim Access
            </button>
          </div>

          {successMsg ? (
            <div className="p-6 bg-purple-500/10 border border-purple-500/40 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">{successMsg}</h3>
              <p className="text-xs text-purple-300 font-sans">Redirecting you to the trading terminal...</p>
            </div>
          ) : mode === 'claim' ? (
            claimStep === 'request' ? (
              <form onSubmit={handleClaimRequest} className="space-y-4 text-xs font-mono">
                {errorMsg && (
                  <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-xs">
                    {errorMsg}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-purple-300/70 block font-semibold">Purchased Stripe Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-purple-300/50 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="trader@vixysvault.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setClaimStep('verify')}
                    className="text-[11px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    Already have a verification code? Enter code
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleClaimVerify} className="space-y-4 text-xs font-mono">
                {errorMsg && (
                  <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-xs">
                    {errorMsg}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-purple-300/70 block font-semibold">Account Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-purple-300/70 block font-semibold">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={claimOtp}
                    onChange={(e) => setClaimOtp(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-4 py-2.5 text-purple-100 tracking-widest text-center text-base focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-purple-300/70 block font-semibold">Create New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={claimPassword}
                    onChange={(e) => setClaimPassword(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Verifying...' : 'Verify & Unlock Terminal'}</span>
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setClaimStep('request')}
                    className="text-[11px] text-purple-300/80 hover:text-white underline cursor-pointer"
                  >
                    Didn't receive a code? Request new code
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-xs">
                  {errorMsg}
                </div>
              )}
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-purple-300/70 block font-semibold">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-purple-300/50 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Alex Mercer"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-purple-300/70 block font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Discount / Referral Code (Optional)</span>
                      </label>
                      {referralCode.trim().length > 0 && (
                        <span className="text-[10px] text-emerald-400 font-bold">Code Active</span>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-purple-300/50 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Optional Referral or Promo Code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-purple-100 uppercase font-mono placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    {referralCode.trim().length > 0 && (
                      <p className="text-[10.5px] text-emerald-300 font-sans flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Referral Code <strong>{referralCode}</strong> applied.</span>
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-purple-300/70 block font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-300/50 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="trader@vixysvault.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-purple-300/70 font-semibold">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-300/50 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'Authenticating Session...'
                    : mode === 'login'
                    ? 'SIGN IN TO TERMINAL'
                    : 'CREATE ACCOUNT & UNLOCK FREE ACCESS'}
                </span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
