import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStudentTimeline,
  getTimelineSummary,
  addManualNote,
} from '../api/lifecycle';

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  admission:             { label: 'Admission',           color: 'emerald', icon: '🎓' },
  class_assigned:        { label: 'Class Assigned',      color: 'blue',    icon: '📚' },
  class_transferred:     { label: 'Class Transfer',      color: 'indigo',  icon: '🔄' },
  transport_assigned:    { label: 'Transport Assigned',  color: 'amber',   icon: '🚌' },
  transport_transferred: { label: 'Transport Transfer',  color: 'orange',  icon: '🚐' },
  fee_paid:              { label: 'Fee Paid',            color: 'green',   icon: '💰' },
  fee_partial:           { label: 'Partial Payment',     color: 'lime',    icon: '💵' },
  attendance_absent:     { label: 'Absent',              color: 'red',     icon: '❌' },
  attendance_late:       { label: 'Late',                color: 'yellow',  icon: '⏰' },
  exam_result:           { label: 'Exam Result',         color: 'purple',  icon: '📝' },
  promotion:             { label: 'Promoted',            color: 'cyan',    icon: '⬆️' },
  graduation:            { label: 'Graduation',          color: 'pink',    icon: '🏆' },
  withdrawal:            { label: 'Withdrawal',          color: 'rose',    icon: '🚪' },
  suspension:            { label: 'Suspension',          color: 'red',     icon: '⛔' },
  suspension_lifted:     { label: 'Suspension Lifted',   color: 'teal',    icon: '✅' },
  reinstatement:         { label: 'Reinstated',          color: 'sky',     icon: '🔁' },
  manual_note:           { label: 'Note',                color: 'slate',   icon: '📌' },
};

const COLOR_CLASSES = {
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200' },
  blue:    { dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700',       ring: 'ring-blue-200'    },
  indigo:  { dot: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700',   ring: 'ring-indigo-200'  },
  amber:   { dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',     ring: 'ring-amber-200'   },
  orange:  { dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700',   ring: 'ring-orange-200'  },
  green:   { dot: 'bg-green-500',   badge: 'bg-green-100 text-green-700',     ring: 'ring-green-200'   },
  lime:    { dot: 'bg-lime-500',    badge: 'bg-lime-100 text-lime-700',       ring: 'ring-lime-200'    },
  red:     { dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700',         ring: 'ring-red-200'     },
  yellow:  { dot: 'bg-yellow-400',  badge: 'bg-yellow-100 text-yellow-700',   ring: 'ring-yellow-200'  },
  purple:  { dot: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-700',   ring: 'ring-purple-200'  },
  cyan:    { dot: 'bg-cyan-500',    badge: 'bg-cyan-100 text-cyan-700',       ring: 'ring-cyan-200'    },
  pink:    { dot: 'bg-pink-500',    badge: 'bg-pink-100 text-pink-700',       ring: 'ring-pink-200'    },
  rose:    { dot: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700',       ring: 'ring-rose-200'    },
  teal:    { dot: 'bg-teal-500',    badge: 'bg-teal-100 text-teal-700',       ring: 'ring-teal-200'    },
  sky:     { dot: 'bg-sky-500',     badge: 'bg-sky-100 text-sky-700',         ring: 'ring-sky-200'     },
  slate:   { dot: 'bg-slate-500',   badge: 'bg-slate-100 text-slate-700',     ring: 'ring-slate-200'   },
};

function getConfig(eventType) {
  return EVENT_CONFIG[eventType] || { label: eventType, color: 'slate', icon: '📋' };
}
function getColors(eventType) {
  const cfg = getConfig(eventType);
  return COLOR_CLASSES[cfg.color] || COLOR_CLASSES.slate;
}

// ─── Filter pill groups ───────────────────────────────────────────────────────
const FILTER_GROUPS = [
  { key: 'all',        label: 'All Events' },
  { key: 'academics',  label: 'Academics',  types: ['admission','class_assigned','class_transferred','promotion','graduation','exam_result'] },
  { key: 'fees',       label: 'Fees',       types: ['fee_paid','fee_partial'] },
  { key: 'transport',  label: 'Transport',  types: ['transport_assigned','transport_transferred'] },
  { key: 'attendance', label: 'Attendance', types: ['attendance_absent','attendance_late'] },
  { key: 'notes',      label: 'Notes',      types: ['manual_note','suspension','suspension_lifted','reinstatement','withdrawal'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}
function monthKey(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
}

function groupByMonth(events) {
  const map = new Map();
  for (const e of events) {
    const k = monthKey(e.created_at);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(e);
  }
  return map;
}

// ─── Add Note Modal ───────────────────────────────────────────────────────────
function AddNoteModal({ studentId, onClose, onAdded }) {
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr('Title is required'); return; }
    setBusy(true); setErr('');
    try {
      const r = await addManualNote(studentId, { title: title.trim(), description: desc.trim() || undefined });
      const event = r.data?.data ?? r.data;
      onAdded(event);
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Failed to save note');
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[fadeIn_.2s_ease]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Add Note</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Parent meeting scheduled"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Details (optional)</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Additional context..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              {busy ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ counts = [], total = 0 }) {
  const top = counts.slice(0, 6);
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Event Summary</h3>
        <span className="text-2xl font-bold text-blue-600">{total}</span>
      </div>
      <div className="space-y-2">
        {top.map(({ event_type, count }) => {
          const cfg    = getConfig(event_type);
          const colors = getColors(event_type);
          const pct    = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={event_type}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span>{cfg.icon}</span> {cfg.label}
                </span>
                <span className="font-medium text-gray-700">{count}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${colors.dot} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {counts.length === 0 && (
          <p className="text-gray-400 text-xs text-center py-2">No events yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Timeline event card ──────────────────────────────────────────────────────
function EventCard({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const cfg    = getConfig(event.event_type);
  const colors = getColors(event.event_type);
  const hasMeta = event.metadata && Object.keys(event.metadata).length > 0;
  const hasDesc = !!event.description;

  return (
    <div className="relative flex gap-4 group">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-5 top-10 w-0.5 bg-gray-200 bottom-0 z-0" />
      )}

      {/* Dot */}
      <div className={`shrink-0 w-10 h-10 rounded-full ${colors.dot} ring-4 ${colors.ring} bg-opacity-90 flex items-center justify-center text-lg z-10 shadow-sm`}>
        {cfg.icon}
      </div>

      {/* Card */}
      <div
        className={`flex-1 bg-white rounded-xl border shadow-sm mb-4 overflow-hidden transition-shadow hover:shadow-md cursor-pointer`}
        onClick={() => (hasDesc || hasMeta) && setExpanded(v => !v)}
      >
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {cfg.label}
                </span>
                {event.performed_by_name && (
                  <span className="text-xs text-gray-400">by {event.performed_by_name}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-gray-800 leading-snug">{event.title}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-500">{formatDate(event.created_at)}</p>
              <p className="text-xs text-gray-400">{formatTime(event.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Expandable detail */}
        {expanded && (hasDesc || hasMeta) && (
          <div className="border-t px-4 py-3 bg-gray-50 space-y-2 animate-[fadeIn_.15s_ease]">
            {hasDesc && (
              <p className="text-sm text-gray-600">{event.description}</p>
            )}
            {hasMeta && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {Object.entries(event.metadata).map(([k, v]) => (
                  v != null && v !== '' && (
                    <span key={k} className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{k.replace(/_/g, ' ')}: </span>
                      {String(v)}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentLifecyclePage() {
  const { studentId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [student,    setStudent]    = useState(null);
  const [events,     setEvents]     = useState([]);
  const [summary,    setSummary]    = useState({ counts: [], total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [error,      setError]      = useState('');
  const [total,      setTotal]      = useState(0);
  const [offset,     setOffset]     = useState(0);
  const LIMIT = 30;

  const [activeGroup,  setActiveGroup]  = useState('all');
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [showNoteModal,setShowNoteModal] = useState(false);

  const searchTimer = useRef(null);

  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';

  // Build type filter param
  const typesParam = useCallback(() => {
    const g = FILTER_GROUPS.find(f => f.key === activeGroup);
    return g?.types ? g.types.join(',') : undefined;
  }, [activeGroup]);

  // Fetch timeline
  const fetchTimeline = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const params = { limit: LIMIT, offset: off };
      if (typesParam()) params.types = typesParam();
      if (search)        params.search = search;

      const r = await getStudentTimeline(studentId, params);
      const d = r.data?.data ?? r.data;
      if (reset) {
        setStudent(d.student);
        setEvents(d.events || []);
      } else {
        setEvents(prev => [...prev, ...(d.events || [])]);
      }
      setTotal(d.total || 0);
      setOffset(reset ? LIMIT : off + LIMIT);
    } catch (ex) {
      setError(ex.response?.data?.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, activeGroup, search]);

  // Fetch summary (sidebar counts)
  const fetchSummary = useCallback(async () => {
    try {
      const r = await getTimelineSummary(studentId);
      const d = r.data?.data ?? r.data;
      setSummary({ counts: d.counts || [], total: d.total || 0 });
    } catch { /* non-critical */ }
  }, [studentId]);

  useEffect(() => {
    fetchTimeline(true);
    fetchSummary();
  }, [fetchTimeline, fetchSummary]);

  // Debounced search
  function handleSearchChange(val) {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  }

  // When filter or search changes, reset list
  useEffect(() => {
    fetchTimeline(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, search]);

  function handleNoteAdded(newEvent) {
    setEvents(prev => [newEvent, ...prev]);
    setTotal(t => t + 1);
    setSummary(s => ({
      total: s.total + 1,
      counts: (() => {
        const copy = [...s.counts];
        const idx = copy.findIndex(c => c.event_type === 'manual_note');
        if (idx >= 0) copy[idx] = { ...copy[idx], count: copy[idx].count + 1 };
        else copy.push({ event_type: 'manual_note', count: 1 });
        return copy;
      })(),
    }));
  }

  const grouped  = groupByMonth(events);
  const hasMore  = events.length < total;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading timeline…</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Failed to load</h2>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={() => fetchTimeline(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {student?.full_name || 'Student'} — Timeline
            </h1>
            <p className="text-xs text-gray-500">
              {student?.admission_number} · {student?.grade} {student?.section}
              {student?.class_name && ` · ${student.class_name}`}
            </p>
          </div>
          {isAdminOrTeacher && (
            <button onClick={() => setShowNoteModal(true)}
              className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
              <span>+</span> Add Note
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* ── Sidebar summary ──────────────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-4 sticky top-20 self-start">
          {/* Student card */}
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                {(student?.full_name || 'S')[0]}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{student?.full_name}</p>
                <p className="text-xs text-gray-500">{student?.admission_number}</p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              {student?.grade && <p>Grade: <span className="font-medium">{student.grade} {student.section}</span></p>}
              {student?.class_name && <p>Class: <span className="font-medium">{student.class_name}</span></p>}
              {student?.status && (
                <p>Status: <span className={`font-medium ${student.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>{student.status}</span></p>
              )}
              {student?.admission_date && <p>Admitted: <span className="font-medium">{formatDate(student.admission_date)}</span></p>}
            </div>
          </div>

          <SummaryCard counts={summary.counts} total={summary.total} />
        </aside>

        {/* ── Main timeline column ─────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Search + filter bar */}
          <div className="mb-5 space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search events…"
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FILTER_GROUPS.map(g => (
                <button key={g.key}
                  onClick={() => setActiveGroup(g.key)}
                  className={`shrink-0 px-3 py-1.5 text-xs rounded-full font-medium transition-all
                    ${activeGroup === g.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border hover:border-blue-300 hover:text-blue-600'}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline count */}
          {!loading && (
            <p className="text-xs text-gray-400 mb-4">
              Showing {events.length} of {total} events
              {search && <span> · filtered by "{search}"</span>}
            </p>
          )}

          {/* Empty state */}
          {events.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📋</p>
              <h3 className="text-gray-600 font-medium mb-1">No events found</h3>
              <p className="text-gray-400 text-sm">
                {search || activeGroup !== 'all'
                  ? 'Try clearing filters'
                  : 'Events will appear here as the student progresses through school'}
              </p>
            </div>
          )}

          {/* Grouped timeline */}
          {[...grouped.entries()].map(([month, monthEvents]) => (
            <div key={month} className="mb-6">
              {/* Month header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  {month}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Events */}
              {monthEvents.map((ev, i) => (
                <EventCard key={ev.id} event={ev} isLast={i === monthEvents.length - 1 && !hasMore} />
              ))}
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => fetchTimeline(false)}
                disabled={loadingMore}
                className="px-6 py-2 bg-white border rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50 shadow-sm">
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                    Loading…
                  </span>
                ) : `Load more (${total - events.length} remaining)`}
              </button>
            </div>
          )}
        </main>
      </div>

      {showNoteModal && (
        <AddNoteModal
          studentId={studentId}
          onClose={() => setShowNoteModal(false)}
          onAdded={handleNoteAdded}
        />
      )}
    </div>
  );
}
