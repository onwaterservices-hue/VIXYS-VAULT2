import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  History,
  Lock,
  ShieldCheck,
  BrainCircuit,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY CENTER — real cycles from the real ledger.
//
// Every frame below is a recorded fact from /api/signal/resolved-log: the
// cycle's strike, the Layer-5 rule's would-lock (side, p, n, cell, Kalshi
// price at that moment), the engine's lock (side, confidence, spot, reason,
// policy, snapshot) or its skip reason, and the settlement. Nothing is
// simulated or interpolated; a value the engine did not record is shown as
// "not recorded". The previous version of this page replayed two scripted
// cycles with invented prices, taker deltas and "verified" wins.
// ─────────────────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string;
  cycleId?: string;
  intervalStart: string;
  intervalEnd?: string;
  status: string;
  direction?: string;
  decision?: string;
  confidence?: number | null;
  probability?: number | null;
  targetStrike?: number | null;
  spotAtLock?: number | null;
  lockedAt?: string | null;
  lockedReason?: string | null;
  lockPolicy?: string | null;
  lockRuleP?: number | null;
  lockRuleN?: number | null;
  lockRuleCell?: string | null;
  modelVersion?: string | null;
  qualificationReason?: string | null;
  settlementPrice?: number | null;
  settledSide?: 'UP' | 'DOWN' | null;
  actualOutcome?: string | null;
  outcome?: string | null;
  wasCorrect?: boolean | null;
  brierScore?: number | null;
  resolvedAt?: string | null;
  lockSnapshot?: {
    reversalThreat?: number | null;
    evidenceAgreement?: number | string | null;
    observationCount?: number | null;
    calibrationSamples?: number | null;
    dataAgeMs?: number | null;
    choppyReason?: string | null;
  } | null;
  shadowL5?: {
    recordedBy?: string;
    instances?: number;
    ticks?: number;
    wouldLock?: { atSec: number; side: 'UP' | 'DOWN'; p: number; n?: number | null; key?: string | null; kalshiYes?: number | null; strike?: number | null; spot?: number | null } | null;
    lastEval?: { atSec: number; p: number; side: string; key?: string } | null;
  } | null;
}

interface Frame {
  kind: 'OPEN' | 'RULE' | 'LOCK' | 'SKIP' | 'SETTLE';
  minute: number;
  timeStr: string;
  title: string;
  price: number | null;
  priceLabel: string;
  lines: string[];
  events: string[];
}

const fmt = (v: number | null | undefined, d = 2) =>
  typeof v === 'number' && Number.isFinite(v) ? `$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}` : 'not recorded';
const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const hhmm = (iso: string) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toISOString().slice(11, 16) + 'Z' : '—'; };

function settledSideOf(row: LedgerRow): 'UP' | 'DOWN' | null {
  if (row.actualOutcome === 'UP' || row.actualOutcome === 'DOWN') return row.actualOutcome;
  if (row.settledSide === 'UP' || row.settledSide === 'DOWN') return row.settledSide;
  const strike = typeof row.targetStrike === 'number' && row.targetStrike > 0 ? row.targetStrike : (row.shadowL5?.wouldLock?.strike ?? null);
  if (strike && typeof row.settlementPrice === 'number' && row.settlementPrice > 0) return row.settlementPrice >= strike ? 'UP' : 'DOWN';
  return null;
}

function buildFrames(row: LedgerRow): Frame[] {
  const frames: Frame[] = [];
  const startMs = Date.parse(row.intervalStart);
  const strike = typeof row.targetStrike === 'number' && row.targetStrike > 0 ? row.targetStrike : (row.shadowL5?.wouldLock?.strike ?? null);
  const settled = settledSideOf(row);
  const isLock = row.decision === 'BUY_UP' || row.decision === 'BUY_DOWN' || row.status === 'RESOLVED' || row.status === 'LOCKED';

  frames.push({
    kind: 'OPEN', minute: 0, timeStr: '00:00', title: 'CYCLE OPENS',
    price: strike, priceLabel: strike ? 'Kalshi strike (price to beat)' : 'strike',
    lines: [
      strike ? `Strike fixed at ${fmt(strike)} for the whole cycle.` : 'The strike was not recorded on this row (older skip rows carry 0).',
      'Observation floor: no lock is legal before 6:00.',
    ],
    events: [`Cycle ${row.cycleId || row.id} opened ${hhmm(row.intervalStart)}`],
  });

  const wl = row.shadowL5?.wouldLock;
  if (wl && (wl.side === 'UP' || wl.side === 'DOWN')) {
    const win = settled ? (wl.side === settled) : null;
    frames.push({
      kind: 'RULE', minute: wl.atSec / 60, timeStr: mmss(wl.atSec), title: `LAYER-5 RULE: ${wl.side} @ P ${(wl.p * 100).toFixed(1)}%`,
      price: wl.spot ?? null, priceLabel: 'spot when the rule fired',
      lines: [
        `Calibrated P(${wl.side} settles) = ${(wl.p * 100).toFixed(1)}%${typeof wl.n === 'number' ? ` from n=${wl.n} similar states` : ''}${wl.key ? ` · cell ${wl.key}` : ''}.`,
        typeof wl.kalshiYes === 'number' ? `Kalshi priced YES at ${(wl.kalshiYes * 100).toFixed(0)}¢ at that moment (${wl.side === 'UP' ? 'the side the rule took' : `the rule took DOWN at ${(100 - wl.kalshiYes * 100).toFixed(0)}¢`}).` : 'No fresh Kalshi read at that moment.',
        row.shadowL5?.recordedBy === 'SHADOW_L5_v2' ? `Observed across ${row.shadowL5?.instances ?? '?'} server instances (${row.shadowL5?.ticks ?? '?'} ticks).` : 'Recorded by a single instance (partial view).',
        win === null ? 'Not gradeable: no strike or settlement on this row.' : win ? 'Graded against settlement: the rule was RIGHT.' : 'Graded against settlement: the rule was WRONG.',
      ],
      events: [`Shadow would-lock ${wl.side} at ${mmss(wl.atSec)}`],
    });
  }

  if (isLock && row.lockedAt) {
    const lockSec = Math.max(0, (Date.parse(row.lockedAt) - startMs) / 1000);
    const snap = row.lockSnapshot || null;
    frames.push({
      kind: 'LOCK', minute: lockSec / 60, timeStr: mmss(lockSec), title: `ENGINE LOCK: ${row.direction} · ${typeof row.confidence === 'number' ? `${Math.round(row.confidence)}%` : '—'}`,
      price: row.spotAtLock ?? null, priceLabel: 'spot at lock',
      lines: [
        row.lockPolicy === 'STRIKE_SIDE_RULE'
          ? `Policy: strike-side rule decided (p=${row.lockRuleP ?? '—'}, n=${row.lockRuleN ?? '—'}, cell ${row.lockRuleCell ?? '—'}).`
          : `Policy: ${row.lockPolicy || 'engine gate'} · confidence is the engine score${typeof row.probability === 'number' ? `, probability ${row.probability}` : ''}.`,
        `Reason: ${row.lockedReason || 'not recorded'}.`,
        strike && typeof row.spotAtLock === 'number' ? `Lead at lock: ${fmt(Math.abs(row.spotAtLock - strike))} (${(Math.abs(row.spotAtLock - strike) / strike * 1e4).toFixed(1)} bps) ${row.spotAtLock >= strike ? 'above' : 'below'} the strike.` : 'Lead at lock: not computable (no strike).',
        snap ? `Snapshot: reversal threat ${snap.reversalThreat ?? '—'}%, evidence ${snap.evidenceAgreement ?? '—'}, observations ${snap.observationCount ?? '—'}, feed age ${snap.dataAgeMs ?? '—'} ms.` : 'Snapshot: not recorded.',
        `Model: ${row.modelVersion || 'not recorded'}.`,
      ],
      events: [`Immutable lock ${row.direction} committed ${hhmm(row.lockedAt)}`],
    });
  } else if (!isLock) {
    frames.push({
      kind: 'SKIP', minute: 13, timeStr: '13:00', title: 'ENGINE: NO LOCK (SKIP)',
      price: null, priceLabel: 'no entry',
      lines: [
        `Reason at close: ${row.qualificationReason || 'not recorded'}.`,
        'The entry window closes at 13:00; a cycle with no lock by then is a SKIP and counts neither as a win nor a loss.',
      ],
      events: ['Entry window closed without a lock'],
    });
  }

  const outcomeWord = isLock ? (row.wasCorrect === true ? 'WIN' : row.wasCorrect === false && (row.status === 'RESOLVED' || row.status === 'CRITICALLY_INVALIDATED') ? 'LOSS' : 'PENDING') : 'SKIP';
  frames.push({
    kind: 'SETTLE', minute: 15, timeStr: '15:00', title: `SETTLED: ${settled ?? 'not recorded'} · ${outcomeWord}`,
    price: row.settlementPrice ?? null, priceLabel: 'settlement price',
    lines: [
      settled && strike ? `Settled ${settled} — ${fmt(row.settlementPrice)} vs strike ${fmt(strike)} (${fmt(Math.abs((row.settlementPrice ?? 0) - strike))} margin).` : 'Settled side not recorded on this row.',
      isLock ? `Engine call ${row.direction}: ${outcomeWord}${typeof row.brierScore === 'number' ? ` · Brier ${row.brierScore}` : ''}.` : 'Engine made no call.',
      row.resolvedAt ? `Graded ${hhmm(row.resolvedAt)}.` : 'Grading time not recorded.',
    ],
    events: [isLock ? `Result ${outcomeWord}` : 'Skip recorded'],
  });

  return frames.sort((a, b) => a.minute - b.minute);
}

export const ReplayCenterView: React.FC = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2000);
  const [filter, setFilter] = useState<'ALL' | 'LOCKS' | 'SKIPS'>('ALL');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/signal/resolved-log?limit=200', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const list: LedgerRow[] = (j.recentResolved || []).filter((x: LedgerRow) => x && x.intervalStart && x.status !== 'LOCKED');
      list.sort((a, b) => Date.parse(b.intervalStart) - Date.parse(a.intervalStart));
      setRows(list);
      setLoadError(null);
    } catch (e) {
      setLoadError(String((e as Error)?.message || e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => rows.filter((r) => {
    const isLock = r.decision === 'BUY_UP' || r.decision === 'BUY_DOWN' || r.status === 'RESOLVED';
    return filter === 'ALL' ? true : filter === 'LOCKS' ? isLock : !isLock;
  }), [rows, filter]);
  const active = visible[selectedIdx] ?? visible[0] ?? null;
  const frames = useMemo(() => (active ? buildFrames(active) : []), [active]);
  const frame = frames[frameIdx] ?? frames[0] ?? null;

  useEffect(() => { setFrameIdx(0); setIsPlaying(false); }, [selectedIdx, filter]);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setFrameIdx((prev) => { if (prev >= frames.length - 1) { setIsPlaying(false); return prev; } return prev + 1; });
      }, playbackSpeed);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isPlaying, frames.length, playbackSpeed]);

  const tally = useMemo(() => {
    const locks = rows.filter((r) => r.status === 'RESOLVED');
    const wins = locks.filter((r) => r.wasCorrect === true).length;
    const rule = rows.filter((r) => r.shadowL5?.wouldLock);
    const ruleGraded = rule.filter((r) => settledSideOf(r) !== null);
    const ruleWins = ruleGraded.filter((r) => r.shadowL5!.wouldLock!.side === settledSideOf(r)).length;
    return { rows: rows.length, locks: locks.length, wins, skips: rows.length - locks.length, rule: rule.length, ruleGraded: ruleGraded.length, ruleWins };
  }, [rows]);

  const outcomeDot = (r: LedgerRow) => {
    const isLock = r.decision === 'BUY_UP' || r.decision === 'BUY_DOWN' || r.status === 'RESOLVED';
    if (!isLock) return 'bg-amber-400';
    return r.wasCorrect ? 'bg-emerald-400' : 'bg-rose-400';
  };

  return (
    <div className="space-y-6 font-sans text-slate-200 pb-12 select-none">
      {/* 1. HEADER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#12072e]/95 via-[#0b051b]/95 to-[#060212] border border-purple-800/50 shadow-2xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
            <History className="w-4 h-4 text-cyan-400" />
            <span>15-MINUTE CYCLE REPLAY · REAL LEDGER</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Replay real cycles, frame by frame</h1>
          <p className="text-xs text-purple-200/80 font-sans max-w-xl">
            Every frame is a fact the engine recorded: the strike, the Layer-5 rule's would-lock, the engine's lock or skip, and the settlement. Nothing is simulated; anything not recorded says so.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-200">
            {tally.rows} cycles · engine {tally.wins}/{tally.locks} · {tally.skips} skips
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#0d0722] border border-purple-900/40 text-purple-200" title="Layer-5 rule would-locks graded against the recorded settlement; ungradeable rows (no strike) excluded">
            rule {tally.ruleWins}/{tally.ruleGraded} graded of {tally.rule}
          </span>
          <div className="flex items-center p-1 rounded-xl bg-[#12072e] border border-purple-800/40">
            {(['ALL', 'LOCKS', 'SKIPS'] as const).map((f) => (
              <button key={f} onClick={() => { setFilter(f); setSelectedIdx(0); }} className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${filter === f ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-white'}`}>{f}</button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-xl bg-[#12072e] border border-purple-800/40 text-purple-300 hover:text-white cursor-pointer" title="Reload the ledger"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Ledger unavailable: {loadError}
        </div>
      )}

      {/* 2. CYCLE PICKER */}
      <div className="p-4 rounded-3xl bg-[#090418] border border-purple-800/50 shadow-2xl">
        <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 mb-2">Recorded cycles (newest first)</div>
        {loading && rows.length === 0 ? (
          <div className="text-xs font-mono text-purple-300/60">Loading the ledger…</div>
        ) : visible.length === 0 ? (
          <div className="text-xs font-mono text-purple-300/60">No recorded cycles match this filter.</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {visible.slice(0, 60).map((r, idx) => {
              const isLock = r.decision === 'BUY_UP' || r.decision === 'BUY_DOWN' || r.status === 'RESOLVED';
              const sel = idx === selectedIdx;
              return (
                <button key={r.id} onClick={() => setSelectedIdx(idx)} className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${sel ? 'bg-purple-600 text-white border-purple-400/60' : 'bg-[#0d0722] text-purple-300 hover:text-white border-purple-900/40'}`}>
                  <span className={`w-2 h-2 rounded-full ${outcomeDot(r)}`} />
                  <span className="font-mono">{hhmm(r.intervalStart)}</span>
                  <span className="text-[10px] opacity-80">{isLock ? `${r.direction} ${r.wasCorrect ? 'WIN' : 'LOSS'}` : 'SKIP'}</span>
                  {r.shadowL5?.wouldLock && <span className="text-[9px] px-1 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-400/30" title="Layer-5 rule would have locked">L5</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {active && frame && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#090418] border border-purple-800/50 shadow-2xl space-y-6">
          {/* 3. PLAYBACK */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-purple-900/40">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all active:scale-95 cursor-pointer" title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => { setFrameIdx(0); setIsPlaying(false); }} className="p-3 rounded-2xl bg-[#12072e] hover:bg-purple-950 text-purple-300 hover:text-white border border-purple-800/40 transition-all cursor-pointer" title="Restart">
                <RotateCcw className="w-5 h-5" />
              </button>
              <div>
                <div className="text-sm font-black text-white font-sans flex items-center gap-2">
                  <span>{active.cycleId || active.id}</span>
                  <span className="text-purple-400/60 font-normal text-xs">• {active.intervalStart.slice(0, 10)} {hhmm(active.intervalStart)}</span>
                </div>
                <div className="text-xs text-purple-300/70 font-mono">Frame {frameIdx + 1} of {frames.length} ({frame.timeStr} • {frame.title})</div>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="flex items-center p-1 rounded-xl bg-[#12072e] border border-purple-800/40">
                {[{ label: '1x', ms: 2500 }, { label: '2x', ms: 1200 }, { label: '4x', ms: 600 }].map((sp) => (
                  <button key={sp.label} onClick={() => setPlaybackSpeed(sp.ms)} className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${playbackSpeed === sp.ms ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-white'}`}>{sp.label}</button>
                ))}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-200 font-bold">
                T = <span className="text-emerald-400">{frame.timeStr}</span> / 15:00
              </div>
            </div>
          </div>

          {/* 4. FRAME STRIP */}
          <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(frames.length, 5)} gap-2.5 font-mono`}>
            {frames.map((f, idx) => {
              const isCurrent = idx === frameIdx;
              const isPast = idx < frameIdx;
              return (
                <button key={`${f.kind}-${idx}`} onClick={() => { setFrameIdx(idx); setIsPlaying(false); }} className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${isCurrent ? 'bg-purple-950/90 border-purple-400 ring-1 ring-purple-400/50' : isPast ? 'bg-[#100624]/90 border-purple-900/50 text-purple-300' : 'bg-[#090416]/60 border-purple-950/40 text-purple-600/70 hover:border-purple-800/40'}`}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold text-purple-400">{f.timeStr}</span>
                    {isCurrent ? <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> : isPast ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : null}
                  </div>
                  <div className="text-xs font-black text-white font-sans truncate">{f.title}</div>
                  <div className="text-[10px] mt-1 text-purple-400/70">{f.kind}</div>
                </button>
              );
            })}
          </div>

          {/* 5. FRAME CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider"><span>FRAME</span><span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-700/50">15M VIXY</span></div>
              <div className="text-xl font-black text-white font-sans">{frame.kind}</div>
              <div className="text-xs text-purple-300 pt-1">{frame.title}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-2 font-mono">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider"><span>{frame.priceLabel}</span></div>
              <div className="text-xl font-black text-white">{fmt(frame.price)}</div>
              <div className="flex items-center justify-between text-[11px] text-purple-300 pt-1"><span>Strike:</span><span className="text-white font-bold">{fmt(typeof active.targetStrike === 'number' && active.targetStrike > 0 ? active.targetStrike : active.shadowL5?.wouldLock?.strike ?? null)}</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider"><span>ENGINE</span><Lock className="w-3.5 h-3.5 text-purple-400" /></div>
              <div className="text-xl font-black text-white font-sans">{active.decision === 'BUY_UP' || active.decision === 'BUY_DOWN' ? `${active.direction} ${typeof active.confidence === 'number' ? Math.round(active.confidence) + '%' : ''}` : 'SKIP'}</div>
              <div className="text-[11px] text-purple-300/80 pt-1">{active.lockPolicy || (active.decision === 'SKIP' ? active.qualificationReason || 'no lock' : 'engine gate')}</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider"><span>LAYER-5 RULE</span><ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /></div>
              <div className="text-xl font-black text-white font-sans">{active.shadowL5?.wouldLock ? `${active.shadowL5.wouldLock.side} ${(active.shadowL5.wouldLock.p * 100).toFixed(1)}%` : 'no fire'}</div>
              <div className="text-[11px] text-purple-300/80 pt-1">{active.shadowL5?.wouldLock ? `at ${mmss(active.shadowL5.wouldLock.atSec)}${typeof active.shadowL5.wouldLock.n === 'number' ? ` · n=${active.shadowL5.wouldLock.n}` : ''}` : active.shadowL5 ? 'never reached the bar' : 'no shadow record'}</div>
            </div>
          </div>

          {/* 6. RECORDED DETAIL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                <div className="flex items-center gap-2 text-xs font-black text-white font-sans"><BrainCircuit className="w-4 h-4 text-purple-400" /><span>WHAT WAS RECORDED ({frame.timeStr})</span></div>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">LEDGER</span>
              </div>
              <ul className="space-y-1.5 text-xs text-purple-200/90 leading-relaxed font-sans">
                {frame.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" /><span>{l}</span></li>)}
              </ul>
              <div className="space-y-1 pt-1 font-sans">
                <div className="text-[10px] text-amber-300 font-bold">EVENTS:</div>
                {frame.events.map((evt, i) => <div key={i} className="flex items-center gap-2 text-xs text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /><span>{evt}</span></div>)}
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#12072e] border border-purple-800/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                <div className="flex items-center gap-2 text-xs font-black text-white font-sans"><Layers className="w-4 h-4 text-cyan-400" /><span>MARKET AT THE RULE'S FIRE</span></div>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0c0420] border border-purple-900/40"><span className="text-purple-300">Kalshi YES price</span><span className="text-white font-bold">{typeof active.shadowL5?.wouldLock?.kalshiYes === 'number' ? `${(active.shadowL5!.wouldLock!.kalshiYes! * 100).toFixed(0)}¢` : 'not recorded'}</span></div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0c0420] border border-purple-900/40"><span className="text-purple-300">Rule side / table P</span><span className="text-white font-bold">{active.shadowL5?.wouldLock ? `${active.shadowL5.wouldLock.side} · ${(active.shadowL5.wouldLock.p * 100).toFixed(1)}%` : 'not recorded'}</span></div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0c0420] border border-purple-900/40"><span className="text-purple-300">Table − market</span><span className="text-white font-bold">{active.shadowL5?.wouldLock && typeof active.shadowL5.wouldLock.kalshiYes === 'number' ? `${(((active.shadowL5.wouldLock.side === 'UP' ? active.shadowL5.wouldLock.p : 1 - active.shadowL5.wouldLock.p) - (active.shadowL5.wouldLock.side === 'UP' ? active.shadowL5.wouldLock.kalshiYes : 1 - active.shadowL5.wouldLock.kalshiYes)) * 100).toFixed(1)} pts` : 'not computable'}</span></div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0c0420] border border-purple-900/40"><span className="text-purple-300">Settled side</span><span className="text-white font-bold">{settledSideOf(active) ?? 'not recorded'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
