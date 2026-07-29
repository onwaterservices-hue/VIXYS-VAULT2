import React, { useState } from 'react';
import { BookOpen, Plus, TrendingUp, TrendingDown, DollarSign, Tag, Check, Trash2, Zap, ArrowUpRight } from 'lucide-react';
import { JournalEntry } from '../types';

export const TradeJournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: 'jnl_101',
      timestamp: Date.now() - 45 * 60 * 1000,
      market: 'BTC 15M Kalshi #9284',
      direction: 'YES',
      entryOdds: 0.52,
      exitOdds: 0.94,
      stakeUSD: 500,
      pnlUSD: 403.8,
      confidence: 91,
      edge: 12.2,
      notes: 'L2 Net Delta was +1,420 BTC. Entered at 52c when market underpriced orderbook pressure.',
      tags: ['Kalshi', 'OrderBook Imbalance', 'Win'],
    },
    {
      id: 'jnl_100',
      timestamp: Date.now() - 120 * 60 * 1000,
      market: 'BTC 15M Polymarket #4812',
      direction: 'NO',
      entryOdds: 0.48,
      exitOdds: 0.0,
      stakeUSD: 300,
      pnlUSD: -300,
      confidence: 79,
      edge: 3.1,
      notes: 'Low edge signal taken during quiet Asia session. Slipped past confidence filter.',
      tags: ['Polymarket', 'Low Edge', 'Loss'],
    },
    {
      id: 'jnl_099',
      timestamp: Date.now() - 180 * 60 * 1000,
      market: 'BTC 15M Kalshi #9281',
      direction: 'YES',
      entryOdds: 0.55,
      exitOdds: 0.98,
      stakeUSD: 1000,
      pnlUSD: 781.8,
      confidence: 94,
      edge: 14.5,
      notes: 'High confidence Grade A+ signal. VWAP support retest aligned with model prediction.',
      tags: ['Kalshi', 'Grade A+', 'Win'],
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [market, setMarket] = useState('BTC 15M Kalshi');
  const [direction, setDirection] = useState<'YES' | 'NO'>('YES');
  const [entryOdds, setEntryOdds] = useState('0.52');
  const [exitOdds, setExitOdds] = useState('0.92');
  const [stakeUSD, setStakeUSD] = useState('500');
  const [notes, setNotes] = useState('');

  const totalPnL = entries.reduce((acc, curr) => acc + curr.pnlUSD, 0);
  const totalTrades = entries.length;
  const winCount = entries.filter((e) => e.pnlUSD > 0).length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(entryOdds) || 0.5;
    const exit = parseFloat(exitOdds) || 0.0;
    const stake = parseFloat(stakeUSD) || 100;

    // PnL calculation based on binary odds
    const pnl = exit > 0 ? (exit - entry) * (stake / entry) : -stake;

    const newEntry: JournalEntry = {
      id: `jnl_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      market,
      direction,
      entryOdds: entry,
      exitOdds: exit,
      stakeUSD: stake,
      pnlUSD: Math.round(pnl * 100) / 100,
      confidence: 90,
      edge: 10.5,
      notes,
      tags: [market.includes('Kalshi') ? 'Kalshi' : 'Polymarket', pnl > 0 ? 'Win' : 'Loss'],
    };

    setEntries([newEntry, ...entries]);
    setShowAddModal(false);
    setNotes('');
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6 font-mono text-purple-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#120B28] border border-purple-500/30 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Quantitative Execution Journal</h1>
            <p className="text-purple-300/60 text-xs font-sans mt-0.5">
              Track prediction market positions, implied odds edge, and net expectancy across Kalshi & Polymarket.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Log Trade Entry</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#120B28] p-5 rounded-2xl border border-purple-900/40">
          <span className="text-purple-300/60 text-xs block mb-1">Cumulative Net PnL</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </span>
            <span className="text-xs text-purple-300/50">USD</span>
          </div>
        </div>

        <div className="bg-[#120B28] p-5 rounded-2xl border border-purple-900/40">
          <span className="text-purple-300/60 text-xs block mb-1">Journaled Win Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-300">{winRate.toFixed(1)}%</span>
            <span className="text-xs text-purple-300/50">({winCount}/{totalTrades} Trades)</span>
          </div>
        </div>

        <div className="bg-[#120B28] p-5 rounded-2xl border border-purple-900/40">
          <span className="text-purple-300/60 text-xs block mb-1">Model Edge Capture</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-300">+11.4%</span>
            <span className="text-xs text-purple-300/50">Avg Implied Edge</span>
          </div>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="bg-[#120B28] rounded-2xl border border-purple-500/30 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
          <span className="font-bold text-xs text-purple-200">Execution Logs ({entries.length})</span>
          <span className="text-[11px] text-purple-300/50">Stored locally in browser session</span>
        </div>

        <div className="divide-y divide-purple-900/30">
          {entries.map((entry) => (
            <div key={entry.id} className="p-5 hover:bg-purple-900/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    entry.direction === 'YES' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {entry.direction}
                  </span>
                  <span className="font-bold text-white text-sm">{entry.market}</span>
                  <span className="text-purple-300/50 text-xs">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-purple-200/80 font-sans">{entry.notes}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {entry.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-[#0B061A] text-purple-300/70 border border-purple-900/40 text-[10px]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-purple-900/40">
                <div className="text-right">
                  <span className="text-[10px] text-purple-300/50 block">Stake / Odds</span>
                  <span className="font-bold text-xs text-purple-200">
                    ${entry.stakeUSD} @ {(entry.entryOdds * 100).toFixed(0)}c
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-purple-300/50 block">Realized Return</span>
                  <span className={`font-black text-sm ${entry.pnlUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {entry.pnlUSD >= 0 ? '+' : ''}${entry.pnlUSD.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-2 text-purple-300/40 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0518]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120B28] border border-purple-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono text-xs text-purple-100">
            <h3 className="text-base font-black text-white border-b border-purple-900/40 pb-3">Log Prediction Position</h3>

            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="text-purple-300/60 block mb-1">Market Contract</label>
                <input
                  type="text"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-purple-300/60 block mb-1">Position Direction</label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'YES' | 'NO')}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                  >
                    <option value="YES">YES (Bullish)</option>
                    <option value="NO">NO (Bearish)</option>
                  </select>
                </div>

                <div>
                  <label className="text-purple-300/60 block mb-1">Stake ($ USD)</label>
                  <input
                    type="number"
                    value={stakeUSD}
                    onChange={(e) => setStakeUSD(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-purple-300/60 block mb-1">Entry Odds (0.01 - 0.99)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryOdds}
                    onChange={(e) => setEntryOdds(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                    required
                  />
                </div>

                <div>
                  <label className="text-purple-300/60 block mb-1">Exit Odds (1.0 for Win, 0 for Loss)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exitOdds}
                    onChange={(e) => setExitOdds(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-purple-300/60 block mb-1">Quant Trade Rationale / Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order flow delta, bid depth imbalance..."
                  className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl p-3 text-purple-100 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#0B061A] text-purple-300/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
