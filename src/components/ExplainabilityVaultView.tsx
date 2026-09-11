import React, { useEffect, useState } from 'react';
import {
  BrainCircuit,
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Layers3,
  Clock,
  Gauge,
  Lock,
  Scale,
} from 'lucide-react';

import { AlertSettings } from '../types';
import { IntelligenceLockGate } from './IntelligenceLockGate';
import { headline, headlineText, lockStatusOf, lockStatusWord, lockStatusSentence } from '../lib/engineSemantics';

/**
 * Explainability Vault.
 *
 * Explains the one model VIXY runs, the BTC 15-minute engine, using only what
 * its live payload and the lock ledger contain:
 *   - the calibrated P(win) and the strike-side table cell behind it
 *   - the engine's evidence families and which side each one backs
 *   - the lock gate checks, with the failing ones listed as blockers
 *   - the per-tick conviction trail
 *   - recent ledger rows and the graded BTC record
 * Other assets are stated as having no model.
 */

interface ExplainabilityVaultViewProps {
  currentSymbol?: string;
  onSelectAsset?: (symbol: string) => void;
  alertSettings?: AlertSettings;
  userRole?: 'UNPAID' | 'PRO' | 'ELITE' | 'ADMIN' | 'OWNER' | string;
  onOpenDiscordModal?: () => void;
  /** Live canonical 15M decision payload. BTC-only model. */
  engineDecision?: any;
  engineFeedHealth?: string | null;
}

interface LedgerRow {
  id: string;
  intervalStart: string;
  direction: string;
  probability: number | null;
  targetStrike: number | null;
  settlementPrice: number | null;
  status: string;
  wasCorrect: boolean | null;
}

interface LedgerStats {
  wins: number;
  losses: number;
  total: number;
  winRatePct: number;
}

type TabId = 'evidence' | 'timeline' | 'calibration' | 'coverage';

const DIST_BINS: Array<[number, number | null]> = [[0, 3], [3, 6], [6, 10], [10, 15], [15, 25], [25, 40], [40, null]];

function reasonText(reason: unknown, n: unknown): string {
  const base = 'No matching history yet';
  const count = typeof n === 'number' ? n : 0;
  switch (reason) {
    case 'INSUFFICIENT_SAMPLE':
      return `${base}: ${count} of 30 cycles needed in this cell.`;
    case 'BEFORE_FIRST_CHECKPOINT':
      return `${base}: before the first checkpoint (60s).`;
    case 'NO_PRICE_OR_STRIKE':
      return `${base}: the strike is not resolved.`;
    case 'PARTIAL_CYCLE_RANGE':
      return `${base}: this server instance joined mid-cycle and is recovering the range.`;
    case 'AT_STRIKE':
      return `${base}: price is exactly at the strike.`;
    case 'NO_CYCLE_RANGE':
      return `${base}: no cycle range yet.`;
    case 'NO_DIST_BIN':
      return `${base}: distance is outside the table.`;
    default:
      return `${base}.`;
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const fmtUsd = (v: number | null) =>
  v !== null && v > 0 ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtCycleSec = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const outcomeOf = (r: LedgerRow): 'WIN' | 'LOSS' | 'NO TRADE' | 'PENDING' => {
  if (r.status === 'NO_TRADE') return 'NO TRADE';
  if (r.status === 'RESOLVED' && typeof r.wasCorrect === 'boolean') return r.wasCorrect ? 'WIN' : 'LOSS';
  return 'PENDING';
};

export const ExplainabilityVaultView: React.FC<ExplainabilityVaultViewProps> = ({
  currentSymbol = 'BTC',
  onSelectAsset,
  alertSettings,
  userRole = 'UNPAID',
  onOpenDiscordModal,
  engineDecision,
  engineFeedHealth,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string>(currentSymbol);
  const [activeTab, setActiveTab] = useState<TabId>('evidence');
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerStats, setLedgerStats] = useState<LedgerStats | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState<'LOADING' | 'LIVE' | 'UNAVAILABLE'>('LOADING');

  useEffect(() => {
    setSelectedAsset(currentSymbol);
  }, [currentSymbol]);

  const isUserAdmin = userRole === 'ADMIN' || userRole === 'OWNER' || Boolean(alertSettings?.isAdmin);
  const isPaidUser = ['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(userRole);
  const isDiscordVerified = Boolean(alertSettings?.discordLinked && alertSettings?.guildMember);
  const isIntelligenceUnlocked = isUserAdmin || isPaidUser || isDiscordVerified;

  // Lock ledger: recent rows and the graded BTC record.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/signal/resolved-log?limit=20', { cache: 'no-store' });
        const body = res.ok ? await res.json() : null;
        if (!alive) return;
        if (!body) {
          setLedgerStatus('UNAVAILABLE');
          return;
        }
        const rows: LedgerRow[] = (Array.isArray(body.recentResolved) ? body.recentResolved : [])
          .filter((r: any) => r && typeof r.id === 'string')
          .map((r: any) => ({
            id: r.id,
            intervalStart: String(r.intervalStart ?? ''),
            direction: String(r.direction ?? '—'),
            probability: num(r.probability),
            targetStrike: num(r.targetStrike),
            settlementPrice: num(r.settlementPrice),
            status: String(r.status ?? ''),
            wasCorrect: typeof r.wasCorrect === 'boolean' ? r.wasCorrect : null,
          }));
        const btc = body?.stats?.perAsset?.BTC;
        const stats =
          btc && [btc.wins, btc.losses, btc.total, btc.winRatePct].every((v: unknown) => typeof v === 'number') && btc.total > 0
            ? { wins: btc.wins, losses: btc.losses, total: btc.total, winRatePct: btc.winRatePct }
            : null;
        setLedgerRows(rows);
        setLedgerStats(stats);
        setLedgerStatus('LIVE');
      } catch {
        if (alive) setLedgerStatus('UNAVAILABLE');
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // Engine read (BTC, LIVE only)
  const isBtc = selectedAsset.toUpperCase() === 'BTC';
  const engineLive = isBtc && engineFeedHealth === 'LIVE' && Boolean(engineDecision);
  const head = engineLive ? headline(engineDecision) : null;
  const calibrated = engineLive ? engineDecision?.calibrated ?? null : null;
  const side: 'UP' | 'DOWN' | null =
    calibrated?.currentSide === 'UP' || calibrated?.currentSide === 'DOWN' ? calibrated.currentSide : null;
  const feedWord = engineFeedHealth ? engineFeedHealth.toLowerCase().replace(/_/g, ' ') : 'not connected';

  const families: Array<{ id: string; name: string; direction: string; detail: string }> =
    engineLive && Array.isArray(engineDecision?.gemini?.evidenceFactors)
      ? engineDecision.gemini.evidenceFactors
          .filter((f: any) => f && typeof f.name === 'string')
          .map((f: any) => ({ id: String(f.id ?? f.name), name: f.name, direction: String(f.direction ?? 'NEUTRAL'), detail: String(f.detail ?? '') }))
      : [];
  const backing = families.filter((f) => f.direction === 'UP' || f.direction === 'DOWN');
  const backedSide = backing.length ? backing[0].direction : null;

  const gateChecks: Array<{ id: string; label: string; pass: boolean; current: string | number; required: string }> =
    engineLive && Array.isArray(engineDecision?.lockGate?.checks)
      ? engineDecision.lockGate.checks.filter((c: any) => c && c.gating !== false && c.id !== 'CALIBRATED_P')
      : [];
  const failing = gateChecks.filter((c) => !c.pass);
  const passing = gateChecks.filter((c) => c.pass);
  const lockEligible = Boolean(engineDecision?.lockEligibility?.eligible ?? engineDecision?.lockGate?.eligible ?? false);
  const lock = lockStatusOf(engineLive ? engineDecision : null);
  const cycleOpen = lock.kind === 'OPEN';

  const trail: Array<{ t: number; p: number | null; s: number | null; d: number | null; side: string | null }> =
    engineLive && Array.isArray(engineDecision?.convictionTrail)
      ? engineDecision.convictionTrail
          .filter((pt: any) => pt && Number.isFinite(Number(pt.t)))
          .map((pt: any) => ({ t: Number(pt.t), p: num(pt.p), s: num(pt.s), d: num(pt.d), side: pt.side === 'UP' || pt.side === 'DOWN' ? pt.side : null }))
      : [];
  const trailRows = [...trail].reverse().slice(0, 24);

  const market =
    engineLive && engineDecision?.marketRead?.real === true && typeof engineDecision?.marketRead?.kalshiImpliedYes === 'number'
      ? (engineDecision.marketRead as { kalshiImpliedYes: number })
      : null;
  const edgePts = num(calibrated?.edgeVsMarketPct);
  const distBin = num(calibrated?.distBin);
  const distBinLabel = (() => {
    const b = distBin !== null ? DIST_BINS[distBin] : undefined;
    return b ? (b[1] === null ? `${b[0]}+ bps bin` : `${b[0]}–${b[1]} bps bin`) : null;
  })();

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'evidence', label: 'Evidence & Blockers', icon: Layers3 },
    { id: 'timeline', label: 'Conviction Trail', icon: Clock },
    { id: 'calibration', label: 'Calibration & Past Cycles', icon: History },
    { id: 'coverage', label: 'Model Coverage', icon: BarChart3 },
  ];

  const notLiveText = !isBtc
    ? `VIXY has no model for ${selectedAsset}. The only model is the BTC 15-minute engine.`
    : `The 15-minute engine feed is ${feedWord}. Its explanation appears when the feed is live.`;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12072b] via-[#0d0620] to-[#19093b] border border-purple-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-mono font-bold">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
              <span>VIXY EXPLAINABILITY</span>
              <span className={`w-1.5 h-1.5 rounded-full ${engineLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className={engineLive ? 'text-emerald-300' : 'text-slate-400'}>{engineLive ? 'LIVE 15M ENGINE' : 'ENGINE NOT LIVE'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">Evidence & Model Explainability</h1>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-3xl leading-relaxed">
              Why the BTC 15-minute engine reads what it reads: the calibrated probability and the history behind it, the evidence
              families, the lock gates it still has to clear, and how past cycles settled.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0a0518] p-1.5 rounded-2xl border border-purple-900/60 font-mono text-xs">
            {['BTC', 'ETH', 'SOL'].map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSelectedAsset(sym);
                  if (onSelectAsset) onSelectAsset(sym);
                }}
                className={`px-3 py-2 rounded-xl font-extrabold transition-all ${
                  selectedAsset === sym
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400/40'
                    : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      <IntelligenceLockGate
        isVerified={isIntelligenceUnlocked}
        isAdmin={isUserAdmin}
        userRole={userRole}
        onOpenDiscordModal={onOpenDiscordModal}
        title="EXPLAINABILITY VAULT LOCKED"
        subtitle="Verify your VIXY Vault Discord membership to unlock the engine's calibrated probability, evidence families, lock gates and ledger."
      >
        <div className="space-y-6">
          {/* TOP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
                {/* The header names the number actually shown below it. */}
                <span>{head?.kind === 'ENGINE_SCORE' ? 'ENGINE SCORE' : 'CALIBRATED P(WIN)'}</span>
                <span
                  title={
                    head?.kind === 'ENGINE_SCORE'
                      ? 'The engine score out of 100. It is not a probability; no calibrated cell matches this cycle yet.'
                      : 'How often past cycles in a similar state settled on the current side of the strike'
                  }
                >
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400">
                {headlineText(head)}
              </div>
              <p className="text-[11px] text-purple-300/60">
                {!engineLive
                  ? notLiveText
                  : head?.kind === 'PWIN'
                  ? `${head.label}. How often similar past cycles settled on the ${side ?? 'current'} side.`
                  : head?.kind === 'ENGINE_SCORE'
                  ? `Engine score. This is not a probability. ${reasonText(calibrated?.reason, calibrated?.n)}`
                  : reasonText(calibrated?.reason, calibrated?.n)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
                <span>EVIDENCE FAMILIES</span>
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-3xl font-black font-mono text-cyan-300">{engineLive && families.length ? `${backing.length}/${families.length}` : '—'}</div>
              <p className="text-[11px] text-purple-300/60">
                {!engineLive ? 'Shown while the BTC engine is live.' : families.length === 0 ? 'Not reported this tick.' : backedSide ? `Back ${backedSide}. The rest cast no vote.` : 'No family backs a side right now.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
                <span>LOCK GATES</span>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-3xl font-black font-mono text-purple-200">{!engineLive ? '—' : !cycleOpen ? lockStatusWord(lock) : gateChecks.length ? `${passing.length}/${gateChecks.length}` : '—'}</div>
              <p className="text-[11px] text-purple-300/60">
                {!engineLive
                  ? 'Shown while the BTC engine is live.'
                  : !cycleOpen
                  ? lockStatusSentence(lock)
                  : gateChecks.length === 0
                  ? 'Not reported this tick.'
                  : lockEligible
                  ? 'Every gating check passes. The engine may lock.'
                  : `${failing.length} still blocking a lock.`}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300/70">
                <span>LEDGER RECORD · BTC</span>
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-3xl font-black font-mono text-emerald-300">{ledgerStats ? `${ledgerStats.wins}–${ledgerStats.losses}` : '—'}</div>
              <p className="text-[11px] text-purple-300/60">
                {ledgerStats
                  ? `${ledgerStats.winRatePct}% across ${ledgerStats.total} locks graded against settlement.`
                  : ledgerStatus === 'LOADING'
                  ? 'Loading the ledger…'
                  : 'Ledger unavailable right now.'}
              </p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
            <div className="flex flex-wrap items-center gap-2 bg-[#0a0518] p-1.5 rounded-2xl border border-purple-900/50 text-xs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'text-purple-300/70 hover:text-white hover:bg-purple-900/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB: EVIDENCE & BLOCKERS */}
          {activeTab === 'evidence' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                  <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">Engine evidence families</h3>
                  {engineLive && families.length > 0 && (
                    <span className="text-[10px] font-mono text-cyan-300">
                      {backedSide ? `${backing.length}/${families.length} back ${backedSide}` : `0/${families.length} back a side`}
                    </span>
                  )}
                </div>
                {!engineLive ? (
                  <p className="text-xs text-purple-200/80">{notLiveText}</p>
                ) : families.length === 0 ? (
                  <p className="text-xs text-purple-200/80">The engine has not reported evidence families this tick.</p>
                ) : (
                  <div className="space-y-2">
                    {families.map((f) => {
                      const backs = f.direction === 'UP' || f.direction === 'DOWN';
                      return (
                        <div key={f.id} className="p-3 rounded-xl bg-[#0c0620] border border-purple-900/40 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-extrabold text-white">{f.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-xl text-[10px] font-black border ${
                                f.direction === 'UP'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : f.direction === 'DOWN'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                              }`}
                            >
                              {backs ? `BACKS ${f.direction}` : 'NO VOTE'}
                            </span>
                          </div>
                          {f.detail && <p className="text-[11px] font-mono text-purple-300/60 leading-snug">{f.detail}</p>}
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-purple-300/50">
                      Each family is a fixed check inside the engine. It backs a side when its check passes for that side and shows no vote otherwise.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                    <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">{cycleOpen ? 'What still blocks a lock' : 'Lock status'}</h3>
                    {engineLive && cycleOpen && gateChecks.length > 0 && <span className="text-[10px] font-mono text-amber-300">{failing.length} failing</span>}
                  </div>
                  {!engineLive ? (
                    <p className="text-xs text-purple-200/80">{notLiveText}</p>
                  ) : !cycleOpen ? (
                    <p className="text-xs text-cyan-200 flex items-start gap-1.5 leading-relaxed">
                      <Lock className="w-4 h-4 shrink-0 text-cyan-300" />
                      {lockStatusSentence(lock)}
                    </p>
                  ) : gateChecks.length === 0 ? (
                    <p className="text-xs text-purple-200/80">The engine has not reported its gate checks this tick.</p>
                  ) : failing.length === 0 ? (
                    <p className="text-xs text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Every gating check passes.
                    </p>
                  ) : (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {failing.map((c) => (
                        <div key={c.id} className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start justify-between gap-2">
                          <span className="text-rose-200 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            {c.label}
                          </span>
                          <span className="text-right shrink-0">
                            <strong className="text-white">{String(c.current)}</strong>
                            <span className="text-slate-500"> / {c.required}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {engineLive && cycleOpen && passing.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-2">
                    <h3 className="text-xs font-black text-white font-mono uppercase tracking-wider">Passing checks · {passing.length}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {passing.map((c) => (
                        <span key={c.id} className="px-2 py-0.5 rounded-xl text-[10px] font-bold border bg-emerald-950/50 text-emerald-300 border-emerald-500/30">
                          {c.label}: {String(c.current)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CONVICTION TRAIL */}
          {activeTab === 'timeline' && (
            <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-3">
              <div className="border-b border-purple-900/40 pb-3">
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">Conviction trail · this window</h3>
                <p className="text-[11px] text-purple-300/60 mt-1">
                  One row per engine tick this server instance observed, newest first. P(win) is blank before the first checkpoint or when the table has no matching cell.
                </p>
              </div>
              {!engineLive ? (
                <p className="text-xs text-purple-200/80">{notLiveText}</p>
              ) : trailRows.length === 0 ? (
                <p className="text-xs text-purple-200/80">The trail draws as the cycle runs.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="text-purple-300/60 border-b border-purple-900/40">
                        <th className="p-2">Time in window</th>
                        <th className="p-2">Side</th>
                        <th className="p-2">P(win side)</th>
                        <th className="p-2">Engine score</th>
                        <th className="p-2">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trailRows.map((pt, idx) => (
                        <tr key={`${pt.t}-${idx}`} className="border-b border-purple-950/60">
                          <td className="p-2 text-purple-200">{fmtCycleSec(pt.t)}</td>
                          <td className={`p-2 font-bold ${pt.side === 'UP' ? 'text-emerald-400' : pt.side === 'DOWN' ? 'text-rose-400' : 'text-slate-500'}`}>{pt.side ?? '—'}</td>
                          <td className="p-2 text-white font-bold">{pt.p !== null ? `${Math.round(pt.p * 100)}%` : '—'}</td>
                          <td className="p-2 text-purple-200">{pt.s !== null && pt.s > 0 ? pt.s : '—'}</td>
                          <td className="p-2 text-cyan-300">{pt.d !== null ? `${pt.d} bps` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: CALIBRATION & PAST CYCLES */}
          {activeTab === 'calibration' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-3">
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider border-b border-purple-900/40 pb-3">Current calibration cell</h3>
                {!engineLive ? (
                  <p className="text-xs text-purple-200/80">{notLiveText}</p>
                ) : (
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {[
                      ['Criterion', calibrated?.criterion ?? '—'],
                      ['Table', calibrated?.tableVersion ?? '—'],
                      ['Checkpoint', num(calibrated?.checkpointSec) !== null ? `${calibrated.checkpointSec}s into the window` : '—'],
                      ['Distance to strike', num(calibrated?.distBps) !== null ? `${calibrated.distBps} bps${distBinLabel ? ` · ${distBinLabel}` : ''}` : '—'],
                      ['Volatility tercile', calibrated?.volBin ?? '—'],
                      ['Cycles in cell', num(calibrated?.n) !== null && calibrated.n > 0 ? String(calibrated.n) : '—'],
                      ['P(win)', num(calibrated?.pWin) !== null ? `${Math.round(calibrated.pWin * 100)}%` : reasonText(calibrated?.reason, calibrated?.n)],
                      ['Lock bar', num(calibrated?.bar) !== null ? `${Math.round(calibrated.bar * 100)}%` : '—'],
                      ['Kalshi YES', market ? `${Math.round(market.kalshiImpliedYes * 100)}¢` : 'no fresh read'],
                      ['Table − market', edgePts !== null ? `${edgePts >= 0 ? '+' : '−'}${Math.abs(edgePts)} pts` : '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="p-2 rounded-xl bg-[#0c0620] border border-purple-900/40 flex items-start justify-between gap-3">
                        <span className="text-purple-300/60 shrink-0">{k}</span>
                        <span className="text-white font-bold text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-3 p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-3">
                <div className="border-b border-purple-900/40 pb-3">
                  <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">Recent cycles from the ledger</h3>
                  <p className="text-[11px] text-purple-300/60 mt-1">Recorded entries, newest first. The full history is in VIXY Locks.</p>
                </div>
                {ledgerStatus === 'LOADING' ? (
                  <p className="text-xs text-purple-200/80">Loading the ledger…</p>
                ) : ledgerStatus === 'UNAVAILABLE' ? (
                  <p className="text-xs text-purple-200/80">The ledger is unavailable right now.</p>
                ) : ledgerRows.length === 0 ? (
                  <p className="text-xs text-purple-200/80">No ledger entries yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="text-purple-300/60 border-b border-purple-900/40">
                          <th className="p-2">Window</th>
                          <th className="p-2">Call</th>
                          <th className="p-2">Recorded P</th>
                          <th className="p-2">Strike</th>
                          <th className="p-2">Settled</th>
                          <th className="p-2">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.map((r) => {
                          const outcome = outcomeOf(r);
                          const start = r.intervalStart ? new Date(r.intervalStart) : null;
                          return (
                            <tr key={r.id} className="border-b border-purple-950/60">
                              <td className="p-2 text-purple-200 whitespace-nowrap">
                                {start && !Number.isNaN(start.getTime()) ? start.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className={`p-2 font-bold ${r.direction === 'UP' ? 'text-emerald-400' : r.direction === 'DOWN' ? 'text-rose-400' : 'text-slate-500'}`}>{r.direction}</td>
                              <td className="p-2 text-white">{r.probability !== null && r.status !== 'NO_TRADE' ? `${Math.round(r.probability * 100)}%` : '—'}</td>
                              <td className="p-2 text-purple-200">{fmtUsd(r.targetStrike)}</td>
                              <td className="p-2 text-purple-200">{fmtUsd(r.settlementPrice)}</td>
                              <td className="p-2">
                                <span
                                  className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                    outcome === 'WIN'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : outcome === 'LOSS'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-slate-800/60 text-slate-400'
                                  }`}
                                >
                                  {outcome}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MODEL COVERAGE */}
          {activeTab === 'coverage' && (
            <div className="p-5 rounded-2xl bg-[#0a0518] border border-purple-900/50 space-y-3">
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider border-b border-purple-900/40 pb-3">What VIXY models</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-purple-300/60 border-b border-purple-900/40">
                      <th className="p-2">Asset</th>
                      <th className="p-2">Contract</th>
                      <th className="p-2">Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-purple-950/60">
                      <td className="p-2 font-black text-white">BTC</td>
                      <td className="p-2 text-purple-200">Kalshi 15-minute window</td>
                      <td className="p-2 text-emerald-300">Live engine + calibrated strike-side table</td>
                    </tr>
                    {['ETH', 'SOL'].map((sym) => (
                      <tr key={sym} className="border-b border-purple-950/60">
                        <td className="p-2 font-black text-white">{sym}</td>
                        <td className="p-2 text-slate-500">—</td>
                        <td className="p-2 text-slate-400">No model. Market data only.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-purple-300/60 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                VIXY does not rank or score assets it has no model for.
              </p>
            </div>
          )}
        </div>
      </IntelligenceLockGate>
    </div>
  );
};
