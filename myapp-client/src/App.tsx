import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { StaffRoute } from './components/StaffRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TicketsPage } from './pages/TicketsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { HelpPage } from './pages/HelpPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { AssetsPage } from './pages/AssetsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TicketsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StaffRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </StaffRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <StaffRoute>
              <AppLayout>
                <AdminPage />
              </AppLayout>
            </StaffRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <AppLayout>
              <HelpPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <StaffRoute>
              <AppLayout>
                <AuditLogPage />
              </AppLayout>
            </StaffRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <StaffRoute>
              <AppLayout>
                <AssetsPage />
              </AppLayout>
            </StaffRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}

export default App;
