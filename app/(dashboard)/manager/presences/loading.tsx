import { Skeleton } from '@/components/ui/skeleton'

export default function PresencesLoading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        {/* Header */}
        <div
          className="grid px-4 py-2.5 gap-4"
          style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid px-4 py-3 items-center gap-4"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
              borderBottom: i < 7 ? '0.5px solid var(--border)' : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
