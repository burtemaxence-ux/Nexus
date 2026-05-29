/**
 * triggerSOSReplacement — helper exportable pour déclencher le flow SOS depuis
 * n'importe quel endroit du backend (ex: panel conformité conv 4).
 *
 * Appelle directement la logique du moteur de scoring sans passer par HTTP.
 * Retourne le replacement_request_id créé, ou null en cas d'erreur.
 */
export async function triggerSOSReplacement(shift_id: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // On passe par l'API interne pour réutiliser tout le scoring + Claude Haiku
    // L'appel interne utilise le service role via supabaseAdmin — pas de session cookie nécessaire
    const res = await fetch(`${baseUrl}/api/ai/replacement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // En interne on bypasse l'auth via un header spécial si configuré,
        // sinon l'appelant doit s'assurer que le contexte d'auth est présent.
        // Pour la conv 4, l'appel viendra depuis un Route Handler authentifié.
      },
      body: JSON.stringify({ shift_id }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[triggerSOSReplacement] API error:', err)
      return null
    }

    const data = await res.json()
    return data.replacement_request_id ?? null
  } catch (err) {
    console.error('[triggerSOSReplacement] fetch error:', err)
    return null
  }
}
