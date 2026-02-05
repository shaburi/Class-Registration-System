import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import HOPDashboard from './pages/HOPDashboard';

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
                    <DashboardRouter />
                  </ProtectedRoute>
                }
              />

              {/* Default route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            {/* Toast Notifications */}
            <Toaster
              position="top-right"
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

  console.log('[DASHBOARD ROUTER] User:', user);
  console.log('[DASHBOARD ROUTER] User role:', user?.role);

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'hop':
      console.log('[DASHBOARD ROUTER] Rendering HOPDashboard');
      return <HOPDashboard />;
    default:
      console.log('[DASHBOARD ROUTER] Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
  }
}

// Import useAuth
import { useAuth } from './contexts/AuthContext';

export default App;
