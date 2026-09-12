import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Standardized modal header with title, optional subtitle, and close button.
 *
 * @param {string}           title
 * @param {string}           [subtitle]
 * @param {Function}         [onClose]
 * @param {boolean}          [sticky=false]  adds sticky top-0 positioning
 * @param {string}           [className]
 */
export function ModalHeader({ title, subtitle, onClose, sticky = false, className = '' }) {
  return (
    <div className={[
      'flex items-center justify-between px-6 py-4',
      'border-b border-slate-100 dark:border-slate-800',
      sticky ? 'sticky top-0 bg-white dark:bg-slate-900 z-10' : '',
      className,
    ].join(' ')}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 shrink-0 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}


/**
 * Generic modal with backdrop, close button, and escape key support.
 *
 * @param {boolean}          isOpen
 * @param {Function}         onClose
 * @param {string}           title
 * @param {React.ReactNode}  children
 * @param {'sm'|'md'|'lg'|'xl'} size
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxW = {
    sm:  'max-w-sm',
    md:  'max-w-lg',
    lg:  'max-w-2xl',
    xl:  'max-w-4xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={[
          'relative w-full bg-white dark:bg-slate-900',
          'border border-slate-200 dark:border-slate-800',
          'rounded-3xl shadow-2xl overflow-hidden',
          'animate-scale-in',
          maxW,
        ].join(' ')}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div>{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirm / Delete dialog.
 */
export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmLabel = 'Delete', danger = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-center animate-scale-in">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: danger ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}
        >
          <span className="text-2xl">{danger ? '⚠️' : 'ℹ️'}</span>
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-white">
          {title || 'Are you sure?'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
          {message || 'This action cannot be undone.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl text-white font-semibold shadow-lg transition hover:opacity-90"
            style={{
              background: danger
                ? 'linear-gradient(135deg, #ef4444, #f97316)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: danger ? '0 4px 20px -4px rgba(239,68,68,0.4)' : '0 4px 20px -4px rgba(99,102,241,0.4)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
