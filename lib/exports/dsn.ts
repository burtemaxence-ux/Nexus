// Générateur DSN mensuelle au format NEODeS (phase 3).
//
// ⚠️ IMPORTANT — Ce fichier est PRÉ-REMPLI à partir des données disponibles dans
// Nexus (établissement, salariés, contrats, heures, absences, estimation de brut
// via le taux horaire du contrat). Il N'EST PAS conforme pour un dépôt en l'état :
// plusieurs rubriques obligatoires exigent des données que l'application ne détient
// pas (NIR, date de naissance, adresse du salarié, cotisations, taux de PAS, etc.)
// et sont laissées vides. Il doit être complété/validé par votre gestionnaire de
// paie ou expert-comptable avant tout dépôt sur net-entreprises.fr.

export type DsnEmployee = {
  lastName: string
  firstName: string
  nir?: string | null
  birthDate?: string | null   // AAAAMMJJ
  sex?: '01' | '02' | null    // 01 homme, 02 femme
  contractStart?: string | null // AAAAMMJJ
  contractEnd?: string | null   // AAAAMMJJ
  contractNature: string      // '01' CDI, '02' CDD
  monthlyRefHours: number     // quotité mensuelle de référence (ex: 151.67)
  workedHours: number         // heures travaillées sur la période
  grossEstimate: number | null // estimation brut (taux horaire × heures), null si inconnu
  absenceDays: { code: string; label: string; days: number }[]
}

export type DsnInput = {
  periodMonth: string   // AAAAMM (mois principal déclaré)
  periodStart: string   // AAAAMMJJ
  periodEnd: string     // AAAAMMJJ
  emitter: { siret: string; softwareName: string; softwareVersion: string; contactName: string; contactEmail: string }
  company: { siren: string; nic: string; ape: string; address: string; postalCode: string; city: string; name: string }
  headcount: number
  employees: DsnEmployee[]
}

// Une ligne DSN : `RUBRIQUE,'valeur'`
function line(rubrique: string, valeur: string | number | null | undefined): string {
  const v = valeur === null || valeur === undefined ? '' : String(valeur)
  // Échappe les apostrophes internes (rare dans nos données).
  return `${rubrique},'${v.replace(/'/g, ' ')}'`
}

export function buildDsnMensuelle(input: DsnInput): string {
  const lines: string[] = []
  const now = new Date()
  const horodatage = now.toISOString().slice(0, 19) // AAAA-MM-JJTHH:MM:SS

  // ── S10 — Envoi / émetteur ────────────────────────────────────────────────
  lines.push(line('S10.G00.00.001', input.emitter.siret))          // SIRET de l'émetteur
  lines.push(line('S10.G00.00.002', input.emitter.softwareName))   // Nom du logiciel
  lines.push(line('S10.G00.00.003', input.emitter.softwareName))   // Éditeur
  lines.push(line('S10.G00.00.004', input.emitter.softwareVersion))// Version
  lines.push(line('S10.G00.00.005', 'P25V01'))                     // Code norme (indicatif)
  lines.push(line('S10.G00.00.006', '01'))                         // Type d'envoi : 01 réel
  lines.push(line('S10.G00.01.001', input.emitter.contactName))    // Contact émetteur
  lines.push(line('S10.G00.01.002', 'Q'))                          // Civilité/type (indicatif)
  lines.push(line('S10.G00.01.005', input.emitter.contactEmail))   // Email du contact

  // ── S20 — Déclaration ─────────────────────────────────────────────────────
  lines.push(line('S20.G00.05.001', '01'))                         // Nature : 01 DSN mensuelle
  lines.push(line('S20.G00.05.002', '01'))                         // Type : 01 déclaration normale
  lines.push(line('S20.G00.05.003', '1'))                          // Numéro de fraction
  lines.push(line('S20.G00.05.004', input.periodMonth))            // Mois principal déclaré (AAAAMM)
  lines.push(line('S20.G00.05.005', horodatage))                   // Horodatage du fichier
  lines.push(line('S20.G00.05.007', '01'))                         // Point de dépôt (indicatif)

  // ── S21 — Entreprise ──────────────────────────────────────────────────────
  lines.push(line('S21.G00.06.001', input.company.siren))          // SIREN
  lines.push(line('S21.G00.06.002', input.company.nic))            // NIC du siège
  lines.push(line('S21.G00.06.003', input.company.ape))            // Code APEN
  lines.push(line('S21.G00.06.004', input.company.address))        // Adresse
  lines.push(line('S21.G00.06.005', input.company.postalCode))     // Code postal
  lines.push(line('S21.G00.06.006', input.company.city))           // Commune

  // ── S21 — Établissement ───────────────────────────────────────────────────
  lines.push(line('S21.G00.11.001', input.company.nic))            // NIC de l'établissement
  lines.push(line('S21.G00.11.002', input.company.ape))            // Code APET
  lines.push(line('S21.G00.11.003', input.company.address))        // Adresse
  lines.push(line('S21.G00.11.004', input.company.postalCode))     // Code postal
  lines.push(line('S21.G00.11.005', input.company.city))           // Commune
  lines.push(line('S21.G00.11.006', input.headcount))              // Effectif de l'établissement

  // ── S21 — Individus + contrats + rémunérations ────────────────────────────
  input.employees.forEach((emp, i) => {
    const numContrat = String(i + 1)

    // Individu
    lines.push(line('S21.G00.30.001', emp.nir ?? ''))              // NIR — À COMPLÉTER
    lines.push(line('S21.G00.30.002', emp.lastName))               // Nom de famille
    lines.push(line('S21.G00.30.004', emp.firstName))              // Prénoms
    lines.push(line('S21.G00.30.005', emp.sex ?? ''))              // Sexe — À COMPLÉTER
    lines.push(line('S21.G00.30.006', emp.birthDate ?? ''))        // Date de naissance — À COMPLÉTER

    // Contrat
    lines.push(line('S21.G00.40.001', emp.contractStart ?? ''))    // Date de début du contrat
    lines.push(line('S21.G00.40.007', emp.contractNature))         // Nature du contrat (01/02)
    lines.push(line('S21.G00.40.009', numContrat))                 // Numéro du contrat
    lines.push(line('S21.G00.40.011', '10'))                       // Unité de mesure quotité : 10 heure
    lines.push(line('S21.G00.40.012', input.employees[i].monthlyRefHours.toFixed(2))) // Quotité de référence entreprise
    lines.push(line('S21.G00.40.013', emp.monthlyRefHours.toFixed(2)))                // Quotité du contrat
    if (emp.contractEnd) lines.push(line('S21.G00.62.001', emp.contractEnd))          // Date de fin prévisionnelle (CDD)

    // Rémunération (estimation à partir du taux horaire)
    lines.push(line('S21.G00.51.001', input.periodStart))          // Début de période de paie
    lines.push(line('S21.G00.51.002', input.periodEnd))            // Fin de période de paie
    lines.push(line('S21.G00.51.010', numContrat))                 // Numéro du contrat
    lines.push(line('S21.G00.51.011', '002'))                      // Type : 002 rémunération brute soumise à cotisations
    lines.push(line('S21.G00.51.012', emp.workedHours.toFixed(2))) // Nombre d'heures
    lines.push(line('S21.G00.51.013', emp.grossEstimate != null ? emp.grossEstimate.toFixed(2) : '')) // Montant (estimé) — À VALIDER

    // Activité (mesure)
    lines.push(line('S21.G00.53.001', '01'))                       // Type : 01 heures travaillées
    lines.push(line('S21.G00.53.002', emp.workedHours.toFixed(2))) // Mesure
    lines.push(line('S21.G00.53.003', '10'))                       // Unité : 10 heure

    // Absences (arrêts / congés déclarés)
    emp.absenceDays.filter(a => a.days > 0).forEach(a => {
      lines.push(line('S21.G00.60.001', a.code))                   // Motif de l'arrêt / absence
      lines.push(line('S21.G00.60.002', a.days))                   // Nombre de jours
    })
  })

  // ── S90 — Total ───────────────────────────────────────────────────────────
  // (total des lignes émises, hors ligne de total elle-même)
  const totalRubriques = lines.length + 1
  lines.push(line('S90.G00.90.001', totalRubriques))               // Nombre total de rubriques
  lines.push(line('S90.G00.90.002', '1'))                          // Nombre de déclarations

  return lines.join('\r\n') + '\r\n'
}

// Mappe le type de contrat interne → nature DSN.
export function dsnContractNature(type: string): string {
  return type.startsWith('CDI') ? '01' : '02'
}
