import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck, Plus, Trash2, X, ChevronDown, RefreshCw,
  Clock, User, Phone, CheckCircle2, XCircle, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import { INPUT_CLS, SELECT_CLS } from '../components/ui/Input';

const MEETING_TABS = [
  { id: 'slots',    label: 'Slots' },
  { id: 'bookings', label: 'Bookings' },
];
import { getTeachers } from '../api/teachers';
import { getStudents } from '../api/students';
import {
  createSlots, getSlots, deleteSlot,
  bookSlot, getBookings, cancelBooking,
} from '../api/meetings';

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const inp    = INPUT_CLS;
const selCls = SELECT_CLS;

const STATUS_BADGE = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  booked:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function MeetingsPage() {
  const [tab, setTab] = useState('slots');
  const [teachers, setTeachers] = useState([]);

  // Slots tab
  const [slotsDate, setSlotsDate] = useState(today());
  const [slotsTeacher, setSlotsTeacher] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Create slots form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [slotForm, setSlotForm] = useState({
    teacher_id: '', slot_date: today(), start_time: '', end_time: '', duration_min: 15, location: '',
  });
  const [creatingSlots, setCreatingSlots] = useState(false);

  // Book slot modal
  const [bookingSlot,  setBookingSlot]  = useState(null); // slot object to book
  const [students,     setStudents]     = useState([]);
  const [bookForm,     setBookForm]     = useState({ student_id: '', parent_name: '', parent_phone: '', notes: '' });
  const [bookingSlotLoading, setBookingSlotLoading] = useState(false);

  // Bookings tab
  const [bookingsTeacher, setBookingsTeacher] = useState('');
  const [bookingsDate, setBookingsDate] = useState('');
  const [bookingsStatus, setBookingsStatus] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const setSlotForm_ = (k, v) => setSlotForm(f => ({ ...f, [k]: v }));
  const setBookForm_ = (k, v) => setBookForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getTeachers({ status: 'active', limit: 200 })
      .then(r => { const d = r.data?.data ?? r.data ?? []; setTeachers(Array.isArray(d) ? d : []); })
      .catch(() => toast.error('Failed to load teachers'));
  }, []);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const params = {};
      if (slotsDate) params.date = slotsDate;
      if (slotsTeacher) params.teacher_id = slotsTeacher;
      const r = await getSlots(params);
      const d = r.data?.data ?? r.data ?? [];
      setSlots(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load slots'); }
    finally { setLoadingSlots(false); }
  }, [slotsDate, slotsTeacher]);

  useEffect(() => { if (tab === 'slots') loadSlots(); }, [tab, loadSlots]);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const params = {};
      if (bookingsTeacher) params.teacher_id = bookingsTeacher;
      if (bookingsDate) params.date = bookingsDate;
      if (bookingsStatus) params.status = bookingsStatus;
      const r = await getBookings(params);
      const d = r.data?.data ?? r.data ?? [];
      setBookings(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoadingBookings(false); }
  }, [bookingsTeacher, bookingsDate, bookingsStatus]);

  useEffect(() => { if (tab === 'bookings') loadBookings(); }, [tab, loadBookings]);

  const handleCreateSlots = async (e) => {
    e.preventDefault();
    if (!slotForm.teacher_id) return toast.error('Select a teacher');
    if (!slotForm.slot_date) return toast.error('Date required');
    if (!slotForm.start_time || !slotForm.end_time) return toast.error('Start and end time required');
    setCreatingSlots(true);
    try {
      await createSlots(slotForm);
      toast.success('Slots created');
      setShowCreateForm(false);
      loadSlots();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create slots'); }
    finally { setCreatingSlots(false); }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await deleteSlot(id);
      toast.success('Slot deleted');
      loadSlots();
    } catch { toast.error('Delete failed'); }
  };

  const handleCancelBooking = async (id) => {
    try {
      await cancelBooking(id);
      toast.success('Booking cancelled');
      loadBookings();
    } catch { toast.error('Cancel failed'); }
  };

  const openBookModal = async (slot) => {
    setBookingSlot(slot);
    setBookForm({ student_id: '', parent_name: '', parent_phone: '', notes: '' });
    if (students.length === 0) {
      try {
        const r = await getStudents({ limit: 500 });
        const d = r.data?.data ?? r.data ?? [];
        setStudents(Array.isArray(d) ? d : []);
      } catch { /* silent */ }
    }
  };

  const handleBookSlot = async () => {
    if (!bookForm.student_id) return toast.error('Select a student');
    setBookingSlotLoading(true);
    try {
      await bookSlot(bookingSlot.id, bookForm);
      toast.success('Slot booked successfully');
      setBookingSlot(null);
      loadSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    }
    setBookingSlotLoading(false);
  };

  const handlePrint = () => {
    const params = new URLSearchParams();
    if (bookingsDate) params.set('date', bookingsDate);
    if (bookingsTeacher) params.set('teacher_id', bookingsTeacher);
    window.open(`/meetings/print?${params.toString()}`, '_blank');
  };

  return (
    <Layout>
      {/* Book Slot Modal */}
      {bookingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">Book Slot — {bookingSlot.start_time} · {bookingSlot.teacher_name}</h2>
              <button onClick={() => setBookingSlot(null)}><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Student *</label>
                <div className="relative">
                  <select value={bookForm.student_id} onChange={e => setBookForm_('student_id', e.target.value)} className={`${inp} pr-8 appearance-none`}>
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.class_name || ''}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Parent Name</label>
                <input value={bookForm.parent_name} onChange={e => setBookForm_('parent_name', e.target.value)} placeholder="e.g. Mr. Ahmed Khan" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Parent Phone</label>
                <input value={bookForm.parent_phone} onChange={e => setBookForm_('parent_phone', e.target.value)} placeholder="03XX-XXXXXXX" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                <input value={bookForm.notes} onChange={e => setBookForm_('notes', e.target.value)} placeholder="Optional notes…" className={inp} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setBookingSlot(null)} className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleBookSlot} disabled={bookingSlotLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <CheckCircle2 className="w-4 h-4" /> {bookingSlotLoading ? 'Booking…' : 'Book Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={CalendarCheck}
            title="PTM Scheduler"
            subtitle="Parent-teacher meeting slots & bookings"
          />

          {/* Tabs */}
          <TabBar tabs={MEETING_TABS} active={tab} onChange={setTab} />

          {/* ── Slots Tab ── */}
          {tab === 'slots' && (
            <div className="space-y-5">
              {/* Filters */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                    <input type="date" value={slotsDate} onChange={e => setSlotsDate(e.target.value)} className={selCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Teacher</label>
                    <div className="relative">
                      <select value={slotsTeacher} onChange={e => setSlotsTeacher(e.target.value)} className={`${selCls} pr-8 min-w-[180px]`}>
                        <option value="">All Teachers</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <button onClick={loadSlots} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <RefreshCw className={`w-4 h-4 ${loadingSlots ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => setShowCreateForm(v => !v)}
                    className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <Plus className="w-4 h-4" /> Create Slots
                  </button>
                </div>
              </div>

              {/* Create Slots Form */}
              {showCreateForm && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Create Time Slots</h3>
                  <form onSubmit={handleCreateSlots}>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Teacher *</label>
                        <div className="relative">
                          <select value={slotForm.teacher_id} onChange={e => setSlotForm_('teacher_id', e.target.value)}
                            className={`${inp} pr-8 appearance-none`}>
                            <option value="">Select teacher…</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date *</label>
                        <input type="date" value={slotForm.slot_date} onChange={e => setSlotForm_('slot_date', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duration (min)</label>
                        <input type="number" min="5" value={slotForm.duration_min} onChange={e => setSlotForm_('duration_min', Number(e.target.value))} className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Time *</label>
                        <input type="time" value={slotForm.start_time} onChange={e => setSlotForm_('start_time', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Time *</label>
                        <input type="time" value={slotForm.end_time} onChange={e => setSlotForm_('end_time', e.target.value)} className={inp} />
                      </div>
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
                        <input value={slotForm.location} onChange={e => setSlotForm_('location', e.target.value)} placeholder="e.g. Room 101" className={inp} />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button type="button" onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                      <button type="submit" disabled={creatingSlots}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <Plus className="w-4 h-4" /> {creatingSlots ? 'Creating…' : 'Create Slots'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Slots Grid */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Time Slots <span className="text-xs font-normal text-slate-400">({slots.length})</span>
                  </h3>
                </div>
                {loadingSlots ? (
                  <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : slots.length === 0 ? (
                  <div className="py-12 text-center">
                    <CalendarCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No slots found. Create slots using the button above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
                    {slots.map(slot => (
                      <div key={slot.id} className={`relative rounded-xl border p-3 ${
                        slot.status === 'booked' ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800/30' :
                        slot.status === 'available' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800/30' :
                        'border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-sm font-bold text-slate-800 dark:text-white">{slot.start_time}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{slot.teacher_name || '—'}</p>
                        {slot.location && <p className="text-[10px] text-slate-400 mt-0.5">{slot.location}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[slot.status] || STATUS_BADGE.available}`}>
                            {slot.status || 'available'}
                          </span>
                          {slot.status === 'available' && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openBookModal(slot)}
                                className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 transition-colors" title="Book slot">
                                <User className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors" title="Delete slot">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {slot.status === 'booked' && slot.student_name && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium truncate">{slot.student_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Bookings Tab ── */}
          {tab === 'bookings' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                    <input type="date" value={bookingsDate} onChange={e => setBookingsDate(e.target.value)} className={selCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Teacher</label>
                    <div className="relative">
                      <select value={bookingsTeacher} onChange={e => setBookingsTeacher(e.target.value)} className={`${selCls} pr-8 min-w-[180px]`}>
                        <option value="">All Teachers</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                    <div className="relative">
                      <select value={bookingsStatus} onChange={e => setBookingsStatus(e.target.value)} className={`${selCls} pr-8`}>
                        <option value="">All Status</option>
                        <option value="booked">Booked</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <button onClick={loadBookings} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <RefreshCw className={`w-4 h-4 ${loadingBookings ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={handlePrint}
                    className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Printer className="w-4 h-4" /> Print Schedule
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bookings <span className="text-xs font-normal text-slate-400">({bookings.length})</span>
                  </h3>
                </div>
                {loadingBookings ? (
                  <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : bookings.length === 0 ? (
                  <div className="py-12 text-center">
                    <CalendarCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No bookings found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-semibold">Student</th>
                          <th className="text-left px-5 py-3 font-semibold">Parent</th>
                          <th className="text-left px-5 py-3 font-semibold">Phone</th>
                          <th className="text-left px-5 py-3 font-semibold">Teacher</th>
                          <th className="text-left px-5 py-3 font-semibold">Date & Time</th>
                          <th className="text-left px-5 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bookings.map(b => (
                          <tr key={b.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                  {(b.student_name || 'S')[0]}
                                </div>
                                <span className="font-medium text-slate-900 dark:text-white">{b.student_name || '—'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">{b.parent_name || '—'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-400">{b.parent_phone || '—'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{b.teacher_name || '—'}</td>
                            <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                              <p>{fmtDate(b.slot_date)}</p>
                              <p className="text-xs text-slate-400">{b.slot_time || '—'}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[b.status] || ''}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {b.status === 'booked' && (
                                <button onClick={() => handleCancelBooking(b.id)}
                                  className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
