import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DepartmentForm from './DepartmentForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../../api/client';
import React from 'react';
import * as departmentUtils from '../../utils/departmentUtils';

// Mock API
vi.mock('../../api/client', () => ({
  default: {
    getCustomFieldDefinitions: vi.fn(),
    createCustomFieldDefinition: vi.fn(),
    updateCustomFieldDefinition: vi.fn(),
    deleteCustomFieldDefinition: vi.fn(),
  },
}));

// Mock child components
vi.mock('../ui/CustomFieldInput', () => ({
  default: ({ value, onChange, definition }: any) => (
    <input
      data-testid={`custom-field-${definition.field_key}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={definition.name}
    />
  ),
}));

vi.mock('./CustomFieldForm', () => ({
  default: () => <div data-testid="custom-field-form" />,
}));

vi.mock('./DeleteConfirmModal', () => ({
  default: () => <div data-testid="delete-confirm-modal" />,
}));

// Spy on department utils to verify filtering
vi.spyOn(departmentUtils, 'getHierarchicalDepartments');
vi.spyOn(departmentUtils, 'getIndentedName').mockImplementation((name) => name);

const mockDepartments = [
  { id: 'dept-1', name: 'Engineering', parent_id: null, depth: 0 },
  { id: 'dept-2', name: 'Sales', parent_id: null, depth: 0 },
  { id: 'dept-3', name: 'Marketing', parent_id: null, depth: 0 },
];

const mockCustomFields = [
  {
    id: 'field-1',
    organization_id: 'org-1',
    entity_type: 'department',
    name: 'Cost Center',
    field_key: 'cost_center',
    field_type: 'text',
    is_required: false,
    is_searchable: true,
    sort_order: 0,
  },
];

describe('DepartmentForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getCustomFieldDefinitions as Mock).mockResolvedValue(mockCustomFields);
  });

  const renderComponent = (props: any = {}) => {
    return render(
      <MemoryRouter initialEntries={['/org/org-1/departments']}>
        <Routes>
          <Route
            path="/org/:orgId/departments"
            element={
              <DepartmentForm
                isOpen={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                departments={mockDepartments}
                loading={false}
                department={null}
                {...props}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders correctly for creating a new department', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Add Department' })).toBeDefined();
    expect(screen.getByLabelText(/Department Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Parent Department/i)).toBeDefined();

    // Verify all departments are available as parents
    expect(departmentUtils.getHierarchicalDepartments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'dept-1' }),
        expect.objectContaining({ id: 'dept-2' }),
        expect.objectContaining({ id: 'dept-3' }),
      ])
    );
  });

  it('filters out current department from parent options when editing', async () => {
    const editingDepartment = mockDepartments[0]; // Engineering (dept-1)
    
    renderComponent({ department: editingDepartment });

    expect(screen.getByRole('heading', { name: 'Edit Department' })).toBeDefined();
    expect((screen.getByLabelText(/Department Name/i) as HTMLInputElement).value).toBe('Engineering');

    // Verify dept-1 is NOT in the list passed to getHierarchicalDepartments
    expect(departmentUtils.getHierarchicalDepartments).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({ id: 'dept-1' }),
      ])
    );

    // Verify others are present
    expect(departmentUtils.getHierarchicalDepartments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'dept-2' }),
        expect.objectContaining({ id: 'dept-3' }),
      ])
    );
  });

  it('submits form with valid data', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Department Name/i), { target: { value: 'New Dept' } });
    fireEvent.change(screen.getByLabelText(/Parent Department/i), { target: { value: 'dept-2' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test Description' } });

    const submitBtn = screen.getByRole('button', { name: 'Add Department' });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'New Dept',
      parentId: 'dept-2',
      description: 'Test Description',
      customFields: {},
    });
  });

  it('converts empty parentId string to null on submit', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Department Name/i), { target: { value: 'Top Level Dept' } });
    // Parent ID stays default (empty string)

    const submitBtn = screen.getByRole('button', { name: 'Add Department' });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Top Level Dept',
      parentId: null, // Should be null, not ""
    }));
  });

  it('handles custom fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('custom-field-cost_center')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/Department Name/i), { target: { value: 'Finance' } });
    fireEvent.change(screen.getByTestId('custom-field-cost_center'), { target: { value: 'CC-123' } });

    const submitBtn = screen.getByRole('button', { name: 'Add Department' });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Finance',
      customFields: {
        cost_center: 'CC-123',
      },
    }));
  });
});
