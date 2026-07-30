import React, { useState } from 'react';
import {
  ShieldCheck,
  DollarSign,
  Users,
  Activity,
  Server,
  MessageSquare,
  Sliders,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AdminStats, SupportTicket } from '../types';

interface AdminPanelProps {
  stats: AdminStats;
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ stats, tickets, setTickets }) => {
  const [minConfidenceOverride, setMinConfidenceOverride] = useState<number>(85);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleUpdateTicketStatus = (id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const handleSendTicketReply = () => {
    if (!selectedTicket || !replyText.trim()) return;
    handleUpdateTicketStatus(selectedTicket.id, 'RESOLVED');
    setReplyText('');
  };

  return (
    <div className="space-y-8 font-mono text-purple-100">
      {/* Admin Header */}
      <div className="bg-[#120B28] rounded-2xl border border-purple-500/40 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 font-mono">
              <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                ADMIN VAULT CONTROL CENTER
              </span>
              <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-xs font-bold">
                Master Admin: vixyvault0@gmail.com
              </span>
            </div>
            <h2 className="text-2xl font-black font-mono text-white tracking-tight">VIXY'S VAULT SaaS Telemetry & Management</h2>
            <p className="text-purple-300/60 text-xs mt-1 font-sans">
              Live recurring revenue, active subscriber metrics, server health, and support ticket queues.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#0B061A] px-4 py-2 rounded-xl border border-purple-900/40 font-mono text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
            <div>
              <span className="text-purple-300/50 text-[10px] block">Server Status</span>
              <span className="text-purple-300 font-bold">HEALTHY ({stats.apiLatencyMs}ms)</span>
            </div>
          </div>
        </div>

        {/* Core Admin Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40">
            <span className="text-purple-300/60 text-xs font-mono block">Monthly Recurring (MRR)</span>
            <div className="font-mono font-black text-2xl text-emerald-400 mt-1">${stats.mrr.toLocaleString()}</div>
            <span className="text-[10px] text-purple-300/50 font-mono">+18.4% vs last month</span>
          </div>

          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40">
            <span className="text-purple-300/60 text-xs font-mono block">Active Subscribers</span>
            <div className="font-mono font-black text-2xl text-purple-300 mt-1">{stats.activeSubscribers}</div>
            <span className="text-[10px] text-purple-300/50 font-mono">212 Pro / 36 Elite</span>
          </div>

          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40">
            <span className="text-purple-300/60 text-xs font-mono block">Predictions Today</span>
            <div className="font-mono font-black text-2xl text-purple-300 mt-1">{stats.predictionsToday}</div>
            <span className="text-[10px] text-purple-300/50 font-mono">96 / 96 Executed</span>
          </div>

          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40">
            <span className="text-purple-300/60 text-xs font-mono block">Model Win Rate</span>
            <div className="font-mono font-black text-2xl text-emerald-400 mt-1">{stats.winRate}%</div>
            <span className="text-[10px] text-purple-300/50 font-mono">Verified 30D Window</span>
          </div>

          <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40">
            <span className="text-purple-300/60 text-xs font-mono block">API Health & Latency</span>
            <div className="font-mono font-black text-2xl text-white mt-1">{stats.apiLatencyMs}ms</div>
            <span className="text-[10px] text-purple-300 font-mono">99.98% Uptime</span>
          </div>
        </div>
      </div>

      {/* Grid: Global Quant Controls & Support Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quant Override Controls - 5 Cols */}
        <div className="lg:col-span-5 bg-[#120B28] rounded-2xl border border-purple-500/30 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Global System Override</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-200">System-Wide Min Confidence Floor:</span>
                <span className="font-bold text-purple-300">{minConfidenceOverride}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="5"
                value={minConfidenceOverride}
                onChange={(e) => setMinConfidenceOverride(Number(e.target.value))}
                className="w-full accent-purple-500 bg-[#0B061A] h-2 rounded-lg"
              />
            </div>

            <div className="bg-[#0B061A] p-4 rounded-xl border border-purple-900/40 space-y-3">
              <span className="text-xs font-bold text-white block">Engine Emergency Mode</span>
              <button
                onClick={() => alert('Emergency Circuit Breaker Triggered: Suppressing signals lower than 92% confidence.')}
                className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Trigger Volatility Circuit Breaker</span>
              </button>
            </div>
          </div>
        </div>

        {/* Support Ticket Queue - 7 Cols */}
        <div className="lg:col-span-7 bg-[#120B28] rounded-2xl border border-purple-500/30 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Support Desk Queue</h3>
            </div>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
              {tickets.filter((t) => t.status !== 'RESOLVED').length} Active Tickets
            </span>
          </div>

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedTicket?.id === t.id
                    ? 'bg-purple-600/20 border-purple-500'
                    : 'bg-[#0B061A] border-purple-900/40 hover:border-purple-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{t.userEmail}</span>
                    <span className="text-[10px] text-purple-300/50">ID: {t.id}</span>
                  </div>
                  <p className="text-purple-300/70 text-xs font-sans truncate max-w-sm mt-0.5">{t.subject}</p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.status === 'RESOLVED'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>

          {selectedTicket && (
            <div className="mt-4 pt-4 border-t border-purple-900/40 space-y-3 bg-[#0B061A] p-4 rounded-xl border border-purple-900/40">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-purple-200">Ticket Detail: {selectedTicket.subject}</span>
                <span className="text-purple-300/50">{selectedTicket.userEmail}</span>
              </div>
              <p className="text-xs text-purple-300/70 font-sans">{selectedTicket.message}</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type admin response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSendTicketReply}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Reply & Resolve
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
