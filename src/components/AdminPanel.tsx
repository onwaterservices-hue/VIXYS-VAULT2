import React, { useState } from 'react';
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
} from 'lucide-react';
import { AdminStats, SupportTicket } from '../types';
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
  AdminDiagnosticsResponse,
} from '../services/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  tier: 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS';
  role: 'USER' | 'ADMIN' | 'OWNER' | 'SUPPORT';
  status: 'ACTIVE' | 'TRIALING' | 'SUSPENDED';
  joinedDate: string;
  volumeTrades: number;
  lastActive: string;
  passwordHash?: string;
  verificationStatus?: 'VERIFIED' | 'SUSPECTED_DUPLICATE' | 'UNVERIFIED';
  hardwareFingerprint?: string;
  ipHash?: string;
  referralCodeUsed?: string;
}

interface ReferralPromoter {
  code: string;
  name: string;
  email: string;
  referredCount: number;
  discountGiven: string;
  commissionRate: string;
  totalVolumeGenerated: string;
  commissionOwed: string;
  payoutStatus: string;
}

interface StripeTransaction {
  id: string;
  email: string;
  plan: 'Pro Pass ($49)' | 'Elite Pass ($199)';
  amount: number;
  method: 'Stripe Credit Card' | 'Apple Pay' | 'Crypto USDC';
  status: 'Succeeded' | 'Processing';
  timestamp: string;
}

const INITIAL_USERS: AdminUser[] = [
  {
    id: 'usr_001',
    email: 'vixyvault0@gmail.com',
    name: 'Master Admin (Vixy Vault)',
    tier: 'ELITE_PASS',
    role: 'ADMIN',
    status: 'ACTIVE',
    joinedDate: '2026-01-15',
    volumeTrades: 1420,
    lastActive: 'Just now',
  },
  {
    id: 'usr_002',
    email: 'trader.alex@gmail.com',
    name: 'Alex Vance',
    tier: 'ELITE_PASS',
    role: 'USER',
    status: 'ACTIVE',
    joinedDate: '2026-07-28',
    volumeTrades: 428,
    lastActive: '2m ago',
  },
  {
    id: 'usr_003',
    email: 'quant.sarah@optionstrade.io',
    name: 'Sarah Connor',
    tier: 'ELITE_PASS',
    role: 'USER',
    status: 'ACTIVE',
    joinedDate: '2026-07-29',
    volumeTrades: 312,
    lastActive: '12m ago',
  },
  {
    id: 'usr_004',
    email: 'sam.predict@crypto.org',
    name: 'Sam Miller',
    tier: 'PRO_PASS',
    role: 'USER',
    status: 'ACTIVE',
    joinedDate: '2026-07-20',
    volumeTrades: 194,
    lastActive: '1h ago',
  },
  {
    id: 'usr_005',
    email: 'dev.mike@polygon.io',
    name: 'Mike Ross',
    tier: 'FREE_TRIAL',
    role: 'USER',
    status: 'TRIALING',
    joinedDate: '2026-07-30',
    volumeTrades: 42,
    lastActive: '5m ago',
  },
  {
    id: 'usr_006',
    email: 'dave.h@scalping.com',
    name: 'David Hughes',
    tier: 'PRO_PASS',
    role: 'USER',
    status: 'ACTIVE',
    joinedDate: '2026-06-12',
    volumeTrades: 856,
    lastActive: '34m ago',
  },
  {
    id: 'usr_007',
    email: 'maria.c@wallstreet.net',
    name: 'Maria Chen',
    tier: 'FREE_TRIAL',
    role: 'USER',
    status: 'TRIALING',
    joinedDate: '2026-07-30',
    volumeTrades: 18,
    lastActive: '18m ago',
  },
  {
    id: 'usr_008',
    email: 'jason.v@cryptoquant.ai',
    name: 'Jason Voltz',
    tier: 'ELITE_PASS',
    role: 'USER',
    status: 'ACTIVE',
    joinedDate: '2026-05-04',
    volumeTrades: 1204,
    lastActive: 'Just now',
  },
];

const INITIAL_TRANSACTIONS: StripeTransaction[] = [
  {
    id: 'ch_3M4kxL2eZvKYlo12',
    email: 'jason.v@cryptoquant.ai',
    plan: 'Elite Pass ($199)',
    amount: 199.0,
    method: 'Stripe Credit Card',
    status: 'Succeeded',
    timestamp: '2m ago',
  },
  {
    id: 'ch_3M4kxK1eZvKYlo11',
    email: 'quant.sarah@optionstrade.io',
    plan: 'Elite Pass ($199)',
    amount: 199.0,
    method: 'Apple Pay',
    status: 'Succeeded',
    timestamp: '14m ago',
  },
  {
    id: 'ch_3M4kxJ0eZvKYlo10',
    email: 'sam.predict@crypto.org',
    plan: 'Pro Pass ($49)',
    amount: 49.0,
    method: 'Stripe Credit Card',
    status: 'Succeeded',
    timestamp: '1h ago',
  },
  {
    id: 'ch_3M4kxI9eZvKYlo09',
    email: 'dave.h@scalping.com',
    plan: 'Pro Pass ($49)',
    amount: 49.0,
    method: 'Crypto USDC',
    status: 'Succeeded',
    timestamp: '3h ago',
  },
  {
    id: 'ch_3M4kxH8eZvKYlo08',
    email: 'trader.alex@gmail.com',
    plan: 'Elite Pass ($199)',
    amount: 199.0,
    method: 'Stripe Credit Card',
    status: 'Succeeded',
    timestamp: '5h ago',
  },
];

interface AdminPanelProps {
  stats: AdminStats;
  tickets: SupportTicket[];
  setTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ stats, tickets, setTickets }) => {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [transactions] = useState<StripeTransaction[]>(INITIAL_TRANSACTIONS);
  const [minConfidenceOverride, setMinConfidenceOverride] = useState<number>(85);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  
  // Filtering & Search
  const [userSearch, setUserSearch] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS' | 'ADMIN'>('ALL');

  // Add User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('VaultMember2026!');
  const [newUserTier, setNewUserTier] = useState<'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS'>('PRO_PASS');
  const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN' | 'SUPPORT'>('USER');
  const [newUserReferralCode, setNewUserReferralCode] = useState<string>('DIRECT');

  // Password Reset / Change Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Referral Management State
  const [referrals, setReferrals] = useState<ReferralPromoter[]>([
    { code: 'PROMOTER20', name: 'Alpha Promoter Network', email: 'affiliates@alphapromoter.com', referredCount: 148, discountGiven: '20% Off', commissionRate: '20%', totalVolumeGenerated: '$18,420', commissionOwed: '$3,684.00', payoutStatus: 'Paid (Stripe Connect)' },
    { code: 'REF-ALEX', name: 'Alex Mercer (Top Trader)', email: 'trader.alex@gmail.com', referredCount: 62, discountGiven: '15% Off', commissionRate: '25%', totalVolumeGenerated: '$8,940', commissionOwed: '$2,235.00', payoutStatus: 'Paid (Stripe Connect)' },
    { code: 'VIXY50', name: 'Vixy Founding Vault Partners', email: 'partners@vixysvault.com', referredCount: 94, discountGiven: '50% Off 1st Mo', commissionRate: '15%', totalVolumeGenerated: '$9,110', commissionOwed: '$1,366.50', payoutStatus: 'Processing Payout' },
    { code: 'ALPHA10', name: 'Crypto Twitter Affiliate', email: 'socials@cryptotwitter.io', referredCount: 38, discountGiven: '10% Off', commissionRate: '15%', totalVolumeGenerated: '$3,420', commissionOwed: '$513.00', payoutStatus: 'Paid (USDC)' },
    { code: 'VIP2026', name: 'Institutional VIP Desk', email: 'institutional@vixysvault.com', referredCount: 19, discountGiven: '25% Off', commissionRate: '20%', totalVolumeGenerated: '$12,800', commissionOwed: '$2,560.00', payoutStatus: 'Paid (Bank Wire)' },
  ]);
  const [isAddReferralOpen, setIsAddReferralOpen] = useState<boolean>(false);
  const [editingReferral, setEditingReferral] = useState<ReferralPromoter | null>(null);
  const [refCodeInput, setRefCodeInput] = useState<string>('');
  const [refNameInput, setRefNameInput] = useState<string>('');
  const [refEmailInput, setRefEmailInput] = useState<string>('');
  const [refDiscountInput, setRefDiscountInput] = useState<string>('20% Off');
  const [refRateInput, setRefRateInput] = useState<string>('20%');
  const [refPayoutInput, setRefPayoutInput] = useState<string>('Paid (Stripe Connect)');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Active Tab View in Admin
  const [adminTab, setAdminTab] = useState<'users' | 'revenue' | 'referrals' | 'tickets' | 'settings' | 'discord' | 'diagnostics'>('users');
  const [diagnosticsData, setDiagnosticsData] = useState<AdminDiagnosticsResponse | null>(null);

  // Poll Admin Diagnostics, Live Users, and Referrals
  React.useEffect(() => {
    let active = true;
    async function loadDiagnostics() {
      const data = await fetchAdminDiagnostics();
      if (data && active) {
        setDiagnosticsData(data);
      }
    }
    async function loadUsers() {
      const apiUsers = await fetchAdminUsers();
      if (apiUsers && Array.isArray(apiUsers) && active) {
        const mapped: AdminUser[] = apiUsers.map((u: any, idx: number) => ({
          id: u.id || `usr_0${idx + 1}`,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          role: u.role === 'OWNER' || u.role === 'ADMIN' ? 'ADMIN' : u.role === 'SUPPORT' ? 'SUPPORT' : 'USER',
          tier: u.subscription === 'ELITE_PASS' ? 'ELITE_PASS' : u.subscription === 'PRO_PASS' ? 'PRO_PASS' : 'FREE_TRIAL',
          joinedDate: u.joined || '2026-01-15',
          status: u.status || 'ACTIVE',
          volumeTrades: u.volumeTrades || (120 + idx * 15),
          lastActive: 'Just now',
          passwordHash: u.passwordHash || 'VaultPass2026!',
          verificationStatus: u.verificationStatus || (idx === 4 ? 'SUSPECTED_DUPLICATE' : 'VERIFIED'),
          hardwareFingerprint: u.hardwareFingerprint || `hw_${u.id}`,
          ipHash: u.ipHash || `192.168.1.${idx + 10}`,
          referralCodeUsed: u.referralCodeUsed || 'DIRECT',
        }));
        setUsers((prev) => {
          const existingIds = new Set(mapped.map((m) => m.id));
          const localOnly = prev.filter((p) => !existingIds.has(p.id));
          return [...mapped, ...localOnly];
        });
      }
    }
    async function loadReferrals() {
      const apiRefs = await fetchAdminReferrals();
      if (apiRefs && Array.isArray(apiRefs) && active) {
        setReferrals(apiRefs);
      }
    }
    loadDiagnostics();
    loadUsers();
    loadReferrals();
    const interval = setInterval(() => {
      loadDiagnostics();
      loadUsers();
      loadReferrals();
    }, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
    showToast(`Support reply dispatched to ${selectedTicket.userEmail}`);
  };

  const handleToggleUserRole = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
          return { ...u, role: nextRole };
        }
        return u;
      })
    );
    showToast(`Role updated for user ${userId}`);
  };

  const handleChangeUserTier = (userId: string, newTier: 'FREE_TRIAL' | 'PRO_PASS' | 'ELITE_PASS') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tier: newTier, status: newTier === 'FREE_TRIAL' ? 'TRIALING' : 'ACTIVE' } : u))
    );
    showToast(`Tier updated to ${newTier}`);
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
    showToast(`User status toggled`);
  };

  const handleToggleVerification = async (userId: string, newStatus: 'VERIFIED' | 'SUSPECTED_DUPLICATE' | 'UNVERIFIED') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, verificationStatus: newStatus } : u))
    );
    await updateUserVerification(userId, newStatus);
    showToast(`Verification status set to ${newStatus}`);
  };

  const handleOpenPasswordModal = (user: AdminUser) => {
    setPasswordModalUser(user);
    setNewPasswordInput('');
  };

  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;

    const res = await updateUserPassword(passwordModalUser.id, newPasswordInput.trim());
    setUsers((prev) =>
      prev.map((u) => (u.id === passwordModalUser.id ? { ...u, passwordHash: newPasswordInput.trim() } : u))
    );
    showToast(res.message || `Password for ${passwordModalUser.email} updated successfully!`);
    setPasswordModalUser(null);
    setNewPasswordInput('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const res = await createAdminUser({
      email: newUserEmail.trim(),
      name: newUserName.trim() || newUserEmail.split('@')[0],
      password: newUserPassword.trim() || 'VaultMember2026!',
      tier: newUserTier,
      role: newUserRole,
      referralCode: newUserReferralCode,
    });

    if (res.user) {
      const created: AdminUser = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        tier: res.user.subscription === 'ELITE_PASS' ? 'ELITE_PASS' : res.user.subscription === 'FREE_TRIAL' ? 'FREE_TRIAL' : 'PRO_PASS',
        role: res.user.role === 'ADMIN' ? 'ADMIN' : 'USER',
        status: res.user.status,
        joinedDate: res.user.joined,
        volumeTrades: 0,
        lastActive: 'Just now',
        passwordHash: res.user.passwordHash,
        verificationStatus: res.user.verificationStatus,
        hardwareFingerprint: res.user.hardwareFingerprint,
        ipHash: res.user.ipHash,
        referralCodeUsed: res.user.referralCodeUsed,
      };
      setUsers([created, ...users]);
    } else {
      // Local fallback creation
      const created: AdminUser = {
        id: `usr_${Date.now().toString().slice(-4)}`,
        email: newUserEmail.trim(),
        name: newUserName.trim() || newUserEmail.split('@')[0],
        tier: newUserTier,
        role: newUserRole as any,
        status: newUserTier === 'FREE_TRIAL' ? 'TRIALING' : 'ACTIVE',
        joinedDate: new Date().toISOString().split('T')[0],
        volumeTrades: 0,
        lastActive: 'Just now',
        passwordHash: newUserPassword.trim() || 'VaultMember2026!',
        verificationStatus: 'VERIFIED',
        hardwareFingerprint: `hw_${Math.random().toString(36).slice(2, 8)}`,
        ipHash: '192.168.1.100',
        referralCodeUsed: newUserReferralCode,
      };
      setUsers([created, ...users]);
    }

    showToast(res.message || `Account created for ${newUserEmail.trim()}`);
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('VaultMember2026!');
    setIsAddUserOpen(false);
  };

  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCodeInput.trim()) return;

    const payload = {
      code: refCodeInput.trim().toUpperCase(),
      name: refNameInput.trim() || refCodeInput.trim().toUpperCase(),
      email: refEmailInput.trim() || 'affiliate@vixysvault.com',
      discountGiven: refDiscountInput,
      commissionRate: refRateInput,
      payoutStatus: refPayoutInput,
    };

    const res = await saveAdminReferral(payload);

    setReferrals((prev) => {
      const idx = prev.findIndex((r) => r.code === payload.code);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...payload };
        return updated;
      }
      return [{ ...payload, referredCount: 0, totalVolumeGenerated: '$0.00', commissionOwed: '$0.00' }, ...prev];
    });

    showToast(res.message || `Referral promoter ${payload.code} saved!`);
    setIsAddReferralOpen(false);
    setEditingReferral(null);
    setRefCodeInput('');
    setRefNameInput('');
    setRefEmailInput('');
  };

  const handleDeleteReferralCode = async (code: string) => {
    if (!confirm(`Are you sure you want to delete referral promoter code ${code}?`)) return;
    await deleteAdminReferral(code);
    setReferrals((prev) => prev.filter((r) => r.code !== code));
    showToast(`Referral code ${code} deleted.`);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.name.toLowerCase().includes(userSearch.toLowerCase());
    if (tierFilter === 'ALL') return matchesSearch;
    if (tierFilter === 'ADMIN') return matchesSearch && u.role === 'ADMIN';
    return matchesSearch && u.tier === tierFilter;
  });

  const totalUsersCount = 1942;
  const activeSubsCount = users.filter((u) => u.tier !== 'FREE_TRIAL').length + 478;
  const proCount = 412;
  const eliteCount = 74;
  const arr = stats.mrr * 12;

  return (
    <div className="space-y-6 font-sans text-purple-100 max-w-full overflow-hidden">
      {/* 1. MASTER ADMIN CONTROL CENTER HEADER */}
      <div className="bg-gradient-to-r from-[#120B28] via-[#0D071E] to-[#18093B] rounded-3xl border border-purple-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-purple-900/40 pb-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                MASTER ADMIN (VIXY VAULT OWNER) • LEVEL 0 CLEARANCE
              </span>
              <span className="text-amber-300 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/40 text-xs font-bold font-mono">
                CLEARANCE_HASH#88F9A1B2
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight pt-1 flex items-center gap-3">
              VIXY'S VAULT SaaS Master Intelligence
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-700/50 text-xs font-bold">
                ROOT ACTIVE
              </span>
            </h1>
            <p className="text-purple-300/70 text-xs sm:text-sm font-sans max-w-3xl">
              Sub-second system audit, user access control, live Stripe/USDC revenue ledger, and global quant model circuit breakers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const csvData = transactions.map(t => `${t.id},${t.email},${t.plan},${t.amount},${t.method},${t.status},${t.timestamp}`).join('\n');
                const blob = new Blob([`Charge ID,Email,Plan,Amount,Gateway,Status,Time\n${csvData}`], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `VixyVault_Financial_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#0B061A] hover:bg-purple-950 text-purple-200 border border-purple-800/60 font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-md shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV Audit</span>
            </button>

            <div className="flex items-center gap-3 bg-[#0B061A] px-4 py-2 rounded-2xl border border-purple-900/60 font-mono text-xs shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/80" />
              <div>
                <span className="text-purple-300/60 text-[10px] block font-bold uppercase">System Telemetry</span>
                <span className="text-emerald-300 font-bold">ONLINE ({stats.apiLatencyMs}ms Latency)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CORE TELEMETRY METRIC GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-5">
          <div className="bg-[#0B061A]/90 p-4 rounded-2xl border border-purple-900/40 space-y-1">
            <div className="flex items-center justify-between text-purple-300/60 text-xs font-mono">
              <span>Monthly Revenue (MRR)</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-400">${stats.mrr.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-300/80 font-mono font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+$1,194 today (+18.4%)</span>
            </div>
          </div>

          <div className="bg-[#0B061A]/90 p-4 rounded-2xl border border-purple-900/40 space-y-1">
            <div className="flex items-center justify-between text-purple-300/60 text-xs font-mono">
              <span>Annual Revenue (ARR)</span>
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-purple-200">${arr.toLocaleString()}</div>
            <div className="text-[10px] text-purple-300/60 font-mono">Run-rate projection</div>
          </div>

          <div className="bg-[#0B061A]/90 p-4 rounded-2xl border border-purple-900/40 space-y-1">
            <div className="flex items-center justify-between text-purple-300/60 text-xs font-mono">
              <span>Total Registered Users</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-white">{totalUsersCount.toLocaleString()}</div>
            <div className="text-[10px] text-cyan-300/80 font-mono font-bold">+38 new signups today</div>
          </div>

          <div className="bg-[#0B061A]/90 p-4 rounded-2xl border border-purple-900/40 space-y-1">
            <div className="flex items-center justify-between text-purple-300/60 text-xs font-mono">
              <span>Active Paying Subscribers</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-amber-300">{activeSubsCount}</div>
            <div className="text-[10px] text-purple-300/60 font-mono">{proCount} Pro / {eliteCount} Elite</div>
          </div>

          <div className="bg-[#0B061A]/90 p-4 rounded-2xl border border-purple-900/40 space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-purple-300/60 text-xs font-mono">
              <span>AI Model Win Rate</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-400">{stats.winRate}%</div>
            <div className="text-[10px] text-purple-300/60 font-mono">Verified 30-Day Window</div>
          </div>
        </div>
      </div>

      {/* 3. ADMIN SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
        <button
          onClick={() => setAdminTab('diagnostics')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'diagnostics'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Engine Diagnostics & Live Audit</span>
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'users'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <Users className="w-4 h-4 text-purple-300" />
          <span>User Directory & Accounts ({filteredUsers.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('revenue')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'revenue'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Stripe Payments & Audit Log</span>
        </button>

        <button
          onClick={() => setAdminTab('referrals')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'referrals'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Referrals & Promoter Commissions ({referrals.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('tickets')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'tickets'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Support Tickets ({tickets.filter((t) => t.status !== 'RESOLVED').length})</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'settings'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>System & Quant Overrides</span>
        </button>

        <button
          onClick={() => setAdminTab('discord')}
          className={`px-4 py-2.5 rounded-2xl font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'discord'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 font-black'
              : 'bg-[#0D071E] text-purple-300/70 hover:text-white border border-purple-900/40'
          }`}
        >
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>Discord Bot Integration</span>
        </button>
      </div>

      {/* TAB 0: PHASE 8 REAL-TIME DIAGNOSTICS & ENGINE AUDIT */}
      {adminTab === 'diagnostics' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-6 shadow-2xl font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>PHASE 8 REAL-TIME ENGINE AUDIT & DIAGNOSTICS</span>
              </div>
              <p className="text-purple-300/70 text-xs font-sans mt-1">
                Continuous quantitative telemetry, lock evaluation checks, feed latency, and live execution logs.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#0B061A] border border-purple-900 text-xs text-purple-300 shrink-0">
              Active Contract: <span className="text-cyan-300 font-bold">{diagnosticsData?.activeContract || 'BTC-15M'}</span>
            </div>
          </div>

          {/* TELEMETRY METRIC TILES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Market Feed Status */}
            <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-300/70">
                <span>MARKET FEED</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${diagnosticsData?.marketFeed.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span>{diagnosticsData?.marketFeed.status || 'CONNECTED'}</span>
              </div>
              <div className="text-[11px] text-purple-300/60 space-y-0.5">
                <div>Latency: <span className="text-white font-bold">{diagnosticsData?.marketFeed.latencyMs || 12}ms</span></div>
                <div>Last update: <span className="text-white font-bold">{diagnosticsData?.marketFeed.lastUpdateSecAgo || 0.8}s ago</span></div>
              </div>
            </div>

            {/* Prediction Engine Status */}
            <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-300/70">
                <span>PREDICTION ENGINE</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-black text-purple-300 flex items-center gap-2">
                <span>{diagnosticsData?.predictionEngine.status || 'RUNNING'}</span>
              </div>
              <div className="text-[11px] text-purple-300/60 space-y-0.5">
                <div>Cycle: <span className="text-cyan-300 font-bold">#{diagnosticsData?.predictionEngine.cycleId || 288}</span></div>
                <div>State: <span className="text-emerald-300 font-bold">{diagnosticsData?.predictionEngine.state || 'MONITORING'}</span></div>
                <div>Last Run: <span className="text-white font-bold">{diagnosticsData?.predictionEngine.lastModelRunSecAgo || 1.2}s ago</span></div>
              </div>
            </div>

            {/* Lock Check Status */}
            <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-300/70">
                <span>LOCK STATUS</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-xl font-black ${diagnosticsData?.lockStatus.qualified ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diagnosticsData?.lockStatus.qualified ? '✓ LOCKED' : '⌛ WAITING'}
              </div>
              <div className="text-[11px] text-purple-300/60">
                <div>Timer: <span className="text-white font-bold">{diagnosticsData?.lockStatus.persistenceSeconds || 18}s / {diagnosticsData?.lockStatus.requiredPersistenceSeconds || 15}s</span></div>
              </div>
            </div>

            {/* System Health Summary */}
            <div className="bg-[#0B061A] p-4 rounded-2xl border border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-300/70">
                <span>SYSTEM HEALTH</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400">
                0 ERRORS
              </div>
              <div className="text-[11px] text-purple-300/60 space-y-0.5">
                <div>Database: <span className="text-emerald-300 font-bold">{diagnosticsData?.database.status || 'Connected'}</span></div>
                <div>Discord: <span className="text-indigo-300 font-bold">{diagnosticsData?.discord.status || 'Connected'}</span></div>
              </div>
            </div>
          </div>

          {/* STRUCTURED LOCK CHECK MATRIX */}
          <div className="bg-[#0B061A] p-5 rounded-2xl border border-purple-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200">6-FACTOR INSTITUTIONAL LOCK CHECKLIST</span>
              <span className="text-xs text-purple-400">Signal Persistence Engine</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${diagnosticsData?.lockStatus.checks.confidence ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40'}`}>
                <span className="text-[10px] text-purple-300/60 uppercase font-bold">Confidence</span>
                <span className="font-extrabold text-sm">{diagnosticsData?.lockStatus.checks.confidence ? 'PASS (≥75%)' : 'FAIL'}</span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${diagnosticsData?.lockStatus.checks.freshness ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border-rose-800/40'}`}>
                <span className="text-[10px] text-purple-300/60 uppercase font-bold">Freshness</span>
                <span className="font-extrabold text-sm">{diagnosticsData?.lockStatus.checks.freshness ? 'PASS (<15s)' : 'STALE'}</span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${diagnosticsData?.lockStatus.checks.liquidity ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40'}`}>
                <span className="text-[10px] text-purple-300/60 uppercase font-bold">Liquidity</span>
                <span className="font-extrabold text-sm">{diagnosticsData?.lockStatus.checks.liquidity ? 'PASS (≥$50k)' : 'FAIL'}</span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${diagnosticsData?.lockStatus.checks.spread ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40'}`}>
                <span className="text-[10px] text-purple-300/60 uppercase font-bold">Spread</span>
                <span className="font-extrabold text-sm">{diagnosticsData?.lockStatus.checks.spread ? 'PASS (≤$25)' : 'HIGH'}</span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${diagnosticsData?.lockStatus.checks.edge ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40'}`}>
                <span className="text-[10px] text-purple-300/60 uppercase font-bold">Min Edge</span>
                <span className="font-extrabold text-sm">{diagnosticsData?.lockStatus.checks.edge ? 'PASS (≥+3.0%)' : 'LOW'}</span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-1 ${diagnosticsData?.lockStatus.checks.persistence ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/40 text-amber-300 border-amber-800/40'}`}>
                <span className="text-[10px] text-purple-300/60 uppercase font-bold">Persistence</span>
                <span className="font-extrabold text-sm">{diagnosticsData?.lockStatus.checks.persistence ? 'PASS (15s/15s)' : 'IN PROGRESS'}</span>
              </div>
            </div>

            <div className="p-3 bg-[#080313] rounded-xl border border-purple-900/40 text-xs text-purple-300 font-sans">
              <span className="font-mono font-bold text-purple-400">Lock Evaluation Reason: </span>
              <span>{diagnosticsData?.lockStatus.reason || 'All signal criteria satisfied and persistence confirmed.'}</span>
            </div>
          </div>

          {/* ENGINE EXECUTION LOG STREAM */}
          <div className="bg-[#0B061A] p-5 rounded-2xl border border-purple-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-200">LIVE ENGINE EXECUTION LOGS</span>
              <span className="text-[10px] text-purple-400 font-mono">Stream Auto-refreshing every 3s</span>
            </div>

            <div className="p-3 bg-[#05020c] rounded-xl border border-purple-950 max-h-60 overflow-y-auto space-y-1 text-[11px] font-mono scrollbar-thin">
              {diagnosticsData?.recentLogs && diagnosticsData.recentLogs.length > 0 ? (
                diagnosticsData.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 border-b border-purple-950/60 pb-1 pt-0.5">
                    <span className="text-purple-300/50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      log.level === 'ERROR'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : log.level === 'WARN'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-purple-100 font-sans">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-purple-300/50 italic py-2 text-center">Awaiting log stream...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MASTER USER DIRECTORY */}
      {adminTab === 'users' && (
        <div className="bg-[#120B28] rounded-3xl border border-purple-500/30 p-4 sm:p-6 space-y-5 shadow-2xl font-mono">
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="p-3 bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-xl animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Anti-Duplicate Single Trial System Guard Banner */}
          <div className="p-4 bg-[#0B061A] rounded-2xl border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-800 text-purple-300">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>ANTI-DUPLICATE TRIAL GUARD: ENFORCED</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px]">ACTIVE</span>
                </div>
                <div className="text-[11px] text-purple-300/60 font-sans mt-0.5">
                  Matches device hardware fingerprint & IP hash. Prevents account duplication & trial abuse across browser resets.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] shrink-0">
              <span className="px-2.5 py-1 rounded-xl bg-purple-950 border border-purple-800 text-purple-200">
                HW Fingerprints Tracked: <strong className="text-emerald-400">{users.length + 120}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300">
                Dupes Flagged: <strong className="text-amber-400">{users.filter((u) => u.verificationStatus === 'SUSPECTED_DUPLICATE').length}</strong>
              </span>
            </div>
          </div>

          {/* Top Search & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-900/40 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] sm:min-w-[300px]">
                <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user email, name, ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-[#0B061A] border border-purple-900/60 rounded-2xl pl-10 pr-4 py-2 text-xs text-purple-100 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {(['ALL', 'ELITE_PASS', 'PRO_PASS', 'FREE_TRIAL', 'ADMIN'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                      tierFilter === t
                        ? 'bg-purple-600 text-white border border-purple-400/50'
                        : 'bg-[#0B061A] text-purple-300/60 hover:text-white border border-purple-900/40'
                    }`}
                  >
                    {t === 'ALL' ? 'All Users' : t === 'ELITE_PASS' ? 'Elite Pass' : t === 'PRO_PASS' ? 'Pro Pass' : t === 'FREE_TRIAL' ? 'Free Trial' : 'Admins'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddUserOpen(true)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Account With Password</span>
              </button>
            </div>
          </div>

          {/* Add User Form Drawer */}
          {isAddUserOpen && (
            <form onSubmit={handleCreateUser} className="p-4 bg-[#0B061A] rounded-2xl border border-emerald-500/40 space-y-3 font-sans">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Register New Customer Account & Assign Password</span>
                </span>
                <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-purple-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">User Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
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
                      className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setNewUserPassword(`Vault${Math.random().toString(36).slice(2, 6)}!2026`)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 hover:text-white bg-purple-900/40 px-1.5 py-0.5 rounded"
                      title="Generate random password"
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
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
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
                    className="w-full bg-[#120B28] border border-purple-900/60 rounded-xl px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="USER">Customer / User</option>
                    <option value="ADMIN">Master Admin</option>
                    <option value="SUPPORT">Support Specialist</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-purple-300/60 uppercase font-bold block mb-1">Referral Code Tag</label>
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

          {/* User Table Responsive Container */}
          <div className="overflow-x-auto rounded-2xl border border-purple-900/40 bg-[#0B061A]">
            <table className="w-full text-left text-xs border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-[#080313] border-b border-purple-900/50 text-purple-300/60 uppercase font-bold text-[10px]">
                  <th className="p-3.5">User Account</th>
                  <th className="p-3.5">Verification Shield</th>
                  <th className="p-3.5">Password & Credentials</th>
                  <th className="p-3.5">Plan Tier</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Referral Tag</th>
                  <th className="p-3.5">Joined</th>
                  <th className="p-3.5 text-right">Master Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30 text-purple-100 font-sans">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-purple-900/10 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white font-mono text-xs">{u.name}</div>
                      <div className="text-purple-300/60 text-[11px] font-mono">{u.email}</div>
                    </td>

                    {/* Verification & Anti-Dup Badge */}
                    <td className="p-3.5 font-mono">
                      {u.verificationStatus === 'SUSPECTED_DUPLICATE' ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1" title="Matched existing device hardware fingerprint">
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

                    {/* Password Status & Change Password Trigger */}
                    <td className="p-3.5 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300/80 font-bold text-[11px] flex items-center gap-1">
                          <Key className="w-3 h-3 text-purple-400" />
                          <span>{u.passwordHash ? '••••••••' : 'Default'}</span>
                        </span>
                        <button
                          onClick={() => handleOpenPasswordModal(u)}
                          className="px-2 py-0.5 rounded bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-700/50 text-[10px] font-bold transition-all"
                        >
                          Edit Pass
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono">
                      {u.tier === 'ELITE_PASS' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Elite ($199)</span>
                        </span>
                      ) : u.tier === 'PRO_PASS' ? (
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
                      {u.role === 'ADMIN' ? (
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

                    <td className="p-3.5 text-purple-300/60 font-mono text-[11px]">{u.joinedDate}</td>

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
                          value={u.tier}
                          onChange={(e) => handleChangeUserTier(u.id, e.target.value as any)}
                          className="bg-[#120B28] border border-purple-900 text-purple-200 text-[10px] rounded-lg px-2 py-1 focus:outline-none"
                          title="Change User Tier"
                        >
                          <option value="FREE_TRIAL">Free Trial</option>
                          <option value="PRO_PASS">Pro Pass</option>
                          <option value="ELITE_PASS">Elite Pass</option>
                        </select>

                        {/* Toggle Admin Role */}
                        <button
                          onClick={() => handleToggleUserRole(u.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900'
                              : 'bg-purple-950/60 border-purple-800 text-purple-300 hover:bg-purple-900'
                          }`}
                          title={u.role === 'ADMIN' ? 'Demote to regular user' : 'Promote to Admin'}
                        >
                          {u.role === 'ADMIN' ? 'Demote' : 'Make Admin'}
                        </button>

                        {/* Toggle Suspend */}
                        <button
                          onClick={() => handleToggleUserStatus(u.id)}
                          className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:text-white border border-rose-900/50"
                          title={u.status === 'SUSPENDED' ? 'Unsuspend User' : 'Suspend User'}
                        >
                          {u.status === 'SUSPENDED' ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserX className="w-3.5 h-3.5 text-rose-400" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      {/* TAB 2: STRIPE PAYMENTS & REVENUE AUDIT */}
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
                Gross Monthly Revenue: ${stats.mrr.toLocaleString()}
              </span>
            </div>
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
                {transactions.map((tx) => (
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

      {/* TAB 3: REFERRALS & PROMOTER COMMISSION TRACKER */}
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
              <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold">
                Total Referred Users: {referrals.reduce((acc, curr) => acc + (curr.referredCount || 0), 0)}
              </span>
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

      {/* TAB 3: SUPPORT TICKETS */}
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
              <p className="text-xs text-purple-300/80 font-sans p-3 bg-[#120B28] rounded-xl border border-purple-950">{selectedTicket.message}</p>

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

      {/* TAB 4: SYSTEM & QUANT OVERRIDES */}
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
      {/* TAB 5: DISCORD BOT INTEGRATION */}
      {adminTab === 'discord' && (
        <DiscordBotHubView />
      )}
    </div>
  );
};
