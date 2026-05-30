import { Skeleton } from '@/components/ui/skeleton'

export default function EchangesLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Tabs */}
      <div className="flex mb-6 overflow-hidden rounded-lg" style={{ border: '0.5px solid var(--border)', width: 'fit-content' }}>
        <Skeleton className="h-9 w-24 rounded-none" />
        <Skeleton className="h-9 w-28 rounded-none" style={{ borderLeft: '0.5px solid var(--border)' }} />
      </div>

      {/* Section label */}
      <div className="mb-3">
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Exchange cards */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 flex items-start justify-between gap-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
