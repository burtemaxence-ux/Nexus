import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-5 px-4 py-6 md:px-6 max-w-lg mx-auto">
      <Skeleton className="h-7 w-48" />
      <div className="rounded-xl p-5 space-y-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}
