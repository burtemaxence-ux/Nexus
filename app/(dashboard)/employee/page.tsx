import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, Sun, ArrowLeftRight, Clock, ChevronRight, Zap } from 'lucide-react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function shiftProgress(startTime: string, endTime: string): number {
  const now = new Date()
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  const cur = now.getHours() * 60 + now.getMinutes()
  if (cur <= start) return 0
  if (cur >= end) return 100
  return Math.round(((cur - start) / (end - start)) * 100)
}

export default async function EmployeeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const [
    { data: profile },
    { data: settingsRow },
    { data: todayShifts },
    { data: presence },
    { count: pendingLeaves },
    { data: upcomingShifts },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
    supabase.from('shifts').select('start_time, end_time, position').eq('employee_id', user.id).eq('date', today).limit(1),
    supabase.from('presences').select('clock_in, clock_out, break_start, break_end').eq('employee_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('employee_id', user.id).eq('status', 'pending'),
    supabase.from('shifts').select('date, start_time, end_time, position').eq('employee_id', user.id).gt('date', today).order('date', { ascending: true }).limit(1),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Employé'
  const establishment = settingsRow?.value && settingsRow.value !== 'Mon établissement' ? settingsRow.value : null
  const shift = todayShifts?.[0] ?? null
  const nextShift = upcomingShifts?.[0] ?? null

  const p = presence ?? null
  const isWorking = !!p?.clock_in && !p?.clock_out && !(p?.break_start && !p?.break_end)
  const isOnBreak = !!p?.clock_in && !!p?.break_start && !p?.break_end
  const isDone = !!p?.clock_out
  const hasShift = !!shift

  // Status badge
  let statusLabel = 'Repos'
  let statusColor = 'var(--text-tertiary)'
  let statusBg = 'rgba(90,90,114,0.12)'
  if (isDone) { statusLabel = 'Journée terminée'; statusColor = 'var(--success)'; statusBg = 'rgba(0,212,170,0.1)' }
  else if (isOnBreak) { statusLabel = 'En pause'; statusColor = 'var(--warning)'; statusBg = 'rgba(255,179,71,0.1)' }
  else if (isWorking) { statusLabel = 'En service'; statusColor = 'var(--success)'; statusBg = 'rgba(0,212,170,0.1)' }
  else if (hasShift) { statusLabel = 'Shift planifié'; statusColor = 'var(--accent)'; statusBg = 'rgba(108,99,255,0.1)' }

  // Badgeuse CTA
  let badgeuseLabel = 'Pointer l\'arrivée'
  let badgeuseAccent = true
  if (isDone) { badgeuseLabel = 'Journée terminée ✓'; badgeuseAccent = false }
  else if (isOnBreak) { badgeuseLabel = 'Reprendre le travail'; badgeuseAccent = true }
  else if (isWorking) { badgeuseLabel = 'Pointer le départ'; badgeuseAccent = false }

  const progress = shift ? shiftProgress(shift.start_time, shift.end_time) : 0

  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-2 dashboard-s0">
          <div>
            <h1
              className="text-[22px] font-bold tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
            >
              Bonjour {firstName} 👋
            </h1>
            <p className="text-[13px] mt-0.5 capitalize" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
              {dateLabel}{establishment ? ` · ${establishment}` : ''}
            </p>
          </div>
          <span
            className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full mt-1"
            style={{ color: statusColor, backgroundColor: statusBg, fontFamily: 'var(--font-dm-sans)' }}
          >
            {statusLabel}
          </span>
        </div>

        {/* ── SHIFT DU JOUR ── */}
        <div
          className="dashboard-card rounded-[14px] p-5 dashboard-s1"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${shift ? 'var(--accent)' : 'var(--border)'}`,
            background: shift ? 'linear-gradient(135deg, rgba(108,99,255,0.06) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.06em]"
              style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}
            >
              Shift du jour
            </span>
            {shift && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)', fontFamily: 'var(--font-dm-sans)' }}
              >
                {shift.position ?? 'Service'}
              </span>
            )}
          </div>

          {shift ? (
            <>
              <p
                className="text-[24px] font-bold tracking-[-0.02em] mb-1"
                style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
              >
                {shift.start_time.slice(0, 5)}
                <span className="text-[16px] font-normal mx-1.5" style={{ color: 'var(--text-tertiary)' }}>→</span>
                {shift.end_time.slice(0, 5)}
              </p>
              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? 'var(--success)' : 'var(--accent)' }}
                  />
                </div>
                <p className="text-[11px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                  {progress >= 100 ? 'Shift terminé' : progress === 0 ? 'Pas encore commencé' : `${progress}% écoulé`}
                </p>
              </div>
            </>
          ) : nextShift ? (
            <div>
              <p className="text-[13px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                Repos aujourd&apos;hui · prochain service
              </p>
              <p className="text-[18px] font-bold tracking-[-0.02em] mt-1" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
                <span className="capitalize">{formatDateShort(nextShift.date)}</span>
                <span className="text-[14px] font-normal mx-1.5" style={{ color: 'var(--text-tertiary)' }}>·</span>
                {nextShift.start_time.slice(0, 5)} → {nextShift.end_time.slice(0, 5)}
              </p>
            </div>
          ) : (
            <p className="text-[14px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
              Pas de shift planifié aujourd&apos;hui
            </p>
          )}
        </div>

        {/* ── BADGEUSE CTA ── */}
        <Link href="/employee/badgeuse" className="block dashboard-s2">
          <div
            className="dashboard-card rounded-[14px] p-5 transition-transform duration-150 hover:-translate-y-0.5"
            style={{
              backgroundColor: badgeuseAccent ? 'var(--accent)' : 'var(--bg-card)',
              border: badgeuseAccent ? 'none' : '1px solid var(--border)',
              boxShadow: badgeuseAccent ? '0 4px 24px rgba(108,99,255,0.35)' : undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Clock className="h-4 w-4" style={{ color: badgeuseAccent ? 'rgba(255,255,255,0.8)' : 'var(--accent)' }} />
                  <span
                    className="text-[15px] font-semibold"
                    style={{ fontFamily: 'var(--font-syne)', color: badgeuseAccent ? '#ffffff' : 'var(--text-primary)' }}
                  >
                    {badgeuseLabel}
                  </span>
                </div>
                {p?.clock_in && (
                  <p
                    className="text-[12px] ml-6"
                    style={{ fontFamily: 'var(--font-dm-sans)', color: badgeuseAccent ? 'rgba(255,255,255,0.65)' : 'var(--text-tertiary)' }}
                  >
                    Arrivée pointée à {formatTime(p.clock_in)}
                  </p>
                )}
              </div>
              <ChevronRight
                className="h-5 w-5 flex-shrink-0"
                style={{ color: badgeuseAccent ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}
              />
            </div>
          </div>
        </Link>

        {/* ── MODULE CARDS (grille 2 colonnes) ── */}
        <div className="grid grid-cols-2 gap-3 dashboard-s3">
          {/* Planning */}
          <Link href="/employee/planning">
            <div
              className="dashboard-card rounded-[14px] p-4 h-full transition-transform duration-150 hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(108,99,255,0.12)' }}
              >
                <Calendar className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-[13px] font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
                Mon planning
              </p>
              <p className="text-[11px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                Consulter mes horaires
              </p>
            </div>
          </Link>

          {/* Congés */}
          <Link href="/employee/conges">
            <div
              className="dashboard-card rounded-[14px] p-4 h-full transition-transform duration-150 hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,179,71,0.12)' }}
                >
                  <Sun className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                </div>
                {(pendingLeaves ?? 0) > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(255,179,71,0.2)', color: 'var(--warning)' }}
                  >
                    {pendingLeaves}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
                Mes congés
              </p>
              <p className="text-[11px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                Demandes et soldes
              </p>
            </div>
          </Link>

          {/* Échanges */}
          <Link href="/employee/echanges">
            <div
              className="dashboard-card rounded-[14px] p-4 h-full transition-transform duration-150 hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(0,212,170,0.1)' }}
              >
                <ArrowLeftRight className="h-4 w-4" style={{ color: 'var(--success)' }} />
              </div>
              <p className="text-[13px] font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
                Mes échanges
              </p>
              <p className="text-[11px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                Swaps avec collègues
              </p>
            </div>
          </Link>

          {/* Marketplace */}
          <Link href="/employee/marketplace">
            <div
              className="dashboard-card rounded-[14px] p-4 h-full transition-transform duration-150 hover:-translate-y-0.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(108,99,255,0.1)' }}
              >
                <Zap className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-[13px] font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
                Marketplace
              </p>
              <p className="text-[11px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                Shifts disponibles
              </p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  )
}
