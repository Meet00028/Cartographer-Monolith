import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  const selectedNode = graphData.nodes.find((n) => n.id === selectedNodeId) || null;

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
            <TopNav 
              heatmapActive={heatmapActive} 
              onToggleHeatmap={() => setHeatmapActive(!heatmapActive)}
              onExport={handleExport}
              onGenerateDocs={handleGenerateDocs}
              isGeneratingDocs={isGeneratingDocs}
            />
            <Cartographer 
              nodes={graphData.nodes} 
              edges={graphData.edges} 
              heatmapActive={heatmapActive}
              onNodeClick={handleNodeClick} 
              onNodeDataUpdate={handleNodeDataUpdate}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
