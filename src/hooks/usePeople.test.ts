/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePeople } from './usePeople';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    getOrganization: vi.fn(),
    getCustomFieldDefinitions: vi.fn(),
    createPerson: vi.fn(),
    updatePerson: vi.fn(),
    deletePerson: vi.fn(),
  },
}));

describe('usePeople', () => {
  const orgId = 'org-1';
  const mockOrgData = {
    id: orgId,
    name: 'Org 1',
    departments: [
      {
        id: 'd1',
        name: 'Dept 1',
        people: [{ id: 'p1', name: 'Person 1' }],
      },
    ],
  };
  const mockFields = [{ id: 'f1', entity_type: 'person', name: 'Field 1' }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getOrganization).mockResolvedValue(mockOrgData as any);
    vi.mocked(api.getCustomFieldDefinitions).mockResolvedValue(mockFields as any);
  });

  it('should fetch and flatten people data', async () => {
    const { result } = renderHook(() => usePeople(orgId));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.departments).toHaveLength(1);
    expect(result.current.people).toHaveLength(1);
    expect(result.current.people[0]).toEqual({
      id: 'p1',
      name: 'Person 1',
      departmentName: 'Dept 1',
    });
    expect(result.current.fieldDefinitions).toEqual(mockFields);
  });

  it('should create person and refresh', async () => {
    const { result } = renderHook(() => usePeople(orgId));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createPerson('d1', { name: 'New' });
    });

    expect(api.createPerson).toHaveBeenCalledWith('d1', { name: 'New' });
    expect(api.getOrganization).toHaveBeenCalledTimes(2);
  });

  it('should update person and refresh', async () => {
    const { result } = renderHook(() => usePeople(orgId));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updatePerson('p1', { name: 'Updated' });
    });

    expect(api.updatePerson).toHaveBeenCalledWith('p1', { name: 'Updated' });
    expect(api.getOrganization).toHaveBeenCalledTimes(2);
  });

  it('should delete person and refresh', async () => {
    const { result } = renderHook(() => usePeople(orgId));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deletePerson('p1');
    });

    expect(api.deletePerson).toHaveBeenCalledWith('p1');
    expect(api.getOrganization).toHaveBeenCalledTimes(2);
  });
});
