import { Skeleton } from '@/components/ui/skeleton'

export default function EmployeeHomeLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Greeting */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Today's shift card */}
      <div className="rounded-xl p-5 space-y-3" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-2"
            style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
