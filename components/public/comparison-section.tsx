const ROWS = [
  { feature: 'Génération du planning par IA',    traditional: false, quartzbase: true  },
  { feature: 'Vérification légale automatique',  traditional: false, quartzbase: true  },
  { feature: 'Remplacement en 1 clic',           traditional: false, quartzbase: true  },
  { feature: 'Notification mobile des employés', traditional: false, quartzbase: true  },
  { feature: 'Badgeuse intégrée',                traditional: false, quartzbase: true  },
  { feature: 'Gestion des congés',               traditional: true,  quartzbase: true  },
  { feature: 'Support en français',              traditional: true,  quartzbase: true  },
  { feature: 'Prix moyen / mois',                traditional: '~200€', quartzbase: 'dès 49€' },
]

function Yes() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="Oui">
      <circle cx="10" cy="10" r="9.5" fill="rgba(0,212,170,0.12)" />
      <path d="M6 10l2.5 2.5L14 7" stroke="#00D4AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function No() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-label="Non">
      <circle cx="10" cy="10" r="9.5" fill="rgba(255,255,255,0.05)" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function ComparisonSection() {
  const font = "'DM Sans', sans-serif"

  return (
    <section
      style={{
        background: '#0a0a0f',
        padding: '80px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{
            fontFamily: font,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 14,
          }}>
            Comparatif
          </p>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(22px, 3vw, 34px)',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: 12,
          }}>
            {`Payez moins. Obtenez plus.`}
          </h2>

          {/* Badge économies */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: font,
              fontSize: 13,
              fontWeight: 600,
              color: '#00D4AA',
              background: 'rgba(0,212,170,0.1)',
              border: '1px solid rgba(0,212,170,0.25)',
              borderRadius: 100,
              padding: '5px 16px',
            }}>
              {`Économisez jusqu'à 1 812 € par an`}
            </span>
          </div>
        </div>

        {/* Table */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>

          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 160px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 20px',
          }} className="comparison-row">
            <div />
            <div style={{
              fontFamily: font,
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              Logiciel traditionnel
            </div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: '#6C63FF',
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}>
              Quartzbase
            </div>
          </div>

          {/* Data rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 160px',
                padding: '14px 20px',
                borderBottom: i < ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                alignItems: 'center',
              }}
              className="comparison-row"
            >
              <span style={{
                fontFamily: font,
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
              }}>
                {row.feature}
              </span>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {typeof row.traditional === 'boolean'
                  ? (row.traditional ? <Yes /> : <No />)
                  : (
                    <span style={{ fontFamily: font, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                      {row.traditional}
                    </span>
                  )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {typeof row.quartzbase === 'boolean'
                  ? (row.quartzbase ? <Yes /> : <No />)
                  : (
                    <span style={{
                      fontFamily: font,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#00D4AA',
                    }}>
                      {row.quartzbase}
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .comparison-row {
            grid-template-columns: 1fr 90px 90px !important;
          }
        }
      `}</style>
    </section>
  )
}
