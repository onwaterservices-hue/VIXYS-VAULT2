import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus,
  Compass,
  Sparkles,
  Lock,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Zap,
  TrendingUp,
  BarChart2,
  Layers,
  Activity,
  Radio,
  Eye,
  Database,
  Search,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Copy,
  Trash2,
  RotateCcw,
  Sliders,
  Check,
  Crown,
  LayoutGrid,
  Grid,
  FileText,
  Clock,
  Crosshair,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { BTCTicker } from '../types';
import { useCanonical15mDecision, getNormalizedLifecycleState } from '../hooks/useCanonical15mDecision';
import {
  VIXY_LIVE_MODULES,
  INITIAL_EMPTY_WORKSPACE_BOXES,
  WorkspaceBox,
  WorkspaceLayout,
  ModuleSize,
  ModuleCategory,
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

  // High precision second timer
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Multiple Workspaces Management
  const [workspaces, setWorkspaces] = useState<WorkspaceLayout[]>(() => {
    try {
      const cached = localStorage.getItem('vixy_live_workspaces_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [
      {
        id: 'workspace-default',
        name: 'MY DESK',
        boxes: INITIAL_EMPTY_WORKSPACE_BOXES,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    return localStorage.getItem('vixy_live_active_workspace_id') || 'workspace-default';
  });

  // Current active workspace
  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || {
      id: 'workspace-default',
      name: 'MY DESK',
      boxes: INITIAL_EMPTY_WORKSPACE_BOXES,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }, [workspaces, activeWorkspaceId]);

  const boxes = activeWorkspace.boxes;

  // UI State
  const [isCustomizeMode, setIsCustomizeMode] = useState<boolean>(false);
  const [activePickerBoxId, setActivePickerBoxId] = useState<string | null>(null);
  const [expandedIntelligenceId, setExpandedIntelligenceId] = useState<string | null>(null);
  const [openDropdownBoxId, setOpenDropdownBoxId] = useState<string | null>(null);
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState<boolean>(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState<string>(activeWorkspace.name);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');

  // Search & Filter in Intelligence Picker Modal
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory | 'ALL'>('ALL');

  // Load from Firestore on Mount
  useEffect(() => {
    if (!currentUserId || currentUserId === 'guest') return;

    let isMounted = true;
    async function loadWorkspaceFromFirestore() {
      try {
        const userDocRef = doc(db, 'users', currentUserId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data?.vixyLiveWorkspace?.workspaces && Array.isArray(data.vixyLiveWorkspace.workspaces)) {
            if (isMounted) {
              setWorkspaces(data.vixyLiveWorkspace.workspaces);
              if (data.vixyLiveWorkspace.activeWorkspaceId) {
                setActiveWorkspaceId(data.vixyLiveWorkspace.activeWorkspaceId);
              }
            }
          } else if (data?.vixyLiveWorkspace?.boxes && Array.isArray(data.vixyLiveWorkspace.boxes)) {
            // Legacy format migration
            if (isMounted) {
              const migrated: WorkspaceLayout = {
                id: 'workspace-default',
                name: 'MY DESK',
                boxes: data.vixyLiveWorkspace.boxes,
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              setWorkspaces([migrated]);
              setActiveWorkspaceId(migrated.id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch workspace from Firestore:', err);
      }
    }

    loadWorkspaceFromFirestore();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // Debounced Auto-Save to localStorage and Firestore (~1s)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutoSave = useCallback((newWorkspaces: WorkspaceLayout[], newActiveId: string) => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('vixy_live_workspaces_v2', JSON.stringify(newWorkspaces));
      localStorage.setItem('vixy_live_active_workspace_id', newActiveId);
    } catch {}

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (currentUserId && currentUserId !== 'guest') {
        try {
          const userDocRef = doc(db, 'users', currentUserId);
          await setDoc(
            userDocRef,
            {
              vixyLiveWorkspace: {
                workspaces: newWorkspaces,
                activeWorkspaceId: newActiveId,
                updatedAt: Date.now()
              }
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Failed to auto-save to Firestore:', err);
        }
      }
      setSaveStatus('saved');
    }, 1000);
  }, [currentUserId]);

  // Update boxes in active workspace
  const updateActiveBoxes = useCallback((newBoxes: WorkspaceBox[]) => {
    setWorkspaces((prev) => {
      const next = prev.map((w) => {
        if (w.id === activeWorkspace.id) {
          return {
            ...w,
            boxes: newBoxes,
            updatedAt: Date.now()
          };
        }
        return w;
      });
      triggerAutoSave(next, activeWorkspace.id);
      return next;
    });
  }, [activeWorkspace.id, triggerAutoSave]);

  // Gate Check Helper
  const handleProGate = (action: () => void) => {
    if (!isProOrAdmin) {
      if (onOpenPricing) {
        onOpenPricing();
      }
      return;
    }
    action();
  };

  // Add a new empty Box Container
  const handleAddEmptyBox = () => {
    handleProGate(() => {
      const newBox: WorkspaceBox = {
        id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        intelligenceId: null, // EMPTY BOX
        size: 'small',
        collapsed: false
      };
      updateActiveBoxes([...boxes, newBox]);
    });
  };

  // Assign or Swap Intelligence in a Box
  const handleAssignIntelligence = (boxId: string, intelligenceId: string) => {
    handleProGate(() => {
      const newBoxes = boxes.map((box) => {
        if (box.id === boxId) {
          return {
            ...box,
            intelligenceId
          };
        }
        return box;
      });
      updateActiveBoxes(newBoxes);
      setActivePickerBoxId(null);
    });
  };

  // Clear Intelligence (Box container stays in place, intelligenceId becomes null)
  const handleClearIntelligence = (boxId: string) => {
    handleProGate(() => {
      const newBoxes = boxes.map((box) => {
        if (box.id === boxId) {
          return {
            ...box,
            intelligenceId: null
          };
        }
        return box;
      });
      updateActiveBoxes(newBoxes);
      setOpenDropdownBoxId(null);
    });
  };

  // Delete Box Container completely
  const handleDeleteBox = (boxId: string) => {
    handleProGate(() => {
      const newBoxes = boxes.filter((box) => box.id !== boxId);
      updateActiveBoxes(newBoxes);
      setOpenDropdownBoxId(null);
    });
  };

  // Duplicate Box
  const handleDuplicateBox = (boxId: string) => {
    handleProGate(() => {
      const target = boxes.find((b) => b.id === boxId);
      if (!target) return;
      const duplicated: WorkspaceBox = {
        ...target,
        id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      };
      const index = boxes.findIndex((b) => b.id === boxId);
      const newBoxes = [...boxes];
      newBoxes.splice(index + 1, 0, duplicated);
      updateActiveBoxes(newBoxes);
      setOpenDropdownBoxId(null);
    });
  };

  // Change Box Size
  const handleResizeBox = (boxId: string, size: ModuleSize) => {
    handleProGate(() => {
      const newBoxes = boxes.map((box) => {
        if (box.id === boxId) {
          return {
            ...box,
            size
          };
        }
        return box;
      });
      updateActiveBoxes(newBoxes);
      setOpenDropdownBoxId(null);
    });
  };

  // Toggle Minimize Box
  const handleToggleMinimize = (boxId: string) => {
    const newBoxes = boxes.map((box) => {
      if (box.id === boxId) {
        return {
          ...box,
          collapsed: !box.collapsed
        };
      }
      return box;
    });
    updateActiveBoxes(newBoxes);
  };

  // Reset to Empty Canvas (4 fresh empty slots)
  const handleResetToEmptyCanvas = () => {
    handleProGate(() => {
      updateActiveBoxes([
        { id: `box-${Date.now()}-1`, intelligenceId: null, size: 'small', collapsed: false },
        { id: `box-${Date.now()}-2`, intelligenceId: null, size: 'small', collapsed: false },
        { id: `box-${Date.now()}-3`, intelligenceId: null, size: 'medium', collapsed: false },
        { id: `box-${Date.now()}-4`, intelligenceId: null, size: 'medium', collapsed: false }
      ]);
    });
  };

  // Create New Empty Workspace
  const handleCreateNewWorkspace = () => {
    handleProGate(() => {
      const newWs: WorkspaceLayout = {
        id: `workspace-${Date.now()}`,
        name: `DESK ${workspaces.length + 1}`,
        boxes: [
          { id: `box-${Date.now()}-1`, intelligenceId: null, size: 'small', collapsed: false },
          { id: `box-${Date.now()}-2`, intelligenceId: null, size: 'small', collapsed: false },
          { id: `box-${Date.now()}-3`, intelligenceId: null, size: 'medium', collapsed: false }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const next = [...workspaces, newWs];
      setWorkspaces(next);
      setActiveWorkspaceId(newWs.id);
      triggerAutoSave(next, newWs.id);
    });
  };

  // Filtered Modules for Picker Modal
  const filteredModules = useMemo(() => {
    return VIXY_LIVE_MODULES.filter((mod) => {
      const matchesSearch =
        mod.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        mod.description.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        mod.category.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || mod.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [pickerSearch, selectedCategory]);

  return (
    <div className="w-full min-h-screen bg-[#07050f] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* ================= TOP COMMAND DECK ================= */}
      <div className="border-b border-purple-900/30 bg-[#0a0718]/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Workspace Title & Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-800/50 text-purple-300 shadow-inner">
                <LayoutGrid className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {isRenamingWorkspace ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={workspaceNameInput}
                        onChange={(e) => setWorkspaceNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (workspaceNameInput.trim()) {
                              const next = workspaces.map((w) =>
                                w.id === activeWorkspace.id ? { ...w, name: workspaceNameInput.trim() } : w
                              );
                              setWorkspaces(next);
                              triggerAutoSave(next, activeWorkspace.id);
                            }
                            setIsRenamingWorkspace(false);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-[#130d2d] border border-purple-600 text-sm font-bold font-mono text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (workspaceNameInput.trim()) {
                            const next = workspaces.map((w) =>
                              w.id === activeWorkspace.id ? { ...w, name: workspaceNameInput.trim() } : w
                            );
                            setWorkspaces(next);
                            triggerAutoSave(next, activeWorkspace.id);
                          }
                          setIsRenamingWorkspace(false);
                        }}
                        className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group">
                      <h1 className="text-base sm:text-lg font-black font-sans tracking-tight text-white flex items-center gap-2">
                        {activeWorkspace.name}
                      </h1>
                      <button
                        onClick={() => {
                          setWorkspaceNameInput(activeWorkspace.name);
                          setIsRenamingWorkspace(true);
                        }}
                        title="Rename workspace"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-300 transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Multi-workspace Switcher Dropdown */}
                  {workspaces.length > 1 && (
                    <select
                      value={activeWorkspaceId}
                      onChange={(e) => {
                        setActiveWorkspaceId(e.target.value);
                        localStorage.setItem('vixy_live_active_workspace_id', e.target.value);
                      }}
                      className="bg-[#120c2b] border border-purple-900/50 rounded-lg text-xs font-mono text-slate-300 px-2 py-1 focus:outline-none focus:border-purple-500"
                    >
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.boxes.length} boxes)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="text-[10px] text-purple-400/80 font-mono tracking-wider">
                  VIXY LIVE BUILDER • EMPTY CANVAS WORKSPACE
                </div>
              </div>
            </div>

            {/* Auto-save status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d091e] border border-purple-900/30 text-[10px] font-mono">
              {saveStatus === 'saving' ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  <span className="text-purple-300">SAVING...</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">SAVED</span>
                </>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Add Box Button */}
            <button
              onClick={handleAddEmptyBox}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD BOX</span>
            </button>

            {/* Customize Mode Toggle */}
            <button
              onClick={() => {
                handleProGate(() => setIsCustomizeMode(!isCustomizeMode));
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                isCustomizeMode
                  ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-inner'
                  : 'bg-[#120c2b] border-purple-900/40 text-slate-300 hover:border-purple-700/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>{isCustomizeMode ? 'DONE' : 'CUSTOMIZE'}</span>
            </button>

            {/* New Workspace */}
            <button
              onClick={handleCreateNewWorkspace}
              title="Create new blank desk"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#120c2b] hover:bg-purple-950/60 border border-purple-900/40 text-slate-300 hover:text-white font-mono text-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW DESK</span>
            </button>

            {/* Reset to Empty Canvas */}
            <button
              onClick={handleResetToEmptyCanvas}
              title="Reset workspace to empty canvas"
              className="p-1.5 rounded-xl bg-[#120c2b] hover:bg-purple-950/60 border border-purple-900/40 text-slate-400 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Pro Status / Upgrade Button */}
            {!isProOrAdmin && (
              <button
                onClick={onOpenPricing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500/40 text-purple-200 hover:text-white font-mono text-xs font-bold transition-all shadow-sm"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>UNLOCK PRO</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pro Hint for Free/Starter Users */}
      {!isProOrAdmin && (
        <div className="bg-purple-950/30 border-b border-purple-900/20 px-4 py-1.5 text-center text-xs font-mono text-purple-300/80">
          Viewing standard canvas. <span onClick={onOpenPricing} className="text-purple-200 underline cursor-pointer font-bold">Unlock custom box building with Pro</span>
        </div>
      )}

      {/* ================= MAIN EMPTY-CANVAS GRID ================= */}
      <div className="flex-1 p-4 sm:p-6 max-w-[1720px] w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boxes.map((box) => {
            const isAssigned = Boolean(box.intelligenceId);
            const intelligenceDef = VIXY_LIVE_MODULES.find((m) => m.id === box.intelligenceId);
            const Component = box.intelligenceId ? MODULE_COMPONENT_MAP[box.intelligenceId] : null;
            const spanClass = getSizeSpanClass(box.size);

            return (
              <div
                key={box.id}
                className={`${spanClass} transition-all duration-200 flex flex-col`}
              >
                {/* ================= FILLED INTELLIGENCE BOX ================= */}
                {isAssigned && Component ? (
                  <div className="relative group bg-[#0e0b1c] border border-purple-900/40 hover:border-purple-600/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all h-full min-h-[170px]">
                    {/* Top Right Box Hover Toolbar */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {/* Expand Button */}
                      <button
                        onClick={() => setExpandedIntelligenceId(box.intelligenceId)}
                        title="Expand intelligence focus"
                        className="p-1.5 rounded-lg bg-[#191333]/90 hover:bg-purple-800/80 border border-purple-700/50 text-slate-300 hover:text-white transition-all shadow-sm"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Minimize / Restore */}
                      <button
                        onClick={() => handleToggleMinimize(box.id)}
                        title={box.collapsed ? 'Restore' : 'Minimize'}
                        className="p-1.5 rounded-lg bg-[#191333]/90 hover:bg-purple-800/80 border border-purple-700/50 text-slate-300 hover:text-white transition-all shadow-sm"
                      >
                        {box.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* ⋮ Dropdown Menu Trigger */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdownBoxId(openDropdownBoxId === box.id ? null : box.id)}
                          title="Box actions"
                          className="p-1.5 rounded-lg bg-[#191333]/90 hover:bg-purple-800/80 border border-purple-700/50 text-slate-300 hover:text-white transition-all shadow-sm"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {openDropdownBoxId === box.id && (
                          <div className="absolute right-0 top-8 w-48 rounded-xl bg-[#140e2d] border border-purple-700/60 shadow-2xl p-1.5 z-40 text-xs font-mono">
                            <button
                              onClick={() => {
                                setOpenDropdownBoxId(null);
                                setActivePickerBoxId(box.id);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-900/60 text-purple-200 flex items-center gap-2"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              <span>Change Intelligence</span>
                            </button>

                            <div className="my-1 border-t border-purple-900/40" />

                            {/* Size submenu */}
                            <div className="px-2.5 py-1 text-[10px] text-slate-400 uppercase font-bold">Size</div>
                            <div className="grid grid-cols-2 gap-1 px-1 mb-1">
                              {(['small', 'medium', 'large', 'full-width'] as ModuleSize[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleResizeBox(box.id, s)}
                                  className={`px-2 py-1 rounded text-[10px] uppercase font-bold text-center border ${
                                    box.size === s
                                      ? 'bg-purple-600 text-white border-purple-500'
                                      : 'bg-purple-950/40 text-slate-300 border-purple-900/40 hover:bg-purple-900/40'
                                  }`}
                                >
                                  {s === 'full-width' ? 'Full' : s}
                                </button>
                              ))}
                            </div>

                            <div className="my-1 border-t border-purple-900/40" />

                            <button
                              onClick={() => handleDuplicateBox(box.id)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-900/60 text-slate-300 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicate Box</span>
                            </button>

                            <button
                              onClick={() => handleClearIntelligence(box.id)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-900/60 text-amber-300 flex items-center gap-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                              <span>Clear Intelligence</span>
                            </button>

                            <button
                              onClick={() => handleDeleteBox(box.id)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-300 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Delete Box</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Box Content */}
                    {box.collapsed ? (
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {intelligenceDef?.icon && <intelligenceDef.icon className="w-4 h-4 text-purple-400" />}
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {intelligenceDef?.title || 'INTELLIGENCE'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-purple-400/70">MINIMIZED</span>
                      </div>
                    ) : (
                      <Component
                        canonical15m={canonical15m}
                        ticker={ticker}
                        dataHealthStatus={dataHealthStatus}
                        localUpdatedAt={localUpdatedAt}
                        nowMs={nowMs}
                        boxId={box.id}
                        boxSize={box.size}
                        onOpenTerminal={onOpenTerminal}
                        onOpenReplay={onOpenReplay}
                        onOpenPricing={onOpenPricing}
                        onExpandModule={(id) => setExpandedIntelligenceId(id)}
                        isEditMode={isCustomizeMode}
                      />
                    )}
                  </div>
                ) : (
                  /* ================= EMPTY BOX CONTAINER ================= */
                  <div
                    onClick={() => setActivePickerBoxId(box.id)}
                    className="relative group cursor-pointer bg-[#0d091b]/50 hover:bg-[#120c27]/70 border-2 border-dashed border-purple-900/40 hover:border-purple-500/70 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 min-h-[170px] h-full shadow-[inset_0_0_20px_rgba(147,51,234,0.03)]"
                  >
                    {/* Top right box controls for empty container */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        onClick={() => handleDeleteBox(box.id)}
                        title="Remove empty box"
                        className="p-1 rounded-lg bg-[#191333]/90 hover:bg-rose-950/80 border border-purple-800/40 text-slate-400 hover:text-rose-300 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Center Add Intelligence State */}
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-purple-950/60 group-hover:bg-purple-900/80 border border-purple-800/50 group-hover:border-purple-400/80 text-purple-300 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-[0_0_15px_rgba(147,51,234,0.15)] group-hover:scale-110">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-200 group-hover:text-white uppercase tracking-wider">
                          + ADD INTELLIGENCE
                        </div>
                        <div className="text-[11px] text-purple-400/70 font-mono mt-0.5">
                          Choose what lives here
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Append Box Action */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleAddEmptyBox}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0e0a22]/80 hover:bg-purple-950/60 border border-dashed border-purple-800/40 hover:border-purple-500/70 text-purple-300 hover:text-white font-mono text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADD NEW BOX CONTAINER</span>
          </button>
        </div>
      </div>

      {/* ================= MODULE MENU / INTELLIGENCE PICKER MODAL ================= */}
      <AnimatePresence>
        {activePickerBoxId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-4xl max-h-[85vh] bg-[#0c081c] border border-purple-800/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-purple-900/40 flex items-center justify-between bg-[#110b27]">
                <div>
                  <h2 className="text-lg font-black font-sans text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    SELECT INTELLIGENCE
                  </h2>
                  <p className="text-xs text-purple-300/80 font-mono mt-0.5">
                    Assign a quantitative feed to this box container
                  </p>
                </div>
                <button
                  onClick={() => setActivePickerBoxId(null)}
                  className="p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Category Filter Tabs */}
              <div className="p-4 border-b border-purple-900/30 bg-[#0e0a22] flex flex-col gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search intelligence (e.g. 15m decision, momentum, order flow, chart, radar...)"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#140e2f] border border-purple-900/50 focus:border-purple-500 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none"
                    autoFocus
                  />
                  {pickerSearch && (
                    <button
                      onClick={() => setPickerSearch('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {(['ALL', 'CORE', 'MARKET', 'INTELLIGENCE', 'SYSTEM', 'PERSONAL'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                        selectedCategory === cat
                          ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                          : 'bg-[#140e2f] text-slate-400 border-purple-900/30 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module List Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredModules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleAssignIntelligence(activePickerBoxId, mod.id)}
                      className="group text-left p-4 rounded-2xl bg-[#120c2b] hover:bg-[#1b123d] border border-purple-900/40 hover:border-purple-500/80 transition-all duration-150 flex items-start gap-3.5 shadow-sm"
                    >
                      <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-800/50 text-purple-300 group-hover:text-white group-hover:bg-purple-900/80 transition-all shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-black font-sans text-white group-hover:text-purple-200 truncate">
                            {mod.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-950/80 text-purple-300 border border-purple-800/40">
                            {mod.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 group-hover:text-slate-300 font-sans mt-1 line-clamp-2 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {filteredModules.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-500 font-mono text-xs">
                    No intelligence modules found matching "{pickerSearch}"
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= EXPANDED FOCUS MODAL ================= */}
      <AnimatePresence>
        {expandedIntelligenceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-4xl max-h-[85vh] bg-[#0c081c] border border-purple-700/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-purple-900/40 flex items-center justify-between bg-[#110b27]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-950 border border-purple-800/40 text-purple-300">
                    <Maximize2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black font-sans text-white uppercase tracking-wide">
                      {VIXY_LIVE_MODULES.find((m) => m.id === expandedIntelligenceId)?.title || 'EXPANDED INTELLIGENCE'}
                    </h2>
                    <span className="text-[10px] font-mono text-purple-400">HIGH FIDELITY FOCUS VIEW</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedIntelligenceId(null)}
                  className="p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {(() => {
                  const Component = MODULE_COMPONENT_MAP[expandedIntelligenceId];
                  if (!Component) return <div className="text-slate-400 font-mono text-xs">No preview available</div>;
                  return (
                    <div className="p-6 rounded-2xl bg-[#0f0b24] border border-purple-900/40">
                      <Component
                        canonical15m={canonical15m}
                        ticker={ticker}
                        dataHealthStatus={dataHealthStatus}
                        localUpdatedAt={localUpdatedAt}
                        nowMs={nowMs}
                        boxId="expanded"
                        boxSize="large"
                        onOpenTerminal={onOpenTerminal}
                        onOpenReplay={onOpenReplay}
                        onOpenPricing={onOpenPricing}
                        isEditMode={false}
                      />
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
