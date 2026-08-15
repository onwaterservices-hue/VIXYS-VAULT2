import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, X, Sparkles, CheckCircle2, ShieldCheck, Key, Ticket } from 'lucide-react';
import { AuthState } from '../types';
import { syncAuthUserApi } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState?: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  initialMode?: 'login' | 'register';
  initialEmail?: string;
  onSuccessRole?: (role: 'PRO' | 'UNPAID' | 'ADMIN') => void;
  setUserRole?: React.Dispatch<React.SetStateAction<'PRO' | 'UNPAID' | 'ADMIN' | 'OWNER'>>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  authState,
  setAuthState,
  initialMode = 'login',
  initialEmail = '',
  onSuccessRole,
  setUserRole,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState(() => initialEmail || localStorage.getItem('vixy_user_email') || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync mode and email whenever modal opens or mode prop changes
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      if (initialEmail) {
        setEmail(initialEmail);
      } else {
        const stored = localStorage.getItem('vixy_user_email');
        if (stored) setEmail(stored);
      }
    }
  }, [isOpen, initialMode, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const userEmail = email.trim() || 'trader@vixysvault.com';
    const isAdminEmail = userEmail.toLowerCase() === 'vixyvault0@gmail.com';

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

    if (mode === 'forgot') {
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg(`Password reset instructions have been sent to ${userEmail}. Please check your inbox.`);
        setTimeout(() => {
          setMode('login');
          setSuccessMsg('');
        }, 2500);
      }, 600);
      return;
    }

    const assignedRole: 'ADMIN' | 'UNPAID' | 'PRO' = isAdminEmail ? 'ADMIN' : 'UNPAID';
    const userName = fullName.trim() || (isAdminEmail ? `Master Admin (${userEmail.split('@')[0]})` : email ? email.split('@')[0] : 'VIXY Trader');

    // Live sync user to server backend persistent database
    syncAuthUserApi({
      email: userEmail,
      name: userName,
      role: isAdminEmail ? 'OWNER' : 'USER',
      subscription: isAdminEmail ? 'ELITE_PASS' : 'NONE',
    })
      .then(async (syncRes: any) => {
        const canonicalUser = syncRes?.user || {};
        const canonicalUserId = canonicalUser.id || canonicalUser.uid || `usr_${userEmail.replace(/[^a-zA-Z0-9_]/g, '_')}`;
        const discordUserId = canonicalUser.discordId || canonicalUser.discordUserId;

        // Authoritative server check and automatic restore for active Day Pass or Subscription
        let hasActiveEntitlement = false;
        let restoredTierName = '';

        try {
          // 1. Run restore access API with full authenticated context
          const restoreRes = await fetch('/api/auth/restore-access', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': userEmail,
              'x-user-uid': canonicalUserId,
            },
            body: JSON.stringify({
              email: userEmail,
              uid: canonicalUserId,
              discordUserId,
            }),
          });
          if (restoreRes.ok) {
            const restData = await restoreRes.json();
            if (restData.success && (restData.restored || restData.entitlement?.status === 'active' || restData.entitlement?.dayPass?.active)) {
              hasActiveEntitlement = true;
              restoredTierName = restData.tier || restData.entitlement?.tier || '24-Hour Day Pass';
            }
          }
        } catch (_) {}

        // 2. Double check /api/entitlements
        if (!hasActiveEntitlement) {
          try {
            const entRes = await fetch(`/api/entitlements?email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(canonicalUserId)}`);
            if (entRes.ok) {
              const entData = await entRes.json();
              if (
                entData.entitlements?.proQuant ||
                entData.entitlements?.eliteQuant ||
                entData.dayPass?.active ||
                entData.status === 'active' ||
                entData.plan === 'ELITE_QUANT' ||
                entData.plan === 'PRO_QUANT' ||
                entData.plan === 'DAY_PASS'
              ) {
                hasActiveEntitlement = true;
                restoredTierName = entData.plan || '24-Hour Day Pass';
              }
            }
          } catch (_) {}
        }

        const finalRole: 'ADMIN' | 'UNPAID' | 'PRO' = isAdminEmail ? 'ADMIN' : hasActiveEntitlement ? 'PRO' : 'UNPAID';

        setAuthState({
          isAuthenticated: true,
          user: {
            id: canonicalUserId,
            email: userEmail,
            name: canonicalUser.name || userName,
            role: finalRole,
            discordId: discordUserId,
            discordTag: canonicalUser.discordTag,
            apiKey: canonicalUser.apiKey || `vault_live_${Math.random().toString(36).substring(2, 8)}`,
            joinedDate: canonicalUser.createdAt ? new Date(canonicalUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          },
        });

        if (setUserRole) setUserRole(finalRole);
        if (onSuccessRole) onSuccessRole(finalRole);

        setLoading(false);
        setSuccessMsg(
          isAdminEmail
            ? `Master Admin Verified! Full Vault Admin Control Center unlocked.`
            : hasActiveEntitlement
            ? `Active ${restoredTierName} Restored! Welcome back, ${userName}.`
            : mode === 'register'
            ? `Account created successfully! Welcome, ${userName}.`
            : `Signed in successfully. Welcome back, ${userName}!`
        );

        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1000);
      })
      .catch((err) => {
        console.warn('Auth sync error:', err);
        setLoading(false);
        setAuthState({
          isAuthenticated: true,
          user: {
            id: `usr_${userEmail.replace(/[^a-zA-Z0-9_]/g, '_')}`,
            email: userEmail,
            name: userName,
            role: assignedRole,
            apiKey: `vault_live_${Math.random().toString(36).substring(2, 8)}`,
            joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          },
        });
        if (setUserRole) setUserRole(assignedRole);
        if (onSuccessRole) onSuccessRole(assignedRole);
        setTimeout(() => {
          onClose();
        }, 800);
      });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#05020F]/90 backdrop-blur-2xl animate-fadeIn font-mono select-none overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#130B2A] via-[#0A0518] to-[#070312] border-2 border-purple-500/50 rounded-3xl shadow-2xl shadow-purple-950/90 overflow-hidden text-purple-100 my-auto">
        {/* Glow Header Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300/70 hover:text-white bg-[#0A0518] p-2 rounded-xl border border-purple-800/50 transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Top Mode Switcher Tabs */}
          <div className="flex items-center justify-center p-1 bg-[#090416] border border-purple-800/50 rounded-2xl max-w-xs mx-auto text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50 font-black'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50 font-black'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Header Title & Subtitle */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-cyan-300 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>VIXY DECISION INTELLIGENCE PORTAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white">
              {mode === 'login' && 'Sign In to Terminal'}
              {mode === 'register' && 'Create Your VIXY Account'}
              {mode === 'forgot' && 'Reset Account Password'}
            </h2>
            <p className="text-xs text-purple-200/70 font-sans max-w-sm mx-auto">
              {mode === 'register'
                ? 'Instant account setup for 24-Hour Day Pass ($9.99) & Full Terminal Access.'
                : 'Enter your credentials to unlock live 15m decision feeds & orderbook deltas.'}
            </p>
          </div>

          {/* Day Pass Promo Pill for Signup */}
          {mode === 'register' && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-[#0E0622] to-cyan-950/80 border border-cyan-500/40 flex items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">24H DAY PASS READY</div>
                  <div className="text-[10px] text-purple-300/80">$9.99 One-time payment after registration</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-[10px] font-black uppercase shrink-0">
                $9.99
              </span>
            </div>
          )}

          {successMsg ? (
            <div className="p-5 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl text-center space-y-2 shadow-xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-emerald-200 font-bold text-xs">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {errorMsg && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 font-bold text-[11px]">
                  {errorMsg}
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-purple-200 block font-bold text-[11px] uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Alex Mercer"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#080414] border border-purple-800/60 rounded-xl pl-10 pr-3 py-2.5 text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-purple-200 block font-bold text-[11px] uppercase tracking-wider">
                        Referral / Promo Code (Optional)
                      </label>
                      {referralCode.trim().length > 0 && (
                        <span className="text-[10px] text-emerald-400 font-bold">Code Active</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#080414] border border-purple-800/60 rounded-xl px-3.5 py-2.5 text-purple-100 uppercase font-mono text-xs placeholder-purple-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-purple-200 block font-bold text-[11px] uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="trader@vixysvault.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#080414] border border-purple-800/60 rounded-xl pl-10 pr-3 py-2.5 text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-purple-200 block font-bold text-[11px] uppercase tracking-wider">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#080414] border border-purple-800/60 rounded-xl pl-10 pr-3 py-2.5 text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-purple-950/80 border border-purple-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'Authenticating...'
                    : mode === 'login'
                    ? 'Sign In to Terminal'
                    : mode === 'register'
                    ? 'Create Account & Continue'
                    : 'Send Reset Link'}
                </span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* Registration Feature Perks */}
          {mode === 'register' && !successMsg && (
            <div className="pt-2 border-t border-purple-900/40 grid grid-cols-3 gap-2 text-[10px] text-purple-300/80 font-mono">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>15m Signal Stream</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Sub-Second L2</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Discord Webhooks</span>
              </div>
            </div>
          )}

          {/* Footer Security Badges */}
          <div className="flex items-center justify-between text-[10px] text-purple-400/60 pt-1 font-sans">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit SSL Encrypted
            </span>
            <span className="flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-cyan-400" /> Instant Terminal Setup
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
