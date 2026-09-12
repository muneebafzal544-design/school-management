import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Plus, Search, X, Pencil, Trash2, Eye,
  Users, UserCheck, TrendingUp, Mail, Phone, BookOpen, Upload, Download,
  KeyRound, Copy, Check, Printer, ShieldCheck, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { StatCard } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Modal';
import ImportModal from '../components/ui/ImportModal';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import TeacherFormModal from '../components/TeacherFormModal';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, getTeacherImportTemplate, importTeachers, exportTeachers, getTeacherCredentials } from '../api/teachers';
import { toPct, formatDate, downloadBlob } from '../utils';
import Pagination from '../components/ui/Pagination';
import { TEACHER_STATUS_STYLES } from '../constants';
import { useDebounce } from '../hooks/useDebounce';
import { SELECT_CLS } from '../components/ui/Input';

// ── Credential reveal card shown once after teacher creation ──
function CredentialCard({ teacher, credentials, onClose }) {
  const [copied, setCopied] = useState('');

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-emerald-200 dark:border-emerald-800 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-600 to-teal-500 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base">Teacher Account Created</h2>
              <p className="text-emerald-100 text-xs mt-0.5">{teacher.full_name}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {credentials.tempPassword ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 text-sm text-amber-800 dark:text-amber-300">
                <strong>Important:</strong> Save these credentials now. The password will <strong>not be shown again</strong>.
              </div>

              {/* Username */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Username</p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                  <code className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">
                    {credentials.username}
                  </code>
                  <button
                    onClick={() => copy(credentials.username, 'user')}
                    className="text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {copied === 'user' ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Temporary Password</p>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                  <code className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200 select-all">
                    {credentials.tempPassword}
                  </code>
                  <button
                    onClick={() => copy(credentials.tempPassword, 'pass')}
                    className="text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {copied === 'pass' ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <Mail size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Credentials sent by email</p>
                <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">{credentials.note}</p>
                <p className="mt-1.5 font-mono text-xs bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded inline-block">
                  {credentials.username}
                </p>
              </div>
            </div>
          )}

          {credentials.note && credentials.tempPassword && (
            <p className="text-xs text-slate-400">{credentials.note}</p>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={() => window.open(`/teachers/${teacher.id}/print`, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer size={14} /> Print Profile
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Teacher card ── */
function TeacherCard({ teacher, onEdit, onDelete, onView, onDocuments, onCredentials }) {
  const statusStyle = TEACHER_STATUS_STYLES[teacher.status] || TEACHER_STATUS_STYLES.inactive;

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">

      {/* Card header with avatar + status */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-4">
        <Avatar name={teacher.full_name} id={teacher.id} size="xl" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight truncate">
                {teacher.full_name}
              </p>
              {teacher.subject && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">
                  {teacher.subject}
                </p>
              )}
            </div>
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusStyle}`}>
              {teacher.status === 'on_leave' ? 'On Leave' : teacher.status}
            </span>
          </div>

          {teacher.qualification && (
            <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 font-medium">
              {teacher.qualification}
            </p>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div className="px-5 pb-4 space-y-2 flex-1">
        {teacher.email && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Mail size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{teacher.email}</span>
          </div>
        )}
        {teacher.phone && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span>{teacher.phone}</span>
          </div>
        )}
        {(teacher.class_count > 0 || teacher.student_count > 0) && (
          <div className="flex items-center gap-3 pt-1">
            {teacher.class_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg">
                <BookOpen size={10} /> {teacher.class_count} class{teacher.class_count !== 1 ? 'es' : ''}
              </span>
            )}
            {teacher.student_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">
                <Users size={10} /> {teacher.student_count} students
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions — row 1: primary */}
      <div className="flex gap-2 px-5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onView(teacher)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-all hover:shadow-md"
        >
          <Eye size={12} /> View
        </button>
        <button
          onClick={() => onEdit(teacher)}
          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(teacher)}
          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {/* Actions — row 2: secondary */}
      <div className="flex gap-2 px-5 pb-3 mt-2">
        <button
          onClick={() => onDocuments(teacher)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800 transition-colors"
        >
          <FileText size={11} /> Documents
        </button>
        <button
          onClick={() => onCredentials(teacher)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-100 dark:border-violet-800 transition-colors"
        >
          <KeyRound size={11} /> Credentials
        </button>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const navigate = useNavigate();
  const [teachers,     setTeachers]     = useState([]);
  const [meta,         setMeta]         = useState(null);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImport,   setShowImport]   = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [credentialView, setCredentialView] = useState(null); // { teacher, credentials }

  const debouncedSearch = useDebounce(search, 300);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeachers({ search: debouncedSearch, status: statusFilter, page, limit: 50 });
      const body = res.data;
      setTeachers(Array.isArray(body) ? body : (body?.data ?? []));
      setMeta(body?.meta ?? null);
    } catch { toast.error('Failed to load teachers'); }
    finally { setLoading(false); }
  }, [debouncedSearch, statusFilter, page]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleSubmit = async (form) => {
    try {
      let r;
      if (editTarget) {
        r = await updateTeacher(editTarget.id, form);
        toast.success('Teacher updated');
        setModalOpen(false); setEditTarget(null); fetchTeachers();
      } else {
        r = await createTeacher(form);
        const teacher     = r.data?.data ?? r.data;
        const credentials = r.data?.credentials;
        setModalOpen(false); setEditTarget(null); fetchTeachers();
        if (credentials) {
          setNewCredentials({ teacher, credentials });
        } else {
          toast.success('Teacher added');
        }
      }
      return r.data?.data ?? r.data;
    } catch (err) { toast.error(err.displayMessage || 'Something went wrong'); throw err; }
  };

  const handleDelete = async () => {
    try {
      await deleteTeacher(deleteTarget.id);
      toast.success('Teacher deleted');
      setDeleteTarget(null); fetchTeachers();
    } catch (err) { toast.error(err.displayMessage || 'Failed to delete'); }
  };

  const handleShowCredentials = async (teacher) => {
    try {
      const r    = await getTeacherCredentials(teacher.id);
      const data = r.data?.data ?? r.data;
      if (!data?.username) { toast.error('No account found for this teacher'); return; }
      const credentials = {
        username: data.username,
        note: data.must_change_password
          ? 'Password has not been changed yet. Use Reset Credentials to issue a new password.'
          : `Last login: ${data.last_login_at ? new Date(data.last_login_at).toLocaleDateString('en-PK') : 'Never'}`,
      };
      setCredentialView({ teacher, credentials });
    } catch { toast.error('Could not load credentials'); }
  };

  const total    = teachers.length;
  const active   = teachers.filter(t => t.status === 'active').length;
  const males    = teachers.filter(t => t.gender === 'Male').length;
  const females  = teachers.filter(t => t.gender === 'Female').length;

  const filtered = teachers.filter(t =>
    !search ||
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selCls = SELECT_CLS;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Hero ── */}
        <div
          className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #047857, #059669, #0d9488)' }}
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <GraduationCap size={13} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Teachers</h1>
              <p className="text-white/60 text-sm mt-1">Manage staff, subjects and class assignments</p>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <Upload size={14} /> Import
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await exportTeachers({ format: 'xlsx' });
                    downloadBlob(res.data, 'teachers.xlsx');
                  } catch { toast.error('Export failed'); }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => { setEditTarget(null); setModalOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 text-sm font-bold rounded-xl shadow-lg hover:bg-emerald-50 transition-all hover:scale-105"
              >
                <Plus size={16} /> Add Teacher
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-10 space-y-5">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Staff"   value={total}   icon={GraduationCap} gradientFrom="#059669" gradientTo="#0d9488" iconBg="bg-emerald-50 dark:bg-emerald-500/10" textColor="text-emerald-600 dark:text-emerald-400" sub="All teachers" />
            <StatCard label="Active"        value={active}  icon={UserCheck}     gradientFrom="#10b981" gradientTo="#14b8a6" iconBg="bg-teal-50 dark:bg-teal-500/10"      textColor="text-teal-600 dark:text-teal-400"     pct={toPct(active, total)} />
            <StatCard label="Male Staff"    value={males}   icon={Users}         gradientFrom="#3b82f6" gradientTo="#06b6d4" iconBg="bg-blue-50 dark:bg-blue-500/10"      textColor="text-blue-600 dark:text-blue-400"     pct={toPct(males, total)} />
            <StatCard label="Female Staff"  value={females} icon={TrendingUp}    gradientFrom="#ec4899" gradientTo="#f43f5e" iconBg="bg-pink-50 dark:bg-pink-500/10"      textColor="text-pink-600 dark:text-pink-400"     pct={toPct(females, total)} />
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, subject, email…"
                className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selCls}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No teachers found"
              description={search || statusFilter ? 'Try adjusting your filters' : 'Add your first teacher to get started'}
              actionLabel={!search && !statusFilter ? 'Add Teacher' : undefined}
              onAction={() => { setEditTarget(null); setModalOpen(true); }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filtered.map(t => (
                <TeacherCard
                  key={t.id} teacher={t}
                  onEdit={t => { setEditTarget(t); setModalOpen(true); }}
                  onDelete={t => setDeleteTarget(t)}
                  onView={t => navigate(`/teachers/${t.id}`)}
                  onDocuments={t => navigate(`/teachers/${t.id}/documents`)}
                  onCredentials={handleShowCredentials}
                />
              ))}
            </div>
          )}
          <div className="px-4 border-t border-slate-100 dark:border-slate-800">
            <Pagination meta={meta} onChange={setPage} />
          </div>
        </div>
      </div>

      <TeacherFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        teacherData={editTarget}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${deleteTarget?.full_name}"? This will remove all their class assignments.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Import Teachers"
        templateFn={getTeacherImportTemplate}
        importFn={importTeachers}
        templateName="teachers_template.csv"
        description="Upload a CSV with columns: full_name, gender, email, phone, subject, qualification, join_date, salary, status"
      />

      {newCredentials && (
        <CredentialCard
          teacher={newCredentials.teacher}
          credentials={newCredentials.credentials}
          onClose={() => setNewCredentials(null)}
        />
      )}

      {credentialView && (
        <CredentialCard
          teacher={credentialView.teacher}
          credentials={credentialView.credentials}
          onClose={() => setCredentialView(null)}
        />
      )}
    </Layout>
  );
}
