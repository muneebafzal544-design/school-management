/**
 * PageHeader — standard page title block used on every module page.
 *
 * Usage:
 *   <PageHeader
 *     icon={Users}
 *     title="Students"
 *     subtitle="All enrolled students"
 *     actions={<Button>+ Add</Button>}
 *   />
 *
 * @param {React.ElementType} icon      - Lucide icon component
 * @param {string}            title
 * @param {string}            [subtitle]
 * @param {React.ReactNode}   [actions] - right-side buttons / controls
 * @param {string}            [iconColor]  - Tailwind text color class  (default: indigo)
 * @param {string}            [iconBg]     - Tailwind bg class           (default: indigo)
 * @param {string}            [className]  - extra wrapper classes
 */
export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  iconColor = 'text-indigo-600 dark:text-indigo-400',
  iconBg    = 'bg-indigo-100 dark:bg-indigo-500/10',
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap ${className}`}>
      {/* Left — icon + title */}
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon size={20} className={iconColor} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right — action buttons */}
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
