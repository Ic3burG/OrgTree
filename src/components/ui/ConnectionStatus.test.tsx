import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConnectionStatus from './ConnectionStatus';
import * as SocketContext from '../../contexts/SocketContext';

// Mock SocketContext
vi.mock('../../contexts/SocketContext', () => ({
  useSocket: vi.fn(),
}));

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders disconnected state by default/error', () => {
    const mockValue: Partial<ReturnType<typeof SocketContext.useSocket>> = {
      isConnected: false,
      connectionError: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(SocketContext, 'useSocket').mockReturnValue(mockValue as any);

    render(<ConnectionStatus />);

    const indicator = screen.getByTitle('Disconnected');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-gray-400');
  });

  it('renders connected state', () => {
    vi.spyOn(SocketContext, 'useSocket').mockReturnValue({
      isConnected: true,
      connectionError: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<ConnectionStatus />);

    const indicator = screen.getByTitle('Real-time updates active');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-green-500');
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('renders error state', () => {
    vi.spyOn(SocketContext, 'useSocket').mockReturnValue({
      isConnected: false,
      connectionError: 'Network failed',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<ConnectionStatus />);

    const indicator = screen.getByTitle('Connection error: Network failed');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-amber-500');
  });
});
