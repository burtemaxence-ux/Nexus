import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-5 px-4 py-6 md:px-6 max-w-2xl">
      <Skeleton className="h-6 w-44" />
      <div className="rounded-xl p-5 space-y-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
