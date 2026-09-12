/**
 * TabBar — shared pill-style tab switcher.
 *
 * Usage:
 *   <TabBar
 *     tabs={[
 *       { id: 'list',  label: 'List',    icon: List },   // icon is optional
 *       { id: 'chart', label: 'Reports' },
 *     ]}
 *     active={tab}
 *     onChange={setTab}
 *   />
 *
 * @param {{ id: string, label: string, icon?: React.ElementType }[]} tabs
 * @param {string}   active    - currently active tab id
 * @param {Function} onChange  - called with the new tab id
 * @param {string}   [className] - extra wrapper classes
 */
export default function TabBar({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap ${className}`}>
      {tabs.map(t => {
        const Icon = t.icon;
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              on
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {Icon && <Icon size={14} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
