'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

export interface HomeTask {
  id: string
  label: string
  href: string
  /** Optional count chip (e.g. number of items to process). */
  badge?: number
  badgeColor?: string
}

/**
 * À faire aujourd'hui — actionable tasks derived from real signals (unpublished
 * planning, leave requests, unverified clock-ins…). Each task routes to the page
 * that resolves it; the checked state is persisted per manager and per day in
 * `home_task_completions`. Degrades to in-session state if the table is absent.
 */
export function TodayTasks({ tasks }: { tasks: HomeTask[] }) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const [done, setDone] = useState<Set<string>>(new Set())
  const ctx = useRef<{ userId: string; establishmentId: string | null } | null>(null)

  // Charge l'état coché du jour pour ce manager.
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !active) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_establishment_id, establishment_id')
        .eq('id', user.id)
        .maybeSingle()
      ctx.current = {
        userId: user.id,
        establishmentId: profile?.active_establishment_id ?? profile?.establishment_id ?? null,
      }
      const { data, error } = await supabase
        .from('home_task_completions')
        .select('task_key')
        .eq('day', today)
      if (active && !error && data) setDone(new Set(data.map((r: { task_key: string }) => r.task_key)))
    })
    return () => { active = false }
  }, [today])

  async function toggle(id: string) {
    const willBeDone = !done.has(id)
    // Optimiste : on reflète tout de suite, on persiste ensuite.
    setDone(prev => {
      const next = new Set(prev)
      willBeDone ? next.add(id) : next.delete(id)
      return next
    })
    const c = ctx.current
    if (!c) return
    const supabase = createClient()
    if (willBeDone) {
      await supabase.from('home_task_completions')
        .upsert({ user_id: c.userId, establishment_id: c.establishmentId, task_key: id, day: today }, { onConflict: 'user_id,task_key,day' })
    } else {
      await supabase.from('home_task_completions')
        .delete().eq('user_id', c.userId).eq('task_key', id).eq('day', today)
    }
  }

  if (tasks.length === 0) return null

  const remaining = tasks.filter(t => !done.has(t.id)).length

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.05), 0 10px 26px -12px rgba(16,24,40,0.12)' }}
    >
      <div className="flex items-center justify-between" style={{ padding: '16px 18px 4px' }}>
        <p style={{ fontFamily: 'var(--font-manrope)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
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
