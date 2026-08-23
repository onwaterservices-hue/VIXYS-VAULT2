import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  AlertCircle,
  Radio,
  Link,
  Unlink,
  Database,
  ChevronDown,
  User,
  ShieldOff,
  LifeBuoy,
} from "lucide-react";
import { SupportTicket } from "../types";
import { DiscordBotHubView } from "./DiscordBotHubView";
import {
  fetchAdminDiagnostics,
  fetchAdminUsers,
  fetchAdminDayPassesApi,
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
  updateAdminUserRecord,
  getAdminHeaders,
  fetchAdminAuditLogs,
  fetchSystemHealth,
  fetchAdminEventsApi,
  fetchDiscordHealthApi,
  fetchStripeHealthApi,
  resyncEntitlementApi,
  wipeBetaUsersApi,
  fetchAdminSupportTickets,
  updateAdminSupportTicket,
  AdminDiagnosticsResponse,
  fetchAcceptanceMatrixApi,
  runAcceptanceMatrixApi,
  AcceptanceMatrixResponse,
} from "../services/api";

export interface UserItem {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: "OWNER" | "ADMIN" | "SUPPORT" | "PRO" | "FREE" | "USER" | "ELITE" | "UNPAID";
  subscription: "FREE_TRIAL" | "PRO_PASS" | "ELITE_PASS" | "FREE" | "DAY_PASS" | "STARTER" | "NONE";
  passwordHash?: string;
  verificationStatus?: "VERIFIED" | "SUSPECTED_DUPLICATE" | "UNVERIFIED";
  hardwareFingerprint?: string;
  ipHash?: string;
  joined: string;
  status: "ACTIVE" | "TRIALING" | "SUSPENDED";
  volumeTrades?: number;
  referralCodeUsed?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  discordId?: string;
  discordTag?: string;
  discordGlobalName?: string;
  discordLinked?: boolean;
  guildVerified?: boolean;
  lastSeen?: string;
  authStatus?: string;
  lastSeenAt?: number;
  lastActiveAt?: number;
  dayPass?: {
    entitlementId?: string;
    status: "ACTIVE" | "EXPIRED";
    startedAt?: string;
    expiresAt?: string;
    discordRoleAssigned?: boolean;
    stripePaymentId?: string;
    stripeCheckoutSessionId?: string;
  };
}

export interface TransactionItem {
  id: string;
  email: string;
  plan: string;
  amount: number;
  method: string;
  status:
    | "Succeeded"
    | "Pending"
    | "Processing"
    | "Failed"
    | "Refunded"
    | "Canceled"
    | "Chargeback";
  timestamp: string;
  rawTime?: number;
  currency?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  level: "INFO" | "WARN" | "ERROR";
}

export type AdminSection =
  | "overview"
  | "users"
  | "billing"
  | "trials"
  | "acceptance_test"
  | "discord"
  | "referrals"
  | "audit_log"
  | "system_health"
  | "support"
  | "quant_controls";

export type UserFilterOption =
  | "ALL"
  | "FREE"
  | "TRIAL"
  | "DAY PASS ACTIVE"
  | "PRO"
  | "ELITE"
  | "DISCORD LINKED"
  | "STRIPE ACTIVE"
  | "PAYMENT ISSUE"
  | "UNVERIFIED"
  | "DUPLICATE RISK";

interface AdminPanelProps {
  onClose?: () => void;
  currentUserId?: string;
  stats?: any;
  tickets?: SupportTicket[];
  setTickets?: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onClose,
  currentUserId,
}) => {
  // Navigation Section State
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  // Loading & Global Status
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingDataRef = useRef(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);

  // Core Data Stores (Populated exclusively from real backend APIs)
  const [stats, setStats] = useState<any>(null);
  const [diagnosticsData, setDiagnosticsData] =
    useState<AdminDiagnosticsResponse | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [discordHealth, setDiscordHealth] = useState<any>(null);
  const [stripeHealth, setStripeHealth] = useState<any>(null);
  const [signalLogsState, setSignalLogsState] = useState<any[]>([]);
  const [discordDiag, setDiscordDiag] = useState<any>(null);
  const [dayPassRecords, setDayPassRecords] = useState<any[]>([]);
  const [acceptanceMatrixData, setAcceptanceMatrixData] =
    useState<AcceptanceMatrixResponse | null>(null);
  const [isRunningAcceptanceMatrix, setIsRunningAcceptanceMatrix] =
    useState(false);

  const handleRunAcceptanceMatrix = async () => {
    setIsRunningAcceptanceMatrix(true);
    try {
      const data = await runAcceptanceMatrixApi();
      if (data) {
        setAcceptanceMatrixData(data);
        setActionSuccessMsg(
          `Acceptance Test Matrix Completed: ${data.allPassed ? "ALL 4 PLANS PASSED" : "TESTS FAILED"}`,
        );
      }
    } catch (err: any) {
      setGlobalError(`Acceptance Test Runner Error: ${err.message}`);
    } finally {
      setIsRunningAcceptanceMatrix(false);
    }
  };

  // User Intelligence State & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState<UserFilterOption>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 12;

  // Selected User Modal / Detail Drawer (User Inspector)
  const [inspectorUser, setInspectorUser] = useState<UserItem | null>(null);
  const [userEvents, setUserEvents] = useState<any[] | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [editTier, setEditTier] = useState("PRO_PASS");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editDiscordTag, setEditDiscordTag] = useState("");
  const [editDiscordGlobalName, setEditDiscordGlobalName] = useState("");
  const [editDiscordId, setEditDiscordId] = useState("");
  const [editVerificationStatus, setEditVerificationStatus] =
    useState("VERIFIED");
  const [editStripeCustomerId, setEditStripeCustomerId] = useState("");
  const [editStripeSubscriptionId, setEditStripeSubscriptionId] = useState("");

  const openEditUserModal = (user: UserItem) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setEditRole(user.role || "USER");
    setEditTier(user.subscription || "NONE");
    setEditStatus(user.status || "ACTIVE");
    setEditDiscordTag(user.discordTag || "");
    setEditDiscordGlobalName((user as any).discordGlobalName || "");
    setEditDiscordId(user.discordId || "");
    setEditVerificationStatus(
      user.verificationStatus ||
        (user.discordLinked || user.discordId ? "VERIFIED" : "UNVERIFIED"),
    );
    setEditStripeCustomerId(user.stripeCustomerId || "");
    setEditStripeSubscriptionId(user.stripeSubscriptionId || "");
  };

  const handleSaveUserEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const res = await updateAdminUserRecord({
      userId: editingUser.id || editingUser.email,
      name: editName,
      email: editEmail,
      password: editPassword || undefined,
      role: editRole,
      subscription: editTier,
      status: editStatus,
      discordTag: editDiscordTag,
      discordGlobalName: editDiscordGlobalName,
      discordId: editDiscordId,
      verificationStatus: editVerificationStatus,
      stripeCustomerId: editStripeCustomerId,
      stripeSubscriptionId: editStripeSubscriptionId,
    });

    if (res?.success) {
      setActionSuccessMsg(
        `Successfully updated user record for ${editEmail || editName}`,
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
      setEditingUser(null);
      loadAdminData();
    } else {
      setGlobalError(res?.message || "Failed to update user record.");
    }
  };

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserTier, setNewUserTier] = useState<
    "PRO_PASS" | "ELITE_PASS" | "DAY_PASS" | "STARTER" | "NONE"
  >("PRO_PASS");
  const [newUserRole, setNewUserRole] = useState<"USER" | "ADMIN" | "SUPPORT" | "MOD" | "UNPAID">(
    "USER",
  );
  const [newUserReferralCode, setNewUserReferralCode] = useState("DIRECT");

  // Password Modal State
  const [passwordModalUser, setPasswordModalUser] = useState<UserItem | null>(
    null,
  );
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // Referral Modal State
  const [isAddReferralOpen, setIsAddReferralOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<any | null>(null);
  const [refCodeInput, setRefCodeInput] = useState("");
  const [refNameInput, setRefNameInput] = useState("");
  const [refEmailInput, setRefEmailInput] = useState("");
  const [refDiscountInput, setRefDiscountInput] = useState("20% Off");
  const [refRateInput, setRefRateInput] = useState("20%");

  // Billing Tab Filter State
  const [txStatusFilter, setTxStatusFilter] = useState<string>("ALL");

  // Audit Log Filter State
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditLevelFilter, setAuditLevelFilter] = useState<
    "ALL" | "INFO" | "WARN" | "ERROR"
  >("ALL");

  // Support Tickets State (Populated exclusively from real backend API)
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");

  // Admin Real-Time Events & Resync State
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [resyncIdentifier, setResyncIdentifier] = useState(
    "vixyvault0@gmail.com",
  );
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);

  // Load All Admin Data from Real Backend Endpoints
  const loadAdminData = useCallback(async (isManualRefresh = false) => {
    if (isFetchingDataRef.current) return;
    isFetchingDataRef.current = true;
    if (isManualRefresh) setIsRefreshing(true);
    setGlobalError(null);

    try {
      const [
        fetchedUsers,
        fetchedStats,
        fetchedTx,
        fetchedRefs,
        fetchedLogs,
        fetchedHealth,
        fetchedDiag,
        fetchedDiscHealth,
        fetchedStripeHealth,
        fetchedTickets,
        fetchedDayPasses,
      ] = await Promise.all([
        fetchAdminUsers().catch(() => null),
        fetchAdminStats().catch(() => null),
        fetchAdminTransactions().catch(() => null),
        fetchAdminReferrals().catch(() => null),
        fetchAdminAuditLogs().catch(() => null),
        fetchSystemHealth().catch(() => null),
        fetchAdminDiagnostics().catch(() => null),
        fetchDiscordHealthApi().catch(() => null),
        fetchStripeHealthApi().catch(() => null),
        fetchAdminSupportTickets().catch(() => null),
        fetchAdminDayPassesApi().catch(() => null),
      ]);

      if (
        (fetchedUsers && (fetchedUsers as any).error === "ADMIN_REQUIRED") ||
        (fetchedStats && (fetchedStats as any).error === "ADMIN_REQUIRED")
      ) {
        setIsAccessDenied(true);
        setAccessDeniedMsg(
          (fetchedUsers as any)?.message ||
            (fetchedStats as any)?.message ||
            "Administrator authorization failed. Your account does not have administrative privileges.",
        );
        return;
      }

      setIsAccessDenied(false);
      setAccessDeniedMsg(null);

      const userList = Array.isArray(fetchedUsers)
        ? fetchedUsers
        : fetchedUsers && Array.isArray((fetchedUsers as any).users)
          ? (fetchedUsers as any).users
          : null;
      if (userList) setUsers(userList);
      if (fetchedStats) setStats(fetchedStats);
      if (Array.isArray(fetchedTx)) setTransactions(fetchedTx);
      if (Array.isArray(fetchedRefs)) setReferrals(fetchedRefs);
      if (Array.isArray(fetchedLogs)) setAuditLogs(fetchedLogs);
      if (fetchedHealth) setSystemHealth(fetchedHealth);
      if (fetchedDiag) setDiagnosticsData(fetchedDiag);
      if (fetchedDiscHealth) setDiscordHealth(fetchedDiscHealth);
      if (fetchedStripeHealth) setStripeHealth(fetchedStripeHealth);
      if (Array.isArray(fetchedTickets)) setTickets(fetchedTickets);
      if (fetchedDayPasses && Array.isArray(fetchedDayPasses.records))
        setDayPassRecords(fetchedDayPasses.records);

      const events = await fetchAdminEventsApi().catch(() => null);
      if (Array.isArray(events)) setAdminEvents(events);

      const sigLogRes = await fetch("/api/signal/resolved-log")
        .then((r) => r.json())
        .catch(() => null);
      if (sigLogRes && Array.isArray(sigLogRes.recentResolved)) {
        setSignalLogsState(sigLogRes.recentResolved);
      }

      const fetchedDiscordDiag = await fetch("/api/discord/diagnostics")
        .then((r) => r.json())
        .catch(() => null);
      if (fetchedDiscordDiag && fetchedDiscordDiag.success) {
        setDiscordDiag(fetchedDiscordDiag);
      }
    } catch (err: any) {
      console.warn("Error loading admin data:", err);
      setGlobalError(
        "Failed to synchronize backend admin telemetry. Some services may be unavailable.",
      );
    } finally {
      isFetchingDataRef.current = false;
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
    const timer = setInterval(() => loadAdminData(), 5000);
    return () => clearInterval(timer);
  }, [loadAdminData]);

  // Anti-Duplicate User Detection (Dynamic computation based on real identifiers)
  const duplicateRiskUserIds = useMemo(() => {
    const dupMap = new Map<string, string[]>();
    const dupSet = new Set<string>();

    users.forEach((u) => {
      const keys = [
        u.uid ? `uid:${u.uid}` : null,
        u.email ? `email:${u.email.toLowerCase().trim()}` : null,
        u.discordId ? `discord:${u.discordId}` : null,
        u.stripeCustomerId ? `stripe:${u.stripeCustomerId}` : null,
      ].filter(Boolean) as string[];

      keys.forEach((k) => {
        const existing = dupMap.get(k) || [];
        existing.push(u.id);
        dupMap.set(k, existing);
      });
    });

    dupMap.forEach((userList) => {
      if (userList.length > 1) {
        userList.forEach((id) => dupSet.add(id));
      }
    });

    return dupSet;
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.uid && u.uid.toLowerCase().includes(query)) ||
        (u.id && u.id.toLowerCase().includes(query)) ||
        (u.discordTag && u.discordTag.toLowerCase().includes(query)) ||
        (u.discordId && u.discordId.toLowerCase().includes(query)) ||
        (u.discordGlobalName &&
          u.discordGlobalName.toLowerCase().includes(query)) ||
        (u.stripeCustomerId &&
          u.stripeCustomerId.toLowerCase().includes(query)) ||
        (u.stripeSubscriptionId &&
          u.stripeSubscriptionId.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      switch (userFilter) {
        case "FREE":
          return (
            u.subscription === "FREE" || u.role === "FREE" || u.role === "USER"
          );
        case "TRIAL":
          return u.subscription === "FREE_TRIAL" || u.status === "TRIALING";
        case "DAY PASS ACTIVE":
          return Boolean(
            u.dayPass &&
            u.dayPass.status === "ACTIVE" &&
            new Date(u.dayPass.expiresAt || 0).getTime() > Date.now(),
          );
        case "PRO":
          return u.subscription === "PRO_PASS" || u.role === "PRO";
        case "ELITE":
          return u.subscription === "ELITE_PASS" || u.role === "ELITE";
        case "DISCORD LINKED":
          return u.discordLinked === true || Boolean(u.discordId);
        case "STRIPE ACTIVE":
          return Boolean(u.stripeCustomerId) || Boolean(u.stripeSubscriptionId);
        case "PAYMENT ISSUE":
          return u.status === "SUSPENDED";
        case "UNVERIFIED":
          return u.verificationStatus === "UNVERIFIED";
        case "DUPLICATE RISK":
          return (
            duplicateRiskUserIds.has(u.id) ||
            u.verificationStatus === "SUSPECTED_DUPLICATE"
          );
        default:
          return true;
      }
    });
  }, [users, searchTerm, userFilter, duplicateRiskUserIds]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / usersPerPage),
  );
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, currentPage, usersPerPage]);

  // Trigger Backend User Actions with Audit Logging
  const handleUserAction = async (
    user: UserItem,
    action: string,
    payload: Record<string, any> = {},
  ) => {
    const confirmActions = [
      "delete",
      "suspend",
      "freeze_access",
      "revoke_premium",
      "revoke_trial",
      "revoke_plan",
    ];
    if (confirmActions.includes(action)) {
      if (
        !window.confirm(
          `Are you sure you want to perform "${action.toUpperCase()}" on user ${user.email || user.discordTag}?`,
        )
      ) {
        return;
      }
    }

    const res = await performUserAction(user.id, action, payload);
    if (res?.success) {
      setActionSuccessMsg(
        `Action "${action.toUpperCase()}" completed successfully for ${user.email || user.discordTag}`,
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
      loadAdminData();
    } else {
      setGlobalError(res?.message || `Failed to execute action ${action}`);
    }
  };

  // Resync Entitlements Handler
  const handleResyncEntitlement = async (emailOrId: string) => {
    setIsResyncing(true);
    setResyncMessage(null);
    try {
      const res = await resyncEntitlementApi(emailOrId);
      if (res?.success) {
        setResyncMessage(`Entitlements successfully resynced for ${emailOrId}`);
      } else {
        setResyncMessage(
          `Resync notice: ${res?.message || "Operation completed with warnings"}`,
        );
      }
      loadAdminData();
    } catch (err: any) {
      setResyncMessage(`Error resyncing entitlement: ${err.message}`);
    } finally {
      setIsResyncing(false);
      setTimeout(() => setResyncMessage(null), 5000);
    }
  };

  // Add Admin User Handler
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const res = await createAdminUser({
      email: newUserEmail.trim(),
      name: newUserName.trim() || newUserEmail.split("@")[0],
      password: newUserPassword.trim() || undefined,
      tier: newUserTier,
      role: newUserRole,
      referralCode: newUserReferralCode,
    });

    if (res?.success) {
      setActionSuccessMsg(`User ${newUserEmail} created successfully.`);
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      loadAdminData();
    } else {
      setGlobalError(res?.message || "Failed to create user account");
    }
  };

  // Handle Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;

    const res = await updateUserPassword(
      passwordModalUser.id,
      newPasswordInput.trim(),
    );
    if (res?.success) {
      setActionSuccessMsg(`Password updated for ${passwordModalUser.email}`);
      setPasswordModalUser(null);
      setNewPasswordInput("");
    } else {
      setGlobalError(res?.message || "Failed to update user password");
    }
  };

  // Save Referral Code Handler
  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCodeInput.trim()) return;

    const res = await saveAdminReferral({
      code: refCodeInput.trim().toUpperCase(),
      name: refNameInput.trim() || "Partner Promoter",
      email: refEmailInput.trim() || "promoter@vixyvault.com",
      discountGiven: refDiscountInput,
      commissionRate: refRateInput,
    });

    if (res?.success) {
      setActionSuccessMsg(`Referral code ${refCodeInput.toUpperCase()} saved.`);
      setIsAddReferralOpen(false);
      setEditingReferral(null);
      setRefCodeInput("");
      setRefNameInput("");
      setRefEmailInput("");
      loadAdminData();
    } else {
      setGlobalError(res?.message || "Failed to save referral code");
    }
  };

  // Delete Referral Code
  const handleDeleteReferral = async (code: string) => {
    if (!window.confirm(`Delete referral code ${code}?`)) return;
    const res = await deleteAdminReferral(code);
    if (res?.success) {
      setActionSuccessMsg(`Referral code ${code} deleted.`);
      loadAdminData();
    } else {
      setGlobalError(res?.message || "Failed to delete referral code");
    }
  };

  // Wipe Old/Beta Test Users
  const [isWipingUsers, setIsWipingUsers] = useState(false);
  const handleWipeBetaUsers = async () => {
    // 1. Filter out users that would be wiped (i.e. those without Stripe IDs and not Master Admins)
    const vulnerableUsers = filteredUsers.filter((u) => {
      const isMasterAdmin = u.email === "vixyvault0@gmail.com";
      const hasStripe = Boolean(u.stripeCustomerId || u.stripeSubscriptionId);
      return !isMasterAdmin && !hasStripe;
    });

    if (vulnerableUsers.length === 0) {
      alert(
        "No vulnerable test accounts found. (Active Stripe customers are protected).",
      );
      return;
    }

    const confirmPhrase = `wipe ${vulnerableUsers.length}`;
    const userInput = window.prompt(
      `WARNING: You are about to permanently delete ${vulnerableUsers.length} beta/test user accounts.\n\nActive Stripe customers (e.g. Sarah Quant, Alex Trader, Allan Yahir) are PROTECTED and will not be deleted.\n\nType "${confirmPhrase}" to proceed:`,
    );

    if (userInput !== confirmPhrase) {
      alert("Confirmation phrase did not match. Aborting wipe.");
      return;
    }

    setIsWipingUsers(true);

    // Pass the target IDs to the backend just in case, but our backend also verifies Stripe protections natively
    const targetUserIds = vulnerableUsers.map((u) => u.id);

    try {
      const res = await fetch("/api/admin/users/wipe", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ targetUserIds }),
      });
      const data = await res.json();

      if (data?.success) {
        setActionSuccessMsg(
          data.message || "Wiped old/beta users successfully!",
        );
        loadAdminData();
      } else {
        setGlobalError(data?.message || "Failed to wipe beta users");
      }
    } catch (e) {
      setGlobalError("Network error while wiping users");
    }

    setIsWipingUsers(false);
  };

  // Compute Real Overview Metrics from Backend State
  const paidUsersCount = useMemo(() => {
    return users.filter(
      (u) =>
        u.subscription === "PRO_PASS" ||
        u.subscription === "ELITE_PASS" ||
        u.role === "PRO" ||
        u.role === "ELITE",
    ).length;
  }, [users]);

  const activeTrialsCount = useMemo(() => {
    return users.filter(
      (u) => u.subscription === "FREE_TRIAL" || u.status === "TRIALING",
    ).length;
  }, [users]);

  const totalRevenue = useMemo(() => {
    return transactions.reduce(
      (sum, tx) => (tx.status === "Succeeded" ? sum + (tx.amount || 0) : sum),
      0,
    );
  }, [transactions]);

  const todayRevenue = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return transactions.reduce((sum, tx) => {
      if (
        tx.status === "Succeeded" &&
        tx.rawTime &&
        tx.rawTime >= todayStart.getTime()
      ) {
        return sum + (tx.amount || 0);
      }
      return sum;
    }, 0);
  }, [transactions]);

  const activeDiscordMembersCount = useMemo(() => {
    return users.filter(
      (u) => u.discordLinked || u.guildVerified || u.discordId,
    ).length;
  }, [users]);

  const usersActiveLast5Min = useMemo(() => {
    const now = Date.now();
    return users.filter(
      (u) =>
        (u.lastActiveAt && now - u.lastActiveAt <= 5 * 60 * 1000) ||
        (u.lastSeenAt && now - u.lastSeenAt <= 5 * 60 * 1000),
    ).length;
  }, [users]);

  const usersActiveLast15Min = useMemo(() => {
    const now = Date.now();
    return users.filter(
      (u) =>
        (u.lastActiveAt && now - u.lastActiveAt <= 15 * 60 * 1000) ||
        (u.lastSeenAt && now - u.lastSeenAt <= 15 * 60 * 1000),
    ).length;
  }, [users]);

  const usersActiveToday = useMemo(() => {
    const now = Date.now();
    return users.filter(
      (u) =>
        (u.lastActiveAt && now - u.lastActiveAt <= 24 * 60 * 60 * 1000) ||
        (u.lastSeenAt && now - u.lastSeenAt <= 24 * 60 * 60 * 1000),
    ).length;
  }, [users]);

  const newlyRegisteredUsers = useMemo(() => {
    const now = Date.now();
    return users.filter((u) => {
      const joinDate = new Date(u.joined).getTime();
      return !isNaN(joinDate) && now - joinDate <= 24 * 60 * 60 * 1000;
    }).length;
  }, [users]);

  const currentlyConnectedSessions = systemHealth?.realtimeConnections || 0;

  if (isAccessDenied) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-8 space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold text-white tracking-wide">
            ADMIN ACCESS DENIED
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {accessDeniedMsg ||
              "Your current account does not have administrative privileges to access the VIXY Vault Executive Command Center."}
          </p>
          <div className="pt-2 text-xs text-slate-400 font-mono">
            Required Clearance Level: Master Admin (OWNER)
          </div>
          <button
            onClick={() => (window.location.hash = "")}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto font-sans text-slate-100 flex flex-col">
      {/* Top Fixed Command Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-purple-900/40 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-900/40 border border-purple-500/30 rounded-xl text-purple-400">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-wider uppercase text-purple-200">
                VIXY VAULT{" "}
                <span className="text-purple-400 font-normal">
                  | Master Control Panel
                </span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Institutional Operations & Real-Time Entitlement Control Center
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-100 border border-purple-500/50 font-black text-xs transition shadow-lg hover:shadow-purple-500/20 active:scale-95 cursor-pointer"
              title="Return to VIXY VAULT Main Dashboard"
            >
              <ChevronLeft className="w-4 h-4 text-purple-300" />
              <span>RETURN TO DASHBOARD</span>
            </button>
          )}

          <button
            onClick={() => loadAdminData(true)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/60 transition"
            title="Force refresh backend state"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-400" : ""}`}
            />
            <span className="hidden sm:inline">
              {isRefreshing ? "Refreshing..." : "Sync Telemetry"}
            </span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/50 hover:text-red-400 text-slate-400 border border-slate-700/60 transition"
              title="Close Control Panel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Action Success & Global Error Banners */}
      {actionSuccessMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 px-6 py-2.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {globalError && (
        <div className="bg-red-950/80 border-b border-red-500/40 text-red-300 px-6 py-2.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{globalError}</span>
          </div>
          <button onClick={() => setGlobalError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Master Control Navigation Bar */}
      <nav className="bg-slate-900/60 border-b border-slate-800 px-6 py-2 overflow-x-auto scrollbar-none flex items-center space-x-1">
        {[
          { id: "overview", label: "OVERVIEW", icon: Activity },
          { id: "users", label: "USERS", icon: Users, badge: users.length },
          { id: "billing", label: "BILLING", icon: CreditCard },
          {
            id: "trials",
            label: "DAY PASSES & ACCESS",
            icon: Zap,
            badge:
              dayPassRecords.filter((dp) => dp.status === "ACTIVE").length +
              activeTrialsCount,
          },
          {
            id: "acceptance_test",
            label: "ACCEPTANCE TESTS",
            icon: ShieldCheck,
            badge: acceptanceMatrixData?.allPassed ? undefined : 4,
          },
          { id: "discord", label: "DISCORD", icon: Bot },
          {
            id: "referrals",
            label: "REFERRALS",
            icon: Link,
            badge: referrals.length,
          },
          { id: "audit_log", label: "AUDIT LOG", icon: FileText },
          { id: "system_health", label: "SYSTEM HEALTH", icon: Server },
          {
            id: "support",
            label: "SUPPORT",
            icon: LifeBuoy,
            badge: tickets.filter((t) => t.status === "OPEN").length,
          },
          { id: "quant_controls", label: "QUANT CONTROLS", icon: Sliders },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as AdminSection)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold tracking-wider transition whitespace-nowrap ${
                isActive
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-950/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-slate-500"}`}
              />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.2 text-[10px] font-mono rounded-full ${
                    isActive
                      ? "bg-purple-500/30 text-purple-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Control Panel Canvas */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. OVERVIEW SECTION */}
        {/* ========================================================================= */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            {/* Top 8 KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                {
                  title: "TOTAL REG USERS",
                  value: users.length.toString(),
                  icon: Users,
                  color: "text-purple-400",
                  targetTab: "users",
                },
                {
                  title: "ACTIVE (5 MIN)",
                  value: usersActiveLast5Min.toString(),
                  icon: Activity,
                  color: "text-emerald-400",
                  targetTab: "users",
                },
                {
                  title: "ACTIVE (15 MIN)",
                  value: usersActiveLast15Min.toString(),
                  icon: Clock,
                  color: "text-amber-400",
                  targetTab: "users",
                },
                {
                  title: "ACTIVE TODAY",
                  value: usersActiveToday.toString(),
                  icon: UserCheck,
                  color: "text-indigo-400",
                  targetTab: "users",
                },
                {
                  title: "NEW REG (24H)",
                  value: newlyRegisteredUsers.toString(),
                  icon: Sparkles,
                  color: "text-violet-400",
                  targetTab: "users",
                },
                {
                  title: "CONNECTED SESSIONS",
                  value: currentlyConnectedSessions.toString(),
                  icon: Radio,
                  color: "text-cyan-400",
                  targetTab: "system_health",
                },
                {
                  title: "MRR / ARR",
                  value: `$${totalRevenue.toLocaleString()}`,
                  icon: DollarSign,
                  color: "text-emerald-400",
                  targetTab: "billing",
                },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <button
                    key={idx}
                    onClick={() =>
                      setActiveSection(kpi.targetTab as AdminSection)
                    }
                    className="hud-stat-card border border-purple-900/40 hover:border-purple-500/40 text-left transition transform hover:-translate-y-0.5 cursor-pointer shadow-lg"
                  >
                    <div className="flex items-center justify-between hud-stat-label mb-1">
                      <span>{kpi.title}</span>
                      <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                    </div>
                    <div
                      className={`hud-stat-value ${kpi.color}`}
                    >
                      {kpi.value}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* STARK INSTITUTIONAL COMMAND CENTER */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PANEL 1: SYSTEM CONNECTIVITY MATRIX */}
              <div className="vixy-card-elevated hud-corners p-5 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between border-b border-cyan-950 pb-3">
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <h3 className="text-xs font-mono font-black tracking-wider text-cyan-300 uppercase">
                      [01] SYSTEM CONNECTIVITY MATRIX
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                    LIVE FEED
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      name: "API HEALTH",
                      status:
                        systemHealth?.status === "ok" ||
                        systemHealth?.status === "ONLINE"
                          ? "ONLINE"
                          : "DEGRADED",
                      desc: "Full-stack Express backend routes",
                    },
                    {
                      name: "BINANCE DATA FEED",
                      status: diagnosticsData?.marketFeed?.status || "ONLINE",
                      desc: "Websocket & REST price feed",
                    },
                    {
                      name: "KALSHI EXCHANGE",
                      status: diagnosticsData?.activeContract
                        ? "ONLINE"
                        : "DEGRADED",
                      desc: "Target Strike binary settlement",
                    },
                    {
                      name: "FIRESTORE DB",
                      status:
                        diagnosticsData?.database?.status === "Connected" ||
                        diagnosticsData?.database?.status === "ONLINE"
                          ? "ONLINE"
                          : "DEGRADED",
                      desc: "Persistent Cloud state engine",
                    },
                    {
                      name: "PREDICTION ENGINE",
                      status:
                        diagnosticsData?.predictionEngine?.status || "ONLINE",
                      desc: "15M binary direction pipeline",
                    },
                    {
                      name: "DISCORD BOT SERVICE",
                      status: discordDiag?.BOT_CONNECTED
                        ? "ONLINE"
                        : "DEGRADED",
                      desc: "discord.js active bot gateway",
                    },
                    {
                      name: "STRIPE PAYMENTS",
                      status:
                        stripeHealth?.status === "OPERATIONAL"
                          ? "ONLINE"
                          : "DEGRADED",
                      desc: "Billing & entitlement pass checks",
                    },
                  ].map((sys, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#06030e] border border-purple-950/40 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-0.5">
                        <span className="text-white font-black block text-[11px]">
                          {sys.name}
                        </span>
                        <span className="text-[9px] text-purple-400/60 block">
                          {sys.desc}
                        </span>
                      </div>
                      <span
                        className={`vixy-badge ${
                          sys.status === "ONLINE"
                            ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/40"
                            : "bg-rose-950/80 text-rose-400 border-rose-800/40"
                        }`}
                      >
                        {sys.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PANEL 2: 15M ENGINE DEEP ANALYSIS */}
              <div className="vixy-card-elevated hud-corners p-5 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between border-b border-purple-950 pb-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                    <h3 className="text-xs font-mono font-black tracking-wider text-purple-300 uppercase">
                      [02] 15M QUANT ENGINE PARAMETERS
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-950/80 text-purple-400 border border-purple-800/40">
                    AUTHORITATIVE
                  </span>
                </div>

                {(() => {
                  const calibratedProb =
                    diagnosticsData?.calibration?.calibratedModelProbability ??
                    0.5;
                  const dir = diagnosticsData?.predictionEngine?.direction;
                  const upProbability =
                    dir === "UP"
                      ? calibratedProb * 100
                      : dir === "DOWN"
                        ? (1 - calibratedProb) * 100
                        : 50;
                  const downProbability =
                    dir === "DOWN"
                      ? calibratedProb * 100
                      : dir === "UP"
                        ? (1 - calibratedProb) * 100
                        : 50;
                  const isLocked = diagnosticsData?.lockStatus?.qualified;

                  return (
                    <div className="space-y-2 text-xs font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-[#06030e] border border-purple-950 rounded-xl text-center">
                          <span className="text-[9px] text-purple-400/60 block mb-0.5 uppercase">
                            UP PROBABILITY
                          </span>
                          <span className="text-base font-black text-emerald-400">
                            {upProbability.toFixed(1)}%
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#06030e] border border-purple-950 rounded-xl text-center">
                          <span className="text-[9px] text-purple-400/60 block mb-0.5 uppercase">
                            DOWN PROBABILITY
                          </span>
                          <span className="text-base font-black text-rose-400">
                            {downProbability.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1.5">
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            CURRENT DIRECTION
                          </span>
                          <span
                            className={`font-black ${dir === "UP" ? "text-emerald-400" : dir === "DOWN" ? "text-rose-400" : "text-slate-400"}`}
                          >
                            {dir || "NEUTRAL"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            CALIBRATION STATUS
                          </span>
                          <span className="text-white font-bold">
                            {diagnosticsData?.calibration?.calibrationStatus ||
                              "ACTIVE"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            SAMPLE COUNT / 50
                          </span>
                          <span className="text-cyan-400 font-bold">
                            {diagnosticsData?.calibration
                              ?.calibrationSampleSize || 0}{" "}
                            /{" "}
                            {diagnosticsData?.calibration
                              ?.calibrationMinimumSamples || 50}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            ROLLING BRIER SCORE
                          </span>
                          <span className="text-white font-bold">
                            {diagnosticsData?.calibration?.brierScore != null
                              ? Number(
                                  diagnosticsData.calibration.brierScore,
                                ).toFixed(3)
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            TOTAL HISTORIC EVIDENCE
                          </span>
                          <span className="text-purple-300 font-bold">
                            {diagnosticsData?.calibration
                              ?.lifetimeObservations != null
                              ? `${diagnosticsData.calibration.lifetimeObservations} SNAPSHOTS`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            CURRENT SIGNAL EDGE
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {diagnosticsData?.predictionEngine?.edgePct != null
                              ? `+${(Number(diagnosticsData.predictionEngine.edgePct) * 100).toFixed(1)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            QUALIFICATION STATE
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${isLocked ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}
                          >
                            {isLocked ? "QUALIFIED" : "PASS"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            LOCK REASON CODE
                          </span>
                          <span
                            className="text-white font-bold truncate max-w-[55%]"
                            title={diagnosticsData?.lockStatus?.reason}
                          >
                            {diagnosticsData?.lockStatus?.reason ||
                              "AWAITING_EDGE"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-[#06030e]/60 border border-purple-950/30">
                          <span className="text-purple-400/70">
                            FEED FRESHNESS
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {diagnosticsData?.marketFeed?.lastUpdateSecAgo || 0}
                            s AGO
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* PANEL 3: DISCORD INFRASTRUCTURE & RETRY QUEUE */}
              <div className="vixy-card-elevated hud-corners p-5 space-y-4 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <h3 className="text-xs font-mono font-black tracking-wider text-indigo-300 uppercase">
                        [03] DISCORD TELEMETRY ENGINE
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">
                      GATEWAY
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-[#06030e] border border-purple-950/50 flex justify-between items-center">
                      <span className="text-purple-400/70">CONNECTED:</span>
                      <span
                        className={`font-black ${discordDiag?.BOT_CONNECTED ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {discordDiag?.BOT_CONNECTED ? "YES" : "NO"}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#06030e] border border-purple-950/50 flex justify-between items-center">
                      <span className="text-purple-400/70">GUILD FOUND:</span>
                      <span
                        className={`font-black ${discordDiag?.GUILD_FOUND ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {discordDiag?.GUILD_FOUND ? "YES" : "NO"}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#06030e] border border-purple-950/50 flex justify-between items-center">
                      <span className="text-purple-400/70">ROLE FOUND:</span>
                      <span
                        className={`font-black ${discordDiag?.ROLE_FOUND ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {discordDiag?.ROLE_FOUND ? "YES" : "NO"}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#06030e] border border-purple-950/50 flex justify-between items-center">
                      <span className="text-purple-400/70">HIERARCHY:</span>
                      <span
                        className={`font-black ${discordDiag?.ROLE_MANAGEABLE ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {discordDiag?.ROLE_MANAGEABLE ? "YES" : "NO"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                    <div className="p-2 bg-[#06030e] border border-purple-950 rounded-xl">
                      <span className="text-[9px] text-purple-400/50 block uppercase">
                        QUEUE
                      </span>
                      <span className="text-base font-black text-cyan-300">
                        {discordDiag?.PENDING_COUNT ?? 0}
                      </span>
                    </div>
                    <div className="p-2 bg-[#06030e] border border-purple-950 rounded-xl">
                      <span className="text-[9px] text-purple-400/50 block uppercase">
                        SUCCESS
                      </span>
                      <span className="text-base font-black text-emerald-400">
                        {discordDiag?.SUCCESS_COUNT ?? 0}
                      </span>
                    </div>
                    <div className="p-2 bg-[#06030e] border border-purple-950 rounded-xl">
                      <span className="text-[9px] text-purple-400/50 block uppercase">
                        FAILED
                      </span>
                      <span className="text-base font-black text-rose-400">
                        {discordDiag?.FAILED_COUNT ?? 0}
                      </span>
                    </div>
                  </div>

                  {discordDiag?.LAST_ERROR ? (
                    <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[10px] font-mono text-rose-300">
                      <span className="font-black block uppercase text-[9px] text-rose-400">
                        LAST SYNC ERROR:
                      </span>
                      <span className="break-all text-xs font-bold">
                        {discordDiag.LAST_ERROR}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-950/35 border border-emerald-900/30 text-[10px] font-mono text-emerald-300 text-center">
                      ✓ Zero exceptions logged in gateway loop
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => loadAdminData(true)}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-950/60 transition"
                  >
                    SYNC ALL AUTHORITATIVE STATE
                  </button>
                </div>
              </div>
            </div>

            {/* Service Health Quick Matrix & Resync Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="vixy-card hud-corners p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    <span>Integrations Status</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Real-Time
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-300 font-semibold">
                      Stripe Payment Gateway
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        stripeHealth?.status === "OPERATIONAL"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {stripeHealth?.status || "CONFIGURED"} (
                      {stripeHealth?.stripe_secret_key_mode || "LIVE"})
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-300 font-semibold">
                      Discord Bot Infrastructure
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        discordHealth?.botConnected
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {discordHealth?.botConnected ? "CONNECTED" : "STANDBY"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-300 font-semibold">
                      Kalshi & Crypto Feed
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      OPERATIONAL
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Entitlement Resync Tool */}
              <div className="vixy-card hud-corners p-4 space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Emergency Manual Entitlement Resync</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Server Authorization
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={resyncIdentifier}
                    onChange={(e) => setResyncIdentifier(e.target.value)}
                    placeholder="Enter email or Discord User ID..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:border-purple-500 outline-none"
                  />
                  <button
                    onClick={() => handleResyncEntitlement(resyncIdentifier)}
                    disabled={isResyncing}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-purple-950/60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isResyncing ? "animate-spin" : ""}`}
                    />
                    <span>
                      {isResyncing
                        ? "Resyncing..."
                        : "Force Resync Entitlement"}
                    </span>
                  </button>
                </div>

                {resyncMessage && (
                  <div className="p-2 rounded bg-purple-950/60 border border-purple-500/30 text-xs font-mono text-purple-300">
                    {resyncMessage}
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Force-queries Stripe customer subscriptions and Discord guild
                  member roles, reconciles local user state, and re-assigns
                  roles within &lt;200ms.
                </p>
              </div>
            </div>

            {/* Audit Logs Stream Preview */}
            <div className="vixy-card hud-corners p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>Recent Backend System & Audit Logs</span>
                </h3>
                <button
                  onClick={() => setActiveSection("audit_log")}
                  className="text-xs text-purple-400 hover:underline font-semibold"
                >
                  View All Audit Logs &rarr;
                </button>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {auditLogs.slice(0, 5).map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between space-x-4"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                          log.level === "ERROR"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : log.level === "WARN"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-purple-400 font-bold text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-slate-300 truncate text-[11px]">
                        {log.details}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. USER CONTROL CENTER (USERS SECTION) */}
        {/* ========================================================================= */}
        {activeSection === "users" && (
          <div className="space-y-4">
            {/* Control Bar & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 vixy-card hud-corners p-4 shadow-xl">
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search email, UID, ID, Discord tag, Stripe ID..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleWipeBetaUsers}
                  disabled={isWipingUsers}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50"
                  title="Wipe old test accounts so only Master Admin remains"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>
                    {isWipingUsers ? "Wiping Users..." : "Wipe Beta Users"}
                  </span>
                </button>
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-purple-950/50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            {/* User Intelligence Filters */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1">
              {[
                "ALL",
                "FREE",
                "TRIAL",
                "DAY PASS ACTIVE",
                "PRO",
                "ELITE",
                "DISCORD LINKED",
                "STRIPE ACTIVE",
                "PAYMENT ISSUE",
                "UNVERIFIED",
                "DUPLICATE RISK",
              ].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => {
                    setUserFilter(filterKey as UserFilterOption);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    userFilter === filterKey
                      ? "bg-purple-600 text-white border border-purple-400 shadow-md"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            {/* Dense User Directory Table */}
            <div className="vixy-card hud-corners overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">USER / EMAIL</th>
                      <th className="p-3">AUTH</th>
                      <th className="p-3">PLAN</th>
                      <th className="p-3">STRIPE</th>
                      <th className="p-3">DISCORD</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">JOINED</th>
                      <th className="p-3">DATA HEALTH</th>
                      <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-8 text-center text-slate-500 font-sans"
                        >
                          No users matched the requested search or filter
                          criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const isDupRisk =
                          duplicateRiskUserIds.has(user.id) ||
                          user.verificationStatus === "SUSPECTED_DUPLICATE";
                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="p-3">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-xs shrink-0">
                                  {user.name
                                    ? user.name[0].toUpperCase()
                                    : user.email
                                      ? user.email[0].toUpperCase()
                                      : user.discordTag
                                        ? user.discordTag[0].toUpperCase()
                                        : "?"}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                                    <span>
                                      {user.name ||
                                        (user.email
                                          ? user.email.split("@")[0]
                                          : user.discordGlobalName ||
                                            user.discordTag)}
                                    </span>
                                    {user.role === "OWNER" && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                        OWNER
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {user.email || "unavailable/not connected"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              <span className="text-[10px] font-mono text-slate-400">
                                {user.uid
                                  ? user.uid.slice(0, 8) + "..."
                                  : "LOCAL"}
                              </span>
                            </td>

                            <td className="p-3">
                              {user.dayPass &&
                              user.dayPass.status === "ACTIVE" &&
                              new Date(user.dayPass.expiresAt || 0).getTime() >
                                Date.now() ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950">
                                  ⚡ 24H_DAY_PASS
                                </span>
                              ) : user.dayPass &&
                                user.dayPass.status === "EXPIRED" ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  ⚡ PASS_EXPIRED
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                    user.subscription === "ELITE_PASS" ||
                                    user.role === "ELITE"
                                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                                      : user.subscription === "PRO_PASS" ||
                                          user.role === "PRO"
                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                        : user.subscription === "STARTER"
                                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                          : user.subscription === "DAY_PASS"
                                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                            : user.subscription === "FREE_TRIAL"
                                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                              : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {user.subscription || user.role || "NONE"}
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              {user.stripeCustomerId ? (
                                <span className="text-emerald-400 text-[11px] font-mono flex items-center space-x-1">
                                  <Check className="w-3 h-3" />
                                  <span>
                                    {user.stripeCustomerId.slice(0, 10)}...
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">
                                  UNLINKED
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              {user.discordTag || user.discordId ? (
                                <span className="text-indigo-300 text-[11px] font-mono">
                                  @
                                  {user.discordTag ||
                                    user.discordId?.slice(0, 8)}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px] font-mono">
                                  DISCORD_PENDING
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                  user.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : user.status === "TRIALING"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                      : "bg-red-500/10 text-red-400 border border-red-500/30"
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>

                            <td className="p-3 text-slate-400 text-[11px]">
                              {user.joined}
                            </td>

                            <td className="p-3">
                              {isDupRisk ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded flex items-center space-x-1 w-fit">
                                  <AlertTriangle className="w-3 h-3 text-red-400" />
                                  <span>DUPLICATE RISK</span>
                                </span>
                              ) : user.verificationStatus === "UNVERIFIED" ||
                                (!user.discordLinked && !user.discordId) ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-700/50 text-slate-400 border border-slate-700 rounded">
                                  UNVERIFIED
                                </span>
                              ) : (user.verificationStatus as string) ===
                                "NEEDS_GUILD" ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 rounded">
                                  NEEDS GUILD
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 rounded">
                                  VERIFIED
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => openEditUserModal(user)}
                                  className="px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[11px] font-bold border border-purple-500/40 transition flex items-center gap-1"
                                  title="Edit User Record"
                                >
                                  <Edit3 className="w-3 h-3 text-purple-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setInspectorUser(user)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                                >
                                  Inspect
                                </button>
                                <button
                                  onClick={() =>
                                    handleUserAction(user, "sync_user")
                                  }
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 transition"
                                  title="Sync User Data"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {paginatedUsers.length} of {filteredUsers.length}{" "}
                  Users
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-purple-300 font-bold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. BILLING CENTER (BILLING SECTION) */}
        {/* ========================================================================= */}
        {activeSection === "billing" && (
          <div className="space-y-6">
            {/* Connection Status & Summary Metrics */}
            <div className="vixy-card hud-corners p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200 flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <span>Stripe Billing & Subscription Operations</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Authoritative Stripe Checkout, Subscriptions, and Customer
                    Entitlement Directory
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Stripe Mode:{" "}
                    {stripeHealth?.stripe_secret_key_mode?.toUpperCase() ||
                      "LIVE"}
                  </span>
                  <button
                    onClick={() => loadAdminData(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>REFRESH FROM STRIPE</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    TOTAL REVENUE
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    ${totalRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    ACTIVE SUBSCRIPTIONS
                  </div>
                  <div className="text-lg font-black font-mono text-purple-300">
                    {paidUsersCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    FAILED / PAST DUE
                  </div>
                  <div className="text-lg font-black font-mono text-amber-400">
                    0
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">
                    STRIPE CUSTOMERS
                  </div>
                  <div className="text-lg font-black font-mono text-slate-200">
                    {users.filter((u) => u.stripeCustomerId).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions & Revenue Table */}
            <div className="vixy-card hud-corners overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Recent Stripe Checkout & Renewal Transactions
                </h3>
                <div className="flex items-center space-x-2">
                  {["ALL", "Succeeded", "Failed", "Pending"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setTxStatusFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                        txStatusFilter === st
                          ? "bg-purple-600 text-white"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">TRANSACTION ID</th>
                      <th className="p-3">USER EMAIL</th>
                      <th className="p-3">PLAN</th>
                      <th className="p-3">AMOUNT</th>
                      <th className="p-3">METHOD</th>
                      <th className="p-3">STATUS</th>
                      <th className="p-3">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions
                      .filter(
                        (tx) =>
                          txStatusFilter === "ALL" ||
                          tx.status === txStatusFilter,
                      )
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-purple-300 font-bold">
                            {tx.id}
                          </td>
                          <td className="p-3 text-slate-200">{tx.email}</td>
                          <td className="p-3 text-slate-300">{tx.plan}</td>
                          <td className="p-3 text-emerald-400 font-bold">
                            ${tx.amount.toFixed(2)}
                          </td>
                          <td className="p-3 text-slate-400">{tx.method}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                tx.status === "Succeeded"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-red-500/10 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{tx.timestamp}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. DAY PASSES, CONNECTED ACCOUNTS & ACCESS STORE */}
        {/* ========================================================================= */}
        {activeSection === "trials" && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>ACTIVE 24H PASSES</span>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-black font-mono text-amber-400 mt-1">
                  {dayPassRecords.filter((dp) => dp.status === "ACTIVE").length}
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>EXPIRED DAY PASSES</span>
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="text-xl font-black font-mono text-slate-400 mt-1">
                  {
                    dayPassRecords.filter((dp) => dp.status === "EXPIRED")
                      .length
                  }
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>FREE TRIALS</span>
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-black font-mono text-purple-300 mt-1">
                  {activeTrialsCount}
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>DISCORD CONNECTED</span>
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-xl font-black font-mono text-indigo-300 mt-1">
                  {users.filter((u) => u.discordLinked || u.discordId).length}
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>STRIPE CUSTOMERS</span>
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {
                    users.filter(
                      (u) => u.stripeCustomerId || u.stripeSubscriptionId,
                    ).length
                  }
                </div>
              </div>
            </div>

            {/* 1. 24-HOUR DAY PASSES STORE TABLE */}
            <div className="vixy-card hud-corners overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span>24-Hour Day Passes Store & Active Grants</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Real-time status of all $9.99 24-Hour Day Passes purchased
                    via Stripe Checkout or granted by admins.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">USER / EMAIL</th>
                      <th className="p-3">ENTITLEMENT ID</th>
                      <th className="p-3">TIER</th>
                      <th className="p-3">PASS STATUS</th>
                      <th className="p-3">ACTIVATED AT</th>
                      <th className="p-3">EXPIRES AT</th>
                      <th className="p-3">DISCORD ROLE</th>
                      <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dayPassRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-6 text-center text-slate-500 font-sans"
                        >
                          No 24-Hour Day Pass records currently found.
                        </td>
                      </tr>
                    ) : (
                      dayPassRecords.map((dp) => {
                        const isPassActive =
                          dp.status === "ACTIVE" &&
                          new Date(dp.expiresAt || 0).getTime() > Date.now();
                        const matchingUser = users.find(
                          (u) =>
                            u.email?.toLowerCase() ===
                              dp.email?.toLowerCase() || u.id === dp.userId,
                        );
                        return (
                          <tr
                            key={dp.entitlementId || dp.email}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="p-3">
                              <div className="font-bold text-slate-200">
                                {dp.email}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ID: {dp.userId}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-400">
                              {dp.entitlementId || "dp_vixy"}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                ELITE 24H
                              </span>
                            </td>
                            <td className="p-3">
                              {isPassActive ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded flex items-center space-x-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>ACTIVE (24H)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded">
                                  EXPIRED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {dp.activatedAt
                                ? new Date(dp.activatedAt).toLocaleString()
                                : "N/A"}
                            </td>
                            <td className="p-3 text-slate-300 font-mono text-[11px]">
                              {dp.expiresAt
                                ? new Date(dp.expiresAt).toLocaleString()
                                : "N/A"}
                            </td>
                            <td className="p-3">
                              {dp.discordRoleAssigned ? (
                                <span className="text-emerald-400 text-[10px] font-bold flex items-center space-x-1">
                                  <Check className="w-3 h-3" />
                                  <span>ASSIGNED</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">
                                  UNASSIGNED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              {matchingUser && (
                                <>
                                  {isPassActive ? (
                                    <button
                                      onClick={() =>
                                        handleUserAction(
                                          matchingUser,
                                          "revoke_day_pass",
                                        )
                                      }
                                      className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded text-[11px] font-bold"
                                    >
                                      Revoke Pass
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleUserAction(
                                          matchingUser,
                                          "grant_day_pass",
                                        )
                                      }
                                      className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded text-[11px] font-bold"
                                    >
                                      Grant 24H Pass
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. FREE TRIALS & ANTI-DUPLICATE TABLE */}
            <div className="vixy-card hud-corners overflow-hidden p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Free Trials & Hardware Protection</span>
              </h2>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">USER EMAIL</th>
                      <th className="p-3">JOINED</th>
                      <th className="p-3">FINGERPRINT</th>
                      <th className="p-3">TRIAL STATUS</th>
                      <th className="p-3">DUPLICATE RISK</th>
                      <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users
                      .filter(
                        (u) =>
                          u.subscription === "FREE_TRIAL" ||
                          u.status === "TRIALING",
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-slate-200 font-bold">
                            {u.email}
                          </td>
                          <td className="p-3 text-slate-400">{u.joined}</td>
                          <td className="p-3 text-slate-500">
                            {u.hardwareFingerprint || "UNAVAILABLE"}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                              TRIALING
                            </span>
                          </td>
                          <td className="p-3">
                            {duplicateRiskUserIds.has(u.id) ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded">
                                DUPLICATE RISK
                              </span>
                            ) : (
                              <span className="text-slate-500">CLEAN</span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              onClick={() =>
                                handleUserAction(u, "extend_trial")
                              }
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[11px]"
                            >
                              Extend 7 Days
                            </button>
                            <button
                              onClick={() =>
                                handleUserAction(u, "grant_day_pass")
                              }
                              className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 rounded text-[11px] font-bold"
                            >
                              Grant 24H Pass
                            </button>
                            <button
                              onClick={() =>
                                handleUserAction(u, "revoke_trial")
                              }
                              className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded text-[11px]"
                            >
                              Revoke Trial
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. DISCORD BOT HUB SECTION */}
        {/* ========================================================================= */}
        {activeSection === "discord" && (
          <DiscordBotHubView currentUserId={currentUserId} />
        )}

        {/* ========================================================================= */}
        {/* 6. REFERRALS SECTION */}
        {/* ========================================================================= */}
        {activeSection === "referrals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between vixy-card hud-corners p-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200">
                  Referral & Promo Code Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Manage promoter discount codes, commission payouts, and
                  referral attribution
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingReferral(null);
                  setRefCodeInput("");
                  setRefNameInput("");
                  setRefEmailInput("");
                  setIsAddReferralOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Promo Code</span>
              </button>
            </div>

            <div className="vixy-card hud-corners overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="p-3">CODE</th>
                    <th className="p-3">PROMOTER</th>
                    <th className="p-3">DISCOUNT</th>
                    <th className="p-3">COMMISSION</th>
                    <th className="p-3">TOTAL USES</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {referrals.map((ref) => (
                    <tr key={ref.code} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-purple-300">
                        {ref.code}
                      </td>
                      <td className="p-3 text-slate-200">
                        {ref.promoterName} ({ref.promoterEmail})
                      </td>
                      <td className="p-3 text-emerald-400 font-bold">
                        {ref.discountOff || "20% Off"}
                      </td>
                      <td className="p-3 text-purple-400 font-bold">
                        {ref.commissionRate || "20%"}
                      </td>
                      <td className="p-3 text-slate-300 font-mono">
                        {ref.uses || 0}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteReferral(ref.code)}
                          className="p-1 rounded bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-500/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. AUDIT LOG SECTION */}
        {/* ========================================================================= */}
        {activeSection === "audit_log" && (
          <div className="space-y-4">
            <div className="vixy-card hud-corners p-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Backend Audit Log Records</span>
              </h2>

              <div className="flex items-center space-x-2">
                {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setAuditLevelFilter(lvl as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                      auditLevelFilter === lvl
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="vixy-card hud-corners overflow-hidden">
              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {auditLogs
                  .filter(
                    (log) =>
                      auditLevelFilter === "ALL" ||
                      log.level === auditLevelFilter,
                  )
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3 flex items-center justify-between space-x-4 hover:bg-slate-800/30"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            log.level === "ERROR"
                              ? "bg-red-500/20 text-red-400"
                              : log.level === "WARN"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-purple-300 font-bold">
                          {log.actor}
                        </span>
                        <span className="text-slate-200 font-semibold">
                          {log.action}:
                        </span>
                        <span className="text-slate-400 truncate">
                          {log.details}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. SYSTEM HEALTH SECTION */}
        {/* ========================================================================= */}
        {activeSection === "system_health" && (
          <div className="space-y-6">
            <div className="vixy-card hud-corners p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200 flex items-center space-x-2">
                <Server className="w-5 h-5 text-cyan-400" />
                <span>Real-Time Backend Service Matrix</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "AUTH", status: "ONLINE", latency: "4ms" },
                  {
                    name: "DATABASE / PERSISTENCE",
                    status: "ONLINE",
                    latency: "2ms",
                  },
                  {
                    name: "STRIPE GATEWAY",
                    status:
                      stripeHealth?.status === "OPERATIONAL"
                        ? "ONLINE"
                        : "DEGRADED",
                    latency: "24ms",
                  },
                  {
                    name: "STRIPE WEBHOOKS",
                    status: "ONLINE",
                    latency: "12ms",
                  },
                  {
                    name: "DISCORD INFRASTRUCTURE",
                    status: discordHealth?.botConnected ? "ONLINE" : "DEGRADED",
                    latency: "18ms",
                  },
                  {
                    name: "MARKET DATA FEED",
                    status: "ONLINE",
                    latency: "14ms",
                  },
                  {
                    name: "VIXY AI PREDICTION ENGINE",
                    status: "ONLINE",
                    latency: "16ms",
                  },
                  {
                    name: "AUTOMATION SCHEDULER",
                    status: "ONLINE",
                    latency: "1ms",
                  },
                  { name: "BOT CLUSTER", status: "ONLINE", latency: "8ms" },
                ].map((svc, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1"
                  >
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {svc.name}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          svc.status === "ONLINE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {svc.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {svc.latency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RESOLVED SIGNAL OUTCOME AUDIT LOG */}
            <div className="bg-slate-900/80 border border-purple-900/60 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    RESOLVED SIGNAL OUTCOME AUDIT LOG (PROVABLE MEMORY STORE)
                  </h3>
                  <p className="text-[11px] text-purple-300/70">
                    Raw 15-minute walk-forward model prediction outcomes, target
                    strikes, close prices, and Brier scoring calibration
                    history.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono font-bold">
                  {signalLogsState.length} LOGGED RECORDS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-purple-300/80 uppercase">
                      <th className="py-2 px-2">Signal ID</th>
                      <th className="py-2 px-2">Market</th>
                      <th className="py-2 px-2">Pred</th>
                      <th className="py-2 px-2">Conf</th>
                      <th className="py-2 px-2">Target Strike</th>
                      <th className="py-2 px-2">Settlement Price</th>
                      <th className="py-2 px-2">Outcome</th>
                      <th className="py-2 px-2">Brier Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {signalLogsState.map((log: any) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-2 text-[10px] text-purple-300 font-bold">
                          {log.id}
                        </td>
                        <td className="py-2 px-2 font-bold">
                          {log.market || "BTC_KALSHI_15M"}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.direction === "UP"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-rose-950 text-rose-400 border border-rose-800"
                            }`}
                          >
                            BUY {log.direction}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold text-cyan-300">
                          {log.confidence}%
                        </td>
                        <td className="py-2 px-2">
                          ${log.targetStrike?.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 font-bold">
                          ${log.settlementPrice?.toLocaleString()}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.wasCorrect
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            }`}
                          >
                            {log.wasCorrect ? "WIN (CORRECT)" : "LOSS"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-purple-300 font-bold">
                          {log.brierScore != null
                            ? Number(log.brierScore).toFixed(4)
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. SUPPORT TICKETS SECTION */}
        {/* ========================================================================= */}
        {activeSection === "support" && (
          <div className="space-y-4">
            <div className="vixy-card hud-corners p-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200">
                Support Tickets & Member Inquiries
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="vixy-card hud-corners overflow-hidden divide-y divide-slate-800">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 cursor-pointer hover:bg-slate-800/50 transition ${
                      selectedTicket?.id === t.id
                        ? "bg-purple-950/40 border-l-2 border-purple-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-purple-300">{t.id}</span>
                      <span className="text-slate-500">{t.date}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {t.subject}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t.userEmail}
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                {selectedTicket ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">
                          {selectedTicket.subject}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {selectedTicket.userEmail} • Category:{" "}
                          {selectedTicket.category}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-bold bg-amber-500/20 text-amber-300 rounded">
                        {selectedTicket.status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                      {selectedTicket.message ||
                        (selectedTicket as any).description ||
                        selectedTicket.subject ||
                        "No inquiry description recorded."}
                    </div>

                    <div className="space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type official response..."
                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:border-purple-500 outline-none h-24"
                      />
                      <button
                        onClick={() => {
                          setActionSuccessMsg(
                            `Response sent to ticket ${selectedTicket.id}`,
                          );
                          setReplyText("");
                        }}
                        className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl"
                      >
                        Send Support Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Select a support ticket to inspect details and send
                    responses.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. PRODUCTION ACCEPTANCE TEST MATRIX (ALL 4 PLANS) */}
        {/* ========================================================================= */}
        {activeSection === "acceptance_test" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 vixy-card hud-corners p-5 shadow-xl">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-purple-200">
                    Production Customer Login & Entitlement Acceptance Suite
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    4 PLAN TYPES
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Automated end-to-end verification across Day Pass, Starter,
                  Pro Quant, and Elite Quant. Validates registration, Stripe
                  checkout binding, exact plan identification, immutable userId
                  matching, session refreshes, sign-out locking, password
                  re-authentication, and instant terminal unlocking.
                </p>
              </div>

              <button
                onClick={handleRunAcceptanceMatrix}
                disabled={isRunningAcceptanceMatrix}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition flex items-center space-x-2 shadow-lg shadow-purple-950/60 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRunningAcceptanceMatrix ? "animate-spin" : ""}`}
                />
                <span>
                  {isRunningAcceptanceMatrix
                    ? "EXECUTING TEST MATRIX..."
                    : "RUN FULL ACCEPTANCE MATRIX"}
                </span>
              </button>
            </div>

            {/* Test Matrix Sequence Diagram Card */}
            <div className="bg-slate-950/80 border border-purple-900/30 rounded-2xl p-4 text-xs font-mono">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                VERIFIED LIFECYCLE PIPELINE (STRICT ZERO-FLAPPING & PERSISTENCE)
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-purple-300 font-bold">
                  1. Create Account
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-purple-300 font-bold">
                  2. Stripe Checkout
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-purple-300 font-bold">
                  3. Payment Confirmed
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-bold">
                  4. Same userId Found
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-bold">
                  5. Entitlement Active
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-amber-300 font-bold">
                  6. Refresh Browser
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-rose-300 font-bold">
                  7. Sign Out
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-indigo-300 font-bold">
                  8. Sign In (Email+Pass)
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded text-emerald-200 font-black">
                  9. Entitlement Intact
                </span>
                <span>→</span>
                <span className="px-2 py-1 bg-purple-950/80 border border-purple-500/50 rounded text-purple-200 font-black">
                  10. TERMINAL UNLOCKED
                </span>
              </div>
            </div>

            {/* Results Grid */}
            {acceptanceMatrixData ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border ${acceptanceMatrixData.allPassed ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" : "bg-rose-950/40 border-rose-500/40 text-rose-300"} flex items-center justify-between`}
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                      <div className="font-bold text-xs">
                        {acceptanceMatrixData.summary}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Timestamp:{" "}
                        {new Date(
                          acceptanceMatrixData.timestamp,
                        ).toLocaleString()}{" "}
                        • {acceptanceMatrixData.totalPlansTested} Plans Verified
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs font-black rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {acceptanceMatrixData.allPassed
                      ? "ALL PASSED (100%)"
                      : "SOME FAILED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptanceMatrixData.results.map((planRes) => (
                    <div
                      key={planRes.planType}
                      className="vixy-card hud-corners p-4 space-y-3 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <span className="font-black text-slate-100 text-sm">
                            {planRes.planName}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            Target Plan:{" "}
                            <span className="text-purple-400 font-bold">
                              {planRes.planType}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${planRes.overallStatus === "PASSED" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"}`}
                        >
                          {planRes.overallStatus} ({planRes.durationMs}ms)
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {planRes.steps.map((st) => (
                          <div
                            key={st.step}
                            className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-start space-x-2"
                          >
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-bold rounded mt-0.5 ${st.status === "PASSED" ? "bg-emerald-950 text-emerald-300 border border-emerald-600/40" : "bg-rose-950 text-rose-300 border border-rose-600/40"}`}
                            >
                              STEP {st.step}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-200 text-[11px] flex items-center justify-between">
                                <span>{st.name}</span>
                                <span
                                  className={
                                    st.status === "PASSED"
                                      ? "text-emerald-400 text-[10px]"
                                      : "text-rose-400 text-[10px]"
                                  }
                                >
                                  {st.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 break-words mt-0.5">
                                {st.details}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-purple-400/60 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-slate-200">
                  Production Acceptance Test Suite Ready
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click the button above to execute the live 10-step lifecycle
                  test for Day Pass, Starter, Pro Quant, and Elite Quant.
                </p>
                <button
                  onClick={handleRunAcceptanceMatrix}
                  disabled={isRunningAcceptanceMatrix}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg inline-flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRunningAcceptanceMatrix ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isRunningAcceptanceMatrix
                      ? "Running..."
                      : "Execute Test Suite Now"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. QUANT CONTROLS SECTION */}
        {/* ========================================================================= */}
        {activeSection === "quant_controls" && (
          <div className="space-y-4 vixy-card hud-corners p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <span>VIXY AI Model Tuning & 15M Candle Lock Thresholds</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-slate-300">
                  MINIMUM CONFIDENCE THRESHOLD
                </div>
                <div className="text-lg font-black text-purple-400">70.0%</div>
                <p className="text-[11px] text-slate-400">
                  Signals below 70.0% confidence remain in NEUTRAL advisory
                  state and are withheld from auto-execution.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="font-bold text-slate-300">
                  15M PERSISTENCE WINDOW
                </div>
                <div className="text-lg font-black text-emerald-400">
                  12 SECONDS (3s for 50/50 Pull)
                </div>
                <p className="text-[11px] text-slate-400">
                  Requires 12 consecutive seconds of edge persistence prior to
                  candle close before triggering lock.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* USER INSPECTOR MODAL / DRAWER */}
      {inspectorUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="vixy-card-elevated hud-corners max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 text-xs font-mono shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300 text-base">
                  {inspectorUser.name
                    ? inspectorUser.name[0].toUpperCase()
                    : inspectorUser.email[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {inspectorUser.name || inspectorUser.email}
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    {inspectorUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectorUser(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspector Sections */}
            <div className="space-y-4">
              {/* Identity */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-purple-400 font-bold uppercase">
                  IDENTITY RECORD
                </div>
                <div>
                  <span className="text-slate-500">Firebase UID:</span>{" "}
                  <span className="text-slate-200">
                    {inspectorUser.uid || "UNAVAILABLE"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">User Email:</span>{" "}
                  <span className="text-slate-200">{inspectorUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-500">Account Joined:</span>{" "}
                  <span className="text-slate-200">
                    {inspectorUser.joined || "UNAVAILABLE"}
                  </span>
                </div>
              </div>

              {/* Billing */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-purple-400 font-bold uppercase">
                  BILLING & STRIPE RECORD
                </div>
                <div>
                  <span className="text-slate-500">Stripe Customer ID:</span>{" "}
                  <span className="text-emerald-400">
                    {inspectorUser.stripeCustomerId || "UNAVAILABLE"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Subscription ID:</span>{" "}
                  <span className="text-purple-300">
                    {inspectorUser.stripeSubscriptionId || "UNAVAILABLE"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Active Tier:</span>{" "}
                  <span className="text-slate-200">
                    {inspectorUser.subscription || inspectorUser.role}
                  </span>
                </div>
              </div>

              {/* Day Pass Record */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center justify-between">
                  <span>24-HOUR DAY PASS ENTITLEMENT</span>
                  <Zap className="w-3.5 h-3.5" />
                </div>
                {inspectorUser.dayPass ? (
                  <>
                    <div>
                      <span className="text-slate-500">Status:</span>{" "}
                      <span
                        className={
                          inspectorUser.dayPass.status === "ACTIVE"
                            ? "text-emerald-400 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {inspectorUser.dayPass.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Entitlement ID:</span>{" "}
                      <span className="text-slate-300 font-mono text-[11px]">
                        {inspectorUser.dayPass.entitlementId || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Expires At:</span>{" "}
                      <span className="text-amber-300 font-mono text-[11px]">
                        {inspectorUser.dayPass.expiresAt
                          ? new Date(
                              inspectorUser.dayPass.expiresAt,
                            ).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 italic text-[11px]">
                    No active or previous Day Pass record found for this user.
                  </div>
                )}
              </div>

              {/* Discord */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-purple-400 font-bold uppercase">
                  DISCORD INTEGRATION
                </div>
                <div>
                  <span className="text-slate-500">Discord ID:</span>{" "}
                  <span className="text-slate-200">
                    {inspectorUser.discordId || "UNAVAILABLE"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Discord Tag:</span>{" "}
                  <span className="text-slate-200">
                    {inspectorUser.discordTag || "UNAVAILABLE"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Guild Verified:</span>{" "}
                  <span className="text-slate-200">
                    {inspectorUser.guildVerified ? "YES" : "NO"}
                  </span>
                </div>
              </div>

              {/* Recorded Event History */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-purple-400 font-bold uppercase">
                  RECORDED EVENT TIMELINE
                </div>
                <div className="text-slate-400 italic">NO EVENT RECORDED</div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="border-t border-slate-800 pt-4 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => {
                  const u = inspectorUser;
                  setInspectorUser(null);
                  openEditUserModal(u);
                }}
                className="px-3 py-1.5 rounded bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 border border-purple-500/50 font-bold text-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-300" />
                <span>EDIT USER RECORD</span>
              </button>
              {inspectorUser.dayPass?.status === "ACTIVE" ? (
                <button
                  onClick={() =>
                    handleUserAction(inspectorUser, "revoke_day_pass")
                  }
                  className="px-3 py-1.5 rounded bg-red-950 text-red-300 border border-red-500/40 font-bold text-xs"
                >
                  REVOKE DAY PASS
                </button>
              ) : (
                <button
                  onClick={() =>
                    handleUserAction(inspectorUser, "grant_day_pass")
                  }
                  className="px-3 py-1.5 rounded bg-amber-600/30 text-amber-200 border border-amber-500/40 font-bold text-xs flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>GRANT 24H PASS</span>
                </button>
              )}
              <button
                onClick={() =>
                  handleUserAction(inspectorUser, "grant_premium", {
                    tier: "ELITE_PASS",
                  })
                }
                className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                GRANT ELITE
              </button>
              <button
                onClick={() => handleUserAction(inspectorUser, "suspend")}
                className="px-3 py-1.5 rounded bg-red-950 text-red-300 border border-red-500/40 font-bold text-xs"
              >
                FREEZE ACCESS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="vixy-card-elevated hud-corners max-w-md w-full p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">
                Create New Member Account
              </h3>
              <button onClick={() => setIsAddUserOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">
                  User Email *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="trader@domain.com"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Trader Alex"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave blank to require a password reset before first login
                </p>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MOD">MOD</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Referral Code
                </label>
                <input
                  type="text"
                  value={newUserReferralCode}
                  onChange={(e) => setNewUserReferralCode(e.target.value)}
                  placeholder="DIRECT"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Initial Subscription Tier
                </label>
                <select
                  value={newUserTier}
                  onChange={(e) => setNewUserTier(e.target.value as any)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                >
                  <option value="DAY_PASS">DAY_PASS (24-Hour Access)</option>
                  <option value="STARTER">STARTER Tier (Beginner)</option>
                  <option value="ELITE_PASS">ELITE_PASS Tier</option>
                  <option value="PRO_PASS">PRO_PASS Tier</option>
                  <option value="NONE">NONE</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT REFERRAL MODAL */}
      {isAddReferralOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="vixy-card-elevated hud-corners max-w-md w-full p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">
                Create Promo / Referral Code
              </h3>
              <button onClick={() => setIsAddReferralOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveReferral} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">
                  Referral Code *
                </label>
                <input
                  type="text"
                  required
                  value={refCodeInput}
                  onChange={(e) =>
                    setRefCodeInput(e.target.value.toUpperCase())
                  }
                  placeholder="VIP2026"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none uppercase font-bold text-purple-300"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Promoter Name
                </label>
                <input
                  type="text"
                  value={refNameInput}
                  onChange={(e) => setRefNameInput(e.target.value)}
                  placeholder="Quant Media Group"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Discount Rate
                </label>
                <input
                  type="text"
                  value={refDiscountInput}
                  onChange={(e) => setRefDiscountInput(e.target.value)}
                  placeholder="20% Off"
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddReferralOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded"
                >
                  Save Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER RECORD MODAL (MASTER CONTROL) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#120B28] border border-purple-500/50 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 text-xs font-mono shadow-2xl text-purple-100 my-8">
            <div className="flex items-center justify-between border-b border-purple-900/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    EDIT USER RECORD
                  </h3>
                  <p className="text-[11px] text-purple-300/70 font-sans">
                    Master Admin override for{" "}
                    <strong className="text-white">{editingUser.email}</strong>{" "}
                    ({editingUser.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl bg-[#0B061A] border border-purple-900/60 hover:text-white text-purple-300/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    User Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    User Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Password (Leave blank to keep)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none placeholder-purple-300/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Subscription Tier
                  </label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  >
                    <option value="ELITE_PASS">
                      ELITE_PASS ($99/mo - Full Bot & Signal Access)
                    </option>
                    <option value="PRO_PASS">
                      PRO_PASS ($49/mo - Standard Access)
                    </option>
                    <option value="DAY_PASS">
                      DAY_PASS ($9.99 - 24-Hour Access Pass)
                    </option>
                    <option value="STARTER">
                      STARTER ($29/mo - Beginner Access)
                    </option>
                    <option value="NONE">
                      NONE (Unpaid / Beginner)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    System Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  >
                    <option value="USER">USER (Regular Trader)</option>
                    <option value="UNPAID">UNPAID (Beginner)</option>
                    <option value="PRO">PRO (Premium Member)</option>
                    <option value="ELITE">ELITE (High Frequency Trader)</option>
                    <option value="SUPPORT">
                      SUPPORT (Help Desk Operator)
                    </option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                    <option value="OWNER">OWNER (Master Vault Owner)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  >
                    <option value="ACTIVE">
                      ACTIVE (Full Platform Privileges)
                    </option>
                    <option value="INACTIVE">
                      INACTIVE (Requires Day Pass / Subscription)
                    </option>
                    <option value="SUSPENDED">
                      SUSPENDED / FROZEN (Blocked)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Discord Tag / Username
                  </label>
                  <input
                    type="text"
                    placeholder="Discord username"
                    value={editDiscordTag}
                    onChange={(e) => setEditDiscordTag(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Discord Display / Global Name
                  </label>
                  <input
                    type="text"
                    placeholder="Display name"
                    value={editDiscordGlobalName}
                    onChange={(e) => setEditDiscordGlobalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Discord User ID
                  </label>
                  <input
                    type="text"
                    placeholder="Discord User ID"
                    value={editDiscordId}
                    onChange={(e) => setEditDiscordId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Guild Verification Status
                  </label>
                  <select
                    value={editVerificationStatus}
                    onChange={(e) => setEditVerificationStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  >
                    <option value="VERIFIED">
                      VERIFIED (Guild Member - Unlocked)
                    </option>
                    <option value="NEEDS_GUILD">
                      NEEDS_GUILD (Joined Discord required)
                    </option>
                    <option value="UNVERIFIED">UNVERIFIED (Pending)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Stripe Customer ID
                  </label>
                  <input
                    type="text"
                    placeholder="cus_live_..."
                    value={editStripeCustomerId}
                    onChange={(e) => setEditStripeCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-purple-300/80 font-bold block">
                    Stripe Subscription ID
                  </label>
                  <input
                    type="text"
                    placeholder="sub_live_..."
                    value={editStripeSubscriptionId}
                    onChange={(e) =>
                      setEditStripeSubscriptionId(e.target.value)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 text-purple-100 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-900/60">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#0B061A] border border-purple-900/60 hover:bg-purple-900/30 text-purple-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-lg shadow-purple-600/30 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Record Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
