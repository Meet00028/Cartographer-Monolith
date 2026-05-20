import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Download, FileDown, Loader2, Search, Filter, X, Home, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TopNav({ 
  heatmapActive, 
  onToggleHeatmap, 
  onExport, 
  onGenerateDocs, 
  isGeneratingDocs,
  searchQuery,
  onSearchChange,
  typeFilters,
  onFilterChange,
  layoutMode,
  onLayoutChange,
  onHome,
  onRefresh,
  onExportPNG
}) {
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        onSearchChange('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, mass: 1.5 }}
      className="absolute top-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-sm bg-zinc-950/80 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
    >
      <button 
        onClick={onHome}
        className="p-3 text-zinc-500 hover:text-white transition-all border border-transparent hover:border-white/10 rounded-sm"
      >
        <Home size={16} />
      </button>

      <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

      {/* Search Input */}
      <div className="relative flex items-center ml-2 group">
        <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-500 group-focus-within:text-white transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="SEARCH NODES (CMD+K)"
          className="bg-white/5 border border-white/5 focus:border-white/20 rounded-sm pl-10 pr-4 py-2 text-[10px] font-bold tracking-[0.1em] text-white placeholder:text-zinc-600 focus:outline-none w-48 transition-all focus:w-64 uppercase"
        />
        {searchQuery && (
          <button 
            onClick={() => onSearchChange('')}
            className="absolute right-2 p-1 text-zinc-500 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="w-[1px] h-6 bg-white/10 mx-2"></div>

      {/* Filter Dropdown (Simplified for now) */}
      <div className="flex items-center gap-2 px-2">
        {Object.keys(typeFilters).map((type) => (
          <button
            key={type}
            onClick={() => onFilterChange(type)}
            className={cn(
              "px-2 py-1 rounded-sm text-[8px] font-bold tracking-widest uppercase border transition-all",
              typeFilters[type] 
                ? "bg-white/10 border-white/20 text-white" 
                : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="w-[1px] h-6 bg-white/10 mx-2"></div>

      {/* Layout Toggle */}
      <div className="flex items-center gap-1 px-2">
        {['tree', 'radial', 'force'].map((mode) => (
          <button
            key={mode}
            onClick={() => onLayoutChange(mode)}
            className={cn(
              "px-3 py-1.5 rounded-sm text-[8px] font-bold tracking-widest uppercase border transition-all",
              layoutMode === mode 
                ? "bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]" 
                : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="w-[1px] h-6 bg-white/10 mx-2"></div>

      <button
        onClick={onToggleHeatmap}
        className={cn(
          "p-3 rounded-sm border transition-all",
          heatmapActive ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-white/5 border-white/10 text-zinc-500 hover:text-white"
        )}
      >
        <Activity size={16} />
      </button>

      <button
        onClick={onRefresh}
        className="p-3 bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all rounded-sm"
      >
        <RotateCcw size={16} />
      </button>

      <button
        onClick={onExportPNG}
        className="p-3 bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all rounded-sm"
      >
        <ImageIcon size={16} />
      </button>

      <button
        onClick={onExport}
        className="p-3 bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all rounded-sm"
      >
        <Download size={16} />
      </button>

      <button
        onClick={onGenerateDocs}
        disabled={isGeneratingDocs}
        className="p-3 bg-white/5 border border-white/10 text-zinc-500 hover:text-white transition-all rounded-sm disabled:opacity-50"
      >
        {isGeneratingDocs ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
      </button>
    </motion.div>
  );
}
