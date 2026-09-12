import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, BookOpen, Mail, Phone, Pencil,
  TrendingUp, Banknote, BarChart2, Award, AlertTriangle,
  CheckCircle2, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { getClass, getClassStudents } from '../api/classes';
import { getClassAnalytics } from '../api/analytics';
import { formatDate, toPct } from '../utils';

const TABS = [
  { id: 'students',  label: 'Students',   icon: Users },
  { id: 'analytics', label: 'Analytics',  icon: BarChart2 },
];

export default function ClassDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [tab,      setTab]      = useState('students');
  const [cls,      setCls]      = useState(null);
  const [students, setStudents] = useState([]);
  const [analytics,setAnalytics]= useState(null);
  const [loading,  setLoading]  = useState(true);
  const [loadingA, setLoadingA] = useState(false);

  useEffect(() => {
    Promise.all([getClass(id), getClassStudents(id)])
      .then(([c, s]) => { setCls(c.data); setStudents(Array.isArray(s.data) ? s.data : []); })
      .catch(() => toast.error('Failed to load class'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadAnalytics = useCallback(async () => {
    if (analytics) return;
    setLoadingA(true);
    try {
      const { data } = await getClassAnalytics(id);
      setAnalytics(data?.data ?? data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoadingA(false);
    }
  }, [id, analytics]);

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadAnalytics]);

  const pct = cls ? toPct(students.length, cls.capacity) : 0;

  const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm';
  const thCls   = 'px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap';
  const tdCls   = 'px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap';

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Sticky header ── */}
        <div className="sticky top-14 lg:top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/classes')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                  {cls?.name || 'Class Detail'}
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">{cls?.academic_year}</p>
              </div>
            </div>
            {/* Tab bar */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
              {TABS.map(({ id: tid, label, icon: Icon }) => (
                <button key={tid} onClick={() => setTab(tid)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    tab === tid
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700',
                  ].join(' ')}>
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : !cls ? (
          <EmptyState icon={BookOpen} title="Class not found" description="This class may have been deleted." />
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-5xl mx-auto">

            {/* Class info card */}
            <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="px-6 py-6 text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #9333ea)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold">{cls.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">{cls.grade}</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">Section {cls.section}</span>
                      {cls.room_number && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 border border-white/20">Room {cls.room_number}</span>}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls.status === 'active' ? 'bg-white/20 border-white/30' : 'bg-black/20 border-black/20 text-white/60'}`}>{cls.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold">{students.length}</p>
                    <p className="text-white/60 text-xs">of {cls.capacity} enrolled</p>
                    <div className="mt-2 h-1.5 w-32 bg-white/20 rounded-full overflow-hidden ml-auto">
                      <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 px-6 py-4 flex flex-wrap gap-6 text-sm">
                {cls.class_teacher && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Teacher</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{cls.class_teacher}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Academic Year</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{cls.academic_year || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Capacity</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{cls.capacity}</p>
                </div>
              </div>
            </div>

            {/* ── Tab content ── */}
            {tab === 'students' && (
              <StudentsTab students={students} navigate={navigate} />
            )}
            {tab === 'analytics' && (
              <AnalyticsTab
                analytics={analytics}
                loading={loadingA}
                cardCls={cardCls}
                thCls={thCls}
                tdCls={tdCls}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── Students tab ──────────────────────────────────────────────
function StudentsTab({ students, navigate }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Students <span className="text-slate-400 font-normal ml-1">({students.length})</span>
          </h2>
        </div>
        <Button size="sm" onClick={() => navigate('/admission/new')}>
          Add Student
        </Button>
      </div>

      {students.length === 0 ? (
        <EmptyState icon={Users} title="No students in this class" description="Add students via the enrollment form." />
      ) : (
        <>
          {/* Mobile */}
          <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {students.map(s => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={s.full_name} id={s.id} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{s.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.phone || s.email || '—'}</p>
                </div>
                <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
              </li>
            ))}
          </ul>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  {['Student', 'Contact', 'B-Form', 'Status', 'Admitted', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.08em] whitespace-nowrap first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {students.map(s => (
                  <tr key={s.id} className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} id={s.id} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-40">{s.full_name}</p>
                          {s.email && (
                            <p className="text-xs text-slate-400 truncate max-w-40 flex items-center gap-1 mt-0.5">
                              <Mail size={10} />{s.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {s.phone
                        ? <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400" />{s.phone}</span>
                        : <span className="text-slate-300 dark:text-slate-700">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {s.b_form_no || <span className="text-slate-300 dark:text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge type="status" value={s.status || 'active'}>{s.status || 'active'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(s.admission_date)}</td>
                    <td className="px-4 py-3 pr-5">
                      <button
                        onClick={() => navigate(`/admission/edit/${s.id}`)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────
function AnalyticsTab({ analytics, loading, cardCls, thCls, tdCls }) {
  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" /></div>;
  if (!analytics) return null;

  const { attendanceByWeek, attendanceRate, feeStats, topStudents, bottomStudents, subjectDifficulty } = analytics;

  const fmt = (n) => Number(n || 0).toLocaleString('en-PK');

  return (
    <div className="space-y-5">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Attendance Rate" icon={CheckCircle2} iconColor="#10b981"
          value={attendanceRate !== null ? `${attendanceRate}%` : '—'}
          sub="This month" barColor="#10b981" barPct={attendanceRate}
        />
        <KpiCard
          label="Fee Collected" icon={Banknote} iconColor="#6366f1"
          value={feeStats.collectionRate !== null ? `${feeStats.collectionRate}%` : '—'}
          sub={`PKR ${fmt(feeStats.totalPaid)} / ${fmt(feeStats.totalBilled)}`}
          barColor="#6366f1" barPct={feeStats.collectionRate}
        />
        <KpiCard
          label="Paying Students" icon={Users} iconColor="#f59e0b"
          value={feeStats.paidStudents}
          sub={`of ${feeStats.totalStudents} students`}
          barColor="#f59e0b"
          barPct={feeStats.totalStudents > 0 ? Math.round(feeStats.paidStudents / feeStats.totalStudents * 100) : 0}
        />
        <KpiCard
          label="Outstanding" icon={AlertTriangle} iconColor="#ef4444"
          value={`PKR ${fmt(feeStats.totalOutstanding)}`}
          sub="Total unpaid fees"
        />
      </div>

      {/* ── Attendance by week ── */}
      <div className={cardCls}>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <TrendingUp size={15} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Attendance — This Month</h3>
        </div>
        {attendanceByWeek.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-sm">No attendance data recorded yet.</p>
        ) : (
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendanceByWeek} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Attendance Rate']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.12)', fontSize: 12 }}
                />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                  {attendanceByWeek.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 75 ? '#6366f1' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />≥75%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />50–74%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />&lt;50%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Top / Bottom students ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <RankTable title="Top 5 Students" icon={Award} iconColor="#f59e0b" rows={topStudents} thCls={thCls} tdCls={tdCls} />
        <RankTable title="Bottom 5 Students" icon={AlertTriangle} iconColor="#ef4444" rows={bottomStudents} thCls={thCls} tdCls={tdCls} bottom />
      </div>

      {/* ── Subject difficulty ── */}
      {subjectDifficulty.length > 0 && (
        <div className={cardCls}>
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <BookOpen size={15} className="text-purple-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Subject Difficulty</h3>
            <span className="ml-auto text-xs text-slate-400">Sorted by difficulty (hardest first)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  {['Subject', 'Avg %', 'Pass Rate', 'Attempts', 'Difficulty'].map(h => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {subjectDifficulty.map(sub => {
                  const avg = parseFloat(sub.avg_pct);
                  const pass = parseFloat(sub.pass_rate);
                  const difficulty = avg < 50 ? 'Hard' : avg < 65 ? 'Medium' : 'Easy';
                  const diffColor  = avg < 50 ? '#ef4444' : avg < 65 ? '#f59e0b' : '#10b981';
                  return (
                    <tr key={sub.subject_name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                      <td className={`${tdCls} font-semibold text-slate-800 dark:text-slate-200`}>
                        {sub.subject_name}
                        {sub.subject_code && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">{sub.subject_code}</span>}
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${avg}%`, background: diffColor }} />
                          </div>
                          <span className="text-xs font-bold tabular-nums" style={{ color: diffColor }}>{avg.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="text-xs font-semibold" style={{ color: pass >= 70 ? '#10b981' : pass >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {pass.toFixed(0)}%
                        </span>
                      </td>
                      <td className={`${tdCls} text-slate-400`}>{sub.attempts}</td>
                      <td className={tdCls}>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${diffColor}20`, color: diffColor }}>
                          {difficulty}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, icon: Icon, iconColor, value, sub, barColor, barPct }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}18` }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
      {barColor && barPct !== undefined && (
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(barPct || 0, 100)}%`, background: barColor }} />
        </div>
      )}
    </div>
  );
}

function RankTable({ title, icon: Icon, iconColor, rows, thCls, tdCls, bottom }) {
  const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm';
  return (
    <div className={cardCls}>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Icon size={15} style={{ color: iconColor }} />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-center py-8 text-slate-400 text-sm">No exam data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                {['#', 'Student', 'Avg %', 'Exams'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {rows.map((s, i) => {
                const pct = parseFloat(s.avg_pct);
                const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                    <td className={`${tdCls} font-bold text-slate-400`}>
                      {bottom ? rows.length - i : i + 1}
                    </td>
                    <td className={`${tdCls} font-semibold text-slate-800 dark:text-slate-200`}>
                      {s.full_name}
                      {s.roll_number && <span className="ml-1.5 text-[10px] text-slate-400">#{s.roll_number}</span>}
                    </td>
                    <td className={tdCls}>
                      <span className="font-bold tabular-nums" style={{ color }}>{pct.toFixed(1)}%</span>
                    </td>
                    <td className={`${tdCls} text-slate-400`}>{s.exam_count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
