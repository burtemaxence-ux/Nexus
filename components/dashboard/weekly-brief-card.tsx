'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles } from 'lucide-react'

interface Brief { title: string | null; body: string | null; created_at: string }

/**
 * Cockpit — Briefing hebdo généré par l'IA (cron weekly-brief-manager, lundi).
 * Stocké en notification type 'weekly_brief'. Affiché seulement s'il est récent
 * (≤ 8 j), sinon masqué.
 */
export function WeeklyBriefCard() {
  const [brief, setBrief] = useState<Brief | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    const since = new Date(Date.now() - 8 * 86400000).toISOString()
    supabase
      .from('notifications')
      .select('title, body, created_at')
      .eq('type', 'weekly_brief')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (active && data) setBrief(data as Brief) })
    return () => { active = false }
  }, [])

  if (!brief) return null

  return (
    <div
      className="rounded-[14px] border p-5 flex items-start gap-4"
      style={{
        borderColor: 'var(--border)',
        background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, var(--bg-card) 60%)',
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
        <Sparkles className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--accent)' }}>
          Briefing de la semaine · IA
        </p>
        <p className="text-[14px] font-semibold mt-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
          {brief.title ?? 'Votre point hebdomadaire'}
        </p>
        {brief.body && (
          <p className="text-[13px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {brief.body}
          </p>
        )}
      </div>
    </div>
  )
}
