/**
 * seed-demo-documents.mjs — dépose les documents salariés de la démonstration.
 *
 * Pourquoi un script et pas une migration : un document, ce n'est pas qu'une
 * ligne en base. Le fichier doit exister dans le bucket privé
 * `employee-documents`, sinon le téléchargement échoue — un onglet qui renvoie
 * une erreur est pire qu'un onglet vide. Or le SQL ne sait pas écrire dans le
 * stockage objet. D'où ce script, à lancer une fois.
 *
 * Il n'a pas besoin d'être rejoué chaque nuit : la remise à zéro ne touche pas
 * `employee_documents`, et un visiteur ne peut pas supprimer de document (garde
 * de lib/demo-guard.ts). Ce qui est déposé reste.
 *
 * Usage :
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-demo-documents.mjs
 *
 * Idempotent : les salariés qui ont déjà des documents sont ignorés. Relancer
 * le script ne crée pas de doublons.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EST = '67dbd3ea-6427-4fcb-aa01-0798c71e7a17' // La Boulangerie du Soleil
const BUCKET = 'employee-documents'

if (!URL || !KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

// Les documents qu'un gérant de boulangerie a réellement au dossier. Le contenu
// reste sobre : ce sont des pièces de démonstration, pas des faux documents
// officiels — chacune le dit en toutes lettres.
const DOSSIER = [
  {
    type: 'contrat',
    nom: emp => `Contrat de travail — ${emp.full_name}.pdf`,
    lignes: emp => [
      'CONTRAT DE TRAVAIL',
      '',
      `Salarie : ${sansAccents(emp.full_name)}`,
      `Poste : ${sansAccents(emp.position ?? 'Employe')}`,
      'Etablissement : La Boulangerie du Soleil',
      '',
      'Document de DEMONSTRATION - sans valeur juridique.',
      'Depose pour illustrer le coffre-fort documentaire de Quartzbase.',
    ],
  },
  {
    type: 'attestation',
    nom: emp => `Attestation HACCP — ${emp.full_name}.pdf`,
    lignes: emp => [
      'ATTESTATION DE FORMATION HYGIENE (HACCP)',
      '',
      `Beneficiaire : ${sansAccents(emp.full_name)}`,
      'Formation aux bonnes pratiques d hygiene alimentaire.',
      '',
      'Document de DEMONSTRATION - sans valeur juridique.',
    ],
  },
]

// Le PDF est écrit en latin1 pour que les offsets de la table xref, calculés
// en caractères, correspondent aux octets. Tout ce qui entre dans le flux de
// texte doit donc rester sur un octet.
function sansAccents(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Filet : tout caractère hors latin1 (tiret cadratin, apostrophe typo…)
    // fausserait le compte d'octets et donc la table xref.
    .replace(/[^\x20-\xFF]/g, '')
}

/**
 * Un PDF minimal mais VALIDE : catalogue, page, flux de texte, police, table
 * xref aux bons offsets. Aucune dépendance — @react-pdf/renderer est un moteur
 * de rendu React, inutilisable depuis un script Node.
 */
function pdf(lignes) {
  const contenu =
    'BT /F1 12 Tf 60 780 Td 16 TL\n' +
    lignes.map(l => `(${l.replace(/([()\\])/g, '\\$1')}) Tj T*`).join('\n') +
    '\nET'

  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]

  let out = '%PDF-1.4\n'
  const offsets = []
  objets.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })

  const xref = out.length
  out += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  return Buffer.from(out, 'latin1')
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

const { data: salaries, error: errEmp } = await db
  .from('profiles')
  .select('id, full_name, position')
  .eq('establishment_id', EST)
  .eq('role', 'employee')
  .order('full_name')

if (errEmp) { console.error('✗ Lecture des salariés :', errEmp.message); process.exit(1) }

const { data: manager } = await db
  .from('profiles').select('id').eq('establishment_id', EST).eq('role', 'manager').maybeSingle()

let deposes = 0
let ignores = 0

for (const emp of salaries ?? []) {
  const { count } = await db
    .from('employee_documents')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', emp.id)

  if (count && count > 0) { ignores++; continue }

  for (const modele of DOSSIER) {
    const fichier = pdf(modele.lignes(emp))
    const chemin = `${EST}/${emp.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`

    const { error: errUp } = await db.storage
      .from(BUCKET)
      .upload(chemin, fichier, { contentType: 'application/pdf', upsert: false })

    if (errUp) { console.error(`✗ Envoi ${emp.full_name} :`, errUp.message); process.exit(1) }

    const { error: errIns } = await db.from('employee_documents').insert({
      employee_id: emp.id,
      establishment_id: EST,
      name: modele.nom(emp),
      file_path: chemin,
      file_size: fichier.length,
      mime_type: 'application/pdf',
      document_type: modele.type,
      uploaded_by: manager?.id ?? null,
    })

    // Sans la ligne en base, le fichier serait orphelin dans le bucket.
    if (errIns) {
      await db.storage.from(BUCKET).remove([chemin])
      console.error(`✗ Enregistrement ${emp.full_name} :`, errIns.message)
      process.exit(1)
    }
    deposes++
  }
  console.log(`  ✓ ${emp.full_name} — ${DOSSIER.length} documents`)
}

console.log(`\n${deposes} document(s) déposé(s), ${ignores} salarié(s) déjà pourvu(s).`)
