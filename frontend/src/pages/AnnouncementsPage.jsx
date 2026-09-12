import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Bell, Plus, Pencil, Trash2, X, Check, Search, Filter,
  Megaphone, Calendar, Users, BookOpen, Banknote, PartyPopper,
  Palmtree, AlertTriangle, Eye, EyeOff, Clock, ChevronDown,
  ToggleLeft, ToggleRight, History, Mail, Loader2,
} from 'lucide-react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import Modal    from '../components/ui/Modal';
import Button   from '../components/ui/Button';
import Input    from '../components/ui/Input';
import { Textarea, Select } from '../components/ui/Input';
import Spinner  from '../components/ui/Spinner';
import {
  getAnnouncements, createAnnouncement, updateAnnouncement,
  toggleAnnouncement, deleteAnnouncement, sendAnnouncementEmail,
} from '../api/announcements';
import { useClasses } from '../hooks/useReferenceData';

// ─────────────────────────────────────────────────────────────
//  Meta constants
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'board',   label: 'Notice Board', icon: Bell },
  { id: 'manage',  label: 'Manage',       icon: Megaphone },
];

const TYPE_META = {
  general: { label: 'General',  icon: Megaphone,   from: '#6366f1', to: '#8b5cf6', bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-400',  border: 'border-indigo-200 dark:border-indigo-800/40' },
  exam:    { label: 'Exam',     icon: BookOpen,    from: '#f59e0b', to: '#f97316', bg: 'bg-amber-50 dark:bg-amber-900/20',    text: 'text-amber-700 dark:text-amber-400',    border: 'border-amber-200 dark:border-amber-800/40' },
  fee:     { label: 'Fee',      icon: Banknote,    from: '#10b981', to: '#0d9488', bg: 'bg-emerald-50 dark:bg-emerald-900/20',text: 'text-emerald-700 dark:text-emerald-400',border: 'border-emerald-200 dark:border-emerald-800/40' },
  event:   { label: 'Event',    icon: PartyPopper, from: '#8b5cf6', to: '#ec4899', bg: 'bg-purple-50 dark:bg-purple-900/20',  text: 'text-purple-700 dark:text-purple-400',  border: 'border-purple-200 dark:border-purple-800/40' },
  holiday: { label: 'Holiday',  icon: Palmtree,    from: '#ec4899', to: '#f43f5e', bg: 'bg-pink-50 dark:bg-pink-900/20',      text: 'text-pink-700 dark:text-pink-400',      border: 'border-pink-200 dark:border-pink-800/40' },
};

const PRIORITY_META = {
  low:    { label: 'Low',    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  normal: { label: 'Normal', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  high:   { label: 'High',   cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  urgent: { label: 'Urgent', cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
};

const AUDIENCE_META = {
  all:      { label: 'Everyone',  icon: Users },
  students: { label: 'Students',  icon: BookOpen },
  teachers: { label: 'Teachers',  icon: Users },
  parents:  { label: 'Parents',   icon: Users },
  class:    { label: 'Class',     icon: BookOpen },
};

// ─────────────────────────────────────────────────────────────
//  Root page
// ─────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const [tab, setTab] = useState('board');

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <PageHeader
          icon={Bell}
          title="Announcements"
          subtitle="Create and manage school-wide notices and announcements"
        />

        {/* Tabs */}
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'board'  && <NoticeBoardTab />}
        {tab === 'manage' && <ManageTab />}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 1 — Notice Board (read-only, visual cards)
// ─────────────────────────────────────────────────────────────
function NoticeBoardTab() {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter,setTypeFilter]= useState('');
  const [audFilter, setAudFilter] = useState('');
  const [expanded,  setExpanded]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { active_only: 'true' };
      if (typeFilter) params.type     = typeFilter;
      if (audFilter)  params.audience = audFilter;
      if (search)     params.search   = search;
      const { data } = await getAnnouncements(params);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load announcements');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, audFilter, search]);

  useEffect(() => { load(); }, [load]);

  const urgentItems  = items.filter(i => i.priority === 'urgent');
  const regularItems = items.filter(i => i.priority !== 'urgent');

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-56" />
        </div>
        <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="All Types">
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </FilterSelect>
        <FilterSelect value={audFilter} onChange={setAudFilter} placeholder="All Audiences">
          <option value="">All Audiences</option>
          {Object.entries(AUDIENCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </FilterSelect>
        {(typeFilter || audFilter || search) && (
          <button onClick={() => { setTypeFilter(''); setAudFilter(''); setSearch(''); }}
            className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-14"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyBox icon={Bell} message="No active announcements at this time." />
      ) : (
        <div className="space-y-5">
          {/* Urgent banner strip */}
          {urgentItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Urgent</span>
              </div>
              {urgentItems.map(item => (
                <AnnouncementCard key={item.id} item={item} expanded={expanded === item.id}
                  onToggle={() => setExpanded(expanded === item.id ? null : item.id)} />
              ))}
            </div>
          )}

          {/* Regular cards grid */}
          {regularItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {regularItems.map(item => (
                <AnnouncementCard key={item.id} item={item} grid
                  expanded={expanded === item.id}
                  onToggle={() => setExpanded(expanded === item.id ? null : item.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ item, grid = false, expanded, onToggle }) {
  const meta   = TYPE_META[item.announcement_type]  || TYPE_META.general;
  const priMeta = PRIORITY_META[item.priority]      || PRIORITY_META.normal;
  const audMeta = AUDIENCE_META[item.target_audience] || AUDIENCE_META.all;
  const Icon   = meta.icon;

  const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
  const expiresIn = item.expires_at
    ? Math.ceil((new Date(item.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={[
      'bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all duration-200',
      'hover:shadow-md',
      item.priority === 'urgent'
        ? 'border-red-200 dark:border-red-800/50'
        : `${meta.border}`,
      grid ? '' : 'w-full',
    ].join(' ')}>
      {/* Type accent bar */}
      <div className="h-1" style={{ background: `linear-gradient(to right,${meta.from},${meta.to})` }} />

      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg,${meta.from}22,${meta.to}22)` }}>
            <Icon size={16} style={{ color: meta.from }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{item.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}>
                {meta.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${priMeta.cls}`}>
                {priMeta.label}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <audMeta.icon size={9} /> {audMeta.label}
                {item.class_name && ` · ${item.class_name}`}
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        <p className={[
          'text-sm text-slate-600 dark:text-slate-300 leading-relaxed',
          grid && !expanded ? 'line-clamp-3' : '',
        ].join(' ')}>
          {item.message}
        </p>

        {grid && item.message.length > 120 && (
          <button onClick={onToggle}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1">
            {expanded ? <><X size={10} /> Show less</> : <><Eye size={10} /> Read more</>}
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar size={10} />
            {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            {item.created_by_name && <span className="ml-1">· {item.created_by_name}</span>}
          </div>
          {expiresIn !== null && (
            <span className={[
              'flex items-center gap-1 text-[10px] font-medium',
              isExpired ? 'text-red-500' : expiresIn <= 3 ? 'text-orange-500' : 'text-slate-400',
            ].join(' ')}>
              <Clock size={10} />
              {isExpired ? 'Expired' : expiresIn <= 0 ? 'Expires today' : `${expiresIn}d left`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 2 — Manage (full CRUD table)
// ─────────────────────────────────────────────────────────────
function ManageTab() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAll,    setShowAll]    = useState(false);   // false = active only
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [sending,    setSending]    = useState(null);    // id of announcement being emailed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter)     params.type        = typeFilter;
      if (search)         params.search      = search;
      if (!showAll)       params.active_only = 'true';
      const { data } = await getAnnouncements(params);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, showAll]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, currentState) => {
    try {
      await toggleAnnouncement(id);
      toast.success(currentState ? 'Deactivated' : 'Activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"?`)) return;
    try {
      await deleteAnnouncement(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSendEmail = async (id, title) => {
    if (!window.confirm(`Send email broadcast for "${title}" to all recipients in its target audience?`)) return;
    setSending(id);
    try {
      const { data } = await sendAnnouncementEmail(id);
      toast.success(`Email sent to ${data.emailsSent} recipient(s)${data.skipped ? ` (${data.skipped} skipped)` : ''}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-48" />
          </div>
          <FilterSelect value={typeFilter} onChange={setTypeFilter}>
            <option value="">All Types</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </FilterSelect>
          <button onClick={() => setShowAll(v => !v)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all',
              showAll
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
            ].join(' ')}>
            <History size={12} /> {showAll ? 'Showing All' : 'Active Only'}
          </button>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Plus size={14} /> New Announcement
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyBox icon={Megaphone} message="No announcements found." />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                {['Title', 'Type', 'Audience', 'Priority', 'Expires', 'Status', 'Email', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map(item => {
                const meta    = TYPE_META[item.announcement_type] || TYPE_META.general;
                const priMeta = PRIORITY_META[item.priority]     || PRIORITY_META.normal;
                const audMeta = AUDIENCE_META[item.target_audience] || AUDIENCE_META.all;
                const Icon    = meta.icon;
                const expired = item.expires_at && new Date(item.expires_at) < new Date();

                return (
                  <tr key={item.id} className={[
                    'hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors',
                    !item.is_active ? 'opacity-60' : '',
                  ].join(' ')}>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `linear-gradient(135deg,${meta.from}22,${meta.to}22)` }}>
                          <Icon size={13} style={{ color: meta.from }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{item.message}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.bg} ${meta.text} ${meta.border}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {audMeta.label}{item.class_name ? ` · ${item.class_name}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${priMeta.cls}`}>
                        {priMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.expires_at ? (
                        <span className={expired ? 'text-red-500' : ''}>
                          {new Date(item.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {expired && ' (expired)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(item.id, item.is_active)}
                        className={[
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                          item.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                        ].join(' ')}>
                        {item.is_active ? <><ToggleRight size={10} /> Active</> : <><ToggleLeft size={10} /> Inactive</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.email_sent_at ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check size={9} /> Sent
                          </span>
                          <span className="text-[10px] text-slate-400">{item.email_sent_count} recipient(s)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendEmail(item.id, item.title)}
                          disabled={sending === item.id}
                          title="Send email to target audience"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/40 transition-colors disabled:opacity-50">
                          {sending === item.id
                            ? <Loader2 size={10} className="animate-spin" />
                            : <Mail size={10} />}
                          {sending === item.id ? 'Sending…' : 'Send Email'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditing(item); setModalOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <AnnouncementFormModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Create / Edit Modal
// ─────────────────────────────────────────────────────────────
function AnnouncementFormModal({ initial, onClose, onSaved }) {
  const { data: classes = [] } = useClasses();
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    title:             '',
    message:           '',
    announcement_type: 'general',
    target_audience:   'all',
    class_id:          '',
    priority:          'normal',
    is_active:         true,
    ...initial,
    // Normalise date format for <input type="date">
    expires_at: initial?.expires_at
      ? new Date(initial.expires_at).toISOString().split('T')[0]
      : '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())   { toast.error('Title is required');   return; }
    if (!form.message.trim()) { toast.error('Message is required'); return; }
    if (form.target_audience === 'class' && !form.class_id) {
      toast.error('Please select a class for class-targeted announcements');
      return;
    }

    const payload = {
      ...form,
      class_id:   form.class_id   || null,
      expires_at: form.expires_at || null,
    };

    setSaving(true);
    try {
      if (initial?.id) {
        await updateAnnouncement(initial.id, payload);
        toast.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial?.id ? 'Edit Announcement' : 'New Announcement'} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

        {/* Title */}
        <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Midterm Exam Schedule Released" />

        {/* Message */}
        <Textarea label="Message *" rows={4} value={form.message} onChange={e => set('message', e.target.value)}
          placeholder="Write the full announcement message here…" />

        {/* Type + Audience */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Type</label>
            <div className="relative">
              <select value={form.announcement_type} onChange={e => set('announcement_type', e.target.value)}
                className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Target Audience</label>
            <div className="relative">
              <select value={form.target_audience} onChange={e => set('target_audience', e.target.value)}
                className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                {Object.entries(AUDIENCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Class selector (shown only when audience = 'class') */}
        {form.target_audience === 'class' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Select Class *</label>
            <div className="relative">
              <select value={form.class_id} onChange={e => set('class_id', e.target.value)}
                className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="">— Select a class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade} {c.section})</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Priority + Expires */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Priority</label>
            <div className="relative">
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <Input label="Expires On (optional)" type="date" value={form.expires_at}
            onChange={e => set('expires_at', e.target.value)} />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <button type="button" onClick={() => set('is_active', !form.is_active)}
            className={[
              'w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none',
              form.is_active ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600',
            ].join(' ')}>
            <span className={[
              'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
              form.is_active ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')} />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {form.is_active ? 'Active — visible on notice board' : 'Inactive — hidden from notice board'}
            </p>
            <p className="text-xs text-slate-400">Toggle to control visibility</p>
          </div>
        </div>

        {/* Priority preview chip */}
        {form.announcement_type && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">Preview:</span>
            {(() => {
              const m = TYPE_META[form.announcement_type];
              const p = PRIORITY_META[form.priority];
              const A = AUDIENCE_META[form.target_audience];
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.bg} ${m.text} ${m.border}`}>{m.label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.cls}`}>{p.label}</span>
                  <span className="text-[10px] text-slate-400">→ {A.label}</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Check size={14} /> {initial?.id ? 'Save Changes' : 'Publish Announcement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────
function FilterSelect({ value, onChange, children }) {
  return (
    <div className="relative">
      <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <select value={value} onChange={e => onChange(e.target.value)}
        className="pl-7 pr-6 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                   focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer">
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function EmptyBox({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 gap-3">
      <Icon size={36} strokeWidth={1.3} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
