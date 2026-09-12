import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ClipboardCheck, Users, GraduationCap, ChevronDown, Calendar,
  CheckCircle2, XCircle, Clock3, FileText, Download, Search,
  BarChart3, RefreshCw, Save, ChevronLeft, ChevronRight,
  TrendingUp, AlertTriangle, Layers, Filter, Zap,
  MessageSquare, ArrowUpDown, ChevronUp, RotateCcw,
  UserCheck, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadBlob, classifyApiError } from '../utils';
import Layout from '../components/layout/Layout';
import { getPeriods } from '../api/timetable';
import { useClasses } from '../hooks/useReferenceData';
import {
  getClassStudentsAttendance, getTeachersAttendance,
  bulkMark, getDailySummary, getMonthlySummary, getExportURL,
  getAbsenceStreaks,
} from '../api/attendance';

/* ─── Status config ───────────────────────────────────────────── */
const STATUS = {
  present: {
    label: 'Present', short: 'P', key: 'p',
    color: '#16a34a', light: '#f0fdf4', border: '#86efac', textLight: '#15803d',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40',
    ring: 'ring-emerald-400',
  },
  absent: {
    label: 'Absent', short: 'A', key: 'a',
    color: '#dc2626', light: '#fef2f2', border: '#fca5a5', textLight: '#dc2626',
    badge: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40',
    ring: 'ring-red-400',
  },
  late: {
    label: 'Late', short: 'L', key: 'l',
    color: '#d97706', light: '#fffbeb', border: '#fcd34d', textLight: '#d97706',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40',
    ring: 'ring-amber-400',
  },
  excused: {
    label: 'Excused', short: 'E', key: 'e',
    color: '#2563eb', light: '#eff6ff', border: '#93c5fd', textLight: '#2563eb',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40',
    ring: 'ring-blue-400',
  },
};
const STATUS_KEYS = Object.keys(STATUS);

const today       = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';
}

const GRAD = [
  ['#6366f1','#8b5cf6'], ['#ec4899','#f43f5e'], ['#f59e0b','#f97316'],
  ['#06b6d4','#3b82f6'], ['#10b981','#14b8a6'], ['#ef4444','#f97316'],
];
const avatarGrad = (id) => { const [a, b] = GRAD[id % GRAD.length]; return `linear-gradient(135deg,${a},${b})`; };

/* ─── SVG Donut Chart ─────────────────────────────────────────── */
function DonutChart({ present, absent, late, excused, unmarked, size = 88 }) {
  const total = present + absent + late + excused + unmarked;
  const r = 32; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const segs = [
    { count: present, color: '#16a34a' },
    { count: absent,  color: '#dc2626' },
    { count: late,    color: '#d97706' },
    { count: excused, color: '#2563eb' },
    { count: unmarked, color: 'rgba(255,255,255,0.12)' },
  ].filter(s => s.count > 0);

  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {segs.map((s, i) => {
          const dash = (s.count / total) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth="9"
              strokeDasharray={`${dash} ${circ}`}
              strokeDashoffset={-acc}
              strokeLinecap="butt" />
          );
          acc += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-white leading-none">{pct}%</span>
        <span className="text-[9px] text-white/60 mt-0.5">present</span>
      </div>
    </div>
  );
}

/* ─── Mini progress bar ───────────────────────────────────────── */
function PercentBar({ pct }) {
  const color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct || 0}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right tabular-nums" style={{ color }}>{pct != null ? `${pct}%` : '—'}</span>
    </div>
  );
}

/* ─── Status button ───────────────────────────────────────────── */
function StatusBtn({ statusKey, active, onClick }) {
  const s = STATUS[statusKey];
  return (
    <button onClick={onClick}
      title={`${s.label} (${s.key.toUpperCase()})`}
      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all duration-150 border-2 select-none
        ${active ? 'scale-110 shadow-lg' : 'hover:scale-105'}`}
      style={active
        ? { background: s.color, color: '#fff', borderColor: s.color, boxShadow: `0 4px 14px ${s.color}55` }
        : { background: s.light, color: s.textLight, borderColor: s.border }
      }
    >
      {s.short}
    </button>
  );
}

/* ─── MARK TAB ────────────────────────────────────────────────── */
function MarkTab({ classes, periods }) {
  const [mode,           setMode]          = useState('student');
  const [date,           setDate]          = useState(today());
  const [selectedClass,  setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod]= useState('');
  const [search,         setSearch]        = useState('');
  const [records,        setRecords]       = useState([]);
  const [dirty,          setDirty]         = useState({});
  const [loading,        setLoading]       = useState(false);
  const [saving,         setSaving]        = useState(false);
  const [statusFilter,   setStatusFilter]  = useState('all'); // 'all' | 'present' | 'absent' | 'late' | 'excused' | 'unmarked'
  const [sort,           setSort]          = useState({ key: 'roll', dir: 'asc' });
  const [expandedRemarks,setExpandedRemarks] = useState({}); // entityId → true
  const [history,        setHistory]       = useState([]);   // undo stack
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    if (mode === 'student' && !selectedClass) return;
    setLoading(true);
    try {
      let res;
      if (mode === 'student') {
        res = await getClassStudentsAttendance(selectedClass, date, selectedPeriod || undefined);
      } else {
        res = await getTeachersAttendance(date);
      }
      const data = Array.isArray(res.data) ? res.data : [];
      setRecords(data);
      setDirty({});
      setHistory([]);
    } catch (err) { toast.error(classifyApiError(err, 'load attendance')); }
    finally { setLoading(false); }
  }, [mode, date, selectedClass, selectedPeriod]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setDirty({}); setHistory([]); }, [date, selectedClass, selectedPeriod, mode]);

  // Keyboard shortcuts (p/a/l/e on focused row)
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const found = STATUS_KEYS.find(k => STATUS[k].key === e.key.toLowerCase());
      if (found) {
        const focused = document.activeElement?.closest('[data-entity-id]');
        if (focused) {
          const id = Number(focused.dataset.entityId);
          setStatus(id, found);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setStatus = (entityId, status) => {
    setDirty(d => ({ ...d, [entityId]: { ...(d[entityId] || {}), status } }));
    // Auto-expand remarks for absent/late/excused
    if (status === 'absent' || status === 'late' || status === 'excused') {
      setExpandedRemarks(r => ({ ...r, [entityId]: true }));
    } else {
      setExpandedRemarks(r => { const n = { ...r }; delete n[entityId]; return n; });
    }
  };

  const setRemarks = (entityId, remarks) => {
    setDirty(d => ({ ...d, [entityId]: { ...(d[entityId] || {}), remarks } }));
  };

  const getEffective = (r) => ({
    status:  dirty[r.id]?.status  ?? r.status  ?? null,
    remarks: dirty[r.id]?.remarks ?? r.remarks ?? '',
  });

  const markAll = (status) => {
    setHistory(h => [...h, dirty]);
    const next = {};
    records.forEach(r => { next[r.id] = { status, remarks: dirty[r.id]?.remarks ?? r.remarks ?? '' }; });
    setDirty(next);
    toast.success(`All marked as ${STATUS[status].label}`, { duration: 1500 });
  };

  const markRemaining = () => {
    setHistory(h => [...h, dirty]);
    const next = { ...dirty };
    records.forEach(r => {
      if (!getEffective(r).status) {
        next[r.id] = { status: 'present', remarks: dirty[r.id]?.remarks ?? r.remarks ?? '' };
      }
    });
    setDirty(next);
    toast.success('Unmarked → Present', { duration: 1500 });
  };

  const undoLast = () => {
    if (!history.length) return;
    setDirty(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };

  const handleSave = async () => {
    const toSave = records
      .map(r => {
        const eff = getEffective(r);
        if (!eff.status) return null;
        return {
          entity_type: mode,
          entity_id:   r.id,
          class_id:    mode === 'student' ? selectedClass : null,
          period_id:   selectedPeriod || null,
          date,
          status:      eff.status,
          remarks:     eff.remarks || null,
          marked_by:   null,
        };
      })
      .filter(Boolean);

    if (!toSave.length) { toast.error('No attendance marked'); return; }

    // Optimistic update — merge dirty changes into records immediately so the UI
    // reflects the save before the server round-trip completes.
    const previousRecords = records;
    const optimisticRecords = records.map(r => {
      const d = dirty[r.id];
      if (!d) return r;
      return { ...r, status: d.status ?? r.status, remarks: d.remarks ?? r.remarks, att_id: r.att_id ?? 'optimistic' };
    });
    setRecords(optimisticRecords);
    setDirty({});
    setHistory([]);

    setSaving(true);
    try {
      const res = await bulkMark(toSave);
      toast.success(`${res.data?.saved ?? toSave.length} records saved`);
      // Reload in background to get server-assigned att_ids without blocking the UI
      load();
    } catch (err) {
      // Revert to previous state on failure
      setRecords(previousRecords);
      setDirty(Object.fromEntries(toSave.map(r => [r.entity_id, { status: r.status, remarks: r.remarks }])));
      toast.error(err.response?.data?.message || 'Failed to save — changes reverted');
    } finally { setSaving(false); }
  };

  // Counts
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    records.forEach(r => {
      const s = getEffective(r).status;
      if (s) c[s] = (c[s] || 0) + 1;
      else c.unmarked++;
    });
    return c;
  // eslint-disable-next-line
  }, [records, dirty]);

  const dirtyCount   = Object.keys(dirty).length;
  const unmarkedCount = counts.unmarked;

  // Sort + filter
  const displayRecords = useMemo(() => {
    let list = [...records];
    // Filter
    if (statusFilter !== 'all') {
      list = list.filter(r => {
        const s = getEffective(r).status;
        if (statusFilter === 'unmarked') return !s;
        return s === statusFilter;
      });
    }
    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.full_name?.toLowerCase().includes(q) ||
        r.roll_number?.toString().toLowerCase().includes(q)
      );
    }
    // Sort
    list.sort((a, b) => {
      let va, vb;
      if (sort.key === 'name') { va = a.full_name?.toLowerCase() ?? ''; vb = b.full_name?.toLowerCase() ?? ''; }
      else if (sort.key === 'roll') { va = a.roll_number ?? ''; vb = b.roll_number ?? ''; }
      else if (sort.key === 'status') { va = getEffective(a).status ?? 'z'; vb = getEffective(b).status ?? 'z'; }
      else { va = a.id; vb = b.id; }
      return sort.dir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
    return list;
  // eslint-disable-next-line
  }, [records, dirty, search, statusFilter, sort]);

  const cycleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const SortBtn = ({ label, sKey }) => (
    <button onClick={() => cycleSort(sKey)}
      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold transition">
      {label}
      {sort.key === sKey
        ? sort.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        : <ArrowUpDown size={11} className="opacity-30" />}
    </button>
  );

  const stepDate = (dir) => {
    const d = new Date(date); d.setDate(d.getDate() + dir);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[['student', Users, 'Students'], ['teacher', GraduationCap, 'Teachers']].map(([m, Icon, lbl]) => (
                <button key={m} onClick={() => { setMode(m); setDirty({}); }}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all ${
                    mode === m ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  style={mode === m ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                  <Icon size={14} />{lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Date nav */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Date</label>
            <div className="flex items-center gap-1">
              <button onClick={() => stepDate(-1)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition">
                <ChevronLeft size={14} />
              </button>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
              <button onClick={() => stepDate(1)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition">
                <ChevronRight size={14} />
              </button>
              {date !== today() && (
                <button onClick={() => setDate(today())} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Class */}
          {mode === 'student' && (
            <div className="flex-1 min-w-45">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Class</label>
              <div className="relative">
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className="w-full pl-4 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade} – {c.section})</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Period */}
          {mode === 'student' && periods.filter(p => !p.is_break).length > 0 && (
            <div className="w-44">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Period (optional)</label>
              <div className="relative">
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                  className="w-full pl-4 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                  <option value="">Daily</option>
                  {periods.filter(p => !p.is_break).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Select class prompt */}
      {mode === 'student' && !selectedClass ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-20 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
            <Users size={28} className="text-indigo-500" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">Select a class to start</p>
          <p className="text-xs text-slate-400">Choose a class from the dropdown above to mark attendance</p>
        </div>
      ) : (
        <>
          {/* Live status tiles */}
          {records.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: 'present', icon: UserCheck,     color: '#16a34a', bg: '#f0fdf4', borderCol: '#bbf7d0' },
                { key: 'absent',  icon: UserX,         color: '#dc2626', bg: '#fef2f2', borderCol: '#fecaca' },
                { key: 'late',    icon: Clock3,        color: '#d97706', bg: '#fffbeb', borderCol: '#fde68a' },
                { key: 'excused', icon: FileText,      color: '#2563eb', bg: '#eff6ff', borderCol: '#bfdbfe' },
                { key: 'unmarked',icon: AlertTriangle, color: '#64748b', bg: '#f8fafc', borderCol: '#e2e8f0' },
              ].map(({ key, icon: Icon, color, bg, borderCol }) => {
                const cnt = counts[key] ?? 0;
                const isActive = statusFilter === key;
                return (
                  <button key={key}
                    onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left shadow-sm hover:shadow-md ${
                      isActive ? 'ring-2 ring-offset-1' : ''
                    }`}
                    style={{
                      background: isActive ? color : bg,
                      borderColor: isActive ? color : borderCol,
                      ringColor: color,
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: isActive ? 'rgba(255,255,255,0.25)' : color }}>
                      <Icon size={17} style={{ color: isActive ? '#fff' : '#fff' }} />
                    </div>
                    <div>
                      <div className="text-xl font-extrabold leading-none" style={{ color: isActive ? '#fff' : color }}>{cnt}</div>
                      <div className="text-[11px] font-semibold capitalize mt-0.5" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : color, opacity: 0.85 }}>
                        {key}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-50">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or roll no…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {/* Bulk quick mark */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {STATUS_KEYS.map(k => (
                <button key={k} onClick={() => markAll(k)} title={`Mark all as ${STATUS[k].label}`}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                  style={{ background: STATUS[k].color, color: '#fff', boxShadow: `0 2px 6px ${STATUS[k].color}44` }}>
                  All {STATUS[k].short}
                </button>
              ))}
            </div>

            {/* Mark remaining as present */}
            {unmarkedCount > 0 && (
              <button onClick={markRemaining}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400 transition-all">
                <Zap size={13} /> Fill {unmarkedCount} → P
              </button>
            )}

            {/* Undo */}
            {history.length > 0 && (
              <button onClick={undoLast}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Undo last bulk action">
                <RotateCcw size={14} />
              </button>
            )}

            {/* Refresh */}
            <button onClick={load}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400">Shortcuts: click a row then press</span>
            {STATUS_KEYS.map(k => (
              <span key={k} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border"
                style={{ background: STATUS[k].light, color: STATUS[k].textLight, borderColor: STATUS[k].border }}>
                {STATUS[k].key.toUpperCase()}
              </span>
            ))}
            <span className="text-xs text-slate-400 ml-1">to mark status · Click status tiles above to filter</span>
          </div>

          {/* Attendance list */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 flex items-center justify-center shadow-sm">
              <div className="w-8 h-8 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid' }} />
            </div>
          ) : displayRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-14 text-center shadow-sm">
              <Filter size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-slate-400 font-medium text-sm">No records match the current filter</p>
              {statusFilter !== 'all' && (
                <button onClick={() => setStatusFilter('all')} className="mt-3 text-xs text-indigo-500 hover:underline">
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Progress header */}
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {records.length - counts.unmarked}/{records.length} marked
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${records.length ? ((records.length - counts.unmarked) / records.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                  </div>
                  {counts.unmarked > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      <AlertTriangle size={11} />{counts.unmarked} left
                    </span>
                  )}
                </div>
                {/* Mini colour legend */}
                <div className="hidden sm:flex items-center gap-2">
                  {STATUS_KEYS.map(k => (
                    <span key={k} className="flex items-center gap-1 text-xs font-medium" style={{ color: STATUS[k].color }}>
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: STATUS[k].color }} />
                      {counts[k] ?? 0}
                    </span>
                  ))}
                </div>
              </div>

              {/* Column headers */}
              <div className="grid items-center gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                style={{ gridTemplateColumns: '2rem 2.25rem 1fr auto' }}>
                <span className="text-xs text-slate-400 font-semibold">#</span>
                <span />
                <div className="flex items-center gap-4">
                  <SortBtn label="Name" sKey="name" />
                  {mode === 'student' && <SortBtn label="Roll" sKey="roll" />}
                  <SortBtn label="Status" sKey="status" />
                </div>
                <span className="text-xs text-slate-400 font-semibold pr-2">Mark</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayRecords.map((r, idx) => {
                  const eff      = getEffective(r);
                  const isDirty  = dirty[r.id] !== undefined;
                  const showRmk  = expandedRemarks[r.id];
                  const leftColor = eff.status ? STATUS[eff.status].color : 'transparent';
                  return (
                    <div key={r.id} data-entity-id={r.id} tabIndex={0}
                      className={`outline-none focus-within:bg-indigo-50/30 dark:focus-within:bg-indigo-900/10 transition-colors
                        ${isDirty ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'}`}
                      style={{ borderLeft: `3px solid ${leftColor}` }}
                    >
                      {/* Main row */}
                      <div className="grid items-center gap-3 px-4 py-3"
                        style={{ gridTemplateColumns: '2rem 2.25rem 1fr auto' }}>
                        {/* Index */}
                        <span className="text-xs text-slate-400 text-center">{idx + 1}</span>
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: avatarGrad(r.id) }}>
                          {getInitials(r.full_name)}
                        </div>
                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{r.full_name}</span>
                            {eff.status && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${STATUS[eff.status].badge}`}>
                                {STATUS[eff.status].label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            {r.roll_number && <span>Roll {r.roll_number}</span>}
                            {mode === 'teacher' && r.subject && <span>· {r.subject}</span>}
                            {isDirty && <span className="text-indigo-400 font-medium">· edited</span>}
                            {eff.remarks && !showRmk && (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                <MessageSquare size={10} /> {eff.remarks}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Status buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {STATUS_KEYS.map(s => (
                            <StatusBtn key={s} statusKey={s} active={eff.status === s} onClick={() => setStatus(r.id, s)} />
                          ))}
                          {/* Remarks toggle */}
                          <button
                            onClick={() => setExpandedRemarks(x => ({ ...x, [r.id]: !x[r.id] }))}
                            title="Add remark"
                            className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                              eff.remarks
                                ? 'bg-indigo-100 border-indigo-300 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-600'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-600'
                            }`}
                          >
                            <MessageSquare size={12} />
                          </button>
                        </div>
                      </div>
                      {/* Remarks row */}
                      {showRmk && (
                        <div className="px-4 pb-3 pt-0">
                          <input
                            value={eff.remarks}
                            onChange={e => setRemarks(r.id, e.target.value)}
                            placeholder="Add a remark (e.g. sick, family emergency)…"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Floating save bar ─────────────────────────────────────── */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10"
          style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', backdropFilter: 'blur(12px)' }}>
          <span className="text-white text-sm font-semibold">{dirtyCount} change{dirtyCount !== 1 ? 's' : ''} pending</span>
          <div className="w-px h-5 bg-white/20" />
          <button onClick={() => { setDirty({}); setHistory([]); }}
            className="text-slate-400 hover:text-white text-xs font-medium transition">
            Discard
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px #6366f155' }}>
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save size={14} />}
            Save Attendance
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── REPORTS TAB ─────────────────────────────────────────────── */
function ReportsTab({ classes }) {
  const [mode,    setMode]    = useState('student');
  const [month,   setMonth]   = useState(currentMonth());
  const [classId, setClassId] = useState('');
  const [data,    setData]    = useState([]);
  const [meta,    setMeta]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState({ key: 'name', dir: 'asc' });

  const load = useCallback(async () => {
    if (mode === 'student' && !classId) return;
    setLoading(true);
    try {
      const res = await getMonthlySummary({
        entity_type: mode, month,
        ...(mode === 'student' ? { class_id: classId } : {}),
      });
      const raw = res.data;
      if (raw && Array.isArray(raw.rows)) {
        setData(raw.rows);
        setMeta({ working_days: raw.working_days, startDate: raw.startDate, endDate: raw.endDate });
      } else if (Array.isArray(raw)) { setData(raw); setMeta(null); }
      else { setData([]); }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [mode, month, classId]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      const res = await getExportURL({ entity_type: mode, month, ...(mode === 'student' && classId ? { class_id: classId } : {}) });
      downloadBlob(res.data, `attendance_${mode}_${month || 'all'}.xlsx`);
    } catch { toast.error('Export failed'); }
  };

  const cycleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  const filtered = useMemo(() => {
    let list = data.filter(r => !search || r.full_name?.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      let va, vb;
      if (sort.key === 'name') { va = a.full_name?.toLowerCase() ?? ''; vb = b.full_name?.toLowerCase() ?? ''; }
      else if (sort.key === 'pct') { va = Number(a.percentage) || 0; vb = Number(b.percentage) || 0; }
      else if (sort.key === 'absent') { va = Number(a.absent) || 0; vb = Number(b.absent) || 0; }
      else { va = a.roll_number ?? ''; vb = b.roll_number ?? ''; }
      return sort.dir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
    return list;
  }, [data, search, sort]);

  const ThSort = ({ label, sKey }) => (
    <th className="px-4 py-3 text-left cursor-pointer select-none"
      onClick={() => cycleSort(sKey)}>
      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 dark:hover:text-slate-300 transition">
        {label}
        {sort.key === sKey
          ? sort.dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
          : <ArrowUpDown size={10} className="opacity-30" />}
      </span>
    </th>
  );

  const totalPresent = data.reduce((a, r) => a + (Number(r.present) || 0), 0);
  const totalAbsent  = data.reduce((a, r) => a + (Number(r.absent)  || 0), 0);
  const avgPct       = data.length
    ? Math.round(data.filter(r => r.percentage != null).reduce((a, r) => a + Number(r.percentage), 0) / (data.filter(r => r.percentage != null).length || 1))
    : 0;
  const atRisk = data.filter(r => r.percentage != null && Number(r.percentage) < 75);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {[['student', Users, 'Students'], ['teacher', GraduationCap, 'Teachers']].map(([m, Icon, lbl]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all ${
                    mode === m ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  style={mode === m ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                  <Icon size={14} />{lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Month</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
          </div>

          {mode === 'student' && (
            <div className="flex-1 min-w-45">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Class</label>
              <div className="relative">
                <select value={classId} onChange={e => setClassId(e.target.value)}
                  className="w-full pl-4 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade} – {c.section})</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <button onClick={load}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {mode === 'student' && classId && (
              <button
                onClick={() => window.open(`/attendance/print?class_id=${classId}&month=${month}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <FileText size={14} /> Print Register
              </button>
            )}
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Prompt */}
      {mode === 'student' && !classId ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-20 text-center shadow-sm">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
            <BarChart3 size={28} className="text-indigo-500" />
          </div>
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">Select a class</p>
          <p className="text-xs text-slate-400">Choose a class above to view the monthly attendance report</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          {data.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Records',   value: data.length,    icon: Layers,        color: '#6366f1' },
                { label: 'Avg Attendance',  value: `${avgPct}%`,   icon: TrendingUp,    color: '#16a34a' },
                { label: 'Total Absences',  value: totalAbsent,    icon: XCircle,       color: '#dc2626' },
                { label: 'At Risk (<75%)',  value: atRisk.length,  icon: AlertTriangle, color: '#d97706' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ background: color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">{value}</div>
                    <div className="text-xs text-slate-400 mt-0.5 font-medium">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* At-risk banner */}
          {atRisk.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <span className="font-bold text-red-700 dark:text-red-400 text-sm">{atRisk.length} student{atRisk.length !== 1 ? 's' : ''} at risk (below 75% attendance)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {atRisk.slice(0, 12).map(r => (
                  <div key={r.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/40 shadow-sm">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ background: avatarGrad(r.id) }}>
                      {getInitials(r.full_name)}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.full_name}</span>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{Math.round(Number(r.percentage))}%</span>
                  </div>
                ))}
                {atRisk.length > 12 && (
                  <span className="text-xs text-red-500 font-medium self-center">+{atRisk.length - 12} more</span>
                )}
              </div>
            </div>
          )}

          {/* Search + table */}
          {data.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
                  className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-full" />
              </div>
              <span className="text-xs text-slate-400">{filtered.length} of {data.length} records</span>
            </div>
          )}

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-14 flex items-center justify-center shadow-sm">
              <div className="w-8 h-8 border-t-indigo-600 border-indigo-200 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-14 text-center shadow-sm">
              <Calendar size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-slate-400 font-medium text-sm">No attendance data for this period</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {meta && (
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <span className="text-xs text-slate-500">
                    Working days: <span className="font-bold text-slate-700 dark:text-slate-300">{meta.working_days}</span>
                    &nbsp;·&nbsp;{meta.startDate} → {meta.endDate}
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                      {mode === 'student' && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>}
                      <ThSort label="Name" sKey="name" />
                      {mode === 'teacher' && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>}
                      {[['present','Present','#16a34a'],['absent','Absent','#dc2626'],['late','Late','#d97706'],['excused','Excused','#2563eb']].map(([k, l, c]) => (
                        <th key={k} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: c }}>{l}</th>
                      ))}
                      <ThSort label="Attendance %" sKey="pct" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const pct = r.percentage != null ? Math.round(Number(r.percentage)) : null;
                      const isAtRisk = pct != null && pct < 75;
                      const isGood   = pct != null && pct >= 90;
                      return (
                        <tr key={r.id}
                          className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors
                            ${isAtRisk ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}
                          style={{ borderLeft: `3px solid ${isAtRisk ? '#dc2626' : isGood ? '#16a34a' : 'transparent'}` }}>
                          {mode === 'student' && (
                            <td className="px-4 py-3 text-xs text-slate-400 text-center font-medium">{r.roll_number || i + 1}</td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: avatarGrad(r.id) }}>
                                {getInitials(r.full_name)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{r.full_name}</div>
                                {isAtRisk && (
                                  <div className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-0.5">
                                    <AlertTriangle size={9} /> At risk
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {mode === 'teacher' && <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{r.subject || '—'}</td>}
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-emerald-600 tabular-nums">{r.present ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-red-600 tabular-nums">{r.absent ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-amber-600 tabular-nums">{r.late ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-blue-600 tabular-nums">{r.excused ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 pr-6 min-w-40">
                            <PercentBar pct={pct} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── STREAKS TAB ─────────────────────────────────────────────── */
function StreaksTab({ classes }) {
  const [streaks,   setStreaks]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [minDays,   setMinDays]   = useState(3);
  const [classId,   setClassId]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAbsenceStreaks({ min_days: minDays, class_id: classId || undefined });
      setStreaks(res.data?.data ?? []);
    } catch { toast.error('Failed to load absence streaks'); }
    finally { setLoading(false); }
  }, [minDays, classId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={minDays} onChange={e => setMinDays(Number(e.target.value))}
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none">
          {[2,3,4,5,7,10].map(n => <option key={n} value={n}>{n}+ consecutive days</option>)}
        </select>
        <select value={classId} onChange={e => setClassId(e.target.value)}
          className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
        <span className="text-sm text-slate-400 ml-auto">{streaks.length} students</span>
      </div>

      {/* Alert banner */}
      {streaks.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-2xl">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-semibold">{streaks.length} student{streaks.length > 1 ? 's' : ''}</span> {streaks.length > 1 ? 'are' : 'is'} currently on a consecutive absence streak of {minDays}+ days. Contact parents immediately.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : streaks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-400" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No consecutive absences</p>
            <p className="text-sm mt-1">No students have been absent for {minDays}+ days in a row.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Class</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Streak</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">From</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">To</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Parent Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {streaks.map(s => {
                  const severity = s.streak_length >= 7 ? 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                    : s.streak_length >= 5 ? 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{s.student_name}</p>
                        <p className="text-xs text-slate-400">#{s.roll_number}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.class_name || '—'}{s.section ? ` – ${s.section}` : ''}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${severity}`}>
                          <AlertTriangle size={11} />
                          {s.streak_length} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{s.streak_start ? new Date(s.streak_start).toLocaleDateString('en-PK',{day:'numeric',month:'short'}) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{s.streak_end   ? new Date(s.streak_end  ).toLocaleDateString('en-PK',{day:'numeric',month:'short'}) : '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-slate-300">{s.father_phone || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PAGE ROOT ───────────────────────────────────────────────── */
export default function AttendancePage() {
  const [tab,     setTab]     = useState('mark');
  const { data: classes = [] } = useClasses();
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    getPeriods().then(per => {
      setPeriods(Array.isArray(per.data) ? per.data : []);
    }).catch(() => {});
  }, []);

  return (
    <Layout>
      {/* Hero header */}
      <div
        className="sticky top-14 lg:top-0 z-30 px-4 sm:px-6 lg:px-8 py-4"
        style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>
              <ClipboardCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Attendance</h1>
              <p className="text-xs text-blue-300 mt-0.5">Track &amp; manage daily attendance</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-2xl p-1 backdrop-blur-sm">
            {[
              { key: 'mark',    label: 'Mark Attendance', icon: ClipboardCheck },
              { key: 'report',  label: 'Reports',          icon: BarChart3 },
              { key: 'streaks', label: 'Streaks',          icon: AlertTriangle },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === key ? 'bg-white text-slate-800 shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'mark'    && <MarkTab    classes={classes} periods={periods} />}
        {tab === 'report'  && <ReportsTab classes={classes} />}
        {tab === 'streaks' && <StreaksTab classes={classes} />}
      </div>
    </Layout>
  );
}
