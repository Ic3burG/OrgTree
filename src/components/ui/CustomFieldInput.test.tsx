/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
