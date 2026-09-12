import { useEffect, useState, useCallback } from 'react';
import {
  Zap, UserX, AlertTriangle, CheckCircle2, RefreshCw,
  Banknote, Bell, Mail, Calendar, ChevronRight, TrendingDown,
  Clock, Users, MessageCircle, Play,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import {
  getAttendanceInsights, runAttendanceCheck,
  runFeeGeneration, runFeeReminders, runFeeDefaulterReport,
} from '../api/automation';

// ── WhatsApp helper ───────────────────────────────────────────────────────────
function whatsappLink(phone, studentName, amount, month) {
  const msg = encodeURIComponent(
    `Assalamu Alaikum,\n\nDear Parent of *${studentName}*,\n\nThis is a reminder that your fee of *PKR ${amount}* for *${month}* is pending.\n\nKindly clear it at your earliest convenience.\n\nThank you.`
  );
  const number = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${number.startsWith('0') ? '92' + number.slice(1) : number}?text=${msg}`;
}

// ── Section card ──────────────────────────────────────────────────────────────
function AutoCard({ icon: Icon, title, description, color, onRun, loading, result, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className={`px-5 py-4 flex items-center justify-between ${color}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">{title}</p>
            <p className="text-white/70 text-xs">{description}</p>
          </div>
        </div>
        {onRun && (
          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition disabled:opacity-60"
          >
            {loading ? <RefreshCw size={13} className="animate-spin"/> : <Play size={13}/>}
            {loading ? 'Running…' : 'Run Now'}
          </button>
        )}
      </div>
      {result && (
        <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          ✅ {result}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── At-risk badge ─────────────────────────────────────────────────────────────
function RiskBadge({ pct, consecutive }) {
  if (consecutive >= 3) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
      {consecutive}d absent
    </span>
  );
  if (pct !== null && pct < 75) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
      {pct}%
    </span>
  );
  return null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const [insights, setInsights]         = useState([]);
  const [loadingInsights, setLI]        = useState(true);
  const [runningAtt, setRunningAtt]     = useState(false);
  const [runningFee, setRunningFee]     = useState(false);
  const [runningRem, setRunningRem]     = useState(false);
  const [runningRep, setRunningRep]     = useState(false);
  const [attResult, setAttResult]       = useState('');
  const [feeResult, setFeeResult]       = useState('');
  const [remResult, setRemResult]       = useState('');
  const [repResult, setRepResult]       = useState('');
  const [feeMonth, setFeeMonth]         = useState(new Date().toISOString().slice(0, 7));

  const loadInsights = useCallback(async () => {
    setLI(true);
    try {
      const { data } = await getAttendanceInsights();
      setInsights(data.data ?? data);
    } catch { toast.error('Failed to load attendance insights.'); }
    finally { setLI(false); }
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  const atRisk   = insights.filter(s => s.is_at_risk || s.is_chronic_absent);
  const chronic  = insights.filter(s => s.is_chronic_absent);
  const lowAtt   = insights.filter(s => s.is_at_risk && !s.is_chronic_absent);

  const handleAttRun = async () => {
    setRunningAtt(true); setAttResult('');
    try {
      const { data } = await runAttendanceCheck();
      setAttResult(`${data.flagged} alert notification(s) created.`);
      toast.success('Attendance check complete.');
      loadInsights();
    } catch { toast.error('Failed.'); }
    finally { setRunningAtt(false); }
  };

  const handleFeeGen = async () => {
    setRunningFee(true); setFeeResult('');
    try {
      const { data } = await runFeeGeneration({ billing_month: feeMonth });
      setFeeResult(`${data.created} invoice(s) created, ${data.skipped} skipped.`);
      toast.success('Fee generation complete.');
    } catch { toast.error('Failed.'); }
    finally { setRunningFee(false); }
  };

  const handleReminders = async () => {
    setRunningRem(true); setRemResult('');
    try {
      const { data } = await runFeeReminders();
      setRemResult(`${data.reminded} reminder(s) sent out of ${data.checked} overdue.`);
      toast.success('Reminders sent.');
    } catch { toast.error('Failed.'); }
    finally { setRunningRem(false); }
  };

  const handleReport = async () => {
    setRunningRep(true); setRepResult('');
    try {
      const { data } = await runFeeDefaulterReport();
      setRepResult(data.sent ? `Report emailed for ${data.count} defaulter(s).` : 'No defaulters or email not configured.');
      toast.success('Defaulter report processed.');
    } catch { toast.error('Failed.'); }
    finally { setRunningRep(false); }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={20}/>
            </div>
            <div>
              <h1 className="text-xl font-bold">Smart Automation</h1>
              <p className="text-purple-200 text-sm">AI-powered insights & automated workflows</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap">
            {[
              [AlertTriangle, chronic.length, 'Chronic Absent', 'bg-red-500/30'],
              [TrendingDown,  lowAtt.length,  'Low Attendance', 'bg-amber-500/30'],
              [Users,         insights.length,'Total Monitored','bg-white/10'],
            ].map(([Icon, val, label, bg]) => (
              <div key={label} className={`flex items-center gap-2 ${bg} rounded-xl px-4 py-2`}>
                <Icon size={15} className="text-white/80"/>
                <span className="text-lg font-bold">{val}</span>
                <span className="text-purple-200 text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Attendance Insights */}
          <AutoCard
            icon={UserX}
            title="Attendance Insights"
            description="Auto-flag chronic absences & at-risk students"
            color="bg-gradient-to-r from-red-500 to-rose-600"
            onRun={handleAttRun}
            loading={runningAtt}
            result={attResult}
          >
            {loadingInsights ? (
              <div className="flex justify-center py-6"><RefreshCw size={20} className="animate-spin text-slate-400"/></div>
            ) : atRisk.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 py-4">
                <CheckCircle2 size={18}/><span className="text-sm font-medium">All students have good attendance</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {atRisk.slice(0, 20).map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400 shrink-0">
                        {s.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{s.full_name}</p>
                        <p className="text-xs text-slate-400">{s.class_name}{s.class_section ? ' ' + s.class_section : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <RiskBadge pct={s.attendance_pct} consecutive={s.consecutive_absences}/>
                      {s.father_phone && (
                        <a
                          href={whatsappLink(s.father_phone, s.full_name, '—', 'this month')}
                          target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 transition"
                          title="WhatsApp parent"
                        >
                          <MessageCircle size={13}/>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {atRisk.length > 20 && (
                  <p className="text-xs text-slate-400 text-center py-2">+{atRisk.length - 20} more students</p>
                )}
              </div>
            )}
          </AutoCard>

          {/* Monthly Fee Generation */}
          <AutoCard
            icon={Banknote}
            title="Monthly Fee Generation"
            description="Auto-generate invoices for all active students"
            color="bg-gradient-to-r from-emerald-500 to-teal-600"
            onRun={handleFeeGen}
            loading={runningFee}
            result={feeResult}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Billing Month</label>
                <input
                  type="month"
                  value={feeMonth}
                  onChange={e => setFeeMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                <p className="font-semibold">Auto-runs on 1st of every month</p>
                <p>Generates invoices for all active students based on fee structures. Skips already-generated invoices safely.</p>
              </div>
            </div>
          </AutoCard>

          {/* Fee Reminder Escalation */}
          <AutoCard
            icon={Bell}
            title="Fee Reminder Escalation"
            description="Automated reminders at Day 1 / 7 / 15 overdue"
            color="bg-gradient-to-r from-amber-500 to-orange-600"
            onRun={handleReminders}
            loading={runningRem}
            result={remResult}
          >
            <div className="space-y-3">
              {[
                { day: 1,  label: 'Day 1',  desc: 'Gentle reminder notification', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                { day: 7,  label: 'Day 7',  desc: 'Second notice — escalated',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                { day: 15, label: 'Day 15', desc: 'Final notice — principal level',color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
              ].map(r => (
                <div key={r.day} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${r.color}`}>{r.label}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{r.desc}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">Runs automatically every day. Use "Run Now" to trigger immediately.</p>
            </div>
          </AutoCard>

          {/* Weekly Defaulter Report */}
          <AutoCard
            icon={Mail}
            title="Fee Defaulter Report"
            description="Weekly email to admin every Monday"
            color="bg-gradient-to-r from-slate-600 to-slate-700"
            onRun={handleReport}
            loading={runningRep}
            result={repResult}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Clock size={16} className="text-slate-500 shrink-0"/>
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Every Monday</p>
                  <p className="text-xs text-slate-400">Auto-emails all admin users with outstanding fee summary</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Calendar size={16} className="text-slate-500 shrink-0"/>
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Includes</p>
                  <p className="text-xs text-slate-400">Student name, class, outstanding amount, father contact</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Configure email in Settings → Email to enable delivery.</p>
            </div>
          </AutoCard>
        </div>
      </div>
    </Layout>
  );
}
