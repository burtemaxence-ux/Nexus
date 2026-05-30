import { Skeleton } from '@/components/ui/skeleton'

export default function RapportLoading() {
  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)] sticky top-14 md:top-11 z-10">
        <div className="px-4 md:px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap min-h-[56px] py-2">
            {/* Title */}
            <Skeleton className="h-6 w-20 shrink-0" />
            {/* Report type tabs */}
            <Skeleton className="h-8 w-44 rounded-lg" />
            {/* Mode tabs */}
            <Skeleton className="h-8 w-40 rounded-lg" />
            {/* Period navigation */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            {/* Filters */}
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-8 w-36 rounded-lg" />
              <Skeleton className="h-8 w-40 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-6xl mx-auto space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          {/* Table header */}
          <div className="flex gap-6 px-4 py-3" style={{ backgroundColor: 'var(--accent-light)', borderBottom: '0.5px solid var(--border)' }}>
            {[72, 56, 64, 64, 64, 56, 40, 40].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
              <div className="space-y-1" style={{ width: 72 }}>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3.5" style={{ width: 56 }} />
              <Skeleton className="h-3.5" style={{ width: 64 }} />
              <Skeleton className="h-3.5" style={{ width: 64 }} />
              <Skeleton className="h-3.5" style={{ width: 64 }} />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-3.5 w-10" />
              <Skeleton className="h-3.5 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
