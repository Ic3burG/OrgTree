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

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api, scheduleTokenRefresh, cancelTokenRefresh } from '../api/client';
import React from 'react';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
  scheduleTokenRefresh: vi.fn(),
  cancelTokenRefresh: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should throw error if used outside provider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    spy.mockRestore();
  });

  it('should initialize with loading state and no user if no token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading might be true, but effects run quickly
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should hydrate session from localStorage', async () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@example.com', role: 'admin' };
    localStorageMock.setItem('token', 'fake-token');
    localStorageMock.setItem('user', JSON.stringify(mockUser));

    (api.getMe as Mock).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(api.getMe).toHaveBeenCalled();
    expect(scheduleTokenRefresh).toHaveBeenCalled();
  });

  it('should auto-logout if getMe returns 401', async () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@example.com', role: 'admin' };
    localStorageMock.setItem('token', 'invalid-token');
    localStorageMock.setItem('user', JSON.stringify(mockUser));

    (api.getMe as Mock).mockRejectedValue({ status: 401 });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(cancelTokenRefresh).toHaveBeenCalled();
  });

  it('should login successfully', async () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@example.com', role: 'user' };
    (api.login as Mock).mockResolvedValue({ user: mockUser, accessToken: 'new-token' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
  });

  it('should signup successfully', async () => {
    const mockUser = { id: '2', name: 'New', email: 'new@example.com', role: 'admin' };
    (api.signup as Mock).mockResolvedValue({ user: mockUser, accessToken: 'signup-token' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signup('New', 'new@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'signup-token');
  });

  it('should logout successfully', async () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@example.com', role: 'user' };
    localStorageMock.setItem('token', 'token');
    localStorageMock.setItem('user', JSON.stringify(mockUser));
    (api.getMe as Mock).mockResolvedValue(mockUser);
    (api.logout as Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    expect(api.logout).toHaveBeenCalled();
    expect(cancelTokenRefresh).toHaveBeenCalled();
  });

  describe('Role Helpers', () => {
    it('should identify superuser correctly', async () => {
      const mockUser = { id: '1', name: 'Super', email: 'super@example.com', role: 'superuser' };
      localStorageMock.setItem('token', 'token');
      localStorageMock.setItem('user', JSON.stringify(mockUser));
      (api.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isSuperuser).toBe(true);
      expect(result.current.isAdmin).toBe(true); // Superuser is also admin
      expect(result.current.canManageUsers).toBe(true);
    });

    it('should identify admin correctly', async () => {
      const mockUser = { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' };
      localStorageMock.setItem('token', 'token');
      localStorageMock.setItem('user', JSON.stringify(mockUser));
      (api.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isSuperuser).toBe(false);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canManageUsers).toBe(false); // Only superuser can manage users (in current logic)
    });

    it('should identify regular user correctly', async () => {
      const mockUser = { id: '3', name: 'User', email: 'user@example.com', role: 'user' };
      localStorageMock.setItem('token', 'token');
      localStorageMock.setItem('user', JSON.stringify(mockUser));
      (api.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.isSuperuser).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });
  });
});
