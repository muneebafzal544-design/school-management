/**
 * PermissionGuard.jsx
 * Conditionally renders children based on permissions.
 * Elements are hidden in the DOM — backend is the true security layer.
 *
 * Usage examples:
 *
 *   <PermissionGuard perm="students:create">
 *     <button>Add Student</button>
 *   </PermissionGuard>
 *
 *   <PermissionGuard anyOf={['fees:read', 'fees:create']} fallback={<p>No access</p>}>
 *     <FeesPanel />
 *   </PermissionGuard>
 *
 *   <PermissionGuard role="admin">
 *     <AdminOnly />
 *   </PermissionGuard>
 */

import { usePermissions } from '../../hooks/usePermissions';

export default function PermissionGuard({
  perm,           // single permission key: 'students:create'
  anyOf,          // array — passes if user has ANY of these
  allOf,          // array — passes if user has ALL of these
  role,           // string or array — role must match
  children,       // rendered if access granted
  fallback = null // rendered if access denied (default: nothing)
}) {
  const { can, canAny, canAll, hasRole } = usePermissions();

  let allowed = true;

  if (role)  allowed = allowed && hasRole(...(Array.isArray(role) ? role : [role]));
  if (perm)  allowed = allowed && can(perm);
  if (anyOf) allowed = allowed && canAny(...anyOf);
  if (allOf) allowed = allowed && canAll(...allOf);

  return allowed ? children : fallback;
}
