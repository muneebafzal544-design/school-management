import { useEffect, useState, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout          from '../components/layout/Layout';
import { ConfirmDialog } from '../components/ui/Modal';
import { INPUT_CLS, SELECT_CLS } from '../components/ui/Input';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../api/events';

const EVENT_TYPES = [
  { value: 'general',   label: 'General',    color: '#6366f1' },
  { value: 'exam',      label: 'Exam',       color: '#dc2626' },
  { value: 'holiday',   label: 'Holiday',    color: '#16a34a' },
  { value: 'meeting',   label: 'Meeting',    color: '#d97706' },
  { value: 'sport',     label: 'Sports',     color: '#0891b2' },
  { value: 'trip',      label: 'Trip',       color: '#9333ea' },
  { value: 'ceremony',  label: 'Ceremony',   color: '#ec4899' },
];

function typeColor(t) { return EVENT_TYPES.find(x => x.value === t)?.color || '#6366f1'; }
function typeLabel(t) { return EVENT_TYPES.find(x => x.value === t)?.label || t; }

const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtShort(d) { if (!d) return ''; return new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short' }); }

/* ── Event Form Modal ── */
function EventModal({ ev, onClose, onSaved }) {
  const defaultType = EVENT_TYPES[0];
  const init = ev ? {
    title: ev.title || '', description: ev.description || '',
    start_date: ev.start_date?.slice(0,10) || '', end_date: ev.end_date?.slice(0,10) || '',
    type: ev.type || 'general', color: ev.color || defaultType.color, is_holiday: ev.is_holiday || false,
  } : { title:'', description:'', start_date:'', end_date:'', type:'general', color:'#6366f1', is_holiday:false };

  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-set color when type changes
  const handleTypeChange = (t) => {
    const tc = typeColor(t);
    setForm(f => ({ ...f, type: t, color: tc }));
  };

  const inp = INPUT_CLS;

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    if (!form.start_date)   return toast.error('Start date required');
    setSaving(true);
    try {
      if (ev) { await updateEvent(ev.id, form); toast.success('Event updated'); }
      else    { await createEvent(form);        toast.success('Event created'); }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">{ev ? 'Edit Event' : 'Add Event'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} className={inp} placeholder="Event title…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
              <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Color</label>
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                className="w-full h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className={`${inp} resize-none`} placeholder="Event details…" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_holiday} onChange={e => set('is_holiday', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Mark as Public Holiday</span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : (ev ? 'Update' : 'Add Event')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const today   = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [typeFilt,  setTypeFilt]  = useState('');
  const [modal,     setModal]     = useState(null); // null | 'new' | event
  const [delTarget, setDelTarget] = useState(null);
  const [selected,  setSelected]  = useState(null); // date string YYYY-MM-DD

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { academic_year: '2024-25' };
      if (typeFilt) params.type = typeFilt;
      const r = await getEvents(params);
      setEvents(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  }, [typeFilt]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleDelete = async () => {
    try {
      await deleteEvent(delTarget.id);
      toast.success('Event deleted');
      setDelTarget(null);
      fetchEvents();
    } catch { toast.error('Delete failed'); }
  };

  // Build calendar
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map events by date
  const evByDate = {};
  events.forEach(ev => {
    if (!ev.start_date) return;
    const d = ev.start_date.slice(0, 10);
    if (!evByDate[d]) evByDate[d] = [];
    evByDate[d].push(ev);
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const todayStr = today.toISOString().slice(0,10);
  const selEvents = selected ? (evByDate[selected] || []) : [];

  const selCls = SELECT_CLS;

  // Upcoming events (sorted, next 10)
  const upcoming = [...events]
    .filter(e => e.start_date >= todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 10);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* Hero */}
        <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #9333ea, #ec4899)' }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <CalendarDays size={13} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Events Calendar</h1>
              <p className="text-white/60 text-sm mt-1">Manage school events, holidays, and activities</p>
            </div>
            <button onClick={() => setModal('new')}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition-all shadow-lg">
              <Plus size={15} /> Add Event
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-10">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* ── Calendar ── */}
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Calendar header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ChevronLeft size={16} /></button>
                <div className="flex items-center gap-4">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100">{MONTHS[month]} {year}</h2>
                  <select value={typeFilt} onChange={e => setTypeFilt(e.target.value)} className={selCls} style={{ minWidth:0, fontSize:'12px', padding:'5px 10px' }}>
                    <option value="">All Types</option>
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ChevronRight size={16} /></button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 px-3 pt-3">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider py-2">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 px-3 pb-4 gap-px">
                {/* Empty cells before first day */}
                {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {/* Day cells */}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayEvs = evByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const isSel   = dateStr === selected;
                  const hasHol  = dayEvs.some(e => e.is_holiday);

                  return (
                    <div key={day} onClick={() => setSelected(isSel ? null : dateStr)}
                      className={`min-h-[52px] p-1 rounded-xl cursor-pointer transition-all ${isSel ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'} ${hasHol ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {day}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {dayEvs.slice(0, 2).map(ev => (
                          <div key={ev.id} className="h-1.5 rounded-full w-full"
                            style={{ background: ev.color || typeColor(ev.type) }} />
                        ))}
                        {dayEvs.length > 2 && (
                          <div className="text-[8px] text-slate-400 text-center">+{dayEvs.length-2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected day events */}
              {selected && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {new Date(selected + 'T12:00').toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long' })}
                  </p>
                  {selEvents.length === 0 ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-400">No events on this day.</p>
                      <button onClick={() => { setModal('new'); }}
                        className="text-xs text-indigo-600 font-semibold hover:underline">+ Add event</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selEvents.map(ev => (
                        <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors group">
                          <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: ev.color || typeColor(ev.type) }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-none">{ev.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{typeLabel(ev.type)}{ev.is_holiday ? ' · 🏖 Holiday' : ''}</p>
                            {ev.description && <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button onClick={() => setModal(ev)} className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"><Pencil size={12} /></button>
                            <button onClick={() => setDelTarget(ev)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Upcoming Events sidebar ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Upcoming Events</h3>
                <p className="text-xs text-slate-400 mt-0.5">{events.filter(e => e.start_date >= todayStr).length} upcoming</p>
              </div>

              {/* Legend */}
              <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800/50 flex flex-wrap gap-2">
                {EVENT_TYPES.map(t => (
                  <span key={t.value} className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.color }} />{t.label}
                  </span>
                ))}
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
              ) : upcoming.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No upcoming events</div>
              ) : (
                <ul className="divide-y divide-slate-50 dark:divide-slate-800/40 max-h-[500px] overflow-y-auto">
                  {upcoming.map(ev => (
                    <li key={ev.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: ev.color || typeColor(ev.type) }}>
                        {new Date(ev.start_date + 'T12:00').getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtShort(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` – ${fmtShort(ev.end_date)}` : ''} · {typeLabel(ev.type)}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5">
                        <button onClick={() => setModal(ev)} className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"><Pencil size={11} /></button>
                        <button onClick={() => setDelTarget(ev)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={11} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <EventModal
          ev={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchEvents}
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(delTarget)}
        title="Delete Event"
        message={`Delete "${delTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
      />
    </Layout>
  );
}
