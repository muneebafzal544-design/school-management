import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList, Plus, Pencil, Trash2, X, Search, RefreshCw,
  ChevronDown, CheckCircle2, XCircle, Clock3, AlertTriangle,
  BookOpen, Users, BarChart3, Award, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { useTheme } from '../context/ThemeContext';
import {
  getBoardExams, createBoardExam, updateBoardExam,
  deleteBoardExam, getBoardExamStats,
} from '../api/boardExams';
import { useClasses, useStudentsPicker } from '../hooks/useReferenceData';

// ── Pakistani constants ───────────────────────────────────────
const BISE_BOARDS = [
  'Federal Board (FBISE)',
  'BISE Lahore', 'BISE Gujranwala', 'BISE Faisalabad', 'BISE Multan',
  'BISE Rawalpindi', 'BISE Sargodha', 'BISE DG Khan', 'BISE Sahiwal', 'BISE Bahawalpur',
  'BISE Karachi', 'BISE Hyderabad', 'BISE Sukkur', 'BISE Larkana', 'BISE Mirpur Khas',
  'BISE Peshawar', 'BISE Abbottabad', 'BISE Swat', 'BISE Mardan',
  'BISE Quetta', 'BISE Mirpur (AJK)', 'Cambridge (O/A Level)', 'Other',
];

const EXAM_LEVELS = [
  { value: 'SSC-I',   label: 'SSC Part-I (9th)',    short: '9th'  },
  { value: 'SSC-II',  label: 'SSC Part-II (Matric)', short: 'Matric' },
  { value: 'HSSC-I',  label: 'HSSC Part-I (11th)',  short: '11th' },
  { value: 'HSSC-II', label: 'HSSC Part-II (FSc)',   short: 'FSc'  },
  { value: 'O-Level', label: 'O-Level (Cambridge)',  short: 'O-Lvl' },
  { value: 'A-Level', label: 'A-Level (Cambridge)',  short: 'A-Lvl' },
];

const EXAM_GROUPS = [
  'Pre-Medical (Biology)', 'Pre-Engineering (Mathematics)',
  'Computer Science', 'Arts / Humanities', 'Commerce',
  'General Science', 'Other',
];

const STATUS_CONFIG = {
  registered:      { label: 'Registered',      color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: ClipboardList },
  appeared:        { label: 'Appeared',         color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: BookOpen      },
  result_awaited:  { label: 'Result Awaited',   color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: Clock3        },
  passed:          { label: 'Passed',           color: '#15803d', bg: '#f0fdf4', border: '#86efac', icon: CheckCircle2  },
  failed:          { label: 'Failed',           color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: XCircle       },
  cancelled:       { label: 'Cancelled',        color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', icon: AlertTriangle },
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.registered;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });
}

// ── Registration Form Modal ───────────────────────────────────
function RegistrationModal({ reg, students, onClose, onSaved }) {
  const { isDark } = useTheme();
  const isEdit = !!reg;

  const blank = {
    student_id: '', academic_year: '', board_name: BISE_BOARDS[0],
    exam_level: 'SSC-II', exam_group: '', exam_year: currentYear,
    registration_no: '', board_roll_no: '', centre_no: '', centre_name: '',
    registration_date: '', fee_paid: false, fee_amount: '',
    status: 'registered', total_marks: '', obtained_marks: '', grade: '', remarks: '',
  };

  const [form, setForm]     = useState(isEdit ? { ...blank, ...reg } : blank);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filteredStudents = useMemo(() =>
    search
      ? students.filter(s => s.full_name.toLowerCase().includes(search.toLowerCase()) || s.roll_number?.includes(search))
      : students
  , [students, search]);

  const inp = `w-full px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition
    ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800'}`;
  const lbl = `block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id) return toast.error('Select a student');
    setSaving(true);
    try {
      const payload = {
        ...form,
        fee_amount:     form.fee_amount     ? Number(form.fee_amount)     : null,
        total_marks:    form.total_marks    ? Number(form.total_marks)    : null,
        obtained_marks: form.obtained_marks ? Number(form.obtained_marks) : null,
        exam_year:      Number(form.exam_year),
        registration_date: form.registration_date || null,
      };
      if (isEdit) await updateBoardExam(reg.id, payload);
      else        await createBoardExam(payload);
      toast.success(isEdit ? 'Registration updated' : 'Registration added');
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`rounded-2xl shadow-2xl w-full max-w-2xl border flex flex-col max-h-[92vh]
        ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0
          ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {isEdit ? 'Edit Registration' : 'New Board Exam Registration'}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Student picker */}
          <div>
            <label className={lbl}>Student *</label>
            {!isEdit ? (
              <>
                <input
                  className={inp} placeholder="Search student by name or roll no..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                <div className={`mt-1.5 max-h-36 overflow-y-auto rounded-xl border text-sm
                  ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                  {filteredStudents.slice(0, 30).map(s => (
                    <button
                      key={s.id} type="button"
                      onClick={() => { set('student_id', s.id); setSearch(s.full_name); }}
                      className={`w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors
                        ${form.student_id === s.id ? 'bg-indigo-50 dark:bg-indigo-900/20 font-semibold text-indigo-700 dark:text-indigo-300' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}
                    >
                      {s.full_name}
                      {s.roll_number && <span className="ml-1.5 text-slate-400 text-xs">({s.roll_number})</span>}
                      {s.class_name && <span className="ml-1.5 text-slate-400 text-xs">· {s.class_name}</span>}
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="px-3 py-2 text-slate-400 text-xs">No students found</p>
                  )}
                </div>
              </>
            ) : (
              <input className={inp} readOnly value={reg.student_name} />
            )}
          </div>

          {/* Exam details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Board / Authority *</label>
              <select className={inp} value={form.board_name} onChange={e => set('board_name', e.target.value)} required>
                {BISE_BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Exam Level *</label>
              <select className={inp} value={form.exam_level} onChange={e => set('exam_level', e.target.value)} required>
                {EXAM_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Exam Group / Subject</label>
              <select className={inp} value={form.exam_group} onChange={e => set('exam_group', e.target.value)}>
                <option value="">— Select group —</option>
                {EXAM_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Exam Year *</label>
              <select className={inp} value={form.exam_year} onChange={e => set('exam_year', e.target.value)} required>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Academic Year</label>
              <input className={inp} value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="e.g. 2024-25" />
            </div>
            <div>
              <label className={lbl}>Registration Date</label>
              <input type="date" className={inp} value={form.registration_date} onChange={e => set('registration_date', e.target.value)} />
            </div>
          </div>

          {/* Registration numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>School Registration No.</label>
              <input className={inp} value={form.registration_no} onChange={e => set('registration_no', e.target.value)} placeholder="School-assigned reg. no." />
            </div>
            <div>
              <label className={lbl}>Board Roll Number</label>
              <input className={inp} value={form.board_roll_no} onChange={e => set('board_roll_no', e.target.value)} placeholder="Assigned by board" />
            </div>
            <div>
              <label className={lbl}>Centre Number</label>
              <input className={inp} value={form.centre_no} onChange={e => set('centre_no', e.target.value)} placeholder="Exam centre code" />
            </div>
            <div>
              <label className={lbl}>Centre Name</label>
              <input className={inp} value={form.centre_name} onChange={e => set('centre_name', e.target.value)} placeholder="Exam centre name" />
            </div>
          </div>

          {/* Fee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Exam Fee (PKR)</label>
              <input type="number" min="0" className={inp} value={form.fee_amount} onChange={e => set('fee_amount', e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.fee_paid}
                  onChange={e => set('fee_paid', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                />
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Fee Paid</span>
              </label>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <button
                  key={val} type="button"
                  onClick={() => set('status', val)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all"
                  style={form.status === val
                    ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color }
                    : { borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  <cfg.icon size={12} /> {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result (shown when status is passed/failed/result_awaited) */}
          {['passed', 'failed', 'result_awaited'].includes(form.status) && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Total Marks</label>
                <input type="number" min="0" className={inp} value={form.total_marks} onChange={e => set('total_marks', e.target.value)} placeholder="1100" />
              </div>
              <div>
                <label className={lbl}>Marks Obtained</label>
                <input type="number" min="0" className={inp} value={form.obtained_marks} onChange={e => set('obtained_marks', e.target.value)} placeholder="950" />
              </div>
              <div>
                <label className={lbl}>Grade / Division</label>
                <input className={inp} value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="A1 / 1st Div" />
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className={lbl}>Remarks</label>
            <textarea rows={2} className={inp} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any additional notes..." />
          </div>
        </form>

        <div className={`px-6 py-4 border-t flex justify-end gap-3 shrink-0
          ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors
            ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            {saving ? 'Saving…' : isEdit ? 'Update Registration' : 'Add Registration'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BoardExamsPage() {
  const { isDark } = useTheme();
  const [regs,      setRegs]      = useState([]);
  const { data: students = [] } = useStudentsPicker();
  const { data: classes = [] }  = useClasses();
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterYear,    setFilterYear]    = useState(String(currentYear));
  const [filterLevel,   setFilterLevel]   = useState('');
  const [filterBoard,   setFilterBoard]   = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);

  const card  = `rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`;
  const inp   = `px-3 py-2 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition
    ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800'}`;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterYear)   params.exam_year  = filterYear;
      if (filterLevel)  params.exam_level = filterLevel;
      if (filterBoard)  params.board_name = filterBoard;
      if (filterStatus) params.status     = filterStatus;
      if (search)       params.search     = search;

      const [regsRes, statsRes] = await Promise.all([
        getBoardExams(params),
        getBoardExamStats(filterYear ? { exam_year: filterYear } : {}),
      ]);
      setRegs(regsRes.data?.data ?? regsRes.data ?? []);
      setStats(statsRes.data?.data ?? statsRes.data ?? null);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [filterYear, filterLevel, filterBoard, filterStatus, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async (id) => {
    try {
      await deleteBoardExam(id);
      toast.success('Registration deleted');
      setDeleting(null);
      loadAll();
    } catch { toast.error('Failed to delete'); }
  };

  const totals = stats?.totals || {};

  return (
    <Layout>
      <div className={`min-h-screen p-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Board Exam Registrations
            </h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Track BISE / Board exam registrations, roll numbers & results
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Plus size={15} /> Add Registration
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total',          value: totals.total          || 0, color: '#6366f1' },
              { label: 'Registered',     value: totals.registered     || 0, color: '#0891b2' },
              { label: 'Appeared',       value: totals.appeared       || 0, color: '#d97706' },
              { label: 'Result Awaited', value: totals.result_awaited || 0, color: '#f59e0b' },
              { label: 'Passed',         value: totals.passed         || 0, color: '#15803d' },
              { label: 'Failed',         value: totals.failed         || 0, color: '#dc2626' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${card} p-4 text-center`}>
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
                <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* By-level breakdown */}
        {stats?.byLevel?.length > 0 && (
          <div className={`${card} p-4 mb-6`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              By Exam Level
            </p>
            <div className="flex flex-wrap gap-3">
              {stats.byLevel.map(row => (
                <div key={row.exam_level} className={`flex items-center gap-3 px-4 py-2 rounded-xl border
                  ${isDark ? 'border-slate-700 bg-slate-700/50' : 'border-slate-200 bg-slate-50'}`}>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {EXAM_LEVELS.find(l => l.value === row.exam_level)?.short || row.exam_level}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{row.count} students</span>
                  {row.passed > 0 && <span className="text-xs font-semibold text-emerald-600">{row.passed} passed</span>}
                  {row.failed > 0 && <span className="text-xs font-semibold text-red-500">{row.failed} failed</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`${card} p-4 mb-4`}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              <input
                className={`${inp} pl-8`} placeholder="Search student or roll no..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <select className={inp} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="relative">
              <select className={inp} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                <option value="">All Levels</option>
                {EXAM_LEVELS.map(l => <option key={l.value} value={l.value}>{l.short}</option>)}
              </select>
            </div>
            <div className="relative">
              <select className={inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: '130px' }}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <button onClick={loadAll}
              className={`p-2.5 rounded-xl border transition-colors
                ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={`${card} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : regs.length === 0 ? (
            <div className="py-20 text-center">
              <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4
                ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <ClipboardList size={28} className={isDark ? 'text-slate-400' : 'text-slate-400'} />
              </div>
              <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No registrations found</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Add a registration to start tracking board exams
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b text-left ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/80'}`}>
                    {['Student', 'Board', 'Level / Group', 'Year', 'Reg. No.', 'Roll No.', 'Centre', 'Fee', 'Result', 'Status', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide
                        ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r, i) => (
                    <tr key={r.id}
                      className={`border-b transition-colors
                        ${isDark ? 'border-slate-800 hover:bg-slate-800/40' : 'border-slate-100 hover:bg-slate-50/60'}
                        ${i % 2 ? (isDark ? 'bg-slate-800/20' : 'bg-slate-50/30') : ''}`}>
                      <td className="px-4 py-3">
                        <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{r.student_name}</p>
                        {r.father_name && <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{r.father_name}</p>}
                        {r.class_name && <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{r.class_name}</p>}
                      </td>
                      <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {r.board_name}
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {EXAM_LEVELS.find(l => l.value === r.exam_level)?.short || r.exam_level}
                        </p>
                        {r.exam_group && <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{r.exam_group}</p>}
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{r.exam_year}</td>
                      <td className={`px-4 py-3 text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {r.registration_no || '—'}
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono font-bold ${r.board_roll_no ? 'text-indigo-500' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                        {r.board_roll_no || '—'}
                      </td>
                      <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {r.centre_no ? <><span className="font-bold">{r.centre_no}</span>{r.centre_name ? <br /> : ''}</> : null}
                        {r.centre_name || (r.centre_no ? '' : '—')}
                      </td>
                      <td className="px-4 py-3">
                        {r.fee_amount
                          ? <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Rs. {fmt(r.fee_amount)}</p>
                          : <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>}
                        {r.fee_amount && (
                          <span className={`text-[10px] font-semibold ${r.fee_paid ? 'text-emerald-500' : 'text-red-400'}`}>
                            {r.fee_paid ? '✓ Paid' : '✗ Unpaid'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.obtained_marks && r.total_marks
                          ? <div>
                              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {r.obtained_marks}/{r.total_marks}
                              </p>
                              <p className="text-xs">
                                {Math.round(r.obtained_marks / r.total_marks * 100)}%
                                {r.grade && <span className="ml-1 font-bold text-indigo-500">{r.grade}</span>}
                              </p>
                            </div>
                          : <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditing(r); setShowModal(true); }}
                            className={`p-1.5 rounded-lg transition-colors
                              ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-indigo-400' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}>
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting(r.id)}
                            className={`p-1.5 rounded-lg transition-colors
                              ${isDark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {regs.length > 0 && (
            <div className={`px-4 py-3 border-t text-xs ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-400'}`}>
              {regs.length} registration{regs.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>

      {/* Registration modal */}
      {showModal && (
        <RegistrationModal
          reg={editing}
          students={students}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); loadAll(); }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm p-6 border
            ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4
              ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className={`text-base font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Delete Registration?
            </h3>
            <p className={`text-sm text-center mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors
                  ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleting)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
