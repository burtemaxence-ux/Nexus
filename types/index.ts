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
  phone: string | null
  pay_ref: string | null
  pin: string | null
  disability: boolean
  archived: boolean
  invited_by: string | null
  created_at: string
}

export type Contract = {
  id: string
  employee_id: string
  type: 'CDI 35h' | 'CDI 28h' | 'CDD' | 'CDD Saisonnier' | 'Extra'
  start_date: string
  end_date: string | null
  weekly_hours: number
  hourly_rate: number | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type Availability = {
  id: string
  employee_id: string
  day_of_week: number
  start_time: string
  end_time: string
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

export type WeekStatus = {
  week_monday: string
  published: boolean
  locked: boolean
  published_at: string | null
  locked_at: string | null
}

export type LeaveType = 'CP' | 'RTT' | 'maladie' | 'sans_solde' | 'autre'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export type LeaveRequest = {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  type: LeaveType
  comment: string | null
  status: LeaveStatus
  manager_comment: string | null
  created_at: string
  updated_at: string
}

export type LeaveRequestWithEmployee = LeaveRequest & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'position'>
}

