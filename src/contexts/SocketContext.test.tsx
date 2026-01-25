/* eslint-disable */
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SocketProvider, useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import React from 'react';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  })),
}));

// Mock AuthContext
vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('SocketContext', () => {
  const mockUser = { id: 'u1', email: 'test@example.com', name: 'Test User' };
  const mockToken = 'mock-token';

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SocketProvider>{children}</SocketProvider>
  );

  it('initializes socket with token when authenticated', async () => {
    renderHook(() => useSocket(), { wrapper });

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: mockToken },
      })
    );
  });

  it('disconnects socket when unauthenticated', async () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.socket).toBeNull();
  });

  it('provides socket instance via useSocket', () => {
    const { result } = renderHook(() => useSocket(), { wrapper });

    expect(result.current.socket).toBeDefined();
    expect(result.current.isConnected).toBe(true);
  });
});
