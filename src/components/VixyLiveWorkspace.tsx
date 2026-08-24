import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Flame,
  Zap,
  ShieldCheck,
  Clock,
  Activity,
  Sparkles,
  Sliders,
  CheckCircle2,
  Lock,
  Plus,
  RotateCcw,
  GripVertical,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  Crown,
  Eye,
  SlidersHorizontal,
  Layers,
  BarChart2
} from 'lucide-react';
import { BTCTicker } from '../types';
import { useCanonical15mDecision, getNormalizedLifecycleState } from '../hooks/useCanonical15mDecision';
import {
  VIXY_LIVE_MODULES,
  DEFAULT_VIXY_LIVE_LAYOUT,
  ModuleSize,
  getSizeSpanClass,
  VixyLiveModuleDefinition
} from '../config/vixyLiveModules';
import { MODULE_COMPONENT_MAP } from './vixy-live-workspace/ModuleCards';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface VixyLiveWorkspaceProps {
  ticker?: BTCTicker;
  onOpenTerminal?: () => void;
  onOpenReplay?: () => void;
  onOpenPricing?: () => void;
  userRole?: string;
  hasActiveAccess?: boolean;
}

export interface WorkspaceModuleConfig {
  id: string;
  size: ModuleSize;
  hidden?: boolean;
}

const DEFAULT_WORKSPACE_CONFIGS: WorkspaceModuleConfig[] = DEFAULT_VIXY_LIVE_LAYOUT.map((id) => {
  const def = VIXY_LIVE_MODULES.find((m) => m.id === id);
  return {
    id,
    size: def?.defaultSize || 'small',
    hidden: false
  };
});

export const VixyLiveWorkspace: React.FC<VixyLiveWorkspaceProps> = ({
  ticker,
  onOpenTerminal,
  onOpenReplay,
  onOpenPricing,
  userRole = 'UNPAID',
  hasActiveAccess = false
}) => {
  const { decision: canonical15m, dataHealthStatus, localUpdatedAt } = useCanonical15mDecision();
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isCustomizeMode, setIsCustomizeMode] = useState<boolean>(false);
  const [isModuleLibraryOpen, setIsModuleLibraryOpen] = useState<boolean>(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState<boolean>(false);

  // Authenticated User Tracking
  const [currentUserId, setCurrentUserId] = useState<string>(auth.currentUser?.uid || 'guest');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(auth.currentUser?.email || '');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setCurrentUserEmail(user.email || '');
      } else {
        setCurrentUserId('guest');
        setCurrentUserEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Entitlement / Pro Gating Check
  const effectiveRole = (userRole || 'UNPAID').toUpperCase();
  const isProOrAdmin = useMemo(() => {
    if (['PRO', 'ELITE', 'ADMIN', 'OWNER', 'STARTER', 'DAY_PASS'].includes(effectiveRole)) return true;
    if (currentUserEmail.toLowerCase() === 'vixyvault0@gmail.com' || currentUserEmail.toLowerCase() === 'onwaterservices@gmail.com') return true;
    return Boolean(hasActiveAccess);
  }, [effectiveRole, currentUserEmail, hasActiveAccess]);

  // Workspace layout state
  const [moduleConfigs, setModuleConfigs] = useState<WorkspaceModuleConfig[]>(() => {
    try {
      const cached = localStorage.getItem('vixy_live_workspace_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_WORKSPACE_CONFIGS;
  });

  // Load user workspace from Firestore / localStorage
  useEffect(() => {
    if (!currentUserId || currentUserId === 'guest') return;

    let isMounted = true;
    async function loadWorkspaceFromFirestore() {
      try {
        const userDocRef = doc(db, 'users', currentUserId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data?.vixyLiveWorkspace && Array.isArray(data.vixyLiveWorkspace.modules)) {
            if (isMounted) {
              setModuleConfigs(data.vixyLiveWorkspace.modules);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch workspace from Firestore, using local config:', err);
      }
    }

    loadWorkspaceFromFirestore();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // High precision second interval for authoritative cycle countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authoritative Cycle Timestamps & Countdown
  const secondsRemaining = useMemo(() => {
    if (canonical15m.cycleEnd && canonical15m.cycleEnd > nowMs) {
      return Math.max(0, Math.floor((canonical15m.cycleEnd - nowMs) / 1000));
    }
    if (typeof canonical15m.timeRemainingSec === 'number') {
      return Math.max(0, canonical15m.timeRemainingSec);
    }
    const epochSec = Math.floor(nowMs / 1000);
    return 900 - (epochSec % 900);
  }, [canonical15m.cycleEnd, canonical15m.timeRemainingSec, nowMs]);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const cycleCountdown = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const lifecycle = getNormalizedLifecycleState(canonical15m);
  const isLocked = lifecycle === 'LOCKED' || lifecycle === 'PROTECTED';

  // Persistence handler
  const saveWorkspace = useCallback(async (configs: WorkspaceModuleConfig[]) => {
    try {
      localStorage.setItem('vixy_live_workspace_config', JSON.stringify(configs));
      if (currentUserId && currentUserId !== 'guest') {
        const userDocRef = doc(db, 'users', currentUserId);
        await setDoc(
          userDocRef,
          {
            vixyLiveWorkspace: {
              modules: configs,
              updatedAt: new Date().toISOString()
            }
          },
          { merge: true }
        );
      }
      setIsSaveSuccess(true);
      setTimeout(() => setIsSaveSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save workspace layout:', e);
    }
  }, [currentUserId]);

  // Layout mutators
  const handleReorder = (newOrder: WorkspaceModuleConfig[]) => {
    setModuleConfigs(newOrder);
    saveWorkspace(newOrder);
  };

  const handleToggleHide = (id: string) => {
    const updated = moduleConfigs.map((m) => (m.id === id ? { ...m, hidden: !m.hidden } : m));
    setModuleConfigs(updated);
    saveWorkspace(updated);
  };

  const handleResize = (id: string, newSize: ModuleSize) => {
    const updated = moduleConfigs.map((m) => (m.id === id ? { ...m, size: newSize } : m));
    setModuleConfigs(updated);
    saveWorkspace(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= moduleConfigs.length) return;
    const next = [...moduleConfigs];
    const temp = next[index];
    next[index] = next[newIdx];
    next[newIdx] = temp;
    setModuleConfigs(next);
    saveWorkspace(next);
  };

  const handleResetLayout = () => {
    setModuleConfigs(DEFAULT_WORKSPACE_CONFIGS);
    saveWorkspace(DEFAULT_WORKSPACE_CONFIGS);
  };

  const handleAddModule = (id: string) => {
    const exists = moduleConfigs.some((m) => m.id === id);
    let updated: WorkspaceModuleConfig[];
    if (exists) {
      updated = moduleConfigs.map((m) => (m.id === id ? { ...m, hidden: false } : m));
    } else {
      const def = VIXY_LIVE_MODULES.find((m) => m.id === id);
      updated = [...moduleConfigs, { id, size: def?.defaultSize || 'small', hidden: false }];
    }
    setModuleConfigs(updated);
    saveWorkspace(updated);
  };

  const visibleConfigs = useMemo(() => {
    return moduleConfigs.filter((m) => !m.hidden);
  }, [moduleConfigs]);

  const hiddenCount = useMemo(() => {
    return moduleConfigs.filter((m) => m.hidden).length;
  }, [moduleConfigs]);

  return (
    <div className="min-h-screen bg-[#05040a] p-3 sm:p-5 md:p-6 lg:p-8 text-slate-200 font-sans space-y-6">
      
      {/* 1. TOP COMMAND DECK & CUSTOMIZATION TOOLBAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-lg">
        
        {/* Left: Branding & Subtitle */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-600/50 text-amber-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Flame className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                VIXY LIVE
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50 text-[10px] font-mono font-bold">
                COMMAND DECK
              </span>
              {isCustomizeMode && (
                <span className="px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-500/50 text-[10px] font-mono font-bold animate-pulse">
                  EDIT MODE
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs font-sans">
              Personal modular quantitative terminal • Cycle {canonical15m.contractId || canonical15m.decisionId}
            </p>
          </div>
        </div>

        {/* Center/Right: Live Telemetry, Gated Customize Mode & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono w-full xl:w-auto justify-start xl:justify-end">
          
          {/* Feed Health */}
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0a22] border border-purple-900/40 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataHealthStatus === 'LIVE' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'}`} />
            <span className="text-slate-300 text-[11px]">{dataHealthStatus === 'LIVE' ? 'FEED LIVE (14ms)' : dataHealthStatus}</span>
          </div>

          {/* Cycle Expiry Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0a22] border border-purple-900/40 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400 text-[11px]">EXPIRES:</span>
            <span className="text-emerald-400 font-bold">{cycleCountdown}</span>
          </div>

          {/* Lifecycle Pill */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold text-[11px] ${
            isLocked
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
              : 'bg-amber-950/80 text-amber-300 border-amber-700/50'
          }`}>
            <Lock className="w-3 h-3" />
            <span>{lifecycle}</span>
          </div>

          {/* CUSTOMIZE TOGGLE BUTTON (PRO/ELITE GATED) */}
          {isProOrAdmin ? (
            <button
              onClick={() => setIsCustomizeMode(!isCustomizeMode)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isCustomizeMode
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isCustomizeMode ? 'Done Customizing' : 'Customize'}</span>
            </button>
          ) : (
            <button
              onClick={onOpenPricing}
              title="Drag & drop modular customization requires PRO or Elite Pass"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Unlock Customizer (Pro)</span>
            </button>
          )}

          {/* Nav Links */}
          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/40 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>CPC Lab</span>
            </button>
          )}

          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="px-3.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/40 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-300" />
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CUSTOMIZE ACTION BAR (Visible when customize mode is active) */}
      <AnimatePresence>
        {isCustomizeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-2xl bg-[#0e0a22] border border-purple-600/40 flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-xl"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-purple-300 font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                WORKSPACE EDITOR:
              </span>
              <span className="text-slate-400">
                Drag modules to reorder, resize blocks, or toggle module visibility.
              </span>
              {hiddenCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700/50 text-amber-300 font-bold">
                  {hiddenCount} hidden {hiddenCount === 1 ? 'module' : 'modules'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsModuleLibraryOpen(!isModuleLibraryOpen)}
                className="px-3 py-1.5 rounded-xl bg-purple-900/70 hover:bg-purple-800 text-purple-200 border border-purple-600/60 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isModuleLibraryOpen ? 'Hide Library' : 'Add / Restore Modules'}</span>
              </button>

              <button
                onClick={handleResetLayout}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              {isSaveSuccess && (
                <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MODULE LIBRARY / RESTORE TRAY (When open in customize mode) */}
      <AnimatePresence>
        {isCustomizeMode && isModuleLibraryOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-[#090614] border border-purple-800/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                AVAILABLE MODULE REGISTRY
              </span>
              <button
                onClick={() => setIsModuleLibraryOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 font-sans">
              {VIXY_LIVE_MODULES.map((mod) => {
                const isCurrentlyActive = moduleConfigs.some((m) => m.id === mod.id && !m.hidden);
                const IconComponent = mod.icon;

                return (
                  <div
                    key={mod.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isCurrentlyActive
                        ? 'bg-purple-950/30 border-purple-900/40 opacity-60'
                        : 'bg-[#0e0a22] border-purple-600/50 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-purple-900/50 text-purple-300 flex-shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{mod.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono capitalize">{mod.category}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddModule(mod.id)}
                      disabled={isCurrentlyActive}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex-shrink-0 ${
                        isCurrentlyActive
                          ? 'bg-slate-800 text-slate-500 cursor-default'
                          : 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                      }`}
                    >
                      {isCurrentlyActive ? 'Active' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. DRAG-AND-DROP MODULAR GRID (Reorder with Framer Motion) */}
      {isCustomizeMode ? (
        <Reorder.Group
          axis="y"
          values={moduleConfigs}
          onReorder={handleReorder}
          className="space-y-4 font-mono"
        >
          {moduleConfigs.map((config, index) => {
            const modDef = VIXY_LIVE_MODULES.find((m) => m.id === config.id);
            if (!modDef) return null;
            const ComponentToRender = MODULE_COMPONENT_MAP[config.id];
            if (!ComponentToRender) return null;
            const IconComp = modDef.icon;

            return (
              <Reorder.Item
                key={config.id}
                value={config}
                className={`p-4 rounded-2xl bg-[#090614] border ${
                  config.hidden
                    ? 'border-dashed border-slate-800/60 opacity-50'
                    : 'border-purple-700/60 shadow-lg'
                } relative`}
              >
                {/* Module Edit Header Controls */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-900/40 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800 text-purple-300">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <IconComp className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white uppercase">{modDef.title}</span>
                    <span className="text-[10px] text-slate-400 font-sans">({config.size})</span>
                  </div>

                  {/* Size Picker & Hide/Show controls */}
                  <div className="flex items-center gap-1.5 font-sans">
                    {/* Size Selector */}
                    <div className="flex items-center gap-1 bg-[#05040a] p-1 rounded-lg border border-purple-900/40">
                      {(['small', 'medium', 'large', 'full-width'] as ModuleSize[]).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => handleResize(config.id, sz)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all capitalize ${
                            config.size === sz
                              ? 'bg-purple-600 text-white font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {sz === 'full-width' ? 'Full' : sz}
                        </button>
                      ))}
                    </div>

                    {/* Up / Down Move fallback buttons */}
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === moduleConfigs.length - 1}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Hide Button */}
                    <button
                      onClick={() => handleToggleHide(config.id)}
                      className="p-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60"
                      title={config.hidden ? 'Restore module' : 'Hide module'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Preview Content */}
                {!config.hidden && (
                  <div className="opacity-80 pointer-events-none">
                    <ComponentToRender
                      canonical15m={canonical15m}
                      ticker={ticker}
                      dataHealthStatus={dataHealthStatus}
                      localUpdatedAt={localUpdatedAt}
                      nowMs={nowMs}
                      onOpenTerminal={onOpenTerminal}
                      onOpenReplay={onOpenReplay}
                      onOpenPricing={onOpenPricing}
                      isEditMode={true}
                    />
                  </div>
                )}
                {config.hidden && (
                  <div className="py-2 text-center text-xs text-slate-500 font-sans">
                    Module hidden from personal dashboard view
                  </div>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      ) : (
        /* STANDARD RESPONSIVE GRID (Live View) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleConfigs.map((config) => {
            const modDef = VIXY_LIVE_MODULES.find((m) => m.id === config.id);
            if (!modDef) return null;
            const ComponentToRender = MODULE_COMPONENT_MAP[config.id];
            if (!ComponentToRender) return null;

            const spanClass = getSizeSpanClass(config.size);

            return (
              <div
                key={config.id}
                className={`p-4 rounded-2xl bg-[#090614] border border-purple-900/40 shadow-sm flex flex-col justify-between group hover:border-purple-600/50 transition-all ${spanClass}`}
              >
                <ComponentToRender
                  canonical15m={canonical15m}
                  ticker={ticker}
                  dataHealthStatus={dataHealthStatus}
                  localUpdatedAt={localUpdatedAt}
                  nowMs={nowMs}
                  onOpenTerminal={onOpenTerminal}
                  onOpenReplay={onOpenReplay}
                  onOpenPricing={onOpenPricing}
                  isEditMode={false}
                />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
