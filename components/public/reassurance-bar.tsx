import { ShieldCheck, Clock, Smartphone, Lock } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const ITEMS = [
  { icon: <ShieldCheck size={17} color="#00D4AA" strokeWidth={1.9} />, label: 'Conforme au Code du travail' },
  { icon: <Clock       size={17} color="#6C63FF" strokeWidth={1.9} />, label: 'Prêt en 10 minutes' },
  { icon: <Smartphone  size={17} color="#6C63FF" strokeWidth={1.9} />, label: 'Sur mobile et ordinateur' },
  { icon: <Lock        size={17} color="#00D4AA" strokeWidth={1.9} />, label: 'Données hébergées en Europe' },
]

export function ReassuranceBar() {
  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '0 32px' }}>
      <Reveal style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
        {ITEMS.map((item) => (
          <div key={item.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: '#0f0f16',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 11,
            padding: '11px 18px',
            fontFamily: FONT,
            fontSize: 13.5,
            fontWeight: 500,
            color: '#c2c2d0',
          }}>
            <span style={{ display: 'flex' }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </Reveal>
    </section>
  )
}
