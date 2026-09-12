import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, GraduationCap, Mail, Phone, BookOpen,
  Users, Calendar, Award, MapPin, Pencil, Eye,
  Camera, FileText, Trash2, Upload, ExternalLink,
  BarChart3, RefreshCw, KeyRound, Copy, Check, Printer,
  ShieldCheck, AlertTriangle, Loader2, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import TeacherFormModal from '../components/TeacherFormModal';
import {
  getTeacher, getTeacherClasses, getTeacherStudents, updateTeacher,
  uploadTeacherPhoto, getTeacherDocuments, uploadTeacherDocument, deleteTeacherDocument,
  getTeacherCredentials, resetTeacherCredentials,
} from '../api/teachers';
import { getTeacherMetrics } from '../api/analytics';
import { formatDate, toPct } from '../utils';
import { TEACHER_STATUS_STYLES } from '../constants';

/* ── Credentials Panel ─────────────────────────────────── */
function CredentialsPanel({ teacherId }) {
  const [creds,    setCreds]    = useState(null);   // null = not loaded yet
  const [loading,  setLoading]  = useState(true);
  const [resetting, setResetting] = useState(false);
  const [revealed,  setRevealed]  = useState(null); // { username, tempPassword }
  const [copied,    setCopied]    = useState('');

  useEffect(() => {
    getTeacherCredentials(teacherId)
      .then(r => setCreds(r.data?.data || null))
      .catch(() => setCreds(null))
      .finally(() => setLoading(false));
  }, [teacherId]);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleReset = async () => {
    if (!window.confirm('Reset login credentials for this teacher? They will need to use the new password.')) return;
    setResetting(true);
    try {
      const r = await resetTeacherCredentials(teacherId);
      const c = r.data?.credentials;
      setCreds(prev => ({ ...(prev || {}), username: c.username, must_change_password: true }));
      if (c.tempPassword) {
        setRevealed(c);
        toast.success('Password reset — new credentials shown below');
      } else {
        toast.success(c.note || 'Credentials reset and emailed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setResetting(false); }
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
      <Loader2 size={14} className="animate-spin" /> Loading credentials…
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Username row */}
      <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <User size={14} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Username</span>
          <code className="font-mono text-sm text-slate-800 dark:text-slate-200 truncate">
            {creds ? creds.username : <span className="text-red-400 italic">Not set up yet</span>}
          </code>
        </div>
        {creds?.username && (
          <button onClick={() => copy(creds.username, 'user')} className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0">
            {copied === 'user' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>

      {/* Status row */}
      {creds && (
        <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
          {creds.must_change_password ? (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} /> Must change password on next login
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck size={12} /> Password has been changed
            </span>
          )}
          {creds.last_login_at && (
            <span className="ml-2 text-slate-400">
              · Last login: {new Date(creds.last_login_at).toLocaleDateString('en-PK')}
            </span>
          )}
        </div>
      )}

      {/* Newly revealed password after reset */}
      {revealed?.tempPassword && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle size={12} /> New temporary password (shown once)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm text-amber-900 dark:text-amber-200 select-all">{revealed.tempPassword}</code>
            <button onClick={() => copy(revealed.tempPassword, 'pass')} className="text-amber-500 hover:text-amber-700 transition-colors">
              {copied === 'pass' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-60 transition-colors"
        >
          {resetting ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
          {resetting ? 'Resetting…' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}

/* ── Info row helper ── */
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-500 dark:text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

/* ── Stat pill ── */
function StatPill({ value, label, color }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

/* ── Photo uploader ── */
function PhotoUploader({ teacherId, photoUrl, name, onUploaded }) {
  const inputRef  = useRef();
  const [loading, setLoading] = useState(false);
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    setLoading(true);
    try {
      const res = await uploadTeacherPhoto(teacherId, fd);
      onUploaded(res.data?.data?.photo_url ?? res.data?.photo_url);
      toast.success('Photo updated');
    } catch { toast.error('Photo upload failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="relative group w-16 h-16">
        {photoUrl
          ? <img src={photoUrl} alt="" className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-lg" />
          : <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-900 text-lg font-extrabold text-white flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
              {initials}
            </div>
        }
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          title="Upload photo"
          className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          {loading ? <span className="text-white text-[10px] font-bold">…</span> : <Camera size={14} className="text-white" />}
        </button>
        {/* Always-visible camera badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center pointer-events-none">
          <Camera size={9} className="text-white" />
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {loading ? 'Uploading…' : photoUrl ? 'Change Photo' : 'Upload Photo'}
      </button>
    </div>
  );
}

/* ── Documents tab ── */
const DOC_TYPE_OPTIONS = [
  { value: 'cnic',        label: 'CNIC / ID' },
  { value: 'degree',      label: 'Degree / Certificate' },
  { value: 'contract',    label: 'Contract' },
  { value: 'experience',  label: 'Experience Letter' },
  { value: 'other',       label: 'Other' },
];

function DocumentsTab({ teacherId }) {
  const [docs,       setDocs]       = useState([]);
  const [docLoading, setDocLoading] = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [form,       setForm]       = useState({ name: '', doc_type: 'other' });
  const fileRef = useRef();

  const loadDocs = () => {
    setDocLoading(true);
    getTeacherDocuments(teacherId)
      .then(r => setDocs(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setDocLoading(false));
  };
  useEffect(() => { loadDocs(); }, [teacherId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Select a file first');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', form.name || file.name);
    fd.append('doc_type', form.doc_type);
    setUploading(true);
    try {
      await uploadTeacherDocument(teacherId, fd);
      toast.success('Document uploaded');
      setForm({ name: '', doc_type: 'other' });
      if (fileRef.current) fileRef.current.value = '';
      loadDocs();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteTeacherDocument(teacherId, docId);
      toast.success('Document deleted');
      setDocs(d => d.filter(x => x.id !== docId));
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Upload Document</p>
        <form onSubmit={handleUpload} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Document Name</label>
            <input
              type="text"
              placeholder="e.g. CNIC Front"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="w-44">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Type</label>
            <select
              value={form.doc_type}
              onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">File</label>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx"
              className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400" />
          </div>
          <Button type="submit" disabled={uploading}
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', flexShrink: 0 }}>
            <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </form>
      </div>

      {/* Document list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Documents</p>
          <p className="text-xs text-slate-400">{docs.length} file{docs.length !== 1 ? 's' : ''}</p>
        </div>
        {docLoading ? (
          <div className="px-5 py-6 text-sm text-slate-400">Loading…</div>
        ) : docs.length === 0 ? (
          <EmptyState icon={FileText} title="No documents" description="Upload CNIC, degrees, contracts, etc." />
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-slate-800">
            {docs.map(doc => (
              <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  <FileText size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{doc.doc_type} · {new Date(doc.created_at).toLocaleDateString('en-PK')}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Performance Metrics tab ── */
function MetricsTab({ teacherId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getTeacherMetrics(teacherId)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(() => toast.error('Failed to load metrics'))
      .finally(() => setLoading(false));
  }, [teacherId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data)   return null;

  const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden';

  return (
    <div className="space-y-5">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Classes',        value: data.summary?.totalClasses    ?? '—', color: '#6366f1' },
          { label: 'Students',       value: data.summary?.totalStudents   ?? '—', color: '#8b5cf6' },
          { label: 'Homework Assigned', value: data.summary?.totalHomework ?? '—', color: '#f59e0b' },
          { label: 'Syllabus Topics', value: data.summary?.totalTopics    ?? '—', color: '#10b981' },
        ].map(k => (
          <div key={k.label} className={`${cardCls} px-4 py-4`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly attendance chart */}
      {data.monthlyAttendance?.length > 0 && (
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Student Attendance (Monthly)</h3>
            </div>
            <button onClick={load} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyAttendance} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`${v}%`, 'Attendance Rate']} contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                <Bar dataKey="rate" name="Attendance %" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Syllabus completion by subject */}
        {data.syllabusCompletion?.length > 0 && (
          <div className={cardCls}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Syllabus Completion</h3>
            </div>
            <div className="p-5 space-y-3">
              {data.syllabusCompletion.map(sub => {
                const pct = parseFloat(sub.completion_pct) || 0;
                const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={sub.subject_name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate flex-1">{sub.subject_name}</span>
                      <span className="text-xs font-bold ml-2 tabular-nums" style={{ color }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub.completed_topics}/{sub.total_topics} topics</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Avg student marks by subject */}
        {data.marksBySubject?.length > 0 && (
          <div className={cardCls}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Avg Student Score by Subject</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.marksBySubject} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="subject_name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={v => [`${parseFloat(v).toFixed(1)}%`, 'Avg Score']} contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                  <Bar dataKey="avg_pct" name="Avg Score" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Homework per week */}
      {data.homeworkPerWeek?.length > 0 && (
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Homework Assigned per Week</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.homeworkPerWeek} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [v, 'Homework']} contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                <Bar dataKey="count" name="Homework" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function TeacherDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [teacher,  setTeacher]  = useState(null);
  const [classes,  setClasses]  = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'documents'

  const loadAll = () => {
    setLoading(true);
    Promise.all([getTeacher(id), getTeacherClasses(id), getTeacherStudents(id)])
      .then(([t, c, s]) => {
        setTeacher(t.data?.data ?? t.data);
        setClasses(Array.isArray(c.data?.data ?? c.data) ? (c.data?.data ?? c.data) : []);
        setStudents(Array.isArray(s.data?.data ?? s.data) ? (s.data?.data ?? s.data) : []);
      })
      .catch(() => toast.error('Failed to load teacher'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [id]);

  const handleUpdate = async (form) => {
    try {
      const r = await updateTeacher(id, form);
      toast.success('Teacher updated');
      setEditOpen(false);
      loadAll();
      return r.data?.data ?? r.data;
    } catch (err) { toast.error(err.displayMessage || 'Failed to update'); throw err; }
  };

  const statusStyle = teacher ? (TEACHER_STATUS_STYLES[teacher.status] || TEACHER_STATUS_STYLES.inactive) : '';

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Sticky page header ── */}
        <div className="sticky top-14 lg:top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate('/teachers')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {teacher?.full_name || 'Teacher Profile'}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">{teacher?.subject || 'Staff member'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab switcher */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {[['info', 'Profile'], ['metrics', 'Metrics'], ['documents', 'Documents']].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => window.open(`/teachers/${id}/print`, '_blank')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Printer size={13} /> Print
              </button>
              <Button size="sm" onClick={() => setEditOpen(true)}
                style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                <Pencil size={13} /> Edit Profile
              </Button>
            </div>
          </div>
          {/* Mobile tab switcher */}
          <div className="flex sm:hidden gap-1 pb-2">
            {[['info', 'Profile'], ['metrics', 'Metrics'], ['documents', 'Documents']].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : !teacher ? (
          <EmptyState icon={GraduationCap} title="Teacher not found" description="This teacher may have been removed." />
        ) : activeTab === 'documents' ? (
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
            <DocumentsTab teacherId={id} />
          </div>
        ) : activeTab === 'metrics' ? (
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
            <MetricsTab teacherId={id} />
          </div>
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-6xl mx-auto">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* ── Left: Profile card ── */}
              <div className="lg:col-span-1 space-y-4">

                {/* Profile */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Gradient banner */}
                  <div className="h-20" style={{ background: 'linear-gradient(135deg, #047857, #059669, #0d9488)' }} />

                  <div className="px-5 pb-5 -mt-8">
                    <div className="flex items-end justify-between mb-4">
                      <PhotoUploader
                        teacherId={id}
                        photoUrl={teacher.photo_url}
                        name={teacher.full_name}
                        onUploaded={(url) => setTeacher(t => ({ ...t, photo_url: url }))}
                      />
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${statusStyle}`}>
                        {teacher.status === 'on_leave' ? 'On Leave' : teacher.status}
                      </span>
                    </div>

                    <h2 className="text-base font-extrabold text-slate-800 dark:text-white leading-tight">
                      {teacher.full_name}
                    </h2>
                    {teacher.subject && (
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {teacher.subject}
                      </p>
                    )}
                    {teacher.qualification && (
                      <p className="text-xs text-slate-400 mt-0.5">{teacher.qualification}</p>
                    )}

                    {/* Quick stats */}
                    <div className="flex items-center divide-x divide-slate-100 dark:divide-slate-800 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <StatPill value={classes.length}  label="Classes"  color="text-indigo-600 dark:text-indigo-400" />
                      <div className="flex-1" />
                      <StatPill value={students.length} label="Students" color="text-emerald-600 dark:text-emerald-400" />
                    </div>

                    {/* Documents shortcut */}
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-xs font-semibold"
                    >
                      <FileText size={13} />
                      View / Upload Documents
                    </button>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <KeyRound size={13} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Credentials</p>
                  </div>
                  <CredentialsPanel teacherId={id} />
                </div>

                {/* Contact & details */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</p>
                  <InfoRow icon={Mail}      label="Email"         value={teacher.email} />
                  <InfoRow icon={Phone}     label="Phone"         value={teacher.phone} />
                  <InfoRow icon={GraduationCap} label="Qualification" value={teacher.qualification} />
                  <InfoRow icon={Calendar}  label="Joined"        value={formatDate(teacher.join_date)} />
                  <InfoRow icon={Award}     label="Gender"        value={teacher.gender} />
                  <InfoRow icon={MapPin}    label="Address"       value={teacher.address} />
                </div>

                {/* Assigned grades */}
                {teacher.assigned_grades?.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Assigned Grades</p>
                    <div className="flex flex-wrap gap-2">
                      {teacher.assigned_grades.map(g => (
                        <span key={g} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right: Classes + Students ── */}
              <div className="lg:col-span-2 space-y-5">

                {/* Classes */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <BookOpen size={13} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Assigned Classes</h3>
                        <p className="text-xs text-slate-400">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/classes')}>
                      All Classes
                    </Button>
                  </div>

                  {classes.length === 0 ? (
                    <EmptyState icon={BookOpen} title="No classes assigned" description="This teacher has no class assignments yet." />
                  ) : (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {classes.map(cls => {
                        const pct = toPct(cls.student_count, cls.capacity);
                        return (
                          <div
                            key={cls.id}
                            onClick={() => navigate(`/classes/${cls.id}`)}
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 cursor-pointer transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                              <BookOpen size={14} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{cls.name}</p>
                              <p className="text-xs text-slate-400 truncate">{cls.grade} · Sec {cls.section}</p>
                              <div className="mt-1.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {cls.student_count}/{cls.capacity} students
                              </p>
                            </div>
                            <Eye size={14} className="text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Students */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}>
                        <Users size={13} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Students Under This Teacher</h3>
                        <p className="text-xs text-slate-400">{students.length} student{students.length !== 1 ? 's' : ''} across all classes</p>
                      </div>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <EmptyState icon={Users} title="No students yet" description="Students will appear here once assigned to this teacher's classes." />
                  ) : (
                    <>
                      {/* Mobile list */}
                      <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {students.map(s => (
                          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                            <Avatar name={s.full_name} id={s.id} size="md" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{s.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">{s.class_name || s.grade || '—'}</p>
                            </div>
                            <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                          </li>
                        ))}
                      </ul>

                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                              {['Student', 'Class', 'Contact', 'Status', 'Admitted', ''].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] whitespace-nowrap first:pl-5">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                            {students.map(s => (
                              <tr key={s.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 pl-5">
                                  <div className="flex items-center gap-3">
                                    <Avatar name={s.full_name} id={s.id} />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-36">{s.full_name}</p>
                                      {s.email && (
                                        <p className="text-xs text-slate-400 truncate max-w-36 flex items-center gap-1 mt-0.5">
                                          <Mail size={10} />{s.email}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {s.class_name
                                    ? <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold border border-indigo-100 dark:border-indigo-800/50">{s.class_name}</span>
                                    : <span className="text-slate-400 text-xs">{s.grade || '—'}</span>
                                  }
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                  {s.phone
                                    ? <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400" />{s.phone}</span>
                                    : <span className="text-slate-300 dark:text-slate-700">—</span>
                                  }
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                  {formatDate(s.admission_date)}
                                </td>
                                <td className="px-4 py-3 pr-5">
                                  <button
                                    onClick={() => navigate(`/admission/edit/${s.id}`)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <TeacherFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        teacherData={teacher}
      />
    </Layout>
  );
}
