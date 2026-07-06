import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authLogger } from '../utils/logger';

export default function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    authLogger.warn('Protected route: not authenticated, redirecting to login', {
      file: 'src/components/ProtectedRoute.tsx', function: 'ProtectedRoute',
    });
    return <Navigate to="/login" replace />;
  }
  if (roles && user && !roles.includes(user.role)) {
    authLogger.warn(`Protected route: ${user.role} not authorized for roles [${roles.join(',')}]`, {
      file: 'src/components/ProtectedRoute.tsx', function: 'ProtectedRoute', userId: user.username,
    });
    return <Navigate to={`/${user.role.toLowerCase().replace('_', '-')}`} replace />;
  }
  return <Outlet />;
}
