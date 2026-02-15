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
import { renderHook, waitFor } from '@testing-library/react';
import { SocketProvider, useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import React from 'react';
import { act } from '@testing-library/react';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

interface MockSocket {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  connected: boolean;
}

// Mock AuthContext
vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
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

describe('SocketContext', () => {
  let mockSocket: MockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Default auth state: unauthenticated
    (useAuth as Mock).mockReturnValue({ isAuthenticated: false });

    // Mock socket instance
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: false,
    };
    (io as Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SocketProvider>{children}</SocketProvider>
  );

  it('should throw error if used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSocket())).toThrow(
      'useSocket must be used within a SocketProvider'
    );
    consoleSpy.mockRestore();
  });

  it('should not connect if not authenticated', () => {
    renderHook(() => useSocket(), { wrapper });
    expect(io).not.toHaveBeenCalled();
  });

  it('should connect if authenticated and token exists', async () => {
    (useAuth as Mock).mockReturnValue({ isAuthenticated: true });
    localStorageMock.setItem('token', 'valid-token');

    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'valid-token' },
      })
    );

    // Should expose socket instance
    await waitFor(() => expect(result.current.socket).toBe(mockSocket));
  });

  it('should update isConnected state on connect/disconnect events', async () => {
    (useAuth as Mock).mockReturnValue({ isAuthenticated: true });
    localStorageMock.setItem('token', 'token');

    const { result } = renderHook(() => useSocket(), { wrapper });

    // Find the 'connect' callback
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'connect'
    )?.[1];
    expect(connectCallback).toBeDefined();

    // Simulate connect
    act(() => connectCallback());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Find disconnect callback
    const disconnectCallback = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'disconnect'
    )?.[1];
    expect(disconnectCallback).toBeDefined();

    // Simulate disconnect
    act(() => disconnectCallback('io server disconnect'));
    await waitFor(() => expect(result.current.isConnected).toBe(false));
    expect(result.current.connectionError).toBe('Disconnected by server');
  });

  it('should rejoin org on reconnect if previously joined', async () => {
    (useAuth as Mock).mockReturnValue({ isAuthenticated: true });
    localStorageMock.setItem('token', 'token');

    const { result } = renderHook(() => useSocket(), { wrapper });

    // Join org
    act(() => result.current.joinOrg('org-1'));

    // Simulate connect (first time)
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'connect'
    )?.[1];
    act(() => connectCallback());

    // Expect emit join:org
    expect(mockSocket.emit).toHaveBeenCalledWith('join:org', 'org-1');
  });

  it('should handle subscriptions', async () => {
    (useAuth as Mock).mockReturnValue({ isAuthenticated: true });
    localStorageMock.setItem('token', 'token');

    const { result } = renderHook(() => useSocket(), { wrapper });

    const callback = vi.fn();
    let unsubscribe: () => void;

    act(() => {
      unsubscribe = result.current.subscribe('test:event', callback);
    });

    expect(mockSocket.on).toHaveBeenCalledWith('test:event', callback);

    act(() => {
      unsubscribe!();
    });

    expect(mockSocket.off).toHaveBeenCalledWith('test:event', callback);
  });

  it('should disconnect on unmount', () => {
    (useAuth as Mock).mockReturnValue({ isAuthenticated: true });
    localStorageMock.setItem('token', 'token');

    const { unmount } = renderHook(() => useSocket(), { wrapper });

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
