import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Get socket server URL (same origin in production, different port in dev)
const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // Development: connect to backend server
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
};

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const currentOrgRef = useRef(null);

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

    newSocket.on('disconnect', reason => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us, likely auth issue
        setConnectionError('Disconnected by server');
      }
    });

    newSocket.on('connect_error', error => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('error', error => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  // Join organization room
  const joinOrg = useCallback(
    orgId => {
      if (!socket || !orgId) return;
      currentOrgRef.current = orgId;
      socket.emit('join:org', orgId);
    },
    [socket]
  );

  // Leave organization room
  const leaveOrg = useCallback(
    orgId => {
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
    (eventType, callback) => {
      if (!socket) return () => {};
      socket.on(eventType, callback);
      return () => socket.off(eventType, callback);
    },
    [socket]
  );

  const value = {
    socket,
    isConnected,
    connectionError,
    joinOrg,
    leaveOrg,
    subscribe,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
