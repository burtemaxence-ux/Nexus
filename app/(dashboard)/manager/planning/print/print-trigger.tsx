'use client'

export function PrintTrigger() {
  return (
    <button
      className="print-btn"
      onClick={() => window.print()}
    >
      🖨️ Imprimer / Télécharger PDF
    </button>
  )
}
