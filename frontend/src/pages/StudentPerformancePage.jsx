import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Award, BookOpen, BarChart2,
  CheckCircle2, XCircle, AlertCircle, Star, Zap,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { PageLoader } from '../components/ui/Spinner';
import { getStudentPerformance } from '../api/exams';

// ── Grade config ──────────────────────────────────────────────
const GRADE_COLOR = { 'A1': '#10b981', A: '#34d399', B: '#6366f1', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
const GRADE_BG    = {
  'A1': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
   A:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
   B:   'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
   C:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
   D:   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
   F:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};
const TYPE_LABEL = { midterm: 'Midterm', final: 'Final', quiz: 'Quiz', monthly_test: 'Monthly', other: 'Other' };
const PALETTE    = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

function gradeColor(g) { return GRADE_COLOR[g] || '#94a3b8'; }
function gradeBg(g)    { return GRADE_BG[g]    || 'bg-slate-100 text-slate-600'; }
function pctColor(pct) {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

// ── Mini bar ─────────────────────────────────────────────────
function MiniBar({ pct, passing }) {
  const color = pct >= passing ? '#6366f1' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
        <div style={{ width: `${Math.min(pct, 100)}%`, background: color }} className="absolute inset-y-0 left-0 rounded transition-all" />
        <div style={{ left: `${Math.min(passing, 100)}%` }} className="absolute inset-y-0 w-px bg-slate-400/60 dark:bg-slate-500/60" title={`Pass: ${passing}%`} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Overall progress bar ──────────────────────────────────────
function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div style={{ width: `${Math.min(pct, 100)}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Stat pill ────────────────────────────────────────────────
function StatPill({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-4 space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── SVG Progress Chart ────────────────────────────────────────
function SubjectProgressChart({ results, subjects }) {
  const sorted = [...results].sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0));
  const n = sorted.length;
  if (n === 0 || subjects.length === 0) return null;

  const W = 600, H = 220, padL = 34, padR = 56, padT = 18, padB = 34;
  const cW = W - padL - padR;
  const cH = H - padT - padB;
  const toX  = i   => padL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
  const toY  = pct => padT + (1 - Math.min(Math.max(pct, 0), 100) / 100) * cH;

  const lines = subjects.slice(0, 6).map((sub, idx) => {
    const pts = sorted.map((exam, i) => {
      const m = sub.exams.find(e => e.exam_id === exam.exam_id);
      if (!m || m.is_absent) return null;
      return { x: toX(i), y: toY(m.subject_percentage), pct: m.subject_percentage, label: exam.exam_name };
    });
    const valid = pts.filter(Boolean);
    if (valid.length === 0) return null;
    const d    = valid.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${d} L${valid[valid.length - 1].x.toFixed(1)},${toY(0)} L${valid[0].x.toFixed(1)},${toY(0)} Z`;
    return { name: sub.subject_name, pts: valid, d, area, color: PALETTE[idx % PALETTE.length] };
  }).filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <TrendingUp size={16} className="text-indigo-500" />
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Progress Over Time</h2>
        <span className="text-xs text-slate-400 ml-1">{n} exam{n !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 130 }}>
          {/* Horizontal grid */}
          {[0, 25, 50, 75, 100].map(y => {
            const cy = toY(y);
            const isPass = y === 50;
            return (
              <g key={y}>
                <line x1={padL} y1={cy} x2={W - padR} y2={cy}
                  stroke={isPass ? '#f59e0b' : '#e2e8f0'}
                  strokeWidth={isPass ? 1.5 : 0.8}
                  strokeDasharray={isPass ? '5 4' : undefined}
                />
                <text x={padL - 5} y={cy + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{y}</text>
              </g>
            );
          })}
          {/* "Pass" label on the right */}
          <text x={W - padR + 4} y={toY(50) + 4} fontSize="8" fill="#f59e0b" fontWeight="600">Pass</text>

          {/* X axis exam labels */}
          {sorted.map((exam, i) => (
            <text key={exam.exam_id} x={toX(i)} y={H - padB + 13} fontSize="8" fill="#94a3b8" textAnchor="middle">
              {exam.exam_name.length > 9 ? exam.exam_name.slice(0, 8) + '…' : exam.exam_name}
            </text>
          ))}

          {/* Per-subject line + area + dots */}
          {lines.map(({ name, pts, d, area, color }) => (
            <g key={name}>
              <path d={area} fill={color} fillOpacity="0.07" />
              <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, j) => (
                <circle key={j} cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2">
                  <title>{name}: {p.pct.toFixed(0)}% — {p.label}</title>
                </circle>
              ))}
              {/* End-of-line value label */}
              <text x={pts[pts.length - 1].x + 7} y={pts[pts.length - 1].y + 4}
                fontSize="9" fill={color} fontWeight="700">
                {pts[pts.length - 1].pct.toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
          {lines.map(({ name, color }) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="w-4 h-1.5 rounded-full inline-block" style={{ background: color }} />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Momentum row ──────────────────────────────────────────────
function MomentumRow({ results, subjects }) {
  const sorted = [...results].sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0));

  const moments = subjects.map(sub => {
    const nonAbsent = sub.exams.filter(e => !e.is_absent);
    const orderedSub = sorted
      .map(r => nonAbsent.find(e => e.exam_id === r.exam_id))
      .filter(Boolean);
    if (orderedSub.length < 2) return null;
    const last = orderedSub[orderedSub.length - 1];
    const prev = orderedSub[orderedSub.length - 2];
    const delta = last.subject_percentage - prev.subject_percentage;
    return { name: sub.subject_name, delta, current: last.subject_percentage };
  }).filter(Boolean).sort((a, b) => b.delta - a.delta);

  if (moments.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-amber-500" />
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Performance Momentum</h3>
        <span className="text-xs text-slate-400 dark:text-slate-600">vs previous exam</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {moments.map(m => (
          <div key={m.name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
            m.delta > 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : m.delta < 0
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            <span className="text-base leading-none">{m.delta > 0 ? '↑' : m.delta < 0 ? '↓' : '─'}</span>
            <span>{m.name}</span>
            <span className="font-black tabular-nums">
              {m.delta > 0 ? '+' : ''}{m.delta.toFixed(0)}%
            </span>
            <span className="opacity-60 font-normal">({m.current.toFixed(0)}% now)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Subject card ─────────────────────────────────────────────
function SubjectCard({ sub, examLabels }) {
  const marksByExam = {};
  sub.exams.forEach(e => { marksByExam[e.exam_id] = e; });

  const appeared = sub.exams.filter(e => !e.is_absent);
  const pcts     = appeared.map(e => e.subject_percentage).filter(p => !isNaN(p));
  const avg      = pcts.length ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
  const trend    = pcts.length >= 2 ? pcts[pcts.length - 1] - pcts[0] : null;
  const passing  = appeared[0] ? Math.round(appeared[0].passing_marks / appeared[0].total_marks * 100) : 50;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{sub.subject_name}</p>
          {sub.subject_code && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{sub.subject_code}</span>
          )}
        </div>
        <div className="text-right">
          {avg !== null ? (
            <>
              <p className="text-lg font-black tabular-nums" style={{ color: pctColor(avg) }}>{avg.toFixed(0)}%</p>
              {trend !== null && (
                <p className={`text-[10px] font-bold ${trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend).toFixed(0)}%
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">No data</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {examLabels.map(e => {
          const m = marksByExam[e.id];
          return (
            <div key={e.id} className="flex items-center gap-2">
              <p className="text-[10px] text-slate-400 truncate w-24 shrink-0">{e.name}</p>
              {m ? (
                m.is_absent
                  ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">AB</span>
                  : <MiniBar pct={m.subject_percentage} passing={passing} />
              ) : (
                <span className="text-[10px] text-slate-300 dark:text-slate-700">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function StudentPerformancePage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    getStudentPerformance(id)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load performance data'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><PageLoader /></Layout>;

  if (error) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-red-500 font-semibold">{error}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline">Go back</button>
      </div>
    </Layout>
  );

  const { student, results, subjects } = data;

  // Derived stats
  const totalExams = results.length;
  const passCount  = results.filter(r => r.result_status === 'pass').length;
  const avgPct     = totalExams > 0 ? results.reduce((s, r) => s + parseFloat(r.percentage || 0), 0) / totalExams : null;
  const bestResult = results.reduce((b, r) => (!b || parseFloat(r.percentage) > parseFloat(b.percentage)) ? r : b, null);
  const bestRank   = results.reduce((b, r) => (!b || parseInt(r.rank) < parseInt(b.rank)) ? r : b, null);

  const examLabels    = results.map(r => ({ id: r.exam_id, name: r.exam_name, type: r.exam_type }));
  const latestResult  = results[results.length - 1] || null;
  const latestSubjects = latestResult
    ? subjects.map(sub => {
        const entry = sub.exams.find(e => e.exam_id === latestResult.exam_id);
        return entry ? { ...entry, subject_name: sub.subject_name, subject_code: sub.subject_code } : null;
      }).filter(Boolean)
    : [];

  const subjectAvgs = subjects.map(sub => {
    const appeared = sub.exams.filter(e => !e.is_absent);
    const pcts     = appeared.map(e => e.subject_percentage).filter(p => !isNaN(p));
    const avg      = pcts.length ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
    const passing  = appeared[0] ? Math.round(appeared[0].passing_marks / appeared[0].total_marks * 100) : 50;
    return { name: sub.subject_name, avg, passing };
  }).filter(s => s.avg !== null);
  const strong = subjectAvgs.filter(s => s.avg >= s.passing).sort((a, b) => b.avg - a.avg);
  const weak   = subjectAvgs.filter(s => s.avg < s.passing).sort((a, b) => a.avg - b.avg);

  const cardCls      = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm';
  const thCls        = 'px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap';
  const tdCls        = 'px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap';
  const visibleResults = showAll ? results : results.slice(-5);

  return (
    <Layout>
      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2 text-indigo-200 hover:text-white text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Students
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <TrendingUp size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">{student.full_name}</h1>
              <p className="text-indigo-200 text-sm mt-0.5">
                {student.class_name && <span className="font-semibold">{student.class_name} · </span>}
                Roll #{student.roll_number || '—'}
                {student.father_name && <span className="ml-2 opacity-70">/ {student.father_name}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-12 pb-12 max-w-6xl mx-auto space-y-6">

        {/* ── KPI pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Exams Taken"  value={totalExams} sub="Total recorded" color="#6366f1" />
          <StatPill
            label="Pass Rate"
            value={totalExams ? `${Math.round(passCount / totalExams * 100)}%` : '—'}
            sub={`${passCount} / ${totalExams} passed`}
            color={passCount === totalExams ? '#10b981' : '#f59e0b'}
          />
          <StatPill
            label="Avg Score"
            value={avgPct !== null ? `${avgPct.toFixed(1)}%` : '—'}
            sub={bestResult ? `Best grade: ${bestResult.grade}` : 'No results yet'}
            color={avgPct !== null ? pctColor(avgPct) : '#94a3b8'}
          />
          <StatPill
            label="Best Rank"
            value={bestRank ? `#${bestRank.rank}` : '—'}
            sub={bestRank ? `of ${bestRank.total_in_class} · ${bestRank.exam_name}` : 'No rankings yet'}
            color="#f59e0b"
          />
        </div>

        {/* ── No data ── */}
        {totalExams === 0 && (
          <div className={`${cardCls} flex flex-col items-center justify-center py-20 gap-3`}>
            <BarChart2 size={40} className="text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500 font-semibold">No exam results found for this student.</p>
            <p className="text-xs text-slate-400">Results will appear here once exams are calculated.</p>
          </div>
        )}

        {totalExams > 0 && (
          <>
            {/* ── Progress chart (new) ── */}
            {results.length >= 2 && (
              <SubjectProgressChart results={results} subjects={subjects} />
            )}

            {/* ── Momentum row (new) ── */}
            <MomentumRow results={results} subjects={subjects} />

            {/* ── Strong / Needs-attention ── */}
            {(strong.length > 0 || weak.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {strong.length > 0 && (
                  <div className={`${cardCls} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={14} className="text-emerald-500" />
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Strong Subjects</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {strong.map(s => (
                        <span key={s.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                          <CheckCircle2 size={10} /> {s.name}
                          <span className="ml-0.5 opacity-70">{s.avg.toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {weak.length > 0 && (
                  <div className={`${cardCls} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle size={14} className="text-red-400" />
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Needs Attention</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weak.map(s => (
                        <span key={s.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                          <XCircle size={10} /> {s.name}
                          <span className="ml-0.5 opacity-70">{s.avg.toFixed(0)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Latest exam detail ── */}
            {latestResult && latestSubjects.length > 0 && (
              <div className={cardCls}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Latest Exam — {latestResult.exam_name}</h2>
                  <span className={`ml-auto px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                    latestResult.result_status === 'pass'
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {latestResult.result_status === 'pass' ? 'Pass' : 'Fail'} · {parseFloat(latestResult.percentage).toFixed(1)}%
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {latestSubjects.map(s => {
                    const pct     = parseFloat(s.subject_percentage);
                    const passing = Math.round(s.passing_marks / s.total_marks * 100);
                    return (
                      <div key={s.subject_name} className={[
                        'rounded-xl border p-3 space-y-2',
                        s.is_absent
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                          : pct >= passing
                          ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800'
                          : 'bg-red-50/40 dark:bg-red-900/10 border-red-100 dark:border-red-800',
                      ].join(' ')}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.subject_name}</p>
                          {s.is_absent ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">AB</span>
                          ) : (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${gradeBg(s.subject_grade)}`}>
                              {s.subject_grade}
                            </span>
                          )}
                        </div>
                        {s.is_absent ? (
                          <p className="text-xs text-slate-400">Absent</p>
                        ) : (
                          <>
                            <MiniBar pct={pct} passing={passing} />
                            <p className="text-[10px] text-slate-400 tabular-nums">
                              {parseFloat(s.obtained_marks).toFixed(0)} / {s.total_marks} marks
                            </p>
                            {s.remarks && (
                              <p className="text-[10px] italic text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-1.5 mt-1">
                                "{s.remarks}"
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Exam history table ── */}
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Award size={16} className="text-indigo-500" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Exam Results</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{totalExams} exam{totalExams !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      {['Exam', 'Type', 'Marks', 'Percentage', 'Grade', 'Rank', 'Status'].map(h => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {visibleResults.map(r => (
                      <tr key={r.exam_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                        <td className={tdCls}>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{r.exam_name}</p>
                          <p className="text-xs text-slate-400">{r.start_date?.slice(0, 10)} · {r.academic_year}</p>
                        </td>
                        <td className={tdCls}>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {TYPE_LABEL[r.exam_type] || r.exam_type}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{parseFloat(r.obtained_marks).toFixed(0)}</span>
                          <span className="text-slate-400"> / {parseFloat(r.total_marks).toFixed(0)}</span>
                        </td>
                        <td className={`${tdCls} min-w-40`}>
                          <PctBar pct={parseFloat(r.percentage)} />
                        </td>
                        <td className={tdCls}>
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black text-white"
                            style={{ background: gradeColor(r.grade) }}>
                            {r.grade}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <span className="font-bold text-amber-500">#{r.rank}</span>
                          <span className="text-xs text-slate-400"> / {r.total_in_class}</span>
                        </td>
                        <td className={tdCls}>
                          <span className={[
                            'px-2.5 py-1 rounded-lg text-xs font-bold',
                            r.result_status === 'pass'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                          ].join(' ')}>
                            {r.result_status === 'pass' ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.length > 5 && (
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button onClick={() => setShowAll(v => !v)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                    {showAll ? 'Show less' : `Show all ${results.length} exams`}
                  </button>
                </div>
              )}
            </div>

            {/* ── Subject cards grid ── */}
            {subjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={15} className="text-purple-500" />
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Subject-wise Performance</h2>
                  <span className="text-xs text-slate-400 ml-1">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map(sub => (
                    <SubjectCard key={sub.subject_name} sub={sub} examLabels={examLabels} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
