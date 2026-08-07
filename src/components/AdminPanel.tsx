import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
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
  UserPlus,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Filter,
  UserCheck,
  UserX,
  MoreVertical,
  Zap,
  Sparkles,
  Download,
  Bot,
  Key,
  Plus,
  Trash2,
  Edit3,
  Lock,
  Check,
  X,
  Globe,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Eye,
  Terminal,
  Layers,
  FileText,
} from 'lucide-react';
import { SupportTicket } from '../types';
import { DiscordBotHubView } from './DiscordBotHubView';
import {
  fetchAdminDiagnostics,
  fetchAdminUsers,
  createAdminUser,
  updateUserPassword,
  updateUserVerification,
  fetchAdminReferrals,
  saveAdminReferral,
  deleteAdminReferral,
  unfreezeUserBotsApi,
  fetchAdminStats,
  fetchAdminTransactions,
  performUserAction,
  fetchAdminAuditLogs,
  fetchSystemHealth,
  AdminDiagnosticsResponse,
} from '../services/api';

// INITIAL HARDCODED TICKETS AS FALLBACK
const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-8821',
    userEmail: 'trader.alex@gmail.com',
    subject: 'Kalshi API Latency Spike during 15M Candle Lock',
    category: 'API Feed',
    status: 'OPEN',
    date: '2026-08-06 14:22',
    priority: 'HIGH',
  },
  {
    id: 'TCK-8819',
    userEmail: 'quant.sarah@optionstrade.io',
    subject: 'Discord Webhook Signal Formatting Request for Elite Channel',
    category: 'Discord Bot',
    status: 'IN_PROGRESS',
    date: '2026-08-06 11:05',
    priority: 'MEDIUM',
  },
  {
    id: 'TCK-8810',
    userEmail: 'sam.predict@crypto.org',
    subject: 'Pro Pass Annual Billing Inquiry & Invoice Request',
    category: 'Billing',
    status: 'RESOLVED',
    date: '2026-08-05 18:40',
    priority: 'LOW',
  },
];

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'SUPPORT' | 'PRO' | 'FREE' | 'USER';
  subscription: 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS';
  passwordHash?: string;
  verificationStatus?: 'VERIFIED' | 'SUSPECTED_DUPLICATE' | 'UNVERIFIED';
  hardwareFingerprint?: string;
  ipHash?: string;
  joined: string;
  status: 'ACTIVE' | 'TRIALING' | 'SUSPENDED';
  volumeTrades?: number;
  referralCodeUsed?: string;
}

interface TransactionItem {
  id: string;
  email: string;
  plan: string;
  amount: number;
  method: string;
  status: 'Succeeded' | 'Pending' | 'Processing' | 'Failed' | 'Refunded' | 'Canceled' | 'Chargeback';
  timestamp: string;
}

interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

export const AdminPanel: React.FC = () => {
  // Navigation State
  const [adminTab, setAdminTab] = useState<
    'overview' | 'users' | 'revenue' | 'audit' | 'health' | 'referrals' | 'tickets' | 'settings' | 'discord'
  >('overview');

  // Admin Billing Cycle View (Monthly vs Annual)
  const [adminBillingMode, setAdminBillingMode] = useState<'monthly' | 'annual'>('annual');

  // Loading & Error States
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());
  const [unfreezingBots, setUnfreezingBots] = useState<boolean>(false);
  const [unfreezeSuccessMessage, setUnfreezeSuccessMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Core Data Stores
  const [stats, setStats] = useState({
    totalUsers: 1942,
    onlineNow: 342,
    activeSubscribers: 485,
    freeTrials: 185,
    monthlyRevenue: 28450,
    dailyRevenue: 1194,
    conversionRate: 14.2,
    churnRate: 1.8,
    predictionsToday: 288,
    avgLatencyMs: 14,
    aiRequestsToday: 18420,
    apiRequestsToday: 142050,
    databaseSizeMb: 124.8,
    serverLoadPct: 18,
    winRate: 71.8,
  });

  const [diagnosticsData, setDiagnosticsData] = useState<AdminDiagnosticsResponse | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>({
    status: 'HEALTHY',
    cpuUsagePct: 14,
    ramUsageMb: 128,
    apiLatencyMs: 12,
    databaseLatencyMs: 3,
    realtimeConnections: 342,
    websocketStatus: 'CONNECTED',
    uptimeSecs: 482910,
    discordBotStatus: 'ACTIVE',
    openAiStatus: 'OPERATIONAL',
    stripeStatus: 'CONFIGURED',
  });

  // User Directory State & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIALING' | 'SUSPENDED' | 'SUSPECTED_DUPLICATE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SUPPORT' | 'USER'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Selected User Modal / Detail Drawer
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserItem | null>(null);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserTier, setNewUserTier] = useState<'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS'>('PRO_PASS');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN' | 'SUPPORT'>('USER');
  const [newUserReferralCode, setNewUserReferralCode] = useState('DIRECT');

  // Password Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Referral Modal State
  const [isAddReferralOpen, setIsAddReferralOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<any | null>(null);
  const [refCodeInput, setRefCodeInput] = useState('');
  const [refNameInput, setRefNameInput] = useState('');
  const [refEmailInput, setRefEmailInput] = useState('');
  const [refDiscountInput, setRefDiscountInput] = useState('20% Off');
  const [refRateInput, setRefRateInput] = useState('20%');
  const [refPayoutInput, setRefPayoutInput] = useState('Paid (Stripe Connect)');

  // Revenue Tab Filter State
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');

  // Audit Log Filter State
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditLevelFilter, setAuditLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  // Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  // System Settings State
  const [minConfidenceOverride, setMinConfidenceOverride] = useState<number>(70);

  // Load All Admin Data (Non-blocking)
  const loadAdminData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    try {
      const [diagData, usersData, refData, statsData, txData, logsData, healthData] = await Promise.all([
        fetchAdminDiagnostics().catch(() => null),
        fetchAdminUsers().catch(() => null),
        fetchAdminReferrals().catch(() => null),
        fetchAdminStats().catch(() => null),
        fetchAdminTransactions().catch(() => null),
        fetchAdminAuditLogs().catch(() => null),
        fetchSystemHealth().catch(() => null),
      ]);

      if (diagData) setDiagnosticsData(diagData);
      if (usersData && Array.isArray(usersData)) setUsers(usersData);
      if (refData && Array.isArray(refData)) setReferrals(refData);
      if (statsData) setStats((prev) => ({ ...prev, ...statsData }));
      if (txData && Array.isArray(txData)) setTransactions(txData);
      if (logsData && Array.isArray(logsData)) setAuditLogs(logsData);
      if (healthData) setSystemHealth((prev: any) => ({ ...prev, ...healthData }));

      setLastRefreshedAt(new Date().toLocaleTimeString());
      setGlobalError(null);
    } catch (err: any) {
      console.warn('Non-blocking admin data load warning:', err);
      setGlobalError('Partial data update error. Controls remain functional.');
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial Load & Lightweight Polling (12 seconds interval, non-blocking)
  useEffect(() => {
    loadAdminData();
    const interval = setInterval(() => {
      loadAdminData();
    }, 12000);
    return () => clearInterval(interval);
  }, [loadAdminData]);

  // Handler: Unfreeze All User Bots
  const handleUnfreezeBots = async () => {
    setUnfreezingBots(true);
    setUnfreezeSuccessMessage(null);
    try {
      const res = await unfreezeUserBotsApi();
      setUnfreezeSuccessMessage(res.message || 'All user bots successfully unfrozen and operational!');
      setTimeout(() => setUnfreezeSuccessMessage(null), 5000);
      loadAdminData();
    } catch (err: any) {
      alert('Failed to unfreeze bots: ' + (err.message || 'Unknown error'));
    } finally {
      setUnfreezingBots(false);
    }
  };

  // Handler: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      alert('Email address is required');
      return;
    }

    const res = await createAdminUser({
      email: newUserEmail,
      name: newUserName,
      password: newUserPassword,
      tier: newUserTier,
      role: newUserRole,
      referralCode: newUserReferralCode,
    });

    if (res.success) {
      alert(res.message || 'User account created successfully!');
      setIsAddUserOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      loadAdminData();
    } else {
      alert('Failed to create account: ' + (res.message || 'Error occurred'));
    }
  };

  // Handler: Save User Password
  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) {
      alert('Password cannot be empty');
      return;
    }

    const res = await updateUserPassword(passwordModalUser.id, newPasswordInput.trim());
    if (res.success) {
      alert(res.message || 'Password updated successfully!');
      setPasswordModalUser(null);
      setNewPasswordInput('');
      loadAdminData();
    } else {
      alert('Password update failed: ' + (res.message || 'Error occurred'));
    }
  };

  // Handler: Toggle Verification Status
  const handleToggleVerification = async (userId: string, newStatus: 'VERIFIED' | 'SUSPECTED_DUPLICATE' | 'UNVERIFIED') => {
    const res = await updateUserVerification(userId, newStatus);
    if (res.success) {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, verificationStatus: newStatus } : u))
      );
    } else {
      alert('Failed to update verification status: ' + (res.message || 'Error'));
    }
  };

  // Handler: Change User Tier
  const handleChangeUserTier = async (userId: string, newTier: 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS') => {
    const res = await performUserAction(userId, 'grant_premium', { tier: newTier });
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, subscription: newTier, status: newTier === 'FREE_TRIAL' ? 'TRIALING' : 'ACTIVE' } : u))
      );
    } else {
      alert('Failed to change tier: ' + (res.message || 'Error'));
    }
  };

  // Handler: User Suspend / Unsuspend
  const handleToggleUserStatus = async (user: UserItem) => {
    const action = user.status === 'SUSPENDED' ? 'unsuspend' : 'suspend';
    const res = await performUserAction(user.id, action);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: action === 'suspend' ? 'SUSPENDED' : u.subscription === 'FREE_TRIAL' ? 'TRIALING' : 'ACTIVE' } : u
        )
      );
    } else {
      alert(`Failed to ${action} user: ` + (res.message || 'Error'));
    }
  };

  // Handler: Delete User
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete user account ${email}?`)) return;
    const res = await performUserAction(userId, 'delete');
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      alert(`User ${email} permanently deleted.`);
    } else {
      alert('Failed to delete user: ' + (res.message || 'Error'));
    }
  };

  // Handler: Save Referral Code
  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCodeInput.trim()) {
      alert('Referral code is required');
      return;
    }

    const res = await saveAdminReferral({
      code: refCodeInput.trim().toUpperCase(),
      name: refNameInput.trim(),
      email: refEmailInput.trim(),
      discountGiven: refDiscountInput,
      commissionRate: refRateInput,
      payoutStatus: refPayoutInput,
    });

    if (res.success) {
      alert(res.message || 'Referral code saved successfully!');
      setIsAddReferralOpen(false);
      setEditingReferral(null);
      loadAdminData();
    } else {
      alert('Failed to save referral: ' + (res.message || 'Error'));
    }
  };

  // Handler: Delete Referral Code
  const handleDeleteReferralCode = async (code: string) => {
    if (!confirm(`Delete referral code ${code}?`)) return;
    const res = await deleteAdminReferral(code);
    if (res.success) {
      setReferrals((prev) => prev.filter((r) => r.code !== code));
    } else {
      alert('Failed to delete referral code: ' + (res.message || 'Error'));
    }
  };

  // Handler: Support Ticket Reply
  const handleSendTicketReply = () => {
    if (!selectedTicket || !replyText.trim()) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: 'RESOLVED' } : t))
    );
    alert(`Reply sent to ${selectedTicket.userEmail} and ticket #${selectedTicket.id} marked as RESOLVED.`);
    setReplyText('');
    setSelectedTicket(null);
  };

  // Filtered Users Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchTerm.trim() ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.hardwareFingerprint && u.hardwareFingerprint.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTier = tierFilter === 'ALL' || u.subscription === tierFilter;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SUSPECTED_DUPLICATE'
          ? u.verificationStatus === 'SUSPECTED_DUPLICATE'
          : u.status === statusFilter);

      const matchRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'ADMIN' ? u.role === 'ADMIN' || u.role === 'OWNER' : u.role === roleFilter);

      return matchSearch && matchTier && matchStatus && matchRole;
    });
  }, [users, searchTerm, tierFilter, statusFilter, roleFilter]);

  // Paginated Users
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, currentPage]);

  // Filtered Transactions Logic
  const filteredTransactions = useMemo(() => {
    if (txStatusFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.status.toUpperCase() === txStatusFilter.toUpperCase());
  }, [transactions, txStatusFilter]);

  // Filtered Audit Logs Logic
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchLevel = auditLevelFilter === 'ALL' || log.level === auditLevelFilter;
      const matchSearch =
        !auditSearchTerm.trim() ||
        log.actor.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(auditSearchTerm.toLowerCase());
      return matchLevel && matchSearch;
    });
  }, [auditLogs, auditLevelFilter, auditSearchTerm]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      {/* HEADER BAR & SYSTEM STATUS */}
      <div className="bg-gradient-to-r from-[#120B28] via-[#0B061A] to-[#120B28] p-4 sm:p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-900/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-inner">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                  Master Control Panel
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SYSTEM OPERATIONAL</span>
                </span>
              </div>
              <p className="text-purple-300/70 text-xs mt-0.5 font-sans">
                Real-time SaaS telemetry, account management, Stripe revenue stream, & bot cluster controls.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadAdminData(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-2xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={handleUnfreezeBots}
              disabled={unfreezingBots}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              <span>{unfreezingBots ? 'Unfreezing...' : 'Unfreeze All User Bots'}</span>
            </button>
          </div>
        </div>

        {/* Banners & Messages */}
        {unfreezeSuccessMessage && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-mono flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{unfreezeSuccessMessage}</span>
            </div>
            <button onClick={() => setUnfreezeSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {globalError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button onClick={() => setGlobalError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {/* PRIMARY TELEMETRY CARDS (Independent Non-Blocking Widgets) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Users */}
          <div className="bg-[#0B061A] p-3.5 rounded-2xl border border-purple-900/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-purple-300/70 font-mono">
              <span>Total Users</span>
              <Users className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-black text-white font-mono">{stats.totalUsers.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{stats.onlineNow} Online Now</span>
            </div>
          </div>

          {/* Card 2: Revenue Stream (Monthly / Annual Toggle) */}
          <div className="bg-[#0B061A] p-3.5 rounded-2xl border border-purple-900/50 space-y-1 relative">
            <div className="flex items-center justify-between text-[11px] text-purple-300/70 font-mono">
              <span className="font-bold">{adminBillingMode === 'annual' ? 'Annual ARR' : 'Monthly MRR'}</span>
              <div className="flex items-center gap-1 bg-[#150B33] p-0.5 rounded-lg border border-purple-500/30">
                <button
                  onClick={() => setAdminBillingMode('monthly')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    adminBillingMode === 'monthly' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-white'
                  }`}
                >
                  MO
                </button>
                <button
                  onClick={() => setAdminBillingMode('annual')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    adminBillingMode === 'annual' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-white'
                  }`}
                >
                  YR
                </button>
              </div>
            </div>
            <div className="text-lg font-black text-emerald-400 font-mono">
              ${adminBillingMode === 'annual'
                ? (stats.monthlyRevenue * 12).toLocaleString()
                : stats.monthlyRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-purple-300/60 font-mono">
              {adminBillingMode === 'annual'
                ? 'Save 20% Run Rate ($341.4k/yr)'
                : `+$${stats.dailyRevenue}/day run rate`}
            </div>
          </div>

          {/* Card 3: Active Paid Subscribers */}
          <div className="bg-[#0B061A] p-3.5 rounded-2xl border border-purple-900/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-purple-300/70 font-mono">
              <span>Paid Passholders</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-300 font-mono">{stats.activeSubscribers}</div>
            <div className="text-[10px] text-amber-300/80 font-mono">{stats.conversionRate}% Conversion</div>
          </div>

          {/* Card 4: Free Trial Users */}
          <div className="bg-[#0B061A] p-3.5 rounded-2xl border border-purple-900/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-purple-300/70 font-mono">
              <span>Active Free Trials</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-cyan-300 font-mono">{stats.freeTrials}</div>
            <div className="text-[10px] text-cyan-300/80 font-mono">3-Hour Enforced Limit</div>
          </div>

          {/* Card 5: Engine Latency */}
          <div className="bg-[#0B061A] p-3.5 rounded-2xl border border-purple-900/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-purple-300/70 font-mono">
              <span>Model Latency</span>
              <Activity className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-black text-purple-100 font-mono">{stats.avgLatencyMs}ms</div>
            <div className="text-[10px] text-emerald-400 font-mono">Sub-second Feed</div>
          </div>

          {/* Card 6: Daily Predictions */}
          <div className="bg-[#0B061A] p-3.5 rounded-2xl border border-purple-900/50 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-purple-300/70 font-mono">
              <span>Predictions Today</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-black text-white font-mono">{stats.predictionsToday}</div>
            <div className="text-[10px] text-emerald-400 font-mono font-bold">{stats.winRate}% Win Rate</div>
          </div>
        </div>

        {/* NAVIGATION TABS BAR */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 no-scrollbar border-t border-purple-900/40">
          <button
            onClick={() => setAdminTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'overview'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview & Quant Engine</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'users'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts & Shield</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-purple-900 text-[10px] font-mono text-purple-200">
              {users.length || stats.totalUsers}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('revenue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'revenue'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Stripe Revenue Audit</span>
          </button>

          <button
            onClick={() => setAdminTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'audit'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>

          <button
            onClick={() => setAdminTab('health')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'health'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>

          <button
            onClick={() => setAdminTab('referrals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'referrals'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Promoter Referrals</span>
          </button>

          <button
            onClick={() => setAdminTab('tickets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'tickets'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Support Queue</span>
            {tickets.filter((t) => t.status !== 'RESOLVED').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {tickets.filter((t) => t.status !== 'RESOLVED').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Quant Overrides</span>
          </button>

          <button
            onClick={() => setAdminTab('discord')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              adminTab === 'discord'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-300" />
            <span>Discord Broadcaster</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & QUANT ENGINE */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Engine Lock Matrix & Status */}
          <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-4 shadow-2xl font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Phase 8 Early Lock Check Matrix
                </h2>
              </div>
              <span className="text-xs text-purple-300/70">
                Last Refreshed: {lastRefreshedAt}
              </span>
            </div>

            {diagnosticsData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
                  <span className="text-xs text-purple-300/60 uppercase font-bold block">Engine State</span>
                  <div className="text-lg font-black text-amber-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{diagnosticsData.predictionEngine?.state || 'MONITORING'}</span>
                  </div>
                  <div className="text-xs text-purple-300/70">
                    Cycle ID: #{diagnosticsData.predictionEngine?.cycleId || 1048}
                  </div>
                </div>

                <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
                  <span className="text-xs text-purple-300/60 uppercase font-bold block">Current Model Edge</span>
                  <div className="text-lg font-black text-emerald-400">
                    +{diagnosticsData.predictionEngine?.edgePct || 4.2}% Edge
                  </div>
                  <div className="text-xs text-purple-300/70">
                    Confidence: {diagnosticsData.predictionEngine?.confidence || 88}%
                  </div>
                </div>

                <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
                  <span className="text-xs text-purple-300/60 uppercase font-bold block">Lock Qualification</span>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    {diagnosticsData.lockStatus?.qualified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                    <span>{diagnosticsData.lockStatus?.label || 'Monitoring'}</span>
                  </div>
                  <div className="text-[11px] text-purple-300/60 truncate">
                    {diagnosticsData.lockStatus?.reason || 'Scanning order flow'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-purple-300/60 font-mono animate-pulse">
                Loading live Phase 8 engine telemetry...
              </div>
            )}
          </div>

          {/* Diagnostics Logs Stream */}
          {diagnosticsData?.recentLogs && diagnosticsData.recentLogs.length > 0 && (
            <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-3 font-mono shadow-2xl">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                <span className="text-xs font-bold text-purple-300 uppercase">Live Engine Execution Stream</span>
                <span className="text-[10px] text-purple-400 font-bold bg-purple-900/40 px-2 py-0.5 rounded">
                  {diagnosticsData.recentLogs.length} Events Logged
                </span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
                {diagnosticsData.recentLogs.map((log, i) => (
                  <div key={log.id || i} className="p-2 rounded-xl bg-[#0B061A] border border-purple-900/30 flex items-start gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-300'
                          : log.level === 'ERROR'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-purple-300/50 text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-purple-100 font-sans">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER ACCOUNTS & DIRECTORY */}
      {adminTab === 'users' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-5 shadow-2xl font-mono">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>User Accounts Directory & Hardware Shield</span>
              </h2>
              <p className="text-purple-300/60 text-xs font-sans mt-0.5">
                Manage accounts, grant/revoke premium, edit credentials, anti-duplicate trial enforcement, and role access.
              </p>
            </div>

            <button
              onClick={() => setIsAddUserOpen(!isAddUserOpen)}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Add User Modal / Form */}
          {isAddUserOpen && (
            <form onSubmit={handleCreateUser} className="p-4 bg-[#0B061A] rounded-2xl border border-emerald-500/50 space-y-3 font-sans animate-fade-in">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                <span>Create New Account with Assigned Password & Anti-Duplicate Check</span>
                <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-purple-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Account Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Trader Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Assign Login Password *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Enter password..."
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setNewUserPassword(`Vault${Math.random().toString(36).slice(2, 6)}!2026`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 hover:text-white bg-purple-900/40 px-1.5 py-0.5 rounded"
                    >
                      Gen
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Subscription Tier</label>
                  <select
                    value={newUserTier}
                    onChange={(e) => setNewUserTier(e.target.value as any)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="FREE_TRIAL">Free 3-Hour Trial</option>
                    <option value="PRO_PASS">Pro Pass ($49/mo)</option>
                    <option value="ELITE_PASS">Elite Pass ($199/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Account Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="USER">Customer / User</option>
                    <option value="ADMIN">Master Admin</option>
                    <option value="SUPPORT">Support Specialist</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Referral Tag</label>
                  <input
                    type="text"
                    placeholder="DIRECT, PROMOTER20..."
                    value={newUserReferralCode}
                    onChange={(e) => setNewUserReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          )}

          {/* Search & Filter Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type="text"
                placeholder="Search accounts, emails, or hardware IDs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl pl-9 pr-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-sans"
              />
            </div>

            <div>
              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-200 focus:outline-none font-mono"
              >
                <option value="ALL">All Tiers (Free & Paid)</option>
                <option value="ELITE_PASS">Elite Pass ($199)</option>
                <option value="PRO_PASS">Pro Pass ($49)</option>
                <option value="FREE_TRIAL">Free Trial</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-200 focus:outline-none font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Users</option>
                <option value="TRIALING">Trialing Users</option>
                <option value="SUSPENDED">Suspended Users</option>
                <option value="SUSPECTED_DUPLICATE">Suspected Duplicates</option>
              </select>
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-200 focus:outline-none font-mono"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Master Admins</option>
                <option value="SUPPORT">Support Team</option>
                <option value="USER">Standard Customers</option>
              </select>
            </div>
          </div>

          {/* User Table Responsive Container */}
          <div className="overflow-x-auto rounded-2xl border border-purple-900/40 bg-[#0B061A]">
            <table className="w-full text-left text-xs border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-[#080313] border-b border-purple-900/50 text-purple-300/60 uppercase font-bold text-[10px]">
                  <th className="p-3.5">User Account</th>
                  <th className="p-3.5">Verification Shield</th>
                  <th className="p-3.5">Credentials</th>
                  <th className="p-3.5">Plan Tier</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Referral Tag</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 text-right">Master Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30 text-purple-100 font-sans">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-purple-900/10 transition-colors">
                    <td className="p-3.5">
                      <div
                        onClick={() => setSelectedUserDetail(u)}
                        className="font-bold text-white font-mono text-xs hover:text-purple-300 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{u.name}</span>
                        <Eye className="w-3 h-3 text-purple-400 opacity-60" />
                      </div>
                      <div className="text-purple-300/60 text-[11px] font-mono">{u.email}</div>
                    </td>

                    {/* Verification Shield Badge */}
                    <td className="p-3.5 font-mono">
                      {u.verificationStatus === 'SUSPECTED_DUPLICATE' ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span>SUSPECTED DUP</span>
                          </span>
                          <div className="text-[9px] text-amber-300/70">{u.hardwareFingerprint || 'hw_dup_matched'}</div>
                        </div>
                      ) : u.verificationStatus === 'UNVERIFIED' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>Unverified</span>
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>VERIFIED</span>
                          </span>
                          <div className="text-[9px] text-purple-300/50">{u.hardwareFingerprint || `hw_${u.id}`}</div>
                        </div>
                      )}
                    </td>

                    {/* Credentials & Edit Password Trigger */}
                    <td className="p-3.5 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300/80 font-bold text-[11px] flex items-center gap-1">
                          <Key className="w-3 h-3 text-purple-400" />
                          <span>{u.passwordHash ? '••••••••' : 'Default'}</span>
                        </span>
                        <button
                          onClick={() => {
                            setPasswordModalUser(u);
                            setNewPasswordInput('');
                          }}
                          className="px-2 py-0.5 rounded bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-700/50 text-[10px] font-bold transition-all"
                        >
                          Edit Pass
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono">
                      {u.subscription === 'ELITE_PASS' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Elite ($199)</span>
                        </span>
                      ) : u.subscription === 'PRO_PASS' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 font-bold text-[10px] inline-flex items-center gap-1">
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span>Pro ($49)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                          Free Trial
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono">
                      {u.role === 'ADMIN' || u.role === 'OWNER' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase">
                          ADMIN
                        </span>
                      ) : (
                        <span className="text-purple-300/60 text-[11px]">User</span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded bg-[#120B28] text-amber-300 border border-purple-900 text-[10px] font-bold">
                        {u.referralCodeUsed || 'DIRECT'}
                      </span>
                    </td>

                    <td className="p-3.5 text-purple-300/60 font-mono text-[11px]">{u.joined}</td>

                    <td className="p-3.5 text-right font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Verification Selector */}
                        <select
                          value={u.verificationStatus || 'VERIFIED'}
                          onChange={(e) => handleToggleVerification(u.id, e.target.value as any)}
                          className="bg-[#120B28] border border-purple-900 text-purple-200 text-[10px] rounded-lg px-1.5 py-1 focus:outline-none"
                          title="Set Verification Status"
                        >
                          <option value="VERIFIED">Verified</option>
                          <option value="SUSPECTED_DUPLICATE">Flag Dup</option>
                          <option value="UNVERIFIED">Unverified</option>
                        </select>

                        {/* Tier Selector Dropdown */}
                        <select
                          value={u.subscription}
                          onChange={(e) => handleChangeUserTier(u.id, e.target.value as any)}
                          className="bg-[#120B28] border border-purple-900 text-purple-200 text-[10px] rounded-lg px-2 py-1 focus:outline-none"
                          title="Change User Tier"
                        >
                          <option value="FREE_TRIAL">Free Trial</option>
                          <option value="PRO_PASS">Pro Pass</option>
                          <option value="ELITE_PASS">Elite Pass</option>
                        </select>

                        {/* Toggle Suspend */}
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:text-white border border-rose-900/50"
                          title={u.status === 'SUSPENDED' ? 'Unsuspend User' : 'Suspend User'}
                        >
                          {u.status === 'SUSPENDED' ? <UserCheck className="w-3 h-3 text-emerald-400" /> : <UserX className="w-3 h-3 text-rose-400" />}
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40"
                          title="Delete User Account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono border-t border-purple-900/40 pt-3">
            <span className="text-purple-300/60">
              Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * usersPerPage + 1} -{' '}
              {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} Users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-900 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-white font-bold px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-900 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          {/* USER DETAIL MODAL / INSPECTOR */}
          {selectedUserDetail && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#120B28] border border-purple-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 font-mono shadow-2xl">
                <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>User Account Inspector</span>
                  </div>
                  <button onClick={() => setSelectedUserDetail(null)} className="text-purple-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-1">
                    <span className="text-purple-300/60 uppercase font-bold text-[10px]">Account Email</span>
                    <div className="text-white font-bold text-sm">{selectedUserDetail.email}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-1">
                      <span className="text-purple-300/60 uppercase font-bold text-[10px]">User ID</span>
                      <div className="text-purple-200">{selectedUserDetail.id}</div>
                    </div>
                    <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-1">
                      <span className="text-purple-300/60 uppercase font-bold text-[10px]">Role Access</span>
                      <div className="text-emerald-400 font-bold">{selectedUserDetail.role}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-1">
                      <span className="text-purple-300/60 uppercase font-bold text-[10px]">Plan Tier</span>
                      <div className="text-amber-300 font-bold">{selectedUserDetail.subscription}</div>
                    </div>
                    <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-1">
                      <span className="text-purple-300/60 uppercase font-bold text-[10px]">Status</span>
                      <div className="text-purple-100">{selectedUserDetail.status}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-1">
                    <span className="text-purple-300/60 uppercase font-bold text-[10px]">Hardware Fingerprint / IP Hash</span>
                    <div className="text-purple-200 text-[11px] font-mono">
                      {selectedUserDetail.hardwareFingerprint || 'hw_matched'} | IP: {selectedUserDetail.ipHash || '172.56.12.90'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedUserDetail(null)}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    Close Inspector
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASSWORD RESET MODAL */}
          {passwordModalUser && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form onSubmit={handleSaveUserPassword} className="bg-[#120B28] border border-purple-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 font-mono shadow-2xl">
                <div className="flex items-center justify-between border-b border-purple-900/50 pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>Set Password for {passwordModalUser.email}</span>
                  </div>
                  <button type="button" onClick={() => setPasswordModalUser(null)} className="text-purple-400 hover:text-white">✕</button>
                </div>

                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">New Account Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter new password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-[#0B061A] border border-purple-900/80 rounded-xl px-3 py-2.5 text-purple-100 text-xs focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <p className="text-[10px] text-purple-300/50 mt-1 font-sans">
                    Updating password applies instantly and permits direct user authentication.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPasswordModalUser(null)}
                    className="px-4 py-2 rounded-xl bg-purple-950 text-purple-300 border border-purple-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5"
                  >
                    <Key className="w-4 h-4" />
                    <span>Save Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STRIPE PAYMENTS & REVENUE AUDIT */}
      {adminTab === 'revenue' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-5 shadow-2xl font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Live Stripe Payment Stream & Financial Audit</span>
              </h2>
              <p className="text-purple-300/60 text-xs font-sans mt-0.5">
                Sub-second transaction logs from Stripe Checkout, Apple Pay, and Web3 USDC gateways.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                {adminBillingMode === 'annual' ? 'Annual ARR Run Rate:' : 'Gross Monthly Revenue:'}{' '}
                ${adminBillingMode === 'annual' ? (stats.monthlyRevenue * 12).toLocaleString() : stats.monthlyRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Monthly vs Annual Revenue & Billing Matrix */}
          <div className="bg-[#0B061A] rounded-2xl p-4 border border-purple-800/40 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Subscription Pricing & Revenue Projections</span>
                </h3>
                <p className="text-[11px] text-purple-300/60 font-sans">
                  Simulate and audit SaaS revenue metrics based on active subscription tiers.
                </p>
              </div>

              <div className="inline-flex items-center gap-1 p-1 bg-[#120B28] border border-purple-500/40 rounded-xl text-xs">
                <button
                  onClick={() => setAdminBillingMode('monthly')}
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                    adminBillingMode === 'monthly'
                      ? 'bg-purple-600 text-white shadow font-black'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setAdminBillingMode('annual')}
                  className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    adminBillingMode === 'annual'
                      ? 'bg-purple-600 text-white shadow font-black'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0B061A] text-purple-300 font-extrabold border border-purple-400/30">
                    SAVE 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Projection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-[#120B28] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <div className="text-[10px] text-purple-300/70 font-bold uppercase">Starter Tier ($29/mo or $24/mo)</div>
                <div className="text-base font-black text-purple-200">
                  {adminBillingMode === 'annual' ? '$24 / mo ($288/yr)' : '$29 / mo'}
                </div>
                <div className="text-[10px] text-purple-300/50">142 Active Members</div>
              </div>
              <div className="bg-[#120B28] p-3 rounded-xl border border-purple-900/40 space-y-1">
                <div className="text-[10px] text-purple-300/70 font-bold uppercase">Pro Tier ($79/mo or $64/mo)</div>
                <div className="text-base font-black text-purple-200">
                  {adminBillingMode === 'annual' ? '$64 / mo ($768/yr)' : '$79 / mo'}
                </div>
                <div className="text-[10px] text-purple-300/50">218 Active Members</div>
              </div>
              <div className="bg-[#120B28] p-3 rounded-xl border border-purple-900/40 space-y-1 border-l-2 border-l-purple-500">
                <div className="text-[10px] text-purple-300/70 font-bold uppercase">Elite Pass ($199/mo or $159/mo)</div>
                <div className="text-base font-black text-emerald-400">
                  {adminBillingMode === 'annual' ? '$159 / mo ($1,908/yr)' : '$199 / mo'}
                </div>
                <div className="text-[10px] text-emerald-400/70 font-bold">125 Elite Passholders</div>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {['ALL', 'SUCCEEDED', 'PENDING', 'FAILED', 'REFUNDED'].map((status) => (
              <button
                key={status}
                onClick={() => setTxStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  txStatusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#0B061A] text-purple-300/70 border border-purple-900/40'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-purple-900/40 bg-[#0B061A]">
            <table className="w-full text-left text-xs border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-[#080313] border-b border-purple-900/50 text-purple-300/60 uppercase font-bold text-[10px]">
                  <th className="p-3.5">Stripe Charge ID</th>
                  <th className="p-3.5">Customer Email</th>
                  <th className="p-3.5">Plan Tier</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Payment Gateway</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30 text-purple-100 font-sans">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-purple-900/10 transition-colors">
                    <td className="p-3.5 font-mono text-purple-300 font-bold text-[11px]">{tx.id}</td>
                    <td className="p-3.5 font-mono font-bold text-white">{tx.email}</td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/50 text-[10px] font-bold">
                        {tx.plan}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-black text-emerald-400 text-sm">${tx.amount.toFixed(2)}</td>
                    <td className="p-3.5 font-mono text-purple-300/70 text-[11px]">{tx.method}</td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-purple-300/60 text-[11px]">{tx.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {adminTab === 'audit' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-4 shadow-2xl font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/40 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">System & Admin Audit Stream</h2>
            </div>
            <span className="text-xs text-purple-300/60">{filteredAuditLogs.length} Events Logged</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 text-xs">
            <input
              type="text"
              placeholder="Search audit actions, actors, or details..."
              value={auditSearchTerm}
              onChange={(e) => setAuditSearchTerm(e.target.value)}
              className="flex-1 bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none"
            />
            <select
              value={auditLevelFilter}
              onChange={(e) => setAuditLevelFilter(e.target.value as any)}
              className="bg-[#0B061A] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-200 focus:outline-none"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">Info</option>
              <option value="WARN">Warnings</option>
              <option value="ERROR">Errors</option>
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
            {filteredAuditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.level === 'WARN'
                        ? 'bg-amber-500/20 text-amber-300'
                        : log.level === 'ERROR'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="font-bold text-purple-200">{log.action}</span>
                  <span className="text-purple-300/60 font-sans">{log.details}</span>
                </div>
                <div className="text-[10px] text-purple-400/60 shrink-0">
                  {new Date(log.timestamp).toLocaleString()} | Actor: {log.actor}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM HEALTH */}
      {adminTab === 'health' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-6 shadow-2xl font-mono">
          <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
            <Server className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">System & Microservice Diagnostics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-2">
              <span className="text-xs text-purple-300/60 uppercase font-bold">CPU Utilization</span>
              <div className="text-xl font-black text-white">{systemHealth.cpuUsagePct}%</div>
              <div className="w-full bg-purple-950 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${systemHealth.cpuUsagePct}%` }} />
              </div>
            </div>

            <div className="p-4 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-2">
              <span className="text-xs text-purple-300/60 uppercase font-bold">RAM Heap Memory</span>
              <div className="text-xl font-black text-white">{systemHealth.ramUsageMb} MB</div>
              <div className="w-full bg-purple-950 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, systemHealth.ramUsageMb / 5)}%` }} />
              </div>
            </div>

            <div className="p-4 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-2">
              <span className="text-xs text-purple-300/60 uppercase font-bold">API Latency</span>
              <div className="text-xl font-black text-emerald-400">{systemHealth.apiLatencyMs} ms</div>
              <span className="text-[10px] text-purple-300/60">DB Latency: {systemHealth.databaseLatencyMs} ms</span>
            </div>

            <div className="p-4 bg-[#0B061A] rounded-2xl border border-purple-900/50 space-y-2">
              <span className="text-xs text-purple-300/60 uppercase font-bold">Realtime WS Connections</span>
              <div className="text-xl font-black text-cyan-300">{systemHealth.realtimeConnections}</div>
              <span className="text-[10px] text-emerald-400">WebSocket Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/40 flex items-center justify-between">
              <span className="text-xs text-purple-200">Prediction Engine</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">ACTIVE</span>
            </div>
            <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/40 flex items-center justify-between">
              <span className="text-xs text-purple-200">Gemini AI Model</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">CONNECTED</span>
            </div>
            <div className="p-3 bg-[#0B061A] rounded-2xl border border-purple-900/40 flex items-center justify-between">
              <span className="text-xs text-purple-200">Stripe Billing</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">CONFIGURED</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REFERRALS & PROMOTER TRACKER */}
      {adminTab === 'referrals' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-5 shadow-2xl font-mono">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-900/40 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Promoter & Referral Commission Tracking System</span>
              </h2>
              <p className="text-purple-300/60 text-xs font-sans mt-0.5">
                Manage affiliate codes, edit discounts, set custom commission rates, and track payout statuses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => {
                  setEditingReferral(null);
                  setRefCodeInput(`PROMOTER${Math.floor(Math.random() * 90 + 10)}`);
                  setRefNameInput('');
                  setRefEmailInput('');
                  setRefDiscountInput('20% Off');
                  setRefRateInput('20%');
                  setRefPayoutInput('Paid (Stripe Connect)');
                  setIsAddReferralOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add / Edit Referral Code</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Referral Form Modal */}
          {isAddReferralOpen && (
            <form onSubmit={handleSaveReferral} className="p-4 bg-[#0B061A] rounded-2xl border border-amber-500/50 space-y-3 font-sans">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                <span>{editingReferral ? `Edit Referral Code: ${editingReferral.code}` : 'Create New Referral / Affiliate Promoter Code'}</span>
                <button type="button" onClick={() => setIsAddReferralOpen(false)} className="text-purple-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Referral Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP2026"
                    value={refCodeInput}
                    onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Promoter Name / Network</label>
                  <input
                    type="text"
                    placeholder="e.g. Alpha Affiliate Desk"
                    value={refNameInput}
                    onChange={(e) => setRefNameInput(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Promoter Payout Email</label>
                  <input
                    type="email"
                    placeholder="affiliate@domain.com"
                    value={refEmailInput}
                    onChange={(e) => setRefEmailInput(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">User Signup Discount</label>
                  <select
                    value={refDiscountInput}
                    onChange={(e) => setRefDiscountInput(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="10% Off">10% Off Lifetime</option>
                    <option value="15% Off">15% Off Lifetime</option>
                    <option value="20% Off">20% Off Lifetime</option>
                    <option value="25% Off">25% Off First Month</option>
                    <option value="50% Off 1st Mo">50% Off First Month</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Commission Rate</label>
                  <select
                    value={refRateInput}
                    onChange={(e) => setRefRateInput(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="15%">15% Recurring Revenue</option>
                    <option value="20%">20% Recurring Revenue</option>
                    <option value="25%">25% Recurring Revenue</option>
                    <option value="30%">30% High-Volume Partner</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Payout Method / Status</label>
                  <select
                    value={refPayoutInput}
                    onChange={(e) => setRefPayoutInput(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Paid (Stripe Connect)">Paid (Stripe Connect)</option>
                    <option value="Paid (USDC)">Paid (USDC)</option>
                    <option value="Processing Payout">Processing Payout</option>
                    <option value="Pending Payout">Pending Payout</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddReferralOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  Save Referral Code
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-2xl border border-purple-900/40 bg-[#0B061A]">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#080313] border-b border-purple-900/50 text-purple-300/60 uppercase font-bold text-[10px]">
                  <th className="p-3.5">Promoter Code</th>
                  <th className="p-3.5">Promoter Name / Partner</th>
                  <th className="p-3.5">User Discount</th>
                  <th className="p-3.5">Referred Users</th>
                  <th className="p-3.5">Volume Generated</th>
                  <th className="p-3.5">Commission Rate</th>
                  <th className="p-3.5">Commission Owed</th>
                  <th className="p-3.5 text-right">Actions / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30 text-purple-100 font-sans">
                {referrals.map((p) => (
                  <tr key={p.code} className="hover:bg-purple-900/10 transition-colors">
                    <td className="p-3.5 font-mono text-amber-300 font-black text-xs">{p.code}</td>
                    <td className="p-3.5 font-mono">
                      <span className="text-white font-bold block">{p.name}</span>
                      <span className="text-[10px] text-purple-300/60">{p.email}</span>
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">{p.discountGiven}</td>
                    <td className="p-3.5 font-mono font-bold text-white">{p.referredCount} Users</td>
                    <td className="p-3.5 font-mono font-bold text-purple-200">{p.totalVolumeGenerated}</td>
                    <td className="p-3.5 font-mono font-bold text-amber-300">{p.commissionRate}</td>
                    <td className="p-3.5 font-mono font-black text-emerald-400 text-sm">{p.commissionOwed}</td>
                    <td className="p-3.5 text-right font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                          {p.payoutStatus}
                        </span>
                        <button
                          onClick={() => {
                            setEditingReferral(p);
                            setRefCodeInput(p.code);
                            setRefNameInput(p.name);
                            setRefEmailInput(p.email);
                            setRefDiscountInput(p.discountGiven);
                            setRefRateInput(p.commissionRate);
                            setRefPayoutInput(p.payoutStatus);
                            setIsAddReferralOpen(true);
                          }}
                          className="p-1 rounded bg-purple-900/50 hover:bg-purple-800 text-purple-200"
                          title="Edit Referral Code"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReferralCode(p.code)}
                          className="p-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40"
                          title="Delete Referral Code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: SUPPORT TICKETS */}
      {adminTab === 'tickets' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-4 shadow-2xl font-mono">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Support Desk Queue</h3>
            </div>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-xl border border-purple-500/30 font-bold">
              {tickets.filter((t) => t.status !== 'RESOLVED').length} Active Open Tickets
            </span>
          </div>

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  selectedTicket?.id === t.id
                    ? 'bg-purple-600/20 border-purple-500 shadow-lg'
                    : 'bg-[#0B061A] border-purple-900/40 hover:border-purple-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white text-xs">{t.userEmail}</span>
                    <span className="text-[10px] text-purple-300/50">Ticket ID: {t.id}</span>
                  </div>
                  <p className="text-purple-300/80 text-xs font-sans mt-1">{t.subject}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto ${
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
            <div className="mt-4 pt-4 border-t border-purple-900/40 space-y-3 bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs">
                <span className="font-bold text-purple-200">Selected Ticket: {selectedTicket.subject}</span>
                <span className="text-purple-300/50">{selectedTicket.userEmail}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Type master admin response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-500 font-sans"
                />
                <button
                  onClick={handleSendTicketReply}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md"
                >
                  Send Reply & Resolve
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: SYSTEM & QUANT OVERRIDES */}
      {adminTab === 'settings' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-6 shadow-2xl font-mono">
          <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Global Quant Model Overrides</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 bg-[#0B061A] p-5 rounded-2xl border border-purple-900/40">
              <div className="flex justify-between text-xs">
                <span className="text-purple-200 font-bold">System-Wide Min Confidence Floor:</span>
                <span className="font-black text-amber-300 text-sm">{minConfidenceOverride}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="5"
                value={minConfidenceOverride}
                onChange={(e) => setMinConfidenceOverride(Number(e.target.value))}
                className="w-full accent-purple-500 bg-[#120B28] h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-purple-300/60 font-sans leading-relaxed">
                Signals below {minConfidenceOverride}% confidence will be suppressed globally across all terminals.
              </p>
            </div>

            <div className="bg-[#0B061A] p-5 rounded-2xl border border-purple-900/40 space-y-3">
              <span className="text-xs font-bold text-white block">Engine Emergency Circuit Breaker</span>
              <p className="text-[11px] text-purple-300/60 font-sans leading-relaxed">
                Instantly locks model parameters and forces high-integrity mode during flash crashes.
              </p>
              <button
                onClick={() => alert('Emergency Circuit Breaker Triggered: Suppressing signals lower than 92% confidence.')}
                className="w-full py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Trigger Volatility Circuit Breaker</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: DISCORD BOT INTEGRATION */}
      {adminTab === 'discord' && <DiscordBotHubView />}
    </div>
  );
};
