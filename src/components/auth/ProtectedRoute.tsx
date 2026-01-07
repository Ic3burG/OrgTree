import React from 'react';
import { Navigate, useLocation, type ReactNode } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../types/index.js';

// Role hierarchy: superuser > admin > user
const ROLE_HIERARCHY: Record<User['role'], number> = {
  superuser: 3,
  admin: 2,
  user: 1,
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: User['role'] | null;
}

export default function ProtectedRoute({
  children,
  requiredRole = null,
}: ProtectedRouteProps): React.JSX.Element {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, saving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user must change password (but allow access to change-password page)
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Check role if required
  if (requiredRole) {
    const userLevel = ROLE_HIERARCHY[user?.role as User['role']] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 999;

    if (userLevel < requiredLevel) {
      // Insufficient permissions, redirect to home
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
