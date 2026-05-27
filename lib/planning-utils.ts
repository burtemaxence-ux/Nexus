import type { LeaveType } from '@/types'

export function calcHours(start: string, end: string, breakMinutes: number = 0): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes < 0) minutes += 1440
  return Math.max(0, (minutes - breakMinutes) / 60)
}

export function formatHours(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`
}

export function formatTime(t: string): string {
  return t.slice(0, 5)
}

export function isToday(date: Date): boolean {
  const t = new Date()
  return date.getDate() === t.getDate() &&
    date.getMonth() === t.getMonth() &&
    date.getFullYear() === t.getFullYear()
}

export function getInitials(name: string | null, fallback = '?'): string {
  if (!name) return fallback
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function getEstablishmentInitials(name: string): string {
  if (!name) return 'E'
  const words = name.split(' ').filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export const LEAVE_STYLES: Record<LeaveType, { bg: string; color: string; label: string }> = {
  CP:         { bg: 'var(--accent-light)', color: 'var(--accent)',         label: 'Congé payé' },
  RTT:        { bg: 'var(--accent-light)', color: 'var(--accent)',         label: 'RTT' },
  maladie:    { bg: '#FEE2E2',            color: 'var(--danger)',          label: 'Maladie' },
  sans_solde: { bg: 'var(--bg-page)',      color: 'var(--text-secondary)', label: 'Sans solde' },
  autre:      { bg: '#FEF3C7',            color: 'var(--warning)',         label: 'Absence' },
}
