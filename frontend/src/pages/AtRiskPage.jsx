import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, TrendingDown, Users, RefreshCw, ChevronDown,
  Search, BookOpen, ClipboardCheck, NotebookPen, Banknote, ArrowRight,
  Phone, MessageSquare, CalendarDays, Trash2, Plus, X, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getRiskScores, getRiskSummary, recalculateRisk, getInterventions, addIntervention, deleteIntervention } from '../api/risk';

const METHOD_CONFIG = {
  call:        { label: 'Phone Call',   Icon: Phone          },
  meeting:     { label: 'Meeting',      Icon: Users          },
  whatsapp:    { label: 'WhatsApp',     Icon: MessageSquare  },
  email:       { label: 'Email',        Icon: NotebookPen    },
  home_visit:  { label: 'Home Visit',   Icon: TrendingDown   },
  other:       { label: 'Other',        Icon: AlertTriangle  },
};

function InterventionPanel({ studentId, onClose }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    contact_date: new Date().toISOString().slice(0, 10),
    method: 'call', contacted_by: '', notes: '', outcome: '', follow_up: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getInterventions(studentId); setLogs(r.data?.data || []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.notes.trim()) return toast.error('Notes required');
    setSaving(true);
    try {
      await addIntervention({ student_id: studentId, ...form });
      toast.success('Intervention logged');
      setForm(f => ({ ...f, notes: '', outcome: '', follow_up: '' }));
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this intervention log?')) return;
    try { await deleteIntervention(id); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <tr>
      <td colSpan={6} className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Phone size={14} className="text-indigo-500" /> Intervention Log
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-0 divide-x divide-gray-100 dark:divide-gray-700">
            {/* Log form */}
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add New Contact</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Date</label>
                  <input type="date" value={form.contact_date} onChange={e => set('contact_date', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Method</label>
                  <select value={form.method} onChange={e => set('method', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs px-2 py-1.5 text-gray-900 dark:text-white">
                    {Object.entries(METHOD_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Contacted by</label>
                <input value={form.contacted_by} onChange={e => set('contacted_by', e.target.value)}
                  placeholder="Name of teacher/admin who contacted"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs px-2 py-1.5 text-gray-900 dark:text-white placeholder-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Notes *</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} placeholder="What was discussed, parent's response…"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs px-2 py-1.5 text-gray-900 dark:text-white placeholder-gray-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Outcome</label>
                  <input value={form.outcome} onChange={e => set('outcome', e.target.value)}
                    placeholder="e.g. Parent will monitor"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs px-2 py-1.5 text-gray-900 dark:text-white placeholder-gray-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Follow-up date</label>
                  <input type="date" value={form.follow_up} onChange={e => set('follow_up', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-2 rounded-xl text-white text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Save size={12} /> {saving ? 'Saving…' : 'Log Contact'}
              </button>
            </div>

            {/* History */}
            <div className="p-4 max-h-64 overflow-y-auto space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact History</h4>
              {loading && <p className="text-xs text-gray-400">Loading…</p>}
              {!loading && logs.length === 0 && <p className="text-xs text-gray-400">No contacts logged yet.</p>}
              {logs.map(l => {
                const mc = METHOD_CONFIG[l.method] || METHOD_CONFIG.other;
                const MIcon = mc.Icon;
                return (
                  <div key={l.id} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3 space-y-1 group relative">
                    <div className="flex items-center gap-2">
                      <MIcon size={12} className="text-indigo-400 shrink-0" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{mc.label}</span>
                      <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                        <CalendarDays size={10} /> {l.contact_date}
                      </span>
                      <button onClick={() => handleDelete(l.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{l.notes}</p>
                    {l.outcome && <p className="text-xs text-green-600 dark:text-green-400">→ {l.outcome}</p>}
                    {l.contacted_by && <p className="text-xs text-gray-400">By: {l.contacted_by}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

const BAND_CONFIG = {
  high:   { label: 'High Risk',   bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-400',     dot: 'bg-red-500',     bar: 'bg-red-500'   },
  medium: { label: 'Medium Risk', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500',   bar: 'bg-amber-500' },
  low:    { label: 'Low Risk',    bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
};

const SIGNALS = [
  { key: 'attendance_score', label: 'Attendance', icon: ClipboardCheck, color: '#6366f1' },
  { key: 'exam_score',       label: 'Exams',      icon: BookOpen,       color: '#f59e0b' },
  { key: 'homework_score',   label: 'Homework',   icon: NotebookPen,    color: '#10b981' },
  { key: 'fee_score',        label: 'Fees',       icon: Banknote,       color: '#ef4444' },
];

function ScoreBar({ value, color }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, value || 0)}%`, backgroundColor: color }} />
    </div>
  );
}

export default function AtRiskPage() {
  const navigate = useNavigate();
  const [scores,   setScores]   = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [band,     setBand]     = useState('');
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const [expanded, setExpanded] = useState(null);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scoresRes, summaryRes] = await Promise.all([
        getRiskScores({ band: band || undefined, limit: 200 }),
        getRiskSummary(),
      ]);
      setScores(scoresRes.data?.data ?? scoresRes.data ?? []);
      setSummary(summaryRes.data?.data ?? summaryRes.data ?? {});
    } catch {
      toast.error('Failed to load risk data');
    } finally {
      setLoading(false);
    }
  }, [band]);

  useEffect(() => { load(); }, [load]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await recalculateRisk();
      toast.success('Risk scores recalculated');
      load();
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  }

  const filtered = scores.filter(s =>
    !search || s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  if (loading) return <Layout><PageLoader /></Layout>;

  const total = (summary.high || 0) + (summary.medium || 0) + (summary.low || 0);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={24} />
              At-Risk Students
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              AI-weighted risk scores based on attendance, exams, homework & fees
            </p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw size={15} className={recalculating ? 'animate-spin' : ''} />
            Recalculate All
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['high', 'medium', 'low'].map(b => {
            const cfg = BAND_CONFIG[b];
            const count = summary[b] || 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <button
                key={b}
                onClick={() => setBand(band === b ? '' : b)}
                className={`rounded-2xl p-5 text-left transition-all border-2 ${cfg.bg}
                  ${band === b ? 'border-current shadow-md' : 'border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                </div>
                <p className={`text-3xl font-bold ${cfg.text}`}>{count}</p>
                <p className={`text-xs mt-1 ${cfg.text} opacity-70`}>{pct}% of total</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search student…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={band} onChange={e => { setBand(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="">All bands</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          {(band || search) && (
            <button onClick={() => { setBand(''); setSearch(''); }} className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} students</span>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Class</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Risk</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-center">Score</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Signals</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No students found</td></tr>
                ) : paginated.map(s => {
                  const cfg = BAND_CONFIG[s.band] || BAND_CONFIG.low;
                  return (
                    <React.Fragment key={s.student_id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{s.student_name}</p>
                        <p className="text-xs text-gray-400">{s.roll_number}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">{s.class_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-lg font-bold ${cfg.text}`}>{Math.round(s.score)}</span>
                        <span className="text-xs text-gray-400">/100</span>
                      </td>
                      <td className="px-4 py-3 min-w-48">
                        <div className="space-y-1">
                          {SIGNALS.map(sig => (
                            <div key={sig.key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">{sig.label}</span>
                              <div className="flex-1"><ScoreBar value={s[sig.key]} color={sig.color} /></div>
                              <span className="text-xs text-gray-500 w-8 text-right">{Math.round(s[sig.key] || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpanded(expanded === s.student_id ? null : s.student_id)}
                            className={`p-1.5 rounded-lg transition-colors ${expanded === s.student_id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                            title="Intervention log">
                            <Phone size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/students/${s.student_id}`)}
                            className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                          >
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === s.student_id && (
                      <InterventionPanel studentId={s.student_id} onClose={() => setExpanded(null)} />
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-sm text-indigo-600 disabled:text-gray-300 hover:underline">Previous</button>
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="text-sm text-indigo-600 disabled:text-gray-300 hover:underline">Next</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
