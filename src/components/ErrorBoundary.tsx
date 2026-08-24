import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      window.location.hash = '';
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  private handleClearData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.hash = '';
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070410] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-[#0F0826] border-2 border-purple-500/40 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-wide text-white">
                VIXY AI Terminal Error Recovery
              </h1>
              <p className="text-sm text-purple-200/70 font-mono">
                An unexpected application boundary exception occurred.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#070410] border border-purple-900/60 rounded-2xl p-4 text-left overflow-x-auto text-xs font-mono text-amber-300/90 max-h-40 scrollbar-thin">
                <p className="font-bold text-rose-400 mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Terminal</span>
              </button>

              <button
                onClick={this.handleClearData}
                className="py-3 px-5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Reset Cache & Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
