import { useState, useEffect, useRef, useCallback } from 'react';
import { tokenStorage } from '../../api/axios';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell, X, RefreshCw, CheckCheck,
  DollarSign, AlertTriangle, UserX, BookOpen, Package, FileText, Trash2, CalendarClock, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getNotifications, getUnreadCount,
  generateNotifications, markRead, markAllRead, deleteNotification,
} from '../../api/notifications';

const TYPE_CONFIG = {
  fee_overdue:    { icon: DollarSign,    color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       label: 'Fee Overdue'   },
  fee_due_soon:   { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',   label: 'Fee Due Soon'  },
  absent:         { icon: UserX,         color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Absent'        },
  library_overdue:{ icon: BookOpen,      color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Library'       },
  low_stock:      { icon: Package,       color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',   label: 'Low Stock'     },
  upcoming_exam:  { icon: FileText,      color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',     label: 'Exam'          },
  leave_request:  { icon: CalendarClock, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', label: 'Leave Request'  },
  online_class:   { icon: Video,         color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', label: 'Online Class'  },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [panelStyle,    setPanelStyle]    = useState({});
  const buttonRef = useRef(null);
  const panelRef  = useRef(null);
  const navigate  = useNavigate();

  const loadCount = useCallback(async () => {
    try {
      const r = await getUnreadCount();
      const d = r.data?.data ?? r.data;
      setUnread(typeof d?.count === 'number' ? d.count : 0);
    } catch { /* silent */ }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getNotifications();
      const list = Array.isArray(r.data) ? r.data : [];
      setNotifications(list);
      setUnread(list.filter(n => !n.is_read).length);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, []);

  // Poll unread count every 60s — only when authenticated.
  // Platform super-admins have no tenant schema, so this endpoint never applies to them.
  useEffect(() => {
    if (!tokenStorage.getAccess() || user?.is_super_admin) return;
    loadCount();
    const id = setInterval(loadCount, 60000);
    return () => clearInterval(id);
  }, [loadCount, user?.is_super_admin]);

  // Load details when panel opens
  useEffect(() => {
    if (open) loadAll();
  }, [open, loadAll]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect       = buttonRef.current.getBoundingClientRect();
      const PANEL_W    = 384;
      const PANEL_H    = 500; // conservative max height estimate
      const VP_W       = window.innerWidth;
      const VP_H       = window.innerHeight;
      const GAP        = 8;

      // Horizontal: prefer left-aligned with button, clamp to viewport
      let left = rect.left;
      if (left + PANEL_W > VP_W - GAP) left = VP_W - PANEL_W - GAP;
      if (left < GAP) left = GAP;

      // Vertical: open below if space exists, otherwise open above
      let top;
      if (rect.bottom + GAP + PANEL_H <= VP_H) {
        top = rect.bottom + GAP;          // below
      } else {
        top = Math.max(GAP, rect.top - PANEL_H - GAP); // above
      }

      setPanelStyle({ top, left });
    }
    setOpen(o => !o);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await generateNotifications();
      const d = r.data?.data ?? r.data;
      toast.success(d?.message || r.data?.message || 'Alerts refreshed');
      loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to generate alerts');
    } finally { setGenerating(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const removed = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (removed && !removed.is_read) setUnread(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleClick = (notif) => {
    if (!notif.is_read) handleMarkRead(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  // ── Panel JSX (rendered via portal so it escapes CSS transform stacking contexts) ──
  const panel = open && createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', zIndex: 9999, width: 'min(384px, calc(100vw - 16px))', ...panelStyle }}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Notifications</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold">
              {unread} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleGenerate} disabled={generating} title="Refresh alerts"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
          </button>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} title="Mark all read"
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <CheckCheck size={13} />
            </button>
          )}
          <button onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-t-indigo-500 border-indigo-200 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Bell size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">All clear!</p>
            <p className="text-xs text-slate-400 mt-1">Click refresh to check for new alerts</p>
          </div>
        ) : (
          <ul>
            {notifications.map(n => {
              const cfg  = TYPE_CONFIG[n.type] || TYPE_CONFIG.fee_overdue;
              const Icon = cfg.icon;
              return (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`group flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 cursor-pointer transition-colors
                    ${n.is_read
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/30 opacity-60'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-indigo-50/30 dark:bg-indigo-900/10'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs leading-snug text-slate-800 dark:text-slate-100 ${!n.is_read ? 'font-bold' : 'font-semibold'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                        <button
                          onClick={(e) => handleDelete(n.id, e)}
                          className="p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                    {!n.is_read && (
                      <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
          <span className="text-xs text-slate-400">{notifications.length} alert{notifications.length !== 1 ? 's' : ''} total</span>
        </div>
      )}
    </div>,
    document.body
  );

  if (user?.is_super_admin) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {panel}
    </div>
  );
}
