import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TRIAL_DAYS } from '@/lib/subscription'

// Prix mensuel par plan (€), pour l'estimation du MRR.
const MONTHLY_PRICE: Record<string, number> = {
  essential: 49, essentiel: 49, pro: 89, multi: 149, multisite: 149,
}

export interface ClientRow {
  id: string
  name: string
  createdAt: string
  ownerEmail: string | null
  status: string            // normalisé (voir STATUS_LABELS)
  plan: string | null
  trialDaysLeft: number     // 0 si pas en essai / essai fini
  employees: number
  shifts: number
  lastActivity: string | null
  activated: boolean        // a créé au moins un planning
}

export interface AdminOverview {
  kpis: {
    totalClients: number
    active: number
    trialing: number
    notActivated: number
    newThisWeek: number
    totalEmployees: number
    estimatedMrr: number
  }
  clients: ClientRow[]
  followUp: {
    notActivated: ClientRow[]
    trialEndingSoon: ClientRow[]
  }
}

interface RawRow {
  id: string
  name: string
  created_at: string
  owner_email: string | null
  sub_status: string | null
  sub_plan: string | null
  trial_end: string | null
  employees: number
  shifts: number
  last_activity: string | null
}

function trialEndDate(row: RawRow): Date {
  if (row.trial_end) return new Date(row.trial_end)
  return new Date(new Date(row.created_at).getTime() + TRIAL_DAYS * 86_400_000)
}

function daysLeft(end: Date, now: number): number {
  const ms = end.getTime() - now
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabaseAdmin.rpc('admin_client_overview')
  if (error) throw error
  const now = Date.now()
  const weekAgo = now - 7 * 86_400_000

  const clients: ClientRow[] = (data as RawRow[] ?? []).map(row => {
    const end = trialEndDate(row)
    // Statut normalisé : la souscription si elle existe, sinon fenêtre d'essai.
    const status = row.sub_status
      ? row.sub_status
      : now < end.getTime() ? 'trialing' : 'expired'
    const trialDaysLeft = status === 'trialing' ? daysLeft(end, now) : 0
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      ownerEmail: row.owner_email,
      status,
      plan: row.sub_plan,
      trialDaysLeft,
      employees: Number(row.employees) || 0,
      shifts: Number(row.shifts) || 0,
      lastActivity: row.last_activity,
      activated: (Number(row.shifts) || 0) > 0,
    }
  })

  const kpis = {
    totalClients: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    trialing: clients.filter(c => c.status === 'trialing').length,
    notActivated: clients.filter(c => !c.activated).length,
    newThisWeek: clients.filter(c => new Date(c.createdAt).getTime() >= weekAgo).length,
    totalEmployees: clients.reduce((sum, c) => sum + c.employees, 0),
    estimatedMrr: clients
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (MONTHLY_PRICE[c.plan ?? ''] ?? 0), 0),
  }

  const followUp = {
    notActivated: clients.filter(c => !c.activated).sort(byCreatedDesc),
    trialEndingSoon: clients
      .filter(c => c.status === 'trialing' && c.trialDaysLeft <= 7)
      .sort((a, b) => a.trialDaysLeft - b.trialDaysLeft),
  }

  return { kpis, clients, followUp }
}

function byCreatedDesc(a: ClientRow, b: ClientRow): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}
