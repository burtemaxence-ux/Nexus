import { Skeleton } from '@/components/ui/skeleton'

export default function EmployeePlanningLoading() {
  return (
    <div className="space-y-4 px-4 py-6">
      {/* Week nav */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      {/* Planning table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        {/* Header */}
        <div className="flex" style={{ backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}>
          <div className="w-44 px-4 py-3">
            <Skeleton className="h-3 w-16" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 px-3 py-3 flex flex-col items-center gap-1">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
          <div className="w-20 px-3 py-3">
            <Skeleton className="h-3 w-10 mx-auto" />
          </div>
        </div>
        {/* Single employee row */}
        <div className="flex" style={{ minHeight: '100px' }}>
          <div className="w-44 px-4 py-3" style={{ borderRight: '0.5px solid var(--border)' }}>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 px-2 py-2" style={{ borderRight: '0.5px solid var(--border)' }}>
              {i % 2 === 0 && <Skeleton className="h-16 w-full rounded-md" />}
            </div>
          ))}
          <div className="w-20 px-3 py-3 flex items-center justify-center">
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      </div>
    </div>
  )
}
