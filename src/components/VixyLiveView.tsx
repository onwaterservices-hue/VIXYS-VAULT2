import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { BTCTicker } from '../types';
import { VixyLiveWorkspace } from './VixyLiveWorkspace';

interface VixyLiveViewProps {
  ticker?: BTCTicker;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
}

class VixyLiveErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("VIXY LIVE Workspace Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-[#0b0e14] border border-rose-500/30 rounded-2xl text-center space-y-4 font-mono">
          <RefreshCw className="w-10 h-10 text-rose-400 animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">WORKSPACE RECONNECTING</h2>
          <p className="text-slate-400 text-xs">Restoring modular intelligence terminal...</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const VixyLiveView: React.FC<VixyLiveViewProps> = (props) => {
  return (
    <VixyLiveErrorBoundary>
      <VixyLiveWorkspace
        initialTicker={props.ticker}
        onOpenTerminal={props.onOpenTerminal}
      />
    </VixyLiveErrorBoundary>
  );
};
