/* eslint-disable */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersonForm from './PersonForm';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../../api/client';

// Mock API
vi.mock('../../api/client', () => ({
  default: {
    getCustomFieldDefinitions: vi.fn(),
    createCustomFieldDefinition: vi.fn(),
    updateCustomFieldDefinition: vi.fn(),
    deleteCustomFieldDefinition: vi.fn(),
  },
}));

// Mock child components to simplify testing
vi.mock('../ui/CustomFieldInput', () => ({
  default: ({ value, onChange, definition }: any) => (
    <input
      data-testid={`custom-field-${definition.field_key}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
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

vi.mock('../ui/HierarchicalTreeSelector', () => ({
  default: ({ value, onChange, items, placeholder, id }: any) => (
    <select
      id={id}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      data-testid="hierarchical-selector"
    >
      <option value="">{placeholder}</option>
      {/* Simplify items for testing */}
      {items.map((item: any) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  ),
}));

// Mock department utils
vi.mock('../../utils/departmentUtils', () => ({
  getHierarchicalDepartments: (depts: any[]) => depts,
  getIndentedName: (name: string) => name,
  buildDepartmentTree: (depts: any[]) => depts,
}));

const mockDepartments = [
  { id: 'dept-1', name: 'Engineering', parent_id: null, depth: 0 },
  { id: 'dept-2', name: 'Sales', parent_id: null, depth: 0 },
  { id: 'dept-3', name: 'Marketing', parent_id: null, depth: 0 },
];

const mockCustomFields = [
  {
    id: 'field-1',
    organization_id: 'org-1',
    entity_type: 'person',
    name: 'GitHub Handle',
    field_key: 'github_handle',
    field_type: 'text',
    is_required: false,
    is_searchable: true,
    sort_order: 0,
  },
];

describe('PersonForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getCustomFieldDefinitions as Mock).mockResolvedValue(mockCustomFields);
  });

  const renderComponent = (props: any = {}) => {
    return render(
      <MemoryRouter initialEntries={['/org/org-1/people']}>
        <Routes>
          <Route
            path="/org/:orgId/people"
            element={
              <PersonForm
                isOpen={true}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
                departments={mockDepartments}
                {...props}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders correctly for adding a new person', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Add Person' })).toBeDefined();
    expect(screen.getByLabelText(/Full Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Department/i)).toBeDefined();

    // Check if custom fields are loaded
    await waitFor(() => {
      expect(screen.getByTestId('custom-field-github_handle')).toBeDefined();
    });
  });

  it('validates required fields', async () => {
    // Render with empty departments so defaultDepartmentId is empty
    renderComponent({ departments: [] });

    // Click save without filling anything
    const submitBtn = screen.getByRole('button', { name: 'Add Person' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Name is required')).toBeDefined();
    expect(await screen.findByText('Department is required')).toBeDefined();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    renderComponent();

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email/i);

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    await waitFor(() => {
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('invalid-email');
    });

    // Fire submit directly on form to ensure handler is called
    const form = screen.getByRole('button', { name: 'Add Person' }).closest('form');
    if (!form) throw new Error('Form not found');

    fireEvent.submit(form);

    expect(await screen.findByText('Invalid email format')).toBeDefined();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
  it('submits form with valid data', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Department/i), { target: { value: 'dept-1' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });

    // Fill custom field
    await waitFor(() => {
      expect(screen.getByTestId('custom-field-github_handle')).toBeDefined();
    });
    fireEvent.change(screen.getByTestId('custom-field-github_handle'), {
      target: { value: '@johndoe' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Add Person' });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'John Doe',
        departmentId: 'dept-1',
        email: 'john@example.com',
        customFields: expect.objectContaining({
          github_handle: '@johndoe',
        }),
      })
    );
  });

  it('pre-fills data when editing existing person', async () => {
    const existingPerson = {
      id: 'p1',
      name: 'Jane Smith',
      department_id: 'dept-2',
      email: 'jane@example.com',
      title: 'Manager',
      phone: '123-456-7890',
      is_starred: 1,
      custom_fields: { github_handle: '@jane' },
    };

    renderComponent({ person: existingPerson });

    expect(screen.getByText('Edit Person')).toBeDefined();
    expect((screen.getByLabelText(/Full Name/i) as HTMLInputElement).value).toBe('Jane Smith');
    expect((screen.getByLabelText(/Department/i) as HTMLSelectElement).value).toBe('dept-2');

    // Check starred status
    expect(screen.getByText('Starred Contact')).toBeDefined();

    // Check custom field value
    await waitFor(() => {
      const input = screen.getByTestId('custom-field-github_handle') as HTMLInputElement;
      expect(input.value).toBe('@jane');
    });
  });

  it('toggles star status', async () => {
    renderComponent();

    const starButton = screen.getByLabelText('Add to favorites');
    fireEvent.click(starButton);

    expect(screen.getByText('Starred Contact')).toBeDefined();

    fireEvent.click(starButton);
    expect(screen.getByText('Star this Contact')).toBeDefined();
  });
});
