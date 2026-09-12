import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Pencil, Trash2, Eye, Printer, ChevronDown,
  Download, ArrowLeft, Loader2, X, Save, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/Modal';
import {
  getTeacher,
  getLetterTemplates,
  getLetterTemplate,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
  generateTeacherDocument,
} from '../api/teachers';

const DOC_TYPES = [
  { value: 'appointment',       label: 'Appointment Letter' },
  { value: 'experience',        label: 'Experience Letter' },
  { value: 'salary_certificate', label: 'Salary Certificate' },
  { value: 'custom',            label: 'Custom Letter' },
];

const PLACEHOLDERS = [
  '{name}', '{designation}', '{employee_id}', '{salary}', '{join_date}',
  '{subject}', '{qualification}', '{phone}', '{email}', '{username}',
  '{school_name}', '{school_address}', '{school_phone}', '{principal_name}',
  '{issue_date}', '{from_date}', '{to_date}',
];

// ── Template editor modal ────────────────────────────────────────────────────
function TemplateModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:        existing?.title        || '',
    doc_type:     existing?.doc_type     || 'custom',
    subject_line: existing?.subject_line || '',
    body:         existing?.body         || '',
    is_active:    existing?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef(null);

  const insertToken = (token) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = form.body.slice(0, start) + token + form.body.slice(end);
    setForm(f => ({ ...f, body: next }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.body.trim())  return toast.error('Body is required');
    setSaving(true);
    try {
      if (existing) {
        await updateLetterTemplate(existing.id, form);
        toast.success('Template updated');
      } else {
        await createLetterTemplate(form);
        toast.success('Template created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-6 border border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-white text-base">
            {existing ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1">
          {/* Title + Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Appointment Letter 2024"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Document Type</label>
              <select
                value={form.doc_type}
                onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Subject line */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Subject Line</label>
            <input
              value={form.subject_line}
              onChange={e => setForm(f => ({ ...f, subject_line: e.target.value }))}
              placeholder="e.g. Appointment Letter – {designation}"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Placeholder chips */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Insert Placeholder</p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => insertToken(p)}
                  className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Body textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Body (HTML) *</label>
            <textarea
              ref={bodyRef}
              rows={14}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Write HTML content here. Use {placeholder} tokens."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Active (visible when generating documents)</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {existing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate document modal ──────────────────────────────────────────────────
function GenerateModal({ teacher, templates, onClose }) {
  const [templateId,    setTemplateId]    = useState('');
  const [issueDate,     setIssueDate]     = useState(new Date().toISOString().slice(0, 10));
  const [fromDate,      setFromDate]      = useState(teacher.join_date ? teacher.join_date.slice(0, 10) : '');
  const [toDate,        setToDate]        = useState(new Date().toISOString().slice(0, 10));
  const [principalName, setPrincipalName] = useState('');
  const [generating,    setGenerating]    = useState(false);
  const [html,          setHtml]          = useState(null);
  const iframeRef = useRef(null);

  const selectedTemplate = templates.find(t => String(t.id) === String(templateId));
  const needsDateRange   = selectedTemplate?.doc_type === 'experience';

  const handleGenerate = async () => {
    if (!templateId) return toast.error('Select a template first');
    setGenerating(true);
    try {
      const overrides = { issue_date: issueDate };
      if (needsDateRange) { overrides.from_date = fromDate; overrides.to_date = toDate; }
      if (principalName) overrides.principal_name = principalName;
      const r = await generateTeacherDocument(teacher.id, { template_id: templateId, overrides });
      setHtml(r.data?.data?.html || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `document_${teacher.full_name?.replace(/\s+/g, '_')}_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl my-6 border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white text-base">Generate Document</h2>
            <p className="text-xs text-slate-500 mt-0.5">{teacher.full_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-0">
          {/* Left: form */}
          <div className="lg:w-80 shrink-0 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Template *</label>
              <select
                value={templateId}
                onChange={e => { setTemplateId(e.target.value); setHtml(null); }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Select template —</option>
                {DOC_TYPES.map(dt => {
                  const group = templates.filter(t => t.doc_type === dt.value);
                  if (!group.length) return null;
                  return (
                    <optgroup key={dt.value} label={dt.label}>
                      {group.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Issue Date</label>
              <input
                type="date" value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {needsDateRange && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">From Date</label>
                  <input
                    type="date" value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">To Date</label>
                  <input
                    type="date" value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Principal / Signatory Name <span className="normal-case text-slate-400">(optional)</span>
              </label>
              <input
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                placeholder="Leave blank to use settings"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !templateId}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {generating ? 'Generating…' : 'Preview'}
            </button>

            {html && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download size={13} /> Save HTML
                </button>
              </div>
            )}
          </div>

          {/* Right: preview iframe */}
          <div className="flex-1 min-h-[500px] bg-slate-100 dark:bg-slate-950 rounded-b-2xl lg:rounded-r-2xl overflow-hidden flex flex-col">
            {!html ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                <div className="text-center">
                  <FileText size={40} className="mx-auto mb-2 opacity-40" />
                  <p>Select a template and click Preview</p>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="document-preview"
                srcDoc={html}
                className="flex-1 w-full border-0 bg-white"
                style={{ minHeight: 600 }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TeacherDocumentPage() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const [teacher,     setTeacher]     = useState(null);
  const [templates,   setTemplates]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [templateModal, setTemplateModal] = useState(null); // null | 'new' | {template object}
  const [generateModal, setGenerateModal] = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [activeType,   setActiveType]     = useState('all');

  const load = useCallback(async () => {
    try {
      const [tRes, tmpRes] = await Promise.all([
        getTeacher(id),
        getLetterTemplates(),
      ]);
      setTeacher(tRes.data?.data ?? tRes.data);
      setTemplates(tmpRes.data?.data ?? tmpRes.data ?? []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    try {
      await deleteLetterTemplate(deleteTarget.id);
      toast.success('Template deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const displayed = activeType === 'all' ? templates : templates.filter(t => t.doc_type === activeType);

  if (loading) return <PageLoader />;
  if (!teacher) return (
    <Layout>
      <div className="p-8 text-center text-slate-500">Teacher not found</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* Hero */}
        <div
          className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #047857, #059669, #0d9488)' }}
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate(`/teachers/${id}`)}
                className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Profile
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Document Generator</h1>
              <p className="text-white/60 text-sm mt-1">{teacher.full_name}</p>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button
                onClick={() => setGenerateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold shadow hover:bg-emerald-50 transition-all"
              >
                <FileText size={14} /> Generate Document
              </button>
              <button
                onClick={() => setTemplateModal('new')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-all border border-white/30"
              >
                <Plus size={14} /> New Template
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-8 -mt-12 pb-12">

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[{ value: 'all', label: 'All Templates' }, ...DOC_TYPES].map(t => (
              <button
                key={t.value}
                onClick={() => setActiveType(t.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeType === t.value
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {displayed.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No templates yet</p>
              <button
                onClick={() => setTemplateModal('new')}
                className="mt-3 text-emerald-600 text-sm font-semibold hover:underline"
              >
                Create your first template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map(t => (
                <div
                  key={t.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{t.title}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                        {DOC_TYPES.find(d => d.value === t.doc_type)?.label || t.doc_type}
                      </span>
                    </div>
                    {!t.is_active && (
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  {t.subject_line && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-4">{t.subject_line}</p>
                  )}

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => { setTemplateModal(t); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {templateModal && (
        <TemplateModal
          existing={templateModal === 'new' ? null : templateModal}
          onClose={() => setTemplateModal(null)}
          onSaved={load}
        />
      )}

      {generateModal && (
        <GenerateModal
          teacher={teacher}
          templates={templates.filter(t => t.is_active)}
          onClose={() => setGenerateModal(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Template"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
          variant="danger"
        />
      )}
    </Layout>
  );
}
