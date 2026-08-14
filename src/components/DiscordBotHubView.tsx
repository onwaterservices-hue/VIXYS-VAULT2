import React, { useState, useEffect } from 'react';
import { Bot, Send, ShieldCheck, Zap, ExternalLink, RefreshCw, CheckCircle2, MessageSquare, Terminal, Users, Sparkles, Copy, AlertCircle, PlayCircle, Lock, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { getDiscordBotStatusApi, sendDiscordTestBroadcastApi, syncDiscordVipRoleApi, unfreezeUserBotsApi, fetchAdminEventsApi, fetchDiscordHealthApi, resyncEntitlementApi } from '../services/api';

interface DiscordBotHubViewProps {
  onClose?: () => void;
  adminEvents?: any[];
  currentUserId?: string;
}

export const DiscordBotHubView: React.FC<DiscordBotHubViewProps> = ({ adminEvents: externalEvents }) => {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [localEvents, setLocalEvents] = useState<any[]>(externalEvents || []);
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

  // Resync State
  const [resyncIdentifier, setResyncIdentifier] = useState('vixyvault0@gmail.com');
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<any | null>(null);

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
    try {
      const [data, hData, evs, diagRes] = await Promise.all([
        getDiscordBotStatusApi(),
        fetchDiscordHealthApi().catch(() => null),
        fetchAdminEventsApi().catch(() => null),
        fetch('/api/discord/diagnostics').then(r => r.json()).catch(() => null)
      ]);
      setStatusData(data);
      if (hData) setHealthData(hData);
      if (evs && Array.isArray(evs)) setLocalEvents(evs);
      
      if (diagRes && diagRes.success) {
        setDiagnostics(diagRes);
        if (Array.isArray(diagRes.queue)) {
          setSyncQueue(diagRes.queue);
        }
      } else if (data?.diagnostics) {
        setDiagnostics(data.diagnostics);
      }
    } catch (err) {
      console.warn('[DiscordBotHub] Failed to load full diagnostics status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (externalEvents && externalEvents.length > 0) {
      setLocalEvents(externalEvents);
    }
  }, [externalEvents]);

  const handleEmergencyResync = async () => {
    if (!resyncIdentifier.trim()) return;
    setIsResyncing(true);
    setResyncResult(null);
    try {
      const res = await resyncEntitlementApi(resyncIdentifier.trim());
      setResyncResult(res);
      await loadStatus();
    } catch (err: any) {
      setResyncResult({ success: false, message: err.message || 'Server connection error' });
    } finally {
      setIsResyncing(false);
    }
  };

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

  const inviteUrl = statusData?.status?.inviteUrl || 'https://discord.com/api/oauth2/authorize?client_id=1534690638937981028&permissions=2416004096&scope=bot%20applications.commands';

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

      {/* INSTITUTIONAL COMMAND CENTER DIAGNOSTICS */}
      <div className="bg-[#0B061F] border border-purple-900/60 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-900/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                VIXY VAULT // INSTANT ROLE & IDENTITY SYNCHRONIZATION TELEMETRY
              </h2>
            </div>
            <p className="text-[11px] text-purple-300/60 font-mono mt-1">
              Active tracking of asynchronous, decoupled Stripe-to-Discord entitlement queue & bot hierarchy integrity.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              QUEUE WORKER ACTIVE • 15S INGEST
            </span>
          </div>
        </div>

        {/* 9 core fields grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* BOT_CONNECTED */}
          <div className="bg-[#10092B] p-4 rounded-xl border border-purple-900/40 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-purple-300/50 font-mono uppercase tracking-wider">
              <span>Bot Connected</span>
              <Activity className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${diagnostics?.BOT_CONNECTED ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-pulse'}`} />
              <span className={`text-base font-black tracking-tight ${diagnostics?.BOT_CONNECTED ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diagnostics?.BOT_CONNECTED ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-[10px] text-purple-400/60 font-mono">
              Tag: {statusData?.status?.botTag || 'VIXY AI#0000'}
            </p>
          </div>

          {/* GUILD_FOUND */}
          <div className="bg-[#10092B] p-4 rounded-xl border border-purple-900/40 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-purple-300/50 font-mono uppercase tracking-wider">
              <span>Guild Found</span>
              <Users className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${diagnostics?.GUILD_FOUND ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`} />
              <span className={`text-base font-black tracking-tight ${diagnostics?.GUILD_FOUND ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diagnostics?.GUILD_FOUND ? 'ACCESSIBLE' : 'NOT_FOUND'}
              </span>
            </div>
            <p className="text-[10px] text-purple-400/60 font-mono truncate">
              ID: {process.env.DISCORD_GUILD_ID || '1451337712937336985'}
            </p>
          </div>

          {/* ROLE_FOUND */}
          <div className="bg-[#10092B] p-4 rounded-xl border border-purple-900/40 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-purple-300/50 font-mono uppercase tracking-wider">
              <span>Elite Role Found</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${diagnostics?.ROLE_FOUND ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`} />
              <span className={`text-base font-black tracking-tight ${diagnostics?.ROLE_FOUND ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diagnostics?.ROLE_FOUND ? 'VERIFIED' : 'MISSING_ROLE'}
              </span>
            </div>
            <p className="text-[10px] text-purple-400/60 font-mono truncate">
              ID: {process.env.DISCORD_ELITE_ROLE_ID || '1535025983093215425'}
            </p>
          </div>

          {/* ROLE_MANAGEABLE */}
          <div className="bg-[#10092B] p-4 rounded-xl border border-purple-900/40 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-purple-300/50 font-mono uppercase tracking-wider">
              <span>Hierarchy & Permissions</span>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${diagnostics?.ROLE_MANAGEABLE ? 'bg-emerald-400' : 'bg-amber-500 animate-pulse'}`} />
              <span className={`text-base font-black tracking-tight ${diagnostics?.ROLE_MANAGEABLE ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diagnostics?.ROLE_MANAGEABLE ? 'VALID_HIERARCHY' : 'INSUFFICIENT'}
              </span>
            </div>
            <p className="text-[10px] text-purple-400/60 font-mono">
              Requires Bot above Elite role
            </p>
          </div>
        </div>

        {/* Telemetry Queue Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          {/* Left Column (Stats counts) */}
          <div className="md:col-span-5 grid grid-cols-3 gap-3">
            <div className="bg-[#0A051C] p-3 rounded-xl border border-purple-900/30 text-center space-y-1">
              <span className="text-[10px] text-purple-400/60 font-mono block uppercase">Pending Jobs</span>
              <span className={`text-2xl font-black block ${diagnostics?.PENDING_COUNT > 0 ? 'text-amber-400' : 'text-white/60'}`}>
                {diagnostics?.PENDING_COUNT ?? 0}
              </span>
            </div>
            <div className="bg-[#0A051C] p-3 rounded-xl border border-purple-900/30 text-center space-y-1">
              <span className="text-[10px] text-purple-400/60 font-mono block uppercase">Synced Success</span>
              <span className="text-2xl font-black text-emerald-400 block">
                {diagnostics?.SUCCESS_COUNT ?? 0}
              </span>
            </div>
            <div className="bg-[#0A051C] p-3 rounded-xl border border-purple-900/30 text-center space-y-1">
              <span className="text-[10px] text-purple-400/60 font-mono block uppercase">Failed Jobs</span>
              <span className={`text-2xl font-black block ${diagnostics?.FAILED_COUNT > 0 ? 'text-rose-400 animate-pulse' : 'text-white/60'}`}>
                {diagnostics?.FAILED_COUNT ?? 0}
              </span>
            </div>
          </div>

          {/* Right Column (Sync Timestamp and Errors) */}
          <div className="md:col-span-7 flex flex-col justify-between p-3.5 bg-[#08031A] rounded-xl border border-purple-900/40">
            <div className="flex items-center justify-between text-[11px] font-mono text-purple-300/70 border-b border-purple-950 pb-2 mb-2">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                Last Checked Timestamp (LAST_SYNC):
              </span>
              <span className="text-white font-bold">
                {diagnostics?.LAST_SYNC ? new Date(diagnostics.LAST_SYNC).toLocaleTimeString() : 'N/A'}
              </span>
            </div>

            {diagnostics?.LAST_ERROR ? (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[11px] font-mono text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="truncate">
                  <span className="font-bold block uppercase text-[9px] text-rose-400">Last Encountered Sync Error:</span>
                  <span className="font-bold">{diagnostics.LAST_ERROR}</span>
                </div>
              </div>
            ) : (
              <div className="p-2 px-3 rounded-lg bg-emerald-950/35 border border-emerald-900/30 text-[11px] font-mono text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All asynchronous queue workers are running idle with zero active system exceptions.</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time background sync queue active display */}
        {syncQueue.length > 0 && (
          <div className="bg-[#09041A] rounded-xl p-4 border border-purple-900/30 space-y-2">
            <span className="text-[10px] text-purple-400/70 font-mono font-bold uppercase block tracking-wider">
              Asynchronous Sync Queue Diagnostics:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
              {syncQueue.map((item: any) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-[#110A2B] border border-purple-900/40 flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5 truncate max-w-[70%]">
                    <span className="text-white font-bold block truncate">{item.email}</span>
                    <span className="text-[10px] text-purple-400">Tier: {item.tier} • Attempts: {item.attempts}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                    item.status === 'FAILED' ? 'bg-rose-950 text-rose-400 border border-rose-800/40' :
                    'bg-amber-950 text-amber-400 border border-amber-800/40 animate-pulse'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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

              {/* Rich Embed Card - Free Channel vs Elite Unlocked */}
              <div className={`ml-12 border-l-4 rounded-r-lg bg-[#2B2D31] p-3 space-y-2.5 shadow-inner ${
                testDirection === 'YES' ? 'border-l-emerald-500' : 'border-l-rose-500'
              }`}>
                <div className="font-bold text-sm text-white flex items-center justify-between">
                  <span>📊 VIXY AI Market Pulse: {testSymbol}</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold">🟢 Overall Bias: {testDirection === 'YES' ? 'BULLISH' : 'BEARISH'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 text-xs font-mono bg-[#1E1F22] p-2 rounded">
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Spot Price</span>
                    <span className="text-white font-bold">$64,821.50</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Confidence</span>
                    <span className="text-amber-400 font-bold">89.4%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block uppercase">Resistance</span>
                    <span className="text-cyan-400 font-bold">$65,120.00</span>
                  </div>
                </div>

                <div className="bg-[#1E1F22] p-2.5 rounded text-xs text-slate-300 font-mono">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Market Rationale:</span>
                  Institutional taker buy delta spike (+1,420 BTC) & Kalshi odds underpriced. Institutional buyers accumulating beneath support.
                </div>

                {/* FUNNEL INFORMATION GAP - LOCKED SETUP */}
                <div className="bg-[#18191c] border border-amber-500/40 p-2.5 rounded text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-amber-300">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Detailed Trade Setup
                    </span>
                    <span className="text-[9px] bg-purple-900/60 px-1.5 py-0.5 rounded text-purple-300">VIXY ELITE AI</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between bg-[#2B2D31] px-2 py-1 rounded">
                      <span>Full Entry:</span>
                      <span className="text-amber-400 font-bold">🔒 Locked</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#2B2D31] px-2 py-1 rounded">
                      <span>Stop Loss:</span>
                      <span className="text-amber-400 font-bold">🔒 Locked</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#2B2D31] px-2 py-1 rounded">
                      <span>Profit Targets:</span>
                      <span className="text-amber-400 font-bold">🔒 Locked</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#2B2D31] px-2 py-1 rounded">
                      <span>Risk Score:</span>
                      <span className="text-amber-400 font-bold">🔒 Locked</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-300/90 pt-0.5 font-sans font-semibold text-center">
                    ⭐ Upgrade to <strong>VIXY ELITE AI</strong> to unlock the complete trade setup!
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 flex justify-between items-center border-t border-slate-700/50">
                  <span>VIXY AI • Sales Funnel & Decision Engine</span>
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

          {/* VIP Role Assignment & Emergency Resync Panel */}
          <div className="bg-[#0D0722] p-5 rounded-2xl border border-purple-900/40 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-sm">Emergency Entitlement & Discord Role Resync</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                AUTHORITATIVE REPAIR
              </span>
            </div>

            <p className="text-xs text-purple-300/70 font-mono">
              Re-query Stripe payment records and enforce Discord server role grants using immutable Discord User IDs or Email:
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-purple-300/70 block uppercase">Discord User ID or Customer Email</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 10428491029301920 or user@example.com"
                  value={resyncIdentifier}
                  onChange={(e) => setResyncIdentifier(e.target.value)}
                  className="flex-1 bg-[#140B30] border border-purple-800/50 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-purple-500/40 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleEmergencyResync}
                  disabled={isResyncing || !resyncIdentifier}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResyncing ? 'animate-spin' : ''}`} />
                  <span>{isResyncing ? 'Syncing...' : 'RESYNC ROLE'}</span>
                </button>
              </div>
            </div>

            {resyncResult && (
              <div className={`p-3 rounded-xl text-xs font-mono border ${
                resyncResult.success
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                  : 'bg-amber-950/50 text-amber-300 border-amber-800/50'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {resyncResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                  <span>{resyncResult.success ? 'Entitlement Resynced Successfully' : 'Resync Notice'}</span>
                </div>
                <p>{resyncResult.message}</p>
                {resyncResult.targetTier && (
                  <p className="text-[10px] text-purple-300/70 mt-1">Tier: {resyncResult.targetTier} • User: {resyncResult.discordUserId}</p>
                )}
              </div>
            )}
          </div>

          {/* LIVE SYSTEM EVENT STREAM FEED */}
          <div className="bg-[#0D0722] p-5 rounded-2xl border border-purple-900/40 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-white text-sm">Live System Event Stream</h3>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                SSE ACTIVE
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs font-mono custom-scrollbar">
              {localEvents.length === 0 ? (
                <div className="p-4 text-center text-purple-400/50 text-xs">Waiting for live Stripe or Discord events...</div>
              ) : (
                localEvents.slice(0, 15).map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-xl bg-[#140B30] border border-purple-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] ${
                        evt.status === 'SUCCESS' ? 'text-emerald-400' :
                        evt.status === 'FAILED' ? 'text-rose-400' :
                        evt.status === 'WARN' ? 'text-amber-400' : 'text-purple-300'
                      }`}>
                        {evt.eventType}
                      </span>
                      <span className="text-[9px] text-purple-400/60">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-200/90">{evt.message}</p>
                    {evt.userEmail && (
                      <span className="text-[9px] text-purple-400/60 block">User: {evt.userEmail}</span>
                    )}
                  </div>
                ))
              )}
            </div>
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
