import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Trash2, X, User, Calendar, ChevronDown, Loader2, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import EmptyState     from '../components/ui/EmptyState';
import {
  getIncidents, getSummary, getTrend, createIncident,
  updateIncident, resolveIncident, deleteIncident,
} from '../api/discipline';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ── Config ────────────────────────────────────────────────────────
const SEVERITY = {
  minor:    { label: 'Minor',    cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  moderate: { label: 'Moderate', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  serious:  { label: 'Serious',  cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

const INCIDENT_TYPES = [
  'Bullying', 'Fighting', 'Cheating', 'Disrespect', 'Vandalism',
  'Truancy', 'Phone Violation', 'Dress Code', 'Substance Abuse', 'Other',
];

const TABS = ['All Incidents', 'Open', 'Resolved', 'Log Incident'];

const emptyForm = {
  student_id: '', date: new Date().toISOString().slice(0, 10),
  incident_type: '', severity: 'minor',
  description: '', action_taken: '',
  parent_notified: false, follow_up_date: '',
};

export default function DisciplinePage() {
  const [tab,          setTab]       = useState(0);
  const [rows,         setRows]      = useState([]);
  const [total,        setTotal]     = useState(0);
  const [loading,      setLoading]   = useState(true);
  const [search,       setSearch]    = useState('');
  const [filterSev,    setFilterSev] = useState('');
  const [summary,      setSummary]   = useState(null);
  const [trend,        setTrend]     = useState([]);
  const [detailModal,  setDetailModal] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [form,         setForm]      = useState(emptyForm);
  const [creating,     setCreating]  = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving,    setResolving] = useState(false);

  // ── Load summary + trend on mount ──────────────────────────────
  useEffect(() => {
    Promise.all([getSummary(), getTrend()])
      .then(([s, t]) => {
        setSummary(s.data?.data ?? null);
        const byMonth = t.data?.data?.by_month ?? [];
        setTrend(byMonth.map(r => ({ month: r.month.slice(5), count: +r.count })));
      })
      .catch(() => {});
  }, []);

  // ── Load list ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (tab === 3) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = { limit: 200, offset: 0 };
      if (tab === 1) params.resolved = false;
      if (tab === 2) params.resolved = true;
      if (filterSev) params.severity = filterSev;
      const res = await getIncidents(params);
      setRows(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } catch { toast.error('Failed to load incidents'); }
    finally  { setLoading(false); }
  }, [tab, filterSev]);

  useEffect(() => { load(); }, [load]);

  // ── Filtered rows ───────────────────────────────────────────────
  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.student_name || '').toLowerCase().includes(q)
      || (r.roll_number || '').toLowerCase().includes(q)
      || (r.incident_type || '').toLowerCase().includes(q);
  });

  // ── Create incident ─────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    if (!form.student_id || !form.incident_type || !form.description) {
      toast.error('Student ID, type and description are required'); return;
    }
    setCreating(true);
    try {
      await createIncident(form);
      toast.success('Incident logged');
      setForm(emptyForm);
      setTab(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log incident');
    } finally { setCreating(false); }
  }

  // ── Resolve ─────────────────────────────────────────────────────
  async function handleResolve() {
    if (!resolveModal) return;
    setResolving(true);
    try {
      await resolveIncident(resolveModal.id, { notes: resolveNotes });
      toast.success('Incident resolved');
      setResolveModal(null);
      setResolveNotes('');
      load();
    } catch { toast.error('Failed to resolve'); }
    finally  { setResolving(false); }
  }

  // ── Delete ──────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteModal) return;
    try {
      await deleteIncident(deleteModal.id);
      toast.success('Incident deleted');
      setDeleteModal(null);
      load();
    } catch { toast.error('Failed to delete'); }
  }

  // ── Summary cards ───────────────────────────────────────────────
  const summaryOpen   = summary?.open_count ?? 0;
  const bySev         = summary?.by_severity ?? [];
  const topStudents   = summary?.top_students ?? [];

  // ── Helpers ─────────────────────────────────────────────────────
  const SevBadge = ({ sev }) => {
    const s = SEVERITY[sev] || SEVERITY.minor;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  const StatusBadge = ({ resolved }) => resolved
    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Resolved</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Open</span>;

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discipline</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Student behavior & incident management</p>
            </div>
          </div>
          <button
            onClick={() => setTab(3)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Log Incident
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Open Incidents</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{summaryOpen}</p>
          </div>
          {bySev.map(b => (
            <div key={b.severity} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{b.severity} (30d)</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{b.count}</p>
            </div>
          ))}
          {topStudents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 col-span-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top Offenders (90d)</p>
              <div className="space-y-1">
                {topStudents.slice(0, 3).map(s => (
                  <div key={s.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
                    <span className="text-red-600 font-semibold ml-2 shrink-0">{s.incident_count} inc.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trend Chart */}
        {trend.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Incidents per Month (last 6 months)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb', fontSize: 12 }}
                  cursor={{ fill: '#fee2e2' }}
                  formatter={(v) => [v, 'Incidents']}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
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

        {/* Log Incident Form */}
        {tab === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Log New Incident</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID *</label>
                <input type="number" value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  placeholder="e.g. 42"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Incident Type *</label>
                <select value={form.incident_type}
                  onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                >
                  <option value="">Select type...</option>
                  {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                <select value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="serious">Serious</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what happened..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action Taken</label>
                <textarea rows={2} value={form.action_taken}
                  onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))}
                  placeholder="What action was taken..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Follow-up Date</label>
                <input type="date" value={form.follow_up_date}
                  onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex items-center gap-3 mt-2">
                <input type="checkbox" id="parent_notified" checked={form.parent_notified}
                  onChange={e => setForm(f => ({ ...f, parent_notified: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="parent_notified" className="text-sm text-gray-700 dark:text-gray-300">Parent has been notified</label>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button type="submit" disabled={creating}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {creating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                  Log Incident
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

        {/* List Tabs */}
        {tab !== 3 && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search student name, roll no, type..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              >
                <option value="">All Severities</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="serious">Serious</option>
              </select>
              <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Table */}
            {loading ? <PageLoader /> : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filtered.length} of {total} incidents
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Student</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Severity</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Reported By</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              icon={ShieldAlert}
                              title="No incidents found"
                              description="Adjust the filter or log a new discipline incident."
                              actionLabel="Log Incident"
                              onAction={() => setTab(3)}
                              size="sm"
                            />
                          </td>
                        </tr>
                      ) : filtered.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{row.student_name}</p>
                            <p className="text-xs text-gray-500">{row.roll_number} · {row.class_name}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{row.incident_type}</td>
                          <td className="px-4 py-3"><SevBadge sev={row.severity} /></td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.date}</td>
                          <td className="px-4 py-3"><StatusBadge resolved={row.resolved} /></td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.reported_by_name || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDetailModal(row)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs"
                                title="View"
                              >
                                View
                              </button>
                              {!row.resolved && (
                                <button onClick={() => { setResolveModal(row); setResolveNotes(''); }}
                                  className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 text-xs"
                                  title="Resolve"
                                >
                                  Resolve
                                </button>
                              )}
                              <button onClick={() => setDeleteModal(row)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
                                title="Delete"
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

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Incident Details</h2>
              <button onClick={() => setDetailModal(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Row label="Student" value={`${detailModal.student_name} (${detailModal.roll_number})`} />
              <Row label="Class"   value={detailModal.class_name} />
              <Row label="Type"    value={detailModal.incident_type} />
              <Row label="Severity" value={<SevBadge sev={detailModal.severity} />} />
              <Row label="Date"    value={detailModal.date} />
              <Row label="Status"  value={<StatusBadge resolved={detailModal.resolved} />} />
              <Row label="Parent Notified" value={detailModal.parent_notified ? 'Yes' : 'No'} />
              {detailModal.follow_up_date && <Row label="Follow-up" value={detailModal.follow_up_date} />}
              {detailModal.reported_by_name && <Row label="Reported By" value={detailModal.reported_by_name} />}
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
                <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{detailModal.description}</p>
              </div>
              {detailModal.action_taken && (
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Action Taken</p>
                  <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">{detailModal.action_taken}</p>
                </div>
              )}
              {detailModal.resolved_notes && (
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Notes</p>
                  <p className="text-gray-600 dark:text-gray-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">{detailModal.resolved_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Resolve Incident</h2>
              <button onClick={() => setResolveModal(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Resolving incident for <strong className="text-gray-900 dark:text-white">{resolveModal.student_name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Notes (optional)</label>
                <textarea rows={3} value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
                  placeholder="Describe how the incident was resolved..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleResolve} disabled={resolving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {resolving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  Mark Resolved
                </button>
                <button onClick={() => setResolveModal(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Delete Incident?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete the incident for <strong>{deleteModal.student_name}</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Small helper ─────────────────────────────────────────────────
function Row({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="font-medium text-gray-700 dark:text-gray-300 w-36 shrink-0">{label}:</span>
      <span className="text-gray-600 dark:text-gray-400">{value}</span>
    </div>
  );
}

function SevBadge({ sev }) {
  const s = SEVERITY[sev] || SEVERITY.minor;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function StatusBadge({ resolved }) {
  return resolved
    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Resolved</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Open</span>;
}
