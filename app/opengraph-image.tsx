import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Quartzbase — Planning restauration intelligent'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '90px',
          background: 'linear-gradient(135deg, #0d0b1f 0%, #0a0a0f 60%, #0a0a0f 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#6C63FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Q
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#fff' }}>Quartzbase</div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#ffffff',
            maxWidth: 920,
            letterSpacing: '-0.02em',
          }}
        >
          Le planning de votre équipe en 2 minutes avec l&apos;IA.
        </div>

        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.6)', marginTop: 32 }}>
          Conforme Code du travail · Jusqu&apos;à 4 fois moins cher
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 48 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: '#00D4AA',
              border: '1px solid rgba(0,212,170,0.4)',
              borderRadius: 100,
              padding: '8px 22px',
            }}
          >
            30 jours gratuits · sans carte bancaire
          </div>
        </div>
      </div>
    ),
    size
  )
}
