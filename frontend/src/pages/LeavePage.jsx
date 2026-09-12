import { useState, useEffect, useCallback } from 'react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { ModalHeader } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  CalendarDays, Plus, CheckCircle2, XCircle, Clock3,
  Users, RefreshCw, X, ChevronDown, Trash2,
  UserCheck, AlertTriangle, Calendar, FileText,
} from 'lucide-react';
import {
  getLeaveTypes, getLeaveStats, getLeaveBalance,
  getLeaves, applyLeave, reviewLeave, cancelLeave, deleteLeave,
} from '../api/leave';
import { getTeachers } from '../api/teachers';

// ── helpers ──────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—';
const currentYear = new Date().getFullYear();

const STATUS_CFG = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   Icon: Clock3 },
  approved:  { label: 'Approved',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           Icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',       Icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Calculate working days (exclude Sundays) ─────────────────
function calcWorkingDays(from, to) {
  if (!from || !to) return 0;
  let days = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    if (cur.getDay() !== 0) days++; // 0 = Sunday
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ── Apply Leave Modal ─────────────────────────────────────────
function ApplyModal({ teachers, leaveTypes, onClose, onSaved }) {
  const [form, setForm] = useState({
    teacher_id:    '',
    leave_type_id: '',
    from_date:     '',
    to_date:       '',
    total_days:    '',
    reason:        '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calc days when dates change
  useEffect(() => {
    if (form.from_date && form.to_date) {
      const lt = leaveTypes.find(l => l.id === Number(form.leave_type_id));
      if (lt?.name === 'Half Day') {
        set('total_days', '0.5');
      } else {
        const days = calcWorkingDays(form.from_date, form.to_date);
        set('total_days', days > 0 ? String(days) : '');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.from_date, form.to_date, form.leave_type_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.teacher_id)    return toast.error('Select a teacher');
    if (!form.leave_type_id) return toast.error('Select leave type');
    if (!form.from_date || !form.to_date) return toast.error('Enter leave dates');
    if (!form.total_days || Number(form.total_days) <= 0) return toast.error('Days must be > 0');
    setSaving(true);
    try {
      await applyLeave(form);
      toast.success('Leave application submitted');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSaving(false); }
  };

  const selectedType = leaveTypes.find(l => l.id === Number(form.leave_type_id));
  const isHalfDay = selectedType?.name === 'Half Day';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalHeader title="Apply for Leave" subtitle="Submit a new leave application" onClose={onClose} sticky />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Teacher <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 appearance-none">
                <option value="">Select teacher…</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} {t.subject ? `— ${t.subject}` : ''}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {leaveTypes.map(lt => (
                <button type="button" key={lt.id}
                  onClick={() => set('leave_type_id', lt.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    Number(form.leave_type_id) === lt.id
                      ? 'border-transparent text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                  style={Number(form.leave_type_id) === lt.id ? { backgroundColor: lt.color } : {}}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                  <span className="truncate">{lt.name}</span>
                  {lt.days_allowed > 0 && (
                    <span className={`ml-auto text-[10px] shrink-0 ${Number(form.leave_type_id) === lt.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {lt.days_allowed}d
                    </span>
                  )}
                </button>
              ))}
            </div>
            {selectedType && !selectedType.is_paid && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> This is unpaid leave — will be deducted from salary
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                From Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.from_date} onChange={e => set('from_date', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                To Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.to_date} onChange={e => set('to_date', e.target.value)}
                min={form.from_date}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
          </div>

          {/* Total Days */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Total Days <span className="text-red-500">*</span>
              <span className="text-[11px] text-slate-400 ml-1 font-normal">(Sundays excluded automatically)</span>
            </label>
            <input type="number" min="0.5" step="0.5" value={form.total_days}
              onChange={e => set('total_days', e.target.value)}
              readOnly={!isHalfDay && !!form.from_date && !!form.to_date}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60" />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
            <textarea rows={3} value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="Reason for leave (optional)…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60">
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Review Modal (approve / reject) ──────────────────────────
function ReviewModal({ leave, onClose, onSaved }) {
  const [action, setAction]     = useState('approved');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await reviewLeave(leave.id, { status: action, admin_note: adminNote });
      toast.success(`Leave ${action}`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <ModalHeader title="Review Leave" onClose={onClose} />

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 mx-6 mt-5 rounded-xl space-y-1 text-sm">
          <p className="font-semibold text-slate-900 dark:text-white">{leave.teacher_name}</p>
          <p className="text-slate-500">{leave.leave_type_name} · {leave.total_days} day{leave.total_days !== 1 ? 's' : ''}</p>
          <p className="text-slate-500">{fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}</p>
          {leave.reason && <p className="text-slate-600 dark:text-slate-400 italic">"{leave.reason}"</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3">
            {['approved', 'rejected'].map(opt => (
              <button type="button" key={opt}
                onClick={() => setAction(opt)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  action === opt
                    ? opt === 'approved'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-red-600 border-red-600 text-white shadow-md'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                {opt === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {opt === 'approved' ? 'Approve' : 'Reject'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Admin Note (optional)</label>
            <textarea rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)}
              placeholder="Add a note for the teacher…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all disabled:opacity-60 ${action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? 'Saving…' : action === 'approved' ? 'Approve Leave' : 'Reject Leave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Leave Balance Panel ───────────────────────────────────────
function BalancePanel({ leaveTypes, teachers }) {
  const [teacherId, setTeacherId] = useState('');
  const [year,      setYear]      = useState(currentYear);
  const [balance,   setBalance]   = useState([]);
  const [loading,   setLoading]   = useState(false);

  const load = async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const res = await getLeaveBalance({ teacher_id: teacherId, year });
      setBalance(res.data?.data ?? []);
    } catch { toast.error('Failed to load balance'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [teacherId, year]); // eslint-disable-line

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-indigo-500" /> Leave Balance
      </h3>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none">
            <option value="">Select teacher…</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
          {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {!teacherId && (
        <p className="text-center text-sm text-slate-400 py-6">Select a teacher to view their leave balance</p>
      )}
      {teacherId && loading && (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      )}
      {teacherId && !loading && balance.length > 0 && (
        <div className="space-y-3">
          {balance.filter(b => b.days_allowed > 0).map(b => {
            const pct = b.days_allowed > 0 ? Math.min(100, Math.round((b.used_days / b.days_allowed) * 100)) : 0;
            const isOver = b.used_days > b.days_allowed;
            return (
              <div key={b.leave_type_id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.leave_type_name}</span>
                  </div>
                  <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {b.used_days} / {b.days_allowed} days
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-2 rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : ''}`}
                    style={{ width: `${pct}%`, backgroundColor: isOver ? undefined : b.color }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {b.remaining_days != null ? `${b.remaining_days} remaining` : 'Unlimited'}
                  {isOver && <span className="text-red-500 ml-1">· {b.used_days - b.days_allowed} over limit</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function LeavePage() {
  const [stats,      setStats]      = useState(null);
  const [leaves,     setLeaves]     = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [teachers,   setTeachers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [filterYear,    setFilterYear]    = useState(String(currentYear));

  // Modals
  const [showApply,   setShowApply]   = useState(false);
  const [reviewLeaveItem, setReviewLeaveItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const params = {};
      if (filterTeacher) params.teacher_id    = filterTeacher;
      if (filterStatus)  params.status        = filterStatus;
      if (filterType)    params.leave_type_id = filterType;
      if (filterYear)    params.year          = filterYear;

      const [statsRes, leavesRes, typesRes, teachersRes] = await Promise.all([
        getLeaveStats({ year: filterYear || currentYear }),
        getLeaves(params),
        getLeaveTypes(),
        getTeachers({ status: 'active', limit: 200 }),
      ]);

      setStats(statsRes.data?.data ?? null);

      const lData = leavesRes.data?.data ?? leavesRes.data ?? [];
      setLeaves(Array.isArray(lData) ? lData : []);

      const ltData = typesRes.data?.data ?? typesRes.data ?? [];
      setLeaveTypes(Array.isArray(ltData) ? ltData : []);

      const tData = teachersRes.data?.data ?? teachersRes.data ?? [];
      setTeachers(Array.isArray(tData) ? tData : []);
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterTeacher, filterStatus, filterType, filterYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLeave(deleteTarget.id);
      toast.success('Leave deleted');
      setDeleteTarget(null);
      loadAll(true);
    } catch { toast.error('Delete failed'); }
  };

  const s = stats;

  return (
    <Layout>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <PageHeader
          icon={CalendarDays}
          title="Staff Leave Management"
          subtitle="Apply, approve & track teacher leave requests"
          actions={
            <div className="flex items-center gap-2">
              <button onClick={() => loadAll(true)} disabled={refreshing}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowApply(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> Apply Leave
              </button>
            </div>
          }
        />

        {/* ── KPI Cards ── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending',         value: s?.totals?.pending ?? 0,   Icon: Clock3,        from: '#f59e0b', to: '#f97316', warn: (s?.totals?.pending ?? 0) > 0 },
              { label: 'Approved (year)', value: s?.totals?.approved ?? 0,  Icon: CheckCircle2,  from: '#10b981', to: '#059669' },
              { label: 'On Leave Today',  value: s?.onLeaveToday?.length ?? 0, Icon: Users,      from: '#3b82f6', to: '#6366f1' },
              { label: 'Total Days Taken',value: s?.totals?.total_days_taken ?? 0, Icon: Calendar, from: '#8b5cf6', to: '#a855f7', suffix: 'd' },
            ].map(({ label, value, Icon, from, to, warn, suffix }) => (
              <div key={label} className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 ${warn ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200/80 dark:border-slate-800'}`}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right,${from},${to})` }} />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{value}{suffix ?? ''}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── On Leave Today + Balance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* On Leave Today */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> On Leave Today
            </h3>
            {(s?.onLeaveToday ?? []).length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All staff present today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.onLeaveToday.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                    <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                      {t.full_name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{t.full_name}</p>
                      <p className="text-xs text-slate-500">{t.leave_type} · until {fmtDateShort(t.to_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Balance */}
          <div className="lg:col-span-2">
            <BalancePanel leaveTypes={leaveTypes} teachers={teachers} />
          </div>
        </div>

        {/* ── Pending Requests (quick action) ── */}
        {(s?.pendingList ?? []).length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/40 p-5">
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Pending Approval ({s.pendingList.length})
            </h3>
            <div className="space-y-2">
              {s.pendingList.map(lv => (
                <div key={lv.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm shrink-0">
                    {lv.teacher_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lv.teacher_name}</p>
                    <p className="text-xs text-slate-500">
                      {lv.leave_type_name} · {lv.total_days}d · {fmtDateShort(lv.from_date)} – {fmtDateShort(lv.to_date)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setReviewLeaveItem(lv); }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Teacher */}
            <div className="relative min-w-[180px]">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
                className="w-full pl-9 pr-7 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none">
                <option value="">All Teachers</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Status */}
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-7">
                <option value="">All Status</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Leave Type */}
            <div className="relative">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-7">
                <option value="">All Types</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Year */}
            <div className="relative">
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-7">
                {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {(filterTeacher || filterStatus || filterType) && (
              <button onClick={() => { setFilterTeacher(''); setFilterStatus(''); setFilterType(''); }}
                className="px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Leave Table ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Leave Applications
              <span className="ml-2 text-xs font-normal text-slate-400">({leaves.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No leave applications found.</p>
              <button onClick={() => setShowApply(true)}
                className="mt-4 text-indigo-600 hover:underline text-sm font-medium">
                + Submit first application
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Teacher</th>
                    <th className="text-left px-5 py-3 font-semibold">Leave Type</th>
                    <th className="text-left px-5 py-3 font-semibold">Period</th>
                    <th className="text-center px-4 py-3 font-semibold">Days</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 font-semibold">Applied</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaves.map(lv => (
                    <tr key={lv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                            {lv.teacher_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{lv.teacher_name}</p>
                            {lv.teacher_subject && <p className="text-xs text-slate-400">{lv.teacher_subject}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lv.leave_type_color }} />
                          {lv.leave_type_name}
                          {!lv.leave_type_paid && <span className="text-amber-500 text-[10px]">(Unpaid)</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {fmtDateShort(lv.from_date)} – {fmtDateShort(lv.to_date)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                        {lv.total_days}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <StatusBadge status={lv.status} />
                          {lv.admin_note && (
                            <p className="text-[10px] text-slate-400 max-w-[160px] truncate" title={lv.admin_note}>
                              "{lv.admin_note}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {fmtDate(lv.applied_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lv.status === 'pending' && (
                            <button onClick={() => setReviewLeaveItem(lv)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 transition-colors">
                              Review
                            </button>
                          )}
                          <button onClick={() => setDeleteTarget(lv)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showApply && (
        <ApplyModal
          teachers={teachers}
          leaveTypes={leaveTypes}
          onClose={() => setShowApply(false)}
          onSaved={() => { setShowApply(false); loadAll(true); }}
        />
      )}

      {reviewLeaveItem && (
        <ReviewModal
          leave={reviewLeaveItem}
          onClose={() => setReviewLeaveItem(null)}
          onSaved={() => { setReviewLeaveItem(null); loadAll(true); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Delete Leave?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">
              {deleteTarget.teacher_name}'s {deleteTarget.leave_type_name} ({deleteTarget.total_days}d) will be permanently deleted.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
