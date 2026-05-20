import React from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { motion } from 'framer-motion';

export default function CustomEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isImport = data?.type === 'import';

  return (
    <>
      {/* Background track edge */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: isImport ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.05)', 
          strokeWidth: isImport ? 1 : 2,
          strokeDasharray: isImport ? '5 5' : 'none'
        }} 
      />
      
      {/* Animated flowing data edge */}
      <motion.path
        d={edgePath}
        fill="none"
        stroke={isImport ? "rgba(168, 85, 247, 0.4)" : "url(#gradient)"}
        strokeWidth={isImport ? 1 : 2}
        className="react-flow__edge-path"
        initial={{ strokeDasharray: isImport ? "5 5" : "0 100" }}
        animate={isImport ? { strokeDashoffset: -20 } : { strokeDasharray: "10 20" }}
        transition={{
          repeat: Infinity,
          duration: isImport ? 3 : 1.5,
          ease: "linear"
        }}
      />
      
      {/* Define SVG Gradient globally for edges */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}
