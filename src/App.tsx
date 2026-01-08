import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ChangePasswordPage from './components/auth/ChangePasswordPage';
import SessionsPage from './components/auth/SessionsPage';
import OrganizationSelector from './components/OrganizationSelector';
import OrgMap from './components/OrgMap';
import PublicOrgMap from './components/PublicOrgMap';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import DepartmentManager from './components/admin/DepartmentManager';
import PersonManager from './components/admin/PersonManager';
import AuditLog from './components/admin/AuditLog';
import SuperuserLayout from './components/superuser/SuperuserLayout';
import UserManagement from './components/superuser/UserManagement';
import SystemAuditLog from './components/superuser/SystemAuditLog';
import AcceptInvitation from './components/AcceptInvitation';
import { initCsrf } from './api/client';

/**
 * App - Root component
 * Renders authentication routes, organization selector, and admin interface
 */
function App() {
  // Initialize CSRF protection on app mount
  useEffect(() => {
    initCsrf();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/public/:shareToken" element={<PublicOrgMap />} />
                  <Route path="/invite/:token" element={<AcceptInvitation />} />

                  {/* Change Password (Protected) */}
                  <Route
                    path="/change-password"
                    element={
                      <ProtectedRoute>
                        <ChangePasswordPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Sessions Management (Protected) */}
                  <Route
                    path="/settings/sessions"
                    element={
                      <ProtectedRoute>
                        <SessionsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <OrganizationSelector />
                      </ProtectedRoute>
                    }
                  />

                  {/* Superuser routes - System Administration */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="superuser">
                        <SuperuserLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/admin/users" replace />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="audit" element={<SystemAuditLog />} />
                  </Route>

                  {/* Admin routes */}
                  <Route
                    path="/org/:orgId"
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="departments" element={<DepartmentManager />} />
                    <Route path="people" element={<PersonManager />} />
                    <Route
                      path="map"
                      element={
                        <ReactFlowProvider>
                          <OrgMap />
                        </ReactFlowProvider>
                      }
                    />
                    <Route path="audit" element={<AuditLog />} />
                  </Route>

                  {/* Catch all - redirect to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
