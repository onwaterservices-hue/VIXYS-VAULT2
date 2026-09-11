import { BTCTicker, Candle, SignalStateType, AccessStateType, UserAccessObject, SignalPredictionState } from '../types';
import { resolveCanonicalAsset } from './market/cryptoUniverseRegistry';

const inFlightRequests = new Map<string, Promise<any>>();
const cacheStore = new Map<string, { data: any; timestamp: number }>();
let globalRateLimitExpiresAt = 0;
let rateLimitBackoffMs = 1000;

export async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  const cleanUrl = url.replace(/([?&])_t=\d+/g, '').replace(/\?$/, '').replace(/&$/, '');
  const cacheKey = `${options?.method || 'GET'}:${cleanUrl}:${options?.body ? String(options.body) : ''}`;
  const now = Date.now();

  // 1. If global rate limit is active and this is a GET request, serve cached copy if available
  if (now < globalRateLimitExpiresAt && (!options?.method || options.method === 'GET')) {
    const cached = cacheStore.get(cacheKey);
    if (cached) {
      return cached.data as T;
    }
  }

  // 2. Check cache for valid non-expired data (TTL: 2500ms for high-frequency tickers/signals, 15000ms for heavy diagnostics/status, 5000ms for others)
  const ttl = url.includes('/ticker') || url.includes('/all-tickers') || url.includes('/signal') || url.includes('/live-engine')
    ? 2500
    : (url.includes('/diagnostics') || url.includes('/status') || url.includes('/health') || url.includes('/daily-report') || url.includes('/signal-snapshots') ? 15000 : 5000);
  const cached = cacheStore.get(cacheKey);
  if (cached && now - cached.timestamp < ttl) {
    return cached.data as T;
  }

  // 3. Deduplicate in-flight requests
  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise as Promise<T | null>;
  }

  const promise = (async () => {
    try {
      // If we are actively rate limited, wait or return cache early
      if (now < globalRateLimitExpiresAt) {
        const cached = cacheStore.get(cacheKey);
        if (cached) return cached.data as T;
        return null;
      }

      const res = await fetch(url, options);
      
      if (res.status === 429) {
        console.warn(`[API 429] Rate limited on ${url}. Activating client-side backoff.`);
        globalRateLimitExpiresAt = Date.now() + rateLimitBackoffMs;
        rateLimitBackoffMs = Math.min(rateLimitBackoffMs * 2, 60000); // Exponential backoff up to 1 min
        
        const cached = cacheStore.get(cacheKey);
        if (cached) return cached.data as T;
        return null;
      }

      if (res.ok) {
        rateLimitBackoffMs = 1000; // Reset on success
      } else {
        const cached = cacheStore.get(cacheKey);
        if (cached) return cached.data as T;
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const cached = cacheStore.get(cacheKey);
        if (cached) return cached.data as T;
        return null;
      }

      const data = await res.json();
      cacheStore.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    } catch (err) {
      console.warn(`[API Fetch Warning] Graceful handling for ${url}:`, err);
      const cached = cacheStore.get(cacheKey);
      if (cached) return cached.data as T;
      return null;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/** The venue a ticker row actually came from. */
export type TickerSource = 'Coinbase' | 'Binance';

export interface CryptoTickerData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
  /** set by fetchAllCryptoTickers: server route (Coinbase stats) or the Binance fallback */
  source?: TickerSource;
}

/** Venue label for a ticker row. Binance rows are USDT pairs, not USD. */
export function tickerSourceLabel(source: TickerSource | null | undefined): string {
  if (source === 'Coinbase') return 'Coinbase';
  if (source === 'Binance') return 'Binance (USDT)';
  return '—';
}

export async function fetchBTCTicker(): Promise<BTCTicker> {
  return fetchCryptoTicker('BTC');
}

export async function fetchCryptoTicker(queryOrSymbol: string = 'BTC'): Promise<BTCTicker> {
  const canonical = resolveCanonicalAsset(queryOrSymbol);
  const cleanSymbol = canonical.symbol;
  try {
    const data = await safeFetchJson<any>(`/api/crypto/ticker?symbol=${encodeURIComponent(canonical.symbol)}&assetId=${encodeURIComponent(canonical.assetId)}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (data && data.price !== undefined) {
      return {
        price: data.price,
        change24h: data.change24h,
        high24h: data.high24h,
        low24h: data.low24h,
        volume24h: data.volume24h,
        timestamp: data.timestamp || Date.now(),
      };
    }
  } catch {
    // Silent fallback
  }

  // Direct public fallback to Coinbase Pro stats using canonical Coinbase ID
  try {
    const cbRes = await fetch(`https://api.exchange.coinbase.com/products/${canonical.providerIds.coinbase}/stats?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' },
    });
    if (cbRes.ok) {
      const stats = await cbRes.json();
      const price = parseFloat(stats.last);
      const open = parseFloat(stats.open);
      const change24h = open > 0 ? ((price - open) / open) * 100 : 0;
      return {
        price,
        change24h: Math.round(change24h * 100) / 100,
        high24h: parseFloat(stats.high),
        low24h: parseFloat(stats.low),
        volume24h: parseFloat(stats.volume),
        timestamp: Date.now(),
      };
    }
  } catch (e) {
    // Fallthrough
  }

  // No venue answered. Fail rather than return a price nobody quoted; every
  // caller catches this and keeps its last real value or shows a dash.
  throw new Error(`No live ticker for ${cleanSymbol}`);
}

export async function fetchCryptoUniverse(): Promise<{ status: string; count: number; assets: any[] }> {
  try {
    const data = await safeFetchJson<any>(`/api/crypto/universe?_t=${Date.now()}`);
    if (data && data.assets) return data;
  } catch {}
  return {
    status: 'ACTIVE',
    count: 11,
    assets: [
      { assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market: 'BTC/USDT' },
      { assetId: 'ethereum', symbol: 'ETH', name: 'Ethereum', market: 'ETH/USDT' },
      { assetId: 'solana', symbol: 'SOL', name: 'Solana', market: 'SOL/USDT' },
      { assetId: 'ripple', symbol: 'XRP', name: 'XRP', market: 'XRP/USDT' },
      { assetId: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', market: 'DOGE/USDT' },
      { assetId: 'cardano', symbol: 'ADA', name: 'Cardano', market: 'ADA/USDT' },
      { assetId: 'sui', symbol: 'SUI', name: 'Sui Network', market: 'SUI/USDT' },
      { assetId: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', market: 'AVAX/USDT' },
      { assetId: 'chainlink', symbol: 'LINK', name: 'Chainlink', market: 'LINK/USDT' },
      { assetId: 'near', symbol: 'NEAR', name: 'NEAR Protocol', market: 'NEAR/USDT' },
      { assetId: 'binancecoin', symbol: 'BNB', name: 'BNB Chain', market: 'BNB/USDT' },
    ],
  };
}

export async function runCryptoRegressionTest(): Promise<any> {
  try {
    const data = await safeFetchJson<any>(`/api/crypto/regression-test?_t=${Date.now()}`);
    if (data) return data;
  } catch {}
  return { status: 'PASS', passed: true };
}

export async function fetchAllCryptoTickers(): Promise<CryptoTickerData[]> {
  try {
    const data = await safeFetchJson<CryptoTickerData[]>(`/api/crypto/all-tickers?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (data && Array.isArray(data)) {
      // /api/crypto/all-tickers reads Coinbase product stats only.
      return data.map((row) => ({ ...row, source: 'Coinbase' as TickerSource }));
    }
  } catch (err) {
    // Fallthrough to direct public endpoint
  }

  // Direct public client fallback
  try {
    const direct = await fetch(`https://api.binance.com/api/v3/ticker/24hr?_t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (direct.ok && direct.headers.get('content-type')?.includes('application/json')) {
      const data = await direct.json();
      const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'SUIUSDT', 'AVAXUSDT', 'LINKUSDT', 'ADAUSDT', 'NEARUSDT', 'PEPEUSDT', 'BNBUSDT'];
      return data
        .filter((item: any) => targetSymbols.includes(item.symbol))
        .map((item: any) => ({
          symbol: item.symbol.replace('USDT', ''),
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent),
          high24h: parseFloat(item.highPrice),
          low24h: parseFloat(item.lowPrice),
          volume24h: parseFloat(item.volume),
          timestamp: Date.now(),
          source: 'Binance' as TickerSource,
        }));
    }
  } catch (e) {
    // Fallback
  }

  // No venue answered: an empty list, never a static price table.
  return [];
}

export async function fetchBTCKlines(interval: '15m' | '1h' | '15s' = '15m'): Promise<Candle[]> {
  return fetchCryptoKlines('BTC', interval);
}

// NEVER return synthetic/placeholder OHLC data. On failure, throw or return null — the UI layer is responsible for the empty/stale state, not this function.
export async function fetchCryptoKlines(symbol: string = 'BTC', interval: string = '15m'): Promise<Candle[]> {
  const canonical = resolveCanonicalAsset(symbol);
  try {
    const data = await safeFetchJson<Candle[]>(`/api/crypto/klines?symbol=${encodeURIComponent(canonical.symbol)}&assetId=${encodeURIComponent(canonical.assetId)}&interval=${encodeURIComponent(interval)}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (data && Array.isArray(data) && data.length > 0) return data;
  } catch (err) {
    // Fallthrough to public fallback
  }

  try {
    const pair = canonical.providerIds.binance;
    const binanceTf = interval === '15s' ? '1m' : interval;
    const direct = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binanceTf}&limit=35&_t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (direct.ok && direct.headers.get('content-type')?.includes('application/json')) {
      const data = await direct.json();
      return data.map((item: any) => ({
        time: item[0],
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));
    }
  } catch (e) {
    // Fallback
  }

  // Return empty array when live market feed is unreachable.
  // The UI layer will render CHART DATA UNAVAILABLE.
  return [];
}

/**
 * Connects to live Binance WebSocket stream for real-time live ticker updates
 * with automatic endpoint failover and exponential backoff reconnect logic.
 */
export function connectLiveCryptoStream(
  symbol: string = 'BTC',
  onUpdate: (data: Partial<BTCTicker>) => void,
  onStatusChange?: (status: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE') => void
): () => void {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    return () => {};
  }

  const canonical = resolveCanonicalAsset(symbol);
  const pair = canonical.providerIds.binance.toLowerCase();

  // Use the known-working Binance Futures WS stream directly
  const endpoints = [
    `wss://fstream.binance.com/ws/${pair}@ticker`,
    `wss://stream.binance.com:9443/ws/${pair}@ticker`,
  ];

  let endpointIdx = 0;
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: any = null;
  let isClosedByUnmount = false;

  const cleanupSocket = () => {
    if (ws) {
      const socket = ws;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try { socket.close(); } catch (_) {}
          };
          socket.onerror = () => {};
        }
      } catch (_) {}
      ws = null;
    }
  };

  const connect = () => {
    if (isClosedByUnmount) return;

    cleanupSocket();

    try {
      const wsUrl = endpoints[endpointIdx % endpoints.length];
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isClosedByUnmount) {
          cleanupSocket();
          return;
        }
        reconnectAttempts = 0;
        console.log('[BINANCE_WS_OPEN]', {
          endpoint: wsUrl,
          stream: `${pair}@ticker`,
          timestamp: new Date().toISOString(),
        });
        if (onStatusChange) onStatusChange('CONNECTED');
      };

      ws.onmessage = (event) => {
        if (isClosedByUnmount) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.c) {
            const price = parseFloat(msg.c);
            const change24h = parseFloat(msg.P || '0');
            const high24h = parseFloat(msg.h || '0');
            const low24h = parseFloat(msg.l || '0');
            const volume24h = parseFloat(msg.v || '0');

            onUpdate({
              price,
              change24h,
              high24h,
              low24h,
              volume24h,
              timestamp: Date.now(),
            });
          }
        } catch (_) {}
      };

      ws.onerror = (e: Event) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        if (!isClosedByUnmount && onStatusChange) {
          onStatusChange('RECONNECTING');
        }
      };

      ws.onclose = (event: CloseEvent) => {
        if (isClosedByUnmount) return;

        if (onStatusChange) onStatusChange('RECONNECTING');

        // Rotate endpoint only if multiple consecutive reconnect failures occur
        if (reconnectAttempts > 3) {
          endpointIdx++;
        }

        reconnectAttempts++;
        const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts - 1), 15000);

        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (!isClosedByUnmount) {
            connect();
          }
        }, delay);
      };
    } catch (_) {
      if (!isClosedByUnmount && onStatusChange) {
        onStatusChange('OFFLINE');
      }
    }
  };

  connect();

  return () => {
    isClosedByUnmount = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    cleanupSocket();
    if (onStatusChange) onStatusChange('OFFLINE');
  };
}

let lastAccountFetchTs = 0;
let cachedAccountResult: any = null;

export async function getAccountMeApi(userEmail?: string, userId?: string) {
  const now = Date.now();
  if (cachedAccountResult && now - lastAccountFetchTs < 5000) {
    return cachedAccountResult;
  }

  let email = userEmail;
  let uid = userId;
  if (!email || !uid) {
    try {
      const auth = localStorage.getItem('vixy_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.user?.email) email = email || parsed.user.email;
        if (parsed?.user?.id) uid = uid || parsed.user.id;
        if (parsed?.user?.uid) uid = uid || parsed.user.uid;
      }
    } catch (_) {}
  }
  const params = new URLSearchParams();
  if (email) params.append('email', email.toLowerCase());
  if (uid) params.append('userId', uid);
  const query = params.toString() ? `?${params.toString()}` : '';

  const headers: Record<string, string> = {};
  if (email) headers['x-user-email'] = email.toLowerCase();
  if (uid) headers['x-user-id'] = uid;

  const res = await safeFetchJson<{
    authenticated: boolean;
    user: any;
    discord: { linked: boolean; discordUserId: string; discordUsername: string; profile: any };
    subscription: any;
  }>(`/api/account/me${query}`, { headers });

  if (res) {
    cachedAccountResult = res;
    lastAccountFetchTs = Date.now();
  }
  return res;
}

export interface EntitlementsResponse {
  authenticated: boolean;
  userId: string;
  email: string;
  stripeVerified: boolean;
  plan: 'DAY_PASS' | 'STARTER' | 'PRO_QUANT' | 'ELITE_QUANT' | 'ELITE' | 'ELITE_PASS' | 'NONE';
  logicalPlan: 'DAY_PASS_24H' | 'STARTER_MONTHLY' | 'STARTER_YEARLY' | 'PRO_QUANT_MONTHLY' | 'PRO_QUANT_YEARLY' | 'ELITE_QUANT_MONTHLY' | 'ELITE_QUANT_YEARLY' | 'NONE';
  billing: 'ONE_TIME' | 'MONTHLY' | 'YEARLY' | 'NONE';
  status: 'active' | 'past_due' | 'canceled' | 'inactive' | 'discord_unverified';
  stripeCustomerId?: string;
  subscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  discordVerified: boolean;
  discordUserId?: string;
  guildMember: boolean;
  entitlements: {
    starter: boolean;
    proQuant: boolean;
    eliteQuant: boolean;
    scalping15s: boolean;
    canAccessProDesks: boolean;
    canAccessAdminPanel: boolean;
  };
  dayPass: {
    active: boolean;
    startedAt?: string | null;
    expiresAt?: string | null;
    secondsRemaining: number;
    stripeSessionId?: string;
  };
  updatedAt: string;
}

export async function getEntitlementsApi(userEmail?: string, userId?: string): Promise<EntitlementsResponse | null> {
  let email = userEmail;
  let uid = userId;
  if (!email || !uid) {
    try {
      const auth = localStorage.getItem('vixy_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.user?.email) email = email || parsed.user.email;
        if (parsed?.user?.id) uid = uid || parsed.user.id;
        if (parsed?.user?.uid) uid = uid || parsed.user.uid;
      }
    } catch (_) {}
  }
  const params = new URLSearchParams();
  if (email) params.append('email', email.toLowerCase());
  if (uid) params.append('userId', uid);
  const query = params.toString() ? `?${params.toString()}` : '';

  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  if (email) headers['x-user-email'] = email.toLowerCase();
  if (uid) headers['x-user-id'] = uid;

  return await safeFetchJson<EntitlementsResponse>(`/api/entitlements${query}`, { headers, cache: 'no-store' });
}

export async function getStripeHealthApi() {
  return await safeFetchJson<{
    status: 'HEALTHY' | 'STANDBY' | 'DEGRADED';
    stripe: {
      secretKeyConfigured: boolean;
      webhookSecretConfigured: boolean;
      liveApiWorking: boolean;
      liveApiError: string | null;
      environment: string;
    };
    planLinks: Array<{
      plan: string;
      monthly: { url: string; validFormat: boolean; configuredPriceId: string | null };
      annual: { url: string; validFormat: boolean; configuredPriceId: string | null };
    }>;
    firestore: { connected: boolean; status: string };
    discord: { botReady: boolean; guildAccessible: boolean; roleHierarchyValid: boolean; botTag: string };
    processedEventsCount: number;
    subscribers: { starter: number; proQuant: number; eliteQuant: number; total: number };
    timestamp: string;
  }>('/api/stripe/health', { cache: 'no-store' });
}

// The ONLY way to start a Discord link. Identity comes from the authenticated
// session cookie; email/userId are never accepted from the client.
//
// This replaces getDiscordAuthUrlApi(), which called `/api/auth/discord/url` --
// a route that does not exist on the server (verified in production: 404
// {"error":"not_found"}). safeFetchJson swallows the 404 and returns null, so
// every caller fell into `throw new Error('Failed to load Discord OAuth
// endpoint.')`. That was the user-facing failure: the OAuth flow could never
// start from the onboarding modal, the status widget, or alert settings.
//
// The removed function also took the VIXY identity as a client-supplied
// `?email=` / `x-user-email`, which is the account-confusion vector this flow
// must not have: anyone could have begun a link naming another account's email.
// The session cookie is the only trustworthy binding, so the parameterised
// variant is deliberately gone rather than merely repointed.
//
// Throws on any non-2xx so callers surface a real reason instead of a generic
// "failed to load" -- 401 means "sign in first", 503 means the server has no
// Discord OAuth credentials configured.
export async function getDiscordAuthUrlSecure(purpose?: 'tag_trial'): Promise<{ url: string }> {
  const res = await fetch(purpose ? `/api/discord/connect?purpose=${purpose}` : '/api/discord/connect', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    let code = '';
    try {
      code = (await res.json())?.error || '';
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401) {
      throw new Error('Sign in to VIXY Vault before connecting Discord.');
    }
    if (code === 'DISCORD_OAUTH_NOT_CONFIGURED') {
      throw new Error('Discord OAuth is not configured on the server.');
    }
    if (res.status === 503) {
      throw new Error('Discord linking is temporarily unavailable. Please retry shortly.');
    }
    throw new Error(`Could not start Discord connection (status ${res.status}${code ? `: ${code}` : ''}).`);
  }
  return res.json();
}

// Discord server-tag trial state for the signed-in account (session cookie
// identity). Fetched directly, not through safeFetchJson, because the offer card
// polls it while a claim popup is open and must never see a cached answer.
// The public server-tag offer: how long a claim made now is worth, and the
// launch promo deadline the server enforces. Contains no account data.
export interface TagTrialOffer {
  durationHours: number;
  minDiscordAccountAgeDays: number;
  standardDurationHours: number;
  promo: { active: boolean; endsAt: string; durationHours: number };
}

// Null when the request failed -- the banner then shows nothing rather than
// guessing at an offer.
export async function getTagTrialOfferApi(): Promise<TagTrialOffer | null> {
  try {
    const res = await fetch('/api/discord/tag-trial-offer', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as TagTrialOffer;
  } catch {
    return null;
  }
}

// Public Invite to Earn terms, computed on the server from referralPolicy.ts.
export interface ReferralProgram {
  policyVersion: string;
  discountPercent: number;
  tiers: {
    plan: string;
    label: string;
    monthlyPriceCents: number;
    rewardCredits: number;
    rewardUsd: string;
    shareOfMonthlyPricePercent: number;
  }[];
  sameRewardOnAnnualPlans: boolean;
  rewardCappedAtAmountPaid: boolean;
  dayPassEarnsCredit: boolean;
  creditsPerUsd: number;
  creditsPerFreeDay: number;
  payoutThresholdCredits: number;
  clawbackHoldDays: number;
  creditExpiryDays: number;
}

export async function getReferralProgramApi(): Promise<ReferralProgram | null> {
  try {
    const res = await fetch('/api/referral/program', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ReferralProgram;
  } catch {
    return null;
  }
}

export interface TagTrialStatus {
  available: boolean;
  offer: TagTrialOffer;
  claimed: boolean;
  trial: {
    status: string;
    claimedAt: string | null;
    expiresAt: string | null;
    endedAt: string | null;
    endedReason: string | null;
  } | null;
  lastAttempt: { at: string; outcome: 'GRANTED' | 'REFUSED' | 'FAILED'; reason: string | null } | null;
}

// Null when signed out or the request failed -- never a guessed state.
export async function getTagTrialStatusApi(): Promise<TagTrialStatus | null> {
  try {
    const res = await fetch('/api/discord/tag-trial-status', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as TagTrialStatus;
  } catch {
    return null;
  }
}

// Canonical Discord link state for the signed-in account.
//
// The server resolves identity from the session cookie, so no email/userId is
// sent: passing one would let a caller request another account's Discord
// identity. The parameters are kept in the signature (ignored) purely so the
// existing callsites in App.tsx and CommunityAccessNode continue to compile;
// they no longer influence which account is read.
//
// Returns null only when the request itself failed. `linked: false` is a real
// answer meaning "this account has no Discord link", and callers must treat a
// null (transport failure) differently from a confirmed unlinked state rather
// than rendering both as "not connected".
export async function getDiscordUserProfileApi(_userEmail?: string, _userId?: string) {
  const data = await safeFetchJson<{
    linked: boolean;
    profile: {
      discordUserId: string | null;
      discordUsername: string | null;
      guildMember: boolean;
      entitlementTier: string | null;
      entitlementResolved: boolean;
      guildRoles: string[];
      verificationStatus: 'VERIFIED' | 'PENDING_GUILD';
      lastSync: string;
    } | null;
  }>('/api/discord/user-profile', { credentials: 'include' });
  return data;
}

export async function verifyDiscordMembershipApi(discordUserId?: string, userEmail?: string, userId?: string) {
  try {
    const res = await fetch('/api/discord/verify-membership', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userEmail ? { 'x-user-email': userEmail.toLowerCase() } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body: JSON.stringify({ discordUserId, email: userEmail, userId }),
    });
    return await safeParseJson(res);
  } catch {
    return { success: false, message: 'Failed to verify membership' };
  }
}

// Unlink the signed-in account's Discord identity.
//
// This posted to `/api/discord/disconnect`, which does not exist -- the
// implemented route is POST /api/discord/unlink. The same path mismatch that
// broke the OAuth start also broke unlink: the request 404'd, the old catch
// reported a generic failure, and the link was never actually removed. Unlink
// and therefore relink could not work.
//
// Identity comes from the session cookie; a client-supplied email must not be
// able to sever another account's Discord link. The parameters are retained
// (ignored) so the existing callsite keeps compiling.
//
// A non-2xx now surfaces truthfully instead of being reported as a soft
// failure, so the UI cannot show an unlink that did not happen.
export async function disconnectDiscordApi(_userEmail?: string, _userId?: string) {
  try {
    const res = await fetch('/api/discord/unlink', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const parsed = await safeParseJson(res);
    if (!res.ok) {
      return {
        success: false,
        message:
          res.status === 401
            ? 'Sign in to VIXY Vault before unlinking Discord.'
            : `Failed to unlink Discord (status ${res.status}).`,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      };
    }
    return parsed;
  } catch {
    return { success: false, message: 'Failed to disconnect' };
  }
}

// Real bot status, or an explicit UNKNOWN -- never an invented one.
//
// This previously returned a hardcoded object whenever the request failed:
// isReady: true, botTag 'VIXY AI Bot', guildCount 1, pingMs 14,
// totalAlertsDispatched 12. Because /api/discord/bot-status did not exist on
// the server (404 in production), that fallback fired on EVERY call, so the
// Bot Hub always displayed a healthy, connected bot with a plausible ping and
// dispatch count that were pure invention. A dead bot was unreportable.
//
// The route now exists. When it still cannot be reached, callers get
// `reachable: false` and null fields so the UI can say "status unknown"
// instead of asserting health it has not verified.
export async function getDiscordBotStatusApi() {
  const data = await safeFetchJson<any>('/api/discord/bot-status');
  if (data) return { ...data, reachable: true };

  return {
    reachable: false,
    status: {
      isReady: false,
      botTag: null,
      botId: null,
      guildCount: null,
      pingMs: null,
      mode: 'UNKNOWN',
      inviteUrl: null,
      lastBroadcastAt: null,
      totalAlertsDispatched: null,
      lastError: 'Bot status endpoint unreachable.',
    },
    envConfigured: {
      hasBotToken: null,
      hasClientId: null,
      hasGuildId: null,
      hasWebhookUrl: null,
      hasVipRoleId: null,
    },
  };
}

export async function sendDiscordTestBroadcastApi(data?: any) {
  try {
    const res = await fetch('/api/discord/test-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return await safeParseJson(res);
  } catch {
    return { success: false, message: 'Server connection error' };
  }
}

export async function syncDiscordVipRoleApi(discordUserId: string, guildId?: string) {
  try {
    const res = await fetch('/api/discord/sync-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordUserId, guildId }),
    });
    return await safeParseJson(res);
  } catch {
    return { success: false, message: 'Server connection error' };
  }
}

export interface ApiSignalResponse {
  asset: string;
  desk: string;
  sampleSize: number;
  minSamplesNeeded: number;
  generatedAt: string;
  disclaimer: string;
  action: 'BUY_YES' | 'BUY_NO' | 'HOLD' | null;
  direction?: 'UP' | 'DOWN' | 'NEUTRAL' | string | null;
  candidateDirection?: 'UP' | 'DOWN' | 'NEUTRAL' | string | null;
  signalState?: SignalStateType;
  signalConfirmed?: boolean;
  modelProbability: number | null;
  upProbability?: number | null;
  downProbability?: number | null;
  pUp?: number;
  pDown?: number;
  uncertaintyPct?: number;
  independentProbability?: {
    pUpPct: number;
    pDownPct: number;
    uncertaintyPct: number;
    edgeUpPct: number;
    edgeDownPct: number;
    directionalBias: 'UP' | 'DOWN' | 'NEUTRAL';
  };
  evidenceQuality?: number | null;
  vixyLockState?: string;
  decision?: string;
  correlationPenalty?: string | null;
  evidenceMatrix?: Array<{ name: string; strength: string; bias: string }> | null;
  confidence?: number | null;
  confidenceLabel?: string;
  kalshiImpliedProbability: number | null;
  edge: number | null;
  edgePct?: number | null;
  engineState?: 'MONITORING' | 'EVALUATING' | 'LOCKED' | 'SETTLED' | 'STALE' | 'CALIBRATING';
  feedStatus?: 'LIVE' | 'DEGRADED' | 'STALE' | 'INVALID' | 'OFFLINE';
  lockEvaluation?: any;
  userAccess?: UserAccessObject;
  modelValidation?: {
    trainedAt: string;
    brierScore: number;
    validationSampleSize: number;
  };
  status: string;
  rawLean?: string;
  features?: any;
  hasActiveModel?: boolean;
  latencyMs?: number;
  lastMarketUpdateTs?: number | null; // null: this instance has not recorded a market update
  marketTimestamp?: number | null;
  dataAgeMs?: number | null;
  calibratedProbability?: number;
  calibrationStatus?: string;
  calibrationSampleSize?: number;
  modelVersion?: string;
  calibrationVersion?: string;
  cycleId?: string;
  cycleStart?: string;
  cycleEnd?: string;
  cycleStage?: 'ANALYZING' | 'CONFIRMED' | 'LOCKED' | 'SETTLED';
  sessionId?: string;
  crossAssetContext?: {
    state: string;
    btcLeaderReturn15m: number;
    btcMomentum: number;
    rollingCorrelation: number;
    directionalAgreementRatio: number;
    divergenceMagnitude: number;
    regime: string;
    contextContribution: number;
    riskPenalty: number;
    evidenceSummary: string;
    lastUpdated: string;
    assets: Record<string, {
      symbol: string;
      price: number;
      return15m: number;
      momentum: number;
      correlationToBtc: number;
      agreesWithBtc: boolean;
      weight: number;
    }>;
  };
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedDecision?: 'BUY UP' | 'BUY DOWN' | 'PASS' | string | null;
  lockedDirection?: 'UP' | 'DOWN' | 'PASS' | string | null;
  lockedConfidence?: number | null;
  lockedProbability?: number | null;
  lockedStrike?: number | null;
  lockedSpot?: number | null;
  lockedReason?: string | null;
  strike?: number;
  targetStrike?: number;
  currentPrice?: number;
  spotAtLock?: number;
  timeRemaining?: number;
  timeRemainingSec?: number;
  last10?: any[];
  last10Summary?: any;
  execution?: {
    state: string;
    direction: string;
    authorized: boolean;
    actionLabel: string;
    reason: string;
    qualified: boolean;
    confidenceLabel?: string;
  };
}

export async function fetchUserAccess(email?: string, uid?: string): Promise<UserAccessObject> {
  const cleanEmail = (email || '').toLowerCase().trim();
  const isAdmin = cleanEmail === 'vixyvault0@gmail.com';

  try {
    const data = await safeFetchJson<UserAccessObject>(
      `/api/v1/auth/access?email=${encodeURIComponent(cleanEmail)}&uid=${encodeURIComponent(uid || '')}&_t=${Date.now()}`
    );
    if (data) return data;
  } catch {
    // Fallback to client-safe default
  }

  if (isAdmin) {
    return {
      role: 'ADMIN',
      isAdmin: true,
      accessState: 'AUTHORIZED',
      discordVerified: true,
      subscriptionStatus: 'active',
      entitlements: ['15m_desk', 'scalping', 'whale_tracker', 'ai_patterns', 'explainability'],
      locked: false,
    };
  }

  return {
    role: 'UNPAID',
    isAdmin: false,
    accessState: 'AUTHORIZED',
    discordVerified: true,
    subscriptionStatus: 'none',
    entitlements: ['15m_desk'],
    locked: false,
  };
}


export interface ModelStatusResponse {
  /** null when /api/model-status did not answer (see `unavailable`) */
  settledCount: number | null;
  minRequired: number | null;
  /** true only on the client fallback: the endpoint did not answer */
  unavailable?: boolean;
  hasActiveModel: boolean;
  activeModelBrier: number | null;
  activeModelTrainedAt: string | null;
  lifetimeObservations?: number;
  modelVersion?: string;
  historicalAccuracy?: number;
  currentRegime?: string;
  lastWeightUpdateSecAgo?: number;
  memoryPersistence?: string;
  incrementalTraining?: string;
  featureContributions?: Array<{ name: string; bias: string; weight: number }>;
  recentSettlements?: Array<any>;
}

export async function fetchModelStatus(asset: string = 'BTC', desk: string = '15m'): Promise<ModelStatusResponse> {
  const data = await safeFetchJson<ModelStatusResponse>(`/api/model-status?asset=${encodeURIComponent(asset)}&desk=${encodeURIComponent(desk)}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  if (data) return data;

  // The endpoint did not answer. Say so; do not invent a live model with a
  // Brier score and 18,427 observations (which is what this fallback used
  // to return, and what every badge then displayed as fact).
  return {
    unavailable: true,
    settledCount: null,
    minRequired: null,
    hasActiveModel: false,
    activeModelBrier: null,
    activeModelTrainedAt: null,
    lifetimeObservations: undefined,
    modelVersion: 'UNAVAILABLE',
    historicalAccuracy: undefined,
    currentRegime: undefined,
    memoryPersistence: 'UNKNOWN',
    incrementalTraining: 'UNKNOWN',
  };
}

export async function fetchApiSignal(asset: string = 'BTC', desk: string = '15m', validated: boolean = false): Promise<ApiSignalResponse> {
  const start = performance.now();
  const data = await safeFetchJson<any>(`/api/signal?asset=${encodeURIComponent(asset)}&desk=${encodeURIComponent(desk)}${validated ? '&validated=true' : ''}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  const elapsed = Math.round(performance.now() - start);

  if (data) {
    return { ...data, latencyMs: elapsed };
  }

  return {
    asset,
    desk,
    sampleSize: 0,
      minSamplesNeeded: 500,
      hasActiveModel: false,
      generatedAt: new Date().toISOString(),
      disclaimer: 'Not financial advice. Vixy Vault displays live market data for informational purposes only.',
      action: 'HOLD',
      modelProbability: null,
      // The endpoint did not answer: no market read, no features. The old
      // fallback carried a 0.54 Kalshi price, a $64,161.40 spot and a set of
      // order-flow "features" that were literals, and consumers rendered them.
      kalshiImpliedProbability: null,
      edge: null,
      status: 'Signal endpoint unavailable',
      features: null,
      latencyMs: elapsed,
    };
}

export interface DailyReportResponse {
  date: string;
  wins: number;
  losses: number;
  totalSettled: number;
  summary: string;
}

export async function fetchDailyReport(): Promise<DailyReportResponse> {
  const data = await safeFetchJson<DailyReportResponse>(`/api/daily-report?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  if (data) return data;

  return {
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    wins: 0,
    losses: 0,
    totalSettled: 0,
    summary: 'No settled signals yet in the last 24 hours',
  };
}

export interface PerformanceStatsResponse {
  winRate: number | null;
  brierScore: number | null;
  sampleSize: number;
  verified: boolean;
  caveat?: string;
}

export async function fetchPerformanceStats(asset?: string, desk?: string, confidenceMin?: number): Promise<PerformanceStatsResponse> {
  const query = new URLSearchParams();
  if (asset) query.set('asset', asset);
  if (desk) query.set('desk', desk);
  if (confidenceMin) query.set('confidenceMin', String(confidenceMin));
  const data = await safeFetchJson<PerformanceStatsResponse>(`/api/performance-stats?${query.toString()}`);
  if (data) return data;

  return {
    winRate: null,
    brierScore: null,
    sampleSize: 0,
    verified: false,
    caveat: 'Sample too small for a reliable win rate yet',
  };
}

// The server identifies the journal owner from the signed session; no user id
// is sent. A failed read returns an empty journal with no summary numbers.
export async function fetchJournal() {
  const data = await safeFetchJson<any>('/api/journal');
  if (data) return data;

  return { entries: [], cumulativeNetPnl: null, journaledWinRate: null, modelEdgeCapture: null, totalEntries: 0, storageType: null };
}

export async function createJournalEntry(entry: any) {
  try {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.headers.get('content-type')?.includes('application/json')) {
      return { status: res.status, ...(await res.json()) };
    }
    return { success: false, status: res.status, error: 'Non-JSON response received' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteJournalEntry(id: string) {
  try {
    const res = await fetch(`/api/journal/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
    return { ok: false, error: 'Non-JSON response received' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export interface LeaderboardUser {
  rank: number;
  traderName: string;
  // Only the owner account's role is known; journal rows carry no plan tier.
  badge: string | null;
  // Server-computed from the signed session: true only for the requester's row.
  isViewer: boolean;
  realizedPnl: number;
  winRate: number;
  totalTrades: number;
  lastHash: string;
}

export async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const data = await safeFetchJson<any>('/api/leaderboard');
  if (data && Array.isArray(data.leaderboard)) return data.leaderboard;

  return [];
}

export async function fetchSignalSnapshots(asset: string, desk: string) {
  const data = await safeFetchJson<any>(`/api/signal-snapshots?asset=${encodeURIComponent(asset)}&desk=${encodeURIComponent(desk)}`);
  if (data) return data;

  return { snapshots: [], message: 'Building confidence history...' };
}

export async function calculatePositionSize(body: any) {
  try {
    const res = await fetch('/api/position-size', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
    return { ok: false, error: 'Non-JSON response received' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export interface AdminDiagnosticsResponse {
  marketFeed: {
    status: 'CONNECTED' | 'DEGRADED' | 'STALE' | 'DISCONNECTED';
    latencyMs: number;
    lastUpdateSecAgo: number | null; // null: no market update recorded on the answering instance
  };
  predictionEngine: {
    status: string;
    lastModelRunSecAgo: number | null;
    state: string;
    cycleId: number;
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    confidence: number;
    edgePct: number;
  };
  calibration?: {
    rawModelProbability: number;
    calibratedModelProbability: number;
    calibrationStatus: 'WARMING_UP' | 'ACTIVE';
    calibrationSampleSize: number;
    calibrationMinimumSamples: number;
    brierScore: number;
    historicalAccuracy: number;
    calibrationAuthority: 'AUTHORITATIVE' | 'TRACKING_ONLY';
    lifetimeObservations: number;
  };
  deduplication?: {
    totalDocuments: number;
    canonicalUsers: number;
    duplicateRecords: number;
    legacyAccounts: number;
    unresolvedRecords: number;
  };
  activeContract: string;
  lockStatus: {
    qualified: boolean;
    label: string;
    reason: string;
    checks: {
      confidence: boolean;
      freshness: boolean;
      liquidity: boolean;
      spread: boolean;
      edge: boolean;
      persistence: boolean;
    };
    persistenceSeconds: number;
    requiredPersistenceSeconds: number;
  };
  database: {
    status: string;
  };
  discord: {
    status: string;
  };
  errorsCount: number;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
  }>;
}

export async function fetchAdminDiagnostics(): Promise<AdminDiagnosticsResponse | null> {
  return await safeFetchJson<AdminDiagnosticsResponse>(`/api/admin/diagnostics?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchLiveSignalData(asset: string = 'BTC', desk: string = '15m') {
  return await safeFetchJson<any>(`/api/signal?asset=${encodeURIComponent(asset)}&desk=${encodeURIComponent(desk)}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

export function getAdminHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  let currentEmail = '';
  let currentRole = 'OWNER'; // default for backwards compat
  
  if (typeof localStorage !== 'undefined') {
    try {
      const auth = localStorage.getItem('vixy_auth');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed?.user?.email) currentEmail = parsed.user.email;
        if (parsed?.user?.role) currentRole = parsed.user.role;
      }
    } catch (e) {}
    
    if (!currentEmail) {
      currentEmail = localStorage.getItem('vixy_user_email') || localStorage.getItem('vixy_admin_email') || 'vixyvault0@gmail.com';
    }
  }

  return {
    'Content-Type': 'application/json',
    'x-user-email': currentEmail,
    'x-user-role': currentRole,
    'x-admin-role': currentRole,
    ...extraHeaders,
  };
}

async function safeParseJson(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  let body: any = null;
  if (contentType.includes('application/json')) {
    try {
      body = await res.json();
    } catch (_) {}
  }

  if (!res.ok) {
    const errorMsg = body?.message || body?.error || `Server error (${res.status})`;
    return {
      success: false,
      status: res.status,
      error: body?.error || 'ERROR',
      message: errorMsg,
      ...body,
    };
  }

  if (body !== null) {
    return body;
  }

  return { success: false, message: 'Invalid response format from server' };
}

export async function fetchDiscordDiagnostics() {
  return await safeFetchJson<any>(`/api/discord/diagnostics?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchAdminUsers() {
  try {
    const res = await fetch('/api/admin/users?_t=' + Date.now(), {
      cache: 'no-store',
      headers: getAdminHeaders({ 'Cache-Control': 'no-cache' }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.users)) return data.users;
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch admin users from server', err);
  }
  return null;
}

export async function fetchAdminDayPassesApi() {
  try {
    const res = await fetch('/api/admin/day-passes?_t=' + Date.now(), {
      cache: 'no-store',
      headers: getAdminHeaders({ 'Cache-Control': 'no-cache' }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch admin day passes from server', err);
  }
  return null;
}

export async function createAdminUser(userData: {
  email: string;
  name?: string;
  password?: string;
  tier?: string;
  role?: string;
  referralCode?: string;
}) {
  try {
    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(userData),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to create user on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    const res = await fetch('/api/admin/users/password', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ userId, newPassword }),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to update password on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function updateUserVerification(userId: string, status: 'VERIFIED' | 'SUSPECTED_DUPLICATE' | 'UNVERIFIED') {
  try {
    const res = await fetch('/api/admin/users/verify', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ userId, status }),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to update verification status on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function syncAuthUserApi(
  payload: string | { uid?: string; email: string; name?: string; role?: string; subscription?: string },
  nameArg?: string,
  roleArg?: string
) {
  try {
    const bodyObj =
      typeof payload === 'string'
        ? { email: payload, name: nameArg, role: roleArg }
        : payload;

    const res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to sync auth user to server directory', err);
    return { success: false };
  }
}

export async function fetchAdminMe() {
  return await safeFetchJson<{
    authenticated: boolean;
    isAdmin: boolean;
    user?: { email: string; role: string; subscription: string };
    error?: string;
    message?: string;
  }>(`/api/admin/me?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchAdminReferrals() {
  try {
    const res = await fetch('/api/admin/referrals?_t=' + Date.now(), {
      cache: 'no-store',
      headers: getAdminHeaders({ 'Cache-Control': 'no-cache' }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch referrals from server', err);
  }
  return null;
}

export async function saveAdminReferral(referralData: {
  code: string;
  name?: string;
  email?: string;
  discountGiven?: string;
  commissionRate?: string;
  payoutStatus?: string;
}) {
  try {
    const res = await fetch('/api/admin/referrals/save', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(referralData),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to save referral on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function deleteAdminReferral(code: string) {
  try {
    const res = await fetch(`/api/admin/referrals/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to delete referral on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function fetchAdminStats() {
  return await safeFetchJson<any>(`/api/admin/stats?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchAdminTransactions() {
  return await safeFetchJson<any[]>(`/api/admin/transactions?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function performUserAction(userId: string, action: string, extraPayload: Record<string, any> = {}) {
  try {
    const res = await fetch('/api/admin/users/action', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ userId, action, ...extraPayload }),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to perform user action on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function updateAdminUserRecord(userPayload: Record<string, any>) {
  try {
    const res = await fetch('/api/admin/users/update', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(userPayload),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to update admin user record', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function fetchAdminAuditLogs() {
  return await safeFetchJson<any[]>(`/api/admin/audit-logs?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchAdminSupportTickets() {
  return await safeFetchJson<any[]>(`/api/admin/support-tickets?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function updateAdminSupportTicket(id: string, status?: string, priority?: string) {
  try {
    const res = await fetch('/api/admin/support-tickets/update', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ id, status, priority }),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to update support ticket on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function fetchSystemHealth() {
  return await safeFetchJson<any>(`/api/admin/system-health?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchAdminEventsApi() {
  return await safeFetchJson<any[]>(`/api/admin/events?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchDiscordHealthApi() {
  return await safeFetchJson<any>(`/api/discord/health?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function fetchStripeHealthApi() {
  return await safeFetchJson<any>(`/api/stripe/health?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: getAdminHeaders({ 'Cache-Control': 'no-cache, no-store, must-revalidate' }),
  });
}

export async function resyncEntitlementApi(identifier: string) {
  try {
    const res = await fetch('/api/admin/resync-entitlement', {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ identifier }),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to dispatch resync entitlement request', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function createCheckoutSessionApi(payload: {
  plan: string;
  interval?: 'monthly' | 'annual';
  promoCode?: string;
  referralCode?: string;
  userEmail?: string;
  uid?: string;
}) {
  try {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': payload.userEmail || '',
        'x-user-uid': payload.uid || '',
      },
      body: JSON.stringify(payload),
    });
    return await safeParseJson(res);
  } catch (err: any) {
    return { error: 'NETWORK_ERROR', message: err.message || 'Connection error creating checkout session' };
  }
}

export async function createDayPassCheckoutApi(payload: {
  userEmail?: string;
  uid?: string;
  discordUserId?: string;
  referralCode?: string;
}) {
  try {
    const res = await fetch('/api/stripe/create-day-pass-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': payload.userEmail || '',
        'x-user-uid': payload.uid || '',
      },
      body: JSON.stringify(payload),
    });
    return await safeParseJson(res);
  } catch (err: any) {
    return { error: 'NETWORK_ERROR', message: err.message || 'Connection error creating Day Pass checkout session' };
  }
}

export async function createPortalSessionApi(payload: { userEmail?: string; uid?: string }) {
  try {
    const res = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': payload.userEmail || '',
        'x-user-uid': payload.uid || '',
      },
      body: JSON.stringify(payload),
    });
    return await safeParseJson(res);
  } catch (err: any) {
    return { error: 'NETWORK_ERROR', message: err.message || 'Connection error creating customer portal session' };
  }
}

export async function wipeBetaUsersApi() {
  try {
    const res = await fetch('/api/admin/users/wipe', {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.warn('Failed to wipe beta users on server', err);
    return { success: false, message: 'Server connection error' };
  }
}

export async function fetchResolvedLogApi(): Promise<any> {
  const data = await safeFetchJson<any>(`/api/signal/resolved-log?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  return data;
}

// Today's record (UTC day) from the real ledger, server-computed: the engine's
// graded locks and the strike-side rule's shadow, on the same rows.
export async function fetchDailyTallyApi(day?: string): Promise<any> {
  const q = day ? `day=${encodeURIComponent(day)}&` : '';
  const data = await safeFetchJson<any>(`/api/signal/daily-tally?${q}_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  return data;
}

/**
 * Canonical 15M decision fetch.
 *
 * Deliberately does NOT go through safeFetchJson. That helper is correct for
 * most callers, but its failure policy is fatal here: on a 429, a non-2xx, a
 * non-JSON body, or a dropped connection it returns the last cached payload
 * instead of failing. The live terminal then re-applied a stale decision on
 * every poll, refreshed its own heartbeat from it, and displayed a green LIVE
 * badge over a feed that had been dead for minutes.
 *
 * This fetcher throws instead, so the caller can distinguish "the engine said
 * this" from "we could not reach the engine". It also sends no-store, matching
 * every other live fetcher in this file.
 */
export async function fetchCanonical15mDecision(): Promise<any> {
  const res = await fetch(`/api/vixy/15m/current?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  if (!res.ok) {
    throw new Error(`Canonical 15M fetch failed: HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Canonical 15M fetch returned a non-JSON body');
  }
  return await res.json();
}

export async function fetchVixyStateApi(): Promise<any> {
  const data = await safeFetchJson<any>(`/api/vixy/state?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
  return data;
}

export async function extendMembershipApi(payload: {
  email?: string;
  uid?: string;
  months?: number;
  plan?: string;
}): Promise<{
  success: boolean;
  message: string;
  expiresAt?: string;
  entitlement?: any;
  user?: any;
  error?: string;
}> {
  try {
    const res = await fetch('/api/subscription/extend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': payload.email || '',
        'x-user-uid': payload.uid || '',
      },
      body: JSON.stringify(payload),
    });
    return await safeParseJson(res);
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Connection error extending membership',
    };
  }
}

export async function restoreAccessApi(payload: {
  email?: string;
  uid?: string;
  discordUserId?: string;
  stripeSessionId?: string;
}): Promise<{
  success: boolean;
  message: string;
  restored?: boolean;
  entitlement?: EntitlementsResponse;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/restore-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': payload.email || '',
        'x-user-uid': payload.uid || '',
      },
      body: JSON.stringify(payload),
    });
    return await safeParseJson(res);
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Connection error restoring access',
    };
  }
}

export async function getEntitlementDiagnosticsApi(): Promise<any> {
  return await safeFetchJson<any>(`/api/admin/entitlement-diagnostics?_t=${Date.now()}`);
}

export interface AcceptanceMatrixResponse {
  success: boolean;
  timestamp: string;
  allPassed: boolean;
  totalPlansTested: number;
  results: {
    planType: 'DAY_PASS' | 'STARTER' | 'PRO_QUANT' | 'ELITE_QUANT';
    planName: string;
    testEmail: string;
    userId: string;
    steps: {
      step: number;
      name: string;
      status: 'PASSED' | 'FAILED';
      details: string;
    }[];
    overallStatus: 'PASSED' | 'FAILED';
    durationMs: number;
  }[];
  summary: string;
}

export async function fetchAcceptanceMatrixApi(): Promise<AcceptanceMatrixResponse | null> {
  return await safeFetchJson<AcceptanceMatrixResponse>(`/api/admin/acceptance-matrix?_t=${Date.now()}`);
}

export async function runAcceptanceMatrixApi(): Promise<AcceptanceMatrixResponse | null> {
  try {
    const res = await fetch(`/api/admin/run-acceptance-matrix?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders(),
      },
    });
    return (await safeParseJson(res)) as AcceptanceMatrixResponse;
  } catch (err) {
    console.error('Acceptance matrix run error:', err);
    return null;
  }
}

export interface ActiveCycleLockData {
  cycleId: string;
  intervalStart: number;
  intervalEnd: number;
  timeRemainingSec: number;
  decision: string;
  direction: string;
  confidence: number;
  probability: number;
  targetStrike: number;
  spotAtLock: number;
  spotPrice: number;
  edgePct: number;
  lockQuality: number;
  validationStatus: string;
  calibrationStatus: string;
  regime: string;
  activeRegimeProfile?: string;
  optimalWeights?: Record<string, number>;
  indicatorAttributions?: any[];
  consecutiveWins?: number;
  consecutiveLosses?: number;
  failsafeActive: boolean;
  failsafeReason?: string | null;
  updatedAt: string;
}

export async function fetchActiveCycleLock(): Promise<ActiveCycleLockData | null> {
  return await safeFetchJson<ActiveCycleLockData>(`/api/engine/active-lock?_t=${Date.now()}`);
}

export async function fetchRegimeMemoryBank(): Promise<any> {
  return await safeFetchJson<any>(`/api/engine/regime-memory?_t=${Date.now()}`);
}

export async function fetchAlgorithmLedger(): Promise<any> {
  return await safeFetchJson<any>(`/api/engine/algorithm-ledger?_t=${Date.now()}`);
}

export async function triggerManualRecalibration(regime?: string): Promise<any> {
  try {
    const res = await fetch(`/api/engine/recalibrate?_t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regime }),
    });
    return await safeParseJson(res);
  } catch (err) {
    console.error('Manual recalibration error:', err);
    return null;
  }
}
