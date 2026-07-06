export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800 rounded-lg" />
      ))}
    </div>
  );
}
