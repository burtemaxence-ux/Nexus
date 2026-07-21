'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { humanizeBrief } from '@/lib/notifications/humanize-brief'
import { Sparkles } from 'lucide-react'

interface Brief { body: string | null; data: { full?: string } | null; created_at: string }

// Neutral fallback shown until the weekly AI brief is generated (cron
// weekly-brief-manager runs every Monday, stored as a 'weekly_brief' notification).
const FALLBACK =
  "Votre point hebdomadaire apparaîtra ici dès qu'il sera généré, chaque lundi. En attendant, gardez un œil sur les pointages du jour et la publication du planning."

/**
 * Brief IA de la semaine — résumé hebdo généré côté serveur, avec repli neutre
 * tant que la génération n'existe pas pour la semaine en cours.
 */
export function WeeklyBriefCard() {
  const [brief, setBrief] = useState<Brief | null>(null)

  useEffect(() => {
    let active = true
    const since = new Date(Date.now() - 8 * 86400000).toISOString()
    createClient()
      .from('notifications')
      .select('body, data, created_at')
      .eq('type', 'weekly_brief')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (active && data) setBrief(data as Brief) })
    return () => { active = false }
  }, [])

  // Texte du brief : version complète si présente, sinon le corps, toujours
  // ré-humanisé au rendu (défensif pour d'anciennes notifications).
  const briefText = brief ? humanizeBrief(brief.data?.full ?? brief.body) : ''

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: '16px',
        padding: '17px 19px',
        background: 'linear-gradient(120deg, rgba(108,99,255,0.07), rgba(18,184,134,0.045))',
        border: '1px solid rgba(108,99,255,0.18)',
      }}
    >
      <span
        className="nx-brief-sweep absolute pointer-events-none"
        style={{ top: '-40%', left: 0, width: '42%', height: '180%', background: 'linear-gradient(100deg, transparent, rgba(108,99,255,0.12), transparent)' }}
      />
      <div className="relative flex items-start" style={{ gap: '13px' }}>
        <div
          className="nx-brief-orb flex items-center justify-center flex-shrink-0"
          style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(108,99,255,0.13)' }}
        >
          <Sparkles className="nx-brief-spark h-[18px] w-[18px]" style={{ color: 'var(--accent)' }} fill="currentColor" stroke="none" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '5px' }}>
            <span style={{ fontFamily: 'var(--font-manrope)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Brief de la semaine
            </span>
            <span
              className="nx-ia-badge inline-flex items-center"
              style={{ gap: '5px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'linear-gradient(90deg,#6C63FF,#12b886,#6C63FF)', color: '#fff', padding: '3px 9px', borderRadius: '20px', boxShadow: '0 2px 8px -2px rgba(108,99,255,0.5)' }}
            >
              IA
              <span className="inline-flex items-center" style={{ gap: '2px' }}>
                <span className="nx-ia-dot" style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                <span className="nx-ia-dot" style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                <span className="nx-ia-dot" style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              </span>
            </span>
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, color: 'var(--text-secondary)' }}>
            {briefText || FALLBACK}
          </p>
        </div>
      </div>
    </div>
  )
}
