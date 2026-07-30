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
  setUserRole: (role: 'DEMO' | 'PRO' | 'ADMIN') => void;
  onSuccessNavigate?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  authState,
  setAuthState,
  setUserRole,
  onSuccessNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const userEmail = email.trim() || 'trader@vixysvault.com';
    const isAdminEmail = userEmail.toLowerCase() === 'vixyvault0@gmail.com';

    if (isAdminEmail && password !== 'Seattle007') {
      setTimeout(() => {
        setLoading(false);
        setErrorMsg('Access Denied: Incorrect password for Master Admin account (vixyvault0@gmail.com).');
      }, 500);
      return;
    }

    const assignedRole: 'ADMIN' | 'DEMO' | 'PRO' = isAdminEmail ? 'ADMIN' : 'DEMO';
    const userName = fullName.trim() || (isAdminEmail ? 'Master Admin (Vixy Vault)' : email ? email.split('@')[0] : 'Free Trial Trader');

    setTimeout(() => {
      setLoading(false);
      setAuthState({
        isAuthenticated: true,
        user: {
          id: `usr_${Math.random().toString(36).substring(2, 9)}`,
          email: userEmail,
          name: userName,
          role: assignedRole,
          apiKey: `vault_live_${Math.random().toString(36).substring(2, 8)}`,
          joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        },
      });
      setUserRole(assignedRole);
      setSuccessMsg(
        isAdminEmail
          ? `Master Admin Verified! Full Vault Admin Control Center unlocked.`
          : mode === 'register'
          ? `Account created successfully! Welcome, ${userName}. Your Free Access Pass is active.`
          : `Signed in successfully. Welcome back, ${userName}!`
      );
      if (onSuccessNavigate) {
        setTimeout(onSuccessNavigate, 1000);
      }
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 font-mono text-purple-100 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>VIXY'S VAULT DECISION INTELLIGENCE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
          {mode === 'login' && 'SIGN IN TO YOUR TERMINAL'}
          {mode === 'register' && 'CREATE YOUR VAULT ACCOUNT'}
          {mode === 'forgot' && 'RESET YOUR VAULT PASSWORD'}
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
                <strong className="text-white block font-bold">3-Hour Free Trial Pass</strong>
                <span className="text-purple-300/70 font-sans text-[11px]">
                  Full access to all real-time feeds without requiring a credit card upfront.
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
              {mode === 'register' && (
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

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-purple-300/70 font-semibold">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-purple-300 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
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
              )}

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
                    : mode === 'register'
                    ? 'CREATE ACCOUNT & UNLOCK FREE ACCESS'
                    : 'SEND PASSWORD RESET LINK'}
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
