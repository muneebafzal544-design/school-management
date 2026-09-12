import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Settings2, Sun, BookOpen, Users, Trophy, Bus, Star, PartyPopper, Flag,
} from 'lucide-react';
import toast   from 'react-hot-toast';
import Layout   from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { getEvents, seedNationalHolidays, seedIslamicHolidays } from '../api/events';

/* ── Event type config ─────────────────────────────────────────────────── */
const EVENT_TYPES = [
  { value: 'general',  label: 'General',   color: '#6366f1', Icon: Star        },
  { value: 'exam',     label: 'Exam',      color: '#dc2626', Icon: BookOpen    },
  { value: 'holiday',  label: 'Holiday',   color: '#16a34a', Icon: Sun         },
  { value: 'meeting',  label: 'Meeting',   color: '#d97706', Icon: Users       },
  { value: 'sport',    label: 'Sports',    color: '#0891b2', Icon: Trophy      },
  { value: 'trip',     label: 'Trip',      color: '#9333ea', Icon: Bus         },
  { value: 'ceremony', label: 'Ceremony',  color: '#ec4899', Icon: PartyPopper },
];

function typeColor(t) { return EVENT_TYPES.find(x => x.value === t)?.color || '#6366f1'; }
function typeLabel(t) { return EVENT_TYPES.find(x => x.value === t)?.label || t; }
function TypeIcon({ type, size = 12 }) {
  const match = EVENT_TYPES.find(x => x.value === type);
  if (!match) return null;
  const { Icon } = match;
  return <Icon size={size} />;
}

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtShort(d) {
  if (!d) return '';
  return new Date(d + 'T12:00').toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}
function daysUntil(dateStr) {
  const diff = Math.ceil((new Date(dateStr + 'T00:00') - new Date()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
}

/* ── Role-aware hero text ──────────────────────────────────────────────── */
const HERO_TEXT = {
  admin:   { sub: 'Manage school-wide events, holidays, and key dates.' },
  teacher: { sub: 'View upcoming academic events, holidays, and activities.' },
  student: { sub: 'Your school calendar — exams, holidays, events, and activities.' },
  parent:  { sub: 'Stay informed about school events, holidays, and academic dates.' },
};

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function AcademicCalendarPage() {
  const { user } = useAuth();
  const role = user?.role || 'student';
  const canManage = role === 'admin';

  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth());
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [typeFilt,    setTypeFilt]    = useState('');
  const [selected,    setSelected]    = useState(null); // YYYY-MM-DD
  const [seedingHols,        setSeedingHols]        = useState(false);
  const [seedingIslamicHols, setSeedingIslamicHols] = useState(false);

  /* Fetch all events for the current academic year */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { academic_year: '2024-25' };
      if (typeFilt) params.type = typeFilt;
      const r = await getEvents(params);
      setEvents(Array.isArray(r.data) ? r.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilt]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* Calendar layout */
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* Build lookup: YYYY-MM-DD → [events] */
  const evByDate = {};
  events.forEach(ev => {
    if (!ev.start_date) return;
    /* Span multi-day events across all their dates */
    const start = new Date(ev.start_date + 'T12:00');
    const end   = ev.end_date ? new Date(ev.end_date + 'T12:00') : start;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!evByDate[key]) evByDate[key] = [];
      evByDate[key].push(ev);
    }
  });

  const handleSeedHolidays = async () => {
    setSeedingHols(true);
    try {
      const res = await seedNationalHolidays(year);
      toast.success(res.data?.message || 'Pakistan national holidays imported');
      fetchEvents();
    } catch (e) { toast.error(e?.response?.data?.message || 'Import failed'); }
    finally { setSeedingHols(false); }
  };

  const handleSeedIslamicHolidays = async () => {
    setSeedingIslamicHols(true);
    try {
      const res = await seedIslamicHolidays(year);
      toast.success(res.data?.message || 'Islamic holidays imported (approximate dates)');
      fetchEvents();
    } catch (e) { toast.error(e?.response?.data?.message || 'Import failed'); }
    finally { setSeedingIslamicHols(false); }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); };

  /* Events visible in current month */
  const monthStr  = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonth = events.filter(e => e.start_date?.startsWith(monthStr) || e.end_date?.startsWith(monthStr));

  /* Upcoming events (next 8 from today) */
  const upcoming = [...events]
    .filter(e => e.start_date >= todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8);

  /* Selected day */
  const selEvents = selected ? (evByDate[selected] || []) : [];

  const heroSub = HERO_TEXT[role]?.sub || HERO_TEXT.student.sub;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #0891b2 100%)' }}>
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute top-6 right-32 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                  <CalendarDays size={14} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">Academic Calendar</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                School Calendar <span className="text-blue-200">{year}</span>
              </h1>
              <p className="text-white/60 text-sm mt-1.5 max-w-lg">{heroSub}</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button onClick={goToday}
                className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition-all border border-white/20">
                Today
              </button>
              {canManage && (
                <>
                  <button onClick={handleSeedHolidays} disabled={seedingHols}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-sm font-semibold transition-all border border-white/20">
                    <Flag size={14} /> {seedingHols ? 'Importing…' : `Pak Holidays ${year}`}
                  </button>
                  <button onClick={handleSeedIslamicHolidays} disabled={seedingIslamicHols}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-sm font-semibold transition-all border border-white/20"
                    title="Import Eid, Ashura, and 12 Rabi ul Awwal (approximate dates)">
                    ☪️ {seedingIslamicHols ? 'Importing…' : `Islamic Holidays ${year}`}
                  </button>
                  <Link to="/events"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 transition-all shadow-lg">
                    <Settings2 size={14} /> Manage Events
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-12">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* ── Calendar panel ── */}
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">

              {/* Calendar header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <button onClick={prevMonth}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">
                    {MONTHS[month]} <span className="text-slate-400 font-semibold">{year}</span>
                  </h2>
                  <select value={typeFilt} onChange={e => setTypeFilt(e.target.value)}
                    className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All types</option>
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <button onClick={nextMonth}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading events…</div>
              ) : (
                <div className="grid grid-cols-7 px-3 pb-3 gap-px">
                  {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} className="min-h-[60px]" />)}
                  {Array(daysInMonth).fill(null).map((_, i) => {
                    const day     = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvs  = evByDate[dateStr] || [];
                    const isToday = dateStr === todayStr;
                    const isSel   = dateStr === selected;
                    const isHol   = dayEvs.some(e => e.is_holiday);
                    const isSun   = new Date(dateStr + 'T12:00').getDay() === 0;

                    return (
                      <div key={day}
                        onClick={() => setSelected(isSel ? null : dateStr)}
                        className={[
                          'min-h-[60px] p-1 rounded-xl cursor-pointer transition-all select-none',
                          isSel   ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/25'  : '',
                          isHol   ? 'bg-green-50/60 dark:bg-green-900/10' : '',
                          isSun && !isHol && !isSel ? 'bg-red-50/40 dark:bg-red-900/10' : '',
                          !isSel && !isHol ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : '',
                        ].join(' ')}>

                        {/* Day number */}
                        <div className={[
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1',
                          isToday ? 'bg-blue-600 text-white shadow-sm' : '',
                          !isToday && isSun ? 'text-red-400 dark:text-red-400' : '',
                          !isToday && !isSun ? 'text-slate-700 dark:text-slate-300' : '',
                        ].join(' ')}>
                          {day}
                        </div>

                        {/* Event pills */}
                        <div className="flex flex-col gap-0.5">
                          {dayEvs.slice(0, 2).map(ev => (
                            <div key={ev.id}
                              className="rounded-sm px-1 text-white text-[8px] font-semibold leading-tight truncate"
                              style={{ backgroundColor: ev.color || typeColor(ev.type) }}
                              title={ev.title}>
                              {ev.title}
                            </div>
                          ))}
                          {dayEvs.length > 2 && (
                            <div className="text-[8px] text-slate-400 dark:text-slate-500 font-medium text-center">
                              +{dayEvs.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Selected day panel ── */}
              {selected && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                    {new Date(selected + 'T12:00').toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {selEvents.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No events on this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {selEvents.map(ev => (
                        <div key={ev.id}
                          className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: ev.color || typeColor(ev.type) }}>
                            <TypeIcon type={ev.type} size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{ev.title}</p>
                              {ev.is_holiday && (
                                <span className="text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                  Holiday
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {typeLabel(ev.type)}
                              {ev.end_date && ev.end_date !== ev.start_date && ` · Until ${fmtShort(ev.end_date)}`}
                            </p>
                            {ev.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{ev.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── This month summary strip ── */}
              {thisMonth.length > 0 && !selected && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{MONTHS[month]} — {thisMonth.length} event{thisMonth.length !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {thisMonth.map(ev => (
                      <button key={ev.id}
                        onClick={() => setSelected(ev.start_date.slice(0, 10))}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: ev.color || typeColor(ev.type) }}>
                        {ev.start_date.slice(8, 10)} {ev.title.slice(0, 20)}{ev.title.length > 20 ? '…' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right sidebar ── */}
            <div className="flex flex-col gap-5">

              {/* Legend */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Event Types</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                  {EVENT_TYPES.map(t => (
                    <button key={t.value}
                      onClick={() => setTypeFilt(f => f === t.value ? '' : t.value)}
                      className={[
                        'flex items-center gap-2 text-xs font-medium rounded-lg px-2 py-1.5 transition-all text-left',
                        typeFilt === t.value
                          ? 'ring-2 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                      ].join(' ')}
                      style={typeFilt === t.value ? { backgroundColor: t.color, ringColor: t.color } : {}}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
                {typeFilt && (
                  <button onClick={() => setTypeFilt('')}
                    className="mt-2 text-[10px] text-slate-400 hover:text-slate-600 underline w-full text-center">
                    Clear filter
                  </button>
                )}
              </div>

              {/* Upcoming events */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Upcoming Events</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {upcoming.length > 0 ? `${upcoming.length} event${upcoming.length !== 1 ? 's' : ''} ahead` : 'No upcoming events'}
                  </p>
                </div>

                {loading ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Loading…</div>
                ) : upcoming.length === 0 ? (
                  <div className="p-6 text-center">
                    <CalendarDays size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm text-slate-400">No upcoming events</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {upcoming.map(ev => {
                      const dU = daysUntil(ev.start_date);
                      const isToday = dU === 'Today';
                      const isSoon  = typeof dU === 'string' && dU.startsWith('in') && parseInt(dU) <= 3;
                      return (
                        <li key={ev.id}
                          onClick={() => {
                            setYear(parseInt(ev.start_date.slice(0, 4)));
                            setMonth(parseInt(ev.start_date.slice(5, 7)) - 1);
                            setSelected(ev.start_date.slice(0, 10));
                          }}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">

                          {/* Date badge */}
                          <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: ev.color || typeColor(ev.type) }}>
                            <span className="text-[9px] font-bold uppercase leading-none opacity-80">
                              {MONTHS[new Date(ev.start_date + 'T12:00').getMonth()].slice(0, 3)}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {new Date(ev.start_date + 'T12:00').getDate()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 leading-snug truncate">{ev.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {typeLabel(ev.type)}
                              {ev.end_date && ev.end_date !== ev.start_date ? ` · ${fmtShort(ev.start_date)}–${fmtShort(ev.end_date)}` : ` · ${fmtDate(ev.start_date)}`}
                            </p>
                          </div>

                          {/* Countdown badge */}
                          <span className={[
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                            isToday ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                            isSoon  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                          ].join(' ')}>
                            {dU}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Holiday list */}
              {events.filter(e => e.is_holiday).length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <Sun size={14} className="text-green-500" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Holidays</h3>
                  </div>
                  <ul className="divide-y divide-slate-50 dark:divide-slate-800/40 max-h-52 overflow-y-auto">
                    {events
                      .filter(e => e.is_holiday)
                      .sort((a, b) => a.start_date.localeCompare(b.start_date))
                      .map(ev => (
                        <li key={ev.id}
                          onClick={() => {
                            setYear(parseInt(ev.start_date.slice(0, 4)));
                            setMonth(parseInt(ev.start_date.slice(5, 7)) - 1);
                            setSelected(ev.start_date.slice(0, 10));
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50/60 dark:hover:bg-green-900/10 cursor-pointer transition-colors">
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{ev.title}</p>
                            <p className="text-[10px] text-slate-400">{fmtDate(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` – ${fmtDate(ev.end_date)}` : ''}</p>
                          </div>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
