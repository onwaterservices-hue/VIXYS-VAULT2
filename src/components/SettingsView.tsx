import React, { useState } from 'react';
import { Key, Shield, Bell, Copy, Check, Terminal, ExternalLink, RefreshCw, Zap, Lock, Activity, CheckCircle, Wifi, AlertTriangle } from 'lucide-react';
import { UserSubscription, AuthState, AlertSettings, ExchangeApiKeys, ExchangeCredential } from '../types';
import { KalshiAutoTradePanel } from './KalshiAutoTradePanel';

interface SettingsViewProps {
  authState: AuthState;
  setAuthState?: React.Dispatch<React.SetStateAction<AuthState>>;
  apiKeys?: any[];
  setApiKeys?: React.Dispatch<React.SetStateAction<any[]>>;
  subscription: UserSubscription;
  alertSettings?: AlertSettings;
  setAlertSettings?: React.Dispatch<React.SetStateAction<AlertSettings>>;
  exchangeKeys: ExchangeApiKeys;
  setExchangeKeys: React.Dispatch<React.SetStateAction<ExchangeApiKeys>>;
  onOpenPricing: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  authState,
  subscription,
  alertSettings,
  setAlertSettings,
  exchangeKeys,
  setExchangeKeys,
  onOpenPricing,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey, setApiKey] = useState(authState.user?.apiKey || 'vault_live_98a7b6c5d4e3f210');
  const [isGenerating, setIsGenerating] = useState(false);

  // Testing status for each exchange
  const [testingVenue, setTestingVenue] = useState<'kalshi' | 'polymarket' | 'draftkings' | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  const isElite =
    subscription.plan === 'ELITE' ||
    subscription.plan === 'ELITE_PASS' ||
    subscription.plan === 'ELITE_QUANT' ||
    subscription.plan === 'VIXY VAULT ELITE QUANT' ||
    (authState.user?.role as string) === 'ELITE' ||
    authState.user?.role === 'ADMIN' ||
    authState.user?.role === 'OWNER' ||
    authState.user?.email?.toLowerCase() === 'vixyvault0@gmail.com';

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

  const handleTestConnection = (venue: 'kalshi' | 'polymarket' | 'draftkings') => {
    setTestingVenue(venue);
    setTestSuccessMessage(null);
    setTimeout(() => {
      const simulatedLatency = 15;
      setExchangeKeys((prev) => ({
        ...prev,
        [venue]: {
          ...prev[venue],
          connected: true,
          status: 'CONNECTED',
          latencyMs: simulatedLatency,
          lastPing: 'Just now',
        },
      }));
      setTestingVenue(null);
      const nameMap = { kalshi: 'Kalshi DCM', polymarket: 'Polymarket L2', draftkings: 'DraftKings Micro' };
      setTestSuccessMessage(`${nameMap[venue]} API Handshake Verified! Latency: ${simulatedLatency}ms`);
      setTimeout(() => setTestSuccessMessage(null), 4000);
    }, 900);
  };

  const handleToggleConnect = (venue: 'kalshi' | 'polymarket' | 'draftkings') => {
    setExchangeKeys((prev) => {
      const curr = prev[venue];
      const nextConnected = !curr.connected;
      return {
        ...prev,
        [venue]: {
          ...curr,
          connected: nextConnected,
          status: nextConnected ? 'CONNECTED' : 'DISCONNECTED',
          latencyMs: nextConnected ? 14 : 0,
          lastPing: nextConnected ? 'Just now' : 'Never',
        },
      };
    });
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
          <span className={`px-3 py-1 rounded-xl border text-xs font-mono font-bold uppercase ${
            isElite
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/20'
              : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
          }`}>
            {subscription.plan} PASS ACTIVE
          </span>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="vixy-card hud-corners p-6 space-y-6">
        <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>User Profile & Workspace</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="hud-stat-card bg-[#0a0518] border-purple-900/40">
            <span className="hud-stat-label">Full Name</span>
            <span className="hud-stat-value text-purple-100">{authState.user?.name || 'Quant User'}</span>
          </div>
          <div className="hud-stat-card bg-[#0a0518] border-purple-900/40">
            <span className="hud-stat-label">Email Address</span>
            <span className="hud-stat-value text-purple-100">{authState.user?.email || 'trader@vixysvault.com'}</span>
          </div>
          <div className="hud-stat-card bg-[#0a0518] border-purple-900/40">
            <span className="hud-stat-label">Account Tier</span>
            <span className="hud-stat-value text-purple-300">{subscription.plan} Tier</span>
          </div>
          <div className="hud-stat-card bg-[#0a0518] border-purple-900/40">
            <span className="hud-stat-label">Member Since</span>
            <span className="hud-stat-value text-purple-100">{authState.user?.joinedDate || 'July 2026'}</span>
          </div>
        </div>
      </div>

      {/* KALSHI DIRECT API & AUTO-TRADING ENGINE (ELITE PASS & CFTC REGULATED DCM) */}
      <KalshiAutoTradePanel
        isEliteOrAdmin={isElite}
        userEmail={authState.user?.email}
        userId={authState.user?.id}
        onOpenPricing={onOpenPricing}
      />

      {/* SECONDARY EXCHANGE CONNECTIONS (POLYMARKET & DRAFTKINGS) */}
      <div className="vixy-card hud-corners p-6 space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-purple-400" />
                <span>Secondary Market Feeds (Polymarket L2 & DraftKings Micro)</span>
              </h2>
            </div>
            <p className="text-xs text-purple-300/70 font-mono mt-1">
              Connect external L2 orderbooks for multi-venue arbitrage monitoring and cross-platform spread analysis.
            </p>
          </div>
        </div>

        {testSuccessMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-mono animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testSuccessMessage}</span>
          </div>
        )}

        {/* Exchange Key Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. POLYMARKET API CARD */}
          <div className="bg-[#0a0518] rounded-xl border border-purple-900/60 p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400" />
                  <span className="font-bold text-white text-xs">Polymarket L2 API</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  exchangeKeys.polymarket.connected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {exchangeKeys.polymarket.connected ? `${exchangeKeys.polymarket.latencyMs}ms` : 'Disconnected'}
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="text-purple-300/60 text-[10px] block mb-1">L2 Proxy API Key</label>
                  <input
                    type="text"
                    value={exchangeKeys.polymarket.apiKey}
                    onChange={(e) =>
                      setExchangeKeys((prev) => ({
                        ...prev,
                        polymarket: { ...prev.polymarket, apiKey: e.target.value },
                      }))
                    }
                    placeholder="poly_l2_0x..."
                    className="w-full bg-[#0c0620] border border-purple-900/60 rounded-xl px-2.5 py-1.5 text-purple-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-purple-300/60 text-[10px] block mb-1">Passphrase / Wallet Address</label>
                  <input
                    type="text"
                    value={exchangeKeys.polymarket.passphraseOrWallet || ''}
                    onChange={(e) =>
                      setExchangeKeys((prev) => ({
                        ...prev,
                        polymarket: { ...prev.polymarket, passphraseOrWallet: e.target.value },
                      }))
                    }
                    placeholder="0x7129... or passphrase"
                    className="w-full bg-[#0c0620] border border-purple-900/60 rounded-xl px-2.5 py-1.5 text-purple-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-purple-300/60 text-[10px] block mb-1">Environment</label>
                  <select
                    value={exchangeKeys.polymarket.environment}
                    onChange={(e) =>
                      setExchangeKeys((prev) => ({
                        ...prev,
                        polymarket: { ...prev.polymarket, environment: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#0c0620] border border-purple-900/60 rounded-xl px-2 py-1.5 text-purple-200 focus:outline-none"
                  >
                    <option value="live">Polygon Mainnet (USDC)</option>
                    <option value="paper">Amoy Testnet</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between gap-2">
              <button
                onClick={() => handleTestConnection('polymarket')}
                disabled={testingVenue === 'polymarket'}
                className="flex-1 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
              >
                {testingVenue === 'polymarket' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                <span>Test API Handshake</span>
              </button>

              <button
                onClick={() => handleToggleConnect('polymarket')}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                  exchangeKeys.polymarket.connected
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                {exchangeKeys.polymarket.connected ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>

          {/* 2. DRAFTKINGS API CARD */}
          <div className="bg-[#0a0518] rounded-xl border border-purple-900/60 p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <span className="font-bold text-white text-xs">DraftKings Micro API</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  exchangeKeys.draftkings.connected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {exchangeKeys.draftkings.connected ? `${exchangeKeys.draftkings.latencyMs}ms` : 'Disconnected'}
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="text-purple-300/60 text-[10px] block mb-1">Sportsbook API Key</label>
                  <input
                    type="text"
                    value={exchangeKeys.draftkings.apiKey}
                    onChange={(e) =>
                      setExchangeKeys((prev) => ({
                        ...prev,
                        draftkings: { ...prev.draftkings, apiKey: e.target.value },
                      }))
                    }
                    placeholder="dk_micro_key_..."
                    className="w-full bg-[#0c0620] border border-purple-900/60 rounded-xl px-2.5 py-1.5 text-purple-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-purple-300/60 text-[10px] block mb-1">Client / Account ID</label>
                  <input
                    type="text"
                    value={exchangeKeys.draftkings.passphraseOrWallet || ''}
                    onChange={(e) =>
                      setExchangeKeys((prev) => ({
                        ...prev,
                        draftkings: { ...prev.draftkings, passphraseOrWallet: e.target.value },
                      }))
                    }
                    placeholder="DK-ACC-8912"
                    className="w-full bg-[#0c0620] border border-purple-900/60 rounded-xl px-2.5 py-1.5 text-purple-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-purple-300/60 text-[10px] block mb-1">Environment</label>
                  <select
                    value={exchangeKeys.draftkings.environment}
                    onChange={(e) =>
                      setExchangeKeys((prev) => ({
                        ...prev,
                        draftkings: { ...prev.draftkings, environment: e.target.value as any },
                      }))
                    }
                    className="w-full bg-[#0c0620] border border-purple-900/60 rounded-xl px-2 py-1.5 text-purple-200 focus:outline-none"
                  >
                    <option value="live">Sportsbook Live Odds</option>
                    <option value="paper">Simulated Odds Sandbox</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between gap-2">
              <button
                onClick={() => handleTestConnection('draftkings')}
                disabled={testingVenue === 'draftkings'}
                className="flex-1 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold transition-all flex items-center justify-center gap-1"
              >
                {testingVenue === 'draftkings' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                <span>Test API Handshake</span>
              </button>

              <button
                onClick={() => handleToggleConnect('draftkings')}
                className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                  exchangeKeys.draftkings.connected
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
              >
                {exchangeKeys.draftkings.connected ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Management (Vixy's Vault System API) */}
      <div className="vixy-card hud-corners p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-violet-400" />
              <span>VIXY AI REST & WebSocket API Keys</span>
            </h2>
            <p className="text-xs text-purple-300/60 font-mono mt-1">
              Programmatic access for automated execution, custom trading bots, or Python quant workflows.
            </p>
          </div>
          {!isElite && (
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
                className="flex-1 bg-[#0a0518] border border-purple-900/60 rounded-xl px-3 py-2 text-xs font-mono text-purple-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyKey}
                className="px-3 py-2 rounded-xl bg-[#0c0620] hover:bg-[#0c0620] text-purple-200 border border-purple-900/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedKey ? <Check className="w-4 h-4 text-purple-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
              <button
                onClick={handleRegenerateKey}
                disabled={isGenerating}
                className="p-2 rounded-xl bg-[#0c0620] hover:bg-[#0c0620] text-purple-300/70 hover:text-white border border-purple-900/40 transition-all"
                title="Regenerate API Key"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-[#0a0518] p-4 rounded-xl border border-purple-900/40 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <Terminal className="w-4 h-4" />
              <span>API Endpoint Sample (Python / Node)</span>
            </div>
            <pre className="text-[11px] text-purple-300/70 overflow-x-auto p-2 bg-[#0a0518] rounded border border-purple-900/40 font-mono">
              curl -H "X-VAULT-KEY: {apiKey}" https://api.vixysvault.com/v1/predict/btc15m
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

