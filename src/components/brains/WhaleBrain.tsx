import React, { useState, useEffect } from 'react';
import { Flame, ArrowUpRight, ArrowDownRight, Radio, ShieldAlert, Cpu } from 'lucide-react';
import { BTCTicker } from '../../types';

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
  ticker: BTCTicker;
  selectedAsset?: string;
}

export const WhaleBrain: React.FC<WhaleBrainProps> = ({ ticker, selectedAsset = 'BTC' }) => {
  const [whaleEvents, setWhaleEvents] = useState<WhaleMove[]>([]);

  // Flash alert state when a new whale order is intercepted
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
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
              const isBuy = o.action === 'BUY_SWEEP';
              return {
                id: o.id,
                sizeUSD: `${isBuy ? '+' : '-'}$${(o.sizeUSD / 1000000).toFixed(2)}M`,
                asset: o.asset,
                action: isBuy ? 'BOUGHT' : 'SOLD',
                venue: o.venue,
                confidence: o.impact === 'CRITICAL' ? 'INSTITUTIONAL' : o.impact === 'EXTREME' ? 'VERY HIGH' : 'HIGH',
                effect: isBuy ? 'Bullish' : 'Bearish',
                estimatedImpactMins: o.impact === 'CRITICAL' ? 15 : o.impact === 'EXTREME' ? 10 : 5,
                timeAgo: new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: o.timestamp,
              };
            });

            setWhaleEvents((prev) => {
              const prevIds = new Set(prev.map((p) => p.id));
              const newItems = mappedMoves.filter((m) => !prevIds.has(m.id));
              if (newItems.length > 0) {
                setIsFlashing(true);
                setTimeout(() => {
                  if (isMounted) setIsFlashing(false);
                }, 800);
              }
              return [...newItems, ...prev].slice(0, 5);
            });
          }
        }
      } catch (err) {
        // Keep existing state on transient failure
      }
    }

    fetchWhales();
    const interval = setInterval(fetchWhales, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedAsset]);

  const latest = whaleEvents[0];

  return (
    <div className="bg-[#020108] rounded-2xl border border-purple-600/50 p-5 space-y-4 font-mono shadow-[0_0_40px_rgba(112,26,238,0.22)] relative overflow-hidden backdrop-blur-2xl h-full flex flex-col justify-between group">
      {/* HUD Corner Brackets */}
      <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
      <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-purple-500 pointer-events-none z-20" />
      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-purple-500 pointer-events-none z-20" />

      {/* Animated Radar Scanning Line Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(168,85,247,0.04)_50%,transparent_100%)] bg-[length:100%_4px] pointer-events-none z-10" />

      {/* Ambient Radial Color Glows */}
      <div className="absolute -top-16 -right-16 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/80 pb-3 relative z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/90 px-3 py-1.5 rounded-lg border border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="tracking-widest">WHALE WATCH™</span>
          </div>
          <span className="text-[10px] text-purple-300/90 font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-purple-400" />
            DARK POOL RADAR
          </span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
          {status === 'ACTIVE' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border bg-emerald-950/90 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>RADAR LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border bg-amber-950/90 text-amber-300 border-amber-500/80">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>RADAR STANDBY</span>
            </div>
          )}
          <div className="px-2.5 py-1 rounded-md border bg-purple-950/80 text-purple-300 border-purple-500/60 font-mono text-[10px] tracking-wider">
            12 DESKS SCANNING
          </div>
        </div>
      </div>

      {/* FEATURED ALERT: JUST INTERCEPTED WHALE */}
      {latest ? (
        <div
          className={`border rounded-xl p-4 sm:p-4.5 shadow-2xl relative overflow-hidden transition-all duration-300 z-20 ${
            isFlashing
              ? latest.action === 'BOUGHT'
                ? 'bg-emerald-950/95 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.9)]'
                : 'bg-rose-950/95 border-rose-400 shadow-[0_0_50px_rgba(244,63,94,0.9)]'
              : 'bg-gradient-to-r from-purple-950/90 via-[#0a0218] to-cyan-950/90 border-purple-500/70'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-400 uppercase">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                INSTITUTIONAL SWEEP INTERCEPTED
              </div>
              <div className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 flex-wrap">
                <span
                  className={
                    latest.action === 'BOUGHT'
                      ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)] font-black'
                      : 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] font-black'
                  }
                >
                  {latest.sizeUSD} {latest.asset} {latest.action}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-[#050110] px-3 py-1 rounded-md border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  {latest.venue}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#050110]/90 p-2 rounded-lg border border-purple-800/80 text-center min-w-[85px]">
                <div className="text-[9px] text-purple-300/70 font-bold uppercase tracking-wider">CONFIDENCE</div>
                <div className="text-xs font-black text-amber-300 mt-0.5">{latest.confidence}</div>
              </div>
              <div className="bg-[#050110]/90 p-2 rounded-lg border border-purple-800/80 text-center min-w-[85px]">
                <div className="text-[9px] text-purple-300/70 font-bold uppercase tracking-wider">EFFECT</div>
                <div className={`text-xs font-black mt-0.5 ${latest.effect === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latest.effect}
                </div>
              </div>
              <div className="bg-[#050110]/90 p-2 rounded-lg border border-purple-800/80 text-center min-w-[85px]">
                <div className="text-[9px] text-purple-300/70 font-bold uppercase tracking-wider">WINDOW</div>
                <div className="text-xs font-black text-cyan-300 mt-0.5">+{latest.estimatedImpactMins}m</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#050110] p-4 rounded-xl border border-purple-900/60 text-center text-xs text-purple-300/70 z-20 flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400 animate-spin" />
          <span>Scanning Dark Pools & OTC Desks for Large Liquidity Injections...</span>
        </div>
      )}

      {/* WHALE MOVE STREAM LIST */}
      <div className="space-y-2 relative z-20">
        <div className="text-[10px] text-purple-300/90 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>RECENT LIQUIDITY INJECTIONS</span>
          <span className="text-cyan-400 text-[9px] font-mono tracking-widest animate-pulse">LIVE STREAM</span>
        </div>
        <div className="space-y-2">
          {whaleEvents.map((move) => {
            const isBuy = move.action === 'BOUGHT';
            return (
              <div
                key={move.id}
                className="bg-[#050110] hover:bg-[#0c0320] p-3 rounded-xl border border-purple-900/70 hover:border-purple-500/80 grid grid-cols-12 items-center gap-2 text-xs transition-all shadow-md"
              >
                {/* Column 1: Action Icon */}
                <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                      isBuy
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                        : 'bg-rose-950 text-rose-400 border border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    }`}
                  >
                    {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                </div>

                {/* Column 2: Size & Venue */}
                <div className="col-span-10 sm:col-span-5">
                  <div className="font-black text-white flex items-center gap-2 flex-wrap">
                    <span className={isBuy ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                      {move.sizeUSD} {move.asset}
                    </span>
                    <span className="text-[10px] text-purple-300/80 font-normal">({move.venue})</span>
                  </div>
                  <div className="text-[9px] text-purple-400 font-mono mt-0.5">{move.timeAgo}</div>
                </div>

                {/* Column 3: Impact */}
                <div className="col-span-6 sm:col-span-3 text-left sm:text-center border-t sm:border-t-0 border-purple-900/40 pt-1 sm:pt-0">
                  <div className="text-[9px] text-purple-400/80 uppercase font-bold">Impact Est.</div>
                  <div className="font-extrabold text-cyan-300">+{move.estimatedImpactMins}m</div>
                </div>

                {/* Column 4: Effect */}
                <div className="col-span-6 sm:col-span-3 text-right border-t sm:border-t-0 border-purple-900/40 pt-1 sm:pt-0">
                  <div className="text-[9px] text-purple-400/80 uppercase font-bold">Effect</div>
                  <div className={`font-black uppercase text-[10px] ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    [{move.effect}]
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


