import React, { useState, useEffect } from 'react';
import { Flame, ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';
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
  const [whaleEvents, setWhaleEvents] = useState<WhaleMove[]>([
    {
      id: 'wm-101',
      sizeUSD: '+$8.2M',
      asset: selectedAsset,
      action: 'BOUGHT',
      venue: 'Coinbase Prime',
      confidence: 'INSTITUTIONAL',
      effect: 'Bullish',
      estimatedImpactMins: 6,
      timeAgo: 'JUST NOW',
      timestamp: Date.now(),
    },
    {
      id: 'wm-102',
      sizeUSD: '+$14.5M',
      asset: selectedAsset,
      action: 'BOUGHT',
      venue: 'Binance Futures',
      confidence: 'VERY HIGH',
      effect: 'Bullish',
      estimatedImpactMins: 12,
      timeAgo: '2m ago',
      timestamp: Date.now() - 120000,
    },
    {
      id: 'wm-103',
      sizeUSD: '-$6.1M',
      asset: selectedAsset,
      action: 'SOLD',
      venue: 'Deribit Options',
      confidence: 'HIGH',
      effect: 'Bearish',
      estimatedImpactMins: 4,
      timeAgo: '5m ago',
      timestamp: Date.now() - 300000,
    },
  ]);

  // Flash alert state when a new whale order is intercepted
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const isBuy = Math.random() > 0.35;
      const amount = (Math.random() * 12 + 3).toFixed(1);
      const venues = ['Coinbase Prime', 'Binance Futures', 'Bybit Institutional', 'Deribit', 'OKX Block Desk'];
      const randomVenue = venues[Math.floor(Math.random() * venues.length)];

      const newMove: WhaleMove = {
        id: `wm-${Date.now()}`,
        sizeUSD: `${isBuy ? '+' : '-'}$${amount}M`,
        asset: selectedAsset,
        action: isBuy ? 'BOUGHT' : 'SOLD',
        venue: randomVenue,
        confidence: isBuy ? 'INSTITUTIONAL' : 'HIGH',
        effect: isBuy ? 'Bullish' : 'Bearish',
        estimatedImpactMins: Math.floor(Math.random() * 8) + 3,
        timeAgo: 'JUST INTERCEPTED',
        timestamp: Date.now(),
      };

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 800);

      setWhaleEvents((prev) => [newMove, ...prev.slice(0, 4)]);
    }, 12000);

    return () => clearInterval(interval);
  }, [selectedAsset]);

  const latest = whaleEvents[0];

  return (
    <div className="bg-[#030109] rounded-2xl border border-purple-800/80 p-5 space-y-4 font-mono shadow-[0_0_35px_rgba(112,26,238,0.18)] relative overflow-hidden backdrop-blur-xl h-full flex flex-col justify-between">
      {/* HUD Corner Brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-purple-500/80 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-purple-500/80 pointer-events-none" />

      {/* Ambient Radial Glows */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Title, Subtitle, Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/60 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/90 px-3 py-1.5 rounded-lg border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="tracking-widest">WHALE WATCH™</span>
          </div>
          <span className="text-[10px] text-purple-300/80 font-bold tracking-widest uppercase">
            // INSTITUTIONAL SURVEILLANCE
          </span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SURVEILLANCE ACTIVE</span>
          </div>
          <div className="px-2.5 py-1 rounded-md border bg-purple-950/90 text-purple-300 border-purple-500/60">
            12 VENUES
          </div>
        </div>
      </div>

      {/* Featured Just-Intercepted Banner */}
      {latest && (
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300 ${
            isFlashing
              ? latest.action === 'BOUGHT'
                ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.8)]'
                : 'bg-rose-950/90 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.8)]'
              : 'bg-gradient-to-r from-purple-950/80 via-[#0a031a] to-cyan-950/80 border-purple-500/60'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-400 uppercase">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                JUST INTERCEPTED ON NETWORK
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3 flex-wrap">
                <span className={latest.action === 'BOUGHT' ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]'}>
                  {latest.sizeUSD} {latest.asset} {latest.action}
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-[#060210] px-3 py-1 rounded-lg border border-cyan-500/40">
                  {latest.venue}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-[#060210] p-2.5 rounded-xl border border-purple-800/60 text-center min-w-[90px]">
                <div className="text-[9px] text-purple-300/70 font-bold uppercase tracking-wider">CONFIDENCE</div>
                <div className="text-xs font-black text-amber-300 mt-0.5">{latest.confidence}</div>
              </div>
              <div className="bg-[#060210] p-2.5 rounded-xl border border-purple-800/60 text-center min-w-[90px]">
                <div className="text-[9px] text-purple-300/70 font-bold uppercase tracking-wider">EFFECT</div>
                <div className={`text-xs font-black mt-0.5 ${latest.effect === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latest.effect}
                </div>
              </div>
              <div className="bg-[#060210] p-2.5 rounded-xl border border-purple-800/60 text-center min-w-[90px]">
                <div className="text-[9px] text-purple-300/70 font-bold uppercase tracking-wider">IMPACT WINDOW</div>
                <div className="text-xs font-black text-cyan-300 mt-0.5">+{latest.estimatedImpactMins} mins</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whale Move Log Stream */}
      <div className="space-y-2">
        <div className="text-[10px] text-purple-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Recent Dark Pool Injections:</span>
          <span className="text-purple-400 text-[9px] font-mono">LIVE FEED ACTIVE</span>
        </div>
        <div className="space-y-2">
          {whaleEvents.map((move) => {
            const isBuy = move.action === 'BOUGHT';
            return (
              <div
                key={move.id}
                className="bg-[#060210] hover:bg-[#0f0724] p-3 rounded-xl border border-purple-900/60 grid grid-cols-12 items-center gap-2 text-xs transition-all"
              >
                {/* Column 1: Action Icon (1 col) */}
                <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                      isBuy ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(52,211,153,0.2)]' : 'bg-rose-950 text-rose-400 border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                    }`}
                  >
                    {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                </div>

                {/* Column 2: Size, Asset & Venue (5 cols) */}
                <div className="col-span-10 sm:col-span-5">
                  <div className="font-black text-white flex items-center gap-2 flex-wrap">
                    <span className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                      {move.sizeUSD} {move.asset}
                    </span>
                    <span className="text-[10px] text-purple-300/80 font-normal">({move.venue})</span>
                  </div>
                  <div className="text-[9.5px] text-purple-400 font-mono mt-0.5">{move.timeAgo}</div>
                </div>

                {/* Column 3: Impact Est (3 cols) */}
                <div className="col-span-6 sm:col-span-3 text-left sm:text-center border-t sm:border-t-0 border-purple-900/40 pt-1 sm:pt-0">
                  <div className="text-[9px] text-purple-400/80 uppercase font-bold">Impact Est.</div>
                  <div className="font-extrabold text-cyan-300">+{move.estimatedImpactMins}m</div>
                </div>

                {/* Column 4: Effect Directional Badge (3 cols) */}
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

