'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const PLAN_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  'Essentiel':  { color: '#cfcfe0', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' },
  'Pro':        { color: '#b3aeff', bg: 'rgba(108,99,255,0.14)',  border: 'rgba(108,99,255,0.35)' },
  'Multi-site': { color: '#6fe9d0', bg: 'rgba(0,212,170,0.12)',   border: 'rgba(0,212,170,0.3)' },
}

const REVIEWS = [
  { score: 5,   when: 'il y a 2 sem.', quote: "Franchement, avant je passais mon dimanche soir sur le planning… maintenant c'est plié en 10 min le lundi. Et il connaît déjà les coupures de mes vendeuses, j'ai rien à réexpliquer.", initials: 'TM', avatarBg: 'linear-gradient(135deg,#6C63FF,#8b86ff)', name: 'Thomas M****', role: 'Boulangerie · Nantes',  plan: 'Essentiel'  },
  { score: 5,   when: 'il y a 1 mois', quote: "Une serveuse qui me lâche un samedi à 18h, j'ai lancé la demande de remplaçant et quelqu'un a dit oui en 10 min. Sans ça je faisais le service à deux, je vous raconte pas la soirée.", initials: 'SB', avatarBg: 'linear-gradient(135deg,#00D4AA,#6C63FF)', name: 'Sarah B****', role: 'Bistrot · Bordeaux',    plan: 'Pro'        },
  { score: 4,   when: 'il y a 3 sem.', quote: "Bon, je suis pas un as de l'informatique, la prise en main m'a pris une matinée. Mais une fois lancé j'ai plus retouché Excel. Le support m'a rappelé, sympa.", initials: 'KA', avatarBg: 'linear-gradient(135deg,#FFB347,#FF6B6B)', name: 'Karim A****', role: 'Brasserie · Lille',     plan: 'Essentiel'  },
  { score: 4.5, when: 'il y a 5 j.',   quote: "Ce qui me rassure c'est l'alerte quand un repos de 11h saute. Tout seul sur mon tableur je l'aurais jamais vu. Là au moins je dors tranquille.", initials: 'CL', avatarBg: 'linear-gradient(135deg,#8b86ff,#00D4AA)', name: 'Claire L****', role: 'Restaurant · Lyon',     plan: 'Pro'        },
  { score: 5,   when: 'il y a 2 mois', quote: "Avec mes 3 boutiques je voyais jamais la masse salariale en temps réel. Maintenant j'ouvre le tableau de bord le matin avec mon café et tout y est. Ça a changé ma façon de gérer.", initials: 'YD', avatarBg: 'linear-gradient(135deg,#6C63FF,#FF6B6B)', name: 'Yann D****', role: 'Multi-sites · Rennes',  plan: 'Multi-site' },
  { score: 4,   when: 'il y a 1 sem.', quote: "Mes équipes ont leur planning direct sur le tel, fini les photos floues dans le groupe WhatsApp. Seul truc, j'aimerais dupliquer une semaine type plus vite, mais ça reste top.", initials: 'FN', avatarBg: 'linear-gradient(135deg,#00D4AA,#8b86ff)', name: 'Farida N****', role: 'Boulangerie · Toulouse', plan: 'Essentiel'  },
]

const STAR_PATH = 'M12 2l3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17.8 5.7 20.6l1.6-6.9L2 9.1l7-.6z'

function Stars({ score, uid }: { score: number; uid: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = score >= i + 1 ? 1 : (score >= i + 0.5 ? 0.5 : 0)
        const gid = `qbstar-${uid}-${i}`
        return (
          <svg key={i} width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
            {fill === 0.5 && (
              <defs>
                <linearGradient id={gid}>
                  <stop offset="50%" stopColor="#FFB347" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.14)" />
                </linearGradient>
              </defs>
            )}
            <path d={STAR_PATH} fill={fill === 1 ? '#FFB347' : (fill === 0.5 ? `url(#${gid})` : 'rgba(255,255,255,0.14)')} />
          </svg>
        )
      })}
    </div>
  )
}

export function SocialProofSection() {
  const [idx, setIdx] = useState(0)
  const [perView, setPerView] = useState(3)

  useEffect(() => {
    const calc = () => setPerView(window.innerWidth <= 767 ? 1 : 3)
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const maxIdx = Math.max(0, REVIEWS.length - perView)
  useEffect(() => { setIdx((i) => Math.min(i, maxIdx)) }, [maxIdx])

  const basis = `${100 / perView}%`
  const shift = `calc(${-idx * (100 / perView)}%)`

  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 50px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Ils l&apos;utilisent au quotidien
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.12, margin: 0 }}>
          Ce qu&apos;en disent les patrons
        </h2>
      </Reveal>

      <Reveal style={{ position: 'relative' }}>
        <div style={{ overflow: 'hidden', borderRadius: 18 }}>
          <div className="qb-review-track" style={{ display: 'flex', transition: 'transform .55s cubic-bezier(.22,.8,.26,1)', transform: `translateX(${shift})` }}>
            {REVIEWS.map((rv, i) => {
              const ps = PLAN_STYLE[rv.plan]
              return (
                <div key={i} style={{ flex: `0 0 ${basis}`, maxWidth: basis, padding: '0 11px', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '30px 28px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Stars score={rv.score} uid={i} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#FFB347' }}>{String(rv.score).replace('.', ',')}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#5a5a72' }}>{rv.when}</span>
                    </div>
                    <p style={{ fontSize: 15.5, lineHeight: 1.62, color: '#dcdce6', margin: '0 0 24px', flex: 1 }}>{rv.quote}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: rv.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#0b0b12', flexShrink: 0 }}>{rv.initials}</div>
                      <div style={{ textAlign: 'left', flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{rv.name}</div>
                        <div style={{ fontSize: 12.5, color: '#9090a8' }}>{rv.role}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: ps.color, background: ps.bg, border: `1px solid ${ps.border}`, padding: '4px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>{rv.plan}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contrôles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Aller à l'avis ${i + 1}`}
                style={{ width: i === idx ? 24 : 7, height: 7, borderRadius: 100, border: 'none', cursor: 'pointer', padding: 0, background: i === idx ? '#6C63FF' : 'rgba(255,255,255,0.15)', transition: 'width .3s ease, background .3s ease' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              aria-label="Précédent"
              style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: '#cfcfe0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s ease, border-color .2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(maxIdx, i + 1))}
              aria-label="Suivant"
              style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(108,99,255,0.4)', background: 'rgba(108,99,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s ease, border-color .2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.12)' }}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </Reveal>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .qb-review-track { transition: none !important; }
        }
      `}</style>
    </section>
  )
}
