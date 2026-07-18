import { createClient } from '@/lib/supabase/server'
import { generateReferralCode, getReferralStats, REFERRAL_MAX_ACTIVE, REFERRAL_MAX_DISCOUNT, REFERRAL_DISCOUNT_PER_ACTIVE } from '@/lib/referral'
import { redirect } from 'next/navigation'
import { Gift, Users, Ticket, Link2, Send, Route, User, Info, Share2, CalendarClock, TrendingDown } from 'lucide-react'
import { CopyButton } from './copy-button'

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'

const STEP_ICONS = [Share2, Gift, CalendarClock, TrendingDown]
const STEPS = [
  { label: 'Partagez votre lien unique', desc: 'Envoyez-le à vos collègues restaurateurs.' },
  { label: 'Ils essaient Quartzbase', desc: 'Leur 1er mois est offert dès leur inscription avec votre code.' },
  { label: 'Ils restent abonnés', desc: 'Leur parrainage passe en actif après 30 jours d\'abonnement payé.' },
  { label: 'Vous touchez la réduction', desc: `-${REFERRAL_DISCOUNT_PER_ACTIVE}% par filleul actif, jusqu'à -${REFERRAL_MAX_DISCOUNT}%.` },
]

function statusBadge(status: string): React.CSSProperties {
  if (status === 'active') return { background: 'var(--sev-success-chip)', color: 'var(--sev-success-fg)' }
  if (status === 'churned') return { background: 'var(--sev-critical-chip)', color: 'var(--sev-critical-fg)' }
  return { background: 'var(--sev-warning-chip)', color: 'var(--sev-warning-fg)' }
}
function statusLabel(status: string) {
  return status === 'active' ? 'Actif' : status === 'churned' ? 'Résilié' : 'En attente'
}

export default async function ParrainagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = generateReferralCode(user.id)
  const stats = await getReferralStats(supabase, user.id)
  const link = `${BASE_URL}/register?ref=${code}`
  const maxActive = REFERRAL_MAX_ACTIVE
  const progressPct = Math.min((stats.active / maxActive) * 100, 100)

  const mailSubject = encodeURIComponent('Je te recommande Quartzbase')
  const mailBody = encodeURIComponent(`Bonjour,\n\nJe pense que Quartzbase pourrait t'intéresser pour gérer tes plannings et ta paie.\n\nAvec mon code ${code}, ton 1er mois est offert : ${link}\n\nÀ bientôt !`)

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Reward hero */}
      <div className="nx-ref-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gift className="ic20" style={{ color: '#fff' }} /></div>
          <div><p style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: '-.01em' }}>Parrainez, économisez</p><p style={{ fontSize: 12, opacity: .85 }}>-{REFERRAL_DISCOUNT_PER_ACTIVE}% par restaurateur parrainé, jusqu’à -{REFERRAL_MAX_DISCOUNT}%</p></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <div className="nx-ref-stat"><p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{stats.active}</p><p style={{ fontSize: 10.5, opacity: .85, marginTop: 5 }}>Filleuls actifs</p></div>
          <div className="nx-ref-stat"><p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{stats.pending}</p><p style={{ fontSize: 10.5, opacity: .85, marginTop: 5 }}>En attente</p></div>
          <div className="nx-ref-stat"><p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#8AF5DC' }}>-{stats.discount}%</p><p style={{ fontSize: 10.5, opacity: .85, marginTop: 5 }}>Réduction active</p></div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, opacity: .92 }}>Progression vers -{REFERRAL_MAX_DISCOUNT}%</span><span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{stats.active}/{maxActive}</span></div>
          <div style={{ height: 9, background: 'rgba(255,255,255,.22)', borderRadius: 999, overflow: 'hidden' }}><div className="nx-usage-fill" style={{ width: `${progressPct}%`, background: '#8AF5DC' }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: .8, marginTop: 6 }}>
            {Array.from({ length: maxActive }, (_, i) => i + 1).map(n => (
              <span key={n} style={stats.active >= n ? { fontWeight: 700, opacity: 1 } : undefined}>-{n * REFERRAL_DISCOUNT_PER_ACTIVE}%</span>
            ))}
          </div>
        </div>
      </div>

      {/* Code + link */}
      <div className="nx-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Ticket className="ic16" style={{ color: 'var(--accent)' }} /></div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Votre code parrainage</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, padding: '14px 18px', borderRadius: 12, background: 'var(--accent-light)', border: '1px dashed var(--accent)' }}><p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '.14em', color: 'var(--accent)' }}>{code}</p></div>
          <CopyButton text={code} label="Copier" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, padding: '11px 16px', borderRadius: 12, background: 'var(--bg-page)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}><Link2 className="ic14" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /><p style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</p></div>
          <CopyButton text={link} label="Copier" />
        </div>
        <a className="btn-primary qb-shine" href={`mailto:?subject=${mailSubject}&body=${mailBody}`} style={{ alignSelf: 'flex-start', textDecoration: 'none' }}><Send className="ic14" />Partager par email</a>
      </div>

      {/* How it works */}
      <div className="nx-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}><div className="nx-ico" style={{ background: 'rgba(0,169,143,.12)' }}><Route className="ic16" style={{ color: 'var(--emerald)' }} /></div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Comment ça marche</p></div>
        <div>
          {STEPS.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Gift
            return (
              <div key={i} className="nx-refstep">
                <div className="nx-refstep-ico"><Icon className="ic16" style={{ color: 'var(--accent)' }} /></div>
                <div style={{ paddingTop: 2 }}><p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{step.label}</p><p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.45 }}>{step.desc}</p></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conditions */}
      <div style={{ borderRadius: 14, padding: 16, background: 'var(--bg-subtle)', border: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info className="ic16" style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Bon à savoir</p>
            <ul style={{ fontSize: 11.5, color: 'var(--text-secondary)', paddingLeft: 15, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.45 }}>
              <li>La réduction s’active après 30 jours de paiement actif du filleul</li>
              <li>Elle est liée aux filleuls actifs — elle diminue si un filleul résilie</li>
              <li>Votre filleul profite de son 1er mois offert dès son inscription</li>
              <li>Maximum {REFERRAL_MAX_ACTIVE} filleuls actifs (-{REFERRAL_MAX_DISCOUNT}% max)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filleuls */}
      {stats.filleuls.length > 0 ? (
        <div className="nx-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}><div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Users className="ic16" style={{ color: 'var(--accent)' }} /></div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Vos filleuls ({stats.filleuls.length})</p></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats.filleuls.map(f => (
              <div key={f.id} className="nx-filleul">
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User className="ic16" style={{ color: '#fff' }} /></div>
                  <div><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Filleul #{f.id.slice(0, 8)}</p><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Inscrit le {new Date(f.created_at).toLocaleDateString('fr-FR')}</p></div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999, ...statusBadge(f.status) }}>{statusLabel(f.status)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="nx-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <CalendarClock className="ic28" style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Aucun filleul pour l’instant</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Partagez votre lien pour commencer à gagner des réductions.</p>
        </div>
      )}
    </div>
  )
}
