import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Sliders,
  RotateCcw,
  Check,
  Sparkles,
  LayoutGrid,
  Eye,
  Undo2,
  Redo2,
  Layers,
  Zap,
  ShieldCheck,
  BarChart2,
  Activity,
  Globe,
  SlidersHorizontal,
  Bookmark,
  ChevronDown,
  Copy,
  Edit2,
  Trash2,
  Save,
  CloudCheck,
  AlertCircle,
  X
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { BTCTicker } from '../../types';
import { fetchBTCTicker, fetchCryptoTicker } from '../../services/api';
import { useCanonical15mDecision } from '../../hooks/useCanonical15mDecision';
import {
  UserWorkspace,
  ModuleInstanceConfig,
  WorkspacePreset,
  VixyModuleDefinition
} from './types';
import { ModuleRenderer } from './ModuleRenderer';
import { ModuleLibrary } from './ModuleLibrary';
import { TerminalPickerModal } from './TerminalPickerModal';
import { getModuleDefinition } from './registry/moduleRegistry';
import {
  DEFAULT_WORKSPACES,
  fetchUserWorkspacesFirestore,
  subscribeUserWorkspaces,
  saveWorkspaceFirestore,
  deleteWorkspaceFirestore,
  migrateWorkspace,
  CURRENT_LAYOUT_VERSION
} from '../../services/workspaceService';

export const VixyLiveWorkspace: React.FC<{
  initialTicker?: BTCTicker;
  onOpenTerminal?: () => void;
}> = ({ initialTicker, onOpenTerminal }) => {
  const {
    decision: canonical15m,
    dataHealthStatus,
    feedError,
    normalizedLifecycle,
    localUpdatedAt
  } = useCanonical15mDecision();
  const [btcTicker, setBtcTicker] = useState<BTCTicker | null>(initialTicker || null);
  const [ethTicker, setEthTicker] = useState<BTCTicker | null>(null);
  const [solTicker, setSolTicker] = useState<BTCTicker | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Authenticated User Tracking
  const [currentUserId, setCurrentUserId] = useState<string>(auth.currentUser?.uid || 'guest');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user ? user.uid : 'guest');
    });
    return () => unsubscribe();
  }, []);

  // Workspaces State
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>(() =>
    DEFAULT_WORKSPACES.map((w) => ({ ...w, userId: currentUserId }))
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws_vixy_core');

  // Modal / UI states for Workspace CRUD & Terminal Selection
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isTerminalPickerOpen, setIsTerminalPickerOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [renameInputValue, setRenameInputValue] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('ws_vixy_core');

  // Check if first-time user when mounting
  useEffect(() => {
    const hasChosen = localStorage.getItem('vixy_terminal_has_chosen');
    if (!hasChosen) {
      setIsTerminalPickerOpen(true);
    }
  }, []);

  const handleSelectPreset = (presetId: string) => {
    localStorage.setItem('vixy_terminal_has_chosen', 'true');
    localStorage.setItem('vixy_active_preset_id', presetId);

    const found = workspaces.find((w) => w.id === presetId);
    if (found) {
      setActiveWorkspaceId(presetId);
    } else {
      const template = DEFAULT_WORKSPACES.find((w) => w.id === presetId) || DEFAULT_WORKSPACES[0];
      const newWs: UserWorkspace = {
        ...template,
        userId: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(presetId);
    }
    setIsTerminalPickerOpen(false);
  };

  const handleBuildFromScratch = () => {
    localStorage.setItem('vixy_terminal_has_chosen', 'true');
    const scratchId = `ws_scratch_${Date.now()}`;
    const scratchWs: UserWorkspace = {
      id: scratchId,
      userId: currentUserId,
      name: 'CUSTOM BENCH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      layoutVersion: CURRENT_LAYOUT_VERSION,
      layout: [
        { instanceId: `inst_${Date.now()}_bias`, moduleId: 'vixy.bias', x: 0, y: 0, w: 3, h: 2, sizeMode: 'default' }
      ],
      modules: ['vixy.bias'],
      settings: { autoRefreshRate: 3000, gridDensity: 'standard' },
      isDefault: false
    };

    setWorkspaces((prev) => [...prev, scratchWs]);
    setActiveWorkspaceId(scratchId);
    setIsEditMode(true);
    setIsLibraryOpen(true);
    setIsTerminalPickerOpen(false);
  };

  // Autosave Status: 'saved' | 'saving' | 'error' | 'local'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'local'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Real-time Firestore Subscription for User Workspaces
  useEffect(() => {
    const unsub = subscribeUserWorkspaces(
      currentUserId,
      (updatedWorkspaces) => {
        setWorkspaces(updatedWorkspaces);
        // Ensure active workspace exists in fetched list
        if (!updatedWorkspaces.some((w) => w.id === activeWorkspaceId) && updatedWorkspaces.length > 0) {
          setActiveWorkspaceId(updatedWorkspaces[0].id);
        }
      },
      (err) => {
        setSaveStatus('error');
      }
    );
    return () => unsub();
  }, [currentUserId]);

  // Current Active Workspace
  const activeWorkspace = useMemo(() => {
    const found = workspaces.find((w) => w.id === activeWorkspaceId);
    if (found) return found;
    return workspaces[0] || migrateWorkspace(DEFAULT_WORKSPACES[0], currentUserId);
  }, [workspaces, activeWorkspaceId, currentUserId]);

  // Layout history stack for Undo / Redo
  const [layoutHistory, setLayoutHistory] = useState<ModuleInstanceConfig[][]>([
    activeWorkspace.layout
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync active workspace layout changes into layout history stack when switching active workspace
  useEffect(() => {
    setLayoutHistory([activeWorkspace.layout]);
    setHistoryIndex(0);
  }, [activeWorkspaceId]);

  const currentLayout = layoutHistory[historyIndex] || activeWorkspace.layout;

  // Single shared ticker polling
  useEffect(() => {
    const updateTickers = async () => {
      try {
        const [btc, eth, sol] = await Promise.all([
          fetchBTCTicker().catch(() => null),
          fetchCryptoTicker('ETH').catch(() => null),
          fetchCryptoTicker('SOL').catch(() => null)
        ]);
        if (btc) setBtcTicker(btc);
        if (eth) setEthTicker(eth);
        if (sol) setSolTicker(sol);
      } catch (e) {
        // ignore
      }
    };
    updateTickers();
    const interval = setInterval(updateTickers, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- INTELLIGENT DEBOUNCED AUTOSAVE ---
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback(
    (newLayout: ModuleInstanceConfig[], updatedName?: string) => {
      setSaveStatus('saving');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const updatedWs: UserWorkspace = {
          ...activeWorkspace,
          name: updatedName || activeWorkspace.name,
          layout: newLayout,
          modules: newLayout.map((m) => m.instanceId),
          updatedAt: new Date().toISOString(),
          layoutVersion: CURRENT_LAYOUT_VERSION
        };

        // Local state update
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === updatedWs.id ? updatedWs : w))
        );

        try {
          await saveWorkspaceFirestore(currentUserId, updatedWs);
          setSaveStatus(currentUserId === 'guest' ? 'local' : 'saved');
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedTime(time);
        } catch (e) {
          console.error('Autosave error:', e);
          setSaveStatus('error');
        }
      }, 1000); // Debounce delay 1000ms
    },
    [activeWorkspace, currentUserId]
  );

  const updateLayout = useCallback(
    (newLayout: ModuleInstanceConfig[]) => {
      setLayoutHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newLayout];
      });
      setHistoryIndex((prev) => prev + 1);
      triggerAutosave(newLayout);
    },
    [historyIndex, triggerAutosave]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      triggerAutosave(layoutHistory[nextIdx]);
    }
  }, [historyIndex, layoutHistory, triggerAutosave]);

  const handleRedo = useCallback(() => {
    if (historyIndex < layoutHistory.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      triggerAutosave(layoutHistory[nextIdx]);
    }
  }, [historyIndex, layoutHistory, triggerAutosave]);

  const activeModuleIds = useMemo(() => currentLayout.map((m) => m.moduleId), [currentLayout]);

  const handleAddModule = useCallback(
    (definition: VixyModuleDefinition) => {
      const newInstance: ModuleInstanceConfig = {
        instanceId: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        moduleId: definition.id,
        x: 0,
        y: 99,
        w: definition.defaultDimensions.w,
        h: definition.defaultDimensions.h,
        sizeMode: 'default'
      };
      updateLayout([...currentLayout, newInstance]);
    },
    [currentLayout, updateLayout]
  );

  const handleRemoveModule = useCallback(
    (instanceId: string) => {
      updateLayout(currentLayout.filter((item) => item.instanceId !== instanceId));
    },
    [currentLayout, updateLayout]
  );

  const handleDuplicateModule = useCallback(
    (instanceId: string) => {
      const target = currentLayout.find((m) => m.instanceId === instanceId);
      if (!target) return;
      const duplicated: ModuleInstanceConfig = {
        ...target,
        instanceId: `inst_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      };
      updateLayout([...currentLayout, duplicated]);
    },
    [currentLayout, updateLayout]
  );

  const handleToggleExpand = useCallback(
    (instanceId: string) => {
      const next = currentLayout.map((item) => {
        if (item.instanceId === instanceId) {
          const nextW = item.w >= 6 ? 3 : 6;
          return {
            ...item,
            w: nextW,
            sizeMode: (nextW >= 6 ? 'expanded' : 'default') as 'expanded' | 'default'
          };
        }
        return item;
      });
      updateLayout(next);
    },
    [currentLayout, updateLayout]
  );

  const handleMoveModule = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= currentLayout.length) return;
      const next = [...currentLayout];
      const temp = next[index];
      next[index] = next[newIndex];
      next[newIndex] = temp;
      updateLayout(next);
    },
    [currentLayout, updateLayout]
  );

  const handleResetLayout = useCallback(() => {
    const template = DEFAULT_WORKSPACES.find((w) => w.id === activeWorkspaceId) || DEFAULT_WORKSPACES[0];
    updateLayout(template.layout);
  }, [activeWorkspaceId, updateLayout]);

  // --- WORKSPACE OPERATIONS (CRUD) ---

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    const template = DEFAULT_WORKSPACES.find((w) => w.id === selectedTemplateId) || DEFAULT_WORKSPACES[0];
    const newWs: UserWorkspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUserId,
      name: newWorkspaceName.trim().toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      layoutVersion: CURRENT_LAYOUT_VERSION,
      layout: template.layout,
      modules: template.layout.map((m) => m.instanceId),
      settings: { ...template.settings },
      isDefault: false
    };

    const nextWorkspaces = [...workspaces, newWs];
    setWorkspaces(nextWorkspaces);
    setActiveWorkspaceId(newWs.id);
    setIsCreateModalOpen(false);
    setNewWorkspaceName('');

    setSaveStatus('saving');
    await saveWorkspaceFirestore(currentUserId, newWs);
    setSaveStatus(currentUserId === 'guest' ? 'local' : 'saved');
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleRenameWorkspace = async () => {
    if (!renameInputValue.trim()) return;
    const updatedName = renameInputValue.trim().toUpperCase();
    const updatedWs: UserWorkspace = {
      ...activeWorkspace,
      name: updatedName,
      updatedAt: new Date().toISOString()
    };

    setWorkspaces((prev) => prev.map((w) => (w.id === updatedWs.id ? updatedWs : w)));
    setIsRenameModalOpen(false);

    setSaveStatus('saving');
    await saveWorkspaceFirestore(currentUserId, updatedWs);
    setSaveStatus(currentUserId === 'guest' ? 'local' : 'saved');
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleDuplicateWorkspace = async () => {
    const duplicatedWs: UserWorkspace = {
      ...activeWorkspace,
      id: `ws_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${activeWorkspace.name} (COPY)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false
    };

    setWorkspaces((prev) => [...prev, duplicatedWs]);
    setActiveWorkspaceId(duplicatedWs.id);
    setIsWorkspaceMenuOpen(false);

    setSaveStatus('saving');
    await saveWorkspaceFirestore(currentUserId, duplicatedWs);
    setSaveStatus(currentUserId === 'guest' ? 'local' : 'saved');
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleDeleteWorkspace = async () => {
    if (workspaces.length <= 1) {
      alert('You must have at least one active workspace.');
      return;
    }
    if (!confirm(`Are you sure you want to delete workspace "${activeWorkspace.name}"?`)) return;

    const remaining = await deleteWorkspaceFirestore(currentUserId, activeWorkspace.id);
    setWorkspaces(remaining);
    if (remaining.length > 0) {
      setActiveWorkspaceId(remaining[0].id);
    }
    setIsWorkspaceMenuOpen(false);
  };

  return (
    <div className="w-full space-y-4 font-mono text-slate-200 select-none pb-12">
      {/* 1. TOP WORKSPACE MANAGEMENT & BUILDER TOOLBAR */}
      <div className="p-4 rounded-2xl bg-[#0b0e14] border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 shadow-xl relative overflow-visible z-30">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isEditMode ? 'bg-purple-400 animate-ping' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight font-sans uppercase">
                BUILD YOUR VIXY
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isEditMode
                    ? 'bg-purple-950 text-purple-300 border-purple-700'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}
              >
                {isEditMode ? 'BUILD MODE ACTIVE' : 'LIVE WORKSPACE'}
              </span>

              {/* AUTOSAVE STATUS INDICATOR */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#080a0f] border border-slate-800 text-[10px] font-sans font-semibold">
                {saveStatus === 'saving' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-spin border-t-transparent border-purple-200" />
                    <span className="text-purple-300">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CloudCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">
                      Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
                    </span>
                  </>
                )}
                {saveStatus === 'local' && (
                  <>
                    <Save className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-300">Saved Locally</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-300">Offline / Sync Error</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Modular trading workstation • Add, resize, position & customize real-time quant telemetry
            </p>
          </div>
        </div>

        {/* Toolbar Controls & Multi-Workspace Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CHOOSE YOUR TERMINAL PRESET BUTTON */}
          <button
            onClick={() => setIsTerminalPickerOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/50 text-xs font-sans font-extrabold text-white flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>CHOOSE YOUR TERMINAL</span>
          </button>

          {/* WORKSPACE SELECTOR DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="px-3 py-1.5 rounded-lg bg-[#0e121a] hover:bg-slate-800 border border-slate-800 text-xs font-sans font-bold text-white flex items-center gap-2 transition-all shadow-md"
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-400" />
              <span>WORKSPACE: {activeWorkspace.name}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/80 font-mono">
                v{activeWorkspace.layoutVersion || 1}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isWorkspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-64 bg-[#0d1018] border border-slate-800 rounded-xl shadow-2xl p-2 z-50 font-sans"
                >
                  <div className="px-2 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1 flex items-center justify-between">
                    <span>MY WORKSPACES</span>
                    <span className="text-purple-400">{workspaces.length} ACTIVE</span>
                  </div>

                  <div className="max-h-48 overflow-auto space-y-1 my-1">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspaceId(ws.id);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                          ws.id === activeWorkspaceId
                            ? 'bg-purple-950/80 text-purple-200 border border-purple-800/80 font-bold'
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {ws.id === activeWorkspaceId && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 space-y-1">
                    <button
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        setIsCreateModalOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>CREATE NEW WORKSPACE</span>
                    </button>

                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        onClick={() => {
                          setIsWorkspaceMenuOpen(false);
                          setRenameInputValue(activeWorkspace.name);
                          setIsRenameModalOpen(true);
                        }}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-800"
                        title="Rename Active Workspace"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={handleDuplicateWorkspace}
                        className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-800"
                        title="Duplicate Active Workspace"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Duplicate</span>
                      </button>

                      <button
                        onClick={handleDeleteWorkspace}
                        className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1 border border-rose-900/40"
                        title="Delete Active Workspace"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold transition-all flex items-center gap-1.5 ${
              isEditMode
                ? 'bg-purple-600 text-white border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'bg-[#0e121a] hover:bg-slate-800 text-slate-200 border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEditMode ? 'EXIT BUILD MODE' : 'BUILD MODE'}</span>
          </button>

          {/* Edit Mode Actions */}
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-950/90 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-sans font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD MODULE</span>
              </button>

              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`p-1.5 rounded-lg border text-xs font-sans transition-all ${
                  historyIndex > 0
                    ? 'bg-[#0e121a] hover:bg-slate-800 text-slate-200 border-slate-800'
                    : 'bg-slate-900/50 text-slate-600 border-slate-800/50 cursor-default'
                }`}
                title="Undo Layout Change"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRedo}
                disabled={historyIndex >= layoutHistory.length - 1}
                className={`p-1.5 rounded-lg border text-xs font-sans transition-all ${
                  historyIndex < layoutHistory.length - 1
                    ? 'bg-[#0e121a] hover:bg-slate-800 text-slate-200 border-slate-800'
                    : 'bg-slate-900/50 text-slate-600 border-slate-800/50 cursor-default'
                }`}
                title="Redo Layout Change"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetLayout}
                className="p-1.5 rounded-lg bg-[#0e121a] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-sans transition-all"
                title="Reset Active Workspace to Preset Template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="px-3 py-1.5 rounded-lg bg-[#0e121a] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-sans transition-all flex items-center gap-1.5 ml-1"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Deep Terminal</span>
            </button>
          )}
        </div>
      </div>

      {/* Build Mode Notification Banner */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-purple-950/40 border border-purple-800/50 rounded-xl flex items-center justify-between text-xs text-purple-200 font-sans"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>BUILD MODE ENABLED:</strong> Reorder modules, expand/collapse spans, duplicate, or add new telemetry feeds to <strong>{activeWorkspace.name}</strong>. Intelligent autosave active.
              </span>
            </div>
            <button
              onClick={() => setIsEditMode(false)}
              className="px-2.5 py-1 rounded bg-purple-900 hover:bg-purple-800 text-white font-bold text-[10px] shrink-0"
            >
              DONE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. RESPONSIVE MODULE GRID */}
      <div
        className={`grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3.5 p-1 transition-all ${
          isEditMode
            ? 'bg-[radial-gradient(#2d1b4e_1px,transparent_1px)] [background-size:16px_16px] p-2.5 rounded-2xl border border-purple-500/30'
            : ''
        }`}
      >
        {currentLayout.map((item, index) => {
          const colSpanClass =
            item.w >= 6 ? 'lg:col-span-6' : item.w >= 4 ? 'lg:col-span-4' : item.w >= 3 ? 'lg:col-span-3' : 'lg:col-span-3';

          return (
            <div key={item.instanceId} className={`${colSpanClass} col-span-1 min-h-[140px]`}>
              <ModuleRenderer
                instanceId={item.instanceId}
                moduleId={item.moduleId}
                currentWidth={item.w}
                canonical15m={canonical15m}
                dataHealthStatus={dataHealthStatus}
                feedError={feedError}
                normalizedLifecycle={normalizedLifecycle}
                localUpdatedAt={localUpdatedAt}
                ticker={btcTicker}
                ethTicker={ethTicker}
                solTicker={solTicker}
                isEditMode={isEditMode}
                onRemoveModule={() => handleRemoveModule(item.instanceId)}
                onDuplicateModule={() => handleDuplicateModule(item.instanceId)}
                onToggleExpand={() => handleToggleExpand(item.instanceId)}
                onMoveUp={() => handleMoveModule(index, 'up')}
                onMoveDown={() => handleMoveModule(index, 'down')}
              />
            </div>
          );
        })}
      </div>

      {/* Empty State warning if all modules removed */}
      {currentLayout.length === 0 && (
        <div className="p-12 bg-[#0b0e14] border border-dashed border-slate-800 rounded-2xl text-center space-y-3 font-sans">
          <LayoutGrid className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">WORKSPACE IS EMPTY</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "ADD MODULE" below or reset layout to rebuild your intelligence workstation.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              ADD MODULE
            </button>
            <button
              onClick={handleResetLayout}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              RESTORE DEFAULT
            </button>
          </div>
        </div>
      )}

      {/* 3. MODULE LIBRARY DRAWER */}
      <ModuleLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        activeModuleIds={activeModuleIds}
        onAddModule={handleAddModule}
      />

      {/* 4. CREATE WORKSPACE MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d1018] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white uppercase">CREATE WORKSPACE</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 font-mono uppercase">
                    WORKSPACE NAME
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g., BTC SCALP, 15M PREDICTION, CUSTOM"
                    className="w-full px-3 py-2 bg-[#080a0f] border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 font-mono uppercase">
                    STARTING TEMPLATE
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-auto pr-1">
                    {DEFAULT_WORKSPACES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                          selectedTemplateId === tmpl.id
                            ? 'bg-purple-950/60 border-purple-600 text-white font-bold'
                            : 'bg-[#080a0f] border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span>{tmpl.name}</span>
                          <span className="text-[10px] text-purple-400">{tmpl.layout.length} MODULES</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs"
                >
                  CREATE WORKSPACE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. RENAME WORKSPACE MODAL */}
      <AnimatePresence>
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d1018] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white uppercase">RENAME WORKSPACE</h3>
                </div>
                <button
                  onClick={() => setIsRenameModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 font-mono uppercase">
                  NEW WORKSPACE NAME
                </label>
                <input
                  type="text"
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080a0f] border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleRenameWorkspace}
                  disabled={!renameInputValue.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs"
                >
                  SAVE RENAME
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. TERMINAL PRESET PICKER MODAL */}
      <TerminalPickerModal
        isOpen={isTerminalPickerOpen}
        onClose={() => setIsTerminalPickerOpen(false)}
        onSelectPreset={handleSelectPreset}
        onBuildFromScratch={handleBuildFromScratch}
        currentActiveId={activeWorkspaceId}
      />
    </div>
  );
};
