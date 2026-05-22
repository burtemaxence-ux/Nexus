export type Poste = {
  id: string
  name: string
  color: string
  break_minutes: number
  created_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'manager' | 'employee'
  position: string | null
  contract_type: 'CDI 35h' | 'CDI 28h' | 'CDD' | 'CDD Saisonnier' | 'Extra' | null
  weekly_hours: number | null
  created_at: string
}

export type Shift = {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  position: string | null
  poste_id: string | null
  break_minutes: number
  notes: string | null
  status: 'draft' | 'published'
  created_at: string
}
