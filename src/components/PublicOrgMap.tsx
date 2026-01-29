import React, { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useTheme } from '../contexts/ThemeContext';
import DepartmentNode from './DepartmentNode';
import DetailPanel from './DetailPanel';
import Toolbar from './Toolbar';
import SearchOverlay from './PublicSearchOverlay';
import { calculateLayout } from '../utils/layoutEngine';
import { getDepthColors } from '../utils/colors';
import { buildAncestorMap } from '../utils/departmentHierarchy';
import api from '../api/client';
import type { Department, Person, CustomFieldDefinition } from '../types/index.js';

// Theme context
export const ThemeContext = createContext<string>('slate');

// Custom node types
const nodeTypes = {
  department: DepartmentNode,
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
    height: 20,
  },
};

interface NodeData {
  name: string;
  path: string;
  depth: number;
  description: string;
  people: Person[];
  isExpanded: boolean;
  onToggleExpand?: () => void;
  onSelectPerson?: (person: Person) => void;
  theme?: string;
  isHighlighted?: boolean;
  [key: string]: unknown;
}

/**
 * Transform API data to React Flow format
 */
function transformToFlowData(
  departments: Department[],
  onHover: (id: string | null, isHovering: boolean) => void,
  onSelect: (id: string) => void
): {
  nodes: Node<NodeData>[];
  edges: Edge[];
} {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  // Helper to calculate depth
  const getDepth = (dept: Department, deptMap: Map<string, Department>, depth = 0): number => {
    // Public API returns camelCase 'parentId', internal API uses snake_case 'parent_id'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentId = (dept as any).parentId || dept.parent_id;
    if (!parentId) return depth;
    const parent = deptMap.get(parentId);
    return parent ? getDepth(parent, deptMap, depth + 1) : depth;
  };

  // Create a map for quick lookups
  const deptMap = new Map(departments.map(d => [d.id, d]));

  departments.forEach(dept => {
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
        isHighlighted: false,
        onHover: (isHovering: boolean) => onHover(dept.id, isHovering),
        onSelect: () => onSelect(dept.id),
      },
    });

    // Public API returns camelCase 'parentId', internal API uses snake_case 'parent_id'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentId = (dept as any).parentId || dept.parent_id;

    // Create edge to parent
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${dept.id}`,
        source: parentId,
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
function PublicOrgMapContent(): React.JSX.Element {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('Organization Chart');
  const [currentTheme, setCurrentTheme] = useState('blue');
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [fullDepartments, setFullDepartments] = useState<Department[]>([]);

  // Hierarchy highlighting state
  const [hoveredDepartmentId, setHoveredDepartmentId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  const { isDarkMode } = useTheme();
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  // Select person for detail panel
  const handleSelectPerson = useCallback((person: Person): void => {
    setSelectedPerson(person);
    // Highlight the person's department
    if (person.department_id) {
      setSelectedDepartmentId(person.department_id);
    }
  }, []);

  // Toggle department expansion
  const handleToggleExpand = useCallback(
    (nodeId: string): void => {
      setNodes(nds => {
        const updatedNodes = nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                isExpanded: !node.data.isExpanded,
              },
            };
          }
          return node;
        });

        // Recalculate layout with new dimensions
        const layoutedNodes = calculateLayout(updatedNodes, edges, layoutDirection);

        // Preserve callbacks
        return layoutedNodes.map(node => ({
          ...node,
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node.data,
            onToggleExpand: () => handleToggleExpand(node.id),
            onSelectPerson: (person: Person) => handleSelectPerson(person),
          },
        })) as Node<NodeData>[];
      });
    },
    [edges, layoutDirection, setNodes, handleSelectPerson]
  );

  // Memoize ancestor map
  const ancestorMap = useMemo(() => {
    return buildAncestorMap(fullDepartments);
  }, [fullDepartments]);

  const handleNodeHover = useCallback((id: string | null, isHovering: boolean) => {
    setHoveredDepartmentId(isHovering ? id : null);
  }, []);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedDepartmentId(prev => (prev === id ? null : id));
  }, []);

  // Effect to update highlighting
  useEffect(() => {
    const activeId = hoveredDepartmentId || selectedDepartmentId;

    if (!activeId) {
      // Clear highlighting
      setNodes(nds =>
        nds.map(n =>
          n.data.isHighlighted ? { ...n, data: { ...n.data, isHighlighted: false } } : n
        )
      );
      setEdges(eds =>
        eds.map(e => ({
          ...e,
          style: { stroke: '#94a3b8', strokeWidth: 2, transition: 'all 200ms ease-in-out' },
          zIndex: 0,
          animated: false,
        }))
      );
      return;
    }

    const ancestors = ancestorMap.get(activeId) || [];
    const highlightedIds = new Set([activeId, ...ancestors]);
    const highlightColor = isDarkMode ? '#60a5fa' : '#2563eb';

    setNodes(nds =>
      nds.map(n => {
        const shouldHighlight = highlightedIds.has(n.id);
        if (n.data.isHighlighted !== shouldHighlight) {
          return { ...n, data: { ...n.data, isHighlighted: shouldHighlight } };
        }
        return n;
      })
    );

    setEdges(eds =>
      eds.map(e => {
        const isHighlighted = highlightedIds.has(e.target) && highlightedIds.has(e.source);
        return {
          ...e,
          style: {
            stroke: isHighlighted ? highlightColor : '#94a3b8',
            strokeWidth: isHighlighted ? 4 : 2,
            transition: 'all 200ms ease-in-out',
            opacity: isHighlighted ? 1 : 0.3,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isHighlighted ? highlightColor : '#94a3b8',
            width: 20,
            height: 20,
          },
          zIndex: isHighlighted ? 1000 : 0,
        };
      })
    );
  }, [hoveredDepartmentId, selectedDepartmentId, ancestorMap, setNodes, setEdges, isDarkMode]);

  // Load organization data from public API
  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);

        if (!shareToken) {
          setError('Missing share token');
          return;
        }

        // Fetch public organization
        const org = await api.getPublicOrganization(shareToken);

        if (org.name) {
          setOrgName(org.name);
        }

        if (org.fieldDefinitions) {
          setFieldDefinitions(org.fieldDefinitions);
        } else if (org.field_definitions) {
          setFieldDefinitions(org.field_definitions);
        }

        if (!org.departments || org.departments.length === 0) {
          setNodes([]);
          setEdges([]);
          setIsLoading(false);
          return;
        }

        // Transform API data to React Flow format
        const { nodes: parsedNodes, edges: parsedEdges } = transformToFlowData(
          org.departments,
          handleNodeHover,
          handleNodeSelect
        );

        // Store departments for search
        setFullDepartments(org.departments);

        // Apply initial layout
        const layoutedNodes = calculateLayout(parsedNodes, parsedEdges, layoutDirection);

        setNodes(layoutedNodes as Node<NodeData>[]);
        setEdges(parsedEdges);

        // Fit view after initial load
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 800 });
        }, 100);
      } catch (err) {
        console.error('Error loading organization data:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Organization not found or not publicly shared';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    if (shareToken) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken]);

  // Close detail panel
  const handleCloseDetail = useCallback((): void => {
    setSelectedPerson(null);
    setSelectedDepartmentId(null);
  }, []);

  // Expand all departments
  const handleExpandAll = useCallback((): void => {
    setNodes(nds => {
      const updatedNodes = nds.map(node => ({
        ...node,
        data: { ...node.data, isExpanded: true },
      }));

      const layoutedNodes = calculateLayout(updatedNodes, edges, layoutDirection);

      return layoutedNodes.map(node => ({
        ...node,
        position: node.position || { x: 0, y: 0 },
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person: Person) => handleSelectPerson(person),
        },
      })) as Node<NodeData>[];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, layoutDirection, setNodes]);

  // Collapse all departments
  const handleCollapseAll = useCallback((): void => {
    setNodes(nds => {
      const updatedNodes = nds.map(node => ({
        ...node,
        data: { ...node.data, isExpanded: false },
      }));

      const layoutedNodes = calculateLayout(updatedNodes, edges, layoutDirection);

      return layoutedNodes.map(node => ({
        ...node,
        position: node.position || { x: 0, y: 0 },
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person: Person) => handleSelectPerson(person),
        },
      })) as Node<NodeData>[];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, layoutDirection, setNodes]);

  // Toggle layout direction
  const handleToggleLayout = useCallback((): void => {
    const newDirection: 'TB' | 'LR' = layoutDirection === 'TB' ? 'LR' : 'TB';
    setLayoutDirection(newDirection);

    setNodes(nds => {
      const layoutedNodes = calculateLayout(nds, edges, newDirection);

      return layoutedNodes.map(node => ({
        ...node,
        position: node.position || { x: 0, y: 0 },
        data: {
          ...node.data,
          onToggleExpand: () => handleToggleExpand(node.id),
          onSelectPerson: (person: Person) => handleSelectPerson(person),
        },
      })) as Node<NodeData>[];
    });

    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [layoutDirection, edges, fitView, handleToggleExpand, handleSelectPerson, setNodes]);

  // Handle theme change
  const handleThemeChange = useCallback((themeName: string): void => {
    setCurrentTheme(themeName);
  }, []);

  // Handle navigation to department
  const handleNavigateToDepartment = useCallback(
    (departmentId: string): void => {
      const node = nodes.find(n => n.id === departmentId);
      if (node && node.position) {
        setCenter(node.position.x + 110, node.position.y + 35, { zoom: 1.5, duration: 800 });
        setHighlightedNodeId(node.id);
        setTimeout(() => setHighlightedNodeId(null), 3000);
      }
    },
    [nodes, setCenter, setHighlightedNodeId]
  );

  // Handle search result selection
  const handleSearchSelect = useCallback(
    (result: {
      type: 'department' | 'person';
      id: string;
      name: string;
      subtitle: string;
      nodeId: string;
      departmentName?: string;
      person?: {
        id: string;
        name: string;
        title: string | null;
        email: string | null;
        phone: string | null;
      } | null;
    }): void => {
      if (result.type === 'department') {
        handleNavigateToDepartment(result.nodeId);
      } else if (result.type === 'person') {
        // Expand department if not expanded, then zoom to it
        const nodeId = result.nodeId;
        const node = nodes.find(n => n.id === nodeId);

        if (node && !node.data.isExpanded) {
          handleToggleExpand(nodeId);
        }

        setTimeout(() => {
          const updatedNode = nodes.find(n => n.id === nodeId);
          if (updatedNode && updatedNode.position) {
            setCenter(updatedNode.position.x + 140, updatedNode.position.y + 100, {
              zoom: 1.5,
              duration: 800,
            });
            setHighlightedNodeId(nodeId);
            setTimeout(() => setHighlightedNodeId(null), 3000);
          }

          // Open detail panel
          if (result.person) {
            setSelectedPerson(result.person as Person);
          }
        }, 300);
      }
    },
    [handleNavigateToDepartment, nodes, setCenter, handleToggleExpand, setHighlightedNodeId]
  );

  // Update nodes with callbacks and theme
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        theme: currentTheme, // Include theme to trigger re-render when it changes
        isHighlighted: node.id === highlightedNodeId,
        onToggleExpand: () => handleToggleExpand(node.id),
        onSelectPerson: (person: Person) => handleSelectPerson(person),
      },
    }));
  }, [nodes, currentTheme, highlightedNodeId, handleToggleExpand, handleSelectPerson]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
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
          <p className="text-slate-500">This organization chart is empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-slate-50 dark:bg-slate-900">
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
            nodeColor={(node: Node<NodeData>) => getDepthColors(node.data.depth, currentTheme).hex}
            maskColor={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)'}
            style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }}
            position="bottom-right"
          />
        </ReactFlow>
      </ThemeContext.Provider>

      {/* Public View Badge */}
      <div className="absolute top-4 left-4 z-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-slate-100">{orgName}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Public view • Read only</p>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      <SearchOverlay departments={fullDepartments} onSelectResult={handleSearchSelect} />

      {/* Navigation Toolbar */}
      <Toolbar
        onZoomIn={() => zoomIn({ duration: 300 })}
        onZoomOut={() => zoomOut({ duration: 300 })}
        onFitView={() => fitView({ padding: 0.2, duration: 800 })}
        onResetLayout={() => fitView({ padding: 0.2, duration: 800 })}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onToggleLayout={handleToggleLayout}
        layoutDirection={layoutDirection}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
      />

      {/* Detail Panel */}
      {selectedPerson && (
        <DetailPanel
          person={selectedPerson}
          onClose={handleCloseDetail}
          fieldDefinitions={fieldDefinitions}
          departments={fullDepartments}
          onNavigateToDepartment={handleNavigateToDepartment}
        />
      )}
    </div>
  );
}

/**
 * PublicOrgMap - Wrapper with React Flow Provider
 */
export default function PublicOrgMap(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <PublicOrgMapContent />
    </ReactFlowProvider>
  );
}
