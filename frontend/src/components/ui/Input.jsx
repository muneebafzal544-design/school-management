/**
 * Shared raw className strings for pages that render plain <input> / <select>
 * elements directly (without the Input / Select wrapper components).
 *
 * Usage:
 *   import { INPUT_CLS, SELECT_CLS } from '../components/ui/Input';
 *   <input className={INPUT_CLS} ... />
 *   <select className={SELECT_CLS} ... />
 */
export const INPUT_CLS =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 ' +
  'bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 ' +
  'placeholder-slate-400 dark:placeholder-slate-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ' +
  'focus:border-indigo-400 dark:focus:border-indigo-500 transition-all';

export const SELECT_CLS =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 ' +
  'bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ' +
  'focus:border-indigo-400 dark:focus:border-indigo-500 appearance-none transition-all';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reusable input field with optional label, icon, and error message.
 *
 * @param {string}           label
 * @param {React.ReactNode}  icon       - Leading icon component
 * @param {string}           error
 * @param {string}           className
 * @param {boolean}          required
 */
export default function Input({
  label,
  icon: Icon,
  error,
  className = '',
  required,
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
            <Icon size={14} />
          </span>
        )}
        <input
          id={inputId}
          className={[
            'w-full py-2.5 text-sm rounded-xl',
            'border transition-all duration-150',
            'bg-white dark:bg-slate-800/60',
            'text-slate-800 dark:text-slate-200',
            'placeholder-slate-400 dark:placeholder-slate-600',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500/30 pr-4'
              : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500',
            Icon ? 'pl-9 pr-4' : 'px-4',
          ].join(' ')}
          {...props}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}

/**
 * Reusable select/dropdown.
 */
export function Select({ label, error, className = '', required, id, children, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={[
          'w-full px-4 py-2.5 text-sm rounded-xl appearance-none cursor-pointer',
          'border transition-all duration-150',
          'bg-white dark:bg-slate-800/60',
          'text-slate-800 dark:text-slate-200',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-red-300 dark:border-red-700 focus:ring-red-500/30'
            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500',
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}

/**
 * Reusable textarea.
 */
export function Textarea({ label, error, className = '', required, id, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={[
          'w-full px-4 py-2.5 text-sm rounded-xl resize-none',
          'border transition-all duration-150',
          'bg-white dark:bg-slate-800/60',
          'text-slate-800 dark:text-slate-200',
          'placeholder-slate-400 dark:placeholder-slate-600',
          'focus:outline-none focus:ring-2',
          error
            ? 'border-red-300 dark:border-red-700 focus:ring-red-500/30'
            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500',
        ].join(' ')}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}
