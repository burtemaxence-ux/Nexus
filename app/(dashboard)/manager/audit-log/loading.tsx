import { Skeleton } from '@/components/ui/skeleton'

export default function AuditLogLoading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      {/* Log entries */}
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 px-4 py-3.5"
            style={{ borderBottom: i < 9 ? '0.5px solid var(--border)' : undefined }}
          >
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-3.5 w-64" />
                <Skeleton className="h-3 w-28 flex-shrink-0" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  )
}
