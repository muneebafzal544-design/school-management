import { useEffect, useState, useCallback } from 'react';
import { Plus, BookOpen, Clock, CheckCircle, AlertCircle, Pencil, Trash2, X, Calendar, Eye, Users, Bell, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout          from '../components/layout/Layout';
import { INPUT_CLS, SELECT_CLS } from '../components/ui/Input';
import { StatCard } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { getHomework, createHomework, updateHomework, deleteHomework } from '../api/homework';
import { getSubmissions, initSubmissions, checkSubmission, getSubmissionStats, sendReminder } from '../api/homeworkSubmissions';
import { useClasses, useSubjects } from '../hooks/useReferenceData';

const STATUS_COLORS = {
  active:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' });
}
function isPast(d) { return d && new Date(d) < new Date(new Date().toDateString()); }

/* ── Homework Form Modal ── */
function HwModal({ hw, classes, subjects, onClose, onSaved }) {
  const init = hw ? {
    class_id: hw.class_id || '', subject_id: hw.subject_id || '',
    title: hw.title || '', description: hw.description || '',
    due_date: hw.due_date ? hw.due_date.slice(0,10) : '', status: hw.status || 'active',
  } : { class_id:'', subject_id:'', title:'', description:'', due_date:'', status:'active' };

  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = INPUT_CLS;

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    if (!form.due_date)     return toast.error('Due date required');
    setSaving(true);
    try {
      if (hw) {
        await updateHomework(hw.id, form);
        toast.success('Homework updated');
      } else {
        await createHomework(form);
        toast.success('Homework assigned');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">{hw ? 'Edit Homework' : 'Assign Homework'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inp} placeholder="e.g. Read Chapter 5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Class</label>
              <select value={form.class_id} onChange={e => set('class_id', e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
              <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
                <option value="">None</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date *</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className={`${inp} resize-none`} placeholder="Homework instructions…" />
          </div>
          {hw && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : (hw ? 'Update' : 'Assign')}
          </button>
        </div>
      </div>
    </div>
  );
}

const SUB_STATUS = {
  pending:   { cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',       label: 'Pending' },
  submitted: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',        label: 'Submitted' },
  checked:   { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Checked' },
  missing:   { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',            label: 'Missing' },
};

function SubmissionsModal({ hw, onClose }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [checkForm, setCheckForm] = useState({ marks_awarded: '', feedback: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getSubmissions(hw.id);
      const d = r.data?.data ?? r.data ?? [];
      setSubs(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load submissions'); }
    finally { setLoading(false); }
  }, [hw.id]);

  useEffect(() => { load(); }, [load]);

  const handleInit = async () => {
    try {
      await initSubmissions(hw.id);
      toast.success('Submissions initialised');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Init failed'); }
  };

  const handleCheck = async (subId) => {
    try {
      await checkSubmission(hw.id, subId, {
        marks_awarded: checkForm.marks_awarded !== '' ? Number(checkForm.marks_awarded) : null,
        feedback: checkForm.feedback,
      });
      toast.success('Submission checked');
      setCheckingId(null);
      setCheckForm({ marks_awarded: '', feedback: '' });
      load();
    } catch { toast.error('Check failed'); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">Submissions: {hw.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{subs.length} students</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleInit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Users size={12} /> Init Submissions
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : subs.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-sm text-slate-400">No submissions yet. Click "Init Submissions" to create pending rows.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {subs.map(sub => {
                const badgeCfg = SUB_STATUS[sub.status] ?? SUB_STATUS.pending;
                return (
                  <div key={sub.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
                        {(sub.student_name || 'S')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{sub.student_name || '—'}</p>
                        {sub.submitted_at && <p className="text-xs text-slate-400">Submitted: {fmtDate(sub.submitted_at)}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${badgeCfg.cls}`}>{badgeCfg.label}</span>
                      {sub.marks_awarded !== null && sub.marks_awarded !== undefined && (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">{sub.marks_awarded} marks</span>
                      )}
                      {sub.status === 'submitted' && (
                        <button onClick={() => { setCheckingId(sub.id); setCheckForm({ marks_awarded: '', feedback: '' }); }}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-200 transition-colors shrink-0">
                          Check
                        </button>
                      )}
                    </div>
                    {checkingId === sub.id && (
                      <div className="mt-3 ml-11 flex gap-2 items-center flex-wrap">
                        <input type="number" min="0" placeholder="Marks" value={checkForm.marks_awarded}
                          onChange={e => setCheckForm(f => ({ ...f, marks_awarded: e.target.value }))}
                          className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none" />
                        <input placeholder="Feedback" value={checkForm.feedback}
                          onChange={e => setCheckForm(f => ({ ...f, feedback: e.target.value }))}
                          className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none" />
                        <button onClick={() => handleCheck(sub.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">Save</button>
                        <button onClick={() => setCheckingId(null)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                      </div>
                    )}
                    {sub.feedback && (
                      <p className="text-xs text-slate-400 mt-1 ml-11 italic">"{sub.feedback}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Submission stats badge ── */
function SubmissionBadge({ stats, hwId, onRemind }) {
  const [reminding, setReminding] = useState(false);
  if (!stats) return null;

  const submitted = Number(stats.submitted_count || 0);
  const total     = Number(stats.total_students  || 0);
  const missing   = total - submitted;
  const pct       = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const handleRemind = async (e) => {
    e.stopPropagation();
    setReminding(true);
    try {
      const r = await sendReminder(hwId);
      toast.success(r.data?.message || `Reminder sent`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reminder');
    }
    setReminding(false);
  };

  return (
    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
      {/* Progress chip */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {submitted}/{total}
          </span>
          <span className="text-[10px] text-slate-400">submitted</span>
        </div>
        {/* Mini progress bar */}
        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct >= 60 ? '#6366f1' : '#f59e0b' }} />
        </div>
        <span className="text-[10px] font-bold tabular-nums"
          style={{ color: pct === 100 ? '#10b981' : pct >= 60 ? '#6366f1' : '#f59e0b' }}>
          {pct}%
        </span>
      </div>

      {/* Remind button — only shown when some students haven't submitted */}
      {missing > 0 && (
        <button
          onClick={handleRemind}
          disabled={reminding}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition disabled:opacity-50"
        >
          {reminding
            ? <Loader2 size={9} className="animate-spin" />
            : <Bell size={9} />}
          Remind {missing}
        </button>
      )}
    </div>
  );
}

export default function HomeworkPage() {
  const [items,       setItems]       = useState([]);
  const { data: classes = [] }        = useClasses();
  const { data: subjects = [] }       = useSubjects();
  const [stats,       setStats]       = useState({});  // keyed by homework id
  const [loading,     setLoading]     = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [statusFilt,  setStatusFilt]  = useState('active');
  const [modal,       setModal]       = useState(null); // null | 'new' | hw object
  const [delTarget,   setDelTarget]   = useState(null);
  const [subsModal,   setSubsModal]   = useState(null); // hw object

  const fetchHw = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (classFilter) params.class_id = classFilter;
      if (statusFilt)  params.status   = statusFilt;
      const r = await getHomework(params);
      const hw = Array.isArray(r.data) ? r.data : [];
      setItems(hw);

      // Fetch submission stats in background — don't block the list render
      if (hw.length > 0) {
        getSubmissionStats(classFilter ? { class_id: classFilter } : {})
          .then(sr => {
            const arr  = sr.data?.data ?? sr.data ?? [];
            const map  = {};
            (Array.isArray(arr) ? arr : []).forEach(s => { map[s.id] = s; });
            setStats(map);
          })
          .catch(() => {}); // stats are non-critical
      }
    } catch { toast.error('Failed to load homework'); }
    finally { setLoading(false); }
  }, [classFilter, statusFilt]);

  useEffect(() => { fetchHw(); }, [fetchHw]);

  const handleDelete = async () => {
    try {
      await deleteHomework(delTarget.id);
      toast.success('Homework deleted');
      setDelTarget(null);
      fetchHw();
    } catch { toast.error('Delete failed'); }
  };

  const active    = items.filter(h => h.status === 'active').length;
  const completed = items.filter(h => h.status === 'completed').length;
  const overdue   = items.filter(h => h.status === 'active' && isPast(h.due_date)).length;

  const selCls = SELECT_CLS;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* Hero */}
        <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed, #9333ea)' }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <BookOpen size={13} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Homework</h1>
              <p className="text-white/60 text-sm mt-1">Assign and track homework for all classes</p>
            </div>
            <button onClick={() => setModal('new')}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 transition-all shadow-lg">
              <Plus size={15} /> Assign Homework
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-10 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total"     value={items.length} icon={BookOpen}    gradientFrom="#2563eb" gradientTo="#7c3aed" iconBg="bg-blue-50 dark:bg-blue-500/10"   textColor="text-blue-600 dark:text-blue-400" />
            <StatCard label="Active"    value={active}       icon={Clock}       gradientFrom="#0891b2" gradientTo="#2563eb" iconBg="bg-cyan-50 dark:bg-cyan-500/10"    textColor="text-cyan-600 dark:text-cyan-400" />
            <StatCard label="Completed" value={completed}    icon={CheckCircle} gradientFrom="#059669" gradientTo="#0d9488" iconBg="bg-emerald-50 dark:bg-emerald-500/10" textColor="text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Overdue"   value={overdue}      icon={AlertCircle} gradientFrom="#dc2626" gradientTo="#f97316" iconBg="bg-red-50 dark:bg-red-500/10"      textColor="text-red-600 dark:text-red-400" />
          </div>

          {/* List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center">
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className={selCls}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={statusFilt} onChange={e => setStatusFilt(e.target.value)} className={selCls}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="ml-auto text-xs text-slate-400 font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? <PageLoader /> : items.length === 0 ? (
              <EmptyState icon={BookOpen} title="No homework found" description="Assign homework using the button above"
                actionLabel="Assign Homework" onAction={() => setModal('new')} />
            ) : (
              <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {items.map(h => {
                  const past = isPast(h.due_date) && h.status === 'active';
                  return (
                    <li key={h.id} className="px-4 sm:px-5 py-4 flex items-start gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${past ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <BookOpen size={15} className={past ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-snug">{h.title}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${STATUS_COLORS[h.status]}`}>
                            {h.status}
                          </span>
                          {past && <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40">Overdue</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          {h.class_name && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{h.class_name}</span>}
                          {h.subject_name && <span className="text-xs text-slate-500 dark:text-slate-400">{h.subject_name}</span>}
                          <span className={`flex items-center gap-1 text-xs font-medium ${past ? 'text-red-500' : 'text-slate-400'}`}>
                            <Calendar size={10} /> Due: {fmtDate(h.due_date)}
                          </span>
                        </div>
                        {h.description && <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 line-clamp-2">{h.description}</p>}
                        <SubmissionBadge stats={stats[h.id]} hwId={h.id} />
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all mt-0.5">
                        <button onClick={() => setSubsModal(h)} title="View Submissions"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => setModal(h)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDelTarget(h)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <HwModal
          hw={modal === 'new' ? null : modal}
          classes={classes}
          subjects={subjects}
          onClose={() => setModal(null)}
          onSaved={fetchHw}
        />
      )}
      {subsModal && (
        <SubmissionsModal hw={subsModal} onClose={() => setSubsModal(null)} />
      )}
      <ConfirmDialog
        isOpen={Boolean(delTarget)}
        title="Delete Homework"
        message={`Delete "${delTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </Layout>
  );
}
