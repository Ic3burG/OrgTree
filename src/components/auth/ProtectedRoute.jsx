import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Role hierarchy: superuser > admin > user
const ROLE_HIERARCHY = {
  superuser: 3,
  admin: 2,
  user: 1,
};

export default function ProtectedRoute({ children, requiredRole = null }) {
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

  // Check role if required
  if (requiredRole) {
    const userLevel = ROLE_HIERARCHY[user?.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 999;

    if (userLevel < requiredLevel) {
      // Insufficient permissions, redirect to home
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
