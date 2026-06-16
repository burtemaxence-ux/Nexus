import { createClient } from '@/lib/supabase/server'
import { generateReferralCode, getReferralStats, REFERRAL_MAX_ACTIVE, REFERRAL_MAX_DISCOUNT, REFERRAL_DISCOUNT_PER_ACTIVE } from '@/lib/referral'
import { redirect } from 'next/navigation'
import { Gift, Users, TrendingDown, Clock, CheckCircle2 } from 'lucide-react'
import { CopyButton } from './copy-button'

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'

const STEPS = [
  { label: 'Partagez votre lien unique', desc: 'Envoyez-le à vos collègues restaurateurs.' },
  { label: 'Ils essaient Quartzbase', desc: 'Leur 1er mois est offert dès leur inscription avec votre code.' },
  { label: 'Ils restent abonnés', desc: 'Leur parrainage passe en actif après 30 jours d\'abonnement payé.' },
  { label: 'Vous touchez la réduction', desc: `-${REFERRAL_DISCOUNT_PER_ACTIVE}% par filleul actif, jusqu'à -${REFERRAL_MAX_DISCOUNT}%.` },
]

export default async function ParrainagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = generateReferralCode(user.id)
  const stats = await getReferralStats(supabase, user.id)
  const link = `${BASE_URL}/register?ref=${code}`

  const maxActive = REFERRAL_MAX_ACTIVE
  const progressPct = Math.min((stats.active / maxActive) * 100, 100)

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
          <Gift className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
            Programme parrainage
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Invitez vos contacts et réduisez votre abonnement
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-[26px] font-bold text-[var(--accent)] leading-none">{stats.active}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Filleuls actifs</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-[26px] font-bold text-[var(--text-primary)] leading-none">{stats.pending}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">En attente</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-[26px] font-bold leading-none" style={{ color: stats.discount > 0 ? '#00D4AA' : 'var(--text-primary)' }}>
            -{stats.discount}%
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Réduction active</p>
        </div>
      </div>

      {/* Progress toward max discount */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-[14px] font-medium text-[var(--text-primary)]">Progression vers -{REFERRAL_MAX_DISCOUNT}%</p>
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
            {stats.active}/{maxActive} filleuls actifs
          </p>
        </div>
        <div className="h-2.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--accent) 0%, #00D4AA 100%)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
          {Array.from({ length: REFERRAL_MAX_ACTIVE }, (_, i) => i + 1).map(n => (
            <span key={n} className={stats.active >= n ? 'text-[var(--accent)] font-semibold' : ''}>
              -{n * REFERRAL_DISCOUNT_PER_ACTIVE}%
            </span>
          ))}
        </div>
      </div>

      {/* Code + link */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <p className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">
          Votre code parrainage
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
            <p className="text-[22px] font-bold tracking-widest text-[var(--text-primary)]">{code}</p>
          </div>
          <CopyButton text={code} label="Copier le code" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-2.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] overflow-hidden">
            <p className="text-[12px] text-[var(--text-secondary)] truncate">{link}</p>
          </div>
          <CopyButton text={link} label="Copier le lien" />
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <p className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-4">
          Comment ça marche
        </p>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-[var(--accent)]">{i + 1}</span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--text-primary)]">{step.label}</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Conditions */}
      <div className="px-4 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-[12px] font-medium text-[var(--text-primary)]">Conditions du programme</p>
            <ul className="text-[11px] text-[var(--text-secondary)] space-y-0.5 list-disc list-inside">
              <li>La réduction s&apos;active après 30 jours de paiement actif du filleul</li>
              <li>La réduction est liée aux filleuls actifs — elle diminue si un filleul résilie</li>
              <li>Le filleul bénéficie de son 1er mois offert dès son inscription avec votre code</li>
              <li>Maximum {REFERRAL_MAX_ACTIVE} filleuls actifs (-{REFERRAL_MAX_DISCOUNT}% max)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filleuls list */}
      {stats.filleuls.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-[var(--text-secondary)]" />
            <p className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em]">
              Vos filleuls ({stats.filleuls.length})
            </p>
          </div>
          <div className="space-y-2">
            {stats.filleuls.map(f => (
              <div
                key={f.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--bg-subtle)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[var(--accent)]">F</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">Filleul #{f.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      Inscrit le {new Date(f.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                  f.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : f.status === 'churned'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {f.status === 'active' ? 'Actif' : f.status === 'churned' ? 'Résilié' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {stats.filleuls.length === 0 && (
        <div className="text-center py-8 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          <Clock className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[13px] font-medium text-[var(--text-primary)]">Aucun filleul pour l&apos;instant</p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
            Partagez votre lien pour commencer à gagner des réductions.
          </p>
        </div>
      )}
    </div>
  )
}
