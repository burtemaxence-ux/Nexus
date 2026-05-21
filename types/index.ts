export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'manager' | 'employee'
  position: string | null
  created_at: string
}

export type Shift = {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
  position: string | null
  notes: string | null
  status: 'draft' | 'published'
  created_at: string
}
