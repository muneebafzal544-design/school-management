/**
 * RolesPage.jsx
 * Admin-only UI for managing roles, permissions, and user role assignment.
 *
 * Layout:
 *  ┌──── Roles panel ────┬──── Permission matrix ────┐
 *  │ [Admin]  system     │ Selected: Teacher          │
 *  │ [Teacher] system ●  │ ┌ Students ──────────────┐ │
 *  │ [Student] system    │ │ [x] View  [ ] Add ...  │ │
 *  │ [+ New Role]        │ └────────────────────────┘ │
 *  │                     │ [Save Changes]             │
 *  └─────────────────────┴────────────────────────────┘
 *  └── Users Tab ───────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getRoles, getPermissions, createRole, updateRole,
  deleteRole, setRolePerms, getRbacUsers, setUserRole,
  createRbacUser, deactivateUser,
} from '../api/rbac';

// ── Module display names & icons ──────────────────────────────────────────────
const MODULE_META = {
  students:      { label: 'Students',      icon: '🎓' },
  teachers:      { label: 'Teachers',      icon: '👩‍🏫' },
  classes:       { label: 'Classes',       icon: '🏫' },
  attendance:    { label: 'Attendance',    icon: '📋' },
  fees:          { label: 'Fees',          icon: '💰' },
  timetable:     { label: 'Timetable',     icon: '📅' },
  transport:     { label: 'Transport',     icon: '🚌' },
  homework:      { label: 'Homework',      icon: '📝' },
  exams:         { label: 'Exams',         icon: '📊' },
  announcements: { label: 'Announcements', icon: '📢' },
  reports:       { label: 'Reports',       icon: '📈' },
  library:       { label: 'Library',       icon: '📚' },
  salary:        { label: 'Salary',        icon: '💵' },
  settings:      { label: 'Settings',      icon: '⚙️' },
  chatbot:       { label: 'Chatbot',       icon: '🤖' },
};

const ROLE_COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6366f1', '#64748b',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-semibold"
      style={{ backgroundColor: role.color || '#6366f1' }}
    >
      {role.label}
    </span>
  );
}

function Spinner({ size = 'sm' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div className={`${cls} border-2 border-current border-t-transparent rounded-full animate-spin`} />
  );
}

// ── Permission checkbox group (one module) ────────────────────────────────────
function PermissionGroup({ module, perms, selected, onChange, disabled }) {
  const meta = MODULE_META[module] || { label: module, icon: '🔒' };
  const allChecked  = perms.every(p => selected.has(p.key));
  const someChecked = perms.some(p => selected.has(p.key));

  function toggleAll() {
    const next = new Set(selected);
    if (allChecked) {
      perms.forEach(p => next.delete(p.key));
    } else {
      perms.forEach(p => next.add(p.key));
    }
    onChange(next);
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Module header */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none"
        onClick={toggleAll}
      >
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
          onChange={toggleAll}
          disabled={disabled}
          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
          onClick={e => e.stopPropagation()}
        />
        <span className="text-base">{meta.icon}</span>
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          {meta.label}
        </span>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          {perms.filter(p => selected.has(p.key)).length}/{perms.length}
        </span>
      </div>

      {/* Individual permissions */}
      <div className="px-4 py-2.5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2">
        {perms.map(perm => (
          <label key={perm.key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.has(perm.key)}
              disabled={disabled}
              onChange={() => {
                const next = new Set(selected);
                next.has(perm.key) ? next.delete(perm.key) : next.add(perm.key);
                onChange(next);
              }}
              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {perm.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Create Role Modal ─────────────────────────────────────────────────────────
function CreateRoleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', label: '', description: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.label.trim()) return;
    setSaving(true);
    try {
      const r = await createRole(form);
      const newRole = r.data?.data ?? r.data;
      toast.success(`Role "${form.label}" created!`);
      onCreated(newRole);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Create Custom Role</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Role Name (ID)</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. bursar, coordinator"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <p className="text-xs text-slate-400 mt-1">Lowercase, no spaces. Used as identifier.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Display Label</label>
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Bursar, Academic Coordinator"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">Badge Color</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLOR_OPTIONS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {saving && <Spinner />}
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ roles, onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', username: '', role: roles[0]?.name || 'teacher' });
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(null); // credentials after creation

  const copyAll = () => {
    navigator.clipboard.writeText(`Username: ${done.username}\nPassword: ${done.tempPassword}`);
    toast.success('Copied to clipboard');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) return;
    setSaving(true);
    try {
      const r   = await createRbacUser(form);
      const d   = r.data || r;
      setDone(d.credentials);
      toast.success(`User "${form.username}" created`);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
          {done ? '✅ User Created' : 'Create New User'}
        </h2>

        {done ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
              Save these now — the password will <strong>not be shown again</strong>.
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 font-mono text-sm space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Username</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{done.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-xs">Temp Password</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{done.tempPassword}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={copyAll}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
                📋 Copy Credentials
              </button>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ahmed Khan" className={inputCls} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Username</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g,'_') }))}
                placeholder="e.g. ahmed_khan" className={inputCls} required />
              <p className="text-xs text-slate-400 mt-1">Lowercase, no spaces. Must be unique.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls} required>
                {roles.map(r => <option key={r.id} value={r.name}>{r.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-400">A temporary password will be auto-generated. The user must change it on first login.</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                {saving && <Spinner />}
                Create User
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ roles }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [changing,    setChanging]    = useState(null);
  const [deactivating,setDeactivating]= useState(null);
  const [showCreate,  setShowCreate]  = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getRbacUsers({ search, role: roleFilter || undefined, limit: 200 });
      const d = r.data;
      setUsers(Array.isArray(d) ? d : (d?.data ?? []));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleRoleChange(userId, newRole, currentRole) {
    if (newRole === currentRole) return;
    setChanging(userId);
    try {
      await setUserRole(userId, newRole);
      toast.success('Role updated');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole,
        role_label: roles.find(r => r.name === newRole)?.label || newRole,
        role_color: roles.find(r => r.name === newRole)?.color || '#6366f1',
      } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setChanging(null);
    }
  }

  async function handleDeactivate(user) {
    if (!confirm(`Deactivate "${user.name}"? They will no longer be able to log in.`)) return;
    setDeactivating(user.id);
    try {
      await deactivateUser(user.id);
      toast.success(`"${user.name}" deactivated`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    } finally {
      setDeactivating(null);
    }
  }

  const inputCls = 'rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-400';

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or username…"
          className={`${inputCls} w-64`}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={`${inputCls} w-40`}>
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.name}>{r.label}</option>)}
        </select>
        <div className="ml-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span> New User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">User</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Username</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Current Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Permissions</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Change Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{user.username}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-xs font-semibold"
                      style={{ backgroundColor: user.role_color || '#6366f1' }}>
                      {user.role_label || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                    {user.role === 'admin' ? '∞ All' : `${user.permission_count ?? 0} permissions`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value, user.role)}
                        disabled={changing === user.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                      >
                        {roles.map(r => <option key={r.id} value={r.name}>{r.label}</option>)}
                      </select>
                      {changing === user.id && <Spinner />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeactivate(user)}
                      disabled={deactivating === user.id}
                      title="Deactivate user"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    >
                      {deactivating === user.id ? <Spinner /> : '🚫'}
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadUsers(); }}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const [tab, setTab]               = useState('roles'); // 'roles' | 'users'
  const [roles, setRoles]           = useState([]);
  const [allPerms, setAllPerms]     = useState({});      // grouped by module
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selected, setSelected]     = useState(new Set()); // currently selected perm keys
  const [originalPerms, setOriginalPerms] = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [dirty, setDirty]           = useState(false);

  // Load roles + all permissions on mount
  useEffect(() => {
    Promise.all([getRoles(), getPermissions()])
      .then(([rolesRes, permsRes]) => {
        const rolesData = Array.isArray(rolesRes.data) ? rolesRes.data : (rolesRes.data?.data ?? []);
        setRoles(rolesData);
        if (rolesData.length) setSelectedRoleId(rolesData[0].id);

        const permsData = permsRes.data?.data?.grouped ?? permsRes.data?.grouped ?? {};
        setAllPerms(permsData);
      })
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setLoading(false));
  }, []);

  // When selected role changes, update the checkbox state
  useEffect(() => {
    if (!selectedRoleId || !roles.length) return;
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;

    const permKeys = new Set(Array.isArray(role.permissions) ? role.permissions : []);
    setSelected(permKeys);
    setOriginalPerms(permKeys);
    setDirty(false);
  }, [selectedRoleId, roles]);

  function handlePermChange(newSet) {
    setSelected(newSet);
    // Check if changed from original
    const isDirty = newSet.size !== originalPerms.size ||
      [...newSet].some(k => !originalPerms.has(k));
    setDirty(isDirty);
  }

  async function handleSave() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const r = await setRolePerms(selectedRoleId, [...selected]);
      const updated = r.data?.data ?? r.data;
      toast.success('Permissions saved!');

      // Optimistically update roles list
      setRoles(prev => prev.map(role =>
        role.id === selectedRoleId
          ? { ...role, permissions: updated?.permissions ?? [...selected], permission_count: selected.size }
          : role
      ));
      const newSet = new Set(selected);
      setOriginalPerms(newSet);
      setDirty(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role || role.is_system) return;
    if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await deleteRole(selectedRoleId);
      toast.success(`Role "${role.label}" deleted`);
      const remaining = roles.filter(r => r.id !== selectedRoleId);
      setRoles(remaining);
      setSelectedRoleId(remaining[0]?.id ?? null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isAdminRole  = selectedRole?.name === 'admin';
  const modules      = Object.keys(allPerms).sort((a, b) =>
    (MODULE_META[a]?.label ?? a).localeCompare(MODULE_META[b]?.label ?? b)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Roles & Permissions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Control what each role can access and do across the system
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span>
            New Role
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-1">
          {[['roles', '🛡️ Roles & Permissions'], ['users', '👥 User Assignment']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Users tab ───────────────────────────────────────────────────── */}
        {tab === 'users' && <UsersTab roles={roles} />}

        {/* ── Roles tab ───────────────────────────────────────────────────── */}
        {tab === 'roles' && (
          <div className="flex gap-5" style={{ minHeight: '600px' }}>

            {/* Left: role list */}
            <div className="w-60 shrink-0 space-y-1.5">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-2">
                Roles ({roles.length})
              </p>
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    selectedRoleId === role.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-700'
                      : 'hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
                  }`}
                >
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {role.label}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {role.name === 'admin' ? '∞ All' : `${role.permission_count ?? 0} permissions`}
                    </div>
                  </div>
                  {role.is_system && (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase shrink-0">SYS</span>
                  )}
                </button>
              ))}
            </div>

            {/* Right: permission matrix */}
            <div className="flex-1 min-w-0">
              {selectedRole ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                      <div>
                        <h2 className="font-bold text-slate-800 dark:text-slate-100">{selectedRole.label}</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {isAdminRole ? 'Admin has all permissions — cannot be modified.' :
                            `${selected.size} permissions selected`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Delete button for non-system custom roles */}
                      {!selectedRole.is_system && (
                        <button
                          onClick={handleDelete}
                          disabled={deleting || saving}
                          className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                        >
                          {deleting && <Spinner />}
                          🗑 Delete Role
                        </button>
                      )}
                      {/* Save button */}
                      {!isAdminRole && (
                        <button
                          onClick={handleSave}
                          disabled={saving || !dirty}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {saving && <Spinner />}
                          {saving ? 'Saving…' : dirty ? '💾 Save Changes' : '✓ Saved'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permission matrix */}
                  <div className="p-5 space-y-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                    {isAdminRole ? (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-3">👑</div>
                        <p className="text-slate-600 dark:text-slate-300 font-semibold">Administrator — Full Access</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                          Admin has unrestricted access to all features. Permissions cannot be limited.
                        </p>
                      </div>
                    ) : modules.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">No permissions defined.</div>
                    ) : (
                      modules.map(module => (
                        <PermissionGroup
                          key={module}
                          module={module}
                          perms={allPerms[module] || []}
                          selected={selected}
                          onChange={handlePermChange}
                          disabled={saving}
                        />
                      ))
                    )}
                  </div>

                  {/* Save bar — sticky at bottom when dirty */}
                  {dirty && !isAdminRole && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between">
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        ⚠️ Unsaved changes — {selected.size} permissions selected
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelected(new Set(originalPerms)); setDirty(false); }}
                          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        >
                          Discard
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                        >
                          {saving && <Spinner />}
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                  Select a role to manage its permissions
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreate && (
        <CreateRoleModal
          onClose={() => setShowCreate(false)}
          onCreated={(newRole) => {
            setRoles(prev => [...prev, { ...newRole, permissions: [], permission_count: 0 }]);
            setSelectedRoleId(newRole.id);
          }}
        />
      )}
    </div>
  );
}
