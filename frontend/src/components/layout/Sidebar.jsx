import { useState, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, X, Sun, Moon, ChevronDown, LogOut, Search, Building2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../constants';
import NotificationBell from './NotificationBell';

// Paths each role is allowed to see
const ROLE_LINKS = {
  admin:   null, // null = all
  teacher: ['/teacher-dashboard', '/timetable', '/attendance', '/quick-attendance', '/gradebook', '/classes', '/students', '/subjects', '/online-classes', '/homework', '/exams', '/announcements', '/events', '/messaging', '/parent-messages', '/diary'],
  student: ['/student-dashboard', '/online-classes', '/messaging', '/diary'],
  parent:  ['/parent-dashboard', '/parent-messages', '/parent-fee-ledger', '/online-classes', '/messaging', '/diary', '/meetings', '/approvals'],
};

const ROLE_COLORS = {
  admin:   'linear-gradient(135deg, #6366f1, #8b5cf6)',
  teacher: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
  student: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  parent:  'linear-gradient(135deg, #10b981, #34d399)',
};

// Paths that are only shown as adminChildren — never as flat items
const ADMIN_CHILD_PATHS = new Set(['/teacher-dashboard', '/student-dashboard', '/parent-dashboard']);

export default function Sidebar({ open, onClose, onSearch }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut }       = useAuth();
  const navigate                = useNavigate();
  const location                = useLocation();

  const isSuperAdmin = user?.is_super_admin === true;
  const isAdmin      = user?.role === 'admin' && !isSuperAdmin;
  const allowedPaths = user ? ROLE_LINKS[user.role] : [];

  // ── Build visible items list ─────────────────────────────────────────────
  const visibleItems = useMemo(() => {
    return NAV_LINKS
      .filter(item => {
        // Skip role-specific dashboard variants when admin (they appear as adminChildren)
        if (isAdmin && item.adminSkip) return false;
        // Flat items: check path is allowed
        if (item.to) {
          if (allowedPaths === null) return true;
          return allowedPaths.includes(item.to);
        }
        // Groups: include if at least one child is allowed
        if (item.group) {
          if (allowedPaths === null) return true;
          return item.children.some(c => allowedPaths.includes(c.to));
        }
        return true;
      })
      .map(item => {
        if (item.group && allowedPaths !== null) {
          // Filter group children to only allowed paths
          return { ...item, children: item.children.filter(c => allowedPaths.includes(c.to)) };
        }
        return item;
      });
  }, [isAdmin, allowedPaths]);

  // ── Open groups state ────────────────────────────────────────────────────
  // Initialise with whichever group contains the current path
  const getDefaultOpen = () => {
    const open = new Set();
    // Dashboard adminChildren
    if (isAdmin) {
      const dashItem = NAV_LINKS.find(i => i.to === '/');
      if (dashItem?.adminChildren?.some(c => location.pathname.startsWith(c.to))) {
        open.add('__dashboard__');
      }
    }
    // Groups
    NAV_LINKS.forEach(item => {
      if (item.group) {
        const childPaths = item.children.map(c => c.to);
        if (childPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
          open.add(item.label);
        }
      }
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState(getDefaultOpen);

  const toggleGroup = (key) =>
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const pathActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname === to || location.pathname.startsWith(to + '/');

  const groupActive = (item) =>
    item.children?.some(c => pathActive(c.to));

  const dashChildActive = (item) =>
    item.adminChildren?.some(c => pathActive(c.to));

  const handleSignOut = () => { signOut(); navigate('/login', { replace: true }); };

  const showNotifications = user && (user.role === 'admin' || user.role === 'teacher');

  // ── Shared class builders ─────────────────────────────────────────────────
  const groupBtnCls = (active) => [
    'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
    active
      ? 'bg-slate-800/50 text-white'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
  ].join(' ');

  const flatLinkCls = (isActive) => [
    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden',
    isActive ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
  ].join(' ');

  const childLinkCls = (isActive) => [
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
    isActive ? 'text-white bg-slate-800/60' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40',
  ].join(' ');

  // ── Platform Super Admin: a deliberately tiny, separate sidebar ────────────
  // Super admins have no tenant schema, so none of the school-scoped nav
  // (students, fees, timetable, ...) applies to them — showing it was the bug.
  if (isSuperAdmin) {
    return (
      <>
        {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}
        <aside className={[
          'fixed top-0 left-0 z-50 h-screen w-64 flex flex-col',
          'bg-slate-950 border-r border-slate-800/60',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}>
          <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                <GraduationCap size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">SchoolMS</p>
                <p className="text-[10px] text-amber-500 mt-0.5 font-semibold tracking-wide">PLATFORM CONSOLE</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-800/60 shrink-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
              {(user.name || 'S')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-none">{user.name}</p>
              <p className="text-[10px] text-amber-500 mt-0.5">Super Admin</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-3 space-y-0.5">
            <p className="px-3 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Platform</p>
            <NavLink to="/super-admin" onClick={onClose} className={({ isActive }) => flatLinkCls(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                      style={{ background: 'linear-gradient(to bottom, #f59e0b, #f97316)' }} />
                  )}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={isActive ? { background: 'linear-gradient(135deg, #f59e0b, #f97316)' } : {}}>
                    <Building2 size={15} className={isActive ? 'text-white' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={['text-sm leading-none', isActive ? 'font-semibold text-white' : 'font-medium'].join(' ')}>Schools</p>
                    <p className="text-[10px] text-slate-600 truncate leading-none mt-1">Create & manage tenants</p>
                  </div>
                </>
              )}
            </NavLink>
          </nav>

          <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 shrink-0 space-y-2">
            <button onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: isDark ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {isDark ? <Sun size={14} className="text-white" /> : <Moon size={14} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-slate-300 leading-none">{isDark ? 'Light Mode' : 'Dark Mode'}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Click to switch</p>
              </div>
            </button>
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut size={14} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-red-400 leading-none">Sign Out</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{user.username}</p>
              </div>
            </button>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={[
        'fixed top-0 left-0 z-50 h-screen w-64 flex flex-col',
        'bg-slate-950 border-r border-slate-800/60',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>

        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">SchoolMS</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Management System</p>
            </div>
          </div>
          <button onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="px-4 py-3 border-b border-slate-800/60 shrink-0 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md"
              style={{ background: ROLE_COLORS[user.role] || ROLE_COLORS.admin }}>
              {(user.name || 'U')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        {/* Search trigger */}
        <div className="px-4 py-2.5 border-b border-slate-800/60 shrink-0">
          <button onClick={onSearch}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-all duration-200 group">
            <Search size={13} className="text-slate-500 group-hover:text-slate-400 shrink-0" />
            <span className="flex-1 text-left text-xs text-slate-500 group-hover:text-slate-400">Search everything…</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-600 font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Menu</p>

          {visibleItems.map((item) => {

            // ── Collapsible group ────────────────────────────────────────
            if (item.group) {
              const active   = groupActive(item);
              const expanded = openGroups.has(item.label);
              const { icon: Icon, color } = item;

              return (
                <div key={item.label}>
                  <button onClick={() => toggleGroup(item.label)} className={groupBtnCls(active)}>
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                        style={{ background: `linear-gradient(to bottom, ${color}, ${color}99)` }} />
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150"
                      style={active ? { background: `linear-gradient(135deg, ${color}, ${color}cc)` } : {}}>
                      <Icon size={15} className={active ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <span className={['flex-1 text-left text-sm leading-none', active ? 'font-semibold' : 'font-medium'].join(' ')}>
                      {item.label}
                    </span>
                    <ChevronDown
                      size={13}
                      className={['text-slate-500 shrink-0 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-slate-800 space-y-0.5 pb-1">
                      {item.children.map(child => {
                        const ChildIcon = child.icon;
                        const isActive  = pathActive(child.to);
                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            onClick={onClose}
                            className={() => childLinkCls(isActive)}
                          >
                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                              style={isActive ? { background: color } : {}}>
                              <ChildIcon size={11} className={isActive ? 'text-white' : 'text-slate-600'} />
                            </div>
                            <span className="leading-none">{child.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ── Dashboard (admin): flat link + expandable sub-views ──────
            if (item.to === '/' && isAdmin && item.adminChildren) {
              const active   = pathActive('/') || dashChildActive(item);
              const expanded = openGroups.has('__dashboard__');

              return (
                <div key="/">
                  <button onClick={() => toggleGroup('__dashboard__')} className={groupBtnCls(active)}>
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)' }} />
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={active ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                      <item.icon size={15} className={active ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <span className={['flex-1 text-left text-sm leading-none', active ? 'font-semibold' : 'font-medium'].join(' ')}>
                      Dashboard
                    </span>
                    <ChevronDown
                      size={13}
                      className={['text-slate-500 shrink-0 transition-transform duration-200', expanded ? 'rotate-180' : ''].join(' ')}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-0.5 ml-4 pl-3 border-l border-slate-800 space-y-0.5 pb-1">
                      {/* Admin overview */}
                      <NavLink to="/" end onClick={onClose}
                        className={({ isActive }) => childLinkCls(isActive)}>
                        {({ isActive }) => (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: isActive ? '#6366f1' : '#475569' }} />
                            <span>Admin Overview</span>
                          </>
                        )}
                      </NavLink>
                      {/* Sub-views */}
                      {item.adminChildren.map(child => (
                        <NavLink key={child.to} to={child.to} onClick={onClose}
                          className={({ isActive }) => childLinkCls(isActive)}>
                          {({ isActive }) => (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: isActive ? '#6366f1' : '#475569' }} />
                              <span>{child.label}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // ── Flat link (non-admin dashboard variants, Settings) ───────
            if (item.to) {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) => flatLinkCls(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                          style={{ background: 'linear-gradient(to bottom, #6366f1, #8b5cf6)' }} />
                      )}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150"
                        style={isActive ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                        <Icon size={15} className={isActive ? 'text-white' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={['text-sm leading-none', isActive ? 'font-semibold text-white' : 'font-medium'].join(' ')}>
                          {item.label}
                        </p>
                        <p className="text-[10px] text-slate-600 truncate leading-none mt-1">{item.description}</p>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            }

            return null;
          })}
        </nav>

        {/* Notifications (admin/teacher only) */}
        {showNotifications && (
          <div className="px-4 py-2 border-t border-slate-800/60 shrink-0 flex justify-end">
            <NotificationBell />
          </div>
        )}

        {/* Theme + sign out */}
        <div className={['px-4 pb-4 shrink-0 space-y-2', !showNotifications ? 'border-t border-slate-800/60 pt-2' : ''].join(' ')}>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800/80 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {isDark ? <Sun size={14} className="text-white" /> : <Moon size={14} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-300 leading-none">{isDark ? 'Light Mode' : 'Dark Mode'}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Click to switch</p>
            </div>
            <div className="w-8 h-4 rounded-full flex items-center px-0.5 shrink-0 transition-colors duration-300"
              style={{ background: isDark ? '#f59e0b' : '#334155' }}>
              <div className="w-3 h-3 rounded-full bg-white shadow transition-transform duration-300"
                style={{ transform: isDark ? 'translateX(16px)' : 'translateX(0)' }} />
            </div>
          </button>

          {user && (
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut size={14} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-red-400 leading-none">Sign Out</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{user.username}</p>
              </div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
