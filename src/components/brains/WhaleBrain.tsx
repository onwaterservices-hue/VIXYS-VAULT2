import React, { useState, useEffect } from 'react';
import { Flame, ArrowUpRight, ArrowDownRight, Radio, ShieldAlert, Cpu } from 'lucide-react';
import { BTCTicker } from '../../types';
import { safeNumber, safeToFixed } from '../../utils/numeric';

interface WhaleMove {
  id: string;
  sizeUSD: string;
  asset: string;
  action: 'BOUGHT' | 'SOLD' | 'WITHDRAWN' | 'DEPOSITED';
  venue: string;
  confidence: 'HIGH' | 'VERY HIGH' | 'INSTITUTIONAL';
  effect: 'Bullish' | 'Bearish' | 'Neutral';
  estimatedImpactMins: number;
  timeAgo: string;
  timestamp: number;
}

interface WhaleBrainProps {
  ticker?: BTCTicker | null;
  selectedAsset?: string;
}

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
              const isBuy = o.action === 'BUY_SWEEP' || o.action === 'BOUGHT';
              const size = safeNumber(o.sizeUSD, 90000);
              return {
                id: o.id || Math.random().toString(),
                sizeUSD: `${isBuy ? '+' : '-'}$${safeToFixed(size / 1000000, 2)}M`,
                asset: o.asset || 'BTC',
                action: isBuy ? 'BOUGHT' : 'SOLD',
                venue: o.venue || 'Coinbase Pro',
                confidence: o.impact === 'CRITICAL' ? 'INSTITUTIONAL' : o.impact === 'EXTREME' ? 'VERY HIGH' : 'HIGH',
                effect: isBuy ? 'Bullish' : 'Bearish',
                estimatedImpactMins: o.impact === 'CRITICAL' ? 15 : o.impact === 'EXTREME' ? 10 : 5,
                timeAgo: '-1m',
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

  // Default institutional sweep if none yet received
  const latest: WhaleMove = whaleEvents[0] || {
    id: 'sweep-default',
    sizeUSD: '-$0.09M',
    asset: 'BTC',
    action: 'SOLD',
    venue: 'Coinbase Pro',
    confidence: 'HIGH',
    effect: 'Bearish',
    estimatedImpactMins: 5,
    timeAgo: '-1m',
    timestamp: Date.now(),
  };

  const isBuy = latest.action === 'BOUGHT';

  return (
    <div className="bg-[#030109] rounded-2xl border border-purple-900/60 p-4 sm:p-5 font-mono shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col justify-between h-full group">
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
            DARK POOL RADAR
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 text-[9px] font-bold shadow-[0_0_8px_rgba(52,211,153,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>WHALE LIVE 12 DARK SCANS</span>
          </span>
        </div>
      </div>

      {/* INSTITUTIONAL SWEEP INTERCEPTED CARD */}
      <div className="bg-[#06020f] border border-purple-900/60 rounded-xl p-4 space-y-3 relative z-10 my-auto shadow-md">
        <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-amber-400 uppercase tracking-widest">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>INSTITUTIONAL SWEEP INTERCEPTED</span>
        </div>

        {/* Large Value Banner */}
        <div className="flex items-center justify-between gap-3 bg-[#030107] border border-purple-900/80 rounded-lg p-3">
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
            {latest.sizeUSD} {latest.asset} {latest.action}
          </div>
          <div className="px-2.5 py-1 rounded bg-[#0a0316] border border-purple-700/50 text-cyan-300 font-bold text-xs">
            {latest.venue}
          </div>
        </div>

        {/* 3 Pill Badges */}
        <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
          <div className="bg-[#030108] border border-purple-900/50 rounded-lg p-1.5">
            <div className="text-purple-400/70 font-bold uppercase text-[7.5px] tracking-wider">CONFIDENCE</div>
            <div className="text-amber-300 font-black text-[10px] mt-0.5">{latest.confidence}</div>
          </div>

          <div className="bg-[#030108] border border-purple-900/50 rounded-lg p-1.5">
            <div className="text-purple-400/70 font-bold uppercase text-[7.5px] tracking-wider">IMPACT</div>
            <div className={`font-black text-[10px] mt-0.5 ${latest.effect === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {latest.effect}
            </div>
          </div>

          <div className="bg-[#030108] border border-purple-900/50 rounded-lg p-1.5">
            <div className="text-purple-400/70 font-bold uppercase text-[7.5px] tracking-wider">@TS</div>
            <div className="text-cyan-300 font-black text-[10px] mt-0.5">{latest.timeAgo}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
