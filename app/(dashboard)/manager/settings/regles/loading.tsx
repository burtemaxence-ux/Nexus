import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      <Skeleton className="h-6 w-36" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
