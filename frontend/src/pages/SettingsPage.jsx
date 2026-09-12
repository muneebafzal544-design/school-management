import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  School, CalendarDays, Plus, CheckCircle2, Trash2, X,
  DatabaseBackup, Download, Upload, AlertTriangle, ShieldCheck,
  ImagePlus, Trash, Webhook, Copy, ChevronDown, ChevronUp,
  FlaskConical, CheckCheck, XCircle, Clock, MessageCircle, Eye, EyeOff,
} from 'lucide-react';
import {
  getSettings, saveSettings,
  getAcademicYears, createAcademicYear, setActiveYear, deleteAcademicYear,
  uploadLogo, deleteLogo,
  getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getWebhookLogs,
} from '../api/settings';
import { downloadBackup, restoreBackup } from '../api/backup';
import { sendWhatsApp } from '../api/whatsapp';
import { get2FASetup, enable2FA as apiEnable2FA, disable2FA as apiDisable2FA } from '../api/auth';

const TABS = [
  { id: 'school',    label: 'School Info',      icon: School },
  { id: 'academic',  label: 'Academic Years',   icon: CalendarDays },
  { id: 'whatsapp',  label: 'WhatsApp',         icon: MessageCircle },
  { id: 'webhooks',  label: 'Webhooks',         icon: Webhook },
  { id: 'backup',    label: 'Backup & Restore', icon: DatabaseBackup },
  { id: 'security',  label: 'Security (2FA)',   icon: ShieldCheck },
];

const WEBHOOK_EVENTS = [
  { value: 'fee.paid',         label: 'Fee Paid',           desc: 'Invoice fully paid' },
  { value: 'fee.partial',      label: 'Partial Payment',    desc: 'Partial fee received' },
  { value: 'salary.paid',      label: 'Salary Paid',        desc: 'Teacher salary marked paid' },
  { value: 'salary.generated', label: 'Salary Generated',   desc: 'Monthly salaries generated' },
  { value: 'student.enrolled', label: 'Student Enrolled',   desc: 'New student admitted' },
  { value: 'student.promoted', label: 'Students Promoted',  desc: 'Class promotion completed' },
];

/* ─── Shared style helpers ─────────────────────────────────────── */
function useStyles(dark) {
  return {
    page:    `min-h-screen p-6 ${dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`,
    card:    `rounded-2xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`,
    card2:   `rounded-2xl border p-5 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`,
    inp:     `w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition
              ${dark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800'}`,
    lbl:     `block text-xs font-semibold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`,
    section: `text-xs font-bold uppercase tracking-wider mb-4 ${dark ? 'text-slate-400' : 'text-slate-400'}`,
    muted:   `text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`,
  };
}

/* ─── School Info + Logo Tab ───────────────────────────────────── */
function SchoolSettingsTab({ dark }) {
  const s = useStyles(dark);
  const [form, setForm] = useState({
    school_name: '', school_address: '', school_phone: '',
    school_email: '', school_motto: '', currency: 'PKR',
    bank_name: '', bank_account_title: '', bank_account_no: '',
    bank_iban: '', bank_branch: '', bank_branch_code: '',
  });
  const [logoUrl,      setLogoUrl]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef(null);

  useEffect(() => {
    getSettings()
      .then(r => {
        const d = r.data?.data ?? r.data;
        setForm(f => ({ ...f, ...d }));
        if (d.school_logo) setLogoUrl(d.school_logo);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadLogo(file);
      const url = res.data?.data?.url;
      setLogoUrl(url);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    try {
      await deleteLogo();
      setLogoUrl(null);
      toast.success('Logo removed');
    } catch { toast.error('Failed to remove logo'); }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">

      {/* Logo */}
      <div>
        <p className={s.section}>School Logo</p>
        <div className="flex items-center gap-5">
          {/* Preview */}
          <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0
            ${dark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-300 bg-slate-50'}`}>
            {logoUrl
              ? <img src={logoUrl} alt="School logo" className="w-full h-full object-contain p-1" />
              : <ImagePlus size={28} className={dark ? 'text-slate-500' : 'text-slate-300'} />
            }
          </div>
          {/* Controls */}
          <div className="space-y-2">
            <p className={s.muted}>PNG or JPG, max 5 MB. Displayed on printed documents and receipts.</p>
            <div className="flex gap-2">
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-60
                  ${dark ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                <Upload size={13} />
                {uploadingLogo ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition
                    ${dark ? 'bg-red-900/40 hover:bg-red-900/70 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'}`}
                >
                  <Trash size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`} />

      {/* School details */}
      <div>
        <p className={s.section}>School Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={s.lbl}>School Name</label>
            <input className={s.inp} value={form.school_name || ''} onChange={e => set('school_name', e.target.value)} placeholder="e.g. Bright Future School" />
          </div>
          <div className="sm:col-span-2">
            <label className={s.lbl}>School Address</label>
            <textarea rows={2} className={s.inp} value={form.school_address || ''} onChange={e => set('school_address', e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label className={s.lbl}>Phone Number</label>
            <input className={s.inp} value={form.school_phone || ''} onChange={e => set('school_phone', e.target.value)} placeholder="+92 300 0000000" />
          </div>
          <div>
            <label className={s.lbl}>Email Address</label>
            <input type="email" className={s.inp} value={form.school_email || ''} onChange={e => set('school_email', e.target.value)} placeholder="school@example.com" />
          </div>
          <div className="sm:col-span-2">
            <label className={s.lbl}>School Motto / Tagline</label>
            <input className={s.inp} value={form.school_motto || ''} onChange={e => set('school_motto', e.target.value)} placeholder="e.g. Excellence in Education" />
          </div>
          <div>
            <label className={s.lbl}>Currency</label>
            <select className={s.inp} value={form.currency || 'PKR'} onChange={e => set('currency', e.target.value)}>
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="SAR">SAR — Saudi Riyal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`} />

      {/* Bank Details */}
      <div>
        <p className={s.section}>Bank / Challan Details</p>
        <p className={`${s.muted} mb-4`}>Used on fee challans printed for parents. Leave blank if not applicable.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={s.lbl}>Bank Name</label>
            <input className={s.inp} value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. Habib Bank Limited (HBL)" />
          </div>
          <div className="sm:col-span-2">
            <label className={s.lbl}>Account Title</label>
            <input className={s.inp} value={form.bank_account_title || ''} onChange={e => set('bank_account_title', e.target.value)} placeholder="e.g. Bright Future School Fund" />
          </div>
          <div>
            <label className={s.lbl}>Account Number</label>
            <input className={s.inp} value={form.bank_account_no || ''} onChange={e => set('bank_account_no', e.target.value)} placeholder="e.g. 0123-4567890-001" />
          </div>
          <div>
            <label className={s.lbl}>IBAN</label>
            <input className={s.inp} value={form.bank_iban || ''} onChange={e => set('bank_iban', e.target.value)} placeholder="e.g. PK36HABB0000000123456702" />
          </div>
          <div>
            <label className={s.lbl}>Branch Name</label>
            <input className={s.inp} value={form.bank_branch || ''} onChange={e => set('bank_branch', e.target.value)} placeholder="e.g. Main Branch, Gulberg" />
          </div>
          <div>
            <label className={s.lbl}>Branch Code</label>
            <input className={s.inp} value={form.bank_branch_code || ''} onChange={e => set('bank_branch_code', e.target.value)} placeholder="e.g. 0425" />
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

/* ─── Academic Years Tab ───────────────────────────────────────── */
function AcademicYearsTab({ dark }) {
  const s = useStyles(dark);
  const [years,   setYears]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ label: '', start_date: '', end_date: '' });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getAcademicYears()
      .then(r => { const d = r.data?.data ?? r.data; setYears(Array.isArray(d) ? d : []); })
      .catch(() => toast.error('Failed to load academic years'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.label || !form.start_date || !form.end_date) return toast.error('All fields required');
    setSaving(true);
    try {
      await createAcademicYear(form);
      toast.success('Academic year added');
      setShowAdd(false);
      setForm({ label: '', start_date: '', end_date: '' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add academic year');
    } finally { setSaving(false); }
  };

  const handleActivate = async (id, label) => {
    try { await setActiveYear(id); toast.success(`${label} is now the active year`); load(); }
    catch { toast.error('Failed to set active year'); }
  };

  const handleDelete = async (id) => {
    try { await deleteAcademicYear(id); toast.success('Academic year deleted'); load(); }
    catch (err) { toast.error(err?.response?.data?.message || 'Cannot delete active year'); }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <p className={s.muted}>Manage academic years. Only one year can be active at a time.</p>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Year'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className={`mb-5 p-5 rounded-2xl border ${dark ? 'bg-slate-700/50 border-slate-600' : 'bg-indigo-50 border-indigo-200'}`}>
          <h3 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>New Academic Year</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={s.lbl}>Label</label>
              <input className={s.inp} value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))} placeholder="e.g. 2025-2026" />
            </div>
            <div>
              <label className={s.lbl}>Start Date</label>
              <input type="date" className={s.inp} value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            </div>
            <div>
              <label className={s.lbl}>End Date</label>
              <input type="date" className={s.inp} value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? 'Adding…' : 'Add Academic Year'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : years.length === 0 ? (
        <div className={`py-12 text-center rounded-2xl border-2 border-dashed ${dark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No academic years defined yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(yr => (
            <div
              key={yr.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition ${yr.is_active
                ? dark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
                : dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className={`p-2 rounded-xl ${yr.is_active
                ? dark ? 'bg-emerald-900/40' : 'bg-emerald-100'
                : dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <CalendarDays size={18} className={yr.is_active
                  ? dark ? 'text-emerald-400' : 'text-emerald-600'
                  : dark ? 'text-slate-400' : 'text-slate-500'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>{yr.label}</span>
                  {yr.is_active && (
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${dark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      <CheckCircle2 size={11} /> Active
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {new Date(yr.start_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' — '}
                  {new Date(yr.end_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!yr.is_active && (
                  <button
                    onClick={() => handleActivate(yr.id, yr.label)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                  >
                    Set Active
                  </button>
                )}
                {!yr.is_active && (
                  <button
                    onClick={() => handleDelete(yr.id)}
                    className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Backup & Restore Tab ─────────────────────────────────────── */
function BackupTab({ dark }) {
  const s = useStyles(dark);
  const [downloading, setDownloading] = useState(false);
  const [restoring,   setRestoring]   = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileInfo,    setFileInfo]    = useState(null);
  const fileRef = useRef(null);

  const btnBase = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadBackup(); toast.success('Backup downloaded'); }
    catch (err) { toast.error(err?.response?.data?.message ?? 'Download failed'); }
    finally { setDownloading(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.tables || data.app !== 'SchoolMS') {
          toast.error('Invalid backup — not a SchoolMS backup file'); return;
        }
        const totalRows = Object.values(data.tables).reduce((sum, r) => sum + r.length, 0);
        setPendingFile(data);
        setFileInfo({ name: file.name, exportedAt: data.exported_at, exportedBy: data.exported_by, totalRows });
        setConfirmOpen(true);
      } catch { toast.error('Could not parse backup file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true); setConfirmOpen(false);
    try {
      const res = await restoreBackup(pendingFile);
      toast.success(res.message ?? 'Restore complete');
      setPendingFile(null); setFileInfo(null);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Restore failed');
    } finally { setRestoring(false); }
  };

  return (
    <div className="max-w-2xl space-y-5">

      {/* Export */}
      <div className={s.card2}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${dark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
            <Download size={20} className="text-indigo-500" />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-sm mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>Export Backup</h3>
            <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Downloads a complete JSON snapshot of all school data — students, fees, attendance, teachers, library, and more.
              Store this file safely; it can fully restore your database.
            </p>
            <button onClick={handleDownload} disabled={downloading} className={`${btnBase} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              <Download size={15} />
              {downloading ? 'Preparing…' : 'Download Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Restore */}
      <div className={`rounded-2xl border p-5 ${dark ? 'bg-orange-900/10 border-orange-800/50' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${dark ? 'bg-orange-900/40' : 'bg-orange-100'}`}>
            <Upload size={20} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold text-sm ${dark ? 'text-white' : 'text-slate-800'}`}>Restore from Backup</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${dark ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                Destructive
              </span>
            </div>
            <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              Replaces <strong>all</strong> current data with the selected backup file. This cannot be undone.
            </p>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
            <button onClick={() => fileRef.current?.click()} disabled={restoring} className={`${btnBase} bg-orange-600 hover:bg-orange-700 text-white`}>
              <Upload size={15} />
              {restoring ? 'Restoring…' : 'Select Backup File'}
            </button>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className={`flex gap-3 p-4 rounded-xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" />
        <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Backup files contain sensitive data (student records, fees, salary info). Store them encrypted or in a secure location. Only admins can export or restore backups.
        </p>
      </div>

      {/* Confirm restore modal */}
      {confirmOpen && fileInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h2 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>Confirm Restore</h2>
              </div>
              <div className={`rounded-xl p-4 mb-5 text-xs space-y-1.5 ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                <div><span className="font-semibold">File:</span> {fileInfo.name}</div>
                <div><span className="font-semibold">Exported by:</span> {fileInfo.exportedBy ?? '—'}</div>
                <div><span className="font-semibold">Exported at:</span> {fileInfo.exportedAt ? new Date(fileInfo.exportedAt).toLocaleString('en-PK') : '—'}</div>
                <div><span className="font-semibold">Total rows:</span> {fileInfo.totalRows.toLocaleString()}</div>
              </div>
              <p className={`text-sm mb-6 ${dark ? 'text-red-400' : 'text-red-600'}`}>
                This will <strong>permanently erase all current data</strong> and replace it with the backup. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmOpen(false); setPendingFile(null); setFileInfo(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${dark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button onClick={handleRestore} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition">
                  Yes, Restore Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── WhatsApp Settings Tab ─────────────────────────────────────── */
const WA_EVENTS = [
  { key: 'wa_fee_reminder',    label: 'Fee Reminder',     desc: 'Auto-send when fee is due' },
  { key: 'wa_absence_alert',   label: 'Absence Alert',    desc: 'Notify parent when student is absent' },
  { key: 'wa_result_publish',  label: 'Result Published', desc: 'Notify when exam results are out' },
  { key: 'wa_exam_schedule',   label: 'Exam Schedule',    desc: 'Notify 2 days before exam' },
];
function WhatsAppSettingsTab({ dark }) {
  const s = useStyles(dark);
  const [form,    setForm]    = useState({ WA_PHONE_NUMBER_ID: '', WA_ACCESS_TOKEN: '', WA_ENABLED: false });
  const [events,  setEvents]  = useState({});
  const [showToken, setShowToken] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    getSettings()
      .then(r => {
        const d = r.data?.data ?? r.data ?? {};
        setForm({
          WA_PHONE_NUMBER_ID: d.WA_PHONE_NUMBER_ID || '',
          WA_ACCESS_TOKEN:    d.WA_ACCESS_TOKEN    || '',
          WA_ENABLED:         d.WA_ENABLED === 'true' || d.WA_ENABLED === true,
        });
        const ev = {};
        WA_EVENTS.forEach(e => { ev[e.key] = d[e.key] === 'true' || d[e.key] === true; });
        setEvents(ev);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, WA_ENABLED: String(form.WA_ENABLED) };
      WA_EVENTS.forEach(e => { payload[e.key] = String(events[e.key] || false); });
      await saveSettings(payload);
      toast.success('WhatsApp settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testPhone) return toast.error('Enter a phone number to test');
    setTesting(true);
    try {
      await sendWhatsApp({ phone: testPhone, template: 'test_message', params: [] });
      toast.success('Test message sent — check your WhatsApp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed — check credentials');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className={s.section}>WhatsApp Business API</p>
        <div className="space-y-3">
          <div>
            <label className={s.lbl}>Phone Number ID</label>
            <input value={form.WA_PHONE_NUMBER_ID}
              onChange={e => setForm(p => ({ ...p, WA_PHONE_NUMBER_ID: e.target.value }))}
              placeholder="From Meta Business → WhatsApp → Phone numbers"
              className={s.inp} />
          </div>
          <div>
            <label className={s.lbl}>Access Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.WA_ACCESS_TOKEN}
                onChange={e => setForm(p => ({ ...p, WA_ACCESS_TOKEN: e.target.value }))}
                placeholder="Permanent token from Meta Developer Console"
                className={`${s.inp} pr-10`} />
              <button type="button" onClick={() => setShowToken(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`w-10 h-5 rounded-full transition-colors ${form.WA_ENABLED ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              onClick={() => setForm(p => ({ ...p, WA_ENABLED: !p.WA_ENABLED }))}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.WA_ENABLED ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Enable WhatsApp notifications</span>
          </label>
        </div>
      </div>

      <div>
        <p className={s.section}>Notification Events</p>
        <div className="space-y-2">
          {WA_EVENTS.map(ev => (
            <label key={ev.key} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${dark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'}`}>
              <div>
                <p className={`text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{ev.label}</p>
                <p className="text-xs text-slate-400">{ev.desc}</p>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${events[ev.key] ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                onClick={() => setEvents(p => ({ ...p, [ev.key]: !p[ev.key] }))}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${events[ev.key] ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className={s.section}>Test Connection</p>
        <div className="flex gap-3">
          <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
            placeholder="+923001234567"
            className={`${s.inp} flex-1`} />
          <button onClick={handleTest} disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap">
            {testing ? <Clock size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            Send Test
          </button>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 text-sm">
        {saving ? 'Saving…' : 'Save WhatsApp Settings'}
      </button>
    </div>
  );
}

/* ─── Webhooks Tab ─────────────────────────────────────────────── */
function WebhooksTab({ dark }) {
  const s = useStyles(dark);
  const [hooks,       setHooks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState(null);   // null = add, object = edit
  const [form,        setForm]        = useState({ url: '', description: '', events: [], is_active: true });
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState({});     // { [id]: bool }
  const [logsOpen,    setLogsOpen]    = useState(null);   // webhook id
  const [logs,        setLogs]        = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [copied,      setCopied]      = useState(null);   // webhook id

  const load = useCallback(() => {
    setLoading(true);
    getWebhooks()
      .then(r => setHooks(Array.isArray(r.data?.data ?? r.data) ? (r.data?.data ?? r.data) : []))
      .catch(() => toast.error('Failed to load webhooks'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ url: '', description: '', events: [], is_active: true });
    setModalOpen(true);
  };

  const openEdit = (wh) => {
    setEditing(wh);
    setForm({ url: wh.url, description: wh.description || '', events: wh.events || [], is_active: wh.is_active });
    setModalOpen(true);
  };

  const toggleEvent = (val) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(val) ? f.events.filter(e => e !== val) : [...f.events, val],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.url.trim()) return toast.error('URL is required');
    if (form.events.length === 0) return toast.error('Select at least one event');
    setSaving(true);
    try {
      if (editing) {
        await updateWebhook(editing.id, form);
        toast.success('Webhook updated');
      } else {
        await createWebhook(form);
        toast.success('Webhook created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save webhook');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteWebhook(id); toast.success('Webhook deleted'); load(); }
    catch { toast.error('Failed to delete webhook'); }
  };

  const handleTest = async (id) => {
    setTesting(t => ({ ...t, [id]: true }));
    try {
      const res = await testWebhook(id);
      const http = res.data?.data?.http_status;
      if (http && http >= 200 && http < 300) toast.success(`Test delivered — HTTP ${http}`);
      else toast.error(`Test failed — HTTP ${http ?? 'timeout'}`);
    } catch { toast.error('Test delivery failed'); }
    finally { setTesting(t => ({ ...t, [id]: false })); }
  };

  const openLogs = async (id) => {
    setLogsOpen(id); setLogs([]); setLogsLoading(true);
    try {
      const res = await getWebhookLogs(id);
      setLogs(Array.isArray(res.data?.data ?? res.data) ? (res.data?.data ?? res.data) : []);
    } catch { toast.error('Failed to load logs'); }
    finally { setLogsLoading(false); }
  };

  const copySecret = (id, secret) => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const statusColor = (status) => {
    if (status === 'success') return dark ? 'text-emerald-400' : 'text-emerald-600';
    if (status === 'failed')  return dark ? 'text-red-400'     : 'text-red-600';
    return dark ? 'text-slate-400' : 'text-slate-500';
  };

  const StatusIcon = ({ status }) => {
    if (status === 'success') return <CheckCheck size={13} className={statusColor(status)} />;
    if (status === 'failed')  return <XCircle    size={13} className={statusColor(status)} />;
    return <Clock size={13} className={statusColor(status)} />;
  };

  return (
    <div className="max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Webhook Endpoints</p>
          <p className={s.muted}>Receive real-time HTTP notifications for key events.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
        >
          <Plus size={14} /> Add Webhook
        </button>
      </div>

      {/* Info banner */}
      <div className={`flex gap-3 p-3.5 rounded-xl border mb-5 text-xs leading-relaxed ${dark ? 'bg-slate-700/50 border-slate-600 text-slate-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
        <ShieldCheck size={15} className="shrink-0 mt-0.5 text-indigo-500" />
        Each request is signed with <code className="mx-1 font-mono bg-black/10 px-1 rounded">X-Webhook-Signature: sha256=&lt;hex&gt;</code>. Verify it with your endpoint's secret to ensure authenticity.
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : hooks.length === 0 ? (
        <div className={`py-12 text-center rounded-2xl border-2 border-dashed ${dark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          <Webhook size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No webhooks configured</p>
          <button onClick={openAdd} className="mt-3 text-xs text-indigo-500 hover:underline">Add your first webhook →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map(wh => (
            <div key={wh.id} className={`rounded-2xl border p-4 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Webhook size={16} className={dark ? 'text-indigo-400' : 'text-indigo-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-sm font-semibold truncate ${dark ? 'text-white' : 'text-slate-800'}`}>{wh.url}</span>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${wh.is_active
                      ? dark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : dark ? 'bg-slate-700 text-slate-400'         : 'bg-slate-100 text-slate-500'}`}>
                      {wh.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {wh.description && <p className={`text-xs mt-0.5 ${s.muted}`}>{wh.description}</p>}

                  {/* Event chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(wh.events || []).map(ev => (
                      <span key={ev} className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                        {ev}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className={`flex gap-4 mt-2 text-xs ${s.muted}`}>
                    {wh.total_deliveries > 0 && (
                      <>
                        <span>{wh.total_deliveries} deliveries</span>
                        <span className={dark ? 'text-emerald-400' : 'text-emerald-600'}>{wh.successful} ok</span>
                        {wh.last_fired_at && <span>Last: {new Date(wh.last_fired_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    title="Copy secret"
                    onClick={() => copySecret(wh.id, wh.secret)}
                    className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                  >
                    {copied === wh.id ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                  <button
                    title="Test webhook"
                    disabled={testing[wh.id]}
                    onClick={() => handleTest(wh.id)}
                    className={`p-1.5 rounded-lg transition disabled:opacity-50 ${dark ? 'hover:bg-slate-700 text-slate-400 hover:text-indigo-400' : 'hover:bg-slate-100 text-slate-400 hover:text-indigo-600'}`}
                  >
                    {testing[wh.id]
                      ? <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      : <FlaskConical size={14} />}
                  </button>
                  <button
                    title="Delivery logs"
                    onClick={() => logsOpen === wh.id ? setLogsOpen(null) : openLogs(wh.id)}
                    className={`p-1.5 rounded-lg transition ${logsOpen === wh.id
                      ? dark ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-700'
                      : dark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                  >
                    {logsOpen === wh.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    title="Edit"
                    onClick={() => openEdit(wh)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition ${dark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                  >
                    Edit
                  </button>
                  <button
                    title="Delete"
                    onClick={() => handleDelete(wh.id)}
                    className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Logs drawer */}
              {logsOpen === wh.id && (
                <div className={`mt-4 pt-4 border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Last 50 Deliveries</p>
                  {logsLoading ? (
                    <div className="py-4 text-center"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  ) : logs.length === 0 ? (
                    <p className={`text-xs text-center py-4 ${s.muted}`}>No deliveries yet</p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {logs.map(lg => (
                        <div key={lg.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs ${dark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <StatusIcon status={lg.status} />
                          <span className={`font-mono font-semibold ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>{lg.event}</span>
                          <span className={statusColor(lg.status)}>{lg.status}</span>
                          {lg.http_status && <span className={s.muted}>HTTP {lg.http_status}</span>}
                          {lg.duration_ms && <span className={s.muted}>{lg.duration_ms}ms</span>}
                          <span className={`ml-auto ${s.muted}`}>{new Date(lg.fired_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
              <h2 className={`font-bold text-base ${dark ? 'text-white' : 'text-slate-800'}`}>
                {editing ? 'Edit Webhook' : 'New Webhook'}
              </h2>
              <button onClick={() => setModalOpen(false)} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className={s.lbl}>Endpoint URL *</label>
                <input
                  className={s.inp}
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className={s.lbl}>Description</label>
                <input
                  className={s.inp}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note about this endpoint"
                />
              </div>
              <div>
                <label className={`${s.lbl} mb-2.5`}>Subscribe to Events *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WEBHOOK_EVENTS.map(ev => {
                    const checked = form.events.includes(ev.value);
                    return (
                      <label
                        key={ev.value}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${checked
                          ? dark ? 'bg-indigo-900/30 border-indigo-600' : 'bg-indigo-50 border-indigo-300'
                          : dark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(ev.value)}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <div>
                          <p className={`text-xs font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>{ev.label}</p>
                          <p className={`text-xs ${s.muted}`}>{ev.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className={`${s.lbl} mb-0`}>Active</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.is_active ? 'bg-indigo-600' : dark ? 'bg-slate-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 m-0.5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className={`flex gap-3 pt-2 border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${dark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Security Tab (2FA) ───────────────────────────────────────── */
function SecurityTab({ dark }) {
  const { user } = useAuth();
  const [setupData,  setSetupData]  = useState(null);  // { secret, qr_uri }
  const [setting,    setSetting]    = useState(false);
  const [enableCode, setEnableCode] = useState('');
  const [enabling,   setEnabling]   = useState(false);
  const [disableForm, setDisableForm] = useState({ password: '', totp_code: '' });
  const [disabling,  setDisabling]  = useState(false);
  const [showDis,    setShowDis]    = useState(false);

  if (user?.role !== 'admin') {
    return <p className="text-sm text-slate-500">2FA management is only available for admin accounts.</p>;
  }

  const handleStartSetup = async () => {
    setSetting(true);
    try {
      const r = await get2FASetup();
      setSetupData(r.data?.data ?? r.data);
      setEnableCode('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to start setup'); }
    finally { setSetting(false); }
  };

  const handleEnable = async (e) => {
    e.preventDefault();
    if (!enableCode) { toast.error('Enter the 6-digit code'); return; }
    setEnabling(true);
    try {
      await apiEnable2FA({ totp_code: enableCode });
      toast.success('2FA enabled! Your account is now protected.');
      setSetupData(null);
      setEnableCode('');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid code — try again'); }
    finally { setEnabling(false); }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setDisabling(true);
    try {
      await apiDisable2FA(disableForm);
      toast.success('2FA disabled');
      setShowDis(false);
      setDisableForm({ password: '', totp_code: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to disable 2FA'); }
    finally { setDisabling(false); }
  };

  const inp = `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
    dark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
         : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
  }`;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className={`text-base font-semibold mb-0.5 ${dark ? 'text-white' : 'text-slate-800'}`}>Two-Factor Authentication</h2>
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Add an extra layer of security. After enabling, you'll need your phone's authenticator app (Google Authenticator, Authy, etc.) to log in.
        </p>
      </div>

      {/* Setup flow */}
      {!setupData ? (
        <div className={`rounded-2xl border p-5 space-y-4 ${dark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Set up Authenticator App</p>
              <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Scan QR code with Google Authenticator or Authy</p>
            </div>
          </div>
          <button onClick={handleStartSetup} disabled={setting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            {setting ? 'Generating…' : 'Generate QR Code'}
          </button>
        </div>
      ) : (
        <div className={`rounded-2xl border p-5 space-y-4 ${dark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Scan this QR code</p>
          <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Open your authenticator app → tap + → Scan QR code. Or enter the secret manually.
          </p>
          {/* QR via Google Chart API */}
          <div className="flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qr_uri)}`}
              alt="TOTP QR Code"
              className="rounded-xl border-4 border-white shadow-md"
              width={180} height={180}
            />
          </div>
          <p className={`text-xs text-center font-mono break-all ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            Manual key: <span className="font-bold">{setupData.secret}</span>
          </p>
          <form onSubmit={handleEnable} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className={`text-xs font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Enter the 6-digit code to confirm setup:</p>
            <input type="text" inputMode="numeric" maxLength={6} value={enableCode}
              onChange={e => setEnableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" className={`${inp} text-center text-xl tracking-[0.4em] font-mono`} />
            <div className="flex gap-2">
              <button type="submit" disabled={enabling || enableCode.length !== 6}
                className="flex-1 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {enabling ? 'Verifying…' : 'Enable 2FA'}
              </button>
              <button type="button" onClick={() => setSetupData(null)}
                className={`px-4 py-2 text-sm rounded-xl border ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disable 2FA section */}
      <div className={`rounded-2xl border p-5 space-y-3 ${dark ? 'border-red-900/40 bg-red-950/20' : 'border-red-100 bg-red-50'}`}>
        <p className={`text-sm font-semibold ${dark ? 'text-red-300' : 'text-red-700'}`}>Disable 2FA</p>
        <p className={`text-xs ${dark ? 'text-red-400/70' : 'text-red-500'}`}>Disabling 2FA reduces your account security. Requires your current password and current authenticator code.</p>
        {!showDis ? (
          <button onClick={() => setShowDis(true)}
            className="px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            Disable 2FA
          </button>
        ) : (
          <form onSubmit={handleDisable} className="space-y-3">
            <input type="password" value={disableForm.password}
              onChange={e => setDisableForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Current password" className={inp} />
            <input type="text" inputMode="numeric" maxLength={6} value={disableForm.totp_code}
              onChange={e => setDisableForm(f => ({ ...f, totp_code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              placeholder="6-digit authenticator code" className={`${inp} text-center tracking-widest font-mono`} />
            <div className="flex gap-2">
              <button type="submit" disabled={disabling}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-60">
                {disabling ? 'Disabling…' : 'Confirm Disable'}
              </button>
              <button type="button" onClick={() => setShowDis(false)}
                className={`px-4 py-2 text-sm rounded-xl border ${dark ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Main Settings Page ───────────────────────────────────────── */
export default function SettingsPage() {
  const { isDark: dark } = useTheme();   // ← fixed: was `dark` (undefined), now `isDark`
  const [tab, setTab] = useState('school');

  const pageBg = dark ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm';
  const titleColor = dark ? 'text-white' : 'text-slate-800';
  const subColor   = dark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen p-6 ${pageBg}`}>
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${titleColor}`}>Settings</h1>
        <p className={`text-sm mt-0.5 ${subColor}`}>School configuration, academic years & data backup</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* Sidebar navigation */}
        <div className="w-52 shrink-0">
          <nav className={`rounded-2xl border p-2 space-y-1 ${cardBg}`}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : dark
                        ? 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-white' : dark ? 'text-slate-400' : 'text-slate-500'} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className={`flex-1 rounded-2xl border p-6 ${cardBg}`}>
          {tab === 'school'    && <SchoolSettingsTab dark={dark} />}
          {tab === 'academic'  && <AcademicYearsTab dark={dark} />}
          {tab === 'whatsapp'  && <WhatsAppSettingsTab dark={dark} />}
          {tab === 'webhooks'  && <WebhooksTab dark={dark} />}
          {tab === 'backup'    && <BackupTab dark={dark} />}
          {tab === 'security'  && <SecurityTab dark={dark} />}
        </div>

      </div>
    </div>
  );
}
