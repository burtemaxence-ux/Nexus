import { z, ZodError } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (YYYY-MM-DD)')
const timeHHMM = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Heure invalide (HH:MM)')
// UUID permissif : accepte tout identifiant au format 8-4-4-4-12 (comme le type
// `uuid` Postgres), contrairement à z.uuid() qui exige les bits de version RFC
// et rejette des UUID valides côté base (ex. jeux de données seed/démo).
const uuidStr = (msg = 'Identifiant invalide') =>
  z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, msg)

export const InviteSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email('Email invalide'),
  phone: z.string().max(30).optional(),
  role: z.enum(['manager', 'employee', 'supervisor']).default('employee'),
  position: z.string().max(100).optional(),
  contract_type: z.string().max(50).optional(),
  weekly_hours: z.number().min(0).max(60).optional(),
  start_date: isoDate.optional(),
})

export const ShiftSchema = z.object({
  employee_id: uuidStr('employee_id invalide'),
  date: isoDate,
  start_time: timeHHMM,
  end_time: timeHHMM,
  position: z.string().max(100).optional(),
  poste_id: uuidStr().nullable().optional(),
  break_minutes: z.number().int().min(0).max(480).optional(),
  notes: z.string().max(500).optional(),
})

export const LeaveRequestSchema = z.object({
  start_date: isoDate,
  end_date: isoDate,
  type: z.string().min(1).max(100),
  comment: z.string().max(1000).optional(),
}).refine(d => d.end_date >= d.start_date, {
  message: 'La date de fin doit être après la date de début',
  path: ['end_date'],
})

export const ContractSchema = z.object({
  type: z.string().min(1).max(50),
  start_date: isoDate,
  end_date: isoDate.nullable().optional(),
  weekly_hours: z.number().min(0).max(60).optional().nullable(),
  hourly_rate: z.number().min(0).optional().nullable(),
  monthly_gross_salary: z.number().min(0).optional().nullable(),
  classification: z.string().max(100).optional().nullable(),
  coefficient: z.string().max(50).optional().nullable(),
  has_mutuelle: z.boolean().optional(),
  has_meal_vouchers: z.boolean().optional(),
  meal_voucher_value: z.number().min(0).max(100).optional().nullable(),
  has_transport_reimbursement: z.boolean().optional(),
  job_title: z.string().max(150).optional().nullable(),
  work_location: z.string().max(200).optional().nullable(),
  cdd_reason: z.string().max(500).optional().nullable(),
  trial_period_days: z.number().int().min(0).max(365).optional().nullable(),
  notice_period_days: z.number().int().min(0).max(365).optional().nullable(),
  paid_leave_days: z.number().int().min(0).max(60).optional().nullable(),
  has_confidentiality: z.boolean().optional(),
  has_non_compete: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN doit être 4 à 6 chiffres')

// Mise à jour partielle d'un shift (PATCH) — valide formats heures/dates/uuid.
export const ShiftUpdateSchema = ShiftSchema.partial()

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export function validationError(err: ZodError) {
  const messages = err.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
  return Response.json({ error: `Données invalides — ${messages}` }, { status: 422 })
}
