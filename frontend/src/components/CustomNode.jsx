import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  FileCode, 
  Database, 
  Server, 
  Component, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Palette, 
  Settings, 
  Image as ImageIcon, 
  Beaker, 
  Sparkles, 
  CheckCircle2, 
  StickyNote
} from 'lucide-react';

export default function CustomNode({ data, selected }) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeout = React.useRef(null);

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovered(false);
  };

  const getIcon = () => {
    if (data.isFolder) {
      return data.collapsed ? <Folder className="w-4 h-4 text-amber-500" /> : <FolderOpen className="w-4 h-4 text-amber-500" />;
    }
    switch (data.type) {
      case 'frontend': return <Component className="w-4 h-4 text-blue-400" />;
      case 'backend': return <Server className="w-4 h-4 text-emerald-400" />;
      case 'style': return <Palette className="w-4 h-4 text-pink-400" />;
      case 'config': return <Settings className="w-4 h-4 text-amber-400" />;
      case 'asset': return <ImageIcon className="w-4 h-4 text-indigo-400" />;
      case 'test': return <Beaker className="w-4 h-4 text-rose-400" />;
      default: return <FileCode className="w-4 h-4 text-zinc-400" />;
    }
  };

  const isHeatmap = data.heatmapActive;
  const comp = data.complexity || 'low';
  const loc = data.loc || 0;

  // 3.2 Sizing logic
  const sizeClass = data.isFolder ? "min-w-[200px]" : 
    loc > 150 ? "min-w-[280px] min-h-[120px]" :
    loc > 30 ? "min-w-[240px] min-h-[100px]" :
    "min-w-[200px]";

  let glowClass = selected ? "bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "bg-white/20 group-hover:bg-white/40";
  let borderColorClass = selected ? "border-white/20 bg-white/5" : "border-white/10 hover:bg-white/[0.02]";

  if (isHeatmap) {
    if (comp === 'high') {
      glowClass = "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]";
      borderColorClass = "border-red-500/30 bg-red-500/[0.02]";
    } else if (comp === 'medium') {
      glowClass = "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.8)]";
      borderColorClass = "border-amber-500/30 bg-amber-500/[0.02]";
    } else {
      glowClass = "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]";
      borderColorClass = "border-green-500/30 bg-green-500/[0.02]";
    }
  } else if (!data.isFolder) {
    // 3.1 Taxonomy colors
    switch (data.type) {
      case 'frontend': glowClass = "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"; break;
      case 'backend': glowClass = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"; break;
      case 'style': glowClass = "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.4)]"; break;
      case 'config': glowClass = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"; break;
      case 'asset': glowClass = "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"; break;
      case 'test': glowClass = "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"; break;
      default: glowClass = "bg-zinc-500 shadow-[0_0_10px_rgba(113,113,122,0.4)]"; break;
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition={{ 
        type: 'spring', 
        stiffness: 100, 
        damping: 30, 
        mass: 2,
        delay: (data.index || 0) * 0.02 
      }}
      className={cn(
        "relative flex flex-col p-4 rounded-sm border-y border-r bg-zinc-950/60 backdrop-blur-xl",
        "shadow-[20px_20px_60px_rgba(0,0,0,0.5)] transition-all duration-500 group",
        sizeClass,
        data.collapsed && "min-w-[150px] min-h-0 p-2",
        borderColorClass
      )}
    >
      <AnimatePresence>
        {isHovered && !selected && data.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-4 w-[240px] p-4 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-sm shadow-2xl z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
              <Sparkles size={10} className="text-amber-500" />
              Intelligence Brief
            </div>
            <p className="text-[10px] leading-relaxed text-zinc-300 font-mono italic line-clamp-4">
              {data.summary}
            </p>
            <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-zinc-900 border-b border-r border-white/10 rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Industrial Glowing Left Border */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-500",
          glowClass
        )} 
      />

      <div className={cn("flex items-start gap-4", data.collapsed && "gap-2")}>
        <div className={cn("mt-1 p-2 bg-white/5 border border-white/5 rounded-sm", data.collapsed && "p-1")}>
          {getIcon()}
        </div>
        <div className="flex flex-col gap-1 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase truncate">
              {data.isFolder ? (data.collapsed ? `Folder (${data.childCount || 0})` : 'Folder') : (data.type || 'Module')}
            </span>
            <div className="flex items-center gap-1">
              {data.reviewed && <CheckCircle2 size={12} className="text-green-500" />}
              {data.isFolder && (
                <div className="text-zinc-600">
                  {data.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </div>
              )}
            </div>
          </div>
          <span className={cn("text-sm font-medium text-zinc-100 tracking-tight truncate w-full", data.collapsed && "text-xs")}>
            {data.collapsed && data.isFolder ? `▶ ${data.label}` : data.label}
          </span>
          {data.note && !data.collapsed && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-purple-500/5 border border-purple-500/20 rounded-sm">
              <StickyNote size={10} className="text-purple-400 shrink-0" />
              <p className="text-[9px] text-zinc-400 truncate">{data.note}</p>
            </div>
          )}
          {data.metadata && !data.collapsed && (
            <div className="mt-2 space-y-1">
              {data.metadata.deps !== undefined && (
                <div className="text-[8px] text-zinc-500 uppercase font-mono">
                  Dependencies: {data.metadata.deps}
                </div>
              )}
              {data.metadata.packages !== undefined && (
                <div className="text-[8px] text-zinc-500 uppercase font-mono">
                  Packages: {data.metadata.packages}
                </div>
              )}
              {data.metadata.keys && (
                <div className="text-[8px] text-zinc-500 uppercase font-mono truncate">
                  Keys: {data.metadata.keys.join(', ')}
                </div>
              )}
            </div>
          )}
          {isHeatmap && !data.collapsed && (
            <span className="text-[8px] font-mono text-zinc-400 mt-1">
              LOC: {data.loc}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 rounded-full bg-white/10 border-none opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 rounded-full bg-white/10 border-none opacity-0"
      />
    </motion.div>
  );
}
