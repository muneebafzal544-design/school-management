import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, Printer, ChevronDown, RefreshCw,
  Users, BookOpen, Banknote, TrendingUp,
  Award, UserCheck, ClipboardList, Building2,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import Spinner from '../components/ui/Spinner';
import { getAnnualReport } from '../api/analytics';

const fmt  = (n) => Number(n || 0).toLocaleString('en-PK');
const pct  = (n) => n !== null && n !== undefined ? `${n}%` : '—';

export default function AnnualReportPage() {
  const currentYear = new Date().getFullYear();
  const [year,    setYear]    = useState(currentYear);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnnualReport(year);
      setData(res.data?.data ?? res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load annual report');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      {/* ── Header ── */}
      <div className="no-print px-4 sm:px-6 lg:px-8 py-6 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">Annual School Report</h1>
              <p className="text-xs text-slate-400">Full-year summary — print ready</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer">
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <button onClick={load} disabled={loading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Printer size={14} /> Print Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data ? null : (
          <div id="annual-report" className="space-y-8">

            {/* ── Report header (print only) ── */}
            <div className="print-only hidden text-center mb-8">
              <h1 className="text-3xl font-black text-slate-900">{data.school?.school_name || 'School Management System'}</h1>
              {data.school?.school_address && <p className="text-sm text-slate-500 mt-1">{data.school.school_address}</p>}
              <h2 className="text-xl font-bold text-slate-700 mt-4">Annual Report — {data.year}</h2>
              <div className="h-0.5 bg-slate-200 mt-4" />
            </div>

            {/* ── Section: Enrollment ── */}
            <ReportSection title="Enrollment" icon={Users} iconColor="#6366f1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <Stat label="Active Students" value={data.enrollment.active_students} accent="#6366f1" />
                <Stat label="Total Enrolled" value={data.enrollment.total_enrolled} />
                <Stat label="Male" value={data.enrollment.male_count} />
                <Stat label="Female" value={data.enrollment.female_count} />
                <Stat label="New Admissions" value={data.enrollment.new_admissions} accent="#10b981" sub={`in ${data.year}`} />
              </div>
            </ReportSection>

            {/* ── Section: Staff ── */}
            <ReportSection title="Staff" icon={UserCheck} iconColor="#8b5cf6">
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Active Teachers" value={data.teachers.active_teachers} accent="#8b5cf6" />
                <Stat label="Total Staff" value={data.teachers.total_teachers} />
              </div>
            </ReportSection>

            {/* ── Section: Attendance ── */}
            <ReportSection title="Attendance" icon={ClipboardList} iconColor="#0ea5e9">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <Stat label="Attendance Rate" value={pct(data.attendance.rate)} accent={data.attendance.rate >= 75 ? '#10b981' : '#f59e0b'} />
                <Stat label="Present Days" value={data.attendance.presentDays?.toLocaleString()} />
                <Stat label="Absent Days"  value={data.attendance.absentDays?.toLocaleString()} />
                <Stat label="Total Records" value={data.attendance.totalDays?.toLocaleString()} />
              </div>
              {data.attendance.rate !== null && (
                <ProgressBar value={data.attendance.rate} color={data.attendance.rate >= 75 ? '#0ea5e9' : '#f59e0b'} label="Overall Attendance Rate" />
              )}
            </ReportSection>

            {/* ── Section: Fee Collection ── */}
            <ReportSection title="Fee Collection" icon={Banknote} iconColor="#10b981">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <Stat label="Collection Rate" value={pct(data.fees.collectionRate)} accent={data.fees.collectionRate >= 80 ? '#10b981' : '#f59e0b'} />
                <Stat label="Total Billed"    value={`PKR ${fmt(data.fees.totalBilled)}`} />
                <Stat label="Collected"       value={`PKR ${fmt(data.fees.totalCollected)}`} accent="#10b981" />
                <Stat label="Overdue Invoices" value={data.fees.overdueInvoices} accent="#ef4444" />
              </div>
              {data.fees.collectionRate !== null && (
                <ProgressBar value={data.fees.collectionRate} color="#10b981" label="Fee Collection Rate" />
              )}
              {/* Monthly fee trend */}
              {data.monthlyFeeCollection?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Monthly Collection</p>
                  <div className="flex items-end gap-1 h-20">
                    {data.monthlyFeeCollection.map(m => {
                      const max = Math.max(...data.monthlyFeeCollection.map(x => parseFloat(x.collected)));
                      const h = max > 0 ? Math.max(4, (parseFloat(m.collected) / max) * 100) : 4;
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: PKR ${fmt(m.collected)}`}>
                          <div className="w-full rounded-t" style={{ height: `${h}%`, background: '#10b981', minHeight: 4 }} />
                          <span className="text-[9px] text-slate-400">{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ReportSection>

            {/* ── Section: Exams ── */}
            <ReportSection title="Academic Performance" icon={Award} iconColor="#f59e0b">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <Stat label="Exams Conducted" value={data.exams.totalExams} />
                <Stat label="Total Results"   value={data.exams.totalResults?.toLocaleString()} />
                <Stat label="Pass Rate"       value={pct(data.exams.passRate)} accent="#f59e0b" />
                <Stat label="Avg Score"       value={data.exams.avgPercentage ? `${data.exams.avgPercentage}%` : '—'} />
              </div>
              {data.exams.passRate !== null && (
                <ProgressBar value={data.exams.passRate} color="#f59e0b" label="Overall Pass Rate" />
              )}
              {/* Top classes */}
              {data.topClasses?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Top Performing Classes</p>
                  <div className="space-y-2">
                    {data.topClasses.map((c, i) => (
                      <div key={c.class_name} className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-300 dark:text-slate-600 w-5 text-center">{i + 1}</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{c.class_name}</span>
                        <span className="text-xs text-slate-400">{c.student_count} students</span>
                        <span className="text-sm font-bold" style={{ color: parseFloat(c.avg_pct) >= 70 ? '#10b981' : '#f59e0b' }}>
                          {parseFloat(c.avg_pct).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ReportSection>

            {/* ── Section: Financials ── */}
            <ReportSection title="Financials" icon={TrendingUp} iconColor="#f97316">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Total Income"   value={`PKR ${fmt(data.income.total)}`} accent="#6366f1" />
                <Stat label="Total Expenses" value={`PKR ${fmt(data.expenses.total)}`} accent="#f97316" />
                <Stat label="Net"            value={`PKR ${fmt(data.income.total - data.expenses.total)}`} accent={data.income.total >= data.expenses.total ? '#10b981' : '#ef4444'} />
                <Stat label="Expense Txns"   value={data.expenses.transactions} />
              </div>
            </ReportSection>

            {/* Print footer */}
            <div className="print-only hidden mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
              <p>Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · {data.school?.school_name || 'School Management System'}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </Layout>
  );
}

function ReportSection({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2"
        style={{ borderLeftColor: iconColor, borderLeftWidth: 3 }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${iconColor}18` }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Stat({ label, value, accent, sub }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black" style={{ color: accent || '#475569' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, color, label }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
    </div>
  );
}
