import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import OrganizationSelector from './components/OrganizationSelector';
import OrgMap from './components/OrgMap';
import PublicOrgMap from './components/PublicOrgMap';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import DepartmentManager from './components/admin/DepartmentManager';
import PersonManager from './components/admin/PersonManager';

/**
 * App - Root component
 * Renders authentication routes, organization selector, and admin interface
 */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/public/:shareToken" element={<PublicOrgMap />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OrganizationSelector />
              </ProtectedRoute>
            }
          />

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
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
