import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomFieldInput from './CustomFieldInput';
import { CustomFieldDefinition } from '../../types';

describe('CustomFieldInput', () => {
  const onChangeMock = vi.fn();

  const baseDef: CustomFieldDefinition = {
    id: '1',
    name: 'Test Field',
    field_type: 'text',
    is_required: false,
    options: [],
    organization_id: 'org1',
    created_at: '',
    updated_at: '',
    entity_type: 'person',
    field_key: 'test_field',
    is_searchable: true,
    sort_order: 0,
  };

  it('renders text input', () => {
    render(<CustomFieldInput definition={baseDef} value="Hello" onChange={onChangeMock} />);

    const input = screen.getByLabelText('Test Field');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('Hello');

    fireEvent.change(input, { target: { value: 'New' } });
    expect(onChangeMock).toHaveBeenCalledWith('New');
  });

  it('renders select input', () => {
    const selectDef = { ...baseDef, field_type: 'select' as const, options: ['A', 'B'] };
    render(<CustomFieldInput definition={selectDef} value="A" onChange={onChangeMock} />);

    const select = screen.getByLabelText('Test Field');
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveValue('A');

    fireEvent.change(select, { target: { value: 'B' } });
    expect(onChangeMock).toHaveBeenCalledWith('B');
  });

  it('renders multiselect input (checkboxes)', () => {
    const multiDef = { ...baseDef, field_type: 'multiselect' as const, options: ['X', 'Y', 'Z'] };
    render(<CustomFieldInput definition={multiDef} value="X,Z" onChange={onChangeMock} />);

    expect(screen.getByLabelText('X')).toBeChecked();
    expect(screen.getByLabelText('Y')).not.toBeChecked();
    expect(screen.getByLabelText('Z')).toBeChecked();

    // Check Y (add)
    fireEvent.click(screen.getByLabelText('Y'));
    expect(onChangeMock).toHaveBeenCalledWith(expect.stringMatching(/X,Z,Y/));

    // Uncheck X (remove)
    fireEvent.click(screen.getByLabelText('X'));
    expect(onChangeMock).toHaveBeenCalledWith('Z');
  });

  it('handles number input', () => {
    const numDef = { ...baseDef, field_type: 'number' as const };
    render(<CustomFieldInput definition={numDef} value="42" onChange={onChangeMock} />);

    const input = screen.getByLabelText('Test Field');
    expect(input).toHaveAttribute('type', 'number');
  });
});
