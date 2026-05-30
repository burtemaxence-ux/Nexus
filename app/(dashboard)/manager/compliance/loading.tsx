import { Skeleton } from '@/components/ui/skeleton'

export default function ComplianceLoading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Cards list */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-72" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-28 rounded-lg flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
