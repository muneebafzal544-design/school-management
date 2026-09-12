import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  BookOpen, ChevronDown, Save, Loader2, CheckCircle2,
  BarChart2, Lock, Unlock, AlertCircle, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getExams, getExamSubjects, getMarks, submitMarks, publishResults, calculateResults } from '../api/exams';
import { getStudents } from '../api/students';
import { useClasses } from '../hooks/useReferenceData';

// ── Grade calculation ──────────────────────────────────────────
function calcGrade(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function gradeColor(pct) {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

// ── Cell background based on %  ───────────────────────────────
function cellBg(val, total) {
  if (val === '' || val === null || val === undefined) return '';
  const n = parseFloat(val);
  if (isNaN(n) || total <= 0) return '';
  const pct = (n / total) * 100;
  if (pct < 40) return 'bg-red-50 dark:bg-red-900/20';
  if (pct < 60) return 'bg-amber-50 dark:bg-amber-900/20';
  return 'bg-emerald-50 dark:bg-emerald-900/20';
}

// ── Totals per student ──────────────────────────────────────
function calcRow(studentId, subjects, marks) {
  let totalMax = 0, totalObtained = 0;
  subjects.forEach(sub => {
    const m = marks[studentId]?.[sub.subject_id];
    totalMax += Number(sub.total_marks || 0);
    if (m && !m.absent) {
      const v = parseFloat(m.val);
      if (!isNaN(v)) totalObtained += v;
    }
  });
  const pct   = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const grade = calcGrade(pct);
  return { totalMax, totalObtained, pct, grade };
}

// ── Select wrapper ────────────────────────────────────────────
function Sel({ value, onChange, children, placeholder }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function GradebookPage() {
  const [exams,         setExams]         = useState([]);
  const { data: classes = [] }            = useClasses();
  const [examId,        setExamId]        = useState('');
  const [classId,       setClassId]       = useState('');
  const [subjects,      setSubjects]      = useState([]);   // [{subject_id, subject_name, total_marks, passing_marks}]
  const [students,      setStudents]      = useState([]);   // [{id, full_name, roll_number}]
  const [marks,         setMarks]         = useState({});   // marks[studentId][subjectId] = { val, absent }
  const [published,     setPublished]     = useState(false);
  const [loadingGrid,   setLoadingGrid]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [publishing,    setPublishing]    = useState(false);
  const [calculating,   setCalculating]   = useState(false);
  const [loading,       setLoading]       = useState(true);

  const inputRefs = useRef({});  // key: `${studentIdx}-${subjectIdx}`

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    getExams({ status: 'scheduled,ongoing,completed', limit: 100 }).catch(() => ({ data: [] }))
      .then(exRes => {
        const exArr = exRes.data?.data ?? exRes.data;
        setExams(Array.isArray(exArr) ? exArr : []);
      }).finally(() => setLoading(false));
  }, []);

  // ── Load grid when exam + class selected ───────────────────
  const loadGrid = useCallback(async () => {
    if (!examId || !classId) return;
    setLoadingGrid(true);
    setSubjects([]);
    setStudents([]);
    setMarks({});
    try {
      const [subRes, stuRes, mrkRes] = await Promise.all([
        getExamSubjects(examId, { class_id: classId }),
        getStudents({ class_id: classId, status: 'active', limit: 200 }),
        getMarks(examId, { class_id: classId }),
      ]);

      const subArr = subRes.data?.data ?? subRes.data ?? [];
      const stuArr = stuRes.data?.data ?? stuRes.data ?? [];
      const mrkArr = mrkRes.data?.data ?? mrkRes.data ?? [];

      setSubjects(Array.isArray(subArr) ? subArr : []);

      const stuList = Array.isArray(stuArr) ? stuArr : [];
      setStudents(stuList);

      // Check if results published
      const isPublished = Array.isArray(mrkArr) && mrkArr.some(m => m.is_published);
      setPublished(isPublished);

      // Build marks map
      const map = {};
      stuList.forEach(s => { map[s.id] = {}; });
      if (Array.isArray(mrkArr)) {
        mrkArr.forEach(m => {
          if (!map[m.student_id]) map[m.student_id] = {};
          map[m.student_id][m.subject_id] = {
            val:    m.obtained_marks ?? '',
            absent: m.is_absent ?? false,
          };
        });
      }
      setMarks(map);
    } catch (err) {
      toast.error('Failed to load gradebook data');
    }
    setLoadingGrid(false);
  }, [examId, classId]);

  useEffect(() => { loadGrid(); }, [loadGrid]);

  // ── Cell update ────────────────────────────────────────────
  const setCell = (studentId, subjectId, field, value) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: { ...(prev[studentId]?.[subjectId] || {}), [field]: value },
      },
    }));
  };

  // ── Keyboard navigation: Tab/Enter moves to next cell ──────
  const handleKeyDown = (e, sIdx, subIdx) => {
    if (e.key !== 'Tab' && e.key !== 'Enter') return;
    e.preventDefault();
    let nextSub = subIdx + 1;
    let nextS   = sIdx;
    if (nextSub >= subjects.length) { nextSub = 0; nextS = sIdx + 1; }
    if (nextS < students.length) {
      inputRefs.current[`${nextS}-${nextSub}`]?.focus();
    }
  };

  // ── Save marks ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!examId || !classId || published) return;
    setSaving(true);
    try {
      const records = [];
      students.forEach(s => {
        subjects.forEach(sub => {
          const m  = marks[s.id]?.[sub.subject_id];
          const absent = m?.absent || false;
          const val    = parseFloat(m?.val);
          if (!absent && isNaN(val) && m?.val !== 0) return; // skip untouched empty cells
          if (!absent && !isNaN(val) && val > Number(sub.total_marks)) {
            toast.error(`${s.full_name}: ${sub.subject_name} exceeds max (${sub.total_marks})`);
            setSaving(false);
            return;
          }
          records.push({
            student_id:     s.id,
            subject_id:     sub.subject_id,
            class_id:       classId,
            obtained_marks: absent ? 0 : (isNaN(val) ? 0 : val),
            is_absent:      absent,
          });
        });
      });
      if (records.length === 0) { toast.error('No marks to save'); setSaving(false); return; }
      await submitMarks(examId, records);
      toast.success('Marks saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  // ── Calculate + publish ────────────────────────────────────
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await calculateResults(examId);
      toast.success('Results calculated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Calculate failed');
    }
    setCalculating(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishResults(examId);
      setPublished(true);
      toast.success('Results published to students & parents');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Publish failed');
    }
    setPublishing(false);
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  const hasGrid = subjects.length > 0 && students.length > 0;

  return (
    <Layout>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-16"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 60% 40%, #818cf8 0%, transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={14} className="text-indigo-300" />
            <span className="text-indigo-300 text-xs font-semibold uppercase tracking-widest">Marks Entry</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Gradebook</h1>
          <p className="text-indigo-200 text-sm mt-0.5">Spreadsheet-style · Tab to navigate · Auto grade</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-6 pb-12 max-w-full">

        {/* ── Filters bar ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-44">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Exam</label>
            <Sel value={examId} onChange={setExamId} placeholder="Select exam…">
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.exam_name || ex.title}</option>)}
            </Sel>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Class</label>
            <Sel value={classId} onChange={setClassId} placeholder="Select class…">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          </div>

          {hasGrid && !published && (
            <div className="flex gap-2 mt-auto">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
              <button onClick={handleCalculate} disabled={calculating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition">
                {calculating ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
                Calculate
              </button>
              <button onClick={handlePublish} disabled={publishing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition">
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                Publish
              </button>
            </div>
          )}

          {published && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mt-auto">
              <Lock size={14} /> Published — read only
            </div>
          )}
        </div>

        {/* ── Grid ── */}
        {!examId || !classId ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center py-20 gap-3">
            <BookOpen size={40} className="text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500 font-semibold">Select an exam and class to open the gradebook</p>
          </div>
        ) : loadingGrid ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-20 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
        ) : !hasGrid ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={40} className="text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500 font-semibold">
              {subjects.length === 0 ? 'No subjects configured for this exam + class' : 'No active students found'}
            </p>
            {subjects.length === 0 && (
              <p className="text-xs text-slate-400">Go to Exams → configure subjects for this class first</p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: subjects.length * 130 + 280 }}>
                <thead>
                  {/* ── Header row 1: subject names ── */}
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap min-w-48">
                      Student
                    </th>
                    {subjects.map(sub => (
                      <th key={sub.subject_id} className="px-3 py-3 text-center min-w-28">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-24 mx-auto">{sub.subject_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">/{sub.total_marks}</p>
                        <p className="text-[9px] text-slate-300 dark:text-slate-600">pass {sub.passing_marks}</p>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap min-w-28 bg-slate-50 dark:bg-slate-800">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-20 bg-slate-50 dark:bg-slate-800">
                      %
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-16 bg-slate-50 dark:bg-slate-800">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {students.map((stu, sIdx) => {
                    const row = calcRow(stu.id, subjects, marks);
                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                        {/* Student name */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-4 py-2 whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 w-7 shrink-0 tabular-nums">
                              {stu.roll_number || sIdx + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-36">
                              {stu.full_name}
                            </span>
                          </div>
                        </td>

                        {/* Subject cells */}
                        {subjects.map((sub, subIdx) => {
                          const cell = marks[stu.id]?.[sub.subject_id] || {};
                          const valNum = parseFloat(cell.val);
                          const bg = cell.absent ? 'bg-slate-100 dark:bg-slate-800' : cellBg(cell.val, sub.total_marks);
                          const exceeds = !cell.absent && !isNaN(valNum) && valNum > Number(sub.total_marks);

                          return (
                            <td key={sub.subject_id} className={`px-2 py-1.5 text-center ${bg} ${exceeds ? 'ring-1 ring-red-400 rounded' : ''}`}>
                              {cell.absent ? (
                                <button
                                  onClick={() => !published && setCell(stu.id, sub.subject_id, 'absent', false)}
                                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 transition"
                                  title="Click to un-mark absent"
                                  disabled={published}
                                >
                                  AB
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 min-w-20">
                                  <input
                                    ref={el => { inputRefs.current[`${sIdx}-${subIdx}`] = el; }}
                                    type="number"
                                    min={0}
                                    max={sub.total_marks}
                                    step={0.5}
                                    value={cell.val ?? ''}
                                    onChange={e => !published && setCell(stu.id, sub.subject_id, 'val', e.target.value)}
                                    onKeyDown={e => handleKeyDown(e, sIdx, subIdx)}
                                    disabled={published}
                                    className={[
                                      'w-full text-center text-sm font-semibold rounded-lg py-1.5 px-1',
                                      'border border-transparent focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300',
                                      'bg-transparent outline-none transition',
                                      exceeds ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200',
                                      published ? 'cursor-default' : '',
                                    ].join(' ')}
                                  />
                                  {!published && (
                                    <button
                                      onClick={() => setCell(stu.id, sub.subject_id, 'absent', true)}
                                      className="shrink-0 text-[9px] font-bold text-slate-300 hover:text-red-400 transition leading-none"
                                      title="Mark absent"
                                    >
                                      AB
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                            {row.totalObtained.toFixed(0)}
                          </span>
                          <span className="text-xs text-slate-400">/{row.totalMax}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-sm font-bold tabular-nums" style={{ color: gradeColor(row.pct) }}>
                              {row.pct.toFixed(1)}%
                            </span>
                            <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(row.pct, 100)}%`, background: gradeColor(row.pct) }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black text-white"
                            style={{ background: gradeColor(row.pct) }}>
                            {row.grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ── Footer: class averages ── */}
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Class Avg
                    </td>
                    {subjects.map(sub => {
                      const vals = students
                        .map(s => marks[s.id]?.[sub.subject_id])
                        .filter(m => m && !m.absent && m.val !== '' && !isNaN(parseFloat(m.val)))
                        .map(m => parseFloat(m.val));
                      const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
                      return (
                        <td key={sub.subject_id} className="px-3 py-3 text-center">
                          {avg !== null ? (
                            <span className="text-xs font-bold tabular-nums" style={{ color: gradeColor((avg / sub.total_marks) * 100) }}>
                              {avg.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Color legend */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Legend:</span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30 inline-block" /> Below 40%
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 inline-block" /> 40–60%
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 inline-block" /> Above 60%
              </span>
              <span className="ml-auto text-[10px] text-slate-400">Tab / Enter → next cell</span>
            </div>
          </div>
        )}
        {/* ── Analytics summary ── */}
        {hasGrid && (() => {
          const gradeCount = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
          let totalPct = 0, passCount = 0;
          students.forEach(stu => {
            const row = calcRow(stu.id, subjects, marks);
            if (row.totalMax > 0) {
              gradeCount[row.grade] = (gradeCount[row.grade] || 0) + 1;
              totalPct += row.pct;
              if (row.pct >= 50) passCount++;
            }
          });
          const classAvg = students.length > 0 ? totalPct / students.length : 0;
          const gradeData = Object.entries(gradeCount).map(([g, c]) => ({ grade: g, count: c }));
          const passRate = students.length > 0 ? Math.round((passCount / students.length) * 100) : 0;
          return (
            <div className="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Class Analytics</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{classAvg.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Class Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{passRate}%</p>
                  <p className="text-xs text-slate-400 mt-0.5">Pass Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{students.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Total Students</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={gradeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Students']} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>
    </Layout>
  );
}
