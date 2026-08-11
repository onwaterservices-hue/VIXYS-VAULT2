import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { AuthState } from '../types';
import { syncAuthUserApi } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState?: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  initialMode?: 'login' | 'register';
  onSuccessRole?: (role: 'PRO' | 'DEMO' | 'ADMIN') => void;
  setUserRole?: React.Dispatch<React.SetStateAction<'PRO' | 'DEMO' | 'ADMIN' | 'OWNER'>>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  authState,
  setAuthState,
  initialMode = 'login',
  onSuccessRole,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('PROMOTER20');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const userEmail = email.trim() || 'trader@vixysvault.com';
    const isAdminEmail = ['onwaterservices@gmail.com', 'vixyvault0@gmail.com'].includes(userEmail.toLowerCase());

    if (isAdminEmail && password && password !== 'Seattle007') {
      setTimeout(() => {
        setLoading(false);
        setErrorMsg('Access Denied: Incorrect password for Master Admin account.');
      }, 500);
      return;
    }

    if (isAdminEmail) {
      localStorage.setItem('vixy_admin_email', userEmail.toLowerCase());
      localStorage.setItem('vixy_user_email', userEmail.toLowerCase());
    }

    const assignedRole: 'ADMIN' | 'DEMO' | 'PRO' = isAdminEmail ? 'ADMIN' : 'DEMO';
    const userName = fullName.trim() || (isAdminEmail ? `Master Admin (${userEmail.split('@')[0]})` : email ? email.split('@')[0] : 'Free Trial Trader');

    // Live sync user to server backend persistent database
    syncAuthUserApi({
      email: userEmail,
      name: userName,
      role: isAdminEmail ? 'OWNER' : 'FREE',
      subscription: isAdminEmail ? 'ELITE_PASS' : (mode === 'register' ? 'FREE_TRIAL' : 'FREE_TRIAL'),
    }).catch((err) => console.warn('Auth sync error:', err));

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
      if (onSuccessRole) onSuccessRole(assignedRole);
      setSuccessMsg(
        isAdminEmail
          ? `Master Admin Verified! Full Vault Admin Control Center unlocked.`
          : mode === 'register'
          ? `Account created successfully! Welcome, ${userName}. Your Free Access Pass is now active.`
          : `Signed in successfully. Welcome back, ${userName}!`
      );
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0518]/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#120B28] border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden text-purple-100 font-mono">
        {/* Glow Header Bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300/60 hover:text-white bg-[#0B061A] p-1.5 rounded-lg border border-purple-900/40 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Brand & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>VIXY AI AUTHENTICATION</span>
            </div>
            <h2 className="text-2xl font-black font-mono tracking-tight text-white">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create Your VIXY AI Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-xs text-purple-300/60 font-sans">
              Access live 15m prediction market intelligence & L2 order flow delta.
            </p>
          </div>

          {successMsg ? (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-purple-300 font-bold text-xs">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {errorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-[11px]">
                  {errorMsg}
                </div>
              )}
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-purple-300/60 block font-semibold">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-purple-300/50 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Alex Mercer"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-9 pr-3 py-2 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-purple-300/60 block font-semibold text-[11px] uppercase tracking-wider">
                        Discount / Referral Code
                      </label>
                      <span className="text-[10px] text-emerald-400 font-bold">20% Off Active</span>
                    </div>
                    <input
                      type="text"
                      placeholder="PROMOTER20, REF-ALEX, VIXY50"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 uppercase font-mono text-xs placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-purple-300/60 block font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-300/50 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="trader@vixysvault.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-9 pr-3 py-2 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-purple-300/60 font-semibold">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[10px] text-purple-300 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-purple-300/50 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-9 pr-3 py-2 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
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
                    ? 'Authenticating...'
                    : mode === 'login'
                    ? 'Sign In to Terminal'
                    : mode === 'register'
                    ? 'Create Account & Unlock Free Access'
                    : 'Send Password Reset Link'}
                </span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* Switch Mode Footer */}
          <div className="text-center text-xs text-purple-300/60 pt-2 border-t border-purple-900/40">
            {mode === 'login' && (
              <p>
                Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-purple-300 font-bold hover:underline">
                  Create Account
                </button>
              </p>
            )}
            {mode === 'register' && (
              <p>
                Already registered?{' '}
                <button onClick={() => setMode('login')} className="text-purple-300 font-bold hover:underline">
                  Sign In
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button onClick={() => setMode('login')} className="text-purple-300 font-bold hover:underline">
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
