import React, { useEffect, useState } from 'react';
import { Target, ChevronRight, ShieldAlert } from 'lucide-react';
import { ASSET_DATABASE } from '../data/assetData';
import { fetchAllCryptoTickers, TickerSource, tickerSourceLabel } from '../services/api';
import { headline, headlineText, EngineDecisionLike } from '../lib/engineSemantics';

/**
 * VIXY VAULT - OPPORTUNITY SCANNER
 *
 * This page used to rank six assets from a hardcoded table: invented
 * confidences, an "expected edge", a "confluence" score and a buy or sell
 * bias for every asset, next to prices months out of date. None of it was
 * measured.
 *
 * VIXY ranks only what it measures, and today that is the BTC 15-minute
 * engine. BTC therefore shows the live engine readout. Every other asset shows
 * live spot (labelled with its venue) and is explicitly unranked until a model
 * exists for it.
 */

interface OpportunityScannerViewProps {
  onSelectAssetAndNavigate: (symbol: string) => void;
  /** The canonical BTC 15-minute decision. */
  engineDecision?: EngineDecisionLike;
  engineFeedHealth?: string | null;
}

const SCAN_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA'];

type SpotStatus = 'LOADING' | 'LIVE' | 'UNAVAILABLE';

export const OpportunityScannerView: React.FC<OpportunityScannerViewProps> = ({
  onSelectAssetAndNavigate,
  engineDecision = null,
  engineFeedHealth = null,
}) => {
  const [spot, setSpot] = useState<Record<string, { price: number; change24h: number; source?: TickerSource }>>({});
  const [spotStatus, setSpotStatus] = useState<SpotStatus>('LOADING');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const rows = await fetchAllCryptoTickers();
        if (!alive) return;
        const map: Record<string, { price: number; change24h: number; source?: TickerSource }> = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          if (r && Number.isFinite(r.price) && r.price > 0) {
            map[r.symbol] = { price: r.price, change24h: r.change24h, source: r.source };
          }
        });
        setSpot(map);
        setSpotStatus(Object.keys(map).length > 0 ? 'LIVE' : 'UNAVAILABLE');
      } catch {
        if (alive) setSpotStatus('UNAVAILABLE');
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const h = headline(engineDecision);
  const engineLive = engineFeedHealth === 'LIVE' && h.kind !== 'NONE';
  const direction = String(engineDecision?.direction || '').toUpperCase();

  const fmtPrice = (p?: number) =>
    p === undefined
      ? '—'
      : `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: p < 1 ? 4 : 2 })}`;

  return (
    <div className="space-y-6 font-sans text-slate-200">
      {/* Header */}
      <div className="bg-[#0a0518] rounded-2xl border border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1">
            <Target className="w-4 h-4 text-purple-400" />
            <span>Cross-Asset Scan</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Opportunity Scanner</h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5 max-w-2xl">
            VIXY ranks only what it measures. Today that is the BTC 15-minute engine. Other assets show live spot and stay unranked until a model exists for them.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-[#0c0620] text-purple-200 font-mono text-xs font-bold border border-purple-700/40 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${spotStatus === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          SPOT {spotStatus}
        </div>
      </div>

      {/* What this scanner does not have */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-100/90 leading-relaxed">
          <div className="font-mono font-black uppercase tracking-wider text-amber-300 text-[11px] mb-1">
            What this scanner does not have
          </div>
          There is no per-asset model for ETH, SOL, XRP, DOGE or ADA, and no measured edge against a market price for any of them. Earlier versions of this page showed a ranking with confidences, expected edges and a buy or sell bias for every asset. Those were fixed numbers, not measurements, and have been removed.
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
        {SCAN_SYMBOLS.map((sym) => {
          const cfg = ASSET_DATABASE[sym];
          const s = spot[sym];
          const isBtc = sym === 'BTC';
          return (
            <div
              key={sym}
              onClick={() => onSelectAssetAndNavigate(sym)}
              className="bg-[#0a0518] p-5 rounded-2xl border border-slate-800 hover:border-purple-500/60 cursor-pointer transition-all space-y-4 group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-white"
                    style={{ backgroundColor: cfg?.color || '#4c1d95' }}
                  >
                    {sym.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors">{sym}</h3>
                    <span className="text-[10px] text-slate-400">{cfg?.name || sym}</span>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                    isBtc && engineLive ? 'bg-purple-500/20 text-purple-200 border-purple-500/40' : 'bg-slate-800/60 text-slate-400 border-slate-700'
                  }`}
                >
                  {/* MEASURED only while the engine is actually publishing a number. */}
                  {isBtc ? (engineLive ? 'MEASURED · 15M' : 'ENGINE NOT LIVE') : 'UNRANKED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Spot · {tickerSourceLabel(s?.source)}</span>
                  <span className="text-lg font-black text-white tabular-nums">{fmtPrice(s?.price)}</span>
                  {s && Number.isFinite(s.change24h) && (
                    <span className={`block text-[10px] font-bold tabular-nums ${s.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s.change24h >= 0 ? '+' : ''}
                      {s.change24h.toFixed(2)}% 24h
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{isBtc && engineLive ? h.label : 'VIXY model'}</span>
                  {isBtc && engineLive ? (
                    <>
                      <span className="text-lg font-black text-white tabular-nums">{headlineText(h)}</span>
                      <span
                        className={`block text-[10px] font-bold ${
                          direction === 'UP' ? 'text-emerald-400' : direction === 'DOWN' ? 'text-rose-400' : 'text-purple-300'
                        }`}
                      >
                        {direction || 'NO SIDE'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold text-slate-500">{isBtc ? 'engine not live' : 'no model'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end text-xs pt-2 border-t border-slate-800/80">
                <span className="text-purple-300 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  OPEN DESK <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
