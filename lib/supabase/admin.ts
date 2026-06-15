import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client — server-side only, bypasses RLS.
// Never import this in client components or expose it to the browser.
//
// Instancié de façon paresseuse : le client n'est créé qu'au premier accès
// (dans un handler de requête), pas au chargement du module. Cela évite que
// `next build` plante pendant la collecte des données de page quand les
// variables d'environnement ne sont pas présentes (ex. CI sans secrets).
let _client: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase admin indisponible : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis.'
    )
  }
  _client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  return _client
}

// Proxy : préserve l'API existante (`supabaseAdmin.from(...)`, etc.) tout en
// différant la création réelle du client jusqu'au premier appel.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAdminClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
