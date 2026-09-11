import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Key, Shield, Trash2, AlertTriangle, Fingerprint } from 'lucide-react';
import { fetchJournal, createJournalEntry, deleteJournalEntry } from '../services/api';

/**
 * Trade Journal: positions the trader logs themselves.
 *
 * Every number on this page is computed from the entries the trader entered,
 * or shown as a dash. Storage is reported as the server reports it. It used to
 * show a fixed average edge, send a made-up edge with every entry, pre-fill a
 * winning trade in the form, invent a fallback fingerprint, and claim permanent
 * database storage while the server kept entries in memory.
 */

interface TradeJournalViewProps {
  entries?: any[];
  setEntries?: React.Dispatch<React.SetStateAction<any[]>>;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const usd = (v: number) => `${v >= 0 ? '+' : '−'}$${Math.abs(v).toFixed(2)}`;

export const TradeJournalView: React.FC<TradeJournalViewProps> = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverWinRate, setServerWinRate] = useState<number | null>(null);
  const [storageType, setStorageType] = useState<string | null>(null);

  const loadJournal = async () => {
    setLoading(true);
    try {
      const data = await fetchJournal();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setServerWinRate(numOrNull(data?.journaledWinRate));
      setStorageType(typeof data?.storageType === 'string' ? data.storageType : null);
      setLoadError(null);
    } catch {
      setEntries([]);
      setLoadError('The journal could not be loaded.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadJournal();
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [market, setMarket] = useState('BTC 15M Kalshi');
  const [direction, setDirection] = useState<'YES' | 'NO'>('YES');
  const [entryOdds, setEntryOdds] = useState('');
  const [exitOdds, setExitOdds] = useState('');
  const [stakeUSD, setStakeUSD] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const pnls = safeEntries.map((e) => numOrNull(e?.pnlUSD)).filter((v): v is number => v !== null);
  const totalPnL = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) : null;
  const settled = safeEntries.filter((e) => e?.outcome === 'WIN' || e?.outcome === 'LOSS');
  const wins = settled.filter((e) => e.outcome === 'WIN').length;
  const winRate = serverWinRate ?? (settled.length > 0 ? Math.round((wins / settled.length) * 1000) / 10 : null);
  const entryCents = safeEntries.map((e) => numOrNull(e?.entryPrice)).filter((v): v is number => v !== null && v > 0 && v < 100);
  const avgEntry = entryCents.length > 0 ? Math.round((entryCents.reduce((a, b) => a + b, 0) / entryCents.length) * 10) / 10 : null;
  const inMemory = storageType === 'IN_MEMORY_NOT_PERSISTED';

  const resetForm = () => {
    setEntryOdds('');
    setExitOdds('');
    setStakeUSD('');
    setNotes('');
    setFormError(null);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(entryOdds);
    const exit = parseFloat(exitOdds);
    const stake = parseFloat(stakeUSD);
    if (!(entry >= 0.01 && entry <= 0.99)) return setFormError('Entry price must be between 0.01 and 0.99.');
    if (!(exit >= 0 && exit <= 1)) return setFormError('Exit price must be between 0 and 1. Use 1 for a settled win and 0 for a settled loss.');
    if (!(stake > 0)) return setFormError('Stake must be greater than 0.');

    const contracts = stake / entry;
    const pnl = Math.round(contracts * (exit - entry) * 100) / 100;
    const outcome = exit >= 0.999 ? 'WIN' : exit <= 0.001 ? 'LOSS' : 'CLOSED';

    setSaving(true);
    const res: any = await createJournalEntry({
      ticker: market.trim(),
      direction,
      entryPrice: Math.round(entry * 1000) / 10,
      targetPrice: Math.round(exit * 1000) / 10,
      stake,
      notes,
      outcome,
      pnlUSD: pnl,
    });
    setSaving(false);
    if (!res || res.success !== true) {
      setFormError(
        res?.status === 401 || res?.error === 'AUTHENTICATION_REQUIRED'
          ? 'Sign in to log trades.'
          : res?.message || 'The entry was not saved.',
      );
      return;
    }
    await loadJournal();
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteJournalEntry(id);
    await loadJournal();
  };

  return (
    <div className="space-y-6 font-mono text-purple-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0518] border border-purple-500/30 p-6 rounded-2xl shadow-[0_0_35px_rgba(147,51,234,0.15)]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/30 text-purple-400">
            <BookOpen className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-wide">TRADE JOURNAL</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-200 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1">
                <Fingerprint className="w-3 h-3 text-purple-300" />
                SHA-256 FINGERPRINTS
              </span>
            </div>
            <p className="text-purple-300/70 text-xs font-sans mt-0.5">
              Positions you log yourself. Each saved entry carries a SHA-256 fingerprint of its fields.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 shrink-0 border border-purple-400/30"
        >
          <Plus className="w-4 h-4" />
          <span>LOG TRADE ENTRY</span>
        </button>
      </div>

      {inMemory && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-200 font-sans">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Entries are held in server memory and can disappear when the server restarts. Permanent storage is not enabled yet, so keep your own copy of anything important.
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0c0620] p-5 rounded-2xl border border-purple-500/30 shadow-lg">
          <span className="text-purple-300/60 text-xs block mb-1 uppercase font-bold">Net P&L (logged)</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${totalPnL === null ? 'text-slate-500' : totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnL === null ? '—' : usd(totalPnL)}
            </span>
            <span className="text-xs text-purple-300/50">USD</span>
          </div>
        </div>

        <div className="bg-[#0c0620] p-5 rounded-2xl border border-purple-500/30 shadow-lg">
          <span className="text-purple-300/60 text-xs block mb-1 uppercase font-bold">Win Rate (settled)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-300">{winRate === null ? '—' : `${winRate.toFixed(1)}%`}</span>
            <span className="text-xs text-purple-300/50">
              ({wins}/{settled.length} settled)
            </span>
          </div>
        </div>

        <div className="bg-[#0c0620] p-5 rounded-2xl border border-purple-500/30 shadow-lg">
          <span className="text-purple-300/60 text-xs block mb-1 uppercase font-bold">Average Entry Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-200">{avgEntry === null ? '—' : `${avgEntry}¢`}</span>
            <span className="text-xs text-purple-300/50">across your entries</span>
          </div>
        </div>
      </div>

      {/* Journal Entries */}
      <div className="bg-[#0c0620] rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-purple-900/40 flex items-center justify-between gap-2">
          <span className="font-bold text-xs text-purple-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            YOUR TRADE LOGS ({safeEntries.length})
          </span>
          <span className="text-[11px] text-purple-300/50 text-right">
            {inMemory ? 'Server memory · not saved permanently' : storageType ?? 'Storage not reported'}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-purple-300/60 text-xs">Loading your journal…</div>
        ) : loadError ? (
          <div className="p-8 text-center text-rose-300 text-xs">{loadError}</div>
        ) : safeEntries.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-bold text-purple-200">No journal entries yet</p>
            <p className="text-xs text-slate-400 font-sans max-w-sm mx-auto">
              Click 'LOG TRADE ENTRY' to record a prediction-market position. If you are signed out, entries cannot be saved.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-purple-900/30">
            {safeEntries.map((entry, idx) => {
              const tickerName = typeof entry?.ticker === 'string' && entry.ticker ? entry.ticker : entry?.market || '—';
              const pnl = numOrNull(entry?.pnlUSD);
              const entryCentsRow = numOrNull(entry?.entryPrice);
              const stake = numOrNull(entry?.stake ?? entry?.stakeUSD);
              const dir = entry?.direction === 'YES' || entry?.direction === 'NO' ? entry.direction : null;
              const hash = typeof entry?.entryHash === 'string' && entry.entryHash ? entry.entryHash : null;
              const created = entry?.createdAt ? new Date(entry.createdAt) : null;

              return (
                <div key={entry?.id || idx} className="p-5 hover:bg-purple-900/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        dir === 'YES' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : dir === 'NO' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {dir ?? '—'}
                      </span>
                      <span className="font-bold text-white text-sm">{tickerName}</span>
                      <span className="text-purple-300/50 text-xs">
                        {created && !Number.isNaN(created.getTime()) ? created.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      {typeof entry?.outcome === 'string' && (
                        <span className="text-[10px] text-purple-300/70 border border-purple-800/50 rounded px-1.5 py-0.5">{entry.outcome}</span>
                      )}
                    </div>

                    {entry?.notes && <p className="text-xs text-purple-200/80 font-sans">{entry.notes}</p>}

                    {hash && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1">
                          <Key className="w-3 h-3 text-cyan-400" />
                          FINGERPRINT {hash}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-purple-900/40">
                    <div className="text-right">
                      <span className="text-[10px] text-purple-300/50 block">Stake / Entry</span>
                      <span className="font-bold text-xs text-purple-200">
                        {stake !== null && stake > 0 ? `$${stake}` : '—'} @ {entryCentsRow !== null && entryCentsRow > 0 && entryCentsRow < 100 ? `${entryCentsRow}¢` : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-purple-300/50 block">Realized P&L</span>
                      <span className={`font-black text-sm ${pnl === null ? 'text-slate-500' : pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pnl === null ? '—' : usd(pnl)}
                      </span>
                    </div>

                    {entry?.id && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-purple-300/40 hover:text-rose-400 transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0a0518]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0620] border border-purple-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono text-xs text-purple-100">
            <h3 className="text-base font-black text-white border-b border-purple-900/40 pb-3">LOG PREDICTION POSITION</h3>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="text-purple-300/60 block mb-1">Market Contract</label>
                <input
                  type="text"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-purple-300/60 block mb-1">Position Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'YES' | 'NO')}
                    className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                  >
                    <option value="YES">UP (YES)</option>
                    <option value="NO">DOWN (NO)</option>
                  </select>
                </div>

                <div>
                  <label className="text-purple-300/60 block mb-1">Stake ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stakeUSD}
                    onChange={(e) => setStakeUSD(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-purple-300/60 block mb-1">Entry Price (0.01 – 0.99)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.99"
                    value={entryOdds}
                    onChange={(e) => setEntryOdds(e.target.value)}
                    placeholder="e.g. 0.52"
                    className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                    required
                  />
                </div>

                <div>
                  <label className="text-purple-300/60 block mb-1">Exit Price (1 win · 0 loss)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={exitOdds}
                    onChange={(e) => setExitOdds(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-purple-300/60 block mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why you took the trade"
                  className="w-full bg-[#0a0518] border border-purple-900/60 rounded-xl p-3 text-purple-100 font-sans"
                />
              </div>

              {formError && <p className="text-rose-300 text-[11px] font-sans">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0a0518] text-purple-300/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
