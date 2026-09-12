import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * StatCard — standard KPI/summary card used across module pages.
 *
 * Usage:
 *   <StatCard
 *     icon={Wallet}
 *     color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
 *     label="Total Income"
 *     value="PKR 1,200,000"
 *     sub="This month"
 *     trend
 *     trendVal={12}
 *   />
 *
 * @param {React.ElementType} icon
 * @param {string}  color     - Tailwind classes for icon container bg + icon text color
 * @param {string}  label
 * @param {string|number} value
 * @param {string}  [sub]     - secondary line below value
 * @param {boolean} [trend]   - show trend arrow + percentage
 * @param {number}  [trendVal]- positive = up, negative = down
 * @param {string}  [className] - extra wrapper classes
 */
export default function StatCard({ icon: Icon, color, label, value, sub, trend, trendVal, className = '' }) {
  const positive = Number(trendVal) > 0;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4 ${className}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white truncate">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        {trend && trendVal !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trendVal)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}
