import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import { useTheme } from '../contexts/ThemeContext';
import { OrgChartThemeContext } from '../contexts/OrgChartThemeContext';
import DepartmentNodeComponent from './DepartmentNode';
import DetailPanel from './DetailPanel';
import SearchOverlay from './SearchOverlay';
import Toolbar from './Toolbar';
import ExportButton from './map/ExportButton';
import PersonForm from './admin/PersonForm';
import { calculateLayout } from '../utils/layoutEngine';
import { getDepthColors } from '../utils/colors';
import { exportToPng, exportToPdf } from '../utils/exportUtils';
import { useToast } from './ui/Toast';
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';
import { useOrgMapSettings } from '../hooks/useOrgMapSettings';
// import { useAnalytics } from '../contexts/AnalyticsContext';

import api from '../api/client';
import { Department, Person, Organization, CustomFieldDefinition } from '../types/index';

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
  onAddPerson?: (departmentId: string) => void;
  onUpdatePerson?: (personId: string, updates: Partial<Person>) => Promise<void>;
  onOpenFullEdit?: (person: Person) => void;
}

// Type for layout direction
type Direction = 'TB' | 'LR';

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
  const getDepth = (
    dept: Department,
    deptMap: Map<string, Department>,
    depth = 0,
    visited = new Set<string>()
  ): number => {
    if (!dept.parent_id) return depth;

    // Check for circular reference
    if (visited.has(dept.id)) {
      console.warn(`Circular reference detected for department: ${dept.name} (${dept.id})`);
      return depth;
    }
    visited.add(dept.id);

    const parent = deptMap.get(dept.parent_id);
    return parent ? getDepth(parent, deptMap, depth + 1, visited) : depth;
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
  const {
    settings,
    updateSettings,
    resetSettings,
    isLoaded: isSettingsLoaded,
  } = useOrgMapSettings(orgId);
  const [nodes, setNodes, onNodesChange] = useNodesState<DepartmentNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  // layoutDirection and currentTheme are now managed by settings
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  // const [currentTheme, setCurrentTheme] = useState<string>('slate'); // Removed in favor of settings
  const [exporting, setExporting] = useState<boolean>(false);
  const [orgName, setOrgName] = useState<string>('Organization Chart');
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);

  // Person form state
  const [isPersonFormOpen, setIsPersonFormOpen] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [createDepartmentId, setCreateDepartmentId] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState<boolean>(false);
  const [flatDepartments, setFlatDepartments] = useState<Department[]>([]);
  const [canEdit, setCanEdit] = useState<boolean>(false);

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const toast = useToast();
  const { isDarkMode } = useTheme();
  // const { track } = useAnalytics();

  const [searchParams] = useSearchParams();

  // Use ref for fitView to avoid dependency issues in useCallback
  // fitView from useReactFlow() can cause infinite re-render loops when used as dependency
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;

  // Use ref for nodes to avoid stale closure issues in setTimeout callbacks
  // When handleSearchSelect uses setTimeout, the callback captures the old nodes reference.
  // Using a ref ensures we always access the current nodes state.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Track whether deep link has been processed to prevent re-running on every nodes update
  const deepLinkProcessedRef = useRef(false);

  // Select person for detail panel
  const handleSelectPerson = useCallback((person: Person): void => {
    setSelectedPerson(person);
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
          settings.layoutDirection
        );

        // Update settings with new expanded state
        const expandedNodeIds = updatedNodes.filter(n => n.data.isExpanded).map(n => n.id);
        updateSettings({ expandedNodes: expandedNodeIds });

        // Merge layout positions with original data, preserving saved positions if available
        return layoutedNodes.map((layoutNode: unknown, idx: number) => {
          const typedLayoutNode = layoutNode as Node;
          // Only use custom position if not calculating fresh layout...
          // Actually, if we are expanding/collapsing, we should probably respect auto-layout
          // unless user has pinned nodes?
          // For now, let Dagre handle layout on expand/collapse, but maybe we should
          // clear specific custom positions if they conflict?
          // Simplest approach: Dagre layout takes precedence on structure change.
          return {
            ...updatedNodes[idx],
            position: typedLayoutNode.position,
          } as Node<DepartmentNodeData>;
        });
      });
    },
    [edges, settings.layoutDirection, setNodes, updateSettings]
  );

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

        // Check if user can edit (editor, admin, or owner)
        const editableRoles = ['owner', 'admin', 'editor'];
        setCanEdit(org.role ? editableRoles.includes(org.role) : false);

        // Store flat department list for PersonForm dropdown
        if (org.departments) {
          setFlatDepartments(org.departments);
        }

        if (!org.departments || org.departments.length === 0) {
          setNodes([]);
          setEdges([]);
          if (showLoading) setIsLoading(false);
          return;
        }

        // Transform API data to React Flow format
        const { nodes: parsedNodes, edges: parsedEdges } = transformToFlowData(org.departments);

        // Apply saved expanded state to nodes
        if (settings.expandedNodes && settings.expandedNodes.length > 0) {
          const expandedSet = new Set(settings.expandedNodes);
          parsedNodes.forEach(node => {
            if (expandedSet.has(node.id)) {
              node.data.isExpanded = true;
            }
          });
        }

        // Apply initial layout
        const layoutedNodes = calculateLayout(
          parsedNodes as unknown as Node[],
          parsedEdges,
          settings.layoutDirection
        );

        // Merge layout positions with original data AND saved positions
        const nodesWithLayout = layoutedNodes.map((layoutNode: unknown, idx: number) => {
          const typedLayoutNode = layoutNode as Node;
          const savedPos = settings.nodePositions[typedLayoutNode.id];

          return {
            ...parsedNodes[idx],
            // Use saved position if available, otherwise calculated position
            position: savedPos || typedLayoutNode.position,
          } as Node<DepartmentNodeData>;
        });

        setNodes(nodesWithLayout);
        setEdges(parsedEdges);

        // Fetch custom field definitions
        const defs = await api.getCustomFieldDefinitions(orgId);
        setFieldDefinitions(defs);

        // Fit view after initial load (only if no deep link and NOT using saved viewport)
        if (showLoading) {
          const hasDeepLink = searchParams.get('personId') || searchParams.get('departmentId');
          // Only auto-fit if we don't have a saved custom viewport position
          // We check if viewport is default (0,0,1) roughly
          const hasSavedViewport =
            settings.viewport.x !== 0 || settings.viewport.y !== 0 || settings.viewport.zoom !== 1;

          if (!hasDeepLink && !hasSavedViewport) {
            setTimeout(() => {
              fitViewRef.current({ padding: 0.2, duration: 800 });
            }, 100);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams is read but not reactive here
    [orgId, settings.layoutDirection, setNodes, setEdges, isSettingsLoaded]
  );

  // Wait for settings to load before fetching data
  useEffect(() => {
    if (isSettingsLoaded && orgId) {
      loadData();
    }
  }, [isSettingsLoaded, orgId, loadData]);

  // Reset deep link processed flag when URL params change
  useEffect(() => {
    deepLinkProcessedRef.current = false;
  }, [searchParams]);

  // Handle auto-zoom from URL parameter (e.g. from department list)
  useEffect(() => {
    const personId = searchParams.get('personId');
    const departmentId = searchParams.get('departmentId');

    // Skip if no deep link, still loading, no nodes, or already processed
    if (
      (!personId && !departmentId) ||
      isLoading ||
      nodes.length === 0 ||
      deepLinkProcessedRef.current
    ) {
      return;
    }

    // Mark as processed to prevent re-running
    deepLinkProcessedRef.current = true;

    if (personId) {
      // Find the node containing this person
      let targetNodeId: string | undefined;
      let targetPerson: Person | undefined;

      for (const node of nodes) {
        const person = node.data.people.find(p => p.id === personId);
        if (person) {
          targetNodeId = node.id;
          targetPerson = person;
          break;
        }
      }

      if (targetNodeId && targetPerson) {
        const node = nodes.find(n => n.id === targetNodeId);

        if (node && !node.data.isExpanded) {
          handleToggleExpand(targetNodeId);
        }

        setTimeout(() => {
          const updatedNode = nodesRef.current.find(n => n.id === targetNodeId);
          if (updatedNode && updatedNode.position) {
            setCenter(updatedNode.position.x + 140, updatedNode.position.y + 100, {
              zoom: 1.5,
              duration: 800,
            });
            setHighlightedNodeId(targetNodeId);
            setTimeout(() => setHighlightedNodeId(null), 3000);
          }

          setSelectedPerson(targetPerson as Person);
        }, 500); // Increased delay to ensure ReactFlow is ready
      }
    } else if (departmentId) {
      const targetNode = nodes.find(n => n.id === departmentId);

      if (targetNode?.position) {
        // Use a longer delay to ensure ReactFlow viewport is ready
        setTimeout(() => {
          setCenter(targetNode.position.x + 110, targetNode.position.y + 35, {
            zoom: 1.5,
            duration: 800,
          });
          setHighlightedNodeId(departmentId);
          setTimeout(() => setHighlightedNodeId(null), 3000);
        }, 500); // Increased delay
      }
    }
  }, [isLoading, nodes, searchParams, handleToggleExpand, setCenter]);

  // Initial load
  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId, loadData]);

  // Memoize callbacks for real-time updates to prevent re-subscriptions
  const handleDepartmentChange = useCallback(() => {
    loadData(false);
  }, [loadData]);

  const handlePersonChange = useCallback(() => {
    loadData(false);
  }, [loadData]);

  // Real-time updates
  useRealtimeUpdates(orgId, {
    onDepartmentChange: handleDepartmentChange,
    onPersonChange: handlePersonChange,
    showNotifications: true,
  });

  // No longer needed - theme is handled by useOrgMapSettings
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem('orgTreeTheme');
  //   if (savedTheme) {
  //     setCurrentTheme(savedTheme);
  //   }
  // }, []);

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
        settings.layoutDirection
      );

      return layoutedNodes.map((layoutNode: unknown, idx: number) => {
        const typedLayoutNode = layoutNode as Node;
        return {
          ...updatedNodes[idx],
          position: typedLayoutNode.position,
        } as Node<DepartmentNodeData>;
      });
    });

    // Clear expanded state in settings only if collapsing, but here we are expanding all
    // Ideally we should track all IDs? For now, we don't save "all expanded" to settings explicitly
    // unless we iterate all nodes.
    // Let's defer syncing expand-all to settings for this iteration or save list of all IDs.
  }, [edges, settings.layoutDirection, setNodes]);

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
        settings.layoutDirection
      );

      // Clear expanded nodes in settings
      updateSettings({ expandedNodes: [] });

      return layoutedNodes.map((layoutNode: unknown, idx: number) => {
        const typedLayoutNode = layoutNode as Node;
        return {
          ...updatedNodes[idx],
          position: typedLayoutNode.position,
        } as Node<DepartmentNodeData>;
      });
    });
  }, [edges, settings.layoutDirection, setNodes, updateSettings]);

  // Toggle layout direction
  const handleToggleLayout = useCallback((): void => {
    const newDirection: Direction = settings.layoutDirection === 'TB' ? 'LR' : 'TB';
    // setLayoutDirection(newDirection); - now handled via updateSettings
    updateSettings({ layoutDirection: newDirection });

    setNodes(nds => {
      const layoutedNodes = calculateLayout(nds as unknown as Node[], edges, newDirection);

      return layoutedNodes.map((layoutNode: unknown, idx: number) => {
        const typedLayoutNode = layoutNode as Node;
        return {
          ...nds[idx],
          position: typedLayoutNode.position,
        } as Node<DepartmentNodeData>;
      });
    });

    setTimeout(() => fitViewRef.current({ padding: 0.2, duration: 800 }), 100);
  }, [settings.layoutDirection, edges, setNodes, updateSettings]);

  // Handle theme change
  const handleThemeChange = useCallback(
    (themeName: string): void => {
      updateSettings({ theme: themeName });
      // setCurrentTheme(themeName);
      // localStorage.setItem('orgTreeTheme', themeName); // Handled by hook
    },
    [updateSettings]
  );

  // Handle Reset Layout
  const handleResetLayout = useCallback(() => {
    if (confirm('Reset layout to default? This will clear all custom positions and settings.')) {
      resetSettings();
      // Reload needed to re-apply default layout calculation to nodes
      setTimeout(() => loadData(false), 50);
    }
  }, [resetSettings, loadData]);

  // Handle Viewport Change (Zoom/Pan)
  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      // Prevent saving viewport updates before map is fully ready/interacted
      // or if actively loading
      if (isLoading || !isMapReady) return;
      updateSettings({ viewport, zoom: viewport.zoom });
    },
    [updateSettings, isLoading, isMapReady]
  );

  // Handle Node Drag (Custom Positions)
  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      if (isLoading || !isMapReady) return;
      const newCtx = { ...settings.nodePositions, [node.id]: node.position };
      updateSettings({ nodePositions: newCtx });
    },
    [settings.nodePositions, updateSettings, isLoading, isMapReady]
  );

  // Handle export to PNG
  const handleExportPng = useCallback(async () => {
    if (!reactFlowWrapper.current) return;

    try {
      setExporting(true);
      const filename = `${orgName.toLowerCase().replace(/\s+/g, '-')}-org-chart.png`;
      await exportToPng(reactFlowWrapper.current, filename);
      toast.success('Chart exported as PNG successfully!');
      // track('export_chart', { format: 'png', org_name: orgName });
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
      // track('export_chart', { format: 'pdf', org_name: orgName });
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
          // Use nodesRef.current to get the latest nodes after state update
          // This avoids the stale closure issue where 'nodes' would be the old reference
          const updatedNode = nodesRef.current.find(n => n.id === nodeId);
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

  // Handle edit person from DetailPanel
  const handleEditPerson = useCallback((person: Person): void => {
    setEditingPerson(person);
    setCreateDepartmentId(null);
    setIsPersonFormOpen(true);
    // Close the detail panel when opening edit form
    setSelectedPerson(null);
  }, []);

  // Handle add person from DepartmentNode
  const handleAddPerson = useCallback((departmentId: string): void => {
    setEditingPerson(null);
    setCreateDepartmentId(departmentId);
    setIsPersonFormOpen(true);
  }, []);

  // Handle form close
  const handlePersonFormClose = useCallback((): void => {
    setIsPersonFormOpen(false);
    setEditingPerson(null);
    setCreateDepartmentId(null);
  }, []);

  // Handle person updates from inline editing
  const handlePersonUpdate = useCallback(
    async (personId: string, updates: Partial<Person>): Promise<void> => {
      if (!orgId) return;

      // Optimistic update
      setNodes(prevNodes =>
        prevNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            people: node.data.people.map(p => (p.id === personId ? { ...p, ...updates } : p)),
          },
        }))
      );

      try {
        await api.updatePerson(personId, updates);
        // Success - no further action needed as real-time updates will confirm
      } catch (error) {
        console.error('Failed to update person:', error);
        setError('Failed to save changes');
        // Revert changes could be implemented here by reloading data
        loadData(false);
      }
    },
    [orgId, loadData, setNodes]
  );

  // Wrap handlePersonUpdate to also update selectedPerson if needed
  const handlePersonUpdateWithSelection = useCallback(
    async (personId: string, updates: Partial<Person>): Promise<void> => {
      // If the updated person is currently selected in DetailPanel, update that state too
      if (selectedPerson && selectedPerson.id === personId) {
        setSelectedPerson(prev => (prev ? { ...prev, ...updates } : null));
      }

      await handlePersonUpdate(personId, updates);
    },
    [handlePersonUpdate, selectedPerson]
  );

  // Handle navigation from hierarchy in detail panel
  const handleNavigateToDepartment = useCallback(
    (departmentId: string) => {
      // Close detail panel
      setSelectedPerson(null);

      // Find and zoom to department node
      const node = nodes.find(n => n.id === departmentId);
      if (node && node.position) {
        setCenter(node.position.x + 110, node.position.y + 35, { zoom: 1.5, duration: 800 });
        setHighlightedNodeId(departmentId);
        setTimeout(() => setHighlightedNodeId(null), 3000);
      }
    },
    [nodes, setCenter]
  );

  // Handle person form submission
  const handlePersonFormSubmit = useCallback(
    async (formData: {
      name: string;
      title: string;
      email: string;
      phone: string;
      departmentId: string;
      isStarred: boolean;
      customFields: Record<string, string | null>;
    }): Promise<void> => {
      if (!orgId) return;

      try {
        setIsFormSubmitting(true);

        const personData = {
          name: formData.name,
          title: formData.title || null,
          email: formData.email || null,
          phone: formData.phone || null,
          is_starred: formData.isStarred,
          custom_fields: formData.customFields,
        };

        if (editingPerson) {
          // Update existing person
          // If department changed, we need to handle that separately
          const currentDeptId = editingPerson.department_id;
          const newDeptId = formData.departmentId;

          if (currentDeptId !== newDeptId) {
            // Move person to new department by updating with department_id
            await api.updatePerson(editingPerson.id, {
              ...personData,
              department_id: newDeptId,
            } as unknown as Partial<Person>);
          } else {
            await api.updatePerson(editingPerson.id, personData);
          }
          toast.success('Person updated successfully');
        } else if (createDepartmentId || formData.departmentId) {
          // Create new person
          const targetDeptId = createDepartmentId || formData.departmentId;
          await api.createPerson(targetDeptId, personData);
          toast.success('Person created successfully');
        }

        // Close form and refresh data
        handlePersonFormClose();
        await loadData(false);
      } catch (err) {
        console.error('Error saving person:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to save person';
        toast.error(errorMessage);
      } finally {
        setIsFormSubmitting(false);
      }
    },
    [orgId, editingPerson, createDepartmentId, toast, handlePersonFormClose, loadData]
  );

  // Update highlighted state and callbacks in nodes
  const nodesWithHighlight = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        id: node.id, // Pass node ID for add person callback
        theme: settings.theme,
        isHighlighted: node.id === highlightedNodeId,
        onToggleExpand: () => handleToggleExpand(node.id),
        onSelectPerson: (person: Person) => handleSelectPerson(person),
        onAddPerson: canEdit ? (departmentId: string) => handleAddPerson(departmentId) : undefined,
        onUpdatePerson: canEdit ? handlePersonUpdate : undefined,
        onOpenFullEdit: canEdit ? handleEditPerson : undefined,
      },
    }));
  }, [
    nodes,
    settings.theme,
    highlightedNodeId,
    handleToggleExpand,
    handleSelectPerson,
    canEdit,
    handleAddPerson,
    handlePersonUpdate,
    handleEditPerson,
  ]);

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
      <OrgChartThemeContext.Provider value={settings.theme}>
        <div ref={reactFlowWrapper} className="w-full h-full">
          <ReactFlow
            nodes={nodesWithHighlight}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onMoveEnd={handleMoveEnd}
            onInit={() => setIsMapReady(true)}
            defaultViewport={settings.viewport}
            nodeTypes={nodeTypes}
            edgeTypes={{}}
            defaultEdgeOptions={defaultEdgeOptions}
            minZoom={0.1}
            maxZoom={2}
            fitView={false} // We handle fitView manually
            attributionPosition="bottom-right"
            className="bg-slate-50 dark:bg-slate-900"
          >
            <Background color={isDarkMode ? '#334155' : '#cbd5e1'} gap={16} />
            <MiniMap
              nodeColor={node => getDepthColors(node.data.depth, settings.theme).hex}
              maskColor={isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.7)'}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
            />
          </ReactFlow>
        </div>
      </OrgChartThemeContext.Provider>

      {/* Overlay Components */}
      <SearchOverlay orgId={orgId} onSelectResult={handleSearchSelect} />

      {/* Toolbar */}
      <Toolbar
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={() => fitView({ padding: 0.2, duration: 800 })}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onToggleLayout={handleToggleLayout}
        layoutDirection={settings.layoutDirection}
        currentTheme={settings.theme}
        onThemeChange={handleThemeChange}
        onResetLayout={handleResetLayout}
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
      {selectedPerson && (
        <DetailPanel
          person={selectedPerson}
          onClose={handleCloseDetail}
          fieldDefinitions={fieldDefinitions}
          onEdit={handleEditPerson}
          onUpdate={handlePersonUpdateWithSelection}
          departments={flatDepartments}
          onNavigateToDepartment={handleNavigateToDepartment}
        />
      )}

      {/* Person Form Modal */}
      <PersonForm
        isOpen={isPersonFormOpen}
        onClose={handlePersonFormClose}
        onSubmit={handlePersonFormSubmit}
        person={editingPerson}
        departments={flatDepartments}
        isSubmitting={isFormSubmitting}
        defaultDepartmentId={createDepartmentId || undefined}
      />
    </div>
  );
}
