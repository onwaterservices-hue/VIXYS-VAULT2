import VixyMascot from "./VixyMascot";
import React, { useState } from 'react';
import {
  Bell,
  Send,
  MessageSquare,
  Bot,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Link2,
  Music,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { AlertSettings } from '../types';
import { sendTestAlert, getDiscordAuthUrlSecure } from '../services/api';
import { playAlertSound } from '../utils/audio';
import { CommunityAccessNode } from './CommunityAccessNode';

interface AlertSettingsViewProps {
  settings: AlertSettings;
  setSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
}

export const AlertSettingsView: React.FC<AlertSettingsViewProps> = ({ settings, setSettings }) => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [isLinkingDiscord, setIsLinkingDiscord] = useState<boolean>(false);

  const handleTestDiscord = async () => {
    setIsSendingTest(true);
    setTestResult(null);

    // Play Discord Ping sound chime if sound enabled
    if (settings.discordSoundEnabled) {
      playAlertSound(settings.discordNotificationSound || 'discord_ping');
    }

    try {
      // Success is whatever the server says. This used to report "dispatched
      // successfully" for any response -- including the 404 from
      // /api/alerts/send, which has no server route -- and the payload was a
      // staged signal ($64,108 spot, "+1,420 BTC" taker delta).
      const res: any = await sendTestAlert('discord', settings.discordWebhook, '', '', {
        direction: 'YES',
        confidence: null,
        edgePct: null,
        targetPrice: null,
        currentPrice: null,
        reasoning: 'TEST ALERT - not a signal',
      });
      setTestResult({
        success: res?.success === true,
        message:
          res?.success === true
            ? res.message || 'Discord test alert sent.'
            : res?.message || 'Test alert was not sent: the alert delivery endpoint is unavailable.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Failed to send Discord test webhook. Verify URL.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleLinkDiscordAccount = async () => {
    setIsLinkingDiscord(true);
    setTestResult(null);
    try {
      const authData = await getDiscordAuthUrlSecure();
      if (authData && authData.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          authData.url,
          'discord_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
        );
      }
      setTestResult({
        success: true,
        message: 'Opening official Discord OAuth authorization window...',
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Failed to initialize Discord OAuth',
      });
    } finally {
      setIsLinkingDiscord(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res: any = await sendTestAlert('telegram', '', settings.telegramBotToken, settings.telegramChatId, {
        direction: 'YES',
        confidence: null,
        edgePct: null,
        targetPrice: null,
        currentPrice: null,
        reasoning: 'TEST ALERT - not a signal',
      });
      setTestResult({
        success: res?.success === true,
        message:
          res?.success === true
            ? res.message || 'Telegram test alert sent.'
            : res?.message || 'Test alert was not sent: the alert delivery endpoint is unavailable.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Failed to send Telegram alert.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-purple-100">
      {/* Title Header */}
      <div className="vixy-card hud-corners p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                SUB-SECOND DISPATCH
              </span>
              <span className="text-purple-300/60 text-xs">Discord Webhooks, Audio Chimes & Bot Routing</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">
              Discord Alert Hub & Account Sync
            </h2>
          </div>
        </div>
      </div>

      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
            testResult.success
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {testResult.success ? <CheckCircle2 className="w-5 h-5 text-purple-400" /> : <AlertCircle className="w-5 h-5" />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Grid: Webhooks & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discord Primary Configuration */}
        <div className="vixy-card hud-corners p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Discord Bot & Webhook Service</h3>
            </div>
            {/* The Discord link badge that used to sit here read
                settings.discordLinked -- a localStorage-persisted cache -- while
                CommunityAccessNode directly below renders the same status from
                the backend. The two disagreed inside a single card: a green
                "DISCORD LINKED" chip sitting immediately above a "CONNECT
                DISCORD" call to action, which is what made the panel look
                broken. The authoritative status is shown by the gateway panel
                below, so this duplicate is removed rather than given a second
                source of truth to drift from. */}
          </div>

          {/* VIXY mascot hero */}
          <div className="flex flex-col items-center gap-5 py-4 text-center sm:flex-row sm:items-center sm:text-left">
            <VixyMascot size={140} />
            <div>
              <span className="vx-label">VIXY is in the server</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Locks, calls and settlements. Live in Discord.</h2>
              <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/55">Link your account once and VIXY posts every 15-minute call, lock and graded outcome to the Vault server as it happens. Your role syncs with your membership.</p>
            </div>
          </div>
          {/* Community Access Node (Discord Gateway) */}
          <CommunityAccessNode settings={settings} setSettings={setSettings} mode="settings" />

        </div>

        {/* Quant Filter Rules */}
        <div className="vixy-card hud-corners p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Signal Filtering Parameters</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-purple-200">
                  Min Model Confidence: <strong className="text-purple-300">{settings.minConfidence}%</strong>
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.minConfidence}
                onChange={(e) => setSettings({ ...settings, minConfidence: Number(e.target.value) })}
                className="w-full accent-purple-500 bg-[#0a0518] rounded-xl h-2 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-purple-200">
                  Min Market Edge: <strong className="text-purple-300">+{settings.minEdgePct || settings.minEdge}%</strong>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={settings.minEdgePct || settings.minEdge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minEdgePct: Number(e.target.value),
                    minEdge: Number(e.target.value),
                  })
                }
                className="w-full accent-purple-500 bg-[#0a0518] rounded-xl h-2 cursor-pointer"
              />
            </div>

            <div className="bg-[#0a0518] p-4 rounded-xl border border-purple-900/40 space-y-3">
              <span className="text-xs font-bold text-white block">Active Notification Triggers</span>

              <label className="flex items-center gap-2 text-xs text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyNewSignal ?? true}
                  onChange={(e) => setSettings({ ...settings, notifyNewSignal: e.target.checked })}
                  className="rounded border-purple-900 bg-[#0c0620] text-purple-600 focus:ring-purple-500"
                />
                <span>Alert on new 15m candle opened</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyOutcome ?? true}
                  onChange={(e) => setSettings({ ...settings, notifyOutcome: e.target.checked })}
                  className="rounded border-purple-900 bg-[#0c0620] text-purple-600 focus:ring-purple-500"
                />
                <span>Alert on candle resolution outcome</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.onlyHighGrade ?? true}
                  onChange={(e) => setSettings({ ...settings, onlyHighGrade: e.target.checked })}
                  className="rounded border-purple-900 bg-[#0c0620] text-purple-600 focus:ring-purple-500"
                />
                <span>Restrict to Grade A/A+ Signals Only</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
