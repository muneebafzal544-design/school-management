/**
 * FeeAnalyticsPage.jsx
 * Revenue analytics, class comparison, collection rate, 3-month forecast,
 * defaulter heatmap, collector report, annual rollover.
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Zap, Users, ArrowRight,
  RefreshCw, Calendar, BarChart2, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import {
  getRevenueTrend, getClassComparison, getCollectionRate,
  getForecast, getDefaulterHeatmap, getCollectorReport, rolloverFeeStructures,
  getCollectionTargets, setCollectionTarget,
} from '../api/feeAdvanced';

const PKR = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ── Tooltip ──────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1 text-slate-600 dark:text-slate-300">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{PKR(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Heatmap severity colour ───────────────────────────────────────────────────
function heatColor(pct) {
  if (pct >= 70) return 'bg-red-500';
  if (pct >= 40) return 'bg-orange-400';
  if (pct >= 20) return 'bg-yellow-400';
  return 'bg-green-400';
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Revenue Overview' },
  { id: 'classes',    label: 'Class Comparison' },
  { id: 'heatmap',    label: 'Defaulter Heatmap' },
  { id: 'forecast',   label: 'Forecast' },
  { id: 'collector',  label: 'Collector Report' },
  { id: 'rollover',   label: 'Annual Rollover' },
];

export default function FeeAnalyticsPage() {
  const [tab,            setTab]           = useState('overview');
  const [trend,          setTrend]         = useState([]);
  const [classes,        setClasses]       = useState([]);
  const [heatmap,        setHeatmap]       = useState([]);
  const [forecast,       setForecast]      = useState({ data: [], avg_rate_pct: 0 });
  const [rates,          setRates]         = useState(null);
  const [collector,      setCollector]     = useState([]);
  const [loading,        setLoading]       = useState({});
  const [month,          setMonth]         = useState(new Date().toISOString().slice(0, 7));
  const [collectorDate,  setCollectorDate] = useState(new Date().toISOString().slice(0, 10));

  // Rollover state
  const [fromYear,       setFromYear]      = useState('2024-25');
  const [toYear,         setToYear]        = useState('2025-26');
  const [incPct,         setIncPct]        = useState(0);
  const [rolling,        setRolling]       = useState(false);

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));

  // Load overview + rates on mount
  useEffect(() => {
    loadTrend();
    loadRates();
  }, []);

  const loadTrend = async () => {
    setLoad('trend', true);
    try {
      const r = await getRevenueTrend({ months: 12 });
      setTrend((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load revenue trend'); }
    finally { setLoad('trend', false); }
  };

  const loadClasses = async () => {
    setLoad('classes', true);
    try {
      const r = await getClassComparison({ billing_month: month });
      setClasses((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load class comparison'); }
    finally { setLoad('classes', false); }
  };

  const loadHeatmap = async () => {
    setLoad('heatmap', true);
    try {
      const r = await getDefaulterHeatmap({ billing_month: month });
      setHeatmap((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load heatmap'); }
    finally { setLoad('heatmap', false); }
  };

  const loadForecast = async () => {
    setLoad('forecast', true);
    try {
      const r = await getForecast({ months: 3 });
      setForecast(r.data?.data ? r.data : (r.data ?? { data: [], avg_rate_pct: 0 }));
    } catch { toast.error('Failed to load forecast'); }
    finally { setLoad('forecast', false); }
  };

  const loadRates = async () => {
    setLoad('rates', true);
    try {
      const r = await getCollectionRate();
      setRates(r.data?.data ?? r.data ?? null);
    } catch { /* silent */ }
    finally { setLoad('rates', false); }
  };

  const loadCollector = async () => {
    setLoad('collector', true);
    try {
      const r = await getCollectorReport({ date: collectorDate });
      setCollector((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load collector report'); }
    finally { setLoad('collector', false); }
  };

  useEffect(() => { if (tab === 'classes')   loadClasses();  }, [tab, month]);
  useEffect(() => { if (tab === 'heatmap')   loadHeatmap();  }, [tab, month]);
  useEffect(() => { if (tab === 'forecast')  loadForecast(); }, [tab]);
  useEffect(() => { if (tab === 'collector') loadCollector();}, [tab, collectorDate]);

  const handleRollover = async () => {
    if (!fromYear || !toYear) return toast.error('Enter both years');
    if (!window.confirm(`Roll over fee structures from ${fromYear} → ${toYear}${incPct > 0 ? ` with ${incPct}% increase` : ''}?`)) return;
    setRolling(true);
    try {
      const r = await rolloverFeeStructures({ from_year: fromYear, to_year: toYear, increment_pct: incPct });
      const d = r.data?.data ?? r.data;
      toast.success(d?.message || 'Rollover complete');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rollover failed');
    } finally { setRolling(false); }
  };

  // ── Overview KPI Cards ────────────────────────────────────────────────────
  const last3 = trend.slice(-3);
  const totalCollected = last3.reduce((s, r) => s + parseFloat(r.collected || 0), 0);
  const totalInvoiced  = last3.reduce((s, r) => s + parseFloat(r.invoiced  || 0), 0);
  const avgRate        = totalInvoiced > 0 ? (totalCollected / totalInvoiced * 100).toFixed(1) : '0.0';

  return (
    <Layout>
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════ OVERVIEW ════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Collected (Last 3 Mo)', value: PKR(totalCollected), sub: `of ${PKR(totalInvoiced)} invoiced`, icon: TrendingUp, color: 'green' },
              { label: 'Avg Collection Rate',   value: `${avgRate}%`,      sub: 'last 3 months',                 icon: Target,     color: 'indigo' },
              { label: 'Avg Days to Pay',        value: rates?.avg_days_to_pay != null ? `${rates.avg_days_to_pay}d` : '—', sub: 'after due date', icon: Calendar, color: 'amber' },
              { label: 'Top Method (30d)',       value: rates?.payment_methods_30d?.[0]?.payment_method || '—', sub: PKR(rates?.payment_methods_30d?.[0]?.total), icon: Zap, color: 'sky' },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                  <div className={`p-1.5 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}>
                    <Icon size={13} className={`text-${color}-500`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Revenue trend chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Revenue Trend — Last 12 Months
            </h3>
            {loading.trend ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="invoiced"  name="Invoiced"   fill="#e0e7ff" radius={[4,4,0,0]} />
                  <Bar dataKey="collected" name="Collected"  fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment methods breakdown */}
          {rates?.payment_methods_30d?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Payment Methods — Last 30 Days</h3>
              <div className="space-y-3">
                {rates.payment_methods_30d.map(m => {
                  const total = rates.payment_methods_30d.reduce((s, r) => s + parseFloat(r.total), 0);
                  const pctVal = total > 0 ? (parseFloat(m.total) / total * 100) : 0;
                  return (
                    <div key={m.payment_method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-medium text-slate-600 dark:text-slate-300">{m.payment_method}</span>
                        <span className="text-slate-500">{PKR(m.total)} ({pctVal.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pctVal}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ CLASS COMPARISON ════════ */}
      {tab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            <button onClick={loadClasses}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <RefreshCw size={14} /> Reload
            </button>
          </div>

          {loading.classes ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No data for {month}</div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classes} margin={{ top: 15, right: 20, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700" />
                    <XAxis dataKey="class_name" angle={-35} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="total_billed"    name="Billed"    fill="#e0e7ff" radius={[3,3,0,0]} />
                    <Bar dataKey="total_collected" name="Collected" fill="#6366f1" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {['Class','Students','Billed','Collected','Pending','Rate %','Target','vs Target'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {classes.map(c => {
                      const vsTarget = c.target_amount
                        ? ((parseFloat(c.total_collected) / parseFloat(c.target_amount)) * 100).toFixed(0)
                        : null;
                      return (
                        <tr key={c.class_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{c.class_name}</td>
                          <td className="px-4 py-3 text-slate-500">{c.student_count}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{PKR(c.total_billed)}</td>
                          <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{PKR(c.total_collected)}</td>
                          <td className="px-4 py-3 text-red-500">{PKR(c.total_pending)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full min-w-[60px]">
                                <div className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${Math.min(parseFloat(c.collection_pct || 0), 100)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{c.collection_pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{c.target_amount ? PKR(c.target_amount) : '—'}</td>
                          <td className="px-4 py-3 text-xs">
                            {vsTarget != null
                              ? <span className={`font-semibold ${vsTarget >= 100 ? 'text-green-600' : vsTarget >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                                  {vsTarget}%
                                </span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ DEFAULTER HEATMAP ════════ */}
      {tab === 'heatmap' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            <button onClick={loadHeatmap}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <RefreshCw size={14} /> Reload
            </button>
          </div>

          {loading.heatmap ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : heatmap.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No data for {month}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {heatmap.map(c => (
                <div key={c.class_id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{c.class_name}</p>
                      <p className="text-xs text-slate-400">{c.defaulters}/{c.total_invoices} defaulters</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full mt-1 ${heatColor(parseFloat(c.defaulter_pct || 0))}`} />
                  </div>
                  {/* Heatmap bar */}
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${heatColor(parseFloat(c.defaulter_pct || 0))}`}
                      style={{ width: `${Math.min(parseFloat(c.defaulter_pct || 0), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{pct(c.defaulter_pct)} defaulting</span>
                  </div>
                  <p className="text-xs text-red-500 mt-1">{PKR(c.outstanding_amount)} outstanding</p>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-medium">Risk:</span>
            {[['bg-green-400','< 20%'],['bg-yellow-400','20–40%'],['bg-orange-400','40–70%'],['bg-red-500','> 70%']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${c}`} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ════════ FORECAST ════════ */}
      {tab === 'forecast' && (
        <div className="space-y-6">
          {loading.forecast ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm text-indigo-700 dark:text-indigo-300">
                <BarChart2 size={16} className="shrink-0" />
                Based on your historical collection rate of <strong>{pct(forecast.avg_rate_pct)}</strong>, here is your projected revenue for the next 3 months.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(forecast.data || []).map((f, i) => (
                  <div key={f.month} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Month {i + 1} · {f.month}
                    </p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{PKR(f.projected_collected)}</p>
                    <p className="text-xs text-slate-400 mt-1">projected collected</p>
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Invoiced estimate</span>
                        <span className="text-slate-600 dark:text-slate-300">{PKR(f.projected_invoiced)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Collection rate</span>
                        <span className="font-medium text-indigo-500">{pct(f.collection_rate_pct)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Projected vs Historical</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={[
                      ...trend.slice(-6).map(t => ({ month: t.month, collected: parseFloat(t.collected), type: 'actual' })),
                      ...(forecast.data || []).map(f => ({ month: f.month, forecast: parseFloat(f.projected_collected), type: 'forecast' })),
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="collected" name="Actual"   stroke="#6366f1" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="forecast"  name="Forecast" stroke="#10b981" strokeWidth={2} dot strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ COLLECTOR REPORT ════════ */}
      {tab === 'collector' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" value={collectorDate} onChange={e => setCollectorDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            <button onClick={loadCollector}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              <RefreshCw size={14} /> Load
            </button>
          </div>

          {loading.collector ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : collector.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No collections on {collectorDate}</div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                  Collections on {collectorDate}
                  <span className="ml-2 text-sm text-slate-400 font-normal">
                    Total: {PKR(collector.reduce((s, r) => s + parseFloat(r.total_collected), 0))}
                  </span>
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    {['Collector','Payments','Total','Cash','Bank','Online'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {collector.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{r.collector_name}</td>
                      <td className="px-4 py-3 text-slate-500">{r.payment_count}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{PKR(r.total_collected)}</td>
                      <td className="px-4 py-3 text-slate-500">{r.cash_count > 0 ? `${PKR(r.cash_amount)} (${r.cash_count})` : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{r.bank_count > 0 ? `${PKR(r.bank_amount)} (${r.bank_count})` : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{r.online_count > 0 ? `${PKR(r.online_amount)} (${r.online_count})` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════ ANNUAL ROLLOVER ════════ */}
      {tab === 'rollover' && (
        <div className="max-w-lg space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            This copies all active fee structures from one academic year to another. Target year must have no existing structures.
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Roll Over Fee Structures</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From Year</label>
                <input value={fromYear} onChange={e => setFromYear(e.target.value)} placeholder="e.g. 2024-25"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To Year</label>
                <input value={toYear} onChange={e => setToYear(e.target.value)} placeholder="e.g. 2025-26"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Fee Increase % <span className="text-slate-400">(0 = copy as-is)</span>
              </label>
              <input type="number" min="0" max="100" value={incPct} onChange={e => setIncPct(e.target.value)}
                className="w-32 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            </div>

            <button onClick={handleRollover} disabled={rolling}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {rolling
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Rolling over…</>
                : <><RefreshCw size={15} /> Execute Rollover <ArrowRight size={14} /></>
              }
            </button>

            <p className="text-xs text-slate-400">
              Example: {fromYear} → {toYear} with {incPct}% increase<br />
              A structure of PKR 5,000 becomes PKR {(5000 * (1 + parseFloat(incPct || 0) / 100)).toLocaleString()}.
            </p>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
