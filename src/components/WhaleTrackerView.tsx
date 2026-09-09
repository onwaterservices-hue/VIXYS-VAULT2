import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShieldAlert,
  Zap,
  Filter,
  RefreshCw,
  Lock,
  Radio,
  ChevronRight
} from 'lucide-react';

import { AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';

// Every value on this page is an observed venue fact (Coinbase public tape and
// L2 book via /api/whales and /api/radar) or a labeled deterministic rule over
// observed facts. The previous version rendered an invented "institutional
// block stream" (fake entities including a real company name, fake venues,
// per-row "confidence", $64k-era strike walls, a hardcoded +$42.1M volume and
// a static 89% sentiment). None of that may return: if the venue is down, the
// page says the venue is down.

interface WhaleTrackerViewProps {
  onSelectAssetAndNavigate?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  userRole?: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  onOpenDiscordModal?: () => void;
}

interface WhaleOrder {
  id: string;
  asset: string;
  action: 'BUY_SWEEP' | 'SELL_DUMP';
  takerSide: 'BUY' | 'SELL';
  sizeUSD: number;
  price: number;
  contractPrice: string;
  venue: string;
  sizeTier: string;
  timestamp: number;
}

interface WhaleFeedStats {
  tradesScanned: number;
  thresholdUSD: number;
  takerBuyUSD: number;
  takerSellUSD: number;
  lastTradeAgeMs: number | null;
}

interface BookLevel {
  price: number;
  size: number;
  cumulative: number;
}

interface RadarBook {
  bids: BookLevel[];
  asks: BookLevel[];
  bestBid: number | null;
  bestAsk: number | null;
  spreadUSD: number | null;
  bidDepthBTC: number;
  askDepthBTC: number;
  ratio: number | null;
}

interface CycleContext {
  cycleId: string | null;
  currentState: string | null;
  currentSpot: number | null;
  openStrike: number | null;
  secondsRemaining: number | null;
}

const POLL_ASSETS = ['BTC', 'ETH', 'SOL'];
const POLL_MS = 5000;

const relTime = (ts: number): string => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export const WhaleTrackerView: React.FC<WhaleTrackerViewProps> = ({
  onSelectAssetAndNavigate,
  alertSettings,
  userRole = 'UNPAID',
  onOpenDiscordModal,
}) => {
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('ALL');
  const [minSizeFilter, setMinSizeFilter] = useState<number>(10000);
  const [orders, setOrders] = useState<WhaleOrder[]>([]);
  const [feedStats, setFeedStats] = useState<WhaleFeedStats | null>(null);
  const [feedState, setFeedState] = useState<'LOADING' | 'LIVE' | 'UNAVAILABLE'>('LOADING');
  const [book, setBook] = useState<RadarBook | null>(null);
  const [bookState, setBookState] = useState<'LOADING' | 'LIVE' | 'UNAVAILABLE'>('LOADING');
  const [cycle, setCycle] = useState<CycleContext | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('—');

  const isUserAdmin = userRole === 'ADMIN' || userRole === 'OWNER' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(String(userRole).toUpperCase());
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified;

  // Live prints from /api/whales (real Coinbase tape; 503 or empty is honest).
  useEffect(() => {
    if (!isLiveStreaming) return;
    let isSubscribed = true;

    const fetchWhaleData = async () => {
      const assets = selectedAssetFilter === 'ALL' ? POLL_ASSETS : [selectedAssetFilter];
      try {
        const results = await Promise.all(
          assets.map((a) =>
            fetch(`/api/whales?asset=${a}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ),
        );
        if (!isSubscribed) return;
        const ok = results.filter((r) => r && Array.isArray(r.orders));
        if (ok.length === 0) {
          setFeedState('UNAVAILABLE');
          setOrders([]);
          setFeedStats(null);
          return;
        }
        const merged: WhaleOrder[] = ok
          .flatMap((r) => r.orders)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 30);
        const stats: WhaleFeedStats = {
          tradesScanned: ok.reduce((s, r) => s + (r.tradesScanned || 0), 0),
          thresholdUSD: ok[0].thresholdUSD ?? 10000,
          takerBuyUSD: ok.reduce((s, r) => s + (r.takerBuyUSD || 0), 0),
          takerSellUSD: ok.reduce((s, r) => s + (r.takerSellUSD || 0), 0),
          lastTradeAgeMs: ok.reduce<number | null>(
            (m, r) => (r.lastTradeAgeMs === null || r.lastTradeAgeMs === undefined ? m : m === null ? r.lastTradeAgeMs : Math.min(m, r.lastTradeAgeMs)),
            null,
          ),
        };
        setOrders(merged);
        setFeedStats(stats);
        setFeedState('LIVE');
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        if (isSubscribed) setFeedState('UNAVAILABLE');
      }
    };

    // Resting L2 depth from /api/radar, and the live 15M cycle for context.
    const fetchBookAndCycle = async () => {
      const bookAsset = selectedAssetFilter === 'ALL' ? 'BTC' : selectedAssetFilter;
      try {
        const r = await fetch(`/api/radar?asset=${bookAsset}`);
        if (isSubscribed) {
          if (r.ok) {
            const j = await r.json();
            setBook(j.book || null);
            setBookState(j.book ? 'LIVE' : 'UNAVAILABLE');
          } else {
            setBook(null);
            setBookState('UNAVAILABLE');
          }
        }
      } catch {
        if (isSubscribed) setBookState('UNAVAILABLE');
      }
      try {
        const r = await fetch('/api/vixy/15m/current');
        if (isSubscribed && r.ok) {
          const j = await r.json();
          setCycle({
            cycleId: j.cycleId ?? null,
            currentState: j.currentState ?? null,
            currentSpot: j.currentSpot ?? null,
            openStrike: j.openStrike ?? null,
            secondsRemaining: j.secondsRemaining ?? null,
          });
        }
      } catch {
        /* cycle context is supplementary; the panel shows unavailable */
      }
    };

    fetchWhaleData();
    fetchBookAndCycle();
    const interval = setInterval(() => {
      fetchWhaleData();
      fetchBookAndCycle();
    }, POLL_MS);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isLiveStreaming, selectedAssetFilter]);

  const filteredOrders = orders.filter((o) => {
    const matchesAsset = selectedAssetFilter === 'ALL' || o.asset === selectedAssetFilter;
    const matchesSize = o.sizeUSD >= minSizeFilter;
    return matchesAsset && matchesSize;
  });

  // Sum over the prints currently in view — a window statistic, not a claim
  // about 24h volume (the old page added a hardcoded +$42.1M here).
  const visibleVolumeUSD = filteredOrders.reduce((sum, o) => sum + o.sizeUSD, 0);
  const takerTotal = (feedStats?.takerBuyUSD || 0) + (feedStats?.takerSellUSD || 0);
  const takerBuySharePct = takerTotal > 0 ? Math.round(((feedStats!.takerBuyUSD) / takerTotal) * 100) : null;
  const strikeDistance =
    cycle && cycle.currentSpot != null && cycle.openStrike != null && cycle.openStrike > 0
      ? cycle.currentSpot - cycle.openStrike
      : null;
  const strikeDistanceBps =
    strikeDistance !== null && cycle!.openStrike! > 0
      ? Math.round((strikeDistance / cycle!.openStrike!) * 10000 * 10) / 10
      : null;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* HEADER HERO BAR */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12072b] via-[#0b051b] to-[#170a38] border border-purple-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-mono font-bold">
              <Radio className={`w-3.5 h-3.5 ${feedState === 'LIVE' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span>COINBASE PUBLIC TAPE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className={feedState === 'LIVE' ? 'text-emerald-300' : 'text-amber-300'}>
                {feedState === 'LIVE' ? `POLLED EVERY ${POLL_MS / 1000}s` : feedState === 'LOADING' ? 'CONNECTING' : 'VENUE UNAVAILABLE'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Whale Order Flow & Liquidity Tracker
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
              Large prints from the real Coinbase tape and resting order-book depth, refreshed every few seconds. Every number here is observed from the venue — none is modelled or simulated.
            </p>
          </div>

          {/* Quick Metrics Pills — window statistics, labelled as such */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0a0518]/90 border border-purple-900/60 font-mono">
              <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Visible Prints Volume</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                {feedState === 'LIVE' ? `$${(visibleVolumeUSD / 1000000).toFixed(2)}M` : '—'}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0a0518]/90 border border-purple-900/60 font-mono">
              <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Taker Buy Share</span>
              <span className="text-base sm:text-lg font-black text-purple-200 flex items-center gap-1">
                {takerBuySharePct !== null ? `${takerBuySharePct}%` : '—'}
                <span className="text-purple-300/50 text-[9px] font-sans font-bold">of scanned prints ≥ ${((feedStats?.thresholdUSD ?? 10000) / 1000).toFixed(0)}k</span>
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[#0a0518]/90 border border-purple-900/60 font-mono">
              <span className="text-[10px] text-purple-300/60 uppercase font-bold block">Live Status</span>
              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-white hover:text-emerald-300 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {isLiveStreaming ? 'POLLING' : 'PAUSED'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL TOOLBAR */}
      <div className="p-4 rounded-2xl bg-[#0c0620]/90 border border-purple-900/40 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        {/* Asset Filter Pills — only assets with a real Coinbase feed */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-purple-300/60 font-bold uppercase text-[10px] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-purple-400" /> Asset:
          </span>
          {['ALL', 'BTC', 'ETH', 'SOL'].map((sym) => (
            <button
              key={sym}
              onClick={() => setSelectedAssetFilter(sym)}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all ${
                selectedAssetFilter === sym
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40'
                  : 'bg-[#0a0518] text-purple-300/70 hover:text-white hover:bg-purple-900/30 border border-purple-950'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Order Size Threshold */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0a0518] p-1 rounded-xl border border-purple-950">
            <span className="text-[10px] text-purple-300/60 uppercase font-bold px-2">Min Size:</span>
            {[
              { label: '$10k+', value: 10000 },
              { label: '$50k+', value: 50000 },
              { label: '$100k+', value: 100000 },
              { label: '$500k+', value: 500000 },
              { label: '$1M+', value: 1000000 },
            ].map((th) => (
              <button
                key={th.value}
                onClick={() => setMinSizeFilter(th.value)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  minSizeFilter === th.value
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-purple-300/70 hover:text-white'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-purple-300/50 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 text-purple-400 ${isLiveStreaming ? 'animate-spin' : ''}`} />
            <span>Updated: {lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* GATED MAIN CONTENT GRID */}
      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenDiscordModal}
        title="WHALE RADAR INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock the live Coinbase tape, large-print stream, and resting-depth walls."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1 & 2: LIVE PRINT STREAM */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-r from-[#170a33] via-[#0f0624] to-[#14082e] p-4 rounded-2xl border border-amber-500/50 space-y-2 font-mono text-xs shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300 flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4 text-amber-400" />
                VIXY ELITE WHALE TRADE PLAN
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                🔒 ELITE EXCLUSIVE
              </span>
            </div>
            <p className="text-purple-200/90 font-sans text-xs">
              Whale alerts deliver real-time large-print updates. Upgrade to <strong>VIXY ELITE AI</strong> for alerting on the full stream.
            </p>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-black text-white tracking-wide">
                Live Large-Print Stream
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 text-[10px] font-mono border border-purple-800/40">
                {filteredOrders.length} prints
              </span>
            </div>
            <span className="text-xs text-purple-300/60 font-mono">
              Coinbase tape · last {feedStats?.tradesScanned ?? '—'} trades scanned
            </span>
          </div>

          <div className="space-y-2.5">
            {feedState === 'UNAVAILABLE' ? (
              <div className="p-12 text-center rounded-2xl bg-[#0a0518] border border-amber-700/40 text-amber-300/90 font-mono text-xs">
                COINBASE UNAVAILABLE — no live tape to show. Nothing here is simulated; the stream resumes when the venue answers.
              </div>
            ) : feedState === 'LOADING' ? (
              <div className="p-12 text-center rounded-2xl bg-[#0a0518] border border-purple-900/30 text-purple-300/60 font-mono text-xs">
                Connecting to the Coinbase public tape…
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0a0518] border border-purple-900/30 text-purple-300/60 font-mono text-xs">
                No prints ≥ ${(minSizeFilter / 1000).toFixed(0)}k in the last {feedStats?.tradesScanned ?? 0} trades scanned. An empty window is an honest window.
              </div>
            ) : (
              filteredOrders.map((order, index) => {
                const isBuy = order.takerSide === 'BUY';
                const isLarge = order.sizeUSD >= 250000;
                return (
                  <div
                    key={`${order.id || 'wh'}-${index}`}
                    className={`p-4 rounded-2xl border transition-all duration-200 group hover:border-purple-500/60 ${
                      isLarge
                        ? 'bg-gradient-to-r from-[#170a33] via-[#0d0620] to-[#12072b] border-purple-500/50 shadow-lg shadow-purple-950/40'
                        : 'bg-[#0a0518] border-purple-900/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-800 to-purple-950 flex items-center justify-center text-white font-black font-mono shadow-md border border-purple-500/30 shrink-0">
                          {order.asset}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-white font-mono">
                              ${order.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-xl text-[10px] font-mono font-extrabold ${
                                isBuy
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              TAKER {order.takerSide}
                            </span>
                            <span className="text-[10px] font-mono text-purple-300/50">
                              via {order.venue}
                            </span>
                          </div>

                          <div className="text-xs text-purple-300/70 flex items-center gap-2">
                            <span className="text-[11px] text-purple-400 font-mono">{relTime(order.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-purple-900/30">
                        <div className="text-right">
                          <div className={`text-base font-black font-mono ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${(order.sizeUSD / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k
                          </div>
                          <div className="text-[10px] font-mono text-purple-300/60">
                            {order.sizeTier} print
                          </div>
                        </div>

                        {onSelectAssetAndNavigate && (
                          <button
                            onClick={() => onSelectAssetAndNavigate(order.asset)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1 active:scale-95"
                          >
                            <span>Align</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3: RESTING BOOK DEPTH + 15M CYCLE CONTEXT */}
        <div className="space-y-6">
          {/* RESTING BOOK DEPTH — real Coinbase L2. Resting depth is NOT
              aggressor flow and is never labelled defense or sentiment. */}
          <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  Resting Book Depth
                </h3>
              </div>
              <span className="text-[10px] text-purple-300/60 font-mono">
                Coinbase L2 · {selectedAssetFilter === 'ALL' ? 'BTC' : selectedAssetFilter}
              </span>
            </div>

            {bookState !== 'LIVE' || !book ? (
              <div className="p-6 text-center text-[11px] font-mono text-purple-300/60">
                {bookState === 'LOADING' ? 'Loading order book…' : 'BOOK UNAVAILABLE — Coinbase did not answer.'}
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-purple-300/70">
                    Spread: <strong className="text-white">{book.spreadUSD !== null ? `$${book.spreadUSD}` : '—'}</strong>
                  </span>
                  <span className="text-purple-300/70">
                    Bid/Ask depth (30 lvl): <strong className="text-emerald-400">{book.bidDepthBTC}</strong> / <strong className="text-rose-400">{book.askDepthBTC}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase font-bold text-emerald-400/80">Bids (resting)</div>
                    {book.bids.slice(0, 5).map((l, i) => (
                      <div key={i} className="flex justify-between p-1.5 rounded bg-emerald-950/30 border border-emerald-900/30">
                        <span className="text-emerald-300">${l.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-purple-200/80">{l.size.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase font-bold text-rose-400/80">Asks (resting)</div>
                    {book.asks.slice(0, 5).map((l, i) => (
                      <div key={i} className="flex justify-between p-1.5 rounded bg-rose-950/30 border border-rose-900/30">
                        <span className="text-rose-300">${l.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-purple-200/80">{l.size.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] text-purple-300/50 leading-relaxed font-sans">
                  Resting limit orders can be pulled at any moment. Depth is not aggressor flow and implies no directional "defense".
                </p>
              </div>
            )}
          </div>

          {/* 15M CYCLE CONTEXT — observation only; nothing here feeds the engine */}
          <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                  Live 15M Cycle Context
                </h3>
              </div>
              <span className="text-[10px] text-purple-300/60 font-mono">BTC · observation</span>
            </div>

            {!cycle || cycle.currentSpot === null ? (
              <div className="p-6 text-center text-[11px] font-mono text-purple-300/60">
                Cycle context unavailable.
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-purple-300/70">State</span>
                  <span className="font-black text-white">{cycle.currentState ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300/70">Spot</span>
                  <span className="font-black text-white">${cycle.currentSpot.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300/70">Cycle strike (open)</span>
                  <span className="font-black text-white">{cycle.openStrike ? `$${cycle.openStrike.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300/70">Distance from strike</span>
                  <span className={`font-black ${strikeDistance !== null && strikeDistance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {strikeDistance !== null ? `${strikeDistance >= 0 ? '+' : ''}$${strikeDistance.toFixed(2)} (${strikeDistanceBps} bps)` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300/70">Time remaining</span>
                  <span className="font-black text-white">
                    {cycle.secondsRemaining !== null ? `${Math.floor(cycle.secondsRemaining / 60)}:${String(cycle.secondsRemaining % 60).padStart(2, '0')}` : '—'}
                  </span>
                </div>
                <p className="text-[9px] text-purple-300/50 leading-relaxed font-sans pt-1">
                  Read-only view of the canonical 15M engine. The tape on this page does not feed the engine's decisions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </IntelligenceLockGate>
    </div>
  );
};
