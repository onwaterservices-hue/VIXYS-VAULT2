import React from 'react';
import { MessageSquare, Check, Sparkles, RefreshCw } from 'lucide-react';

interface DiscordCompactBadgeProps {
  discordLinked: boolean;
  guildMember?: boolean;
  discordUsername?: string;
  roleAssigned?: string;
  onClick: () => void;
  className?: string;
}

export const DiscordCompactBadge: React.FC<DiscordCompactBadgeProps> = ({
  discordLinked,
  guildMember = false,
  discordUsername,
  roleAssigned,
  onClick,
  className = '',
}) => {
  const isServerRequired = discordLinked && (!guildMember || roleAssigned === 'SERVER_REQUIRED' || roleAssigned === 'NEEDS_GUILD');
  const validRole = roleAssigned && roleAssigned !== 'NONE' && roleAssigned !== 'null' && roleAssigned !== 'NEEDS_GUILD' ? roleAssigned : null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer active:scale-95 select-none ${
        discordLinked
          ? isServerRequired
            ? 'bg-amber-950/60 hover:bg-amber-900/60 border-amber-500/50 text-amber-300 shadow-sm'
            : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300 shadow-sm hover:border-emerald-400/80'
          : 'bg-purple-950/50 hover:bg-purple-900/50 border-purple-600/40 text-purple-300 shadow-sm hover:border-purple-500/80'
      } ${className}`}
      title={
        discordLinked
          ? isServerRequired
            ? `Discord linked as ${discordUsername || 'User'}. Server join required.`
            : `Discord connected as ${discordUsername || 'User'} (${validRole || 'Member'}). Click to view gateway.`
          : 'Discord not connected. Click to open VIXY Network Gateway.'
      }
    >
      <div className="p-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
        <MessageSquare className="w-3 h-3" />
      </div>

      {discordLinked ? (
        isServerRequired ? (
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce shrink-0" />
            <span className="truncate font-extrabold text-amber-200 text-[11px]">
              Server Join Required
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate font-extrabold text-white text-[11px]">
              Discord Verified
            </span>
            {validRole && (
              <>
                <span className="text-emerald-500/80 font-normal hidden sm:inline">•</span>
                <span className="text-emerald-300 text-[10px] uppercase tracking-wider hidden sm:inline font-black">
                  {validRole} Synced
                </span>
              </>
            )}
          </div>
        )
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
          <span className="font-extrabold text-purple-200 text-[11px]">
            Discord Gateway
          </span>
        </div>
      )}
    </button>
  );
};

