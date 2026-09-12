/**
 * Surface card with consistent border, shadow, and dark mode.
 */
export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={[
        'bg-white dark:bg-slate-900',
        'border border-slate-200/80 dark:border-slate-800',
        'rounded-2xl shadow-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Stat card with gradient accent bar, icon, and optional progress.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  gradientFrom,
  gradientTo,
  iconBg,
  textColor,
  sub,
  pct,
}) {
  const gradient = { background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})` };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 cursor-default group">
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={gradient} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
              {label}
            </p>
            <p className={`text-3xl font-extrabold mt-2 leading-none tracking-tight ${textColor}`}>
              {value}
            </p>
            {sub && (
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-2 font-medium">{sub}</p>
            )}
          </div>

          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon size={20} className={textColor} />
          </div>
        </div>

        {pct !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
                of total
              </span>
              <span className={`text-[10px] font-bold ${textColor}`}>{pct}%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ ...gradient, width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
