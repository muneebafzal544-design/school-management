import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, NotebookPen, FileBarChart2, Clock,
  CheckCircle2, AlertCircle, Plus, X, CalendarRange,
  ClipboardList, Loader2, Video, ExternalLink,
  Zap, BarChart2, Users,
} from 'lucide-react';
import Layout    from '../components/layout/Layout';
import StatCard  from '../components/ui/StatCard';
import { ModalHeader } from '../components/ui/Modal';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getTimetable } from '../api/timetable';
import { getHomework } from '../api/homework';
import { getExams } from '../api/exams';
import { getLeaveBalance, getLeaves, getLeaveTypes, applyLeave } from '../api/leave';
import { getOnlineClasses } from '../api/onlineClasses';
import { getSubmissionStats } from '../api/homeworkSubmissions';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}


const STATUS_CFG = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved:  { label: 'Approved',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

function calcWorkingDays(from, to) {
  if (!from || !to) return 0;
  let days = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    if (cur.getDay() !== 0) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ── Apply Leave Modal ────────────────────────────────────────
function ApplyLeaveModal({ teacherId, leaveTypes, onClose, onSaved }) {
  const [form, setForm] = useState({ leave_type_id: '', from_date: '', to_date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const totalDays = calcWorkingDays(form.from_date, form.to_date);
  const selectedType = leaveTypes.find(lt => String(lt.id) === String(form.leave_type_id));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leave_type_id || !form.from_date || !form.to_date) {
      toast.error('Please fill all required fields');
      return;
    }
    if (new Date(form.to_date) < new Date(form.from_date)) {
      toast.error('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      await applyLeave({
        teacher_id:    teacherId,
        leave_type_id: form.leave_type_id,
        from_date:     form.from_date,
        to_date:       form.to_date,
        total_days:    selectedType?.name === 'Half Day' ? 0.5 : totalDays,
        reason:        form.reason,
      });
      toast.success('Leave application submitted');
      onSaved();
    } catch (err) {
      toast.error(err.displayMessage || 'Failed to apply for leave');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <ModalHeader title="Apply for Leave" onClose={onClose} />
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Leave Type *</label>
            <select
              value={form.leave_type_id}
              onChange={e => set('leave_type_id', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name} {lt.days_allowed > 0 ? `(${lt.days_allowed} days/yr)` : ''}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">From Date *</label>
              <input
                type="date"
                value={form.from_date}
                onChange={e => set('from_date', e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">To Date *</label>
              <input
                type="date"
                value={form.to_date}
                onChange={e => set('to_date', e.target.value)}
                min={form.from_date}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          {form.from_date && form.to_date && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-2.5 text-sm text-indigo-700 dark:text-indigo-300 font-semibold">
              {selectedType?.name === 'Half Day' ? '0.5 days' : `${totalDays} working day${totalDays !== 1 ? 's' : ''}`}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              rows={3}
              placeholder="Brief reason for leave…"
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [timetable,    setTimetable]    = useState([]);
  const [homework,     setHomework]     = useState([]);
  const [exams,        setExams]        = useState([]);
  const [leaves,       setLeaves]       = useState([]);
  const [balance,      setBalance]      = useState([]);
  const [leaveTypes,   setLeaveTypes]   = useState([]);
  const [onlineClasses,setOnlineClasses]= useState([]);
  const [hwStats,      setHwStats]      = useState({});  // keyed by homework id
  const [loading,      setLoading]      = useState(true);
  const [showApply,    setShowApply]    = useState(false);

  const todayName = DAYS[new Date().getDay()];

  const fetchLeaves = async () => {
    if (!user.entity_id) return;
    try {
      const [lvRes, blRes] = await Promise.all([
        getLeaves({ teacher_id: user.entity_id, limit: 10 }),
        getLeaveBalance({ teacher_id: user.entity_id }),
      ]);
      setLeaves(Array.isArray(lvRes.data) ? lvRes.data : []);
      setBalance(Array.isArray(blRes.data) ? blRes.data : []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const fetchAll = async () => {
      const empty = { data: [] };
      const [ttRes, hwRes, exRes, ltRes, ocRes] = await Promise.all([
        user.entity_id ? getTimetable({ teacher_id: user.entity_id }).catch(() => empty) : Promise.resolve(empty),
        user.entity_id ? getHomework({ teacher_id: user.entity_id, limit: 10 }).catch(() => empty) : Promise.resolve(empty),
        getExams().catch(() => empty),
        getLeaveTypes().catch(() => empty),
        user.entity_id
          ? getOnlineClasses({ teacher_id: user.entity_id, upcoming: 'true' }).catch(() => empty)
          : Promise.resolve(empty),
      ]);
      setTimetable(Array.isArray(ttRes.data) ? ttRes.data : []);
      setHomework(Array.isArray(hwRes.data) ? hwRes.data : []);
      setExams(Array.isArray(exRes.data) ? exRes.data : []);
      setLeaveTypes(Array.isArray(ltRes.data) ? ltRes.data : []);
      setOnlineClasses(Array.isArray(ocRes.data) ? ocRes.data.slice(0, 5) : []);
      await fetchLeaves();
      setLoading(false);

      // Submission stats — non-blocking, load after render
      if (user.entity_id) {
        getSubmissionStats({ teacher_id: user.entity_id })
          .then(sr => {
            const arr = sr.data?.data ?? sr.data ?? [];
            const map = {};
            (Array.isArray(arr) ? arr : []).forEach(s => { map[s.id] = s; });
            setHwStats(map);
          })
          .catch(() => {});
      }
    };
    fetchAll();
  }, [user.entity_id]); // eslint-disable-line

  const todayPeriods  = timetable.filter(p => p.day_of_week === todayName);
  const pendingHw     = homework.filter(h => h.status !== 'graded');
  const today         = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingExams = exams
    .filter(e => {
      const d = e.start_date ? new Date(e.start_date) : null;
      return d && d >= today && (e.status === 'scheduled' || e.status === 'upcoming');
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 3);

  const pendingLeaves  = leaves.filter(l => l.status === 'pending').length;

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {showApply && (
        <ApplyLeaveModal
          teacherId={user.entity_id}
          leaveTypes={leaveTypes}
          onClose={() => setShowApply(false)}
          onSaved={() => { setShowApply(false); fetchLeaves(); }}
        />
      )}

      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-10 pb-20"
        style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #818cf8 0%, transparent 60%)' }} />
        <div className="relative max-w-3xl">
          <p className="text-indigo-300 text-sm font-semibold mb-1">{greeting()}</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{user.name}</h1>
          <p className="text-indigo-200 text-sm">Teacher Portal · Today is {todayName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-12 pb-12 space-y-6">

        {/* ── Quick-action banner ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/quick-attendance"
            className="flex items-center gap-4 p-4 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all group"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">Quick Attendance</p>
              <p className="text-white/70 text-xs mt-0.5">One-tap · present by default</p>
              {todayPeriods.length > 0 && (
                <p className="text-white/80 text-[11px] font-semibold mt-1">
                  {todayPeriods.length} period{todayPeriods.length !== 1 ? 's' : ''} today
                </p>
              )}
            </div>
          </Link>
          <Link to="/gradebook"
            className="flex items-center gap-4 p-4 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all group"
            style={{ background: 'linear-gradient(135deg, #0891b2, #2563eb)' }}>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BarChart2 size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">Gradebook</p>
              <p className="text-white/70 text-xs mt-0.5">Spreadsheet marks · Tab to navigate</p>
            </div>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CalendarDays}  label="Today's Periods"   value={todayPeriods.length}  color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
          <StatCard icon={NotebookPen}   label="Homework Assigned" value={homework.length}       color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
          <StatCard icon={AlertCircle}   label="Pending Review"    value={pendingHw.length}      color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          <StatCard icon={FileBarChart2} label="Upcoming Exams"    value={upcomingExams.length}  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's timetable */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Today's Schedule</h2>
              <span className="ml-auto text-[11px] font-semibold text-slate-400">{todayName}</span>
            </div>
            {todayPeriods.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No periods today</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayPeriods.sort((a, b) => a.period_number - b.period_number).map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">P{p.period_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{p.subject_name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{p.class_name || '—'} · {p.start_time}–{p.end_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent homework */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <NotebookPen size={16} className="text-purple-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Recent Homework</h2>
            </div>
            {homework.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No homework assigned</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {homework.slice(0, 6).map(hw => {
                  const overdue = hw.due_date && new Date(hw.due_date) < new Date();
                  return (
                    <div key={hw.id} className="px-5 py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${overdue ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{hw.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {hw.class_name || '—'} · Due: {hw.due_date || '—'}
                        </p>
                        {hwStats[hw.id] && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <Users size={9} />
                            {hwStats[hw.id].submitted_count}/{hwStats[hw.id].total_students} submitted
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hw.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {hw.status || 'active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Upcoming exams */}
        {upcomingExams.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <FileBarChart2 size={16} className="text-emerald-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Exams</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingExams.map(ex => (
                <div key={ex.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {new Date(ex.start_date).toLocaleDateString('en', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-extrabold text-amber-700 dark:text-amber-300 -mt-0.5">
                      {new Date(ex.start_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {ex.exam_name || ex.title || 'Unnamed Exam'}
                    </p>
                    <p className="text-[11px] text-slate-400">{ex.exam_type || ''} · {ex.academic_year || ''}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize">
                    {ex.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Classes widget */}
        {onlineClasses.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Video size={16} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Upcoming Online Classes</h2>
              <a href="/online-classes"
                className="ml-auto text-[11px] font-semibold text-indigo-500 hover:underline">
                View all
              </a>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {onlineClasses.map(oc => {
                const isLive = oc.status === 'live';
                return (
                  <div key={oc.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0 ${isLive ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                      {isLive
                        ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        : <>
                            <span className="text-[9px] font-bold text-indigo-500 leading-none">
                              {new Date(oc.scheduled_at).toLocaleDateString('en',{month:'short'}).toUpperCase()}
                            </span>
                            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                              {new Date(oc.scheduled_at).getDate()}
                            </span>
                          </>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{oc.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {isLive ? 'Live now' : new Date(oc.scheduled_at).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}
                        {oc.class_name ? ` · ${oc.class_name}` : ''}
                        {' · '}{oc.duration_minutes}min
                      </p>
                    </div>
                    {oc.meeting_link && (
                      <a href={oc.meeting_link} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${isLive ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                        <ExternalLink size={10} />
                        {isLive ? 'Join' : 'Link'}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leave section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Leave balance */}
          {balance.some(b => b.days_allowed > 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <CalendarRange size={16} className="text-teal-500" />
                <h2 className="font-bold text-slate-800 dark:text-white text-sm">Leave Balance</h2>
                <span className="ml-auto text-[11px] text-slate-400">{new Date().getFullYear()}</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {balance.filter(b => b.days_allowed > 0).slice(0, 4).map(b => (
                  <div key={b.leave_type_id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{b.leave_type_name}</p>
                    <div className="flex items-end gap-1 mt-1">
                      <span className="text-xl font-extrabold text-slate-800 dark:text-white">
                        {b.remaining_days ?? 0}
                      </span>
                      <span className="text-[11px] text-slate-400 mb-0.5">/ {b.days_allowed} left</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${Math.min(100, (b.used_days / b.days_allowed) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My leave requests */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <ClipboardList size={16} className="text-violet-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">My Leaves</h2>
              {pendingLeaves > 0 && (
                <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {pendingLeaves} pending
                </span>
              )}
              <button
                onClick={() => setShowApply(true)}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg"
              >
                <Plus size={13} />
                Apply
              </button>
            </div>
            {leaves.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CalendarRange size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No leave applications yet</p>
                <button
                  onClick={() => setShowApply(true)}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 mx-auto"
                >
                  <Plus size={12} /> Apply for leave
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.slice(0, 5).map(lv => {
                  const cfg = STATUS_CFG[lv.status] ?? STATUS_CFG.pending;
                  return (
                    <div key={lv.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {lv.leave_type_name || 'Leave'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {lv.from_date ? new Date(lv.from_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
                          {' – '}
                          {lv.to_date ? new Date(lv.to_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
                          {' · '}
                          {lv.total_days} day{lv.total_days !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </Layout>
  );
}
