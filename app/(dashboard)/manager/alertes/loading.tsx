import { Skeleton } from '@/components/ui/skeleton'

export default function AlertesLoading() {
  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)] sticky top-14 md:top-11 z-10">
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 h-14">
            <Skeleton className="h-6 w-20" />
            <div className="ml-auto">
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 -mb-px">
            <Skeleton className="h-9 w-32 rounded-none" />
            <Skeleton className="h-9 w-28 rounded-none ml-1" />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-5xl mx-auto space-y-4">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Table card */}
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          {/* Table header */}
          <div className="px-4 py-2.5 flex gap-8" style={{ backgroundColor: 'var(--accent-light)', borderBottom: '0.5px solid var(--border)' }}>
            {[80, 60, 160, 60].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 px-4 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-14" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>

        {/* Section header 2 */}
        <div className="flex items-center gap-2 mt-6">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Cards list */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Skeleton className="h-9 w-32 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
