import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import OrgMap from './OrgMap';
import { ReactFlowProvider } from 'reactflow';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../api/client';
import { useOrgMapSettings } from '../hooks/useOrgMapSettings';
import React from 'react';

// Define mocks outside so they can be accessed in tests
const mockFitView = vi.fn();
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockSetCenter = vi.fn();

// Mock ReactFlow
vi.mock('reactflow', async importOriginal => {
  const actual = await importOriginal<typeof import('reactflow')>();
  return {
    ...actual,
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="react-flow">{children}</div>
    ),
    Background: () => <div data-testid="background" />,
    MiniMap: () => <div data-testid="mini-map" />,
    // Use real useState to allow component to update its internal state
    useNodesState: (initial: unknown) => React.useState(initial),
    useEdgesState: (initial: unknown) => React.useState(initial),
    useReactFlow: () => ({
      fitView: mockFitView,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      setCenter: mockSetCenter,
    }),
  };
});

// Mock react-router-dom
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ orgId: 'org-123' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock API
vi.mock('../api/client', () => ({
  default: {
    getOrganization: vi.fn(),
    getCustomFieldDefinitions: vi.fn(),
    updatePerson: vi.fn(),
    createPerson: vi.fn(),
  },
}));

// Mock hooks
vi.mock('../hooks/useOrgMapSettings', () => ({
  useOrgMapSettings: vi.fn(),
}));

vi.mock('../hooks/useRealtimeUpdates', () => ({
  useRealtimeUpdates: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false }),
}));

vi.mock('./ui/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock child components to simplify
vi.mock('./SearchOverlay', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ onSelectResult }: { onSelectResult: (res: any) => void }) => (
    <div data-testid="search-overlay">
      <button onClick={() => onSelectResult({ type: 'department', nodeId: 'dept-1' })}>
        Select Dept 1
      </button>
    </div>
  ),
}));
vi.mock('./Toolbar', () => ({
  default: ({
    onExpandAll,
    onCollapseAll,
    onToggleLayout,
    onResetLayout,
  }: {
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onToggleLayout: () => void;
    onResetLayout: () => void;
  }) => (
    <div data-testid="toolbar">
      <button onClick={onExpandAll}>Expand All</button>
      <button onClick={onCollapseAll}>Collapse All</button>
      <button onClick={onToggleLayout}>Toggle Layout</button>
      <button onClick={onResetLayout}>Reset Layout</button>
    </div>
  ),
}));
vi.mock('./DetailPanel', () => ({ default: () => <div data-testid="detail-panel" /> }));
vi.mock('./admin/PersonForm', () => ({ default: () => <div data-testid="person-form" /> }));
vi.mock('./map/ExportButton', () => ({ default: () => <div data-testid="export-button" /> }));

describe('OrgMap Component', () => {
  const mockOrg = {
    id: 'org-123',
    name: 'Test Org',
    role: 'admin',
    departments: [{ id: 'dept-1', name: 'Engineering', parent_id: null, people: [] }],
  };

  const mockSettings = {
    theme: 'slate',
    layoutDirection: 'TB',
    expandedNodes: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    nodePositionsTB: {},
    nodePositionsLR: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useOrgMapSettings as Mock).mockReturnValue({
      settings: mockSettings,
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      isLoaded: true,
    });
    (api.getOrganization as Mock).mockResolvedValue(mockOrg);
    (api.getCustomFieldDefinitions as Mock).mockResolvedValue([]);
  });

  const renderComponent = () => {
    return render(
      <ReactFlowProvider>
        <MemoryRouter initialEntries={['/org/org-123/map']}>
          <Routes>
            <Route path="/org/:orgId/map" element={<OrgMap />} />
          </Routes>
        </MemoryRouter>
      </ReactFlowProvider>
    );
  };

  it('renders loading state initially', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolveApi: (value: any) => void;
    const apiPromise = new Promise(resolve => {
      resolveApi = resolve;
    });
    (api.getOrganization as Mock).mockReturnValue(apiPromise);

    renderComponent();
    expect(screen.getByText(/Loading organization map/i)).toBeDefined();

    await act(async () => {
      resolveApi!(mockOrg);
    });
  });

  it('renders the map after loading data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('react-flow')).toBeDefined();
    });

    expect(screen.getByTestId('toolbar')).toBeDefined();
    expect(screen.getByTestId('search-overlay')).toBeDefined();
    expect(api.getOrganization).toHaveBeenCalledWith('org-123');
  });

  it('handles empty organization gracefully', async () => {
    (api.getOrganization as Mock).mockResolvedValue({
      ...mockOrg,
      departments: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No departments yet/i)).toBeDefined();
    });
  });

  it('handles API errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (api.getOrganization as Mock).mockRejectedValue(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Map/i)).toBeDefined();
      expect(screen.getByText(/API Error/i)).toBeDefined();
    });
  });

  it('handles Expand All toolbar action', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByTestId('react-flow')).toBeDefined());

    const expandAllBtn = screen.getByText('Expand All');
    fireEvent.click(expandAllBtn);

    // Check if toolbar button exists
    expect(expandAllBtn).toBeDefined();
  });

  it('handles search result selection', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByTestId('react-flow')).toBeDefined());

    const selectDeptBtn = screen.getByText('Select Dept 1');
    fireEvent.click(selectDeptBtn);

    expect(mockSetCenter).toHaveBeenCalled();
  });
});
