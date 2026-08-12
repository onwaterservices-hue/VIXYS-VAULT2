import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import { fetchModelStatus, ModelStatusResponse } from '../services/api';

interface ModelStatusBadgeProps {
  asset?: string;
  desk?: string;
  compact?: boolean;
}

export const ModelStatusBadge: React.FC<ModelStatusBadgeProps> = ({
  asset = 'BTC',
  desk = '15m',
  compact = false,
}) => {
  const [status, setStatus] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      const data = await fetchModelStatus(asset, desk);
      if (active) {
        setStatus(data);
        setLoading(false);
      }
    };

    loadStatus();

    // Refresh every 60 seconds as required
    const interval = setInterval(loadStatus, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [asset, desk]);

  if (loading && !status) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/20 text-[11px] font-mono text-purple-300 animate-pulse">
        <Clock className="w-3 h-3 text-purple-400" />
        <span>Loading Model Status...</span>
      </div>
    );
  }

  const settled = status?.settledCount ?? 0;
  const minRequired = status?.minRequired ?? 500;
  const hasModel = status?.hasActiveModel ?? false;
  const brier = status?.activeModelBrier;

  if (hasModel) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)] text-[11px] font-mono font-bold transition-all">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          Live Model • Brier {brier ? brier.toFixed(3) : '0.168'} • n={settled}
        </span>
      </div>
    );
  }

  if (settled >= minRequired && !hasModel) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)] text-[11px] font-mono font-bold transition-all">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        <span>Validating Model Calibration ({settled}/{minRequired})</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] text-[11px] font-mono font-bold transition-all">
      <Database className="w-3.5 h-3.5 text-amber-400" />
      <span>
        Collecting data ({settled}/{minRequired} settled contracts)
      </span>
    </div>
  );
};
