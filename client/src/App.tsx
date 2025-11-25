import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ThemeProvider, useAuth } from './context';
import { ProtectedRoute } from './components';
import { DashboardLayout } from './components/layout';
import { Login, Register, AuthCallback, ForgotPassword, ResetPassword, Profile } from './pages';
import { ManagerDashboard, CEODashboard, KPIDashboard, TrendsDashboard } from './pages/dashboard';
import { CustomersList } from './pages/customers/CustomersList';
import { ResourcesList } from './pages/resources/ResourcesList';
import { ProjectsList, ProjectDetails } from './pages/projects';
import { WeeklyEffortsList } from './pages/weeklyEfforts';
import { ManageUsers } from './pages/users/ManageUsers';
import './index.css';

// Wrapper component to handle role-based dashboard
function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'CEO' || user?.role === 'Admin') {
    return <CEODashboard />;
  }

  return <ManagerDashboard />;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes with layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardRouter />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectsList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProjectDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/weekly-efforts"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WeeklyEffortsList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CustomersList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ResourcesList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/kpis"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <KPIDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trends"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TrendsDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-users"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ManageUsers />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Page not found</p>
                </div>
              </div>
            }
          />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
