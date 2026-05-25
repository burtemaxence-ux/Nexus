import { Skeleton } from '@/components/ui/skeleton'

export default function EmployeesLoading() {
  return (
    <div className="space-y-4 px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Employee rows */}
      <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        {/* Table header */}
        <div
          className="grid px-4 py-2.5"
          style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto', backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}
        >
          {['Employé', 'Contrat', 'Heures / sem.', 'Statut', ''].map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid px-4 py-3 items-center"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
              borderBottom: i < 7 ? '0.5px solid var(--border)' : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
