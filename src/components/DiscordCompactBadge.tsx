import React from 'react';
import { MessageSquare, Check, Sparkles, RefreshCw } from 'lucide-react';

interface DiscordCompactBadgeProps {
  discordLinked: boolean;
  discordUsername?: string;
  roleAssigned?: string;
  onClick: () => void;
  className?: string;
}

export const DiscordCompactBadge: React.FC<DiscordCompactBadgeProps> = ({
  discordLinked,
  discordUsername,
  roleAssigned = 'PRO',
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer active:scale-95 select-none ${
        discordLinked
          ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300 shadow-sm hover:border-emerald-400/80'
          : 'bg-amber-950/50 hover:bg-amber-900/50 border-amber-500/40 text-amber-300 shadow-sm hover:border-amber-400/80 animate-pulse'
      } ${className}`}
      title={
        discordLinked
          ? `Discord connected as ${discordUsername} (${roleAssigned} Role Synced). Click to view connection status.`
          : 'Discord not connected. Click to finish account onboarding & sync PRO roles.'
      }
    >
      <div className="p-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
        <MessageSquare className="w-3 h-3" />
      </div>

      {discordLinked ? (
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate font-extrabold text-white text-[11px]">
            Discord Connected
          </span>
          <span className="text-emerald-500/80 font-normal hidden sm:inline">•</span>
          <span className="text-emerald-300 text-[10px] uppercase tracking-wider hidden sm:inline font-black">
            {roleAssigned} Synced
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span className="font-extrabold text-amber-300 text-[11px]">
            Connect Discord
          </span>
        </div>
      )}
    </button>
  );
};
