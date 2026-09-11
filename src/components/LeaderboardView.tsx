import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Search,
  ExternalLink,
  BookOpen,
  TrendingUp,
  Percent,
  Hash,
  Info,
  Sparkles,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';
import { fetchLeaderboard, fetchJournal, LeaderboardUser } from '../services/api';

interface LeaderboardViewProps {
  onOpenJournal?: () => void;
}

// The signed-in viewer's own journal summary, as /api/journal returns it.
interface MyJournalSummary {
  entries: any[];
  cumulativeNetPnl: number | null;
  journaledWinRate: number | null;
  storageType: string | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  onOpenJournal,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'MY_LOGS' | 'COMMUNITY'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [myJournal, setMyJournal] = useState<MyJournalSummary | null>(null);

  useEffect(() => {
    let active = true;
    const loadBoard = async () => {
      try {
        const data = await fetchLeaderboard();
        if (active) setLeaderboardData(data);
      } catch (e) {
        console.warn('Failed to load leaderboard', e);
      } finally {
        if (active) setLoading(false);
      }
      // Loaded separately so a journal failure never blanks the table.
      try {
        const j = await fetchJournal();
        if (active && j && typeof j === 'object') {
          setMyJournal({
            entries: Array.isArray(j.entries) ? j.entries : [],
            cumulativeNetPnl: j.cumulativeNetPnl != null && Number.isFinite(Number(j.cumulativeNetPnl)) ? Number(j.cumulativeNetPnl) : null,
            journaledWinRate: j.journaledWinRate != null && Number.isFinite(Number(j.journaledWinRate)) ? Number(j.journaledWinRate) : null,
            storageType: typeof j.storageType === 'string' ? j.storageType : null,
          });
        }
      } catch (e) {
        console.warn('Failed to load your journal', e);
      }
    };
    loadBoard();
    const timer = setInterval(loadBoard, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Your own figures come from your server journal, the same record the Trade
  // Journal page lists. They used to read an App-level array that nothing ever
  // filled apart from an invented seed trade, summed a field the server never
  // writes, and counted pending entries as losses. Unknown until it loads: a dash.
  const myEntries = myJournal ? myJournal.entries : [];
  const userTotalTrades: number | null = myJournal ? myEntries.length : null;
  const userWinningTrades = myEntries.filter((e) => e?.outcome === 'WIN').length;
  const userLosingTrades = myEntries.filter((e) => e?.outcome === 'LOSS').length;
  const userWinRate: number | null = myJournal ? myJournal.journaledWinRate : null;
  const userTotalPnl: number | null = myJournal ? myJournal.cumulativeNetPnl : null;
  const myJournalStorageLabel = !myJournal
    ? '—'
    : myJournal.storageType === 'IN_MEMORY_NOT_PERSISTED'
    ? 'Server memory only, not persisted'
    : 'From your server journal';

  // Community Verified Logged Trades (Derived strictly from verified user trade hashes)
  // Which leaderboard row belongs to the viewer. The same rule drives the YOU
  // badge and the My Logged Trades / Community Leaders tabs, so they agree.
  const isYouRow = (trd: any): boolean => {
    const n = String(trd?.traderName || trd?.name || '');
    return n.includes('You') || n.includes('Quantum') || n.includes('Master Admin');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#170b36] via-[#12072b] to-[#170b36] border-2 border-purple-500/30 p-6 sm:p-8 shadow-2xl font-mono">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>JOURNAL LEADERBOARD</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Trader Journal Rankings
            </h1>

            <p className="text-sm text-purple-200/80 max-w-2xl font-sans leading-relaxed">
              Rankings compiled from real user trade journal entries. No seeded or simulated traders.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onOpenJournal && (
              <button
                onClick={onOpenJournal}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Log Trade in Journal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User Personal Performance Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#0b0518] border border-purple-900/40 p-4 rounded-2xl space-y-1">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Your Logged Trades</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white">{userTotalTrades !== null ? userTotalTrades : '—'}</span>
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-[11px] text-purple-300/70 font-sans block">{myJournalStorageLabel}</span>
        </div>

        <div className="bg-[#0b0518] border border-purple-900/40 p-4 rounded-2xl space-y-1">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Your Win Rate</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-400">{userWinRate !== null ? `${userWinRate}%` : '—'}</span>
            <Percent className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[11px] text-slate-400 font-sans block">{userWinningTrades} W / {userLosingTrades} L</span>
        </div>

        <div className="bg-[#0b0518] border border-purple-900/40 p-4 rounded-2xl space-y-1">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Your Journal Net PnL</span>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-black ${(userTotalPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {userTotalPnl !== null ? `$${userTotalPnl >= 0 ? '+' : ''}${userTotalPnl.toFixed(2)}` : '—'}
            </span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-[11px] text-purple-300/70 font-sans block">Realized strategy PnL</span>
        </div>

        <div className="bg-[#0b0518] border border-purple-900/40 p-4 rounded-2xl space-y-1">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Verification Status</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              SHA-256 HASHED
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans block">Tamper-evident logs</span>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-[#0a0518] border border-purple-900/50 rounded-2xl p-5 space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-2">
            {['ALL', 'MY_LOGS', 'COMMUNITY'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterTab(t as any)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  filterTab === t
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                    : 'bg-[#0c0620] border-purple-900/50 text-purple-300/70 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Traders' : t === 'MY_LOGS' ? 'My Logged Trades' : 'Community Leaders'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search trader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0c0620] border border-purple-900/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-purple-900/40 text-purple-300/70 text-[11px]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Trader</th>
                <th className="py-2.5 px-3">Tier / Badge</th>
                <th className="py-2.5 px-3">Logged Trades</th>
                <th className="py-2.5 px-3">Win Rate</th>
                <th className="py-2.5 px-3">Net Realized PnL</th>
                <th className="py-2.5 px-3">Trader ID Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30">
              {leaderboardData && leaderboardData.length > 0 ? (
                leaderboardData
                  .filter((trd) => {
                    const nameStr = (trd.traderName || (trd as any).name || '').toLowerCase();
                    const idStr = (trd.userId || '').toLowerCase();
                    const term = (searchTerm || '').toLowerCase();
                    if (filterTab === 'MY_LOGS' && !isYouRow(trd)) return false;
                    if (filterTab === 'COMMUNITY' && isYouRow(trd)) return false;
                    if (term && !nameStr.includes(term) && !idStr.includes(term)) {
                      return false;
                    }
                    return true;
                  })
                  .map((trd, index) => {
                    const nameStr = trd.traderName || (trd as any).name || 'Trader';
                    const isUser = isYouRow(trd);
                    return (
                    <tr
                      key={trd.rank || index}
                      className={`hover:bg-purple-950/20 transition-colors ${
                        isUser ? 'bg-purple-950/30 font-bold border-l-2 border-purple-500' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1.5 text-white font-black">
                          {trd.rank === 1 ? (
                            <Trophy className="w-4 h-4 text-amber-400" />
                          ) : trd.rank === 2 ? (
                            <Award className="w-4 h-4 text-slate-300" />
                          ) : trd.rank === 3 ? (
                            <Award className="w-4 h-4 text-amber-700" />
                          ) : null}
                          #{trd.rank || index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{nameStr}</span>
                          {isUser && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                              YOU
                            </span>
                          )}
                        </div>
                        
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            trd.badge === 'MASTER ADMIN'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {trd.badge}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{trd.totalTrades} Trades</td>
                      <td className="py-3 px-3 text-emerald-400 font-extrabold">{trd.winRate}%</td>
                      <td className={`py-3 px-3 font-extrabold ${(trd.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(trd.realizedPnl || 0) >= 0
                          ? `+$${(trd.realizedPnl || 0).toFixed(2)}`
                          : `−$${Math.abs(trd.realizedPnl || 0).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          title="SHA-256 of the trader's anonymous ID"
                          className="px-2 py-0.5 rounded bg-[#0a0518] border border-purple-900/60 text-purple-300 font-mono text-[10px] flex items-center gap-1 w-fit"
                        >
                          <Hash className="w-3 h-3 text-purple-400" />
                          {trd.lastHash ? `${trd.lastHash.substring(0, 10)}...` : '—'}
                        </span>
                      </td>
                    </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-purple-300/60 text-xs">
                    No leaderboard entries yet. Log a trade in your Journal to claim #1 rank!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Disclaimer Footer */}
      <div className="p-4 rounded-xl bg-[#0a0518] border border-purple-900/40 text-[11px] font-mono text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-purple-300">Leaderboard Integrity Standard:</strong> Leaderboard statistics are compiled from user-logged trade journal entries. VIXY AI does not seed synthetic leaderboard entries or guarantee future trading performance.
        </p>
      </div>
    </div>
  );
};
