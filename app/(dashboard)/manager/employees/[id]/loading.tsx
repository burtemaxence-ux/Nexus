import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-5 px-4 py-6 md:px-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      {/* Info card */}
      <div className="rounded-xl p-5 space-y-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: '0.5px solid var(--border)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      {/* Contracts */}
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="px-5 py-3.5" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
