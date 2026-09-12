import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/Spinner';

/**
 * Wraps a route to require authentication.
 * - Waits for the initial /auth/me re-validation to complete before redirecting.
 *   This prevents a flash-to-login on every hard refresh when the token is valid.
 * - Optional `roles` prop restricts access to certain roles.
 * - Optional `superAdminOnly` prop restricts access to the platform super-admin.
 *
 * Platform super-admins (`user.is_super_admin`) have no tenant schema, so every
 * school-scoped page (students, fees, dashboard, ...) is meaningless for them —
 * they are confined to the Super Admin console regardless of what `roles` says.
 */
export default function ProtectedRoute({ children, roles, superAdminOnly }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  // Show a loading screen while AuthContext re-validates the stored token.
  // Without this, every page refresh would flash the login screen briefly.
  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.is_super_admin && !superAdminOnly) {
    return <Navigate to="/super-admin" replace />;
  }

  if (superAdminOnly && !user.is_super_admin) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
