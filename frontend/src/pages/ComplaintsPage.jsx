import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Trash2, X, Send, Loader2, ChevronRight, Eye, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState     from '../components/ui/EmptyState';
import {
  getComplaints, getComplaint, getSummary,
  createComplaint, addResponse, updateComplaint, deleteComplaint,
} from '../api/complaints';

// ── Config ────────────────────────────────────────────────────────
const STATUS = {
  open:      { label: 'Open',      cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  in_review: { label: 'In Review', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  resolved:  { label: 'Resolved',  cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  closed:    { label: 'Closed',    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  rejected:  { label: 'Rejected',  cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
};

const PRIORITY = {
  low:    { label: 'Low',    cls: 'text-gray-500' },
  normal: { label: 'Normal', cls: 'text-blue-600' },
  high:   { label: 'High',   cls: 'text-orange-600 font-semibold' },
  urgent: { label: 'Urgent', cls: 'text-red-600 font-bold' },
};

const CATEGORIES = ['academic', 'facilities', 'staff', 'administration', 'harassment', 'other'];
const TABS = ['All Complaints', 'Submit Complaint'];

const emptyForm = {
  category: '', subject: '', description: '',
  priority: 'normal', anonymous: false,
};

export default function ComplaintsPage() {
  const [tab,         setTab]       = useState(0);
  const [rows,        setRows]      = useState([]);
  const [total,       setTotal]     = useState(0);
  const [loading,     setLoading]   = useState(true);
  const [summary,     setSummary]   = useState(null);
  const [search,      setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCat,   setFilterCat] = useState('');
  const [form,        setForm]      = useState(emptyForm);
  const [submitting,  setSubmitting] = useState(false);
  const [detailId,    setDetailId]  = useState(null);
  const [detail,      setDetail]    = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMsg,    setReplyMsg]  = useState('');
  const [replying,    setReplying]  = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);

  // Load summary (admin only — fails silently for non-admins)
  useEffect(() => {
    getSummary().then(r => setSummary(r.data?.data ?? null)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (tab === 1) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filterStatus) params.status   = filterStatus;
      if (filterCat)    params.category = filterCat;
      const res = await getComplaints(params);
      setRows(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch { toast.error('Failed to load complaints'); }
    finally  { setLoading(false); }
  }, [tab, filterStatus, filterCat]);

  useEffect(() => { load(); }, [load]);

  // Load complaint detail
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    setDetailLoading(true);
    getComplaint(detailId)
      .then(r => setDetail(r.data?.data ?? null))
      .catch(() => { toast.error('Failed to load complaint'); setDetailId(null); })
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  // Filtered
  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.subject || '').toLowerCase().includes(q)
      || (r.category || '').toLowerCase().includes(q)
      || (r.submitted_by_name || '').toLowerCase().includes(q);
  });

  // Submit complaint
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.category || !form.subject || !form.description) {
      toast.error('Category, subject and description are required'); return;
    }
    setSubmitting(true);
    try {
      await createComplaint(form);
      toast.success('Complaint submitted successfully');
      setForm(emptyForm);
      setTab(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally { setSubmitting(false); }
  }

  // Add reply
  async function handleReply(e) {
    e.preventDefault();
    if (!replyMsg.trim()) return;
    setReplying(true);
    try {
      await addResponse(detailId, { message: replyMsg });
      setReplyMsg('');
      // Reload detail
      const res = await getComplaint(detailId);
      setDetail(res.data?.data ?? null);
      toast.success('Response added');
    } catch { toast.error('Failed to send response'); }
    finally  { setReplying(false); }
  }

  // Update status
  async function handleUpdateStatus(status) {
    try {
      await updateComplaint(updateModal.id, { status });
      toast.success(`Status updated to ${status}`);
      setUpdateModal(null);
      load();
      if (detailId === updateModal.id) {
        const res = await getComplaint(detailId);
        setDetail(res.data?.data ?? null);
      }
    } catch { toast.error('Failed to update'); }
  }

  // Delete
  async function handleDelete() {
    if (!deleteModal) return;
    try {
      await deleteComplaint(deleteModal.id);
      toast.success('Deleted');
      setDeleteModal(null);
      if (detailId === deleteModal.id) setDetailId(null);
      load();
    } catch { toast.error('Failed to delete'); }
  }

  const StatusBadge = ({ status }) => {
    const s = STATUS[status] || STATUS.open;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-purple-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaints & Feedback</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Submit and track complaints, feedback, and concerns</p>
            </div>
          </div>
          <button onClick={() => setTab(1)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Submit Complaint
          </button>
        </div>

        {/* Summary (admin) */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(summary.by_status ?? []).map(b => (
              <div key={b.status} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{STATUS[b.status]?.label ?? b.status}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{b.count}</p>
              </div>
            ))}
            {summary.urgent_open > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1"><AlertTriangle size={12} /> Urgent Open</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{summary.urgent_open}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === i ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Submit Form */}
        {tab === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Submit New Complaint or Feedback</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm capitalize"
                  required
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief subject of your complaint..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <textarea rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Please describe your complaint in detail..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="anonymous" checked={form.anonymous}
                  onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="anonymous" className="text-sm text-gray-700 dark:text-gray-300">Submit anonymously</label>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  Submit Complaint
                </button>
                <button type="button" onClick={() => setForm(emptyForm)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {tab === 0 && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search subject, category, name..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white capitalize"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={load}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading ? <PageLoader /> : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{filtered.length} of {total} complaints</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.length === 0 ? (
                    <EmptyState
                      icon={MessageSquare}
                      title="No complaints found"
                      description="Adjust the filter or submit a new complaint."
                      actionLabel="Submit Complaint"
                      onAction={() => setTab(1)}
                      size="sm"
                    />
                  ) : filtered.map(row => (
                    <div key={row.id}
                      className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer flex items-start justify-between gap-4"
                      onClick={() => setDetailId(row.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-semibold uppercase ${PRIORITY[row.priority]?.cls}`}>
                            {PRIORITY[row.priority]?.label}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{row.category}</span>
                          {row.anonymous && <span className="text-xs text-gray-400 italic">Anonymous</span>}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">{row.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {row.submitted_by_name || (row.anonymous ? 'Anonymous' : '—')} · {new Date(row.created_at).toLocaleDateString()} · {row.response_count} response{row.response_count !== '1' ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={row.status} />
                        <button onClick={e => { e.stopPropagation(); setUpdateModal(row); }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                          title="Change status"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleteModal(row); }}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {detailId && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Complaint Detail</h2>
              <button onClick={() => setDetailId(null)}><X size={20} className="text-gray-500" /></button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500" size={32} />
              </div>
            ) : detail ? (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Meta */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={detail.status} />
                      <span className={`text-xs font-semibold ${PRIORITY[detail.priority]?.cls}`}>
                        {PRIORITY[detail.priority]?.label} Priority
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{detail.category}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{detail.subject}</h3>
                    <p className="text-xs text-gray-500">
                      {detail.anonymous ? 'Anonymous submission' : `By ${detail.submitted_by_name}`} · {new Date(detail.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {detail.description}
                  </div>

                  {/* Responses */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      Responses ({(detail.responses || []).length})
                    </p>
                    <div className="space-y-3">
                      {(detail.responses || []).map(r => (
                        <div key={r.id} className={`rounded-xl p-3 text-sm ${
                          r.internal
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                            : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{r.author_name || 'Unknown'}</span>
                            <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">{r.message}</p>
                          {r.internal && <p className="text-xs text-yellow-600 mt-1 italic">Internal note</p>}
                        </div>
                      ))}
                      {(detail.responses || []).length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No responses yet</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply box */}
                {detail.status !== 'closed' && detail.status !== 'rejected' && (
                  <form onSubmit={handleReply} className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <input
                      value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
                      placeholder="Write a response..."
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                    />
                    <button type="submit" disabled={replying || !replyMsg.trim()}
                      className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {replying ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                    </button>
                  </form>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {updateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Update Status</h2>
              <button onClick={() => setUpdateModal(null)}><X size={18} className="text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">"{updateModal.subject}"</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS).map(([k, v]) => (
                <button key={k} onClick={() => handleUpdateStatus(k)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors
                    ${updateModal.status === k
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete Complaint?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Delete "<strong>{deleteModal.subject}</strong>"? This is permanent.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >Delete</button>
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );

}
