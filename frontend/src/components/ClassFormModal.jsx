import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import Button from './ui/Button';
import { GRADES, SECTIONS } from '../constants';
import { getTeachers } from '../api/teachers';

const BLANK = {
  name: '', grade: '', section: '', academic_year: '2024-25',
  room_number: '', capacity: 40, teacher_id: '', description: '', status: 'active',
};

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm placeholder-slate-400 dark:placeholder-slate-600 transition-all';
const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide';

export default function ClassFormModal({ isOpen, onClose, onSubmit, classData }) {
  const [form,     setForm]     = useState(BLANK);
  const [teachers, setTeachers] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const isEdit = Boolean(classData);

  // Load teachers for the dropdown
  useEffect(() => {
    if (!isOpen) return;
    getTeachers({ status: 'active' })
      .then(r => setTeachers(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;
    setForm(classData ? {
      name:          classData.name          || '',
      grade:         classData.grade         || '',
      section:       classData.section       || '',
      academic_year: classData.academic_year || '2024-25',
      room_number:   classData.room_number   || '',
      capacity:      classData.capacity      || 40,
      teacher_id:    classData.teacher_id    ? String(classData.teacher_id) : '',
      description:   classData.description   || '',
      status:        classData.status        || 'active',
    } : BLANK);
  }, [classData, isOpen]);

  // Auto-generate class name from grade + section
  useEffect(() => {
    if (form.grade && form.section) {
      setForm(f => ({ ...f, name: `${form.grade}-${form.section}` }));
    }
  }, [form.grade, form.section]);

  if (!isOpen) return null;

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
        capacity:   Number(form.capacity),
      });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEdit ? 'Edit Class' : 'Create New Class'}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {isEdit ? 'Update class details' : 'Add a new class to the system'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
            <X size={16} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">

              {/* Grade */}
              <div>
                <label className={labelCls}>Grade <span className="text-red-400">*</span></label>
                <select name="grade" value={form.grade} onChange={onChange} required className={inputCls}>
                  <option value="">Select</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className={labelCls}>Section <span className="text-red-400">*</span></label>
                <select name="section" value={form.section} onChange={onChange} required className={inputCls}>
                  <option value="">Select</option>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Class name */}
              <div className="col-span-2">
                <label className={labelCls}>Class Name <span className="text-red-400">*</span></label>
                <input name="name" value={form.name} onChange={onChange} required placeholder="e.g. Class 5-A" className={inputCls} />
              </div>

              {/* Academic year */}
              <div>
                <label className={labelCls}>Academic Year</label>
                <input name="academic_year" value={form.academic_year} onChange={onChange} placeholder="2024-25" className={inputCls} />
              </div>

              {/* Room */}
              <div>
                <label className={labelCls}>Room Number</label>
                <input name="room_number" value={form.room_number} onChange={onChange} placeholder="e.g. 101" className={inputCls} />
              </div>

              {/* Capacity */}
              <div>
                <label className={labelCls}>Capacity</label>
                <input name="capacity" type="number" min="1" max="200" value={form.capacity} onChange={onChange} className={inputCls} />
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" value={form.status} onChange={onChange} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Class teacher — dropdown from Teachers API */}
              <div className="col-span-2">
                <label className={labelCls}>Class Teacher</label>
                <select name="teacher_id" value={form.teacher_id} onChange={onChange} className={inputCls}>
                  <option value="">No teacher assigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}{t.subject ? ` — ${t.subject}` : ''}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1 font-medium">
                    No active teachers found. Add teachers first.
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  name="description" rows={2} value={form.description} onChange={onChange}
                  placeholder="Optional notes…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>
              {isEdit ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
