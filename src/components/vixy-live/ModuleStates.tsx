import React from 'react';
import { AlertTriangle, RefreshCw, Layers, ShieldAlert, WifiOff } from 'lucide-react';

interface ModuleStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ModuleLoadingState: React.FC<{ message?: string }> = ({ message = 'Loading quantitative telemetry...' }) => (
  <div className="h-full min-h-[100px] flex flex-col items-center justify-center p-4 text-center font-mono space-y-2">
    <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
    <span className="text-xs text-slate-400 font-sans">{message}</span>
  </div>
);

export const ModuleErrorState: React.FC<ModuleStateProps> = ({
  title = 'TELEMETRY DISRUPTED',
  message = 'Failed to load module stream.',
  onRetry
}) => (
  <div className="h-full min-h-[100px] flex flex-col items-center justify-center p-4 text-center font-mono space-y-2 bg-rose-950/10 border border-rose-500/20 rounded-lg">
    <AlertTriangle className="w-5 h-5 text-rose-400" />
    <div className="text-xs font-bold text-white">{title}</div>
    <div className="text-[11px] text-slate-400 font-sans">{message}</div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-all font-sans"
      >
        Reconnect Stream
      </button>
    )}
  </div>
);

export const ModuleUnavailableState: React.FC<{ reason?: string }> = ({
  reason = 'Underlying exchange telemetry feed not provisioned on this environment.'
}) => (
  <div className="h-full min-h-[100px] flex flex-col items-center justify-center p-4 text-center font-mono space-y-2 bg-[#090c12] text-slate-500">
    <WifiOff className="w-5 h-5 text-slate-600" />
    <div className="text-xs font-bold text-slate-400 font-sans">FEED UNAVAILABLE</div>
    <div className="text-[10.5px] text-slate-500 font-sans max-w-xs">{reason}</div>
  </div>
);

export const ModuleEmptyState: React.FC<{ message?: string }> = ({
  message = 'No telemetry events recorded in current cycle window.'
}) => (
  <div className="h-full min-h-[100px] flex flex-col items-center justify-center p-4 text-center font-mono space-y-2 text-slate-500">
    <Layers className="w-5 h-5 text-slate-600" />
    <div className="text-xs font-sans text-slate-400">{message}</div>
  </div>
);
