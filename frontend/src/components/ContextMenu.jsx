import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Copy, CheckCircle, StickyNote, X } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ContextMenu({ x, y, node, onClose, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ top: y, left: x }}
      className="fixed z-[100] w-56 bg-zinc-950/90 backdrop-blur-2xl border border-white/10 rounded-sm shadow-2xl p-1 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 mb-1">
        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest truncate">
          {node.data.label}
        </p>
      </div>

      <button
        onClick={() => onAction('chat')}
        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
      >
        <MessageSquare size={14} className="text-amber-500" />
        Ask AI
      </button>

      <button
        onClick={() => onAction('copy')}
        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
      >
        <Copy size={14} className="text-blue-500" />
        Copy Path
      </button>

      <button
        onClick={() => onAction('review')}
        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
      >
        <CheckCircle size={14} className={cn(node.data.reviewed ? "text-green-500" : "text-zinc-600")} />
        {node.data.reviewed ? "Unmark Reviewed" : "Mark Reviewed"}
      </button>

      <button
        onClick={() => onAction('note')}
        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
      >
        <StickyNote size={14} className="text-purple-500" />
        {node.data.note ? "Edit Note" : "Add Note"}
      </button>

      <div className="h-[1px] bg-white/5 my-1" />

      <button
        onClick={onClose}
        className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-zinc-600 hover:text-white transition-all uppercase tracking-widest"
      >
        <X size={14} />
        Close
      </button>
    </motion.div>
  );
}
