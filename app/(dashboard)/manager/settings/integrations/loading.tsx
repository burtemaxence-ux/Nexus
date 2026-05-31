import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      <Skeleton className="h-6 w-36" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 flex items-center gap-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-9 w-24 rounded-xl flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
