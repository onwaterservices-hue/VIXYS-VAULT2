import React, { useState } from 'react';
import { Sliders, Sparkles, TrendingUp, ShieldAlert, ArrowRightLeft, Zap, ArrowRight, BarChart2, Layers, CheckCircle2 } from 'lucide-react';
import { ASSET_DATABASE, AssetConfig } from '../data/assetData';
import { AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import { headline, EngineDecisionLike } from '../lib/engineSemantics';
import { useAssetMarketTape, formatUsdCompact } from '../hooks/useAssetMarketTape';

interface CompareViewProps {
  onSelectAssetAndNavigate?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  userRole?: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
    onOpenDiscordModal?: () => void;
  /** Live Coinbase spot keyed by symbol, from App's all-tickers poll. */
  spotPrices?: Record<string, { price: number; change24h: number }>;
  /** The canonical BTC 15-minute decision. VIXY has no model for other assets. */
  engineDecision?: EngineDecisionLike;
  engineFeedHealth?: string | null;
}

export const CompareView: React.FC<CompareViewProps> = ({
  onSelectAssetAndNavigate,
  alertSettings,
    userRole = 'UNPAID',
  onOpenDiscordModal,
  spotPrices = {},
  engineDecision = null,
  engineFeedHealth = null,
}) => {
  const [assetA, setAssetA] = useState<string>('BTC');
  const [assetB, setAssetB] = useState<string>('ETH');

  const configA = ASSET_DATABASE[assetA] || ASSET_DATABASE.BTC;
  const configB = ASSET_DATABASE[assetB] || ASSET_DATABASE.ETH;

  const allAssets = Object.keys(ASSET_DATABASE);
  const isUserAdmin = userRole === 'ADMIN' || userRole === 'OWNER' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(userRole);
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified;

  // Quick preset pairs for fast switching
  const presetPairs = [
    { a: 'BTC', b: 'ETH', label: 'BTC vs ETH' },
    { a: 'ETH', b: 'SOL', label: 'ETH vs SOL' },
    { a: 'SOL', b: 'BTC', label: 'SOL vs BTC' },
    { a: 'BTC', b: 'SOL', label: 'BTC vs SOL' },
    { a: 'XRP', b: 'DOGE', label: 'XRP vs DOGE' },
  ];

  return (
    <div className="space-y-6 font-sans animate-fadeIn">
      {/* Top Header & Selectors */}
      <div className="vixy-card-elevated hud-corners p-6 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-widest mb-1.5">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Institutional Quantitative Split-Screen Analysis</span>
            </div>
            <h1 className="vixy-page-title text-white">
              Asset Compare Mode
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/70 mt-1 max-w-2xl">
              Two assets side by side: live Coinbase spot, resting book depth and large prints. VIXY's measured model covers BTC 15-minute only, so other assets show market data without a prediction.
            </p>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-bold mr-1">Presets:</span>
              {presetPairs.map((pair) => {
                const isActive = assetA === pair.a && assetB === pair.b;
                return (
                  <button
                    key={pair.label}
                    onClick={() => {
                      setAssetA(pair.a);
                      setAssetB(pair.b);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-purple-600/50 text-white border border-purple-400/50 shadow-md'
                        : 'bg-[#0a0518]/80 text-purple-300/80 hover:text-white border border-purple-900/40 hover:border-purple-500/40'
                    }`}
                  >
                    {pair.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Selectors & Swap Control */}
          <div className="flex items-center gap-3 bg-[#0a0518] p-3 rounded-2xl border border-purple-900/50 shrink-0">
            {/* Asset A Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono font-bold text-purple-300 uppercase mb-1">Asset A</label>
              <select
                value={assetA}
                onChange={(e) => setAssetA(e.target.value)}
                className="bg-[#0c0620] border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {allAssets.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} - {ASSET_DATABASE[sym].name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                const temp = assetA;
                setAssetA(assetB);
                setAssetB(temp);
              }}
              className="p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 hover:text-white transition-all mt-4 active:scale-95"
              title="Swap Asset A & Asset B"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            {/* Asset B Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono font-bold text-purple-300 uppercase mb-1">Asset B</label>
              <select
                value={assetB}
                onChange={(e) => setAssetB(e.target.value)}
                className="bg-[#0c0620] border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {allAssets.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym} - {ASSET_DATABASE[sym].name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* GATED COMPARISON GRID */}
      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenDiscordModal}
        title="ASSET COMPARE INTELLIGENCE LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock split-screen quantitative probability comparisons and order flow telemetry."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset A Column */}
        <AssetComparisonCard
                    config={configA}
          highlightColor="purple"
          spot={spotPrices[configA.symbol] ?? null}
          engineDecision={configA.symbol === 'BTC' ? engineDecision : null}
          engineFeedHealth={engineFeedHealth}
          onSelectAssetAndNavigate={onSelectAssetAndNavigate}
        />

        {/* Asset B Column */}
        <AssetComparisonCard
                    config={configB}
          highlightColor="emerald"
          spot={spotPrices[configB.symbol] ?? null}
          engineDecision={configB.symbol === 'BTC' ? engineDecision : null}
          engineFeedHealth={engineFeedHealth}
          onSelectAssetAndNavigate={onSelectAssetAndNavigate}
        />
      </div>
      </IntelligenceLockGate>
    </div>
  );
};

const AssetComparisonCard: React.FC<{
  config: AssetConfig;
  highlightColor: 'purple' | 'emerald';
  spot: { price: number; change24h: number } | null;
  engineDecision: EngineDecisionLike;
  engineFeedHealth: string | null;
  onSelectAssetAndNavigate?: (symbol: string) => void;
}> = ({ config, spot, engineDecision, engineFeedHealth, onSelectAssetAndNavigate }) => {
  // Every value on this card is either live (Coinbase spot, book, tape; the BTC
  // engine) or explicitly marked as not existing. The static asset table only
  // supplies the name, symbol and colour.
  const { book, prints } = useAssetMarketTape(config.symbol);
  const isBtc = config.symbol === 'BTC';
  const h = headline(engineDecision);
  const engineLive = isBtc && engineFeedHealth === 'LIVE' && h.kind !== 'NONE';
  const direction = String(engineDecision?.direction || '').toUpperCase();
  const price = spot && Number.isFinite(spot.price) && spot.price > 0 ? spot.price : null;
  const change = spot && Number.isFinite(spot.change24h) ? spot.change24h : null;

  return (
    <div className="vixy-card hud-corners p-6 space-y-6">
      {/* Card Header: live Coinbase spot only */}
      <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg"
            style={{ backgroundColor: config.color }}
          >
            {config.symbol.slice(0, 3)}
          </div>
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              {config.name} ({config.symbol})
            </h3>
            <span className="text-xs text-purple-300/80 font-mono font-bold tabular-nums">
              {price !== null
                ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: price < 1 ? 4 : 2 })}`
                : 'no live spot'}
            </span>
          </div>
        </div>

        <div className="text-right font-mono">
          {change !== null ? (
            <div className={`text-lg font-black tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)}%
            </div>
          ) : (
            <div className="text-lg font-black text-purple-300/40">—</div>
          )}
          <span className="vixy-section-title">24H · Coinbase</span>
        </div>
      </div>

      {/* VIXY model */}
      <div className="p-4 rounded-2xl bg-[#0a0518]/80 border border-purple-800/40 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            VIXY model
          </span>
          {engineLive ? (
            <span
              className={`vixy-badge ${
                direction === 'UP'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : direction === 'DOWN'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-purple-500/20 text-purple-200 border-purple-500/40'
              }`}
            >
              {direction || 'NO SIDE'} · BTC 15M
            </span>
          ) : (
            <span className="vixy-badge bg-purple-950/60 text-purple-300/70 border-purple-800/50">
              {isBtc ? 'ENGINE NOT LIVE' : 'NO MODEL'}
            </span>
          )}
        </div>

        {engineLive ? (
          <div className="hud-stat-card bg-[#0c0620] border border-purple-900/40">
            <div className="hud-stat-label">{h.label}</div>
            <div className="hud-stat-value hud-gradient-text">{h.value}%</div>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-purple-300/75 font-sans">
            {isBtc
              ? 'The 15-minute engine is not reporting live right now, so no model number is shown.'
              : `VIXY has no model for ${config.symbol}. Its measured model covers BTC 15-minute only, so this card shows market data without a prediction.`}
          </p>
        )}
      </div>

      {/* Resting book depth from Coinbase. Not aggressor flow. */}
      <div className="space-y-3 font-mono">
        <div className="text-xs font-bold text-purple-200 flex items-center justify-between">
          <span>Resting book depth</span>
          <span className="text-[10px] text-purple-400/80 font-bold">Coinbase · top 30 levels</span>
        </div>

        {book.status === 'LIVE' && book.bidSharePct !== null ? (
          <>
            <div className="w-full bg-[#0a0518] rounded-full h-2.5 overflow-hidden flex border border-purple-900/40">
              <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${book.bidSharePct}%` }} />
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${100 - book.bidSharePct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-bold tabular-nums">
              <span className="text-emerald-400">Bids {formatUsdCompact(book.bidUSD)} · {book.bidSharePct}%</span>
              <span className="text-rose-400">Asks {formatUsdCompact(book.askUSD)} · {100 - book.bidSharePct}%</span>
            </div>
            <p className="text-[10px] text-purple-300/60 font-sans">
              Resting orders can be pulled at any moment. This is not taker flow.
            </p>
          </>
        ) : (
          <p className="text-[11px] text-purple-300/60 font-sans">
            {book.status === 'LOADING' ? 'Reading the book…' : `Book depth unavailable for ${config.symbol}.`}
          </p>
        )}
      </div>

      {/* Large prints from the real Coinbase tape */}
      <div className="space-y-2 font-mono">
        <div className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center justify-between">
          <span>Large prints</span>
          {prints.status === 'LIVE' && (
            <span className="text-[10px] text-purple-400 font-bold normal-case tracking-normal">
              {prints.prints.length === 0 ? 'none' : `newest ${prints.prints.length}`} · {formatUsdCompact(prints.thresholdUSD)}+
            </span>
          )}
        </div>

        {prints.status === 'LIVE' &&
          prints.prints.map((pr) => (
            <div
              key={pr.id}
              className="p-3 rounded-xl bg-[#0a0518]/70 border border-purple-900/40 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-extrabold text-white tabular-nums">{formatUsdCompact(pr.sizeUSD)}</div>
                <div className="text-[10px] text-purple-300/70">Coinbase · {pr.time}</div>
              </div>
              <span
                className={`vixy-badge ${
                  pr.takerSide === 'BUY'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                TAKER {pr.takerSide}
              </span>
            </div>
          ))}

        {prints.status === 'LIVE' && prints.prints.length === 0 && (
          <p className="text-[11px] text-purple-300/60 font-sans">
            No prints of {formatUsdCompact(prints.thresholdUSD)} or more in the last {prints.tradesScanned ?? '—'} trades. An empty window is an honest window.
          </p>
        )}

        {prints.status !== 'LIVE' && (
          <p className="text-[11px] text-purple-300/60 font-sans">
            {prints.status === 'LOADING' ? 'Reading the tape…' : `Coinbase tape unavailable for ${config.symbol}.`}
          </p>
        )}
      </div>

      {/* Action Button: Analyze in Live Terminal */}
      {onSelectAssetAndNavigate && (
        <button
          onClick={() => onSelectAssetAndNavigate(config.symbol)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 border border-purple-400/40 active:scale-[0.98]"
        >
          <span>Analyze {config.symbol} in Live Terminal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
