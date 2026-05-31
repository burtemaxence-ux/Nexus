import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6">
      <Skeleton className="h-6 w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 space-y-2" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-8 w-full rounded-lg mt-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
