import { useEffect, useState, useCallback } from 'react';
import {
  Users, UserCheck, UserX, Plus, Search, X, Pencil, Trash2,
  Briefcase, Phone, Mail, CreditCard, CalendarCheck, Wallet,
  ChevronRight, Building2, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
  getStaff, createStaff, updateStaff, deleteStaff,
  getStaffAttendance, bulkStaffAttendance,
  getStaffSalary, generateStaffSalary, updateStaffSalary,
} from '../api/staff';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DESIGNATIONS = [
  'Accountant','Administrator','Canteen Staff','Cleaner','Driver',
  'Guard / Security','IT Support','Lab Assistant','Librarian',
  'Office Clerk','Peon','Principal','Receptionist','Vice Principal',
];

const DEPARTMENTS = ['Admin','Canteen','Finance','IT','Library','Maintenance','Security','Transport','Other'];

const STATUS_STYLES = {
  active:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  inactive:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  terminated:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const ATT_STYLES = {
  present:  'bg-emerald-500',
  absent:   'bg-red-500',
  late:     'bg-amber-500',
  half_day: 'bg-orange-400',
  leave:    'bg-blue-400',
};

const ATT_OPTIONS = ['present','absent','late','half_day','leave'];

function initForm() {
  return { full_name:'', designation:'', department:'', phone:'', email:'', cnic:'',
           base_salary:'', join_date:'', status:'active', photo_url:'', notes:'' };
}

// ── Staff Form Modal ──────────────────────────────────────────────────────────

function StaffFormModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState(member ? { ...member } : initForm());
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.designation.trim()) {
      toast.error('Name and designation are required.');
      return;
    }
    setSaving(true);
    try {
      const saved = member
        ? (await updateStaff(member.id, form)).data
        : (await createStaff(form)).data;
      onSaved(saved, !member);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Save failed.');
    } finally { setSaving(false); }
  };

  const field = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        {...opts}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Briefcase size={18} />
            </div>
            <h2 className="font-bold">{member ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition"><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Full Name', 'full_name', 'text', { required: true })}

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Designation</label>
            <input
              list="desig-list"
              value={form.designation}
              onChange={e => set('designation', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <datalist id="desig-list">{DESIGNATIONS.map(d => <option key={d} value={d}/>)}</datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
            <select
              value={form.department ?? ''}
              onChange={e => set('department', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Select —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {field('Phone', 'phone', 'tel')}
          {field('Email', 'email', 'email')}
          {field('CNIC', 'cnic')}
          {field('Base Salary (PKR)', 'base_salary', 'number', { min: 0 })}
          {field('Joining Date', 'join_date', 'date')}

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function StaffDrawer({ member, onClose, onEdit }) {
  const [tab, setTab] = useState('profile');
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear, setAttYear]   = useState(new Date().getFullYear());
  const [attendance, setAttendance]   = useState([]);
  const [salaryList, setSalaryList]   = useState([]);
  const [salMonth, setSalMonth] = useState(new Date().getMonth() + 1);
  const [salYear, setSalYear]   = useState(new Date().getFullYear());
  const [markDate, setMarkDate] = useState(new Date().toISOString().slice(0,10));
  const [markStatus, setMarkStatus] = useState('present');
  const [marking, setMarking] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  const loadAtt = useCallback(async () => {
    try {
      const { data } = await getStaffAttendance(member.id, { month: attMonth, year: attYear });
      setAttendance(data);
    } catch { /* ignore */ }
  }, [member.id, attMonth, attYear]);

  const loadSal = useCallback(async () => {
    try {
      const { data } = await getStaffSalary({ month: salMonth, year: salYear });
      setSalaryList(data.filter(s => s.staff_id === member.id));
    } catch { /* ignore */ }
  }, [member.id, salMonth, salYear]);

  useEffect(() => { if (tab === 'attendance') loadAtt(); }, [tab, loadAtt]);
  useEffect(() => { if (tab === 'salary') loadSal(); }, [tab, loadSal]);

  const markAttendance = async () => {
    setMarking(true);
    try {
      await bulkStaffAttendance({ date: markDate, records: [{ staff_id: member.id, status: markStatus }] });
      toast.success('Attendance marked.');
      loadAtt();
    } catch { toast.error('Failed to mark.'); }
    finally { setMarking(false); }
  };

  const generateSal = async () => {
    setGenLoading(true);
    try {
      await generateStaffSalary({ month: salMonth, year: salYear });
      toast.success('Salary generated.');
      loadSal();
    } catch { toast.error('Generate failed.'); }
    finally { setGenLoading(false); }
  };

  const markPaid = async (id) => {
    try {
      await updateStaffSalary(id, { status: 'paid', paid_on: new Date().toISOString().slice(0,10) });
      toast.success('Marked as paid.');
      loadSal();
    } catch { toast.error('Update failed.'); }
  };

  // Build attendance grid
  const daysInMonth = new Date(attYear, attMonth, 0).getDate();
  const attMap = Object.fromEntries(attendance.map(a => [a.date.slice(0,10), a.status]));

  const TABS = [
    { key: 'profile',    label: 'Profile',    icon: Briefcase },
    { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { key: 'salary',     label: 'Salary',     icon: Wallet },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
              {member.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold leading-tight">{member.full_name}</p>
              <p className="text-indigo-200 text-xs">{member.designation}{member.department ? ` · ${member.department}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-1.5 hover:bg-white/20 rounded-lg transition"><Pencil size={16}/></button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition"><X size={18}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <t.icon size={14}/> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="space-y-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[member.status] ?? STATUS_STYLES.inactive}`}>
                {member.status}
              </div>
              {[
                [Phone, 'Phone', member.phone],
                [Mail, 'Email', member.email],
                [CreditCard, 'CNIC', member.cnic],
                [CalendarCheck, 'Joined', member.join_date ? new Date(member.join_date).toLocaleDateString() : '—'],
                [DollarSign, 'Base Salary', member.base_salary ? `PKR ${Number(member.base_salary).toLocaleString()}` : '—'],
              ].map(([Icon, label, value]) => value ? (
                <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <Icon size={16} className="text-indigo-500 shrink-0"/>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
                  </div>
                </div>
              ) : null)}
              {member.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{member.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex gap-2 flex-wrap">
                <select value={attMonth} onChange={e => setAttMonth(+e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={attYear} onChange={e => setAttYear(+e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {['S','M','T','W','T','F','S'].map((d,i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                ))}
                {/* offset */}
                {Array.from({ length: new Date(attYear, attMonth - 1, 1).getDay() }).map((_,i) => (
                  <div key={`off${i}`}/>
                ))}
                {Array.from({ length: daysInMonth }).map((_,i) => {
                  const day = i + 1;
                  const dateStr = `${attYear}-${String(attMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const s = attMap[dateStr];
                  return (
                    <div key={day} title={s ?? 'not marked'} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                      s ? `${ATT_STYLES[s]} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {day}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-3 flex-wrap text-xs">
                {ATT_OPTIONS.map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${ATT_STYLES[s]}`}/>
                    <span className="capitalize text-slate-600 dark:text-slate-400">{s.replace('_',' ')}</span>
                  </div>
                ))}
              </div>

              {/* Quick mark */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Mark Attendance</p>
                <div className="flex gap-2 flex-wrap">
                  <input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"/>
                  <select value={markStatus} onChange={e => setMarkStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                    {ATT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                  <button onClick={markAttendance} disabled={marking}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium">
                    {marking ? '…' : 'Mark'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Salary Tab */}
          {tab === 'salary' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <select value={salMonth} onChange={e => setSalMonth(+e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={salYear} onChange={e => setSalYear(+e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={generateSal} disabled={genLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium">
                  {genLoading ? 'Generating…' : 'Generate'}
                </button>
              </div>

              {salaryList.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No salary record for this period.</p>
              ) : salaryList.map(p => (
                <div key={p.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{MONTHS[p.month - 1]} {p.year}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                         : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    }`}>{p.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      ['Base', `PKR ${Number(p.base_salary).toLocaleString()}`],
                      ['Absent', `${p.absent_days}d`],
                      ['Late', `${p.late_days}d`],
                      ['Leave Deduction', `- PKR ${Number(p.leave_deduction).toLocaleString()}`],
                      ['Late Deduction', `- PKR ${Number(p.late_deduction).toLocaleString()}`],
                      ['Bonus', `+ PKR ${Number(p.bonus || 0).toLocaleString()}`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{l}</span>
                        <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between">
                    <p className="font-bold text-slate-800 dark:text-slate-100">PKR {Number(p.net_salary).toLocaleString()}</p>
                    {p.status === 'pending' && (
                      <button onClick={() => markPaid(p.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium">
                        Mark Paid
                      </button>
                    )}
                    {p.paid_on && <p className="text-xs text-slate-400">Paid {new Date(p.paid_on).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [selected, setSelected] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // null=closed, false=new, object=edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await getStaff({ status: filterStatus || undefined, department: filterDept || undefined });
      setStaff(data);
    } catch { toast.error('Failed to load staff.'); }
    finally { setLoading(false); }
  }, [filterStatus, filterDept]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const filtered = staff.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.designation?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = (saved, isNew) => {
    if (isNew) { setStaff(p => [saved, ...p]); toast.success('Staff member added.'); }
    else { setStaff(p => p.map(s => s.id === saved.id ? saved : s)); toast.success('Updated.'); }
  };

  const handleDelete = async () => {
    try {
      await deleteStaff(deleteTarget.id);
      setStaff(p => p.filter(s => s.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      toast.success('Deleted.');
    } catch { toast.error('Delete failed.'); }
    finally { setDeleteTarget(null); }
  };

  // Stats
  const active   = staff.filter(s => s.status === 'active').length;
  const inactive = staff.filter(s => s.status !== 'active').length;
  const depts    = [...new Set(staff.map(s => s.department).filter(Boolean))].length;

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={20} className="text-indigo-300"/>
                <h1 className="text-xl font-bold">Non-Teaching Staff</h1>
              </div>
              <p className="text-indigo-200 text-sm">Manage support staff, attendance &amp; salaries</p>
            </div>
            <button
              onClick={() => setFormTarget(false)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 transition shadow"
            >
              <Plus size={16}/> Add Staff
            </button>
          </div>

          {/* Stat pills */}
          <div className="flex gap-3 mt-5 flex-wrap">
            {[
              [UserCheck, active, 'Active', 'bg-white/15'],
              [UserX, inactive, 'Inactive', 'bg-white/10'],
              [Building2, depts, 'Departments', 'bg-white/10'],
              [Users, staff.length, 'Total', 'bg-white/10'],
            ].map(([Icon, val, label, bg]) => (
              <div key={label} className={`flex items-center gap-2 ${bg} backdrop-blur-sm rounded-xl px-4 py-2`}>
                <Icon size={16} className="text-indigo-200"/>
                <span className="text-lg font-bold">{val}</span>
                <span className="text-indigo-200 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or designation…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff found"
            description={staff.length === 0 ? 'Add your first non-teaching staff member to get started.' : 'Try adjusting your filters.'}
            actionLabel={staff.length === 0 ? 'Add Staff' : undefined}
            onAction={staff.length === 0 ? () => setFormTarget(false) : undefined}
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    {['Name','Designation','Department','Phone','Salary','Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(s => (
                    <tr key={s.id}
                      onClick={() => setSelected(s)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                            {s.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-100">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.designation}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.department || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {s.base_salary ? `PKR ${Number(s.base_salary).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[s.status] ?? STATUS_STYLES.inactive}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setFormTarget(s)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 transition">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition">
                            <Trash2 size={14}/>
                          </button>
                          <button onClick={() => setSelected(s)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition">
                            <ChevronRight size={14}/>
                          </button>
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

      {/* Modals */}
      {formTarget !== null && (
        <StaffFormModal
          member={formTarget || null}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {selected && (
        <StaffDrawer
          member={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setFormTarget(selected); setSelected(null); }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Staff Member"
        message={`Are you sure you want to delete ${deleteTarget?.full_name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </Layout>
  );
}
