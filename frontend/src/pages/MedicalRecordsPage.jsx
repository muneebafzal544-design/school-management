import { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope, Search, X, Plus, Trash2, ChevronDown,
  Heart, Syringe, ClipboardList, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { INPUT_CLS } from '../components/ui/Input';
import { getStudents } from '../api/students';
import {
  getStudentMedical, addVaccination, deleteVaccination,
  addMedicalVisit, deleteMedicalVisit, getMedicalSummary,
} from '../api/medical';
import { useClasses } from '../hooks/useReferenceData';

const inp = INPUT_CLS;
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VaccinationForm({ studentId, onSaved }) {
  const [form, setForm] = useState({ vaccine_name: '', dose_number: '', date_given: '', given_by: '', next_due_date: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vaccine_name) return toast.error('Vaccine name required');
    if (!form.date_given) return toast.error('Date given required');
    setSaving(true);
    try {
      await addVaccination(studentId, form);
      toast.success('Vaccination added');
      setForm({ vaccine_name: '', dose_number: '', date_given: '', given_by: '', next_due_date: '' });
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add vaccination');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 mt-3">
      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Add Vaccination</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.vaccine_name} onChange={e => set('vaccine_name', e.target.value)} placeholder="Vaccine name *" className={inp} />
        <input value={form.dose_number} onChange={e => set('dose_number', e.target.value)} placeholder="Dose #" className={inp} />
        <input type="date" value={form.date_given} onChange={e => set('date_given', e.target.value)} className={inp} />
        <input value={form.given_by} onChange={e => set('given_by', e.target.value)} placeholder="Given by" className={inp} />
        <div className="col-span-2">
          <input type="date" value={form.next_due_date} onChange={e => set('next_due_date', e.target.value)} placeholder="Next due date" className={inp} />
          <p className="text-xs text-slate-400 mt-1">Next due date (optional)</p>
        </div>
      </div>
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add Vaccination'}
      </button>
    </form>
  );
}

function VisitForm({ studentId, onSaved }) {
  const BLANK = { visit_date: '', complaint: '', action_taken: '', referred_to: '', recorded_by: '',
                  leave_from_date: '', leave_to_date: '', has_certificate: false };
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visit_date) return toast.error('Visit date required');
    if (!form.complaint) return toast.error('Complaint required');
    if (form.leave_from_date && form.leave_to_date && form.leave_to_date < form.leave_from_date)
      return toast.error('Leave end date must be on or after start date');
    setSaving(true);
    try {
      const r = await addMedicalVisit(studentId, form);
      const msg = r.data?.message || 'Visit added';
      toast.success(msg);
      setForm(BLANK);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add visit');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 mt-3">
      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Add Medical Visit</p>
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} className={inp} />
        <input value={form.recorded_by} onChange={e => set('recorded_by', e.target.value)} placeholder="Recorded by" className={inp} />
        <div className="col-span-2">
          <input value={form.complaint} onChange={e => set('complaint', e.target.value)} placeholder="Complaint *" className={inp} />
        </div>
        <div className="col-span-2">
          <textarea rows={2} value={form.action_taken} onChange={e => set('action_taken', e.target.value)}
            placeholder="Action taken" className={`${inp} resize-none`} />
        </div>
        <div className="col-span-2">
          <input value={form.referred_to} onChange={e => set('referred_to', e.target.value)} placeholder="Referred to (doctor/hospital)" className={inp} />
        </div>
      </div>

      {/* Medical leave section */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Auto-Excuse Absences (optional)</p>
        <p className="text-xs text-slate-400">If the student was absent during a medical leave, fill in the dates to automatically mark those absences as excused.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Leave From</label>
            <input type="date" value={form.leave_from_date} onChange={e => set('leave_from_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Leave To</label>
            <input type="date" value={form.leave_to_date} onChange={e => set('leave_to_date', e.target.value)} className={inp} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={form.has_certificate} onChange={e => set('has_certificate', e.target.checked)}
            className="rounded" />
          Medical certificate submitted / on file
        </label>
      </div>

      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add Visit'}
      </button>
    </form>
  );
}

function StudentPanel({ student, onClose }) {
  const [medical, setMedical] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVaccForm, setShowVaccForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getStudentMedical(student.id);
      setMedical(r.data?.data ?? r.data ?? null);
    } catch { toast.error('Failed to load medical records'); }
    finally { setLoading(false); }
  }, [student.id]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteVacc = async (id) => {
    try {
      await deleteVaccination(id);
      toast.success('Vaccination deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const handleDeleteVisit = async (id) => {
    try {
      await deleteMedicalVisit(id);
      toast.success('Visit deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const info = medical?.student || student;
  const vaccinations = medical?.vaccinations || [];
  const visits = medical?.visits || [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {(info.full_name || info.name || 'S')[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{info.full_name || info.name}</h2>
              <p className="text-xs text-slate-500">{info.class_name || '—'} · Roll #{info.roll_number || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Medical Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" /> Medical Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Blood Group', info.blood_group],
                  ['Allergies', info.allergies],
                  ['Medical Condition', info.medical_condition],
                  ['Disability', info.disability],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vaccinations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-blue-500" /> Vaccinations ({vaccinations.length})
                </h3>
                <button onClick={() => setShowVaccForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {showVaccForm && (
                <VaccinationForm studentId={student.id} onSaved={() => { setShowVaccForm(false); load(); }} />
              )}
              {vaccinations.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No vaccinations recorded</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase">
                        <th className="text-left px-4 py-2.5 font-semibold">Vaccine</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Dose</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Date Given</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Next Due</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {vaccinations.map(v => (
                        <tr key={v.id} className="group">
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{v.vaccine_name}</td>
                          <td className="px-4 py-2.5 text-slate-500">{v.dose_number || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{fmtDate(v.date_given)}</td>
                          <td className="px-4 py-2.5 text-slate-500">{fmtDate(v.next_due_date)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => handleDeleteVacc(v.id)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Medical Visits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-500" /> Medical Visits ({visits.length})
                </h3>
                <button onClick={() => setShowVisitForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {showVisitForm && (
                <VisitForm studentId={student.id} onSaved={() => { setShowVisitForm(false); load(); }} />
              )}
              {visits.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No visits recorded</p>
              ) : (
                <div className="space-y-3">
                  {visits.map(v => (
                    <div key={v.id} className="group bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-500">{fmtDate(v.visit_date)}</span>
                            {v.recorded_by && <span className="text-xs text-slate-400">· {v.recorded_by}</span>}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{v.complaint}</p>
                          {v.action_taken && <p className="text-xs text-slate-500 mt-1">Action: {v.action_taken}</p>}
                          {v.referred_to && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Referred to: {v.referred_to}</p>}
                          {(v.leave_from_date || v.leave_to_date) && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                              Medical leave: {fmtDate(v.leave_from_date)} → {fmtDate(v.leave_to_date)}
                              {v.has_certificate && <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-700 dark:text-emerald-300">Certificate ✓</span>}
                            </p>
                          )}
                        </div>
                        <button onClick={() => handleDeleteVisit(v.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all ml-3">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MedicalRecordsPage() {
  const { data: classes = [] } = useClasses();
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: 'active', limit: 200 };
      if (classId) params.class_id = classId;
      if (search) params.search = search;
      const r = await getStudents(params);
      const d = r.data?.data ?? r.data ?? [];
      setStudents(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [classId, search]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleExportCSV = async () => {
    try {
      const params = {};
      if (classId) params.class_id = classId;
      const r = await getMedicalSummary(params);
      const data = r.data?.data ?? r.data ?? [];
      if (!Array.isArray(data) || data.length === 0) return toast.error('No data to export');

      const headers = ['Name', 'Class', 'Roll No', 'Blood Group', 'Allergies', 'Medical Condition', 'Disability'];
      const rows = data.map(s => [
        s.full_name || s.name || '',
        s.class_name || '',
        s.roll_number || '',
        s.blood_group || '',
        s.allergies || '',
        s.medical_condition || '',
        s.disability || '',
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nurse-list-${classId || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported successfully');
    } catch { toast.error('Export failed'); }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={Stethoscope}
            title="Medical Records"
            subtitle="Student health & vaccination records"
            actions={
              <button onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Download className="w-4 h-4" /> Export Nurse List
              </button>
            }
          />

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="relative">
                <select value={classId} onChange={e => setClassId(e.target.value)}
                  className="px-3 py-2.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none appearance-none min-w-[160px]">
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Students Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-12 text-center">
              <Stethoscope className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No students found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {students.map(s => (
                <button key={s.id} onClick={() => setSelectedStudent(s)}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                      {(s.full_name || s.name || 'S')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.full_name || s.name}</p>
                      <p className="text-xs text-slate-400">Roll #{s.roll_number || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{s.class_name || '—'}</span>
                    {s.blood_group && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {s.blood_group}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {s.allergies && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Allergies</span>}
                    {s.medical_condition && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Condition</span>}
                    {s.disability && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Disability</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {selectedStudent && (
        <StudentPanel student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </Layout>
  );
}
