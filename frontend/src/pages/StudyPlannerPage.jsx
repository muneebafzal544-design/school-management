import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import {
  BookOpen, Users, Plus, Trash2, CheckCircle, Circle,
  AlertTriangle, ChevronDown, Lightbulb, CalendarDays,
  BarChart2, RefreshCw, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudents } from '../api/students';
import {
  getStudentPlan, getClassPlan, assignTopic,
  updateTopic, completeTopic, deleteTopic,
} from '../api/studyPlanner';
import { useAuth } from '../context/AuthContext';
import { useClasses, useSubjects } from '../hooks/useReferenceData';

const PRIORITY_LABELS = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low', 5: 'Optional' };
const PRIORITY_COLORS = {
  1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  4: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  5: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

// ── Assign / Edit Topic Modal ─────────────────────────────────────────────────
function TopicModal({ classes, subjects, students, preClassId, preStudentId, onClose, onSave }) {
  const [form, setForm] = useState({
    scope: preStudentId ? 'student' : 'class',
    class_id: preClassId || '',
    student_id: preStudentId || '',
    subject_id: '',
    topic: '',
    description: '',
    priority: 2,
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [classStudents, setClassStudents] = useState(students || []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.scope === 'student' && form.class_id && !preStudentId) {
      getStudents({ class_id: form.class_id, status: 'active', limit: 200 })
        .then(r => setClassStudents(r.data?.data || r.data || []))
        .catch(() => {});
    }
  }, [form.class_id, form.scope, preStudentId]);

  const handleSave = async () => {
    if (!form.topic.trim()) return toast.error('Topic title required');
    if (form.scope === 'student' && !form.student_id) return toast.error('Select a student');
    if (form.scope === 'class' && !form.class_id) return toast.error('Select a class');
    setSaving(true);
    try {
      await assignTopic({
        topic: form.topic,
        description: form.description || undefined,
        subject_id: form.subject_id || undefined,
        priority: Number(form.priority),
        due_date: form.due_date || undefined,
        ...(form.scope === 'student' ? { student_id: form.student_id } : { class_id: form.class_id }),
      });
      toast.success('Topic assigned');
      onSave();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assign Study Topic</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Scope */}
          <div className="flex gap-2">
            {['class', 'student'].map(s => (
              <button key={s} onClick={() => set('scope', s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize
                  ${form.scope === s
                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-500'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300'}`}>
                {s === 'class' ? 'Whole Class' : 'Individual Student'}
              </button>
            ))}
          </div>

          {/* Class selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Class</label>
            <select value={form.class_id} onChange={e => { set('class_id', e.target.value); set('student_id', ''); }}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white">
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Student selector (scope = student) */}
          {form.scope === 'student' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Student</label>
              <select value={form.student_id} onChange={e => set('student_id', e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white">
                <option value="">Select student</option>
                {classStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject (optional)</label>
            <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white">
              <option value="">Any / General</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Topic title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topic Title *</label>
            <input value={form.topic} onChange={e => set('topic', e.target.value)}
              placeholder="e.g. Algebra Chapter 3 – Equations"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Instructions (optional)</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Focus areas, resources, notes…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 resize-none" />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white">
                {[1, 2, 3, 4, 5].map(p => (
                  <option key={p} value={p}>{p} – {PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity">
            <Save size={14} />
            {saving ? 'Saving…' : 'Assign Topic'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Topic Row ─────────────────────────────────────────────────────────────────
function TopicRow({ topic, onToggle, onDelete, isTeacher }) {
  const overdue = topic.due_date && !topic.is_completed && new Date(topic.due_date) < new Date();
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all
      ${topic.is_completed
        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 opacity-75'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-600'}`}>
      <button onClick={() => onToggle(topic.id, !topic.is_completed)}
        className={`mt-0.5 shrink-0 transition-colors ${topic.is_completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 hover:text-violet-500'}`}>
        {topic.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${topic.is_completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
            {topic.topic}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[topic.priority]}`}>
            {PRIORITY_LABELS[topic.priority]}
          </span>
          {topic.subject_name && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              {topic.subject_name}
            </span>
          )}
          {overdue && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle size={10} /> Overdue
            </span>
          )}
        </div>
        {topic.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{topic.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {topic.student_name && (
            <span className="text-xs text-gray-400 dark:text-gray-500">Student: {topic.student_name}</span>
          )}
          {topic.assigned_by_name && (
            <span className="text-xs text-gray-400 dark:text-gray-500">By: {topic.assigned_by_name}</span>
          )}
          {topic.due_date && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <CalendarDays size={11} />
              {new Date(topic.due_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      {isTeacher && (
        <button onClick={() => onDelete(topic.id)}
          className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-0.5">
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

// ── Suggestion Card ───────────────────────────────────────────────────────────
function SuggestionCard({ suggestion }) {
  if (!suggestion.syllabus_topics?.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={14} className="text-amber-500" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{suggestion.subject_name}</span>
        <span className="text-xs text-amber-600 dark:text-amber-500 ml-auto">
          Avg: {suggestion.avg_pct}% (need {suggestion.passing_pct}%)
        </span>
      </div>
      <div className="space-y-1">
        {suggestion.syllabus_topics.map(t => (
          <div key={t.id} className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            {t.topic}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudyPlannerPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [tab, setTab] = useState(isStudent ? 'student' : 'class');
  const { data: classes = [] } = useClasses({ limit: 200 });
  const { data: subjects = [] } = useSubjects();
  const [students, setStudents] = useState([]);

  // Class plan state
  const [selClass, setSelClass] = useState('');
  const [classTopics, setClassTopics] = useState([]);
  const [classLoading, setClassLoading] = useState(false);

  // Student plan state
  const [selStudent, setSelStudent] = useState(isStudent ? user?.entity_id || '' : '');
  const [studentPlan, setStudentPlan] = useState({ assigned: [], suggestions: [] });
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentClassId, setStudentClassId] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);

  // Filter
  const [showDone, setShowDone] = useState(false);

  // Load students when class changes (for non-student roles)
  useEffect(() => {
    if (!studentClassId) { setStudents([]); return; }
    getStudents({ class_id: studentClassId, status: 'active', limit: 200 })
      .then(r => setStudents(r.data?.data || r.data || []))
      .catch(() => {});
  }, [studentClassId]);

  // Auto-load for student role
  useEffect(() => {
    if (isStudent && selStudent) loadStudentPlan(selStudent);
  }, []); // eslint-disable-line

  // ── Load handlers ─────────────────────────────────────────────────────────
  const loadClassPlan = useCallback(async (classId) => {
    if (!classId) return;
    setClassLoading(true);
    try {
      const r = await getClassPlan(classId);
      setClassTopics(r.data?.data || []);
    } catch { toast.error('Failed to load class plan'); }
    finally { setClassLoading(false); }
  }, []);

  const loadStudentPlan = useCallback(async (studentId) => {
    if (!studentId) return;
    setStudentLoading(true);
    try {
      const r = await getStudentPlan(studentId);
      setStudentPlan(r.data?.data || { assigned: [], suggestions: [] });
    } catch { toast.error('Failed to load student plan'); }
    finally { setStudentLoading(false); }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggle = async (id, done) => {
    try {
      await completeTopic(id, done);
      if (tab === 'class' && selClass) loadClassPlan(selClass);
      if (tab === 'student' && selStudent) loadStudentPlan(selStudent);
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this topic?')) return;
    try {
      await deleteTopic(id);
      toast.success('Removed');
      if (tab === 'class' && selClass) loadClassPlan(selClass);
      if (tab === 'student' && selStudent) loadStudentPlan(selStudent);
    } catch { toast.error('Delete failed'); }
  };

  const handleSaved = () => {
    setShowModal(false);
    if (tab === 'class' && selClass) loadClassPlan(selClass);
    if (tab === 'student' && selStudent) loadStudentPlan(selStudent);
  };

  // ── Derived display data ──────────────────────────────────────────────────
  const visibleClassTopics = showDone ? classTopics : classTopics.filter(t => !t.is_completed);
  const visibleStudentTopics = showDone
    ? studentPlan.assigned
    : studentPlan.assigned.filter(t => !t.is_completed);

  const classDoneCount = classTopics.filter(t => t.is_completed).length;
  const studentDoneCount = studentPlan.assigned.filter(t => t.is_completed).length;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen size={22} className="text-violet-500" />
              Study Planner
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Assign and track focus topics by student or class</p>
          </div>
          {isTeacher && (
            <button onClick={() => setShowModal(true)}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm">
              <Plus size={16} /> Assign Topic
            </button>
          )}
        </div>

        {/* Tabs */}
        {!isStudent && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            {[
              { id: 'class', label: 'Class Plan', icon: Users },
              { id: 'student', label: 'Student Plan', icon: BookOpen },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === id ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── CLASS PLAN TAB ────────────────────────────────────────────── */}
        {tab === 'class' && !isStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={selClass} onChange={e => { setSelClass(e.target.value); loadClassPlan(e.target.value); }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white min-w-[180px]">
                <option value="">Select a class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selClass && (
                <>
                  <button onClick={() => loadClassPlan(selClass)}
                    className="text-gray-400 hover:text-violet-500 transition-colors"><RefreshCw size={16} /></button>
                  {classDoneCount > 0 && (
                    <button onClick={() => setShowDone(v => !v)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors flex items-center gap-1.5">
                      <CheckCircle size={13} className="text-green-500" />
                      {showDone ? 'Hide' : 'Show'} {classDoneCount} done
                    </button>
                  )}
                </>
              )}
            </div>

            {classLoading && (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
              </div>
            )}

            {!classLoading && selClass && visibleClassTopics.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending topics for this class</p>
              </div>
            )}

            {!classLoading && !selClass && (
              <div className="text-center py-12 text-gray-300 dark:text-gray-600">
                <Users size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a class to view its study plan</p>
              </div>
            )}

            {!classLoading && visibleClassTopics.length > 0 && (
              <div className="space-y-2">
                {visibleClassTopics.map(t => (
                  <TopicRow key={t.id} topic={t} onToggle={handleToggle} onDelete={handleDelete} isTeacher={isTeacher} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STUDENT PLAN TAB ──────────────────────────────────────────── */}
        {(tab === 'student' || isStudent) && (
          <div className="space-y-4">
            {!isStudent && (
              <div className="flex items-center gap-3 flex-wrap">
                <select value={studentClassId} onChange={e => { setStudentClassId(e.target.value); setSelStudent(''); setStudentPlan({ assigned: [], suggestions: [] }); }}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white min-w-[160px]">
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {studentClassId && (
                  <select value={selStudent} onChange={e => { setSelStudent(e.target.value); if (e.target.value) loadStudentPlan(e.target.value); }}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white min-w-[200px]">
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                )}
                {selStudent && (
                  <button onClick={() => loadStudentPlan(selStudent)}
                    className="text-gray-400 hover:text-violet-500 transition-colors"><RefreshCw size={16} /></button>
                )}
                {studentDoneCount > 0 && selStudent && (
                  <button onClick={() => setShowDone(v => !v)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-green-500" />
                    {showDone ? 'Hide' : 'Show'} {studentDoneCount} done
                  </button>
                )}
              </div>
            )}

            {studentLoading && (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
              </div>
            )}

            {!studentLoading && (isStudent || selStudent) && (
              <div className="grid lg:grid-cols-3 gap-4">
                {/* Topics list */}
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <BarChart2 size={14} className="text-violet-500" />
                      Assigned Topics
                      {visibleStudentTopics.length > 0 && (
                        <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
                          {visibleStudentTopics.length}
                        </span>
                      )}
                    </span>
                  </div>

                  {visibleStudentTopics.length === 0 && (
                    <div className="text-center py-10 text-gray-300 dark:text-gray-600">
                      <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No pending topics</p>
                    </div>
                  )}

                  {visibleStudentTopics.map(t => (
                    <TopicRow key={t.id} topic={t} onToggle={handleToggle} onDelete={handleDelete} isTeacher={isTeacher} />
                  ))}

                  {isStudent && studentDoneCount > 0 && (
                    <button onClick={() => setShowDone(v => !v)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300 transition-colors flex items-center gap-1.5 mt-1">
                      <CheckCircle size={13} className="text-green-500" />
                      {showDone ? 'Hide' : 'Show'} {studentDoneCount} completed
                    </button>
                  )}
                </div>

                {/* AI Suggestions */}
                <div className="space-y-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Lightbulb size={14} className="text-amber-500" />
                    AI Weak-Subject Suggestions
                  </span>

                  {studentPlan.suggestions?.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">No weak subjects detected from marks data</p>
                    </div>
                  )}

                  {studentPlan.suggestions?.map((sg, i) => (
                    <SuggestionCard key={i} suggestion={sg} />
                  ))}
                </div>
              </div>
            )}

            {!studentLoading && !isStudent && !selStudent && (
              <div className="text-center py-12 text-gray-300 dark:text-gray-600">
                <BookOpen size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a student to view their study plan</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <TopicModal
          classes={classes}
          subjects={subjects}
          students={students}
          preClassId={tab === 'class' ? selClass : studentClassId}
          preStudentId={tab === 'student' ? selStudent : undefined}
          onClose={() => setShowModal(false)}
          onSave={handleSaved}
        />
      )}
    </Layout>
  );
}
