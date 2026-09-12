import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, CheckCircle2, Clock, XCircle,
  RefreshCw, Trash2, X, Calendar, Loader2, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getSubstitutions, getTodaySubstitutions, getAvailableTeachers,
  getSummary, createSubstitution, updateStatus, deleteSubstitution,
} from '../api/substitutions';
import { useClasses } from '../hooks/useReferenceData';

// ── Config ────────────────────────────────────────────────────────
const STATUS = {
  pending:   { label: 'Pending',   cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', icon: Clock },
  accepted:  { label: 'Accepted',  cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  declined:  { label: 'Declined',  cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', icon: XCircle },
  completed: { label: 'Completed', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: CheckCircle2 },
};

const TABS = ['Today', 'All Substitutions', 'Assign Substitution'];

const emptyForm = {
  original_teacher_id: '', substitute_teacher_id: '', class_id: '',
  subject: '', date: new Date().toISOString().slice(0, 10),
  period: '', reason: '', notes: '',
};

export default function SubstitutionsPage() {
  const [tab,          setTab]       = useState(0);
  const [rows,         setRows]      = useState([]);
  const [total,        setTotal]     = useState(0);
  const [loading,      setLoading]   = useState(true);
  const [summary,      setSummary]   = useState(null);
  const [search,       setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate,   setFilterDate]   = useState('');
  const [form,         setForm]      = useState(emptyForm);
  const [creating,     setCreating]  = useState(false);
  const [available,    setAvailable] = useState([]);
  const { data: classes = [] }       = useClasses({ limit: 200 });
  const [deleteModal,  setDeleteModal] = useState(null);
  const [statusModal,  setStatusModal] = useState(null);

  // Load summary
  useEffect(() => {
    getSummary().then(r => setSummary(r.data?.data ?? null)).catch(() => {});
  }, []);

  // Load list
  const load = useCallback(async () => {
    if (tab === 2) { setLoading(false); return; }
    setLoading(true);
    try {
      let res;
      if (tab === 0) {
        res = await getTodaySubstitutions();
        setRows(res.data?.data ?? []);
        setTotal((res.data?.data ?? []).length);
      } else {
        const params = { limit: 200 };
        if (filterStatus) params.status = filterStatus;
        if (filterDate)   params.date   = filterDate;
        res = await getSubstitutions(params);
        setRows(res.data?.data ?? []);
        setTotal(res.data?.total ?? 0);
      }
    } catch { toast.error('Failed to load substitutions'); }
    finally  { setLoading(false); }
  }, [tab, filterStatus, filterDate]);

  useEffect(() => { load(); }, [load]);

  // Load available teachers when date changes in form
  useEffect(() => {
    if (form.date) {
      getAvailableTeachers(form.date)
        .then(r => setAvailable(r.data?.data ?? []))
        .catch(() => {});
    }
  }, [form.date]);

  // ── Filtered rows ─────────────────────────────────────────────
  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.original_teacher_name || '').toLowerCase().includes(q)
      || (r.substitute_teacher_name || '').toLowerCase().includes(q)
      || (r.class_name || '').toLowerCase().includes(q);
  });

  // ── Create substitution ───────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.original_teacher_id || !form.substitute_teacher_id || !form.class_id || !form.date) {
      toast.error('All required fields must be filled'); return;
    }
    setCreating(true);
    try {
      await createSubstitution({
        ...form,
        period: form.period ? +form.period : undefined,
        original_teacher_id: +form.original_teacher_id,
        substitute_teacher_id: +form.substitute_teacher_id,
        class_id: +form.class_id,
      });
      toast.success('Substitution assigned');
      setForm(emptyForm);
      setTab(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign substitution');
    } finally { setCreating(false); }
  }

  // ── Status update ─────────────────────────────────────────────
  async function handleStatusUpdate(id, status) {
    try {
      await updateStatus(id, status);
      toast.success(`Marked as ${status}`);
      setStatusModal(null);
      load();
    } catch { toast.error('Failed to update status'); }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteModal) return;
    try {
      await deleteSubstitution(deleteModal.id);
      toast.success('Deleted');
      setDeleteModal(null);
      load();
    } catch { toast.error('Failed to delete'); }
  }

  const StatusBadge = ({ status }) => {
    const s = STATUS[status] || STATUS.pending;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Substitutions</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage teacher substitution assignments</p>
            </div>
          </div>
          <button
            onClick={() => setTab(2)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Assign Substitution
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming (7d)</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{summary?.upcoming_count ?? '—'}</p>
          </div>
          {(summary?.by_status ?? []).map(b => {
            const s = STATUS[b.status] || STATUS.pending;
            return (
              <div key={b.status} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label} (30d)</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{b.count}</p>
              </div>
            );
          })}
          {(summary?.frequent_absentees ?? []).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 col-span-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Frequent Absences (90d)</p>
              <div className="space-y-1">
                {summary.frequent_absentees.slice(0, 3).map(t => (
                  <div key={t.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate">{t.name}</span>
                    <span className="text-orange-600 font-semibold ml-2 shrink-0">{t.absences} times</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

        {/* Assign Form */}
        {tab === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Assign New Substitution</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period (optional)</label>
                <input type="number" min="1" max="10" value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  placeholder="Leave blank for full day"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Absent Teacher ID *</label>
                <input type="number" value={form.original_teacher_id}
                  onChange={e => setForm(f => ({ ...f, original_teacher_id: e.target.value }))}
                  placeholder="Teacher ID"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Substitute Teacher *</label>
                <select value={form.substitute_teacher_id}
                  onChange={e => setForm(f => ({ ...f, substitute_teacher_id: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                >
                  <option value="">Select available teacher...</option>
                  {available.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{available.length} teachers available on {form.date}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class *</label>
                <select value={form.class_id}
                  onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                >
                  <option value="">Select class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input type="text" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for absence</label>
                <input type="text" value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Medical leave, Personal emergency..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes for the substitute..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {creating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Assign Substitution
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
        {tab !== 2 && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search teacher or class..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                />
              </div>
              {tab === 1 && (
                <>
                  <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </>
              )}
              <button onClick={load}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {loading ? <PageLoader /> : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filtered.length} substitution{filtered.length !== 1 ? 's' : ''} {tab === 0 ? 'today' : `(${total} total)`}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Absent Teacher</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Substitute</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Class / Subject</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Period</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                            {tab === 0 ? 'No substitutions scheduled today' : 'No records found'}
                          </td>
                        </tr>
                      ) : filtered.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.date}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{row.original_teacher_name}</td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{row.substitute_teacher_name}</td>
                          <td className="px-4 py-3">
                            <p className="text-gray-800 dark:text-gray-200">{row.class_name}</p>
                            {row.subject && <p className="text-xs text-gray-500">{row.subject}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {row.period ? `Period ${row.period}` : 'Full day'}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {row.status === 'pending' && (
                                <>
                                  <button onClick={() => handleStatusUpdate(row.id, 'accepted')}
                                    className="px-2 py-1 rounded text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                                  >Accept</button>
                                  <button onClick={() => handleStatusUpdate(row.id, 'declined')}
                                    className="px-2 py-1 rounded text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                                  >Decline</button>
                                </>
                              )}
                              {row.status === 'accepted' && (
                                <button onClick={() => handleStatusUpdate(row.id, 'completed')}
                                  className="px-2 py-1 rounded text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                                >Complete</button>
                              )}
                              <button onClick={() => setDeleteModal(row)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
                              >
                                <Trash2 size={13} />
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
          </>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete Substitution?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remove the substitution for <strong>{deleteModal.substitute_teacher_name}</strong> on <strong>{deleteModal.date}</strong>?
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
