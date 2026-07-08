// Mark Quartzbase (cristal taille brillant) — copie inline du SVG de
// public/brand/quartzbase-symbol.svg, nécessaire ici car les routes d'icônes
// (app/icon.tsx, app/apple-icon.tsx, app/api/pwa/icon) tournent en edge
// runtime et ne peuvent pas lire le filesystem public/.
export const QUARTZBASE_SYMBOL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="qbCore" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6C63FF"/>
      <stop offset="1" stop-color="#00D4AA"/>
    </linearGradient>
  </defs>
  <g stroke="#0b0b12" stroke-width="0.9" stroke-linejoin="round">
    <polygon points="50,30 67,40 67,60 50,70 33,60 33,40" fill="url(#qbCore)"/>
    <polygon points="50,30 50,6 88,28" fill="#b4aeff"/>
    <polygon points="50,30 88,28 67,40" fill="#948cf7"/>
    <polygon points="67,40 88,28 88,72" fill="#8981f5"/>
    <polygon points="67,40 88,72 67,60" fill="#6f66ff"/>
    <polygon points="67,60 88,72 50,94" fill="#463dc4"/>
    <polygon points="67,60 50,94 50,70" fill="#372f9e"/>
    <polygon points="50,70 50,94 12,72" fill="#463dc4"/>
    <polygon points="50,70 12,72 33,60" fill="#574ed8"/>
    <polygon points="33,60 12,72 12,28" fill="#6f66ff"/>
    <polygon points="33,60 12,28 33,40" fill="#8981f5"/>
    <polygon points="33,40 12,28 50,6" fill="#b4aeff"/>
    <polygon points="33,40 50,6 50,30" fill="#bcb6ff"/>
  </g>
</svg>`

export function symbolDataUri(): string {
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(QUARTZBASE_SYMBOL_SVG).toString('base64')
      : btoa(QUARTZBASE_SYMBOL_SVG)
  return `data:image/svg+xml;base64,${base64}`
}
