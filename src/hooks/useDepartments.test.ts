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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDepartments } from './useDepartments';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getDepartments: vi.fn(),
    getCustomFieldDefinitions: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
  },
}));

describe('useDepartments', () => {
  const orgId = 'org-1';
  const mockDepartments = [{ id: 'd1', name: 'Dept 1', parent_id: null }];
  const mockFields = [{ id: 'f1', entity_type: 'department', name: 'Field 1' }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getDepartments).mockResolvedValue(mockDepartments as any);
    vi.mocked(api.getCustomFieldDefinitions).mockResolvedValue(mockFields as any);
  });

  it('should fetch departments and fields on mount', async () => {
    const { result } = renderHook(() => useDepartments(orgId));

    // Initial state
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.departments).toEqual(mockDepartments);
    expect(result.current.fieldDefinitions).toEqual(mockFields);
    expect(api.getDepartments).toHaveBeenCalledWith(orgId);
    expect(api.getCustomFieldDefinitions).toHaveBeenCalledWith(orgId);
  });

  it('should handle errors during fetch', async () => {
    const errorMsg = 'Failed to fetch';
    vi.mocked(api.getDepartments).mockRejectedValue(new Error(errorMsg));

    const { result } = renderHook(() => useDepartments(orgId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMsg);
  });

  it('should create department and refresh list', async () => {
    const { result } = renderHook(() => useDepartments(orgId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const newDeptData = { name: 'New Dept' };
    vi.mocked(api.createDepartment).mockResolvedValue({ id: 'd2', ...newDeptData } as any);

    await act(async () => {
      await result.current.createDepartment(newDeptData);
    });

    expect(api.createDepartment).toHaveBeenCalledWith(orgId, newDeptData);
    // Should verify re-fetch (called twice total)
    expect(api.getDepartments).toHaveBeenCalledTimes(2);
  });

  it('should update department and refresh list', async () => {
    const { result } = renderHook(() => useDepartments(orgId));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateDepartment('d1', { name: 'Updated' });
    });

    expect(api.updateDepartment).toHaveBeenCalledWith(orgId, 'd1', { name: 'Updated' });
    expect(api.getDepartments).toHaveBeenCalledTimes(2);
  });

  it('should delete department and refresh list', async () => {
    const { result } = renderHook(() => useDepartments(orgId));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteDepartment('d1');
    });

    expect(api.deleteDepartment).toHaveBeenCalledWith(orgId, 'd1');
    expect(api.getDepartments).toHaveBeenCalledTimes(2);
  });
});
