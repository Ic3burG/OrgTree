import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
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
  setUser: (user: User | null) => void;
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
        .catch(err => {
          console.error('Auth check failed:', err);
          // Only logout if it's explicitly an auth error (401/403)
          // or if the token is clearly invalid/expired
          if (err.status === 401 || err.status === 403) {
            logout();
          }
          // For network errors or 500s, we might want to keep the local state
          // but maybe show a warning? For now, let's NOT logout for network errors
          // to avoid "flashing" login screen on flaky connections.
          // However, if we don't logout, the user is in a "semi-logged-in" state
          // where API calls might fail.
          // Given the user report, if getMe() fails, we should be careful.

          // Actually, if getMe failed, we probably shouldn't trust the local token.
          // But strict 401 check is safer than catch-all.
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const { user: loggedInUser, accessToken } = await api.login(email, password);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      const { user: signedUpUser, accessToken } = await api.signup(name, email, password);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(signedUpUser));
      setUser(signedUpUser);
      return signedUpUser;
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
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
  }, []);

  // Memoize hasRole to avoid creating new function on every render
  const hasRole = useCallback((role: string): boolean => user?.role === role, [user]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<AuthContextValue>(
    () => ({
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
      hasRole,
      setUser,
    }),
    [user, loading, login, signup, logout, hasRole, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
