import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserWorkspace, ModuleInstanceConfig } from '../components/vixy-live/types';

export const CURRENT_LAYOUT_VERSION = 1;

// Built-in Default Workspace Templates
export const DEFAULT_WORKSPACES: Omit<UserWorkspace, 'userId'>[] = [
  {
    id: 'ws_vixy_core',
    name: 'VIXY PRO (DEFAULT)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    layoutVersion: CURRENT_LAYOUT_VERSION,
    isDefault: true,
    settings: { autoRefreshRate: 2000, gridDensity: 'standard' },
    modules: [
      'c_bias',
      'c_conf',
      'c_cd',
      'c_lock',
      'c_1m',
      'c_qual',
      'c_prot',
      'c_health',
      'c_chart',
      'c_matrix',
      'c_flow',
      'c_mom',
      'c_vol',
      'c_regime',
      'c_tape',
      'c_read'
    ],
    layout: [
      // ROW 1: CURRENT SIGNAL, CALIBRATION CONFIDENCE, 15M CYCLE, LOCK STATUS
      { instanceId: 'c_bias', moduleId: 'vixy.bias', x: 0, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_conf', moduleId: 'vixy.confidence', x: 3, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_cd', moduleId: 'vixy.cycle_countdown', x: 6, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_lock', moduleId: 'vixy.lock_status', x: 9, y: 0, w: 3, h: 2, sizeMode: 'default' },

      // ROW 2: 1M DECISION, LOCK QUALITY, VIXY PROTECTION, DATA HEALTH
      { instanceId: 'c_1m', moduleId: 'vixy.signal_1m', x: 0, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_qual', moduleId: 'vixy.lock_quality', x: 3, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_prot', moduleId: 'vixy.protection', x: 6, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_health', moduleId: 'vixy.data_health', x: 9, y: 2, w: 3, h: 2, sizeMode: 'default' },

      // ROW 3: CHART / NEURAL RIBBON, SIGNAL CONFLUENCE MATRIX
      { instanceId: 'c_chart', moduleId: 'market.btc_chart', x: 0, y: 4, w: 6, h: 2, sizeMode: 'expanded' },
      { instanceId: 'c_matrix', moduleId: 'quant.signal_matrix', x: 6, y: 4, w: 6, h: 2, sizeMode: 'expanded' },

      // ROW 4: ORDER FLOW, MOMENTUM, VOLUME, MARKET REGIME
      { instanceId: 'c_flow', moduleId: 'quant.order_flow', x: 0, y: 6, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_mom', moduleId: 'quant.momentum', x: 3, y: 6, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_vol', moduleId: 'quant.volume', x: 6, y: 6, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'c_regime', moduleId: 'quant.market_regime', x: 9, y: 6, w: 3, h: 2, sizeMode: 'default' },

      // ROW 5: LIVE MARKET FEED, VIXY READ
      { instanceId: 'c_tape', moduleId: 'quant.live_feed', x: 0, y: 8, w: 6, h: 2, sizeMode: 'expanded' },
      { instanceId: 'c_read', moduleId: 'vixy.read', x: 6, y: 8, w: 6, h: 2, sizeMode: 'expanded' }
    ]
  },
  {
    id: 'ws_btc_scalp',
    name: 'BTC SCALP',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    layoutVersion: CURRENT_LAYOUT_VERSION,
    isDefault: false,
    settings: { autoRefreshRate: 1000, gridDensity: 'compact' },
    modules: ['s_btc', 's_chart', 's_whale', 's_mom', 's_flow', 's_vol', 's_vola'],
    layout: [
      { instanceId: 's_btc', moduleId: 'market.btc_price', x: 0, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 's_chart', moduleId: 'market.btc_chart', x: 3, y: 0, w: 6, h: 2, sizeMode: 'expanded' },
      { instanceId: 's_whale', moduleId: 'quant.whale_flow', x: 9, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 's_mom', moduleId: 'quant.momentum', x: 0, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 's_flow', moduleId: 'quant.order_flow', x: 3, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 's_vol', moduleId: 'quant.volume', x: 6, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 's_vola', moduleId: 'quant.volatility', x: 9, y: 2, w: 3, h: 2, sizeMode: 'default' }
    ]
  },
  {
    id: 'ws_15m_prediction',
    name: '15M PREDICTION',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    layoutVersion: CURRENT_LAYOUT_VERSION,
    isDefault: false,
    settings: { autoRefreshRate: 2000, gridDensity: 'standard' },
    modules: ['p_bias', 'p_cd', 'p_qual', 'p_prot', 'p_chart', 'p_kalshi', 'p_poly', 'p_cross'],
    layout: [
      { instanceId: 'p_bias', moduleId: 'vixy.bias', x: 0, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'p_cd', moduleId: 'vixy.cycle_countdown', x: 3, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'p_qual', moduleId: 'vixy.lock_quality', x: 6, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'p_prot', moduleId: 'vixy.protection', x: 9, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'p_chart', moduleId: 'market.btc_chart', x: 0, y: 2, w: 6, h: 2, sizeMode: 'expanded' },
      { instanceId: 'p_kalshi', moduleId: 'venue.kalshi', x: 6, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'p_poly', moduleId: 'venue.polymarket', x: 9, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'p_cross', moduleId: 'venue.cross_venue_sync', x: 0, y: 4, w: 12, h: 2, sizeMode: 'expanded' }
    ]
  },
  {
    id: 'ws_market_watch',
    name: 'MARKET WATCH',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    layoutVersion: CURRENT_LAYOUT_VERSION,
    isDefault: false,
    settings: { autoRefreshRate: 3000, gridDensity: 'standard' },
    modules: ['mw_btc', 'mw_eth', 'mw_sol', 'mw_regime', 'mw_sent', 'mw_news', 'mw_whale'],
    layout: [
      { instanceId: 'mw_btc', moduleId: 'market.btc_price', x: 0, y: 0, w: 4, h: 2, sizeMode: 'default' },
      { instanceId: 'mw_eth', moduleId: 'market.eth_price', x: 4, y: 0, w: 4, h: 2, sizeMode: 'default' },
      { instanceId: 'mw_sol', moduleId: 'market.sol_price', x: 8, y: 0, w: 4, h: 2, sizeMode: 'default' },
      { instanceId: 'mw_regime', moduleId: 'quant.market_regime', x: 0, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'mw_sent', moduleId: 'quant.sentiment', x: 3, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'mw_news', moduleId: 'quant.news', x: 6, y: 2, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'mw_whale', moduleId: 'quant.whale_flow', x: 9, y: 2, w: 3, h: 2, sizeMode: 'default' }
    ]
  },
  {
    id: 'ws_minimal',
    name: 'MINIMAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    layoutVersion: CURRENT_LAYOUT_VERSION,
    isDefault: false,
    settings: { autoRefreshRate: 3000, gridDensity: 'standard' },
    modules: ['m_bias', 'm_conf', 'm_btc', 'm_cd'],
    layout: [
      { instanceId: 'm_bias', moduleId: 'vixy.bias', x: 0, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'm_conf', moduleId: 'vixy.confidence', x: 3, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'm_btc', moduleId: 'market.btc_price', x: 6, y: 0, w: 3, h: 2, sizeMode: 'default' },
      { instanceId: 'm_cd', moduleId: 'vixy.cycle_countdown', x: 9, y: 0, w: 3, h: 2, sizeMode: 'default' }
    ]
  }
];

// Pure Migration Infrastructure function for Backward Compatibility
export function migrateWorkspace(raw: any, targetUserId: string): UserWorkspace {
  if (!raw || typeof raw !== 'object') {
    const fallback = DEFAULT_WORKSPACES[0];
    return {
      ...fallback,
      userId: targetUserId
    };
  }

  // Sanitize layout to ensure no market data or state is leaked
  const sanitizedLayout: ModuleInstanceConfig[] = Array.isArray(raw.layout)
    ? raw.layout.map((item: any) => ({
        instanceId: String(item.instanceId || `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
        moduleId: String(item.moduleId || 'vixy.bias'),
        x: Number(item.x ?? item.col ?? 0),
        y: Number(item.y ?? item.row ?? 0),
        w: Number(item.w ?? item.width ?? 3),
        h: Number(item.h ?? item.height ?? 2),
        sizeMode: item.sizeMode || (Number(item.w ?? 3) >= 6 ? 'expanded' : 'default'),
        // Stripping out any dynamic market/price/prediction state from configuration
        configuration: sanitizeConfig(item.configuration || item.config || {})
      }))
    : DEFAULT_WORKSPACES[0].layout;

  const modules = sanitizedLayout.map((m) => m.instanceId);

  return {
    id: String(raw.id || `ws_${Date.now()}`),
    userId: targetUserId,
    name: String(raw.name || 'CUSTOM WORKSPACE').toUpperCase(),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    layout: sanitizedLayout,
    modules: modules,
    settings: typeof raw.settings === 'object' && raw.settings ? raw.settings : { autoRefreshRate: 3000, gridDensity: 'standard' },
    version: typeof raw.version === 'number' ? raw.version : 1,
    layoutVersion: CURRENT_LAYOUT_VERSION,
    isDefault: Boolean(raw.isDefault)
  };
}

// Ensure module configuration never stores transient/live market or prediction state
function sanitizeConfig(config: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const FORBIDDEN_KEYS = ['btcPrice', 'spotPrice', 'decision', 'confidence', 'probability', 'ticker', 'canonical15m', 'liveState'];
  
  Object.keys(config).forEach((key) => {
    if (!FORBIDDEN_KEYS.includes(key)) {
      sanitized[key] = config[key];
    }
  });

  return sanitized;
}

// Local Storage Helper Key Generator
function getLocalKey(userId: string) {
  return `vixy_workspaces_v2_${userId || 'guest'}`;
}

// Get initial workspaces (Loads default templates if empty)
export function getInitialWorkspaces(userId: string): UserWorkspace[] {
  try {
    const key = getLocalKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => migrateWorkspace(item, userId));
      }
    }
  } catch (e) {
    console.error('Error reading local workspaces:', e);
  }

  // Return migrated default workspace templates bound to user
  return DEFAULT_WORKSPACES.map((preset) => ({
    ...preset,
    userId
  }));
}

// Save workspaces array to Local Storage cache
export function saveLocalWorkspaces(userId: string, workspaces: UserWorkspace[]) {
  try {
    const key = getLocalKey(userId);
    localStorage.setItem(key, JSON.stringify(workspaces));
  } catch (e) {
    console.error('Error caching local workspaces:', e);
  }
}

// --- FIRESTORE PERSISTENCE METHODS ---

/**
 * Fetch user workspaces from Firestore with client-side isolation
 */
export async function fetchUserWorkspacesFirestore(userId: string): Promise<UserWorkspace[]> {
  if (!userId || userId === 'guest') {
    return getInitialWorkspaces('guest');
  }

  const path = `users/${userId}/workspaces`;
  try {
    const workspacesRef = collection(db, 'users', userId, 'workspaces');
    const q = query(workspacesRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Seed initial default workspaces into Firestore for new user
      const initialList: UserWorkspace[] = DEFAULT_WORKSPACES.map((ws) => ({
        ...ws,
        userId
      }));

      await Promise.all(
        initialList.map((ws) =>
          setDoc(doc(db, 'users', userId, 'workspaces', ws.id), {
            ...ws,
            updatedAt: new Date().toISOString()
          })
        )
      );

      saveLocalWorkspaces(userId, initialList);
      return initialList;
    }

    const fetched: UserWorkspace[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return migrateWorkspace({ ...data, id: docSnap.id }, userId);
    });

    saveLocalWorkspaces(userId, fetched);
    return fetched;
  } catch (error) {
    console.warn(`Firestore workspace read failed for ${userId}, falling back to local cache:`, error);
    return getInitialWorkspaces(userId);
  }
}

/**
 * Subscribe to real-time user workspace updates from Firestore
 */
export function subscribeUserWorkspaces(
  userId: string,
  onUpdate: (workspaces: UserWorkspace[]) => void,
  onError?: (err: any) => void
) {
  if (!userId || userId === 'guest') {
    onUpdate(getInitialWorkspaces('guest'));
    return () => {};
  }

  const path = `users/${userId}/workspaces`;
  const workspacesRef = collection(db, 'users', userId, 'workspaces');

  return onSnapshot(
    workspacesRef,
    (snapshot) => {
      if (snapshot.empty) {
        // First time initialization
        fetchUserWorkspacesFirestore(userId).then(onUpdate);
        return;
      }

      const workspaces: UserWorkspace[] = snapshot.docs.map((d) =>
        migrateWorkspace({ ...d.data(), id: d.id }, userId)
      );
      saveLocalWorkspaces(userId, workspaces);
      onUpdate(workspaces);
    },
    (error) => {
      console.warn(`Workspace snapshot listener error for ${userId}:`, error);
      if (onError) onError(error);
      onUpdate(getInitialWorkspaces(userId));
    }
  );
}

/**
 * Save / Upsert a workspace to Firestore and Local Storage
 */
export async function saveWorkspaceFirestore(userId: string, workspace: UserWorkspace): Promise<void> {
  const sanitized = migrateWorkspace(workspace, userId);
  sanitized.updatedAt = new Date().toISOString();

  // Always update local cache immediately for instant response
  const currentLocal = getInitialWorkspaces(userId);
  const updatedLocal = currentLocal.some((w) => w.id === sanitized.id)
    ? currentLocal.map((w) => (w.id === sanitized.id ? sanitized : w))
    : [...currentLocal, sanitized];
  saveLocalWorkspaces(userId, updatedLocal);

  if (!userId || userId === 'guest') {
    return; // Local-only for guest users
  }

  const path = `users/${userId}/workspaces/${sanitized.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'workspaces', sanitized.id);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a workspace from Firestore and Local Storage
 */
export async function deleteWorkspaceFirestore(userId: string, workspaceId: string): Promise<UserWorkspace[]> {
  const currentLocal = getInitialWorkspaces(userId);
  const remaining = currentLocal.filter((w) => w.id !== workspaceId);

  // Guarantee at least 1 workspace remains
  const finalWorkspaces = remaining.length > 0 ? remaining : DEFAULT_WORKSPACES.map((w) => ({ ...w, userId }));
  saveLocalWorkspaces(userId, finalWorkspaces);

  if (userId && userId !== 'guest') {
    const path = `users/${userId}/workspaces/${workspaceId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'workspaces', workspaceId));
    } catch (error) {
      console.error('Failed to delete workspace from Firestore:', error);
    }
  }

  return finalWorkspaces;
}
