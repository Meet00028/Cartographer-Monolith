import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  MiniMap,
  Controls,
  useReactFlow,
} from '@xyflow/react';
import { Maximize, ZoomIn, ZoomOut, Target } from 'lucide-react';
import ContextMenu from './ContextMenu';
import '@xyflow/react/dist/style.css';
import { getLayoutedElements } from '../lib/parser';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';

// Explicitly move nodeTypes and edgeTypes outside to prevent mounting errors
const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

export default function Cartographer({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  heatmapActive, 
  onNodeClick, 
  onNodeDataUpdate,
  searchQuery,
  typeFilters,
  layoutMode,
  locateNodeId
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [contextMenu, setContextMenu] = useState(null);
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  // Handle locating node
  useEffect(() => {
    if (locateNodeId) {
      const node = nodes.find(n => n.id === locateNodeId);
      if (node) {
        setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1, duration: 800 });
      }
    }
  }, [locateNodeId, nodes, setCenter]);

  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        node
      });
    },
    []
  );

  const handleContextAction = useCallback(
    (action) => {
      const { node } = contextMenu;
      if (action === 'chat') {
        onNodeClick(node);
      } else if (action === 'copy') {
        navigator.clipboard.writeText(node.id);
      } else if (action === 'review') {
        onNodeDataUpdate(node.id, { reviewed: !node.data.reviewed });
      } else if (action === 'note') {
        const note = prompt("Enter note:", node.data.note || "");
        if (note !== null) {
          onNodeDataUpdate(node.id, { note });
        }
      }
      setContextMenu(null);
    },
    [contextMenu, onNodeClick, onNodeDataUpdate]
  );

  const applyLayout = useCallback((nds, eds, mode) => {
    if (mode === 'tree') {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds);
      return { nodes: layoutedNodes, edges: layoutedEdges };
    }

    if (mode === 'radial') {
      const root = nds.find(n => n.id === 'root') || nds[0];
      const radiusStep = 300;
      
      const layoutedNodes = nds.map(node => {
        if (node.id === root.id) return { ...node, position: { x: 0, y: 0 } };
        
        // Find depth from root
        const getDepth = (id, currentEdges, depth = 0) => {
          const edge = currentEdges.find(e => e.target === id);
          if (!edge || edge.source === 'root' || depth > 10) return depth + 1;
          return getDepth(edge.source, currentEdges, depth + 1);
        };
        
        const depth = getDepth(node.id, eds);
        const siblings = nds.filter(n => {
          const nEdge = eds.find(e => e.target === n.id);
          const nodeEdge = eds.find(e => e.target === node.id);
          return nEdge?.source === nodeEdge?.source;
        });
        const index = siblings.findIndex(n => n.id === node.id);
        const angle = (index / siblings.length) * 2 * Math.PI;
        
        return {
          ...node,
          position: {
            x: Math.cos(angle) * depth * radiusStep,
            y: Math.sin(angle) * depth * radiusStep,
          }
        };
      });
      return { nodes: layoutedNodes, edges: eds };
    }

    if (mode === 'force') {
      const layoutedNodes = nds.map((node, i) => {
        const angle = (i / nds.length) * 2 * Math.PI;
        const radius = Math.sqrt(i) * 200;
        return {
          ...node,
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          }
        };
      });
      return { nodes: layoutedNodes, edges: eds };
    }

    return { nodes: nds, edges: eds };
  }, []);

  // Sync state if initial props change
  useEffect(() => {
    const processedNodes = initialNodes.map(n => {
      const isMatch = !searchQuery || n.data.label.toLowerCase().includes(searchQuery.toLowerCase());
      const isTypeAllowed = typeFilters[n.data.type] !== false;
      const opacity = (isMatch && isTypeAllowed) ? 1 : 0.15;
      
      return {
        ...n,
        data: { ...n.data, heatmapActive },
        style: { ...n.style, opacity, transition: 'opacity 0.3s ease' }
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(processedNodes, initialEdges, layoutMode);
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    setTimeout(() => fitView({ duration: 800 }), 100);
  }, [initialNodes, initialEdges, heatmapActive, searchQuery, typeFilters, layoutMode, setNodes, setEdges, applyLayout, fitView]);

  const toggleCollapse = useCallback(
    (nodeId) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId);
        if (!node || !node.data.isFolder) return nds;

        const newCollapsed = !node.data.collapsed;

        // Find all descendants
        const getDescendants = (parentId, allEdges, descendants = new Set()) => {
          const children = allEdges
            .filter((e) => e.source === parentId)
            .map((e) => e.target);
          
          children.forEach((childId) => {
            if (!descendants.has(childId)) {
              descendants.add(childId);
              getDescendants(childId, allEdges, descendants);
            }
          });
          return descendants;
        };

        const descendants = getDescendants(nodeId, edges);

        const updatedNodes = nds.map((n) => {
          if (n.id === nodeId) {
            return { ...n, data: { ...n.data, collapsed: newCollapsed } };
          }
          if (descendants.has(n.id)) {
            return { ...n, hidden: newCollapsed };
          }
          return n;
        });

        const updatedEdges = edges.map((e) => ({
          ...e,
          hidden: descendants.has(e.source) || descendants.has(e.target) || (e.source === nodeId && newCollapsed),
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          updatedNodes,
          updatedEdges
        );

        setEdges(layoutedEdges);
        return layoutedNodes;
      });
    },
    [edges, setEdges, setNodes]
  );

  const handleNodeClick = useCallback(
    async (_event, node) => {
      if (node.data.isFolder) {
        toggleCollapse(node.id);
        return;
      }

      onNodeClick(node);

      const currentNode = nodes.find((n) => n.id === node.id) || node;
      if (currentNode?.data?.summary) {
        if (onNodeDataUpdate) {
          onNodeDataUpdate(node.id, {
            summary: currentNode.data.summary,
            chatHistory: Array.isArray(currentNode.data.chatHistory) ? currentNode.data.chatHistory : [],
          });
        }
        return;
      }

      try {
        const res = await fetch("http://localhost:8001/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: node.data.label,
            code_content: node.data.code,
          }),
        });

        if (!res.ok) return;
        const data = await res.json();

        if (onNodeDataUpdate) {
          onNodeDataUpdate(node.id, { summary: data.summary, chatHistory: [] });
        }

        setNodes((prev) =>
          prev.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    summary: data.summary,
                    chatHistory: [],
                  },
                }
              : n
          )
        );
      } catch {
        return;
      }
    },
    [nodes, onNodeClick, onNodeDataUpdate, setNodes, toggleCollapse]
  );

  return (
    <div className="w-screen h-screen" onClick={() => setContextMenu(null)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={(_event, node) => node.data.isFolder && toggleCollapse(node.id)}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-transparent"
        minZoom={0.05}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.02)" gap={24} size={1} />
        
        <AnimatePresence>
          {contextMenu && (
            <ContextMenu 
              x={contextMenu.x} 
              y={contextMenu.y} 
              node={contextMenu.node} 
              onClose={() => setContextMenu(null)}
              onAction={handleContextAction}
            />
          )}
        </AnimatePresence>
        
        <MiniMap 
          style={{ 
            backgroundColor: 'rgba(9, 9, 11, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
          }}
          nodeColor="rgba(255, 255, 255, 0.1)"
          maskColor="rgba(0, 0, 0, 0.5)"
          pannable
          zoomable
        />

        <div className="absolute bottom-8 left-8 z-10 flex flex-col gap-2">
          <button 
            onClick={() => zoomIn()}
            className="p-3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all rounded-sm shadow-2xl"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => zoomOut()}
            className="p-3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all rounded-sm shadow-2xl"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={() => fitView({ duration: 800 })}
            className="p-3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-zinc-500 hover:text-white hover:border-white/20 transition-all rounded-sm shadow-2xl"
          >
            <Maximize size={16} />
          </button>
        </div>
      </ReactFlow>
    </div>
  );
}
