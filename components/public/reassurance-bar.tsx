const ITEMS = [
  '14 jours gratuits',
  'Sans carte bleue',
  'Annulation en 1 clic',
  'Support français',
]

export function ReassuranceBar() {
  return (
    <div
      className="reassurance-bar"
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        zIndex: 40,
        background: '#0d0d16',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '8px 24px',
        flexWrap: 'wrap',
      }}
    >
      {ITEMS.map((item) => (
        <span
          key={item}
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#00D4AA', fontWeight: 700 }}>✓</span>
          {item}
        </span>
      ))}

      <style>{`
        @media (max-width: 767px) {
          .reassurance-bar { display: none !important; }
        }
      `}</style>
    </div>
  )
}
