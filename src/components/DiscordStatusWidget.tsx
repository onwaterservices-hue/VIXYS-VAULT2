import React, { useState } from 'react';
import { MessageSquare, Check, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { getDiscordAuthUrlApi } from '../services/api';

interface DiscordStatusWidgetProps {
  discordLinked: boolean;
  discordUsername?: string;
  onLinkDiscord: (username?: string) => Promise<void> | void;
  onUnlinkDiscord?: () => void;
  className?: string;
}

export const DiscordStatusWidget: React.FC<DiscordStatusWidgetProps> = ({
  discordLinked,
  discordUsername,
  onLinkDiscord,
  onUnlinkDiscord,
  className = '',
}) => {
  const [isLinking, setIsLinking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleStartOAuth = async () => {
    setIsLinking(true);
    setShowSuccess(false);

    try {
      let savedEmail: string | undefined;
      try {
        const savedAuth = localStorage.getItem('vixy_auth');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          savedEmail = parsed.user?.email;
        }
      } catch (e) {
        // ignore
      }

      const authData = await getDiscordAuthUrlApi(savedEmail);
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
      
      await onLinkDiscord(discordUsername);
      setIsLinking(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Discord OAuth error:', err);
      setIsLinking(false);
    }
  };

  return (
    <div
      className={`bg-[#120B28] rounded-2xl border border-purple-800/50 p-4 shadow-xl font-mono text-xs transition-all relative overflow-hidden ${className}`}
    >
      {/* Background Ambient Blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Label */}
      <div className="flex items-center justify-between mb-3 border-b border-purple-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-xs uppercase tracking-wider">Discord Status</span>
        </div>

        {discordLinked && !showSuccess && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>✓ Synced</span>
          </span>
        )}
      </div>

      {/* Success Animated State */}
      {showSuccess ? (
        <div className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-[#0B1A14] to-purple-950/70 border border-emerald-500/60 shadow-lg shadow-emerald-500/10 text-center space-y-1 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-center gap-2 text-emerald-300 font-extrabold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Discord Successfully Connected</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
            <span>✓ Synced</span>
          </div>
        </div>
      ) : discordLinked ? (
        /* Connected State */
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <span className="text-emerald-400 text-sm">🟢</span>
              <span>Connected as</span>
            </div>
            <div className="text-sm font-extrabold text-white pl-5 font-mono">
              {discordUsername || 'Discord Connected'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartOAuth}
              disabled={isLinking}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLinking ? 'animate-spin' : ''}`} />
              <span>Re-Sync</span>
            </button>
            {onUnlinkDiscord && (
              <button
                onClick={onUnlinkDiscord}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-all cursor-pointer"
              >
                Unlink
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Not Connected State */
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2 text-xs text-purple-300/80 font-bold">
            <span className="text-purple-400 text-sm">○</span>
            <span>Not Connected</span>
          </div>

          <button
            onClick={handleStartOAuth}
            disabled={isLinking}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-60"
          >
            {isLinking ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Authenticating OAuth...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Link Discord</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
