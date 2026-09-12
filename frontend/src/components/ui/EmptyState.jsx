import Button from './Button';

/**
 * @param {React.ElementType} icon
 * @param {string}            title
 * @param {string}            description
 * @param {string}            actionLabel       — primary CTA
 * @param {Function}          onAction
 * @param {string}            secondaryLabel    — optional secondary CTA
 * @param {Function}          onSecondary
 * @param {string}            size              — 'sm' | 'md' (default 'md')
 */
export default function EmptyState({
  icon: Icon, title, description,
  actionLabel, onAction,
  secondaryLabel, onSecondary,
  size = 'md',
}) {
  const py    = size === 'sm' ? 'py-12' : 'py-20';
  const iconW = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';
  const iconS = size === 'sm' ? 20 : 28;

  return (
    <div className={`flex flex-col items-center justify-center ${py} gap-4 px-6 text-center`}>
      {Icon && (
        <div className={`${iconW} rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}>
          <Icon size={iconS} className="text-slate-400 dark:text-slate-600" strokeWidth={1.5} />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{title}</p>
        {description && (
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 max-w-xs">{description}</p>
        )}
      </div>
      {(actionLabel || secondaryLabel) && (
        <div className="flex items-center gap-2">
          {secondaryLabel && onSecondary && (
            <Button onClick={onSecondary} size="sm" variant="secondary">
              {secondaryLabel}
            </Button>
          )}
          {actionLabel && onAction && (
            <Button onClick={onAction} size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
