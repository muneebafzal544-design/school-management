import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Banknote, BarChart3, PieChart,
  Building2, ArrowUpRight, ArrowDownRight, Minus,
  ChevronDown, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import Layout from '../components/layout/Layout';
import Spinner from '../components/ui/Spinner';
import { getFinancialAnalytics } from '../api/analytics';

const PIE_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f97316','#f59e0b',
  '#10b981','#0ea5e9','#14b8a6','#ef4444','#a855f7',
];

const fmt = (n) => Number(n || 0).toLocaleString('en-PK');

function formatK(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: PKR {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function FinancialAnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const [year,     setYear]     = useState(currentYear);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFinancialAnalytics(year);
      setData(res.data?.data ?? res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const cardCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm';

  return (
    <Layout>
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-20"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <BarChart3 size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Financial Analytics</h1>
                <p className="text-xs text-slate-400 mt-0.5">P&L · Expenses · Fee Collection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Year selector */}
              <div className="relative">
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-semibold
                             bg-white/10 border border-white/20 text-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer">
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                    <option key={y} value={y} className="bg-slate-800">{y}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
              </div>
              <button onClick={load} disabled={loading}
                className="p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors disabled:opacity-50">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-10 space-y-6">

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data ? null : (
          <>
            {/* ── Summary KPIs ── */}
            <SummaryRow summary={data.summary} />

            {/* ── Monthly P&L chart ── */}
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <TrendingUp size={15} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Monthly P&L — {year}</h2>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthlyPL} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income"   name="Income"   fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Net profit line ── */}
            <div className={cardCls}>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Banknote size={15} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Net Profit Trend</h2>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.monthlyPL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => [`PKR ${fmt(v)}`, 'Net']} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12 }} />
                    <Line
                      type="monotone" dataKey="net" name="Net Profit"
                      stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Expense breakdown + Fee by class ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Expense pie */}
              <div className={cardCls}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <PieChart size={15} className="text-purple-500" />
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white">Expense Breakdown</h2>
                </div>
                {data.expenseByCategory.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No expense data for {year}.</p>
                ) : (
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <ResponsiveContainer width={180} height={180}>
                        <RePieChart>
                          <Pie
                            data={data.expenseByCategory}
                            dataKey="total"
                            nameKey="category"
                            cx="50%" cy="50%"
                            innerRadius={48}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {data.expenseByCategory.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={v => [`PKR ${fmt(v)}`]} contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2 w-full">
                        {data.expenseByCategory.map((cat, i) => (
                          <div key={cat.category} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{cat.category}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat.pct}%</span>
                            <span className="text-xs text-slate-400">PKR {fmt(cat.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fee by class table */}
              <div className={cardCls}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Building2 size={15} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white">Fee Collection by Class</h2>
                </div>
                {data.feeByClass.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No fee data for {year}.</p>
                ) : (
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                          {['Class', 'Billed', 'Collected', 'Rate'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {data.feeByClass.map(row => {
                          const rate = parseFloat(row.collection_rate) || 0;
                          const color = rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';
                          return (
                            <tr key={row.class_name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {row.class_name}
                                <span className="ml-1.5 text-[10px] text-slate-400">{row.grade}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">PKR {fmt(row.total_billed)}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">PKR {fmt(row.total_collected)}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: color }} />
                                  </div>
                                  <span className="text-xs font-bold tabular-nums" style={{ color }}>{rate.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function SummaryRow({ summary }) {
  if (!summary) return null;
  const { totalIncome, totalExpenses, netProfit, prevIncome, prevExpenses, prevNet, incomeGrowthPct } = summary;
  const growthDir = incomeGrowthPct > 0 ? 'up' : incomeGrowthPct < 0 ? 'down' : 'flat';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SummaryCard
        label="Total Income" value={`PKR ${fmt(totalIncome)}`}
        prev={`PKR ${fmt(prevIncome)}`}
        icon={TrendingUp} iconColor="#6366f1"
        growth={incomeGrowthPct} growthDir={growthDir}
      />
      <SummaryCard
        label="Total Expenses" value={`PKR ${fmt(totalExpenses)}`}
        prev={`PKR ${fmt(prevExpenses)}`}
        icon={TrendingDown} iconColor="#f97316"
      />
      <SummaryCard
        label="Net Profit" value={`PKR ${fmt(netProfit)}`}
        prev={`PKR ${fmt(prevNet)}`}
        icon={Banknote} iconColor={netProfit >= 0 ? '#10b981' : '#ef4444'}
        valueColor={netProfit >= 0 ? '#10b981' : '#ef4444'}
      />
    </div>
  );
}

function SummaryCard({ label, value, prev, icon: Icon, iconColor, valueColor, growth, growthDir }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 px-5 py-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${iconColor}18` }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-black" style={{ color: valueColor || '#1e293b' }}>{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">vs prev year: {prev}</p>
        {growth !== undefined && growth !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${growthDir === 'up' ? 'text-emerald-500' : growthDir === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
            {growthDir === 'up' ? <ArrowUpRight size={12} /> : growthDir === 'down' ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
    </div>
  );
}
