import { useState, useEffect, useCallback, useMemo, createContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
import ExportButton from './map/ExportButton';
import { calculateLayout } from '../utils/layoutEngine';
import { getDepthColors } from '../utils/colors';
import { exportToPng, exportToPdf } from '../utils/exportUtils';
import { useToast } from './ui/Toast';
import api from '../api/client';

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
 * Transform API data to React Flow format
 */
function transformToFlowData(departments) {
  const nodes = [];
  const edges = [];

  // Helper to calculate depth
  const getDepth = (dept, deptMap, depth = 0) => {
    if (!dept.parent_id) return depth;
    const parent = deptMap.get(dept.parent_id);
    return parent ? getDepth(parent, deptMap, depth + 1) : depth;
  };

  // Create a map for quick lookups
  const deptMap = new Map(departments.map(d => [d.id, d]));

  departments.forEach((dept) => {
    const depth = getDepth(dept, deptMap);

    nodes.push({
      id: dept.id,
      type: 'department',
      position: { x: 0, y: 0 }, // Will be set by layout engine
      data: {
        name: dept.name,
        path: dept.id, // Using ID as path
        depth,
        description: dept.description || '',
        people: dept.people || [],
        isExpanded: false,
      },
    });

    // Create edge to parent
    if (dept.parent_id) {
      edges.push({
        id: `e-${dept.parent_id}-${dept.id}`,
        source: dept.parent_id,
        target: dept.id,
        type: 'smoothstep',
      });
    }
  });

  return { nodes, edges };
}

/**
 * OrgMap - Main organization map component with React Flow canvas
 */
export default function OrgMap() {
  const { orgId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('slate');
  const [exporting, setExporting] = useState(false);
  const [orgName, setOrgName] = useState('Organization Chart');

  const reactFlowWrapper = useRef(null);
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const toast = useToast();

  // Load organization data from API
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch organization with all departments and people
        const org = await api.getOrganization(orgId);

        // Store organization name for exports
        if (org.name) {
          setOrgName(org.name);
        }

        if (!org.departments || org.departments.length === 0) {
          setNodes([]);
          setEdges([]);
          setIsLoading(false);
          return;
        }

        // Transform API data to React Flow format
        const { nodes: parsedNodes, edges: parsedEdges } = transformToFlowData(org.departments);

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
        console.error('Error loading organization data:', err);
        setError(err.message || 'Failed to load organization data');
      } finally {
        setIsLoading(false);
      }
    }

    if (orgId) {
      loadData();
    }
  }, [orgId]);

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

  // Handle export to PNG
  const handleExportPng = useCallback(async () => {
    if (!reactFlowWrapper.current) return;

    try {
      setExporting(true);
      const filename = `${orgName.toLowerCase().replace(/\s+/g, '-')}-org-chart.png`;
      await exportToPng(reactFlowWrapper.current, filename);
      toast.success('Chart exported as PNG successfully!');
    } catch (err) {
      console.error('PNG export failed:', err);
      toast.error('Failed to export as PNG. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [orgName, toast]);

  // Handle export to PDF
  const handleExportPdf = useCallback(async () => {
    if (!reactFlowWrapper.current) return;

    try {
      setExporting(true);
      const filename = `${orgName.toLowerCase().replace(/\s+/g, '-')}-org-chart.pdf`;
      await exportToPdf(reactFlowWrapper.current, filename, orgName);
      toast.success('Chart exported as PDF successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to export as PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [orgName, toast]);

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

  if (!isLoading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-slate-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No departments yet
          </h3>
          <p className="text-slate-500">
            Create departments in the Departments section to see them visualized here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-slate-50">
      <ThemeContext.Provider value={currentTheme}>
        <div ref={reactFlowWrapper} className="w-full h-full">
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
        </div>
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

      {/* Export Button */}
      <div className="absolute top-4 right-4 z-10">
        <ExportButton
          onExportPng={handleExportPng}
          onExportPdf={handleExportPdf}
          loading={exporting}
        />
      </div>

      {/* Detail Panel */}
      {selectedPerson && (
        <DetailPanel person={selectedPerson} onClose={handleCloseDetail} />
      )}
    </div>
  );
}
