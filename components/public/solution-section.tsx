'use client'

import { useState } from 'react'
import { Zap, RefreshCw, ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const TABS = [
  { accent: '#6C63FF', tileOn: 'rgba(108,99,255,0.22)', Icon: Zap,         title: 'Planning fait en 2 minutes',          body: "Dites à l'IA vos contraintes de la semaine. Elle génère un planning complet, que vous validez ou ajustez avant de l'envoyer." },
  { accent: '#00D4AA', tileOn: 'rgba(0,212,170,0.2)',   Icon: RefreshCw,   title: 'Remplaçant trouvé en 1 clic',          body: "Un absent au dernier moment ? L'app envoie la demande aux disponibles. Vous confirmez depuis votre téléphone." },
  { accent: '#FFB347', tileOn: 'rgba(255,179,71,0.2)',  Icon: ShieldCheck, title: 'Conformité vérifiée automatiquement',  body: 'Repos, durées maxi, pauses, dimanches… 7 règles du Code du travail passées en revue à chaque planning.' },
]

const DEMO_GLOW = ['rgba(108,99,255,0.18)', 'rgba(0,212,170,0.16)', 'rgba(255,179,71,0.14)']

const PLANNING_ROWS = [
  { d: 'Lun', t: '06:00 – 13:00 · Fournil', from: 'rgba(108,99,255,0.30)', to: 'rgba(108,99,255,0.12)' },
  { d: 'Mar', t: '07:00 – 14:00 · Vente',   from: 'rgba(0,212,170,0.26)',  to: 'rgba(0,212,170,0.12)' },
  { d: 'Mer', t: '06:00 – 13:00 · Fournil', from: 'rgba(108,99,255,0.30)', to: 'rgba(108,99,255,0.12)' },
  { d: 'Jeu', t: '14:00 – 20:00 · Vente',   from: 'rgba(0,212,170,0.26)',  to: 'rgba(0,212,170,0.12)' },
  { d: 'Ven', t: '06:00 – 13:00 · Fournil', from: 'rgba(108,99,255,0.30)', to: 'rgba(108,99,255,0.12)' },
]

const CANDIDATES = [
  { n: 'Léa',  s: 'Disponible · accepte',       ok: true },
  { n: 'Marc', s: 'A déjà 39h cette semaine',    ok: false },
  { n: 'Inès', s: 'Disponible',                  ok: true },
]

const RULES = ['Repos quotidien 11h', 'Repos hebdomadaire 35h', 'Durée max 48h/sem.', 'Pause après 6h', 'Travail du dimanche', 'Heures supplémentaires', 'Coupures encadrées']

function FeatureDemo({ idx }: { idx: number }) {
  if (idx === 0) {
    return (
      <div key="d0" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Semaine générée en 2 min</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANNING_ROWS.map((x, i) => (
            <div key={i} className="qb-demo-row" style={{ display: 'flex', alignItems: 'center', gap: 12, animationDelay: `${0.15 + i * 0.13}s` }}>
              <div style={{ width: 40, fontSize: 12, color: '#79828f' }}>{x.d}</div>
              <div style={{ flex: 1, height: 34, borderRadius: 8, background: `linear-gradient(90deg, ${x.from}, ${x.to})`, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 12, color: '#cfcfe0' }}>{x.t}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6fe9d0' }}>
          <ShieldCheck size={16} color="#00D4AA" strokeWidth={1.9} />Conforme au Code du travail
        </div>
      </div>
    )
  }
  if (idx === 1) {
    return (
      <div key="d1" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.22)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,107,107,0.16)', color: '#FF6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>!</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#FF6B6B' }}>Théo absent samedi soir</div>
            <div style={{ fontSize: 12.5, color: '#a6a8b8', marginTop: 3 }}>Demande envoyée aux disponibles…</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CANDIDATES.map((c, i) => (
            <div key={i} className="qb-demo-row" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#13131c', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', animationDelay: `${0.2 + i * 0.18}s` }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#0b0b12' }}>{c.n[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f0f0f8' }}>{c.n}</div>
                <div style={{ fontSize: 12, color: c.ok ? '#6fe9d0' : '#79828f' }}>{c.s}</div>
              </div>
              {c.ok ? <ShieldCheck size={18} color="#00D4AA" strokeWidth={1.9} /> : <span style={{ fontSize: 16, color: '#5a5a72' }}>—</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div key="d2" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>7 règles vérifiées</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#00D4AA', background: 'rgba(0,212,170,0.12)', padding: '4px 10px', borderRadius: 7 }}>À jour 2026</span>
      </div>
      <div className="qb-demo-rules" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {RULES.map((r, i) => (
          <div key={i} className="qb-demo-check" style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#13131c', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '11px 12px', animationDelay: `${0.1 + i * 0.1}s` }}>
            <ShieldCheck size={16} color="#00D4AA" strokeWidth={1.9} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: '#cfcfe0', lineHeight: 1.3 }}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SolutionSection() {
  const [idx, setIdx] = useState(0)

  return (
    <section id="fonctionnalites" style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 50px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#00D4AA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Ce qui change pour vous
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.12, margin: '0 auto 16px', maxWidth: 560 }}>
          Faites votre planning en 2 minutes. L&apos;IA s&apos;occupe du reste.
        </h2>
        <p style={{ fontSize: 17, color: '#a6a8b8', lineHeight: 1.6, margin: 0 }}>
          Ce que Quartzbase fait à votre place, pour que vous arrêtiez d&apos;y penser.
        </p>
      </Reveal>

      <Reveal className="qb-sol-grid" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 28, alignItems: 'stretch' }}>
        {/* Onglets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TABS.map((tab, i) => {
            const on = idx === i
            const Icon = tab.Icon
            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-pressed={on}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'left',
                  background: on ? '#15141d' : '#0f0f15',
                  border: `1px solid ${on ? tab.accent : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 16,
                  padding: '22px 24px',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  transition: 'background .25s ease, border-color .25s ease',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: on ? tab.accent : 'transparent', transition: 'background .25s ease' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: on ? 14 : 0, transition: 'margin .25s ease' }}>
                  <div style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: on ? tab.tileOn : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .25s ease' }}>
                    <Icon size={22} color={on ? tab.accent : '#79828f'} strokeWidth={1.9} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', color: on ? '#ffffff' : '#b8b8c8' }}>{tab.title}</div>
                </div>
                <div style={{ overflow: 'hidden', maxHeight: on ? 120 : 0, opacity: on ? 1 : 0, transition: 'max-height .35s ease, opacity .3s ease' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, paddingLeft: 60 }}>{tab.body}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Panneau démo */}
        <div style={{ position: 'relative', background: '#0d0d14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 26, display: 'flex', flexDirection: 'column', minHeight: 360, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, background: `radial-gradient(circle, ${DEMO_GLOW[idx]}, transparent 70%)`, transition: 'background .4s ease', pointerEvents: 'none' }} />
          <FeatureDemo idx={idx} />
        </div>
      </Reveal>

      <style>{`
        @keyframes qbFillRow2 { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }
        @keyframes qbCheckIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:none} }
        .qb-demo-row   { opacity: 0; animation: qbFillRow2 .5s ease forwards; }
        .qb-demo-check { opacity: 0; animation: qbCheckIn .4s ease forwards; }
        @media (prefers-reduced-motion: reduce) {
          .qb-demo-row, .qb-demo-check { opacity: 1; animation: none; }
        }
        @media (max-width: 880px) {
          .qb-sol-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
