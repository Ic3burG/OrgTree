import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditablePersonCard from './EditablePersonCard';
import type { Person } from '../types';

const mockPerson: Person = {
  id: '1',
  name: 'Jane Doe',
  title: 'Engineer',
  email: 'jane@example.com',
  phone: '123-456-7890',
  is_starred: false,
  department_id: 'dep1',
  sort_order: 0,
  deleted_at: null,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
};

describe('EditablePersonCard', () => {
  it('renders in view mode correctly', () => {
    render(<EditablePersonCard person={mockPerson} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('enters edit mode when isEditing is true', () => {
    render(<EditablePersonCard person={mockPerson} isEditing={true} />);
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Engineer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onUpdate when save is clicked', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    render(<EditablePersonCard person={mockPerson} isEditing={true} onUpdate={handleUpdate} />);

    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Updated' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Jane Updated',
        })
      );
    });
  });

  it('validates input before saving', async () => {
    const handleUpdate = vi.fn();
    render(<EditablePersonCard person={mockPerson} isEditing={true} onUpdate={handleUpdate} />);

    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: '' } }); // Empty name

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(handleUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('cancels editing when cancel is clicked', async () => {
    const handleEditEnd = vi.fn();
    render(<EditablePersonCard person={mockPerson} isEditing={true} onEditEnd={handleEditEnd} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleEditEnd).toHaveBeenCalled();
  });
});
