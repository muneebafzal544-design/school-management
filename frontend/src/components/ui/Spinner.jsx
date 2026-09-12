/**
 * @param {'sm'|'md'|'lg'} size
 * @param {string} className
 */
export default function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];

  return (
    <div className={`relative ${sz} ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-900/40" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400 dark:text-slate-600 font-medium animate-pulse">
        Loading…
      </p>
    </div>
  );
}

/**
 * Single skeleton block — pulsing grey rectangle.
 * @param {string} className  Tailwind classes for width/height/shape
 */
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`} />
  );
}

/** 4 KPI stat cards */
export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-2.5 w-20 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-2 w-28 rounded-full" />
            </div>
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Dashboard hero banner skeleton */
export function DashboardHeroSkeleton() {
  return (
    <div className="relative overflow-hidden px-6 sm:px-8 pt-10 pb-24 rounded-none"
      style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 35%,#4f46e5 70%,#7c3aed 100%)' }}>
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-full bg-white/20" />
          <Skeleton className="h-9 w-56 rounded-lg bg-white/20" />
          <Skeleton className="h-2.5 w-40 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-20 rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Recent list skeleton (6 rows) */
export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-36 rounded-full" />
            <Skeleton className="h-2.5 w-24 rounded-full" />
          </div>
          <div className="space-y-1.5 items-end flex flex-col">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-2 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table body skeleton (configurable rows × cols) */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-8 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
