import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Search, Check, Layers, Sliders, Activity, Globe, History, Sparkles } from 'lucide-react';
import { getAllModulesList } from './registry/moduleRegistry';
import { VixyModuleDefinition, ModuleCategory } from './types';

interface ModuleLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleIds: string[];
  onAddModule: (definition: VixyModuleDefinition) => void;
}

const CATEGORIES: ModuleCategory[] = [
  'VIXY',
  'MARKET',
  'INTELLIGENCE',
  'CROSS-VENUE',
  'HISTORY'
];

export const ModuleLibrary: React.FC<ModuleLibraryProps> = ({
  isOpen,
  onClose,
  activeModuleIds,
  onAddModule
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const allModules = getAllModulesList();

  const filteredModules = allModules.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-md h-full bg-[#0b0e14] border-l border-slate-800 flex flex-col font-mono text-slate-200 shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 bg-[#0e121a] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white font-sans uppercase tracking-wider">
                  MODULE LIBRARY
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="p-4 border-b border-slate-800/80 space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search intelligence modules..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#0e121a] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded text-[10px] font-sans font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#0e121a] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ALL
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-[10px] font-sans font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0e121a] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Module Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredModules.map((m) => {
                const isAdded = activeModuleIds.includes(m.id);

                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl bg-[#0e121a] border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-sans uppercase">
                          {m.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-mono">
                          {m.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onAddModule(m)}
                      disabled={isAdded}
                      className={`px-2.5 py-1 rounded text-xs font-sans font-bold shrink-0 transition-all flex items-center gap-1 ${
                        isAdded
                          ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-default'
                          : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>ADDED</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>ADD</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
