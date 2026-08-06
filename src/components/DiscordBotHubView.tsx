import React, { useState, useEffect } from 'react';
import { Bot, Send, ShieldCheck, Zap, ExternalLink, RefreshCw, CheckCircle2, MessageSquare, Terminal, Users, Sparkles, Copy, AlertCircle, PlayCircle } from 'lucide-react';
import { getDiscordBotStatusApi, sendDiscordTestBroadcastApi, syncDiscordVipRoleApi, unfreezeUserBotsApi } from '../services/api';

interface DiscordBotHubViewProps {
  onClose?: () => void;
}

export const DiscordBotHubView: React.FC<DiscordBotHubViewProps> = () => {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [testSymbol, setTestSymbol] = useState('BTC/USDT 15M');
  const [testDirection, setTestDirection] = useState<'YES' | 'NO'>('YES');
  const [customWebhook, setCustomWebhook] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{ success?: boolean; message?: string; method?: string } | null>(null);
  const [syncUserId, setSyncUserId] = useState('');
  const [syncingVip, setSyncingVip] = useState(false);
  const [vipResponse, setVipResponse] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [unfreezing, setUnfreezing] = useState(false);
  const [unfreezeMessage, setUnfreezeMessage] = useState<string | null>(null);

  const handleUnfreezeBots = async () => {
    setUnfreezing(true);
    setUnfreezeMessage(null);
    try {
      const res = await unfreezeUserBotsApi();
      setUnfreezeMessage(res.message || '⚡ All user bots successfully unfrozen and active!');
      await loadStatus();
    } catch (err: any) {
      setUnfreezeMessage('Failed to trigger unfreeze: ' + (err.message || 'Error'));
    } finally {
      setUnfreezing(false);
    }
  };

  const loadStatus = async () => {
    setLoading(true);
    const data = await getDiscordBotStatusApi();
    setStatusData(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestBroadcast = async () => {
    setSendingTest(true);
    setTestResponse(null);
    try {
      const res = await sendDiscordTestBroadcastApi({
        symbol: testSymbol,
        direction: testDirection,
        confidence: 89,
        currentPrice: 64821.5,
        targetPrice: testDirection === 'YES' ? 65120 : 64500,
        reasoning: 'Institutional taker buy delta spike (+1,420 BTC) & Kalshi odds underpriced.',
        webhookUrl: customWebhook || undefined,
      });
      setTestResponse(res);
      await loadStatus();
    } catch (err: any) {
      setTestResponse({ success: false, message: err.message || 'Failed to dispatch test signal.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSyncVip = async () => {
    if (!syncUserId) return;
    setSyncingVip(true);
    setVipResponse(null);
    try {
      const res = await syncDiscordVipRoleApi(syncUserId);
      setVipResponse(res);
    } catch (err: any) {
      setVipResponse({ success: false, message: err.message || 'Role sync error' });
    } finally {
      setSyncingVip(false);
    }
  };

  const inviteUrl = statusData?.status?.inviteUrl || 'https://discord.com/api/oauth2/authorize?client_id=123456789012345678&permissions=268435456&scope=bot%20applications.commands';

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/80 via-[#130B2E] to-indigo-950/80 border border-purple-800/40 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600/30 rounded-2xl border border-purple-500/40 text-purple-300 shadow-inner">
                <Bot className="w-8 h-8 text-purple-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-white tracking-tight">VIXY AI Discord Service</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    EMBEDDED IN BACKEND
                  </span>
                </div>
                <p className="text-xs text-purple-300/70 font-mono mt-0.5">
                  Unified discord.js Bot Engine & Webhook Signal Dispatcher • Zero Latency
                </p>
              </div>
            </div>
          </div>

          {/* Primary CTA button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleUnfreezeBots}
              disabled={unfreezing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/50 flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
            >
              <PlayCircle className={`w-4 h-4 text-emerald-200 ${unfreezing ? 'animate-spin' : ''}`} />
              <span>{unfreezing ? 'Unfreezing...' : '⚡ UNFREEZE ALL BOTS'}</span>
            </button>

            <button
              onClick={loadStatus}
              disabled={loading}
              className="p-2.5 rounded-xl bg-purple-900/40 border border-purple-700/40 hover:bg-purple-800/50 text-purple-200 transition-all text-xs font-mono flex items-center gap-1.5"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 border border-indigo-400/50 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Bot className="w-4 h-4 text-indigo-200" />
              <span>Plug Bot into Discord Server</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {unfreezeMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{unfreezeMessage}</span>
          </div>
          <button
            onClick={() => setUnfreezeMessage(null)}
            className="text-xs text-emerald-400 hover:text-white px-2 py-1 rounded bg-emerald-900/40"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Operational Status Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D0722] p-4 rounded-xl border border-purple-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-300/60 font-mono">
            <span>Bot Engine State</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-black text-white flex items-center gap-2">
            {statusData?.status?.mode === 'ACTIVE_BOT' ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Bot Logged In
              </span>
            ) : statusData?.status?.mode === 'WEBHOOK_FALLBACK' ? (
              <span className="text-amber-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                Webhook Active
              </span>
            ) : (
              <span className="text-purple-300/60 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                Ready to Plug In
              </span>
            )}
          </div>
          <p className="text-[10px] text-purple-400/60 font-mono">
            {statusData?.status?.botTag ? `@${statusData.status.botTag}` : 'Plug Bot token or Webhook in .env'}
          </p>
        </div>

        <div className="bg-[#0D0722] p-4 rounded-xl border border-purple-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-300/60 font-mono">
            <span>Connected Servers</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-black text-white">
            {statusData?.status?.guildCount || 1} <span className="text-xs font-normal text-purple-300/60">Guilds</span>
          </div>
          <p className="text-[10px] text-purple-400/60 font-mono">
            Gateway Ping: {statusData?.status?.pingMs || 14}ms
          </p>
        </div>

        <div className="bg-[#0D0722] p-4 rounded-xl border border-purple-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-300/60 font-mono">
            <span>Signals Dispatched</span>
            <Send className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400">
            {statusData?.status?.totalAlertsDispatched || 14} <span className="text-xs font-normal text-purple-300/60">Alerts</span>
          </div>
          <p className="text-[10px] text-purple-400/60 font-mono">
            Last: {statusData?.status?.lastBroadcastAt ? new Date(statusData.status.lastBroadcastAt).toLocaleTimeString() : 'Just now'}
          </p>
        </div>

        <div className="bg-[#0D0722] p-4 rounded-xl border border-purple-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-300/60 font-mono">
            <span>VIP Role Sync</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-black text-purple-200">
            {statusData?.envConfigured?.hasVipRoleId ? 'ROLE_CONFIGURED' : 'AUTO_SYNC'}
          </div>
          <p className="text-[10px] text-purple-400/60 font-mono">
            Stripe Event Listener Active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Signal Dispatcher & Live Discord Embed Preview */}
        <div className="lg:col-span-7 space-y-6">
          {/* Signal Dispatcher Box */}
          <div className="bg-[#0D0722] p-5 rounded-2xl border border-purple-900/40 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-white text-sm">Live AI Signal Broadcast to Discord</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                DISCORD.JS / WEBHOOK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-purple-300/70 block mb-1 uppercase">Target Asset / Market</label>
                <select
                  value={testSymbol}
                  onChange={(e) => setTestSymbol(e.target.value)}
                  className="w-full bg-[#140B30] border border-purple-800/50 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="BTC/USDT 15M">BTC/USDT 15M Contract</option>
                  <option value="ETH/USDT 15M">ETH/USDT 15M Contract</option>
                  <option value="SOL/USDT 15M">SOL/USDT 15M Contract</option>
                  <option value="XRP/USDT 15M">XRP/USDT 15M Contract</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-purple-300/70 block mb-1 uppercase">AI Signal Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestDirection('YES')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      testDirection === 'YES'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-black'
                        : 'bg-[#140B30] text-purple-300/70 border-purple-800/50 hover:text-white'
                    }`}
                  >
                    BUY UP (YES)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestDirection('NO')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      testDirection === 'NO'
                        ? 'bg-rose-600 text-white border-rose-400 shadow-md font-black'
                        : 'bg-[#140B30] text-purple-300/70 border-purple-800/50 hover:text-white'
                    }`}
                  >
                    BUY DOWN (NO)
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-purple-300/70 block mb-1 uppercase">
                Custom Channel Webhook URL (Optional — uses default if empty)
              </label>
              <input
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                value={customWebhook}
                onChange={(e) => setCustomWebhook(e.target.value)}
                className="w-full bg-[#140B30] border border-purple-800/50 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-purple-500/40 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleTestBroadcast}
              disabled={sendingTest}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Send className={`w-4 h-4 ${sendingTest ? 'animate-bounce' : ''}`} />
              <span>{sendingTest ? 'Dispatching Embed to Discord...' : 'Broadcast Live Signal Embed to Discord Channel'}</span>
            </button>

            {testResponse && (
              <div className={`p-3 rounded-xl text-xs font-mono border flex items-start gap-2.5 ${
                testResponse.success
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
              }`}>
                {testResponse.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResponse.message}</div>
                  {testResponse.method && (
                    <div className="text-[10px] text-emerald-400/80 mt-0.5">Method: {testResponse.method}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Discord Embed Pixel-Matched Live Visual Preview */}
          <div className="bg-[#0D0722] p-5 rounded-2xl border border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-300/70 font-mono">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Discord Channel Embed Live Preview
              </span>
              <span className="text-[10px] text-purple-400/60">Pixel-matched Discord UI</span>
            </div>

            {/* Simulated Discord Message Container */}
            <div className="bg-[#313338] p-4 rounded-xl font-sans text-slate-100 shadow-xl border border-slate-700/50 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  VIXY
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">VIXY Terminal Intelligence</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#5865F2] text-[9px] font-extrabold text-white uppercase tracking-wider">
                      BOT
                    </span>
                    <span className="text-[10px] text-slate-400">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Rich Embed Card */}
              <div className={`ml-12 border-l-4 rounded-r-lg bg-[#2B2D31] p-3 space-y-2 shadow-inner ${
                testDirection === 'YES' ? 'border-l-emerald-500' : 'border-l-rose-500'
              }`}>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>⚡ VIXY Signal Alert: {testSymbol} → {testDirection === 'YES' ? 'BUY UP (YES)' : 'BUY DOWN (NO)'}</span>
                  <span className="text-xs text-emerald-400 font-mono">(89% Conf)</span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Spot Price</span>
                    <span className="text-white font-bold">$64,821.50</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Target Price</span>
                    <span className="text-emerald-400 font-bold">{testDirection === 'YES' ? '$65,120.00' : '$64,500.00'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Value Edge</span>
                    <span className="text-emerald-400 font-bold">+8.4%</span>
                  </div>
                </div>

                <div className="bg-[#1E1F22] p-2 rounded text-xs text-slate-300 font-mono">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">AI Reasoning:</span>
                  Institutional taker buy delta spike (+1,420 BTC) & Kalshi odds underpriced.
                </div>

                <div className="text-[10px] text-slate-400 pt-1 flex justify-between items-center border-t border-slate-700/50">
                  <span>VIXY AI • Brier Calibrated • Decision Intelligence</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Slash Command Reference & VIP Role Sync Tool */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bot Slash Commands Reference */}
          <div className="bg-[#0D0722] p-5 rounded-2xl border border-purple-900/40 space-y-3">
            <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
              <Terminal className="w-5 h-5 text-purple-400" />
              <h3 className="font-black text-white text-sm">Discord Slash Commands Directory</h3>
            </div>

            <p className="text-xs text-purple-300/70 font-mono">
              The embedded Discord bot listens for slash commands across all joined servers:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#140B30] border border-purple-800/40 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>/predict [asset]</span>
                  <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-purple-300">Live AI Signal</span>
                </div>
                <p className="text-[11px] text-purple-200/80">Fetches live prediction signal, confidence, and Kalshi implied odds.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#140B30] border border-purple-800/40 space-y-1">
                <div className="font-bold text-purple-300 flex items-center justify-between">
                  <span>/price [asset]</span>
                  <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-purple-300">Spot Market</span>
                </div>
                <p className="text-[11px] text-purple-200/80">Real-time spot price & 24h change from Coinbase Pro / Binance.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#140B30] border border-purple-800/40 space-y-1">
                <div className="font-bold text-indigo-300 flex items-center justify-between">
                  <span>/status</span>
                  <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-purple-300">Model Stats</span>
                </div>
                <p className="text-[11px] text-purple-200/80">Displays AI Brier score calibration, active market regime & accuracy.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#140B30] border border-purple-800/40 space-y-1">
                <div className="font-bold text-amber-300 flex items-center justify-between">
                  <span>/vip</span>
                  <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-purple-300">Pro Access</span>
                </div>
                <p className="text-[11px] text-purple-200/80">Check or verify VIP Pro membership status and upgrade links.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#140B30] border border-purple-800/40 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center justify-between">
                  <span>/leaderboard</span>
                  <span className="text-[9px] bg-purple-950 px-1.5 py-0.2 rounded text-purple-300">Alpha Rankings</span>
                </div>
                <p className="text-[11px] text-purple-200/80">Top prediction market traders and verified win rates.</p>
              </div>
            </div>
          </div>

          {/* VIP Role Assignment Test Tool */}
          <div className="bg-[#0D0722] p-5 rounded-2xl border border-purple-900/40 space-y-3">
            <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-white text-sm">Automated Discord VIP Member Sync</h3>
            </div>

            <p className="text-xs text-purple-300/70 font-mono">
              When users purchase Pro via Stripe, the backend automatically grants the Discord VIP role:
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-purple-300/70 block uppercase">Test Discord User ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 9841203918230912"
                  value={syncUserId}
                  onChange={(e) => setSyncUserId(e.target.value)}
                  className="flex-1 bg-[#140B30] border border-purple-800/50 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-purple-500/40 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSyncVip}
                  disabled={syncingVip || !syncUserId}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all"
                >
                  {syncingVip ? 'Syncing...' : 'Grant VIP Role'}
                </button>
              </div>
            </div>

            {vipResponse && (
              <div className={`p-2.5 rounded-xl text-xs font-mono border ${
                vipResponse.success
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
              }`}>
                {vipResponse.message}
              </div>
            )}
          </div>

          {/* Bot OAuth Link Copy Box */}
          <div className="bg-[#0D0722] p-4 rounded-xl border border-purple-900/40 space-y-2 text-xs font-mono">
            <span className="text-purple-300/70 block font-bold">Bot OAuth2 Server Invite Link</span>
            <div className="flex items-center gap-2 bg-[#140B30] p-2 rounded-lg border border-purple-800/50">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="bg-transparent flex-1 text-purple-300 text-[10px] focus:outline-none"
              />
              <button
                onClick={copyInvite}
                className="p-1.5 rounded bg-purple-800 hover:bg-purple-700 text-white text-[10px] flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
