import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList, Plus, Pencil, Trash2, ChevronDown, Search,
  BookOpen, BarChart3, Trophy, FileText, Check, X, Calculator,
  Calendar, AlertCircle, CheckCircle2, Clock, TrendingUp, Printer,
  FileEdit, ChevronUp, Loader2, GripVertical, Copy,
  AlertTriangle, Link2, CheckCircle, Lock, Unlock, Info, CalendarDays, Save,
  FileDown,
} from 'lucide-react';
import {
  getPapers, createPaper, updatePaper, deletePaper,
  updateSection, addQuestion, updateQuestion, deleteQuestion,
  getTeacherUsers,
} from '../api/papers';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import Modal    from '../components/ui/Modal';
import Button   from '../components/ui/Button';
import Input    from '../components/ui/Input';
import Spinner    from '../components/ui/Spinner';
import DatePicker from '../components/ui/DatePicker';
import {
  getExams, createExam, updateExam, deleteExam, updateExamStatus,
  publishResults, unpublishResults,
  getExamSubjects, addExamSubjects,
  getMarks, submitMarks,
  calculateResults, getResults, getStudentReportCard, getClassRanking,
  getDateSheet, updateDateSheet,
  downloadStudentReportCardPDF, downloadClassReportCardsPDF,
} from '../api/exams';

import { getStudents } from '../api/students';
import { getClassSubjects } from '../api/subjects';
import { useAuth }     from '../context/AuthContext';
import { useClasses, useSubjects } from '../hooks/useReferenceData';

// ─────────────────────────────────────────────────────────────
//  Constants & helpers
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'exams',     label: 'Exams',        icon: ClipboardList },
  { id: 'config',    label: 'Marks Config', icon: BookOpen },
  { id: 'marks',     label: 'Enter Marks',  icon: Pencil },
  { id: 'results',   label: 'Results',      icon: BarChart3 },
  { id: 'datesheet', label: 'Date Sheet',   icon: CalendarDays },
  { id: 'papers',    label: 'Paper Creator',icon: FileEdit },
];

const EXAM_TYPES = ['midterm', 'final', 'quiz', 'monthly_test', 'other'];

const STATUS_META = {
  scheduled: { label: 'Scheduled', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40', icon: Clock },
  ongoing:   { label: 'Ongoing',   cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',   icon: AlertCircle },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40', icon: CheckCircle2 },
};

const GRADE_META = {
  'A1': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'A':  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'B':  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'C':  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'D':  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'F':  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.scheduled;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${m.cls}`}>
      <Icon size={10} />
      {m.label}
    </span>
  );
}

function GradeBadge({ grade }) {
  const cls = GRADE_META[grade] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${cls}`}>
      {grade}
    </span>
  );
}

function EmptyBox({ icon: Icon = ClipboardList, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600 gap-3">
      <Icon size={36} strokeWidth={1.3} />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

function ClassSelect({ value, onChange, classes, label = 'Select Class', className = '' }) {
  return (
    <div className={`max-w-xs ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                     px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">— Choose a class —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.grade} {c.section})</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function ExamSelect({ value, onChange, exams, label = 'Select Exam', className = '' }) {
  return (
    <div className={`max-w-xs ${className}`}>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                     bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                     px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">— Choose an exam —</option>
          {exams.map(e => (
            <option key={e.id} value={e.id}>{e.exam_name} ({e.academic_year})</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ExamsPage root
// ─────────────────────────────────────────────────────────────
export default function ExamsPage() {
  const [tab, setTab] = useState('exams');

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={ClipboardList}
          title="Exam Management"
          subtitle="Create exams, configure marks, enter results, and generate report cards"
        />

        {/* Tabs */}
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {/* Tab panels */}
        {tab === 'exams'   && <ExamsTab />}
        {tab === 'config'  && <MarksConfigTab />}
        {tab === 'marks'   && <EnterMarksTab />}
        {tab === 'results'   && <ResultsTab />}
        {tab === 'datesheet' && <DateSheetTab />}
        {tab === 'papers'    && <PaperCreatorTab />}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 1 — Exams CRUD
// ─────────────────────────────────────────────────────────────
function ExamsTab() {
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getExams();
      setExams(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? All marks and results for this exam will also be deleted.`)) return;
    try {
      await deleteExam(id);
      toast.success('Exam deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateExamStatus(id, status);
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const filtered = exams.filter(e =>
    e.exam_name.toLowerCase().includes(search.toLowerCase()) ||
    e.academic_year.includes(search)
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exams…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-56"
          />
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
          <Plus size={14} /> New Exam
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyBox icon={ClipboardList} message="No exams found. Create your first exam." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={() => { setEditing(exam); setModalOpen(true); }}
              onDelete={() => handleDelete(exam.id, exam.exam_name)}
              onStatusChange={(s) => handleStatusChange(exam.id, s)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <ExamFormModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </>
  );
}

function ExamCard({ exam, onEdit, onDelete, onStatusChange }) {
  const typeLabel = exam.exam_type.replace('_', ' ');
  const nextStatus = { scheduled: 'ongoing', ongoing: 'completed', completed: 'scheduled' };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
                    p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{exam.exam_name}</p>
            {exam.results_published_at && (
              <span title="Results published — marks locked" className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                <Lock size={8} /> Published
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{typeLabel} · {exam.academic_year}</p>
        </div>
        <StatusBadge status={exam.status} />
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Calendar size={12} />
        <span>{new Date(exam.start_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
        {exam.start_date !== exam.end_date && (
          <>
            <span>→</span>
            <span>{new Date(exam.end_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
        {/* Status cycle button */}
        <button
          onClick={() => onStatusChange(nextStatus[exam.status])}
          className="flex-1 text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700
                     text-slate-500 dark:text-slate-400 hover:border-orange-300 hover:text-orange-600
                     dark:hover:text-orange-400 transition-colors font-medium capitalize"
        >
          → {nextStatus[exam.status]}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                     dark:hover:bg-indigo-900/20 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                     dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ExamFormModal({ initial, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    exam_name: '', exam_type: 'midterm', academic_year: '2024-25',
    start_date: today, end_date: today, status: 'scheduled',
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.exam_name.trim()) { toast.error('Exam name is required'); return; }
    if (form.end_date < form.start_date) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    try {
      if (initial?.id) {
        await updateExam(initial.id, form);
        toast.success('Exam updated');
      } else {
        await createExam(form);
        toast.success('Exam created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial?.id ? 'Edit Exam' : 'New Exam'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Exam Name *"
          value={form.exam_name}
          onChange={e => set('exam_name', e.target.value)}
          placeholder="e.g. Midterm Exam 2025"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Exam Type</label>
            <div className="relative">
              <select
                value={form.exam_type}
                onChange={e => set('exam_type', e.target.value)}
                className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {EXAM_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <Input
            label="Academic Year"
            value={form.academic_year}
            onChange={e => set('academic_year', e.target.value)}
            placeholder="2024-25"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date *" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          <Input label="End Date *"   type="date" value={form.end_date}   onChange={e => set('end_date',   e.target.value)} />
        </div>

        {initial?.id && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
            <div className="relative">
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                           px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
            <Check size={14} /> {initial?.id ? 'Save Changes' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 2 — Marks Config (total & passing marks per subject)
// ─────────────────────────────────────────────────────────────
function MarksConfigTab() {
  const [exams,     setExams]     = useState([]);
  const { data: classes = [] }    = useClasses();
  const [selExam,   setSelExam]   = useState('');
  const [selClass,  setSelClass]  = useState('');
  const [subjects,  setSubjects]  = useState([]);   // class subjects
  const [config,    setConfig]    = useState({});   // { subjectId: { total_marks, passing_marks } }
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    getExams()
      .then(e => setExams(Array.isArray(e.data) ? e.data : []))
      .catch(() => {});
  }, []);

  // When exam+class selected, load class subjects and any existing config
  useEffect(() => {
    if (!selExam || !selClass) { setSubjects([]); setConfig({}); return; }
    setLoading(true);
    Promise.all([
      getClassSubjects(selClass),
      getExamSubjects(selExam, { class_id: selClass }),
    ])
      .then(([cs, es]) => {
        const classSubjects = Array.isArray(cs.data) ? cs.data : [];
        const examSubjects  = Array.isArray(es.data) ? es.data : [];

        setSubjects(classSubjects);

        // Pre-fill config from existing exam_subjects
        const cfg = {};
        classSubjects.forEach(cs => {
          const existing = examSubjects.find(es => es.subject_id === cs.subject_id);
          cfg[cs.subject_id] = {
            total_marks:   existing ? existing.total_marks   : '',
            passing_marks: existing ? existing.passing_marks : '',
          };
        });
        setConfig(cfg);
      })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, [selExam, selClass]);

  const setMark = (subjectId, field, val) =>
    setConfig(c => ({ ...c, [subjectId]: { ...c[subjectId], [field]: val } }));

  const handleSave = async () => {
    const items = subjects.map(s => ({
      class_id:      Number(selClass),
      subject_id:    s.subject_id,
      total_marks:   parseFloat(config[s.subject_id]?.total_marks),
      passing_marks: parseFloat(config[s.subject_id]?.passing_marks),
    }));

    // Validate
    for (const it of items) {
      if (!it.total_marks || !it.passing_marks) {
        toast.error('Please fill in all total and passing marks'); return;
      }
      if (it.passing_marks > it.total_marks) {
        toast.error('Passing marks cannot exceed total marks'); return;
      }
    }

    setSaving(true);
    try {
      await addExamSubjects(selExam, items);
      toast.success('Marks configuration saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <ExamSelect  value={selExam}  onChange={setSelExam}  exams={exams}   label="Select Exam" />
        <ClassSelect value={selClass} onChange={setSelClass} classes={classes} label="Select Class" />
      </div>

      {(!selExam || !selClass) ? (
        <EmptyBox icon={BookOpen} message="Select an exam and class to configure subject marks." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : subjects.length === 0 ? (
        <EmptyBox icon={BookOpen} message="No subjects assigned to this class. Go to Subjects → Assign to Classes first." />
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Configure marks per subject for this exam
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Total Marks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Passing Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {subjects.map(s => (
                  <tr key={s.subject_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      {s.subject_name}
                      {s.subject_code && <span className="ml-2 text-xs text-slate-400">({s.subject_code})</span>}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="1" max="1000"
                        value={config[s.subject_id]?.total_marks || ''}
                        onChange={e => setMark(s.subject_id, 'total_marks', e.target.value)}
                        placeholder="e.g. 100"
                        className="w-32 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                                   px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="1" max="1000"
                        value={config[s.subject_id]?.passing_marks || ''}
                        onChange={e => setMark(s.subject_id, 'passing_marks', e.target.value)}
                        placeholder="e.g. 40"
                        className="w-32 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                                   px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button loading={saving} onClick={handleSave}
              style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              <Check size={14} /> Save Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 3 — Enter Marks
// ─────────────────────────────────────────────────────────────
function EnterMarksTab() {
  const [exams,     setExams]     = useState([]);
  const { data: classes = [] }    = useClasses();
  const [selExam,   setSelExam]   = useState('');
  const [selClass,  setSelClass]  = useState('');
  const [subjects,  setSubjects]  = useState([]);
  const [students,  setStudents]  = useState([]);
  // marks[studentId][subjectId] = { val: '', absent: false, remarks: '' }
  const [marks,     setMarks]     = useState({});
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    getExams()
      .then(e => setExams(Array.isArray(e.data) ? e.data : []))
      .catch(() => {});
  }, []);

  const selectedExamObj = exams.find(e => String(e.id) === String(selExam));
  const isLocked = !!selectedExamObj?.results_published_at;

  useEffect(() => {
    if (!selExam || !selClass) { setSubjects([]); setStudents([]); setMarks({}); return; }
    setLoading(true);
    Promise.all([
      getExamSubjects(selExam, { class_id: selClass }),
      getStudents({ class_id: selClass }),
      getMarks(selExam, { class_id: selClass }),
    ])
      .then(([es, st, mk]) => {
        const examSubs = Array.isArray(es.data) ? es.data : [];
        const studs    = Array.isArray(st.data) ? st.data : [];
        const existing = Array.isArray(mk.data) ? mk.data : [];

        setSubjects(examSubs);
        setStudents(studs);

        const grid = {};
        studs.forEach(s => {
          grid[s.id] = {};
          examSubs.forEach(sub => {
            const found = existing.find(m => m.student_id === s.id && m.subject_id === sub.subject_id);
            grid[s.id][sub.subject_id] = {
              val:     found && !found.is_absent ? String(found.obtained_marks) : '',
              absent:  found?.is_absent ?? false,
              remarks: found?.remarks ?? '',
            };
          });
        });
        setMarks(grid);
      })
      .catch(() => toast.error('Failed to load marks data'))
      .finally(() => setLoading(false));
  }, [selExam, selClass]);

  const patchCell = (studentId, subjectId, patch) =>
    setMarks(m => ({
      ...m,
      [studentId]: {
        ...m[studentId],
        [subjectId]: { ...m[studentId]?.[subjectId], ...patch },
      },
    }));

  const toggleAbsent = (studentId, subjectId) => {
    const cell = marks[studentId]?.[subjectId] ?? { val: '', absent: false, remarks: '' };
    patchCell(studentId, subjectId, { absent: !cell.absent, val: '' });
  };

  const handleSubmit = async () => {
    const marksArr = [];
    for (const student of students) {
      for (const sub of subjects) {
        const cell = marks[student.id]?.[sub.subject_id] ?? { val: '', absent: false, remarks: '' };
        if (cell.absent) {
          marksArr.push({
            student_id: student.id, subject_id: sub.subject_id,
            class_id: Number(selClass), obtained_marks: 0,
            is_absent: true, remarks: cell.remarks || null,
          });
          continue;
        }
        if (cell.val === '' || cell.val == null) continue;
        const num = parseFloat(cell.val);
        if (isNaN(num)) { toast.error(`Invalid marks for ${student.full_name}`); return; }
        if (num > parseFloat(sub.total_marks)) {
          toast.error(`${student.full_name}: marks for ${sub.subject_name} exceed total (${sub.total_marks})`);
          return;
        }
        marksArr.push({
          student_id: student.id, subject_id: sub.subject_id,
          class_id: Number(selClass), obtained_marks: num,
          is_absent: false, remarks: cell.remarks || null,
        });
      }
    }

    if (marksArr.length === 0) { toast.error('No marks to save'); return; }

    setSaving(true);
    try {
      await submitMarks(selExam, marksArr);
      toast.success(`${marksArr.length} mark(s) saved successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <ExamSelect  value={selExam}  onChange={setSelExam}  exams={exams}    label="Select Exam" />
        <ClassSelect value={selClass} onChange={setSelClass} classes={classes} label="Select Class" />
      </div>

      {/* Lock banner */}
      {isLocked && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-700 dark:text-amber-400">
          <Lock size={15} className="shrink-0" />
          <span><span className="font-semibold">Results are published.</span> Marks are locked — ask an admin to unpublish before making changes.</span>
        </div>
      )}

      {(!selExam || !selClass) ? (
        /* ── Improved empty state (#7) ── */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="max-w-sm mx-auto text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
              <Pencil size={26} className="text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base">Enter Student Marks</h3>
              <p className="text-sm text-slate-400 mt-1">Follow the steps below to record marks</p>
            </div>
            <div className="space-y-3 text-left">
              {[
                { n: 1, active: false,   label: 'Select an Exam',  sub: 'Choose the exam from the dropdown above', icon: ClipboardList },
                { n: 2, active: !!selExam && !selClass, label: 'Select a Class', sub: 'Choose which class you are entering marks for', icon: BookOpen },
                { n: 3, active: false,   label: 'Fill in Marks',   sub: 'Enter marks per student per subject, mark absences', icon: Check },
              ].map(step => {
                const done = (step.n === 1 && !!selExam) || (step.n === 2 && !!selClass);
                return (
                  <div key={step.n} className={[
                    'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                    done
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700'
                      : step.active
                      ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-700'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
                  ].join(' ')}>
                    <div className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                      done ? 'bg-emerald-500 text-white' : step.active ? 'bg-orange-400 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500',
                    ].join(' ')}>
                      {done ? <Check size={12} /> : step.n}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${done ? 'text-emerald-700 dark:text-emerald-400' : step.active ? 'text-orange-700 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : subjects.length === 0 ? (
        <EmptyBox icon={BookOpen} message="No subjects configured for this exam and class. Go to Marks Config first." />
      ) : students.length === 0 ? (
        <EmptyBox icon={BookOpen} message="No students found in this class." />
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {students.length} Students · {subjects.length} Subjects
              </p>
              <p className="text-xs text-slate-400">
                Click <span className="font-semibold text-slate-500">AB</span> to mark absent · add remarks below the marks
              </p>
            </div>
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 dark:bg-slate-800/80 z-10 min-w-[160px]">
                    Student
                  </th>
                  {subjects.map(s => (
                    <th key={s.subject_id} className="px-3 py-3 text-center min-w-[130px]">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.subject_name}</p>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">/ {s.total_marks} (pass {s.passing_marks})</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-slate-800 z-10">
                      <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate max-w-[150px]">
                        {student.full_name}
                      </p>
                      {student.roll_number && (
                        <p className="text-xs text-slate-400">Roll: {student.roll_number}</p>
                      )}
                    </td>
                    {subjects.map(sub => {
                      const cell    = marks[student.id]?.[sub.subject_id] ?? { val: '', absent: false, remarks: '' };
                      const num     = parseFloat(cell.val);
                      const isOver  = !cell.absent && cell.val !== '' && !isNaN(num) && num > parseFloat(sub.total_marks);
                      const isFail  = !cell.absent && cell.val !== '' && !isNaN(num) && num < parseFloat(sub.passing_marks);
                      return (
                        <td key={sub.subject_id} className="px-2 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {/* Marks row: input + AB toggle */}
                            <div className="flex items-center gap-1">
                              {cell.absent ? (
                                <div className="flex items-center gap-1">
                                  <span className="w-16 text-center text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5">
                                    AB
                                  </span>
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max={sub.total_marks}
                                  step="0.5"
                                  value={cell.val}
                                  onChange={e => patchCell(student.id, sub.subject_id, { val: e.target.value })}
                                  className={[
                                    'w-16 text-center text-sm rounded-lg border px-2 py-1.5',
                                    'focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
                                    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200',
                                    isOver
                                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                      : isFail
                                      ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                                      : 'border-slate-200 dark:border-slate-700',
                                  ].join(' ')}
                                  placeholder="–"
                                />
                              )}
                              <button
                                type="button"
                                title={cell.absent ? 'Mark as present' : 'Mark as absent'}
                                onClick={() => toggleAbsent(student.id, sub.subject_id)}
                                className={[
                                  'text-[10px] font-bold px-1.5 py-1 rounded-md border transition-colors',
                                  cell.absent
                                    ? 'bg-slate-500 text-white border-slate-500 hover:bg-slate-400'
                                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400 hover:text-slate-600',
                                ].join(' ')}
                              >
                                AB
                              </button>
                            </div>
                            {/* Remarks input */}
                            <input
                              type="text"
                              value={cell.remarks}
                              onChange={e => patchCell(student.id, sub.subject_id, { remarks: e.target.value })}
                              placeholder="remark…"
                              className="w-[104px] text-[10px] text-center rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 placeholder:text-slate-300"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-400 flex items-center gap-3">
              <span><span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 mr-1 align-middle" />Below passing</span>
              <span><span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-900/20 mr-1 align-middle" />Exceeds total</span>
              <span><span className="inline-block w-5 h-4 rounded bg-slate-200 dark:bg-slate-700 mr-1 align-middle text-[8px] font-bold text-slate-500 flex items-center justify-center">AB</span>Absent</span>
            </p>
            <Button loading={saving} onClick={handleSubmit} disabled={isLocked}
              style={{ background: isLocked ? undefined : 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              {isLocked ? <><Lock size={14} /> Locked</> : <><Check size={14} /> Save All Marks</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 4 — Results
// ─────────────────────────────────────────────────────────────
function ResultsTab() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const [exams,        setExams]        = useState([]);
  const { data: classes = [] }          = useClasses();
  const [selExam,      setSelExam]      = useState('');
  const [selClass,     setSelClass]     = useState('');
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [calculating,  setCalculating]  = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [reportCard,   setReportCard]   = useState(null);
  const [reportOpen,   setReportOpen]   = useState(false);
  const [pdfLoading,   setPdfLoading]   = useState(false);

  useEffect(() => {
    getExams()
      .then(e => setExams(Array.isArray(e.data) ? e.data : []))
      .catch(() => {});
  }, []);

  const selectedExamObj = exams.find(e => String(e.id) === String(selExam));
  const isLocked = !!selectedExamObj?.results_published_at;

  // Refresh exam list so published_at stays current
  const refreshExams = async () => {
    try {
      const e = await getExams();
      setExams(Array.isArray(e.data) ? e.data : []);
    } catch {}
  };

  const loadResults = useCallback(async () => {
    if (!selExam || !selClass) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await getClassRanking(selExam, selClass);
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selExam, selClass]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const handleCalculate = async () => {
    if (!selExam) { toast.error('Select an exam first'); return; }
    setCalculating(true);
    try {
      const { data } = await calculateResults(selExam);
      const count = Array.isArray(data) ? data.length : 0;
      toast.success(`Results calculated for ${count} student(s)`);
      loadResults();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (isLocked) {
        await unpublishResults(selExam);
        toast.success('Results unpublished — marks can be edited again');
      } else {
        await publishResults(selExam);
        toast.success('Results published and locked');
      }
      await refreshExams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setPublishing(false);
    }
  };

  const openReportCard = async (studentId) => {
    try {
      const res = await getStudentReportCard(selExam, studentId);
      const payload = res.data?.data ?? res.data;
      setReportCard(payload);
      setReportOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load report card');
    }
  };

  // ── PDF helpers ──────────────────────────────────────────────────────────
  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const downloadClassPDF = async () => {
    if (!selExam || !selClass) return;
    setPdfLoading(true);
    const tid = toast.loading('Generating PDF…');
    try {
      const res = await downloadClassReportCardsPDF(selExam, selClass);
      triggerBlobDownload(res.data, `report-cards-class-${selClass}-exam-${selExam}.pdf`);
      toast.success('PDF downloaded', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || 'PDF generation failed', { id: tid });
    } finally {
      setPdfLoading(false);
    }
  };

  const passCount = results.filter(r => r.result_status === 'pass').length;
  const failCount = results.filter(r => r.result_status === 'fail').length;

  return (
    <div className="space-y-5">
      {/* Selectors + Actions */}
      <div className="flex flex-wrap items-end gap-4">
        <ExamSelect  value={selExam}  onChange={setSelExam}  exams={exams}    label="Select Exam" />
        <ClassSelect value={selClass} onChange={setSelClass} classes={classes} label="Select Class" />
        {isAdmin && (
          <Button loading={calculating} onClick={handleCalculate} disabled={isLocked}
            style={{ background: isLocked ? undefined : 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
            <Calculator size={14} /> Calculate Results
          </Button>
        )}
        {isAdmin && selExam && results.length > 0 && (
          <Button loading={publishing} onClick={handlePublish}
            style={{ background: isLocked
              ? 'linear-gradient(135deg,#f59e0b,#f97316)'
              : 'linear-gradient(135deg,#10b981,#059669)' }}>
            {isLocked ? <><Unlock size={14} /> Unpublish</> : <><Lock size={14} /> Publish Results</>}
          </Button>
        )}
        {results.length > 0 && selExam && selClass && (
          <>
            <Button
              onClick={() => {
                const p = new URLSearchParams({ type: 'class', exam_id: selExam, class_id: selClass });
                window.open(`/exams/report-card/print?${p}`, '_blank');
              }}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Printer size={14} /> Print All Report Cards
            </Button>
            <Button
              loading={pdfLoading}
              onClick={downloadClassPDF}
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
              <FileDown size={14} /> Download Class PDF
            </Button>
          </>
        )}
      </div>

      {/* Published banner */}
      {isLocked && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-sm text-emerald-700 dark:text-emerald-400">
          <Lock size={15} className="shrink-0" />
          <div>
            <span className="font-semibold">Results published & locked</span>
            <span className="ml-2 text-emerald-600 dark:text-emerald-500 text-xs">
              Published {new Date(selectedExamObj.results_published_at).toLocaleString('en-PK')}
            </span>
          </div>
          {isAdmin && (
            <span className="ml-auto text-xs opacity-70">Click Unpublish to allow edits</span>
          )}
        </div>
      )}

      {(!selExam || !selClass) ? (
        <EmptyBox icon={BarChart3} message="Select an exam and class to view results." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : results.length === 0 ? (
        <EmptyBox icon={TrendingUp} message="No results yet. Enter marks and click Calculate Results." />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Students', value: results.length,   color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { label: 'Passed',         value: passCount,         color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Failed',         value: failCount,         color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
              { label: 'Pass Rate',      value: results.length ? `${Math.round(passCount/results.length*100)}%` : '0%', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-4`}>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Ranking table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Class Ranking</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Rank','Student','Total Marks','Obtained','Percentage','Grade','Subjects Failed','Status',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={[
                        'inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold',
                        r.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        r.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                        r.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      ].join(' ')}>
                        {r.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{r.full_name}</p>
                      {r.roll_number && <p className="text-xs text-slate-400">Roll: {r.roll_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.total_marks}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.obtained_marks}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{r.percentage}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <GradeBadge grade={r.grade} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.subjects_failed > 0 ? (
                        <span className="text-red-500 font-semibold">{r.subjects_failed}</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                        r.result_status === 'pass'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                          : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
                      ].join(' ')}>
                        {r.result_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openReportCard(r.student_id)}
                        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400
                                   hover:underline font-medium whitespace-nowrap"
                      >
                        <FileText size={12} /> Report Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {reportOpen && reportCard && (
        <ReportCardModal
          data={reportCard}
          onClose={() => { setReportOpen(false); setReportCard(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Report Card Modal
// ─────────────────────────────────────────────────────────────
function ReportCardModal({ data, onClose }) {
  const { summary, subjects = [] } = data;
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!summary?.exam_id || !summary?.student_id) return;
    setPdfLoading(true);
    const tid = toast.loading('Generating PDF…');
    try {
      const res = await downloadStudentReportCardPDF(summary.exam_id, summary.student_id);
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `report-card_${(summary.full_name || 'student').replace(/\s+/g,'_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || 'PDF generation failed', { id: tid });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Student Report Card" size="lg">
      <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Student info */}
        {summary && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">{summary.full_name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {summary.class_name} · {summary.grade} {summary.section}
                  {summary.roll_number && ` · Roll: ${summary.roll_number}`}
                </p>
                {summary.father_name && (
                  <p className="text-xs text-slate-400 mt-0.5">Father: {summary.father_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{summary.exam_name}</p>
                <p className="text-xs text-slate-400">{summary.academic_year}</p>
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <GradeBadge grade={summary.grade} />
                  <span className={[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                    summary.result_status === 'pass'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                      : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
                  ].join(' ')}>
                    {summary.result_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall marks bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Overall: {summary.obtained_marks} / {summary.total_marks}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{summary.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(summary.percentage, 100)}%`,
                    background: summary.percentage >= 80 ? 'linear-gradient(90deg,#10b981,#14b8a6)'
                               : summary.percentage >= 50 ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                               : 'linear-gradient(90deg,#ef4444,#f97316)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Subject-wise table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                {['Subject', 'Total', 'Passing', 'Obtained', '%', 'Grade', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {subjects.map((s, i) => (
                <tr key={i} className={
                  s.subject_status === 'absent' ? 'bg-slate-50/60 dark:bg-slate-700/20' :
                  s.subject_status === 'fail'   ? 'bg-red-50/40 dark:bg-red-900/10' : ''
                }>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {s.subject_name}
                    {s.subject_code && <span className="ml-1 text-xs text-slate-400">({s.subject_code})</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.total_marks}</td>
                  <td className="px-4 py-3 text-slate-500">{s.passing_marks}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                    {s.is_absent
                      ? <span className="font-bold text-slate-500 dark:text-slate-400">AB</span>
                      : s.obtained_marks}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {s.is_absent ? '—' : `${s.subject_percentage}%`}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_absent ? '—' : <GradeBadge grade={s.subject_grade} />}
                  </td>
                  <td className="px-4 py-3">
                    {s.subject_status === 'absent' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">
                        Absent
                      </span>
                    ) : (
                      <span className={[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize',
                        s.subject_status === 'pass'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40'
                          : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
                      ].join(' ')}>
                        {s.subject_status === 'pass' ? <Check size={9} className="mr-0.5" /> : <X size={9} className="mr-0.5" />}
                        {s.subject_status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {subjects.some(s => s.remarks || s.is_absent) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remarks</p>
            {subjects.filter(s => s.remarks || s.is_absent).map((s, i) => (
              <p key={i} className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{s.subject_name}:</span>{' '}
                {s.is_absent && <span className="inline-flex items-center mr-1 px-1.5 py-0 rounded text-[10px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">AB</span>}
                {s.remarks || (s.is_absent ? 'Student was absent' : '')}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (summary?.exam_id && summary?.student_id) {
                  const p = new URLSearchParams({ type: 'single', exam_id: summary.exam_id, student_id: summary.student_id });
                  window.open(`/exams/report-card/print?${p}`, '_blank');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
              {pdfLoading
                ? <Loader2 size={13} className="animate-spin" />
                : <FileDown size={13} />}
              Download PDF
            </button>
          </div>
          <Button variant="ghost" onClick={onClose}><X size={14} /> Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 5 — Paper Creator
// ─────────────────────────────────────────────────────────────
const SECTION_META = {
  mcq:   { label: 'Section A — MCQs',             color: '#6366f1', bg: '#eef2ff' },
  short: { label: 'Section B — Short Questions',  color: '#0ea5e9', bg: '#f0f9ff' },
  long:  { label: 'Section C — Long Questions',   color: '#10b981', bg: '#f0fdf4' },
};

const BLANK_PAPER = { title: '', subject: '', class_name: '', exam_id: '', academic_year: '2025-26', total_marks: 100, duration_mins: 180, paper_date: '', instructions: '', note: '', teacher_id: '' };

// Shared input/select className used throughout the tab
const INPUT_CLS = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/30';

function PaperCreatorTab() {
  const { user }                          = useAuth();
  const isAdmin                           = user?.role === 'admin';
  const [papers,        setPapers]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [newForm,       setNewForm]       = useState(BLANK_PAPER);
  const [showNew,       setShowNew]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [metaEdit,      setMetaEdit]      = useState(false);
  const [metaForm,      setMetaForm]      = useState({});
  const [collapsed,     setCollapsed]     = useState({});
  const { data: classes = [] }            = useClasses({ limit: 200 });
  const { data: subjects = [] }           = useSubjects();
  const [teachers,      setTeachers]      = useState([]);
  const [exams,         setExams]         = useState([]);
  // Exam config fetched when exam+class+subject are selected in the form
  const [newFormConfig,  setNewFormConfig]  = useState(null); // { total_marks, passing_marks } from exam_subjects
  const [metaFormConfig, setMetaFormConfig] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState(null); // for the open paper's linked exam

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [papersRes, examsRes] = await Promise.all([
        getPapers(),
        getExams({ limit: 200 }),
      ]);
      setPapers(Array.isArray(papersRes.data) ? papersRes.data : []);
      setExams(Array.isArray(examsRes.data) ? examsRes.data : []);
      if (isAdmin) {
        const tr = await getTeacherUsers();
        setTeachers(Array.isArray(tr.data) ? tr.data : []);
      }
    } catch { toast.error('Failed to load papers'); }
    finally { setLoading(false); }
  }, [isAdmin]);

  // Helper: given an exam_id, class_name, subject → fetch exam_subjects config
  const fetchConfig = useCallback(async (examId, className, subjectName) => {
    if (!examId || !className || !subjectName) return null;
    const cls = classes.find(c => c.name === className);
    if (!cls) return null;
    try {
      const r = await getExamSubjects(examId, { class_id: cls.id });
      const rows = Array.isArray(r.data) ? r.data : [];
      const match = rows.find(row => row.subject_name?.toLowerCase() === subjectName.toLowerCase());
      return match ? { total_marks: Number(match.total_marks), passing_marks: Number(match.passing_marks) } : null;
    } catch { return null; }
  }, [classes]);

  useEffect(() => { load(); }, [load]);

  // Auto-fetch exam config whenever new-form exam+class+subject change
  useEffect(() => {
    let active = true;
    fetchConfig(newForm.exam_id, newForm.class_name, newForm.subject)
      .then(cfg => { if (active) setNewFormConfig(cfg); });
    return () => { active = false; };
  }, [newForm.exam_id, newForm.class_name, newForm.subject, fetchConfig]);

  // Auto-fetch exam config for meta-edit form
  useEffect(() => {
    if (!metaEdit) return;
    let active = true;
    fetchConfig(metaForm.exam_id, metaForm.class_name, metaForm.subject)
      .then(cfg => { if (active) setMetaFormConfig(cfg); });
    return () => { active = false; };
  }, [metaForm.exam_id, metaForm.class_name, metaForm.subject, metaEdit, fetchConfig]);

  // When a paper is selected, fetch config for its linked exam
  useEffect(() => {
    if (!selected?.exam_id) { setSelectedConfig(null); return; }
    let active = true;
    fetchConfig(selected.exam_id, selected.class_name, selected.subject)
      .then(cfg => { if (active) setSelectedConfig(cfg); });
    return () => { active = false; };
  }, [selected?.exam_id, selected?.class_name, selected?.subject, fetchConfig]);

  const handleCreate = async () => {
    if (!newForm.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { ...newForm };
      if (payload.teacher_id) { payload.teacher_user_id = payload.teacher_id; }
      delete payload.teacher_id;
      if (!payload.exam_id) delete payload.exam_id;
      const r = await createPaper(payload);
      const paper = r.data?.data ?? r.data;
      await load();
      setSelected(paper);
      setShowNew(false);
      setNewForm(BLANK_PAPER);
      setNewFormConfig(null);
      toast.success('Paper created with 3 sections');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      const payload = { ...metaForm };
      if (!payload.exam_id) payload.exam_id = null;
      const r = await updatePaper(selected.id, payload);
      const updated = r.data?.data ?? r.data;
      setSelected(updated);
      setPapers(p => p.map(x => x.id === updated.id ? { ...x, ...updated } : x));
      setMetaEdit(false);
      setMetaFormConfig(null);
      toast.success('Paper updated');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (paperId) => {
    if (!confirm('Delete this paper and all its questions?')) return;
    try {
      await deletePaper(paperId);
      setPapers(p => p.filter(x => x.id !== paperId));
      if (selected?.id === paperId) setSelected(null);
      toast.success('Paper deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const refresh = (updated) => { if (updated) setSelected(updated.data ?? updated); };
  const toggleCollapse = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const sectionMarks = (sec) => sec.questions?.reduce((sum, q) => {
    if (sec.section_type === 'long' && q.sub_parts?.length)
      return sum + q.sub_parts.reduce((s, p) => s + Number(p.marks || 0), 0);
    return sum + Number(q.marks || 0);
  }, 0) || 0;

  return (
    <div className="flex gap-5 min-h-[600px]">
      {/* ── Left: paper list ── */}
      <div className="w-72 shrink-0 space-y-2">
        <button onClick={() => setShowNew(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold shadow"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
          <Plus size={15} /> New Paper
        </button>

        {showNew && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">New Paper</p>

            {/* Title */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Paper Title *</label>
              <input type="text" value={newForm.title} placeholder="e.g. Annual Exam Mathematics"
                onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                className={INPUT_CLS} />
            </div>

            {/* Link to Exam */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Link to Exam <span className="normal-case text-slate-400">(optional)</span></label>
              <select value={newForm.exam_id} onChange={e => setNewForm(f => ({ ...f, exam_id: e.target.value }))} className={INPUT_CLS}>
                <option value="">— Not linked —</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.academic_year})</option>)}
              </select>
            </div>

            {/* Class dropdown */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Class</label>
              <select value={newForm.class_name} onChange={e => setNewForm(f => ({ ...f, class_name: e.target.value }))} className={INPUT_CLS}>
                <option value="">— Select Class —</option>
                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Subject dropdown */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Subject</label>
              <select value={newForm.subject} onChange={e => setNewForm(f => ({ ...f, subject: e.target.value }))} className={INPUT_CLS}>
                <option value="">— Select Subject —</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            {/* Exam config info box — shown when exam+class+subject are all selected */}
            {newForm.exam_id && newForm.class_name && newForm.subject && (
              <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                newFormConfig
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
              }`}>
                {newFormConfig ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Link2 size={11} />
                      <span className="font-semibold">Exam config found:</span>
                      <span className="font-bold">{newFormConfig.total_marks} marks</span>
                      <span className="text-emerald-600/70 dark:text-emerald-500/70">· passing {newFormConfig.passing_marks}</span>
                    </div>
                    {Number(newForm.total_marks) !== newFormConfig.total_marks && (
                      <button onClick={() => setNewForm(f => ({ ...f, total_marks: newFormConfig.total_marks }))}
                        className="shrink-0 px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700 transition-colors">
                        Sync
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={11} />
                    <span>No marks config found for this exam + class + subject. Set it up in <strong>Marks Config</strong> tab first.</span>
                  </div>
                )}
              </div>
            )}

            {/* Teacher dropdown — admin only */}
            {isAdmin ? (
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Assign to Teacher</label>
                <select value={newForm.teacher_id} onChange={e => setNewForm(f => ({ ...f, teacher_id: e.target.value }))} className={INPUT_CLS}>
                  <option value="">— Self (Admin) —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.display_name}{t.subject ? ` — ${t.subject}` : ''}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Teacher</label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500">
                  {user?.name || 'You'} (assigned automatically)
                </div>
              </div>
            )}

            {/* Academic year + marks + duration */}
            {[
              ['academic_year', 'Academic Year',      'text',   '2025-26'],
              ['total_marks',   'Total Marks',        'number', '100'],
              ['duration_mins', 'Duration (minutes)', 'number', '180'],
            ].map(([k, lbl, type, ph]) => (
              <div key={k}>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{lbl}</label>
                <input type={type} value={newForm[k]} placeholder={ph}
                  onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))}
                  className={INPUT_CLS} />
              </div>
            ))}

            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => { setShowNew(false); setNewFormConfig(null); }}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
        ) : papers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No papers yet.</div>
        ) : papers.map(p => (
          <button key={p.id} onClick={() => { setSelected(null); setTimeout(() => setSelected(p), 0); setMetaEdit(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
              selected?.id === p.id
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-orange-300'
            }`}>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{p.subject || '—'} · {p.class_name || '—'}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">{p.academic_year}</span>
              <span className="text-[10px] font-semibold text-orange-600">{p.total_marks} marks</span>
            </div>
            {p.exam_name && (
              <p className="text-[10px] text-indigo-500 mt-0.5 flex items-center gap-0.5 truncate">
                <Link2 size={8} className="shrink-0" /> {p.exam_name}
              </p>
            )}
            {isAdmin && p.created_by_name && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">by {p.created_by_name}</p>
            )}
          </button>
        ))}
      </div>

      {/* ── Right: editor ── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <FileEdit size={40} className="opacity-30" />
          <p className="text-sm">Select a paper or create a new one</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0 space-y-4">
          {/* Paper meta card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{selected.title}</h2>
                  {selected.exam_id && (() => {
                    const linkedExam = exams.find(e => String(e.id) === String(selected.exam_id));
                    return linkedExam ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 shrink-0">
                        <Link2 size={9} /> {linkedExam.exam_name}
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selected.subject || '—'} · {selected.class_name || '—'} · {selected.academic_year} · {selected.total_marks} marks · {Math.floor(selected.duration_mins / 60)}h{selected.duration_mins % 60 > 0 ? ` ${selected.duration_mins % 60}m` : ''}
                  {isAdmin && selected.created_by_name ? ` · by ${selected.created_by_name}` : ''}
                </p>
                {/* ── Sync warnings ── */}
                {(() => {
                  const computedTotal = selected.sections?.reduce((sum, sec) => sum + (sec.questions?.reduce((s, q) => {
                    if (sec.section_type === 'long' && q.sub_parts?.length)
                      return s + q.sub_parts.reduce((ps, p) => ps + Number(p.marks || 0), 0);
                    return s + Number(q.marks || 0);
                  }, 0) || 0), 0) || 0;
                  const paperTotal = Number(selected.total_marks);
                  const examTotal  = selectedConfig?.total_marks;
                  const examPass   = selectedConfig?.passing_marks;
                  const examMismatch   = examTotal  != null && examTotal  !== paperTotal;
                  const computedMismatch = computedTotal > 0 && computedTotal !== paperTotal;
                  if (!examMismatch && !computedMismatch && !selectedConfig) return null;
                  return (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedConfig && !examMismatch && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle size={10} /> Synced with exam ({examTotal} marks · passing {examPass})
                        </span>
                      )}
                      {examMismatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400">
                          <AlertTriangle size={10} /> Exam config: {examTotal} marks — paper says {paperTotal}
                        </span>
                      )}
                      {computedMismatch && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400">
                          <AlertTriangle size={10} /> Questions total: {computedTotal} — paper header: {paperTotal}
                          <button
                            type="button"
                            onClick={() => handleSaveMeta({ ...selected, total_marks: computedTotal })}
                            className="ml-1 px-1.5 py-0 rounded bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 transition-colors font-bold text-[9px] uppercase tracking-wide"
                            title={`Set paper total to ${computedTotal}`}
                          >
                            Fix →{computedTotal}
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => window.open(`/exams/papers/${selected.id}/print`, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Printer size={13} /> Print Preview
                </button>
                <button onClick={() => { setMetaEdit(v => !v); setMetaForm({ title: selected.title, subject: selected.subject, class_name: selected.class_name, exam_id: selected.exam_id || '', academic_year: selected.academic_year, total_marks: selected.total_marks, duration_mins: selected.duration_mins, paper_date: selected.paper_date?.split('T')[0] || '', instructions: selected.instructions || '', note: selected.note || '' }); setMetaFormConfig(null); }}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {metaEdit && (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Title */}
                <div className="col-span-full sm:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Title</label>
                  <input type="text" value={metaForm.title ?? ''} onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))} className={INPUT_CLS} />
                </div>
                {/* Class dropdown */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Class</label>
                  <select value={metaForm.class_name ?? ''} onChange={e => setMetaForm(f => ({ ...f, class_name: e.target.value }))} className={INPUT_CLS}>
                    <option value="">— Select Class —</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                {/* Subject dropdown */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Subject</label>
                  <select value={metaForm.subject ?? ''} onChange={e => setMetaForm(f => ({ ...f, subject: e.target.value }))} className={INPUT_CLS}>
                    <option value="">— Select Subject —</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                {/* Link to Exam */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Link to Exam</label>
                  <select value={metaForm.exam_id ?? ''} onChange={e => setMetaForm(f => ({ ...f, exam_id: e.target.value }))} className={INPUT_CLS}>
                    <option value="">— Not linked —</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.academic_year})</option>)}
                  </select>
                </div>
                {/* Exam config info box */}
                {metaForm.exam_id && metaForm.class_name && metaForm.subject && (
                  <div className={`col-span-full rounded-lg border px-3 py-2 text-xs ${
                    metaFormConfig
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
                  }`}>
                    {metaFormConfig ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <Link2 size={11} />
                          <span className="font-semibold">Exam config:</span>
                          <span className="font-bold">{metaFormConfig.total_marks} marks total</span>
                          <span className="opacity-70">· passing {metaFormConfig.passing_marks}</span>
                        </div>
                        {Number(metaForm.total_marks) !== metaFormConfig.total_marks && (
                          <button onClick={() => setMetaForm(f => ({ ...f, total_marks: metaFormConfig.total_marks }))}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700 transition-colors">
                            Sync marks
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={11} />
                        <span>No marks config found for this exam + class + subject.</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Remaining fields */}
                {[
                  ['academic_year', 'Academic Year',   'text'],
                  ['total_marks',   'Total Marks',     'number'],
                  ['duration_mins', 'Duration (mins)', 'number'],
                  ['paper_date',    'Date',            'date'],
                ].map(([k, lbl, type]) => (
                  <div key={k}>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{lbl}</label>
                    <input type={type} value={metaForm[k] ?? ''} onChange={e => setMetaForm(f => ({ ...f, [k]: e.target.value }))} className={INPUT_CLS} />
                  </div>
                ))}
                <div className="col-span-full">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">General Instructions</label>
                  <textarea rows={2} value={metaForm.instructions ?? ''} onChange={e => setMetaForm(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="e.g. All questions are compulsory. Write clearly."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Footer Note</label>
                  <input type="text" value={metaForm.note ?? ''} onChange={e => setMetaForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="e.g. Good Luck!"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
                </div>
                <div className="col-span-full flex gap-2">
                  <button onClick={handleSaveMeta} disabled={saving}
                    className="px-5 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setMetaEdit(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          {selected.sections?.map(sec => (
            <SectionEditor key={sec.id} section={sec} collapsed={!!collapsed[sec.id]}
              onToggle={() => toggleCollapse(sec.id)} sectionMarks={sectionMarks(sec)} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section editor ──────────────────────────────────────────── */
function SectionEditor({ section, collapsed, onToggle, sectionMarks, onRefresh }) {
  const meta = SECTION_META[section.section_type] || SECTION_META.short;
  const [secForm, setSecForm] = useState({ title: section.title, instructions: section.instructions || '', marks_per_q: section.marks_per_q });
  const [secEdit, setSecEdit] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const handleSaveSection = async () => {
    setSaving(true);
    try {
      const r = await updateSection(section.id, secForm);
      onRefresh(r.data?.data ?? r.data);
      setSecEdit(false);
      toast.success('Section updated');
    } catch { toast.error('Failed to update section'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderLeft: `4px solid ${meta.color}`, background: meta.bg }}>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: meta.color }}>{section.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{section.questions?.length || 0} questions · {sectionMarks} marks total</p>
        </div>
        <button onClick={() => { setSecEdit(v => !v); setSecForm({ title: section.title, instructions: section.instructions || '', marks_per_q: section.marks_per_q }); }}
          className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors"><Pencil size={13} /></button>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors">
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-5 space-y-4">
          {secEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Section Title</label>
                <input value={secForm.title} onChange={e => setSecForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Section Instructions</label>
                <input value={secForm.instructions} onChange={e => setSecForm(f => ({ ...f, instructions: e.target.value }))}
                  placeholder="e.g. Attempt any 6 of the following."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Default Marks/Question</label>
                <input type="number" value={secForm.marks_per_q} onChange={e => setSecForm(f => ({ ...f, marks_per_q: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              </div>
              <div className="flex items-end gap-2">
                <button onClick={handleSaveSection} disabled={saving}
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: meta.color }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setSecEdit(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {section.questions?.length === 0 && !addOpen && (
            <p className="text-sm text-slate-400 text-center py-4">No questions yet. Add one below.</p>
          )}
          {section.questions?.map((q, qi) => (
            <QuestionRow key={q.id} question={q} index={qi} sectionType={section.section_type}
              accentColor={meta.color} onRefresh={onRefresh} />
          ))}

          {addOpen ? (
            <AddQuestionForm section={section} defaultMarks={section.marks_per_q || 1}
              accentColor={meta.color}
              onRefresh={(u) => { onRefresh(u); setAddOpen(false); }}
              onCancel={() => setAddOpen(false)} />
          ) : (
            <button onClick={() => setAddOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors"
              style={{ borderColor: meta.color, color: meta.color }}>
              <Plus size={15} /> Add Question
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Question row ────────────────────────────────────────────── */
const ROMAN_UI = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv'];

function QuestionRow({ question: q, index, sectionType, accentColor, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState(null);

  const startEdit = () => {
    setForm({
      question_text: q.question_text,
      marks: q.marks,
      options: q.options ? JSON.parse(JSON.stringify(q.options)) : [
        { label: 'A', text: '' }, { label: 'B', text: '' },
        { label: 'C', text: '' }, { label: 'D', text: '' },
      ],
      sub_parts: q.sub_parts ? JSON.parse(JSON.stringify(q.sub_parts)) : [],
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { question_text: form.question_text, marks: form.marks };
      if (sectionType === 'mcq')  payload.options    = form.options;
      if (sectionType === 'long') payload.sub_parts  = form.sub_parts;
      const r = await updateQuestion(q.id, payload);
      onRefresh(r.data?.data ?? r.data);
      setEditing(false);
      toast.success('Question saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this question?')) return;
    try {
      const r = await deleteQuestion(q.id);
      onRefresh(r.data?.data ?? r.data);
    } catch { toast.error('Failed to delete'); }
  };

  const qLabel = sectionType === 'short' ? `${ROMAN_UI[index] || index + 1}.` : `${index + 1}.`;

  if (!editing) return (
    <div className="group flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <span className="text-xs font-bold text-slate-400 pt-0.5 w-7 shrink-0">{qLabel}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 dark:text-slate-100">{q.question_text}</p>
        {sectionType === 'mcq' && q.options?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 mt-2">
            {q.options.map(o => (
              <span key={o.label} className="text-xs text-slate-500">
                <span className="font-bold mr-1">({o.label})</span>{o.text || <em className="opacity-40">empty</em>}
              </span>
            ))}
          </div>
        )}
        {sectionType === 'long' && q.sub_parts?.length > 0 && (
          <div className="mt-2 space-y-1">
            {q.sub_parts.map((sp, si) => (
              <div key={si} className="flex items-baseline gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold">({sp.label || String.fromCharCode(97 + si)})</span>
                <span className="flex-1">{sp.text}</span>
                <span className="font-semibold text-slate-400">({sp.marks}m)</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white mt-0.5" style={{ background: accentColor }}>{q.marks}m</span>
        <button onClick={startEdit} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500"><Pencil size={13} /></button>
        <button onClick={handleDelete} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
    </div>
  );

  return (
    <div className="p-4 rounded-xl border-2 space-y-3" style={{ borderColor: accentColor }}>
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Question Text</label>
        <textarea rows={2} value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
      </div>
      {sectionType !== 'long' && (
        <div className="w-28">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Marks</label>
          <input type="number" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
        </div>
      )}
      {sectionType === 'mcq' && (
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">Options</label>
          <div className="grid grid-cols-2 gap-2">
            {form.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-5">({o.label})</span>
                <input value={o.text} onChange={e => setForm(f => { const opts = [...f.options]; opts[oi] = { ...opts[oi], text: e.target.value }; return { ...f, options: opts }; })}
                  placeholder={`Option ${o.label}`}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              </div>
            ))}
          </div>
        </div>
      )}
      {sectionType === 'long' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Sub-parts</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, sub_parts: [...f.sub_parts, { label: String.fromCharCode(97 + f.sub_parts.length), text: '', marks: 5 }] }))}
              className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Plus size={12} /> Add sub-part</button>
          </div>
          {form.sub_parts.length === 0 ? (
            <div className="w-28">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Marks</label>
              <input type="number" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
            </div>
          ) : form.sub_parts.map((sp, si) => (
            <div key={si} className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 w-6">({sp.label})</span>
              <input value={sp.text} onChange={e => setForm(f => { const sps = [...f.sub_parts]; sps[si] = { ...sps[si], text: e.target.value }; return { ...f, sub_parts: sps }; })}
                placeholder="Sub-part text"
                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              <input type="number" value={sp.marks} onChange={e => setForm(f => { const sps = [...f.sub_parts]; sps[si] = { ...sps[si], marks: e.target.value }; return { ...f, sub_parts: sps }; })}
                className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              <button onClick={() => setForm(f => ({ ...f, sub_parts: f.sub_parts.filter((_, i) => i !== si) }))}
                className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: accentColor }}>
          {saving ? 'Saving…' : 'Save Question'}
        </button>
        <button onClick={() => setEditing(false)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">Cancel</button>
      </div>
    </div>
  );
}

/* ── Add question form ───────────────────────────────────────── */
function AddQuestionForm({ section, defaultMarks, accentColor, onRefresh, onCancel }) {
  const isLong = section.section_type === 'long';
  const isMcq  = section.section_type === 'mcq';
  const [form, setForm] = useState({
    question_text: '', marks: defaultMarks,
    options:   [{ label:'A',text:'' },{ label:'B',text:'' },{ label:'C',text:'' },{ label:'D',text:'' }],
    sub_parts: [],
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.question_text.trim()) { toast.error('Question text is required'); return; }
    setSaving(true);
    try {
      const payload = { question_text: form.question_text, marks: form.marks, sort_order: section.questions?.length || 0 };
      if (isMcq)  payload.options   = form.options;
      if (isLong && form.sub_parts.length > 0) payload.sub_parts = form.sub_parts;
      const r = await addQuestion(section.id, payload);
      onRefresh(r.data?.data ?? r.data);
      toast.success('Question added');
    } catch { toast.error('Failed to add question'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 rounded-xl border-2 border-dashed space-y-3" style={{ borderColor: accentColor }}>
      <p className="text-xs font-bold uppercase" style={{ color: accentColor }}>New Question</p>
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Question Text</label>
        <textarea rows={2} value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
          placeholder={isMcq ? 'Which of the following…?' : isLong ? 'Describe in detail…' : 'Define the term…'}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
      </div>
      {!isLong && (
        <div className="w-28">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Marks</label>
          <input type="number" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
        </div>
      )}
      {isMcq && (
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-2">Options</label>
          <div className="grid grid-cols-2 gap-2">
            {form.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-5">({o.label})</span>
                <input value={o.text} onChange={e => setForm(f => { const opts=[...f.options]; opts[oi]={...opts[oi],text:e.target.value}; return {...f,options:opts}; })}
                  placeholder={`Option ${o.label}`}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              </div>
            ))}
          </div>
        </div>
      )}
      {isLong && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Sub-parts (optional)</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, sub_parts: [...f.sub_parts, { label: String.fromCharCode(97+f.sub_parts.length), text:'', marks:5 }] }))}
              className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Plus size={12} /> Add sub-part</button>
          </div>
          {form.sub_parts.length === 0 ? (
            <div className="w-28">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Total Marks</label>
              <input type="number" value={form.marks} onChange={e => setForm(f => ({ ...f, marks: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
            </div>
          ) : form.sub_parts.map((sp, si) => (
            <div key={si} className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 w-6">({sp.label})</span>
              <input value={sp.text} onChange={e => setForm(f => { const sps=[...f.sub_parts]; sps[si]={...sps[si],text:e.target.value}; return {...f,sub_parts:sps}; })}
                placeholder="Sub-part text"
                className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              <input type="number" value={sp.marks} onChange={e => setForm(f => { const sps=[...f.sub_parts]; sps[si]={...sps[si],marks:e.target.value}; return {...f,sub_parts:sps}; })}
                className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30" />
              <button onClick={() => setForm(f => ({ ...f, sub_parts: f.sub_parts.filter((_,i)=>i!==si) }))}
                className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={saving}
          className="px-5 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: accentColor }}>
          {saving ? 'Adding…' : 'Add Question'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm">Cancel</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 6 — Date Sheet
// ─────────────────────────────────────────────────────────────
function DateSheetTab() {
  const [exams,      setExams]      = useState([]);
  const { data: classes = [] }      = useClasses();
  const [examId,     setExamId]     = useState('');
  const [classId,    setClassId]    = useState('');
  const [exam,       setExam]       = useState(null);
  const [rows,       setRows]       = useState([]);   // exam_subjects with schedule fields
  const [edits,      setEdits]      = useState({});   // { [exam_subject_id]: { exam_date, start_time, end_time, venue } }
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Load exam list once
  useEffect(() => {
    getExams()
      .then(eRes => setExams(eRes.data?.data ?? eRes.data ?? []))
      .catch(() => toast.error('Failed to load exams'));
  }, []);

  // Load date sheet when exam or class changes
  useEffect(() => {
    if (!examId) { setRows([]); setExam(null); setEdits({}); return; }
    setLoading(true);
    getDateSheet(examId, classId ? { class_id: classId } : {})
      .then(res => {
        const d = res.data;
        setExam(d.exam ?? null);
        const fetched = d.rows ?? [];
        setRows(fetched);
        // Seed edits with current DB values so inputs show existing data
        const seed = {};
        fetched.forEach(r => {
          seed[r.id] = {
            exam_date:  r.exam_date  ? r.exam_date.slice(0, 10) : '',
            start_time: r.start_time ? r.start_time.slice(0, 5) : '',
            end_time:   r.end_time   ? r.end_time.slice(0, 5)   : '',
            venue:      r.venue      ?? '',
          };
        });
        setEdits(seed);
      })
      .catch(() => toast.error('Failed to load date sheet'))
      .finally(() => setLoading(false));
  }, [examId, classId]);

  const setField = (id, field, value) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const handleSave = async () => {
    const schedules = rows.map(r => ({
      exam_subject_id: r.id,
      exam_date:  edits[r.id]?.exam_date  || null,
      start_time: edits[r.id]?.start_time || null,
      end_time:   edits[r.id]?.end_time   || null,
      venue:      edits[r.id]?.venue      || null,
    }));

    setSaving(true);
    try {
      await updateDateSheet(examId, { schedules });
      toast.success('Date sheet saved');
      // Refresh to confirm DB values
      const res = await getDateSheet(examId, classId ? { class_id: classId } : {});
      setRows(res.data?.rows ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasEdits    = rows.length > 0;
  const printURL    = examId
    ? `/exams/${examId}/date-sheet/print${classId ? `?class_id=${classId}` : ''}`
    : null;
  const rollSlipURL = examId
    ? `/exams/${examId}/roll-slips/print${classId ? `?class_id=${classId}` : ''}`
    : null;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-end gap-3">
          {/* Exam selector */}
          <div className="min-w-56">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Exam</label>
            <div className="relative">
              <select value={examId} onChange={e => { setExamId(e.target.value); setClassId(''); }}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="">— Select Exam —</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.exam_name} ({e.academic_year})</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Class filter */}
          <div className="min-w-44">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Filter by Class</label>
            <div className="relative">
              <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!examId}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50">
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {rollSlipURL && (
              <button onClick={() => window.open(rollSlipURL, '_blank')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <FileText size={15} /> Roll Slips
              </button>
            )}
            {printURL && (
              <button onClick={() => window.open(printURL, '_blank')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Printer size={15} /> Date Sheet
              </button>
            )}
            {hasEdits && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
            )}
          </div>
        </div>

        {/* Exam meta banner */}
        {exam && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span><span className="font-semibold text-slate-700 dark:text-slate-300">Exam:</span> {exam.exam_name}</span>
            <span><span className="font-semibold text-slate-700 dark:text-slate-300">Type:</span> {exam.exam_type?.replace('_', ' ')}</span>
            <span><span className="font-semibold text-slate-700 dark:text-slate-300">Year:</span> {exam.academic_year}</span>
            {exam.start_date && <span><span className="font-semibold text-slate-700 dark:text-slate-300">Window:</span> {exam.start_date?.slice(0,10)} → {exam.end_date?.slice(0,10)}</span>}
          </div>
        )}
      </div>

      {/* No exam selected */}
      {!examId && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
          Select an exam above to view or edit its date sheet.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      )}

      {/* Empty — exam selected but no subjects configured */}
      {!loading && examId && rows.length === 0 && (
        <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <CalendarDays size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No subjects configured</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add subjects in the Marks Config tab first, then return here to schedule dates.</p>
        </div>
      )}

      {/* Date sheet grid */}
      {!loading && rows.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {rows.length} Subject{rows.length !== 1 ? 's' : ''}
            </h3>
            <span className="text-xs text-slate-400">Edit dates inline, then click Save Schedule</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                  {['Subject', 'Class', 'Date', 'Start', 'End', 'Venue'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const e = edits[row.id] ?? {};
                  const isScheduled = !!e.exam_date;
                  return (
                    <tr key={row.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-700/20 transition-colors">

                      {/* Subject */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-white">{row.subject_name}</span>
                        {row.subject_code && (
                          <span className="ml-1.5 text-xs text-slate-400">({row.subject_code})</span>
                        )}
                      </td>

                      {/* Class */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.class_name}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <DatePicker
                          value={e.exam_date || ''}
                          onChange={v => setField(row.id, 'exam_date', v)}
                          min={exam?.start_date?.slice(0,10)}
                          max={exam?.end_date?.slice(0,10)}
                          className="w-44"
                        />
                      </td>

                      {/* Start time */}
                      <td className="px-4 py-3">
                        <input type="time" value={e.start_time || ''}
                          onChange={ev => setField(row.id, 'start_time', ev.target.value)}
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                      </td>

                      {/* End time */}
                      <td className="px-4 py-3">
                        <input type="time" value={e.end_time || ''}
                          onChange={ev => setField(row.id, 'end_time', ev.target.value)}
                          className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                      </td>

                      {/* Venue */}
                      <td className="px-4 py-3">
                        <input type="text" value={e.venue || ''} placeholder="Room / Hall"
                          onChange={ev => setField(row.id, 'venue', ev.target.value)}
                          className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom save bar */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
