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
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

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
