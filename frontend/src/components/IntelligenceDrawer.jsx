import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Code2, Send, Bot, User, ChevronDown, ChevronUp, Crosshair, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';

export default function IntelligenceDrawer({ node, onClose, onChatUpdate, onLocateNode }) {
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem('cartographer_panel_width')) || 500;
  });
  const isResizing = useRef(false);
  const messagesEndRef = useRef(null);

  const chatHistory = node.data.chatHistory || [];
  const summary = node.data.summary || "Analyzing codebase architecture...";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatting]);

  // Resizing logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.7) {
        setPanelWidth(newWidth);
        localStorage.setItem('cartographer_panel_width', newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getLanguage = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const map = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'go': 'go', 'rb': 'ruby', 'java': 'java', 'css': 'css',
      'json': 'json', 'yaml': 'yaml', 'yml': 'yaml', 'md': 'markdown'
    };
    return map[ext] || 'text';
  };

  const handleChatSubmit = async (e, customInput) => {
    if (e) e.preventDefault();
    const input = customInput || chatInput.trim();
    if (!input || isChatting) return;

    const userMsg = { role: 'user', text: input };
    setChatInput('');
    
    onChatUpdate(node.id, userMsg);
    setIsChatting(true);

    try {
      const res = await fetch("http://localhost:8001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: node.id,
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

  const SUGGESTIONS = [
    "How could this be improved?",
    "What are the main dependencies?",
    "Explain the logic in detail"
  ];

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 80, damping: 25, mass: 1.5 }}
      style={{ width: panelWidth }}
      className="absolute top-0 right-0 h-full bg-zinc-950/95 backdrop-blur-3xl border-l border-white/10 z-50 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.8)]"
    >
      {/* Resize Handle */}
      <div 
        onMouseDown={() => isResizing.current = true}
        onDoubleClick={() => { setPanelWidth(500); localStorage.setItem('cartographer_panel_width', 500); }}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-[60]"
      />

      {/* Header */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-zinc-500">Intelligence.Core</h2>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-white truncate max-w-[200px]">{node.data.label}</span>
              <span className="px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{node.data.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onLocateNode(node.id)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-sm transition-all"
            title="Locate on Map"
          >
            <Crosshair size={18} />
          </button>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-sm transition-all">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide pb-32">
        {/* 4.1 AI Summary Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[10px] text-amber-500 uppercase tracking-[0.3em] font-bold">
            <Sparkles size={14}/> Architectural Analysis
          </div>
          <div className="prose prose-invert prose-sm max-w-none bg-white/[0.03] border border-white/10 p-8 rounded-sm text-zinc-200 leading-relaxed font-sans shadow-xl">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <button 
                    onClick={() => onLocateNode(props.children)}
                    className="text-blue-400 hover:underline font-bold"
                  >
                    {props.children}
                  </button>
                )
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </section>

        {/* 4.2 Collapsible Source Section */}
        <section className="space-y-4">
          <button 
            onClick={() => setShowSource(!showSource)}
            className="flex items-center justify-between w-full text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code2 size={14}/> Source Code
            </div>
            {showSource ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          
          <AnimatePresence>
            {showSource && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden rounded-sm border border-white/5 shadow-inner"
              >
                <SyntaxHighlighter 
                  language={getLanguage(node.data.label)}
                  style={vscDarkPlus}
                  customStyle={{ 
                    margin: 0, 
                    padding: '1.5rem', 
                    fontSize: '11px',
                    background: 'rgba(0,0,0,0.3)',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                >
                  {node.data.code}
                </SyntaxHighlighter>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 4.3 Multi-turn Conversation */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
            <MessageSquare size={14}/> Conversation Thread
          </div>
          
          <div className="space-y-6">
            {chatHistory.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "p-4 rounded-sm border text-sm font-mono leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-100" 
                    : "bg-white/5 border-white/10 text-zinc-300"
                )}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                <div className="flex items-center gap-2 text-[8px] uppercase tracking-widest text-zinc-600 font-bold">
                  {msg.role === 'user' ? <User size={10}/> : <Bot size={10}/>}
                  {msg.role}
                </div>
              </motion.div>
            ))}
            
            {isChatting && (
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="p-4 rounded-sm bg-white/5 border border-white/10 text-zinc-500 animate-pulse">
                  Processing neural query...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 4.4 Suggested Chips */}
          {!isChatting && (
            <div className="flex flex-wrap gap-2 pt-4">
              {SUGGESTIONS.map((chip, i) => (
                <button
                  key={i}
                  onClick={(e) => handleChatSubmit(e, chip)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-zinc-500 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Input */}
      <div className="p-6 bg-zinc-950/90 border-t border-white/10 backdrop-blur-3xl">
        <form onSubmit={handleChatSubmit} className="relative">
          <input 
            value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            placeholder="Query Intelligence.Core..."
            className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 font-mono transition-all pr-12"
          />
          <button 
            type="submit" 
            disabled={isChatting}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <Send size={18}/>
          </button>
        </form>
      </div>
    </motion.div>
  );
}