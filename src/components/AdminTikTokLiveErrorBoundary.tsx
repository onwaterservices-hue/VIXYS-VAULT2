import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReturnToDashboard: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AdminTikTokLiveErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TikTok Live Broadcast Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070410] flex flex-col items-center justify-center p-6 text-white">
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-[#0D0D12] border border-red-500/30 max-w-lg w-full shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg shadow-red-950/50">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-800/50 uppercase">
                CRITICAL COMPONENT FAILURE
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase font-mono mt-4">
                VIXY ADMIN BROADCAST
              </h2>
              <p className="text-sm font-bold text-red-400 font-mono">
                TikTok Live module unavailable
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-2 break-all px-4 bg-zinc-950 p-2 rounded border border-zinc-800">
                {this.state.error?.message || 'Unknown render error occurred in broadcast module.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                RETRY MODULE
              </button>
              <button
                onClick={this.props.onReturnToDashboard}
                className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-900/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
