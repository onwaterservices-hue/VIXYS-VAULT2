import React from 'react';
import { AlertCircle, ArrowLeft, Home, Sparkles, Terminal } from 'lucide-react';

interface NotFoundViewProps {
  onReturnToTerminal: () => void;
  onReturnToLanding?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onReturnToTerminal,
  onReturnToLanding,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 font-mono text-purple-100 animate-fadeIn">
      <div className="max-w-xl w-full bg-[#0d071e]/90 border-2 border-purple-500/40 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-radial from-purple-600/20 via-transparent to-transparent pointer-events-none" />

        <div className="w-20 h-20 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400 shadow-xl shadow-purple-600/30">
          <AlertCircle className="w-10 h-10 text-purple-300 animate-pulse" />
        </div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
            <span>404 — ROUTE NOT FOUND</span>
          </div>
          <h1 className="text-3xl font-black font-mono text-white tracking-tight">
            Out of Signal Range
          </h1>
          <p className="text-xs text-purple-300/80 font-sans max-w-md mx-auto leading-relaxed">
            The requested page or endpoint route does not exist or has been relocated within the Vixy's Vault decision terminal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono relative z-10">
          <button
            onClick={onReturnToTerminal}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            <span>Launch Terminal</span>
          </button>

          {onReturnToLanding ? (
            <button
              onClick={onReturnToLanding}
              className="px-6 py-3.5 rounded-2xl bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 font-bold text-xs shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Landing Page</span>
            </button>
          ) : (
            <button
              onClick={() => window.location.hash = 'pricing'}
              className="px-6 py-3.5 rounded-2xl bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 font-bold text-xs shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>View Pricing</span>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-purple-900/40 text-[11px] text-purple-400/60 font-mono">
          Vixy's Vault Quant Research Lab • Route Error Exception Handled
        </div>
      </div>
    </div>
  );
};
