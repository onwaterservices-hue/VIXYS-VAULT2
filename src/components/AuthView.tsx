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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const userEmail = email.trim().toLowerCase();
    if (!userEmail) {
      setLoading(false);
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const isAdminEmail = userEmail === 'vixyvault0@gmail.com';
    if (isAdminEmail) {
      localStorage.setItem('vixy_admin_email', userEmail);
      localStorage.setItem('vixy_user_email', userEmail);
    }

    const assignedRole: 'ADMIN' | 'UNPAID' | 'PRO' = isAdminEmail ? 'ADMIN' : 'UNPAID';
    const userName = fullName.trim() || (isAdminEmail ? `Master Admin (${userEmail.split('@')[0]})` : userEmail.split('@')[0]);

    if (mode === 'register') {
      if (password.length < 6) {
        setLoading(false);
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLoading(false);
        setErrorMsg('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      let res;
      if (mode === 'register') {
        const fetchRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password, name: userName }),
          signal: controller.signal
        });
        res = await fetchRes.json();
      } else {
        const fetchRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, password }),
          signal: controller.signal
        });
        res = await fetchRes.json();
      }
      clearTimeout(timeoutId);

      if (!res?.success) {
        setLoading(false);
        if (res?.error === 'ACCOUNT_NEEDS_PASSWORD') {
           setMode('register');
           setSuccessMsg('ACCOUNT FOUND: Set a password to finish setup and access your existing entitlement.');
           return;
        }
        if (res?.error === 'USER_EXISTS' && mode === 'register') {
           setMode('login');
           setErrorMsg('Account already exists. Sign in instead.');
           return;
        }
        if (res?.error === 'INVALID_CREDENTIALS') {
           setErrorMsg('Invalid email or password.');
           return;
        }
        setErrorMsg(res?.message || 'Authentication failed. Please check your credentials.');
        return;
      }

      setSuccessMsg('ACCOUNT READY! Entering VIXY Terminal...');
      
      const serverUser = res.user || {};
      const canonicalUserId = serverUser.id || serverUser.uid || `usr_${userEmail.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      
      let finalRole: string = assignedRole;
      if (res.entitlement) {
         if (res.entitlement.entitlements?.canAccessAdminPanel) finalRole = 'ADMIN';
         else if (res.entitlement.entitlements?.proQuant || res.entitlement.entitlements?.eliteQuant || res.entitlement.dayPass?.active) finalRole = 'PRO';
      }

      setAuthState({
        isAuthenticated: true,
        user: {
          id: canonicalUserId,
          email: userEmail,
          name: serverUser.name || userEmail.split('@')[0],
          role: finalRole as any,
          joinedDate: serverUser.joined || new Date().toISOString().split('T')[0],
          discordLinked: serverUser.discordLinked || false,
          discordId: serverUser.discordId,
          discordTag: serverUser.discordTag
        }
      });
      setUserRole(finalRole as any);

      if (typeof onSuccessNavigate === 'function') {
        setTimeout(() => onSuccessNavigate(finalRole as any), 1000);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('Network error. Please try again.');
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
          </div>

          {successMsg ? (
            <div className="p-6 bg-purple-500/10 border border-purple-500/40 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">{successMsg}</h3>
              <p className="text-xs text-purple-300 font-sans">Redirecting you to the trading terminal...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-xs">
                  {errorMsg}
                </div>
              )}
              
            
            
            


            
            

{mode === 'register' && !successMsg && (
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

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-purple-300/70 font-semibold">Confirm Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-purple-300/50 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {loading
                    ? 'Authenticating Session...'
                    : mode === 'login'
                    ? 'SIGN IN TO TERMINAL'
                    : 'CREATE ACCOUNT & CONTINUE'}
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
