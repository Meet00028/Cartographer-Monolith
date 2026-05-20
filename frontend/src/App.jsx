import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactFlowProvider } from '@xyflow/react';
import { CheckCircle2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import { saveSession, clearSession } from './lib/db';
import Launchpad from './components/Launchpad';
import Cartographer from './components/Cartographer';
import IntelligenceDrawer from './components/IntelligenceDrawer';
import TopNav from './components/TopNav';

function App() {
  const [phase, setPhase] = useState('launchpad'); // 'launchpad' or 'cartographer'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState({
    frontend: true,
    backend: true,
    database: true,
    default: true
  });
  const [layoutMode, setLayoutMode] = useState('tree');
  const [showUnreviewed, setShowUnreviewed] = useState(false);
  const [locateNodeId, setLocateNodeId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Persistence
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      saveSession(graphData);
    }
  }, [graphData]);

  useEffect(() => {
    const saved = localStorage.getItem('cartographer_reviewed');
    if (saved && graphData.nodes.length > 0) {
      const reviewedMap = JSON.parse(saved);
      setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => ({
          ...n,
          data: { ...n.data, reviewed: reviewedMap[n.id] || false }
        }))
      }));
    }
  }, [phase]); // Run when switching to cartographer phase

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      const reviewedMap = {};
      graphData.nodes.forEach(n => {
        if (n.data.reviewed) reviewedMap[n.id] = true;
      });
      localStorage.setItem('cartographer_reviewed', JSON.stringify(reviewedMap));
    }
  }, [graphData.nodes]);

  const handleLocateNode = (nodeId) => {
    // If the nodeId is a label (from AI response), find the actual ID
    const node = graphData.nodes.find(n => n.id === nodeId || n.data.label === nodeId);
    if (node) {
      setLocateNodeId(node.id);
      setSelectedNodeId(node.id);
      // Reset after a short delay
      setTimeout(() => setLocateNodeId(null), 100);
    }
  };

  const selectedNode = graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  
  const reviewedCount = graphData.nodes.filter(n => !n.data.isFolder && n.data.reviewed).length;
  const totalFiles = graphData.nodes.filter(n => !n.data.isFolder).length;
  const unreviewedFiles = graphData.nodes.filter(n => !n.data.isFolder && !n.data.reviewed);

  const handleStart = (data) => {
    setGraphData(data);
    setPhase('cartographer');
  };

  const handleNodeClick = (node) => {
    setSelectedNodeId(node.id);
  };

  const handleNodeDataUpdate = (nodeId, patch) => {
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, data: { ...n.data, ...patch } };
      }),
    }));
  };

  const handleCloseDrawer = () => {
    setSelectedNodeId(null);
  };

  const handleHome = () => {
    if (window.confirm("Load a new repo? Current session will be cleared.")) {
      clearSession();
      setPhase('launchpad');
      setGraphData({ nodes: [], edges: [] });
    }
  };

  const handleRefresh = () => {
    // In a real app, this would re-parse the folder. 
    // Since we don't have the original FileList (browsers don't persist it),
    // we'll just show a message or reset the graph.
    alert("Re-parsing current folder structure...");
    setPhase('launchpad');
  };

  const handleExportPNG = () => {
    const el = document.querySelector('.react-flow__viewport');
    if (el) {
      toPng(el, {
        backgroundColor: '#09090b',
        width: el.offsetWidth * 2,
        height: el.offsetHeight * 2,
        style: { transform: 'scale(2)', transformOrigin: 'top left' }
      }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `cartographer-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      });
    }
  };

  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.key === 'f') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
      if (e.key === '?') {
        setShowHelp(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowHelp(false);
        setShowUnreviewed(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const handleChatUpdate = (nodeId, message) => {
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const nextHistory = [...(n.data.chatHistory || []), message];
        return { ...n, data: { ...n.data, chatHistory: nextHistory } };
      }),
    }));
  };

  const handleGenerateDocs = async () => {
    if (isGeneratingDocs) return;
    
    const summaries = graphData.nodes
      .filter(n => n.data.summary)
      .map(n => ({
        file_name: n.data.label,
        summary: n.data.summary
      }));

    if (summaries.length === 0) {
      alert("No summaries found. Please click on some nodes first to generate summaries.");
      return;
    }

    setIsGeneratingDocs(true);
    try {
      const res = await fetch("http://localhost:8001/api/generate-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaries }),
      });

      if (!res.ok) throw new Error("Failed to generate documentation");
      const data = await res.json();

      const blob = new Blob([data.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ARCHITECTURE.md';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error generating documentation: " + err.message);
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleExport = () => {
    let md = "# 🗺️ Codebase Architecture\n\n";
    const adjList = {};
    
    // Build adjacency list
    graphData.edges.forEach(e => {
      if (!adjList[e.source]) adjList[e.source] = [];
      adjList[e.source].push(e.target);
    });

    const writeNode = (nodeId, depth = 0) => {
      const node = graphData.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      const indent = "  ".repeat(depth);
      const icon = node.data.type === 'frontend' ? '⚛️' : node.data.type === 'backend' ? '⚙️' : node.data.type === 'database' ? '🗄️' : '📄';
      
      md += `${indent}- ${icon} **${node.data.label}** (LOC: ${node.data.loc || 0})\n`;
      
      if (node.data.summary) {
        md += `${indent}  - *AI Summary*: ${node.data.summary.split('\n').join(`\n${indent}    `)}\n`;
      }
      
      if (adjList[nodeId]) {
        adjList[nodeId].forEach(childId => writeNode(childId, depth + 1));
      }
    };

    // Find roots (nodes with no incoming edges)
    const hasIncoming = new Set(graphData.edges.map(e => e.target));
    const roots = graphData.nodes.filter(n => !hasIncoming.has(n.id));
    
    roots.forEach(r => writeNode(r.id, 0));

    // Trigger download
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ARCHITECTURE.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReactFlowProvider>
      <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden text-zinc-100 font-sans">
        {/* Grainy overlay */}
        <div 
          className="pointer-events-none absolute inset-0 z-50 opacity-[0.03]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        ></div>

        <AnimatePresence mode="wait">
          {phase === 'launchpad' && (
            <Launchpad key="launchpad" onStart={handleStart} />
          )}
          
          {phase === 'cartographer' && (
          <motion.div 
            key="cartographer"
            className="absolute inset-0 z-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Progress Badge */}
            <motion.button
              onClick={() => setShowUnreviewed(true)}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-8 left-8 z-40 flex items-center gap-3 px-4 py-2 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-sm hover:border-white/20 transition-all"
            >
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                  <motion.circle 
                    cx="16" cy="16" r="14" fill="none" stroke="#22c55e" strokeWidth="2"
                    strokeDasharray="88"
                    initial={{ strokeDashoffset: 88 }}
                    animate={{ strokeDashoffset: 88 - (88 * (reviewedCount / (totalFiles || 1))) }}
                  />
                </svg>
                <span className="absolute text-[8px] font-bold text-white">{Math.round((reviewedCount / (totalFiles || 1)) * 100)}%</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">Progress</span>
                <span className="text-[8px] text-zinc-500 font-mono uppercase">{reviewedCount} / {totalFiles} Files Reviewed</span>
              </div>
            </motion.button>

            <TopNav 
              heatmapActive={heatmapActive} 
              onToggleHeatmap={() => setHeatmapActive(!heatmapActive)}
                onExport={handleExport}
                onGenerateDocs={handleGenerateDocs}
                isGeneratingDocs={isGeneratingDocs}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              typeFilters={typeFilters}
              onFilterChange={(type) => setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }))}
              layoutMode={layoutMode}
              onLayoutChange={setLayoutMode}
              onHome={handleHome}
              onRefresh={handleRefresh}
              onExportPNG={handleExportPNG}
            />
            <Cartographer 
              nodes={graphData.nodes} 
              edges={graphData.edges} 
              heatmapActive={heatmapActive}
              onNodeClick={handleNodeClick} 
              onNodeDataUpdate={handleNodeDataUpdate}
              searchQuery={searchQuery}
              typeFilters={typeFilters}
              layoutMode={layoutMode}
              locateNodeId={locateNodeId}
            />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedNode && (
          <IntelligenceDrawer 
            key="drawer" 
            node={selectedNode} 
            onClose={handleCloseDrawer} 
            onChatUpdate={handleChatUpdate}
            onLocateNode={handleLocateNode}
          />
        )}
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
            onClick={() => setShowHelp(false)}
          >
            <div className="bg-zinc-900 border border-white/10 p-12 rounded-sm max-w-lg w-full space-y-8 shadow-2xl">
              <h2 className="text-xl font-bold tracking-[0.4em] uppercase text-white border-b border-white/10 pb-4">Keyboard Protocols</h2>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Search</span><kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-xs font-mono">CMD+K</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Fullscreen</span><kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-xs font-mono">F</kbd></div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Close Panels</span><kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-xs font-mono">ESC</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Help</span><kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded-sm text-xs font-mono">?</kbd></div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center italic">Neural Interface Ver 2.0.0_Flash</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnreviewed && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            className="absolute top-0 left-0 h-full w-[350px] bg-zinc-950/90 backdrop-blur-3xl border-r border-white/10 z-[60] flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-zinc-400">Backlog.Core</h2>
                <span className="text-[8px] text-zinc-600 uppercase font-mono tracking-widest">{unreviewedFiles.length} files remaining</span>
              </div>
              <button onClick={() => setShowUnreviewed(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {unreviewedFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    setSelectedNodeId(file.id);
                    setShowUnreviewed(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-sm bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex flex-col items-start gap-1 overflow-hidden">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{file.data.type}</span>
                    <span className="text-xs text-zinc-300 truncate w-full text-left">{file.data.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-zinc-700 group-hover:text-white transition-colors" />
                </button>
              ))}
              {unreviewedFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                  <CheckCircle2 size={48} className="text-green-500/20" />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">All files reviewed. System optimized.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ReactFlowProvider>
  );
}

export default App;
