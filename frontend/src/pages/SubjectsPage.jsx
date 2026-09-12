import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BookOpen, Plus, Pencil, Trash2, X, Check,
  Users, GraduationCap, ChevronDown, Search,
} from 'lucide-react';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import Modal  from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input  from '../components/ui/Input';
import Badge  from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import {
  getSubjects, createSubject, updateSubject, deleteSubject,
  getClassSubjects, assignSubjectToClass, removeSubjectFromClass,
  assignTeacherToSubject, removeTeacherAssignment,
} from '../api/subjects';
import { getClasses }  from '../api/classes';
import { getTeachers } from '../api/teachers';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'subjects',  label: 'Subjects',             icon: BookOpen },
  { id: 'assign',    label: 'Assign to Classes',    icon: Users },
  { id: 'teachers',  label: 'Assign Teachers',      icon: GraduationCap },
];

// ─────────────────────────────────────────────────────────────
//  SubjectsPage
// ─────────────────────────────────────────────────────────────
export default function SubjectsPage() {
  const [tab, setTab] = useState('subjects');

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <PageHeader
          icon={BookOpen}
          title="Subject Management"
          subtitle="Create subjects, assign them to classes, and assign teachers"
        />

        {/* Tabs */}
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {/* Tab panels */}
        {tab === 'subjects' && <SubjectsTab />}
        {tab === 'assign'   && <AssignSubjectsTab />}
        {tab === 'teachers' && <AssignTeachersTab />}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 1 — Subjects master list
// ─────────────────────────────────────────────────────────────
function SubjectsTab() {
  const [subjects, setSubjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);   // null = create mode

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSubjects();
      // axios interceptor already unwraps { success, data: [...] } → data = [...]
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (s)  => { setEditing(s);  setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject? It will also remove all class and teacher assignments.')) return;
    try {
      await deleteSubject(id);
      toast.success('Subject deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-56"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> New Subject
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyBox message="No subjects found. Create your first subject." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
                         p-4 flex items-center justify-between group hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                  style={{ background: subjectColor(s.name) }}
                >
                  {s.code || s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-slate-400 truncate">{s.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(s)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                             dark:hover:bg-indigo-900/20 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50
                             dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <SubjectFormModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  Subject Create / Edit Modal
// ─────────────────────────────────────────────────────────────
function SubjectFormModal({ initial, onClose, onSaved }) {
  const [form, setForm]   = useState({ name: '', code: '', description: '', ...initial });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Subject name is required'); return; }
    setSaving(true);
    try {
      if (initial?.id) {
        await updateSubject(initial.id, form);
        toast.success('Subject updated');
      } else {
        await createSubject(form);
        toast.success('Subject created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={initial?.id ? 'Edit Subject' : 'New Subject'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Subject Name *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Mathematics"
        />
        <Input
          label="Short Code"
          value={form.code || ''}
          onChange={e => set('code', e.target.value)}
          placeholder="e.g. MATH"
        />
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
          <textarea
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
            rows={2}
            placeholder="Optional description…"
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700
                       bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                       px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            <Check size={14} /> {initial?.id ? 'Save Changes' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 2 — Assign subjects to classes
// ─────────────────────────────────────────────────────────────
function AssignSubjectsTab() {
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [assigned, setAssigned] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    Promise.all([getClasses(), getSubjects()])
      .then(([c, s]) => {
        setClasses(Array.isArray(c.data) ? c.data : []);
        setSubjects(Array.isArray(s.data) ? s.data : []);
      })
      .catch(() => {});
  }, []);

  const loadAssigned = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data } = await getClassSubjects(classId);
      setAssigned(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load class subjects');
      setAssigned([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssigned(selClass); }, [selClass, loadAssigned]);

  const isAssigned = (subjectId) => assigned.some(a => a.subject_id === subjectId);

  const toggle = async (subject) => {
    if (!selClass) return;
    const existing = assigned.find(a => a.subject_id === subject.id);
    setSaving(true);
    try {
      if (existing) {
        await removeSubjectFromClass(existing.id);
        toast.success(`${subject.name} removed from class`);
      } else {
        await assignSubjectToClass(selClass, { subject_id: subject.id });
        toast.success(`${subject.name} assigned to class`);
      }
      loadAssigned(selClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Class selector */}
      <div className="max-w-xs">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Select Class</label>
        <div className="relative">
          <select
            value={selClass}
            onChange={e => setSelClass(e.target.value)}
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

      {!selClass ? (
        <EmptyBox message="Select a class above to manage its subjects." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click a subject to toggle it on/off for this class. Changes apply immediately.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjects.map(s => {
              const on = isAssigned(s.id);
              return (
                <button
                  key={s.id}
                  disabled={saving}
                  onClick={() => toggle(s)}
                  className={[
                    'flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 text-sm font-medium',
                    'transition-all duration-150 disabled:opacity-60',
                    on
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-300',
                  ].join(' ')}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: subjectColor(s.name) }}
                  >
                    {s.code || s.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate">{s.name}</span>
                  {on && <Check size={13} className="ml-auto shrink-0 text-indigo-500" />}
                </button>
              );
            })}
          </div>

          {assigned.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {assigned.length} subject{assigned.length !== 1 ? 's' : ''} assigned to this class.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TAB 3 — Assign teachers to subjects (per class)
// ─────────────────────────────────────────────────────────────
function AssignTeachersTab() {
  const [classes,  setClasses]  = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [assigned, setAssigned] = useState([]);   // class subjects with teacher info
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    Promise.all([getClasses(), getTeachers()])
      .then(([c, t]) => {
        setClasses(Array.isArray(c.data) ? c.data : []);
        setTeachers(Array.isArray(t.data) ? t.data : []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data } = await getClassSubjects(classId);
      setAssigned(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load class subjects');
      setAssigned([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selClass); }, [selClass, load]);

  const handleTeacherChange = async (row, teacherId) => {
    if (!teacherId) {
      // unassign
      if (row.teacher_id) {
        try {
          // find tsa id — we need it; re-fetch or derive from the assignment
          // Easiest: call assign with same teacher to get the id, then delete
          // Instead, use a dedicated unassign by subject+class
          const res = await assignTeacherToSubject({
            teacher_id: teacherId || null,
            subject_id: row.subject_id,
            class_id:   selClass,
          });
          toast.success('Teacher unassigned');
          load(selClass);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed');
        }
      }
      return;
    }

    try {
      await assignTeacherToSubject({
        teacher_id: Number(teacherId),
        subject_id: row.subject_id,
        class_id:   Number(selClass),
      });
      toast.success(`Teacher assigned to ${row.subject_name}`);
      load(selClass);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* Class selector */}
      <div className="max-w-xs">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Select Class</label>
        <div className="relative">
          <select
            value={selClass}
            onChange={e => setSelClass(e.target.value)}
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

      {!selClass ? (
        <EmptyBox message="Select a class to assign teachers to its subjects." />
      ) : loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : assigned.length === 0 ? (
        <EmptyBox message="No subjects assigned to this class yet. Go to 'Assign to Classes' first." />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Teacher</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-56">Change Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {assigned.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: subjectColor(row.subject_name) }}
                      >
                        {row.subject_code || row.subject_name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{row.subject_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.teacher_name ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {row.teacher_name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative max-w-[200px]">
                      <select
                        value={row.teacher_id || ''}
                        onChange={e => handleTeacherChange(row, e.target.value)}
                        className="w-full appearance-none text-sm rounded-lg border border-slate-200 dark:border-slate-700
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                                   px-3 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="">— Select teacher —</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────
function EmptyBox({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-400 dark:text-slate-600 gap-3">
      <BookOpen size={32} strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}

const SUBJECT_COLORS = {
  mathematics: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  english:     'linear-gradient(135deg,#06b6d4,#3b82f6)',
  science:     'linear-gradient(135deg,#10b981,#14b8a6)',
  computer:    'linear-gradient(135deg,#f59e0b,#f97316)',
  urdu:        'linear-gradient(135deg,#ec4899,#f43f5e)',
  islamiat:    'linear-gradient(135deg,#84cc16,#10b981)',
};

function subjectColor(name = '') {
  const key = name.toLowerCase();
  return SUBJECT_COLORS[key] || 'linear-gradient(135deg,#94a3b8,#64748b)';
}
