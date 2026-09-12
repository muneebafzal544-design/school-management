import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserCheck, UserX, Clock, Search, Plus, Trash2, RefreshCw,
  X, ChevronDown, Printer, BadgeCheck, LogOut, Users,
  Phone, IdCard, CalendarDays, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { getVisitors, getVisitorStats, createVisitor, exitVisitor, markBadgePrinted, deleteVisitor } from '../api/visitors';

const PURPOSES = [
  { value: 'meeting',     label: 'Meeting' },
  { value: 'delivery',    label: 'Delivery' },
  { value: 'interview',   label: 'Interview' },
  { value: 'pickup',      label: 'Pickup' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection',  label: 'Inspection' },
  { value: 'other',       label: 'Other' },
];
const ID_TYPES = [
  { value: 'cnic',            label: 'CNIC' },
  { value: 'passport',        label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'employee_card',   label: 'Employee Card' },
  { value: 'other',           label: 'Other' },
];
const PURPOSE_COLORS = {
  meeting:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivery:    'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  interview:   'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-400',
  pickup:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  inspection:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  other:       'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-400',
};
const fmt12 = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const fmtDuration = (mins) => {
  if (!mins) return '—';
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 dark:text-white">{value ?? 0}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Badge Print Modal ─────────────────────────────────────────
function BadgeModal({ visitor, onClose, onPrinted }) {
  const handlePrint = () => {
    window.print();
    markBadgePrinted(visitor.id).catch(() => {});
    onPrinted();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Visitor Badge</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={14} />
          </button>
        </div>
        {/* Badge preview */}
        <div className="p-5">
          <div className="border-2 border-indigo-500 rounded-xl p-5 text-center space-y-2 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800">
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Visitor Pass</div>
            <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto">
              <Users size={28} className="text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{visitor.name}</p>
            <div className="flex items-center justify-center gap-1 text-sm text-slate-600 dark:text-slate-300">
              <BadgeCheck size={14} className="text-indigo-500" />
              <span className="capitalize">{visitor.purpose}</span>
            </div>
            {visitor.host_name && (
              <p className="text-xs text-slate-500">Host: <strong>{visitor.host_name}</strong></p>
            )}
            <div className="border-t border-indigo-200 dark:border-indigo-700 pt-2 mt-2">
              <p className="text-xs text-slate-500">Entry: {fmt12(visitor.entry_time)}</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(visitor.entry_time).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <p className="text-xs text-slate-400">Badge #{String(visitor.id).padStart(6, '0')}</p>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">
            Cancel
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Entry Form ────────────────────────────────────────────────
function EntryForm({ onCreated }) {
  const [open, setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]   = useState({
    name: '', phone: '', id_type: 'cnic', id_number: '',
    purpose: 'meeting', host_name: '', notes: '',
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Visitor name is required'); return; }
    setSaving(true);
    try {
      await createVisitor(form);
      toast.success('Visitor logged in');
      setForm({ name: '', phone: '', id_type: 'cnic', id_number: '', purpose: 'meeting', host_name: '', notes: '' });
      setOpen(false);
      onCreated();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to log visitor'); }
    finally { setSaving(false); }
  };

  const cls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-400';
  const selCls = cls + ' appearance-none';

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Plus size={15} /> Log Visitor
        </button>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">New Visitor Entry</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Visitor Name *</label>
              <input value={form.name} onChange={set('name')} required placeholder="Full name"
                className={cls} />
            </div>
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Phone</label>
              <input value={form.phone} onChange={set('phone')} placeholder="03XX-XXXXXXX"
                className={cls} />
            </div>
            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Purpose</label>
              <div className="relative">
                <select value={form.purpose} onChange={set('purpose')} className={selCls}>
                  {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* ID Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">ID Type</label>
              <div className="relative">
                <select value={form.id_type} onChange={set('id_type')} className={selCls}>
                  {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* ID Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">ID Number</label>
              <input value={form.id_number} onChange={set('id_number')} placeholder="XXXXX-XXXXXXX-X"
                className={cls} />
            </div>
            {/* Host */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Host / Meeting With</label>
              <input value={form.host_name} onChange={set('host_name')} placeholder="Teacher or staff name"
                className={cls} />
            </div>
            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Notes</label>
              <input value={form.notes} onChange={set('notes')} placeholder="Optional notes…"
                className={cls} />
            </div>
            {/* Actions */}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-1">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
                Log Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function VisitorPage() {
  const [visitors,  setVisitors]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [filterDate,setFilterDate]= useState(() => new Date().toISOString().slice(0, 10));
  const [onCampus,  setOnCampus]  = useState(false);
  const [badgeVisitor, setBadgeVisitor] = useState(null);
  const [delConfirm,   setDelConfirm]   = useState(null);
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (onCampus)   params.on_campus = 'true';
      if (search)     params.search = search;
      const [visRes, statRes] = await Promise.all([
        getVisitors(params),
        getVisitorStats(),
      ]);
      setVisitors(visRes.data || []);
      setStats(statRes.data);
    } catch { toast.error('Failed to load visitors'); }
    finally { setLoading(false); }
  }, [filterDate, onCampus, search]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, search ? 300 : 0);
  }, [load, search]);

  const handleExit = async (id) => {
    try {
      await exitVisitor(id);
      toast.success('Visitor checked out');
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Check-out failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteVisitor(id);
      toast.success('Record deleted');
      setDelConfirm(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visitor Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Log and track all school visitors</p>
          </div>
          <EntryForm onCreated={load} />
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Today's Visitors"   value={stats.today_total}        icon={Users}     color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30" />
            <StatCard label="On Campus Now"       value={stats.on_campus_now}      icon={UserCheck} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" />
            <StatCard label="Checked Out Today"   value={stats.checked_out_today}  icon={LogOut}    color="bg-slate-100 text-slate-600 dark:bg-slate-700" />
            <StatCard label="Avg Visit Duration"  value={stats.avg_duration_min ? fmtDuration(stats.avg_duration_min) : '—'} icon={Clock} color="bg-amber-50 text-amber-600 dark:bg-amber-900/30" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, ID…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`w-10 h-5 rounded-full transition-colors ${onCampus ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                onClick={() => setOnCampus(v => !v)}>
                <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform ${onCampus ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">On Campus Only</span>
            </label>
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
              <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-14">
              <div className="w-7 h-7 border-2 border-t-indigo-600 border-indigo-200 rounded-full animate-spin" />
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-16">
              <Users size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No visitors found</p>
              <p className="text-slate-400 text-sm mt-1">Log a visitor using the button above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    {['Visitor', 'Purpose', 'Host', 'ID', 'Entry', 'Exit', 'Duration', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {visitors.map(v => {
                    const isOnCampus = !v.exit_time;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 dark:text-white">{v.name}</p>
                          {v.phone && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} />{v.phone}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PURPOSE_COLORS[v.purpose] || PURPOSE_COLORS.other}`}>
                            {v.purpose}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[130px] truncate">
                          {v.host_teacher_name || v.host_name || '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {v.id_number ? (
                            <p className="text-xs text-slate-500">
                              <span className="text-slate-400 capitalize">{(v.id_type || '').replace('_', ' ')}</span>
                              <br />{v.id_number}
                            </p>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{fmt12(v.entry_time)}</p>
                          <p className="text-xs text-slate-400">{new Date(v.entry_time).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {v.exit_time ? (
                            <p className="text-sm text-slate-600 dark:text-slate-300">{fmt12(v.exit_time)}</p>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Still in</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {fmtDuration(v.duration_minutes)}
                        </td>
                        <td className="px-4 py-3">
                          {isOnCampus ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              On Campus
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                              Checked Out
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {isOnCampus && (
                              <button onClick={() => handleExit(v.id)}
                                title="Check out"
                                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 transition-colors">
                                <LogOut size={14} />
                              </button>
                            )}
                            <button onClick={() => setBadgeVisitor(v)}
                              title="Print badge"
                              className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors">
                              <Printer size={14} />
                            </button>
                            <button onClick={() => setDelConfirm(v)}
                              title="Delete record"
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 size={14} />
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

      {/* Badge Modal */}
      {badgeVisitor && (
        <BadgeModal
          visitor={badgeVisitor}
          onClose={() => setBadgeVisitor(null)}
          onPrinted={() => { setBadgeVisitor(null); load(); }}
        />
      )}

      {/* Delete Confirm */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">Delete Visitor Record</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Delete entry for <strong>{delConfirm.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={() => handleDelete(delConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
