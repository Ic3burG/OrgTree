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

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import DepartmentNode from './DepartmentNode';
import { ThemeProvider } from '../contexts/ThemeContext';
import { OrgChartThemeContext } from '../contexts/OrgChartThemeContext';

// Mock data for testing
const mockPerson = {
  id: 'p1',
  name: 'John Doe',
  title: 'Software Engineer',
  email: 'john@example.com',
  phone: '555-1234',
  department_id: 'd1',
  sort_order: 0,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockData = {
  id: 'd1',
  name: 'Engineering',
  depth: 1,
  people: [mockPerson],
  description: 'Engineering Department',
  isExpanded: false,
  isHighlighted: false,
};

const renderDepartmentNode = (data = mockData, selected = false) => {
  return render(
    <ThemeProvider>
      <OrgChartThemeContext.Provider value="slate">
        <ReactFlowProvider>
          <DepartmentNode
            id="d1"
            type="department"
            data={data}
            selected={selected}
            isConnectable={false}
            xPos={0}
            yPos={0}
            dragging={false}
            zIndex={0}
          />
        </ReactFlowProvider>
      </OrgChartThemeContext.Provider>
    </ThemeProvider>
  );
};

describe('DepartmentNode Hierarchy Highlighting', () => {
  it('should call onHover with true when mouse enters on desktop', () => {
    const onHover = vi.fn();
    const dataWithHover = { ...mockData, onHover };

    renderDepartmentNode(dataWithHover);
    const header = screen.getByText('Engineering').closest('div');

    if (header) {
      fireEvent.mouseEnter(header);
      expect(onHover).toHaveBeenCalledWith(true);
    }
  });

  it('should call onHover with false when mouse leaves', () => {
    const onHover = vi.fn();
    const dataWithHover = { ...mockData, onHover };

    renderDepartmentNode(dataWithHover);
    const header = screen.getByText('Engineering').closest('div');

    if (header) {
      fireEvent.mouseEnter(header);
      fireEvent.mouseLeave(header);
      expect(onHover).toHaveBeenCalledWith(false);
    }
  });

  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn();
    const dataWithSelect = { ...mockData, onSelect };

    renderDepartmentNode(dataWithSelect);
    const header = screen.getByText('Engineering').closest('div');

    if (header) {
      fireEvent.click(header);
      expect(onSelect).toHaveBeenCalled();
    }
  });

  it('should apply isHighlighted styling when highlighted', () => {
    const highlightedData = { ...mockData, isHighlighted: true };

    const { container } = renderDepartmentNode(highlightedData);
    const nodeElement = container.querySelector('.ring-4.ring-blue-400');

    expect(nodeElement).toBeTruthy();
  });

  it('should not apply isHighlighted styling when not highlighted', () => {
    const normalData = { ...mockData, isHighlighted: false };

    const { container } = renderDepartmentNode(normalData);
    const nodeElement = container.querySelector('.ring-4.ring-blue-400');

    expect(nodeElement).toBeFalsy();
  });

  it('should call both onSelect and onToggleExpand when header is clicked', () => {
    const onSelect = vi.fn();
    const onToggleExpand = vi.fn();
    const dataWithCallbacks = { ...mockData, onSelect, onToggleExpand };

    renderDepartmentNode(dataWithCallbacks);
    const header = screen.getByText('Engineering').closest('div');

    if (header) {
      fireEvent.click(header);
      expect(onSelect).toHaveBeenCalled();
      expect(onToggleExpand).toHaveBeenCalled();
    }
  });
});
