import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, Layers, RefreshCw, Radar, X, CheckCircle2, Info, Cpu } from 'lucide-react';
import { BTCTicker, AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import { useAssetMarketTape, formatUsdCompact, BookDepth, LargePrints } from '../hooks/useAssetMarketTape';

/**
 * Pattern Detector.
 *
 * Every card is a fixed, named rule evaluated against live data right now:
 *   - 1-minute candles from /api/crypto/klines (EMA cross, breakout,
 *     breakdown, Bollinger squeeze)
 *   - the Coinbase resting book, top 30 levels (bid-heavy / ask-heavy)
 *   - Coinbase large prints with a known aggressor (buy / sell skew)
 *
 * A rule is ACTIVE, INACTIVE, or NO DATA when its source is missing. No rule
 * carries a confidence, a win rate or a sighting count, because none of those
 * has been measured. The engine section shows the BTC 15-minute engine's own
 * evidence families from the live payload.
 */

interface AIPatternEngineProps {
  ticker?: BTCTicker;
  timeframe?: '15M' | '1H';
  appMode?: 'SIMPLE' | 'PRO';
  userRole?: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
  asset?: string;
  /** Live canonical 15M decision payload. BTC-only model. */
  engineDecision?: any;
  engineFeedHealth?: string | null;
}

type RuleCategory = 'Bullish' | 'Bearish' | 'Microstructure';
type RuleStatus = 'ACTIVE' | 'INACTIVE' | 'NO DATA';
type FeedStatus = 'LOADING' | 'LIVE' | 'UNAVAILABLE';

interface RuleResult {
  id: string;
  name: string;
  category: RuleCategory;
  source: string;
  definition: string;
  limits: string;
  status: RuleStatus;
  value: string;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CANDLE_POLL_MS = 15000;
const MIN_BARS = 22;

function calcEma(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] || 0;
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

function parseCandles(data: unknown): Candle[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((d: any) => ({
      time: Number(d?.time),
      open: Number(d?.open),
      high: Number(d?.high),
      low: Number(d?.low),
      close: Number(d?.close),
      volume: Number(d?.volume),
    }))
    .filter(
      (c) =>
        [c.time, c.open, c.high, c.low, c.close, c.volume].every((v) => Number.isFinite(v)) &&
        c.low > 0 &&
        c.high >= c.low
    )
    .sort((a, b) => a.time - b.time);
}

const bpsDiff = (a: number, b: number) => ((a - b) / b) * 10000;
const fmtBps = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} bps`;
const fmtPx = (v: number) =>
  v >= 1000
    ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : v >= 10
    ? `$${v.toFixed(2)}`
    : `$${v.toFixed(4)}`;

function evaluateRules(candles: Candle[], candleStatus: FeedStatus, book: BookDepth, prints: LargePrints): RuleResult[] {
  const n = candles.length;
  const barsNote =
    candleStatus === 'LOADING'
      ? 'Loading 1-minute candles…'
      : candleStatus === 'UNAVAILABLE' && n === 0
      ? 'Candle feed unavailable.'
      : `Needs ${MIN_BARS}+ 1-minute candles; have ${n}.`;

  const closes = candles.map((c) => c.close);
  let emaGap: number | null = null;
  if (n >= MIN_BARS) {
    const e9 = calcEma(closes, 9);
    const e21 = calcEma(closes, 21);
    emaGap = bpsDiff(e9[n - 1], e21[n - 1]);
  }

  // Evaluated on the last COMPLETED candle; the newest one is still forming.
  let brk: { close: number; priorHigh: number; priorLow: number } | null = null;
  if (n >= 8) {
    const bar = candles[n - 2];
    const prior = candles.slice(n - 8, n - 2);
    brk = {
      close: bar.close,
      priorHigh: Math.max(...prior.map((c) => c.high)),
      priorLow: Math.min(...prior.map((c) => c.low)),
    };
  }

  let squeeze: { width: number; median: number } | null = null;
  if (n >= MIN_BARS) {
    const widths: number[] = [];
    for (let i = 13; i < n; i++) {
      const s = closes.slice(i - 13, i + 1);
      const mean = s.reduce((a, b) => a + b, 0) / 14;
      const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / 14);
      widths.push(((4 * sd) / mean) * 10000);
    }
    const sorted = [...widths].sort((a, b) => a - b);
    squeeze = { width: widths[widths.length - 1], median: sorted[Math.floor(sorted.length / 2)] };
  }

  const bookLive = book.status === 'LIVE' && book.bidSharePct !== null;
  const share = book.bidSharePct ?? 0;
  const bookNote = book.status === 'LOADING' ? 'Reading the book…' : 'Book unavailable.';

  const printsLive = prints.status === 'LIVE' && prints.takerBuyUSD !== null && prints.takerSellUSD !== null;
  const buy = prints.takerBuyUSD ?? 0;
  const sell = prints.takerSellUSD ?? 0;
  const total = buy + sell;
  const buyShare = total > 0 ? (buy / total) * 100 : null;
  const printsNote = prints.status === 'LOADING' ? 'Reading the tape…' : 'Tape unavailable.';
  const noPrintsNote = `No large prints in the last ${prints.tradesScanned ?? '—'} trades.`;
  const printSize = prints.thresholdUSD !== null ? `${formatUsdCompact(prints.thresholdUSD)}+` : 'large';

  const candleSource = '1-minute candles';
  const bookSource = 'Coinbase book · top 30 levels';
  const printSource = 'Coinbase trades · large prints';

  return [
    {
      id: 'ema_bull',
      name: 'EMA 9 above EMA 21',
      category: 'Bullish',
      source: candleSource,
      definition: 'The 9-period EMA of 1-minute closes is above the 21-period EMA.',
      limits: 'Trend-following. It lags turns and flips often in a range.',
      status: emaGap === null ? 'NO DATA' : emaGap > 0 ? 'ACTIVE' : 'INACTIVE',
      value: emaGap === null ? barsNote : `EMA 9 − EMA 21: ${fmtBps(emaGap)}`,
    },
    {
      id: 'ema_bear',
      name: 'EMA 9 below EMA 21',
      category: 'Bearish',
      source: candleSource,
      definition: 'The 9-period EMA of 1-minute closes is below the 21-period EMA.',
      limits: 'Trend-following. It lags turns and flips often in a range.',
      status: emaGap === null ? 'NO DATA' : emaGap < 0 ? 'ACTIVE' : 'INACTIVE',
      value: emaGap === null ? barsNote : `EMA 9 − EMA 21: ${fmtBps(emaGap)}`,
    },
    {
      id: 'breakout',
      name: 'Close above the prior 6 highs',
      category: 'Bullish',
      source: candleSource,
      definition: 'The last completed 1-minute candle closed above the highest high of the six candles before it.',
      limits: 'One candle. Breakouts fail often, and nothing here measures how often.',
      status: brk === null ? 'NO DATA' : brk.close > brk.priorHigh ? 'ACTIVE' : 'INACTIVE',
      value: brk === null ? barsNote : `Close ${fmtPx(brk.close)} vs prior high ${fmtPx(brk.priorHigh)}`,
    },
    {
      id: 'breakdown',
      name: 'Close below the prior 6 lows',
      category: 'Bearish',
      source: candleSource,
      definition: 'The last completed 1-minute candle closed below the lowest low of the six candles before it.',
      limits: 'One candle. Breakdowns fail often, and nothing here measures how often.',
      status: brk === null ? 'NO DATA' : brk.close < brk.priorLow ? 'ACTIVE' : 'INACTIVE',
      value: brk === null ? barsNote : `Close ${fmtPx(brk.close)} vs prior low ${fmtPx(brk.priorLow)}`,
    },
    {
      id: 'squeeze',
      name: 'Bollinger squeeze',
      category: 'Microstructure',
      source: candleSource,
      definition: 'Bollinger band width (14, 2) is at or below 60% of its median over the candles on screen.',
      limits: 'Says volatility is compressed, not which way it resolves.',
      status: squeeze === null ? 'NO DATA' : squeeze.width <= 0.6 * squeeze.median ? 'ACTIVE' : 'INACTIVE',
      value: squeeze === null ? barsNote : `Width ${squeeze.width.toFixed(1)} bps vs median ${squeeze.median.toFixed(1)} bps`,
    },
    {
      id: 'bid_heavy',
      name: 'Bid-heavy resting book',
      category: 'Microstructure',
      source: bookSource,
      definition: 'Resting bids are at least 60% of the USD depth in the top 30 levels.',
      limits: 'Resting orders can be pulled at any time. This is not taker flow.',
      status: !bookLive ? 'NO DATA' : share >= 60 ? 'ACTIVE' : 'INACTIVE',
      value: bookLive ? `Bids ${share}% · ${formatUsdCompact(book.bidUSD)} vs asks ${formatUsdCompact(book.askUSD)}` : bookNote,
    },
    {
      id: 'ask_heavy',
      name: 'Ask-heavy resting book',
      category: 'Microstructure',
      source: bookSource,
      definition: 'Resting asks are at least 60% of the USD depth in the top 30 levels.',
      limits: 'Resting orders can be pulled at any time. This is not taker flow.',
      status: !bookLive ? 'NO DATA' : share <= 40 ? 'ACTIVE' : 'INACTIVE',
      value: bookLive ? `Asks ${100 - share}% · ${formatUsdCompact(book.askUSD)} vs bids ${formatUsdCompact(book.bidUSD)}` : bookNote,
    },
    {
      id: 'prints_buy',
      name: 'Large prints skewed to buyers',
      category: 'Bullish',
      source: printSource,
      definition: `Buyers were the aggressor on at least 65% of the USD in ${printSize} prints among recent trades.`,
      limits: 'Only large prints in a short trade window. Not total market flow.',
      status: !printsLive ? 'NO DATA' : buyShare !== null && buyShare >= 65 ? 'ACTIVE' : 'INACTIVE',
      value: !printsLive
        ? printsNote
        : buyShare === null
        ? noPrintsNote
        : `Buy ${formatUsdCompact(buy)} vs sell ${formatUsdCompact(sell)} (${Math.round(buyShare)}% buy)`,
    },
    {
      id: 'prints_sell',
      name: 'Large prints skewed to sellers',
      category: 'Bearish',
      source: printSource,
      definition: `Sellers were the aggressor on at least 65% of the USD in ${printSize} prints among recent trades.`,
      limits: 'Only large prints in a short trade window. Not total market flow.',
      status: !printsLive ? 'NO DATA' : buyShare !== null && 100 - buyShare >= 65 ? 'ACTIVE' : 'INACTIVE',
      value: !printsLive
        ? printsNote
        : buyShare === null
        ? noPrintsNote
        : `Sell ${formatUsdCompact(sell)} vs buy ${formatUsdCompact(buy)} (${Math.round(100 - buyShare)}% sell)`,
    },
  ];
}

const STATUS_STYLE: Record<RuleStatus, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  INACTIVE: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
  'NO DATA': 'bg-amber-500/15 text-amber-300 border-amber-500/40',
};

const CATEGORY_STYLE: Record<RuleCategory, string> = {
  Bullish: 'text-emerald-400',
  Bearish: 'text-rose-400',
  Microstructure: 'text-cyan-300',
};

export const AIPatternEngine: React.FC<AIPatternEngineProps> = ({
  userRole = 'UNPAID',
  alertSettings,
  onOpenDiscordModal,
  asset = 'BTC',
  engineDecision,
  engineFeedHealth,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'MICRO'>('ALL');
  const [selectedRule, setSelectedRule] = useState<RuleResult | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candleStatus, setCandleStatus] = useState<FeedStatus>('LOADING');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { book, prints } = useAssetMarketTape(asset);

  const isUnlocked = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(String(userRole).toUpperCase()) || Boolean(alertSettings?.discordLinked) || Boolean(alertSettings?.guildMember);

  useEffect(() => {
    setCandles([]);
    setCandleStatus('LOADING');
    setUpdatedAt(null);
  }, [asset]);

  useEffect(() => {
    let alive = true;
    const sym = encodeURIComponent(asset);
    const load = async () => {
      try {
        const res = await fetch(`/api/crypto/klines?symbol=${sym}&interval=1m&_t=${Date.now()}`, { cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (!alive) return;
        const parsed = parseCandles(data);
        if (parsed.length >= 2) {
          setCandles(parsed);
          setCandleStatus('LIVE');
          setUpdatedAt(Date.now());
        } else {
          setCandleStatus('UNAVAILABLE');
        }
      } catch {
        if (alive) setCandleStatus('UNAVAILABLE');
      } finally {
        if (alive) setIsRefreshing(false);
      }
    };
    load();
    const timer = setInterval(load, CANDLE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [asset, reloadKey]);

  const rules = useMemo(() => evaluateRules(candles, candleStatus, book, prints), [candles, candleStatus, book, prints]);

  const filteredRules = rules.filter((r) => {
    if (activeFilter === 'BULLISH') return r.category === 'Bullish';
    if (activeFilter === 'BEARISH') return r.category === 'Bearish';
    if (activeFilter === 'MICRO') return r.category === 'Microstructure';
    return true;
  });

  const countFor = (cat?: RuleCategory) => {
    const list = cat ? rules.filter((r) => r.category === cat) : rules;
    return { total: list.length, active: list.filter((r) => r.status === 'ACTIVE').length };
  };
  const all = countFor();
  const bull = countFor('Bullish');
  const bear = countFor('Bearish');
  const micro = countFor('Microstructure');

  // Engine evidence families (BTC 15-minute engine, LIVE only). A family backs
  // a side exactly when its bias is UP or DOWN; the server sets NEUTRAL when
  // the family's check does not pass, so agreement is read from the bias.
  const isBtc = asset.toUpperCase() === 'BTC';
  const engineLive = isBtc && engineFeedHealth === 'LIVE' && Boolean(engineDecision);
  const families: Array<{ id: string; name: string; direction: string; detail: string }> = engineLive && Array.isArray(engineDecision?.gemini?.evidenceFactors)
    ? engineDecision.gemini.evidenceFactors
        .filter((f: any) => f && typeof f.name === 'string')
        .map((f: any) => ({ id: String(f.id ?? f.name), name: f.name, direction: String(f.direction ?? 'NEUTRAL'), detail: String(f.detail ?? '') }))
    : [];
  const backing = families.filter((f) => f.direction === 'UP' || f.direction === 'DOWN');
  const backedSide = backing.length ? backing[0].direction : null;
  const feedWord = engineFeedHealth ? engineFeedHealth.toLowerCase().replace(/_/g, ' ') : 'not connected';

  const filterButton = (key: typeof activeFilter, label: string, c: { total: number; active: number }, activeCls: string, idleCls: string) => (
    <button
      onClick={() => setActiveFilter(key)}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${activeFilter === key ? activeCls : idleCls}`}
    >
      <span>{label}</span>
      <span className="text-[10px] bg-black/30 px-1 rounded">
        {c.active}/{c.total}
      </span>
    </button>
  );

  return (
    <IntelligenceLockGate
      isVerified={isUnlocked}
      isAdmin={userRole === 'ADMIN' || Boolean(alertSettings?.isAdmin)}
      userRole={userRole}
      onOpenDiscordModal={onOpenDiscordModal}
      title="PATTERN DETECTOR LOCKED"
      subtitle="Verify your VIXY Vault Discord membership to unlock live rule checks on candles, the order book and large prints."
    >
      <div className="bg-[#0a0518] rounded-2xl border border-purple-900/50 p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 font-sans relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-900/40 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 shrink-0">
              <Radar className={`w-6 h-6 text-purple-400 ${candleStatus === 'LIVE' ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">PATTERN DETECTOR · {asset}</h2>
                <span
                  className={`px-2 py-0.5 rounded-xl text-[10px] font-extrabold border ${
                    candleStatus === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : candleStatus === 'LOADING'
                      ? 'bg-purple-500/15 text-purple-200 border-purple-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {candleStatus === 'LIVE' ? 'LIVE RULE SCAN' : candleStatus === 'LOADING' ? 'CONNECTING' : 'CANDLES UNAVAILABLE'}
                </span>
              </div>
              <p className="text-xs text-purple-300/70">
                Fixed rules checked against live 1-minute candles, the Coinbase book and large prints. Rules, not predictions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="text-[11px] font-mono text-purple-300/60 hidden lg:block">
              {updatedAt ? `Candles updated ${new Date(updatedAt).toLocaleTimeString()}` : 'Waiting for candles'}
            </div>
            <button
              onClick={() => {
                setIsRefreshing(true);
                setReloadKey((k) => k + 1);
              }}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-bold transition-all border border-purple-500/40 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'REFRESHING…' : 'REFRESH'}</span>
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0518] p-1.5 rounded-xl border border-purple-900/40 relative z-10">
          <div className="flex flex-wrap items-center gap-1">
            {filterButton('ALL', 'ALL', all, 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black', 'text-purple-300/60 hover:text-white')}
            {filterButton('BULLISH', 'BULLISH', bull, 'bg-emerald-600 text-white shadow-md font-black', 'text-emerald-400/70 hover:text-emerald-300')}
            {filterButton('BEARISH', 'BEARISH', bear, 'bg-rose-600 text-white shadow-md font-black', 'text-rose-400/70 hover:text-rose-300')}
            {filterButton('MICRO', 'MICROSTRUCTURE', micro, 'bg-cyan-600 text-white shadow-md font-black', 'text-cyan-400/70 hover:text-cyan-300')}
          </div>
          <span className="text-[11px] font-mono text-purple-300/50 px-2 hidden sm:inline">Counts are active / total rules</span>
        </div>

        {/* RULE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setSelectedRule(rule)}
              className={`bg-[#0c0620] p-4 rounded-xl border transition-all duration-200 cursor-pointer space-y-3 hover:border-purple-400/80 hover:shadow-lg hover:shadow-purple-900/20 group relative overflow-hidden ${
                rule.status === 'ACTIVE' ? 'border-purple-500/60 vx-live-edge' : 'border-purple-900/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    {rule.category === 'Bullish' ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : rule.category === 'Bearish' ? (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    {rule.name}
                  </span>
                  <span className="text-[10px] font-mono text-purple-300/60 block mt-0.5">{rule.source}</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLE[rule.status]}`}>{rule.status}</span>
              </div>

              <p className="text-xs text-purple-100/90 leading-relaxed">{rule.definition}</p>

              <div className="text-[11px] font-mono bg-[#0a0518] px-2.5 py-1.5 rounded-xl border border-purple-900/40 text-cyan-200">{rule.value}</div>

              <div className="flex items-center justify-between pt-2 border-t border-purple-900/40 text-[10px] font-mono">
                <span className={`font-bold ${CATEGORY_STYLE[rule.category]}`}>{rule.category.toUpperCase()}</span>
                <span className="text-purple-300/50">Win rate: not measured</span>
              </div>
            </div>
          ))}
        </div>

        {/* ENGINE EVIDENCE FAMILIES */}
        <div className="bg-[#0c0620] p-4 rounded-xl border border-purple-900/40 space-y-3 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Engine evidence families · BTC 15M
            </span>
            {engineLive && families.length > 0 && (
              <span className="text-[10px] font-mono text-cyan-300">
                {backedSide ? `${backing.length}/${families.length} back ${backedSide}` : `0/${families.length} back a side`}
              </span>
            )}
          </div>

          {!isBtc ? (
            <p className="text-xs text-purple-200/80">The 15-minute engine covers BTC only, so there are no engine evidence families for {asset}.</p>
          ) : !engineLive ? (
            <p className="text-xs text-purple-200/80">The 15-minute engine feed is {feedWord}. Evidence families appear when it is live.</p>
          ) : families.length === 0 ? (
            <p className="text-xs text-purple-200/80">The engine has not reported evidence families this tick.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {families.map((f) => {
                const backs = f.direction === 'UP' || f.direction === 'DOWN';
                return (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[#0a0518] border border-purple-900/40 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{f.name}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                          f.direction === 'UP'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : f.direction === 'DOWN'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                        }`}
                      >
                        {backs ? `BACKS ${f.direction}` : 'NO VOTE'}
                      </span>
                    </div>
                    {f.detail && <p className="text-[10px] font-mono text-purple-300/60 leading-snug">{f.detail}</p>}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-purple-300/50">
            Each family is a fixed check inside the engine. It backs a side when its check passes for that side and shows no vote otherwise.
          </p>
        </div>

        {/* RULE DETAIL */}
        {selectedRule && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0c0620] border border-purple-500/50 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 text-purple-100 relative">
              <button
                onClick={() => setSelectedRule(null)}
                className="absolute top-4 right-4 p-1 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white">{selectedRule.name}</h3>
              </div>

              <div className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/50 space-y-2 text-xs">
                <div className="flex justify-between border-b border-purple-900/40 pb-2">
                  <span className="text-purple-300/60">Status now:</span>
                  <span className="font-black">{selectedRule.status}</span>
                </div>
                <div className="flex justify-between border-b border-purple-900/40 pb-2 gap-3">
                  <span className="text-purple-300/60 shrink-0">Measured:</span>
                  <span className="font-bold text-cyan-300 text-right">{selectedRule.value}</span>
                </div>
                <div className="flex justify-between border-b border-purple-900/40 pb-2">
                  <span className="text-purple-300/60">Source:</span>
                  <span className="font-bold">{selectedRule.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300/60">Win rate:</span>
                  <span className="font-bold text-purple-300/70">not measured</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-purple-200">Rule</span>
                <p className="text-xs text-purple-200/90 leading-relaxed bg-[#0a0518] p-3 rounded-xl border border-purple-900/40">{selectedRule.definition}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-purple-200">What it does not tell you</span>
                <p className="text-xs text-purple-200/90 leading-relaxed bg-[#0a0518] p-3 rounded-xl border border-purple-900/40">{selectedRule.limits}</p>
              </div>

              <button
                onClick={() => setSelectedRule(null)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="pt-2 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-purple-300/60">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fixed rules on live data. No rule here has a measured win rate.</span>
          </span>
          <span className="font-mono text-emerald-400/90 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {all.active} of {all.total} rules active
          </span>
        </div>
      </div>
    </IntelligenceLockGate>
  );
};
