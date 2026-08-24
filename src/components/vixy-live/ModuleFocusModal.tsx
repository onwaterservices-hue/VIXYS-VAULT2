import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Maximize2 } from 'lucide-react';
import { VixyModuleProps } from './types';
import { getModuleDefinition } from './registry/moduleRegistry';

interface ModuleFocusModalProps extends VixyModuleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModuleFocusModal: React.FC<ModuleFocusModalProps> = (props) => {
  const { isOpen, onClose, moduleId } = props;
  const definition = getModuleDefinition(moduleId);

  if (!isOpen || !definition) return null;

  const TargetComponent = definition.focusComponent || definition.component;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-5xl max-h-[88vh] bg-[#0b0e14] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 bg-[#0e121a] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white font-sans uppercase tracking-wider">
                    {definition.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-purple-400 font-bold">
                    FOCUS INSPECTOR
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  {definition.description}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Expanded Content Area */}
          <div className="flex-1 overflow-auto p-6 bg-[#080a0f]">
            <TargetComponent {...props} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
