import api from './axios';

// ── Permissions ───────────────────────────────────────────────────────────────
export const getPermissions = () => api.get('/rbac/permissions');

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getRoles       = ()          => api.get('/rbac/roles');
export const getRole        = (id)        => api.get(`/rbac/roles/${id}`);
export const createRole     = (data)      => api.post('/rbac/roles', data);
export const updateRole     = (id, data)  => api.put(`/rbac/roles/${id}`, data);
export const deleteRole     = (id)        => api.delete(`/rbac/roles/${id}`);
export const setRolePerms   = (id, perms) => api.put(`/rbac/roles/${id}/permissions`, { permissions: perms });

// ── Users ─────────────────────────────────────────────────────────────────────
export const getRbacUsers      = (params)          => api.get('/rbac/users', { params });
export const createRbacUser    = (data)            => api.post('/rbac/users', data);
export const setUserRole       = (userId, role)    => api.put(`/rbac/users/${userId}/role`, { role });
export const deactivateUser    = (userId)          => api.delete(`/rbac/users/${userId}`);
export const getUserPerms      = (userId)          => api.get(`/rbac/users/${userId}/permissions`);
export const setUserPerms      = (userId, data)    => api.put(`/rbac/users/${userId}/permissions`, data);

// ── Summary ───────────────────────────────────────────────────────────────────
export const getRbacSummary = () => api.get('/rbac/summary');
