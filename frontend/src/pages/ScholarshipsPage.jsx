import { useState, useEffect, useCallback } from 'react';
import {
  Award, Plus, Trash2, X, ChevronDown, CheckCircle2, XCircle,
  Clock3, Search, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import { INPUT_CLS } from '../components/ui/Input';
import { ModalHeader } from '../components/ui/Modal';

const SCHOLARSHIP_STATUS_TABS = [
  { id: '',         label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];
import { getStudents } from '../api/students';
import { getApplications, createApplication, reviewApplication, deleteApplication } from '../api/scholarships';

const inp = INPUT_CLS;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_BADGE = {
  pending:  { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   Icon: Clock3,        label: 'Pending' },
  approved: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Icon: CheckCircle2, label: 'Approved' },
  rejected: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           Icon: XCircle,      label: 'Rejected' },
};

function NewApplicationModal({ onClose, onSaved }) {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ student_id: '', fee_head: '', discount_type: 'percent', discount_value: '', reason: '' });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getStudents({ status: 'active', limit: 200, search: search || undefined })
      .then(r => { const d = r.data?.data ?? r.data ?? []; setStudents(Array.isArray(d) ? d : []); })
      .catch(() => {});
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_id) return toast.error('Select a student');
    if (!form.discount_value) return toast.error('Discount value required');
    if (!form.reason.trim()) return toast.error('Reason required');
    setSaving(true);
    try {
      await createApplication({ ...form, discount_value: parseFloat(form.discount_value) });
      toast.success('Application submitted');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalHeader title="New Scholarship Application" onClose={onClose} sticky />
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type name to search…"
                className={`${inp} pl-9`} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Student *</label>
            <div className="relative">
              <select value={form.student_id} onChange={e => set('student_id', e.target.value)} className={`${inp} appearance-none pr-8`}>
                <option value="">Select student…</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.name} — {s.class_name || '—'}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Fee Head</label>
            <input value={form.fee_head} onChange={e => set('fee_head', e.target.value)} placeholder="e.g. Tuition Fee" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Discount Type *</label>
              <div className="relative">
                <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)} className={`${inp} appearance-none pr-8`}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Value *</label>
              <input type="number" min="0" step="0.01" value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
                placeholder={form.discount_type === 'percent' ? '0–100' : 'Amount'} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reason *</label>
            <textarea rows={3} value={form.reason} onChange={e => set('reason', e.target.value)}
              placeholder="Reason for scholarship/concession…" className={`${inp} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {saving ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReviewModal({ application, onClose, onSaved }) {
  const [action, setAction] = useState('approved');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await reviewApplication(application.id, { status: action, admin_note: adminNote });
      toast.success(`Application ${action}`);
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <ModalHeader title="Review Application" onClose={onClose} />
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 mx-5 mt-5 rounded-xl text-sm space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">{application.student_name}</p>
          <p className="text-slate-500">{application.class_name || '—'} · {application.discount_type} discount: {application.discount_value}</p>
          <p className="text-slate-500 italic">"{application.reason}"</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-3">
            {['approved', 'rejected'].map(opt => (
              <button type="button" key={opt} onClick={() => setAction(opt)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  action === opt
                    ? opt === 'approved' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-red-600 border-red-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                {opt === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {opt === 'approved' ? 'Approve' : 'Reject'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Admin Note (optional)</label>
            <textarea rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)}
              placeholder="Add a note…" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors ${action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? 'Saving…' : action === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ScholarshipsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const r = await getApplications(params);
      const d = r.data?.data ?? r.data ?? [];
      setApplications(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteApplication(deleteTarget.id);
      toast.success('Application deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={Award}
            title="Scholarships & Concessions"
            subtitle="Concession approval workflow"
            actions={
              <div className="flex items-center gap-2">
                <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> New Application
                </button>
              </div>
            }
          />

          {/* Status Tabs */}
          <TabBar tabs={SCHOLARSHIP_STATUS_TABS} active={statusFilter} onChange={setStatusFilter} />

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Applications <span className="text-xs font-normal text-slate-400">({applications.length})</span>
              </h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : applications.length === 0 ? (
              <div className="py-12 text-center">
                <Award className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Student</th>
                      <th className="text-left px-5 py-3 font-semibold">Class</th>
                      <th className="text-left px-5 py-3 font-semibold">Discount</th>
                      <th className="text-left px-5 py-3 font-semibold">Reason</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-left px-5 py-3 font-semibold">Applied</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {applications.map(app => {
                      const badge = STATUS_BADGE[app.status] ?? STATUS_BADGE.pending;
                      const BadgeIcon = badge.Icon;
                      return (
                        <tr key={app.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                {(app.student_name || 'S')[0]}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{app.student_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{app.class_name || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {app.discount_type === 'percent' ? `${app.discount_value}%` : `Rs ${app.discount_value}`}
                            </span>
                            {app.fee_head && <p className="text-xs text-slate-400">{app.fee_head}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate" title={app.reason}>{app.reason || '—'}</td>
                          <td className="px-5 py-3.5">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                                <BadgeIcon className="w-3 h-3" /> {badge.label}
                              </span>
                              {app.admin_note && <p className="text-[10px] text-slate-400 max-w-[140px] truncate">"{app.admin_note}"</p>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">{fmtDate(app.applied_at || app.created_at)}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {app.status === 'pending' && (
                                <button onClick={() => setReviewTarget(app)}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-200 transition-colors">
                                  Review
                                </button>
                              )}
                              <button onClick={() => setDeleteTarget(app)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewModal && (
        <NewApplicationModal onClose={() => setShowNewModal(false)} onSaved={() => { setShowNewModal(false); load(); }} />
      )}

      {reviewTarget && (
        <ReviewModal application={reviewTarget} onClose={() => setReviewTarget(null)} onSaved={() => { setReviewTarget(null); load(); }} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Delete Application?</h3>
            <p className="text-sm text-slate-500 text-center mt-2">{deleteTarget.student_name}'s application will be permanently deleted.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
