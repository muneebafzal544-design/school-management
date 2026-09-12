import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, Clock, BookOpen, ChevronDown, X, Save, AlertCircle, Printer, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { getPeriods, createPeriod, updatePeriod, deletePeriod, getTimetable, upsertEntry, deleteEntry, getConflicts } from '../api/timetable';
import { getTeachers } from '../api/teachers';
import { useClasses } from '../hooks/useReferenceData';

const DAYS = [
  { num: 1, label: 'Monday',    short: 'Mon' },
  { num: 2, label: 'Tuesday',   short: 'Tue' },
  { num: 3, label: 'Wednesday', short: 'Wed' },
  { num: 4, label: 'Thursday',  short: 'Thu' },
  { num: 5, label: 'Friday',    short: 'Fri' },
  { num: 6, label: 'Saturday',  short: 'Sat' },
];

const ACADEMIC_YEARS = ['2024-25', '2025-26', '2026-27'];

const SUBJECT_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  { bg: '#f7fee7', text: '#3f6212', border: '#d9f99d' },
];

function subjectColor(subject) {
  if (!subject) return null;
  const idx = Math.abs(subject.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[idx];
}

function fmt(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ─── Period Modal ────────────────────────────────────────────
function PeriodModal({ period, onClose, onSaved }) {
  const isEdit = !!period?.id;
  const [form, setForm] = useState({
    period_no:  period?.period_no  || '',
    name:       period?.name       || '',
    start_time: period?.start_time?.slice(0,5) || '',
    end_time:   period?.end_time?.slice(0,5)   || '',
    is_break:   period?.is_break   || false,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.period_no || !form.name || !form.start_time || !form.end_time) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await updatePeriod(period.id, form);
      else        await createPeriod(form);
      toast.success(isEdit ? 'Period updated' : 'Period created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save period');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Clock size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {isEdit ? 'Edit Period' : 'Add Period'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Period No.</label>
              <input
                type="number" min="1" value={form.period_no}
                onChange={e => set('period_no', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Label</label>
              <input
                type="text" value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                placeholder="Period 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Start Time</label>
              <input
                type="time" value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">End Time</label>
              <input
                type="time" value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => set('is_break', !form.is_break)}
              className={`w-10 h-5.5 rounded-full transition-colors relative ${form.is_break ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              style={{ height: '22px', width: '40px' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                style={{ transform: form.is_break ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Mark as break / recess</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Slot Modal ──────────────────────────────────────────────
function SlotModal({ slot, classId, periodId, dayNum, dayLabel, periodName, academicYear, teachers, isConflicted, conflictInfo, onClose, onSaved }) {
  const [form, setForm] = useState({
    subject:    slot?.subject    || '',
    teacher_id: slot?.teacher_id ? String(slot.teacher_id) : '',
    room:       slot?.room       || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertEntry({
        class_id:     classId,
        period_id:    periodId,
        day_of_week:  dayNum,
        teacher_id:   form.teacher_id || null,
        subject:      form.subject    || null,
        room:         form.room       || null,
        academic_year: academicYear,
      });
      toast.success('Slot saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slot');
    } finally { setSaving(false); }
  };

  const handleClear = async () => {
    if (!slot?.id) { onClose(); return; }
    try {
      await deleteEntry(slot.id);
      toast.success('Slot cleared');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{dayLabel} — {periodName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Assign subject &amp; teacher</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Conflict warning banner */}
        {isConflicted && conflictInfo && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
              <span className="font-semibold">Schedule conflict:</span> Teacher is also assigned to{' '}
              <span className="font-semibold">{conflictInfo.conflict_class}{conflictInfo.conflict_section ? ` – ${conflictInfo.conflict_section}` : ''}</span>{' '}
              at this period. Reassign or clear to resolve.
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Subject</label>
            <input
              type="text" value={form.subject}
              onChange={e => set('subject', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              placeholder="e.g. Mathematics"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Teacher</label>
            <select
              value={form.teacher_id}
              onChange={e => set('teacher_id', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            >
              <option value="">— Select teacher —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` (${t.subject})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Room / Lab (optional)</label>
            <input
              type="text" value={form.room}
              onChange={e => set('room', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              placeholder="Room 12"
            />
          </div>

          <div className="flex gap-3 pt-2">
            {slot?.id && (
              <button type="button" onClick={handleClear}
                className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Clear
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function TimetablePage() {
  const { data: classes = [] }            = useClasses();
  const [teachers,      setTeachers]      = useState([]);
  const [periods,       setPeriods]       = useState([]);
  const [entries,       setEntries]       = useState([]);
  const [conflicts,     setConflicts]     = useState([]);   // double-booked slots

  const [selectedClass, setSelectedClass] = useState('');
  const [academicYear,  setAcademicYear]  = useState('2024-25');

  const [loading,       setLoading]       = useState(false);
  const [tab,           setTab]           = useState('grid'); // 'grid' | 'periods'

  const [periodModal,   setPeriodModal]   = useState(null);  // null | {} | period obj
  const [slotModal,     setSlotModal]     = useState(null);  // null | { periodId, dayNum, ... }
  const [dragSource,    setDragSource]    = useState(null);  // { periodId, dayNum, entry }
  const [dragOver,      setDragOver]      = useState(null);  // 'periodId_dayNum' key

  const [printTeacher,  setPrintTeacher]  = useState('');    // "id|name" or ''

  // Load support data once
  useEffect(() => {
    Promise.all([
      getTeachers(),
      getPeriods(),
    ]).then(([tch, per]) => {
      setTeachers(Array.isArray(tch.data) ? tch.data  : []);
      setPeriods(Array.isArray(per.data)  ? per.data  : []);
    }).catch(() => toast.error('Failed to load data'));
  }, []);

  // Load timetable whenever class or year changes
  const loadTimetable = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const [ttRes, cfRes] = await Promise.all([
        getTimetable(selectedClass, academicYear),
        getConflicts(selectedClass, academicYear),
      ]);
      setEntries(Array.isArray(ttRes.data) ? ttRes.data : []);
      const cfData = cfRes.data?.data ?? cfRes.data;
      setConflicts(Array.isArray(cfData) ? cfData : []);
    } catch {
      toast.error('Failed to load timetable');
    } finally { setLoading(false); }
  }, [selectedClass, academicYear]);

  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  const reloadPeriods = async () => {
    const res = await getPeriods();
    setPeriods(Array.isArray(res.data) ? res.data : []);
  };

  // Build entry lookup: { periodId_dayNum: entry }
  const entryMap = {};
  entries.forEach(e => { entryMap[`${e.period_id}_${e.day_of_week}`] = e; });

  // Build conflict lookup: { periodId_dayNum: conflictRow }
  const conflictMap = {};
  conflicts.forEach(c => { conflictMap[`${c.period_id}_${c.day_of_week}`] = c; });

  // ── Drag-and-drop: move or swap timetable slots ───────────
  const handleDrop = useCallback(async (targetPeriodId, targetDayNum) => {
    if (!dragSource) return;
    const { periodId: srcPeriodId, dayNum: srcDayNum, entry: srcEntry } = dragSource;
    setDragSource(null);
    setDragOver(null);
    if (srcPeriodId === targetPeriodId && srcDayNum === targetDayNum) return;

    const targetEntry = entryMap[`${targetPeriodId}_${targetDayNum}`];
    try {
      // Place source entry at target cell
      await upsertEntry({
        class_id: selectedClass, period_id: targetPeriodId, day_of_week: targetDayNum,
        teacher_id: srcEntry.teacher_id || null, subject: srcEntry.subject,
        room: srcEntry.room || null, academic_year: academicYear,
      });

      if (targetEntry?.subject) {
        // Swap — put target entry at source cell
        await upsertEntry({
          class_id: selectedClass, period_id: srcPeriodId, day_of_week: srcDayNum,
          teacher_id: targetEntry.teacher_id || null, subject: targetEntry.subject,
          room: targetEntry.room || null, academic_year: academicYear,
        });
      } else {
        // Move only — clear source cell
        if (srcEntry.id) await deleteEntry(srcEntry.id);
      }

      toast.success(targetEntry?.subject ? 'Slots swapped' : 'Slot moved');
      loadTimetable();
    } catch {
      toast.error('Failed to move slot');
      loadTimetable();
    }
  }, [dragSource, entries, selectedClass, academicYear, loadTimetable]);

  const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass));

  const handleDeletePeriod = async (id) => {
    if (!window.confirm('Delete this period? All timetable slots using it will also be removed.')) return;
    try {
      await deletePeriod(id);
      toast.success('Period deleted');
      reloadPeriods();
      loadTimetable();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Stat counts
  const filledSlots = entries.filter(e => e.subject).length;
  const totalSlots  = periods.filter(p => !p.is_break).length * DAYS.length;

  return (
    <Layout>
      {/* ── Hero Header ─────────────────────────────── */}
      <div
        className="sticky top-14 lg:top-0 z-30 px-4 sm:px-6 lg:px-8 py-5"
        style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#818cf8,#a78bfa)' }}>
              <CalendarDays size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Timetable</h1>
              <p className="text-xs text-indigo-300 mt-0.5">Manage class schedules &amp; periods</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{periods.length}</div>
              <div className="text-xs text-indigo-300">Periods</div>
            </div>
            <div className="w-px h-8 bg-indigo-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{filledSlots}</div>
              <div className="text-xs text-indigo-300">Filled Slots</div>
            </div>
            <div className="w-px h-8 bg-indigo-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalSlots}</div>
              <div className="text-xs text-indigo-300">Total Slots</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Controls bar ───────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Class selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Select Class</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                >
                  <option value="">— Choose a class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.grade} – {c.section})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Academic year */}
            <div className="w-36">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Academic Year</label>
              <div className="relative">
                <select
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  className="w-full pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                >
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-end gap-2 sm:ml-auto pt-4 sm:pt-0 self-end sm:self-auto">
              {[
                { key: 'grid',    label: 'Grid View' },
                { key: 'periods', label: 'Bell Schedule' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    tab === t.key
                      ? 'text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  style={tab === t.key ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Print / Download bar ── */}
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              <Printer size={13} /> Download / Print:
            </span>

            {/* Full school */}
            <button
              onClick={() => {
                const p = new URLSearchParams({ type: 'school', academic_year: academicYear });
                window.open(`/timetable/print?${p}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              Full School
            </button>

            {/* Current class */}
            {selectedClass && selectedClassObj && (
              <button
                onClick={() => {
                  const p = new URLSearchParams({ type: 'class', class_id: selectedClass, academic_year: academicYear, class_name: selectedClassObj.name });
                  window.open(`/timetable/print?${p}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {selectedClassObj.name}
              </button>
            )}

            {/* Teacher schedule */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <select
                  value={printTeacher}
                  onChange={e => setPrintTeacher(e.target.value)}
                  className="pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  <option value="">— Select Teacher —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={`${t.id}|${t.full_name}`}>{t.full_name}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button
                disabled={!printTeacher}
                onClick={() => {
                  const [tid, tname] = printTeacher.split('|');
                  const p = new URLSearchParams({ type: 'teacher', teacher_id: tid, teacher_name: tname, academic_year: academicYear });
                  window.open(`/timetable/print?${p}`, '_blank');
                }}
                className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                Print Teacher
              </button>
            </div>
          </div>
        </div>

        {/* ── Grid View ──────────────────────────────── */}
        {tab === 'grid' && (
          <>
            {!selectedClass ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-800">
                  <CalendarDays size={28} className="text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400">Select a class to view its timetable</h3>
                <p className="text-sm text-slate-400 mt-1">Choose a class from the dropdown above</p>
              </div>
            ) : periods.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-amber-50 dark:bg-amber-900/20">
                  <AlertCircle size={28} className="text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400">No periods defined yet</h3>
                <p className="text-sm text-slate-400 mt-1">Go to the Bell Schedule tab to create periods first</p>
                <button onClick={() => setTab('periods')}
                  className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  Set Up Bell Schedule
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Class badge */}
                {selectedClassObj && (
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      {selectedClassObj.grade?.replace(/\D/g, '') || selectedClassObj.section}
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{selectedClassObj.name}</span>
                    <span className="text-xs text-slate-400">{selectedClassObj.grade} – Section {selectedClassObj.section} · {academicYear}</span>
                    {conflicts.length > 0 && (
                      <span className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40">
                        <AlertTriangle size={11} /> {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {loading && <div className="ml-auto w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />}
                  </div>
                )}

                {/* Conflict warning banner */}
                {conflicts.length > 0 && (
                  <div className="mx-5 mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400">
                      <span className="font-semibold">{conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} detected.</span>{' '}
                      Highlighted cells have a teacher assigned to another class at the same period. Click the cell to reassign.
                    </p>
                  </div>
                )}

                {/* Scrollable grid */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                          Period
                        </th>
                        {DAYS.map(d => (
                          <th key={d.num} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                            <span className="hidden sm:inline">{d.label}</span>
                            <span className="sm:hidden">{d.short}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p, pi) => (
                        <tr key={p.id} className={pi % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}>
                          {/* Period info */}
                          <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 align-top">
                            {p.is_break ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                                <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">{p.name}</span>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{p.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{fmt(p.start_time)} – {fmt(p.end_time)}</div>
                              </div>
                            )}
                          </td>

                          {/* Day cells */}
                          {DAYS.map(d => {
                            const key        = `${p.id}_${d.num}`;
                            const entry      = entryMap[key];
                            const conflict   = conflictMap[key];
                            const color      = subjectColor(entry?.subject);
                            const isOver     = dragOver === key;
                            const isSrc      = dragSource?.periodId === p.id && dragSource?.dayNum === d.num;

                            if (p.is_break) {
                              return (
                                <td key={d.num} className="px-2 py-3 border-b border-slate-100 dark:border-slate-800 text-center">
                                  <div className="text-xs text-amber-500 font-medium opacity-60">—</div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={d.num}
                                className={[
                                  'px-2 py-2 border-b border-slate-100 dark:border-slate-800 transition-colors duration-100',
                                  isOver ? 'bg-indigo-50 dark:bg-indigo-900/20' : '',
                                ].join(' ')}
                                onDragOver={e => { e.preventDefault(); if (dragSource) setDragOver(key); }}
                                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                                onDrop={() => handleDrop(p.id, d.num)}
                              >
                                <button
                                  draggable={!!entry?.subject}
                                  onDragStart={() => entry?.subject && setDragSource({ periodId: p.id, dayNum: d.num, entry })}
                                  onDragEnd={() => { setDragSource(null); setDragOver(null); }}
                                  onClick={() => setSlotModal({ entry, periodId: p.id, dayNum: d.num, dayLabel: d.label, periodName: p.name, conflict })}
                                  className={[
                                    'w-full min-h-14 rounded-xl transition-all text-left p-2 border relative',
                                    isSrc ? 'opacity-40 scale-95' : 'hover:scale-[1.02] hover:shadow-md',
                                    entry?.subject ? 'cursor-grab active:cursor-grabbing' : '',
                                  ].join(' ')}
                                  style={conflict
                                    ? { background: '#fff1f2', borderColor: '#fca5a5', borderWidth: '2px' }
                                    : isOver && dragSource
                                      ? { background: '#eef2ff', borderColor: '#818cf8', borderWidth: '2px', borderStyle: 'dashed' }
                                      : color
                                        ? { background: color.bg, borderColor: color.border }
                                        : { background: 'transparent', borderColor: 'transparent' }
                                  }
                                >
                                  {conflict && (
                                    <span className="absolute top-1 right-1">
                                      <AlertTriangle size={10} className="text-red-400" />
                                    </span>
                                  )}
                                  {entry?.subject ? (
                                    <div>
                                      <div className="text-xs font-semibold leading-tight" style={{ color: conflict ? '#be123c' : color?.text }}>
                                        {entry.subject}
                                      </div>
                                      {entry.teacher_name && (
                                        <div className="text-xs mt-0.5 opacity-75 truncate" style={{ color: conflict ? '#be123c' : color?.text }}>
                                          {entry.teacher_name.split(' ').slice(0,2).join(' ')}
                                        </div>
                                      )}
                                      {entry.room && (
                                        <div className="text-xs mt-0.5 opacity-60" style={{ color: conflict ? '#be123c' : color?.text }}>
                                          {entry.room}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center group">
                                      <Plus size={14} className={[
                                        'transition-colors',
                                        isOver && dragSource ? 'text-indigo-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-400',
                                      ].join(' ')} />
                                    </div>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span>Click any cell to assign a subject &amp; teacher.</span>
                  <span className="text-indigo-400">{filledSlots} / {totalSlots} slots filled.</span>
                  {conflicts.length > 0 && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertTriangle size={11} /> {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} (red cells)
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Bell Schedule (Periods management) ────── */}
        {tab === 'periods' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Bell Schedule</h2>
                <p className="text-xs text-slate-400 mt-0.5">Define your school's daily period timings</p>
              </div>
              <button
                onClick={() => setPeriodModal({})}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Plus size={16} />
                <span className="hidden sm:inline">Add Period</span>
              </button>
            </div>

            {periods.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-800">
                  <Clock size={24} className="text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-600 dark:text-slate-400">No periods yet</h3>
                <p className="text-sm text-slate-400 mt-1">Click "Add Period" to create your school's bell schedule</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Start</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">End</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p, i) => {
                      // Duration in minutes
                      const [sh, sm] = (p.start_time || '00:00').split(':').map(Number);
                      const [eh, em] = (p.end_time   || '00:00').split(':').map(Number);
                      const mins = (eh * 60 + em) - (sh * 60 + sm);
                      return (
                        <tr key={p.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${i % 2 ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}>
                          <td className="px-5 py-3.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                              {p.period_no}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-xs">{fmt(p.start_time)}</td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-xs">{fmt(p.end_time)}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{mins > 0 ? `${mins} min` : '—'}</td>
                          <td className="px-5 py-3.5">
                            {p.is_break ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40">
                                Break
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/40">
                                Class
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setPeriodModal(p)}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDeletePeriod(p.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                <Trash2 size={14} />
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
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      {periodModal !== null && (
        <PeriodModal
          period={periodModal?.id ? periodModal : null}
          onClose={() => setPeriodModal(null)}
          onSaved={() => { setPeriodModal(null); reloadPeriods(); }}
        />
      )}

      {slotModal && (
        <SlotModal
          slot={slotModal.entry}
          classId={selectedClass}
          periodId={slotModal.periodId}
          dayNum={slotModal.dayNum}
          dayLabel={slotModal.dayLabel}
          periodName={slotModal.periodName}
          academicYear={academicYear}
          teachers={teachers}
          isConflicted={!!slotModal.conflict}
          conflictInfo={slotModal.conflict}
          onClose={() => setSlotModal(null)}
          onSaved={() => { setSlotModal(null); loadTimetable(); }}
        />
      )}
    </Layout>
  );
}
