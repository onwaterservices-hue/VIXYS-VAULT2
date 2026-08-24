import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { VixyModuleProps } from './types';
import { getModuleDefinition } from './registry/moduleRegistry';
import { ModuleHeader } from './ModuleHeader';
import { ModuleErrorState, ModuleUnavailableState } from './ModuleStates';
import { ModuleFocusModal } from './ModuleFocusModal';

interface ModuleRendererProps extends VixyModuleProps {
  instanceId: string;
  moduleId: string;
  isEditMode?: boolean;
  currentWidth?: number;
  onRemoveModule?: () => void;
  onDuplicateModule?: () => void;
  onToggleExpand?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

class SingleModuleErrorBoundary extends Component<
  { children: ReactNode; moduleId: string },
  { hasError: boolean; errorMsg?: string }
> {
  constructor(props: { children: ReactNode; moduleId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[VIXY Module Error - ${this.props.moduleId}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ModuleErrorState message={this.state.errorMsg || 'Module render error'} />;
    }
    return this.props.children;
  }
}

export const ModuleRenderer: React.FC<ModuleRendererProps> = React.memo((props) => {
  const {
    moduleId,
    isEditMode,
    currentWidth = 3,
    onRemoveModule,
    onDuplicateModule,
    onToggleExpand,
    onMoveUp,
    onMoveDown
  } = props;

  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const definition = getModuleDefinition(moduleId);

  if (!definition) {
    return (
      <div className="p-3 bg-[#0b0e14] border border-rose-500/30 rounded-xl text-rose-400 font-mono text-xs">
        UNKNOWN MODULE: {moduleId}
      </div>
    );
  }

  const TargetComponent = definition.component;

  return (
    <>
      <div
        className={`h-full flex flex-col bg-[#0b0e14] border rounded-xl overflow-hidden transition-all duration-200 group relative ${
          isEditMode
            ? 'border-dashed border-purple-500/50 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-[#0d1018]'
            : 'border-slate-800/80 hover:border-slate-700'
        }`}
      >
        <ModuleHeader
          definition={definition}
          isEditMode={isEditMode}
          currentWidth={currentWidth}
          dataHealthStatus={props.dataHealthStatus}
          onOpenFocusMode={() => setIsFocusModalOpen(true)}
          onRemoveModule={onRemoveModule}
          onDuplicateModule={onDuplicateModule}
          onToggleExpand={onToggleExpand}
        />

        <div className="flex-1 min-h-0 overflow-auto">
          {!definition.isAvailable ? (
            <ModuleUnavailableState reason={definition.unavailableReason} />
          ) : (
            <SingleModuleErrorBoundary moduleId={moduleId}>
              <TargetComponent {...props} />
            </SingleModuleErrorBoundary>
          )}
        </div>

        {/* Edit Mode Position Adjustment Controls */}
        {isEditMode && (
          <div className="px-2 py-1 bg-[#090b10] border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none">
            <div className="flex items-center gap-1">
              <span className="text-purple-400 font-bold">GRID SPAN: {currentWidth} COLS</span>
            </div>
            <div className="flex items-center gap-1">
              {onToggleExpand && (
                <button
                  onClick={onToggleExpand}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  {currentWidth >= 6 ? 'REDUCE' : 'EXPAND'}
                </button>
              )}
              {onMoveUp && (
                <button
                  onClick={onMoveUp}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                  title="Move Left/Up in Workspace"
                >
                  ▲
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={onMoveDown}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold"
                  title="Move Right/Down in Workspace"
                >
                  ▼
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ModuleFocusModal
        {...props}
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
      />
    </>
  );
});

ModuleRenderer.displayName = 'ModuleRenderer';
