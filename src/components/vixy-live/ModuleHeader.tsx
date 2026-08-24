import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Maximize2, Settings, X, MoreVertical, Copy, Expand, Shrink, Trash2, AlertTriangle, WifiOff } from 'lucide-react';
import { VixyModuleDefinition } from './types';
import { FeedHealthStatus } from '../../hooks/useCanonical15mDecision';

interface ModuleHeaderProps {
  definition: VixyModuleDefinition;
  isEditMode?: boolean;
  currentWidth?: number;
  dataHealthStatus?: FeedHealthStatus;
  onOpenFocusMode?: () => void;
  onRemoveModule?: () => void;
  onDuplicateModule?: () => void;
  onToggleExpand?: () => void;
  onOpenSettings?: () => void;
  customBadge?: React.ReactNode;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  definition,
  isEditMode,
  currentWidth = 3,
  dataHealthStatus,
  onOpenFocusMode,
  onRemoveModule,
  onDuplicateModule,
  onToggleExpand,
  onOpenSettings,
  customBadge
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-9 px-3 py-1.5 bg-[#0e121a] border-b border-slate-800/80 flex items-center justify-between font-mono text-xs select-none">
      <div className="flex items-center gap-2 overflow-hidden">
        {isEditMode && (
          <div className="drag-handle text-slate-500 hover:text-purple-400 cursor-grab active:cursor-grabbing p-0.5">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
        <span className="font-sans font-bold text-white uppercase text-[11px] tracking-wider truncate">
          {definition.name}
        </span>
        {customBadge}
        {dataHealthStatus === 'STALE' && (
          <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800 text-[9px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            STALE
          </span>
        )}
        {(dataHealthStatus === 'DISCONNECTED' || dataHealthStatus === 'API_ERROR') && (
          <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[9px] font-bold flex items-center gap-1">
            <WifiOff className="w-2.5 h-2.5" />
            OFFLINE
          </span>
        )}
        {definition.requiredEntitlement && (
          <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800 text-[9px] font-bold">
            {definition.requiredEntitlement}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-slate-400 shrink-0">
        {!definition.isAvailable && (
          <span className="text-[9.5px] font-sans text-amber-400/90 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40 mr-1">
            OFFLINE
          </span>
        )}

        {/* Focus Mode quick button */}
        {onOpenFocusMode && definition.isAvailable && (
          <button
            onClick={onOpenFocusMode}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Focus Mode"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}

        {/* Options Dropdown ⋮ */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Module Options"
          >
            <MoreVertical className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#0e121a] border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs font-sans">
              {onToggleExpand && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleExpand();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
                >
                  {currentWidth >= 6 ? (
                    <>
                      <Shrink className="w-3.5 h-3.5 text-purple-400" />
                      <span>Collapse Width</span>
                    </>
                  ) : (
                    <>
                      <Expand className="w-3.5 h-3.5 text-purple-400" />
                      <span>Expand Width</span>
                    </>
                  )}
                </button>
              )}

              {onOpenFocusMode && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFocusMode();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Focus View</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configure</span>
                </button>
              )}

              {onDuplicateModule && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicateModule();
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate</span>
                </button>
              )}

              {onRemoveModule && (
                <>
                  <div className="my-1 border-t border-slate-800/80" />
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRemoveModule();
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition-colors text-left font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Module</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
