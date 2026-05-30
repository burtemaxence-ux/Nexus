import { Skeleton } from '@/components/ui/skeleton'

export default function HelpLoading() {
  return (
    <div className="px-6 py-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        {/* Search input */}
        <div className="mt-4">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Section accordions */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-start gap-4 px-5 py-4">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-4 w-4 rounded flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 px-5 py-4 rounded-xl flex items-center gap-3" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </div>
  )
}
