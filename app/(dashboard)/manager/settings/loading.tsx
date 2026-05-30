import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="flex flex-col md:flex-row" style={{ minHeight: 'calc(100vh - 44px)' }}>
      {/* Sidebar skeleton */}
      <aside
        className="shrink-0 md:w-56 border-b md:border-b-0 md:border-r"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}
      >
        <div className="p-4 space-y-1">
          <Skeleton className="h-3 w-24 mb-3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
              <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
              <Skeleton className="h-4" style={{ width: [96, 88, 80, 104, 72, 88, 96, 80][i] }} />
            </div>
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <main className="flex-1 px-6 py-6 space-y-6" style={{ backgroundColor: 'var(--bg-page)' }}>
        {/* Section title */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Form fields */}
        <div className="rounded-xl p-6 space-y-5" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="pt-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Second card */}
        <div className="rounded-xl p-6 space-y-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '0.5px solid var(--border)' }}>
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
