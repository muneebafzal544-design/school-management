import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock3, ChevronLeft, ChevronRight,
  Users, Save, AlertTriangle, BookOpen, Zap, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { getTeacherQuickList, bulkMark } from '../api/attendance';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_CFG = {
  present: { label: 'P', bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  absent:  { label: 'A', bg: 'bg-red-500',     text: 'text-white', border: 'border-red-600',     light: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  late:    { label: 'L', bg: 'bg-amber-500',   text: 'text-white', border: 'border-amber-600',   light: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  excused: { label: 'E', bg: 'bg-blue-500',    text: 'text-white', border: 'border-blue-600',    light: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
};

const CYCLE = { present: 'absent', absent: 'late', late: 'excused', excused: 'present' };

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

const GRAD_PAIRS = [
  '#6366f1,#8b5cf6', '#ec4899,#f43f5e', '#f59e0b,#f97316',
  '#06b6d4,#3b82f6', '#10b981,#14b8a6', '#ef4444,#f97316',
];
const avatarGrad = (id) => `linear-gradient(135deg,${GRAD_PAIRS[id % GRAD_PAIRS.length]})`;

// ── Time-lock banner ─────────────────────────────────────────
function TimeLockBanner() {
  const h = new Date().getHours();
  if (h >= 7 && h < 10) return null;
  const msg = h < 7
    ? 'School hasn\'t started yet. Attendance window opens at 7:00 AM.'
    : 'Attendance window (7 AM–10 AM) has passed. You can still mark but it will be flagged as late entry.';
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

// ── Class picker ─────────────────────────────────────────────
function ClassCard({ cls, onSelect }) {
  const pct = cls.total > 0 ? Math.round((cls.marked_count / cls.total) * 100) : 0;
  return (
    <button onClick={() => onSelect(cls)}
      className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all shadow-sm hover:shadow-md group">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {cls.class_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-slate-100">{cls.class_name}</p>
          {cls.subject_name && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{cls.subject_name}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              {cls.already_marked ? `${cls.marked_count}/${cls.total} marked` : `${cls.total} students`}
            </span>
          </div>
        </div>
        {cls.already_marked && (
          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Done
          </span>
        )}
      </div>
      {cls.period_number && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock3 size={10} />
          Period {cls.period_number}
          {cls.start_time && ` · ${cls.start_time}–${cls.end_time}`}
        </div>
      )}
    </button>
  );
}

// ── Student row ──────────────────────────────────────────────
function StudentRow({ student, status, isLocked, onChange }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.present;
  const handleTap = () => {
    if (isLocked) return;
    onChange(CYCLE[status] || 'present');
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${cfg.light}`}
      onClick={handleTap} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: avatarGrad(student.id) }}>
        {getInitials(student.full_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{student.full_name}</p>
        <div className="flex items-center gap-2">
          {student.roll_number && (
            <span className="text-[10px] text-slate-400">#{student.roll_number}</span>
          )}
          {student.is_late_arrival && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              Late arrival
            </span>
          )}
          {student.already_marked && (
            <span className="text-[10px] text-slate-400">previously marked</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${cfg.bg} ${cfg.text} shrink-0 shadow-sm`}>
        {cfg.label}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function QuickAttendancePage() {
  const { user } = useAuth();
  const [date,           setDate]           = useState(today());
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [selectedClass,  setSelectedClass]  = useState(null);
  const [statuses,       setStatuses]       = useState({});   // { studentId: status }
  const [saving,         setSaving]         = useState(false);
  const [savedClasses,   setSavedClasses]   = useState(new Set());

  const load = useCallback(async () => {
    if (!user.entity_id) { setLoading(false); return; }
    setLoading(true);
    setSelectedClass(null);
    try {
      const res = await getTeacherQuickList(user.entity_id, date);
      const d   = res.data?.data ?? res.data;
      setData(d);
    } catch {
      toast.error('Failed to load class list');
    }
    setLoading(false);
  }, [user.entity_id, date]);

  useEffect(() => { load(); }, [load]);

  const selectClass = (cls) => {
    setSelectedClass(cls);
    const init = {};
    cls.students.forEach(s => { init[s.id] = s.status; });
    setStatuses(init);
  };

  const markAll = (status) => {
    if (!selectedClass) return;
    const next = {};
    selectedClass.students.forEach(s => {
      // Don't override locked late arrivals
      next[s.id] = s.is_late_arrival ? s.status : status;
    });
    setStatuses(next);
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const records = selectedClass.students.map(s => ({
        student_id: s.id,
        class_id:   selectedClass.class_id,
        date,
        status:     statuses[s.id] || 'present',
        remarks:    s.is_late_arrival ? 'Late arrival' : '',
      }));
      await bulkMark(records);
      toast.success(`Attendance saved for ${selectedClass.class_name}`);
      setSavedClasses(prev => new Set([...prev, selectedClass.class_id]));
      setSelectedClass(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  // Stats for selected class
  const counts = selectedClass
    ? Object.values(statuses).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {})
    : {};

  const dateNav = (dir) => {
    const d = new Date(date);
    d.setDate(d.getDate() + dir);
    setDate(d.toISOString().slice(0, 10));
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
        style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #818cf8 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-indigo-300" />
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">Quick Attendance</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">One-Tap Marking</h1>
            <p className="text-indigo-200 text-sm mt-0.5">Present by default · tap to change</p>
          </div>
          {/* Date nav */}
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <button onClick={() => dateNav(-1)} className="text-white/70 hover:text-white">
              <ChevronLeft size={16} />
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer" />
            <button onClick={() => dateNav(1)} className="text-white/70 hover:text-white">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-10 pb-12 space-y-4 max-w-3xl mx-auto">
        <TimeLockBanner />

        {/* ── Admin has no entity_id — not a teacher ── */}
        {!user.entity_id ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
            <BookOpen size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">Quick Attendance is for teachers</p>
            <p className="text-sm text-slate-400 mt-1">Admin accounts are not linked to a teacher. Use the Attendance page to mark attendance for any class.</p>
          </div>
        ) : null}

        {/* ── Class not selected → class picker ── */}
        {user.entity_id && !selectedClass ? (
          <>
            {!data?.classes?.length ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
                <BookOpen size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No classes found for {date}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {data?.day_name === 'Sunday' || data?.day_name === 'Saturday'
                    ? `${data.day_name} is a weekend`
                    : 'No timetable entries for this day'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {data.classes.length} class{data.classes.length !== 1 ? 'es' : ''} · {data.day_name}
                </p>
                {data.classes.map(cls => (
                  <ClassCard key={cls.class_id} cls={cls}
                    onSelect={selectClass}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Student grid ── */
          <>
            {/* Back + class header */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setSelectedClass(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-100">{selectedClass.class_name}</p>
                  {selectedClass.subject_name && (
                    <p className="text-xs text-slate-400">{selectedClass.subject_name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{selectedClass.total} students</p>
                </div>
              </div>

              {/* Live count chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(STATUS_CFG).map(([s, cfg]) => (
                  <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${cfg.light}`}>
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${cfg.bg}`}>{cfg.label}</span>
                    {counts[s] || 0}
                  </div>
                ))}
              </div>

              {/* Bulk actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => markAll('present')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition">
                  <CheckCircle2 size={12} /> All Present
                </button>
                <button onClick={() => markAll('absent')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition">
                  <XCircle size={12} /> All Absent
                </button>
                <button onClick={() => {
                    const init = {};
                    selectedClass.students.forEach(s => { init[s.id] = s.status; });
                    setStatuses(init);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition">
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>

            {/* Student list — tap to cycle status */}
            <p className="text-[11px] text-slate-400 text-center">
              Tap a student to cycle: Present → Absent → Late → Excused
            </p>
            <div className="space-y-2">
              {selectedClass.students.map(s => (
                <StudentRow
                  key={s.id}
                  student={s}
                  status={statuses[s.id] || 'present'}
                  isLocked={false}
                  onChange={(newStatus) => setStatuses(prev => ({ ...prev, [s.id]: newStatus }))}
                />
              ))}
            </div>

            {/* Save button */}
            <div className="sticky bottom-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-60 transition"
                style={{ background: saving ? '#6b7280' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                <Save size={18} />
                {saving ? 'Saving…' : `Save Attendance (${selectedClass.total} students)`}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
