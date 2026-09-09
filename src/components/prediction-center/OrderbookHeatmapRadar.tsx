import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Activity } from 'lucide-react';

// ORDERBOOK & LIQUIDITY RADAR -- real data only.
//
// Until Sept 2026 this component generated its depth ladder from sin/cos of
// the spot price and its whale tape from Math.random(), with the buy/sell skew
// derived FROM the engine's own direction (isUp) and then presented to users as
// corroborating order flow. Every value below now comes from /api/radar, which
// reads Coinbase Exchange's L2 book and trade tape, or the panel says it is
// unavailable. Nothing is estimated, decorated or defaulted. The visual
// structure is unchanged.

interface OrderbookHeatmapRadarProps {
  spotPrice: number;
  strikePrice: number;
  asset: string;
  isUp: boolean;        // retained for prop compatibility; no longer influences any data
  conviction: number;   // retained for prop compatibility
}

interface Level { price: number; size: number; cumulative: number }
interface Print { tradeId: number; timeMs: number; price: number; size: number; usd: number; takerSide: 'BUY' | 'SELL'; venue: string }
interface RadarPayload {
  symbol: string; source: string; fetchedAt: number; fetchMs: number;
  book: { bids: Level[]; asks: Level[]; bestBid: number | null; bestAsk: number | null; spreadUSD: number | null; bidDepthBTC: number; askDepthBTC: number; ratio: number | null; levelsRead: { bids: number; asks: number } };
  tape: Print[];
  skew: { window: { trades: number; oldestMs: number | null; newestMs: number | null }; takerBuyBTC: number; takerSellBTC: number; takerBuyShare: number | null };
  lastTradeAgeMs: number | null;
}

const POLL_MS = 3000;

export const OrderbookHeatmapRadar: React.FC<OrderbookHeatmapRadarProps> = ({ spotPrice, strikePrice, asset }) => {
  const [activeTab, setActiveTab] = useState<'DEPTH' | 'WHALE_TAPE' | 'SKEW'>('DEPTH');
  const [data, setData] = useState<RadarPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/radar?asset=${encodeURIComponent(asset)}&_t=${Date.now()}`, { cache: 'no-store' });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || body?.error) { setError(String(body?.error || `HTTP ${res.status}`)); return; }
        setData(body); setError(null); setReceivedAt(Date.now());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'FETCH_FAILED');
      }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [asset]);

  const book = data?.book ?? null;
  const maxCum = book ? Math.max(book.asks[book.asks.length - 1]?.cumulative ?? 0, book.bids[book.bids.length - 1]?.cumulative ?? 0, 1e-9) : 1;
  const totalDepth = book ? book.bidDepthBTC + book.askDepthBTC : 0;
  const cushionDelta = spotPrice - strikePrice;
  const cushionPct = ((cushionDelta / Math.max(1, strikePrice)) * 100).toFixed(2);
  const fmtTime = (ms: number) => new Date(ms).toISOString().slice(11, 19);
  const ageSec = receivedAt !== null ? Math.max(0, Math.round((Date.now() - receivedAt) / 1000)) : null;
  const stale = ageSec !== null && ageSec > 15;

  const Unavailable = ({ what }: { what: string }) => (
    <div className="p-4 rounded-2xl bg-[#12072e] border border-rose-800/40 text-[11px] font-mono text-rose-300">
      {what} UNAVAILABLE{error ? ` — ${error}` : ''}
    </div>
  );

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#100728]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/40 shadow-2xl space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-cyan-400/40 before:to-transparent">

      {/* Header & Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-950 border border-purple-700/50 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-white font-sans flex items-center gap-1.5">
              <span>ORDERBOOK & LIQUIDITY RADAR</span>
              <span className={`w-1.5 h-1.5 rounded-full ${data && !error && !stale ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono">
              {data ? `Coinbase Exchange L2 · ${data.book.levelsRead.bids}+${data.book.levelsRead.asks} levels · ${data.skew.window.trades} prints` : 'Live Micro-Depth & Whale Absorption'}
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#140833] border border-purple-800/40 text-[10px] font-mono font-bold">
          <button onClick={() => setActiveTab('DEPTH')} className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeTab === 'DEPTH' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300 hover:text-white'}`}>DEPTH LADDER</button>
          <button onClick={() => setActiveTab('WHALE_TAPE')} className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'WHALE_TAPE' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300 hover:text-white'}`}>
            <span>WHALE TAPE</span><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </button>
          <button onClick={() => setActiveTab('SKEW')} className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeTab === 'SKEW' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-300 hover:text-white'}`}>DELTA SKEW</button>
        </div>
      </div>

      {/* TAB 1: DEPTH LADDER & PRESSURE RATIO */}
      {activeTab === 'DEPTH' && (
        <div className="space-y-3 font-mono text-xs">
          {!book ? <Unavailable what="L2 BOOK" /> : (
            <>
              <div className="p-3 rounded-2xl bg-[#12072e] border border-purple-800/30 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-bold">BID DEPTH: {book.bidDepthBTC.toFixed(1)} {asset}</span>
                  <span className="text-purple-300 font-sans font-bold">RATIO: <span className={(book.ratio ?? 0) >= 1 ? 'text-emerald-400' : 'text-rose-400'}>{book.ratio === null ? '--' : `${book.ratio}x`}</span></span>
                  <span className="text-rose-400 font-bold">ASK DEPTH: {book.askDepthBTC.toFixed(1)} {asset}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1e0e48] overflow-hidden flex">
                  <motion.div className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981]" style={{ width: `${totalDepth > 0 ? (book.bidDepthBTC / totalDepth) * 100 : 0}%` }} />
                  <motion.div className="h-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" style={{ width: `${totalDepth > 0 ? (book.askDepthBTC / totalDepth) * 100 : 0}%` }} />
                </div>
                <div className="text-[9px] text-purple-400/70">top 30 resting levels each side · resting depth is not taker flow</div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-3 text-[10px] text-purple-400/80 font-bold px-2 pb-1 border-b border-purple-900/30">
                  <span>PRICE</span><span className="text-center">SIZE ({asset})</span><span className="text-right">CUMULATIVE</span>
                </div>
                {[...book.asks].reverse().map((ask, idx) => (
                  <div key={`ask-${idx}`} className="relative grid grid-cols-3 text-[11px] py-1 px-2 rounded-lg overflow-hidden text-rose-300 hover:bg-rose-950/20 transition-colors">
                    <div className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none rounded-r-lg" style={{ width: `${Math.min(100, (ask.cumulative / maxCum) * 100)}%` }} />
                    <span className="font-bold text-rose-400 relative z-10">${ask.price.toFixed(2)}</span>
                    <span className="text-center text-slate-300 relative z-10">{ask.size.toFixed(4)}</span>
                    <span className="text-right text-rose-300/80 relative z-10">{ask.cumulative.toFixed(2)}</span>
                  </div>
                ))}
                <div className="py-1.5 px-3 rounded-xl bg-purple-950/70 border border-purple-700/50 flex items-center justify-between text-[11px] font-bold text-white shadow-inner">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-cyan-300">SPREAD: {book.spreadUSD === null ? '--' : `$${book.spreadUSD.toFixed(2)}${book.bestBid ? ` (${((book.spreadUSD / book.bestBid) * 100).toFixed(4)}%)` : ''}`}</span>
                  </div>
                  <span className="text-emerald-400 font-mono">{book.bestBid !== null && book.bestAsk !== null ? `$${((book.bestBid + book.bestAsk) / 2).toFixed(2)}` : '--'}</span>
                </div>
                {book.bids.map((bid, idx) => (
                  <div key={`bid-${idx}`} className="relative grid grid-cols-3 text-[11px] py-1 px-2 rounded-lg overflow-hidden text-emerald-300 hover:bg-emerald-950/20 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none rounded-l-lg" style={{ width: `${Math.min(100, (bid.cumulative / maxCum) * 100)}%` }} />
                    <span className="font-bold text-emerald-400 relative z-10">${bid.price.toFixed(2)}</span>
                    <span className="text-center text-slate-300 relative z-10">{bid.size.toFixed(4)}</span>
                    <span className="text-right text-emerald-300/80 relative z-10">{bid.cumulative.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: WHALE PRINT TAPE (real prints >= $10k, taker side from the venue) */}
      {activeTab === 'WHALE_TAPE' && (
        <div className="space-y-2 font-mono text-xs">
          {!data ? <Unavailable what="TRADE TAPE" /> : (
            <>
              <div className="grid grid-cols-4 text-[10px] text-purple-400/80 font-bold px-2 pb-1 border-b border-purple-900/30">
                <span>TIME (UTC) / VENUE</span><span>TAKER SIDE</span><span className="text-center">SIZE</span><span className="text-right">USD VALUE</span>
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {data.tape.length === 0 && <div className="text-[10px] text-purple-300/70 px-2">no prints ≥ $10,000 in the last {data.skew.window.trades} trades</div>}
                {data.tape.map((p) => (
                  <motion.div key={p.tradeId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${p.takerSide === 'BUY' ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200' : 'bg-rose-950/25 border-rose-500/30 text-rose-200'}`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-purple-300/80"><span>{fmtTime(p.timeMs)}</span><span>• {p.venue}</span></div>
                      <div className="text-[9px] font-sans font-bold px-1 py-0.2 rounded bg-black/40 inline-block border border-white/10">{p.usd >= 1e5 ? '≥ $100K PRINT' : '≥ $10K PRINT'}</div>
                    </div>
                    <div className="text-center">
                      <span className={`font-black ${p.takerSide === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{p.takerSide}</span>
                      <div className="text-[10px] text-slate-300">{p.size.toFixed(4)} {asset}</div>
                    </div>
                    <div className="text-right font-black">
                      <div className="text-white">${p.usd.toLocaleString()}</div>
                      <div className="text-[10px] text-purple-300/70">@${p.price.toFixed(1)}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: TAKER DELTA SKEW & STRIKE CUSHION */}
      {activeTab === 'SKEW' && (
        <div className="space-y-3 font-sans text-xs">
          <div className="p-3.5 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase">
              <span>STRIKE CUSHION</span>
              <span className={`font-mono font-bold ${cushionDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{cushionDelta >= 0 ? '▲ ABOVE STRIKE' : '▼ BELOW STRIKE'}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-black text-white font-mono">{cushionDelta >= 0 ? '+' : ''}${Math.abs(cushionDelta).toFixed(2)}</div>
              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${cushionDelta >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>{cushionDelta >= 0 ? '+' : ''}{cushionPct}%</span>
            </div>
            <div className="text-[10px] text-purple-300/80 leading-relaxed">Price is ${Math.abs(cushionDelta).toFixed(2)} {cushionDelta >= 0 ? 'above' : 'below'} the 15-minute strike (${strikePrice.toFixed(2)}).</div>
          </div>

          {!data ? <Unavailable what="TAKER SKEW" /> : (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#12072e] border border-purple-800/30">
                <div className="text-[9px] text-purple-400 font-bold">TAKER BUY SHARE (last {data.skew.window.trades} prints)</div>
                <div className={`text-sm font-black mt-0.5 ${(data.skew.takerBuyShare ?? 0.5) >= 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>{data.skew.takerBuyShare === null ? '--' : `${(data.skew.takerBuyShare * 100).toFixed(1)}%`}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#12072e] border border-purple-800/30">
                <div className="text-[9px] text-purple-400 font-bold">TAKER BUY / SELL ({asset})</div>
                <div className="text-sm font-black text-white mt-0.5">{data.skew.takerBuyBTC.toFixed(2)} / {data.skew.takerSellBTC.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer -- measured, not asserted */}
      <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-[10px] font-mono text-purple-300/70">
        <span className="flex items-center gap-1">
          <Activity className={`w-3 h-3 ${data && !error ? 'text-cyan-400' : 'text-rose-400'}`} />
          <span>{data ? `${data.source} · polled every ${POLL_MS / 1000}s` : 'NO DATA'}</span>
        </span>
        <span className={`font-bold ${error ? 'text-rose-400' : stale ? 'text-amber-400' : 'text-emerald-400'}`}>
          {error ? 'UNAVAILABLE' : data ? `fetch ${data.fetchMs}ms · last trade ${data.lastTradeAgeMs === null ? '--' : `${(data.lastTradeAgeMs / 1000).toFixed(1)}s`} ago · data age ${ageSec ?? '--'}s` : '--'}
        </span>
      </div>
    </div>
  );
};
