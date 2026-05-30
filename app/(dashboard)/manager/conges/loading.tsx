import { Skeleton } from '@/components/ui/skeleton'

export default function CongesLoading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* 3 onglets */}
      <div className="flex gap-1 rounded-lg overflow-hidden" style={{ border: '0.5px solid var(--border)', width: 'fit-content' }}>
        {['En attente', 'Approuvés', 'Refusés'].map((_, i) => (
          <Skeleton key={i} className="h-8 w-28" style={{ borderRadius: 0 }} />
        ))}
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-36 rounded-xl" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        {/* Header */}
        <div
          className="grid px-4 py-2.5 gap-4"
          style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto', backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="grid px-4 py-3.5 items-center gap-4"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
              borderBottom: i < 6 ? '0.5px solid var(--border)' : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-16" />
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
