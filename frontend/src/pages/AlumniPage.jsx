import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Plus, Pencil, Trash2, X, Search,
  ChevronDown, RefreshCw, MapPin, BookOpen, Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { INPUT_CLS as inp } from '../components/ui/Input';
import { ModalHeader } from '../components/ui/Modal';
import { getStudents } from '../api/students';
import { getAlumni, graduateStudent, updateAlumni, deleteAlumni } from '../api/alumni';
const currentYear = new Date().getFullYear();

function AlumniModal({ alumni, onClose, onSaved }) {
  const isEdit = !!alumni;
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [form, setForm] = useState(
    alumni ? {
      graduation_year: alumni.graduation_year || currentYear,
      batch_label: alumni.batch_label || '',
      university: alumni.university || '',
      program: alumni.program || '',
      city: alumni.city || '',
      contact: alumni.contact || '',
    } : {
      student_id: '',
      graduation_year: currentYear,
      batch_label: '',
      university: '',
      program: '',
      city: '',
      contact: '',
    }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isEdit) {
      getStudents({ status: 'active', limit: 200, search: studentSearch || undefined })
        .then(r => { const d = r.data?.data ?? r.data ?? []; setStudents(Array.isArray(d) ? d : []); })
        .catch(() => {});
    }
  }, [isEdit, studentSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.student_id) return toast.error('Select a student');
    if (!form.graduation_year) return toast.error('Graduation year required');
    setSaving(true);
    try {
      if (isEdit) {
        await updateAlumni(alumni.id, form);
        toast.success('Alumni updated');
      } else {
        await graduateStudent(form);
        toast.success('Student graduated');
      }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalHeader title={isEdit ? 'Edit Alumni' : 'Graduate Student'} onClose={onClose} sticky />
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search active students…"
                    className={`${inp} pl-9`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Student *</label>
                <div className="relative">
                  <select value={form.student_id} onChange={e => set('student_id', e.target.value)} className={`${inp} appearance-none pr-8`}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.name} — {s.class_name || '—'}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Graduation Year *</label>
              <input type="number" min="1990" max={currentYear + 5} value={form.graduation_year}
                onChange={e => set('graduation_year', Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch Label</label>
              <input value={form.batch_label} onChange={e => set('batch_label', e.target.value)} placeholder="e.g. Class of 2024" className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">University / College</label>
            <input value={form.university} onChange={e => set('university', e.target.value)} placeholder="University name" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Program / Course</label>
            <input value={form.program} onChange={e => set('program', e.target.value)} placeholder="e.g. BS Computer Science" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contact</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Phone / email" className={inp} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Graduate Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AlumniPage() {
  const [alumniList, setAlumniList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (yearFilter) params.graduation_year = yearFilter;
      const r = await getAlumni(params);
      const d = r.data?.data ?? r.data ?? [];
      setAlumniList(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load alumni'); }
    finally { setLoading(false); }
  }, [search, yearFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAlumni(deleteTarget.id);
      toast.success('Alumni deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  // Build year options from alumni data
  const years = [...new Set(alumniList.map(a => a.graduation_year).filter(Boolean))].sort((a, b) => b - a);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={GraduationCap}
            title="Alumni"
            subtitle="Track graduated students"
            actions={
              <div className="flex items-center gap-2">
                <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setModal('new')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> Graduate Student
                </button>
              </div>
            }
          />

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-400" /></button>}
              </div>
              <div className="relative">
                <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                  className="px-3 py-2.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none appearance-none min-w-[160px]">
                  <option value="">All Years</option>
                  {[...Array(10)].map((_, i) => currentYear - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Alumni Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alumniList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No alumni found</p>
              <button onClick={() => setModal('new')} className="mt-4 text-indigo-600 hover:underline text-sm font-medium">
                + Graduate first student
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {alumniList.map(a => (
                <div key={a.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 group hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}>
                        {(a.student_name || a.full_name || 'A')[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{a.student_name || a.full_name || '—'}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mt-0.5">
                          <GraduationCap className="w-3 h-3" /> {a.graduation_year || '—'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal(a)} className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {a.batch_label && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{a.batch_label}</p>
                    )}
                    {a.university && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{a.university}{a.program ? ` · ${a.program}` : ''}</span>
                      </div>
                    )}
                    {a.city && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{a.city}</span>
                      </div>
                    )}
                    {a.contact && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{a.contact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {modal && (
        <AlumniModal
          alumni={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Delete Alumni?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">{deleteTarget.student_name || deleteTarget.full_name}'s alumni record will be permanently deleted.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
