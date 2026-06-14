export function DemoBanner() {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255,179,71,0.08)',
        borderBottom: '1px solid rgba(255,179,71,0.2)',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '12px', color: '#FFB347', fontFamily: 'var(--font-dm-sans)' }}>
        🎭 Mode démo · Les données sont fictives · Aucune action réelle
      </span>
      <a
        href="https://quartzbase.fr/register"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: '#6C63FF',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '6px',
          fontFamily: 'var(--font-syne)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Créer mon compte gratuit →
      </a>
    </div>
  )
}
