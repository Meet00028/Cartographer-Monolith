import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getLayoutedElements } from '../lib/parser';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';

// Explicitly move nodeTypes and edgeTypes outside to prevent mounting errors
const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

export default function Cartographer({ nodes: initialNodes, edges: initialEdges, heatmapActive, onNodeClick, onNodeDataUpdate }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state if initial props change
  useEffect(() => {
    setNodes(initialNodes.map(n => ({
      ...n,
      data: { ...n.data, heatmapActive }
    })));
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, heatmapActive, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    async (_event, node) => {
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
        const res = await fetch("https://cartographer-monolith-production.up.railway.app/api/summarize", {
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
    [nodes, onNodeClick, onNodeDataUpdate, setNodes]
  );

  const handleNodeDoubleClick = useCallback(
    (_event, node) => {
      if (!node.data.isFolder) return;

      const newCollapsed = !node.data.collapsed;

      // 1. Update nodes with new collapsed state and hidden status for descendants
      setNodes((nds) => {
        // Find all descendants of the clicked node
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

        const descendants = getDescendants(node.id, edges);

        const updatedNodes = nds.map((n) => {
          if (n.id === node.id) {
            return { ...n, data: { ...n.data, collapsed: newCollapsed } };
          }
          if (descendants.has(n.id)) {
            return { ...n, hidden: newCollapsed };
          }
          return n;
        });

        // 2. Hide edges connected to hidden nodes
        const updatedEdges = edges.map((e) => ({
          ...e,
          hidden: descendants.has(e.source) || descendants.has(e.target) || (e.source === node.id && newCollapsed),
        }));

        // 3. Recalculate layout
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

  return (
    <div className="w-screen h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-transparent"
        minZoom={0.05}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.02)" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
