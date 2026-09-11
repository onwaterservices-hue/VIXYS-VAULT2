import React, { useEffect, useState } from 'react';
import {
  Compass,
  Sparkles,
  Lock,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart2,
  Layers,
  Activity,
  Radio,
  Eye,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  LineChart,
  Grid,
  Fish,
  AlertTriangle,
  History,
  Trophy,
  Bell,
  Star,
  BookOpen,
  MousePointer,
  Crosshair,
  ExternalLink,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { ModuleRenderProps } from '../../config/vixyLiveModules';
import { calculateCycleSecondsRemaining, formatCountdownMmSs } from '../../utils/cycleTime';
import { getReversalRiskAssessment } from '../../utils/reversalRisk';
import { lockQualityLabel, headline, lockStatusOf, lockStatusWord, lockStatusSentence } from '../../lib/engineSemantics';
import { useAssetMarketTape, formatUsdCompact } from '../../hooks/useAssetMarketTape';
import { fetchAllCryptoTickers, CryptoTickerData } from '../../services/api';

// ================= SHARED OBSERVED DATA =================
// Every card below reads the engine payload, the live Coinbase tape, real
// 1-minute candles, the lock ledger or live tickers. A missing value is a dash.

const posNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const finNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmtUsd = (v: number | null): string =>
  v === null ? '—' : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ageText = (ms: number): string => (ms < 1000 ? `${Math.round(ms)}ms` : ms < 120000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60000)}m`);
const clockText = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Engine spot first, then the live ticker. */
const spotOf = (canonical15m: any, ticker: any): number | null => posNum(canonical15m?.currentSpot) ?? posNum(ticker?.price);
/** The Kalshi open strike, or null. Never derived from spot. */
const strikeOf = (canonical15m: any): number | null => posNum(canonical15m?.openStrike);
const gateCheck = (canonical15m: any, id: string): any =>
  (Array.isArray(canonical15m?.lockGate?.checks) ? canonical15m.lockGate.checks : []).find((c: any) => c && c.id === id) ?? null;
const familiesOf = (canonical15m: any): Array<{ name: string; direction: string; detail: string }> =>
  (Array.isArray(canonical15m?.gemini?.evidenceFactors) ? canonical15m.gemini.evidenceFactors : [])
    .filter((f: any) => f && typeof f.name === 'string')
    .map((f: any) => ({ name: f.name, direction: String(f.direction ?? 'NEUTRAL'), detail: String(f.detail ?? '') }));

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

type FeedState = 'LOADING' | 'LIVE' | 'UNAVAILABLE';

interface MiniCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function useMinuteCandles(symbol = 'BTC'): { candles: MiniCandle[]; status: FeedState } {
  const [candles, setCandles] = useState<MiniCandle[]>([]);
  const [status, setStatus] = useState<FeedState>('LOADING');
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/crypto/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&_t=${Date.now()}`, { cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (!alive) return;
        const rows: MiniCandle[] = Array.isArray(data)
          ? data
              .map((d: any) => ({ time: Number(d?.time), open: Number(d?.open), high: Number(d?.high), low: Number(d?.low), close: Number(d?.close) }))
              .filter((c: MiniCandle) => [c.time, c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v)) && c.low > 0 && c.high >= c.low)
              .sort((a: MiniCandle, b: MiniCandle) => a.time - b.time)
          : [];
        if (rows.length >= 2) {
          setCandles(rows);
          setStatus('LIVE');
        } else {
          setStatus('UNAVAILABLE');
        }
      } catch {
        if (alive) setStatus('UNAVAILABLE');
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [symbol]);
  return { candles, status };
}

interface LedgerRow {
  id: string;
  intervalStart: string;
  direction: string;
  targetStrike: number | null;
  status: string;
  wasCorrect: boolean | null;
}

interface LedgerStats {
  wins: number;
  losses: number;
  total: number;
  winRatePct: number;
  avgBrier: number | null;
}

function useLockLedger(): { rows: LedgerRow[]; stats: LedgerStats | null; status: FeedState } {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [status, setStatus] = useState<FeedState>('LOADING');
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/signal/resolved-log?limit=8', { cache: 'no-store' });
        const body = res.ok ? await res.json() : null;
        if (!alive) return;
        if (!body) {
          setStatus('UNAVAILABLE');
          return;
        }
        setRows(
          (Array.isArray(body.recentResolved) ? body.recentResolved : [])
            .filter((r: any) => r && typeof r.id === 'string')
            .map((r: any) => ({
              id: r.id,
              intervalStart: String(r.intervalStart ?? ''),
              direction: String(r.direction ?? '—'),
              targetStrike: posNum(r.targetStrike),
              status: String(r.status ?? ''),
              wasCorrect: typeof r.wasCorrect === 'boolean' ? r.wasCorrect : null,
            })),
        );
        const btc = body?.stats?.perAsset?.BTC;
        setStats(
          btc && [btc.wins, btc.losses, btc.total, btc.winRatePct].every((v: unknown) => typeof v === 'number') && btc.total > 0
            ? { wins: btc.wins, losses: btc.losses, total: btc.total, winRatePct: btc.winRatePct, avgBrier: finNum(body?.stats?.avgBrierScore) }
            : null,
        );
        setStatus('LIVE');
      } catch {
        if (alive) setStatus('UNAVAILABLE');
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { rows, stats, status };
}

const outcomeOf = (r: LedgerRow): 'WIN' | 'LOSS' | 'NO TRADE' | 'PENDING' => {
  if (r.status === 'NO_TRADE') return 'NO TRADE';
  if (r.status === 'RESOLVED' && typeof r.wasCorrect === 'boolean') return r.wasCorrect ? 'WIN' : 'LOSS';
  return 'PENDING';
};

function useAllTickers(): { rows: CryptoTickerData[]; status: FeedState } {
  const [rows, setRows] = useState<CryptoTickerData[]>([]);
  const [status, setStatus] = useState<FeedState>('LOADING');
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchAllCryptoTickers();
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setRows(data);
          setStatus('LIVE');
        } else {
          setStatus('UNAVAILABLE');
        }
      } catch {
        if (alive) setStatus('UNAVAILABLE');
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return { rows, status };
}

const Footer: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-slate-300' }) => (
  <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between gap-2">
    <span>{label}</span>
    <span className={`${tone} font-bold text-right`}>{value}</span>
  </div>
);

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; right?: React.ReactNode }> = ({ icon, title, right }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300 shrink-0">{icon}</div>
      <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider truncate">{title}</span>
    </div>
    {right}
  </div>
);

// ================= CORE MODULES =================

export const Decision15mModule: React.FC<ModuleRenderProps> = ({ canonical15m, ticker }) => {
  const c: any = canonical15m as any;
  const direction: string | null = c?.direction === 'UP' || c?.direction === 'DOWN' || c?.direction === 'NEUTRAL' ? c.direction : null;
  const isUp = direction === 'UP';
  const isDown = direction === 'DOWN';
  const spotPrice = spotOf(c, ticker);
  const targetStrike = strikeOf(c);
  const strikeDelta = spotPrice !== null && targetStrike !== null ? spotPrice - targetStrike : null;
  const lock = lockStatusOf(c);
  const stateWord = lock.kind !== 'OPEN' ? lockStatusWord(lock) : String(c?.engineStage ?? c?.currentState ?? '—').replace(/_/g, ' ');

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Compass className="w-4 h-4" />}
        title="15M DECISION"
        right={
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
            isUp ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : isDown ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-purple-950 text-purple-300 border border-purple-800'
          }`}>
            {stateWord}
          </span>
        }
      />

      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
          isUp ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : isDown ? 'bg-rose-950/80 border-rose-500/50 text-rose-400' : 'bg-purple-950/80 border-purple-500/50 text-purple-300'
        }`}>
          {isUp ? <ArrowUpRight className="w-7 h-7" /> : isDown ? <ArrowDownRight className="w-7 h-7" /> : <Minus className="w-7 h-7" />}
        </div>
        <div>
          <div className={`text-2xl font-black font-sans tracking-tight ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-purple-300'}`}>
            {direction ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            STRIKE: <strong className="text-white">{targetStrike !== null ? fmtUsd(targetStrike) : 'pending'}</strong>
          </div>
        </div>
      </div>

      <Footer
        label="SPOT VS STRIKE"
        tone={strikeDelta === null ? 'text-slate-400' : strikeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        value={strikeDelta === null ? '—' : `${strikeDelta >= 0 ? '+' : '−'}${fmtUsd(Math.abs(strikeDelta))}`}
      />
    </div>
  );
};

export const Decision1mModule: React.FC<ModuleRenderProps> = () => {
  const { candles, status } = useMinuteCandles('BTC');
  const last = candles.length >= 2 ? candles[candles.length - 1] : null;
  const prev = candles.length >= 2 ? candles[candles.length - 2] : null;
  const moveBps = last && prev ? ((last.close - prev.close) / prev.close) * 10000 : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Zap className="w-4 h-4 text-amber-300" />}
        title="1M PRICE ACTION"
        right={<span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-900 text-slate-400 border border-slate-700">NO 1M MODEL</span>}
      />

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
          moveBps === null ? 'bg-slate-900 border-slate-700 text-slate-500' : moveBps >= 0 ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
        }`}>
          {moveBps === null ? <Minus className="w-5 h-5" /> : moveBps >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-xl font-bold font-mono text-white">{moveBps === null ? '—' : `${moveBps >= 0 ? '+' : '−'}${Math.abs(moveBps).toFixed(1)} bps`}</div>
          <div className="text-[11px] text-slate-400 font-mono">Last 1m close: <span className="text-slate-200 font-bold">{fmtUsd(last?.close ?? null)}</span></div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 font-sans">VIXY has no 1-minute model. This is the raw candle move, not a signal.</p>

      <Footer label="SOURCE" value={status === 'LIVE' ? '1-MINUTE CANDLES' : status === 'LOADING' ? 'LOADING' : 'UNAVAILABLE'} />
    </div>
  );
};

export const CalibrationConfidenceModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const c: any = canonical15m as any;
  const h = headline(c);
  const pct = typeof h.value === 'number' ? Math.max(0, Math.min(100, h.value)) : null;
  const agreement = gateCheck(c, 'AGREEMENT');
  const lock = lockStatusOf(c);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Sparkles className="w-4 h-4" />} title="CALIBRATION" right={<span className="text-purple-300 font-mono text-[10px] font-bold">{h.label}</span>} />

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black text-white font-mono">{h.kind === 'PWIN' ? `${h.value}%` : h.kind === 'ENGINE_SCORE' ? h.value : '—'}</span>
          <span className="text-xs font-bold text-slate-300 font-mono">{h.kind === 'ENGINE_SCORE' ? 'NOT A PROBABILITY' : h.word}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden border border-purple-900/50 mt-2">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 via-emerald-400 to-cyan-400" style={{ width: `${pct ?? 0}%` }} />
        </div>
      </div>

      <Footer
        label="EVIDENCE FAMILIES"
        value={lock.kind !== 'OPEN' ? lockStatusWord(lock) : agreement ? `${String(agreement.current)} agree (need ${agreement.required})` : '—'}
      />
    </div>
  );
};

export const LockQualityModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  // No invented 87 and no invented "98.4% RETENTION": the score is the engine's
  // or it is unavailable, the word comes from the shared semantics against the
  // real gate bar, and the footer shows the engine's own temporal stability.
  const c: any = canonical15m as any;
  const raw = c?.lockScore ?? c?.lockEvaluation?.lockScore ?? null;
  const lockQuality: number | null =
    typeof raw === 'number' && Number.isFinite(raw) ? (raw <= 10 ? Math.round(raw * 10) : Math.round(raw)) : null;
  const gateMin: number | null = typeof c?.lockGate?.minLockQuality === 'number' ? c.lockGate.minLockQuality : null;
  const stability: number | null = typeof c?.temporalStability === 'number' ? c.temporalStability : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Lock className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">LOCK QUALITY</span>
        </div>
        <span className="text-emerald-400 font-mono text-[10px] font-black">{lockQuality ?? '—'} / 100</span>
      </div>

      <div>
        <div className="text-xl font-black text-white font-sans">
          {lockQualityLabel(lockQuality, gateMin)}
        </div>
        <div className="w-full h-2 rounded-full bg-purple-950 overflow-hidden border border-purple-900/50 mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-emerald-400"
            style={{ width: `${Math.min(100, Math.max(0, lockQuality ?? 0))}%` }}
          />
        </div>
        {gateMin !== null && (
          <div className="text-[10px] text-slate-500 font-mono mt-1">Gate bar this tier: {gateMin}</div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>TEMPORAL STABILITY</span>
        <span className={stability !== null && stability >= 70 ? 'text-emerald-400 font-bold' : 'text-slate-300 font-bold'}>
          {stability !== null ? `${stability}%` : '—'}
        </span>
      </div>
    </div>
  );
};

export const ReversalRiskModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const c: any = canonical15m as any;
  const raw = finNum(c?.reversalRisk);
  const assessment = raw !== null ? getReversalRiskAssessment(raw) : null;
  const gate = gateCheck(c, 'REVERSAL');
  const lock = lockStatusOf(c);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<ShieldAlert className="w-4 h-4" />}
        title="REVERSAL RISK"
        right={
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${assessment ? assessment.badgeClass : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>
            {assessment ? assessment.statusLabel : 'NO DATA'}
          </span>
        }
      />

      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-black font-mono ${assessment ? assessment.colorClass : 'text-slate-500'}`}>{assessment ? `${assessment.score}%` : '—'}</span>
        <span className="text-xs font-bold text-slate-300 font-mono">{lock.kind === 'OPEN' ? 'PRE-LOCK' : lockStatusWord(lock)}</span>
      </div>

      <Footer label="LOCK GATE LIMIT" value={gate ? String(gate.required) : '—'} />
    </div>
  );
};

export const CycleStatusModule: React.FC<ModuleRenderProps> = ({ canonical15m, nowMs }) => {
  const currentNow = nowMs || Date.now();
  const secondsRemaining = calculateCycleSecondsRemaining(900, canonical15m?.cycleEnd, currentNow);
  const timeFormatted = formatCountdownMmSs(secondsRemaining);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Clock className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">CYCLE COUNTDOWN</span>
        </div>
        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
          15M INTERVAL
        </span>
      </div>

      <div>
        <div className="text-3xl font-black text-white font-mono tracking-tight">{timeFormatted}</div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          CURRENT STATE: <strong className="text-purple-300">{canonical15m.currentState || 'BUILDING'}</strong>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>CYCLE WINDOW</span>
        <span className="text-slate-300 font-bold">{canonical15m.timeframe || '15M'}</span>
      </div>
    </div>
  );
};

export const VixyProtectionModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const c: any = canonical15m as any;
  const p: any = c?.protection ?? null;
  const status: string | null =
    typeof p?.protectionStatus === 'string' ? p.protectionStatus : typeof c?.protectionStatus === 'string' ? c.protectionStatus : null;
  const preservation = finNum(p?.capitalPreservationScore ?? c?.capitalPreservationScore);
  const late = p?.lateCycleProtectionActive === true;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        title="VIXY PROTECTION"
        right={<span className="text-purple-300 font-mono text-[10px] font-bold">{status ?? '—'}</span>}
      />

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-lg font-bold text-white font-mono">{status ? status.replace(/_/g, ' ') : 'NO DATA'}</span>
        </div>
        <p className="text-[11px] text-slate-300 font-sans">
          {late ? 'Late-cycle protection is active.' : 'Guardian status as reported by the engine this tick.'}
        </p>
      </div>

      <Footer label="CAPITAL PRESERVATION SCORE" value={preservation !== null ? `${preservation}/100` : '—'} />
    </div>
  );
};

export const VixySignalModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const c: any = canonical15m as any;
  const lock = lockStatusOf(c);
  const h = headline(c);
  const strike = strikeOf(c);
  const direction: 'UP' | 'DOWN' | null = c?.direction === 'UP' || c?.direction === 'DOWN' ? c.direction : null;
  const shownSide = lock.kind === 'LOCKED' ? lock.direction ?? direction : direction;
  const tone = shownSide === 'UP' ? 'text-emerald-400' : shownSide === 'DOWN' ? 'text-rose-400' : 'text-slate-400';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Crosshair className="w-4 h-4 text-cyan-400" />}
        title="VIXY SIGNAL"
        right={<span className="text-cyan-400 font-mono text-[10px] font-bold">{lock.kind === 'OPEN' ? 'NOT LOCKED' : lockStatusWord(lock)}</span>}
      />

      <div>
        <div className={`text-2xl font-black font-mono ${tone}`}>
          {lock.kind === 'LOCKED' ? `${shownSide ?? ''} LOCK`.trim() : shownSide ? `${shownSide} BIAS` : 'NO BIAS'}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Kalshi strike: <strong className="text-white">{strike !== null ? fmtUsd(strike) : 'pending'}</strong>
        </div>
      </div>

      <Footer label={h.label} value={h.kind === 'PWIN' ? `${h.value}%` : h.kind === 'ENGINE_SCORE' ? `${h.value} (not a probability)` : '—'} />
    </div>
  );
};

// ================= MARKET MODULES =================

export const LivePriceModule: React.FC<ModuleRenderProps> = ({ canonical15m, ticker }) => {
  const tickerPrice = posNum(ticker?.price);
  const spotPrice = tickerPrice ?? posNum((canonical15m as any)?.currentSpot);
  const change = finNum(ticker?.change24h);
  const high = posNum(ticker?.high24h);
  const low = posNum(ticker?.low24h);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<DollarSign className="w-4 h-4" />}
        title="BTC / USD SPOT"
        right={<span className={`w-2 h-2 rounded-full ${spotPrice !== null ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />}
      />

      <div>
        <div className="text-2xl sm:text-3xl font-black text-white font-mono">{fmtUsd(spotPrice)}</div>
        <div className="flex items-center gap-2 mt-1">
          {change !== null && (
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              change >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}% (24h)
            </span>
          )}
          <span className="text-[10.5px] text-slate-400 font-mono">{tickerPrice !== null ? 'TICKER FEED' : spotPrice !== null ? 'ENGINE SPOT' : 'NO FEED'}</span>
        </div>
      </div>

      <Footer label="24H RANGE" value={high !== null && low !== null ? `${fmtUsd(low)} — ${fmtUsd(high)}` : '—'} />
    </div>
  );
};

export const PriceChangeModule: React.FC<ModuleRenderProps> = ({ ticker }) => {
  const change = finNum(ticker?.change24h);
  const high = posNum(ticker?.high24h);
  const low = posNum(ticker?.low24h);
  const rangePct = high !== null && low !== null ? ((high - low) / low) * 100 : null;
  const isUp = change !== null && change >= 0;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} title="PRICE CHANGE & RANGE" right={<span className="text-purple-300 font-mono text-[10px] font-bold">24H</span>} />

      <div>
        <div className={`text-3xl font-black font-mono ${change === null ? 'text-slate-500' : isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {change === null ? '—' : `${isUp ? '+' : ''}${change.toFixed(2)}%`}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          24h High: <strong className="text-slate-200">{fmtUsd(high)}</strong> • Low: <strong className="text-slate-200">{fmtUsd(low)}</strong>
        </div>
      </div>

      <Footer label="24H RANGE WIDTH" value={rangePct !== null ? `${rangePct.toFixed(2)}%` : '—'} />
    </div>
  );
};

export const CandlestickChartModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const { candles, status } = useMinuteCandles('BTC');
  const strike = strikeOf(canonical15m as any);
  const bars = candles.slice(-24);
  let lo = bars.length ? Math.min(...bars.map((b) => b.low)) : 0;
  let hi = bars.length ? Math.max(...bars.map((b) => b.high)) : 0;
  const strikeInView = strike !== null && bars.length > 0 && Math.abs(strike - (lo + hi) / 2) < Math.max(hi - lo, lo * 0.0005) * 2;
  if (strikeInView && strike !== null) {
    lo = Math.min(lo, strike);
    hi = Math.max(hi, strike);
  }
  const span = hi - lo || 1;
  const pctOf = (v: number) => ((v - lo) / span) * 100;
  const last = bars.length ? bars[bars.length - 1] : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<LineChart className="w-4 h-4 text-purple-300" />}
        title="CANDLESTICKS · 1M"
        right={
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
            {strike !== null ? `STRIKE ${fmtUsd(strike)}` : 'STRIKE PENDING'}
          </span>
        }
      />

      <div className="w-full h-24 sm:h-28 bg-[#090714] rounded-xl border border-purple-900/30 p-2 relative overflow-hidden">
        {bars.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[11px] font-mono text-slate-400">
            {status === 'LOADING' ? 'Loading 1-minute candles…' : 'Candle feed unavailable.'}
          </div>
        ) : (
          <div className="relative h-full flex items-stretch gap-[2px]">
            {strikeInView && strike !== null && (
              <div className="absolute left-0 right-0 border-b border-dashed border-cyan-400/60 z-10" style={{ bottom: `${pctOf(strike)}%` }} />
            )}
            {bars.map((b) => {
              const up = b.close >= b.open;
              const bodyLow = Math.min(b.open, b.close);
              const bodyHeight = Math.max(1.5, pctOf(Math.max(b.open, b.close)) - pctOf(bodyLow));
              return (
                <div key={b.time} className="relative flex-1 h-full">
                  <div className={`absolute left-1/2 -translate-x-1/2 w-px ${up ? 'bg-emerald-400/60' : 'bg-rose-400/60'}`} style={{ bottom: `${pctOf(b.low)}%`, height: `${Math.max(1, pctOf(b.high) - pctOf(b.low))}%` }} />
                  <div className={`absolute left-0 right-0 rounded-sm ${up ? 'bg-emerald-400' : 'bg-rose-500'}`} style={{ bottom: `${pctOf(bodyLow)}%`, height: `${bodyHeight}%` }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer label="LAST 1M CLOSE" value={fmtUsd(last?.close ?? null)} />
    </div>
  );
};

export const NeuralRibbonModule: React.FC<ModuleRenderProps> = () => {
  const { candles, status } = useMinuteCandles('BTC');
  const closes = candles.map((c) => c.close);
  const ready = closes.length >= 21;
  const fast = ready ? calcEma(closes, 9) : [];
  const slow = ready ? calcEma(closes, 21) : [];
  const gapBps = ready ? ((fast[fast.length - 1] - slow[slow.length - 1]) / slow[slow.length - 1]) * 10000 : null;
  let widthNow: number | null = null;
  let widthMedian: number | null = null;
  if (closes.length >= 20) {
    const widths: number[] = [];
    for (let i = 13; i < closes.length; i++) {
      const w = closes.slice(i - 13, i + 1);
      const mean = w.reduce((a, b) => a + b, 0) / 14;
      const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / 14);
      widths.push(((4 * sd) / mean) * 10000);
    }
    widthNow = widths[widths.length - 1];
    widthMedian = [...widths].sort((a, b) => a - b)[Math.floor(widths.length / 2)];
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Activity className="w-4 h-4 text-emerald-400" />}
        title="EMA RIBBON · 1M"
        right={<span className="text-cyan-400 font-mono text-[10px] font-bold">{widthNow !== null ? `BB WIDTH ${widthNow.toFixed(1)} BPS` : 'BB WIDTH —'}</span>}
      />

      <div className="space-y-2 py-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">EMA(9) − EMA(21):</span>
          <span className={`font-bold ${gapBps === null ? 'text-slate-500' : gapBps >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {gapBps === null ? (status === 'LOADING' ? 'loading…' : '—') : `${gapBps >= 0 ? '+' : '−'}${Math.abs(gapBps).toFixed(1)} bps`}
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>EMA(9) {ready ? fmtUsd(fast[fast.length - 1]) : '—'}</span>
          <span>EMA(21) {ready ? fmtUsd(slow[slow.length - 1]) : '—'}</span>
        </div>
      </div>

      <Footer
        label="SQUEEZE (≤60% OF MEDIAN WIDTH)"
        value={widthNow !== null && widthMedian !== null ? (widthNow <= 0.6 * widthMedian ? 'YES' : 'NO') : '—'}
      />
    </div>
  );
};

export const MomentumModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">MOMENTUM</span>
        </div>
        <span className="text-amber-400 font-mono text-[10px] font-bold">15S VELOCITY</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          {/* "+18.4", "RSI (14): 64.2" and the absorption sentence were literals. */}
          <span className="text-2xl font-black text-slate-500 font-mono">—</span>
          <span className="text-xs text-slate-400 font-mono">RSI: not computed</span>
        </div>
        <p className="text-[11px] text-slate-300 font-sans">
          Short-window momentum votes live inside the 15M engine (see the Prediction Center evidence panel); this module does not measure them separately.
        </p>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>ACCELERATION</span>
        <span className="text-slate-400 font-bold">NOT MEASURED HERE</span>
      </div>
    </div>
  );
};

export const TrendModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  // No invented 'TRENDING_BULL': the regime is the engine's or it is unavailable.
  const regime: string | null = typeof (canonical15m as any)?.regime === 'string' ? (canonical15m as any).regime : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">TREND & REGIME</span>
        </div>
        {/* Was "SUPERTREND"; no Supertrend indicator is computed. */}
        <span className="text-purple-300 font-mono text-[10px] font-bold">ENGINE</span>
      </div>

      <div className="space-y-1">
        <div className="text-xl font-black text-white font-mono uppercase">
          {regime ? regime.replace(/_/g, ' ') : 'REGIME UNAVAILABLE'}
        </div>
        {/* "EMA 9 > 21 > 50 stacked bullish" and "8.4 / 10 STRONG" were literals;
            no EMA stack or continuity score is computed anywhere. */}
        <p className="text-[11px] text-slate-300 font-sans">
          Regime as classified by the 15M engine this tick. No EMA stack is computed here.
        </p>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>TEMPORAL STABILITY</span>
        <span className="text-slate-300 font-bold">
          {typeof (canonical15m as any)?.temporalStability === 'number' ? `${(canonical15m as any).temporalStability}%` : '—'}
        </span>
      </div>
    </div>
  );
};

export const VolumeModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Layers className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">VOLUME & DEPTH</span>
        </div>
        <span className="text-purple-300 font-mono text-[10px] font-bold">LIQUIDITY</span>
      </div>

      {/* "$1.42B 24h turnover" and "$0.10 (TIGHT)" were literals. Real resting
          depth and spread are measured on the Whales tab from the Coinbase L2. */}
      <div>
        <div className="text-2xl font-black text-slate-500 font-mono">—</div>
        <div className="text-[11px] text-slate-300 font-sans mt-0.5">
          Volume and depth: not measured on this module
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>SOURCE</span>
        <span className="text-amber-300 font-bold">UNAVAILABLE — see Whales tab for live L2 depth</span>
      </div>
    </div>
  );
};

export const OrderFlowModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">ORDER FLOW DELTA</span>
        </div>
        <span className="text-cyan-400 font-mono text-[10px] font-bold">CROSS-VENUE</span>
      </div>

      {/* No cross-venue CVD is computed anywhere in this app. The previous
          "+$28.4M" and "64.8% BUY SIDE" were literals. Real taker flow lives on
          the whale tracker (/api/whales, /api/radar); until it is wired here this
          module says so instead of inventing a number. */}
      <div>
        <div className="text-2xl font-black text-slate-500 font-mono">—</div>
        <div className="text-[11px] text-slate-400 font-sans mt-0.5">
          Net taker delta: not measured on this module yet
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>SOURCE</span>
        <span className="text-amber-300 font-bold">UNAVAILABLE — see Whales tab for the live tape</span>
      </div>
    </div>
  );
};

export const VolatilityModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  // The engine publishes its regime and contradiction score; "$184.50 ATR" and
  // "4.1% EXPANDING" were literals with no source. Show what is real.
  const c: any = canonical15m as any;
  const regime: string | null = typeof c?.regime === 'string' ? c.regime : null;
  const contradiction: number | null = typeof c?.contradictionScore === 'number' ? c.contradictionScore : null;
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">VOLATILITY REGIME</span>
        </div>
        <span className="text-amber-400 font-mono text-[10px] font-bold">ENGINE</span>
      </div>

      <div>
        <div className="text-2xl font-black text-white font-mono">{regime ? regime.replace(/_/g, ' ') : '—'}</div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Regime as classified by the 15M engine this tick
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>CONTRADICTION SCORE</span>
        <span className={contradiction !== null && contradiction >= 40 ? 'text-amber-300 font-bold' : 'text-slate-300 font-bold'}>
          {contradiction !== null ? `${contradiction}/100` : '—'}
        </span>
      </div>
    </div>
  );
};

export const MarketRegimeModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Grid className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">MARKET REGIME</span>
        </div>
        <span className="text-purple-300 font-mono text-[10px] font-bold">
          {typeof (canonical15m as any)?.regime === 'string' ? String((canonical15m as any).regime).replace(/_/g, ' ') : '—'}
        </span>
      </div>

      {/* "BULL CONTINUATION", "EXPANSION DRIFT", "steady bid support across
          Coinbase and Binance" and "HIGH CONFIDENCE" were literals. The engine's
          regime and temporal stability are the real, published values. */}
      <div className="space-y-1">
        <div className="text-xl font-bold text-white font-sans">
          {typeof (canonical15m as any)?.regime === 'string' ? String((canonical15m as any).regime).replace(/_/g, ' ') : 'REGIME UNAVAILABLE'}
        </div>
        <p className="text-[11px] text-slate-300 font-sans">
          Classified by the 15M engine from price structure, VWAP and realized volatility. No order-book data is read here.
        </p>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>TEMPORAL STABILITY</span>
        <span className="text-slate-300 font-bold">
          {typeof (canonical15m as any)?.temporalStability === 'number' ? `${(canonical15m as any).temporalStability}%` : '—'}
        </span>
      </div>
    </div>
  );
};

export const DistanceToStrikeModule: React.FC<ModuleRenderProps> = ({ canonical15m, ticker }) => {
  const c: any = canonical15m as any;
  const spotPrice = spotOf(c, ticker);
  const targetStrike = strikeOf(c);
  const delta = spotPrice !== null && targetStrike !== null ? spotPrice - targetStrike : null;
  const distBps = delta !== null && targetStrike !== null ? (delta / targetStrike) * 10000 : null;
  const side = delta === null ? null : delta > 0 ? 'UP' : delta < 0 ? 'DOWN' : 'AT';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Crosshair className="w-4 h-4 text-cyan-400" />} title="DISTANCE TO STRIKE" right={<span className="text-cyan-400 font-mono text-[10px] font-bold">KALSHI STRIKE</span>} />

      <div>
        <div className={`text-3xl font-black font-mono ${delta === null ? 'text-slate-500' : delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta === null ? '—' : `${delta >= 0 ? '+' : '−'}${fmtUsd(Math.abs(delta))}`}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Strike: <strong className="text-white">{fmtUsd(targetStrike)}</strong> • Spot: <strong className="text-white">{fmtUsd(spotPrice)}</strong>
        </div>
      </div>

      <Footer
        label="SPOT IS"
        value={side === null || distBps === null ? '—' : side === 'AT' ? 'AT THE STRIKE' : `${side} SIDE · ${Math.abs(distBps).toFixed(1)} bps`}
      />
    </div>
  );
};

// ================= INTELLIGENCE MODULES =================

export const VixyReadModule: React.FC<ModuleRenderProps> = ({ canonical15m, localUpdatedAt, nowMs }) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">VIXY REASONING SYNTHESIS</span>
        </div>
        <span className="text-purple-300 font-mono text-[10px] font-bold">ENGINE SUMMARY</span>
      </div>

      {/* The fallback here was a fixed sentence ("Order book imbalance exhibits
          heavy ask depletion across Binance and Coinbase...") shown whenever the
          hypothesis was empty, which the server sends on every tick. No order
          book or venue depth is read. Show the engine's own summary, or say
          there is none. */}
      <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
        {canonical15m.gemini?.primaryHypothesis ||
          canonical15m.gemini?.reasoning ||
          "No engine summary for this tick."}
      </p>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex flex-wrap justify-between gap-2">
        <span>CONTRACT HASH: <strong className="text-slate-300">{canonical15m.contractId || canonical15m.decisionId}</strong></span>
        <span>LAST SYNC: <strong className="text-slate-300">{new Date(localUpdatedAt || nowMs).toLocaleTimeString()}</strong></span>
      </div>
    </div>
  );
};

export const SignalMatrixModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const c: any = canonical15m as any;
  const mtf = gateCheck(c, 'MTF');
  const family = familiesOf(c).find((f) => /multi-tf/i.test(f.name)) ?? null;
  const lock = lockStatusOf(c);
  const backs = family && (family.direction === 'UP' || family.direction === 'DOWN') ? family.direction : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Grid className="w-4 h-4 text-cyan-400" />} title="SIGNAL MATRIX" right={<span className="text-cyan-400 font-mono text-[10px] font-bold">MULTI-TIMEFRAME</span>} />

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-black text-white font-mono">{mtf ? String(mtf.current) : '—'}</span>
          <span className="text-[10px] font-mono text-slate-400">{mtf ? `timeframes aligned · need ${mtf.required}` : 'no gate data'}</span>
        </div>
        {family && (
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 truncate">{family.detail || family.name}</span>
            <span className={`font-bold ${backs === 'UP' ? 'text-emerald-400' : backs === 'DOWN' ? 'text-rose-400' : 'text-slate-500'}`}>{backs ? `BACKS ${backs}` : 'NO VOTE'}</span>
          </div>
        )}
        <p className="text-[10px] text-slate-500 font-sans">The engine publishes its aligned count, not each timeframe's vote.</p>
      </div>

      <Footer label="GATE" value={lock.kind !== 'OPEN' ? lockStatusWord(lock) : mtf ? (mtf.pass ? 'PASS' : 'NOT MET') : '—'} />
    </div>
  );
};

export const EvidenceAlignmentModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const c: any = canonical15m as any;
  const families = familiesOf(c);
  const backing = families.filter((f) => f.direction === 'UP' || f.direction === 'DOWN');
  const agreement = gateCheck(c, 'AGREEMENT');
  const lock = lockStatusOf(c);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Layers className="w-4 h-4 text-purple-300" />}
        title="EVIDENCE ALIGNMENT"
        right={<span className="text-emerald-400 font-mono text-[10px] font-bold">{families.length ? `${backing.length}/${families.length} BACK A SIDE` : '—'}</span>}
      />

      <div className="space-y-1.5">
        {families.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-sans">The engine has not reported evidence families this tick.</p>
        ) : (
          families.slice(0, 3).map((f) => {
            const backs = f.direction === 'UP' || f.direction === 'DOWN';
            return (
              <div key={f.name} className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 truncate">{f.name}</span>
                <span className={`font-bold ${f.direction === 'UP' ? 'text-emerald-400' : f.direction === 'DOWN' ? 'text-rose-400' : 'text-slate-500'}`}>
                  {backs ? `BACKS ${f.direction}` : 'NO VOTE'}
                </span>
              </div>
            );
          })
        )}
      </div>

      <Footer label="LOCK GATE" value={lock.kind !== 'OPEN' ? lockStatusWord(lock) : agreement ? `${String(agreement.current)} (need ${agreement.required})` : '—'} />
    </div>
  );
};

export const CrossVenueModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const m: any = (canonical15m as any)?.marketRead;
  const yes = m?.real === true && typeof m.kalshiImpliedYes === 'number' ? Math.round(m.kalshiImpliedYes * 100) : null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Sparkles className="w-4 h-4 text-cyan-400" />} title="PREDICTION MARKETS" right={<span className="text-cyan-400 font-mono text-[10px] font-bold">KALSHI</span>} />

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#0e0a22] border border-purple-900/30">
          <span className="text-xs font-bold text-slate-300 font-sans">KALSHI 15M</span>
          <span className="text-xs font-bold font-mono text-emerald-400">{yes !== null ? `YES ${yes}¢ • NO ${100 - yes}¢` : 'no fresh read'}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#0e0a22] border border-purple-900/30">
          <span className="text-xs font-bold text-slate-300 font-sans">POLYMARKET</span>
          <span className="text-xs font-bold font-mono text-slate-500">no feed</span>
        </div>
      </div>

      <Footer label="KALSHI READ AGE" value={yes !== null && typeof m?.ageMs === 'number' ? ageText(m.ageMs) : '—'} />
    </div>
  );
};

export const SentimentModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Eye className="w-4 h-4 text-purple-300" />} title="MARKET SENTIMENT" right={<span className="text-slate-400 font-mono text-[10px] font-bold">NOT MEASURED</span>} />

      <div>
        <div className="text-2xl font-black text-slate-500 font-mono">NO SENTIMENT FEED</div>
        <p className="text-[11px] text-slate-300 font-sans mt-0.5">
          VIXY does not read social sentiment or funding rates, so this card shows nothing rather than a guess.
        </p>
      </div>

      <Footer label="FUNDING RATE" value="NOT READ" tone="text-slate-400" />
    </div>
  );
};

export const WhaleActivityModule: React.FC<ModuleRenderProps> = () => {
  const { prints } = useAssetMarketTape('BTC');
  const live = prints.status === 'LIVE' && prints.takerBuyUSD !== null && prints.takerSellUSD !== null;
  const buy = prints.takerBuyUSD ?? 0;
  const sell = prints.takerSellUSD ?? 0;
  const net = buy - sell;
  const size = prints.thresholdUSD !== null && prints.thresholdUSD >= 1000 ? `$${Math.round(prints.thresholdUSD / 1000)}k+` : 'LARGE';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Fish className="w-4 h-4 text-cyan-400" />} title="WHALE ACTIVITY" right={<span className="text-cyan-400 font-mono text-[10px] font-bold">COINBASE · {size}</span>} />

      {live ? (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">Taker buy:</span>
            <span className="text-emerald-400 font-bold">{formatUsdCompact(buy)}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">Taker sell:</span>
            <span className="text-rose-400 font-bold">{formatUsdCompact(sell)}</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300">Trades scanned:</span>
            <span className="text-white font-bold">{prints.tradesScanned ?? '—'}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 font-sans">{prints.status === 'LOADING' ? 'Reading the Coinbase tape…' : 'Coinbase tape unavailable.'}</p>
      )}

      <Footer
        label="NET (LARGE PRINTS ONLY)"
        tone={!live || buy + sell === 0 ? 'text-slate-400' : net >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        value={!live ? '—' : buy + sell === 0 ? 'no large prints' : `${net >= 0 ? '+' : '−'}${formatUsdCompact(Math.abs(net))}`}
      />
    </div>
  );
};

export const EdgeScannerModule: React.FC<ModuleRenderProps> = () => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">EDGE SCANNER</span>
        </div>
        <span className="text-slate-400 font-mono text-[10px] font-bold">EDGE: —</span>
      </div>

      {/* Every figure this module showed was a literal: an edge, an R:R
          asymmetry, an "under-pricing by 7.2%" and an expected value. An edge
          exists only as (calibrated model probability − live market price) with
          both sides real and synchronized; the Kalshi implied price at t is not
          yet measured (see 15M_ENGINE_MASTER_MISSION.md, NEXT #2). Until then
          this module reports that honestly instead of inventing one. */}
      <div>
        <div className="text-2xl font-black text-slate-500 font-mono">NOT MEASURED</div>
        <p className="text-[11px] text-slate-300 font-sans mt-0.5">
          Edge vs. the prediction market needs a live market price alongside a calibrated model probability. Neither is displayed until both are real.
        </p>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>EXPECTED VALUE</span>
        <span className="text-slate-400 font-bold">UNAVAILABLE</span>
      </div>
    </div>
  );
};

export const PatternEngineModule: React.FC<ModuleRenderProps> = () => {
  const { candles, status } = useMinuteCandles('BTC');
  const n = candles.length;
  const closes = candles.map((c) => c.close);
  let emaWord = '—';
  if (n >= 21) {
    const fast = calcEma(closes, 9);
    const slow = calcEma(closes, 21);
    emaWord = fast[n - 1] >= slow[n - 1] ? 'ABOVE' : 'BELOW';
  }
  let breakWord = '—';
  if (n >= 8) {
    const bar = candles[n - 2];
    const prior = candles.slice(n - 8, n - 2);
    const priorHigh = Math.max(...prior.map((c) => c.high));
    const priorLow = Math.min(...prior.map((c) => c.low));
    breakWord = bar.close > priorHigh ? 'ABOVE PRIOR HIGHS' : bar.close < priorLow ? 'BELOW PRIOR LOWS' : 'INSIDE RANGE';
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Activity className="w-4 h-4 text-purple-300" />} title="PATTERN RULES · 1M" right={<span className="text-purple-300 font-mono text-[10px] font-bold">RULES, NOT PREDICTIONS</span>} />

      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">EMA(9) vs EMA(21):</span>
          <span className="text-white font-bold">{status === 'LOADING' && n === 0 ? 'loading…' : emaWord}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Last close vs prior 6 bars:</span>
          <span className="text-white font-bold">{breakWord}</span>
        </div>
      </div>

      <Footer label="WIN RATE" value="NOT MEASURED" tone="text-slate-400" />
    </div>
  );
};

// ================= SYSTEM MODULES =================

export const DataHealthModule: React.FC<ModuleRenderProps> = ({ canonical15m, dataHealthStatus, localUpdatedAt, nowMs }) => {
  const c: any = canonical15m as any;
  const fh: any = c?.feedHealth ?? null;
  const now = nowMs || Date.now();
  const tickAge = typeof c?.engineTickTs === 'number' && c.engineTickTs > 0 ? Math.max(0, now - c.engineTickTs) : null;
  const dataAge = finNum(fh?.dataAgeMs);
  const venuesLive = finNum(fh?.venuesLive);
  const venuesTotal = finNum(fh?.venuesTotal);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Database className="w-4 h-4 text-cyan-400" />}
        title="DATA HEALTH & FEED"
        right={
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
            dataHealthStatus === 'LIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
          }`}>
            {dataHealthStatus || 'CONNECTING'}
          </span>
        }
      />

      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">ENGINE TICK AGE:</span>
          <span className="text-white font-bold">{tickAge !== null ? ageText(tickAge) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">PRICE DATA AGE:</span>
          <span className="text-white font-bold">{dataAge !== null ? ageText(dataAge) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">VENUES FRESH:</span>
          <span className="text-white font-bold">{venuesLive !== null && venuesTotal !== null ? `${venuesLive}/${venuesTotal}` : '—'}</span>
        </div>
      </div>

      <Footer label="LAST PAYLOAD" value={localUpdatedAt ? new Date(localUpdatedAt).toLocaleTimeString() : '—'} />
    </div>
  );
};

export const LiveFeedModule: React.FC<ModuleRenderProps> = () => {
  const { prints } = useAssetMarketTape('BTC');
  const live = prints.status === 'LIVE';
  const size = prints.thresholdUSD !== null && prints.thresholdUSD >= 1000 ? `$${Math.round(prints.thresholdUSD / 1000)}k+` : 'large';

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Radio className={`w-4 h-4 text-emerald-400 ${live ? 'animate-pulse' : ''}`} />}
        title="LARGE PRINT TAPE"
        right={<span className="text-emerald-400 font-mono text-[9px] font-bold uppercase">{live ? 'COINBASE' : prints.status}</span>}
      />

      <div className="space-y-1.5">
        {!live ? (
          <p className="text-[11px] text-slate-400 font-sans">{prints.status === 'LOADING' ? 'Reading the Coinbase tape…' : 'Coinbase tape unavailable.'}</p>
        ) : prints.prints.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-sans">No {size} prints in the last {prints.tradesScanned ?? '—'} trades.</p>
        ) : (
          prints.prints.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10.5px] font-mono p-1.5 rounded-lg bg-[#0e0a22] border border-purple-900/30">
              <span className="text-slate-400">{p.time || '—'}</span>
              <span className={`font-bold ${p.takerSide === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>TAKER {p.takerSide}</span>
              <span className="text-white">{formatUsdCompact(p.sizeUSD)}</span>
            </div>
          ))
        )}
      </div>

      <Footer
        label="BUY / SELL (LARGE PRINTS)"
        value={live && prints.takerBuyUSD !== null && prints.takerSellUSD !== null ? `${formatUsdCompact(prints.takerBuyUSD)} / ${formatUsdCompact(prints.takerSellUSD)}` : '—'}
      />
    </div>
  );
};

export const TelemetryModule: React.FC<ModuleRenderProps> = ({ canonical15m, localUpdatedAt, nowMs }) => {
  const c: any = canonical15m as any;
  const now = nowMs || Date.now();
  const tickAge = typeof c?.engineTickTs === 'number' && c.engineTickTs > 0 ? Math.max(0, now - c.engineTickTs) : null;
  const gap = typeof c?.serverTimeMs === 'number' && localUpdatedAt ? localUpdatedAt - c.serverTimeMs : null;
  const stability = finNum(c?.temporalStability);

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<Sliders className="w-4 h-4 text-cyan-400" />}
        title="ENGINE TELEMETRY"
        right={<span className="text-cyan-400 font-mono text-[10px] font-bold">{String(c?.engineStage ?? '—').replace(/_/g, ' ')}</span>}
      />

      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-slate-400">Engine tick age:</span>
          <span className="text-white font-bold">{tickAge !== null ? ageText(tickAge) : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Server → browser gap:</span>
          <span className="text-white font-bold">{gap !== null ? `${Math.round(gap)}ms` : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Temporal stability:</span>
          <span className="text-white font-bold">{stability !== null ? `${stability}%` : '—'}</span>
        </div>
      </div>

      <Footer label="ENGINE SOURCE" value={typeof c?.serverSource === 'string' ? c.serverSource : '—'} />
    </div>
  );
};

export const CycleHistoryModule: React.FC<ModuleRenderProps> = () => {
  const { rows, stats, status } = useLockLedger();

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader
        icon={<History className="w-4 h-4 text-purple-300" />}
        title="CYCLE HISTORY"
        right={<span className="text-emerald-400 font-mono text-[10px] font-bold">{stats ? `${stats.wins}–${stats.losses} BTC` : status}</span>}
      />

      <div className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-sans">{status === 'LOADING' ? 'Loading the ledger…' : status === 'UNAVAILABLE' ? 'Ledger unavailable.' : 'No ledger entries yet.'}</p>
        ) : (
          rows.slice(0, 4).map((r) => {
            const outcome = outcomeOf(r);
            return (
              <div key={r.id} className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg bg-[#0e0a22] border border-purple-900/30">
                <span className="text-slate-400">{clockText(r.intervalStart)}</span>
                <span className="text-purple-300 font-bold">{r.direction}</span>
                <span className="text-white">{fmtUsd(r.targetStrike)}</span>
                <span className={`font-bold ${outcome === 'WIN' ? 'text-emerald-400' : outcome === 'LOSS' ? 'text-rose-400' : 'text-slate-400'}`}>{outcome}</span>
              </div>
            );
          })
        )}
      </div>

      <Footer label="GRADED BTC LOCKS" value={stats ? `${stats.winRatePct}% of ${stats.total}` : '—'} />
    </div>
  );
};

export const PerformanceModule: React.FC<ModuleRenderProps> = () => {
  const { stats, status } = useLockLedger();

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Trophy className="w-4 h-4 text-amber-400" />} title="PERFORMANCE" right={<span className="text-amber-400 font-mono text-[10px] font-bold">LEDGER</span>} />

      <div>
        <div className="text-3xl font-black text-emerald-400 font-mono">{stats ? `${stats.winRatePct}%` : '—'}</div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          {stats ? `${stats.wins}–${stats.losses} across ${stats.total} graded BTC locks` : status === 'LOADING' ? 'Loading the ledger…' : 'Ledger unavailable.'}
        </div>
      </div>

      <Footer label="AVG BRIER (GRADED LOCKS)" value={stats && stats.avgBrier !== null ? stats.avgBrier.toFixed(3) : '—'} />
    </div>
  );
};

export const AlertsModule: React.FC<ModuleRenderProps> = ({ canonical15m }) => {
  const lock = lockStatusOf(canonical15m as any);
  const { rows } = useLockLedger();
  const lastSettled = rows.find((r) => r.status === 'RESOLVED' || r.status === 'NO_TRADE') ?? null;

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Bell className="w-4 h-4 text-amber-400" />} title="LATEST EVENTS" right={<span className="text-purple-300 font-mono text-[10px] font-bold">FROM THE ENGINE</span>} />

      <div className="space-y-1.5">
        <div className="p-2 rounded-lg bg-[#0e0a22] border border-purple-900/30 flex items-start gap-2">
          <Lock className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 font-sans">{lock.kind === 'OPEN' ? 'No lock yet this cycle.' : lockStatusSentence(lock)}</div>
        </div>
        <div className="p-2 rounded-lg bg-[#0e0a22] border border-purple-900/30 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 font-sans">
            {lastSettled
              ? `Last settled cycle (${clockText(lastSettled.intervalStart)}): ${outcomeOf(lastSettled)}${lastSettled.direction === 'UP' || lastSettled.direction === 'DOWN' ? `, called ${lastSettled.direction}` : ''}.`
              : 'No settled cycle loaded yet.'}
          </div>
        </div>
      </div>

      <Footer label="PUSH ALERTS" value="SENT IN DISCORD" />
    </div>
  );
};

// ================= PERSONAL MODULES =================

export const WatchlistModule: React.FC<ModuleRenderProps> = () => {
  const { rows, status } = useAllTickers();
  const picks = ['BTC', 'ETH', 'SOL'].map((sym) => ({ sym, t: rows.find((r) => r.symbol === sym) ?? null }));

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <CardHeader icon={<Star className="w-4 h-4 text-amber-400" />} title="ASSET WATCHLIST" right={<span className="text-purple-300 font-mono text-[10px] font-bold">LIVE TICKERS</span>} />

      <div className="space-y-1.5">
        {picks.map(({ sym, t }) => {
          const price = posNum(t?.price);
          const change = finNum(t?.change24h);
          return (
            <div key={sym} className="flex items-center justify-between p-1.5 rounded-lg bg-[#0e0a22] border border-purple-900/30 text-xs font-mono">
              <span className="font-bold text-white">{sym}</span>
              <span className="text-slate-300">{fmtUsd(price)}</span>
              <span className={`font-bold ${change === null ? 'text-slate-500' : change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
              </span>
            </div>
          );
        })}
      </div>

      <Footer label="SOURCE" value={status === 'LIVE' ? 'LIVE TICKERS' : status === 'LOADING' ? 'LOADING' : 'UNAVAILABLE'} />
    </div>
  );
};

export const NotesModule: React.FC<ModuleRenderProps> = () => {
  const [note, setNote] = useState<string>(() => {
    return localStorage.getItem('vixy_live_desk_notes') || '';
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    localStorage.setItem('vixy_live_desk_notes', e.target.value);
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <BookOpen className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">DESK NOTES</span>
        </div>
        <span className="text-purple-400 font-mono text-[10px]">AUTOSAVED</span>
      </div>

      <textarea
        value={note}
        onChange={handleChange}
        placeholder="Type personal session notes, hypotheses, or reminders here..."
        className="w-full h-20 p-2 bg-[#090714] border border-purple-900/40 rounded-xl text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-purple-500/60"
      />

      <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-purple-900/30 flex justify-between">
        <span>PRIVATE NOTEBOOK</span>
        <span className="text-slate-400 font-bold">LOCAL PERSISTENCE</span>
      </div>
    </div>
  );
};

export const QuickActionsModule: React.FC<ModuleRenderProps> = ({ onOpenTerminal, onOpenReplay, onOpenPricing }) => {
  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 text-purple-300">
            <MousePointer className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">QUICK ACTIONS</span>
        </div>
        <span className="text-purple-300 font-mono text-[10px] font-bold">TERMINAL</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOpenTerminal}
          className="p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-800/40 text-left transition-all"
        >
          <div className="text-xs font-bold text-white font-mono">TERMINAL</div>
          <div className="text-[10px] text-purple-300 font-sans">Full view</div>
        </button>
        <button
          onClick={onOpenReplay}
          className="p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/70 border border-purple-800/40 text-left transition-all"
        >
          <div className="text-xs font-bold text-white font-mono">REPLAY</div>
          <div className="text-[10px] text-purple-300 font-sans">History sim</div>
        </button>
      </div>

      <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-purple-900/30 flex justify-between">
        <span>SHORTCUTS</span>
        <span className="text-slate-300 font-bold">TERMINAL & REPLAY</span>
      </div>
    </div>
  );
};

// ================= MODULE COMPONENT MAP =================

export const MODULE_COMPONENT_MAP: Record<string, React.FC<ModuleRenderProps>> = {
  // CORE
  '15m_decision': Decision15mModule,
  'current_signal': Decision15mModule, // legacy alias
  '1m_decision': Decision1mModule,
  'calibration': CalibrationConfidenceModule,
  'calibration_confidence': CalibrationConfidenceModule, // legacy alias
  'lock_quality': LockQualityModule,
  'reversal_risk': ReversalRiskModule,
  'cycle_status': CycleStatusModule,
  'vixy_protection': VixyProtectionModule,
  'vixy_signal': VixySignalModule,

  // MARKET
  'live_price': LivePriceModule,
  'price_change': PriceChangeModule,
  'candlestick_chart': CandlestickChartModule,
  'neural_ribbon': NeuralRibbonModule,
  'momentum': MomentumModule,
  'trend': TrendModule,
  'trend_regime': TrendModule, // legacy alias
  'volume': VolumeModule,
  'volume_depth': VolumeModule, // legacy alias
  'order_flow': OrderFlowModule,
  'volatility': VolatilityModule,
  'market_regime': MarketRegimeModule,
  'distance_to_strike': DistanceToStrikeModule,

  // INTELLIGENCE
  'vixy_read': VixyReadModule,
  'signal_matrix': SignalMatrixModule,
  'evidence_alignment': EvidenceAlignmentModule,
  'cross_venue': CrossVenueModule,
  'sentiment': SentimentModule,
  'whale_activity': WhaleActivityModule,
  'edge_scanner': EdgeScannerModule,
  'pattern_engine': PatternEngineModule,

  // SYSTEM
  'data_health': DataHealthModule,
  'live_feed': LiveFeedModule,
  'live_market_feed': LiveFeedModule, // legacy alias
  'telemetry': TelemetryModule,
  'cycle_history': CycleHistoryModule,
  'performance': PerformanceModule,
  'alerts': AlertsModule,

  // PERSONAL
  'watchlist': WatchlistModule,
  'notes': NotesModule,
  'quick_actions': QuickActionsModule
};
