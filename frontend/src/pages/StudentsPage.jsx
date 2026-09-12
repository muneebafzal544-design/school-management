import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, UserCheck, TrendingUp, Filter, X, Pencil, Trash2, Mail, Phone, CreditCard, ArrowUpCircle, FileText, BarChart2, Printer, Upload, Download, KeyRound, Copy, Check, ShieldCheck, AlertTriangle, Loader2, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout          from '../components/layout/Layout';
import { SELECT_CLS }  from '../components/ui/Input';
import { StatCard } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Modal';
import ImportModal from '../components/ui/ImportModal';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { getStudents, deleteStudent, resetStudentCredentials, promoteStudents, getStudentImportTemplate, importStudents, exportStudents, getParentCredentials, resetParentCredentials } from '../api/students';
import Pagination from '../components/ui/Pagination';
import { getClasses } from '../api/classes';
import { useDebounce } from '../hooks/useDebounce';
import { formatDate, toPct, downloadBlob } from '../utils';

/* ── Student Credential Reveal Modal ── */
function StudentCredentialModal({ student, onClose }) {
  const [tab,           setTab]           = useState('student'); // 'student' | 'parent'
  const [loading,       setLoading]       = useState(false);
  const [creds,         setCreds]         = useState(null);
  const [copied,        setCopied]        = useState('');
  // parent tab
  const [parentInfo,    setParentInfo]    = useState(null);  // existing parent account info
  const [parentLoading, setParentLoading] = useState(false);
  const [parentReset,   setParentReset]   = useState(null);  // new credentials after reset
  const [pCopied,       setPCopied]       = useState('');

  // Load parent account info when parent tab is first opened
  useEffect(() => {
    if (tab !== 'parent' || parentInfo !== null) return;
    setParentLoading(true);
    getParentCredentials(student.id)
      .then(r => setParentInfo(r.data || r))
      .catch(() => setParentInfo(false))
      .finally(() => setParentLoading(false));
  }, [tab, student.id, parentInfo]);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 2000);
    });
  };
  const pcopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setPCopied(key); setTimeout(() => setPCopied(''), 2000);
    });
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const r = await resetStudentCredentials(student.id);
      setCreds(r.data?.credentials);
      toast.success('Credentials reset successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  const handleParentReset = async () => {
    setParentLoading(true);
    try {
      const r = await resetParentCredentials(student.id);
      const payload = r.data || r;
      setParentReset(payload.credentials || payload);
      setParentInfo(null); // force reload on next open
      toast.success(payload.isNew ? 'Parent account created' : 'Parent password reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setParentLoading(false); }
  };

  const tabCls = (t) =>
    `flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
      tab === t
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-600 to-purple-500 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <KeyRound size={17} />
            </div>
            <div>
              <h2 className="font-bold text-sm">Login Credentials</h2>
              <p className="text-indigo-100 text-xs mt-0.5">{student.full_name}</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 px-5 pt-4 pb-0 bg-white dark:bg-slate-900">
          <button className={tabCls('student')} onClick={() => setTab('student')}>Student</button>
          <button className={tabCls('parent')} onClick={() => setTab('parent')}>Parent</button>
        </div>

        {/* ── Student tab ── */}
        {tab === 'student' && (
          <>
            <div className="p-5 space-y-4">
              {creds ? (
                <>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                    Save these credentials now — the password will <strong>not be shown again</strong>.
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Username</p>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                      <code className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">{creds.username}</code>
                      <button onClick={() => copy(creds.username, 'u')} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        {copied === 'u' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  {creds.tempPassword && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Temporary Password</p>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                        <code className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">{creds.tempPassword}</code>
                        <button onClick={() => copy(creds.tempPassword, 'p')} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          {copied === 'p' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                  {creds.emailSent && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <ShieldCheck size={12} /> {creds.note}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-2">
                  Reset the password to view or share new credentials.
                </p>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={onClose} className="flex-1 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Close
              </button>
              {!creds ? (
                <button onClick={handleReset} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 transition-colors">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              ) : (
                <button onClick={() => window.open(`/students/${student.id}/print?creds=1`, '_blank')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  <Printer size={14} /> Print
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Parent tab ── */}
        {tab === 'parent' && (
          <>
            <div className="p-5 space-y-4">
              {parentLoading && !parentReset ? (
                <div className="flex items-center justify-center py-6 text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : parentReset ? (
                <>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                    Save these now — the password will <strong>not be shown again</strong>.
                  </div>
                  {parentReset.children_count > 1 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400 flex gap-2 items-start">
                      <Users size={13} className="mt-0.5 shrink-0" />
                      This account is shared by <strong>{parentReset.children_count} children</strong>. The same login accesses all of them.
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Username</p>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                      <code className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">{parentReset.username}</code>
                      <button onClick={() => pcopy(parentReset.username, 'pu')} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        {pCopied === 'pu' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  {parentReset.tempPassword && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Temporary Password</p>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5">
                        <code className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">{parentReset.tempPassword}</code>
                        <button onClick={() => pcopy(parentReset.tempPassword, 'pp')} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          {pCopied === 'pp' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                  {parentReset.emailSent && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <ShieldCheck size={12} /> Credentials emailed to parent.
                    </p>
                  )}
                </>
              ) : parentInfo ? (
                <>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck size={13} /> Parent Account Active
                    </p>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Username</span>
                        <code className="font-mono font-medium">{parentInfo.username}</code>
                      </div>
                      {parentInfo.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Email</span>
                          <span className="font-medium">{parentInfo.email}</span>
                        </div>
                      )}
                      {parentInfo.children_count > 1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Linked children</span>
                          <span className="font-semibold text-indigo-600">{parentInfo.children_count}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Must change password</span>
                        <span className={parentInfo.must_change_password ? 'text-amber-500 font-medium' : 'text-emerald-600 font-medium'}>
                          {parentInfo.must_change_password ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Reset to generate a new temporary password.
                  </p>
                </>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                    <AlertTriangle size={18} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">No parent account linked.</p>
                  <p className="text-xs text-slate-400">Click below to create one now.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={onClose} className="flex-1 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Close
              </button>
              {!parentReset && (
                <button onClick={handleParentReset} disabled={parentLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors">
                  {parentLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  {parentLoading ? 'Processing…' : (parentInfo ? 'Reset Password' : 'Create Account')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Promote Modal ── */
function PromoteModal({ classes, onClose, onDone }) {
  const [fromClass, setFromClass] = useState('');
  const [toClass,   setToClass]   = useState('');
  const [saving,    setSaving]    = useState(false);

  const selCls = SELECT_CLS;

  const handlePromote = async () => {
    if (!fromClass || !toClass) return toast.error('Please select both classes');
    if (fromClass === toClass) return toast.error('Source and destination must be different');
    setSaving(true);
    try {
      const r = await promoteStudents({ from_class_id: Number(fromClass), to_class_id: Number(toClass) });
      const msg = r.data?.message || r.message || 'Students promoted';
      toast.success(msg);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Promotion failed');
    } finally {
      setSaving(false);
    }
  };

  const fromName = classes.find(c => String(c.id) === fromClass)?.name || '';
  const toName   = classes.find(c => String(c.id) === toClass)?.name   || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <ArrowUpCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Promote Students</h2>
            <p className="text-xs text-slate-400">Move all active students from one class to another</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From Class</label>
            <select value={fromClass} onChange={e => setFromClass(e.target.value)} className={selCls}>
              <option value="">Select source class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-center text-slate-300 dark:text-slate-700 text-xl">↓</div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To Class</label>
            <select value={toClass} onChange={e => setToClass(e.target.value)} className={selCls}>
              <option value="">Select destination class…</option>
              {classes.filter(c => String(c.id) !== fromClass).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {fromClass && toClass && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-700 dark:text-amber-400">
            All <strong>active</strong> students in <strong>{fromName}</strong> will be moved to <strong>{toName}</strong>.
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handlePromote} disabled={saving || !fromClass || !toClass}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Promoting…' : 'Promote Students'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Filter chip ── */
function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-500/20">
      {label}
      <button onClick={onRemove} className="rounded-full hover:bg-indigo-200/50 dark:hover:bg-indigo-500/20 p-0.5 transition-colors">
        <X size={10} />
      </button>
    </span>
  );
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students,      setStudents]      = useState([]);
  const [meta,          setMeta]          = useState(null);
  const [page,          setPage]          = useState(1);
  const [classes,       setClasses]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [classFilter,   setClassFilter]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [showPromote,   setShowPromote]   = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [credStudent,   setCredStudent]   = useState(null);

  const debouncedSearch = useDebounce(search);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({ search: debouncedSearch, status: statusFilter, class_id: classFilter, page, limit: 50 });
      const body = res.data;
      setStudents(Array.isArray(body) ? body : (body?.data ?? []));
      setMeta(body?.meta ?? null);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [debouncedSearch, statusFilter, classFilter, page]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, classFilter]);

  useEffect(() => { getClasses().then(r => setClasses(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async () => {
    try {
      await deleteStudent(deleteTarget.id);
      toast.success('Student deleted');
      setDeleteTarget(null);
      fetchStudents();
    } catch { toast.error('Failed to delete student'); }
  };

  const total   = meta?.total ?? students.length;
  const active  = students.filter(s => s.status === 'active').length;
  const males   = students.filter(s => s.gender === 'Male').length;
  const females = students.filter(s => s.gender === 'Female').length;

  const activeFilters = [
    classFilter  && { label: classes.find(c => String(c.id) === classFilter)?.name || 'Class', clear: () => setClassFilter('') },
    statusFilter && { label: `Status: ${statusFilter}`, clear: () => setStatusFilter('') },
  ].filter(Boolean);

  const selCls = SELECT_CLS;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #9333ea)' }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users size={13} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Students</h1>
              <p className="text-white/60 text-sm mt-1">Manage enrolled students and records</p>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  const p = new URLSearchParams();
                  if (classFilter) { p.set('class_id', classFilter); const cn = classes.find(c => String(c.id) === classFilter)?.name || ''; if (cn) p.set('class_name', cn); }
                  window.open(`/students/id-cards?${p}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <CreditCard size={14} /> ID Cards
              </button>
              <button
                onClick={() => setShowPromote(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <ArrowUpCircle size={14} /> Promote
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <Upload size={14} /> Import
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await exportStudents({ format: 'xlsx' });
                    downloadBlob(res.data, 'students.xlsx');
                  } catch { toast.error('Export failed'); }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <Download size={14} /> Export
              </button>
              <Button
                onClick={() => navigate('/admission/new')}
                className="self-start sm:self-auto bg-white! text-indigo-700 hover:bg-indigo-50!"
                style={{ background: '#fff', color: '#4338ca' }}
              >
                <Plus size={15} /> Add Student
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-10 space-y-5">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total"   value={total}   icon={Users}      gradientFrom="#6366f1" gradientTo="#8b5cf6" iconBg="bg-indigo-50 dark:bg-indigo-500/10"  textColor="text-indigo-600 dark:text-indigo-400"  sub="All enrolled" />
            <StatCard label="Active"  value={active}  icon={UserCheck}  gradientFrom="#10b981" gradientTo="#0d9488" iconBg="bg-emerald-50 dark:bg-emerald-500/10" textColor="text-emerald-600 dark:text-emerald-400" pct={toPct(active, total)} />
            <StatCard label="Male"    value={males}   icon={Users}      gradientFrom="#3b82f6" gradientTo="#06b6d4" iconBg="bg-blue-50 dark:bg-blue-500/10"      textColor="text-blue-600 dark:text-blue-400"      pct={toPct(males, total)} />
            <StatCard label="Female"  value={females} icon={TrendingUp} gradientFrom="#ec4899" gradientTo="#f43f5e" iconBg="bg-pink-50 dark:bg-pink-500/10"      textColor="text-pink-600 dark:text-pink-400"      pct={toPct(females, total)} />
          </div>

          {/* ── Table card ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">

            {/* Toolbar */}
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-52">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, email, B-Form…"
                    className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={[
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all shrink-0',
                    showFilters || activeFilters.length > 0
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-700',
                  ].join(' ')}
                >
                  <Filter size={14} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilters.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {activeFilters.length}
                    </span>
                  )}
                </button>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600 font-medium ml-auto shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {students.length} result{students.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Class</label>
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className={selCls}>
                      <option value="">All Classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selCls}>
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="graduated">Graduated</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Active chips */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-medium">Active:</span>
                  {activeFilters.map((f, i) => <Chip key={i} label={f.label} onRemove={f.clear} />)}
                  <button
                    onClick={() => { setClassFilter(''); setStatusFilter(''); }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium underline underline-offset-2 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Table / Loading / Empty */}
            {loading ? (
              <PageLoader />
            ) : students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students found"
                description={search || activeFilters.length > 0 ? 'Try adjusting your filters' : 'Add your first student to get started'}
                actionLabel={!search && activeFilters.length === 0 ? 'Add Student' : undefined}
                onAction={() => navigate('/admission/new')}
              />
            ) : (
              <>
                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map(s => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <Avatar name={s.full_name} id={s.id} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{s.full_name}</p>
                          <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {(s.class_name || s.grade) && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-100 dark:border-indigo-800/50">
                              {s.class_name || s.grade}
                            </span>
                          )}
                          {s.phone && <span className="text-[10px] text-slate-400 font-medium">{s.phone}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button title="Timeline" onClick={() => navigate(`/lifecycle/${s.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                          <Activity size={14} />
                        </button>
                        <button title="Performance" onClick={() => navigate(`/students/${s.id}/performance`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all">
                          <BarChart2 size={14} />
                        </button>
                        <button title="Print Profile" onClick={() => window.open(`/students/${s.id}/print`, '_blank')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all">
                          <Printer size={14} />
                        </button>
                        <button onClick={() => navigate(`/admission/edit/${s.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        {['Student', 'Class', 'B-Form', 'Contact', 'Status', 'Admitted', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap first:pl-5">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {students.map(s => (
                        <tr key={s.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 pl-5">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.full_name} id={s.id} />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-40 leading-none">{s.full_name}</p>
                                {s.email && (
                                  <p className="text-xs text-slate-400 dark:text-slate-600 truncate max-w-40 mt-0.5 flex items-center gap-1">
                                    <Mail size={10} className="shrink-0" />{s.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {s.class_name
                              ? <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold border border-indigo-100 dark:border-indigo-800/50">{s.class_name}</span>
                              : <span className="text-slate-400 text-xs">{s.grade || '—'}</span>
                            }
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {s.b_form_no || <span className="text-slate-300 dark:text-slate-700">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {s.phone
                              ? <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Phone size={11} className="text-slate-400 shrink-0" />{s.phone}</span>
                              : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(s.admission_date)}
                          </td>
                          <td className="px-4 py-3 pr-5">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button title="Timeline"
                                onClick={() => navigate(`/lifecycle/${s.id}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                                <Activity size={13} />
                              </button>
                              <button title="Performance"
                                onClick={() => navigate(`/students/${s.id}/performance`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all">
                                <BarChart2 size={13} />
                              </button>
                              <button title="Print Profile"
                                onClick={() => window.open(`/students/${s.id}/print`, '_blank')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all">
                                <Printer size={13} />
                              </button>
                              <button title="Manage Login Credentials"
                                onClick={() => setCredStudent(s)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all">
                                <KeyRound size={13} />
                              </button>
                              <button title="Leaving Certificate"
                                onClick={() => window.open(`/students/certificate?type=leaving&student_id=${s.id}`, '_blank')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all">
                                <FileText size={13} />
                              </button>
                              <button title="Character Certificate"
                                onClick={() => window.open(`/students/certificate?type=character&student_id=${s.id}`, '_blank')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all">
                                <FileText size={13} />
                              </button>
                              <button onClick={() => navigate(`/admission/edit/${s.id}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(s)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 border-t border-slate-100 dark:border-slate-800">
                  <Pagination meta={meta} onChange={setPage} />
                </div>
              </>
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Student"
          message={`Are you sure you want to delete "${deleteTarget?.full_name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        {showPromote && (
          <PromoteModal
            classes={classes}
            onClose={() => setShowPromote(false)}
            onDone={fetchStudents}
          />
        )}

        <ImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          title="Import Students"
          templateFn={getStudentImportTemplate}
          importFn={importStudents}
          templateName="students_template.csv"
          description="Upload a CSV with columns: full_name, gender, date_of_birth, grade, class_name, phone, email, address, father_name, father_phone, admission_date, status, b_form_no"
        />

        {credStudent && (
          <StudentCredentialModal
            student={credStudent}
            onClose={() => setCredStudent(null)}
          />
        )}
      </div>
    </Layout>
  );
}
