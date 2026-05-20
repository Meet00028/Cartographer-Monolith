import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderUp, Crosshair, Loader2, Cpu, GitPullRequest, History, ChevronRight } from 'lucide-react';
import { parseFileList } from '../lib/parser';
import { loadSession } from '../lib/db';

export default function Launchpad({ onStart }) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '', ignored: 0 });
  const [githubUrl, setGithubUrl] = useState('');
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    loadSession().then(session => {
      if (session) setLastSession(session);
    });
  }, []);

  const handleResume = () => {
    setIsExpanding(true);
    setTimeout(() => onStart(lastSession), 800);
  };

  const handleGithubSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!githubUrl) return;
    
    setIsParsing(true);
    try {
      const res = await fetch("http://localhost:8001/api/parse-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: githubUrl })
      });
      const data = await res.json();
      
      const graphData = await parseFileList(data.files, data.dependency_edges);
      setIsExpanding(true);
      setTimeout(() => onStart(graphData), 800);
    } catch (err) {
      console.error(err);
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setIsParsing(true);
      
      try {
        // 1. Start backend stream for progress feedback
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('files', file));

        const response = await fetch("http://localhost:8001/api/parse-stream", {
          method: "POST",
          body: formData,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.status === 'parsing') {
                setProgress({ current: data.current, total: data.total, file: data.file, ignored: data.ignored });
              } else if (data.status === 'complete') {
                // 2. Once backend "parsing" is complete, build the actual graph data locally
                const graphData = await parseFileList(files, data.dependency_edges || [], data.metadata || {});
                setIsExpanding(true);
                setTimeout(() => {
                  onStart(graphData);
                }, 800);
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to parse codebase:", error);
        setIsParsing(false);
      }
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Deep Background */}
      <div className="absolute inset-0 bg-zinc-950"></div>
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        id="folder-upload" 
        webkitdirectory="true" 
        directory="true" 
        className="hidden" 
        onChange={handleFileChange}
        disabled={isParsing}
      />

      {/* Central Glass Portal */}
      <label
        htmlFor="folder-upload"
        className="block"
      >
        <motion.div
          layoutId="portal"
          className="relative flex flex-col items-center justify-center w-96 h-96 rounded-sm border border-white/10 bg-white/[0.02] backdrop-blur-3xl cursor-pointer overflow-hidden group shadow-[0_0_100px_rgba(0,0,0,0.8)]"
          whileHover={!isParsing ? { scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
          whileTap={!isParsing ? { scale: 0.98 } : {}}
          animate={isExpanding ? { 
            width: '100vw',
            height: '100vh',
            borderRadius: 0,
            borderWidth: 0,
          } : {}}
          transition={{ 
            type: "spring", 
            stiffness: 40, 
            damping: 20,   
            mass: 3        
          }}
        >
          <AnimatePresence mode="wait">
            {isParsing && !isExpanding ? (
              <motion.div 
                key="parsing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 w-full max-w-xs"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-full border-t border-white/40"></div>
                  </motion.div>
                  <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/50" />
                </div>

                <div className="w-full space-y-4">
                  <div className="flex justify-between items-end text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                    <span className="truncate max-w-[180px]">Parsing: {progress.file || 'Initializing...'}</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  
                  {progress.ignored > 0 && (
                    <div className="text-[8px] text-zinc-600 font-mono uppercase text-right">
                      Ignored {progress.ignored} system files
                    </div>
                  )}
                  
                  {/* Progress Bar Container */}
                  <div className="h-[2px] w-full bg-white/5 overflow-hidden">
                    <motion.div 
                      className="h-full bg-white/60"
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                  </div>
                  
                  <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest text-center">
                    Neural Mapping in Progress
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 w-full px-8"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <FolderUp className="w-12 h-12 text-white/20 group-hover:text-white/40 transition-colors" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500/80 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-zinc-400 mb-2">Initialize Sequence</h2>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">Select local folder or GitHub URL</p>
                  </div>
                </div>

                {/* GitHub Input */}
                <div className="w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <GitPullRequest className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      placeholder="HTTPS://GITHUB.COM/USER/REPO"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-sm py-3 pl-10 pr-4 text-[10px] font-bold tracking-widest text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-all uppercase"
                    />
                    {githubUrl && (
                      <button 
                        onClick={handleGithubSubmit}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/10 rounded-sm text-white hover:bg-white/20 transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>

                  {lastSession && (
                    <button 
                      onClick={handleResume}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.02] border border-white/5 rounded-sm text-[8px] font-bold text-zinc-500 hover:text-white hover:border-white/10 transition-all uppercase tracking-[0.2em]"
                    >
                      <History size={12} />
                      Resume Last Session
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Scanning Line Effect */}
          <motion.div 
            className="absolute inset-x-0 h-[1px] bg-white/10 z-0"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </label>

      {/* Accents */}
      <div className="absolute bottom-16 left-16 text-[10px] tracking-[0.5em] uppercase text-zinc-700 font-bold">
        Sys.Core // Active
      </div>
      <div className="absolute top-16 right-16 text-[10px] tracking-[0.5em] uppercase text-zinc-700 font-bold">
        Ver 2.0.0_Flash
      </div>
    </motion.div>
  );
}
