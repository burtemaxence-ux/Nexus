import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInitials } from '@/lib/planning-utils'
import { Mail, Phone, FileText } from 'lucide-react'
import { ProfilActions } from './profil-actions'

function seniorityLabel(startDate: string | null): string {
  if (!startDate) return '—'
  const start = new Date(startDate)
  const now = new Date()
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months--
  if (months < 1) return '< 1 mois'
  if (months < 12) return `${months} mois`
  const years = Math.floor(months / 12)
  return `${years} an${years > 1 ? 's' : ''}`
}

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: profile },
    { data: settingsRow },
    { data: contract },
    { data: presence },
    { data: todayShift },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, position').eq('id', user.id).single(),
    supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
    supabase.from('contracts').select('type, start_date, weekly_hours').eq('employee_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('presences').select('clock_in, clock_out, break_start, break_end').eq('employee_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('shifts').select('id').eq('employee_id', user.id).eq('date', today).limit(1),
  ])

  const name = profile?.full_name ?? user.email?.split('@')[0] ?? 'Employé'
  const establishment = settingsRow?.value && settingsRow.value !== 'Mon établissement' ? settingsRow.value : 'Mon établissement'

  const p = presence ?? null
  const isWorking = !!p?.clock_in && !p?.clock_out && !(p?.break_start && !p?.break_end)
  const isOnBreak = !!p?.clock_in && !!p?.break_start && !p?.break_end
  const isDone = !!p?.clock_out
  const hasShift = (todayShift?.length ?? 0) > 0

  let statusColor = 'var(--text-tertiary)'
  if (isDone || isWorking) statusColor = 'var(--success)'
  else if (isOnBreak) statusColor = 'var(--warning)'
  else if (hasShift) statusColor = 'var(--accent)'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">

        {/* ── IDENTITÉ ── */}
        <div
          className="relative overflow-hidden rounded-[18px] p-[22px_18px] mb-4"
          style={{
            background: 'radial-gradient(120px 90px at 85% 0%, rgba(108,99,255,0.22), transparent 60%), linear-gradient(135deg, rgba(108,99,255,0.1) 0%, var(--bg-card) 70%)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="relative w-[62px] h-[62px] flex-shrink-0 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(150deg,#8B84FF,var(--accent))' }}
            >
              <span className="text-[22px] font-bold text-white" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                {getInitials(name)}
              </span>
              <span
                className="absolute bottom-[1px] right-[1px] w-[15px] h-[15px] rounded-full"
                style={{ backgroundColor: statusColor, border: '2.5px solid var(--bg-card)' }}
              />
            </div>
            <div className="min-w-0">
              <h1
                className="text-[20px] font-bold tracking-[-0.02em] truncate"
                style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
              >
                {name}
              </h1>
              <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {profile?.position ?? 'Équipier polyvalent'}
              </p>
              <p className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                {establishment}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-[18px]">
            {[
              { value: contract?.type ?? '—', label: 'Contrat' },
              { value: contract?.weekly_hours ? `${contract.weekly_hours}h` : '—', label: 'Hebdo' },
              { value: seniorityLabel(contract?.start_date ?? null), label: 'Ancienneté' },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center rounded-[11px] py-2.5 px-1"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <p className="text-[15px] font-bold" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-primary)' }}>
                  {s.value}
                </p>
                <p className="text-[9px] uppercase tracking-[0.04em] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── COORDONNÉES ── */}
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] mb-2 ml-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Coordonnées
        </p>
        <div className="rounded-[14px] overflow-hidden mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-[15px] py-[13px]" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <Mail className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Email</p>
              <p className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-[15px] py-[13px]">
            <Phone className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Téléphone</p>
              <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{profile?.phone ?? 'Non renseigné'}</p>
            </div>
          </div>
        </div>

        {/* ── MES DOCUMENTS ── */}
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] mb-2 ml-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Mes documents
        </p>
        <div className="rounded-[14px] overflow-hidden mb-4 flex flex-col items-center justify-center gap-1.5 py-8 px-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <FileText className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>
            Aucun document pour le moment. Vos bulletins de paie et contrats apparaîtront ici.
          </p>
        </div>

        {/* ── ACTIONS ── */}
        <ProfilActions />
      </div>
    </div>
  )
}
