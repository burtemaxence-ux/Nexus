import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-3 px-4 py-6 md:px-6 max-w-2xl mx-auto">
      <Skeleton className="h-7 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 flex items-start gap-3" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-sm" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
