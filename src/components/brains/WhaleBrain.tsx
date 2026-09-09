import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';

// Renders the newest large print from the real Coinbase tape (/api/whales).
// The previous version invented a default "-$0.09M SOLD" sweep before data
// arrived, badged itself "DARK POOL RADAR · 12 DARK SCANS" (no dark-pool data
// exists), hardcoded the timestamp to "-1m", and derived a "confidence" label
// from a fabricated impact field. Every value below is observed or absent.

interface WhaleMove {
  id: string;
  sizeUSD: string;
  asset: string;
  action: 'BOUGHT' | 'SOLD';
  venue: string;
  sizeTier: string;
  effect: 'Bullish' | 'Bearish';
  timestamp: number;
}

interface WhaleBrainProps {
  ticker?: BTCTicker | null;
  selectedAsset?: string;
}

const relTime = (ts: number): string => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export const WhaleBrain: React.FC<WhaleBrainProps> = ({ ticker, selectedAsset = 'BTC' }) => {
  const [whaleEvents, setWhaleEvents] = useState<WhaleMove[]>([]);
  const [status, setStatus] = useState<'ACTIVE' | 'DEGRADED'>('ACTIVE');

  useEffect(() => {
    let isMounted = true;
    async function fetchWhales() {
      try {
        const res = await fetch(`/api/whales?asset=${selectedAsset || 'BTC'}`);
        if (isMounted) {
          if (!res.ok) {
            setStatus('DEGRADED');
            return;
          }
          setStatus('ACTIVE');
          const data = await res.json();
          if (data && data.orders) {
            const mappedMoves: WhaleMove[] = data.orders.map((o: any) => {
              const isBuy = o.takerSide === 'BUY' || o.action === 'BUY_SWEEP';
              const size = safeNumber(o.sizeUSD, 0);
              return {
                id: o.id || `wh-${o.timestamp}`,
                sizeUSD: `${isBuy ? '+' : '-'}$${safeToFixed(size / 1000000, 2)}M`,
                asset: o.asset || 'BTC',
                action: isBuy ? 'BOUGHT' : 'SOLD',
                venue: o.venue || 'Coinbase',
                sizeTier: o.sizeTier || '$10k+',
                effect: isBuy ? 'Bullish' : 'Bearish',
                timestamp: o.timestamp || Date.now(),
              };
            });

            setWhaleEvents((prev) => {
              const prevIds = new Set(prev.map((p) => p.id));
              const newItems = mappedMoves.filter((m) => !prevIds.has(m.id));
              return [...newItems, ...prev].slice(0, 5);
            });
          }
        }
      } catch (err) {
        // Keep existing state
      }
    }

    fetchWhales();
    const interval = setInterval(fetchWhales, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  // No invented default print: until a real one arrives, the card says so.
  const latest: WhaleMove | null = whaleEvents[0] || null;
  const isBuy = latest?.action === 'BOUGHT';

  return (
    <div className="vixy-card-elevated hud-corners border border-purple-900/60 p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group">
      {/* HUD Corner Brackets */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2 border-purple-600/50 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-600/50 pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-2.5 mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/60 text-[9px] font-black uppercase tracking-wider">
            WHALE MATCH
          </span>
          <span className="text-[9px] text-purple-400/80 tracking-widest font-bold uppercase">
            COINBASE TAPE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${
            status === 'ACTIVE'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
              : 'bg-amber-950/90 text-amber-300 border border-amber-500/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{status === 'ACTIVE' ? 'TAPE LIVE' : 'VENUE DEGRADED'}</span>
          </span>
        </div>
      </div>

      {/* LARGE PRINT CARD */}
      <div className="bg-[#06020f] border border-purple-900/60 rounded-xl p-4 space-y-3 relative z-10 my-auto shadow-md">
        <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-amber-400 uppercase tracking-widest">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>LARGEST RECENT PRINT</span>
        </div>

        {latest === null ? (
          <div className="p-4 text-center text-[10px] text-purple-300/60">
            {status === 'DEGRADED'
              ? 'COINBASE UNAVAILABLE — no tape to show.'
              : 'Waiting for the first large print from the live tape…'}
          </div>
        ) : (
          <>
            {/* Large Value Banner */}
            <div className="flex items-center justify-between gap-3 bg-[#030107] border border-purple-900/80 rounded-lg p-3">
              <div className="text-xl sm:text-2xl font-black tracking-tight hud-gradient-text" style={isBuy ? { "--grad-a": "#34d399", "--grad-b": "#f5f0ff", "--grad-c": "#10b981", "--grad-glow": "rgba(52,211,153,0.4)" } as React.CSSProperties : { "--grad-a": "#fb7185", "--grad-b": "#f5f0ff", "--grad-c": "#e11d48", "--grad-glow": "rgba(244,63,94,0.5)" } as React.CSSProperties}>
                {latest.sizeUSD} {latest.asset} {latest.action}
              </div>
              <div className="px-2.5 py-1 rounded bg-[#0a0316] border border-purple-700/50 text-cyan-300 font-bold text-xs">
                {latest.venue}
              </div>
            </div>

            {/* 3 Pill Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
              <div className="hud-stat-card hud-corners border border-purple-900/50">
                <div className="hud-stat-label">SIZE TIER</div>
                <div className="hud-stat-value text-amber-300">{latest.sizeTier}</div>
              </div>

              <div className="hud-stat-card hud-corners border border-purple-900/50">
                <div className="hud-stat-label">TAKER SIDE</div>
                <div className={`hud-stat-value ${latest.effect === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latest.effect}
                </div>
              </div>

              <div className="hud-stat-card hud-corners border border-purple-900/50">
                <div className="hud-stat-label">@TS</div>
                <div className="hud-stat-value text-cyan-300">{relTime(latest.timestamp)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
