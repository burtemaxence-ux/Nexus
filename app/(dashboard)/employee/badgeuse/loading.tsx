import { Skeleton } from '@/components/ui/skeleton'

export default function BadgeuseLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
      {/* Status indicator */}
      <Skeleton className="h-5 w-32 rounded-full" />

      {/* Main clock-in button */}
      <Skeleton className="h-40 w-40 rounded-full" />

      {/* Time display */}
      <Skeleton className="h-8 w-28" />

      {/* Status message */}
      <Skeleton className="h-4 w-48" />

      {/* Recent history */}
      <div className="w-full max-w-sm space-y-2 mt-4">
        <Skeleton className="h-4 w-32 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
