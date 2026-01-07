import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, cancelTokenRefresh, scheduleTokenRefresh } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid and schedule refresh
      api
        .getMe()
        .then(userData => {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          // Schedule a refresh - assume token is still fairly fresh on page load
          // The server will reject if expired and trigger a refresh
          scheduleTokenRefresh(900); // 15 minutes default
        })
        .catch(() => {
          // Token invalid - the API client will handle refresh or redirect
          // Only clear if we get here without redirect (refresh also failed)
          const currentToken = localStorage.getItem('token');
          if (!currentToken) {
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { user, accessToken } = await api.login(email, password);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const signup = async (name: string, email: string, password: string): Promise<User> => {
    const { user, accessToken } = await api.signup(name, email, password);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = async (): Promise<void> => {
    try {
      // Call server to revoke refresh token
      await api.logout();
    } catch (err) {
      // Continue with local logout even if server call fails
      console.error('Server logout failed:', err);
    }

    // Cancel any scheduled refresh
    cancelTokenRefresh();

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    // Role helpers
    isSuperuser: user?.role === 'superuser',
    isAdmin: user?.role === 'admin' || user?.role === 'superuser',
    canManageUsers: user?.role === 'superuser',
    hasRole: (role: string) => user?.role === role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
