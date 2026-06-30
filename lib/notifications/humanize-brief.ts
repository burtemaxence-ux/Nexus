/**
 * Nettoie un texte de brief généré par l'IA pour qu'il se lise comme une phrase
 * humaine : pas de tirets de liste, pas d'underscores, pas de markdown, pas
 * d'émojis, et un seul paragraphe fluide. Les traits d'union internes aux mots
 * (« rendez-vous », « week-end ») sont préservés.
 */
export function humanizeBrief(raw: string | null | undefined): string {
  if (!raw) return ''
  let t = raw

  // Puces / marqueurs de liste en début de ligne (-, –, —, •, *, 1.)
  t = t.replace(/^\s*(?:[-–—•*]|\d+[.)])\s+/gm, '')
  // Tirets utilisés comme séparateurs (entourés d'espaces) → virgule
  t = t.replace(/\s+[-–—]\s+/g, ', ')
  // Caractères de mise en forme markdown + underscores
  t = t.replace(/[*#`>~_]+/g, '')
  // Émojis (paires de substitution) + symboles/flèches décoratifs + sélecteurs de variante
  t = t.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
  t = t.replace(/[←-⇿☀-➿⬀-⯿️⃣]/g, '')
  // Replie les sauts de ligne en un paragraphe unique
  t = t.replace(/\s*\n+\s*/g, ' ')
  // Espaces multiples + espace avant ponctuation
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
  // Virgules en double éventuelles issues du nettoyage
  t = t.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim()

  return t
}
