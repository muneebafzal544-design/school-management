import { useEffect, useRef, useState } from 'react';
import { X, GraduationCap, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from './ui/Button';
import { QUALIFICATIONS, GRADES } from '../constants';
import { uploadTeacherPhoto } from '../api/teachers';

const BLANK = {
  full_name: '', email: '', phone: '', gender: '',
  date_of_birth: '', qualification: '', subject: '',
  join_date: '', status: 'active', address: '',
  assigned_grades: [],
  salary: '', designation: '', employee_id: '',
};

const inputCls   = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-500 text-sm placeholder-slate-400 dark:placeholder-slate-600 transition-all';
const labelCls   = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide';
const sectionCls = 'grid grid-cols-2 gap-3';

export default function TeacherFormModal({ isOpen, onClose, onSubmit, teacherData }) {
  const [form,         setForm]         = useState(BLANK);
  const [loading,      setLoading]      = useState(false);
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef();
  const isEdit = Boolean(teacherData);

  useEffect(() => {
    if (!isOpen) return;
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm(teacherData ? {
      full_name:       teacherData.full_name       || '',
      email:           teacherData.email           || '',
      phone:           teacherData.phone           || '',
      gender:          teacherData.gender          || '',
      date_of_birth:   teacherData.date_of_birth?.split('T')[0] || '',
      qualification:   teacherData.qualification   || '',
      subject:         teacherData.subject         || '',
      join_date:       teacherData.join_date?.split('T')[0]      || '',
      status:          teacherData.status          || 'active',
      address:         teacherData.address         || '',
      assigned_grades: teacherData.assigned_grades || [],
      salary:          teacherData.salary          != null ? String(teacherData.salary) : '',
      designation:     teacherData.designation     || '',
      employee_id:     teacherData.employee_id     || '',
    } : BLANK);
  }, [teacherData, isOpen]);

  if (!isOpen) return null;

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const toggleGrade = grade =>
    setForm(f => ({
      ...f,
      assigned_grades: f.assigned_grades.includes(grade)
        ? f.assigned_grades.filter(g => g !== grade)
        : [...f.assigned_grades, grade],
    }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const initials = (form.full_name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const currentPhoto = photoPreview || (isEdit ? teacherData?.photo_url : null);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const teacher = await onSubmit(form);
      // Upload photo if one was selected
      if (photoFile && teacher?.id) {
        try {
          const fd = new FormData();
          fd.append('photo', photoFile);
          await uploadTeacherPhoto(teacher.id, fd);
        } catch {
          toast.error('Teacher saved but photo upload failed — try again from the profile page.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {isEdit ? 'Update teacher profile' : 'Register a new staff member'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">

            {/* ── Photo picker ── */}
            <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="relative group shrink-0 cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {currentPhoto
                  ? <img src={currentPhoto} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow" />
                  : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold shadow"
                      style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                      {initials}
                    </div>
                }
                <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Profile Photo</p>
                <p className="text-xs text-slate-400 mt-0.5">Optional · JPG, PNG or WebP · max 5 MB</p>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <Camera size={11} />
                  {photoPreview ? 'Change Photo' : currentPhoto ? 'Change Photo' : 'Select Photo'}
                </button>
                {photoFile && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 truncate max-w-48">{photoFile.name}</p>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Personal */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3">
                Personal Information
              </p>
              <div className={sectionCls}>
                <div className="col-span-2">
                  <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                  <input name="full_name" value={form.full_name} onChange={onChange} required placeholder="e.g. Mr. Imran Ahmed" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Gender <span className="text-red-400">*</span></label>
                  <select name="gender" value={form.gender} onChange={onChange} required className={inputCls}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={onChange} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address</label>
                  <input name="address" value={form.address} onChange={onChange} placeholder="Street, City" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3">
                Contact
              </p>
              <div className={sectionCls}>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input name="phone" value={form.phone} onChange={onChange} placeholder="+92 300 1234567" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input name="email" type="email" value={form.email} onChange={onChange} placeholder="teacher@school.edu" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Professional */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3">
                Professional
              </p>
              <div className={sectionCls}>
                <div>
                  <label className={labelCls}>Subject / Specialization</label>
                  <input name="subject" value={form.subject} onChange={onChange} placeholder="e.g. Mathematics" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Qualification</label>
                  <select name="qualification" value={form.qualification} onChange={onChange} className={inputCls}>
                    <option value="">Select</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Designation</label>
                  <input name="designation" value={form.designation} onChange={onChange} placeholder="e.g. Senior Teacher" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Employee ID</label>
                  <input name="employee_id" value={form.employee_id} onChange={onChange} placeholder="e.g. EMP-001" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Monthly Salary (PKR)</label>
                  <input name="salary" type="number" min="0" step="1" value={form.salary} onChange={onChange} placeholder="e.g. 45000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Join Date</label>
                  <input name="join_date" type="date" value={form.join_date} onChange={onChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select name="status" value={form.status} onChange={onChange} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assigned grades */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3">
                Assigned Grades
              </p>
              <div className="flex flex-wrap gap-2">
                {GRADES.map(grade => {
                  const selected = form.assigned_grades.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGrade(grade)}
                      className={[
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        selected
                          ? 'text-white border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700',
                      ].join(' ')}
                      style={selected ? { background: 'linear-gradient(135deg, #059669, #0d9488)' } : {}}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              loading={loading}
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
            >
              {isEdit ? 'Save Changes' : 'Add Teacher'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
