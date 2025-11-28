import { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import DepartmentNode from './DepartmentNode';
import DetailPanel from './DetailPanel';
import SearchOverlay from './SearchOverlay';
import Toolbar from './Toolbar';
import { parseCSVToFlow } from '../utils/parseCSVToFlow';
import { calculateLayout } from '../utils/layoutEngine';
import { getDepthColors } from '../utils/colors';

// Theme context for providing current theme to all nodes
export const ThemeContext = createContext('slate');

// Register custom node types
const nodeTypes = {
  department: DepartmentNode
};

// Default edge styling
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
    width: 20,
    height: 20
  }
};

/**
 * OrgMap - Main organization map component with React Flow canvas
 */
export default function OrgMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('slate');

  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  // Load CSV data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const response = await fetch('/src/data/sample-org.csv');
        if (!response.ok) {
          throw new Error('Failed to load organization data');
        }
        const csvText = await response.text();
        const { nodes: parsedNodes, edges: parsedEdges } = parseCSVToFlow(csvText);

        // Apply initial layout
        const layoutedNodes = calculateLayout(parsedNodes, parsedEdges, layoutDirection);

        // Add callbacks to node data
        const nodesWithCallbacks = layoutedNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onToggleExpand: () => handleToggleExpand(node.id),
            onSelectPerson: (person) => handleSelectPerson(person)
          }
        }));

        setNodes(nodesWithCallbacks);
        setEdges(parsedEdges);

        // Fit view after initial load
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 800 });
        }, 100);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('orgTreeTheme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  // Toggle department expansion
  const handleToggleExpand = useCallback((nodeId) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isExpanded: !node.data.isExpanded
            }
          };
        }
        return node;
      });

      // Recalculate layout with new dimensions
      const layoutedNodes = calculateLayout(updatedNodes, edges, layoutDirection);

      // Preserve callbacks
      return layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person) => handleSelectPerson(person)
        }
      }));
    });
  }, [edges, layoutDirection, setNodes]);

  // Select person for detail panel
  const handleSelectPerson = useCallback((person) => {
    setSelectedPerson(person);
  }, []);

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedPerson(null);
  }, []);

  // Expand all departments
  const handleExpandAll = useCallback(() => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => ({
        ...node,
        data: { ...node.data, isExpanded: true }
      }));

      const layoutedNodes = calculateLayout(updatedNodes, edges, layoutDirection);

      return layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person) => handleSelectPerson(person)
        }
      }));
    });
  }, [edges, layoutDirection, handleToggleExpand, handleSelectPerson, setNodes]);

  // Collapse all departments
  const handleCollapseAll = useCallback(() => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => ({
        ...node,
        data: { ...node.data, isExpanded: false }
      }));

      const layoutedNodes = calculateLayout(updatedNodes, edges, layoutDirection);

      return layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person) => handleSelectPerson(person)
        }
      }));
    });
  }, [edges, layoutDirection, handleToggleExpand, handleSelectPerson, setNodes]);

  // Toggle layout direction
  const handleToggleLayout = useCallback(() => {
    const newDirection = layoutDirection === 'TB' ? 'LR' : 'TB';
    setLayoutDirection(newDirection);

    setNodes((nds) => {
      const layoutedNodes = calculateLayout(nds, edges, newDirection);

      return layoutedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person) => handleSelectPerson(person)
        }
      }));
    });

    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [layoutDirection, edges, fitView, handleToggleExpand, handleSelectPerson, setNodes]);

  // Handle theme change
  const handleThemeChange = useCallback((themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('orgTreeTheme', themeName);
  }, []);

  // Handle search result selection
  const handleSearchSelect = useCallback((result) => {
    if (result.type === 'department') {
      // Zoom to department node
      const node = nodes.find(n => n.id === result.nodeId);
      if (node) {
        setCenter(node.position.x + 110, node.position.y + 35, { zoom: 1.5, duration: 800 });
        setHighlightedNodeId(node.id);
        setTimeout(() => setHighlightedNodeId(null), 3000);
      }
    } else if (result.type === 'person') {
      // Expand department if not expanded, then zoom to it
      const nodeId = result.nodeId;
      const node = nodes.find(n => n.id === nodeId);

      if (node && !node.data.isExpanded) {
        handleToggleExpand(nodeId);
      }

      setTimeout(() => {
        const updatedNode = nodes.find(n => n.id === nodeId);
        if (updatedNode) {
          setCenter(updatedNode.position.x + 140, updatedNode.position.y + 100, {
            zoom: 1.5,
            duration: 800
          });
          setHighlightedNodeId(nodeId);
          setTimeout(() => setHighlightedNodeId(null), 3000);
        }

        // Open detail panel
        if (result.person) {
          setSelectedPerson(result.person);
        }
      }, 300);
    }
  }, [nodes, setCenter, handleToggleExpand]);

  // Update highlighted state and callbacks in nodes
  const nodesWithHighlight = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: node.id === highlightedNodeId,
        onToggleExpand: () => handleToggleExpand(node.id),
        onSelectPerson: (person) => handleSelectPerson(person)
      }
    }));
  }, [nodes, highlightedNodeId, handleToggleExpand, handleSelectPerson]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organization map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <p className="text-red-800 font-semibold mb-2">Error Loading Map</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-slate-50">
      <ThemeContext.Provider value={currentTheme}>
        <ReactFlow
          nodes={nodesWithHighlight}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <MiniMap
            nodeColor={(node) => getDepthColors(node.data.depth, currentTheme).hex}
            maskColor="rgba(0, 0, 0, 0.1)"
            position="bottom-right"
          />
        </ReactFlow>
      </ThemeContext.Provider>

      {/* Overlay Components */}
      <SearchOverlay nodes={nodes} onSelectResult={handleSearchSelect} />

      <Toolbar
        onZoomIn={() => zoomIn({ duration: 300 })}
        onZoomOut={() => zoomOut({ duration: 300 })}
        onFitView={() => fitView({ padding: 0.2, duration: 800 })}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onToggleLayout={handleToggleLayout}
        layoutDirection={layoutDirection}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Detail Panel */}
      {selectedPerson && (
        <DetailPanel person={selectedPerson} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
