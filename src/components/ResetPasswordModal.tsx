import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, X, ShieldCheck, KeyRound } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetToken: string;
  onOpenLogin: (email?: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  resetToken,
  onOpenLogin,
}) => {
  const [verifying, setVerifying] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [tokenEmail, setTokenEmail] = useState<string>('');
  const [verifyError, setVerifyError] = useState<string>('');

  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !resetToken) return;

    setVerifying(true);
    setVerifyError('');
    setTokenValid(false);
    setSubmitSuccess(false);
    setSubmitError('');

    fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(resetToken)}`)
      .then((res) => res.json())
      .then((data) => {
        setVerifying(false);
        if (data.valid) {
          setTokenValid(true);
          if (data.email) setTokenEmail(data.email);
        } else {
          setTokenValid(false);
          setVerifyError(data.message || 'This password reset link is invalid or has expired.');
        }
      })
      .catch((err) => {
        setVerifying(false);
        setTokenValid(false);
        setVerifyError('Failed to verify reset token. Please try again or request a new reset link.');
        console.warn('Verify reset token error:', err);
      });
  }, [isOpen, resetToken]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (newPassword.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok || !data.success) {
        setSubmitError(data.message || 'Failed to update password. Please request a new reset link.');
        return;
      }

      setSubmitSuccess(true);
    } catch (err) {
      setSubmitting(false);
      setSubmitError('Network error while resetting password. Please check your connection and try again.');
      console.error('Reset password error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#05020F]/90 backdrop-blur-2xl animate-fadeIn font-mono select-none overflow-y-auto">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#130B2A] via-[#0A0518] to-[#070312] border-2 border-purple-500/50 rounded-3xl shadow-2xl shadow-purple-950/90 overflow-hidden text-purple-100 my-auto">
        {/* Top Glow Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-300/70 hover:text-white bg-[#0A0518] p-2 rounded-xl border border-purple-800/50 transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-cyan-300 text-[11px] font-bold">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>VIXY ACCOUNT RECOVERY</span>
            </div>
            <h2 className="text-2xl font-black font-sans tracking-tight text-white">
              Set New Password
            </h2>
            <p className="text-xs text-purple-200/70 font-sans max-w-xs mx-auto">
              Create a secure new password for your VIXY account.
            </p>
          </div>

          {/* Loading Verification State */}
          {verifying && (
            <div className="p-8 text-center space-y-3 bg-[#080414] rounded-2xl border border-purple-800/40">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-purple-300 font-sans">Verifying reset token security...</p>
            </div>
          )}

          {/* Token Invalid / Expired State */}
          {!verifying && !tokenValid && (
            <div className="p-6 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-rose-200 text-sm font-sans">Invalid Reset Link</h3>
                <p className="text-xs text-rose-300/80 font-sans">{verifyError}</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-950/80"
              >
                Request New Password Reset
              </button>
            </div>
          )}

          {/* Password Successfully Reset State */}
          {!verifying && tokenValid && submitSuccess && (
            <div className="p-6 bg-emerald-950/70 border-2 border-emerald-500/60 rounded-2xl text-center space-y-4 shadow-xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="space-y-1.5">
                <h3 className="font-bold text-emerald-100 text-base font-sans">Password Updated!</h3>
                <p className="text-xs text-emerald-200/80 font-sans">
                  Your VIXY account password has been securely updated. You can now sign in with your new password.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenLogin(tokenEmail);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>Sign In To Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Reset Form State */}
          {!verifying && tokenValid && !submitSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {submitError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 font-bold text-[11px]">
                  {submitError}
                </div>
              )}

              {tokenEmail && (
                <div className="p-3 bg-[#080414] border border-purple-800/40 rounded-xl space-y-0.5">
                  <div className="text-[10px] text-purple-400 font-bold uppercase">Account Email</div>
                  <div className="text-white font-mono text-xs">{tokenEmail}</div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-purple-200 block font-bold text-[11px] uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#080414] border border-purple-800/60 rounded-xl pl-10 pr-3 py-2.5 text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-purple-200 block font-bold text-[11px] uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#080414] border border-purple-800/60 rounded-xl pl-10 pr-3 py-2.5 text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-purple-950/80 border border-purple-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                <span>{submitting ? 'Updating Password...' : 'Save New Password'}</span>
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="flex items-center justify-center text-[10px] text-purple-400/60 pt-1 font-sans">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Single-Use Secure Reset Token
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
