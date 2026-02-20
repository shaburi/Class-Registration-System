import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

// Pages - Login loaded eagerly (first thing users see)
import Login from './pages/Login';

// Lazy-loaded dashboards - each role only downloads their own dashboard
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard'));
const LecturerDashboard = React.lazy(() => import('./pages/LecturerDashboard'));
const HOPDashboard = React.lazy(() => import('./pages/HOPDashboard'));

// Loading fallback for lazy components
function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#07090e]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin relative z-10" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Loading dashboard...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionProvider>
          <ThemeProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<DashboardLoading />}>
                      <DashboardRouter />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Default route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            {/* Toast Notifications - placed at root for fixed positioning */}
            <Toaster
              position="top-right"
              containerStyle={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 99999
              }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ThemeProvider>
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Dashboard router based on role
function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'hop':
      return <HOPDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
