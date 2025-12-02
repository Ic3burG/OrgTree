import { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import DepartmentNode from './DepartmentNode';
import DetailPanel from './DetailPanel';
import { calculateLayout } from '../utils/layoutEngine';
import { getDepthColors } from '../utils/colors';
import api from '../api/client';

// Theme context
export const ThemeContext = createContext('slate');

// Custom node types
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
    if (!dept.parentId) return depth;
    const parent = deptMap.get(dept.parentId);
    return parent ? getDepth(parent, deptMap, depth + 1) : depth;
  };

  // Create a map for quick lookups
  const deptMap = new Map(departments.map(d => [d.id, d]));

  departments.forEach((dept) => {
    const depth = getDepth(dept, deptMap);

    nodes.push({
      id: dept.id,
      type: 'department',
      position: { x: 0, y: 0 },
      data: {
        name: dept.name,
        path: dept.id,
        depth,
        description: dept.description || '',
        people: dept.people || [],
        isExpanded: false,
      },
    });

    // Create edge to parent
    if (dept.parentId) {
      edges.push({
        id: `e-${dept.parentId}-${dept.id}`,
        source: dept.parentId,
        target: dept.id,
        type: 'smoothstep',
      });
    }
  });

  return { nodes, edges };
}

/**
 * PublicOrgMapContent - Inner component with React Flow context
 */
function PublicOrgMapContent() {
  const { shareToken } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [layoutDirection] = useState('TB');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgName, setOrgName] = useState('Organization Chart');
  const [currentTheme] = useState('slate');

  const { fitView } = useReactFlow();

  // Load organization data from public API
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch public organization
        const org = await api.getPublicOrganization(shareToken);

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
        setError(err.message || 'Organization not found or not publicly shared');
      } finally {
        setIsLoading(false);
      }
    }

    if (shareToken) {
      loadData();
    }
  }, [shareToken]);

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

  // Update nodes with callbacks
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onToggleExpand: () => handleToggleExpand(node.id),
        onSelectPerson: (person) => handleSelectPerson(person)
      }
    }));
  }, [nodes, handleToggleExpand, handleSelectPerson]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organization chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
          <p className="text-red-800 font-semibold mb-2">Organization Not Found</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 max-w-md">
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No departments in this organization
          </h3>
          <p className="text-slate-500">
            This organization chart is empty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-slate-50">
      <ThemeContext.Provider value={currentTheme}>
        <ReactFlow
          nodes={nodesWithCallbacks}
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
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <MiniMap
            nodeColor={(node) => getDepthColors(node.data.depth, currentTheme).hex}
            maskColor="rgba(0, 0, 0, 0.1)"
            position="bottom-right"
          />
        </ReactFlow>
      </ThemeContext.Provider>

      {/* Public View Badge */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg px-4 py-3 border border-slate-200">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h1 className="font-semibold text-slate-900">{orgName}</h1>
            <p className="text-xs text-slate-500">Public view • Read only</p>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedPerson && (
        <DetailPanel person={selectedPerson} onClose={handleCloseDetail} />
      )}
    </div>
  );
}

/**
 * PublicOrgMap - Wrapper with React Flow Provider
 */
export default function PublicOrgMap() {
  return (
    <ReactFlowProvider>
      <PublicOrgMapContent />
    </ReactFlowProvider>
  );
}
