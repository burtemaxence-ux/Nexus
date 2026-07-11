import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { fireWebhook } from '@/lib/integrations/webhook'
import { getWeekLabel, getWeekDates } from '@/lib/utils/dates'
import { sendPlanningPublishedEmails } from '@/lib/email/planning-email'
import { sendPushToMany } from '@/lib/push'
import { sendSms } from '@/lib/sms'
import { createNotification } from '@/lib/notifications/create'
import { checkCompliance, RULES } from '@/lib/compliance/rules'
import { complianceConfigFromRows, COMPLIANCE_SETTINGS_KEYS } from '@/lib/compliance/config'
import type { Profile, Shift } from '@/types'

async function getManagerUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, profile: null, error: 'Non authentifié', status: 401 }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, establishment_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['manager', 'supervisor'].includes(profile.role)) {
    return { user: null, profile: null, error: 'Accès refusé', status: 403 }
  }

  return { user, profile, error: null, status: 200 }
}

// GET : récupère le statut d'une semaine
// Query param: week_monday (YYYY-MM-DD)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekMonday = searchParams.get('week_monday')

    if (!weekMonday) {
      return NextResponse.json({ error: 'week_monday requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('week_status')
      .select('*')
      .eq('week_monday', weekMonday)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine (week not yet created)
      console.error('[week-status GET] error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Si pas encore de statut, retourner les valeurs par défaut
    if (!data) {
      return NextResponse.json({
        week_monday: weekMonday,
        published: false,
        locked: false,
        published_at: null,
        locked_at: null,
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[week-status GET] exception:', message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST : upsert le statut d'une semaine
// Body: { week_monday: string, published?: boolean, locked?: boolean }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile, error: authError, status: authStatus } = await getManagerUser(supabase)

    if (!user) {
      return NextResponse.json({ error: authError }, { status: authStatus })
    }

    const body = await request.json()
    const { week_monday, published, locked, acknowledge_violations } = body as {
      week_monday: string
      published?: boolean
      locked?: boolean
      acknowledge_violations?: boolean
    }

    if (!week_monday) {
      return NextResponse.json({ error: 'week_monday requis' }, { status: 400 })
    }

    // Récupérer le statut actuel pour merger
    const { data: existing } = await supabase
      .from('week_status')
      .select('*')
      .eq('week_monday', week_monday)
      .single()

    // ── Blocage doux conformité ─────────────────────────────────────────────
    // À la publication, on bloque s'il existe des infractions CRITIQUES au Code
    // du Travail tant que le manager ne les a pas explicitement assumées. Quand
    // il les assume (acknowledge_violations), on trace l'override dans le journal
    // d'audit pour conserver une preuve de la décision (cf. CGU art. 9).
    if (published === true && !existing?.published) {
      const weekEnd = new Date(new Date(week_monday + 'T00:00:00').getTime() + 6 * 86400000)
        .toISOString().split('T')[0]
      // J-1 pour vérifier le repos quotidien du premier jour
      const fetchFrom = new Date(new Date(week_monday + 'T00:00:00').getTime() - 86400000)
        .toISOString().split('T')[0]

      const [{ data: weekShifts }, { data: weekProfiles }] = await Promise.all([
        supabase
          .from('shifts')
          .select('id, employee_id, date, start_time, end_time, break_minutes')
          .gte('date', fetchFrom)
          .lte('date', weekEnd)
          .is('deleted_at', null),
        supabase
          .from('profiles')
          .select('id, birth_date, contract_type, weekly_hours')
          .eq('role', 'employee'),
      ])

      const weekEmployees = (weekProfiles ?? []).map(p => ({
        id: p.id,
        birthDate: p.birth_date ?? null,
        contractType: p.contract_type ?? null,
        weeklyHours: p.weekly_hours ?? null,
      }))

      const estId = profile?.establishment_id ?? ''
      const { data: cfgRows } = estId
        ? await supabase.from('settings').select('key, value').eq('establishment_id', estId).in('key', COMPLIANCE_SETTINGS_KEYS)
        : { data: null }
      const config = complianceConfigFromRows(cfgRows)
      const violations = checkCompliance((weekShifts ?? []).map(s => ({
        id: s.id,
        employeeId: s.employee_id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
        breakMinutes: s.break_minutes ?? 0,
      })), weekEmployees, config)

      const critical = violations.filter(v => RULES[v.ruleId].severity === 'critical')
      const criticalPayload = critical.map(v => ({
        ruleId: v.ruleId,
        ruleName: RULES[v.ruleId].name,
        legalRef: RULES[v.ruleId].legalRef,
        employeeId: v.employeeId,
        date: v.date,
        description: v.description,
      }))

      if (critical.length > 0 && !acknowledge_violations) {
        return NextResponse.json(
          {
            error: 'compliance_blocked',
            message: `Ce planning contient ${critical.length} infraction(s) critique(s) au Code du Travail. Confirmez la publication pour les assumer.`,
            violations: criticalPayload,
          },
          { status: 409 }
        )
      }

      if (critical.length > 0 && acknowledge_violations) {
        // Preuve légale : le manager a explicitement assumé les infractions.
        const { error: auditErr } = await supabaseAdmin.from('audit_log').insert({
          table_name: 'week_status',
          record_id: existing?.id ?? null,
          action: 'UPDATE',
          new_data: {
            event: 'compliance_override',
            week_monday,
            critical_count: critical.length,
            violations: criticalPayload,
            acknowledged_at: new Date().toISOString(),
          },
          performed_by: user.id,
        })
        if (auditErr) console.error('[week-status] audit override insert failed', auditErr)
      }
    }

    const upsertData: Record<string, unknown> = {
      establishment_id: profile!.establishment_id,
      week_monday,
      published: existing?.published ?? false,
      locked: existing?.locked ?? false,
      published_at: existing?.published_at ?? null,
      locked_at: existing?.locked_at ?? null,
    }

    if (published !== undefined) {
      upsertData.published = published
      if (published && !existing?.published_at) {
        upsertData.published_at = new Date().toISOString()
      } else if (!published) {
        upsertData.published_at = null
      }
    }

    if (locked !== undefined) {
      upsertData.locked = locked
      if (locked && !existing?.locked_at) {
        upsertData.locked_at = new Date().toISOString()
      } else if (!locked) {
        upsertData.locked_at = null
      }
    }

    const { data, error } = await supabase
      .from('week_status')
      .upsert(upsertData, { onConflict: 'establishment_id,week_monday' })
      .select()
      .single()

    if (error) {
      console.error('[week-status POST] error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Fire webhook + send emails when planning is published for the first time
    if (published === true && !existing?.published) {
      const weekLabel = getWeekLabel(getWeekDates(new Date(week_monday + 'T00:00:00')))
      const [{ count }, { data: settingsData }, { data: employees }, { data: weekShifts }] = await Promise.all([
        supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('week_monday', week_monday),
        supabase.from('settings').select('key, value'),
        supabase.from('profiles').select('id, full_name, email, establishment_id').eq('establishment_id', profile!.establishment_id).eq('role', 'employee').eq('archived', false),
        supabase.from('shifts').select('*').eq('week_monday', week_monday),
      ])
      const settings: Record<string, string> = {}
      for (const row of settingsData ?? []) settings[row.key] = row.value
      fireWebhook(settings, 'planning.published', { weekLabel, weekMonday: week_monday, employeeCount: count ?? 0 }).catch(() => {})
      sendPlanningPublishedEmails({
        employees: (employees ?? []) as unknown as Profile[],
        shifts: (weekShifts ?? []) as unknown as Shift[],
        weekLabel,
      }).catch(() => {})

      // Push notifications to employees with shifts this week
      const employeeIds = Array.from(new Set((weekShifts ?? []).map((s: { employee_id: string }) => s.employee_id)))
      sendPushToMany(supabase, employeeIds, {
        title: 'Planning publié',
        body:  `Votre planning de la semaine du ${weekLabel} est disponible`,
        url:   '/employee/planning',
      }).catch(() => {})

      // In-app notifications to employees with shifts this week
      if (employeeIds.length) {
        const weekDates = getWeekDates(new Date(week_monday + 'T00:00:00'))
        const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        createNotification({
          user_ids: employeeIds as string[],
          establishment_id: profile!.establishment_id,
          type: 'planning_published',
          title: `Planning semaine ${weekLabel} disponible`,
          body: `Du ${fmt(weekDates[0])} au ${fmt(weekDates[6])} — Consultez vos horaires`,
          action_url: '/employee/planning',
        }).catch(() => {})
      }

      // SMS to employees who have a phone number
      if (employeeIds.length) {
        void supabase
          .from('profiles')
          .select('phone')
          .in('id', employeeIds)
          .not('phone', 'is', null)
          .then(({ data: phonesData }) => {
            for (const row of phonesData ?? []) {
              if (row.phone) {
                sendSms(row.phone, `Quartzbase : votre planning de la semaine du ${weekLabel} est disponible. Ouvrez l'app pour consulter vos horaires.`).catch(() => {})
              }
            }
          })
      }
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[week-status POST] exception:', message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
