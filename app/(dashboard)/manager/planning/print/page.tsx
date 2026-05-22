import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWeekDates, getWeekLabel, toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste } from '@/types'
import { PrintTrigger } from './print-trigger'

interface PrintPageProps {
  searchParams: Promise<{ week?: string }>
}

function formatTime(t: string) { return t.slice(0, 5) }

function calcHours(start: string, end: string, breakMin: number): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  mins = Math.max(0, mins - breakMin)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export default async function PrintPage({ searchParams }: PrintPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const weekParam = params.week
  const referenceDate = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
    ? new Date(weekParam + 'T00:00:00')
    : new Date()

  const weekDates = getWeekDates(referenceDate)
  const monday = toISODate(weekDates[0])
  const sunday = toISODate(weekDates[6])
  const weekLabel = getWeekLabel(weekDates)

  const [{ data: employeesData }, { data: shiftsData }, { data: postesData }] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name, role, position, contract_type, weekly_hours, created_at').eq('role', 'employee').order('full_name'),
    supabase.from('shifts').select('*').gte('date', monday).lte('date', sunday),
    supabase.from('postes').select('*').order('name'),
  ])

  const employees: Profile[] = (employeesData ?? []) as Profile[]
  const shifts: Shift[] = (shiftsData ?? []) as Shift[]
  const postes: Poste[] = (postesData ?? []) as Poste[]

  const posteMap = new Map(postes.map(p => [p.id, p]))

  const shiftMap = new Map<string, Shift>()
  for (const s of shifts) shiftMap.set(`${s.employee_id}__${s.date}`, s)

  const dayLabels = weekDates.map(d => ({
    weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
    day: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    iso: toISODate(d),
  }))

  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Planning {weekLabel}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; background: white; }
          .page { padding: 20px 24px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #111; }
          .header h1 { font-size: 18px; font-weight: 700; }
          .header p { font-size: 12px; color: #555; margin-top: 2px; }
          .header .week-label { font-size: 13px; font-weight: 600; color: #333; text-align: right; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-align: center; padding: 6px 4px; border: 1px solid #ddd; text-transform: uppercase; letter-spacing: 0.03em; }
          th.employee-col { text-align: left; padding-left: 8px; min-width: 120px; }
          td { border: 1px solid #ddd; padding: 4px; vertical-align: top; min-height: 40px; min-width: 72px; }
          td.employee-cell { padding: 6px 8px; background: #fafafa; min-width: 120px; }
          td.total-cell { text-align: center; font-weight: 700; vertical-align: middle; background: #fafafa; min-width: 44px; }
          .employee-name { font-weight: 600; font-size: 11px; }
          .employee-pos { font-size: 9px; color: #888; margin-top: 1px; }
          .shift { border-radius: 3px; padding: 3px 5px; margin: 1px 0; }
          .shift-time { font-weight: 700; font-size: 10px; }
          .shift-pos { font-size: 9px; color: #444; margin-top: 1px; }
          .shift-break { font-size: 8px; color: #888; }
          .empty { color: #ccc; text-align: center; font-size: 18px; padding-top: 6px; }
          .footer { margin-top: 14px; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }
          .print-btn { position: fixed; bottom: 24px; right: 24px; background: #111; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.25); z-index: 100; }
          @media print {
            .print-btn { display: none; }
            @page { size: A4 landscape; margin: 12mm 14mm; }
            body { font-size: 10px; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="header">
            <div>
              <h1>D-pot — Planning</h1>
              <p>Imprimé le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="week-label">{weekLabel}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th className="employee-col">Employé</th>
                {dayLabels.map(d => (
                  <th key={d.iso}>
                    <div style={{ textTransform: 'capitalize' }}>{d.weekday}</div>
                    <div style={{ fontWeight: 400, fontSize: 9, color: '#666' }}>{d.day}</div>
                  </th>
                ))}
                <th style={{ minWidth: 44 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const empShifts = weekDates.map(d => shiftMap.get(`${emp.id}__${toISODate(d)}`))
                const totalMins = empShifts.reduce((sum, s) => {
                  if (!s) return sum
                  const [sh, sm] = s.start_time.split(':').map(Number)
                  const [eh, em] = s.end_time.split(':').map(Number)
                  let m = (eh * 60 + em) - (sh * 60 + sm)
                  if (m < 0) m += 24 * 60
                  return sum + Math.max(0, m - s.break_minutes)
                }, 0)
                const totalH = Math.floor(totalMins / 60)
                const totalM = totalMins % 60

                return (
                  <tr key={emp.id}>
                    <td className="employee-cell">
                      <div className="employee-name">{emp.full_name ?? emp.email}</div>
                      {emp.position && <div className="employee-pos">{emp.position}</div>}
                    </td>
                    {empShifts.map((shift, i) => (
                      <td key={i}>
                        {shift ? (() => {
                          const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                          const bg = poste ? `${poste.color}22` : '#f0f4ff'
                          const border = poste?.color ?? '#93c5fd'
                          return (
                            <div className="shift" style={{ backgroundColor: bg, borderLeft: `3px solid ${border}` }}>
                              <div className="shift-time">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</div>
                              {shift.position && <div className="shift-pos">{shift.position}</div>}
                              {shift.break_minutes > 0 && <div className="shift-break">pause {shift.break_minutes === 60 ? '1h' : `${shift.break_minutes}min`}</div>}
                            </div>
                          )
                        })() : (
                          <div className="empty">·</div>
                        )}
                      </td>
                    ))}
                    <td className="total-cell">
                      {totalMins > 0 ? (totalM > 0 ? `${totalH}h${String(totalM).padStart(2, '0')}` : `${totalH}h`) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="footer">
            <span>D-pot Planning · {weekLabel}</span>
            <span>{employees.length} employé{employees.length !== 1 ? 's' : ''} · {shifts.length} créneau{shifts.length !== 1 ? 'x' : ''}</span>
          </div>
        </div>

        <PrintTrigger />
      </body>
    </html>
  )
}
