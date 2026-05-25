import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Planning table skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          {/* Header row */}
          <div className="flex" style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
            <div className="w-44 px-4 py-3">
              <Skeleton className="h-3 w-20" />
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 px-3 py-3 flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
          {/* Employee rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex" style={{ borderBottom: '0.5px solid var(--border)' }}>
              <div className="w-44 px-4 py-3 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="flex-1 px-2 py-2">
                  {(i + j) % 3 !== 0 && (
                    <Skeleton className="h-10 w-full rounded-md" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-2"
            style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  )
}
