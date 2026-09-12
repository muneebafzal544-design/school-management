/**
 * usePermissions.js
 * React hook for declarative permission checking in components.
 *
 * Usage:
 *   const { can, canAny, canAll, isAdmin } = usePermissions();
 *   can('students:create')          → true/false
 *   canAny('fees:read','fees:create') → true if any match
 *   canAll('exams:create','exams:delete') → true if all match
 *
 * Admin role automatically passes all checks.
 * Permission array comes from JWT payload embedded at login.
 */

import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';

export function usePermissions() {
  const { user } = useAuth();

  const permSet = useMemo(() => {
    if (!user) return new Set();
    // Admin has implicit access to everything
    if (user.role === 'admin') return new Set(['*']);
    return new Set(Array.isArray(user.permissions) ? user.permissions : []);
  }, [user]);

  const isAdmin = user?.role === 'admin';

  /** Check a single permission key */
  function can(permKey) {
    if (!user) return false;
    if (isAdmin) return true;
    return permSet.has(permKey);
  }

  /** True if the user has AT LEAST ONE of the given permissions */
  function canAny(...permKeys) {
    if (!user) return false;
    if (isAdmin) return true;
    return permKeys.some(k => permSet.has(k));
  }

  /** True if the user has ALL of the given permissions */
  function canAll(...permKeys) {
    if (!user) return false;
    if (isAdmin) return true;
    return permKeys.every(k => permSet.has(k));
  }

  /** Check role exactly */
  function hasRole(...roles) {
    return !!user && roles.includes(user.role);
  }

  return { can, canAny, canAll, hasRole, isAdmin, role: user?.role };
}
