export type Poste = {
  id: string
  name: string
  color: string
  break_minutes: number
  hourly_cost: number
  max_hours_per_day: number
  max_hours_per_week: number
  created_at: string
}

export type UserRole = 'manager' | 'employee' | 'supervisor'

export type Profile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  role: UserRole
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
  // Données administratives (dossier RH)
  birth_date: string | null
  address: string | null
  social_security_number: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  iban: string | null
  nationality: string | null
  work_permit_expiry: string | null
  matricule: string | null
}

export type Contract = {
  id: string
  employee_id: string
  type: 'CDI 35h' | 'CDI 28h' | 'CDD' | 'CDD Saisonnier' | 'Extra'
  start_date: string
  end_date: string | null
  weekly_hours: number
  hourly_rate: number | null
  job_title: string | null
  work_location: string | null
  cdd_reason: string | null
  trial_period_days: number | null
  notice_period_days: number | null
  paid_leave_days: number | null
  has_confidentiality: boolean
  has_non_compete: boolean
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

export type CddAlert = {
  contractId: string
  employeeId: string
  employeeName: string | null
  employeeEmail: string | null
  contractType: string
  endDate: string
  daysLeft: number
}

export type LatenessAlert = {
  id: string
  employeeId: string
  employeeName: string | null
  date: string
  lateMinutes: number
}

export type AbsenceAlert = {
  shiftId: string
  employeeId: string
  employeeName: string | null
  date: string
  startTime: string
  endTime: string
}

export type DocumentType = 'contract' | 'id' | 'payslip' | 'medical' | 'other'

export type EmployeeDocument = {
  id: string
  employee_id: string
  establishment_id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  document_type: DocumentType
  uploaded_by: string | null
  created_at: string
  url?: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type Notification = {
  id: string
  user_id: string
  establishment_id: string | null
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  action_url: string | null
  read: boolean
  read_at: string | null
  created_at: string
}

// ─── Compliance Alerts ────────────────────────────────────────────────────────

export type ComplianceAlertType =
  | 'hours_exceeded'
  | 'trial_ending'
  | 'cdd_ending'
  | 'requalification_risk'

export type ComplianceAlertLevel = 'INFO' | 'WARNING' | 'CRITICAL'

export type ComplianceAlertStatus = 'active' | 'in_progress' | 'resolved' | 'ignored'

export type ComplianceAlert = {
  id: string
  establishment_id: string
  employee_id: string
  type: ComplianceAlertType
  level: ComplianceAlertLevel
  title: string
  message: string
  options: Record<string, unknown>
  status: ComplianceAlertStatus
  resolved_at: string | null
  resolved_by: string | null
  ignored_until: string | null
  created_at: string
  updated_at: string
}

// ─── Replacement Requests ─────────────────────────────────────────────────────

export type ReplacementCandidate = {
  employee_id: string
  score: number
  explanation: string
  notified_at: string | null
  response: 'accepted' | 'declined' | null
}

export type ReplacementRequestStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled'

export type ReplacementRequest = {
  id: string
  establishment_id: string
  absent_employee_id: string | null
  shift_id: string
  status: ReplacementRequestStatus
  candidates: ReplacementCandidate[]
  confirmed_employee_id: string | null
  confirmed_at: string | null
  created_at: string
  expires_at: string
}

