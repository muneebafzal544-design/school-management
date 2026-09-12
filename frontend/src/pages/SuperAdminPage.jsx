import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, X, Eye, EyeOff, Key, ChevronDown,
  BarChart3, Users, Zap, Crown, Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { getSchoolStats, listSchools, createSchool, updateSchool, resetSchoolAdmin } from '../api/schools';

// ── helpers ───────────────────────────────────────────────────────────────────
const PKR = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const PLAN_STYLE = {
  standard:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  pro:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};
const STATUS_STYLE = {
  active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const INPUT = 'w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all';
const SEL   = `${INPUT} appearance-none pr-8`;

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Create School Slide-out ───────────────────────────────────────────────────
function CreateSchoolPanel({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', school_code: '', city: '', phone: '', email: '',
    admin_username: 'admin', admin_password: '', plan: 'standard',
  });
  const [showPw,  setShowPw]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [codeErr, setCodeErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-suggest code from name
  useEffect(() => {
    if (form.name && !form.school_code) {
      const words  = form.name.trim().split(/\s+/);
      const initials = words.map(w => w[0]).join('').toUpperCase().slice(0, 6);
      set('school_code', initials);
    }
  }, [form.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())         return toast.error('School name required');
    if (!form.school_code.trim())  return toast.error('School code required');
    if (!form.admin_password)      return toast.error('Admin password required');
    if (form.admin_password.length < 8) return toast.error('Password must be 8+ characters');

    setSaving(true);
    try {
      const res  = await createSchool(form);
      const data = res.data?.data ?? res.data;
      toast.success(`"${data.name}" provisioned! Schema: ${data.schema}`);
      onCreated();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create school';
      if (msg.toLowerCase().includes('code') || msg.toLowerCase().includes('name')) setCodeErr(msg);
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white text-base">Create New School</h2>
            <p className="text-xs text-slate-400 mt-0.5">Provisions a new isolated database schema</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* School Info */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">School Info</p>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">School Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Green Valley Public School" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">School Code *</label>
              <input value={form.school_code} onChange={e => { set('school_code', e.target.value.toUpperCase()); setCodeErr(''); }}
                placeholder="e.g. GVPS" maxLength={10}
                className={`${INPUT} font-mono tracking-widest uppercase`} />
              {codeErr && <p className="text-xs text-red-500 mt-1">{codeErr}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)}
                placeholder="Lahore" className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="03XX-XXXXXXX" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="school@example.com" className={INPUT} />
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Subscription Plan</label>
            <div className="relative">
              <select value={form.plan} onChange={e => set('plan', e.target.value)} className={SEL}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Admin Account */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Admin Account</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Admin Username</label>
            <input value={form.admin_username} onChange={e => set('admin_username', e.target.value)}
              placeholder="admin" className={INPUT} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Admin Password *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.admin_password}
                onChange={e => set('admin_password', e.target.value)}
                placeholder="Min 8 characters" className={`${INPUT} pr-10`} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
            <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold mb-1">What happens next:</p>
            <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-0.5 list-disc list-inside">
              <li>New PostgreSQL schema created: <code>school_{'{slug}'}</code></li>
              <li>All {'>'}58 migrations run automatically</li>
              <li>Admin user created inside the school</li>
              <li>School code activated for login</li>
            </ul>
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Provisioning…</>
              : <><Plus size={15} /> Create School</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Edit / Reset Panel ────────────────────────────────────────────────────────
function EditSchoolPanel({ school, onClose, onSaved }) {
  const [form,    setForm]    = useState({ plan: school.plan, status: school.status, expires_at: school.expires_at?.slice(0, 10) || '', max_students: school.max_students });
  const [pwForm,  setPwForm]  = useState({ admin_username: 'admin', new_password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSchool(school.id, form);
      toast.success('School updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPw = async () => {
    if (!pwForm.new_password || pwForm.new_password.length < 8) {
      toast.error('Password must be 8+ characters');
      return;
    }
    setResetting(true);
    try {
      await resetSchoolAdmin(school.id, pwForm);
      toast.success('Admin password reset');
      setPwForm(f => ({ ...f, new_password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white text-base">{school.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Code: {school.school_code} · Schema: school_{school.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Plan & Status */}
          <form onSubmit={handleUpdate} className="space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subscription</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Plan</label>
                <div className="relative">
                  <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className={SEL}>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
                <div className="relative">
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={SEL}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expires On</label>
                <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Max Students</label>
                <input type="number" min="1" value={form.max_students} onChange={e => setForm(f => ({ ...f, max_students: Number(e.target.value) }))} className={INPUT} />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          {/* Reset Admin Password */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Key size={12} /> Reset Admin Password
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Admin Username</label>
              <input value={pwForm.admin_username} onChange={e => setPwForm(f => ({ ...f, admin_username: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={pwForm.new_password}
                  onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                  placeholder="Min 8 characters" className={`${INPUT} pr-10`} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button onClick={handleResetPw} disabled={resetting}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Key size={14} /> {resetting ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const [stats,       setStats]       = useState(null);
  const [schools,     setSchools]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editSchool,  setEditSchool]  = useState(null);
  const [filterPlan,  setFilterPlan]  = useState('');
  const [filterStatus,setFilterStatus]= useState('');
  const [search,      setSearch]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, schoolsRes] = await Promise.all([
        getSchoolStats(),
        listSchools(),
      ]);
      setStats(statsRes.data?.data ?? statsRes.data);
      const d = schoolsRes.data?.data ?? schoolsRes.data ?? [];
      setSchools(Array.isArray(d) ? d : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = schools.filter(s => {
    if (filterPlan   && s.plan   !== filterPlan)   return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) ||
             s.school_code.toLowerCase().includes(q) ||
             (s.city || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Layout>
      {showCreate && (
        <CreateSchoolPanel
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {editSchool && (
        <EditSchoolPanel
          school={editSchool}
          onClose={() => setEditSchool(null)}
          onSaved={load}
        />
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown size={20} className="text-amber-500" />
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Super Admin</h1>
              </div>
              <p className="text-sm text-slate-400">Platform management — all tenant schools</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Plus size={16} /> Create School
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Total Schools" value={stats?.total}
              color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500"
              sub={`${stats?.expired || 0} expired`} />
            <StatCard icon={CheckCircle2} label="Active" value={stats?.active}
              color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
              sub="Currently live" />
            <StatCard icon={XCircle} label="Suspended" value={stats?.suspended}
              color="bg-red-50 dark:bg-red-900/20 text-red-500"
              sub="Access blocked" />
            <StatCard icon={Crown} label="Pro / Enterprise" value={Number(stats?.plan_pro || 0) + Number(stats?.plan_enterprise || 0)}
              color="bg-amber-50 dark:bg-amber-900/20 text-amber-500"
              sub={`${stats?.plan_standard || 0} on Standard`} />
          </div>

          {/* Filter bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, code, city…"
                className="flex-1 min-w-[200px] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="relative">
                <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-7 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">All Plans</option>
                  <option value="standard">Standard</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-7 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button onClick={load} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <span className="text-xs text-slate-400 ml-auto">{filtered.length} schools</span>
            </div>
          </div>

          {/* Schools table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400">No schools found</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 text-indigo-500 text-sm font-semibold hover:underline">
                  Create your first school →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">School</th>
                      <th className="text-left px-4 py-3 font-semibold">Code</th>
                      <th className="text-left px-4 py-3 font-semibold">Plan</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Schema</th>
                      <th className="text-left px-4 py-3 font-semibold">Expires</th>
                      <th className="text-left px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map(s => (
                      <tr key={s.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                              {s.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-white">{s.name}</p>
                              {s.city && <p className="text-[11px] text-slate-400">{s.city}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <code className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-indigo-600 dark:text-indigo-400">
                            {s.school_code}
                          </code>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${PLAN_STYLE[s.plan] || PLAN_STYLE.standard}`}>
                            {s.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[s.status] || STATUS_STYLE.active}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${s.schema_exists ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <code className="text-[10px] text-slate-500 dark:text-slate-400">school_{s.slug}</code>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {s.expires_at
                            ? <span className={new Date(s.expires_at) < new Date() ? 'text-red-500 font-semibold' : ''}>
                                {fmtDate(s.expires_at)}
                              </span>
                            : <span className="text-slate-400">No expiry</span>
                          }
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">{fmtDate(s.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setEditSchool(s)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-all"
                          >
                            <Settings size={12} /> Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
