import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-28 rounded-xl flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
