import { NextResponse } from 'next/server'
import { isDemoAccount } from './demo'

/**
 * Garde des suppressions définitives sur les comptes de démonstration.
 *
 * La démonstration est publique et ses deux comptes sont partagés par tous les
 * visiteurs : ce qu'une personne détruit, la suivante ne le voit plus. La
 * remise à zéro nocturne rattrape les services, les pointages, les congés, les
 * échanges et les remplacements — mais PAS les profils, les contrats ni les
 * postes, absents de l'instantané.
 *
 * Supprimer un salarié était donc irréversible, et pire que ça : l'instantané
 * référence son identifiant, si bien que la remise à zéro suivante échouait sur
 * la clé étrangère `shifts_employee_id_fkey` et cessait de réparer quoi que ce
 * soit. Un visiteur curieux pouvait ainsi éteindre la démonstration pour de
 * bon, d'un seul clic, sur un lien diffusé publiquement.
 *
 * Le refus est explicite plutôt que simulé — à l'inverse des envois sortants
 * (invitation, webhook), qui répondent « c'est fait » sans rien émettre. La
 * raison est dans l'interface : ces écrans-là rechargent leur liste juste
 * après, et un élément qui réapparaît passerait pour un bug. Un message clair
 * se comprend, et montre au passage que la démonstration est tenue.
 *
 * Les suppressions que la nuit répare (un service, un congé, un échange)
 * restent vraies : c'est ce qui rend la démonstration crédible.
 */
export function refuseDemoDeletion(
  email: string | null | undefined,
  action: string,
): NextResponse | null {
  if (!isDemoAccount(email)) return null

  return NextResponse.json(
    {
      error: `${action} est désactivé dans la démonstration : les données sont partagées entre tous les visiteurs, et cette suppression serait définitive. La fonction est bien active dans le produit.`,
      demo: true,
    },
    { status: 403 },
  )
}
