/**
 * Détermine si un email fait partie des opérateurs Quartzbase (toi / ton équipe).
 * La liste vient de la variable d'env OPERATOR_EMAILS (emails séparés par des virgules).
 *
 * Utilisé pour protéger le back-office /admin. Fonction pure — utilisable côté
 * middleware (edge) comme côté serveur.
 */
export function isOperator(email: string | null | undefined): boolean {
  if (!email) return false
  const list = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.trim().toLowerCase())
}
