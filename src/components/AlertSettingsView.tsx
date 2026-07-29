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
} from 'lucide-react';
import { AlertSettings } from '../types';
import { sendTestAlert } from '../services/api';

interface AlertSettingsViewProps {
  settings: AlertSettings;
  setSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
}

export const AlertSettingsView: React.FC<AlertSettingsViewProps> = ({ settings, setSettings }) => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const handleTestDiscord = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendTestAlert('discord', settings.discordWebhook, '', '', {
        direction: 'YES',
        confidence: 91,
        edgePct: 7.4,
        targetPrice: 64228,
        currentPrice: 64108,
        reasoning: 'Taker buy delta spike +1,420 BTC on 15m candle close',
      });
      setTestResult({
        success: true,
        message: res.message || 'Discord test alert dispatched successfully!',
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

  const handleTestTelegram = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendTestAlert('telegram', '', settings.telegramBotToken, settings.telegramChatId, {
        direction: 'YES',
        confidence: 91,
        edgePct: 7.4,
        targetPrice: 64228,
        currentPrice: 64108,
      });
      setTestResult({
        success: true,
        message: res.message || 'Telegram test alert dispatched successfully!',
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
      <div className="bg-[#120B28] rounded-2xl border border-purple-500/30 p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                SUB-SECOND DISPATCH
              </span>
              <span className="text-purple-300/60 text-xs">Webhooks & Bot Routing</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">
              Automated Alert Webhooks & Filter Rules
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
        {/* Discord & Telegram Configuration */}
        <div className="bg-[#120B28] rounded-2xl border border-purple-500/30 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
            <Send className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Discord Webhook Integration</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs text-purple-200 font-bold">Enable Discord Alerts</label>
              <input
                type="checkbox"
                checked={settings.discordEnabled}
                onChange={(e) => setSettings({ ...settings, discordEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-purple-900 bg-[#0B061A] text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-purple-300/60 block">Discord Webhook URL</label>
              <input
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                value={settings.discordWebhook}
                onChange={(e) => setSettings({ ...settings, discordWebhook: e.target.value })}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleTestDiscord}
              disabled={isSendingTest || !settings.discordWebhook}
              className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              Send Test Discord Alert
            </button>
          </div>

          <div className="border-t border-purple-900/40 pt-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
              <Bot className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Telegram Bot Integration</h3>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-purple-200 font-bold">Enable Telegram Bot</label>
              <input
                type="checkbox"
                checked={settings.telegramEnabled}
                onChange={(e) => setSettings({ ...settings, telegramEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-purple-900 bg-[#0B061A] text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-purple-300/60 block">Telegram Bot Token</label>
              <input
                type="text"
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                value={settings.telegramBotToken}
                onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-purple-300/60 block">Telegram Chat ID</label>
              <input
                type="text"
                placeholder="-100123456789"
                value={settings.telegramChatId}
                onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 placeholder-purple-300/30 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleTestTelegram}
              disabled={isSendingTest || !settings.telegramBotToken || !settings.telegramChatId}
              className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              Send Test Telegram Alert
            </button>
          </div>
        </div>

        {/* Quant Filter Rules */}
        <div className="bg-[#120B28] rounded-2xl border border-purple-500/30 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Signal Filtering Parameters</h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-purple-200">Min Model Confidence: <strong className="text-purple-300">{settings.minConfidence}%</strong></span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.minConfidence}
                onChange={(e) => setSettings({ ...settings, minConfidence: Number(e.target.value) })}
                className="w-full accent-purple-500 bg-[#0B061A] rounded-lg h-2 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-purple-200">Min Market Edge: <strong className="text-purple-300">+{settings.minEdgePct}%</strong></span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={settings.minEdgePct}
                onChange={(e) => setSettings({ ...settings, minEdgePct: Number(e.target.value) })}
                className="w-full accent-purple-500 bg-[#0B061A] rounded-lg h-2 cursor-pointer"
              />
            </div>

            <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-3">
              <span className="text-xs font-bold text-white block">Active Notification Triggers</span>

              <label className="flex items-center gap-2 text-xs text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyNewSignal}
                  onChange={(e) => setSettings({ ...settings, notifyNewSignal: e.target.checked })}
                  className="rounded border-purple-900 bg-[#120B28] text-purple-600 focus:ring-purple-500"
                />
                <span>Alert on new 15m candle opened</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyOutcome}
                  onChange={(e) => setSettings({ ...settings, notifyOutcome: e.target.checked })}
                  className="rounded border-purple-900 bg-[#120B28] text-purple-600 focus:ring-purple-500"
                />
                <span>Alert on candle resolution outcome</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-purple-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.onlyHighGrade}
                  onChange={(e) => setSettings({ ...settings, onlyHighGrade: e.target.checked })}
                  className="rounded border-purple-900 bg-[#120B28] text-purple-600 focus:ring-purple-500"
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
