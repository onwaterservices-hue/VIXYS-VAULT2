import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Info,
  Layers,
  Radar,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { BTCTicker, AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import { fetchVixyStateApi } from '../services/api';

// Pattern Detector -- the structure the BTC 15-minute engine actually detects.
//
// This page used to be a static catalog of ten "detected" patterns (Spoofing
// Detection, Whale Accumulation $1.2M+, Hidden Iceberg Limit, Short Squeeze
// Trap ...) each with an invented confidence, "HIST WIN RATE", "SEEN 480x",
// "detected 12m ago" and ACTIVE/CONFIRMED status, under a "LIVE L2 SCANNER"
// header claiming "30+ institutional patterns" and a "microsecond L2 order book
// detection engine". A scan counter started at 1420 and added 8 per click after
// a 600ms fake "SCANNING L2...". None of it was read from anything.
//
// Every detection below is one of the engine's deterministic structure rules,
// evaluated on observed BTC prices and served by /api/vixy/state as
// btc15mPipeline. No per-pattern win rate is recorded, so none is shown. Order
// flow fields are derived from spot vs strike and short-term momentum, not from
// an order book or trade tape, and are labelled that way.

interface AIPatternEngineProps {
  ticker?: BTCTicker;
  timeframe?: '15M' | '1H';
  appMode?: 'SIMPLE' | 'PRO';
  userRole?: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  alertSettings?: AlertSettings;
  onOpenDiscordModal?: () => void;
}

// ---- detection rules ----
type DetectionCategory = 'Bullish' | 'Bearish' | 'Structure' | 'Risk';

interface Detection {
  id: string;
  name: string;
  category: DetectionCategory;
  source: string;
  reading: string;
  explanation: string;
  derived?: boolean;
}

interface EnginePipeline {
  priceStructure?: {
    highLowStructure?: string;
    vwap?: number;
    vwapRelationship?: string;
    breakoutState?: string;
    localSupport?: number;
    localResistance?: number;
  };
  orderFlowAnalytics?: { absorptionState?: string; netDeltaBTC?: number };
  chopAnalytics?: { chopScore?: number; isChopFiltered?: boolean; directionFlips?: number; reason?: string | null };
  reversalAssessment?: { threatScore?: number; threatLevel?: string; vetoActive?: boolean; primaryTriggers?: string[] };
  multiTimeframeAlignment?: {
    tf15s?: string;
    tf30s?: string;
    tf1m?: string;
    tf5m?: string;
    tf15m?: string;
    alignedCount?: number;
    totalCount?: number;
    state?: string;
    momentumClassification?: string;
  };
  volatilityExpectedMove?: { realizedVol15mPct?: number; volatilityRegime?: string };
  evidenceAgreementCount?: number;
  totalEvidenceFamilies?: number;
  lockQuality?: number;
  lockQualityTier?: string;
}

function humanLabel(v?: string | null): string {
  return v ? v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}

function usdLabel(v?: number): string {
  return typeof v === 'number' && Number.isFinite(v) ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—';
}

export function detectionsFromPipeline(p: EnginePipeline | null | undefined): Detection[] {
  if (!p) return [];
  const out: Detection[] = [];
  const ps = p.priceStructure || {};
  const flowNote = 'Derived from spot vs strike and short-term momentum, not from an order book or trade tape.';

  if (ps.highLowStructure === 'HIGHER_HIGHS') {
    out.push({ id: 'higher-highs', name: 'Higher highs and higher lows', category: 'Bullish', source: 'Price structure • last 20 observed prices',
      reading: `support ${usdLabel(ps.localSupport)} • resistance ${usdLabel(ps.localResistance)}`,
      explanation: 'The newer half of the last 20 observed prices made both a higher high and a higher low than the older half, each by more than $3.' });
  } else if (ps.highLowStructure === 'LOWER_LOWS') {
    out.push({ id: 'lower-lows', name: 'Lower highs and lower lows', category: 'Bearish', source: 'Price structure • last 20 observed prices',
      reading: `support ${usdLabel(ps.localSupport)} • resistance ${usdLabel(ps.localResistance)}`,
      explanation: 'The newer half of the last 20 observed prices made both a lower high and a lower low than the older half, each by more than $3.' });
  } else if (ps.highLowStructure === 'COMPRESSED') {
    out.push({ id: 'compressed', name: 'Range compression', category: 'Structure', source: 'Price structure • last 20 observed prices',
      reading: `range ${usdLabel(ps.localSupport)} – ${usdLabel(ps.localResistance)}`,
      explanation: 'The last 20 observed prices sit inside a band narrower than $15.' });
  }

  if (ps.breakoutState === 'BREAKOUT_BULL') {
    out.push({ id: 'breakout-bull', name: 'Breakout at local resistance', category: 'Bullish', source: 'Price structure',
      reading: `spot within $2 of ${usdLabel(ps.localResistance)}`,
      explanation: 'While making higher highs, spot is within $2 of the highest of the last 20 observed prices.' });
  } else if (ps.breakoutState === 'BREAKOUT_BEAR') {
    out.push({ id: 'breakout-bear', name: 'Breakdown at local support', category: 'Bearish', source: 'Price structure',
      reading: `spot within $2 of ${usdLabel(ps.localSupport)}`,
      explanation: 'While making lower lows, spot is within $2 of the lowest of the last 20 observed prices.' });
  }

  if (ps.vwapRelationship === 'ABOVE_VWAP' || ps.vwapRelationship === 'BELOW_VWAP') {
    const above = ps.vwapRelationship === 'ABOVE_VWAP';
    out.push({ id: 'twap-side', name: above ? 'Above the cycle average' : 'Below the cycle average', category: above ? 'Bullish' : 'Bearish',
      source: 'Cycle TWAP (no volume feed)', reading: `average ${usdLabel(ps.vwap)}`,
      explanation: "Spot is more than $4 from the equal-weight average of this cycle's observed prices. There is no volume feed, so this is a time-weighted average, not a VWAP." });
  }

  const mtf = p.multiTimeframeAlignment || {};
  const votes = [mtf.tf15s, mtf.tf30s, mtf.tf1m, mtf.tf5m, mtf.tf15m];
  const bull = votes.filter((v) => v === 'BULLISH').length;
  const bear = votes.filter((v) => v === 'BEARISH').length;
  const voteLine = `15s ${humanLabel(mtf.tf15s)} • 30s ${humanLabel(mtf.tf30s)} • 1m ${humanLabel(mtf.tf1m)} • 5m ${humanLabel(mtf.tf5m)} • 15m ${humanLabel(mtf.tf15m)}`;
  if (bull >= 4) {
    out.push({ id: 'mtf-bull', name: 'Timeframes aligned up', category: 'Bullish', source: 'Momentum votes (15s–15m)', reading: `${bull}/5 bullish • ${voteLine}`,
      explanation: 'At least four of the five lookback windows show price above its level at the start of that window by more than the window threshold.' });
  } else if (bear >= 4) {
    out.push({ id: 'mtf-bear', name: 'Timeframes aligned down', category: 'Bearish', source: 'Momentum votes (15s–15m)', reading: `${bear}/5 bearish • ${voteLine}`,
      explanation: 'At least four of the five lookback windows show price below its level at the start of that window by more than the window threshold.' });
  } else if (mtf.state === 'CONFLICT') {
    out.push({ id: 'mtf-conflict', name: 'Timeframe conflict', category: 'Risk', source: 'Momentum votes (15s–15m)',
      reading: `${mtf.alignedCount ?? '—'}/${mtf.totalCount ?? 5} aligned • ${voteLine}`,
      explanation: 'Fewer than three lookback windows agree on a direction.' });
  }

  if (mtf.momentumClassification === 'ACCELERATING') {
    out.push({ id: 'mom-accel', name: 'Momentum accelerating', category: 'Structure', source: 'Momentum (15s vs 1m)', reading: 'short-term move outpacing the 1-minute move',
      explanation: 'The 15-second move is larger than the 1-minute move in the direction the engine is evaluating.' });
  } else if (mtf.momentumClassification === 'REVERSING') {
    out.push({ id: 'mom-reversing', name: 'Short-term momentum reversing', category: 'Risk', source: 'Momentum (15s vs 1m)', reading: '15-second move against the 1-minute move',
      explanation: 'The 15-second move points against the 1-minute move in the direction the engine is evaluating.' });
  } else if (mtf.momentumClassification === 'DECELERATING') {
    out.push({ id: 'mom-decel', name: 'Momentum decelerating', category: 'Structure', source: 'Momentum (15s vs 1m)', reading: '15-second move near zero',
      explanation: 'The 15-second move has flattened while a direction is still being evaluated.' });
  }

  const of = p.orderFlowAnalytics || {};
  if (of.absorptionState === 'ABSORBED') {
    out.push({ id: 'flow-absorbed', name: 'Absorption', category: 'Risk', source: 'Order-flow proxy', derived: true, reading: 'flow proxy against price move', explanation: flowNote });
  } else if (of.absorptionState === 'CONTINUING') {
    out.push({ id: 'flow-continuing', name: 'Flow continuation', category: 'Structure', source: 'Order-flow proxy', derived: true, reading: 'flow proxy with price move', explanation: flowNote });
  } else if (of.absorptionState === 'EXHAUSTING') {
    out.push({ id: 'flow-exhausting', name: 'Flow exhaustion', category: 'Risk', source: 'Order-flow proxy', derived: true, reading: 'flow proxy fading', explanation: flowNote });
  }

  const chop = p.chopAnalytics || {};
  if (chop.isChopFiltered) {
    out.push({ id: 'chop-filter', name: 'Chop filter active', category: 'Risk', source: 'Chop analytics',
      reading: `${humanLabel(chop.reason)} • score ${chop.chopScore ?? '—'}/100`,
      explanation: 'Chop score reached 50, or the regime read is CHOP. The engine will not lock while this is active.' });
  } else if (typeof chop.chopScore === 'number' && chop.chopScore >= 30) {
    out.push({ id: 'chop-elevated', name: 'Choppy conditions', category: 'Risk', source: 'Chop analytics',
      reading: `score ${chop.chopScore}/100 • ${chop.directionFlips ?? 0} direction flip(s)`,
      explanation: 'Direction flips, a price pinned near the strike, timeframe conflict or flat momentum have pushed the chop score to 30 or more.' });
  }

  const rev = p.reversalAssessment || {};
  if (rev.vetoActive || (typeof rev.threatScore === 'number' && rev.threatScore >= 30)) {
    out.push({ id: 'reversal', name: 'Reversal threat', category: 'Risk', source: 'Reversal assessment',
      reading: `${rev.threatScore ?? '—'}% (${humanLabel(rev.threatLevel)})${rev.primaryTriggers && rev.primaryTriggers.length ? ` • ${rev.primaryTriggers.map(humanLabel).join(', ')}` : ''}`,
      explanation: 'Threat combines timeframe disagreement, flow exhaustion, chop and cross-asset penalty. At 30% or more, or on a momentum reversal, the engine vetoes a lock.' });
  }

  const vol = p.volatilityExpectedMove || {};
  if (vol.volatilityRegime === 'EXTREME' || vol.volatilityRegime === 'EXPANDING') {
    out.push({ id: 'vol-high', name: vol.volatilityRegime === 'EXTREME' ? 'Extreme volatility' : 'Volatility expanding', category: 'Risk', source: 'Realized volatility',
      reading: `${typeof vol.realizedVol15mPct === 'number' ? vol.realizedVol15mPct.toFixed(2) : '—'}% realized`,
      explanation: 'Realized volatility of observed ticks is above the normal band.' });
  } else if (vol.volatilityRegime === 'COMPRESSED') {
    out.push({ id: 'vol-compressed', name: 'Volatility compressed', category: 'Structure', source: 'Realized volatility',
      reading: `${typeof vol.realizedVol15mPct === 'number' ? vol.realizedVol15mPct.toFixed(2) : '—'}% realized`,
      explanation: 'Realized volatility of observed ticks is below 0.6%.' });
  }

  return out;
}
// ---- end detection rules ----

type Filter = 'ALL' | DetectionCategory;

const CATEGORY_STYLE: Record<DetectionCategory, string> = {
  Bullish: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Bearish: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  Structure: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Risk: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export const AIPatternEngine: React.FC<AIPatternEngineProps> = ({
  userRole = 'UNPAID',
  alertSettings,
  onOpenDiscordModal,
}) => {
  const [pipeline, setPipeline] = useState<EnginePipeline | null>(null);
  const [marketTs, setMarketTs] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<Detection | null>(null);

  const isUnlocked = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(String(userRole).toUpperCase()) || Boolean(alertSettings?.discordLinked) || Boolean(alertSettings?.guildMember);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchVixyStateApi();
    setPipeline((data && data.btc15mPipeline) || null);
    setMarketTs(typeof data?.lastMarketUpdateTs === 'number' ? data.lastMarketUpdateTs : null);
    setLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [isUnlocked, load]);

  const detections = useMemo(() => detectionsFromPipeline(pipeline), [pipeline]);
  const count = (c: DetectionCategory) => detections.filter((d) => d.category === c).length;
  const visible = activeFilter === 'ALL' ? detections : detections.filter((d) => d.category === activeFilter);

  const filters: Array<[Filter, string]> = [
    ['ALL', `ALL (${detections.length})`],
    ['Bullish', `BULLISH (${count('Bullish')})`],
    ['Bearish', `BEARISH (${count('Bearish')})`],
    ['Structure', `STRUCTURE (${count('Structure')})`],
    ['Risk', `RISK (${count('Risk')})`],
  ];

  return (
    <IntelligenceLockGate
      isVerified={isUnlocked}
      isAdmin={userRole === 'ADMIN' || Boolean(alertSettings?.isAdmin)}
      userRole={userRole}
      onOpenDiscordModal={onOpenDiscordModal}
      title="PATTERN DETECTOR LOCKED"
      subtitle="Verify your VIXY Vault Discord membership to unlock the BTC 15-minute engine's live structure detections."
    >
      <div className="bg-[#0a0518] rounded-2xl border border-purple-900/50 p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100 font-sans relative overflow-hidden">
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-900/40 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 shrink-0">
              <Radar className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">PATTERN DETECTOR</h2>
                <span className="px-2 py-0.5 rounded-xl bg-purple-500/20 text-purple-200 text-[10px] font-extrabold border border-purple-500/30">
                  BTC 15-MINUTE ENGINE
                </span>
              </div>
              <p className="text-xs text-purple-300/70">
                Structure the engine detects right now from observed BTC prices. Rules are deterministic; no per-pattern win rate is recorded.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-purple-300/60">
              {marketTs ? `Market data ${new Date(marketTs).toISOString().slice(11, 19)}Z` : loaded ? 'No market timestamp' : 'Loading…'}
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-bold border border-purple-500/40 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0a0518] p-1.5 rounded-xl border border-purple-900/40 relative z-10">
          {filters.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                activeFilter === key ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-purple-300/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* DETECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
          {visible.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className="bg-[#0c0620] p-4 rounded-xl border border-purple-900/40 cursor-pointer space-y-2.5 hover:border-purple-400/80"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  {d.category === 'Bullish' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : d.category === 'Bearish' ? <TrendingDown className="w-4 h-4 text-rose-400" /> : d.category === 'Risk' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <Activity className="w-4 h-4 text-cyan-400" />}
                  {d.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${CATEGORY_STYLE[d.category]}`}>{d.category.toUpperCase()}</span>
              </div>
              <div className="text-[10px] font-mono text-purple-300/60 flex items-center gap-2">
                <Layers className="w-3 h-3" />
                {d.source}
                {d.derived && <span className="px-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">DERIVED</span>}
              </div>
              <p className="text-xs text-purple-100/90 font-mono">{d.reading}</p>
            </div>
          ))}
        </div>

        {loaded && detections.length === 0 && (
          <div className="bg-[#0c0620] p-4 rounded-xl border border-purple-900/40 text-xs font-mono text-purple-200 relative z-10">
            {pipeline ? 'No structural pattern is active right now.' : 'The engine state could not be read.'}
          </div>
        )}
        {loaded && pipeline && (
          <div className="text-[11px] font-mono text-purple-300/70 relative z-10">
            Evidence families agreeing: {pipeline.evidenceAgreementCount ?? '—'}/{pipeline.totalEvidenceFamilies ?? '—'} • lock quality {pipeline.lockQuality ?? '—'} ({humanLabel(pipeline.lockQualityTier)})
          </div>
        )}

        {/* DETAIL MODAL */}
        {selected && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0c0620] border border-purple-500/50 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 text-purple-100 relative">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 p-1 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-black text-white">{selected.name}</h3>
              <div className="bg-[#0a0518] p-3 rounded-xl border border-purple-900/50 space-y-2 text-xs">
                <div className="flex justify-between border-b border-purple-900/40 pb-2">
                  <span className="text-purple-300/60">Category</span>
                  <span className="font-bold">{selected.category}</span>
                </div>
                <div className="flex justify-between border-b border-purple-900/40 pb-2">
                  <span className="text-purple-300/60">Source</span>
                  <span className="font-bold">{selected.source}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-purple-300/60 shrink-0">Reading</span>
                  <span className="font-bold text-right">{selected.reading}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-purple-200">How it is measured</span>
                <p className="text-xs text-purple-200/90 leading-relaxed bg-[#0a0518] p-3 rounded-xl border border-purple-900/40">{selected.explanation}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="pt-2 border-t border-purple-900/40 flex items-start gap-1.5 text-[11px] text-purple-300/60">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Detections are the engine's deterministic structure rules on BTC 15-minute ticks. No order book or trade tape is read on this page.</span>
        </div>
      </div>
    </IntelligenceLockGate>
  );
};
