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
    <div className="bg-[#030108] rounded-3xl border border-purple-800/70 p-6 space-y-5 font-mono shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/50 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-2 font-mono text-xs font-black text-cyan-300 bg-cyan-950/90 px-3 py-1 rounded-full border border-cyan-500/50 shadow-sm">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            🐋 INSTITUTIONAL SURVEILLANCE INTERCEPT
          </span>
          <span className="text-xs text-purple-300/80 hidden sm:inline tracking-wider">
            DARK POOL & BLOCK DESK SURVEILLANCE
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#05020f] px-3 py-1 rounded-xl border border-purple-800/60 text-xs text-purple-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>SURVEILLANCE ACTIVE (12 VENUES)</span>
        </div>
      </div>

      {/* Featured Just-Intercepted Banner */}
      {latest && (
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-500 ${
            isFlashing
              ? latest.action === 'BOUGHT'
                ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.8)] scale-[1.01]'
                : 'bg-rose-950/90 border-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.8)] scale-[1.01]'
              : 'bg-gradient-to-r from-purple-950/80 via-[#0a031a] to-cyan-950/80 border-purple-500/50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-400 uppercase">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                JUST INTERCEPTED ON NETWORK
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                <span className={latest.action === 'BOUGHT' ? 'text-emerald-400' : 'text-rose-400'}>
                  {latest.sizeUSD} {latest.asset} {latest.action}
                </span>
                <span className="text-xs text-purple-300 font-normal bg-[#060210] px-2.5 py-1 rounded-lg border border-purple-800/60">
                  {latest.venue}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#060210] p-2.5 rounded-xl border border-purple-800/60 text-center">
                <div className="text-[9px] text-purple-300/70 uppercase">CONFIDENCE</div>
                <div className="text-xs font-black text-amber-300">{latest.confidence}</div>
              </div>
              <div className="bg-[#060210] p-2.5 rounded-xl border border-purple-800/60 text-center">
                <div className="text-[9px] text-purple-300/70 uppercase">EFFECT</div>
                <div className={`text-xs font-black ${latest.effect === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latest.effect}
                </div>
              </div>
              <div className="bg-[#060210] p-2.5 rounded-xl border border-purple-800/60 text-center">
                <div className="text-[9px] text-purple-300/70 uppercase">IMPACT WINDOW</div>
                <div className="text-xs font-black text-cyan-300">+{latest.estimatedImpactMins} mins</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Whale Move Log Stream */}
      <div className="space-y-2">
        <div className="text-[10px] text-purple-300/70 font-bold uppercase tracking-wider">
          Recent Dark Pool Injections:
        </div>
        <div className="space-y-2">
          {whaleEvents.map((move) => (
            <div
              key={move.id}
              className="bg-[#060210] hover:bg-[#0f0724] p-3 rounded-2xl border border-purple-900/50 flex flex-wrap items-center justify-between gap-3 text-xs transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                    move.action === 'BOUGHT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {move.action === 'BOUGHT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-extrabold text-white flex items-center gap-2">
                    <span>{move.sizeUSD} {move.asset}</span>
                    <span className="text-[10px] text-purple-300/70 font-normal">({move.venue})</span>
                  </div>
                  <div className="text-[10px] text-purple-400">{move.timeAgo}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-[10px] text-purple-300/60 uppercase">Impact Est.</div>
                  <div className="font-bold text-cyan-300">+{move.estimatedImpactMins}m</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-300/60 uppercase">Effect</div>
                  <div className={`font-black ${move.effect === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {move.effect}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

