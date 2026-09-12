import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Printer, RefreshCw, ChevronDown, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import TabBar     from '../components/ui/TabBar';
import { INPUT_CLS, SELECT_CLS } from '../components/ui/Input';

const LATE_TABS = [
  { id: 'mark',     label: 'Mark Late' },
  { id: 'register', label: 'Monthly Register' },
];
import { getStudents } from '../api/students';
import { recordLate, getLateArrivals, getMonthlyRegister, deleteLateArrival } from '../api/lateArrivals';
import { useClasses } from '../hooks/useReferenceData';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const selCls = SELECT_CLS;

export default function LateArrivalsPage() {
  const [tab, setTab] = useState('mark');
  const { data: classes = [] } = useClasses();
  const [students, setStudents] = useState([]);

  // Mark Late tab state
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Monthly register tab
  const [regClassId, setRegClassId] = useState('');
  const [regMonth, setRegMonth] = useState(thisMonth());
  const [register, setRegister] = useState([]);
  const [loadingReg, setLoadingReg] = useState(false);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    getStudents({ class_id: classId, status: 'active', limit: 200 })
      .then(r => {
        const d = r.data?.data ?? r.data ?? [];
        setStudents(Array.isArray(d) ? d : []);
      })
      .catch(() => {});
  }, [classId]);

  const loadRecords = useCallback(async () => {
    if (!date) return;
    setLoadingRecords(true);
    try {
      const params = { date };
      if (classId) params.class_id = classId;
      const r = await getLateArrivals(params);
      const d = r.data?.data ?? r.data ?? [];
      setRecords(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load records'); }
    finally { setLoadingRecords(false); }
  }, [date, classId]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!studentId) return toast.error('Select a student');
    if (!arrivalTime) return toast.error('Enter arrival time');
    setSaving(true);
    try {
      await recordLate({ student_id: studentId, date, arrival_time: arrivalTime, reason, class_id: classId || undefined });
      toast.success('Late arrival recorded');
      setStudentId('');
      setArrivalTime('');
      setReason('');
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLateArrival(id);
      toast.success('Record deleted');
      loadRecords();
    } catch { toast.error('Delete failed'); }
  };

  const loadRegister = useCallback(async () => {
    if (!regMonth) return;
    setLoadingReg(true);
    try {
      const params = { month: regMonth };
      if (regClassId) params.class_id = regClassId;
      const r = await getMonthlyRegister(params);
      const d = r.data?.data ?? r.data ?? [];
      setRegister(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load register'); }
    finally { setLoadingReg(false); }
  }, [regMonth, regClassId]);

  useEffect(() => { if (tab === 'register') loadRegister(); }, [tab, loadRegister]);

  const filteredStudents = students.filter(s =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <PageHeader
            icon={Clock}
            title="Late Arrivals"
            subtitle="Track & register late student arrivals"
          />

          {/* Tabs */}
          <TabBar tabs={LATE_TABS} active={tab} onChange={setTab} />

          {/* ── Mark Late Tab ── */}
          {tab === 'mark' && (
            <div className="space-y-5">
              {/* Filters */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      className={selCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                    <div className="relative">
                      <select value={classId} onChange={e => setClassId(e.target.value)} className={`${selCls} pr-8 min-w-[160px]`}>
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <button onClick={loadRecords} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Record Form */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-500" /> Record Late Arrival
                </h2>
                <form onSubmit={handleRecord}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    </div>
                    <div className="relative">
                      <select value={studentId} onChange={e => setStudentId(e.target.value)}
                        className={`${selCls} w-full pr-8`}>
                        <option value="">Select Student *</option>
                        {filteredStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name || s.name} — Roll #{s.roll_number || '?'}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)}
                      className={`${selCls} w-full`} placeholder="Arrival time *" />
                    <input value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-full" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 transition-colors">
                      <Plus className="w-4 h-4" />
                      {saving ? 'Recording…' : 'Record Late Arrival'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Records Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Records for {fmtDate(date)}
                    <span className="ml-2 text-xs font-normal text-slate-400">({records.length})</span>
                  </h3>
                </div>
                {loadingRecords ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : records.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No late arrivals recorded for this date</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-semibold">Student</th>
                          <th className="text-left px-5 py-3 font-semibold">Class</th>
                          <th className="text-left px-5 py-3 font-semibold">Arrival Time</th>
                          <th className="text-left px-5 py-3 font-semibold">Reason</th>
                          <th className="text-right px-5 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {records.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-900 dark:text-white">{r.student_name || r.full_name || '—'}</p>
                              <p className="text-xs text-slate-400">Roll #{r.roll_number || '—'}</p>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{r.class_name || '—'}</td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                <Clock className="w-3 h-3" />
                                {r.arrival_time || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate">{r.reason || '—'}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={() => handleDelete(r.id)}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* ── Monthly Register Tab ── */}
          {tab === 'register' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Month</label>
                    <input type="month" value={regMonth} onChange={e => setRegMonth(e.target.value)} className={selCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                    <div className="relative">
                      <select value={regClassId} onChange={e => setRegClassId(e.target.value)} className={`${selCls} pr-8 min-w-[160px]`}>
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <button onClick={loadRegister} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loadingReg ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ml-auto">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Monthly Late Register — {regMonth}
                    <span className="ml-2 text-xs font-normal text-slate-400">({register.length} students)</span>
                  </h3>
                </div>
                {loadingReg ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : register.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No late arrivals for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 font-semibold">Student</th>
                          <th className="text-left px-5 py-3 font-semibold">Class</th>
                          <th className="text-center px-5 py-3 font-semibold">Late Count</th>
                          <th className="text-left px-5 py-3 font-semibold">Dates</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {register.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-900 dark:text-white">{r.student_name || r.full_name || '—'}</p>
                              <p className="text-xs text-slate-400">Roll #{r.roll_number || '—'}</p>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{r.class_name || '—'}</td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                r.late_count >= 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                r.late_count >= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}>
                                {r.late_count}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {(r.dates || []).map((d, j) => (
                                  <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {new Date(d).getDate()}
                                  </span>
                                ))}
                              </div>
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
