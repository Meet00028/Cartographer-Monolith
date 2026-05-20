import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Code2, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // Added this
import { cn } from '../lib/utils';

export default function IntelligenceDrawer({ node, onClose, onChatUpdate }) {
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const messagesEndRef = useRef(null);

  // Read history directly from the node data so it never disappears
  const chatHistory = node.data.chatHistory || [];
  const summary = node.data.summary || "Analyzing codebase architecture...";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatting]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg = { role: 'user', text: chatInput.trim() };
    setChatInput('');
    
    // Send to parent to save in node state
    onChatUpdate(node.id, userMsg);
    setIsChatting(true);

    try {
      const res = await fetch("http://localhost:8001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: node.data.label,
          code_content: node.data.code,
          prompt: userMsg.text
        }),
      });

      const data = await res.json();
      onChatUpdate(node.id, { role: 'ai', text: data.summary });
    } catch (err) {
      onChatUpdate(node.id, { role: 'ai', text: `[SYSTEM_ERROR]: ${err.message}` });
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 80, damping: 25, mass: 1.5 }}
      className="absolute top-0 right-0 h-full w-[500px] bg-zinc-950/90 backdrop-blur-3xl border-l border-white/10 z-40 flex flex-col"
    >
      {/* Header */}
      <div className="p-8 border-b border-white/5 flex justify-between items-center">
        <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-zinc-400">Intelligence.Core</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide pb-32">
        {/* Identity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest"><Code2 size={12}/> Target</div>
          <h3 className="text-xl font-medium text-white">{node.data.label}</h3>
        </div>

        {/* Markdown Summary */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest"><Sparkles size={12}/> Analysis</div>
          <div className="prose prose-invert prose-sm max-w-none bg-white/[0.02] border border-white/5 p-6 rounded-sm font-mono text-zinc-300 leading-relaxed">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>

        {/* Persisted Chat History */}
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={cn("p-4 rounded-sm border", msg.role === 'user' ? "ml-8 bg-white/5 border-white/10" : "mr-8 bg-black/40 border-white/5")}>
             <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
               {msg.role === 'user' ? <User size={10}/> : <Bot size={10}/>} {msg.role}
             </div>
             <div className="text-sm font-mono text-zinc-300"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-zinc-950/80 border-t border-white/10">
        <form onSubmit={handleChatSubmit} className="relative">
          <input 
            value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            placeholder="Query the codebase..."
            className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><Send size={16}/></button>
        </form>
      </div>
    </motion.div>
  );
}