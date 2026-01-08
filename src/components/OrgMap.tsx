import React, { useState, useEffect, useCallback, useMemo, createContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  Node,
  Edge,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import DepartmentNodeComponent from './DepartmentNode';
import DetailPanel from './DetailPanel';
import SearchOverlay from './SearchOverlay';
import Toolbar from './Toolbar';
import ExportButton from './map/ExportButton';
import { calculateLayout } from '../utils/layoutEngine';
import { getDepthColors } from '../utils/colors';
import { exportToPng, exportToPdf } from '../utils/exportUtils';
import { useToast } from './ui/Toast';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import api from '../api/client';
import { Department, Person, Organization } from '../types/index';

// Extended Organization type that includes departments
interface OrganizationWithDepartments extends Organization {
  departments: Department[];
}

// Node data structure for React Flow
interface DepartmentNodeData {
  name: string;
  path: string;
  depth: number;
  description: string;
  people: Person[];
  isExpanded: boolean;
  theme?: string;
  isHighlighted?: boolean;
  onToggleExpand?: () => void;
  onSelectPerson?: (person: Person) => void;
}

// Type for layout direction
type Direction = 'TB' | 'LR';

// Theme context for providing current theme to all nodes
export const ThemeContext = createContext<string>('slate');

// Register custom node types
const nodeTypes: NodeTypes = {
  department: DepartmentNodeComponent,
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

/**
 * Transform API data to React Flow format
 */
function transformToFlowData(departments: Department[]): {
  nodes: Node<DepartmentNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<DepartmentNodeData>[] = [];
  const edges: Edge[] = [];

  // Helper to calculate depth
  const getDepth = (dept: Department, deptMap: Map<string, Department>, depth = 0): number => {
    if (!dept.parent_id) return depth;
    const parent = deptMap.get(dept.parent_id);
    return parent ? getDepth(parent, deptMap, depth + 1) : depth;
  };

  // Create a map for quick lookups
  const deptMap = new Map(departments.map(d => [d.id, d]));

  departments.forEach(dept => {
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
export default function OrgMap(): React.JSX.Element {
  const { orgId } = useParams<{ orgId: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState<DepartmentNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [layoutDirection, setLayoutDirection] = useState<Direction>('TB');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('slate');
  const [exporting, setExporting] = useState<boolean>(false);
  const [orgName, setOrgName] = useState<string>('Organization Chart');

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const toast = useToast();

  // Load organization data from API
  const loadData = useCallback(
    async (showLoading = true): Promise<void> => {
      try {
        if (showLoading) setIsLoading(true);
        setError(null);

        // Fetch organization with all departments and people
        if (!orgId) return;

        const org = (await api.getOrganization(orgId)) as OrganizationWithDepartments;

        // Store organization name for exports
        if (org.name) {
          setOrgName(org.name);
        }

        if (!org.departments || org.departments.length === 0) {
          setNodes([]);
          setEdges([]);
          if (showLoading) setIsLoading(false);
          return;
        }

        // Transform API data to React Flow format
        const { nodes: parsedNodes, edges: parsedEdges } = transformToFlowData(org.departments);

        // Apply initial layout
        const layoutedNodes = calculateLayout(
          parsedNodes as unknown as Node[],
          parsedEdges,
          layoutDirection
        );

        // Add callbacks to node data
        const nodesWithCallbacks: Node<DepartmentNodeData>[] = layoutedNodes.map(
          (node: unknown) => {
            const typedNode = node as Node<DepartmentNodeData>;
            return {
              ...typedNode,
              data: {
                ...typedNode.data,
                onToggleExpand: () => handleToggleExpand(typedNode.id),
                onSelectPerson: (person: Person) => handleSelectPerson(person),
              },
            };
          }
        );

        setNodes(nodesWithCallbacks);
        setEdges(parsedEdges);

        // Fit view after initial load (only on first load)
        if (showLoading) {
          setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 });
          }, 100);
        }
      } catch (err) {
        console.error('Error loading organization data:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load organization data';
        setError(errorMessage);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [orgId, layoutDirection, fitView, setNodes, setEdges]
  );

  // Initial load
  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId, loadData]);

  // Real-time updates
  useRealtimeUpdates(orgId, {
    onDepartmentChange: () => loadData(false),
    onPersonChange: () => loadData(false),
    showNotifications: true,
  });

  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('orgTreeTheme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
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
        const layoutedNodes = calculateLayout(
          updatedNodes as unknown as Node[],
          edges,
          layoutDirection
        );

        // Preserve callbacks
        const nodesWithCallbacks: Node<DepartmentNodeData>[] = layoutedNodes.map(
          (node: unknown) => {
            const typedNode = node as Node<DepartmentNodeData>;
            return {
              ...typedNode,
              data: {
                ...typedNode.data,
                onToggleExpand: () => handleToggleExpand(typedNode.id),
                onSelectPerson: (person: Person) => handleSelectPerson(person),
              },
            };
          }
        );

        return nodesWithCallbacks;
      });
    },
    [edges, layoutDirection, setNodes]
  );

  // Select person for detail panel
  const handleSelectPerson = useCallback((person: Person): void => {
    setSelectedPerson(person);
  }, []);

  // Close detail panel
  const handleCloseDetail = useCallback((): void => {
    setSelectedPerson(null);
  }, []);

  // Expand all departments
  const handleExpandAll = useCallback((): void => {
    setNodes(nds => {
      const updatedNodes = nds.map(node => ({
        ...node,
        data: { ...node.data, isExpanded: true },
      }));

      const layoutedNodes = calculateLayout(
        updatedNodes as unknown as Node[],
        edges,
        layoutDirection
      );

      const nodesWithCallbacks: Node<DepartmentNodeData>[] = layoutedNodes.map((node: unknown) => {
        const typedNode = node as Node<DepartmentNodeData>;
        return {
          ...typedNode,
          data: {
            ...typedNode.data,
            onToggleExpand: () => handleToggleExpand(typedNode.id),
            onSelectPerson: (person: Person) => handleSelectPerson(person),
          },
        };
      });

      return nodesWithCallbacks;
    });
  }, [edges, layoutDirection, handleToggleExpand, handleSelectPerson, setNodes]);

  // Collapse all departments
  const handleCollapseAll = useCallback((): void => {
    setNodes(nds => {
      const updatedNodes = nds.map(node => ({
        ...node,
        data: { ...node.data, isExpanded: false },
      }));

      const layoutedNodes = calculateLayout(
        updatedNodes as unknown as Node[],
        edges,
        layoutDirection
      );

      const nodesWithCallbacks: Node<DepartmentNodeData>[] = layoutedNodes.map((node: unknown) => {
        const typedNode = node as Node<DepartmentNodeData>;
        return {
          ...typedNode,
          data: {
            ...typedNode.data,
            onToggleExpand: () => handleToggleExpand(typedNode.id),
            onSelectPerson: (person: Person) => handleSelectPerson(person),
          },
        };
      });

      return nodesWithCallbacks;
    });
  }, [edges, layoutDirection, handleToggleExpand, handleSelectPerson, setNodes]);

  // Toggle layout direction
  const handleToggleLayout = useCallback((): void => {
    const newDirection: Direction = layoutDirection === 'TB' ? 'LR' : 'TB';
    setLayoutDirection(newDirection);

    setNodes(nds => {
      const layoutedNodes = calculateLayout(nds as unknown as Node[], edges, newDirection);

      const nodesWithCallbacks: Node<DepartmentNodeData>[] = layoutedNodes.map((node: unknown) => {
        const typedNode = node as Node<DepartmentNodeData>;
        return {
          ...typedNode,
          data: {
            ...typedNode.data,
            onToggleExpand: () => handleToggleExpand(typedNode.id),
            onSelectPerson: (person: Person) => handleSelectPerson(person),
          },
        };
      });

      return nodesWithCallbacks;
    });

    setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
  }, [layoutDirection, edges, fitView, handleToggleExpand, handleSelectPerson, setNodes]);

  // Handle theme change
  const handleThemeChange = useCallback((themeName: string): void => {
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
        // Zoom to department node
        const node = nodes.find(n => n.id === result.nodeId);
        if (node && node.position) {
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
    [nodes, setCenter, handleToggleExpand]
  );

  // Update highlighted state and callbacks in nodes
  const nodesWithHighlight = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        theme: currentTheme,
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
          <h3 className="text-lg font-medium text-slate-900 mb-2">No departments yet</h3>
          <p className="text-slate-500">
            Create departments in the Departments section to see them visualized here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-slate-50 dark:bg-slate-900">
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
            // Touch-friendly settings for mobile
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
            preventScrolling={false}
          >
            <Background color="#cbd5e1" gap={20} size={1} />
            <MiniMap
              nodeColor={node => getDepthColors(node.data.depth, currentTheme).hex}
              maskColor="rgba(0, 0, 0, 0.1)"
              position="bottom-right"
            />
          </ReactFlow>
        </div>
      </ThemeContext.Provider>

      {/* Overlay Components */}
      <SearchOverlay orgId={orgId} onSelectResult={handleSearchSelect} />

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
      <div className="absolute top-4 left-4 z-10">
        <ExportButton
          onExportPng={handleExportPng}
          onExportPdf={handleExportPdf}
          loading={exporting}
        />
      </div>

      {/* Detail Panel */}
      {selectedPerson && <DetailPanel person={selectedPerson} onClose={handleCloseDetail} />}
    </div>
  );
}
