'use client'

import dynamic from 'next/dynamic'
import type { Profile, Shift, Poste, LeaveRequest } from '@/types'
import type { ComplianceConfig } from '@/lib/compliance/rules'

function PlanningSkeletonLoader() {
  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ minHeight: '580px' }}>
      {/* Header row */}
      <div className="flex gap-2 mb-3">
        <div className="h-8 w-32 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="h-8 w-8 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="h-8 w-8 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="ml-auto h-8 w-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
      </div>
      {/* Grid */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
          <div className="h-10 border-r" style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }} />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 flex items-center justify-center border-r last:border-r-0"
              style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
              <div className="h-4 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
          ))}
        </div>
        {/* Employee rows */}
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="grid grid-cols-8 border-b last:border-b-0"
            style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
            <div className="h-14 flex items-center px-3 border-r" style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
              <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            </div>
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="h-14 p-1.5 border-r last:border-r-0"
                style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
                {(row + col) % 3 === 0 && (
                  <div className="h-full rounded-md animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const PlanningWeekTimeline = dynamic(
  () => import('@/components/planning/planning-week-timeline').then(m => m.PlanningWeekTimeline),
  { ssr: false, loading: () => <PlanningSkeletonLoader /> }
)

interface Props {
  weekDates: Date[]
  employees: Profile[]
  shifts: Shift[]
  leaveRequests: LeaveRequest[]
  weekLocked: boolean
  weekPublished: boolean
  postes: Poste[]
  hourlyRateMap: Record<string, number>
  complianceConfig: ComplianceConfig
}

export function PlanningClientWrapper(props: Props) {
  return <PlanningWeekTimeline {...props} />
}
