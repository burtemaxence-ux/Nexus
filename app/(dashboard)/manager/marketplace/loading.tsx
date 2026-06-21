import { Skeleton } from '@/components/ui/skeleton'

export default function MarketplaceLoading() {
  return (
    <div className="px-4 md:px-6 py-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl flex-shrink-0" />
      </div>

      {/* Tabs */}
      <div className="flex mb-5 overflow-hidden rounded-lg" style={{ border: '0.5px solid var(--border)', width: 'fit-content' }}>
        <Skeleton className="h-9 w-28 rounded-none" />
        <Skeleton className="h-9 w-28 rounded-none" style={{ borderLeft: '0.5px solid var(--border)' }} />
      </div>

      {/* Slot cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>

            {/* Candidates */}
            <div className="px-5 py-4 space-y-2">
              <Skeleton className="h-3 w-24 mb-3" />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-xl flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
