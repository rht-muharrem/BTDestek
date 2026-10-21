import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ITStaff') return <Navigate to="/tickets" replace />;
  return <>{children}</>;
}
