import React, { useState } from 'react';
import { Key, Shield, Bell, Copy, Check, Terminal, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { UserSubscription, AuthState, AlertSettings } from '../types';

interface SettingsViewProps {
  authState: AuthState;
  subscription: UserSubscription;
  alertSettings: AlertSettings;
  setAlertSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
  onOpenPricing: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  authState,
  subscription,
  alertSettings,
  setAlertSettings,
  onOpenPricing,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState(authState.user?.apiKey || 'vault_live_98a7b6c5d4e3f210');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newKey = `vault_live_${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 8)}`;
      setApiKey(newKey);
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 font-mono text-purple-100">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold mb-2">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>VAULT CONFIGURATION & API</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono text-white">Account & System Settings</h1>
          <p className="text-xs text-purple-300/60 font-mono">Manage security credentials, REST/WebSocket API keys, and notification integrations.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-300/60 font-mono">Plan Status:</span>
          <span className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold uppercase">
            {subscription.plan} ACTIVE
          </span>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-[#120B28] border border-purple-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
        <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>User Profile & Workspace</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-1">
            <span className="text-purple-300/50 text-[10px] block">Full Name</span>
            <span className="text-purple-100 font-bold">{authState.user?.name || 'Quant User'}</span>
          </div>
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-1">
            <span className="text-purple-300/50 text-[10px] block">Email Address</span>
            <span className="text-purple-100 font-bold">{authState.user?.email || 'trader@vixysvault.com'}</span>
          </div>
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-1">
            <span className="text-purple-300/50 text-[10px] block">Account Tier</span>
            <span className="text-purple-300 font-bold">{subscription.plan} Tier</span>
          </div>
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-1">
            <span className="text-purple-300/50 text-[10px] block">Member Since</span>
            <span className="text-purple-100 font-bold">{authState.user?.joinedDate || 'July 2026'}</span>
          </div>
        </div>
      </div>

      {/* API Key Management (Elite / Pro feature) */}
      <div className="bg-[#120B28] border border-purple-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-violet-400" />
              <span>VIXY'S VAULT REST & WebSocket API Keys</span>
            </h2>
            <p className="text-xs text-purple-300/60 font-mono mt-1">
              Programmatic access for automated execution, custom trading bots, or Python quant workflows.
            </p>
          </div>
          {subscription.plan !== 'ELITE' && (
            <button
              onClick={onOpenPricing}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition-all"
            >
              Upgrade for API
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] text-purple-300/60 block">Live Production API Secret Key</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="flex-1 bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs font-mono text-purple-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyKey}
                className="px-3 py-2 rounded-xl bg-[#1A1038] hover:bg-[#221648] text-purple-200 border border-purple-900/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedKey ? <Check className="w-4 h-4 text-purple-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
              <button
                onClick={handleRegenerateKey}
                disabled={isGenerating}
                className="p-2 rounded-xl bg-[#1A1038] hover:bg-[#221648] text-purple-300/70 hover:text-white border border-purple-900/40 transition-all"
                title="Regenerate API Key"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Terminal className="w-4 h-4" />
              <span>API Endpoint Sample (Python / Node)</span>
            </div>
            <pre className="text-[11px] text-purple-300/70 overflow-x-auto p-2 bg-[#080314] rounded border border-purple-900/40 font-mono">
              curl -H "X-VAULT-KEY: {apiKey}" https://api.vixysvault.com/v1/predict/btc15m
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
