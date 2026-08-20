import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Lock,
  CheckCircle,
  Activity,
  RefreshCw,
  Zap,
  Sliders,
  DollarSign,
  AlertTriangle,
  FileText,
  Key,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { KalshiAutoTradeConfig, AutoTradeAuditLog } from '../types';
import { KalshiAutoTradeService, KalshiHandshakeResponse } from '../services/market/kalshiAutoTradeService';

interface KalshiAutoTradePanelProps {
  isEliteOrAdmin: boolean;
  userEmail?: string;
  userId?: string;
  onOpenPricing: () => void;
}

export const KalshiAutoTradePanel: React.FC<KalshiAutoTradePanelProps> = ({
  isEliteOrAdmin,
  userEmail,
  userId,
  onOpenPricing,
}) => {
  // Key state
  const [apiKeyId, setApiKeyId] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'paper'>('live');
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedKeyId, setMaskedKeyId] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Auto-trade config state
  const [config, setConfig] = useState<KalshiAutoTradeConfig>({
    enabled: false,
    confidenceThreshold: 80,
    maxStakePerTradeUSD: 25,
    maxDailyExposureUSD: 100,
    supportedMarkets: ['BTC', 'ETH', 'SOL'],
    environment: 'live',
    consecutiveFailures: 0,
    autoDisabledReason: null,
  });

  // Runtime / UI state
  const [loading, setLoading] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingHandshake, setTestingHandshake] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<KalshiHandshakeResponse | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AutoTradeAuditLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [dailyExposureUSD, setDailyExposureUSD] = useState(0);

  // Fetch status on load if authorized
  useEffect(() => {
    if (isEliteOrAdmin) {
      loadKalshiStatus();
    }
  }, [isEliteOrAdmin, userEmail, userId]);

  const loadKalshiStatus = async () => {
    setLoading(true);
    try {
      const res = await KalshiAutoTradeService.getStatus(userEmail, userId);
      if (res.success) {
        setIsConfigured(res.configured);
        setMaskedKeyId(res.keyIdMasked || '');
        setEnvironment(res.environment || 'live');
        if (res.autoTradeConfig) {
          setConfig(res.autoTradeConfig);
        }
      }
      const logsRes = await KalshiAutoTradeService.getAuditLogs(userEmail, userId);
      if (logsRes.success && logsRes.logs) {
        setAuditLogs(logsRes.logs);
      }
    } catch {
      // Ignore network errors on initial load
    } finally {
      setLoading(false);
    }
  };

  const handleTestHandshake = async () => {
    setTestingHandshake(true);
    setHandshakeResult(null);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const res = await KalshiAutoTradeService.testHandshake({
        keyId: apiKeyId || undefined,
        privateKey: privateKey || undefined,
        environment,
        userEmail,
        userId,
      });
      setHandshakeResult(res);

      if (res.success) {
        setActionSuccessMessage(`Handshake verified (${res.latencyMs}ms)! Authenticated with Kalshi ${environment.toUpperCase()} gateway.`);
      } else {
        setActionErrorMessage(`Handshake failed: ${res.message}`);
      }
      // Refresh audit logs to show test attempt
      const logsRes = await KalshiAutoTradeService.getAuditLogs(userEmail, userId);
      if (logsRes.success && logsRes.logs) setAuditLogs(logsRes.logs);
    } catch (e: any) {
      setActionErrorMessage(`Handshake test exception: ${e?.message}`);
    } finally {
      setTestingHandshake(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!apiKeyId.trim() || !privateKey.trim()) {
      setActionErrorMessage('Please provide both Kalshi Key ID and Private RSA Key');
      return;
    }

    setSavingKeys(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const res = await KalshiAutoTradeService.saveKeys({
        keyId: apiKeyId.trim(),
        privateKey: privateKey.trim(),
        environment,
        userEmail,
        userId,
      });

      if (res.success) {
        setIsConfigured(true);
        setMaskedKeyId(res.keyIdMasked || apiKeyId.slice(0, 8) + '...');
        setPrivateKey('');
        setActionSuccessMessage('Kalshi credentials encrypted and saved securely at rest.');
        setTimeout(() => setActionSuccessMessage(null), 5000);
      } else {
        setActionErrorMessage(res.error || 'Failed to save credentials');
      }
    } catch (e: any) {
      setActionErrorMessage(e?.message || 'Error saving keys');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleDeleteKeys = async () => {
    if (!confirm('Are you sure you want to disconnect your Kalshi API key? Auto-trading will be disabled.')) return;

    setLoading(true);
    try {
      const res = await KalshiAutoTradeService.deleteKeys(userEmail, userId);
      if (res.success) {
        setIsConfigured(false);
        setMaskedKeyId('');
        setApiKeyId('');
        setPrivateKey('');
        setConfig((prev) => ({ ...prev, enabled: false }));
        setActionSuccessMessage('Kalshi credentials deleted and auto-trading disabled.');
      }
    } catch (e: any) {
      setActionErrorMessage(e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoTradeMaster = async (nextState: boolean) => {
    if (nextState && !isConfigured) {
      setActionErrorMessage('Cannot enable auto-trading: Please connect and save your Kalshi API key first.');
      return;
    }

    setSavingConfig(true);
    setActionErrorMessage(null);

    try {
      const res = await KalshiAutoTradeService.saveConfig(
        { ...config, enabled: nextState, resetKillSwitch: nextState ? true : undefined },
        userEmail,
        userId
      );
      if (res.success && res.config) {
        setConfig(res.config);
        setActionSuccessMessage(
          nextState
            ? '⚡ Kalshi Auto-Trading is now ACTIVE. Orders will execute when locked signals meet your criteria.'
            : '⏸️ Kalshi Auto-Trading paused.'
        );
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        setActionErrorMessage(res.error || 'Failed to update auto-trade state');
      }
    } catch (e: any) {
      setActionErrorMessage(e?.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveParameters = async () => {
    setSavingConfig(true);
    setActionErrorMessage(null);

    try {
      const res = await KalshiAutoTradeService.saveConfig(config, userEmail, userId);
      if (res.success && res.config) {
        setConfig(res.config);
        setActionSuccessMessage('Auto-trade parameters updated successfully.');
        setTimeout(() => setActionSuccessMessage(null), 3000);
      } else {
        setActionErrorMessage(res.error || 'Failed to update parameters');
      }
    } catch (e: any) {
      setActionErrorMessage(e?.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetKillSwitch = async () => {
    setSavingConfig(true);
    try {
      const res = await KalshiAutoTradeService.saveConfig(
        { ...config, enabled: true, resetKillSwitch: true },
        userEmail,
        userId
      );
      if (res.success && res.config) {
        setConfig(res.config);
        setActionSuccessMessage('Kill switch reset! Auto-trading re-enabled.');
        setTimeout(() => setActionSuccessMessage(null), 4000);
      }
    } catch (e: any) {
      setActionErrorMessage(e?.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleMarketInclusion = (market: string) => {
    setConfig((prev) => {
      const current = prev.supportedMarkets || ['BTC'];
      const exists = current.includes(market);
      const nextMarkets = exists ? current.filter((m) => m !== market) : [...current, market];
      return { ...prev, supportedMarkets: nextMarkets.length > 0 ? nextMarkets : ['BTC'] };
    });
  };

  return (
    <div className="bg-[#0B061A] border-2 border-cyan-500/30 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden font-mono">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50 animate-pulse" />
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Kalshi Direct API & Automated Execution Engine</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              CFTC REGULATED DCM
            </span>
          </div>
          <p className="text-xs text-cyan-200/60 leading-relaxed">
            Execute high-conviction VIXY 15-minute signals directly on Kalshi prediction markets with institutional RSA authentication and automatic exposure controls.
          </p>
        </div>

        {isEliteOrAdmin ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                KalshiAutoTradeService.getAuditLogs(userEmail, userId).then((r) => r.logs && setAuditLogs(r.logs));
                setShowLogsModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Audit Logs ({auditLogs.length})</span>
            </button>
            <div className="flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-cyan-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Elite Authorized</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenPricing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Upgrade to Elite</span>
          </button>
        )}
      </div>

      {/* NON-ELITE BLUR & UPGRADE OVERLAY */}
      {!isEliteOrAdmin && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-[#070410]/80 backdrop-blur-md">
          <div className="bg-[#0F0724] border-2 border-amber-500/60 rounded-2xl p-8 max-w-lg text-center space-y-4 shadow-2xl shadow-amber-500/10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Kalshi Auto-Trading Requires Elite Pass</h3>
              <p className="text-xs text-purple-200/80 leading-relaxed font-sans">
                Automated order execution on CFTC-regulated Kalshi markets is reserved for <strong className="text-amber-300">VIXY Elite</strong> subscribers. Connect private RSA keys, configure risk caps, and automatically trade locked signals.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenPricing}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Unlock Kalshi Auto-Trading</span>
              </button>
            </div>
            <div className="text-[10px] text-purple-300/50 flex items-center justify-center gap-2">
              <span>✓ Sub-second execution</span>
              <span>•</span>
              <span>✓ Idempotent risk caps</span>
              <span>•</span>
              <span>✓ Instant cancellation</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Blurred & Disabled for Non-Elite) */}
      <div className={`space-y-6 ${!isEliteOrAdmin ? 'pointer-events-none select-none filter blur-[3px] opacity-40' : ''}`}>
        {/* Banner Feedback Messages */}
        {actionSuccessMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {actionErrorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
        )}

        {/* Kill Switch Triggered Alert */}
        {config.consecutiveFailures >= 3 && (
          <div className="p-4 bg-amber-950/80 border-2 border-amber-500 rounded-xl text-amber-200 text-xs space-y-2 shadow-lg shadow-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>KILL SWITCH ACTIVE — Auto-Trading Paused</span>
              </div>
              <button
                onClick={handleResetKillSwitch}
                disabled={savingConfig}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow"
              >
                Reset & Re-Enable
              </button>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed font-sans">
              {config.autoDisabledReason || '3 consecutive order failures detected. Auto-trading was paused to protect your account balance.'}
            </p>
          </div>
        )}

        {/* Grid: Left Column = Key Connection, Right Column = Auto-Trading Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 1: KALSHI API CREDENTIALS */}
          <div className="bg-[#120826] border border-cyan-900/60 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">Kalshi API Authentication</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  isConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {isConfigured ? 'Key Stored (Encrypted)' : 'Not Connected'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-cyan-300/70 text-[10px]">API Key ID</label>
                  {isConfigured && maskedKeyId && (
                    <span className="text-[10px] text-emerald-400 font-mono">Current: {maskedKeyId}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={apiKeyId}
                  onChange={(e) => setApiKeyId(e.target.value)}
                  placeholder={isConfigured ? maskedKeyId : 'e.g. kalshi_sec_98a7b6c5...'}
                  className="w-full bg-[#0B061A] border border-cyan-900/60 rounded-lg px-3 py-2 text-cyan-200 focus:outline-none focus:border-cyan-400 placeholder:text-cyan-900/60 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-cyan-300/70 text-[10px]">Private RSA Key (PEM Format)</label>
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-[10px] text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPrivateKey ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder={
                    isConfigured
                      ? '•••••••••••••••••••••••••••••••••••••••••••• (Encrypted at rest in Firestore)'
                      : '-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
                  }
                  className="w-full bg-[#0B061A] border border-cyan-900/60 rounded-lg px-3 py-2 text-cyan-200 focus:outline-none focus:border-cyan-400 placeholder:text-cyan-900/60 text-[10px] font-mono leading-tight resize-none"
                />
              </div>

              <div>
                <label className="text-cyan-300/70 text-[10px] block mb-1">Target Environment</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="w-full bg-[#0B061A] border border-cyan-900/60 rounded-lg px-3 py-2 text-cyan-200 focus:outline-none focus:border-cyan-400 text-xs"
                >
                  <option value="live">Live DCM Production (CFTC Regulated Real Capital)</option>
                  <option value="paper">Demo Sandbox (Paper Simulation)</option>
                </select>
              </div>
            </div>

            {/* Handshake Result Box */}
            {handshakeResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                  handshakeResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Status: {handshakeResult.status}</span>
                  <span>{handshakeResult.latencyMs}ms</span>
                </div>
                <p className="text-[10px] leading-tight opacity-90">{handshakeResult.message}</p>
                {typeof handshakeResult.balance === 'number' && (
                  <div className="text-[10px] pt-1 text-cyan-300">
                    Live Kalshi Balance: <strong>${handshakeResult.balance.toFixed(2)} USD</strong>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 border-t border-cyan-900/40 flex flex-wrap items-center gap-2">
              <button
                onClick={handleTestHandshake}
                disabled={testingHandshake}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
              >
                {testingHandshake ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : (
                  <Activity className="w-3.5 h-3.5" />
                )}
                <span>Test Handshake</span>
              </button>

              <button
                onClick={handleSaveKeys}
                disabled={savingKeys || !apiKeyId || !privateKey}
                className="py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1"
              >
                {savingKeys ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Save Keys</span>
              </button>

              {isConfigured && (
                <button
                  onClick={handleDeleteKeys}
                  title="Remove stored credentials"
                  className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: AUTOMATED EXECUTION CONFIGURATION */}
          <div className="bg-[#120826] border border-cyan-900/60 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs">Auto-Trading Risk Parameters</span>
              </div>

              {/* Master On/Off Switch */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-cyan-300/70">Master Engine:</span>
                <button
                  onClick={() => handleToggleAutoTradeMaster(!config.enabled)}
                  disabled={savingConfig || (!isConfigured && !config.enabled)}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all flex items-center gap-1.5 border shadow ${
                    config.enabled
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30 animate-pulse'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                >
                  {config.enabled ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                  <span>{config.enabled ? 'ARMED & ACTIVE' : 'OFF / DISABLED'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Confidence Threshold Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-cyan-300/70 text-[10px]">Signal Confidence Gate</label>
                  <span className="text-xs font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    ≥ {config.confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={95}
                  step={1}
                  value={config.confidenceThreshold}
                  onChange={(e) => setConfig({ ...config, confidenceThreshold: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-cyan-950 rounded h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-cyan-400/50">
                  <span>60% (High Volume)</span>
                  <span>80% (Recommended)</span>
                  <span>95% (Extreme Conviction)</span>
                </div>
              </div>

              {/* Stake & Exposure Limit Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-cyan-300/70 text-[10px] block mb-1">Max Stake / Trade</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-cyan-400 text-xs">$</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={config.maxStakePerTradeUSD}
                      onChange={(e) => setConfig({ ...config, maxStakePerTradeUSD: Number(e.target.value) })}
                      className="w-full bg-[#0B061A] border border-cyan-900/60 rounded-lg pl-6 pr-2 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-cyan-300/70 text-[10px] block mb-1">Daily Exposure Cap</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-cyan-400 text-xs">$</span>
                    <input
                      type="number"
                      min={10}
                      max={5000}
                      value={config.maxDailyExposureUSD}
                      onChange={(e) => setConfig({ ...config, maxDailyExposureUSD: Number(e.target.value) })}
                      className="w-full bg-[#0B061A] border border-cyan-900/60 rounded-lg pl-6 pr-2 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Asset Inclusion */}
              <div>
                <label className="text-cyan-300/70 text-[10px] block mb-1.5">Supported Crypto Markets</label>
                <div className="flex flex-wrap gap-2">
                  {['BTC', 'ETH', 'SOL', 'XRP'].map((asset) => {
                    const active = (config.supportedMarkets || ['BTC']).includes(asset);
                    return (
                      <button
                        key={asset}
                        type="button"
                        onClick={() => toggleMarketInclusion(asset)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                            : 'bg-[#0B061A] text-cyan-400/40 border-cyan-900/40 hover:text-cyan-300'
                        }`}
                      >
                        {asset}/USD 15M
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save Config Action */}
            <div className="pt-2 border-t border-cyan-900/40 flex items-center justify-between">
              <div className="text-[10px] text-cyan-400/60">
                <span>Failures: {config.consecutiveFailures || 0}/3</span>
              </div>
              <button
                onClick={handleSaveParameters}
                disabled={savingConfig}
                className="py-1.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                {savingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Parameters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Modal / Viewer */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B061A] border-2 border-purple-500/50 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono">
            <div className="p-4 border-b border-purple-900/50 flex items-center justify-between bg-[#120826]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-sm">Kalshi Execution Engine Audit Trail</h3>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-2.5 py-1 rounded-lg bg-purple-900/50 hover:bg-purple-900 text-purple-200 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-purple-300/50">
                  No automated execution attempts or handshake audits recorded yet.
                </div>
              ) : (
                auditLogs.map((log) => {
                  const statusColors: Record<string, string> = {
                    SUCCESS: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                    BLOCKED: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                    FAILED: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                    SKIPPED: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                  };
                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-[#120826] border border-purple-900/40 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                              statusColors[log.status] || 'text-purple-300'
                            }`}
                          >
                            {log.action} • {log.status}
                          </span>
                          <span className="font-bold text-white">
                            {log.asset} {log.direction} ({log.confidence}%)
                          </span>
                          {log.stakeUSD > 0 && <span className="text-cyan-300 font-bold">${log.stakeUSD} USD</span>}
                        </div>
                        <span className="text-[10px] text-purple-400/60">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-200/80 font-sans">{log.details}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
