import { Skeleton } from '@/components/ui/skeleton'

export default function PlanningLoading() {
  return (
    <div className="space-y-4 px-6 py-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      {/* View toggle + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Planning grid */}
      <div className="rounded-xl overflow-x-auto" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}>
              <th className="w-44 px-4 py-3 text-left">
                <Skeleton className="h-3 w-20" />
              </th>
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Skeleton className="h-3 w-6" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 w-20">
                <Skeleton className="h-3 w-10 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td className="px-4 py-3" style={{ borderRight: '0.5px solid var(--border)' }}>
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </td>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-2 py-2" style={{ borderRight: '0.5px solid var(--border)' }}>
                    {(i * 7 + j) % 3 !== 0 && (
                      <Skeleton className="h-14 w-full rounded-md" />
                    )}
                  </td>
                ))}
                <td className="px-3 py-3 text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
