import { useEffect, useState, useCallback } from 'react';
import {
  Video, Plus, X, Loader2, ExternalLink, Clock, Calendar,
  Users, BookOpen, ChevronDown, CheckCircle2, PlayCircle,
  XCircle, AlertCircle, Edit2, Trash2, Eye, BarChart2,
} from 'lucide-react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  getOnlineClasses, getMyClasses, createOnlineClass,
  updateOnlineClass, cancelOnlineClass, updateClassStatus, joinOnlineClass,
} from '../api/onlineClasses';
import { getTeachers } from '../api/teachers';
import { useClasses, useSubjects } from '../hooks/useReferenceData';

// ── helpers ──────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDateTime = (d) => d ? `${fmtDate(d)} · ${fmtTime(d)}` : '—';

const PLATFORM_CFG = {
  meet:   { label: 'Google Meet', color: '#34a853', bg: '#e8f5e9' },
  zoom:   { label: 'Zoom',        color: '#2D8CFF', bg: '#e8f0ff' },
  teams:  { label: 'MS Teams',    color: '#6264A7', bg: '#ede9f7' },
  manual: { label: 'Custom Link', color: '#64748b', bg: '#f1f5f9' },
};

const STATUS_CFG = {
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',      Icon: Calendar },
  live:      { label: 'Live Now',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Icon: PlayCircle },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',     Icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',          Icon: XCircle },
};

const PLATFORMS = ['manual','meet','zoom','teams'];
const DURATIONS = [15,20,30,45,60,90,120];

const BLANK_FORM = {
  teacher_id: '', class_id: '', subject_id: '',
  title: '', description: '', agenda: '',
  scheduled_at: '', duration_minutes: 45,
  meeting_platform: 'manual', meeting_link: '', meeting_password: '',
};

// ── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.scheduled;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.cls}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ── Class Card ───────────────────────────────────────────────
function ClassCard({ oc, role, onEdit, onCancel, onStatusChange, onJoin }) {
  const pl    = PLATFORM_CFG[oc.meeting_platform] ?? PLATFORM_CFG.manual;
  const isLive = oc.status === 'live';
  const canManage = role === 'admin' || role === 'teacher';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition-all ${
      isLive ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800' : 'border-slate-100 dark:border-slate-800'
    }`}>
      {isLive && (
        <div className="px-4 py-1.5 bg-emerald-500 rounded-t-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold text-white">LIVE NOW</span>
        </div>
      )}
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={oc.status} />
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: pl.bg, color: pl.color }}
              >
                {pl.label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{oc.title}</h3>
            {oc.description && (
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{oc.description}</p>
            )}
          </div>
          {canManage && oc.status !== 'cancelled' && oc.status !== 'completed' && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(oc)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onCancel(oc)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar size={11} className="text-indigo-400 shrink-0" />
            {fmtDate(oc.scheduled_at)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock size={11} className="text-indigo-400 shrink-0" />
            {fmtTime(oc.scheduled_at)} · {oc.duration_minutes}min
          </div>
          {oc.class_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Users size={11} className="text-indigo-400 shrink-0" />
              {oc.class_name}
            </div>
          )}
          {oc.subject_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <BookOpen size={11} className="text-indigo-400 shrink-0" />
              {oc.subject_name}
            </div>
          )}
          {oc.teacher_name && role !== 'teacher' && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 col-span-2">
              <Video size={11} className="text-indigo-400 shrink-0" />
              {oc.teacher_name}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Join button — everyone with a link */}
          {oc.meeting_link && oc.status !== 'cancelled' && oc.status !== 'completed' && (
            <button
              onClick={() => onJoin(oc)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                isLive
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <ExternalLink size={12} />
              {isLive ? 'Join Now' : 'Join Class'}
            </button>
          )}

          {/* Status control for teacher/admin */}
          {canManage && oc.status === 'scheduled' && (
            <button onClick={() => onStatusChange(oc.id, 'live')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 transition-colors">
              <PlayCircle size={12} /> Start
            </button>
          )}
          {canManage && oc.status === 'live' && (
            <button onClick={() => onStatusChange(oc.id, 'completed')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 transition-colors">
              <CheckCircle2 size={12} /> End Class
            </button>
          )}

          {oc.agenda && (
            <span className="text-[10px] text-slate-400 ml-auto">Has agenda</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create / Edit Modal ──────────────────────────────────────
function ClassModal({ initial, teachers, classes, subjects, role, onClose, onSaved }) {
  const [form,   setForm]   = useState(initial ?? BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Convert local datetime-local value → ISO string for API
  const toISO = (v) => v ? new Date(v).toISOString() : '';
  // Convert ISO → datetime-local format for input
  const toLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())        return toast.error('Title is required');
    if (!form.scheduled_at)        return toast.error('Date & time is required');
    if (!form.meeting_link.trim()) return toast.error('Meeting link is required');

    setSaving(true);
    try {
      const payload = { ...form, scheduled_at: toISO(form.scheduled_at) };
      if (isEdit) {
        await updateOnlineClass(initial.id, payload);
        toast.success('Class updated');
      } else {
        await createOnlineClass(payload);
        toast.success('Class scheduled');
      }
      onSaved();
    } catch (err) {
      toast.error(err.displayMessage || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {isEdit ? 'Edit Class' : 'Schedule Online Class'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Mathematics — Chapter 5 Review"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required />
          </div>

          {/* Teacher (admin only) */}
          {role === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Teacher *</label>
              <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required>
                <option value="">Select teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          )}

          {/* Class + Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Class</label>
              <select value={form.class_id} onChange={e => set('class_id', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">All / N/A</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Subject</label>
              <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Date/time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Date & Time *</label>
              <input type="datetime-local"
                value={form.scheduled_at ? toLocal(form.scheduled_at) : form.scheduled_at}
                onChange={e => set('scheduled_at', e.target.value)}
                min={toLocal(new Date().toISOString())}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Duration</label>
              <select value={form.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Platform + Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Platform</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {PLATFORMS.map(p => (
                <button key={p} type="button"
                  onClick={() => set('meeting_platform', p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    form.meeting_platform === p
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}>
                  {PLATFORM_CFG[p].label}
                </button>
              ))}
            </div>
            <input value={form.meeting_link} onChange={e => set('meeting_link', e.target.value)}
              placeholder="Paste meeting URL here"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required />
          </div>

          {/* Password (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Meeting Password <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input value={form.meeting_password} onChange={e => set('meeting_password', e.target.value)}
              placeholder="Leave blank if not required"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Brief description of the class…"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Agenda <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea value={form.agenda} onChange={e => set('agenda', e.target.value)}
              rows={3} placeholder="Topics to cover, e.g.&#10;1. Review homework&#10;2. New chapter intro"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function OnlineClassesPage() {
  const { user } = useAuth();
  const role = user?.role;

  const { data: classes = [] }      = useClasses();
  const [list,       setList]       = useState([]);
  const [teachers,   setTeachers]   = useState([]);
  const { data: subjects = [] }     = useSubjects();
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const isStudent = role === 'student' || role === 'parent';
  const canManage = role === 'admin' || role === 'teacher';

  const load = useCallback(async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const res = isStudent
        ? await getMyClasses()
        : await getOnlineClasses(role === 'teacher' ? { teacher_id: user.entity_id, ...params } : params);
      setList(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load classes'); }
    finally { setLoading(false); }
  }, [filterStatus, isStudent, role, user.entity_id]);

  useEffect(() => {
    const init = async () => {
      const empty = { data: [] };
      const tcRes = await (canManage && role === 'admin' ? getTeachers().catch(() => empty) : Promise.resolve(empty));
      setTeachers(Array.isArray(tcRes.data) ? tcRes.data : []);
      await load();
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => { if (!loading) load(); }, [filterStatus]); // eslint-disable-line

  const handleJoin = async (oc) => {
    try {
      const r = await joinOnlineClass(oc.id);
      const d = r.data?.data ?? r.data;
      window.open(d?.meeting_link || oc.meeting_link, '_blank', 'noopener,noreferrer');
    } catch { window.open(oc.meeting_link, '_blank', 'noopener,noreferrer'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateClassStatus(id, status);
      toast.success(`Class marked as ${status}`);
      load();
    } catch (err) { toast.error(err.displayMessage || 'Failed'); }
  };

  const handleCancel = async (oc) => {
    if (!window.confirm(`Cancel "${oc.title}"?`)) return;
    try {
      await cancelOnlineClass(oc.id);
      toast.success('Class cancelled');
      load();
    } catch (err) { toast.error(err.displayMessage || 'Failed'); }
  };

  const liveClasses      = list.filter(oc => oc.status === 'live');
  const scheduledClasses = list.filter(oc => oc.status === 'scheduled');
  const pastClasses      = list.filter(oc => ['completed','cancelled'].includes(oc.status));

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {/* Modal */}
      {showModal && (
        <ClassModal
          initial={editing}
          teachers={teachers}
          classes={classes}
          subjects={subjects}
          role={role}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); load(); }}
        />
      )}

      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <PageHeader
          icon={Video}
          title="Online Classes"
          subtitle={isStudent ? 'Your upcoming virtual classes' : 'Schedule and manage virtual classes'}
          actions={canManage && (
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus size={15} /> Schedule Class
            </button>
          )}
        />
      </div>

      {/* Filter bar (admin/teacher) */}
      {canManage && (
        <div className="px-4 sm:px-6 lg:px-8 pb-4 flex gap-2 flex-wrap">
          {['', 'scheduled', 'live', 'completed', 'cancelled'].map(s => (
            <button key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
              }`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 pb-12 space-y-8">

        {/* Live classes — always on top */}
        {liveClasses.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liveClasses.map(oc => (
                <ClassCard key={oc.id} oc={oc} role={role}
                  onEdit={o => { setEditing(o); setShowModal(true); }}
                  onCancel={handleCancel}
                  onStatusChange={handleStatusChange}
                  onJoin={handleJoin} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        {(filterStatus === '' || filterStatus === 'scheduled') && scheduledClasses.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              Upcoming · {scheduledClasses.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scheduledClasses.map(oc => (
                <ClassCard key={oc.id} oc={oc} role={role}
                  onEdit={o => { setEditing(o); setShowModal(true); }}
                  onCancel={handleCancel}
                  onStatusChange={handleStatusChange}
                  onJoin={handleJoin} />
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {pastClasses.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              Past Classes · {pastClasses.length}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pastClasses.map(oc => (
                <ClassCard key={oc.id} oc={oc} role={role}
                  onEdit={() => {}}
                  onCancel={handleCancel}
                  onStatusChange={handleStatusChange}
                  onJoin={handleJoin} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
              <Video size={28} className="text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {isStudent ? 'No upcoming classes' : 'No classes scheduled yet'}
            </p>
            {canManage && (
              <button onClick={() => { setEditing(null); setShowModal(true); }}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Schedule First Class
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
