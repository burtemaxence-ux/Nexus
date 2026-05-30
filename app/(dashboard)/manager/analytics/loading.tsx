import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-5 px-4 py-6 md:px-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="p-5">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-5">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-5">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="p-5">
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
