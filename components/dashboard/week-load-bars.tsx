'use client'

export interface DayLoad {
  day: string
  hours: number
  isToday: boolean
}

/**
 * Charge de la semaine — 7-day planned-hours bars (Lun→Dim) with an average
 * line and the busiest day highlighted. Pure CSS/SVG, faithful to the design
 * handoff. All heights/values come from real planned-hours data.
 */
export function WeekLoadBars({ data }: { data: DayLoad[] }) {
  const total = data.reduce((s, d) => s + d.hours, 0)

  if (total === 0) {
    return (
      <p className="text-[13px] text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
        Aucun shift planifié cette semaine.
      </p>
    )
  }

  const maxHours = Math.max(...data.map(d => d.hours))
  const peak = Math.max(maxHours, 1)
  // Nice rounded top of the scale (multiple of 10, at least 10h).
  const niceMax = Math.max(10, Math.ceil(peak / 10) * 10)
  const avg = Math.round(total / data.length)
  const avgPct = (avg / niceMax) * 100

  const yLabels = [niceMax, Math.round(niceMax * 0.75), Math.round(niceMax * 0.5), Math.round(niceMax * 0.25), 0]

  return (
    <div>
      <div className="flex gap-3">
        {/* Y axis */}
        <div
          className="flex flex-col justify-between text-right"
          style={{ height: '190px', fontSize: '10px', color: 'var(--text-tertiary)', minWidth: '22px', fontVariantNumeric: 'tabular-nums' }}
        >
          {yLabels.map((v, i) => <span key={i}>{v}h</span>)}
        </div>

        {/* Plot area */}
        <div className="flex-1 relative" style={{ height: '190px' }}>
          {[0, 25, 75].map(top => (
            <div key={top} className="absolute left-0 right-0" style={{ top: `${top}%`, borderTop: '1px solid var(--border)' }} />
          ))}
          <div className="absolute left-0 right-0 bottom-0" style={{ borderTop: '1px solid var(--border-hover)' }} />

          {/* Average line */}
          <div className="absolute left-0 right-0" style={{ bottom: `${avgPct}%`, borderTop: '1px dashed rgba(108,99,255,0.5)' }}>
            <span
              className="absolute"
              style={{ right: 0, top: '-8px', fontSize: '9.5px', fontWeight: 600, color: 'var(--accent)', background: 'var(--bg-card)', padding: '0 5px' }}
            >
              moy. {avg}h
            </span>
          </div>

          {/* Bars */}
          <div className="absolute inset-0 grid items-end" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: '16px' }}>
            {data.map((d, i) => {
              const isPeak = d.hours === maxHours && d.hours > 0
              const heightPct = d.hours > 0 ? Math.max(4, (d.hours / niceMax) * 100) : 2
              return (
                <div key={i} className="nx-bar-col relative h-full flex flex-col justify-end items-center cursor-default">
                  <span
                    className="nx-bar-val"
                    style={{ fontSize: '11px', fontWeight: isPeak ? 700 : 600, color: isPeak ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: '6px', fontVariantNumeric: 'tabular-nums', transition: 'color .2s ease' }}
                  >
                    {d.hours}
                  </span>
                  <div
                    className="nx-bar bar-grow-up w-full"
                    style={{
                      maxWidth: '34px',
                      height: `${heightPct}%`,
                      borderRadius: '7px 7px 4px 4px',
                      background: isPeak
                        ? 'linear-gradient(180deg,#7d75ff,#5B52E8)'
                        : 'linear-gradient(180deg, rgba(108,99,255,0.42), rgba(108,99,255,0.14))',
                      boxShadow: isPeak ? '0 8px 20px -4px rgba(108,99,255,0.5)' : 'none',
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Day labels */}
      <div className="flex" style={{ gap: '16px', marginTop: '9px', paddingLeft: '34px' }}>
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center"
            style={{ fontSize: '11.5px', color: d.isToday ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: d.isToday ? 600 : 400 }}
          >
            {d.day}
          </span>
        ))}
      </div>
    </div>
  )
}
