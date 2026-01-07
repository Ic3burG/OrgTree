import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  joinOrg: (orgId: string) => void;
  leaveOrg: (orgId: string) => void;
  subscribe: (eventType: string, callback: (...args: unknown[]) => void) => () => void;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextValue | null>(null);

// Get socket server URL (same origin in production, different port in dev)
const getSocketUrl = (): string => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // Development: connect to backend server
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
};

export function SocketProvider({ children }: SocketProviderProps): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const currentOrgRef = useRef<string | null>(null);

  // Connect/disconnect based on auth status
  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      // Rejoin org room if we had one
      if (currentOrgRef.current) {
        newSocket.emit('join:org', currentOrgRef.current);
      }
    });

    newSocket.on('disconnect', (reason: string) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us, likely auth issue
        setConnectionError('Disconnected by server');
      }
    });

    newSocket.on('connect_error', (error: Error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  // Join organization room
  const joinOrg = useCallback(
    (orgId: string): void => {
      if (!socket || !orgId) return;
      currentOrgRef.current = orgId;
      socket.emit('join:org', orgId);
    },
    [socket]
  );

  // Leave organization room
  const leaveOrg = useCallback(
    (orgId: string): void => {
      if (!socket || !orgId) return;
      if (currentOrgRef.current === orgId) {
        currentOrgRef.current = null;
      }
      socket.emit('leave:org', orgId);
    },
    [socket]
  );

  // Subscribe to an event
  const subscribe = useCallback(
    (eventType: string, callback: (...args: unknown[]) => void): (() => void) => {
      if (!socket) return () => {};
      socket.on(eventType, callback);
      return () => socket.off(eventType, callback);
    },
    [socket]
  );

  const value: SocketContextValue = {
    socket,
    isConnected,
    connectionError,
    joinOrg,
    leaveOrg,
    subscribe,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
