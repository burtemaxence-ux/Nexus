/* Coche qui se dessine (cercle puis ✓) au montage du composant.
   Animation pilotée par .check-draw dans globals.css. */
export function CheckDraw({ size = 52, color = 'var(--success)' }: { size?: number; color?: string }) {
  return (
    <svg
      className="check-draw"
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="26" cy="26" r="24" stroke={color} strokeWidth="2.5" />
      <path d="M15 27l7.5 7.5L37 19" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
