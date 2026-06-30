'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export interface HomeTask {
  id: string
  label: string
  href: string
  /** Optional count chip (e.g. number of items to process). */
  badge?: number
  badgeColor?: string
}

const STORE_KEY = 'nx-home-tasks-done'

// Checked state is kept per-day in localStorage (no server tasks model exists).
function loadDone(today: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as { date?: string; done?: string[] }
    if (raw.date === today && Array.isArray(raw.done)) return new Set(raw.done)
  } catch { /* ignore */ }
  return new Set()
}
function saveDone(today: string, done: Set<string>) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ date: today, done: Array.from(done) })) } catch { /* ignore */ }
}

/**
 * À faire aujourd'hui — actionable tasks derived from real signals (unpublished
 * planning, leave requests, unverified clock-ins…). Each task routes to the page
 * that resolves it; the checked state persists per-day in localStorage.
 */
export function TodayTasks({ tasks }: { tasks: HomeTask[] }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => { setDone(loadDone(today)) }, [today])

  function toggle(id: string) {
    setDone(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveDone(today, next)
      return next
    })
  }

  if (tasks.length === 0) return null

  const remaining = tasks.filter(t => !done.has(t.id)).length

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.05), 0 10px 26px -12px rgba(16,24,40,0.12)' }}
    >
      <div className="flex items-center justify-between" style={{ padding: '16px 18px 4px' }}>
        <p style={{ fontFamily: 'var(--font-syne)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          À faire aujourd&apos;hui
        </p>
        <span
          style={{
            fontSize: '11px', fontWeight: 600, padding: '2px 9px', borderRadius: '20px',
            color: remaining === 0 ? 'var(--success)' : 'var(--accent)',
            background: remaining === 0 ? 'rgba(18,184,134,0.12)' : 'var(--accent-light)',
          }}
        >
          {remaining === 0 ? 'Tout est fait' : `${remaining} restante${remaining > 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={{ padding: '2px 18px 12px' }}>
        {tasks.map((t, i) => {
          const isDone = done.has(t.id)
          return (
            <div key={t.id}>
              {i > 0 && <div style={{ height: '1px', background: 'var(--border)' }} />}
              <div className={`nx-task flex items-center ${isDone ? 'done' : ''}`} style={{ gap: '11px', padding: '9px 0' }}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-label={isDone ? 'Marquer comme à faire' : 'Marquer comme fait'}
                  aria-pressed={isDone}
                  className="nx-task-check flex items-center justify-center flex-shrink-0"
                  style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid var(--border-hover)', background: 'transparent', cursor: 'pointer' }}
                >
                  <Check className="h-3 w-3" style={{ color: '#fff' }} strokeWidth={3.4} />
                </button>
                <button
                  type="button"
                  onClick={() => router.push(t.href)}
                  className="nx-task-label flex-1 text-left"
                  style={{ fontSize: '13px', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {t.label}
                </button>
                {t.badge !== undefined && t.badge > 0 && (
                  <span
                    style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', color: t.badgeColor ?? 'var(--warning)', background: 'rgba(240,140,0,0.12)' }}
                  >
                    {t.badge}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
